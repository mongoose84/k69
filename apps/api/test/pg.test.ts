import assert from 'node:assert/strict';
import test from 'node:test';

import { nytSpil } from '@k69/rules';

/**
 * Mod en rigtig Postgres: migrationerne og versionsvagten i SQL'en. Kører kun
 * når DATABASE_URL er sat — i CI er der en database med, lokalt fx
 * `docker run -e POSTGRES_PASSWORD=k69 -p 55432:5432 postgres:17-alpine`.
 */
const url = process.env.DATABASE_URL;

test('PgSpilRepo mod Postgres', { skip: url ? false : 'DATABASE_URL er ikke sat' }, async (t) => {
  const { migrer, pool } = await import('../src/infra/db.js');
  const { PgSpilRepo } = await import('../src/infra/PgSpilRepo.js');
  t.after(() => pool.end());

  await migrer();
  assert.deepEqual(await migrer(), [], 'anden gang er der intet at køre');

  const repo = new PgSpilRepo(pool);
  const kode = 'T' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const spil = nytSpil(crypto.randomUUID(), kode, new Date().toISOString());

  await t.test('opret, og samme kode igen giver false', async () => {
    assert.equal(await repo.opret(spil), true);
    assert.equal(await repo.opret({ ...spil, id: crypto.randomUUID() }), false);
    assert.deepEqual((await repo.hent(kode))?.version, 1);
  });

  await t.test('versionsvagten: et ældre billede skriver aldrig et nyere over', async () => {
    assert.equal(await repo.gem({ ...spil, runde: 5 }, 5), true);
    assert.equal(await repo.gem({ ...spil, runde: 4 }, 4), false);
    assert.equal(await repo.gem({ ...spil, runde: 9 }, 5), false);
    const gemt = await repo.hent(kode);
    assert.equal(gemt?.version, 5);
    assert.equal(gemt?.spil.runde, 5);
  });

  await t.test('loglinjer gemmes med data, i den rækkefølge de kom', async () => {
    await repo.log(spil.id, [
      { id: 1, tid: 'nu', spillerId: 'p0', data: { type: 'slag', spillerId: 'p0', slag: 4 } },
      { id: 2, tid: 'nu', data: { type: 'gammel', slags: 'join', tekst: 'fra før' } }
    ]);
    const r = await pool.query<{ slags: string; tekst: string | null; spiller_id: string | null; data: unknown }>(
      'select slags, tekst, spiller_id, data from haendelser where spil_id = $1 order by id',
      [spil.id]
    );
    assert.deepEqual(r.rows, [
      { slags: 'slag', tekst: null, spiller_id: 'p0', data: { type: 'slag', spillerId: 'p0', slag: 4 } },
      { slags: 'gammel', tekst: 'fra før', spiller_id: null, data: { type: 'gammel', slags: 'join', tekst: 'fra før' } }
    ]);
  });

  await pool.query('delete from spil where id = $1', [spil.id]);
});
