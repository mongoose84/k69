import type { JSX } from 'react';
import type { Haendelse, Spil } from '@k69/rules';

export interface Tur {
  tur: number;
  /** Hvis tur det var. */
  spillerId: string;
  /** Turens hændelser, ældste først. */
  linjer: Haendelse[];
}

/**
 * De sidste ture, den nyeste først. Et rent terningslag der straks efterfølges
 * af en landing fra samme spiller, springes over — landingen siger det samme.
 */
export function senesteTure(log: Haendelse[], antal = 3): Tur[] {
  const ud: Tur[] = [];
  for (let i = 0; i < log.length; i++) {
    const h = log[i]!;
    if (h.tur === undefined || h.turAf === undefined) continue;
    const nyere = log[i - 1];
    if (h.slags === 'slag' && nyere?.slags === 'landing' && nyere.spillerId === h.spillerId) continue;

    let tur = ud[ud.length - 1];
    if (tur?.tur !== h.tur) {
      if (ud.length === antal) break;
      tur = { tur: h.tur, spillerId: h.turAf, linjer: [] };
      ud.push(tur);
    }
    tur.linjer.unshift(h);
  }
  return ud;
}

/** Hvad der er sket de sidste tre ture, én linje pr. tur. */
export function SenesteTure({ spil }: { spil: Spil }): JSX.Element | null {
  const ture = senesteTure(spil.log);
  if (!ture.length) return null;

  return (
    <div className="ture" aria-live="polite" aria-label="Seneste ture">
      {ture.map((t) => {
        const s = spil.spillere.find((o) => o.id === t.spillerId);
        return (
          <div key={t.tur} className="tur">
            <span className="tur-prik" style={{ background: s?.farve ?? 'var(--line-2)' }} />
            <div>
              <div className="tur-navn">{s?.navn ?? 'Ukendt'}</div>
              <div className="tur-tekst">{t.linjer.map((h) => h.tekst).join(' ')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
