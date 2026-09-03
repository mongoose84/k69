import { randomUUID } from 'node:crypto';
import { nytSpil, type Spil } from '@k69/rules';
import { pool } from './db.js';

/**
 * Spillene ligger i hukommelsen mens de er i gang og skrives til Postgres med
 * en kort forsinkelse. Det er nødvendigt fordi tårnet fyldes med mange små
 * opdateringer i sekundet — de skal ikke koste en transaktion hver.
 *
 * Forudsætningen er én API-instans pr. database. Skal der skaleres vandret,
 * er det her LISTEN/NOTIFY eller en delt cache skal ind.
 */
interface Post {
  spil: Spil;
  version: number;
  snavset: boolean;
  gemmer: NodeJS.Timeout | null;
  sidstRoert: number;
}

const cache = new Map<string, Post>();
const koder = new Map<string, string>(); // kode -> id

const GEM_FORSINKELSE = 400;
const UDLOEB = 1000 * 60 * 60 * 12;

/** Læsevenlig kode uden de tegn der kan forveksles i en delt url. */
const BOGSTAVER = 'ABCDEFGHJKLMNPQRSTUVXYZ23456789';

function nyKode(): string {
  let ud = '';
  for (let i = 0; i < 5; i++) {
    ud += BOGSTAVER[Math.floor(Math.random() * BOGSTAVER.length)];
  }
  return ud;
}

export async function opretSpil(): Promise<Spil> {
  for (let forsoeg = 0; forsoeg < 12; forsoeg++) {
    const kode = nyKode();
    const id = randomUUID();
    const spil = nytSpil(id, kode, new Date().toISOString());
    try {
      await pool.query(
        'insert into spil (id, kode, fase, tilstand, version) values ($1, $2, $3, $4, 1)',
        [id, kode, spil.fase, JSON.stringify(spil)]
      );
      cache.set(id, { spil, version: 1, snavset: false, gemmer: null, sidstRoert: Date.now() });
      koder.set(kode, id);
      return spil;
    } catch (e) {
      const kode23505 = (e as { code?: string }).code === '23505';
      if (!kode23505) throw e; // kodekollision: prøv igen
    }
  }
  throw new Error('Kunne ikke finde en ledig spilkode.');
}

export async function hentSpil(kode: string): Promise<Spil | null> {
  const nøgle = kode.trim().toUpperCase();
  const kendtId = koder.get(nøgle);
  if (kendtId) {
    const post = cache.get(kendtId);
    if (post) {
      post.sidstRoert = Date.now();
      return post.spil;
    }
  }

  const r = await pool.query<{ id: string; tilstand: Spil; version: number }>(
    'select id, tilstand, version from spil where kode = $1',
    [nøgle]
  );
  const raekke = r.rows[0];
  if (!raekke) return null;

  const post: Post = {
    spil: raekke.tilstand,
    version: raekke.version,
    snavset: false,
    gemmer: null,
    sidstRoert: Date.now()
  };
  cache.set(raekke.id, post);
  koder.set(nøgle, raekke.id);
  return post.spil;
}

/** Marker et spil som ændret. Selve skrivningen samles op kort efter. */
export function gem(spil: Spil, straks = false): void {
  const post = cache.get(spil.id);
  if (!post) return;
  post.spil = spil;
  post.snavset = true;
  post.sidstRoert = Date.now();

  if (straks) {
    if (post.gemmer) clearTimeout(post.gemmer);
    post.gemmer = null;
    void skriv(spil.id);
    return;
  }
  if (post.gemmer) return;
  post.gemmer = setTimeout(() => {
    post.gemmer = null;
    void skriv(spil.id);
  }, GEM_FORSINKELSE);
}

async function skriv(id: string): Promise<void> {
  const post = cache.get(id);
  if (!post || !post.snavset) return;
  post.snavset = false;
  post.version += 1;
  try {
    await pool.query(
      'update spil set tilstand = $2, fase = $3, version = $4, opdateret = now() where id = $1',
      [id, JSON.stringify(post.spil), post.spil.fase, post.version]
    );
  } catch (e) {
    post.snavset = true;
    console.error('kunne ikke gemme spil', id, e);
  }
}

/** Skriv en hændelse til loggen. Fejler den, går spillet videre alligevel. */
export function logHaendelse(
  spilId: string,
  slags: string,
  tekst: string,
  spillerId?: string
): void {
  pool
    .query(
      'insert into haendelser (spil_id, spiller_id, slags, tekst) values ($1, $2, $3, $4)',
      [spilId, spillerId ?? null, slags, tekst]
    )
    .catch((e) => console.error('kunne ikke logge hændelse', e));
}

/** Ryd spil ud af hukommelsen når ingen har rørt dem i et halvt døgn. */
export function startOprydning(): NodeJS.Timeout {
  return setInterval(() => {
    const nu = Date.now();
    for (const [id, post] of cache) {
      if (nu - post.sidstRoert < UDLOEB) continue;
      if (post.snavset) void skriv(id);
      koder.delete(post.spil.kode);
      cache.delete(id);
    }
  }, 1000 * 60 * 10);
}

export async function skrivAlleNu(): Promise<void> {
  await Promise.all([...cache.keys()].map((id) => skriv(id)));
}
