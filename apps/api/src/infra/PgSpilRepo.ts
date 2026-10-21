import type pg from 'pg';
import type { Haendelse, Spil } from '@k69/rules';
import type { GemtSpil, SpilRepository } from '../app/SpilRepository.js';

/** Et spil er én række; hele tilstanden ligger som JSONB. Se migrations/001_init.sql. */
export class PgSpilRepo implements SpilRepository {
  constructor(private readonly pool: pg.Pool) {}

  async opret(spil: Spil): Promise<boolean> {
    try {
      await this.pool.query(
        'insert into spil (id, kode, fase, tilstand, version) values ($1, $2, $3, $4, 1)',
        [spil.id, spil.kode, spil.fase, JSON.stringify(spil)]
      );
      return true;
    } catch (e) {
      if ((e as { code?: string }).code === '23505') return false; // kodekollision
      throw e;
    }
  }

  async hent(kode: string): Promise<GemtSpil | null> {
    const r = await this.pool.query<{ tilstand: Spil; version: number }>(
      'select tilstand, version from spil where kode = $1',
      [kode]
    );
    const raekke = r.rows[0];
    return raekke ? { spil: raekke.tilstand, version: raekke.version } : null;
  }

  async gem(spil: Spil, version: number): Promise<boolean> {
    const r = await this.pool.query(
      `update spil set tilstand = $2, fase = $3, version = $4, opdateret = now()
       where id = $1 and version < $4`,
      [spil.id, JSON.stringify(spil), spil.fase, version]
    );
    return r.rowCount === 1;
  }

  async log(spilId: string, linjer: Haendelse[]): Promise<void> {
    if (linjer.length === 0) return;
    // Én indsættelse, så linjerne får id'er i den rækkefølge de kom.
    const vaerdier: unknown[] = [];
    const raekker = linjer.map((h, i) => {
      vaerdier.push(spilId, h.spillerId ?? null, h.slags, h.tekst);
      return `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`;
    });
    await this.pool.query(
      `insert into haendelser (spil_id, spiller_id, slags, tekst) values ${raekker.join(', ')}`,
      vaerdier
    );
  }
}
