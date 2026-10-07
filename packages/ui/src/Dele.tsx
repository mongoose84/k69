import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import {
  DRIKKE, DRIK_STOERRELSER, EGEN_DRIK, formatSlurke, slurkePrEnhed, type DrikId, type DrikInfo, type DrikValg
} from '@k69/rules';

/** Det man skriver ind når man drikker noget andet end de faste. Tal som tekst, indtil de sendes. */
export interface EgenDrik {
  navn: string;
  enhedCl: number;
  procent: number;
}

export const tomEgenDrik: EgenDrik = { navn: '', enhedCl: 0, procent: 0 };

export function egenDrikKlar(d: EgenDrik): boolean {
  return d.navn.trim().length > 0
    && d.enhedCl >= EGEN_DRIK.clMin && d.enhedCl <= EGEN_DRIK.clMax
    && d.procent >= EGEN_DRIK.procentMin && d.procent <= EGEN_DRIK.procentMax;
}

function tilTal(tekst: string): number {
  const v = Number(tekst.replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

/** Tre frie felter: navn, størrelse i cl og alkoholprocent. */
export function EgenDrikFelter({
  vaerdi, onSkift
}: { vaerdi: EgenDrik; onSkift: (v: EgenDrik) => void }): JSX.Element {
  return (
    <div className="egen-drik">
      <label>
        <span className="eyebrow">Navn</span>
        <input
          type="text"
          value={vaerdi.navn}
          maxLength={EGEN_DRIK.navnMax}
          placeholder="Fx Classic"
          onChange={(e) => onSkift({ ...vaerdi, navn: e.target.value })}
        />
      </label>
      <label>
        <span className="eyebrow">Størrelse</span>
        <span className="egen-drik-enhed">
          <input
            type="text"
            inputMode="decimal"
            placeholder="33"
            defaultValue={vaerdi.enhedCl || ''}
            onChange={(e) => onSkift({ ...vaerdi, enhedCl: tilTal(e.target.value) })}
          />
          <b>cl</b>
        </span>
      </label>
      <label>
        <span className="eyebrow">Procent</span>
        <span className="egen-drik-enhed">
          <input
            type="text"
            inputMode="decimal"
            placeholder="4,6"
            defaultValue={vaerdi.procent || ''}
            onChange={(e) => onSkift({ ...vaerdi, procent: tilTal(e.target.value) })}
          />
          <b>%</b>
        </span>
      </label>
    </div>
  );
}

/**
 * Størrelsen på en af de faste drikke — en 44 cl pilsner har flere slurke
 * end en 33 cl, så hver knap viser hvor mange man får.
 */
export function StoerrelseValg({
  drik, valgt, onVaelg
}: { drik: DrikInfo; valgt: number; onVaelg: (cl: number) => void }): JSX.Element | null {
  if (drik.id === 'egen') return null;
  const muligheder = [...DRIK_STOERRELSER[drik.id]].sort((a, b) => a - b);
  return (
    <div className="stoerrelser" role="radiogroup" aria-label={`Størrelse på din ${drik.navn.toLowerCase()}`}>
      {muligheder.map((cl) => (
        <button
          key={cl}
          role="radio"
          aria-checked={valgt === cl}
          className={valgt === cl ? 'stoerrelse stoerrelse-paa' : 'stoerrelse'}
          onClick={() => onVaelg(cl)}
        >
          <b>{cl} cl</b>
          <span>{formatSlurke(slurkePrEnhed({ ...drik, enhedCl: cl }))}</span>
        </button>
      ))}
    </div>
  );
}

/** Valget der sendes til serveren: bare id'et når det er standardstørrelsen. */
export function fastDrikValg(id: Exclude<DrikId, 'egen'>, cl: number): DrikValg {
  return cl === DRIKKE[id].enhedCl ? id : { id, enhedCl: cl };
}

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]]
};

export function Terning({ vaerdi, str = 76, ruller = false }: { vaerdi: number | null; str?: number; ruller?: boolean }): JSX.Element {
  const pips = PIPS[vaerdi ?? 0];
  return (
    <svg
      width={str}
      height={str}
      viewBox="0 0 100 100"
      style={{ flex: `0 0 ${str}px`, transition: 'transform 260ms', transform: ruller ? 'rotate(-14deg)' : 'none' }}
      aria-label={vaerdi ? `Terningen viser ${vaerdi}` : 'Terningen er ikke slået'}
    >
      <rect x="8" y="10" width="86" height="86" rx="16" fill="#0F1821" />
      <rect x="4" y="4" width="86" height="86" rx="16" fill="#FFFFFF" stroke="#1B2733" strokeWidth="4" />
      {pips
        ? pips.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx - 3} cy={cy - 3} r="8" fill="#1B2733" />)
        : (
          <text x="47" y="49" textAnchor="middle" dominantBaseline="central" fontSize="38" fill="#9FB1C3" style={{ fontFamily: 'var(--display)' }}>
            ?
          </text>
        )}
    </svg>
  );
}

/** Lodret ølglas som måler. `andel` er 0–1. Løber det over, bliver øllet mørkere ravgult. */
export function Glas({
  andel, bredde = 46, hoejde = 74, over = false
}: { andel: number; bredde?: number; hoejde?: number; over?: boolean }): JSX.Element {
  const pct = Math.max(0, Math.min(1, andel)) * 100;
  const lille = bredde < 30;
  return (
    <div
      style={{
        width: bredde,
        height: hoejde,
        flex: `0 0 ${bredde}px`,
        border: `${lille ? 2 : 2.5}px solid #1B2733`,
        borderRadius: lille ? '1px 1px 4px 4px' : '3px 3px 8px 8px',
        background: '#E6ECF1',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct}%`,
          background: over ? 'var(--oel-over)' : 'var(--oel)',
          transition: 'height 160ms linear'
        }}
      />
      {pct > 1 && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: lille ? 4 : 6,
            background: 'var(--skum)', transition: 'bottom 160ms linear'
          }}
        />
      )}
    </div>
  );
}

/**
 * Knappen man holder nede for at hælde i tårnet. Den kalder `onTik` så længe
 * fingeren er på, og `onSlip` når den forlades — klienten sender selv videre.
 */
export function HoldKnap({
  tekst,
  under,
  andel,
  onTik,
  onSlip,
  interval = 110,
  hoejde = 68,
  deaktiveret = false
}: {
  tekst: string;
  under: string;
  andel: number;
  onTik: () => void;
  onSlip: () => void;
  interval?: number;
  hoejde?: number;
  deaktiveret?: boolean;
}): JSX.Element {
  const [holder, saetHolder] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tikRef = useRef(onTik);
  tikRef.current = onTik;

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      saetHolder(false);
      onSlip();
    }
  }, [onSlip]);

  const start = useCallback(() => {
    if (deaktiveret || timer.current) return;
    saetHolder(true);
    tikRef.current();
    timer.current = setInterval(() => tikRef.current(), interval);
  }, [deaktiveret, interval]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={deaktiveret}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') start(); }}
      onKeyUp={stop}
      style={{
        position: 'relative',
        height: hoejde,
        borderRadius: 3,
        border: '2px solid #1B2733',
        overflow: 'hidden',
        background: '#1B2733',
        cursor: deaktiveret ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: deaktiveret ? 0.5 : 1
      }}
    >
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Math.max(0, Math.min(1, andel)) * 100}%`,
          background: 'var(--oel)',
          transition: 'width 140ms linear'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.05em', lineHeight: 1.1,
            textTransform: 'uppercase', color: holder ? '#0F1821' : '#CED8E2'
          }}
        >
          {tekst}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: holder ? '#0F1821' : '#BCC6D0' }}>{under}</div>
      </div>
    </div>
  );
}

/** Brikken: spillerens farve med blæk-kant og dybde. `paaTur` giver ringe og lampeglød. */
export function Brik({
  navn, farve, str = 34, paaTur = false
}: { navn: string; farve: string; str?: number; paaTur?: boolean }): JSX.Element {
  return (
    <div
      style={{
        width: str, height: str, flex: `0 0 ${str}px`, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontSize: str * 0.46, color: '#1B2733',
        background: farve,
        border: `${str < 24 ? 2 : 2.5}px solid #1B2733`,
        boxShadow: paaTur ? 'var(--brik-tur)' : 'var(--brik-skygge)'
      }}
    >
      {navn.slice(0, 1).toUpperCase()}
    </div>
  );
}

/**
 * Mærkaten ved et navn. Fyldt blæk for status (BM, VÆRT), kun med kant for
 * info (DIG, PIT, ALTID). Farverne følger fladen den står på.
 */
export function Maerkat({ children, fyldt = false }: { children: ReactNode; fyldt?: boolean }): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
        borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap',
        color: fyldt ? 'var(--ink-mod)' : 'var(--ink)',
        border: '1.5px solid var(--ink)',
        background: fyldt ? 'var(--ink)' : 'transparent'
      }}
    >
      {children}
    </span>
  );
}

const MAALER_STREGER = 11;

/**
 * Slurke-måler: 11 streger for den enhed man er i gang med, fyldt i forhold til
 * hvor meget der er tilbage. For en pilsner er én streg præcis én slurk.
 */
export function Slurkemaaler({ tilbage, ialt, bredde = 12 }: { tilbage: number; ialt: number; bredde?: number }): JSX.Element {
  const fyldte = ialt > 0 ? Math.ceil((tilbage / ialt) * MAALER_STREGER - 1e-9) : 0;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: MAALER_STREGER }, (_, i) => (
        <div
          key={i}
          style={{
            width: bredde, height: 7, borderRadius: 1,
            background: i < fyldte ? 'var(--oel)' : 'rgba(27, 39, 51, 0.18)'
          }}
        />
      ))}
    </div>
  );
}

export function Kortbillede({
  rang, tegn, roed, bredde = 108
}: { rang: string; tegn: string; roed: boolean; bredde?: number }): JSX.Element {
  const farve = roed ? '#A8423A' : '#1B2733';
  return (
    <div
      style={{
        width: bredde, height: bredde * 1.43, flex: `0 0 ${bredde}px`, borderRadius: Math.round(bredde * 0.06),
        padding: bredde * 0.083, background: '#CED8E2',
        border: '3px solid #1B2733', boxShadow: `${Math.round(bredde * 0.04)}px ${Math.round(bredde * 0.05)}px 0 #0F1821`,
        display: 'flex', flexDirection: 'column', color: farve
      }}
    >
      <div style={{ lineHeight: 0.95, fontFamily: 'var(--display)' }}>
        <div style={{ fontSize: bredde * 0.22 }}>{rang}</div>
        <div style={{ fontSize: bredde * 0.15 }}>{tegn}</div>
      </div>
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: bredde * 0.46 }}>
        {tegn}
      </div>
    </div>
  );
}
