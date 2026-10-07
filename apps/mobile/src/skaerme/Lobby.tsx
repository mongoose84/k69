import { useState, type JSX } from 'react';
import { Brik, Elefant, Maerkat, Maerke } from '@k69/ui';
import { formatProcent, type Handling, type Spil } from '@k69/rules';
import { spilUrl } from '../api.js';
import { VERSION } from '../version.js';

export function Lobby({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  const [kopieret, saetKopieret] = useState(false);
  const erVaert = spil.vaertId === migId;
  const url = spilUrl(spil.kode);

  const del = async (): Promise<void> => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'K69', text: 'Kom med til K69', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      saetKopieret(true);
      setTimeout(() => saetKopieret(false), 2200);
    } catch {
      /* afbrudt af brugeren */
    }
  };

  return (
    <div className="skaerm grund">
      <Elefant className="plakat-elefant mobil-elefant" str={150} />

      <header className="mobilbar">
        <Maerke version={VERSION} />
        <span className="pille" style={{ fontSize: 11, padding: '6px 11px' }}>Lobby</span>
        <span className="eyebrow" style={{ marginLeft: 6 }}>{spil.spillere.length} af 8</span>
      </header>

      <div className="rul">
        <div className="mobil-intro">
          <h1>Del linket.<br />Hent glassene.</h1>
          <p className="lead">Alle der åbner linket skriver bare et navn og vælger en brik.</p>
        </div>

        <div className="blok">
          <button className="knap knap-primaer" style={{ width: '100%', minHeight: 56 }} onClick={() => void del()}>
            {kopieret ? 'Linket er kopieret' : 'Del linket'}
          </button>
          <div className="linkboks-lille">{url}</div>
        </div>

        <div className="blok" style={{ gap: 6 }}>
          <span className="eyebrow">Eller skriv koden på forsiden</span>
          <span className="kodetal">{spil.kode}</span>
        </div>

        <div className="blok">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Ved bordet</div>
          <div className="liste">
            {spil.spillere.map((s) => (
              <div key={s.id} className="raekke">
                <Brik navn={s.navn} farve={s.farve} str={34} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{s.navn}</div>
                  <div className="note">{s.drik.navn} · {s.drik.enhedCl} cl · {formatProcent(s.drik)}</div>
                </div>
                {s.id === spil.vaertId && <Maerkat fyldt>VÆRT</Maerkat>}
                {s.id === migId && <Maerkat>DIG</Maerkat>}
              </div>
            ))}
          </div>
        </div>

        <section className="papir mobil-panel" style={{ gap: 0 }}>
          <div className="eyebrow">Husregler</div>
          <h2 style={{ fontSize: 28, margin: '6px 0 10px' }}>Sådan spiller I</h2>
          <div className="valg-r">
            <div>
              <div className="valg-t">Hardcore</div>
              <div className="valg-d">Ikke flere slurke — man kan kun hoppe ud fra et blankt felt. Aftal det fra start.</div>
            </div>
            <button
              className={spil.indstillinger.hardcore ? 'kontakt kontakt-paa' : 'kontakt'}
              disabled={!erVaert}
              aria-pressed={spil.indstillinger.hardcore}
              aria-label="Hardcore"
              onClick={() => send({ type: 'saet-indstilling', hardcore: !spil.indstillinger.hardcore })}
            >
              <span />
            </button>
          </div>
        </section>
      </div>

      <div className="ark-fast lys">
        {erVaert ? (
          <button className="knap knap-primaer" style={{ minHeight: 60, fontSize: 24 }} onClick={() => send({ type: 'start' })}>
            Start spillet
          </button>
        ) : (
          <div className="note" style={{ textAlign: 'center' }}>
            Venter på at {spil.spillere.find((s) => s.id === spil.vaertId)?.navn ?? 'værten'} starter.
          </div>
        )}
      </div>
    </div>
  );
}
