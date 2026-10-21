import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { systemKlokke } from './app/klokke.js';
import { SpilService } from './app/SpilService.js';
import { migrer, pool, ventPaaDb } from './infra/db.js';
import { PgSpilRepo } from './infra/PgSpilRepo.js';
import { WsHub } from './transport/ws.js';

const PORT = Number(process.env.PORT ?? 8080);
const VAERT = process.env.HOST ?? '0.0.0.0';

// Her sættes det sammen: Postgres bag repositoriet, websockets foran servicen.
const service = new SpilService({ repo: new PgSpilRepo(pool), klokke: systemKlokke });
const hub = new WsHub(service, systemKlokke);

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  trustProxy: true
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
});
await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

app.get('/api/sundhed', async () => {
  await pool.query('select 1');
  return { ok: true, tilsluttede: hub.antalTilsluttede() };
});

app.post('/api/spil', async () => {
  const spil = await service.opret();
  return { kode: spil.kode };
});

app.get<{ Params: { kode: string } }>('/api/spil/:kode', async (req, svar) => {
  const spil = await service.hent(req.params.kode);
  if (!spil) return svar.code(404).send({ fejl: 'Spillet findes ikke.' });
  return {
    kode: spil.kode,
    fase: spil.fase,
    antalSpillere: spil.spillere.length,
    spillere: spil.spillere.map((s) => ({ navn: s.navn, farve: s.farve }))
  };
});

app.register(async (instans) => {
  instans.get('/ws', { websocket: true }, (sok) => hub.tilslut(sok));
});

await ventPaaDb();
const nye = await migrer();
if (nye.length) app.log.info({ nye }, 'kørte migrationer');

/** Ryd spil ud af hukommelsen når ingen har rørt dem i et halvt døgn. */
const oprydning = setInterval(() => service.ryd(), 1000 * 60 * 10);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      clearInterval(oprydning);
      await service.luk();
      await app.close();
      await pool.end();
      process.exit(0);
    })();
  });
}

await app.listen({ port: PORT, host: VAERT });
app.log.info(`K69 lytter på ${VAERT}:${PORT}`);
