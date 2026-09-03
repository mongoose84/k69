import { FELTER, FELT_INFO, INDRE_STI, PIT, TAARN_GEO, YDRE_STI, BRAET_STR } from '@k69/rules';
import type { JSX } from 'react';

const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Bodoni Moda', Georgia, 'Times New Roman', serif";

export interface BrikPaaPladen {
  id: string;
  navn: string;
  farve: string;
  felt: number;
  pitPlads: number;
  erPaaTur?: boolean;
}

/** Filt, messing, øl og glød — alt hvad brættet tegnes med. */
export function BraetDefs({ id }: { id: string }): JSX.Element {
  return (
    <defs>
      <radialGradient id={`${id}-felt`} cx="50%" cy="42%" r="72%">
        <stop offset="0%" stopColor="#25352B" />
        <stop offset="60%" stopColor="#1A2620" />
        <stop offset="100%" stopColor="#111A15" />
      </radialGradient>
      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E8CE7E" />
        <stop offset="45%" stopColor="#C9A227" />
        <stop offset="100%" stopColor="#8C6F16" />
      </linearGradient>
      <linearGradient id={`${id}-beer`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F2C060" />
        <stop offset="100%" stopColor="#C4761A" />
      </linearGradient>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.06" />
        </feComponentTransfer>
      </filter>
      <filter id={`${id}-glow`} x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur stdDeviation="7" result="g" />
        <feMerge>
          <feMergeNode in="g" />
          <feMergeNode in="g" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function BraetBaggrund({ id, w, h }: { id: string; w: number; h: number }): JSX.Element {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} fill={`url(#${id}-felt)`} />
      <rect x="0" y="0" width={w} height={h} fill="#ffffff" filter={`url(#${id}-grain)`} opacity="0.5" />
    </>
  );
}

function Felt({ nr, klikbart, onKlik }: { nr: number; klikbart: boolean; onKlik?: (n: number) => void }): JSX.Element {
  const f = FELTER[nr - 1]!;
  const info = FELT_INFO[f.type];
  const linjer = info.linjer;
  const dy0 = -((linjer.length - 1) * info.str * 1.14) / 2;

  return (
    <g
      className={klikbart ? 'felt-klikbart' : undefined}
      onClick={onKlik ? () => onKlik(nr) : undefined}
    >
      <polygon points={f.punkter} fill={info.fyld} stroke="#4C5C50" strokeWidth="1" />
      {f.type === 'fri' ? (
        <circle cx={f.cx} cy={f.cy} r="3.2" fill="#5E6E5F" />
      ) : (
        <text
          transform={`translate(${f.cx}, ${f.cy}) rotate(${f.vinkel})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill={info.farve}
          fontSize={info.str}
          fontWeight={info.vaegt}
          letterSpacing="0.4"
          style={{ fontFamily: SANS, pointerEvents: 'none' }}
        >
          {linjer.map((l, i) => (
            <tspan key={l} x="0" dy={i === 0 ? dy0 : info.str * 1.14}>
              {l}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

/**
 * Pitten. Man ryger ind på den plads man slår, arbejder sig ned mod 1, og
 * forlader den ud på felt 1 — derfor peger pilene og den stiplede vej mod
 * venstre og op på brættet igen.
 */
function Pit(): JSX.Element {
  const p0 = PIT[0]!;
  const p5 = PIT[5]!;
  const f1 = FELTER[0]!;
  const ud = f1.indre[4]!;
  const udX = Math.round(ud[0] * 10) / 10;
  const udY = Math.round(ud[1] * 10) / 10;

  return (
    <g>
      <path
        d={`M ${p0.x - 8} ${p0.cy} C ${p0.x - 70} ${p0.cy + 6} ${udX + 34} ${udY + 44} ${udX + 5} ${udY + 15}`}
        fill="none"
        stroke="#C9A227"
        strokeWidth="1.8"
        strokeDasharray="6 5"
        opacity="0.9"
      />
      <path
        d={`M ${udX - 6} ${udY + 20} L ${udX + 5} ${udY + 15} L ${udX + 2} ${udY + 27}`}
        fill="#C9A227"
        stroke="#C9A227"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <text x={p0.x} y={p0.y - 14} fill="#8A9A8B" fontSize="11.5" letterSpacing="3.6" style={{ fontFamily: SANS }}>
        PITTEN
      </text>
      <text
        x={p5.x + p5.w}
        y={p0.y - 14}
        textAnchor="end"
        fill="#6B796D"
        fontSize="9.5"
        letterSpacing="1.6"
        style={{ fontFamily: SANS }}
      >
        DU RYGER IND PÅ DEN PLADS DU SLÅR
      </text>

      {PIT.map((c) => {
        const sidste = c.plads === 1;
        return (
          <g key={c.plads}>
            <rect
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={sidste ? '#26301F' : '#1D2A23'}
              stroke={sidste ? '#8A722C' : '#4C5C50'}
              strokeWidth={sidste ? 1.6 : 1}
            />
            <text
              x={c.cx}
              y={c.cy - 9}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#D3B44E"
              fontSize="22"
              style={{ fontFamily: SERIF }}
            >
              {c.plads}
            </text>
            <text
              x={c.cx}
              y={c.cy + 16}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#8A9A8B"
              fontSize="8.5"
              letterSpacing="1.1"
              style={{ fontFamily: SANS }}
            >
              {c.plads} SHOTS
            </text>
            {c.plads > 1 && (
              <path
                d={`M ${c.x - 4} ${c.cy - 5} L ${c.x - 10} ${c.cy} L ${c.x - 4} ${c.cy + 5}`}
                fill="none"
                stroke="#5C6C5F"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      <text x={p0.x} y={p0.y + p0.h + 20} fill="#C9A227" fontSize="9.5" letterSpacing="1.5" style={{ fontFamily: SANS }}>
        UD PÅ FELT 1
      </text>
      <text
        x={p5.x + p5.w}
        y={p0.y + p0.h + 20}
        textAnchor="end"
        fill="#6B796D"
        fontSize="9.5"
        letterSpacing="1.5"
        style={{ fontFamily: SANS }}
      >
        SLÅ DIG NED MOD 1 — SLÅR DU OVER, ER DU UDE
      </text>
    </g>
  );
}

function Taarn({ id, andel }: { id: string; andel: number }): JSX.Element {
  const { cx, cy, r } = TAARN_GEO;
  const gW = 42;
  const gH = 62;
  const gx = cx - gW / 2;
  const gTop = cy - 33;
  const fyldH = Math.round(gH * Math.max(0, Math.min(1, andel)) * 10) / 10;
  const fy = Math.round((gTop + gH - fyldH) * 10) / 10;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 9} fill="#0D1410" opacity="0.8" />
      <circle cx={cx} cy={cy} r={r} fill="#18231D" stroke={`url(#${id}-brass)`} strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r - 7} fill="none" stroke="#C9A227" strokeWidth="0.6" opacity="0.4" />
      <rect x={gx} y={gTop} width={gW} height={gH} rx="4" fill="#0E1512" />
      <rect x={gx + 2} y={fy} width={gW - 4} height={fyldH} rx="3" fill={`url(#${id}-beer)`} />
      {fyldH > 1 && <rect x={gx + 2} y={fy - 6} width={gW - 4} height="7" rx="3" fill="#F6EBD4" />}
      <rect x={gx} y={gTop} width={gW} height={gH} rx="4" fill="none" stroke="#C4D3C6" strokeWidth="1.4" />
      <text
        x={cx}
        y={cy + 45}
        textAnchor="middle"
        fill="#D3B44E"
        fontSize="10.5"
        letterSpacing="3.4"
        style={{ fontFamily: SANS }}
      >
        TÅRNET
      </text>
    </g>
  );
}

export interface BraetProps {
  id: string;
  brikker: BrikPaaPladen[];
  aktivtFelt?: number | null;
  taarnAndel: number;
  onFeltKlik?: (nr: number) => void;
  fremhaevFelter?: number[];
}

/** Selve pladen — uden svg-ramme, så hver klient selv styrer træk og zoom. */
export function BraetPlade({
  id,
  brikker,
  aktivtFelt,
  taarnAndel,
  onFeltKlik,
  fremhaevFelter
}: BraetProps): JSX.Element {
  const aktiv = aktivtFelt ? FELTER[aktivtFelt - 1] : null;

  // Flere brikker på samme felt skal ikke ligge oveni hinanden.
  const talt = new Map<string, number>();
  const placeret = brikker.map((b) => {
    const iPit = b.pitPlads > 0;
    const plads = iPit ? PIT[b.pitPlads - 1] : null;
    const felt = !iPit && b.felt > 0 ? FELTER[b.felt - 1] : null;
    const grund = plads
      ? { x: plads.cx, y: plads.cy - 4 }
      : felt
        ? { x: felt.cx, y: felt.cy }
        : { x: BRAET_STR.w / 2, y: BRAET_STR.h / 2 };
    const noegle = iPit ? `p${b.pitPlads}` : `f${b.felt}`;
    const n = talt.get(noegle) ?? 0;
    talt.set(noegle, n + 1);
    return {
      ...b,
      x: grund.x + (n % 2) * 16 - (n > 0 ? 8 : 0),
      y: grund.y + Math.floor(n / 2) * 16
    };
  });

  return (
    <g>
      <path d={YDRE_STI} fill="#0C120E" opacity="0.6" transform="translate(0, 8)" />
      <path d={YDRE_STI} fill="#16211B" stroke="#3E4E42" strokeWidth="1.5" />
      <path d={INDRE_STI} fill={`url(#${id}-felt)`} stroke="#3E4E42" strokeWidth="1.5" />

      <g>
        {FELTER.map((f) => (
          <Felt key={f.nr} nr={f.nr} klikbart={Boolean(onFeltKlik)} onKlik={onFeltKlik} />
        ))}
      </g>

      <Pit />
      <Taarn id={id} andel={taarnAndel} />

      {fremhaevFelter?.map((nr) => {
        const f = FELTER[nr - 1];
        if (!f) return null;
        return (
          <polygon
            key={nr}
            points={f.punkter}
            fill="none"
            stroke="#93AE7C"
            strokeWidth="2.5"
            opacity="0.85"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {aktiv && (
        <polygon
          points={aktiv.punkter}
          fill="none"
          stroke="#C9A227"
          strokeWidth="3.5"
          filter={`url(#${id}-glow)`}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {placeret.map((b) => (
        <g
          key={b.id}
          transform={`translate(${b.x}, ${b.y})`}
          style={{ transition: 'transform 480ms cubic-bezier(0.33, 1.08, 0.45, 1)' }}
        >
          <circle cx="0" cy="3" r="17" fill="#0B100D" opacity="0.55" />
          {b.erPaaTur && <circle cx="0" cy="0" r="22" fill="none" stroke="#C9A227" strokeWidth="2" opacity="0.75" />}
          <circle cx="0" cy="0" r="16" fill={b.farve} stroke="#0E1512" strokeWidth="2" />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontWeight="700"
            fill="#14180C"
            style={{ fontFamily: SERIF, pointerEvents: 'none' }}
          >
            {b.navn.slice(0, 1).toUpperCase()}
          </text>
        </g>
      ))}
    </g>
  );
}

export { BRAET_STR };
