import { useState, type JSX } from 'react';
import {
  Brik, DRIK_NAVN, Glas, Handlingskort, Plade, Slurkemaaler, spillerStatus, taarnFor
} from '@k69/ui';
import { formatSlurke, type Handling, type Spil } from '@k69/rules';

type Faneblad = 'tur' | 'bord' | 'log';

export function Bord({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  const [fane, saetFane] = useState<Faneblad>('tur');
  const [foelger, saetFoelger] = useState(true);

  const jeg = spil.spillere.find((s) => s.id === migId);
  const paaTur = spil.spillere[spil.turIdx];
  const bm = spil.spillere.find((s) => s.id === spil.bierMeisterId);
  const kap = spil.indstillinger.taarnKapacitet;

  const brikker = spil.spillere
    .filter((s) => s.tilstand === 'aktiv')
    .map((s) => ({
      id: s.id, navn: s.navn, farve: s.farve, felt: s.felt, pitPlads: s.pitPlads,
      erPaaTur: s.id === paaTur?.id
    }));

  // Følger man med, holder kameraet på ens egen brik — hele pladen på 390 px
  // ville gøre felteksterne ulæselige.
  const foelgFelt = jeg && jeg.pitPlads === 0 && jeg.felt > 0 ? jeg.felt : null;

  return (
    <div className="skaerm">
      <header className="mobilbar">
        <div className="mark" style={{ fontSize: 24 }}>K69</div>
        <div className="kode-lille">{spil.kode}</div>
        <div style={{ flexGrow: 1 }} />
        <div className="avatarer">
          {spil.spillere.filter((s) => s.tilstand === 'aktiv').map((s, i) => (
            <span
              key={s.id}
              className={s.id === paaTur?.id ? 'av av-paa' : 'av'}
              style={{ marginLeft: i === 0 ? 0 : -7 }}
            >
              <Brik navn={s.navn} farve={s.farve} str={28} />
            </span>
          ))}
        </div>
      </header>

      <div className="mobilplade">
        <Plade
          id="mb"
          brikker={brikker}
          aktivtFelt={paaTur && paaTur.pitPlads === 0 ? paaTur.felt : null}
          taarnAndel={spil.taarn.slurke / (kap + 3)}
          foelger={foelger}
          foelgZoom={0.82}
          foelgFelt={foelgFelt}
          visMinimap
        />
        <button
          className={foelger ? 'chip chip-paa' : 'chip'}
          onClick={() => saetFoelger((f) => !f)}
        >
          {foelger ? 'Følger min brik' : 'Overblik'}
        </button>
      </div>

      <div className="ark">
        <div className="greb" />
        <div className="faneblade">
          {(['tur', 'bord', 'log'] as Faneblad[]).map((f) => (
            <button key={f} className={fane === f ? 'fb fb-paa' : 'fb'} onClick={() => saetFane(f)}>
              {f === 'tur' ? 'Turen' : f === 'bord' ? 'Bordet' : 'Log'}
            </button>
          ))}
        </div>

        <div className="ark-krop">
          {fane === 'tur' && <Handlingskort spil={spil} migId={migId} send={send} kompakt />}

          {fane === 'bord' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Glas andel={spil.taarn.slurke / (kap + 3)} bredde={38} hoejde={62} />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--amber)' }}>
                    {formatSlurke(spil.taarn.slurke)}
                  </div>
                  <div className="note">
                    {jeg ? `${taarnFor(spil, jeg)} af din ${DRIK_NAVN[jeg.drik].toLowerCase()}` : 'i tårnet'}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="eyebrow">Bier Meister</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{bm?.navn ?? 'Ingen'}</div>
                </div>
              </div>

              <div className="liste">
                {spil.spillere.map((s) => (
                  <div key={s.id} className={s.id === paaTur?.id ? 'raekke raekke-paa' : 'raekke'}>
                    <Brik navn={s.navn} farve={s.farve} str={32} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.navn}</div>
                      <div className="note" style={{ fontSize: 11 }}>{spillerStatus(s)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Slurkemaaler tilbage={s.slurkeTilbage} bredde={7} />
                      <div className="eyebrow" style={{ fontSize: 9, marginTop: 4 }}>
                        {s.slurkeTilbage}/11 {DRIK_NAVN[s.drik]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {spil.husregler.length > 0 && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Husregler</div>
                  {spil.husregler.map((r, i) => <div key={`${r}-${i}`} className="husregel">{r}</div>)}
                </div>
              )}
            </div>
          )}

          {fane === 'log' && (
            <div className="log">
              {spil.log.slice(0, 40).map((h) => (
                <div key={h.id} className="log-linje">
                  <span className="log-prik" style={{ background: h.farve ?? 'var(--line-2)' }} />
                  <span>{h.tekst}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {jeg && (
          <div className="min-drik">
            <div>
              <div className="eyebrow">Din {DRIK_NAVN[jeg.drik].toLowerCase()}</div>
              <div style={{ marginTop: 6 }}><Slurkemaaler tilbage={jeg.slurkeTilbage} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19 }}>{jeg.slurkeTilbage}</div>
              <div className="eyebrow">slurke igen</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
