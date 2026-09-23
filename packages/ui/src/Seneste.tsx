import type { JSX } from 'react';
import type { Haendelse, Spil } from '@k69/rules';

/**
 * De sidste tre ting der er sket, lagt hen over pladen, så man kan følge med
 * uden at åbne loggen. Et rent terningslag der straks efterfølges af en
 * landing fra samme spiller, springes over — landingen siger det samme.
 */
export function seneste(log: Haendelse[], antal = 3): Haendelse[] {
  const ud: Haendelse[] = [];
  for (let i = 0; i < log.length && ud.length < antal; i++) {
    const h = log[i]!;
    const nyere = log[i - 1];
    if (h.slags === 'slag' && nyere?.slags === 'landing' && nyere.spillerId === h.spillerId) continue;
    ud.push(h);
  }
  return ud;
}

export function SenesteHaendelser({ spil, kompakt = false }: { spil: Spil; kompakt?: boolean }): JSX.Element | null {
  const linjer = seneste(spil.log);
  if (!linjer.length) return null;
  return (
    <div className={`seneste${kompakt ? ' seneste-mobil' : ''}`} aria-live="polite">
      {linjer.map((h) => (
        <div key={h.id} className="seneste-linje">
          <span className="seneste-prik" style={{ background: h.farve ?? 'var(--line-2)' }} />
          <span>{h.tekst}</span>
        </div>
      ))}
    </div>
  );
}
