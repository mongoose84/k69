import type { Haendelse, Spil } from '@k69/rules';
import type { Klokke, Ur } from '../src/app/klokke.js';
import type { GemtSpil, SpilRepository } from '../src/app/SpilRepository.js';
import type { Sok } from '../src/transport/ws.js';

/** Lad alt der venter på promises og setImmediate køre færdigt. */
export async function roligt(gange = 20): Promise<void> {
  for (let i = 0; i < gange; i++) await new Promise((r) => setImmediate(r));
}

/** Et ur der kun går når testen skubber det. */
export class FalskKlokke implements Klokke {
  private tid = Date.parse('2026-01-01T00:00:00.000Z');
  private ure: Array<{ tid: number; fn: () => void; ur: Ur }> = [];

  nu(): number {
    return this.tid;
  }

  efter(ms: number, fn: () => void): Ur {
    const ur = {} as Ur;
    this.ure.push({ tid: this.tid + ms, fn, ur });
    return ur;
  }

  stop(ur: Ur): void {
    this.ure = this.ure.filter((u) => u.ur !== ur);
  }

  /** Gå `ms` frem og lad de ure ringe der når at ringe — også dem der sættes undervejs. */
  async frem(ms: number): Promise<void> {
    const slut = this.tid + ms;
    for (;;) {
      await roligt();
      const naeste = this.ure.filter((u) => u.tid <= slut).sort((a, b) => a.tid - b.tid)[0];
      if (!naeste) break;
      this.ure = this.ure.filter((u) => u !== naeste);
      this.tid = naeste.tid;
      naeste.fn();
    }
    this.tid = slut;
    await roligt();
  }

  antalUre(): number {
    return this.ure.length;
  }
}

/** Databasen som en Map — med samme versionsvagt som SQL'en. */
export class HukommelsesRepo implements SpilRepository {
  readonly raekker = new Map<string, GemtSpil>();
  readonly logget: Haendelse[] = [];
  hentKald = 0;
  gemKald = 0;
  /** Hvor mange skrivninger der er i gang lige nu — og det højeste det har været. */
  iGang = 0;
  flestSamtidig = 0;
  /** Kan sættes af en test for at holde en skrivning tilbage. */
  foerGem: (version: number) => Promise<void> = async () => {};
  /** Kan sættes af en test for at holde en indlæsning tilbage. */
  foerHent: () => Promise<void> = async () => {};
  fejlVedGem = false;

  async opret(spil: Spil): Promise<boolean> {
    if (this.raekker.has(spil.kode)) return false;
    this.raekker.set(spil.kode, { spil: structuredClone(spil), version: 1 });
    return true;
  }

  async hent(kode: string): Promise<GemtSpil | null> {
    this.hentKald++;
    await this.foerHent();
    const r = this.raekker.get(kode);
    return r ? { spil: structuredClone(r.spil), version: r.version } : null;
  }

  async gem(spil: Spil, version: number): Promise<boolean> {
    this.gemKald++;
    this.iGang++;
    this.flestSamtidig = Math.max(this.flestSamtidig, this.iGang);
    try {
      await this.foerGem(version);
      if (this.fejlVedGem) throw new Error('databasen er væk');
      const r = this.raekker.get(spil.kode);
      if (!r || r.version >= version) return false;
      this.raekker.set(spil.kode, { spil: structuredClone(spil), version });
      return true;
    } finally {
      this.iGang--;
    }
  }

  async log(_spilId: string, linjer: Haendelse[]): Promise<void> {
    this.logget.push(...linjer);
  }
}

/** En websocket uden net. `modtaget` er det serveren har sendt. */
export class FalskSok implements Sok {
  readyState = 1;
  readonly modtaget: Array<Record<string, unknown> & { t: string }> = [];
  private paaBesked: ((raa: string) => void) | null = null;
  private paaLuk: (() => void) | null = null;

  send(data: string): void {
    this.modtaget.push(JSON.parse(data));
  }

  on(begivenhed: 'message' | 'close', fn: ((raa: string) => void) | (() => void)): void {
    if (begivenhed === 'message') this.paaBesked = fn as (raa: string) => void;
    else this.paaLuk = fn as () => void;
  }

  skriv(besked: unknown): void {
    this.paaBesked?.(JSON.stringify(besked));
  }

  luk(): void {
    this.readyState = 3;
    this.paaLuk?.();
  }

  sidste(t: string): (Record<string, unknown> & { t: string }) | undefined {
    return [...this.modtaget].reverse().find((b) => b.t === t);
  }
}

/** En klar til brug: nøgle i det format klienten laver. */
export function token(n: number): string {
  return String(n).padStart(43, 'x');
}

/** Hold noget tilbage indtil testen siger til. */
export function port(): { aaben: Promise<void>; luk_op: () => void } {
  let luk_op = (): void => {};
  const aaben = new Promise<void>((r) => { luk_op = r; });
  return { aaben, luk_op };
}
