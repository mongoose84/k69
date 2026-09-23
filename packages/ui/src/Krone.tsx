import { useEffect, useRef, useState, type JSX } from 'react';
import { type Handling, type Spil } from '@k69/rules';
import { taarnAndel } from './Handlinger.js';

/*
 * 2-kronen. Et kast set fra siden: man trækker baglæns fra mønten som en
 * slangebøsse, og den skal hoppe på bordet før den ryger i tårnet. Kraften er
 * afstemt så det rigtige kast ligger omkring 60–70 % — 80 % og derover
 * flyver altid over (ud af toppen eller forbi bordets ende).
 */

const W = 888;
const H = 400;
const TY = 330; // bordets overflade
const R = 9; // møntens radius
const G = 1500; // tyngde, px/s²
const GLAS_MIDT = 600;
const GLAS_B = 74;
const GL = GLAS_MIDT - GLAS_B / 2;
const GR = GLAS_MIDT + GLAS_B / 2;
const GT = TY - 120; // glassets kant
const MAX_TRAEK = 160;
const K = 13; // px/s pr. px man trækker
const START = { x: 110, y: TY - 80 };

type Fase = 'sigte' | 'traekker' | 'flyver' | 'synker' | 'ramte' | 'forbi' | 'ugyldig';
type Hvorfor = 'over' | 'ud' | 'stop' | null;

interface Punkt { x: number; y: number }

export interface KroneSim {
  fase: Fase;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  hop: number;
  hopMaerker: { x: number; n: number }[];
  t: number;
  hvorfor: Hvorfor;
}

export function nyKroneSim(): KroneSim {
  return { fase: 'sigte', x: START.x, y: START.y, vx: 0, vy: 0, spin: 0, hop: 0, hopMaerker: [], t: 0, hvorfor: null };
}

/** Kaster mønten med et træk (i scene-px, begrænset til MAX_TRAEK). */
export function kastKrone(s: KroneSim, traek: Punkt): void {
  s.vx = traek.x * K;
  s.vy = traek.y * K;
  s.fase = 'flyver';
  s.t = 0;
}

/** Ét fysiktrin. Ren funktion af tilstanden, så den kan afprøves uden skærm. */
export function kroneTrin(s: KroneSim, dt: number): void {
  s.t += dt;
  if (s.fase === 'synker') {
    s.x += (GLAS_MIDT - s.x) * Math.min(1, dt * 3);
    s.y += 55 * dt;
    s.spin += dt * 1.5;
    if (s.y >= TY - R - 6) {
      s.y = TY - R - 6;
      s.fase = s.hop > 0 ? 'ramte' : 'ugyldig';
    }
    return;
  }
  if (s.fase !== 'flyver') return;

  const paaBord = s.y >= TY - R - 0.5 && s.vy === 0;
  if (!paaBord) s.vy += G * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.spin += dt * (paaBord ? Math.abs(s.vx) / 9 : 6 + Math.abs(s.vx) / 70 + Math.abs(s.vy) / 90);

  // I tårnet
  if (s.x > GL && s.x < GR && s.y > GT) {
    s.fase = 'synker';
    s.vx = 0;
    s.vy = 0;
    return;
  }

  // Glassets ydersider
  if (s.y > GT && s.x <= GL && s.x > GL - R) { s.x = GL - R; if (s.vx > 0) s.vx = -s.vx * 0.45; }
  if (s.y > GT && s.x >= GR && s.x < GR + R) { s.x = GR + R; if (s.vx < 0) s.vx = -s.vx * 0.45; }

  // Kanten
  for (const [kx, ky] of [[GL, GT], [GR, GT]] as const) {
    const dx = s.x - kx;
    const dy = s.y - ky;
    const d = Math.hypot(dx, dy);
    if (d < R && d > 0) {
      const nx = dx / d;
      const ny = dy / d;
      s.x = kx + nx * R;
      s.y = ky + ny * R;
      const vn = s.vx * nx + s.vy * ny;
      if (vn < 0) { s.vx -= 1.45 * vn * nx; s.vy -= 1.45 * vn * ny; }
    }
  }

  // Bordet
  if (s.y + R > TY) {
    s.y = TY - R;
    if (s.vy > 0) {
      if (s.vy > 140) {
        s.hop++;
        if (s.hopMaerker.length < 3) s.hopMaerker.push({ x: s.x, n: s.hop });
      }
      s.vy = -s.vy * 0.62;
      s.vx *= 0.82;
      if (Math.abs(s.vy) < 70) s.vy = 0;
    }
  }
  if (paaBord) {
    s.vx *= 1 - 2.4 * dt;
    if (Math.abs(s.vx) < 12) { s.fase = 'forbi'; s.hvorfor = 'stop'; }
  }

  // For hårdt: ud over toppen eller forbi bordets ende
  if (s.y < -10 || s.x > W + 30) { s.fase = 'forbi'; s.hvorfor = 'over'; }
  else if (s.x < -30 || s.t > 7) { s.fase = 'forbi'; s.hvorfor = 'ud'; }
}

function begraens(ned: Punkt, nu: Punkt): Punkt & { l: number } {
  let x = ned.x - nu.x;
  let y = ned.y - nu.y;
  let l = Math.hypot(x, y);
  if (l > MAX_TRAEK) { x = x / l * MAX_TRAEK; y = y / l * MAX_TRAEK; l = MAX_TRAEK; }
  return { x, y, l };
}

/** Den første bue, indtil mønten rammer bordet. Resten er ens egen sag. */
function forudsig(fra: Punkt, p: Punkt): (Punkt & { o: number })[] {
  let { x, y } = fra;
  let vx = p.x * K;
  let vy = p.y * K;
  const dt = 1 / 60;
  const ud: Punkt[] = [];
  for (let i = 0; i < 90; i++) {
    vy += G * dt; x += vx * dt; y += vy * dt;
    if (y + R >= TY || x < 0 || x > W) break;
    if (y > GT && x + R > GL && x - R < GR) break;
    if (i % 3 === 2) ud.push({ x, y });
  }
  const n = Math.min(ud.length, 16);
  return ud.slice(0, n).map((q, j) => ({ ...q, o: 0.75 * (1 - j / (n + 2)) }));
}

function KroneKast({ fyld, onResultat }: { fyld: number; onResultat: (ramte: boolean) => void }): JSX.Element {
  const sim = useRef<KroneSim>(nyKroneSim());
  const spor = useRef<Punkt[]>([]);
  const traek = useRef<{ ned: Punkt; nu: Punkt } | null>(null);
  const raf = useRef<number | null>(null);
  const [, tegn] = useState(0);
  const [sendt, saetSendt] = useState(false);

  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  const tilScene = (e: React.PointerEvent<SVGSVGElement>): Punkt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };

  const loop = (): void => {
    let sidst: number | null = null;
    const f = (ts: number): void => {
      if (sidst === null) sidst = ts;
      const dt = Math.min(1 / 30, (ts - sidst) / 1000);
      sidst = ts;
      const s = sim.current;
      for (let i = 0; i < 6; i++) kroneTrin(s, dt / 6);
      spor.current.push({ x: s.x, y: s.y });
      if (spor.current.length > 9) spor.current.shift();
      if (s.fase === 'flyver' || s.fase === 'synker') raf.current = requestAnimationFrame(f);
      else { spor.current = []; raf.current = null; }
      tegn(ts);
    };
    raf.current = requestAnimationFrame(f);
  };

  const ned = (e: React.PointerEvent<SVGSVGElement>): void => {
    if (sim.current.fase !== 'sigte') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ældre browsere */ }
    const q = tilScene(e);
    traek.current = { ned: q, nu: q };
    sim.current.fase = 'traekker';
    tegn(performance.now());
  };
  const flyt = (e: React.PointerEvent<SVGSVGElement>): void => {
    if (sim.current.fase !== 'traekker' || !traek.current) return;
    traek.current.nu = tilScene(e);
    tegn(performance.now());
  };
  const op = (): void => {
    const s = sim.current;
    if (s.fase !== 'traekker' || !traek.current) return;
    const p = begraens(traek.current.ned, traek.current.nu);
    traek.current = null;
    if (p.l < 14) { s.fase = 'sigte'; tegn(performance.now()); return; }
    kastKrone(s, p);
    loop();
  };

  const s = sim.current;
  const p = s.fase === 'traekker' && traek.current ? begraens(traek.current.ned, traek.current.nu) : { x: 0, y: 0, l: 0 };
  const kraft = Math.round(p.l / MAX_TRAEK * 100);
  const oelTop = TY - 7 - (TY - GT - 22) * Math.max(0.05, Math.min(1, fyld));
  const mry = Math.max(1.6, R * Math.abs(Math.cos(s.spin)));
  const n = spor.current.length;
  const sigter = s.fase === 'sigte' || s.fase === 'traekker';
  const svar = (ramte: boolean): void => {
    if (sendt) return;
    saetSendt(true);
    onResultat(ramte);
  };

  return (
    <>
      <div className="krone-status">
        <span className="krone-chip">{sigter ? '1 forsøg tilbage' : '0 forsøg tilbage'}</span>
        <span className={s.hop > 0 ? 'krone-chip krone-chip-ramt' : 'krone-chip'}>
          {s.hop > 0 ? 'Bordet: ramt' : 'Bordet: ikke ramt'}
        </span>
      </div>

      <div className="krone-scene">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ cursor: s.fase === 'traekker' ? 'grabbing' : s.fase === 'sigte' ? 'grab' : 'default' }}
          onPointerDown={ned}
          onPointerMove={flyt}
          onPointerUp={op}
          onPointerCancel={op}
          role="img"
          aria-label="Kastebane: træk baglæns fra mønten og slip for at kaste 2-kronen mod tårnet"
        >
          <defs>
            <linearGradient id="krone-oel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F0B453" />
              <stop offset="1" stopColor="#B8741E" />
            </linearGradient>
            <radialGradient id="krone-mont" cx="0.38" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#F6E6A8" />
              <stop offset="0.55" stopColor="#DCC684" />
              <stop offset="1" stopColor="#9A7A18" />
            </radialGradient>
          </defs>

          <ellipse cx={GLAS_MIDT} cy={-40} rx={420} ry={220} fill="#E0A03C" opacity={0.05} />
          <rect x={0} y={TY} width={W} height={12} fill="#244C37" />
          <rect x={0} y={TY + 12} width={W} height={60} fill="#15241C" />
          <rect x={0} y={TY + 12} width={W} height={1.5} fill="#C9A227" opacity={0.55} />

          {s.hopMaerker.map((h) => (
            <g key={h.n}>
              <ellipse cx={h.x} cy={TY + 1} rx={15} ry={3.5} fill="none" stroke="#E8CE7E" strokeWidth={1.4} opacity={0.8} />
              <text x={h.x} y={TY + 30} fill="#E8CE7E" className="krone-svg-tekst" textAnchor="middle">{h.n}. HOP</text>
            </g>
          ))}

          <rect x={GL} y={GT} width={GLAS_B} height={TY - GT} fill="#C4D3C6" opacity={0.05} />

          {spor.current.map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y} r={3 + 5 * (i + 1) / n} fill="#DCC684" opacity={0.28 * (i + 1) / n} />
          ))}

          {s.fase === 'traekker' && p.l > 4 && (
            <>
              {forudsig(s, p).map((q, i) => (
                <circle key={i} cx={q.x} cy={q.y} r={2.4} fill="#EDE7DA" opacity={q.o} />
              ))}
              <line x1={s.x} y1={s.y} x2={s.x - p.x} y2={s.y - p.y} stroke="#97A398" strokeWidth={1.5} strokeDasharray="4 4" />
              <circle cx={s.x - p.x} cy={s.y - p.y} r={5} fill="none" stroke="#97A398" strokeWidth={1.5} />
            </>
          )}

          {s.fase === 'sigte' && (
            <>
              <circle cx={s.x} cy={s.y} r={24} fill="none" stroke="#E8CE7E" opacity={0.6} strokeWidth={1.2} strokeDasharray="3 5" />
              <text x={s.x} y={s.y - 34} fill="#97A398" className="krone-svg-tekst" textAnchor="middle">TRÆK HERFRA</text>
            </>
          )}

          <ellipse cx={s.x} cy={s.y} rx={R} ry={mry} fill="url(#krone-mont)" stroke="#9A7A18" strokeWidth={1} />

          <rect x={GL + 1} y={oelTop} width={GLAS_B - 2} height={TY - 7 - oelTop} fill="url(#krone-oel)" opacity={0.82} />
          <rect x={GL + 1} y={oelTop - 4} width={GLAS_B - 2} height={7} rx={2} fill="#F6EBD4" opacity={0.92} />
          <rect x={GL} y={TY - 7} width={GLAS_B} height={7} fill="#C4D3C6" opacity={0.22} />
          <line x1={GL} y1={GT} x2={GL} y2={TY} stroke="#C4D3C6" strokeWidth={2} />
          <line x1={GR} y1={GT} x2={GR} y2={TY} stroke="#C4D3C6" strokeWidth={2} />
          <text x={GLAS_MIDT} y={TY + 34} fill="#D3B44E" className="krone-svg-tekst" textAnchor="middle">TÅRNET</text>
        </svg>
      </div>

      <div className="krone-fod">
        {sigter && (
          <>
            <div className="krone-forklaring">
              <div>Træk baglæns fra mønten og slip. Jo længere du trækker, jo hårdere kaster du.</div>
              <div className="note">Den skal hoppe på bordet mindst én gang, før den ryger i tårnet.</div>
            </div>
            <div className="krone-kraft">
              <div className="krone-kraft-h"><span>Kraft</span><span style={{ color: 'var(--brass-lt)' }}>{kraft} %</span></div>
              <div className="krone-kraft-bar"><div style={{ width: `${kraft}%` }} /></div>
            </div>
          </>
        )}

        {(s.fase === 'flyver' || s.fase === 'synker') && (
          <div className="krone-flyver">
            {s.fase === 'synker' ? 'Plask …' : s.hop > 0 ? 'Den hoppede — kom nu …' : 'Den flyver …'}
          </div>
        )}

        {s.fase === 'ramte' && (
          <>
            <div className="krone-resultat">
              <div className="eyebrow" style={{ color: 'var(--amber)' }}>Den røg i!</div>
              <div className="krone-resultat-t">Plask. Du udpeger hvem der bunder tårnet.</div>
            </div>
            <button className="knap knap-primaer" disabled={sendt} onClick={() => svar(true)}>Udpeg hvem der bunder</button>
          </>
        )}

        {(s.fase === 'forbi' || s.fase === 'ugyldig') && (
          <>
            <div className="krone-resultat">
              <div className="eyebrow" style={{ color: 'var(--rust)' }}>
                {s.fase === 'ugyldig' ? 'Tæller ikke' : s.hvorfor === 'over' ? 'For hårdt' : 'Ved siden af'}
              </div>
              <div className="krone-resultat-t">
                {s.fase === 'ugyldig'
                  ? 'Den ramte ikke bordet først. Turen går videre.'
                  : s.hvorfor === 'over' ? 'Den fløj over tårnet. Turen går videre.' : 'Ingen plask. Turen går videre.'}
              </div>
            </div>
            <button className="knap" disabled={sendt} onClick={() => svar(false)}>Videre</button>
          </>
        )}
      </div>
    </>
  );
}

export interface KroneKortProps {
  spil: Spil;
  migId: string;
  send: (h: Handling) => void;
  /** Mobilen lægger kortet over hele skærmen; web lægger det over pladen. */
  kompakt?: boolean;
}

/**
 * 2-kronen som et kort hen over spillepladen — kun for den der kaster.
 * Resten af bordet følger med i handlingskortet.
 */
export function KroneKort({ spil, migId, send, kompakt = false }: KroneKortProps): JSX.Element | null {
  const a = spil.afventer;
  if (!a || a.slags !== 'krone-kast' || a.spillerId !== migId) return null;

  return (
    <div className={`meier-kort krone-kort${kompakt ? ' meier-kort-mobil' : ''}`}>
      <div className="meier-band krone-band">
        <span className="meier-prik" style={{ background: 'var(--brass-lt)' }} />
        <span className="meier-band-tekst" style={{ color: 'var(--brass-lt)' }}>2-krone</span>
        <span style={{ flexGrow: 1 }} />
        <span className="meier-band-h">Ét forsøg</span>
      </div>
      <div className="krone-krop">
        <h2 style={{ fontSize: kompakt ? 22 : 28 }}>Ram bordet, så tårnet.</h2>
        {/* Kortet forsvinder når kastet er meldt, så næste 2-krone starter forfra af sig selv. */}
        <KroneKast
          fyld={Math.min(1, taarnAndel(spil))}
          onResultat={(ramte) => send({ type: 'krone-resultat', ramte })}
        />
      </div>
    </div>
  );
}
