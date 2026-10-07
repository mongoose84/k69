import type { JSX } from 'react';
import {
  Brik, Elefant, FejringKort, Glas, Handlingskort, KroneKort, Maerkat, MeierKort, Plade, SenesteTure, Slurkemaaler, SyverKort, drikNavn, fingerPaaBordet, kortHos,
  kortPaaBordet, LydKnap, opgave, spillerStatus, taarnAndel, taarnFor, terningPaaBordet, useForsinketSpil, useLyde, UdraabKort, type SpilUdsyn
} from '@k69/ui';
import { formatAntal, formatCl, slurkePrEnhed, formatSlurke, taarnCl, taarnLoeberOver, type DrikInfo, type Handling } from '@k69/rules';

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
  useLyde(live, spil, migId);
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
    <div className="bord grund">
      <header className="topbar">
        <div className="mark">K69</div>
        <span className="pille">Spil {spil.kode}</span>
        {paaTur && (
          <div className="tur-pille">
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: paaTur.farve, border: '2px solid #ced8e2', boxShadow: 'var(--brik-skygge)' }} />
            <span className="tur-pille-l">TUR</span>
            <span className="tur-pille-n">{paaTur.navn}</span>
          </div>
        )}
        <SyverKort spil={spil} migId={migId} send={send} />
        <div style={{ flexGrow: 1 }} />
        <span className="topbar-runde">Runde {spil.runde}</span>
        <LydKnap />
      </header>

      <div className="bord-krop">
        <aside className="rail rail-v lys">
          <section className="rail-sek" style={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="rail-hoved">
              <span className="eyebrow">Ved bordet</span>
              <span className="eyebrow">{spil.spillere.length}</span>
            </div>
            <div className="spillere">
              {spil.spillere.map((s) => (
                <div key={s.id} className={s.id === paaTur?.id ? 'sp sp-paa' : 'sp'}>
                  <Brik navn={s.navn} farve={s.farve} str={30} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span className="sp-navn">{s.navn}</span>
                      {s.id === spil.bierMeisterId && <Maerkat fyldt>BM</Maerkat>}
                      {s.id === spil.taarn.toemmesAfId && <Maerkat fyldt>TÅRNET</Maerkat>}
                      {s.id === spil.syver?.holderId && <Maerkat>7'ER</Maerkat>}
                      {s.pitPlads > 0 && <Maerkat>PIT {s.pitPlads}</Maerkat>}
                      {s.id === migId && <Maerkat>DIG</Maerkat>}
                      {!s.tilsluttet && <Maerkat>OFFLINE</Maerkat>}
                    </div>
                    <div className="sp-status">{spillerStatus(s)}</div>
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Slurkemaaler tilbage={s.slurkeTilbage} ialt={slurkePrEnhed(s.drik)} bredde={8} />
                      <span className="note" style={{ fontSize: 10.5 }}>{formatAntal(s.slurkeTilbage)}/{formatAntal(slurkePrEnhed(s.drik))}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 58px' }} title={`${s.enheder} tømt · ${formatSlurke(s.slurkeIAlt)} i alt`}>
                    <div className="sp-tal">{s.enheder}</div>
                    <div className="sp-ord">{enhederOrd(s.enheder, s.drik)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-sek">
            <div className="rail-hoved">
              <span className="eyebrow">Tårnet</span>
              <span className="eyebrow">{spil.indstillinger.taarnKapacitetCl} cl glas</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Glas andel={andel} bredde={44} hoejde={70} over={taarnLoeberOver(spil)} />
              <div>
                <div className="taarn-cl">{taarnCl(spil.taarn.slurke)} cl</div>
                <div className="note" style={{ marginTop: 4 }}>
                  {formatSlurke(spil.taarn.slurke)}
                  {jeg && jeg.drik.id !== 'ol'
                    ? <> — <b>{taarnFor(spil, jeg)}</b> af din {drikNavn(jeg.drik)}</>
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

            <div className="bm-raekke">
              <div className="krone-boks">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ced8e2" strokeWidth="1.8" strokeLinejoin="round">
                  <path d="M3 8l4 4 5-8 5 8 4-4v10H3z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {bm ? `${bm.navn} er Bier Meister` : 'Ingen Bier Meister endnu'}
                </div>
                <div className="note" style={{ fontSize: 12, lineHeight: 1.4 }}>
                  {bm
                    ? 'Henter øl og drikker 3 slurke hver gang nogen lander på Go!'
                    : 'Lander man på Go! Bier Meister nu, drikker man selv de 3 slurke.'}
                </div>
              </div>
            </div>
          </section>
        </aside>

        <main className="scene">
          <div className="vandmaerke scene-vandmaerke" aria-hidden="true">Runde {spil.runde}</div>
          <Elefant className="plakat-elefant scene-elefant" str={300} />
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
            kortHos={kortHos(spil)}
          />
          <div className="plade-hint">Træk for at flytte pladen · rul for at zoome</div>
          <MeierKort spil={spil} migId={migId} send={send} />
          <KroneKort spil={spil} migId={migId} send={send} />
          <UdraabKort spil={spil} />
          <FejringKort spil={spil} />
        </main>

        <aside className="rail rail-h lys">
          {o && (
            <section className="rail-sek handling-sek blaek action-farvet" style={{ '--sp': o.farve } as React.CSSProperties}>
              <Handlingskort spil={spil} migId={migId} send={send} ruller={ruller} />
            </section>
          )}

          <section className="rail-sek">
            <div className="rail-hoved"><span className="eyebrow">Seneste ture</span></div>
            <SenesteTure spil={spil} />
          </section>

          <section className="rail-sek" style={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
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
