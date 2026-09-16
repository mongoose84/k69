import { RegelFejl, type DrikId, type DrikInfo, type DrikValg } from './types.js';

/**
 * Slurken er spillets fælles enhed. Én enhed = 11 slurke uanset hvad man
 * drikker — kun mængden bag en slurk skifter.
 *
 *  Pilsner 4,6%: reglerne regner selv med 11 shots à 3 cl i én øl (33 cl).
 *  Vin 12%:      11 slurke pr. glas, 5 glas på en flaske (15 cl).
 *  Whisky 40%:   4 cl pr. dram — husreglen, kan ændres her ét sted.
 *
 * Har man noget andet med, skriver man det selv ind ved bordet: navn, størrelse
 * og procent. Procenten er kun til at kende drikken på — slurken er den samme.
 */
export const SLURKE_PR_ENHED = 11;

export type { DrikInfo };

export const DRIKKE: Record<Exclude<DrikId, 'egen'>, DrikInfo> = {
  ol: { id: 'ol', navn: 'Pilsner', procent: 4.6, enhedCl: 33 },
  vin: { id: 'vin', navn: 'Vin', procent: 12, enhedCl: 15 },
  whisky: { id: 'whisky', navn: 'Whisky', procent: 40, enhedCl: 4 }
};

export const DRIK_LISTE = Object.values(DRIKKE);

/** Grænserne for det man selv skriver ind. */
export const EGEN_DRIK = { navnMax: 24, clMin: 1, clMax: 200, procentMin: 0, procentMax: 100 };

/** Lav en drik ud fra valget ved tilmelding. Afviser det der ikke giver mening. */
export function tilDrik(valg: DrikValg): DrikInfo {
  if (typeof valg === 'string') {
    if (valg === 'egen' || !(valg in DRIKKE)) throw new RegelFejl('Vælg hvad du drikker.');
    return { ...DRIKKE[valg] };
  }
  const navn = String(valg.navn ?? '').trim().slice(0, EGEN_DRIK.navnMax);
  const enhedCl = Math.round(Number(valg.enhedCl) * 10) / 10;
  const procent = Math.round(Number(valg.procent) * 10) / 10;
  if (!navn) throw new RegelFejl('Skriv hvad din drik hedder.');
  if (!Number.isFinite(enhedCl) || enhedCl < EGEN_DRIK.clMin || enhedCl > EGEN_DRIK.clMax) {
    throw new RegelFejl(`Størrelsen skal være mellem ${EGEN_DRIK.clMin} og ${EGEN_DRIK.clMax} cl.`);
  }
  if (!Number.isFinite(procent) || procent < EGEN_DRIK.procentMin || procent > EGEN_DRIK.procentMax) {
    throw new RegelFejl('Procenten skal være mellem 0 og 100.');
  }
  return { id: 'egen', navn, procent, enhedCl };
}

export function clPrSlurk(drik: DrikInfo): number {
  return drik.enhedCl / SLURKE_PR_ENHED;
}

/** Hvad N slurke svarer til i den drik man selv har valgt. */
export function iCl(slurke: number, drik: DrikInfo): number {
  const v = slurke * clPrSlurk(drik);
  return v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
}

function tal(v: number): string {
  return String(v).replace('.', ',');
}

export function formatCl(slurke: number, drik: DrikInfo): string {
  return `${tal(iCl(slurke, drik))} cl`;
}

export function formatProcent(drik: DrikInfo): string {
  return `${tal(drik.procent)}%`;
}

export function formatSlurke(slurke: number): string {
  const v = Math.round(slurke * 10) / 10;
  return (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ',')) + ' slurke';
}

/**
 * Tårnet fyldes og tømmes i slurke, men glasset er fysisk: en halv liter.
 * Kapaciteten regnes i øl-mål, fordi det er øl der står i tårnet.
 */
export function taarnKapacitetSlurke(kapacitetCl: number): number {
  return kapacitetCl / clPrSlurk(DRIKKE.ol);
}

/** Tårnets størrelse i cl, som det står i reglerne. */
export function taarnCl(slurke: number): number {
  return iCl(slurke, DRIKKE.ol);
}
