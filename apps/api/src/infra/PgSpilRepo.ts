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
    // Hændelsen selv ligger i data; slags er dens type, så loggen kan søges uden
    // at pakke JSON ud. Kun linjer fra før strukturen har en tekst.
    const raekker = linjer.map((h, i) => {
      const tekst = h.data.type === 'gammel' ? h.data.tekst : null;
      vaerdier.push(spilId, h.spillerId ?? null, h.data.type, tekst, JSON.stringify(h.data));
      const p = i * 5;
      return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5})`;
    });
    await this.pool.query(
      `insert into haendelser (spil_id, spiller_id, slags, tekst, data) values ${raekker.join(', ')}`,
      vaerdier
    );
  }
}
