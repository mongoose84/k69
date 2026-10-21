import { forSpiller, tolkHandling, type KlientHandling, type Spil } from '@k69/rules';
import type { Klokke } from '../app/klokke.js';
import type { Plads, SpilService } from '../app/SpilService.js';

/** Det af en websocket vi bruger — så hubben kan prøves af med en falsk. */
export interface Sok {
  readyState: number;
  send(data: string): void;
  on(begivenhed: 'message', fn: (raa: Buffer | string) => void): unknown;
  on(begivenhed: 'close', fn: () => void): unknown;
}

interface Forbindelse {
  sok: Sok;
  plads: Plads;
}

/** Simpel spand mod klienter der sender for hurtigt. Gælder pr. socket, også hej. */
const MAX_POLETTER = 60;
const POLETTER_PR_SEKUND = 30;

type Besked = { t?: unknown; kode?: unknown; token?: unknown; spillerId?: unknown; handling?: unknown };

/**
 * Websockets ↔ spil. Læser beskederne, holder styr på hvem der sidder i hvilket
 * rum, og sender hver klient sin egen udgave af spillet. Alt om selve spillet
 * klarer `SpilService`.
 */
export class WsHub {
  private readonly rum = new Map<string, Set<Forbindelse>>();

  constructor(private readonly service: SpilService, private readonly klokke: Klokke) {
    service.paaAendring((spil) => this.udsend(spil));
  }

  tilslut(sok: Sok): void {
    let f: Forbindelse | null = null;
    let lukket = false;
    /** Tæller hej'er på denne socket. Kun svaret på det seneste gælder. */
    let hejNr = 0;
    const spand = { poletter: MAX_POLETTER, sidstFyldt: this.klokke.nu() };

    const harPolet = (): boolean => {
      const nu = this.klokke.nu();
      spand.poletter = Math.min(MAX_POLETTER, spand.poletter + ((nu - spand.sidstFyldt) / 1000) * POLETTER_PR_SEKUND);
      spand.sidstFyldt = nu;
      if (spand.poletter < 1) return false;
      spand.poletter -= 1;
      return true;
    };

    sok.on('message', (raa) => {
      let besked: Besked;
      try {
        besked = JSON.parse(raa.toString()) as Besked;
        if (typeof besked !== 'object' || besked === null) throw new Error();
      } catch {
        send(sok, { t: 'fejl', besked: 'Kunne ikke læse beskeden.' });
        return;
      }

      if (besked.t === 'puls') {
        send(sok, { t: 'puls' });
        return;
      }
      if (!harPolet()) {
        send(sok, { t: 'fejl', besked: 'Rolig nu — for mange beskeder på én gang.' });
        return;
      }

      if (besked.t === 'hej') {
        // Klienter fra før sessionsnøglerne sender ingen `token` og ville miste
        // deres plads ved næste genforbindelse. De skal hente den nye udgave.
        if (!('token' in besked)) {
          send(sok, { t: 'fejl', besked: 'K69 er blevet opdateret — genindlæs siden.', fatal: true });
          return;
        }
        // Et nyt hej erstatter det gamle: man forlader det rum man sad i.
        const nr = ++hejNr;
        if (f) {
          this.forlad(f);
          f = null;
        }
        const kode = typeof besked.kode === 'string' ? besked.kode : '';
        this.service.hej(kode, besked.token, besked.spillerId)
          .then((svar) => {
            // Lukket undervejs, eller overhalet af et nyere hej: så sætter vi os ikke.
            if (lukket || nr !== hejNr) return;
            if (!svar) {
              send(sok, { t: 'fejl', besked: 'Det spil findes ikke — tjek koden i linket.', fatal: true });
              return;
            }
            const { spil, ident } = svar;
            f = {
              sok,
              plads: { spilId: spil.id, kode: spil.kode, spillerId: ident.spillerId, tokenHash: ident.tokenHash }
            };
            this.saetInd(f);
            send(sok, { t: 'velkommen', spillerId: ident.spillerId, token: ident.token, spil: forSpiller(spil, ident.spillerId) });
            void this.service.forbindelse(f.plads, true);
          })
          .catch((e) => {
            console.error('hej fejlede', e);
            send(sok, { t: 'fejl', besked: 'Der gik noget galt. Prøv igen.' });
          });
        return;
      }

      if (besked.t === 'handling') {
        if (!f) {
          send(sok, { t: 'fejl', besked: 'Ikke forbundet til et spil endnu.' });
          return;
        }
        let handling: KlientHandling;
        try {
          handling = tolkHandling(besked.handling);
        } catch {
          send(sok, { t: 'fejl', besked: 'Ugyldig handling.' });
          return;
        }
        this.service.udfoer(f.plads, handling)
          .then((svar) => {
            if (!svar.ok) send(sok, { t: 'fejl', besked: svar.besked, ...(svar.fatal ? { fatal: true } : {}) });
          })
          .catch((e) => {
            console.error('handling fejlede', e);
            send(sok, { t: 'fejl', besked: 'Der gik noget galt. Prøv igen.' });
          });
      }
    });

    sok.on('close', () => {
      lukket = true;
      if (f) this.forlad(f);
      f = null;
    });
  }

  antalTilsluttede(): number {
    let n = 0;
    for (const flok of this.rum.values()) n += flok.size;
    return n;
  }

  /** Hver klient får sin egen udgave — Meier-slaget må kun holderen se. */
  private udsend(spil: Spil): void {
    const flok = this.rum.get(spil.id);
    if (!flok) return;
    for (const f of flok) send(f.sok, { t: 'spil', spil: forSpiller(spil, f.plads.spillerId) });
  }

  private saetInd(f: Forbindelse): void {
    let flok = this.rum.get(f.plads.spilId);
    if (!flok) {
      flok = new Set();
      this.rum.set(f.plads.spilId, flok);
    }
    flok.add(f);
  }

  private forlad(f: Forbindelse): void {
    const flok = this.rum.get(f.plads.spilId);
    flok?.delete(f);
    if (flok && flok.size === 0) this.rum.delete(f.plads.spilId);
    // Samme spiller kan have en nyere forbindelse åben (genforbindelse, to
    // faner, React der monterer to gange). Så er han stadig ved bordet.
    const stadigInde = flok ? [...flok].some((o) => o.plads.spillerId === f.plads.spillerId) : false;
    if (!stadigInde) void this.service.forbindelse(f.plads, false);
  }
}

function send(sok: Sok, besked: unknown): void {
  if (sok.readyState !== 1) return;
  sok.send(JSON.stringify(besked));
}
