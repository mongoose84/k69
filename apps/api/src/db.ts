import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HER = dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://k69:k69@localhost:5432/k69',
  max: Number(process.env.PG_POOL_MAX ?? 10)
});

/** Postgres skal være oppe før vi kan noget som helst — vent på den. */
export async function ventPaaDb(forsoeg = 30): Promise<void> {
  for (let i = 1; i <= forsoeg; i++) {
    try {
      await pool.query('select 1');
      return;
    } catch (e) {
      if (i === forsoeg) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Kører de SQL-filer i migrations/ der ikke er kørt før, i navnerækkefølge.
 * Bevidst uden ORM: skemaet er lille nok til at være læsbart som SQL.
 */
export async function migrer(): Promise<string[]> {
  await pool.query(`
    create table if not exists migrationer (
      navn text primary key,
      koert_kl timestamptz not null default now()
    )
  `);

  const mappe = join(HER, 'migrations');
  const filer = (await readdir(mappe)).filter((f) => f.endsWith('.sql')).sort();
  const koert = new Set(
    (await pool.query<{ navn: string }>('select navn from migrationer')).rows.map((r) => r.navn)
  );

  const nye: string[] = [];
  for (const fil of filer) {
    if (koert.has(fil)) continue;
    const sql = await readFile(join(mappe, fil), 'utf8');
    const klient = await pool.connect();
    try {
      await klient.query('begin');
      await klient.query(sql);
      await klient.query('insert into migrationer (navn) values ($1)', [fil]);
      await klient.query('commit');
      nye.push(fil);
    } catch (e) {
      await klient.query('rollback');
      throw e;
    } finally {
      klient.release();
    }
  }
  return nye;
}
