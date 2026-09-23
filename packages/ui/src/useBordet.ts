import { useEffect, useRef, useState } from 'react';
import { KULOER_TEGN, type Handling, type Spil } from '@k69/rules';
import type { FingerPaaBordet, KortHos, KortPaaBordet, TerningPaaBordet } from './Braet.js';
import { erRoedt, venterPaaSlag } from './tekst.js';

/** Så længe tumler terningen hen over bordet før man ser hvad der blev slået. */
export const TERNING_RULLER_MS = 2000;

/**
 * Holder skærmen tilbage mens terningen ruller. Kommer der et nyt slag fra
 * serveren, viser vi det gamle spil i to sekunder — brikken står stille, og
 * handlingskortet skifter ikke — og først når terningen er landet, springer alt
 * til det nye. Kommer der flere opdateringer imens, samles de op til sidst.
 */
export function useForsinketSpil<T extends Spil>(spil: T): { vist: T; ruller: boolean } {
  const sidsteNr = useRef(spil.terningNr);
  const frosset = useRef<T | null>(null);
  const sidstVist = useRef(spil);
  const [ruller, saetRuller] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fryses under selve renderingen, så det nye spil aldrig når at blinke frem.
  if (spil.terningNr !== sidsteNr.current) {
    sidsteNr.current = spil.terningNr;
    if (!frosset.current) frosset.current = sidstVist.current;
  }

  useEffect(() => {
    if (!frosset.current || timer.current) return;
    saetRuller(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      frosset.current = null;
      saetRuller(false);
    }, TERNING_RULLER_MS);
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const vist = frosset.current ?? spil;
  sidstVist.current = vist;
  return { vist, ruller };
}

function navnPaa(spil: Spil, id: string | null): string {
  return spil.spillere.find((s) => s.id === id)?.navn.toUpperCase() ?? 'NOGEN';
}

/**
 * Terningen som den skal stå på bordet lige nu. `live` er det nyeste spil — det
 * er dér slaget ligger mens der rulles. Det sidste slag bliver liggende, med
 * ringen i slagerens farve, indtil den næste slår.
 */
export function terningPaaBordet(vist: Spil, live: Spil, ruller: boolean): TerningPaaBordet {
  const farve = vist.spillere.find((s) => s.id === (ruller ? live.terningAf : vist.terningAf))?.farve ?? null;
  if (ruller) return { vaerdi: null, ruller: true, farve, tekst: `${navnPaa(live, live.terningAf)} SLÅR` };
  if (venterPaaSlag(vist) && !vist.terning) {
    const paa = vist.afventer && 'spillerId' in vist.afventer ? vist.afventer.spillerId : null;
    return { vaerdi: null, ruller: false, farve: null, tekst: `${navnPaa(vist, paa)} ER PÅ` };
  }
  return {
    vaerdi: vist.terning,
    ruller: false,
    farve,
    tekst: vist.terning ? `${navnPaa(vist, vist.terningAf)} SLOG ${vist.terning}` : ''
  };
}

export function kortPaaBordet(spil: Spil & { bunkeTilbage?: number }): KortPaaBordet {
  const k = spil.sidsteKort;
  return {
    sidste: k ? { rang: k.rang, tegn: KULOER_TEGN[k.kuloer], roed: erRoedt(k) } : null,
    traek: spil.brugte.length,
    tilbage: spil.bunkeTilbage ?? spil.bunke.length
  };
}

/** Fingeren på bordkanten som pladen skal tegne den — med trykket, hvis man ikke selv har nået det. */
export function fingerPaaBordet(spil: Spil, migId: string, send: (h: Handling) => void): FingerPaaBordet | null {
  const f = spil.finger;
  if (!f) return null;
  const aktive = spil.spillere.filter((s) => s.tilstand === 'aktiv');
  const kort = (s: { id: string; navn: string; farve: string }) => ({ id: s.id, navn: s.navn, farve: s.farve });
  const ramte = f.ramte.map((id) => aktive.find((s) => s.id === id)).filter((s) => s !== undefined).map(kort);
  const mangler = aktive.filter((s) => !f.ramte.includes(s.id)).map(kort);
  const kanTrykke = aktive.some((s) => s.id === migId) && !f.ramte.includes(migId);
  return { ramte, mangler, onTryk: kanTrykke ? () => send({ type: 'finger-tryk' }) : undefined };
}

/** 7'eren på hånden, som pladen skal tegne den ved brikken. */
export function kortHos(spil: Spil): KortHos | null {
  const s = spil.syver;
  if (!s) return null;
  return { spillerId: s.holderId, tegn: KULOER_TEGN[s.kort.kuloer], roed: erRoedt(s.kort) };
}
