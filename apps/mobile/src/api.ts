/**
 * API'ets base-adresse findes i denne rækkefølge: config.js (skrevet af
 * entrypoint-scriptet i containeren, så VITE_API_URL kan styres ved køretid
 * uden at bygge imaget forfra), derefter VITE_API_URL fra byggeriet, og til
 * sidst samme origin — i udvikling og i Docker går /api og /ws gennem proxien
 * på samme origin.
 */

declare global {
  interface Window {
    __K69_CONFIG__?: { apiUrl?: string };
  }
}

export const API = (
  window.__K69_CONFIG__?.apiUrl ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  window.location.origin
).replace(/\/$/, '');

export function spilUrl(kode: string): string {
  return `${window.location.origin}/spil/${kode}`;
}
