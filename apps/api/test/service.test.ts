import assert from 'node:assert/strict';
import test from 'node:test';

import { AFSTEMNING_SEKUNDER, VAERT_FRIST_SEKUNDER, type KlientHandling, type Spil } from '@k69/rules';
import { hashAf } from '../src/app/session.js';
import { SpilService, type Plads } from '../src/app/SpilService.js';
import { UDLOEB } from '../src/app/Spillager.js';
import { FalskKlokke, HukommelsesRepo, token } from './hjaelpere.js';

function opsaet() {
  const repo = new HukommelsesRepo();
  const klokke = new FalskKlokke();
  let n = 0;
  const service = new SpilService({ repo, klokke, terning: () => 3, nytId: () => `p${n++}` });
  const sidst: { spil: Spil | null } = { spil: null };
  service.paaAendring((s) => { sidst.spil = s; });
  return { repo, klokke, service, sidst };
}

const join = (navn: string): KlientHandling => ({ type: 'join', navn, farve: '#D8A93F', drik: 'ol', kortHold: 'konge' });

/** Sig hej og sæt dig ved bordet, som en klient ville. */
async function ind(service: SpilService, kode: string, nr: number, navn: string): Promise<Plads> {
  const svar = await service.hej(kode, token(nr), null);
  assert.ok(svar);
  const plads: Plads = { spilId: svar.spil.id, kode, spillerId: svar.ident.spillerId, tokenHash: svar.ident.tokenHash };
  await service.forbindelse(plads, true);
  assert.deepEqual(await service.udfoer(plads, join(navn)), { ok: true });
  return plads;
}

test('handlinger der kommer samtidig, bygger videre på hinanden', async () => {
  const { service } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  const b = await ind(service, kode, 2, 'B');

  const svar = await Promise.all([
    service.udfoer(a, { type: 'saet-drik', drik: 'vin' }),
    service.udfoer(b, { type: 'saet-drik', drik: 'whisky' })
  ]);
  assert.deepEqual(svar, [{ ok: true }, { ok: true }]);
  const spil = (await service.hent(kode))!;
  assert.equal(spil.spillere.find((s) => s.id === a.spillerId)!.drik.id, 'vin');
  assert.equal(spil.spillere.find((s) => s.id === b.spillerId)!.drik.id, 'whisky');
});

test('regelfejl kommer tilbage som svar, ikke som undtagelse', async () => {
  const { service } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  const svar = await service.udfoer(a, { type: 'slaa' });
  assert.equal(svar.ok, false);
  assert.match((svar as { besked: string }).besked, /ikke i gang/);
});

test('nøglen bindes ved join — og giver samme plads næste gang', async () => {
  const { service, repo } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  assert.equal((await service.hent(kode))!.sessioner?.[hashAf(token(1))], a.spillerId);
  // Join er vigtig — den ligger på disken med det samme.
  assert.equal(repo.raekker.get(kode)!.spil.sessioner?.[hashAf(token(1))], a.spillerId);

  const igen = await service.hej(kode, token(1), null);
  assert.equal(igen!.ident.spillerId, a.spillerId);
  const andre = await service.hej(kode, token(9), a.spillerId);
  assert.notEqual(andre!.ident.spillerId, a.spillerId);
});

test('står bordet stille, afgør uret afstemningen', async () => {
  const { service, klokke } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  const b = await ind(service, kode, 2, 'B');
  await ind(service, kode, 3, 'C');
  await service.udfoer(a, { type: 'start' });
  await service.udfoer(a, { type: 'afstemning-start', art: 'smid', spillerId: b.spillerId });
  assert.equal((await service.hent(kode))!.afstemning?.udfald, null);

  await klokke.frem(AFSTEMNING_SEKUNDER * 1000 + 200);
  const spil = (await service.hent(kode))!;
  // A stemte ja, C stemte ikke: 1–0 er flertal af de afgivne.
  assert.equal(spil.afstemning?.udfald, 'ja');
  assert.equal(spil.spillere.find((s) => s.id === b.spillerId)!.tilstand, 'ude');
});

test('værten går offline: hvervet går videre når fristen er gået', async () => {
  const { service, klokke, sidst } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  const b = await ind(service, kode, 2, 'B');

  await service.forbindelse(a, false);
  await klokke.frem((VAERT_FRIST_SEKUNDER - 1) * 1000);
  assert.equal(sidst.spil!.vaertId, a.spillerId);
  await klokke.frem(2000);
  assert.equal(sidst.spil!.vaertId, b.spillerId);
});

test('værten alene og offline: uret ringer én gang, ikke i ring', async () => {
  const { service, klokke, repo } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  await service.forbindelse(a, false);
  await klokke.frem(5000);
  const foer = repo.gemKald;

  await klokke.frem(VAERT_FRIST_SEKUNDER * 1000 * 10);
  assert.ok(repo.gemKald - foer <= 1, `skrev ${repo.gemKald - foer} gange`);
  assert.equal((await service.hent(kode))!.vaertId, a.spillerId);
});

test('kommer værten tilbage i tide, ringer uret ikke', async () => {
  const { service, klokke, sidst } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  await ind(service, kode, 2, 'B');
  await service.forbindelse(a, false);
  await klokke.frem(5000);
  await service.forbindelse(a, true);
  await klokke.frem(VAERT_FRIST_SEKUNDER * 2000);
  assert.equal(sidst.spil!.vaertId, a.spillerId);
  assert.equal(klokke.antalUre(), 0);
});

test('et spil der ryddes ud af hukommelsen, tager sine ure med', async () => {
  const { service, klokke } = opsaet();
  const { kode } = await service.opret();
  const a = await ind(service, kode, 1, 'A');
  await ind(service, kode, 2, 'B');
  await service.forbindelse(a, false);
  assert.ok(klokke.antalUre() > 0);

  // Fristen er gået og hvervet videregivet, men lad os rydde alt.
  await klokke.frem(UDLOEB);
  await service.luk();
  service.ryd();
  assert.equal(klokke.antalUre(), 0);
});
