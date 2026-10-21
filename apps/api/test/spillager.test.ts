import assert from 'node:assert/strict';
import test from 'node:test';

import { nytSpil, type Spil } from '@k69/rules';
import { GEM_FORSINKELSE, Spillager, UDLOEB } from '../src/app/Spillager.js';
import { FalskKlokke, HukommelsesRepo, port, roligt } from './hjaelpere.js';

function opsaet(): { repo: HukommelsesRepo; klokke: FalskKlokke; lager: Spillager; udloebne: string[] } {
  const repo = new HukommelsesRepo();
  const klokke = new FalskKlokke();
  const udloebne: string[] = [];
  const lager = new Spillager(repo, klokke, (id) => udloebne.push(id));
  return { repo, klokke, lager, udloebne };
}

/** Et spil der står i databasen, men ikke i hukommelsen — som efter en genstart. */
function iDatabasen(repo: HukommelsesRepo, kode = 'ABCDE'): Spil {
  const spil = nytSpil('id-' + kode, kode, '2026-01-01T00:00:00.000Z');
  repo.raekker.set(kode, { spil, version: 1 });
  return spil;
}

const med = (spil: Spil, runde: number): Spil => ({ ...spil, runde });

test('to der henter samme spil samtidig, får det samme — og databasen spørges én gang', async () => {
  const { repo, lager } = opsaet();
  iDatabasen(repo);
  const vent = port();
  repo.foerHent = () => vent.aaben;

  const a = lager.hent('ABCDE');
  const b = lager.hent('abcde ');
  vent.luk_op();
  const [sa, sb] = await Promise.all([a, b]);

  assert.equal(repo.hentKald, 1);
  assert.ok(sa);
  assert.equal(sa, sb);
  assert.equal(await lager.hent('ABCDE'), sa);
  assert.equal(repo.hentKald, 1);
});

test('et spil der ikke findes, giver null og huskes ikke', async () => {
  const { repo, lager } = opsaet();
  assert.equal(await lager.hent('NIX'), null);
  iDatabasen(repo, 'NIX');
  assert.ok(await lager.hent('NIX'));
});

test('mange små ændringer bliver til én skrivning af den nyeste', async () => {
  const { repo, klokke, lager } = opsaet();
  const spil = await lager.opret((kode) => nytSpil('id', kode, 'nu'));
  for (let i = 1; i <= 5; i++) lager.gem(med(spil, i));
  assert.equal(repo.gemKald, 0);

  await klokke.frem(GEM_FORSINKELSE);
  assert.equal(repo.gemKald, 1);
  const gemt = repo.raekker.get(spil.kode)!;
  assert.equal(gemt.spil.runde, 5);
  assert.equal(gemt.version, 6);
  assert.equal(lager.uskrevne(), 0);
});

test('skrivninger for ét spil overhaler aldrig hinanden — det nyeste lander sidst', async () => {
  const { repo, lager } = opsaet();
  const spil = await lager.opret((kode) => nytSpil('id', kode, 'nu'));
  // Den første skrivning hænger i databasen, mens der kommer to til.
  const foerste = port();
  repo.foerGem = (version) => (version === 2 ? foerste.aaben : Promise.resolve());

  lager.gem(med(spil, 1), true);
  await roligt();
  lager.gem(med(spil, 2), true);
  lager.gem(med(spil, 3), true);
  await roligt();
  assert.equal(repo.gemKald, 1, 'de næste venter på den første');

  foerste.luk_op();
  await roligt();
  assert.equal(repo.flestSamtidig, 1);
  const gemt = repo.raekker.get(spil.kode)!;
  assert.equal(gemt.spil.runde, 3);
  assert.equal(gemt.version, 4);
  // Version 3 blev aldrig skrevet for sig — køen tog det nyeste.
  assert.equal(repo.gemKald, 2);
});

test('versionsvagten: et ældre billede skriver aldrig et nyere over', async () => {
  const repo = new HukommelsesRepo();
  const spil = nytSpil('id', 'ABCDE', 'nu');
  await repo.opret(spil);
  assert.equal(await repo.gem(med(spil, 5), 5), true);
  assert.equal(await repo.gem(med(spil, 4), 4), false);
  assert.equal(await repo.gem(med(spil, 5), 5), false);
  assert.equal(repo.raekker.get('ABCDE')!.spil.runde, 5);
});

test('fejler en skrivning, prøves den igen ved næste ændring', async () => {
  const { repo, lager } = opsaet();
  const spil = await lager.opret((kode) => nytSpil('id', kode, 'nu'));
  repo.fejlVedGem = true;
  const fejl = console.error;
  console.error = () => {};
  try {
    lager.gem(med(spil, 1), true);
    await roligt();
  } finally {
    console.error = fejl;
  }
  assert.equal(lager.uskrevne(), 1);

  repo.fejlVedGem = false;
  await lager.skrivAlle();
  assert.equal(lager.uskrevne(), 0);
  assert.equal(repo.raekker.get(spil.kode)!.spil.runde, 1);
});

test('oprydningen tager kun spil der er skrevet — og siger til', async () => {
  const { repo, klokke, lager, udloebne } = opsaet();
  const rent = await lager.opret((kode) => nytSpil('rent', kode, 'nu'));
  const snavset = await lager.opret((kode) => nytSpil('snavset', kode, 'nu'));
  lager.gem(med(snavset, 1));
  repo.fejlVedGem = true;

  await klokke.frem(UDLOEB);
  const fejl = console.error;
  console.error = () => {};
  try {
    lager.ryd();
    await roligt();
  } finally {
    console.error = fejl;
  }
  assert.deepEqual(udloebne, ['rent']);
  assert.equal(lager.uskrevne(), 1, 'det uskrevne spil bliver i hukommelsen');

  repo.fejlVedGem = false;
  lager.ryd();
  await roligt();
  lager.ryd();
  assert.deepEqual(udloebne, ['rent', 'snavset']);

  // Næste gang hentes det fra databasen igen.
  const foer = repo.hentKald;
  await lager.hent(rent.kode);
  assert.equal(repo.hentKald, foer + 1);
});

test('loglinjer skrives i rækkefølge, efter spillet', async () => {
  const { repo, lager } = opsaet();
  const spil = await lager.opret((kode) => nytSpil('id', kode, 'nu'));
  const vent = port();
  repo.foerGem = () => vent.aaben;
  lager.gem(med(spil, 1), true);
  lager.log(spil.id, [{ id: 1, tid: 'nu', slags: 'a', tekst: 'første' }]);
  lager.log(spil.id, [{ id: 2, tid: 'nu', slags: 'b', tekst: 'anden' }]);
  await roligt();
  assert.equal(repo.logget.length, 0, 'loggen venter på spillet');
  vent.luk_op();
  await roligt();
  assert.deepEqual(repo.logget.map((l) => l.tekst), ['første', 'anden']);
});
