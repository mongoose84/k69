import { useCallback, useEffect, useRef, useState } from 'react';
import type { KlientHandling, Spil } from '@k69/rules';

export type SpilUdsyn = Spil & { bunkeTilbage: number };

/** Fra før sessionsnøglerne: id'et alene. Bruges kun til at gøre krav på en gammel plads. */
const GAMMELT_ID = 'k69:spillerId';

const tokenNoegle = (kode: string): string => `k69:token:${kode.toUpperCase()}`;

/** Ens på tværs af faner af samme spil — den er det der beviser hvem man er. */
const tilFaneLiv = new Map<string, string>();

function nyToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function minToken(kode: string): string {
  try {
    const gemt = localStorage.getItem(tokenNoegle(kode));
    if (gemt) return gemt;
    const ny = nyToken();
    localStorage.setItem(tokenNoegle(kode), ny);
    return ny;
  } catch {
    // Privat browsing: nøglen holder kun så længe siden er åben.
    let ny = tilFaneLiv.get(kode);
    if (!ny) {
      ny = nyToken();
      tilFaneLiv.set(kode, ny);
    }
    return ny;
  }
}

function gemToken(kode: string, token: string): void {
  try {
    localStorage.setItem(tokenNoegle(kode), token);
  } catch {
    tilFaneLiv.set(kode, token);
  }
}

function gammeltId(): string | null {
  try {
    return localStorage.getItem(GAMMELT_ID);
  } catch {
    return null;
  }
}

export interface Forbindelse {
  spil: SpilUdsyn | null;
  spillerId: string;
  forbundet: boolean;
  fejl: string | null;
  fatal: boolean;
  send: (h: KlientHandling) => void;
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
  /** Tom indtil serveren har sagt velkommen — det er den der afgør hvem man er. */
  const [spillerId, saetSpillerId] = useState('');

  const sok = useRef<WebSocket | null>(null);
  const koe = useRef<KlientHandling[]>([]);
  const lukket = useRef(false);
  const forsoeg = useRef(0);
  /** Som `fatal`, men læsbar fra onclose — state ville være fanget fra da effekten kørte. */
  const erFatal = useRef(false);

  useEffect(() => {
    if (!kode) return;
    lukket.current = false;
    erFatal.current = false;
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
        s.send(JSON.stringify({ t: 'hej', kode, token: minToken(kode), spillerId: gammeltId() }));
        puls = setInterval(() => s.readyState === 1 && s.send(JSON.stringify({ t: 'puls' })), 25000);
      };

      s.onmessage = (e: MessageEvent<string>) => {
        let b: { t: string; spil?: SpilUdsyn; spillerId?: string; token?: string; besked?: string; fatal?: boolean };
        try {
          b = JSON.parse(e.data);
        } catch {
          return;
        }
        if (b.t === 'velkommen') {
          if (b.spillerId) saetSpillerId(b.spillerId);
          if (b.token) gemToken(kode, b.token);
          if (b.spil) saetSpil(b.spil);
          saetFejl(null);
          for (const h of koe.current.splice(0)) s.send(JSON.stringify({ t: 'handling', handling: h }));
        } else if (b.t === 'spil' && b.spil) {
          saetSpil(b.spil);
        } else if (b.t === 'fejl') {
          saetFejl(b.besked ?? 'Der gik noget galt.');
          if (b.fatal) {
            erFatal.current = true;
            saetFatal(true);
          }
        }
      };

      s.onclose = () => {
        saetForbundet(false);
        if (puls) clearInterval(puls);
        if (lukket.current || erFatal.current) return;
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
    // fatal læses via erFatal, så en fatal fejl ikke river forbindelsen op igen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kode, apiBase]);

  const send = useCallback((h: KlientHandling) => {
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
