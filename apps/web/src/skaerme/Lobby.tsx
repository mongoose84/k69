import { useState, type JSX } from 'react';
import { Brik, DRIK_NAVN, Maerkat } from '@k69/ui';
import type { Handling, Spil } from '@k69/rules';
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
    <div className="lobby">
      <header className="topbar">
        <div className="mark" style={{ fontSize: 30 }}>K69</div>
        <div className="kode-chip"><span>SPIL</span><b>{spil.kode}</b></div>
        <div style={{ flexGrow: 1 }} />
        <div className="note">Venter på spillere · brættet er klar</div>
      </header>

      <div className="lobby-grid">
        <section className="lobby-kol">
          <div>
            <div className="eyebrow">Inden I går i gang</div>
            <h1 style={{ fontSize: 40, marginTop: 14 }}>Del linket i gruppen</h1>
            <p className="note" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 14, maxWidth: 460 }}>
              Alle der åbner linket skriver bare et navn og vælger en brik. Ingen konto, ingen kode i
              mailen. Værten starter spillet når I er klar.
            </p>
          </div>

          <div className="linkboks">
            <span>{url}</span>
            <button className="knap" style={{ minHeight: 62, borderRadius: 0, borderWidth: '0 0 0 1px' }} onClick={() => void kopier()}>
              {kopieret ? 'Kopieret' : 'Kopiér'}
            </button>
          </div>

          <div className="kodekort">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Eller skriv koden på forsiden</div>
              <div className="kodetal">{spil.kode}</div>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Ved bordet · {spil.spillere.length} af 8
            </div>
            <div className="liste">
              {spil.spillere.map((s) => (
                <div key={s.id} className="raekke">
                  <Brik navn={s.navn} farve={s.farve} str={36} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{s.navn}</div>
                    <div className="note">{DRIK_NAVN[s.drik]}</div>
                  </div>
                  {s.id === spil.vaertId && <Maerkat>VÆRT</Maerkat>}
                  {s.id === migId && <Maerkat farve="var(--sage)">DIG</Maerkat>}
                  {!s.tilsluttet && <Maerkat farve="var(--ink-faint)">VÆK</Maerkat>}
                </div>
              ))}
              {spil.spillere.length < 8 && (
                <div className="raekke raekke-tom">
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px dashed var(--line-2)' }} />
                  <span style={{ fontSize: 14.5 }}>Venter på flere…</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lobby-kol lobby-hoejre">
          <div>
            <div className="eyebrow">Husregler</div>
            <h2 style={{ fontSize: 32, marginTop: 14 }}>Sådan spiller I</h2>
          </div>

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
                onClick={() => send({ type: 'saet-indstilling', hardcore: !spil.indstillinger.hardcore })}
              >
                <span />
              </button>
            </div>

            <div className="valg-r">
              <div>
                <div className="valg-t">Slurke for at tabe en Meier</div>
                <div className="valg-d">
                  Reglerne siger bare “drikker” — her sætter I tallet. Dobbelt hvis der tabes på en Meyer.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="knap"
                  style={{ minHeight: 38, width: 38, padding: 0 }}
                  disabled={!erVaert || spil.indstillinger.meierSlurke <= 1}
                  onClick={() => send({ type: 'saet-indstilling', meierSlurke: spil.indstillinger.meierSlurke - 1 })}
                >
                  −
                </button>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 22, width: 24, textAlign: 'center' }}>
                  {spil.indstillinger.meierSlurke}
                </span>
                <button
                  className="knap"
                  style={{ minHeight: 38, width: 38, padding: 0 }}
                  disabled={!erVaert || spil.indstillinger.meierSlurke >= 10}
                  onClick={() => send({ type: 'saet-indstilling', meierSlurke: spil.indstillinger.meierSlurke + 1 })}
                >
                  +
                </button>
              </div>
            </div>

            <div className="valg-r" style={{ borderBottom: 'none' }}>
              <div>
                <div className="valg-t">Reglerne håndhæves</div>
                <div className="valg-d">
                  Serveren holder styr på turen: du kan ikke hoppe ud som Bier Meister eller med øl i
                  tårnet, og din tur springes over mens du tømmer det.
                </div>
              </div>
              <Maerkat farve="var(--sage)">ALTID</Maerkat>
            </div>
          </div>

          <div style={{ flexGrow: 1 }} />

          {erVaert ? (
            <button
              className="knap knap-primaer"
              style={{ minHeight: 58 }}
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
    </div>
  );
}
