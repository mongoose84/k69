import { randomUUID } from 'node:crypto';
import {
  RegelFejl, anvend, nytSpil, vaertFrist,
  type KlientHandling, type Kontekst, type Spil, type SystemHandling
} from '@k69/rules';
import type { Klokke, Ur } from './klokke.js';
import { genkend, medSession, type Identitet } from './session.js';
import { Spillager } from './Spillager.js';
import type { SpilRepository } from './SpilRepository.js';

/** Hvem en forbindelse er: spillet og spilleren, afgjort af sessionsnøglen. */
export interface Plads {
  spilId: string;
  kode: string;
  spillerId: string;
  /** Bindes til spilleren når han joiner. */
  tokenHash: string;
}

export type Svar = { ok: true } | { ok: false; besked: string; fatal?: boolean };

/** Handlinger der skal ligge på disken med det samme. Resten samles op. */
const VIGTIGE = new Set<KlientHandling['type']>([
  'join', 'start', 'slaa', 'meld-afgang', 'toem-taarn-faerdig', 'taarn-faerdig',
  'afstemning-start', 'afstemning-stem', 'godkend-join'
]);

function terning(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/**
 * Spillets gang på serveren: hent → anvend → gem → fortæl det. Ved intet om
 * websockets — dem der vil vide når et spil ændrer sig, lytter med `paaAendring`.
 */
export class SpilService {
  readonly lager: Spillager;
  private readonly klokke: Klokke;
  private readonly terning: () => number;
  private readonly tilfaeldig: () => number;
  private readonly nytId: () => string;

  private readonly lyttere = new Set<(spil: Spil) => void>();
  private readonly koeer = new Map<string, Promise<void>>();
  private readonly afstemningsUre = new Map<string, { id: number; ur: Ur }>();
  private readonly vaertUre = new Map<string, { noegle: string; ur: Ur }>();

  constructor(deps: {
    repo: SpilRepository; klokke: Klokke; terning?: () => number; tilfaeldig?: () => number; nytId?: () => string;
  }) {
    this.klokke = deps.klokke;
    this.terning = deps.terning ?? terning;
    this.tilfaeldig = deps.tilfaeldig ?? Math.random;
    this.nytId = deps.nytId ?? randomUUID;
    this.lager = new Spillager(deps.repo, deps.klokke, (id) => this.glem(id));
  }

  paaAendring(fn: (spil: Spil) => void): () => void {
    this.lyttere.add(fn);
    return () => this.lyttere.delete(fn);
  }

  opret(): Promise<Spil> {
    return this.lager.opret((kode) => nytSpil(randomUUID(), kode, this.iso()));
  }

  hent(kode: string): Promise<Spil | null> {
    return this.lager.hent(kode);
  }

  /** Genkend den der siger hej. I køen, fordi et krav på en gammel plads ændrer spillet. */
  async hej(kode: string, token: unknown, gammeltId: unknown): Promise<{ spil: Spil; ident: Identitet } | null> {
    const fundet = await this.lager.hent(kode);
    if (!fundet) return null;
    return this.iKoe(fundet.id, async () => {
      const spil = await this.lager.hent(kode);
      if (!spil) return null;
      const ident = genkend(spil, token, gammeltId, this.nytId);
      if (ident.bundet) this.lager.gem(ident.bundet, true);
      return { spil: ident.bundet ?? spil, ident };
    });
  }

  forbindelse(plads: Plads, tilsluttet: boolean): Promise<void> {
    return this.iKoe(plads.spilId, async () => {
      const spil = await this.lager.hent(plads.kode);
      if (!spil) return;
      try {
        // Kan give en ny vært — derfor logges der også her.
        this.anvendt(spil, anvend(spil, { type: 'forbindelse', tilsluttet }, this.ktx(plads.spillerId)), false);
      } catch {
        // Er man ikke med i spillet endnu, er der ikke noget at markere.
      }
    });
  }

  udfoer(plads: Plads, handling: KlientHandling): Promise<Svar> {
    return this.iKoe(plads.spilId, async (): Promise<Svar> => {
      const spil = await this.lager.hent(plads.kode);
      if (!spil) return { ok: false, besked: 'Spillet findes ikke længere.', fatal: true };
      try {
        let efter = anvend(spil, handling, this.ktx(plads.spillerId));
        // Nøglen bindes først når man faktisk sætter sig ved bordet (eller beder om det).
        if (handling.type === 'join') efter = medSession(efter, plads.tokenHash, plads.spillerId);
        this.anvendt(spil, efter, VIGTIGE.has(handling.type));
        return { ok: true };
      } catch (e) {
        if (e instanceof RegelFejl) return { ok: false, besked: e.message };
        console.error('handling fejlede', handling.type, e);
        return { ok: false, besked: 'Der gik noget galt. Prøv igen.' };
      }
    });
  }

  /** Ryd gamle spil ud af hukommelsen. Kaldes jævnligt. */
  ryd(): void {
    this.lager.ryd();
  }

  /** Stop urene og skriv alt. Til nedlukning. */
  async luk(): Promise<void> {
    for (const id of [...this.afstemningsUre.keys(), ...this.vaertUre.keys()]) this.glem(id);
    await this.lager.skrivAlle();
  }

  /* ------------------------------------------------------------------ indre */

  /**
   * Én handling ad gangen pr. spil. Motoren arbejder på en kopi, så to handlinger
   * der kørte samtidig, ville hver lave deres eget nye spil — og den sidste ville
   * skrive den første ud. Køen gør at hver handling bygger videre på den forrige.
   */
  private iKoe<T>(spilId: string, opgave: () => Promise<T>): Promise<T> {
    const naeste = (this.koeer.get(spilId) ?? Promise.resolve()).then(opgave);
    const hale = naeste.then(() => {}, () => {});
    this.koeer.set(spilId, hale);
    void hale.then(() => {
      if (this.koeer.get(spilId) === hale) this.koeer.delete(spilId);
    });
    return naeste;
  }

  private ktx(spillerId: string): Kontekst {
    return { spillerId, terning: this.terning, tilfaeldig: this.tilfaeldig, naa: () => this.iso() };
  }

  private iso(): string {
    return new Date(this.klokke.nu()).toISOString();
  }

  /** Gem, log og fortæl om et nyt spil. Kaldes inde i køen. */
  private anvendt(foer: Spil, efter: Spil, straks: boolean): void {
    this.lager.gem(efter, straks);
    this.lager.log(efter.id, efter.log.filter((l) => l.id >= foer.naesteHaendelseId).reverse());
    this.planlaegAfstemning(efter);
    this.planlaegVaertskifte(efter);
    for (const fn of this.lyttere) fn(efter);
  }

  /** En handling fra serverens eget ur. */
  private system(spilId: string, kode: string, handling: SystemHandling, stadigAktuel: (spil: Spil) => boolean): Promise<void> {
    return this.iKoe(spilId, async () => {
      const spil = await this.lager.hent(kode);
      // En handling foran i køen kan have klaret det allerede.
      if (!spil || !stadigAktuel(spil)) return;
      try {
        this.anvendt(spil, anvend(spil, handling, this.ktx('system')), true);
      } catch (e) {
        console.error('systemhandlingen fejlede', handling.type, e);
      }
    });
  }

  /**
   * Afstemningens ur. Motoren afgør den selv ved næste handling når tiden er
   * gået — men står bordet stille, er det her der siger til. Ét ur pr. spil.
   */
  private planlaegAfstemning(spil: Spil): void {
    const a = spil.afstemning;
    const ur = this.afstemningsUre.get(spil.id);
    if (!a || a.udfald) {
      if (ur) {
        this.klokke.stop(ur.ur);
        this.afstemningsUre.delete(spil.id);
      }
      return;
    }
    if (ur?.id === a.id) return;
    if (ur) this.klokke.stop(ur.ur);
    const om = Math.max(0, Date.parse(a.udloeber) - this.klokke.nu()) + 150;
    const id = a.id;
    this.afstemningsUre.set(spil.id, {
      id,
      ur: this.klokke.efter(om, () => {
        if (this.afstemningsUre.get(spil.id)?.id === id) this.afstemningsUre.delete(spil.id);
        void this.system(spil.id, spil.kode, { type: 'afstemning-afgoer', id },
          (s) => s.afstemning?.id === id && !s.afstemning.udfald);
      })
    });
  }

  /**
   * Værtens frist. Går han offline, siger uret til når fristen er gået, og
   * motoren giver hvervet videre. Uret bliver stående i mappen når det har
   * ringet: er der ingen at give hvervet til, er fristen stadig overskredet, og
   * et nyt ur ville gå i ring. Det ryddes når værten kommer tilbage eller en
   * anden overtager.
   */
  private planlaegVaertskifte(spil: Spil): void {
    const frist = vaertFrist(spil);
    const noegle = frist ? `${spil.vaertId}@${frist}` : null;
    const ur = this.vaertUre.get(spil.id);
    if (ur?.noegle === noegle) return;
    if (ur) {
      this.klokke.stop(ur.ur);
      this.vaertUre.delete(spil.id);
    }
    if (!frist || !noegle) return;
    const om = Math.max(0, Date.parse(frist) - this.klokke.nu()) + 150;
    this.vaertUre.set(spil.id, {
      noegle,
      ur: this.klokke.efter(om, () => {
        void this.system(spil.id, spil.kode, { type: 'vaert-tjek' }, (s) => {
          const f = vaertFrist(s);
          return Boolean(f) && `${s.vaertId}@${f}` === noegle;
        });
      })
    });
  }

  /** Et spil er ryddet ud af hukommelsen — dets ure skal ikke ringe. */
  private glem(spilId: string): void {
    const a = this.afstemningsUre.get(spilId);
    if (a) this.klokke.stop(a.ur);
    this.afstemningsUre.delete(spilId);
    const v = this.vaertUre.get(spilId);
    if (v) this.klokke.stop(v.ur);
    this.vaertUre.delete(spilId);
  }
}
