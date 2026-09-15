import type { Kort, Kuloer, Rang } from './types.js';

export const KULOERER: Kuloer[] = ['spar', 'klor', 'hjerter', 'ruder'];
export const RANGER: Rang[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K'];

export const KULOER_NAVN: Record<Kuloer, string> = {
  spar: 'Spar', klor: 'Klør', hjerter: 'Hjerter', ruder: 'Ruder'
};
export const KULOER_TEGN: Record<Kuloer, string> = {
  spar: '♠', klor: '♣', hjerter: '♥', ruder: '♦'
};
export const RANG_NAVN: Record<Rang, string> = {
  A: 'Es', '2': 'To', '3': 'Tre', '4': 'Fire', '5': 'Fem', '6': 'Seks', '7': 'Syv',
  '8': 'Otte', '9': 'Ni', '10': 'Ti', B: 'Bonde', D: 'Dame', K: 'Konge'
};

export function erSort(k: Kort): boolean {
  return k.kuloer === 'spar' || k.kuloer === 'klor';
}

/** 52 kort uden jokere. */
export function nyBunke(): Kort[] {
  const b: Kort[] = [];
  for (const kuloer of KULOERER) for (const rang of RANGER) b.push({ rang, kuloer });
  return b;
}

export function bland<T>(liste: T[], tilfaeldig: () => number): T[] {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(tilfaeldig() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/**
 * Hvad et kort betyder. Reglerne er som de spilles i Tinglev.
 *
 *  slags:
 *   'selv'       — trækkeren drikker `antal`
 *   'giv'        — trækkeren fordeler `antal`
 *   'ingenting'  — frikort
 *   'kaploeb'    — sidste mand drikker (fingeren på næsen)
 *   'behold'     — 7'eren: man beholder kortet og lægger fingeren på bordkanten når man vil
 *   'vaelg-taber'— trækkeren udpeger den der gik i stå
 *   'maraton'    — alle drikker samtidig; appen tæller ikke
 *   'regel'      — trækkeren laver eller ophæver en husregel
 *   'hold'       — alle på et hold drikker HOLD_SLURKE
 */
export type KortVirkning =
  | { slags: 'selv'; antal: number }
  | { slags: 'giv'; antal: number }
  | { slags: 'ingenting' }
  | { slags: 'kaploeb'; hvor: 'bordkant' | 'naese' }
  | { slags: 'behold' }
  | { slags: 'vaelg-taber'; grund: string }
  | { slags: 'maraton' }
  | { slags: 'regel' }
  | { slags: 'hold'; hold: 'dame' | 'konge' };

const TAL: Partial<Record<Rang, number>> = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5 };

/** Dame og Konge: så meget drikker holdet. Husregel, Jeppe 2026-09-15. */
export const HOLD_SLURKE = 3;

export function virkning(k: Kort): KortVirkning {
  const n = TAL[k.rang];
  if (n !== undefined) {
    return erSort(k) ? { slags: 'selv', antal: n } : { slags: 'giv', antal: n };
  }
  switch (k.rang) {
    case '6': return { slags: 'ingenting' };
    case '7': return { slags: 'behold' };
    case '8': return { slags: 'kaploeb', hvor: 'naese' };
    case '9': return { slags: 'vaelg-taber', grund: 'Emne — den der gik i stå eller gentog sig selv' };
    case '10': return { slags: 'maraton' };
    case 'B': return { slags: 'regel' };
    case 'D': return { slags: 'hold', hold: 'dame' };
    default: return { slags: 'hold', hold: 'konge' };
  }
}

export interface KortTekst {
  titel: string;
  tekst: string;
}

export function kortTekst(k: Kort): KortTekst {
  const v = virkning(k);
  switch (v.slags) {
    case 'selv':
      return {
        titel: 'Sort uheld',
        tekst: `${KULOER_NAVN[k.kuloer]} er sort — du drikker selv ${v.antal} ${v.antal === 1 ? 'slurk' : 'slurke'}.`
      };
    case 'giv':
      return {
        titel: 'Del ud',
        tekst: `${KULOER_NAVN[k.kuloer]} må du give væk. ${v.antal} ${v.antal === 1 ? 'slurk' : 'slurke'} at fordele som du vil.`
      };
    case 'ingenting':
      return { titel: 'Frikort', tekst: 'Der sker ingenting.' };
    case 'kaploeb':
      return v.hvor === 'bordkant'
        ? {
          titel: 'Fingeren på bordkanten',
          tekst: 'Læg diskret en finger på bordkanten. Sidste mand drikker. Alle trykker her når de opdager det.'
        }
        : {
          titel: 'Fingeren på næsen',
          tekst: 'Hurtigt op på næsen. Sidste mand drikker.'
        };
    case 'behold':
      return {
        titel: 'Fingeren på bordkanten',
        tekst: 'Du beholder 7’eren. Læg diskret en finger på bordkanten når du vil — de andre skal nå at gøre det samme. Sidste mand drikker.'
      };
    case 'vaelg-taber':
      return {
        titel: 'Emne',
        tekst: 'Sig et emne. Alle nævner noget nyt på skift indtil en går i stå eller gentager sig selv. Udpeg taberen her.'
      };
    case 'maraton':
      return {
        titel: 'Maraton',
        tekst: 'Alle tager øllen til munden og drikker samtidig. Du må stoppe først, så din venstremand, og så videre rundt.'
      };
    case 'regel':
      return {
        titel: 'Regelkort',
        tekst: 'Lav en regel der gælder alle — eller ophæv en eksisterende. Den sidste regel gælder.'
      };
    case 'hold':
      return v.hold === 'dame'
        ? { titel: 'Damerne drikker', tekst: `Alle kvinder ved bordet drikker ${HOLD_SLURKE} slurke.` }
        : { titel: 'Herrerne drikker', tekst: `Alle mænd ved bordet drikker ${HOLD_SLURKE} slurke.` };
  }
}

export function kortNavn(k: Kort): string {
  return `${RANG_NAVN[k.rang]} ${KULOER_NAVN[k.kuloer].toLowerCase()}`;
}
