import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANTAL_FELTER, FELT_RAEKKE, PIT_PLADSER, feltType
} from '../src/board.js';
import { nyBunke, virkning } from '../src/cards.js';
import { SLURKE_PR_ENHED, iCl } from '../src/drinks.js';
import { STIGE, kode, trin, trinNavn } from '../src/meier.js';
import { afventerSpiller, anvend, find, nytSpil } from '../src/engine.js';
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
      type: 'join', navn, farve: '#D8A93F', drik: 'ol', kortHold: 'ingen'
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
  assert.equal(iCl(SLURKE_PR_ENHED, 'ol'), 33);
  assert.equal(iCl(SLURKE_PR_ENHED, 'vin'), 15);
  assert.equal(iCl(SLURKE_PR_ENHED, 'whisky'), 4);
  assert.equal(iCl(1, 'ol'), 3);
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

test('den man lander oveni ryger i pitten og drikker sine shots', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', 2);
  placer(spil, 'p1', 4); // frifelt
  spil = gør(spil, 'p0', { type: 'slaa' }, [2, 5]); // A rykker til 4, B slår 5 i pitten
  const b = find(spil, 'p1')!;
  assert.equal(b.pitPlads, 5);
  assert.equal(b.felt, 0);
  assert.equal(b.slurkeIAlt, 5);
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

test('tårnet fyldes i slurke og løber over ved kapaciteten', () => {
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('taarn') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.equal(spil.afventer?.slags, 'fyld-taarn');

  for (let i = 0; i < 6; i++) spil = gør(spil, 'p0', { type: 'fyld-taarn', slurke: 3 });
  assert.equal(spil.taarn.slurke, 18);

  spil = gør(spil, 'p0', { type: 'taarn-faerdig' });
  // Over 16 slurke: den der hældte i, bunder det selv.
  assert.equal(spil.afventer?.slags, 'toem-taarn');
  assert.equal(spil.taarn.toemmesAfId, 'p0');

  spil = gør(spil, 'p0', { type: 'toem-taarn-faerdig' });
  assert.equal(spil.taarn.slurke, 0);
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 18);
  assert.equal(afventerSpiller(spil.afventer), 'p1');
});

test('DRIK! sætter tårnet på den der lander, og han springes over imens', () => {
  let spil = opsat(['A', 'B', 'C']);
  spil.taarn.slurke = 4;
  placer(spil, 'p0', foersteFeltAf('drik') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  assert.equal(spil.afventer?.slags, 'toem-taarn');
  assert.equal(spil.taarn.toemmesAfId, 'p0');

  // A stiller tårnet fra sig uden at tømme det: turen går videre til B,
  // og når runden når rundt, springes A over.
  placer(spil, 'p1', 2);
  spil = gør(spil, 'p0', { type: 'toem-taarn-faerdig' });
  assert.equal(find(spil, 'p0')!.slurkeIAlt, 4);
  assert.equal(spil.taarn.slurke, 0);
});

test('den der er i gang med tårnet, springes over', () => {
  let spil = opsat(['A', 'B']);
  spil.taarn.slurke = 5;
  spil.taarn.toemmesAfId = 'p1';
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]); // frifelt
  // B er optaget af tårnet, så turen bliver hos A.
  assert.equal(afventerSpiller(spil.afventer), 'p0');
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

test('kun holderen af bægeret må se slaget', async () => {
  const { forSpiller } = await import('../src/engine.js');
  let spil = opsat(['A', 'B']);
  placer(spil, 'p0', foersteFeltAf('meier') - 1);
  spil = gør(spil, 'p0', { type: 'slaa' }, [1]);
  spil = gør(spil, 'p0', { type: 'meier-vaelg', spillerId: 'p1' });
  spil = gør(spil, 'p0', { type: 'meier-slaa' }, [6, 5]);
  assert.deepEqual(forSpiller(spil, 'p0').meier?.slag, [6, 5]);
  assert.equal(forSpiller(spil, 'p1').meier?.slag, null);
  assert.equal(forSpiller(spil, 'p0').bunke.length, 0);
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
  spil = gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: 'ingen' });
  assert.throws(
    () => gør(spil, 'p1', { type: 'join', navn: 'jeppe', farve: '#8FAF74', drik: 'vin', kortHold: 'ingen' }),
    /allerede en med det navn/
  );
  spil = gør(spil, 'p1', { type: 'join', navn: 'Mette', farve: '#8FAF74', drik: 'vin', kortHold: 'ingen' });
  assert.throws(() => gør(spil, 'p1', { type: 'start' }), /værten/);
  spil = gør(spil, 'p0', { type: 'start' });
  assert.equal(spil.fase, 'spiller');
});

test('man kan spille alene', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  spil = gør(spil, 'p0', { type: 'join', navn: 'Jeppe', farve: '#D8A93F', drik: 'ol', kortHold: 'ingen' });
  spil = gør(spil, 'p0', { type: 'start' });
  assert.equal(spil.fase, 'spiller');
  placer(spil, 'p0', 2);
  spil = gør(spil, 'p0', { type: 'slaa' }, [2]);
  assert.equal(afventerSpiller(spil.afventer), 'p0');
});

test('der er højst otte ved bordet', () => {
  let spil = nytSpil('spil', 'TEST', 'nu');
  for (let i = 0; i < 8; i++) {
    spil = gør(spil, 'p' + i, {
      type: 'join', navn: 'S' + i, farve: '#D8A93F', drik: 'ol', kortHold: 'ingen'
    });
  }
  assert.throws(
    () => gør(spil, 'p9', { type: 'join', navn: 'Ni', farve: '#D8A93F', drik: 'ol', kortHold: 'ingen' }),
    /otte ved bordet/
  );
});
