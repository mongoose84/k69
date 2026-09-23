import type { CSSProperties, JSX } from 'react';
import type { Haendelse, Spil } from '@k69/rules';
import { Elefant } from './Elefant.js';

/**
 * De sidste tre ting der er sket. Et rent terningslag der straks efterfølges
 * af en landing fra samme spiller, springes over — landingen siger det samme.
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

function Linjer({ linjer }: { linjer: Haendelse[] }): JSX.Element {
  return (
    <>
      {linjer.map((h) => (
        <span key={h.id} className="nyhed">
          <span className="nyhed-prik" style={{ background: h.farve ?? 'var(--line-2)' }} />
          {h.tekst}
        </span>
      ))}
    </>
  );
}

/**
 * Breaking News hen over toppen af pladen: de sidste tre hændelser ruller
 * forbi, den nyeste først. Teksten ligger to gange efter hinanden, så rullet
 * kan køre i ring uden hop. Når der sker noget nyt, starter den forfra.
 */
export function SenesteHaendelser({ spil, kompakt = false }: { spil: Spil; kompakt?: boolean }): JSX.Element | null {
  const linjer = seneste(spil.log);
  if (!linjer.length) return null;
  const tegn = linjer.reduce((n, h) => n + h.tekst.length, 0);
  // Omtrent samme læsefart uanset hvor meget der står.
  const fart = { '--nyhed-tid': `${Math.max(12, Math.round(tegn / 7))}s` } as CSSProperties;

  return (
    <div className={`nyheder${kompakt ? ' nyheder-mobil' : ''}`} role="marquee" aria-live="polite" aria-label="Seneste nyt">
      <div className="nyheder-maerke">
        <Elefant str={kompakt ? 30 : 34} />
        <span className="nyheder-live" />
        {kompakt ? 'Breaking' : 'Breaking News'}
      </div>
      <div className="nyheder-vindue">
        <div key={linjer[0]!.id} className="nyheder-baand" style={fart}>
          <div className="nyheder-kopi"><Linjer linjer={linjer} /></div>
          <div className="nyheder-kopi" aria-hidden="true"><Linjer linjer={linjer} /></div>
        </div>
      </div>
    </div>
  );
}
