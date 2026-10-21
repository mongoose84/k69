import type { JSX } from 'react';
import type { KlientHandling, Spil } from '@k69/rules';
import { Brik } from './Dele.js';

/**
 * Dem der vil med midt i spillet. Kun værten ser kortet — og kun værten kan
 * lukke ind. Det ligger i et hjørne og venter, så det ikke stopper spillet.
 */
export function AnmodningKort({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: KlientHandling) => void;
}): JSX.Element | null {
  const anmodninger = spil.anmodninger ?? [];
  if (spil.vaertId !== migId || anmodninger.length === 0) return null;

  return (
    <aside className="anmodning-kort" aria-live="polite" aria-label="Vil med i spillet">
      <div className="eyebrow">Vil med i spillet</div>
      {anmodninger.map((a) => (
        <div key={a.spillerId} className="anmodning-linje">
          <Brik navn={a.navn} farve={a.farve} str={28} />
          <span className="anmodning-navn">{a.navn}</span>
          <button className="knap knap-primaer" onClick={() => send({ type: 'godkend-join', spillerId: a.spillerId, ja: true })}>
            Luk ind
          </button>
          <button className="knap" onClick={() => send({ type: 'godkend-join', spillerId: a.spillerId, ja: false })}>
            Nej
          </button>
        </div>
      ))}
      <div className="note">Du er vært — kun du kan lukke nye ind.</div>
    </aside>
  );
}
