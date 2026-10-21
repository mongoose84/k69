/**
 * Tid og ure, sprøjtet ind ligesom terningen i motoren — så serverens ure kan
 * prøves af uden at vente på dem.
 */
export interface Klokke {
  nu(): number;
  efter(ms: number, fn: () => void): Ur;
  stop(ur: Ur): void;
}

export type Ur = { readonly __ur: unique symbol };

export const systemKlokke: Klokke = {
  nu: () => Date.now(),
  efter: (ms, fn) => setTimeout(fn, ms) as unknown as Ur,
  stop: (ur) => clearTimeout(ur as unknown as NodeJS.Timeout)
};
