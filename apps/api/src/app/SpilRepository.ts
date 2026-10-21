import type { Haendelse, Spil } from '@k69/rules';

export interface GemtSpil {
  spil: Spil;
  version: number;
}

/**
 * Hvor spillene ligger, når de ikke er i hukommelsen. Postgres i drift
 * (`infra/PgSpilRepo`), en Map i testene.
 */
export interface SpilRepository {
  /** Gem et nyt spil med version 1. `false` hvis koden allerede er taget. */
  opret(spil: Spil): Promise<boolean>;
  hent(kode: string): Promise<GemtSpil | null>;
  /**
   * Skriv spillet — men kun hvis det gemte er ældre end `version`. Så kan et
   * gammelt øjebliksbillede aldrig skrive et nyere over. Svarer om der blev skrevet.
   */
  gem(spil: Spil, version: number): Promise<boolean>;
  /** Linjer til hændelsesloggen, ældste først. */
  log(spilId: string, linjer: Haendelse[]): Promise<void>;
}
