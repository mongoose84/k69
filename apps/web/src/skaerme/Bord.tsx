import type { JSX } from 'react';
import {
  Brik, FejringKort, Glas, Handlingskort, Maerkat, MeierKort, Plade, Slurkemaaler, SyverKort, drikNavn, fingerPaaBordet,
  kortPaaBordet, opgave, spillerStatus, taarnAndel, taarnFor, terningPaaBordet, useForsinketSpil, type SpilUdsyn
} from '@k69/ui';
import { SLURKE_PR_ENHED, formatCl, formatSlurke, taarnCl, type DrikInfo, type Handling } from '@k69/rules';

/** Ordet under tælleren: "pilsnere tømt", "glas vin tømt", "Classic tømt". */
function enhederOrd(antal: number, drik: DrikInfo): string {
  if (drik.id === 'ol') return antal === 1 ? 'pilsner tømt' : 'pilsnere tømt';
  if (drik.id === 'vin') return 'glas vin tømt';
  if (drik.id === 'whisky') return antal === 1 ? 'dram tømt' : 'dramme tømt';
  return `${drik.navn} tømt`;
}

export function Bord({
  spil: live, migId, send
}: {
  spil: SpilUdsyn; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  // Mens terningen ruller, står alt stille på det gamle spil — se useForsinketSpil.
  const { vist: spil, ruller } = useForsinketSpil(live);
  const jeg = spil.spillere.find((s) => s.id === migId);
  const o = opgave(spil, migId);
  const paaTur = spil.spillere[spil.turIdx];
  const bm = spil.spillere.find((s) => s.id === spil.bierMeisterId);
  const toemmer = spil.spillere.find((s) => s.id === spil.taarn.toemmesAfId);
  const andel = taarnAndel(spil);

  const brikker = spil.spillere
    .filter((s) => s.tilstand === 'aktiv')
    .map((s) => ({
      id: s.id, navn: s.navn, farve: s.farve, felt: s.felt, pitPlads: s.pitPlads,
      erPaaTur: s.id === paaTur?.id
    }));

  // Kun de drikke der faktisk sidder ved bordet skal omregnes — og pilsner er tårnets eget mål.
  const drikkeVedBordet = [...new Map(
    spil.spillere.filter((s) => s.drik.id !== 'ol').map((s) => [`${s.drik.navn}|${s.drik.enhedCl}`, s.drik])
  ).values()];

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
        <SyverKort spil={spil} migId={migId} send={send} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.navn}</span>
                      {s.id === spil.bierMeisterId && <Maerkat>BM</Maerkat>}
                      {s.id === spil.taarn.toemmesAfId && <Maerkat farve="var(--amber)">TÅRNET</Maerkat>}
                      {s.id === spil.syver?.holderId && <Maerkat>7'ER</Maerkat>}
                      {s.pitPlads > 0 && <Maerkat farve="#d98279">PIT {s.pitPlads}</Maerkat>}
                      {s.id === migId && <Maerkat farve="var(--sage)">DIG</Maerkat>}
                      {!s.tilsluttet && <Maerkat farve="var(--ink-faint)">OFFLINE</Maerkat>}
                    </div>
                    <div className="note" style={{ fontSize: 11 }}>{spillerStatus(s)}</div>
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Slurkemaaler tilbage={s.slurkeTilbage} bredde={9} />
                      <span className="note" style={{ fontSize: 10 }}>{s.slurkeTilbage}/{SLURKE_PR_ENHED}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 62px' }} title={`${s.enheder} tømt · ${s.slurkeIAlt} slurke i alt`}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: s.enheder > 0 ? 'var(--amber)' : 'var(--ink-dim)' }}>
                      {s.enheder}
                    </div>
                    <div className="eyebrow" style={{ fontSize: 9, marginTop: 3 }}>
                      {enhederOrd(s.enheder, s.drik)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-sek" style={{ borderBottom: 'none' }}>
            <div className="rail-hoved">
              <span className="eyebrow">Tårnet</span>
              <span className="eyebrow" style={{ color: 'var(--ink-faint)' }}>{spil.indstillinger.taarnKapacitetCl} cl glas</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Glas andel={andel} />
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--amber)', lineHeight: 1.05 }}>
                  {taarnCl(spil.taarn.slurke)} cl
                </div>
                <div className="note">
                  {formatSlurke(spil.taarn.slurke)}
                  {jeg && jeg.drik.id !== 'ol'
                    ? <> — <b style={{ color: 'var(--amber)' }}>{taarnFor(spil, jeg)}</b> af din {drikNavn(jeg.drik)}</>
                    : null}
                  .
                  {toemmer && <> {toemmer.navn} er i gang med at bunde det.</>}
                </div>
              </div>
            </div>

            {drikkeVedBordet.length > 0 && (
              <div className="omregn">
                {drikkeVedBordet.map((d) => (
                  <div key={`${d.navn}|${d.enhedCl}`} className="om">
                    <span>{d.navn}</span>
                    <b>{formatCl(spil.taarn.slurke, d)}</b>
                  </div>
                ))}
              </div>
            )}

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
                <div className="note">
                  {bm
                    ? 'Henter øl og drikker 3 slurke hver gang nogen lander på Go!'
                    : 'Lander man på Go! Bier Meister nu, drikker man selv de 3 slurke.'}
                </div>
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
            taarnAndel={andel}
            taarnCl={taarnCl(spil.taarn.slurke)}
            taarnKapCl={spil.indstillinger.taarnKapacitetCl}
            kort={kortPaaBordet(spil)}
            terning={terningPaaBordet(spil, live, ruller)}
            finger={fingerPaaBordet(spil, migId, send)}
            kortHosId={spil.syver?.holderId ?? null}
          />
          <div className="plade-hint">Træk for at flytte pladen · rul for at zoome</div>
          <MeierKort spil={spil} migId={migId} send={send} />
          <FejringKort spil={spil} />
        </main>

        <aside className="rail rail-h">
          <section
            className={o ? 'rail-sek action-farvet' : 'rail-sek'}
            style={o ? ({ '--sp': o.farve } as React.CSSProperties) : undefined}
          >
            <Handlingskort spil={spil} migId={migId} send={send} ruller={ruller} />
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
