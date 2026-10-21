import assert from 'node:assert/strict';
import test from 'node:test';

import { anvend, nytSpil, trinNavn, type DomaeneHaendelse, type Spil } from '@k69/rules';
import { haendelseFarve, haendelseTekst } from '../src/tekst.js';

/** A og B ved bordet — navnene teksterne slår op. */
function bord(): Spil {
  let spil = nytSpil('spil', 'TEST', 'nu');
  for (const [id, navn, farve] of [['a', 'A', '#D8A93F'], ['b', 'B', '#8FAF74']] as const) {
    spil = anvend(spil, { type: 'join', navn, farve, drik: 'ol', kortHold: 'konge' }, {
      spillerId: id, terning: () => 1, tilfaeldig: () => 0.5, naa: () => 'nu'
    });
  }
  return spil;
}

const tekst = (data: DomaeneHaendelse): string => haendelseTekst(bord(), { id: 1, tid: 'nu', data });

/*
 * Teksterne er de samme som motoren skrev før hændelserne fik struktur. De
 * fleste er sammenlignet med den gamle motor ved at spille tusindvis af
 * tilfældige spil side om side; her er dem et tilfældigt spil sjældent rammer.
 */
test('de sjældne hændelser har samme tekst som før', () => {
  const forventet: Array<[DomaeneHaendelse, string]> = [
    [{ type: 'slut' }, 'Spillet er slut — der er ingen tilbage ved bordet.'],
    [{ type: 'pit-slaaes-for', spillerId: 'a' }, 'Terningen bliver slået for A.'],
    [{ type: 'taarn-frit', spillerId: 'a' }, 'Tårnet står frit igen — A nåede ikke at bunde det.'],
    [{ type: 'bunke-blandet' }, 'Bunken var brugt op — der er blandet et nyt spil kort.'],
    [{ type: 'sidemand', spillerId: 'a', side: 'venstre', drikker: null, slurke: 1 }, 'Der er ingen ved siden af A — ingen drikker.'],
    [{ type: 'sidemand', spillerId: 'a', side: 'hoejre', drikker: 'b', slurke: 1 }, 'B sidder til højre og drikker 1 slurk.'],
    [{ type: 'hold-drikker', spillerId: 'a', hold: 'dame', ramte: [], slurke: 2 }, 'Damerne drikker — men ingen ved bordet er med på det hold.'],
    [{ type: 'hold-drikker', spillerId: 'a', hold: 'konge', ramte: ['a', 'b'], slurke: 2 }, 'Herrerne drikker 2 slurke: A, B.'],
    [{ type: 'pit-plads', spillerId: 'a', plads: 1, skubbet: false }, 'A slog 1: plads 1 i pitten og 1 shot.'],
    [{ type: 'pit-plads', spillerId: 'a', plads: 4, skubbet: true }, 'A blev skubbet videre i pitten og slog sig til plads 4.'],
    [{ type: 'go-bier-meister', landetAf: 'a', drikker: 'a', harBm: false }, 'Go! Bier Meister — der er ingen Bier Meister, så A drikker selv 3 slurke.'],
    [{ type: 'krone', spillerId: 'a', udfald: 'tomt-taarn' }, 'A ramte i — men tårnet er tomt, så der er ingen at udpege.'],
    [{ type: 'krone', spillerId: 'a', udfald: 'taarn-optaget', drikkesAf: 'b' }, 'A ramte i — men B er i gang med at drikke tårnet, så det kan ikke gives videre.'],
    [{ type: 'taarn-givet', spillerId: 'a', grund: 'drik', slurke: 0, udfald: 'tomt' },
      'DRIK! A skal bunde tårnet — 0 slurke. Men tårnet er tomt — der er ikke noget at drikke.'],
    [{ type: 'taarn-givet', spillerId: 'a', grund: 'overloeb', kapacitetCl: 50, slurke: 15, udfald: 'optaget', drikkesAf: 'b' },
      'Tårnet løb over 50 cl — A bunder det selv. Men B er i gang med at drikke tårnet — det bliver hos B.'],
    [{ type: 'taarn-givet', spillerId: 'b', grund: 'udpeget', udpegetAf: 'a', slurke: 3, udfald: 'givet' },
      'A udpegede B til at bunde tårnet — 3 slurke.'],
    [{ type: 'syver-tabt', spillerId: 'a', nyHolder: 'b' }, "A nåede ikke at lægge fingeren før næste 7'er — han drikker en slurk, og B tager over."],
    [{ type: 'finger', lagtAf: 'a', sidste: null }, 'A lagde fingeren på bordkanten — og alle nåede det.'],
    [{ type: 'meier-loeftet', loefterId: 'a', faktisk: 20, meldt: 21, taberId: null, slurke: 4, dobbelt: true },
      `A løftede bægeret: ${trinNavn(20)} mod meldingen ${trinNavn(21)}. Ingen drikker 4 slurke — dobbelt, det var en Meyer.`],
    [{ type: 'afstemning-afgjort', maalId: 'b', art: 'spring', ja: 1, nej: 2, udfald: 'nej' }, 'Bordet stemte nej (1–2) — B bliver ikke sprunget over.'],
    [{ type: 'afstemning-afgjort', maalId: 'b', art: 'smid', ja: 2, nej: 0, udfald: 'smidt-ud' }, 'Bordet stemte ja (2–0) — B er smidt ud af spillet.'],
    [{ type: 'gammel', slags: 'join', tekst: 'Sådan stod det før.' }, 'Sådan stod det før.']
  ];
  for (const [data, ud] of forventet) assert.equal(tekst(data), ud, data.type);
});

test('en spiller der ikke findes, hedder Nogen — en anmodning har sit eget navn', () => {
  assert.equal(tekst({ type: 'join', spillerId: 'x' }), 'Nogen kom med til bordet.');
  assert.equal(tekst({ type: 'anmodning', navn: 'Cille' }), 'Cille vil gerne med — venter på at værten lukker ind.');
});

test('navne slås op når teksten laves — skifter man navn, følger loggen med', () => {
  const spil = bord();
  const h = { id: 1, tid: 'nu', data: { type: 'join', spillerId: 'a' } as const };
  spil.spillere[0]!.navn = 'Anna';
  assert.equal(haendelseTekst(spil, h), 'Anna kom med til bordet.');
});

test('farven er brikfarven på den linjen handler om', () => {
  const spil = bord();
  assert.equal(haendelseFarve(spil, { id: 1, tid: 'nu', spillerId: 'b', data: { type: 'slut' } }), '#8FAF74');
  assert.equal(haendelseFarve(spil, { id: 1, tid: 'nu', data: { type: 'slut' } }), undefined);
});
