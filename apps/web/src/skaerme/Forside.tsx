import { useState, type JSX } from 'react';
import { BRAET_STR, BraetDefs, BraetPlade, opretSpil, slaaOpSpil } from '@k69/ui';
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
    <div className="forside">
      <section className="hero">
        <svg className="hero-art" viewBox={`0 0 ${BRAET_STR.w} ${BRAET_STR.h}`} aria-hidden="true">
          <BraetDefs id="f" />
          <BraetPlade id="f" brikker={[]} taarnAndel={0.4} />
        </svg>
        <div className="hero-slør" />
        <div className="hero-tekst">
          <div className="mark" style={{ fontSize: 124, lineHeight: 0.86 }}>K69</div>
          <p className="hero-lead">Brættet fra Tinglev. 38 felter, ét tårn og en pit der gør ondt.</p>
          <p className="hero-kicker">
            Ingen konto og ingen kode i mailen. Start et spil, del linket i gruppen, og skriv jeres
            navne når I kommer ind. Brættet, terningen, kortbunken, Meyer-bægeret og tårnet er med —
            resten drikker I selv.
          </p>
        </div>
        <div className="hero-tal">
          <div><b>38</b><span>Felter</span></div>
          <div><b>6</b><span>Pladser i pitten</span></div>
          <div><b>1—8</b><span>Spillere</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="faner">
          <button className={fane === 'ny' ? 'fane fane-paa' : 'fane'} onClick={() => saetFane('ny')}>
            Start nyt spil
          </button>
          <button className={fane === 'join' ? 'fane fane-paa' : 'fane'} onClick={() => saetFane('join')}>
            Join med kode
          </button>
        </div>

        {fane === 'ny' ? (
          <>
            <p className="note" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              Du får et link du kan dele. Alle der åbner det skriver bare et navn, vælger en brik og
              hvad de drikker — så er de med.
            </p>
            <button className="knap knap-primaer" style={{ minHeight: 58 }} disabled={travl} onClick={() => void start()}>
              {travl ? 'Opretter…' : 'Opret spil og få et link'}
            </button>
          </>
        ) : (
          <>
            <label className="mærke" htmlFor="kode">Spilkode</label>
            <input
              id="kode"
              type="text"
              value={kode}
              maxLength={8}
              placeholder="FX K7M2Q"
              style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'var(--serif)', fontSize: 24 }}
              onChange={(e) => saetKode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void join()}
            />
            <button className="knap knap-primaer" style={{ minHeight: 58 }} disabled={travl || !kode.trim()} onClick={() => void join()}>
              {travl ? 'Kigger efter…' : 'Find spillet'}
            </button>
          </>
        )}

        {fejl && <div className="fejltekst">{fejl}</div>}

        <div className="note">
          Alle skal have en øl eller et glas klar. Stil de 6 shotglas i pitten og tårnet midt på bordet.
        </div>
      </section>
    </div>
  );
}
