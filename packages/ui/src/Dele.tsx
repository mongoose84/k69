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
      <rect x="6" y="9" width="88" height="88" rx="17" fill="#0B100D" opacity="0.55" />
      <rect x="4" y="4" width="88" height="88" rx="17" fill="#EFE6D4" stroke="#8E8878" strokeWidth="1.5" />
      {pips
        ? pips.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="7.5" fill="#1B241C" />)
        : (
          <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="34" fill="#B3AB98" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
            ?
          </text>
        )}
    </svg>
  );
}

/** Lodret ølglas som måler. `andel` er 0–1. */
export function Glas({ andel, bredde = 46, hoejde = 74 }: { andel: number; bredde?: number; hoejde?: number }): JSX.Element {
  const pct = Math.max(0, Math.min(1, andel)) * 100;
  return (
    <div
      style={{
        width: bredde,
        height: hoejde,
        flex: `0 0 ${bredde}px`,
        border: '1.5px solid #9FB0A2',
        borderRadius: 4,
        background: '#0E1512',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct}%`,
          background: 'linear-gradient(180deg, #F2C060, #C4761A)',
          transition: 'height 160ms linear'
        }}
      />
      {pct > 1 && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: 7,
            background: '#F6EBD4', transition: 'bottom 160ms linear'
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
        border: '1px solid #7E6413',
        overflow: 'hidden',
        background: '#1D2118',
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
          background: 'linear-gradient(180deg, #F2C060 0%, #C4761A 100%)',
          transition: 'width 140ms linear'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: holder ? '#14180C' : 'var(--ink)'
          }}
        >
          {tekst}
        </div>
        <div style={{ fontSize: 11, color: holder ? '#14180C' : 'var(--ink-dim)' }}>{under}</div>
      </div>
    </div>
  );
}

export function Brik({ navn, farve, str = 34 }: { navn: string; farve: string; str?: number }): JSX.Element {
  return (
    <div
      style={{
        width: str, height: str, flex: `0 0 ${str}px`, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: str * 0.44, fontWeight: 700, color: '#14180C',
        background: farve,
        boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5)'
      }}
    >
      {navn.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function Maerkat({ children, farve = 'var(--brass-lt)' }: { children: ReactNode; farve?: string }): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px',
        borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: farve, border: `1px solid ${farve}55`, background: `${farve}1a`
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
            background: i < fyldte ? 'linear-gradient(180deg, #F2C060, #C4761A)' : '#2B382E'
          }}
        />
      ))}
    </div>
  );
}

export function Kortbillede({
  rang, tegn, roed, bredde = 108
}: { rang: string; tegn: string; roed: boolean; bredde?: number }): JSX.Element {
  const farve = roed ? '#9E3B33' : '#1B241C';
  return (
    <div
      style={{
        width: bredde, height: bredde * 1.43, flex: `0 0 ${bredde}px`, borderRadius: 8,
        padding: bredde * 0.083, background: 'linear-gradient(168deg, #F6F1E4 0%, #E4DCC8 100%)',
        border: '1px solid #B9AE93', boxShadow: '0 14px 26px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', color: farve
      }}
    >
      <div style={{ lineHeight: 0.95 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: bredde * 0.21, fontWeight: 700 }}>{rang}</div>
        <div style={{ fontSize: bredde * 0.14 }}>{tegn}</div>
      </div>
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: bredde * 0.46 }}>
        {tegn}
      </div>
    </div>
  );
}
