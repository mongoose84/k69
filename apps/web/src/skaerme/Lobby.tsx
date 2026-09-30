import { useState, type JSX } from 'react';
import { Brik, Elefant, Maerkat } from '@k69/ui';
import { MEIER_SLURKE, formatProcent, type Handling, type Spil } from '@k69/rules';
import { spilUrl } from '../api.js';

export function Lobby({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: Handling) => void;
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
    <div className="plakat lobby">
      <Elefant className="elefant-stor lobby-elefant" str={220} />

      <header className="plakat-top">
        <div className="mark" style={{ fontSize: 28 }}>K69</div>
        <span className="pille">Lobby</span>
        <span className="pille">Spil {spil.kode}</span>
      </header>

      <section className="lobby-kol">
        <h1>Del linket.<br />Hent glassene.</h1>
        <p className="lead">
          Alle der åbner linket skriver bare et navn og vælger en brik. Ingen konto, ingen kode i
          mailen. Værten starter spillet når I er klar.
        </p>

        <div className="linkboks">
          <span>{url}</span>
          <button onClick={() => void kopier()}>{kopieret ? 'Kopieret' : 'Kopiér'}</button>
        </div>

        <div className="kodekort">
          <span className="eyebrow">Eller skriv koden på forsiden</span>
          <span className="kodetal">{spil.kode}</span>
        </div>

        <div>
          <div className="eyebrow" style={{ color: '#0f1821', fontSize: 12, marginBottom: 10 }}>
            Ved bordet · {spil.spillere.length} af 8
          </div>
          <div className="liste-to">
            {spil.spillere.map((s) => (
              <div key={s.id} className="raekke">
                <Brik navn={s.navn} farve={s.farve} str={34} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div className="raekke-navn">{s.navn}</div>
                  <div className="raekke-under">{s.drik.navn} · {s.drik.enhedCl} cl · {formatProcent(s.drik)}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {s.id === spil.vaertId && <Maerkat art="fyldt">VÆRT</Maerkat>}
                  {s.id === migId && <Maerkat>DIG</Maerkat>}
                  {!s.tilsluttet && <Maerkat art="daempet">OFFLINE</Maerkat>}
                </div>
              </div>
            ))}
            {spil.spillere.length < 8 && (
              <div className="raekke raekke-tom">
                <div style={{ width: 34, height: 34, flex: '0 0 34px', borderRadius: '50%', border: '2px dashed #1b2733' }} />
                <span style={{ fontSize: 15 }}>Venter på flere…</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="papir lobby-hoejre">
        <div className="eyebrow">Husregler</div>
        <h2>Sådan spiller I</h2>

        <div className="valg">
          <div className="valg-r">
            <div>
              <div className="valg-t">Hardcore</div>
              <div className="valg-d">
                Straf for alle tegn på stivhed. Man kan kun hoppe ud fra et blankt felt. Skal
                aftales fra begyndelsen.
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

          <div className="valg-r">
            <div>
              <div className="valg-t">Reglerne håndhæves</div>
              <div className="valg-d">
                Serveren holder styr på turen: du kan ikke hoppe ud som Bier Meister eller med øl i
                tårnet, og de ramte slår selv om deres plads i pitten. Har du tårnet, spiller du med imens.
              </div>
            </div>
            <Maerkat>ALTID</Maerkat>
          </div>
        </div>

        <div style={{ flexGrow: 1, minHeight: 16 }} />

        {erVaert ? (
          <button
            className="knap knap-primaer"
            style={{ minHeight: 64, fontSize: 26, flexShrink: 0 }}
            disabled={spil.spillere.length < 1}
            onClick={() => send({ type: 'start' })}
          >
            Start spillet
          </button>
        ) : (
          <div className="note" style={{ textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
            Venter på at {spil.spillere.find((s) => s.id === spil.vaertId)?.navn ?? 'værten'} starter.
          </div>
        )}
      </section>
    </div>
  );
}
