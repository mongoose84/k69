import { useEffect, useState, type JSX } from 'react';
import type { Fejring, Spil } from '@k69/rules';
import { Brik } from './Dele.js';

/** Så længe bliver fejringen stående, hvis ingen trykker den væk. */
export const FEJRING_MS = 5000;

const ART_TEKST: Record<Fejring['art'], string> = {
  kaploeb: 'Kapløb',
  emne: 'Emne',
  overloeb: 'Øl i tårnet',
  krone: '2-krone'
};

/**
 * Øjeblikket der skal have lov at stå: et stort kort hen over pladen, som
 * bliver stående i fem sekunder eller til nogen trykker. Messing når nogen
 * vandt, rust når nogen tabte — samme greb som Meier-fejringen.
 */
export function FejringKort({ spil, kompakt = false }: { spil: Spil; kompakt?: boolean }): JSX.Element | null {
  const f = spil.fejring;
  // Den fejring der allerede lå der da man kom ind, er gammel — den skal ikke op igen ved en genindlæsning.
  const [kvitteret, saetKvitteret] = useState<number | null>(() => spil.fejring?.id ?? null);
  const vis = Boolean(f) && f!.id !== kvitteret;

  useEffect(() => {
    if (!vis || !f) return;
    const t = setTimeout(() => saetKvitteret(f.id), FEJRING_MS);
    return () => clearTimeout(t);
  }, [vis, f]);

  if (!vis || !f) return null;

  const vinder = spil.spillere.find((s) => s.id === f.vinderId);
  const taber = spil.spillere.find((s) => s.id === f.taberId);
  const vundet = Boolean(vinder);
  const hoved = vinder ?? taber;
  const naaede = f.naaedeIds.map((id) => spil.spillere.find((s) => s.id === id)).filter(Boolean);
  const ikkeNaaede = f.art === 'kaploeb'
    ? spil.spillere.filter((s) => s.tilstand === 'aktiv' && !f.naaedeIds.includes(s.id))
    : [];

  return (
    <div
      className={`fejring${kompakt ? ' fejring-mobil' : ''}`}
      role="status"
      onClick={() => saetKvitteret(f.id)}
    >
      <div key={f.id} className={`fejring-kort ${vundet ? 'fejring-vundet' : 'fejring-tabt'}`}>
        <div className="fejring-band">
          <span className="fejring-prik" />
          <span className="eyebrow">{ART_TEKST[f.art]}</span>
          <span className="fejring-band-h">{vundet ? 'Vundet' : 'Tabt'}</span>
        </div>
        <div className="fejring-glorie" />
        {hoved && (
          <div className={`fejring-brik${vundet ? ' fejring-brik-hopper' : ''}`}>
            <Brik navn={hoved.navn} farve={hoved.farve} str={kompakt ? 68 : 84} />
          </div>
        )}
        <div className="fejring-titel">{f.titel}</div>
        <div className="fejring-under">{f.tekst}</div>
        {f.art === 'kaploeb' ? (
          <div className="fejring-brikker">
            {naaede.map((s) => <Brik key={s!.id} navn={s!.navn} farve={s!.farve} str={28} />)}
            {ikkeNaaede.map((s) => (
              <span key={s.id} style={{ opacity: 0.35 }}><Brik navn={s.navn} farve={s.farve} str={28} /></span>
            ))}
          </div>
        ) : (
          <div className="fejring-tal">
            {f.slurke} <span>{f.slurke === 1 ? 'slurk' : 'slurke'}{taber && f.vinderId ? ` til ${taber.navn}` : ''}</span>
          </div>
        )}
        <div className="fejring-bjaelke"><i /></div>
        <div className="fejring-naeste">Videre om 5 s · eller tryk hvor som helst</div>
      </div>
    </div>
  );
}
