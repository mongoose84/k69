/**
 * Meyer-stigen. Trin 0 er det laveste (32), øverste trin er Meyer (2–1).
 * Rækkefølgen følger reglerne: almindelige slag, så par, så lillemeyer, så Meyer.
 */
const ALMINDELIGE = [32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65];
const PAR = [11, 22, 33, 44, 55, 66];

export const STIGE: number[] = [...ALMINDELIGE, ...PAR, 31, 21];
export const MEYER_TRIN = STIGE.length - 1;
export const LILLEMEYER_TRIN = STIGE.length - 2;

/** To terninger → koden hvor den største altid står forrest. */
export function kode(a: number, b: number): number {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return hi * 10 + lo;
}

/** To terninger → trin i stigen. */
export function trin(a: number, b: number): number {
  const i = STIGE.indexOf(kode(a, b));
  return i === -1 ? 0 : i;
}

export function trinNavn(t: number): string {
  const k = STIGE[t];
  if (k === undefined) return '—';
  if (k === 21) return 'Meyer';
  if (k === 31) return 'Lillemeyer';
  if (k % 11 === 0) return `Par ${Math.floor(k / 10)}`;
  return String(k);
}

export function erMeyer(t: number): boolean {
  return t === MEYER_TRIN;
}

/** Alle trin fra og med `fra` — det man må melde når man skal overbyde. */
export function muligeMeldinger(fra: number): number[] {
  const start = Math.max(0, fra);
  return Array.from({ length: STIGE.length - start }, (_, i) => start + i);
}
