import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANTAL_FELTER, FELT_RAEKKE, PIT_PLADSER, feltType
} from '../src/board.js';
import { nyBunke, virkning } from '../src/cards.js';
import { DRIKKE, SLURKE_PR_ENHED, iCl, tilDrik } from '../src/drinks.js';
import { STIGE, kode, trin, trinNavn } from '../src/meier.js';
import { afventerSpiller, anvend, find, nytSpil, taarnLoeberOver } from '../src/engine.js';
import { RegelFejl, type FeltType, type Handling, type Kontekst, type Spil } from '../src/types.js';

/* --------------------------------------------------------------- værktøj */

/** Kontekst med en scriptet terning, så alt kan efterprøves. */
function ktx(spillerId: string, slag: number[] = []): Kontekst {
  let i = 0;
  return {
    spillerId,
    terning: () => slag[i++] ?? 1,
    naa: () => '2026-01-01T00:00:00.000Z'
  };
}

function gør(spil: Spil, spillerId: string, h: Handling, slag: number[] = []): Spil {
  return anvend(spil, h, ktx(spillerId, slag));
}

function opsat(navne: string[]): Spil {
  let spil = nytSpil('spil', 'TEST', '2026-01-01T00:00:00.000Z');
  navne.forEach((navn, i) => {
    spil = gør(spil, 'p' + i, {
      type: 'join', navn, farve: '#D8A93F', drik: 'ol', kortHold: 'konge'
    });
  });
  return gør(spil, 'p0', { type: 'start' });
}

/** Sæt en spiller direkte på et felt, så en enkelt regel kan prøves isoleret. */
function placer(spil: Spil, id: string, felt: number): void {
  find(spil, id)!.felt = felt;
}

function foersteFeltAf(type: FeltType): number {
  return FELT_RAEKKE.indexOf(type) + 1;
}

/* ------------------------------------------------------------------ pladen */

test('pladen har 38 felter i den rækkefølge der står på brættet', () => {
  assert.equal(ANTAL_FELTER, 38);
  const tal: Record<string, number> = {};
  for (const t of FELT_RAEKKE) tal[t] = (tal[t] ?? 0) + 1;
  assert.deepEqual(tal, {
    fri: 11, tre: 4, skaal: 3, bm: 1, gobm: 3,
    taarn: 5, kort: 4, drik: 2, meier: 3, krone: 2
  });
});

test('felt 1 er "3 til..?" — det første felt efter pitten', () => {
  assert.equal(feltType(1), 'tre');
});

test('kortbunken er 52 kort uden jokere', () => {
  const b = nyBunke();
  assert.equal(b.length, 52);
  assert.equal(new Set(b.map((k) => k.rang + k.kuloer)).size, 52);
});

/* ------------------------------------------------------------------ slurke */

test('slurke omregnes til den drik man selv har valgt', () => {
  assert.equal(iCl(SLURKE_PR_ENHED, DRIKKE.ol), 33);
  assert.equal(iCl(SLURKE_PR_ENHED, DRIKKE.vin), 15);
  assert.equal(iCl(SLURKE_PR_ENHED, DRIKKE.whisky), 4);
  assert.equal(iCl(1, DRIKKE.ol), 3);
});

test('man kan skrive sin egen drik ind — navn, størrelse og procent', () => {
  const d = tilDrik({ navn: ' Classic ', enhedCl: 50, procent: 4.6 });
  assert.deepEqual(d, { id: 'egen', navn: 'Classic', procent: 4.6, enhedCl: 50 });
  assert.equal(iCl(SLURKE_PR_ENHED, d), 50);
  assert.throws(() => tilDrik({ navn: '', enhedCl: 50, procent: 4.6 }), RegelFejl);
  assert.throws(() => tilDrik({ navn: 'X', enhedCl: 0, procent: 4.6 }), RegelFejl);
  assert.throws(() => tilDrik({ navn: 'X', enhedCl: 33, procent: 120 }), RegelFejl);
  assert.throws(() => tilDrik('egen'), RegelFejl);

  let spil = nytSpil('spil', 'TEST', 'nu');
  spil = gør(spil, 'p0', {
    type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: { navn: 'Classic', enhedCl: 50, procent: 4.6 }, kortHold: 'konge'
  });
  assert.equal(find(spil, 'p0')!.drik.navn, 'Classic');
});

test('en tømt enhed erstattes af en ny', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('skaal') - 3);
  const a = find(spil, 'p0')!;
  a.slurkeTilbage = 1;
  spil = gør(spil, 'p0', { type: 'slaa' }, [3]);
  const efter = find(spil, 'p0')!;
  assert.equal(efter.enheder, 1);
  assert.equal(efter.slurkeTilbage, SLURKE_PR_ENHED);
  assert.equal(efter.slurkeIAlt, 1);
});

/* ------------------------------------------------------------- håndhævelse */

test('man kan ikke slå når det ikke er ens tur', () => {
  const spil = opsat(['A', 'B']);
  assert.throws(() => gør(spil, 'p1', { type: 'slaa' }, [3]), RegelFejl);
});

test('man kan ikke springe det spillet venter på over', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('tre') - 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(spil.afventer?.slags, 'giv-slurke');
  // Turen går først videre når de tre slurke er delt ud.
  assert.throws(() => gør(spil, 'p1', { type: 'slaa' }, [3]), RegelFejl);
  assert.throws(
    () => gør(spil, 'p0', { type: 'giv-slurke', fordeling: [{ spillerId: 'p1', antal: 2 }] }),
    RegelFejl
  );
  spil = gør(spil, 'p0', { type: 'giv-slurke', fordeling: [{ spillerId: 'p1', antal: 3 }] });
  assert.equal(find(spil, 'p1')!.slurkeIAlt, 3);
  assert.equal(afventerSpiller(spil.afventer), 'p1');
});

test('turen går med uret', () => {
  let spil = opsat(['A', 'B', 'C']);
  placer(spil, 'p0', 2);
  placer(spil, 'p1', 20);
  placer(spil, 'p2', 25);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]); // felt 4 = frifelt
  assert.equal(afventerSpiller(spil.afventer), 'p1');
  spil = gør(spil, 'p1', { type: 'slaa' }, [2]); // felt 22 = frifelt
  assert.equal(afventerSpiller(spil.afventer), 'p2');
});

/* --------------------------------------------------------------- pitten */

test('den man lander oveni ryger i pitten, slår selv om pladsen og drikker sine shots', () => {
  let spil = opsat(['A', 'B', 'C']);
  placer(spil, 'p0', 2);
  placer(spil, 'p1', 4); // frifelt
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]); // A rykker til 4, hvor B står
  // Turen går ikke videre før B har slået sig en plads — og det er B der slår.
  assert.equal(spil.afventer?.slags, 'pit-placering');
  assert.equal(afventerSpiller(spil.afventer), 'p1');
  assert.throws(() => gør(spil, 'p2', { type: 'slaa' }, [3]), RegelFejl);

  spil = gør(spil, 'p1', { type: 'slaa' }, [5]);
  const b = find(spil, 'p1')!;
  assert.equal(b.pitPlads, 5);
  assert.equal(b.felt, 0);
  assert.equal(b.slurkeIAlt, 5);
  assert.equal(spil.terningAf, 'p1');
  assert.equal(afventerSpiller(spil.afventer), 'p1'); // B er næste i turen
});

test('lander man på en optaget plads i pitten, slår den anden om — uden at drikke igen', () => {
  let spil = opsat(['A', 'B', 'C']);
  const c = find(spil, 'p2')!;
  c.felt = 0;
  c.pitPlads = 3;
  placer(spil, 'p0', 2);
  placer(spil, 'p1', 4);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]); // A rammer B
  spil = gør(spil, 'p1', { type: 'slaa' }, [3]); // B slår 3 — der står C
  assert.equal(spil.afventer?.slags, 'pit-placering');
  assert.equal(afventerSpiller(spil.afventer), 'p2');

  spil = gør(spil, 'p2', { type: 'slaa' }, [6]);
  assert.equal(find(spil, 'p2')!.pitPlads, 6);
  assert.equal(find(spil, 'p2')!.slurkeIAlt, 0);
  assert.equal(find(spil, 'p1')!.pitPlads, 3);
  assert.equal(afventerSpiller(spil.afventer), 'p1');
});

test('i pitten arbejder man sig ned mod 1 og drikker pladsens tal', () => {
  let spil = opsat(['A', 'B']);
  const b = find(spil, 'p1')!;
  b.felt = 0;
  b.pitPlads = 5;
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  spil = gør(spil, 'p1', { type: 'slaa' }, [2]);
  const efter = find(spil, 'p1')!;
  assert.equal(efter.pitPlads, 3);
  assert.equal(efter.slurkeIAlt, 3);
});

test('slår man nok, kommer man ud af pitten og ind på felt 1', () => {
  let spil = opsat(['A', 'B']);
  const b = find(spil, 'p1')!;
  b.felt = 0;
  b.pitPlads = 3;
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  spil = gør(spil, 'p1', { type: 'slaa' }, [3]);
  const efter = find(spil, 'p1')!;
  assert.equal(efter.pitPlads, 0);
  assert.equal(efter.felt, 1);
  // Felt 1 er "3 til..?", så spillet venter nu på at der bliver delt ud.
  assert.equal(spil.afventer?.slags, 'giv-slurke');
});

test('pitten har seks pladser', () => {
  assert.equal(PIT_PLADSER, 6);
});

/* ---------------------------------------------------------------- tårnet */

test('tårnet er en halv liter og løber over derover', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('taarn') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.equal(spil.afventer?.slags, 'fyld-taarn');

  // 16,5 slurke = 49,5 cl pilsner: det er der plads til.
  for (let i = 0; i < 66; i++) spil = gør(spil, 'p0', { type: 'fyld-taarn', slurke: 0.25 });
  assert.equal(spil.taarn.slurke, 16.5);
  assert.equal(taarnLoeberOver(spil), false);

  // En kvart slurk mere, og det løber over: den der hældte i, bunder det selv.
  spil = gør(spil, 'p0', { type: 'fyld-taarn', slurke: 0.25 });
  assert.equal(taarnLoeberOver(spil), true);
  spil = gør(spil, 'p0', { type: 'taarn-faerdig' });
  assert.equal(spil.taarn.toemmesAfId, 'p0');
  // Spillet venter ikke på ham — turen går videre med det samme.
  assert.equal(afventerSpiller(spil.afventer), 'p1');

  spil = gør(spil, 'p0', { type: 'toem-taarn-faerdig' });
  assert.equal(spil.taarn.slurke, 0);
  assert.equal(spil.taarn.toemmesAfId, null);
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 17);
  assert.equal(afventerSpiller(spil.afventer), 'p1');
});

test('DRIK! sætter tårnet på den der lander — og han spiller med imens', () => {
  let spil = opsat(['A', 'B']);
  spil.taarn.slurke = 4;
  placer(spil, 'p0', foersteFeltAf('drik') - 1);
  placer(spil, 'p1', 20);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.equal(spil.taarn.toemmesAfId, 'p0');
  assert.equal(afventerSpiller(spil.afventer), 'p1');

  // B slår, og turen kommer tilbage til A selvom tårnet ikke er tømt.
  spil = gør(spil, 'p1', { type: 'slaa' }, [2]); // felt 22 = frifelt
  assert.equal(afventerSpiller(spil.afventer), 'p0');
  assert.equal(spil.afventer?.slags, 'slag');

  // A siger til midt i det hele, og tårnet bogføres.
  spil = gør(spil, 'p0', { type: 'toem-taarn-faerdig' });
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 4);
  assert.equal(spil.taarn.slurke, 0);
  assert.equal(afventerSpiller(spil.afventer), 'p0');
});

test('2-kronen: den udpegede får tårnet og kan selv sige når det er bundet', () => {
  let spil = opsat(['A', 'B', 'C']);
  spil.taarn.slurke = 6;
  placer(spil, 'p0', foersteFeltAf('krone') - 1);
  placer(spil, 'p1', 20);
  placer(spil, 'p2', 25);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'krone-resultat', ramte: true });
  spil = gør(spil, 'p0', { type: 'krone-udpeg', spillerId: 'p2' });
  assert.equal(spil.taarn.toemmesAfId, 'p2');
  assert.equal(afventerSpiller(spil.afventer), 'p1');

  // C er ikke på tur, men må godt melde tårnet tomt.
  spil = gør(spil, 'p2', { type: 'toem-taarn-faerdig' });
  assert.equal(find(spil, 'p2')!.slurkeIAlt, 6);
  assert.equal(spil.taarn.toemmesAfId, null);
  // Og ingen andre kan gøre det for ham.
  spil.taarn.toemmesAfId = 'p2';
  assert.throws(() => gør(spil, 'p1', { type: 'toem-taarn-faerdig' }), RegelFejl);
});

test('lander man på "Øl i tårnet" mens en anden bunder det, råbes der', () => {
  let spil = opsat(['A', 'B']);
  spil.taarn.slurke = 5;
  spil.taarn.toemmesAfId = 'p1';
  placer(spil, 'p0', foersteFeltAf('taarn') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.ok(spil.log.some((h) => h.slags === 'raab'));
  assert.equal(spil.afventer?.slags, 'fyld-taarn');
});

/* ----------------------------------------------------------- Bier Meister */

test('Go! Bier Meister rammer Bier Meisteren, ikke den der lander', () => {
  let spil = opsat(['A', 'B']);
  spil.bierMeisterId = 'p1';
  placer(spil, 'p0', foersteFeltAf('gobm') - 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(find(spil, 'p1')!.slurkeIAlt, 3);
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 0);
});

test('uden Bier Meister drikker man selv på Go!', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('gobm') - 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 3);
});

/* ------------------------------------------------------------------ afgang */

test('man kan ikke hoppe ud som Bier Meister eller med øl i tårnet', () => {
  let spil = opsat(['A', 'B']);
  spil.bierMeisterId = 'p0';
  assert.throws(() => gør(spil, 'p0', { type: 'meld-afgang' }), /Bier Meister/);

  spil.bierMeisterId = null;
  spil.taarn.slurke = 3;
  assert.throws(() => gør(spil, 'p0', { type: 'meld-afgang' }), /tårnet/);

  spil.taarn.slurke = 0;
  spil = gør(spil, 'p0', { type: 'meld-afgang' });
  assert.equal(find(spil, 'p0')!.varslerAfgang, true);
});

test('afgang gælder først efter det sidste slag', () => {
  let spil = opsat(['A', 'B']);
  spil = gør(spil, 'p0', { type: 'meld-afgang' });
  assert.equal(find(spil, 'p0')!.tilstand, 'aktiv');
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(find(spil, 'p0')!.tilstand, 'ude');
});

test('hardcore kræver et blankt felt for at hoppe ud', () => {
  let spil = opsat(['A', 'B']);
  spil.indstillinger.hardcore = true;
  placer(spil, 'p0', foersteFeltAf('skaal'));
  assert.throws(() => gør(spil, 'p0', { type: 'meld-afgang' }), /blankt felt/);
  placer(spil, 'p0', foersteFeltAf('fri'));
  spil = gør(spil, 'p0', { type: 'meld-afgang' });
  assert.equal(find(spil, 'p0')!.varslerAfgang, true);
});

/* ------------------------------------------------------------------- Meier */

test('Meyer-stigen går fra 32 op til Meyer', () => {
  assert.equal(STIGE.length, 21);
  assert.equal(trinNavn(0), '32');
  assert.equal(trinNavn(STIGE.length - 1), 'Meyer');
  assert.equal(trinNavn(STIGE.length - 2), 'Lillemeyer');
  assert.equal(kode(3, 6), 63);
  assert.ok(trin(2, 1) > trin(3, 1));
  assert.ok(trin(3, 1) > trin(6, 6));
  assert.ok(trin(1, 1) > trin(6, 5));
});

test('løfter man en bluf, drikker den der løj', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });

  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [3, 2]); // reelt 32 = laveste
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(6, 5) }); // melder 65
  assert.equal(spil.meier?.holderId, 'p1');

  spil = gør(spil, 'p1', { type: 'meier-loeft' });
  assert.equal(find(spil, 'p0')!.slurkeIAlt, spil.indstillinger.meierSlurke);
  assert.equal(find(spil, 'p1')!.slurkeIAlt, 0);
  assert.equal(spil.meier, null);
});

test('løfter man en sand melding, drikker man selv', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [6, 5]);
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(6, 5) });
  spil = gør(spil, 'p1', { type: 'meier-loeft' });
  assert.equal(find(spil, 'p1')!.slurkeIAlt, spil.indstillinger.meierSlurke);
});

test('løftet bægeret giver hele bordet et resultat at fejre', async () => {
  const { forSpiller } = await import('../src/engine.js');
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  assert.equal(spil.meierResultat, null);

  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [3, 2]); // reelt 32
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(6, 5) }); // bluffer 65
  spil = gør(spil, 'p1', { type: 'meier-loeft' });

  const r = spil.meierResultat!;
  assert.equal(r.vinderId, 'p1');
  assert.equal(r.taberId, 'p0');
  assert.deepEqual(r.slag, [3, 2]);
  assert.equal(r.melding, trin(6, 5));
  assert.equal(r.loej, true);
  assert.equal(r.dobbelt, false);
  assert.equal(r.slurke, spil.indstillinger.meierSlurke);
  // Terningerne er offentlige nu — det er dét fejringen viser.
  assert.deepEqual(forSpiller(spil, 'p0').meierResultat?.slag, [3, 2]);
});

test('en ny Meier rydder den forrige fejring', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [6, 5]);
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(6, 5) });
  spil = gør(spil, 'p1', { type: 'meier-loeft' });
  assert.notEqual(spil.meierResultat, null);

  placer(spil, 'p1', foersteFeltAf('meier') - 1);
  spil.turIdx = spil.spillere.findIndex((s) => s.id === 'p1');
  spil.afventer = { slags: 'slag', spillerId: 'p1' };
  spil = gør(spil, 'p1', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p1', { type: 'meier-vaelg', spillerId: 'p0' });
  assert.equal(spil.meierResultat, null);
});

test('taber man på en Meyer, drikker man dobbelt', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [2, 1]); // faktisk Meyer
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(2, 1) });
  spil = gør(spil, 'p1', { type: 'meier-loeft' });
  assert.equal(find(spil, 'p1')!.slurkeIAlt, spil.indstillinger.meierSlurke * 2);
});

test('kun den der selv slog, må se slaget', async () => {
  const { forSpiller } = await import('../src/engine.js');
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [6, 5]);
  assert.deepEqual(forSpiller(spil, 'p0').meier?.slag, [6, 5]);
  assert.equal(forSpiller(spil, 'p1').meier?.slag, null);
  assert.equal(forSpiller(spil, 'p0').bunke.length, 0);

  // Får man bægeret rakt over bordet, må man ikke kigge under det.
  spil = gør(spil, 'p0', { type: 'meier-meld', melding: trin(6, 5) });
  assert.equal(spil.meier?.holderId, 'p1');
  assert.equal(forSpiller(spil, 'p1').meier?.slag, null);

  // Men man må gerne tro på meldingen og slå videre.
  spil = gør(spil, 'p1', { type: 'meier-slaa' }, [6, 6]);
  assert.deepEqual(forSpiller(spil, 'p1').meier?.slag, [6, 6]);
  assert.equal(forSpiller(spil, 'p0').meier?.slag, null);
});

/* ------------------------------------------------------------------ kortene */

test('sorte kort drikker man selv, røde deler man ud', () => {
  assert.deepEqual(virkning({ rang: '4', kuloer: 'spar' }), { slags: 'selv', antal: 4 });
  assert.deepEqual(virkning({ rang: '4', kuloer: 'hjerter' }), { slags: 'giv', antal: 4 });
  assert.deepEqual(virkning({ rang: '6', kuloer: 'ruder' }), { slags: 'ingenting' });
  assert.equal(virkning({ rang: 'K', kuloer: 'spar' }).slags, 'hold');
});

test('træk et kort venter på at kortet bliver kvitteret', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('kort') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.equal(spil.afventer?.slags, 'traek-kort');
  spil = gør(spil, 'p0', { type: 'traek-kort' });
  assert.ok(spil.sidsteKort);
  assert.notEqual(spil.afventer?.slags, 'traek-kort');
});

/* ------------------------------------------------------------------- lobby */

test('kun værten kan starte, og navne skal være unikke', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  spil = gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' });
  assert.throws(
    () => gør(spil, 'p1', { type: 'join', navn: 'jeppe', farve: '#8FAF74', drik: 'vin', kortHold: 'konge' }),
    /allerede en med det navn/
  );
  spil = gør(spil, 'p1', { type: 'join', navn: 'Mette', farve: '#8FAF74', drik: 'vin', kortHold: 'konge' });
  assert.throws(() => gør(spil, 'p1', { type: 'start' }), /værten/);
  spil = gør(spil, 'p0', { type: 'start' });
  assert.equal(spil.fase, 'spiller');
});

test('man kan spille alene', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  spil = gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' });
  spil = gør(spil, 'p0', { type: 'start' });
  assert.equal(spil.fase, 'spiller');
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(afventerSpiller(spil.afventer), 'p0');
});

test('man er enten med damerne eller herrerne — ikke begge, ikke ingen', () => {
  const spil = nytSpil('spil', 'TEST', 'nu');
  for (const hold of ['begge', 'ingen', '']) {
    assert.throws(
      () => gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: hold as 'dame' }),
      /damerne eller herrerne/
    );
  }
});

test('Dame-kortet rammer damerne, Konge-kortet herrerne', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  spil = gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' });
  spil = gør(spil, 'p1', { type: 'join', navn: 'Mette', farve: '#8FAF74', drik: 'vin', kortHold: 'dame' });
  spil = gør(spil, 'p0', { type: 'start' });
  placer(spil, 'p0', foersteFeltAf('kort') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil.bunke.unshift({ rang: 'D', kuloer: 'hjerter' });
  spil = gør(spil, 'p0', { type: 'traek-kort' });
  assert.equal(find(spil, 'p1')!.slurkeIAlt, 2);
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 0);
});

test('har man linket, kan man hoppe med mens spillet kører', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  spil = gør(spil, 'p9', { type: 'join', navn: 'Sent', farve: '#B189A6', drik: 'ol', kortHold: 'dame' });
  const ny = find(spil, 'p9')!;
  assert.equal(ny.tilstand, 'aktiv');
  assert.equal(feltType(ny.felt), 'fri');
  assert.equal(ny.pitPlads, 0);
  // Turen er stadig hos B; den nye kommer med bagest i rækken.
  assert.equal(afventerSpiller(spil.afventer), 'p1');
  placer(spil, 'p1', 20);
  spil = gør(spil, 'p1', { type: 'slaa' }, [2]);
  assert.equal(afventerSpiller(spil.afventer), 'p9');

  spil.fase = 'slut';
  assert.throws(
    () => gør(spil, 'p8', { type: 'join', navn: 'Forsent', farve: '#B189A6', drik: 'ol', kortHold: 'dame' }),
    /slut/
  );
});

test('der er højst otte ved bordet', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  for (let i = 0; i < 8; i++) {
    spil = gør(spil, 'p' + i, {
      type: 'join', navn: 'S' + i, farve: '#D8A93F', drik: 'ol', kortHold: 'konge'
    });
  }
  assert.throws(
    () => gør(spil, 'p9', { type: 'join', navn: 'Ni', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' }),
    /otte ved bordet/
  );
});

/* ---------------------------------------------------------- terning og fejring */

test('hvert slag på pladen tæller terningen op — også i pitten', () => {
  let spil = opsat(['A', 'B']);
  assert.equal(spil.terningNr, 0);
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(spil.terningNr, 1);
  assert.equal(spil.terningAf, 'p0');
  const b = find(spil, 'p1')!;
  b.felt = 0;
  b.pitPlads = 5;
  spil.afventer = { slags: 'pit-slag', spillerId: 'p1' };
  spil = gør(spil, 'p1', { type: 'slaa' }, [1]);
  assert.equal(spil.terningNr, 2);
});

test('kapløbet ender i en fejring af den første — og sidste mand drikker', () => {
  let spil = opsat(['A', 'B', 'C']);
  placer(spil, 'p0', foersteFeltAf('kort') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil.bunke.unshift({ rang: '7', kuloer: 'klor' });
  spil = gør(spil, 'p0', { type: 'traek-kort' });
  assert.equal(spil.afventer?.slags, 'kaploeb');
  spil = gør(spil, 'p2', { type: 'kaploeb-tryk' });
  assert.equal(spil.fejring, null);
  spil = gør(spil, 'p0', { type: 'kaploeb-tryk' });
  assert.equal(spil.fejring?.art, 'kaploeb');
  assert.equal(spil.fejring?.vinderId, 'p2');
  assert.equal(spil.fejring?.taberId, 'p1');
  assert.deepEqual(spil.fejring?.naaedeIds, ['p2', 'p0']);
  assert.equal(find(spil, 'p1')!.slurkeIAlt, 1);
});
