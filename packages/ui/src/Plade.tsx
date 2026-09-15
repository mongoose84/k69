import { useCallback, useEffect, useRef, useState, type JSX, type PointerEvent as RPointerEvent } from 'react';
import { FELTER } from '@k69/rules';
import {
  BRAET_STR, BraetBaggrund, BraetDefs, BraetPlade,
  type BrikPaaPladen, type FingerPaaBordet, type KortPaaBordet, type TerningPaaBordet
} from './Braet.js';

interface Kamera {
  x: number;
  y: number;
  z: number;
}

export interface PladeProps {
  id: string;
  brikker: BrikPaaPladen[];
  aktivtFelt?: number | null;
  taarnAndel: number;
  taarnCl?: number | null;
  taarnKapCl?: number;
  kort?: KortPaaBordet | null;
  terning?: TerningPaaBordet | null;
  /** Zoom når man følger sin egen brik. Sæt til null for altid at vise hele pladen. */
  foelgZoom?: number | null;
  /** Feltet kameraet holder på når man følger. */
  foelgFelt?: number | null;
  foelger?: boolean;
  visMinimap?: boolean;
  onFeltKlik?: (nr: number) => void;
  finger?: FingerPaaBordet | null;
  kortHosId?: string | null;
}

function passer(bredde: number, hoejde: number): Kamera {
  const z = Math.min(bredde / BRAET_STR.w, hoejde / BRAET_STR.h) * 0.96;
  return {
    x: (bredde - BRAET_STR.w * z) / 2,
    y: (hoejde - BRAET_STR.h * z) / 2,
    z
  };
}

/**
 * Pladen med træk og zoom. Kameraet lever i pixels, så et træk med musen
 * flytter præcis lige så meget som fingeren — også når der er zoomet ind.
 */
export function Plade({
  id, brikker, aktivtFelt, taarnAndel, taarnCl = null, taarnKapCl = 50, kort = null, terning = null,
  foelgZoom = null, foelgFelt = null, foelger = false, visMinimap = false, onFeltKlik, finger = null, kortHosId = null
}: PladeProps): JSX.Element {
  const boks = useRef<HTMLDivElement | null>(null);
  const [maal, saetMaal] = useState({ b: 800, h: 600 });
  const [kamera, saetKamera] = useState<Kamera | null>(null);
  const traek = useRef<{ x: number; y: number; kx: number; ky: number } | null>(null);

  useEffect(() => {
    const el = boks.current;
    if (!el) return;
    const iagttager = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      saetMaal({ b: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    iagttager.observe(el);
    return () => iagttager.disconnect();
  }, []);

  // Følger man sin egen brik, styrer kameraet sig selv indtil man trækker i det.
  useEffect(() => {
    if (!foelger || !foelgZoom || !foelgFelt) return;
    const f = FELTER[foelgFelt - 1];
    if (!f) return;
    saetKamera({ x: maal.b / 2 - f.cx * foelgZoom, y: maal.h / 2 - f.cy * foelgZoom, z: foelgZoom });
  }, [foelger, foelgZoom, foelgFelt, maal.b, maal.h]);

  useEffect(() => {
    if (foelger) return;
    saetKamera(passer(maal.b, maal.h));
  }, [foelger, maal.b, maal.h]);

  const k = kamera ?? passer(maal.b, maal.h);

  const zoom = useCallback((faktor: number, mod?: { x: number; y: number }) => {
    saetKamera((nu) => {
      const gl = nu ?? passer(maal.b, maal.h);
      const z = Math.max(0.2, Math.min(2.4, gl.z * faktor));
      const px = mod?.x ?? maal.b / 2;
      const py = mod?.y ?? maal.h / 2;
      return {
        x: px - ((px - gl.x) / gl.z) * z,
        y: py - ((py - gl.y) / gl.z) * z,
        z
      };
    });
  }, [maal.b, maal.h]);

  const ned = (e: RPointerEvent<HTMLDivElement>): void => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    traek.current = { x: e.clientX, y: e.clientY, kx: k.x, ky: k.y };
  };

  const flyt = (e: RPointerEvent<HTMLDivElement>): void => {
    const t = traek.current;
    if (!t) return;
    saetKamera({ x: t.kx + (e.clientX - t.x), y: t.ky + (e.clientY - t.y), z: k.z });
  };

  const op = (): void => {
    traek.current = null;
  };

  return (
    <div
      ref={boks}
      className="plade"
      onPointerDown={ned}
      onPointerMove={flyt}
      onPointerUp={op}
      onPointerCancel={op}
      onWheel={(e) => {
        const r = boks.current?.getBoundingClientRect();
        zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, r ? { x: e.clientX - r.left, y: e.clientY - r.top } : undefined);
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${maal.b} ${maal.h}`} style={{ display: 'block' }}>
        <BraetDefs id={id} />
        <BraetBaggrund id={id} w={maal.b} h={maal.h} />
        <g transform={`translate(${k.x.toFixed(1)}, ${k.y.toFixed(1)}) scale(${k.z.toFixed(4)})`}>
          <BraetPlade
            id={id}
            brikker={brikker}
            aktivtFelt={aktivtFelt ?? null}
            taarnAndel={taarnAndel}
            taarnCl={taarnCl}
            taarnKapCl={taarnKapCl}
            kort={kort}
            terning={terning}
            onFeltKlik={onFeltKlik}
            finger={finger}
            kortHosId={kortHosId}
          />
        </g>
      </svg>

      <div className="plade-zoom">
        <button className="zknap" aria-label="Zoom ud" onClick={() => zoom(1 / 1.2)}>−</button>
        <button className="zknap" aria-label="Vis hele pladen" onClick={() => saetKamera(passer(maal.b, maal.h))}>⤢</button>
        <button className="zknap" aria-label="Zoom ind" onClick={() => zoom(1.2)}>+</button>
      </div>

      {visMinimap && (
        <div className="minimap" aria-hidden="true">
          <svg viewBox={`0 0 ${BRAET_STR.w} ${BRAET_STR.h}`} width="100%" height="100%">
            <BraetDefs id={`${id}-mm`} />
            {/* Fingeren tegnes også her, så man kan finde den selvom man følger sin egen brik. */}
            <BraetPlade
              id={`${id}-mm`}
              brikker={brikker}
              taarnAndel={taarnAndel}
              finger={finger ? { ramte: [], mangler: [] } : null}
            />
            <rect
              x={-k.x / k.z}
              y={-k.y / k.z}
              width={maal.b / k.z}
              height={maal.h / k.z}
              fill="none"
              stroke="#C9A227"
              strokeWidth="8"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
