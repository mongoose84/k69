import { useState, type JSX } from 'react';
import { Elefant, opretSpil, slaaOpSpil } from '@k69/ui';
import { API } from '../api.js';

export function Forside({ onSpil }: { onSpil: (kode: string) => void }): JSX.Element {
  const [fane, saetFane] = useState<'ny' | 'join'>('ny');
  const [kode, saetKode] = useState('');
  const [travl, saetTravl] = useState(false);
  const [fejl, saetFejl] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    saetTravl(true);
    saetFejl(null);
    try {
      onSpil(await opretSpil(API));
    } catch {
      saetFejl('Kunne ikke oprette spillet. Er serveren oppe?');
    } finally {
      saetTravl(false);
    }
  };

  const join = async (): Promise<void> => {
    const k = kode.trim().toUpperCase();
    if (!k) return;
    saetTravl(true);
    saetFejl(null);
    const fundet = await slaaOpSpil(API, k);
    saetTravl(false);
    if (!fundet) {
      saetFejl('Den kode findes ikke.');
      return;
    }
    onSpil(k);
  };

  return (
    <div className="plakat forside">
      <div className="vandmaerke forside-vandmaerke" aria-hidden="true">K69</div>
      <Elefant className="elefant-stor forside-elefant" str={900} titel="Krunk-elefanten" />

      <header className="plakat-top forside-top">
        <div className="mark" style={{ fontSize: 28 }}>K69</div>
        <div className="forside-piller">
          <span className="pille">38 felter</span>
          <span className="pille">6 i pitten</span>
          <span className="pille">1–8 spillere</span>
        </div>
      </header>

      <div className="forside-venstre">
        <div className="forside-hoved">
          <h1>Ét tårn.<br />En pit der gør ondt.</h1>
          <p className="lead">
            Brættet fra Tinglev, nu i browseren. Start et spil, del linket i gruppen — resten drikker I selv.
          </p>
        </div>

        <section className="papir forside-panel">
          <div className="faner" role="tablist">
            <button role="tab" aria-selected={fane === 'ny'} className={fane === 'ny' ? 'fane fane-paa' : 'fane'} onClick={() => saetFane('ny')}>
              Start nyt spil
            </button>
            <button role="tab" aria-selected={fane === 'join'} className={fane === 'join' ? 'fane fane-paa' : 'fane'} onClick={() => saetFane('join')}>
              Deltag med kode
            </button>
          </div>

          {fane === 'ny' ? (
            <div className="forside-raekke">
              <p className="note" style={{ margin: 0, flexGrow: 1, fontSize: 13.5 }}>
                Du får et link du kan dele. Alle der åbner det skriver bare et navn, vælger en brik og
                hvad de drikker — så er de med.
              </p>
              <button className="knap knap-primaer" disabled={travl} onClick={() => void start()}>
                {travl ? 'Opretter…' : 'Opret spil og få et link'}
              </button>
            </div>
          ) : (
            <div className="forside-raekke forside-raekke-bund">
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="mærke" htmlFor="kode" style={{ margin: 0 }}>Spilkode</label>
                <input
                  id="kode"
                  type="text"
                  className="kode-input"
                  value={kode}
                  maxLength={8}
                  placeholder="FX K7M2Q"
                  onChange={(e) => saetKode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void join()}
                />
              </div>
              <button className="knap knap-primaer" disabled={travl || !kode.trim()} onClick={() => void join()}>
                {travl ? 'Kigger efter…' : 'Find spillet'}
              </button>
            </div>
          )}

          {fejl && <div className="fejltekst">{fejl}</div>}
        </section>
      </div>

      <p className="forside-fod">
        Alle skal have en øl eller et glas klar. Stil de 6 shotglas i pitten og tårnet midt på bordet.
      </p>
    </div>
  );
}
