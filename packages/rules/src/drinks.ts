import type { DrikId } from './types.js';

/**
 * Slurken er spillets fælles enhed. Én enhed = 11 slurke uanset hvad man
 * drikker — kun mængden bag en slurk skifter.
 *
 *  Pilsner 4,6%: reglerne regner selv med 11 shots à 3 cl i én øl (33 cl).
 *  Vin 12%:      11 slurke pr. glas, 5 glas på en flaske (15 cl).
 *  Whisky 40%:   4 cl pr. dram — husreglen, kan ændres her ét sted.
 */
export const SLURKE_PR_ENHED = 11;

export interface DrikInfo {
  id: DrikId;
  navn: string;
  styrke: string;
  /** Mængden i én enhed, i cl. */
  enhedCl: number;
}

export const DRIKKE: Record<DrikId, DrikInfo> = {
  ol: { id: 'ol', navn: 'Pilsner', styrke: '4,6%', enhedCl: 33 },
  vin: { id: 'vin', navn: 'Vin', styrke: '12%', enhedCl: 15 },
  whisky: { id: 'whisky', navn: 'Whisky', styrke: '40%', enhedCl: 4 }
};

export const DRIK_LISTE = Object.values(DRIKKE);

export function clPrSlurk(drik: DrikId): number {
  return DRIKKE[drik].enhedCl / SLURKE_PR_ENHED;
}

/** Hvad N slurke svarer til i den drik man selv har valgt. */
export function iCl(slurke: number, drik: DrikId): number {
  const v = slurke * clPrSlurk(drik);
  return v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
}

export function formatCl(slurke: number, drik: DrikId): string {
  return `${String(iCl(slurke, drik)).replace('.', ',')} cl`;
}

export function formatSlurke(slurke: number): string {
  const v = Math.round(slurke * 10) / 10;
  return (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ',')) + ' slurke';
}
