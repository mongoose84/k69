/**
 * I udvikling går alt gennem Vites proxy på samme origin. I Docker sætter
 * nginx /api og /ws videre til api-containeren, så samme origin holder.
 * VITE_API_URL findes for det tilfælde at backenden ligger et andet sted.
 */
export const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  ?? window.location.origin;

export function spilUrl(kode: string): string {
  return `${window.location.origin}/spil/${kode}`;
}
