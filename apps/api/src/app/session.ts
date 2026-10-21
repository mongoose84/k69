import { createHash, randomBytes } from 'node:crypto';
import type { Spil } from '@k69/rules';

/**
 * Hvem er hvem ved bordet. `spillerId` er offentlig — alle klienter ser alle
 * id'er — så den beviser ingenting. Det gør sessionsnøglen: en hemmelighed
 * klienten har, og som serveren kun gemmer som hash i spillet. Hvilken
 * spiller en nøgle hører til, afgør altid serveren.
 */

export interface Identitet {
  spillerId: string;
  token: string;
  tokenHash: string;
  /** Spillet med nøglen bundet, når den skal gemmes nu — ellers null. */
  bundet: Spil | null;
}

/** 32 tilfældige bytes i base64url. Klienten laver sin egen, så to faner deler den fra start. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function nyToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashAf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function medSession(spil: Spil, tokenHash: string, spillerId: string): Spil {
  return { ...spil, sessioner: { ...spil.sessioner, [tokenHash]: spillerId } };
}

/**
 * Genkend den der siger hej. En kendt nøgle giver sin spiller. Ellers er man
 * ny — med én undtagelse: en klient fra før nøglerne kan gøre krav på sin
 * gamle plads med sit `spillerId`, men kun hvis ingen nøgle peger på den
 * endnu. Derefter er den plads låst til nøglen.
 */
export function genkend(spil: Spil, token: unknown, gammeltId: unknown, nytId: () => string): Identitet {
  const sessioner = spil.sessioner ?? {};

  const gyldig = typeof token === 'string' && TOKEN.test(token);
  if (gyldig) {
    const tokenHash = hashAf(token);
    const spillerId = Object.hasOwn(sessioner, tokenHash) ? sessioner[tokenHash] : undefined;
    if (spillerId) return { spillerId, token, tokenHash, bundet: null };
  }

  // En ukendt nøgle er kun klientens egen hemmelighed — den beviser ikke noget,
  // men den må gerne blive ved med at være hans.
  const ny = gyldig ? token : nyToken();
  const tokenHash = hashAf(ny);

  const kanKraeves = typeof gammeltId === 'string'
    && spil.spillere.some((s) => s.id === gammeltId)
    && !Object.values(sessioner).includes(gammeltId);
  if (kanKraeves) {
    return { spillerId: gammeltId, token: ny, tokenHash, bundet: medSession(spil, tokenHash, gammeltId) };
  }

  // Bindes først når man joiner — tilskuere skal ikke fylde i spillet.
  return { spillerId: nytId(), token: ny, tokenHash, bundet: null };
}
