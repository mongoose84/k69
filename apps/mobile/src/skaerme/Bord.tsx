import { useState, type JSX } from 'react';
import {
  Brik, FejringKort, Glas, Handlingskort, KroneKort, Maerkat, MeierKort, Plade, SenesteTure, Slurkemaaler, SyverKort, drikNavn, fingerPaaBordet, kortHos,
  kortPaaBordet, LydKnap, opgave, spillerStatus, taarnAndel, taarnFor, terningPaaBordet, useForsinketSpil, useLyde, UdraabKort, type SpilUdsyn
} from '@k69/ui';
import { formatAntal, formatSlurke, slurkePrEnhed, taarnCl, taarnLoeberOver, type KlientHandling } from '@k69/rules';

type Faneblad = 'tur' | 'bord' | 'log';

export function Bord({
  spil: live, migId, send
}: {
  spil: SpilUdsyn; migId: string; send: (h: KlientHandling) => void;
}): JSX.Element {
  const [fane, saetFane] = useState<Faneblad>('tur');
  const [foelger, saetFoelger] = useState(true);

  // Mens terningen ruller, står alt stille på det gamle spil — se useForsinketSpil.
  const { vist: spil, ruller } = useForsinketSpil(live);
  useLyde(live, spil, migId);
  const jeg = spil.spillere.find((s) => s.id === migId);
  const o = opgave(spil, migId);
  const paaTur = spil.spillere[spil.turIdx];
  const bm = spil.spillere.find((s) => s.id === spil.bierMeisterId);
  const toemmer = spil.spillere.find((s) => s.id === spil.taarn.toemmesAfId);
  const andel = taarnAndel(spil);
  const over = taarnLoeberOver(spil);

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
    <div className="skaerm grund">
      <header className="mobilbar mobilbar-streg">
        <div className="mark">K69</div>
        {paaTur && (
          <div className="tur-pille">
            <i style={{ background: paaTur.farve }} />
            <span>{paaTur.id === migId ? 'Din tur' : `${paaTur.navn}s tur`}</span>
          </div>
        )}
        <SyverKort spil={spil} migId={migId} send={send} kompakt />
        <div style={{ flexGrow: 1 }} />
        <div className="taarn-lille" title={`${spil.kode} · ${formatSlurke(spil.taarn.slurke)} i tårnet`}>
          <Glas andel={andel} bredde={16} hoejde={26} over={over} />
          <span>{taarnCl(spil.taarn.slurke)} CL</span>
        </div>
        <LydKnap />
      </header>

      <div className="mobilplade">
        <div className="vandmaerke mobilplade-vandmaerke" aria-hidden="true">Runde {spil.runde}</div>
        <Plade
          id="mb"
          brikker={brikker}
          aktivtFelt={paaTur && paaTur.pitPlads === 0 ? paaTur.felt : null}
          taarnAndel={andel}
          taarnCl={taarnCl(spil.taarn.slurke)}
          taarnKapCl={spil.indstillinger.taarnKapacitetCl}
          kort={kortPaaBordet(spil)}
          terning={terningPaaBordet(spil, live, ruller)}
          finger={fingerPaaBordet(spil, migId, send)}
          kortHos={kortHos(spil)}
          foelger={foelger}
          foelgZoom={0.82}
          foelgFelt={foelgFelt}
          visMinimap
        />
        <button
          className={foelger ? 'chip' : 'chip chip-paa'}
          aria-pressed={!foelger}
          onClick={() => saetFoelger((f) => !f)}
        >
          {foelger ? 'Overblik' : 'Følg min brik'}
        </button>
      </div>

      <div className="ark lys">
        <div className="greb" />
        <div className="spiller-chips">
          {spil.spillere.filter((s) => s.tilstand === 'aktiv').map((s) => (
            <span key={s.id} className={s.id === paaTur?.id ? 'spiller-chip spiller-chip-paa' : 'spiller-chip'}>
              <Brik navn={s.navn} farve={s.farve} str={20} />
              {s.id === migId ? 'Dig' : s.navn} {s.enheder}
            </span>
          ))}
        </div>
        <div className="faneblade">
          {(['tur', 'bord', 'log'] as Faneblad[]).map((f) => (
            <button key={f} className={fane === f ? 'fb fb-paa' : 'fb'} onClick={() => saetFane(f)}>
              {f === 'tur' ? 'Turen' : f === 'bord' ? 'Tårnet' : 'Log'}
            </button>
          ))}
        </div>

        <div className="ark-krop">
          {fane === 'tur' && o && (
            <div className="handling-blok blaek action-farvet" style={{ '--sp': o.farve } as React.CSSProperties}>
              <Handlingskort spil={spil} migId={migId} send={send} kompakt ruller={ruller} />
            </div>
          )}

          {fane === 'bord' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Glas andel={andel} bredde={38} hoejde={62} over={over} />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1 }}>
                    {taarnCl(spil.taarn.slurke)} cl
                  </div>
                  <div className="note">
                    {formatSlurke(spil.taarn.slurke)}
                    {jeg && jeg.drik.id !== 'ol' ? ` · ${taarnFor(spil, jeg)} af din ${drikNavn(jeg.drik)}` : ''}
                  </div>
                  {toemmer && <div className="note">{toemmer.navn} er i gang med at bunde det.</div>}
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="eyebrow">Bier Meister</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{bm?.navn ?? 'Ingen'}</div>
                </div>
              </div>

              <div className="liste">
                {spil.spillere.map((s) => (
                  <div key={s.id} className={s.id === paaTur?.id ? 'raekke raekke-paa' : 'raekke'}>
                    <Brik navn={s.navn} farve={s.farve} str={32} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{s.navn}</span>
                        {s.id === spil.bierMeisterId && <Maerkat fyldt>BM</Maerkat>}
                        {s.id === spil.taarn.toemmesAfId && <Maerkat fyldt>TÅRNET</Maerkat>}
                        {s.id === spil.syver?.holderId && <Maerkat>7'ER</Maerkat>}
                        {!s.tilsluttet && <Maerkat>OFFLINE</Maerkat>}
                      </div>
                      <div className="note" style={{ fontSize: 11.5 }}>{spillerStatus(s)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{s.enheder}</span>
                        <span className="eyebrow" style={{ fontSize: 9 }}>tømt</span>
                      </div>
                      <Slurkemaaler tilbage={s.slurkeTilbage} ialt={slurkePrEnhed(s.drik)} bredde={7} />
                      <div className="eyebrow" style={{ fontSize: 9, marginTop: 4 }}>
                        {formatAntal(s.slurkeTilbage)}/{formatAntal(slurkePrEnhed(s.drik))} {s.drik.navn}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="eyebrow" style={{ textAlign: 'center' }}>Spil {spil.kode}</div>
            </div>
          )}

          {fane === 'log' && (
            <>
              <div className="eyebrow">Seneste ture</div>
              <SenesteTure spil={spil} />
              <div className="eyebrow" style={{ marginTop: 16 }}>Hele loggen</div>
              <div className="log">
                {spil.log.slice(0, 40).map((h) => (
                  <div key={h.id} className="log-linje">
                    <span className="log-prik" style={{ background: h.farve ?? 'var(--line-2)' }} />
                    <span>{h.tekst}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {jeg && (
          <div className="min-drik">
            <div>
              <div className="eyebrow">Din {drikNavn(jeg.drik)} · {jeg.enheder} tømt</div>
              <div style={{ marginTop: 6 }}><Slurkemaaler tilbage={jeg.slurkeTilbage} ialt={slurkePrEnhed(jeg.drik)} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{formatAntal(jeg.slurkeTilbage)}</div>
              <div className="eyebrow">slurke igen</div>
            </div>
          </div>
        )}
      </div>
      <MeierKort spil={spil} migId={migId} send={send} kompakt />
      <KroneKort spil={spil} migId={migId} send={send} kompakt />
      <UdraabKort spil={spil} kompakt />
      <FejringKort spil={spil} kompakt />
    </div>
  );
}
