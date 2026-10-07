import { RegelFejl, type DrikValg, type KlientHandling, type KortHold } from './types.js';

/**
 * Grænsen mellem nettet og motoren. `KlientHandling` er kun en type — det der
 * kommer over en websocket, kan være hvad som helst. Her tjekkes formen, og der
 * bygges en ny handling med kun de felter motoren kender. Om værdierne giver
 * mening i spillet (er det din tur, findes meldingen i stigen), afgør motoren.
 */

type Raa = Record<string, unknown>;

function ugyldig(): never {
  throw new RegelFejl('Ugyldig handling.');
}

function objekt(v: unknown): Raa {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) ugyldig();
  return v as Raa;
}

function tekst(v: unknown, max = 200): string {
  if (typeof v !== 'string' || v.length > max) ugyldig();
  return v;
}

function tal(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) ugyldig();
  return v;
}

function sandhed(v: unknown): boolean {
  if (typeof v !== 'boolean') ugyldig();
  return v;
}

function enAf<T extends string>(v: unknown, mulige: readonly T[]): T {
  if (!mulige.includes(v as T)) ugyldig();
  return v as T;
}

function drikValg(v: unknown): DrikValg {
  if (typeof v === 'string') return enAf(v, ['ol', 'vin', 'whisky'] as const);
  const o = objekt(v);
  if ('id' in o) return { id: enAf(o.id, ['ol', 'vin', 'whisky'] as const), enhedCl: tal(o.enhedCl) };
  return { navn: tekst(o.navn, 100), enhedCl: tal(o.enhedCl), procent: tal(o.procent) };
}

const KORT_HOLD: readonly KortHold[] = ['dame', 'konge'];

const TOLKE: { [T in KlientHandling['type']]: (o: Raa) => Extract<KlientHandling, { type: T }> } = {
  'join': (o) => ({
    type: 'join', navn: tekst(o.navn, 100), farve: tekst(o.farve, 20),
    drik: drikValg(o.drik), kortHold: enAf(o.kortHold, KORT_HOLD)
  }),
  'saet-drik': (o) => ({ type: 'saet-drik', drik: drikValg(o.drik) }),
  'saet-indstilling': (o) => (o.hardcore === undefined
    ? { type: 'saet-indstilling' }
    : { type: 'saet-indstilling', hardcore: sandhed(o.hardcore) }),
  'start': () => ({ type: 'start' }),
  'slaa': () => ({ type: 'slaa' }),
  'giv-slurke': (o) => {
    if (!Array.isArray(o.fordeling) || o.fordeling.length > 16) ugyldig();
    return {
      type: 'giv-slurke',
      fordeling: o.fordeling.map((f) => {
        const r = objekt(f);
        return { spillerId: tekst(r.spillerId, 64), antal: tal(r.antal) };
      })
    };
  },
  'fyld-taarn': (o) => ({ type: 'fyld-taarn', slurke: tal(o.slurke) }),
  'taarn-faerdig': () => ({ type: 'taarn-faerdig' }),
  'toem-taarn-faerdig': () => ({ type: 'toem-taarn-faerdig' }),
  'krone-kast': (o) => ({ type: 'krone-kast', x: tal(o.x), y: tal(o.y) }),
  'krone-resultat': (o) => ({ type: 'krone-resultat', ramte: sandhed(o.ramte) }),
  'krone-udpeg': (o) => ({ type: 'krone-udpeg', spillerId: tekst(o.spillerId, 64) }),
  'traek-kort': () => ({ type: 'traek-kort' }),
  'kort-kvitter': () => ({ type: 'kort-kvitter' }),
  'kaploeb-tryk': () => ({ type: 'kaploeb-tryk' }),
  'hoejere-lavere': (o) => ({ type: 'hoejere-lavere', gaet: enAf(o.gaet, ['hoejere', 'lavere'] as const) }),
  'laeg-finger': () => ({ type: 'laeg-finger' }),
  'finger-tryk': () => ({ type: 'finger-tryk' }),
  'vaelg-taber': (o) => ({ type: 'vaelg-taber', spillerId: tekst(o.spillerId, 64) }),
  'meier-vaelg': (o) => ({ type: 'meier-vaelg', spillerId: tekst(o.spillerId, 64) }),
  'meier-slaa': () => ({ type: 'meier-slaa' }),
  'meier-meld': (o) => ({ type: 'meier-meld', melding: tal(o.melding) }),
  'meier-blindt': () => ({ type: 'meier-blindt' }),
  'meier-tro': () => ({ type: 'meier-tro' }),
  'meier-loeft': () => ({ type: 'meier-loeft' }),
  'meld-afgang': () => ({ type: 'meld-afgang' }),
  'terning-paa-gulvet': () => ({ type: 'terning-paa-gulvet' }),
  'afstemning-start': (o) => ({
    type: 'afstemning-start', art: enAf(o.art, ['spring', 'smid'] as const), spillerId: tekst(o.spillerId, 64)
  }),
  'afstemning-stem': (o) => ({ type: 'afstemning-stem', id: tal(o.id), ja: sandhed(o.ja) })
};

/** Læs en handling fra nettet. Kaster RegelFejl hvis den ikke er en klienthandling. */
export function tolkHandling(raa: unknown): KlientHandling {
  const o = objekt(raa);
  const type = o.type;
  if (typeof type !== 'string' || !Object.hasOwn(TOLKE, type)) ugyldig();
  return TOLKE[type as KlientHandling['type']](o);
}
