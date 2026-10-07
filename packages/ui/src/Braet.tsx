import {
  FELTER, FELT_INFO, FINGER_POS, INDRE_STI, PIT, BORDET_GEO, YDRE_STI, BRAET_STR, taarnKapacitetSlurke, type FeltType
} from '@k69/rules';
import { useEffect, useState, type JSX } from 'react';

const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif";

const BLAEK = '#1B2733';
const BLAEK_DYB = '#0F1821';
const LYS = '#CED8E2';
const MELLEM = '#BCC6D0';
const KANT_LYS = '#9FB1C3';
const DAEMPET = '#33475B';
const ROED = '#A8423A';

export interface BrikPaaPladen {
  id: string;
  navn: string;
  farve: string;
  felt: number;
  pitPlads: number;
  erPaaTur?: boolean;
}

/**
 * Felterne i Plakat-stil. Typen står altid som tekst på feltet — farven er
 * aldrig det eneste signal. Felternes navne og regler kommer fra reglerne;
 * kun udseendet bor her.
 */
const FELT_STIL: Record<FeltType, { fyld: string; tekst: string; str: number }> = {
  fri: { fyld: '#DFE6ED', tekst: BLAEK, str: 12 },
  tre: { fyld: MELLEM, tekst: BLAEK, str: 13 },
  skaal: { fyld: LYS, tekst: BLAEK, str: 13.5 },
  bm: { fyld: BLAEK, tekst: LYS, str: 12 },
  gobm: { fyld: MELLEM, tekst: BLAEK, str: 11 },
  taarn: { fyld: KANT_LYS, tekst: BLAEK, str: 12 },
  kort: { fyld: LYS, tekst: BLAEK, str: 12 },
  drik: { fyld: BLAEK, tekst: '#FFFFFF', str: 15 },
  meier: { fyld: MELLEM, tekst: BLAEK, str: 13 },
  krone: { fyld: LYS, tekst: BLAEK, str: 12 }
};

/** Bane, filt, korn, øl og lampe — alt hvad brættet tegnes med. */
export function BraetDefs({ id }: { id: string }): JSX.Element {
  return (
    <defs>
      <radialGradient id={`${id}-felt`} cx="50%" cy="45%" r="70%">
        <stop offset="0%" stopColor="#95ABC1" />
        <stop offset="65%" stopColor="#8199B1" />
        <stop offset="100%" stopColor="#7791AC" />
      </radialGradient>
      <linearGradient id={`${id}-bane`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#DFE6ED" />
        <stop offset="100%" stopColor="#C3CFDB" />
      </linearGradient>
      <linearGradient id={`${id}-beer`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F2C060" />
        <stop offset="100%" stopColor="#C4761A" />
      </linearGradient>
      <linearGradient id={`${id}-beer-over`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E8A04A" />
        <stop offset="100%" stopColor="#A8561A" />
      </linearGradient>
      <radialGradient id={`${id}-lampe`} cx="50%" cy="48%" r="55%">
        <stop offset="0%" stopColor="#F2C060" stopOpacity="0.16" />
        <stop offset="70%" stopColor="#F2C060" stopOpacity="0" />
      </radialGradient>
      {/* Brikkens dybde: lys oppe til venstre, skygge forneden. */}
      <radialGradient id={`${id}-brikglans`} cx="40%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
      </radialGradient>
      {/* Kortbagsiden: små øldåser tone-i-tone, som man først ser når man kigger efter. */}
      <pattern id={`${id}-daaser`} width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill={BLAEK} />
        <g transform="scale(0.25)" fill="#213044" stroke="#2A3B51" strokeWidth="2" strokeLinejoin="round">
          <path transform="translate(7 5)" d="M1.5 2.5 Q1.5 0.5 3.5 0.5 H10.5 Q12.5 0.5 12.5 2.5 V18.5 Q12.5 20.5 10.5 20.5 H3.5 Q1.5 20.5 1.5 18.5 Z" />
          <path transform="translate(36 31) rotate(90 7 10)" d="M1.5 2.5 Q1.5 0.5 3.5 0.5 H10.5 Q12.5 0.5 12.5 2.5 V18.5 Q12.5 20.5 10.5 20.5 H3.5 Q1.5 20.5 1.5 18.5 Z" />
        </g>
      </pattern>
      <clipPath id={`${id}-indre`}>
        <path d={INDRE_STI} />
      </clipPath>
      <filter id={`${id}-skygge`} x="-10%" y="-10%" width="120%" height="130%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.09" />
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

/** Lampen over bordet. Den blå grund kommer fra fladen pladen ligger på. */
export function BraetBaggrund({ id, w, h }: { id: string; w: number; h: number }): JSX.Element {
  return <rect x="0" y="0" width={w} height={h} fill={`url(#${id}-lampe)`} />;
}

function Felt({ nr, klikbart, onKlik }: { nr: number; klikbart: boolean; onKlik?: (n: number) => void }): JSX.Element {
  const f = FELTER[nr - 1]!;
  const stil = FELT_STIL[f.type];
  const linjer = FELT_INFO[f.type].linjer;
  const linjeH = stil.str * 1.08;
  const dy0 = -((linjer.length - 1) * linjeH) / 2;

  return (
    <g
      className={klikbart ? 'felt-klikbart' : undefined}
      onClick={onKlik ? () => onKlik(nr) : undefined}
    >
      <polygon points={f.punkter} fill={stil.fyld} stroke={BLAEK} strokeWidth="1.6" />
      {f.type === 'fri' ? (
        <circle cx={f.cx} cy={f.cy} r="3.6" fill="#5F7D9B" />
      ) : (
        <text
          transform={`translate(${f.cx}, ${f.cy}) rotate(${f.vinkel})`}
          textAnchor="middle"
          dominantBaseline="central"
          fill={stil.tekst}
          fontSize={stil.str}
          letterSpacing="0.6"
          style={{ fontFamily: DISPLAY, textTransform: 'uppercase', pointerEvents: 'none' }}
        >
          {linjer.map((l, i) => (
            <tspan key={l} x="0" dy={i === 0 ? dy0 : linjeH}>
              {l.toUpperCase()}
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
        stroke={BLAEK}
        strokeWidth="2.4"
        strokeDasharray="7 6"
      />
      <path
        d={`M ${udX - 6} ${udY + 20} L ${udX + 5} ${udY + 15} L ${udX + 2} ${udY + 27}`}
        fill={BLAEK}
        stroke={BLAEK}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <text x={p0.x} y={p0.y - 14} fill={BLAEK} fontSize="16" letterSpacing="3" style={{ fontFamily: DISPLAY }}>
        PITTEN
      </text>
      <text
        x={p5.x + p5.w}
        y={p0.y - 14}
        textAnchor="end"
        fill={BLAEK}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.4"
        style={{ fontFamily: SANS }}
      >
        DU RYGER IND PÅ DEN PLADS DU SLÅR
      </text>

      {PIT.map((c) => {
        const sidste = c.plads === 1;
        return (
          <g key={c.plads}>
            <rect
              x={c.x + 2}
              y={c.y}
              width={c.w - 4}
              height={c.h}
              rx="4"
              fill={sidste ? BLAEK : LYS}
              stroke={BLAEK}
              strokeWidth="2.4"
            />
            <text
              x={c.cx}
              y={c.cy - 8}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sidste ? LYS : BLAEK}
              fontSize="28"
              style={{ fontFamily: DISPLAY }}
            >
              {c.plads}
            </text>
            <text
              x={c.cx}
              y={c.cy + 20}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sidste ? LYS : BLAEK}
              fontSize="9"
              fontWeight="700"
              letterSpacing="1.2"
              style={{ fontFamily: SANS }}
            >
              {c.plads} SHOTS
            </text>
            {c.plads > 1 && (
              <path
                d={`M ${c.x + 1} ${c.cy - 5} L ${c.x - 4} ${c.cy} L ${c.x + 1} ${c.cy + 5}`}
                fill="none"
                stroke={BLAEK}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      <text x={p0.x} y={p0.y + p0.h + 22} fill={BLAEK} fontSize="11" fontWeight="700" letterSpacing="1.4" style={{ fontFamily: SANS }}>
        UD PÅ FELT 1
      </text>
      <text
        x={p5.x + p5.w}
        y={p0.y + p0.h + 38}
        textAnchor="end"
        fill={BLAEK}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.4"
        style={{ fontFamily: SANS }}
      >
        SLÅ DIG NED MOD 1 — SLÅR DU OVER, ER DU UDE
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ bordet */

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]]
};

/** Terningen på bordet — 100×100 om (0,0), skaleres af kalderen. */
export interface TerningPaaBordet {
  vaerdi: number | null;
  /** Sandt i de to sekunder terningen tumler hen over bordet. */
  ruller: boolean;
  /** Farven på den der slog — ringen om terningen når den er landet. */
  farve: string | null;
  tekst: string;
}

function Terningflade({ vaerdi, blank }: { vaerdi: number | null; blank: boolean }): JSX.Element {
  const pips = vaerdi ? PIPS[vaerdi] : undefined;
  return (
    <g>
      {blank || !pips ? (
        <>
          <rect x="4" y="4" width="88" height="88" rx="16" fill={LYS} stroke={BLAEK} strokeWidth="3" strokeDasharray="8 6" />
          <text x="48" y="50" textAnchor="middle" dominantBaseline="central" fontSize="38" fill={KANT_LYS} style={{ fontFamily: DISPLAY }}>?</text>
        </>
      ) : (
        <>
          <rect x="9" y="11" width="88" height="88" rx="16" fill={BLAEK_DYB} />
          <rect x="4" y="4" width="88" height="88" rx="16" fill="#FFFFFF" stroke={BLAEK} strokeWidth="4" />
          {pips.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx - 2} cy={cy - 2} r="8" fill={BLAEK} />)}
        </>
      )}
    </g>
  );
}

/**
 * Mens terningen ruller, skifter øjnene hver 90 ms — det er dét der får den til
 * at se ud som om den tumler, sammen med CSS-animationen på gruppen udenom.
 */
function RullendeTerning({ t }: { t: TerningPaaBordet }): JSX.Element {
  const [flade, saetFlade] = useState(1);
  useEffect(() => {
    if (!t.ruller) return;
    const id = setInterval(() => saetFlade((f) => 1 + ((f + 2 + Math.floor(Math.random() * 4)) % 6)), 90);
    return () => clearInterval(id);
  }, [t.ruller]);

  if (t.ruller) {
    return (
      <g className="terning-ruller">
        <Terningflade vaerdi={flade} blank={false} />
      </g>
    );
  }
  return (
    <g>
      {t.vaerdi && t.farve && (
        <>
          <rect className="terning-landet" x="-6" y="-6" width="108" height="108" rx="22" fill="none" stroke={t.farve} strokeWidth="5" />
          <rect x="-8" y="-8" width="112" height="112" rx="23" fill="none" stroke={t.farve} strokeWidth="5" />
          <rect x="-10.5" y="-10.5" width="117" height="117" rx="25" fill="none" stroke={BLAEK} strokeWidth="2" />
        </>
      )}
      <Terningflade vaerdi={t.vaerdi} blank={!t.vaerdi} />
    </g>
  );
}

export interface KortPaaBordet {
  sidste: { rang: string; tegn: string; roed: boolean } | null;
  /** Nøgle der skifter hver gang der trækkes — så kortet vendes op på ny. */
  traek: number;
  tilbage: number;
}

function Kortbag({ id, x, y, rot }: { id: string; x: number; y: number; rot: number }): JSX.Element {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
      <rect x="0" y="0" width="34" height="48" rx="3" fill={BLAEK_DYB} transform="translate(2.5, 3)" />
      <rect x="0" y="0" width="34" height="48" rx="3" fill={`url(#${id}-daaser)`} stroke={BLAEK} strokeWidth="1.6" />
      <rect x="3.5" y="3.5" width="27" height="41" rx="2" fill="none" stroke="#5F7D9B" strokeWidth="0.9" />
      <circle cx="17" cy="24" r="8" fill={MELLEM} stroke="#5F7D9B" strokeWidth="0.9" />
    </g>
  );
}

function Kortforside({ x, y, kort }: { x: number; y: number; kort: NonNullable<KortPaaBordet['sidste']> }): JSX.Element {
  const farve = kort.roed ? ROED : BLAEK;
  return (
    // CSS-animationen sætter sin egen transform, så placeringen ligger på gruppen udenom.
    <g transform={`translate(${x}, ${y}) rotate(7)`}>
      <g className="kort-vendes">
        <rect x="0" y="0" width="34" height="48" rx="3" fill={BLAEK_DYB} transform="translate(2.5, 3)" />
        <rect x="0" y="0" width="34" height="48" rx="3" fill={LYS} stroke={BLAEK} strokeWidth="1.6" />
        <text x="4" y="11" fontSize="10" fill={farve} style={{ fontFamily: DISPLAY }}>{kort.rang}</text>
        <text x="4" y="19" fontSize="7" fill={farve} style={{ fontFamily: SANS }}>{kort.tegn}</text>
        <text x="17" y="31" textAnchor="middle" dominantBaseline="central" fontSize="16" fill={farve} style={{ fontFamily: SANS }}>{kort.tegn}</text>
      </g>
    </g>
  );
}

/**
 * Bordet midt på pladen: én bred plade der spænder over begge DRIK!-felter, med
 * kortene til venstre, tårnet i midten og terningen til højre. Så står DRIK! ud
 * for tårnet, og alt der sker på bordet, sker ét sted.
 */
function Bordet({
  id, andel, cl, kapCl, kort, terning
}: {
  id: string; andel: number; cl: number | null; kapCl: number;
  kort: KortPaaBordet | null; terning: TerningPaaBordet | null;
}): JSX.Element {
  const { x0, x1, y0, y1 } = BORDET_GEO;
  const w = x1 - x0, h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const zoneL = x0 + 100, zoneR = x1 - 100;

  const gW = 42, gH = 62, gx = cx - gW / 2, gTop = y0 + 14;
  const fyldH = Math.round(gH * Math.max(0, Math.min(1, andel)) * 10) / 10;
  const fy = Math.round((gTop + gH - fyldH) * 10) / 10;
  // Løber tårnet over, bliver øllet mørkere ravgult — aldrig rødt, aldrig blåt.
  // Samme luft over kanten som taarnAndel regner med.
  const kap = taarnKapacitetSlurke(kapCl);
  const over = andel > kap / (kap + 3);

  const kx = x0 + 22, ky = y0 + 22;
  const tx = (zoneR + x1) / 2 - 27, ty = y0 + 18;

  return (
    <g>
      <rect x={x0 + 4} y={y0 + 10} width={w} height={h} rx="18" fill={BLAEK_DYB} opacity="0.35" filter={`url(#${id}-skygge)`} />
      <rect x={x0} y={y0} width={w} height={h} rx="18" fill={`url(#${id}-bane)`} stroke={BLAEK} strokeWidth="3" />
      <line x1={zoneL} y1={y0 + 16} x2={zoneL} y2={y1 - 16} stroke={BLAEK} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
      <line x1={zoneR} y1={y0 + 16} x2={zoneR} y2={y1 - 16} stroke={BLAEK} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />

      {/* Kortene */}
      <Kortbag id={id} x={kx + 3} y={ky + 3} rot={-3} />
      <Kortbag id={id} x={kx + 1.5} y={ky + 1.5} rot={-1.5} />
      <Kortbag id={id} x={kx} y={ky} rot={0} />
      {kort?.sidste && <Kortforside key={kort.traek} x={kx + 44} y={ky + 2} kort={kort.sidste} />}
      <text x={(x0 + zoneL) / 2} y={y1 - 18} textAnchor="middle" fill={BLAEK} fontSize="11" letterSpacing="2" style={{ fontFamily: DISPLAY }}>
        KORTENE
      </text>
      {kort && (
        <text x={(x0 + zoneL) / 2} y={y1 - 7} textAnchor="middle" fill={DAEMPET} fontSize="8" fontWeight="700" letterSpacing="1.2" style={{ fontFamily: SANS }}>
          {kort.tilbage} TILBAGE
        </text>
      )}

      {/* Tårnet */}
      <rect x={gx} y={gTop} width={gW} height={gH} rx="5" fill="#E6ECF1" />
      <rect x={gx + 2} y={fy} width={gW - 4} height={fyldH} rx="3" fill={`url(#${id}-${over ? 'beer-over' : 'beer'})`} />
      {fyldH > 1 && <rect x={gx + 2} y={fy - 5} width={gW - 4} height="6" rx="3" fill="#F6EBD4" />}
      <rect x={gx} y={gTop} width={gW} height={gH} rx="5" fill="none" stroke={BLAEK} strokeWidth="2.5" />
      <text x={cx} y={y1 - 18} textAnchor="middle" fill={BLAEK} fontSize="12" letterSpacing="2.4" style={{ fontFamily: DISPLAY }}>
        TÅRNET
      </text>
      {cl !== null && (
        <text x={cx} y={y1 - 7} textAnchor="middle" fill={DAEMPET} fontSize="8" fontWeight="700" letterSpacing="1.2" style={{ fontFamily: SANS }}>
          {cl} CL · {kapCl} CL GLAS
        </text>
      )}

      {/* Terningen */}
      <g transform={`translate(${tx}, ${ty}) scale(0.54)`}>
        <RullendeTerning t={terning ?? { vaerdi: null, ruller: false, farve: null, tekst: '' }} />
      </g>
      <text x={(zoneR + x1) / 2} y={y1 - 18} textAnchor="middle" fill={BLAEK} fontSize="11" letterSpacing="2" style={{ fontFamily: DISPLAY }}>
        TERNINGEN
      </text>
      {terning && (
        <text x={(zoneR + x1) / 2} y={y1 - 7} textAnchor="middle" fill={DAEMPET} fontSize="8" fontWeight="700" letterSpacing="1.2" style={{ fontFamily: SANS }}>
          {terning.tekst}
        </text>
      )}
    </g>
  );
}

/**
 * Fingeren på bordkanten, som alle skal nå at trykke på. Ligger nede i pladens
 * højre hjørne så den er fri af felter, pit og bordplade — og samme sted hver gang.
 */
export interface FingerPaaBordet {
  /** Dem der har nået det, i rækkefølge. */
  ramte: Array<{ id: string; navn: string; farve: string }>;
  /** Dem der mangler. */
  mangler: Array<{ id: string; navn: string; farve: string }>;
  /** Sat når man selv kan trykke — ellers tegnes den bare. */
  onTryk?: () => void;
}

/** Stregtegnet hånd med pegefingeren mod kanten, 24-grid. Tegnes direkte i SVG'et. */
function FingerIkon({ farve = LYS }: { farve?: string }): JSX.Element {
  return (
    <g transform="translate(-13, -13) scale(1.0833)" fill="none" stroke={farve} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.2v9.3" />
      <path d="M10 3.2a1.6 1.6 0 0 1 3.2 0V11" />
      <path d="M13.2 8.6a1.6 1.6 0 0 1 3.2 0v3" />
      <path d="M16.4 10.2a1.6 1.6 0 0 1 3.2 0v4.6c0 3.4-2.5 6.2-6 6.2h-2.4c-1.7 0-3.2-.7-4.3-1.9L3.6 15a1.5 1.5 0 0 1 2.1-2.1L8 15" />
    </g>
  );
}

function Finger({ f }: { f: FingerPaaBordet }): JSX.Element {
  const alle = [...f.ramte.map((s) => ({ ...s, med: true })), ...f.mangler.map((s) => ({ ...s, med: false }))];
  const bx = -((alle.length - 1) * 24) / 2;
  return (
    <g transform={`translate(${FINGER_POS.x}, ${FINGER_POS.y})`}>
      <g
        className={f.onTryk ? 'finger finger-klikbar' : 'finger'}
        onClick={f.onTryk}
        role={f.onTryk ? 'button' : undefined}
        aria-label={f.onTryk ? 'Fingeren på bordkanten — tryk når du ser den' : undefined}
      >
        {/* Ringen pulser stille, så den kan opdages — uden at råbe. */}
        <circle className="finger-ring" cx="0" cy="0" r="26" fill="none" stroke={BLAEK} strokeWidth="2.5" />
        {/* Trykfladen er større end det man ser. */}
        <circle cx="0" cy="0" r="34" fill="transparent" />
        <circle cx="3" cy="4" r="22" fill={BLAEK_DYB} />
        <circle cx="0" cy="0" r="22" fill={BLAEK} stroke={LYS} strokeWidth="2" />
        <FingerIkon />
      </g>
      <g transform={`translate(${bx}, -46)`} style={{ pointerEvents: 'none' }}>
        {alle.map((s, i) => (
          <g key={s.id} transform={`translate(${i * 24}, 0)`} opacity={s.med ? 1 : 0.3}>
            <circle cx="0" cy="0" r="10" fill={s.farve} stroke={BLAEK} strokeWidth="2" />
            <text x="0" y="0.5" textAnchor="middle" dominantBaseline="central" fontSize="10" fill={BLAEK} style={{ fontFamily: DISPLAY }}>
              {s.navn.slice(0, 1).toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

/** 7'eren på hånden: hvem har den, og hvilken kulør. */
export interface KortHos {
  spillerId: string;
  tegn: string;
  roed: boolean;
}

/** Det lille 7-kort ved brikken, så hele bordet kan se hvem der har den på hånden. */
function SyverVedBrik({ kort }: { kort: KortHos }): JSX.Element {
  const farve = kort.roed ? ROED : BLAEK;
  return (
    <g transform="translate(9, -30) rotate(12) scale(0.5)" style={{ pointerEvents: 'none' }}>
      <rect x="0" y="0" width="34" height="48" rx="3" fill={BLAEK_DYB} transform="translate(2.5, 3)" />
      <rect x="0" y="0" width="34" height="48" rx="3" fill={LYS} stroke={BLAEK} strokeWidth="2" />
      <text x="4" y="11" fontSize="10" fill={farve} style={{ fontFamily: DISPLAY }}>7</text>
      <text x="4" y="19" fontSize="7" fill={farve} style={{ fontFamily: SANS }}>{kort.tegn}</text>
      <text x="17" y="31" textAnchor="middle" dominantBaseline="central" fontSize="16" fill={farve} style={{ fontFamily: SANS }}>{kort.tegn}</text>
    </g>
  );
}

/** Så længe glider brikken hen til sit nye felt. Råbet over pladen venter på den. */
export const BRIK_RYKKER_MS = 950;

export interface BraetProps {
  id: string;
  brikker: BrikPaaPladen[];
  aktivtFelt?: number | null;
  taarnAndel: number;
  /** Tårnets indhold i cl — udelades i pynteudgaven (forsiden). */
  taarnCl?: number | null;
  taarnKapCl?: number;
  kort?: KortPaaBordet | null;
  terning?: TerningPaaBordet | null;
  onFeltKlik?: (nr: number) => void;
  fremhaevFelter?: number[];
  /** Fingeren på bordkanten, når den ligger der. */
  finger?: FingerPaaBordet | null;
  /** 7'eren på hånden, hvis nogen har den. */
  kortHos?: KortHos | null;
}

/** Selve pladen — uden svg-ramme, så hver klient selv styrer træk og zoom. */
export function BraetPlade({
  id,
  brikker,
  aktivtFelt,
  taarnAndel,
  taarnCl = null,
  taarnKapCl = 50,
  kort = null,
  terning = null,
  onFeltKlik,
  fremhaevFelter,
  finger = null,
  kortHos = null
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
      <path d={YDRE_STI} fill={BLAEK_DYB} opacity="0.45" transform="translate(4, 14)" filter={`url(#${id}-skygge)`} />
      <path d={YDRE_STI} fill={`url(#${id}-bane)`} stroke={BLAEK} strokeWidth="3" />
      <path d={INDRE_STI} fill={`url(#${id}-felt)`} stroke={BLAEK} strokeWidth="3" />

      <g>
        {FELTER.map((f) => (
          <Felt key={f.nr} nr={f.nr} klikbart={Boolean(onFeltKlik)} onKlik={onFeltKlik} />
        ))}
      </g>

      {/* Filt-kornet ligger kun på filten indeni. */}
      <rect x="0" y="0" width={BRAET_STR.w} height={BRAET_STR.h} fill="#FFFFFF" filter={`url(#${id}-grain)`} clipPath={`url(#${id}-indre)`} style={{ pointerEvents: 'none' }} />

      <Pit />
      <Bordet id={id} andel={taarnAndel} cl={taarnCl} kapCl={taarnKapCl} kort={kort} terning={terning} />

      {fremhaevFelter?.map((nr) => {
        const f = FELTER[nr - 1];
        if (!f) return null;
        return (
          <polygon
            key={nr}
            points={f.punkter}
            fill="none"
            stroke={BLAEK}
            strokeWidth="3"
            strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {aktiv && (
        <>
          <polygon
            points={aktiv.punkter}
            fill="none"
            stroke="#F2C060"
            strokeWidth="5"
            opacity="0.8"
            filter={`url(#${id}-glow)`}
            style={{ pointerEvents: 'none' }}
          />
          <polygon
            points={aktiv.punkter}
            fill="none"
            stroke={BLAEK}
            strokeWidth="3.5"
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}

      {placeret.map((b) => (
        <g
          key={b.id}
          transform={`translate(${b.x}, ${b.y})`}
          style={{ transition: `transform ${BRIK_RYKKER_MS}ms cubic-bezier(0.33, 1.08, 0.45, 1)` }}
        >
          {b.erPaaTur ? (
            <>
              <circle cx="0" cy="0" r="24" fill="#F2C060" opacity="0.55" filter={`url(#${id}-glow)`} />
              <circle cx="0" cy="0" r="22" fill={BLAEK} />
              <circle cx="0" cy="0" r="20" fill={LYS} />
            </>
          ) : (
            <circle cx="1" cy="3" r="17" fill={BLAEK_DYB} opacity="0.35" />
          )}
          <circle cx="0" cy="0" r="15" fill={b.farve} />
          <circle cx="0" cy="0" r="15" fill={`url(#${id}-brikglans)`} stroke={BLAEK} strokeWidth="2.5" />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="15"
            fill={BLAEK}
            style={{ fontFamily: DISPLAY, pointerEvents: 'none' }}
          >
            {b.navn.slice(0, 1).toUpperCase()}
          </text>
          {kortHos && b.id === kortHos.spillerId && <SyverVedBrik kort={kortHos} />}
        </g>
      ))}

      {finger && <Finger f={finger} />}
    </g>
  );
}

export { BRAET_STR };
