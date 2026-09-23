import { useEffect, useState, type CSSProperties, type JSX } from 'react';
import { FELT_INFO, type Spil, type Udraab } from '@k69/rules';
import { BRIK_RYKKER_MS } from './Braet.js';
import { Brik } from './Dele.js';
import { Flitter } from './Meier.js';

/** Så længe står råbet — SKÅL og uddelinger lidt længere, frifeltet kortest. */
function visMs(art: Udraab['art']): number {
  if (art === 'skaal') return 3400;
  if (art === 'giv') return 3200;
  if (art === 'fri') return 1800;
  return 2600;
}

/** Feltets egen farve, så råbet ligner det felt man landede på. */
function accent(art: Udraab['art']): string {
  if (art === 'giv') return FELT_INFO.tre.farve;
  if (art === 'bm') return FELT_INFO.bm.fyld;
  if (art === 'drik') return '#D98279';
  return FELT_INFO[art].farve;
}

/**
 * Råbet hen over pladen: hvad der skete på det felt man landede på, eller hvem
 * der fik slurkene. Det venter til brikken er nået frem, står et par sekunder
 * og forsvinder af sig selv — spærrer ikke for handlingerne imens.
 */
export function UdraabKort({ spil, kompakt = false }: { spil: Spil; kompakt?: boolean }): JSX.Element | null {
  const u = spil.udraab ?? null;
  // Det råb der allerede lå der da man kom ind, er gammelt — det skal ikke op igen ved en genindlæsning.
  const [kvitteret, saetKvitteret] = useState<number | null>(() => u?.id ?? null);
  const [synligt, saetSynligt] = useState<number | null>(null);

  // Hver opdatering fra serveren er et nyt objekt — timerne må kun starte forfra ved et nyt råb.
  const id = u?.id ?? null;
  const art = u?.art ?? null;
  useEffect(() => {
    if (id === null || art === null || id === kvitteret) return;
    // Uddelinger sker uden at nogen rykker; landinger venter på brikken.
    const vent = art === 'giv' ? 0 : BRIK_RYKKER_MS;
    const ind = setTimeout(() => saetSynligt(id), vent);
    const ud = setTimeout(() => {
      saetSynligt(null);
      saetKvitteret(id);
    }, vent + visMs(art));
    return () => {
      clearTimeout(ind);
      clearTimeout(ud);
    };
  }, [id, art, kvitteret]);

  if (!u || synligt !== u.id) return null;

  const hvem = spil.spillere.find((s) => s.id === u.spillerId);
  const farve = accent(u.art);
  const erSkaal = u.art === 'skaal';
  const eyebrow = u.art === 'giv' ? 'Uddeling' : `${hvem?.navn ?? 'Nogen'} landede på`;

  return (
    <div className={`udraab${kompakt ? ' udraab-mobil' : ''}`} role="status" aria-live="polite">
      <div
        key={u.id}
        className={`udraab-kort udraab-${u.art}`}
        style={{ '--udraab': farve } as CSSProperties}
        onClick={() => {
          saetSynligt(null);
          saetKvitteret(u.id);
        }}
      >
        {erSkaal && <Flitter />}
        <div className="udraab-band">
          {hvem && <Brik navn={hvem.navn} farve={hvem.farve} str={26} />}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <div className="udraab-titel">{u.titel}</div>
        {u.fordeling && u.fordeling.length > 0 ? (
          <div className="udraab-fordeling">
            {u.fordeling.map((f) => {
              const s = spil.spillere.find((p) => p.id === f.spillerId);
              if (!s) return null;
              return (
                <div key={f.spillerId} className="udraab-raekke">
                  <Brik navn={s.navn} farve={s.farve} str={30} />
                  <span className="udraab-navn">{f.spillerId === u.spillerId ? `${s.navn} selv` : s.navn}</span>
                  <span className="udraab-antal">{f.antal}</span>
                  <span className="udraab-enhed">{f.antal === 1 ? 'slurk' : 'slurke'}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="udraab-tekst">{u.tekst}</div>
        )}
      </div>
    </div>
  );
}
