import { RegelFejl, type DrikId, type DrikInfo, type DrikValg } from './types.js';

/**
 * Slurken er spillets fælles enhed, og den er en fast mængde alkohol: det der er
 * i 3 cl pilsner på 4,6% — reglerne regner selv med 11 shots à 3 cl i én øl.
 * Det er 1/11 genstand, ca. 0,14 cl ren alkohol. Hvor mange slurke der er i en
 * drik, afhænger derfor af både størrelsen og procenten:
 *
 *  Pilsner 33 cl 4,6%: 11 slurke à 3 cl.
 *  Pilsner 50 cl 4,6%: 16,7 slurke à 3 cl.
 *  Vin 15 cl 12%:      13 slurke à 1,15 cl.
 *  Whisky 4 cl 40%:    11,6 slurke à 0,35 cl.
 *
 * Har man noget andet med, skriver man det selv ind ved bordet: navn, størrelse
 * og procent — så regnes slurkene ud på samme måde.
 */
const SLURK_CL_GANGE_PROCENT = 3 * 4.6;

export type { DrikInfo };

export const DRIKKE: Record<Exclude<DrikId, 'egen'>, DrikInfo> = {
  ol: { id: 'ol', navn: 'Pilsner', procent: 4.6, enhedCl: 33 },
  vin: { id: 'vin', navn: 'Vin', procent: 12, enhedCl: 15 },
  whisky: { id: 'whisky', navn: 'Whisky', procent: 40, enhedCl: 4 }
};

export const DRIK_LISTE = Object.values(DRIKKE);

/** De almindelige størrelser man kan vælge mellem for de faste drikke. Den første er standard. */
export const DRIK_STOERRELSER: Record<Exclude<DrikId, 'egen'>, number[]> = {
  ol: [33, 44, 50],
  vin: [15, 12, 20],
  whisky: [4, 2, 6]
};

/** Grænserne for det man selv skriver ind. */
export const EGEN_DRIK = { navnMax: 24, clMin: 1, clMax: 200, procentMin: 0.5, procentMax: 100 };

function kraevStoerrelse(v: number): number {
  const enhedCl = Math.round(Number(v) * 10) / 10;
  if (!Number.isFinite(enhedCl) || enhedCl < EGEN_DRIK.clMin || enhedCl > EGEN_DRIK.clMax) {
    throw new RegelFejl(`Størrelsen skal være mellem ${EGEN_DRIK.clMin} og ${EGEN_DRIK.clMax} cl.`);
  }
  return enhedCl;
}

/** Lav en drik ud fra valget ved tilmelding. Afviser det der ikke giver mening. */
export function tilDrik(valg: DrikValg): DrikInfo {
  if (typeof valg === 'string') {
    if (valg === 'egen' || !(valg in DRIKKE)) throw new RegelFejl('Vælg hvad du drikker.');
    return { ...DRIKKE[valg] };
  }
  if ('id' in valg) {
    // En af de faste i en anden størrelse — samme navn og procent, bare flere eller færre slurke.
    if (!(valg.id in DRIKKE)) throw new RegelFejl('Vælg hvad du drikker.');
    return { ...DRIKKE[valg.id], enhedCl: kraevStoerrelse(valg.enhedCl) };
  }
  const navn = String(valg.navn ?? '').trim().slice(0, EGEN_DRIK.navnMax);
  const enhedCl = kraevStoerrelse(valg.enhedCl);
  const procent = Math.round(Number(valg.procent) * 10) / 10;
  if (!navn) throw new RegelFejl('Skriv hvad din drik hedder.');
  if (!Number.isFinite(procent) || procent < EGEN_DRIK.procentMin || procent > EGEN_DRIK.procentMax) {
    throw new RegelFejl('Procenten skal være mellem 0,5 og 100.');
  }
  return { id: 'egen', navn, procent, enhedCl };
}

/** Hvor meget af drikken én slurk er — jo stærkere, jo mindre. */
export function clPrSlurk(drik: DrikInfo): number {
  return SLURK_CL_GANGE_PROCENT / drik.procent;
}

/** Hvor mange slurke der er i én enhed af drikken, på én decimal. */
export function slurkePrEnhed(drik: DrikInfo): number {
  return Math.round((drik.enhedCl / clPrSlurk(drik)) * 10) / 10;
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

/** Et antal slurke på én decimal, med komma: 11, 16,7. */
export function formatAntal(slurke: number): string {
  const v = Math.round(slurke * 10) / 10;
  return v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ',');
}

export function formatSlurke(slurke: number): string {
  return formatAntal(slurke) + ' slurke';
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
