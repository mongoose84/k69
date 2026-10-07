import { useState, type JSX } from 'react';
import { Brik, Elefant, Maerkat, Maerke } from '@k69/ui';
import { MEIER_SLURKE, formatProcent, type KlientHandling, type Spil } from '@k69/rules';
import { spilUrl } from '../api.js';
import { VERSION } from '../version.js';

export function Lobby({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: KlientHandling) => void;
}): JSX.Element {
  const [kopieret, saetKopieret] = useState(false);
  const erVaert = spil.vaertId === migId;
  const url = spilUrl(spil.kode);

  const kopier = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      saetKopieret(true);
      setTimeout(() => saetKopieret(false), 2200);
    } catch {
      /* uden udklipsholder må man markere selv */
    }
  };

  return (
    <div className="plakat grund">
      <Elefant className="plakat-elefant lobby-elefant" str={220} />

      <header className="plakat-top">
        <Maerke version={VERSION} />
        <span className="pille">Lobby</span>
      </header>

      <section className="lobby-venstre">
        <h1>Del linket.<br />Hent glassene.</h1>
        <p className="lead">
          Alle der åbner linket skriver bare et navn og vælger en brik. Ingen konto, ingen kode i
          mailen. Værten starter spillet når I er klar.
        </p>

        <div className="linkboks">
          <span>{url}</span>
          <button className="knap knap-primaer" onClick={() => void kopier()}>
            {kopieret ? 'Kopieret' : 'Kopiér'}
          </button>
        </div>

        <div className="koderaekke">
          <span className="eyebrow">Eller skriv koden på forsiden</span>
          <span className="kodetal">{spil.kode}</span>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Ved bordet · {spil.spillere.length} af 8
          </div>
          <div className="spillerkort">
            {spil.spillere.map((s) => (
              <div key={s.id} className="raekke">
                <Brik navn={s.navn} farve={s.farve} str={34} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{s.navn}</div>
                  <div className="note">{s.drik.navn} · {s.drik.enhedCl} cl · {formatProcent(s.drik)}</div>
                </div>
                {s.id === spil.vaertId && <Maerkat fyldt>VÆRT</Maerkat>}
                {s.id === migId && <Maerkat>DIG</Maerkat>}
                {!s.tilsluttet && <Maerkat>OFFLINE</Maerkat>}
              </div>
            ))}
            {spil.spillere.length < 8 && (
              <div className="raekke raekke-tom">
                <i />
                <span>Venter på flere…</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="papir lobby-panel">
        <div className="eyebrow">Husregler</div>
        <h2>Sådan spiller I</h2>

        <div className="valg">
          <div className="valg-r">
            <div>
              <div className="valg-t">Hardcore</div>
              <div className="valg-d">
                Ikke flere slurke — bare sværere at slippe ud. Man kan kun hoppe ud fra et blankt
                felt. Skal aftales fra begyndelsen.
              </div>
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

          <div className="valg-r">
            <div>
              <div className="valg-t">Slurke for at tabe en Meier</div>
              <div className="valg-d">
                Taberen drikker {MEIER_SLURKE} — også i hardcore. Dobbelt hvis der tabes på en Meyer.
              </div>
            </div>
            <span className="valg-tal">{MEIER_SLURKE}</span>
          </div>
        </div>

        <div style={{ flexGrow: 1, minHeight: 16 }} />

        {erVaert ? (
          <button
            className="knap knap-primaer"
            disabled={spil.spillere.length < 1}
            onClick={() => send({ type: 'start' })}
          >
            Start spillet
          </button>
        ) : (
          <div className="note" style={{ textAlign: 'center' }}>
            Venter på at {spil.spillere.find((s) => s.id === spil.vaertId)?.navn ?? 'værten'} starter.
          </div>
        )}
      </section>
    </div>
  );
}
