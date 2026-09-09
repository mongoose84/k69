import type { JSX } from 'react';
import {
  Brik, DRIK_NAVN, Glas, Handlingskort, Maerkat, MeierKort, Plade, Slurkemaaler, spillerStatus, taarnFor
} from '@k69/ui';
import { SLURKE_PR_ENHED, formatCl, formatSlurke, type Handling, type Spil } from '@k69/rules';

export function Bord({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  const jeg = spil.spillere.find((s) => s.id === migId);
  const paaTur = spil.spillere[spil.turIdx];
  const bm = spil.spillere.find((s) => s.id === spil.bierMeisterId);
  const toemmer = spil.spillere.find((s) => s.id === spil.taarn.toemmesAfId);
  const kap = spil.indstillinger.taarnKapacitet;

  const brikker = spil.spillere
    .filter((s) => s.tilstand === 'aktiv')
    .map((s) => ({
      id: s.id, navn: s.navn, farve: s.farve, felt: s.felt, pitPlads: s.pitPlads,
      erPaaTur: s.id === paaTur?.id
    }));

  // Kun de drikke der faktisk sidder ved bordet skal omregnes.
  const drikkeVedBordet = [...new Set(spil.spillere.map((s) => s.drik))];

  return (
    <div className="bord">
      <header className="topbar">
        <div className="mark" style={{ fontSize: 30 }}>K69</div>
        <div className="kode-chip"><span>SPIL</span><b>{spil.kode}</b></div>
        {paaTur && (
          <div className="tur-pille">
            <Brik navn={paaTur.navn} farve={paaTur.farve} str={34} />
            <div>
              <div className="eyebrow">Tur</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{paaTur.navn}</div>
            </div>
          </div>
        )}
        <div style={{ flexGrow: 1 }} />
        <div className="note">Runde {spil.runde} · turen går med uret</div>
      </header>

      <div className="bord-krop">
        <aside className="rail rail-v">
          <section className="rail-sek" style={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="rail-hoved">
              <span className="eyebrow">Ved bordet</span>
              <span className="eyebrow" style={{ color: 'var(--brass)' }}>{spil.spillere.length}</span>
            </div>
            <div className="spillere">
              {spil.spillere.map((s) => (
                <div key={s.id} className={s.id === paaTur?.id ? 'sp sp-paa' : 'sp'}>
                  <Brik navn={s.navn} farve={s.farve} str={34} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.navn}</span>
                      {s.id === spil.bierMeisterId && <Maerkat>BM</Maerkat>}
                      {s.pitPlads > 0 && <Maerkat farve="#d98279">PIT {s.pitPlads}</Maerkat>}
                      {s.id === migId && <Maerkat farve="var(--sage)">DIG</Maerkat>}
                      {!s.tilsluttet && <Maerkat farve="var(--ink-faint)">VÆK</Maerkat>}
                    </div>
                    <div className="note" style={{ fontSize: 11 }}>{spillerStatus(s)}</div>
                    <div style={{ marginTop: 5 }}>
                      <Slurkemaaler tilbage={s.slurkeTilbage} bredde={9} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 54px' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>
                      {s.slurkeTilbage}/{SLURKE_PR_ENHED}
                    </div>
                    <div className="eyebrow" style={{ fontSize: 9 }}>{DRIK_NAVN[s.drik]}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-sek" style={{ borderBottom: 'none' }}>
            <div className="rail-hoved"><span className="eyebrow">Bordet</span></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Glas andel={spil.taarn.slurke / (kap + 3)} />
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--amber)', lineHeight: 1.05 }}>
                  {formatSlurke(spil.taarn.slurke)}
                </div>
                <div className="note">
                  {jeg ? <>Det er <b style={{ color: 'var(--amber)' }}>{taarnFor(spil, jeg)}</b> af din {DRIK_NAVN[jeg.drik].toLowerCase()}.</> : null}
                  {toemmer && <> {toemmer.navn} er i gang med at bunde det.</>}
                </div>
              </div>
            </div>

            <div className="omregn">
              {drikkeVedBordet.map((d) => (
                <div key={d} className="om">
                  <span>{DRIK_NAVN[d]}</span>
                  <b>{formatCl(spil.taarn.slurke, d)}</b>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <div className="krone-boks">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M3 8l4 4 5-8 5 8 4-4v10H3z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {bm ? `${bm.navn} er Bier Meister` : 'Ingen Bier Meister endnu'}
                </div>
                <div className="note">Henter øl og drikker 3 slurke hver gang nogen lander på Go!</div>
              </div>
            </div>

            {spil.husregler.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Husregler</div>
                {spil.husregler.map((r, i) => (
                  <div key={`${r}-${i}`} className="husregel">{r}</div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className="scene">
          <Plade
            id="b"
            brikker={brikker}
            aktivtFelt={paaTur && paaTur.pitPlads === 0 ? paaTur.felt : null}
            taarnAndel={spil.taarn.slurke / (kap + 3)}
          />
          <div className="plade-hint">Træk for at flytte pladen · rul for at zoome</div>
          <MeierKort spil={spil} migId={migId} send={send} />
        </main>

        <aside className="rail rail-h">
          <section className="rail-sek">
            <Handlingskort spil={spil} migId={migId} send={send} />
          </section>

          <section className="rail-sek" style={{ flexGrow: 1, minHeight: 0, overflow: 'auto', borderBottom: 'none' }}>
            <div className="rail-hoved"><span className="eyebrow">Hændelser</span></div>
            <div className="log">
              {spil.log.slice(0, 40).map((h) => (
                <div key={h.id} className="log-linje">
                  <span className="log-prik" style={{ background: h.farve ?? 'var(--line-2)' }} />
                  <span>{h.tekst}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
