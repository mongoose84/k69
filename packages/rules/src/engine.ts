import {
  ANTAL_FELTER, PIT_PLADSER, feltInfo, feltType, ryk
} from './board.js';
import {
  HOEJERE_LAVERE_SLURKE, HOLD_SLURKE, SIDEMAND_SLURKE, bland, gaetRigtigt, kortNavn, nyBunke, virkning
} from './cards.js';
import { formatSlurke, slurkePrEnhed, taarnCl, taarnKapacitetSlurke, tilDrik } from './drinks.js';
import { STIGE, erMeyer, trin, trinNavn } from './meier.js';
import {
  RegelFejl,
  type Afventer, type DrikValg, type Handling, type Haendelse, type Kontekst,
  type Fejring, type Kort, type KortHold, type Spil, type Spiller, type Udraab
} from './types.js';
import type { DomaeneHaendelse } from './haendelser.js';

export const BRIKFARVER = [
  '#D8A93F', '#8FAF74', '#87A4C6', '#C4776B', '#B189A6', '#7FB0A4', '#E07B39', '#9C9A78'
];

export const STANDARD_INDSTILLINGER = {
  hardcore: false,
  taarnKapacitetCl: 50
};

/** Slurke til taberen af en Meier-runde — også i hardcore. Dobbelt hvis der tabes på en Meyer. */
export const MEIER_SLURKE = 3;

const KORT_HOLD: KortHold[] = ['dame', 'konge'];

/** Startfelter: frifelterne, fordelt rundt om pladen så man ikke starter oveni hinanden. */
const STARTFELTER = Array.from({ length: ANTAL_FELTER }, (_, i) => i + 1).filter((nr) => feltType(nr) === 'fri');

function fejl(besked: string): never {
  throw new RegelFejl(besked);
}

export function nytSpil(id: string, kode: string, naa: string): Spil {
  return {
    skemaVersion: SKEMA_VERSION,
    id,
    kode,
    fase: 'lobby',
    vaertId: '',
    indstillinger: { ...STANDARD_INDSTILLINGER },
    spillere: [],
    turIdx: 0,
    turNr: 0,
    runde: 1,
    terning: null,
    terningAf: null,
    terningNr: 0,
    taarn: { slurke: 0, fyldtAfId: null, toemmesAfId: null },
    bierMeisterId: null,
    bunke: [],
    brugte: [],
    sidsteKort: null,
    meier: null,
    meierResultat: null,
    fejring: null,
    udraab: null,
    syver: null,
    finger: null,
    afventer: null,
    afstemning: null,
    anmodninger: [],
    log: [],
    afventerPit: [],
    naesteHaendelseId: 1,
    opdateret: naa
  };
}

/** Formen spillet gemmes i nu. Ændres den, lægges et trin til `OPGRADERINGER`. */
export const SKEMA_VERSION = 2;

/* eslint-disable @typescript-eslint/no-explicit-any -- gamle former har ingen typer */
/** Trin `i` løfter et gemt spil fra version `i` til `i + 1`. Kun tilføj, ret aldrig i et gammelt trin. */
const OPGRADERINGER: Array<(gammelt: any) => void> = [
  // 0 → 1: før versionerne. Husreglerne er væk — står et spil og venter på et
  // regelkort, gøres det til et almindeligt kort man trykker videre på. Felter
  // der kom til undervejs, får deres standard.
  (g) => {
    delete g.husregler;
    const a = g.afventer as { slags: string; spillerId?: string } | null;
    if (a?.slags === 'ny-regel' && a.spillerId) {
      g.afventer = g.sidsteKort
        ? { slags: 'kort-udfald', spillerId: a.spillerId, kort: g.sidsteKort }
        : { slags: 'slag', spillerId: a.spillerId };
    }
    g.turNr ??= 0;
    g.udraab ??= null;
    g.afstemning ??= null;
    g.anmodninger ??= [];
    for (const s of g.spillere ?? []) s.afbrudt ??= null;
  },
  // 1 → 2: loggen fik struktur. De gamle linjer har kun deres tekst.
  (g) => {
    g.log = (g.log ?? []).map((h: any) => {
      const { slags, tekst, farve: _farve, ...resten } = h;
      return { ...resten, data: { type: 'gammel', slags: String(slags ?? ''), tekst: String(tekst ?? '') } };
    });
  }
];
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Løft et gemt spil op til den form motoren kender nu, trin for trin. */
export function opgraderGemt(gemt: unknown): Spil {
  const g = gemt as { skemaVersion?: number };
  const fra = g.skemaVersion ?? 0;
  if (fra > SKEMA_VERSION) throw new Error(`Spillet er gemt med en nyere udgave (${fra}) end serveren kender (${SKEMA_VERSION}).`);
  for (let v = fra; v < SKEMA_VERSION; v++) OPGRADERINGER[v]!(g);
  g.skemaVersion = SKEMA_VERSION;
  return g as Spil;
}

/* ----------------------------------------------------------------- hjælpere */

/** Hvem det åbne punkt hviler på — kapløbet er det eneste der gælder alle. */
export function afventerSpiller(a: Afventer | null | undefined): string | null {
  if (!a) return null;
  return 'spillerId' in a ? a.spillerId : null;
}

export function find(spil: Spil, id: string): Spiller | undefined {
  return spil.spillere.find((s) => s.id === id);
}

function kraev(spil: Spil, id: string): Spiller {
  const s = find(spil, id);
  if (!s) fejl('Du er ikke med i dette spil.');
  return s;
}

function aktive(spil: Spil): Spiller[] {
  return spil.spillere.filter((s) => s.tilstand === 'aktiv');
}

/** En linje i loggen. `spiller` er den linjen handler om — han giver den farve. */
function skriv(spil: Spil, data: DomaeneHaendelse, spiller?: Spiller): void {
  const h: Haendelse = {
    id: spil.naesteHaendelseId++,
    tid: spil.opdateret,
    data
  };
  if (spiller) h.spillerId = spiller.id;
  const paaTur = spil.spillere[spil.turIdx];
  if (spil.turNr && paaTur) {
    h.tur = spil.turNr;
    h.turAf = paaTur.id;
  }
  spil.log.unshift(h);
  if (spil.log.length > 120) spil.log.length = 120;
}

/** Slurke holdes på én decimal, så 16,7-slurks-øller ikke samler afrundingsstøv. */
function rund(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Tildel slurke. En slurk er den samme mængde alkohol uanset drik, så en enhed
 * har slurkePrEnhed(drik) slurke; er den tømt, hentes en ny og tælleren går
 * forfra — det er sådan spillet holder regnskab på tværs af øl, vin og whisky.
 */
function drik(spiller: Spiller, antal: number): void {
  if (antal <= 0) return;
  spiller.slurkeIAlt += antal;
  let rest = antal;
  while (rest > 0) {
    if (rest < spiller.slurkeTilbage) {
      spiller.slurkeTilbage = rund(spiller.slurkeTilbage - rest);
      rest = 0;
    } else {
      rest = rund(rest - spiller.slurkeTilbage);
      spiller.enheder += 1;
      spiller.slurkeTilbage = slurkePrEnhed(spiller.drik);
    }
  }
}

/**
 * Skift drik. Har man ikke rørt den man har, får man en fuld af den nye; ellers
 * beholder man det man mangler, dog højst en fuld enhed af den nye.
 */
function skiftDrik(spiller: Spiller, valg: DrikValg): void {
  const urørt = spiller.slurkeTilbage >= slurkePrEnhed(spiller.drik);
  spiller.drik = tilDrik(valg);
  const fuld = slurkePrEnhed(spiller.drik);
  spiller.slurkeTilbage = urørt ? fuld : Math.min(spiller.slurkeTilbage, fuld);
}

function navn(s: Spiller): string {
  return s.navn;
}

/** Råb det ud over pladen. Kaldes efter skriv(), så id'et altid er nyt. */
function raab(
  spil: Spil, art: Udraab['art'], s: Spiller, titel: string, tekst: string,
  fordeling?: Udraab['fordeling']
): void {
  spil.udraab = { id: spil.naesteHaendelseId, art, spillerId: s.id, titel, tekst, ...(fordeling ? { fordeling } : {}) };
}

/** Ét terningkast på pladen. Tælleren er dét klienten bruger til at lade terningen rulle. */
function slaaTerning(spil: Spil, s: Spiller, ctx: Kontekst): number {
  const v = ctx.terning();
  spil.terning = v;
  spil.terningAf = s.id;
  spil.terningNr += 1;
  return v;
}

function fejr(spil: Spil, f: Omit<Fejring, 'id'>): void {
  spil.fejring = { id: spil.log[0]?.id ?? spil.naesteHaendelseId, ...f };
}

/* --------------------------------------------------------------- pit-logik */

/**
 * Giv terningen til den næste i køen der skal slå sig en plads i pitten. Er
 * køen tom, går turen videre. Pladsen findes med spillerens eget slag — se
 * `pitPlacer` — og man drikker lige så mange shots som pladsens nummer. Stod
 * der en i forvejen, kommer han bagest i køen og slår om, indtil der højst
 * står én pr. plads, eller pitten er overfyldt (7+ spillere).
 */
function naestePitPlacering(spil: Spil, kaede: string[]): void {
  while (kaede.length > 0) {
    const id = kaede.shift()!;
    const o = find(spil, id);
    if (!o || o.tilstand !== 'aktiv') continue;
    spil.afventer = { slags: 'pit-placering', spillerId: id, kaede };
    return;
  }
  afslutTur(spil);
}

function pitPlacer(spil: Spil, s: Spiller, kaede: string[], ctx: Kontekst): void {
  const v = slaaTerning(spil, s, ctx);

  // Blev man skubbet videre inde i pitten, har man allerede drukket for sin plads.
  const skubbet = s.pitPlads > 0;
  s.felt = 0;
  s.pitPlads = v;

  if (skubbet) {
    skriv(spil, { type: 'pit-plads', spillerId: s.id, plads: v, skubbet: true }, s);
  } else {
    drik(s, v);
    skriv(spil, { type: 'pit-plads', spillerId: s.id, plads: v, skubbet: false }, s);
  }

  const koe = kaede.slice();
  const iPitten = spil.spillere.filter((o) => o.pitPlads > 0 && o.tilstand === 'aktiv');
  if (iPitten.length <= PIT_PLADSER) {
    const iForvejen = spil.spillere.filter(
      (o) => o.id !== s.id && o.tilstand === 'aktiv' && o.pitPlads === v && !koe.includes(o.id)
    );
    for (const o of iForvejen) koe.push(o.id);
  }
  naestePitPlacering(spil, koe);
}

/* ------------------------------------------------------------- turskiftning */

function saetTur(spil: Spil, idx: number): void {
  spil.turIdx = idx;
  spil.turNr += 1;
  const s = spil.spillere[idx];
  if (!s) return;
  spil.afventer = { slags: s.pitPlads > 0 ? 'pit-slag' : 'slag', spillerId: s.id };
}

function afslutTur(spil: Spil): void {
  const nuvaerende = spil.spillere[spil.turIdx];

  if (nuvaerende?.varslerAfgang) {
    nuvaerende.tilstand = 'ude';
    nuvaerende.varslerAfgang = false;
    nuvaerende.pitPlads = 0;
    skriv(spil, { type: 'afgang', spillerId: nuvaerende.id }, nuvaerende);
    if (spil.syver?.holderId === nuvaerende.id) spil.syver = null;
    afgoerFinger(spil);
  }

  const n = spil.spillere.length;
  if (aktive(spil).length === 0) {
    spil.fase = 'slut';
    spil.afventer = null;
    skriv(spil, { type: 'slut' });
    return;
  }


  // Den der bunder tårnet, spiller med imens — han siger selv til når det er tomt.
  for (let i = 1; i <= n; i++) {
    const idx = (spil.turIdx + i) % n;
    const s = spil.spillere[idx]!;
    if (s.tilstand !== 'aktiv') continue;
    if (idx <= spil.turIdx) spil.runde += 1;
    saetTur(spil, idx);
    return;
  }

  saetTur(spil, spil.turIdx);
}

/**
 * Hjemsendelser venter til feltets egen virkning er kvitteret — reglerne siger
 * udtrykkeligt at feltets funktion udføres først, og special events derefter.
 * Listen ligger i state, fordi virkningen kan strække sig over flere handlinger.
 * De ramte slår selv om deres plads, så turen går først videre når køen er tom.
 */
function afslutFelt(spil: Spil, _ctx: Kontekst): void {
  const ids = spil.afventerPit.filter((id) => {
    const o = find(spil, id);
    return o && o.tilstand === 'aktiv' && o.pitPlads === 0;
  });
  spil.afventerPit = [];
  naestePitPlacering(spil, ids);
}

/* -------------------------------------------------------- felternes virkning */

function landPaa(spil: Spil, s: Spiller, ctx: Kontekst): void {
  const type = feltType(s.felt);

  // Special event: den der allerede står her, ryger i pitten — men først
  // efter feltets egen virkning er udført.
  const ramte = spil.spillere.filter(
    (o) => o.id !== s.id && o.tilstand === 'aktiv' && o.pitPlads === 0 && o.felt === s.felt
  );
  spil.afventerPit = ramte.map((o) => o.id);

  skriv(spil, { type: 'landing', spillerId: s.id, felt: s.felt }, s);

  switch (type) {
    case 'fri':
      raab(spil, type, s, 'Frifelt', `${navn(s)} står frit. Der sker ingenting.`);
      afslutFelt(spil, ctx);
      return;

    case 'skaal': {
      for (const o of aktive(spil)) drik(o, 1);
      skriv(spil, { type: 'skaal', spillerId: s.id }, s);
      raab(spil, type, s, 'SKÅL!', 'Alle ved bordet tager en slurk.');
      afslutFelt(spil, ctx);
      return;
    }

    case 'bm': {
      spil.bierMeisterId = s.id;
      skriv(spil, { type: 'bier-meister', spillerId: s.id }, s);
      raab(spil, type, s, 'Bier Meister', `${navn(s)} er den nye Bier Meister. Find noget grimt til hovedet.`);
      afslutFelt(spil, ctx);
      return;
    }

    case 'gobm': {
      const bm = spil.bierMeisterId ? find(spil, spil.bierMeisterId) : undefined;
      const harBm = Boolean(bm && bm.tilstand === 'aktiv');
      const offer = harBm ? bm! : s;
      drik(offer, 3);
      skriv(spil, { type: 'go-bier-meister', landetAf: s.id, drikker: offer.id, harBm }, offer);
      raab(
        spil, type, offer, 'Go! Bier Meister',
        harBm ? `Bier Meisteren ${navn(offer)} drikker 3 slurke.` : `Der er ingen Bier Meister — ${navn(s)} drikker selv 3 slurke.`
      );
      afslutFelt(spil, ctx);
      return;
    }

    case 'tre':
      raab(spil, type, s, '3 til..?', `${navn(s)} deler 3 slurke ud.`);
      spil.afventer = { slags: 'giv-slurke', spillerId: s.id, antal: 3 };
      return;

    case 'taarn': {
      // Er en anden i gang med at tømme tårnet, skal det stilles fra sig med det samme.
      const t = spil.taarn.toemmesAfId ? find(spil, spil.taarn.toemmesAfId) : undefined;
      if (t && t.id !== s.id) {
        skriv(spil, { type: 'oel-i-taarnet', landetAf: s.id, drikkesAf: t.id }, s);
      }
      raab(
        spil, type, s, 'Øl i tårnet',
        t && t.id !== s.id
          ? `ØL I TÅRNET! ${navn(t)} stiller tårnet fra sig — ${navn(s)} hælder i.`
          : `${navn(s)} hælder øl i tårnet.`
      );
      spil.afventer = { slags: 'fyld-taarn', spillerId: s.id };
      return;
    }

    case 'kort':
      raab(spil, type, s, 'Træk et kort', `${navn(s)} trækker et kort fra bunken.`);
      spil.afventer = { slags: 'traek-kort', spillerId: s.id };
      return;

    case 'krone':
      raab(spil, type, s, '2-krone', `${navn(s)} har ét forsøg på at få 2-kronen i tårnet.`);
      spil.afventer = { slags: 'krone-kast', spillerId: s.id };
      return;

    case 'meier':
      if (aktive(spil).length < 2) {
        skriv(spil, { type: 'meier-ingen-modstander', spillerId: s.id }, s);
        raab(spil, type, s, 'Meier', 'Der er ingen at udfordre.');
        afslutFelt(spil, ctx);
        return;
      }
      raab(spil, type, s, 'Meier', `${navn(s)} udfordrer en til Meier.`);
      spil.afventer = { slags: 'meier-modstander', spillerId: s.id };
      return;

    case 'drik': {
      const t = taarnetDrikkesAf(spil);
      raab(
        spil, type, s, 'DRIK!',
        spil.taarn.slurke === 0
          ? `${navn(s)} skulle bunde tårnet, men det er tomt.`
          : t && t.id !== s.id
            ? `${navn(s)} skulle bunde tårnet, men ${navn(t)} er allerede i gang med det.`
            : `${navn(s)} skal bunde tårnet — ${formatSlurke(spil.taarn.slurke)}.`
      );
      givTaarnet(spil, s, { grund: 'drik' });
      afslutFelt(spil, ctx);
      return;
    }
  }
}

/** Den der er i gang med at bunde tårnet lige nu, hvis nogen. */
function taarnetDrikkesAf(spil: Spil): Spiller | undefined {
  return spil.taarn.toemmesAfId ? find(spil, spil.taarn.toemmesAfId) : undefined;
}

/**
 * Sæt tårnet hos en spiller. Spillet kører videre imens — han får en knap til
 * at sige når det er tomt, og lander en anden på "Øl i tårnet" inden da, må
 * der hældes mere i. Er tårnet tomt, er der ikke noget at bunde. Er en anden
 * allerede i gang med at drikke det, bliver det hos ham.
 */
function givTaarnet(
  spil: Spil, s: Spiller,
  hvorfor: Pick<Extract<DomaeneHaendelse, { type: 'taarn-givet' }>, 'grund' | 'udpegetAf' | 'kapacitetCl'>
): void {
  const h = { type: 'taarn-givet', spillerId: s.id, slurke: spil.taarn.slurke, ...hvorfor } as const;
  if (spil.taarn.slurke === 0) {
    skriv(spil, { ...h, udfald: 'tomt' }, s);
    return;
  }
  const t = taarnetDrikkesAf(spil);
  if (t && t.id !== s.id) {
    skriv(spil, { ...h, udfald: 'optaget', drikkesAf: t.id }, s);
    return;
  }
  spil.taarn.toemmesAfId = s.id;
  skriv(spil, { ...h, udfald: 'givet' }, s);
}

/* ------------------------------------------------------------------- kortene */

/**
 * Sidemanden ved bordet. Turen går med uret, så venstremanden er den næste i
 * turen og højremanden den forrige. Er man alene, er der ingen.
 */
function sidemand(spil: Spil, s: Spiller, side: 'venstre' | 'hoejre'): Spiller | undefined {
  const n = spil.spillere.length;
  const i = spil.spillere.findIndex((o) => o.id === s.id);
  const skridt = side === 'venstre' ? 1 : n - 1;
  for (let k = 1; k < n; k++) {
    const o = spil.spillere[(i + skridt * k) % n]!;
    if (o.tilstand === 'aktiv' && o.id !== s.id) return o;
  }
  return undefined;
}

/** Øverste kort fra bunken. Er den brugt op, blandes et nyt spil. */
function tagFraBunken(spil: Spil, ctx: Kontekst): Kort {
  if (spil.bunke.length === 0) {
    spil.bunke = bland(nyBunke(), ctx.tilfaeldig);
    spil.brugte = [];
    skriv(spil, { type: 'bunke-blandet' });
  }
  const kort = spil.bunke.shift()!;
  spil.brugte.push(kort);
  spil.sidsteKort = kort;
  return kort;
}

function traekKort(spil: Spil, s: Spiller, ctx: Kontekst): void {
  const kort = tagFraBunken(spil, ctx);
  const v = virkning(kort);
  skriv(spil, { type: 'kort-trukket', spillerId: s.id, kort }, s);

  switch (v.slags) {
    case 'selv':
      drik(s, v.antal);
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    case 'giv':
      spil.afventer = { slags: 'giv-slurke', spillerId: s.id, antal: v.antal };
      return;
    case 'ingenting':
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    case 'kaploeb':
      spil.afventer = { slags: 'kaploeb', kort, startetAf: s.id, ramte: [] };
      return;
    case 'behold': {
      // Nåede den forrige ikke at lægge fingeren, drikker han selv — og den nye tager over.
      const forrige = spil.syver ? find(spil, spil.syver.holderId) : undefined;
      if (forrige && forrige.tilstand === 'aktiv') {
        drik(forrige, 1);
        skriv(spil, { type: 'syver-tabt', spillerId: forrige.id, nyHolder: s.id }, forrige);
      }
      spil.syver = { holderId: s.id, kort };
      // Kortet er på hånden, ikke på bordet.
      spil.sidsteKort = null;
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    }
    case 'vaelg-taber':
      spil.afventer = { slags: 'vaelg-taber', spillerId: s.id, grund: v.grund };
      return;
    case 'sidemand': {
      const o = sidemand(spil, s, v.side);
      if (o) {
        drik(o, SIDEMAND_SLURKE);
        skriv(spil, { type: 'sidemand', spillerId: s.id, side: v.side, drikker: o.id, slurke: SIDEMAND_SLURKE }, o);
      } else {
        skriv(spil, { type: 'sidemand', spillerId: s.id, side: v.side, drikker: null, slurke: SIDEMAND_SLURKE }, s);
      }
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    }
    case 'hoejere-lavere':
      spil.afventer = { slags: 'hoejere-lavere', spillerId: s.id, kort, startetAf: s.id, rigtige: 0 };
      return;
    case 'hold': {
      const ramt = aktive(spil).filter((o) => o.kortHold === v.hold);
      for (const o of ramt) drik(o, HOLD_SLURKE);
      skriv(spil, { type: 'hold-drikker', spillerId: s.id, hold: v.hold, ramte: ramt.map((o) => o.id), slurke: HOLD_SLURKE }, s);
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    }
  }
}

/* ---------------------------------------------------------------- afgang m.m. */

/** Hvorfor man ikke kan hoppe ud lige nu — eller null hvis man godt kan. */
export function afgangSpaerret(spil: Spil, s: Spiller): string | null {
  if (spil.bierMeisterId === s.id) return 'Du er Bier Meister. Man flygter ikke fra sin pligt.';
  if (spil.taarn.slurke > 0) return 'Der er øl i tårnet. Det skal være tomt først.';
  if (spil.indstillinger.hardcore && (s.pitPlads > 0 || feltType(s.felt) !== 'fri')) {
    return 'Hardcore: du kan kun hoppe ud fra et blankt felt.';
  }
  if (s.pitPlads > 0) return 'Du er i pitten. Ud derfra først.';
  return null;
}

/* ------------------------------------------------------------------- motoren */

/**
 * Udfør én handling. Alt eller intet: motoren arbejder på en kopi, så en
 * RegelFejl midt i en handling efterlader det gemte spil urørt. Det nye spil
 * er returværdien — `foer` ændres aldrig.
 */
export function anvend(foer: Spil, handling: Handling, ctx: Kontekst): Spil {
  const spil = structuredClone(foer);
  spil.opdateret = ctx.naa();
  // Er tiden gået, afgøres afstemningen før alt andet — også hvis serverens ur
  // aldrig nåede at sige til (genstart).
  afstemningUdloebet(spil, ctx);

  const efter = udfoer(spil, handling, ctx);
  sikrVaert(efter);
  return efter;
}

function udfoer(spil: Spil, handling: Handling, ctx: Kontekst): Spil {
  switch (handling.type) {
    case 'afstemning-afgoer':
    case 'vaert-tjek': return spil;
    case 'join': return join(spil, handling, ctx);
    case 'saet-drik': return saetDrik(spil, handling.drik, ctx);
    case 'saet-indstilling': return saetIndstilling(spil, handling, ctx);
    case 'start': return start(spil, ctx);
    case 'forbindelse': {
      const s = find(spil, ctx.spillerId);
      if (s) {
        s.tilsluttet = handling.tilsluttet;
        s.afbrudt = handling.tilsluttet ? null : spil.opdateret;
      }
      return spil;
    }
    default: break;
  }

  if (spil.fase !== 'spiller') fejl('Spillet er ikke i gang.');
  const s = kraev(spil, ctx.spillerId);
  if (s.tilstand !== 'aktiv') fejl('Du er hoppet ud af spillet.');

  switch (handling.type) {
    case 'slaa': return slaa(spil, s, ctx);
    case 'giv-slurke': return givSlurke(spil, s, handling.fordeling, ctx);
    case 'fyld-taarn': return fyldTaarn(spil, s, handling.slurke, ctx);
    case 'taarn-faerdig': return taarnFaerdig(spil, s, ctx);
    case 'toem-taarn-faerdig': return toemTaarnFaerdig(spil, s, ctx);
    case 'krone-kast': return kroneKast(spil, s, handling.x, handling.y);
    case 'krone-resultat': return kroneResultat(spil, s, handling.ramte, ctx);
    case 'krone-udpeg': return kroneUdpeg(spil, s, handling.spillerId, ctx);
    case 'traek-kort': return traekHandling(spil, s, ctx);
    case 'kort-kvitter': return kortKvitter(spil, s, ctx);
    case 'kaploeb-tryk': return kaploebTryk(spil, s, ctx);
    case 'hoejere-lavere': return hoejereLavere(spil, s, handling.gaet, ctx);
    case 'laeg-finger': return laegFinger(spil, s, ctx);
    case 'finger-tryk': return fingerTryk(spil, s, ctx);
    case 'vaelg-taber': return vaelgTaber(spil, s, handling.spillerId, ctx);
    case 'meier-vaelg': return meierVaelg(spil, s, handling.spillerId, ctx);
    case 'meier-slaa':
    case 'meier-tro': return meierSlaa(spil, s, ctx);
    case 'meier-meld': return meierMeld(spil, s, handling.melding, ctx);
    case 'meier-blindt': return meierBlindt(spil, s, ctx);
    case 'meier-loeft': return meierLoeft(spil, s, ctx);
    case 'meld-afgang': return meldAfgang(spil, s, ctx);
    case 'terning-paa-gulvet': return terningPaaGulvet(spil, s, ctx);
    case 'afstemning-start': return afstemningStart(spil, s, handling.art, handling.spillerId, ctx);
    case 'afstemning-stem': return afstemningStem(spil, s, handling.id, handling.ja, ctx);
    case 'godkend-join': return godkendJoin(spil, s, handling.spillerId, handling.ja);
    default: fejl('Ukendt handling.');
  }
}

/** Så længe må værten være væk — en skærm der låser, en genindlæsning — før hvervet går videre. */
export const VAERT_FRIST_SEKUNDER = 30;

/** Hvornår værtens frist løber ud, hvis han er offline og stadig med. Ellers null. */
export function vaertFrist(spil: Spil): string | null {
  const vaert = find(spil, spil.vaertId);
  if (!vaert || vaert.tilstand !== 'aktiv' || vaert.tilsluttet || !vaert.afbrudt) return null;
  return new Date(Date.parse(vaert.afbrudt) + VAERT_FRIST_SEKUNDER * 1000).toISOString();
}

/**
 * Værten skal være ved bordet. Er han ude af spillet — gået selv eller smidt
 * ud — går hvervet videre med det samme; er han offline, når fristen er gået.
 * Det går med uret til den næste der er der. Er der ingen, bliver det hos
 * ham. Kommer han tilbage bagefter, får han det ikke igen.
 */
function sikrVaert(spil: Spil): void {
  const i = spil.spillere.findIndex((o) => o.id === spil.vaertId);
  if (i < 0) return;
  const vaert = spil.spillere[i]!;
  if (vaert.tilstand === 'aktiv' && vaert.tilsluttet) return;
  const frist = vaertFrist(spil);
  if (frist && Date.parse(spil.opdateret) < Date.parse(frist)) return;
  const n = spil.spillere.length;
  for (let k = 1; k < n; k++) {
    const o = spil.spillere[(i + k) % n]!;
    if (o.tilstand === 'aktiv' && o.tilsluttet) {
      spil.vaertId = o.id;
      skriv(spil, { type: 'ny-vaert', spillerId: o.id }, o);
      return;
    }
  }
}

/* ------------------------------------------------------------------ lobbyen */

/** Et frifelt ingen står på — eller det første, hvis alle er optaget. */
function ledigtStartfelt(spil: Spil): number {
  const optaget = new Set(spil.spillere.filter((o) => o.tilstand === 'aktiv').map((o) => o.felt));
  return STARTFELTER.find((nr) => !optaget.has(nr)) ?? STARTFELTER[0]!;
}

function join(spil: Spil, h: Extract<Handling, { type: 'join' }>, ctx: Kontekst): Spil {
  const findes = find(spil, ctx.spillerId);
  const navnet = h.navn.trim().slice(0, 24);
  if (!navnet) fejl('Skriv et navn.');
  if (!KORT_HOLD.includes(h.kortHold)) fejl('Vælg om du drikker med damerne eller herrerne.');
  tilDrik(h.drik); // kaster ved en drik der ikke giver mening — også før en anmodning gemmes

  if (findes) {
    findes.navn = navnet;
    skiftDrik(findes, h.drik);
    findes.kortHold = h.kortHold;
    findes.tilsluttet = true;
    return spil;
  }

  if (spil.fase === 'slut') fejl('Spillet er slut.');
  // Spørger man igen, erstatter det den gamle anmodning.
  const andre = spil.anmodninger.filter((a) => a.spillerId !== ctx.spillerId);
  if (spil.spillere.length + andre.length >= 8) fejl('Der er otte ved bordet — der er ikke plads til flere.');
  const navne = [...spil.spillere, ...andre].map((o) => o.navn.toLowerCase());
  if (navne.includes(navnet.toLowerCase())) fejl('Der er allerede en med det navn ved bordet.');

  // Midt i spillet lukker værten ind — ellers kunne man stemme bordet ud med sine egne faner.
  if (spil.fase === 'spiller') {
    spil.anmodninger = [...andre, {
      spillerId: ctx.spillerId, navn: navnet, farve: h.farve, drik: h.drik, kortHold: h.kortHold, tidspunkt: ctx.naa()
    }];
    skriv(spil, { type: 'anmodning', navn: navnet });
    return spil;
  }

  const spiller = nySpiller(spil, ctx.spillerId, navnet, h.farve, h.drik, h.kortHold);
  spil.spillere.push(spiller);
  if (!spil.vaertId) spil.vaertId = spiller.id;
  skriv(spil, { type: 'join', spillerId: spiller.id }, spiller);
  return spil;
}

function godkendJoin(spil: Spil, s: Spiller, id: string, ja: boolean): Spil {
  if (spil.vaertId !== s.id) fejl('Kun værten kan lukke nye ind.');
  const a = spil.anmodninger.find((o) => o.spillerId === id);
  if (!a) fejl('Den anmodning er der ikke længere.');
  spil.anmodninger = spil.anmodninger.filter((o) => o !== a);

  if (!ja) {
    skriv(spil, { type: 'anmodning-afvist', vaertId: s.id, navn: a.navn }, s);
    return spil;
  }
  if (spil.spillere.length >= 8) fejl('Der er otte ved bordet — der er ikke plads til flere.');

  // Man stiller sig på et ledigt frifelt og kommer med i turen bagest i rækken.
  const spiller = nySpiller(spil, a.spillerId, a.navn, a.farve, a.drik, a.kortHold);
  spiller.felt = ledigtStartfelt(spil);
  spil.spillere.push(spiller);
  skriv(spil, { type: 'lukket-ind', vaertId: s.id, spillerId: spiller.id, felt: spiller.felt }, spiller);
  return spil;
}

function nySpiller(spil: Spil, id: string, navnet: string, oensket: string, drik: DrikValg, kortHold: KortHold): Spiller {
  const drikken = tilDrik(drik);
  const taget = new Set(spil.spillere.map((o) => o.farve));
  // Kun brikfarverne — er den valgte taget eller ukendt, får man den første ledige.
  const farve = BRIKFARVER.includes(oensket) && !taget.has(oensket)
    ? oensket
    : (BRIKFARVER.find((f) => !taget.has(f)) ?? BRIKFARVER[0]!);

  return {
    id,
    navn: navnet,
    farve,
    drik: drikken,
    kortHold,
    felt: 0,
    pitPlads: 0,
    slurkeTilbage: slurkePrEnhed(drikken),
    enheder: 0,
    slurkeIAlt: 0,
    tilstand: 'aktiv',
    varslerAfgang: false,
    tilsluttet: true,
    afbrudt: null
  };
}

function saetDrik(spil: Spil, valg: DrikValg, ctx: Kontekst): Spil {
  const s = kraev(spil, ctx.spillerId);
  skiftDrik(s, valg);
  return spil;
}

function saetIndstilling(spil: Spil, h: Extract<Handling, { type: 'saet-indstilling' }>, ctx: Kontekst): Spil {
  if (spil.vaertId !== ctx.spillerId) fejl('Kun værten kan ændre indstillingerne.');
  if (spil.fase !== 'lobby') fejl('Indstillingerne skal aftales inden spillet går i gang.');
  if (h.hardcore !== undefined) spil.indstillinger.hardcore = h.hardcore;
  return spil;
}

function start(spil: Spil, ctx: Kontekst): Spil {
  if (spil.vaertId !== ctx.spillerId) fejl('Kun værten kan starte spillet.');
  if (spil.fase !== 'lobby') fejl('Spillet er allerede startet.');
  if (spil.spillere.length < 1) fejl('Der skal være mindst én ved bordet.');

  spil.spillere.forEach((s, i) => {
    s.felt = STARTFELTER[i % STARTFELTER.length]!;
    s.pitPlads = 0;
  });
  spil.bunke = bland(nyBunke(), ctx.tilfaeldig);
  spil.brugte = [];
  spil.fase = 'spiller';
  spil.runde = 1;
  skriv(spil, { type: 'start', antal: spil.spillere.length });
  saetTur(spil, 0);
  return spil;
}

/* -------------------------------------------------------------------- slaget */

function kraevAfventer<T extends Afventer['slags']>(
  spil: Spil, slags: T, s: Spiller
): Extract<Afventer, { slags: T }> {
  const a = spil.afventer;
  if (!a || a.slags !== slags) fejl('Det er ikke det spillet venter på lige nu.');
  if ('spillerId' in a && a.spillerId !== s.id) fejl('Det er ikke dig der er på.');
  return a as Extract<Afventer, { slags: T }>;
}

function slaa(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const a = spil.afventer;
  if (!a || (a.slags !== 'slag' && a.slags !== 'pit-slag' && a.slags !== 'pit-placering')) {
    fejl('Det er ikke tid til at slå.');
  }
  if (a.spillerId !== s.id) fejl('Det er ikke din tur.');

  // Slået hjem: samme terning, men den afgør hvor i pitten man skal stå.
  if (a.slags === 'pit-placering') {
    pitPlacer(spil, s, a.kaede, ctx);
    return spil;
  }

  const v = slaaTerning(spil, s, ctx);

  if (s.pitPlads > 0) {
    if (v >= s.pitPlads) {
      // Øjnene man har til overs, rykker man videre med: plads 2 og en 4'er
      // er to skridt ud til felt 1 og så to mere, ud på felt 3.
      skriv(spil, { type: 'pit-ude', spillerId: s.id, slag: v }, s);
      s.felt = ryk(1, v - s.pitPlads);
      s.pitPlads = 0;
      landPaa(spil, s, ctx);
    } else {
      s.pitPlads -= v;
      drik(s, s.pitPlads);
      skriv(spil, { type: 'pit-ned', spillerId: s.id, slag: v, plads: s.pitPlads }, s);
      afslutTur(spil);
    }
    return spil;
  }

  s.felt = ryk(s.felt, v);
  skriv(spil, { type: 'slag', spillerId: s.id, slag: v }, s);
  landPaa(spil, s, ctx);
  return spil;
}

/* ------------------------------------------------------------- feltvirkninger */

function givSlurke(
  spil: Spil, s: Spiller,
  fordeling: Array<{ spillerId: string; antal: number }>,
  ctx: Kontekst
): Spil {
  const a = kraevAfventer(spil, 'giv-slurke', s);
  const sum = fordeling.reduce((n, f) => n + Math.max(0, Math.round(f.antal)), 0);
  if (sum !== a.antal) fejl(`Du skal dele præcis ${a.antal} slurke ud.`);

  const navne: string[] = [];
  const fik: Array<{ spillerId: string; antal: number }> = [];
  for (const f of fordeling) {
    const antal = Math.max(0, Math.round(f.antal));
    if (antal === 0) continue;
    const o = find(spil, f.spillerId);
    if (!o || o.tilstand !== 'aktiv') fejl('Den spiller er ikke med længere.');
    drik(o, antal);
    navne.push(`${navn(o)} ${antal}`);
    fik.push({ spillerId: o.id, antal });
  }
  skriv(spil, { type: 'slurke-givet', spillerId: s.id, antal: a.antal, fordeling: fik }, s);
  raab(spil, 'giv', s, `${navn(s)} deler ud`, `${a.antal} slurke: ${navne.join(', ')}.`, fik);
  afslutFelt(spil, ctx);
  return spil;
}

function fyldTaarn(spil: Spil, s: Spiller, slurke: number, _ctx: Kontekst): Spil {
  kraevAfventer(spil, 'fyld-taarn', s);
  if (!Number.isFinite(slurke)) fejl('Ugyldig mængde.');
  const tilfoej = Math.max(0, Math.min(4, slurke));
  if (tilfoej === 0) return spil;

  spil.taarn.slurke = Math.round((spil.taarn.slurke + tilfoej) * 100) / 100;
  spil.taarn.fyldtAfId = s.id;
  return spil;
}

/** Løber tårnet over? Glasset er en halv liter, målt i øl. */
export function taarnLoeberOver(spil: Spil): boolean {
  return spil.taarn.slurke > taarnKapacitetSlurke(spil.indstillinger.taarnKapacitetCl);
}

function taarnFaerdig(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'fyld-taarn', s);
  skriv(spil, { type: 'taarn-fyldt', spillerId: s.id, slurke: spil.taarn.slurke }, s);

  if (taarnLoeberOver(spil)) {
    // Det der løber over, ryger på bordet — man drikker aldrig mere end glasset kan rumme.
    const haeldt = taarnCl(spil.taarn.slurke);
    spil.taarn.slurke = taarnKapacitetSlurke(spil.indstillinger.taarnKapacitetCl);
    givTaarnet(spil, s, { grund: 'overloeb', kapacitetCl: spil.indstillinger.taarnKapacitetCl });
    // Står en anden allerede med tårnet, bliver det hos ham — nu bare fyldt til kanten.
    const drikker = taarnetDrikkesAf(spil) ?? s;
    fejr(spil, {
      art: 'overloeb',
      vinderId: null,
      taberId: drikker.id,
      titel: 'Tårnet løb over',
      tekst: drikker.id === s.id
        ? `${navn(s)} hældte ${haeldt} cl i et glas på ${spil.indstillinger.taarnKapacitetCl}. Det bunder man selv.`
        : `${navn(s)} hældte ${haeldt} cl i et glas på ${spil.indstillinger.taarnKapacitetCl}. ${navn(drikker)} har stadig tårnet og bunder det fulde glas.`,
      slurke: Math.round(spil.taarn.slurke),
      naaedeIds: []
    });
  }
  afslutFelt(spil, ctx);
  return spil;
}

/**
 * Den der har tårnet, siger selv til når det er tomt. Det kan ske når som
 * helst — også midt i en andens tur — for spillet venter ikke på ham.
 */
function toemTaarnFaerdig(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  if (spil.taarn.toemmesAfId !== s.id) fejl('Det er ikke dig der har tårnet.');
  const maengde = spil.taarn.slurke;
  drik(s, Math.round(maengde));
  spil.taarn.slurke = 0;
  spil.taarn.toemmesAfId = null;
  spil.taarn.fyldtAfId = null;
  skriv(spil, { type: 'taarn-bundet', spillerId: s.id, slurke: maengde }, s);
  return spil;
}

/** Kastet selv. Resultatet melder kasteren bagefter — her gemmes kun trækket, så bordet kan se med. */
function kroneKast(spil: Spil, s: Spiller, x: number, y: number): Spil {
  const a = kraevAfventer(spil, 'krone-kast', s);
  if (a.kast) fejl('Du har allerede kastet.');
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > 200) fejl('Ugyldigt kast.');
  a.kast = { x, y };
  return spil;
}

function kroneResultat(spil: Spil, s: Spiller, ramte: boolean, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'krone-kast', s);
  if (!ramte) {
    skriv(spil, { type: 'krone', spillerId: s.id, udfald: 'forbi' }, s);
    afslutFelt(spil, ctx);
    return spil;
  }
  if (spil.taarn.slurke === 0) {
    skriv(spil, { type: 'krone', spillerId: s.id, udfald: 'tomt-taarn' }, s);
    afslutFelt(spil, ctx);
    return spil;
  }
  const t = taarnetDrikkesAf(spil);
  if (t) {
    skriv(spil, { type: 'krone', spillerId: s.id, udfald: 'taarn-optaget', drikkesAf: t.id }, s);
    afslutFelt(spil, ctx);
    return spil;
  }
  skriv(spil, { type: 'krone', spillerId: s.id, udfald: 'ramt' }, s);
  spil.afventer = { slags: 'krone-udpeg', spillerId: s.id };
  return spil;
}

function kroneUdpeg(spil: Spil, s: Spiller, maalId: string, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'krone-udpeg', s);
  const maal = find(spil, maalId);
  if (!maal || maal.tilstand !== 'aktiv') fejl('Vælg en der er med i spillet.');
  givTaarnet(spil, maal, { grund: 'udpeget', udpegetAf: s.id });
  fejr(spil, {
    art: 'krone',
    vinderId: s.id,
    taberId: maal.id,
    titel: `${navn(s)} fik 2-kronen i`,
    tekst: `Ét forsøg, og den røg i. ${maal.id === s.id ? navn(s) + ' tager tårnet selv' : navn(maal) + ' blev udpeget og bunder tårnet'} — ${taarnCl(spil.taarn.slurke)} cl.`,
    slurke: Math.round(spil.taarn.slurke),
    naaedeIds: []
  });
  afslutFelt(spil, ctx);
  return spil;
}

function traekHandling(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'traek-kort', s);
  traekKort(spil, s, ctx);
  return spil;
}

function kortKvitter(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'kort-udfald', s);
  afslutFelt(spil, ctx);
  return spil;
}

function kaploebTryk(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const a = spil.afventer;
  if (!a || a.slags !== 'kaploeb') fejl('Der er ikke noget kapløb i gang.');
  if (a.ramte.includes(s.id)) return spil;
  a.ramte.push(s.id);
  afgoerKaploeb(spil, ctx);
  return spil;
}

/** Når kun én mangler at trykke, er han sidste mand. Kaldes også når nogen forlader bordet. */
function afgoerKaploeb(spil: Spil, ctx: Kontekst): void {
  const a = spil.afventer;
  if (!a || a.slags !== 'kaploeb') return;
  const med = aktive(spil);
  if (med.length <= 1) {
    afslutFelt(spil, ctx);
    return;
  }
  const naaet = a.ramte.filter((id) => med.some((o) => o.id === id));
  if (naaet.length >= med.length - 1) {
    const sidste = med.find((o) => !a.ramte.includes(o.id));
    const foerste = find(spil, a.ramte[0]!);
    if (sidste) {
      drik(sidste, 1);
      skriv(spil, { type: 'kaploeb-sidst', spillerId: sidste.id }, sidste);
      const hvor = virkning(a.kort).slags === 'kaploeb' && (virkning(a.kort) as { hvor: string }).hvor === 'naese'
        ? 'fingeren på næsen' : 'fingeren på bordkanten';
      fejr(spil, {
        art: 'kaploeb',
        vinderId: foerste?.id ?? null,
        taberId: sidste.id,
        titel: foerste ? `${navn(foerste)} var først` : `${navn(sidste)} var sidst`,
        tekst: foerste
          ? `${navn(foerste)} havde ${hvor} inden nogen så det. ${navn(sidste)} nåede det aldrig — sidste mand drikker.`
          : `${navn(sidste)} nåede det aldrig — sidste mand drikker.`,
        slurke: 1,
        naaedeIds: a.ramte.slice()
      });
    }
    afslutFelt(spil, ctx);
  }
}

/* ------------------------------------------------------------------ 10'eren */

/**
 * Et gæt i højere/lavere. Rigtigt: næste kort ligger nu, og venstremanden
 * gætter videre på det. Forkert: man drikker, og turen går videre som efter
 * et almindeligt kort.
 */
function hoejereLavere(spil: Spil, s: Spiller, gaet: 'hoejere' | 'lavere', ctx: Kontekst): Spil {
  if (gaet !== 'hoejere' && gaet !== 'lavere') fejl('Gæt højere eller lavere.');
  const a = kraevAfventer(spil, 'hoejere-lavere', s);
  const nyt = tagFraBunken(spil, ctx);
  const ord = gaet === 'hoejere' ? 'højere' : 'lavere';

  if (gaetRigtigt(a.kort, nyt, gaet)) {
    const naeste = sidemand(spil, s, 'venstre') ?? s;
    skriv(spil, { type: 'hoejere-lavere', spillerId: s.id, gaet, kort: nyt, rigtigt: true, naeste: naeste.id }, s);
    spil.afventer = { ...a, spillerId: naeste.id, kort: nyt, rigtige: a.rigtige + 1 };
    return spil;
  }

  drik(s, HOEJERE_LAVERE_SLURKE);
  skriv(spil, { type: 'hoejere-lavere', spillerId: s.id, gaet, kort: nyt, rigtigt: false, slurke: HOEJERE_LAVERE_SLURKE }, s);
  fejr(spil, {
    art: 'hoejere-lavere',
    vinderId: null,
    taberId: s.id,
    titel: `${navn(s)} gættede forkert`,
    tekst: `${kortNavn(a.kort)} og så ${kortNavn(nyt)} — ikke ${ord}. ${a.rigtige ? `Kæden holdt i ${a.rigtige} gæt. ` : ''}${navn(s)} drikker.`,
    slurke: HOEJERE_LAVERE_SLURKE,
    naaedeIds: []
  });
  afslutFelt(spil, ctx);
  return spil;
}

/* ------------------------------------------------------------------ 7'eren */

function laegFinger(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  if (!spil.syver || spil.syver.holderId !== s.id) fejl("Du har ikke 7'eren.");
  if (spil.finger) fejl('Der ligger allerede en finger på bordet.');
  spil.finger = { lagtAf: s.id, kort: spil.syver.kort, ramte: [s.id] };
  spil.syver = null;
  // Ingen log og ingen besked — den skal opdages, ligesom ved bordet.
  afgoerFinger(spil);
  return spil;
}

function fingerTryk(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  const f = spil.finger;
  if (!f) fejl('Der ligger ingen finger på bordet.');
  if (f.ramte.includes(s.id)) return spil;
  f.ramte.push(s.id);
  afgoerFinger(spil);
  return spil;
}

/** Når kun én mangler, er han sidste mand og drikker. Alle nåede det: ingen drikker. */
function afgoerFinger(spil: Spil): void {
  const f = spil.finger;
  if (!f) return;
  const mangler = aktive(spil).filter((o) => !f.ramte.includes(o.id));
  if (mangler.length > 1) return;
  const lagde = find(spil, f.lagtAf);
  const hvem = lagde ? navn(lagde) : 'Nogen';
  const sidste = mangler[0];
  if (sidste) {
    drik(sidste, 1);
    skriv(spil, { type: 'finger', lagtAf: f.lagtAf, sidste: sidste.id }, sidste);
    const naaede = f.ramte.filter((id) => id !== f.lagtAf).map((id) => find(spil, id)).filter(Boolean).map((o) => navn(o!));
    fejr(spil, {
      art: 'finger',
      vinderId: null,
      taberId: sidste.id,
      titel: `${navn(sidste)} så den aldrig`,
      tekst: `${hvem} lagde fingeren på bordkanten. ${naaede.length ? naaede.join(', ') + ' nåede det — ' : ''}${navn(sidste)} var sidste mand og drikker.`,
      slurke: 1,
      naaedeIds: f.ramte.slice()
    });
  } else {
    skriv(spil, { type: 'finger', lagtAf: f.lagtAf, sidste: null }, lagde);
  }
  spil.finger = null;
}



function vaelgTaber(spil: Spil, s: Spiller, taberId: string, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'vaelg-taber', s);
  const taber = find(spil, taberId);
  if (!taber || taber.tilstand !== 'aktiv') fejl('Vælg en der er med i spillet.');
  drik(taber, 1);
  skriv(spil, { type: 'gik-i-staa', spillerId: taber.id }, taber);
  fejr(spil, {
    art: 'emne',
    vinderId: null,
    taberId: taber.id,
    titel: taber.id === s.id ? `${navn(taber)} gik selv i stå` : `${navn(taber)} gik i stå`,
    tekst: `${navn(s)} udpegede ${taber.id === s.id ? 'sig selv' : navn(taber)} som den der ikke kunne sige noget nyt.`,
    slurke: 1,
    naaedeIds: []
  });
  afslutFelt(spil, ctx);
  return spil;
}

/* --------------------------------------------------------------------- Meier */

function meierVaelg(spil: Spil, s: Spiller, modstanderId: string, _ctx: Kontekst): Spil {
  kraevAfventer(spil, 'meier-modstander', s);
  const m = find(spil, modstanderId);
  if (!m || m.tilstand !== 'aktiv' || m.id === s.id) fejl('Vælg en anden spiller ved bordet.');

  spil.meier = {
    udfordrerId: s.id,
    modstanderId: m.id,
    holderId: s.id,
    slag: null,
    slagAf: null,
    blindt: false,
    melding: null,
    meldtAf: null,
    historik: [{ tekst: `${navn(s)} udfordrede ${navn(m)}.`, spillerId: s.id }]
  };
  // Den forrige fejring ryddes når et nyt bæger sættes på bordet.
  spil.meierResultat = null;
  spil.afventer = { slags: 'meier', spillerId: s.id };
  skriv(spil, { type: 'meier-udfordret', spillerId: s.id, modstanderId: m.id }, s);
  return spil;
}

function kraevMeier(spil: Spil, s: Spiller) {
  const m = spil.meier;
  if (!m) fejl('Der er ingen Meier i gang.');
  if (m.holderId !== s.id) fejl('Bægeret står ikke hos dig.');
  return m;
}

function meierSlaa(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  // Det er kun ens eget slag der spærrer — får man bægeret rakt over bordet,
  // må man gerne slå videre på modstanderens melding.
  if (m.slagAf === s.id && !m.blindt) fejl('Du har allerede slået — meld nu.');
  m.slag = [ctx.terning(), ctx.terning()];
  m.slagAf = s.id;
  m.blindt = false;
  m.historik.unshift({ tekst: `${navn(s)} slog.`, spillerId: s.id });
  spil.afventer = { slags: 'meier', spillerId: s.id };
  return spil;
}

function meierMeld(spil: Spil, s: Spiller, melding: number, _ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  if (m.slagAf !== s.id || !m.slag) fejl('Du skal slå først.');
  if (!Number.isInteger(melding) || melding < 0 || melding >= STIGE.length) fejl('Den melding findes ikke.');
  if (m.melding !== null && melding < m.melding) fejl('Du skal melde det samme eller højere.');
  m.melding = melding;
  m.meldtAf = s.id;
  m.holderId = m.holderId === m.udfordrerId ? m.modstanderId : m.udfordrerId;
  m.historik.unshift({ tekst: `${navn(s)} meldte og sendte videre.`, melding: trinNavn(melding), spillerId: s.id });
  skriv(spil, { type: 'meier-meldt', spillerId: s.id, melding }, s);
  spil.afventer = { slags: 'meier', spillerId: m.holderId };
  return spil;
}

function meierBlindt(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  if (m.melding === null) fejl('Der er ingen melding at slå op imod endnu.');
  // Også efter man selv har slået og kigget: kan man ikke lide det man så,
  // ryster man igen uden at kigge og sender det videre.
  m.slag =[ctx.terning(), ctx.terning()];
  m.slagAf = s.id;
  m.blindt = true;
  m.meldtAf = s.id;
  m.holderId = m.holderId === m.udfordrerId ? m.modstanderId : m.udfordrerId;
  m.historik.unshift({ tekst: `${navn(s)} slog blindt: "det samme eller derover".`, spillerId: s.id });
  skriv(spil, { type: 'meier-blindt', spillerId: s.id }, s);
  spil.afventer = { slags: 'meier', spillerId: m.holderId };
  return spil;
}

function meierLoeft(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  if (m.melding === null || !m.meldtAf || !m.slag) fejl('Der er ikke noget at løfte endnu.');
  if (m.slagAf === s.id && !m.blindt) fejl('Du har selv slået — nu skal du melde.');

  const faktisk = trin(m.slag[0], m.slag[1]);
  const meldt = m.melding;
  const meldende = find(spil, m.meldtAf);
  const loefter = s;
  const loej = faktisk < meldt;
  const taber = loej ? meldende : loefter;
  const dobbelt = erMeyer(meldt);
  const antal = MEIER_SLURKE * (dobbelt ? 2 : 1);

  if (taber) drik(taber, antal);
  skriv(spil, {
    type: 'meier-loeftet', loefterId: loefter.id, faktisk, meldt, taberId: taber?.id ?? null, slurke: antal, dobbelt
  }, taber ?? s);

  // Nu må hele bordet se hvad der lå under bægeret — og hvem der vandt.
  const vinder = taber === loefter ? meldende : loefter;
  if (taber && vinder) {
    spil.meierResultat = {
      id: spil.log[0]?.id ?? spil.naesteHaendelseId,
      vinderId: vinder.id,
      taberId: taber.id,
      slag: [m.slag[0], m.slag[1]],
      melding: meldt,
      loej,
      slurke: antal,
      dobbelt
    };
  }

  spil.meier = null;
  const udfordrer = find(spil, m.udfordrerId);
  if (udfordrer) {
    spil.afventer = { slags: 'meier', spillerId: udfordrer.id };
  }
  afslutFelt(spil, ctx);
  return spil;
}

/* ------------------------------------------------------------------- diverse */

function meldAfgang(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  const a = spil.afventer;
  if (!a || a.slags !== 'slag' || a.spillerId !== s.id) {
    fejl('Afgang meldes på din egen tur, inden du slår.');
  }
  const spaerre = afgangSpaerret(spil, s);
  if (spaerre) fejl(spaerre);
  s.varslerAfgang = true;
  skriv(spil, { type: 'afgang-meldt', spillerId: s.id }, s);
  return spil;
}

function terningPaaGulvet(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  drik(s, 1);
  skriv(spil, { type: 'straf', spillerId: s.id }, s);
  return spil;
}

/* -------------------------------------------- spring over og smid ud */

/** Så lang tid har bordet til at stemme. */
export const AFSTEMNING_SEKUNDER = 20;

/**
 * Venter spillet på denne spiller lige nu? Det er kun dér det giver mening at
 * springe ham over — ellers kører spillet jo videre uden ham.
 */
export function venterPaa(spil: Spil, id: string): boolean {
  const a = spil.afventer;
  if (!a) return false;
  if (a.slags === 'kaploeb') return !a.ramte.includes(id) && aktive(spil).some((o) => o.id === id);
  return a.spillerId === id;
}

function afstemningStart(spil: Spil, s: Spiller, art: 'spring' | 'smid', maalId: string, ctx: Kontekst): Spil {
  if (art !== 'spring' && art !== 'smid') fejl('Ukendt afstemning.');
  if (spil.afstemning && !spil.afstemning.udfald) fejl('Bordet stemmer allerede om noget.');
  const maal = find(spil, maalId);
  if (!maal || maal.tilstand !== 'aktiv') fejl('Vælg en der er med i spillet.');
  if (maal.id === s.id) fejl('Du kan ikke stemme om dig selv.');
  if (art === 'spring' && !venterPaa(spil, maal.id)) fejl(`Spillet venter ikke på ${navn(maal)} lige nu.`);

  const vaelgere = aktive(spil).filter((o) => o.id !== maal.id && (o.tilsluttet || o.id === s.id)).map((o) => o.id);
  const startet = ctx.naa();
  spil.afstemning = {
    id: spil.naesteHaendelseId,
    art,
    maalId: maal.id,
    startetAf: s.id,
    vaelgere,
    stemmer: { [s.id]: 'ja' },
    startet,
    udloeber: new Date(Date.parse(startet) + AFSTEMNING_SEKUNDER * 1000).toISOString(),
    udfald: null
  };
  skriv(spil, { type: 'afstemning-startet', spillerId: s.id, maalId: maal.id, art }, s);
  afgoerHvisKlart(spil, ctx);
  return spil;
}

function afstemningStem(spil: Spil, s: Spiller, id: number, ja: boolean, ctx: Kontekst): Spil {
  const a = spil.afstemning;
  if (!a || a.id !== id || a.udfald) fejl('Afstemningen er slut.');
  if (!a.vaelgere.includes(s.id)) fejl('Du er ikke med i den her afstemning.');
  a.stemmer[s.id] = ja ? 'ja' : 'nej';
  afgoerHvisKlart(spil, ctx);
  return spil;
}

function optael(a: NonNullable<Spil['afstemning']>): { ja: number; nej: number; mangler: number } {
  const v = a.vaelgere.map((id) => a.stemmer[id]);
  const ja = v.filter((x) => x === 'ja').length;
  const nej = v.filter((x) => x === 'nej').length;
  return { ja, nej, mangler: a.vaelgere.length - ja - nej };
}

/** Afgør med det samme, hvis de manglende stemmer ikke kan vende udfaldet. Flertal af de afgivne; lige er nej. */
function afgoerHvisKlart(spil: Spil, ctx: Kontekst): void {
  const a = spil.afstemning;
  if (!a || a.udfald) return;
  const { ja, nej, mangler } = optael(a);
  if (ja > nej + mangler || nej >= ja + mangler) afgoerAfstemning(spil, ctx);
}

function afstemningUdloebet(spil: Spil, ctx: Kontekst): void {
  const a = spil.afstemning;
  if (!a || a.udfald) return;
  if (Date.parse(spil.opdateret) >= Date.parse(a.udloeber)) afgoerAfstemning(spil, ctx);
}

function afgoerAfstemning(spil: Spil, ctx: Kontekst): void {
  const a = spil.afstemning;
  if (!a || a.udfald) return;
  const { ja, nej } = optael(a);
  const vedtaget = ja > nej && spil.fase === 'spiller';
  a.udfald = vedtaget ? 'ja' : 'nej';
  const maal = find(spil, a.maalId);
  if (!maal) return;

  if (!vedtaget) {
    skriv(spil, { type: 'afstemning-afgjort', maalId: maal.id, art: a.art, ja, nej, udfald: 'nej' }, maal);
    return;
  }
  if (maal.tilstand !== 'aktiv') return;

  if (a.art === 'smid') {
    smidUd(spil, maal, { ja, nej }, ctx);
    return;
  }
  if (!venterPaa(spil, maal.id)) {
    skriv(spil, { type: 'afstemning-afgjort', maalId: maal.id, art: a.art, ja, nej, udfald: 'for-sent' }, maal);
    return;
  }
  skriv(spil, { type: 'afstemning-afgjort', maalId: maal.id, art: a.art, ja, nej, udfald: 'sprunget-over' }, maal);
  slipOpgave(spil, maal, 'spring', ctx);
}

function smidUd(spil: Spil, s: Spiller, stemmer: { ja: number; nej: number }, ctx: Kontekst): void {
  const harOpgave = venterPaa(spil, s.id);
  const m = spil.meier;
  const iDuel = Boolean(m && (m.udfordrerId === s.id || m.modstanderId === s.id));

  s.tilstand = 'ude';
  s.varslerAfgang = false;
  skriv(spil, { type: 'afstemning-afgjort', maalId: s.id, art: 'smid', ja: stemmer.ja, nej: stemmer.nej, udfald: 'smidt-ud' }, s);
  if (spil.syver?.holderId === s.id) spil.syver = null;
  if (spil.taarn.toemmesAfId === s.id) {
    spil.taarn.toemmesAfId = null;
    skriv(spil, { type: 'taarn-frit', spillerId: s.id });
  }

  if (harOpgave) slipOpgave(spil, s, 'smid', ctx);
  else if (iDuel) {
    // Duellen kan ikke fortsætte uden ham — bægeret tages af bordet.
    spil.meier = null;
    skriv(spil, { type: 'meier-aflyst' });
    afslutFelt(spil, ctx);
  } else afgoerKaploeb(spil, ctx);

  s.pitPlads = 0;
  afgoerFinger(spil);
  if (aktive(spil).length === 0) {
    spil.fase = 'slut';
    spil.afventer = null;
    skriv(spil, { type: 'slut' });
  }
}

/**
 * Spillet venter på en der ikke er der. Opgaven droppes, og spillet går videre
 * som om den var klaret uden at der skete noget — med to undtagelser: er han
 * slået i pitten, slås der for ham, og 10'erens gæt går videre til venstremanden.
 */
function slipOpgave(spil: Spil, s: Spiller, art: 'spring' | 'smid', ctx: Kontekst): void {
  const a = spil.afventer;
  if (!a) return;
  switch (a.slags) {
    case 'slag':
    case 'pit-slag':
      afslutTur(spil);
      return;
    case 'pit-placering':
      if (art === 'spring') {
        skriv(spil, { type: 'pit-slaaes-for', spillerId: s.id }, s);
        pitPlacer(spil, s, a.kaede, ctx);
      } else naestePitPlacering(spil, a.kaede.slice());
      return;
    case 'fyld-taarn':
      if (art === 'spring') {
        taarnFaerdig(spil, s, ctx);
        return;
      }
      if (taarnLoeberOver(spil)) spil.taarn.slurke = taarnKapacitetSlurke(spil.indstillinger.taarnKapacitetCl);
      afslutFelt(spil, ctx);
      return;
    case 'hoejere-lavere': {
      const naeste = sidemand(spil, s, 'venstre');
      if (naeste) spil.afventer = { ...a, spillerId: naeste.id };
      else afslutFelt(spil, ctx);
      return;
    }
    case 'kaploeb':
      if (art === 'spring') a.ramte.push(s.id);
      afgoerKaploeb(spil, ctx);
      return;
    case 'meier':
      spil.meier = null;
      skriv(spil, { type: 'meier-aflyst' });
      afslutFelt(spil, ctx);
      return;
    default:
      afslutFelt(spil, ctx);
  }
}

/* -------------------------------------------------- hvad den enkelte må se */

/**
 * Fjerner det den pågældende spiller ikke må vide: bunkens rækkefølge,
 * Meier-slaget, som kun holderen af bægeret kender, og sessionsnøglerne.
 */
export function forSpiller(spil: Spil, spillerId: string): Spil & { bunkeTilbage: number } {
  const kopi: Spil & { bunkeTilbage: number } = {
    ...spil,
    bunke: [],
    bunkeTilbage: spil.bunke.length,
    meier: spil.meier
      ? {
        ...spil.meier,
        slag: spil.meier.slagAf === spillerId && !spil.meier.blindt ? spil.meier.slag : null
      }
      : null
  };
  // Sessionsnøglerne er adgangskoder — dem får ingen klient at se.
  delete kopi.sessioner;
  return kopi;
}

export { feltInfo, feltType, ryk, ANTAL_FELTER };
