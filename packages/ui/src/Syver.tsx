import { useEffect, useRef, useState, type JSX } from 'react';
import { KULOER_TEGN, type Handling, type Spil } from '@k69/rules';
import { erRoedt } from './tekst.js';

/** Så længe skal kortet holdes nede før fingeren lander. */
export const SYVER_HOLD_MS = 900;

/**
 * 7'eren på hånden: et lille kort oppe i baren, som kun holderen har. Man
 * holder det nede — så et tilfældigt tryk ikke afslører noget — og når ringen
 * er fuld, ligger fingeren på bordkanten. Ingen andre får besked.
 */
export function SyverKort({
  spil, migId, send, kompakt = false
}: {
  spil: Spil; migId: string; send: (h: Handling) => void; kompakt?: boolean;
}): JSX.Element | null {
  const syver = spil.syver;
  const min = syver?.holderId === migId && !spil.finger;
  const [andel, saetAndel] = useState(0);
  const start = useRef<number | null>(null);
  const ramme = useRef<number | null>(null);
  const sendt = useRef(false);

  const stop = (): void => {
    start.current = null;
    if (ramme.current) cancelAnimationFrame(ramme.current);
    ramme.current = null;
    saetAndel(0);
  };

  const tik = (): void => {
    if (start.current === null) return;
    const a = Math.min(1, (performance.now() - start.current) / SYVER_HOLD_MS);
    saetAndel(a);
    if (a >= 1) {
      if (!sendt.current) {
        sendt.current = true;
        send({ type: 'laeg-finger' });
      }
      stop();
      return;
    }
    ramme.current = requestAnimationFrame(tik);
  };

  const hold = (): void => {
    if (start.current !== null) return;
    sendt.current = false;
    start.current = performance.now();
    ramme.current = requestAnimationFrame(tik);
  };

  useEffect(() => () => {
    if (ramme.current) cancelAnimationFrame(ramme.current);
  }, []);

  if (!min || !syver) return null;

  const str = 44;
  const tegn = KULOER_TEGN[syver.kort.kuloer];
  const farve = erRoedt(syver.kort) ? '#9E3B33' : '#1B241C';
  return (
    <div
      className="syver"
      role="button"
      tabIndex={0}
      aria-label="Din 7'er — hold nede for at lægge fingeren på bordkanten"
      title="Hold nede for at lægge fingeren"
      onPointerDown={(e) => { e.preventDefault(); hold(); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') hold(); }}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="syver-ring" style={{ '--fyld': `${Math.round(andel * 100)}%` } as React.CSSProperties} />
      <svg width={str * 0.45} height={str * 0.64} viewBox="0 0 34 48" style={{ position: 'relative' }}>
        <rect x="0" y="0" width="34" height="48" rx="3" fill="#0B100D" opacity="0.55" transform="translate(1.5, 3)" />
        <rect x="0" y="0" width="34" height="48" rx="3" fill="#F3EDDF" stroke="#B9AE93" strokeWidth="0.8" />
        <text x="4" y="10" fontSize="9" fontWeight="700" fill={farve} style={{ fontFamily: 'var(--serif)' }}>7</text>
        <text x="4" y="18" fontSize="7" fill={farve} style={{ fontFamily: 'var(--sans)' }}>{tegn}</text>
        <text x="17" y="31" textAnchor="middle" dominantBaseline="central" fontSize="16" fill={farve} style={{ fontFamily: 'var(--sans)' }}>{tegn}</text>
      </svg>
      {!kompakt && (
        <span className="syver-tekst">
          <b>Din 7'er</b>
          {andel > 0 ? 'Hold…' : 'Hold nede for at lægge fingeren'}
        </span>
      )}
    </div>
  );
}
