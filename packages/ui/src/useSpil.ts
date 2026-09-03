import { useCallback, useEffect, useRef, useState } from 'react';
import type { Handling, Spil } from '@k69/rules';

export type SpilUdsyn = Spil & { bunkeTilbage: number };

const NOEGLE = 'k69:spillerId';

/** Samme id på tværs af spil, så man kommer tilbage til sin egen brik. */
export function mitId(): string {
  try {
    const gemt = localStorage.getItem(NOEGLE);
    if (gemt) return gemt;
    const ny = crypto.randomUUID();
    localStorage.setItem(NOEGLE, ny);
    return ny;
  } catch {
    return crypto.randomUUID();
  }
}

export interface Forbindelse {
  spil: SpilUdsyn | null;
  spillerId: string;
  forbundet: boolean;
  fejl: string | null;
  fatal: boolean;
  send: (h: Handling) => void;
  ryd: () => void;
}

/**
 * Én websocket pr. spil. Serveren sender hele tilstanden efter hver handling —
 * spillene er små nok til at det er både simplest og mest robust.
 */
export function useSpil(kode: string | null, apiBase: string): Forbindelse {
  const [spil, saetSpil] = useState<SpilUdsyn | null>(null);
  const [forbundet, saetForbundet] = useState(false);
  const [fejl, saetFejl] = useState<string | null>(null);
  const [fatal, saetFatal] = useState(false);
  const [spillerId, saetSpillerId] = useState<string>(() => mitId());

  const sok = useRef<WebSocket | null>(null);
  const koe = useRef<Handling[]>([]);
  const lukket = useRef(false);
  const forsoeg = useRef(0);

  useEffect(() => {
    if (!kode) return;
    lukket.current = false;
    let puls: ReturnType<typeof setInterval> | null = null;
    let genforbind: ReturnType<typeof setTimeout> | null = null;

    const aabn = (): void => {
      const url = new URL(apiBase.replace(/^http/, 'ws'));
      url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
      const s = new WebSocket(url.toString());
      sok.current = s;

      s.onopen = () => {
        forsoeg.current = 0;
        saetForbundet(true);
        s.send(JSON.stringify({ t: 'hej', kode, spillerId: mitId() }));
        puls = setInterval(() => s.readyState === 1 && s.send(JSON.stringify({ t: 'puls' })), 25000);
      };

      s.onmessage = (e: MessageEvent<string>) => {
        let b: { t: string; spil?: SpilUdsyn; spillerId?: string; besked?: string; fatal?: boolean };
        try {
          b = JSON.parse(e.data);
        } catch {
          return;
        }
        if (b.t === 'velkommen') {
          if (b.spillerId) {
            saetSpillerId(b.spillerId);
            try {
              localStorage.setItem(NOEGLE, b.spillerId);
            } catch { /* privat browsing */ }
          }
          if (b.spil) saetSpil(b.spil);
          saetFejl(null);
          for (const h of koe.current.splice(0)) s.send(JSON.stringify({ t: 'handling', handling: h }));
        } else if (b.t === 'spil' && b.spil) {
          saetSpil(b.spil);
        } else if (b.t === 'fejl') {
          saetFejl(b.besked ?? 'Der gik noget galt.');
          if (b.fatal) saetFatal(true);
        }
      };

      s.onclose = () => {
        saetForbundet(false);
        if (puls) clearInterval(puls);
        if (lukket.current || fatal) return;
        forsoeg.current += 1;
        const ventetid = Math.min(8000, 400 * 2 ** Math.min(forsoeg.current, 5));
        genforbind = setTimeout(aabn, ventetid);
      };

      s.onerror = () => s.close();
    };

    aabn();

    return () => {
      lukket.current = true;
      if (puls) clearInterval(puls);
      if (genforbind) clearTimeout(genforbind);
      sok.current?.close();
      sok.current = null;
    };
    // fatal indgår bevidst ikke: en fatal fejl skal ikke rive forbindelsen op igen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kode, apiBase]);

  const send = useCallback((h: Handling) => {
    const s = sok.current;
    if (s && s.readyState === 1) s.send(JSON.stringify({ t: 'handling', handling: h }));
    else koe.current.push(h);
  }, []);

  const ryd = useCallback(() => saetFejl(null), []);

  return { spil, spillerId, forbundet, fejl, fatal, send, ryd };
}

/** Opret et spil og få koden tilbage. */
export async function opretSpil(apiBase: string): Promise<string> {
  const svar = await fetch(`${apiBase}/api/spil`, { method: 'POST' });
  if (!svar.ok) throw new Error('Kunne ikke oprette spillet.');
  const data = (await svar.json()) as { kode: string };
  return data.kode;
}

export async function slaaOpSpil(
  apiBase: string,
  kode: string
): Promise<{ kode: string; fase: string; spillere: Array<{ navn: string; farve: string }> } | null> {
  const svar = await fetch(`${apiBase}/api/spil/${encodeURIComponent(kode)}`);
  if (!svar.ok) return null;
  return svar.json();
}
