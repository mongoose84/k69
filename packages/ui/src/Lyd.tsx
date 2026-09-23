import { useEffect, useRef, useSyncExternalStore, type JSX } from 'react';
import type { FeltType, Spil } from '@k69/rules';
import { BRIK_RYKKER_MS } from './Braet.js';
import { TERNING_RULLER_MS } from './useBordet.js';

/*
 * Lydene er syntetiseret med Web Audio — ingen lydfiler at hente eller pakke.
 * Browseren tillader først lyd efter en berøring, så konteksten låses op ved
 * det første tryk på siden.
 */

const NOEGLE = 'k69:lyd';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stoejBuffer: AudioBuffer | null = null;

function lydTilladt(): boolean {
  try {
    return localStorage.getItem(NOEGLE) !== 'fra';
  } catch {
    return true;
  }
}

let taendt = lydTilladt();
const lyttere = new Set<() => void>();

export function saetLyd(til: boolean): void {
  taendt = til;
  try {
    localStorage.setItem(NOEGLE, til ? 'til' : 'fra');
  } catch { /* privat browsing */ }
  for (const l of lyttere) l();
  if (til) laasOp();
}

function abonner(l: () => void): () => void {
  lyttere.add(l);
  return () => lyttere.delete(l);
}

function laasOp(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    const komp = ctx.createDynamicsCompressor();
    komp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(komp);
    stoejBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = stoejBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

if (typeof window !== 'undefined') {
  const foersteTryk = (): void => {
    laasOp();
    if (ctx?.state === 'running') {
      window.removeEventListener('pointerdown', foersteTryk);
      window.removeEventListener('keydown', foersteTryk);
    }
  };
  window.addEventListener('pointerdown', foersteTryk);
  window.addEventListener('keydown', foersteTryk);
}

/** Konteksten og starttidspunktet, hvis der må spilles lyd lige nu. */
function klar(forsinkelse = 0): { a: AudioContext; ud: GainNode; t: number } | null {
  if (!taendt || !ctx || !master || ctx.state !== 'running') return null;
  return { a: ctx, ud: master, t: ctx.currentTime + forsinkelse / 1000 };
}

interface ToneValg {
  type?: OscillatorType;
  styrke?: number;
  glid?: number;
  anslag?: number;
  vibrato?: number;
}

function tone(a: AudioContext, ud: AudioNode, t: number, freq: number, varighed: number, v: ToneValg = {}): void {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = v.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (v.glid) osc.frequency.exponentialRampToValueAtTime(v.glid, t + varighed);
  if (v.vibrato) {
    const lfo = a.createOscillator();
    const dybde = a.createGain();
    lfo.frequency.value = 6;
    dybde.gain.value = v.vibrato;
    lfo.connect(dybde).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + varighed + 0.05);
  }
  const anslag = v.anslag ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v.styrke ?? 0.3, t + anslag);
  g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  osc.connect(g).connect(ud);
  osc.start(t);
  osc.stop(t + varighed + 0.05);
}

function stoej(
  a: AudioContext, ud: AudioNode, t: number, varighed: number,
  filter: { type: BiquadFilterType; freq: number; til?: number; q?: number }, styrke = 0.3
): void {
  if (!stoejBuffer) return;
  const kilde = a.createBufferSource();
  kilde.buffer = stoejBuffer;
  kilde.loop = true;
  const f = a.createBiquadFilter();
  f.type = filter.type;
  f.frequency.setValueAtTime(filter.freq, t);
  if (filter.til) f.frequency.exponentialRampToValueAtTime(filter.til, t + varighed);
  f.Q.value = filter.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(styrke, t + Math.min(0.01, varighed / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  kilde.connect(f).connect(g).connect(ud);
  kilde.start(t, Math.random() * 0.5);
  kilde.stop(t + varighed + 0.05);
}

/** Terningen der tumler hen over bordet og lander. */
function terningRuller(): void {
  const k = klar();
  if (!k) return;
  const { a, ud, t } = k;
  const slut = (TERNING_RULLER_MS - 150) / 1000;
  let s = 0;
  let mellemrum = 0.045;
  while (s < slut) {
    stoej(a, ud, t + s, 0.03, { type: 'bandpass', freq: 1800 + Math.random() * 2200, q: 4 }, 0.18 + Math.random() * 0.12);
    s += mellemrum + Math.random() * 0.03;
    mellemrum *= 1.09;
  }
  // Landingen: et dumpt bump og et klik.
  tone(a, ud, t + slut, 140, 0.18, { styrke: 0.45, glid: 60 });
  stoej(a, ud, t + slut, 0.05, { type: 'bandpass', freq: 2600, q: 3 }, 0.3);
}

function kortVendes(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  stoej(k.a, k.ud, k.t, 0.16, { type: 'bandpass', freq: 1400, til: 5200, q: 1.2 }, 0.28);
  stoej(k.a, k.ud, k.t + 0.13, 0.04, { type: 'highpass', freq: 3000 }, 0.2);
}

/** To glas der mødes — SKÅL. */
function skaal(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  for (const [d, grund] of [[0, 2350], [0.16, 2600]] as const) {
    for (const [faktor, styrke] of [[1, 0.2], [2.76, 0.08], [5.4, 0.04]] as const) {
      tone(k.a, k.ud, k.t + d, grund * faktor, 1.2, { styrke, anslag: 0.002 });
    }
  }
}

/** Slurke: et par bobler der stiger op. */
function glug(forsinkelse = 0, antal = 3): void {
  const k = klar(forsinkelse);
  if (!k) return;
  for (let i = 0; i < antal; i++) {
    const t = k.t + i * 0.14;
    tone(k.a, k.ud, t, 180 + i * 25, 0.11, { styrke: 0.35, glid: 520 + i * 60, anslag: 0.01 });
  }
}

function fanfare(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  const noder: Array<[number, number, number]> = [[0, 392, 0.14], [0.15, 523, 0.14], [0.3, 659, 0.14], [0.45, 784, 0.55]];
  for (const [d, f, v] of noder) {
    tone(k.a, k.ud, k.t + d, f, v, { type: 'sawtooth', styrke: 0.09, anslag: 0.02 });
    tone(k.a, k.ud, k.t + d, f * 1.005, v, { type: 'square', styrke: 0.04, anslag: 0.02 });
  }
}

function vundet(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    tone(k.a, k.ud, k.t + i * 0.08, f, 0.5, { type: 'triangle', styrke: 0.22 });
  });
  skaal(forsinkelse + 450);
}

/** Den triste basun. */
function tabt(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  const noder: Array<[number, number, number]> = [[0, 311, 0.3], [0.32, 294, 0.3], [0.64, 277, 0.3], [0.96, 262, 0.9]];
  for (const [d, f, v] of noder) {
    tone(k.a, k.ud, k.t + d, f, v, { type: 'sawtooth', styrke: 0.12, anslag: 0.04, vibrato: d > 0.9 ? 6 : 0, ...(d > 0.9 ? { glid: 240 } : {}) });
  }
}

function haeldes(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  stoej(k.a, k.ud, k.t, 1.1, { type: 'bandpass', freq: 350, til: 1100, q: 2 }, 0.3);
  glug(forsinkelse + 150, 4);
}

function moent(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  tone(k.a, k.ud, k.t, 1976, 0.7, { styrke: 0.2, anslag: 0.002 });
  tone(k.a, k.ud, k.t, 2960, 0.5, { styrke: 0.1, anslag: 0.002 });
  tone(k.a, k.ud, k.t + 0.09, 2637, 0.8, { styrke: 0.16, anslag: 0.002 });
}

function klokke(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  tone(k.a, k.ud, k.t, 880, 0.5, { type: 'triangle', styrke: 0.18 });
  tone(k.a, k.ud, k.t + 0.1, 1320, 0.6, { type: 'triangle', styrke: 0.14 });
}

/** Bægeret der rystes. */
function baeger(forsinkelse = 0): void {
  const k = klar(forsinkelse);
  if (!k) return;
  for (let i = 0; i < 7; i++) {
    stoej(k.a, k.ud, k.t + i * 0.07, 0.06, { type: 'bandpass', freq: 900 + Math.random() * 700, q: 3 }, 0.25);
  }
  tone(k.a, k.ud, k.t + 0.52, 110, 0.14, { styrke: 0.4, glid: 55 });
}

/** Bægeret skubbes over bordet. */
function skub(): void {
  const k = klar();
  if (!k) return;
  stoej(k.a, k.ud, k.t, 0.35, { type: 'lowpass', freq: 900, til: 400 }, 0.22);
}

/** Alle skal trykke — nu! */
function alarm(): void {
  const k = klar();
  if (!k) return;
  for (let i = 0; i < 4; i++) {
    tone(k.a, k.ud, k.t + i * 0.12, i % 2 ? 1175 : 880, 0.09, { type: 'square', styrke: 0.1 });
  }
}

function dinTur(): void {
  const k = klar();
  if (!k) return;
  tone(k.a, k.ud, k.t, 659, 0.35, { styrke: 0.2 });
  tone(k.a, k.ud, k.t + 0.12, 988, 0.5, { styrke: 0.18 });
}

function feltLyd(art: FeltType | 'giv', forsinkelse: number): void {
  switch (art) {
    case 'skaal': return skaal(forsinkelse);
    case 'bm':
    case 'gobm': return fanfare(forsinkelse);
    case 'taarn': return haeldes(forsinkelse);
    case 'krone': return moent(forsinkelse);
    case 'meier': return baeger(forsinkelse);
    case 'tre':
    case 'drik':
    case 'giv': return glug(forsinkelse);
    case 'kort':
    case 'fri': return klokke(forsinkelse);
  }
}

function hvisTur(spil: Spil): string | null {
  const a = spil.afventer;
  if (!a || !('spillerId' in a)) return null;
  return a.slags === 'slag' || a.slags === 'pit-slag' ? a.spillerId : null;
}

/**
 * Lyt til spillet og spil lyd når der sker noget. Terningen høres på det
 * levende spil, så raslen følger animationen; alt andet på det viste spil, så
 * det lyder i det øjeblik det kommer frem på skærmen.
 */
export function useLyde(live: Spil, vist: Spil, migId: string): void {
  const forrigeLive = useRef(live);
  const forrige = useRef(vist);

  useEffect(() => {
    const f = forrigeLive.current;
    forrigeLive.current = live;
    if (live.terningNr !== f.terningNr) terningRuller();
  }, [live]);

  useEffect(() => {
    const f = forrige.current;
    forrige.current = vist;
    if (f === vist) return;

    const u = vist.udraab;
    if (u && u.id !== f.udraab?.id) feltLyd(u.art, u.art === 'giv' ? 0 : BRIK_RYKKER_MS);

    if (vist.brugte.length > f.brugte.length) kortVendes();

    const fj = vist.fejring;
    if (fj && fj.id !== f.fejring?.id) (fj.vinderId ? vundet : tabt)();

    const mr = vist.meierResultat;
    if (mr && mr.id !== f.meierResultat?.id) {
      baeger();
      (mr.vinderId === migId || mr.taberId !== migId ? vundet : tabt)(700);
    }

    const m = vist.meier;
    const fm = f.meier;
    if (m && fm && m.historik.length > fm.historik.length) {
      if (m.historik[0]?.melding) skub();
      else baeger();
    }

    const kaploebNu = vist.afventer?.slags === 'kaploeb';
    const kaploebFoer = f.afventer?.slags === 'kaploeb';
    if ((vist.finger && !f.finger) || (kaploebNu && !kaploebFoer)) alarm();

    if (vist.taarn.slurke > f.taarn.slurke && !(u && u.id !== f.udraab?.id && u.art === 'taarn')) haeldes();

    if (hvisTur(vist) === migId && hvisTur(f) !== migId) dinTur();
  }, [vist, migId]);
}

/** Lyd til og fra. Valget huskes på enheden. */
export function LydKnap({ className }: { className?: string }): JSX.Element {
  const til = useSyncExternalStore(abonner, () => taendt, () => true);
  return (
    <button
      type="button"
      className={`lyd-knap${til ? '' : ' lyd-fra'}${className ? ` ${className}` : ''}`}
      onClick={() => saetLyd(!til)}
      aria-pressed={til}
      aria-label={til ? 'Slå lyden fra' : 'Slå lyden til'}
      title={til ? 'Slå lyden fra' : 'Slå lyden til'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {til ? (
          <>
            <path d="M16.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 6a8.5 8.5 0 0 1 0 12" />
          </>
        ) : (
          <path d="M17 9l5 6M22 9l-5 6" />
        )}
      </svg>
    </button>
  );
}
