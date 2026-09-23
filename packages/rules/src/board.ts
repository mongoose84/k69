import type { FeltType } from './types.js';

/**
 * Sådan står felterne fysisk på pladen, aflæst felt for felt på fotoet af det
 * originale bræt fra Tinglev. Listen løber mod uret fra "3 til..?" ved pittens
 * udgang — det er bare den vej billedet var nemmest at læse.
 */
const PLADE_RAEKKE: FeltType[] = [
  'tre', 'fri', 'gobm', 'fri', 'drik', 'tre', 'kort', 'fri', 'taarn', 'fri',
  'bm', 'skaal', 'tre', 'krone', 'taarn', 'fri', 'meier', 'fri', 'kort', 'skaal',
  'gobm', 'fri', 'tre', 'drik', 'taarn', 'meier', 'fri', 'kort', 'fri', 'gobm',
  'skaal', 'taarn', 'krone', 'fri', 'meier', 'fri', 'taarn', 'kort'
];

export const ANTAL_FELTER = PLADE_RAEKKE.length; // 38
export const PIT_PLADSER = 6;

/**
 * Man rykker med uret. Felt 1 ligger stadig samme sted — ved pittens udgang —
 * men derfra går nummereringen den modsatte vej rundt af den listen er læst i.
 */
function pladsFor(nr: number): number {
  return (ANTAL_FELTER - (nr - 1)) % ANTAL_FELTER;
}

/** Felternes art i den rækkefølge man rykker gennem dem. */
export const FELT_RAEKKE: FeltType[] = Array.from(
  { length: ANTAL_FELTER },
  (_, i) => PLADE_RAEKKE[pladsFor(i + 1)]!
);

export interface FeltInfo {
  navn: string;
  linjer: string[];
  farve: string;
  fyld: string;
  vaegt: number;
  str: number;
  /** Kort forklaring — samme tekst i alle klienter. */
  regel: string;
}

export const FELT_INFO: Record<FeltType, FeltInfo> = {
  fri: {
    navn: 'Frifelt', linjer: [], farve: '#8C9689', fyld: '#1B2820', vaegt: 400, str: 10.5,
    regel: 'Der sker ingenting. Men fredet er du ikke — de andre må stadig give dig slurke.'
  },
  tre: {
    navn: '3 til..?', linjer: ['3 til..?'], farve: '#93AE7C', fyld: '#1D2A21', vaegt: 600, str: 12,
    regel: 'Du deler tre slurke ud. Du bestemmer selv om én tager alle tre, eller om tre tager én hver.'
  },
  skaal: {
    navn: 'SKÅL!', linjer: ['SKÅL!'], farve: '#D3B44E', fyld: '#252C1D', vaegt: 700, str: 12.5,
    regel: 'Alle ved bordet tager en fællesskål.'
  },
  bm: {
    navn: 'Bier Meister', linjer: ['Bier', 'Meister'], farve: '#1A1509', fyld: '#C9A227', vaegt: 700, str: 11,
    regel: 'Du er nu Bier Meister. Du henter øl, og du drikker hver gang nogen lander på Go! Bier Meister. Titlen ryger først videre når en anden lander her.'
  },
  gobm: {
    navn: 'Go! Bier Meister', linjer: ['Go!', 'Bier', 'Meister'], farve: '#D08A4E', fyld: '#26221B', vaegt: 600, str: 10,
    regel: 'Bier Meisteren drikker 3 slurke. Er der ingen Bier Meister, drikker du selv.'
  },
  taarn: {
    navn: 'Øl i tårnet', linjer: ['Øl i', 'tårnet'], farve: '#E0A03C', fyld: '#27231A', vaegt: 600, str: 11,
    regel: 'Hæld så meget i tårnet du har lyst til. Løber det over, bunder du det selv — men aldrig mere end et fuldt glas.'
  },
  kort: {
    navn: 'Træk et kort', linjer: ['Træk et', 'kort'], farve: '#88A2C2', fyld: '#1B222B', vaegt: 600, str: 11,
    regel: 'Træk et kort fra bunken og gør hvad der står.'
  },
  drik: {
    navn: 'DRIK!', linjer: ['DRIK!'], farve: '#F6E7E1', fyld: '#8E2F2C', vaegt: 700, str: 14,
    regel: 'Kort og godt: bund tårnet.'
  },
  meier: {
    navn: 'Meier', linjer: ['Meier'], farve: '#B084A0', fyld: '#241D24', vaegt: 600, str: 12,
    regel: 'Udfordr en spiller til én runde Meyer. Taberen drikker — taber du på en Meyer, drikker du dobbelt.'
  },
  krone: {
    navn: '2-krone', linjer: ['2-krone'], farve: '#DCC684', fyld: '#25241A', vaegt: 600, str: 11,
    regel: 'Ét forsøg: smid 2-kronen i tårnet. Den skal ramme bordet først. Lykkes det, udpeger du én der skal bunde tårnet.'
  }
};

export function feltType(nr: number): FeltType {
  const t = FELT_RAEKKE[(((nr - 1) % ANTAL_FELTER) + ANTAL_FELTER) % ANTAL_FELTER];
  return t ?? 'fri';
}

export function feltInfo(nr: number): FeltInfo {
  return FELT_INFO[feltType(nr)];
}

/** Ryk n felter frem fra et felt (1-indekseret, lukker rundt). */
export function ryk(fra: number, antal: number): number {
  return ((fra - 1 + antal) % ANTAL_FELTER) + 1;
}

/* ---------------------------------------------------------------- Geometri */

export const GEO = { W: 1200, H: 650, CX: 600, CY: 320, R: 200, LX: 260, RX: 940, HW: 42 };

type Punkt = [number, number];

function kubisk(p0: Punkt, c1: Punkt, c2: Punkt, p3: Punkt) {
  return (t: number): Punkt => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [
      a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
      a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]
    ];
  };
}

function bue(cx: number, cy: number, r: number, a0: number, a1: number) {
  return (t: number): Punkt => {
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
}

const { W, H, CX, CY, R, LX, RX, HW } = GEO;

const SEGMENTER = [
  kubisk([LX, 520], [LX + 80, 520], [LX + 130, 425], [CX, 425]),
  kubisk([CX, 425], [RX - 130, 425], [RX - 80, 520], [RX, 520]),
  bue(RX, CY, R, 90, -90),
  kubisk([RX, 120], [RX - 80, 120], [RX - 130, 215], [CX, 215]),
  kubisk([CX, 215], [LX + 130, 215], [LX + 80, 120], [LX, 120]),
  bue(LX, CY, R, -90, -270)
];

const PRØVER: Punkt[] = [];
for (const seg of SEGMENTER) {
  for (let i = 0; i < 260; i++) PRØVER.push(seg(i / 260));
}
PRØVER.push(PRØVER[0]!);

const KUM: number[] = [0];
for (let i = 1; i < PRØVER.length; i++) {
  const a = PRØVER[i]!, b = PRØVER[i - 1]!;
  KUM.push(KUM[i - 1]! + Math.hypot(a[0] - b[0], a[1] - b[1]));
}
export const BANE_LAENGDE = KUM[KUM.length - 1]!;

function punkt(d: number): Punkt {
  const x = ((d % BANE_LAENGDE) + BANE_LAENGDE) % BANE_LAENGDE;
  let lo = 0, hi = KUM.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (KUM[mid]! <= x) lo = mid; else hi = mid;
  }
  const spand = KUM[hi]! - KUM[lo]! || 1;
  const f = (x - KUM[lo]!) / spand;
  const a = PRØVER[lo]!, b = PRØVER[hi]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

function paaBane(s: number) {
  const p = punkt(s);
  const a = punkt(s - 1.5), b = punkt(s + 1.5);
  const tx = b[0] - a[0], ty = b[1] - a[1];
  const len = Math.hypot(tx, ty) || 1;
  return { p, t: [tx / len, ty / len] as Punkt, n: [ty / len, -tx / len] as Punkt };
}

const r2 = (v: number) => Math.round(v * 10) / 10;
const TRIN = BANE_LAENGDE / ANTAL_FELTER;

export interface FeltGeometri {
  nr: number;
  /** Feltets fysiske plads på pladen, uafhængigt af spilretningen. */
  plads: number;
  type: FeltType;
  cx: number;
  cy: number;
  vinkel: number;
  punkter: string;
  ydre: Punkt[];
  indre: Punkt[];
}

export const FELTER: FeltGeometri[] = FELT_RAEKKE.map((type, i) => {
  // Feltet tegnes dér hvor det står på pladen; nummeret følger spilretningen.
  const plads = pladsFor(i + 1);
  const s0 = plads * TRIN, s1 = (plads + 1) * TRIN;
  const ydre: Punkt[] = [], indre: Punkt[] = [];
  const K = 7;
  for (let k = 0; k <= K; k++) {
    const q = paaBane(s0 + (s1 - s0) * (k / K));
    const modMidten: Punkt = [CX - q.p[0], CY - q.p[1]];
    const tegn = q.n[0] * modMidten[0] + q.n[1] * modMidten[1] > 0 ? -1 : 1;
    ydre.push([q.p[0] + q.n[0] * HW * tegn, q.p[1] + q.n[1] * HW * tegn]);
    indre.push([q.p[0] - q.n[0] * HW * tegn, q.p[1] - q.n[1] * HW * tegn]);
  }
  const midt = paaBane(s0 + TRIN / 2);
  let vinkel = (Math.atan2(midt.t[1], midt.t[0]) * 180) / Math.PI;
  if (vinkel > 90 || vinkel < -90) vinkel += 180;
  const alle = ydre.concat(indre.slice().reverse());
  return {
    nr: i + 1,
    plads,
    type,
    cx: r2(midt.p[0]),
    cy: r2(midt.p[1]),
    vinkel: r2(vinkel),
    punkter: alle.map((p) => `${r2(p[0])},${r2(p[1])}`).join(' '),
    ydre,
    indre
  };
});

export interface PitGeometri {
  plads: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export const PIT: PitGeometri[] = (() => {
  const x0 = 420, x1 = 780, y0 = 512, y1 = 584;
  const w = (x1 - x0) / PIT_PLADSER;
  return Array.from({ length: PIT_PLADSER }, (_, i) => ({
    plads: i + 1,
    x: r2(x0 + i * w),
    y: y0,
    w: r2(w),
    h: y1 - y0,
    cx: r2(x0 + i * w + w / 2),
    cy: r2((y0 + y1) / 2)
  }));
})();

/**
 * Bordet midt på pladen: kortene, tårnet og terningen på én bred plade. Den
 * spænder over begge DRIK!-felter (x 561 og 639), så DRIK! står ud for tårnet.
 */
export const BORDET_GEO = { x0: 452, x1: 748, y0: 258, y1: 382 };

/** Fingeren på bordkanten ligger nede i pladens højre hjørne, uden for banen. */
export const FINGER_POS = { x: 1120, y: 592 };

function sti(liste: Punkt[]): string {
  return 'M ' + liste.map((p, i) => `${i ? 'L ' : ''}${r2(p[0])} ${r2(p[1])}`).join(' ') + ' Z';
}

// Omridset skal følge pladen rundt, ikke spilrækkefølgen.
const IRAEKKEFOELGE = [...FELTER].sort((a, b) => a.plads - b.plads);
export const YDRE_STI = sti(IRAEKKEFOELGE.flatMap((f) => f.ydre));
export const INDRE_STI = sti(IRAEKKEFOELGE.flatMap((f) => f.indre));
export const BRAET_STR = { w: W, h: H };
