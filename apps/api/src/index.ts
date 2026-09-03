import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { migrer, pool, ventPaaDb } from './db.js';
import { antalTilsluttede, tilslut } from './hub.js';
import { hentSpil, opretSpil, skrivAlleNu, startOprydning } from './store.js';

const PORT = Number(process.env.PORT ?? 8080);
const VAERT = process.env.HOST ?? '0.0.0.0';

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
  return { ok: true, tilsluttede: antalTilsluttede() };
});

app.post('/api/spil', async () => {
  const spil = await opretSpil();
  return { kode: spil.kode };
});

app.get<{ Params: { kode: string } }>('/api/spil/:kode', async (req, svar) => {
  const spil = await hentSpil(req.params.kode);
  if (!spil) return svar.code(404).send({ fejl: 'Spillet findes ikke.' });
  return {
    kode: spil.kode,
    fase: spil.fase,
    antalSpillere: spil.spillere.length,
    spillere: spil.spillere.map((s) => ({ navn: s.navn, farve: s.farve }))
  };
});

app.register(async (instans) => {
  instans.get('/ws', { websocket: true }, (sok) => tilslut(sok));
});

await ventPaaDb();
const nye = await migrer();
if (nye.length) app.log.info({ nye }, 'kørte migrationer');

const oprydning = startOprydning();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      clearInterval(oprydning);
      await skrivAlleNu();
      await app.close();
      await pool.end();
      process.exit(0);
    })();
  });
}

await app.listen({ port: PORT, host: VAERT });
app.log.info(`K69 lytter på ${VAERT}:${PORT}`);
