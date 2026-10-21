import assert from 'node:assert/strict';
import test from 'node:test';

import { SpilService } from '../src/app/SpilService.js';
import { WsHub } from '../src/transport/ws.js';
import { FalskKlokke, FalskSok, HukommelsesRepo, port, roligt, token } from './hjaelpere.js';

async function opsaet() {
  const repo = new HukommelsesRepo();
  const klokke = new FalskKlokke();
  let n = 0;
  const service = new SpilService({ repo, klokke, nytId: () => `p${n++}` });
  const hub = new WsHub(service, klokke);
  const { kode } = await service.opret();
  return { repo, klokke, service, hub, kode };
}

const join = { type: 'join', navn: 'A', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' };

test('hej → velkommen med id, nøgle og spillet', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  const v = sok.sidste('velkommen')!;
  assert.equal(v.token, token(1));
  assert.equal((v.spil as { kode: string }).kode, kode);
  assert.equal(hub.antalTilsluttede(), 1);
});

test('lukker socketten før hej er svaret, kommer den ikke ind i rummet', async () => {
  const { repo, kode } = await opsaet();
  // En frisk server: spillet ligger kun i databasen, så hej må vente på den.
  const klokke = new FalskKlokke();
  const service = new SpilService({ repo, klokke });
  const hub = new WsHub(service, klokke);
  const vent = port();
  repo.foerHent = () => vent.aaben;

  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  sok.luk();
  vent.luk_op();
  await roligt();
  assert.equal(hub.antalTilsluttede(), 0);
  assert.equal(sok.sidste('velkommen'), undefined);
});

test('et nyt hej på samme socket erstatter det gamle', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  assert.equal(hub.antalTilsluttede(), 1);
  assert.equal(sok.modtaget.filter((b) => b.t === 'velkommen').length, 2);
});

test('to hej lige efter hinanden: kun det sidste sætter sig', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  sok.skriv({ t: 'hej', kode, token: token(2), spillerId: null });
  await roligt();
  assert.equal(hub.antalTilsluttede(), 1);
  const velkommen = sok.modtaget.filter((b) => b.t === 'velkommen');
  assert.equal(velkommen.length, 1);
  assert.equal(velkommen[0]!.token, token(2));
});

test('en handling før velkommen får et svar i stedet for at forsvinde', async () => {
  const { hub } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'handling', handling: { type: 'slaa' } });
  await roligt();
  assert.match(String(sok.sidste('fejl')?.besked), /Ikke forbundet/);
});

test('handling efter velkommen: alle i rummet får det nye spil', async () => {
  const { hub, kode } = await opsaet();
  const a = new FalskSok();
  const b = new FalskSok();
  hub.tilslut(a);
  hub.tilslut(b);
  a.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  b.skriv({ t: 'hej', kode, token: token(2), spillerId: null });
  await roligt();
  a.skriv({ t: 'handling', handling: join });
  await roligt();
  const spillere = (b.sidste('spil')!.spil as { spillere: Array<{ navn: string }> }).spillere;
  assert.deepEqual(spillere.map((s) => s.navn), ['A']);
});

test('ugyldig handling og regelfejl giver fejl til afsenderen', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  sok.skriv({ t: 'handling', handling: { type: 'forbindelse', tilsluttet: true } });
  await roligt();
  assert.equal(sok.sidste('fejl')?.besked, 'Ugyldig handling.');
  sok.skriv({ t: 'handling', handling: { type: 'start' } });
  await roligt();
  assert.match(String(sok.sidste('fejl')?.besked), /værten|mindst én/);
});

test('gammel klient uden nøgle får besked om at genindlæse', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode, spillerId: 'p0' });
  await roligt();
  const f = sok.sidste('fejl')!;
  assert.equal(f.fatal, true);
  assert.match(String(f.besked), /genindlæs/);
});

test('ukendt spil er en fatal fejl', async () => {
  const { hub } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  sok.skriv({ t: 'hej', kode: 'NIX', token: token(1), spillerId: null });
  await roligt();
  assert.equal(sok.sidste('fejl')?.fatal, true);
});

test('også hej er begrænset — en socket kan ikke hamre løs', async () => {
  const { hub, kode } = await opsaet();
  const sok = new FalskSok();
  hub.tilslut(sok);
  for (let i = 0; i < 100; i++) sok.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  assert.ok(sok.modtaget.some((b) => b.t === 'fejl' && /Rolig nu/.test(String(b.besked))));
});

test('lukker sidste forbindelse for en spiller, markeres han offline', async () => {
  const { hub, kode, service } = await opsaet();
  const a1 = new FalskSok();
  const a2 = new FalskSok();
  hub.tilslut(a1);
  a1.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();
  a1.skriv({ t: 'handling', handling: join });
  await roligt();
  hub.tilslut(a2);
  a2.skriv({ t: 'hej', kode, token: token(1), spillerId: null });
  await roligt();

  a1.luk();
  await roligt();
  assert.equal((await service.hent(kode))!.spillere[0]!.tilsluttet, true, 'stadig inde via den anden fane');
  a2.luk();
  await roligt();
  assert.equal((await service.hent(kode))!.spillere[0]!.tilsluttet, false);
});
