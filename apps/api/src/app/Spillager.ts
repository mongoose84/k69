import { opgraderGemt, type Haendelse, type Spil } from '@k69/rules';
import type { Klokke, Ur } from './klokke.js';
import type { SpilRepository } from './SpilRepository.js';

/**
 * Spillene ligger i hukommelsen mens de er i gang og skrives til databasen med
 * en kort forsinkelse. Det er nødvendigt fordi tårnet fyldes med mange små
 * opdateringer i sekundet — de skal ikke koste en transaktion hver.
 *
 * Hver ændring får et nyt versionsnummer. Skrivningerne for ét spil går i kø
 * efter hinanden og tager altid det nyeste, så et gammelt billede aldrig kan
 * lande efter et nyt. Databasen tjekker versionen igen, for en sikkerheds skyld.
 *
 * Forudsætningen er én API-instans pr. database. Skal der skaleres vandret,
 * er det her LISTEN/NOTIFY eller en delt cache skal ind.
 */
interface Post {
  spil: Spil;
  /** Versionen af `spil` i hukommelsen. */
  version: number;
  /** Den nyeste version der ligger i databasen. */
  gemtVersion: number;
  gemmer: Ur | null;
  /** Halen af spillets skrivekø. */
  skriver: Promise<void>;
  sidstRoert: number;
}

export const GEM_FORSINKELSE = 400;
export const UDLOEB = 1000 * 60 * 60 * 12;

/** Læsevenlig kode uden de tegn der kan forveksles i en delt url. */
const BOGSTAVER = 'ABCDEFGHJKLMNPQRSTUVXYZ23456789';

function nyKode(): string {
  let ud = '';
  for (let i = 0; i < 5; i++) {
    ud += BOGSTAVER[Math.floor(Math.random() * BOGSTAVER.length)];
  }
  return ud;
}

export class Spillager {
  private readonly poster = new Map<string, Post>();
  private readonly koder = new Map<string, string>(); // kode -> id
  /** Indlæsninger undervejs — så to der spørger samtidig, får det samme spil. */
  private readonly henter = new Map<string, Promise<Spil | null>>();

  constructor(
    private readonly repo: SpilRepository,
    private readonly klokke: Klokke,
    /** Kaldes når et spil ryddes ud af hukommelsen. */
    private readonly vedUdloeb: (spilId: string) => void = () => {}
  ) {}

  async opret(lav: (kode: string) => Spil): Promise<Spil> {
    for (let forsoeg = 0; forsoeg < 12; forsoeg++) {
      const spil = lav(nyKode());
      if (await this.repo.opret(spil)) {
        this.laegI(spil, 1);
        return spil;
      }
    }
    throw new Error('Kunne ikke finde en ledig spilkode.');
  }

  hent(kode: string): Promise<Spil | null> {
    const noegle = kode.trim().toUpperCase();
    const id = this.koder.get(noegle);
    const post = id ? this.poster.get(id) : undefined;
    if (post) {
      post.sidstRoert = this.klokke.nu();
      return Promise.resolve(post.spil);
    }

    const undervejs = this.henter.get(noegle);
    if (undervejs) return undervejs;

    const hentning = this.repo.hent(noegle)
      .then((gemt) => {
        if (!gemt) return null;
        return this.laegI(opgraderGemt(gemt.spil), gemt.version).spil;
      })
      .finally(() => this.henter.delete(noegle));
    this.henter.set(noegle, hentning);
    return hentning;
  }

  /** Marker et spil som ændret. Selve skrivningen samles op kort efter — eller nu. */
  gem(spil: Spil, straks = false): void {
    const post = this.poster.get(spil.id);
    if (!post) return;
    post.spil = spil;
    post.version += 1;
    post.sidstRoert = this.klokke.nu();

    if (straks) {
      if (post.gemmer) this.klokke.stop(post.gemmer);
      post.gemmer = null;
      void this.skriv(post);
      return;
    }
    if (post.gemmer) return;
    post.gemmer = this.klokke.efter(GEM_FORSINKELSE, () => {
      post.gemmer = null;
      void this.skriv(post);
    });
  }

  /** Hændelser til loggen — i samme kø som spillets skrivninger, så rækkefølgen holder. */
  log(spilId: string, linjer: Haendelse[]): void {
    if (linjer.length === 0) return;
    const post = this.poster.get(spilId);
    const skriv = (): Promise<void> => this.repo.log(spilId, linjer)
      .catch((e) => console.error('kunne ikke logge hændelser', spilId, e));
    if (post) post.skriver = post.skriver.then(skriv);
    else void skriv();
  }

  /** Ryd spil ud af hukommelsen når ingen har rørt dem længe. Et uskrevet spil bliver til det er skrevet. */
  ryd(): void {
    const nu = this.klokke.nu();
    for (const [id, post] of this.poster) {
      if (nu - post.sidstRoert < UDLOEB) continue;
      if (post.gemtVersion < post.version) {
        void this.skriv(post);
        continue;
      }
      if (post.gemmer) this.klokke.stop(post.gemmer);
      this.koder.delete(post.spil.kode);
      this.poster.delete(id);
      this.vedUdloeb(id);
    }
  }

  async skrivAlle(): Promise<void> {
    for (const post of this.poster.values()) {
      if (post.gemmer) this.klokke.stop(post.gemmer);
      post.gemmer = null;
    }
    await Promise.all([...this.poster.values()].map((p) => this.skriv(p)));
  }

  /** Til test og overvågning: spil der har ændringer databasen ikke har set endnu. */
  uskrevne(): number {
    return [...this.poster.values()].filter((p) => p.gemtVersion < p.version).length;
  }

  private laegI(spil: Spil, version: number): Post {
    const findes = this.poster.get(spil.id);
    if (findes) return findes;
    const post: Post = {
      spil,
      version,
      gemtVersion: version,
      gemmer: null,
      skriver: Promise.resolve(),
      sidstRoert: this.klokke.nu()
    };
    this.poster.set(spil.id, post);
    this.koder.set(spil.kode, spil.id);
    return post;
  }

  /**
   * Stil en skrivning i spillets kø. Når det bliver dens tur, skrives det
   * nyeste spil — er det allerede skrevet, sker der ingenting.
   */
  private skriv(post: Post): Promise<void> {
    post.skriver = post.skriver.then(async () => {
      if (post.gemtVersion >= post.version) return;
      const { spil, version } = post;
      try {
        await this.repo.gem(spil, version);
        post.gemtVersion = Math.max(post.gemtVersion, version);
      } catch (e) {
        // Bliver stående som uskrevet og prøves igen ved næste ændring eller oprydning.
        console.error('kunne ikke gemme spil', spil.id, e);
      }
    });
    return post.skriver;
  }
}
