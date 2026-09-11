import {
  ANTAL_FELTER, FELT_INFO, PIT_PLADSER, feltInfo, feltType, ryk
} from './board.js';
import { bland, kortNavn, kortTekst, nyBunke, virkning } from './cards.js';
import { SLURKE_PR_ENHED, formatSlurke, taarnCl, taarnKapacitetSlurke, tilDrik } from './drinks.js';
import { erMeyer, trin, trinNavn } from './meier.js';
import {
  RegelFejl,
  type Afventer, type DrikValg, type Handling, type Haendelse, type Kontekst,
  type Fejring, type Kort, type KortHold, type Spil, type Spiller
} from './types.js';

export const BRIKFARVER = [
  '#D8A93F', '#8FAF74', '#87A4C6', '#C4776B', '#B189A6', '#7FB0A4', '#C9A227', '#9C9A78'
];

export const STANDARD_INDSTILLINGER = {
  hardcore: false,
  meierSlurke: 3,
  taarnKapacitetCl: 50
};

const KORT_HOLD: KortHold[] = ['dame', 'konge'];

/** Startfelter: frifelterne, fordelt rundt om pladen så man ikke starter oveni hinanden. */
const STARTFELTER = Array.from({ length: ANTAL_FELTER }, (_, i) => i + 1).filter((nr) => feltType(nr) === 'fri');

function fejl(besked: string): never {
  throw new RegelFejl(besked);
}

export function nytSpil(id: string, kode: string, naa: string): Spil {
  return {
    id,
    kode,
    fase: 'lobby',
    vaertId: '',
    indstillinger: { ...STANDARD_INDSTILLINGER },
    spillere: [],
    turIdx: 0,
    runde: 1,
    terning: null,
    terningAf: null,
    terningNr: 0,
    taarn: { slurke: 0, fyldtAfId: null, toemmesAfId: null },
    bierMeisterId: null,
    bunke: [],
    brugte: [],
    sidsteKort: null,
    husregler: [],
    meier: null,
    meierResultat: null,
    fejring: null,
    afventer: null,
    log: [],
    afventerPit: [],
    naesteHaendelseId: 1,
    opdateret: naa
  };
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

function skriv(spil: Spil, slags: string, tekst: string, spiller?: Spiller): void {
  const h: Haendelse = {
    id: spil.naesteHaendelseId++,
    tid: spil.opdateret,
    slags,
    tekst
  };
  if (spiller) {
    h.spillerId = spiller.id;
    h.farve = spiller.farve;
  }
  spil.log.unshift(h);
  if (spil.log.length > 120) spil.log.length = 120;
}

/**
 * Tildel slurke. Én enhed er 11 slurke; er den tømt, hentes en ny og tælleren
 * går forfra — det er sådan spillet holder regnskab på tværs af øl, vin og whisky.
 */
function drik(spiller: Spiller, antal: number): void {
  if (antal <= 0) return;
  spiller.slurkeIAlt += antal;
  let rest = antal;
  while (rest > 0) {
    if (rest < spiller.slurkeTilbage) {
      spiller.slurkeTilbage -= rest;
      rest = 0;
    } else {
      rest -= spiller.slurkeTilbage;
      spiller.enheder += 1;
      spiller.slurkeTilbage = SLURKE_PR_ENHED;
      if (rest === 0) break;
    }
  }
}

function navn(s: Spiller): string {
  return s.navn;
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
    skriv(spil, 'pit', `${navn(s)} blev skubbet videre i pitten og slog sig til plads ${v}.`, s);
  } else {
    drik(s, v);
    skriv(spil, 'pit', `${navn(s)} slog ${v}: plads ${v} i pitten og ${v} ${v === 1 ? 'shot' : 'shots'}.`, s);
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
    skriv(spil, 'afgang', `${navn(nuvaerende)} er hoppet ud af spillet.`, nuvaerende);
  }

  const n = spil.spillere.length;
  if (aktive(spil).length === 0) {
    spil.fase = 'slut';
    spil.afventer = null;
    skriv(spil, 'slut', 'Spillet er slut — der er ingen tilbage ved bordet.');
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
  const info = FELT_INFO[type];

  // Special event: den der allerede står her, ryger i pitten — men først
  // efter feltets egen virkning er udført.
  const ramte = spil.spillere.filter(
    (o) => o.id !== s.id && o.tilstand === 'aktiv' && o.pitPlads === 0 && o.felt === s.felt
  );
  spil.afventerPit = ramte.map((o) => o.id);

  skriv(spil, 'landing', `${navn(s)} landede på ${info.navn} (felt ${s.felt}).`, s);

  switch (type) {
    case 'fri':
      afslutFelt(spil, ctx);
      return;

    case 'skaal': {
      for (const o of aktive(spil)) drik(o, 1);
      skriv(spil, 'skaal', 'SKÅL! Alle ved bordet tager en fællesskål.', s);
      afslutFelt(spil, ctx);
      return;
    }

    case 'bm': {
      spil.bierMeisterId = s.id;
      skriv(spil, 'bm', `${navn(s)} er den nye Bier Meister. Find noget grimt til hovedet.`, s);
      afslutFelt(spil, ctx);
      return;
    }

    case 'gobm': {
      const bm = spil.bierMeisterId ? find(spil, spil.bierMeisterId) : undefined;
      const offer = bm && bm.tilstand === 'aktiv' ? bm : s;
      drik(offer, 3);
      skriv(
        spil, 'gobm',
        bm && bm.tilstand === 'aktiv'
          ? `Go! Bier Meister — ${navn(offer)} drikker 3 slurke.`
          : `Go! Bier Meister — der er ingen Bier Meister, så ${navn(s)} drikker selv 3 slurke.`,
        offer
      );
      afslutFelt(spil, ctx);
      return;
    }

    case 'tre':
      spil.afventer = { slags: 'giv-slurke', spillerId: s.id, antal: 3 };
      return;

    case 'taarn': {
      // Er en anden i gang med at tømme tårnet, skal det stilles fra sig med det samme.
      const t = spil.taarn.toemmesAfId ? find(spil, spil.taarn.toemmesAfId) : undefined;
      if (t && t.id !== s.id) {
        skriv(spil, 'raab', `ØL I TÅRNET! ${navn(t)} må stille tårnet fra sig med det samme.`, s);
      }
      spil.afventer = { slags: 'fyld-taarn', spillerId: s.id };
      return;
    }

    case 'kort':
      spil.afventer = { slags: 'traek-kort', spillerId: s.id };
      return;

    case 'krone':
      spil.afventer = { slags: 'krone-kast', spillerId: s.id };
      return;

    case 'meier':
      if (aktive(spil).length < 2) {
        skriv(spil, 'meier', 'Meier kræver en modstander — der er ingen at udfordre.', s);
        afslutFelt(spil, ctx);
        return;
      }
      spil.afventer = { slags: 'meier-modstander', spillerId: s.id };
      return;

    case 'drik':
      givTaarnet(spil, s, `DRIK! ${navn(s)} skal bunde tårnet — ${formatSlurke(spil.taarn.slurke)}.`);
      afslutFelt(spil, ctx);
      return;
  }
}

/**
 * Sæt tårnet hos en spiller. Spillet kører videre imens — han får en knap til
 * at sige når det er tomt, og lander en anden på "Øl i tårnet" inden da, må
 * der hældes mere i. Er tårnet tomt, er der ikke noget at bunde.
 */
function givTaarnet(spil: Spil, s: Spiller, tekst: string): void {
  if (spil.taarn.slurke === 0) {
    skriv(spil, 'drik', `${tekst} Men tårnet er tomt — der er ikke noget at drikke.`, s);
    return;
  }
  spil.taarn.toemmesAfId = s.id;
  skriv(spil, 'drik', tekst, s);
}

/* ------------------------------------------------------------------- kortene */

function traekKort(spil: Spil, s: Spiller, ctx: Kontekst): void {
  if (spil.bunke.length === 0) {
    spil.bunke = bland(nyBunke(), Math.random);
    spil.brugte = [];
    skriv(spil, 'kort', 'Bunken var brugt op — der er blandet et nyt spil kort.');
  }
  const kort = spil.bunke.shift()!;
  spil.brugte.push(kort);
  spil.sidsteKort = kort;
  const v = virkning(kort);
  const t = kortTekst(kort);
  skriv(spil, 'kort', `${navn(s)} trak ${kortNavn(kort)} — ${t.titel}.`, s);

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
    case 'vaelg-taber':
      spil.afventer = { slags: 'vaelg-taber', spillerId: s.id, grund: v.grund };
      return;
    case 'regel':
      spil.afventer = { slags: 'ny-regel', spillerId: s.id };
      return;
    case 'maraton': {
      // Trækkeren stopper først, så naboen til venstre, og så videre rundt.
      const raekke = aktive(spil);
      const start = raekke.findIndex((o) => o.id === s.id);
      raekke.forEach((_, i) => {
        const o = raekke[(start + i) % raekke.length]!;
        drik(o, i + 1);
      });
      skriv(spil, 'maraton', `Maraton! ${navn(s)} slap med 1 slurk — den sidste rundt betalte ${raekke.length}.`, s);
      spil.afventer = { slags: 'kort-udfald', spillerId: s.id, kort };
      return;
    }
    case 'hold': {
      const ramt = aktive(spil).filter((o) => o.kortHold === v.hold);
      for (const o of ramt) drik(o, 2);
      skriv(
        spil, 'hold',
        ramt.length
          ? `${v.hold === 'dame' ? 'Damerne' : 'Herrerne'} drikker 2 slurke: ${ramt.map(navn).join(', ')}.`
          : `${v.hold === 'dame' ? 'Damerne' : 'Herrerne'} drikker — men ingen ved bordet er med på det hold.`,
        s
      );
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

export function anvend(spil: Spil, handling: Handling, ctx: Kontekst): Spil {
  spil.opdateret = ctx.naa();

  switch (handling.type) {
    case 'join': return join(spil, handling, ctx);
    case 'saet-drik': return saetDrik(spil, handling.drik, ctx);
    case 'saet-indstilling': return saetIndstilling(spil, handling, ctx);
    case 'start': return start(spil, ctx);
    case 'forbindelse': {
      const s = find(spil, ctx.spillerId);
      if (s) s.tilsluttet = handling.tilsluttet;
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
    case 'krone-resultat': return kroneResultat(spil, s, handling.ramte, ctx);
    case 'krone-udpeg': return kroneUdpeg(spil, s, handling.spillerId, ctx);
    case 'traek-kort': return traekHandling(spil, s, ctx);
    case 'kort-kvitter': return kortKvitter(spil, s, ctx);
    case 'kaploeb-tryk': return kaploebTryk(spil, s, ctx);
    case 'ny-regel': return nyRegel(spil, s, handling.regel, ctx);
    case 'fjern-regel': return fjernRegel(spil, s, handling.index, ctx);
    case 'vaelg-taber': return vaelgTaber(spil, s, handling.spillerId, ctx);
    case 'meier-vaelg': return meierVaelg(spil, s, handling.spillerId, ctx);
    case 'meier-slaa':
    case 'meier-tro': return meierSlaa(spil, s, ctx);
    case 'meier-meld': return meierMeld(spil, s, handling.melding, ctx);
    case 'meier-blindt': return meierBlindt(spil, s, ctx);
    case 'meier-loeft': return meierLoeft(spil, s, ctx);
    case 'meld-afgang': return meldAfgang(spil, s, ctx);
    case 'terning-paa-gulvet': return terningPaaGulvet(spil, s, ctx);
    default: fejl('Ukendt handling.');
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
  const drikken = tilDrik(h.drik);

  if (findes) {
    findes.navn = navnet;
    findes.drik = drikken;
    findes.kortHold = h.kortHold;
    findes.tilsluttet = true;
    return spil;
  }

  if (spil.fase === 'slut') fejl('Spillet er slut.');
  if (spil.spillere.length >= 8) fejl('Der er otte ved bordet — der er ikke plads til flere.');
  if (spil.spillere.some((o) => o.navn.toLowerCase() === navnet.toLowerCase())) {
    fejl('Der er allerede en med det navn ved bordet.');
  }

  const taget = new Set(spil.spillere.map((o) => o.farve));
  const farve = !taget.has(h.farve) ? h.farve : (BRIKFARVER.find((f) => !taget.has(f)) ?? BRIKFARVER[0]!);

  const spiller: Spiller = {
    id: ctx.spillerId,
    navn: navnet,
    farve,
    drik: drikken,
    kortHold: h.kortHold,
    felt: 0,
    pitPlads: 0,
    slurkeTilbage: SLURKE_PR_ENHED,
    enheder: 0,
    slurkeIAlt: 0,
    tilstand: 'aktiv',
    varslerAfgang: false,
    tilsluttet: true
  };
  spil.spillere.push(spiller);
  if (!spil.vaertId) spil.vaertId = spiller.id;

  // Har man linket, kan man altid hoppe med: man stiller sig på et ledigt
  // frifelt og kommer med i turen bagest i rækken.
  if (spil.fase === 'spiller') {
    spiller.felt = ledigtStartfelt(spil);
    skriv(spil, 'join', `${navnet} kom med til bordet midt i spillet og står på felt ${spiller.felt}.`, spiller);
    return spil;
  }

  skriv(spil, 'join', `${navnet} kom med til bordet.`, spiller);
  return spil;
}

function saetDrik(spil: Spil, valg: DrikValg, ctx: Kontekst): Spil {
  const s = kraev(spil, ctx.spillerId);
  s.drik = tilDrik(valg);
  return spil;
}

function saetIndstilling(spil: Spil, h: Extract<Handling, { type: 'saet-indstilling' }>, ctx: Kontekst): Spil {
  if (spil.vaertId !== ctx.spillerId) fejl('Kun værten kan ændre husreglerne.');
  if (spil.fase !== 'lobby') fejl('Husreglerne skal aftales inden spillet går i gang.');
  if (h.hardcore !== undefined) spil.indstillinger.hardcore = h.hardcore;
  if (h.meierSlurke !== undefined) {
    spil.indstillinger.meierSlurke = Math.max(1, Math.min(10, Math.round(h.meierSlurke)));
  }
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
  spil.bunke = bland(nyBunke(), Math.random);
  spil.brugte = [];
  spil.fase = 'spiller';
  spil.runde = 1;
  skriv(spil, 'start', `Spillet er i gang. ${spil.spillere.length} ved bordet — turen går med uret.`);
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
      skriv(spil, 'slag', `${navn(s)} slog ${v} og er ude af pitten.`, s);
      s.pitPlads = 0;
      s.felt = 1;
      landPaa(spil, s, ctx);
    } else {
      s.pitPlads -= v;
      drik(s, s.pitPlads);
      skriv(spil, 'slag', `${navn(s)} slog ${v}, rykkede ned på plads ${s.pitPlads} og drikker ${s.pitPlads} shots.`, s);
      afslutTur(spil);
    }
    return spil;
  }

  s.felt = ryk(s.felt, v);
  skriv(spil, 'slag', `${navn(s)} slog ${v}.`, s);
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
  for (const f of fordeling) {
    const antal = Math.max(0, Math.round(f.antal));
    if (antal === 0) continue;
    const o = find(spil, f.spillerId);
    if (!o || o.tilstand !== 'aktiv') fejl('Den spiller er ikke med længere.');
    drik(o, antal);
    navne.push(`${navn(o)} ${antal}`);
  }
  skriv(spil, 'giv', `${navn(s)} delte ${a.antal} slurke ud: ${navne.join(', ')}.`, s);
  afslutFelt(spil, ctx);
  return spil;
}

function fyldTaarn(spil: Spil, s: Spiller, slurke: number, _ctx: Kontekst): Spil {
  kraevAfventer(spil, 'fyld-taarn', s);
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
  skriv(
    spil, 'taarn',
    `${navn(s)} hældte i tårnet — der står nu ${formatSlurke(spil.taarn.slurke)} (${taarnCl(spil.taarn.slurke)} cl).`,
    s
  );

  if (taarnLoeberOver(spil)) {
    givTaarnet(spil, s, `Tårnet løb over ${spil.indstillinger.taarnKapacitetCl} cl — ${navn(s)} bunder det selv.`);
    fejr(spil, {
      art: 'overloeb',
      vinderId: null,
      taberId: s.id,
      titel: 'Tårnet løb over',
      tekst: `${navn(s)} hældte ${taarnCl(spil.taarn.slurke)} cl i et glas på ${spil.indstillinger.taarnKapacitetCl}. Det bunder man selv.`,
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
  skriv(spil, 'taarn', `${navn(s)} bundede tårnet — ${formatSlurke(maengde)}.`, s);
  return spil;
}

function kroneResultat(spil: Spil, s: Spiller, ramte: boolean, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'krone-kast', s);
  if (!ramte) {
    skriv(spil, 'krone', `${navn(s)} ramte ved siden af med 2-kronen.`, s);
    afslutFelt(spil, ctx);
    return spil;
  }
  if (spil.taarn.slurke === 0) {
    skriv(spil, 'krone', `${navn(s)} ramte i — men tårnet er tomt, så der er ingen at udpege.`, s);
    afslutFelt(spil, ctx);
    return spil;
  }
  skriv(spil, 'krone', `${navn(s)} fik 2-kronen i tårnet og må udpege en.`, s);
  spil.afventer = { slags: 'krone-udpeg', spillerId: s.id };
  return spil;
}

function kroneUdpeg(spil: Spil, s: Spiller, maalId: string, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'krone-udpeg', s);
  const maal = find(spil, maalId);
  if (!maal || maal.tilstand !== 'aktiv') fejl('Vælg en der er med i spillet.');
  givTaarnet(spil, maal, `${navn(s)} udpegede ${navn(maal)} til at bunde tårnet — ${formatSlurke(spil.taarn.slurke)}.`);
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

  const med = aktive(spil);
  if (a.ramte.length >= med.length - 1 && med.length > 1) {
    const sidste = med.find((o) => !a.ramte.includes(o.id));
    const foerste = find(spil, a.ramte[0]!);
    if (sidste) {
      drik(sidste, 1);
      skriv(spil, 'kaploeb', `${navn(sidste)} var sidste mand og drikker en slurk.`, sidste);
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
  return spil;
}

function nyRegel(spil: Spil, s: Spiller, regel: string, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'ny-regel', s);
  const tekst = regel.trim().slice(0, 140);
  if (!tekst) fejl('Skriv en regel.');
  spil.husregler.push(tekst);
  skriv(spil, 'regel', `Ny husregel fra ${navn(s)}: ${tekst}`, s);
  afslutFelt(spil, ctx);
  return spil;
}

function fjernRegel(spil: Spil, s: Spiller, index: number, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'ny-regel', s);
  const [fjernet] = spil.husregler.splice(index, 1);
  if (!fjernet) fejl('Den regel findes ikke.');
  skriv(spil, 'regel', `${navn(s)} ophævede reglen: ${fjernet}`, s);
  afslutFelt(spil, ctx);
  return spil;
}

function vaelgTaber(spil: Spil, s: Spiller, taberId: string, ctx: Kontekst): Spil {
  kraevAfventer(spil, 'vaelg-taber', s);
  const taber = find(spil, taberId);
  if (!taber || taber.tilstand !== 'aktiv') fejl('Vælg en der er med i spillet.');
  drik(taber, 1);
  skriv(spil, 'kort', `${navn(taber)} gik i stå og drikker en slurk.`, taber);
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
  skriv(spil, 'meier', `${navn(s)} udfordrede ${navn(m)} til en runde Meier.`, s);
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
  if (m.melding !== null && melding < m.melding) fejl('Du skal melde det samme eller højere.');
  m.melding = melding;
  m.meldtAf = s.id;
  m.holderId = m.holderId === m.udfordrerId ? m.modstanderId : m.udfordrerId;
  m.historik.unshift({ tekst: `${navn(s)} meldte og sendte videre.`, melding: trinNavn(melding), spillerId: s.id });
  skriv(spil, 'meier', `${navn(s)} melder ${trinNavn(melding)}.`, s);
  spil.afventer = { slags: 'meier', spillerId: m.holderId };
  return spil;
}

function meierBlindt(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  if (m.melding === null) fejl('Der er ingen melding at slå op imod endnu.');
  m.slag = [ctx.terning(), ctx.terning()];
  m.slagAf = s.id;
  m.blindt = true;
  m.meldtAf = s.id;
  m.holderId = m.holderId === m.udfordrerId ? m.modstanderId : m.udfordrerId;
  m.historik.unshift({ tekst: `${navn(s)} slog blindt: "det samme eller derover".`, spillerId: s.id });
  skriv(spil, 'meier', `${navn(s)} slog uden at kigge og sagde "det samme eller derover".`, s);
  spil.afventer = { slags: 'meier', spillerId: m.holderId };
  return spil;
}

function meierLoeft(spil: Spil, s: Spiller, ctx: Kontekst): Spil {
  const m = kraevMeier(spil, s);
  if (m.melding === null || !m.meldtAf || !m.slag) fejl('Der er ikke noget at løfte endnu.');

  const faktisk = trin(m.slag[0], m.slag[1]);
  const meldt = m.melding;
  const meldende = find(spil, m.meldtAf);
  const loefter = s;
  const loej = faktisk < meldt;
  const taber = loej ? meldende : loefter;
  const dobbelt = erMeyer(meldt);
  const antal = spil.indstillinger.meierSlurke * (dobbelt ? 2 : 1);

  if (taber) drik(taber, antal);
  skriv(
    spil, 'meier',
    `${navn(loefter)} løftede bægeret: ${trinNavn(faktisk)} mod meldingen ${trinNavn(meldt)}. `
    + `${taber ? navn(taber) : 'Ingen'} drikker ${antal} slurke${dobbelt ? ' — dobbelt, det var en Meyer' : ''}.`,
    taber ?? s
  );

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
  skriv(spil, 'afgang', `${navn(s)} melder afgang efter dette slag.`, s);
  return spil;
}

function terningPaaGulvet(spil: Spil, s: Spiller, _ctx: Kontekst): Spil {
  drik(s, 1);
  skriv(spil, 'straf', `${navn(s)} sendte terningen ud over bordkanten og drikker en straf-slurk.`, s);
  return spil;
}

/* -------------------------------------------------- hvad den enkelte må se */

/**
 * Fjerner det den pågældende spiller ikke må vide: bunkens rækkefølge og
 * Meier-slaget, som kun holderen af bægeret kender.
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
  return kopi;
}

export { feltInfo, feltType, ryk, ANTAL_FELTER };
