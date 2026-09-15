import { useState, type JSX } from 'react';
import {
  Brik, FejringKort, Glas, Handlingskort, Maerkat, MeierKort, Plade, Slurkemaaler, SyverKort, drikNavn, fingerPaaBordet,
  kortPaaBordet, opgave, spillerStatus, taarnAndel, taarnFor, terningPaaBordet, useForsinketSpil, type SpilUdsyn
} from '@k69/ui';
import { formatSlurke, taarnCl, type Handling } from '@k69/rules';

type Faneblad = 'tur' | 'bord' | 'log';

export function Bord({
  spil: live, migId, send
}: {
  spil: SpilUdsyn; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  const [fane, saetFane] = useState<Faneblad>('tur');
  const [foelger, saetFoelger] = useState(true);

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

  // Følger man med, holder kameraet på ens egen brik — hele pladen på 390 px
  // ville gøre felteksterne ulæselige.
  const foelgFelt = jeg && jeg.pitPlads === 0 && jeg.felt > 0 ? jeg.felt : null;

  return (
    <div className="skaerm">
      <header className="mobilbar">
        <div className="mark" style={{ fontSize: 24 }}>K69</div>
        <div className="kode-lille">{spil.kode}</div>
        <SyverKort spil={spil} migId={migId} send={send} kompakt />
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
          taarnAndel={andel}
          taarnCl={taarnCl(spil.taarn.slurke)}
          taarnKapCl={spil.indstillinger.taarnKapacitetCl}
          kort={kortPaaBordet(spil)}
          terning={terningPaaBordet(spil, live, ruller)}
          finger={fingerPaaBordet(spil, migId, send)}
          kortHosId={spil.syver?.holderId ?? null}
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
              {f === 'tur' ? 'Turen' : f === 'bord' ? 'Tårnet' : 'Log'}
            </button>
          ))}
        </div>

        <div
          className={fane === 'tur' && o ? 'ark-krop action-farvet' : 'ark-krop'}
          style={fane === 'tur' && o ? ({ '--sp': o.farve } as React.CSSProperties) : undefined}
        >
          {fane === 'tur' && <Handlingskort spil={spil} migId={migId} send={send} kompakt ruller={ruller} />}

          {fane === 'bord' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Glas andel={andel} bredde={38} hoejde={62} />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--amber)' }}>
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
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{bm?.navn ?? 'Ingen'}</div>
                </div>
              </div>

              <div className="liste">
                {spil.spillere.map((s) => (
                  <div key={s.id} className={s.id === paaTur?.id ? 'raekke raekke-paa' : 'raekke'}>
                    <Brik navn={s.navn} farve={s.farve} str={32} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{s.navn}</span>
                        {s.id === spil.bierMeisterId && <Maerkat>BM</Maerkat>}
                        {s.id === spil.taarn.toemmesAfId && <Maerkat farve="var(--amber)">TÅRNET</Maerkat>}
                        {s.id === spil.syver?.holderId && <Maerkat>7'ER</Maerkat>}
                        {!s.tilsluttet && <Maerkat farve="var(--ink-faint)">OFFLINE</Maerkat>}
                      </div>
                      <div className="note" style={{ fontSize: 11 }}>{spillerStatus(s)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: s.enheder > 0 ? 'var(--amber)' : 'var(--ink-dim)' }}>
                          {s.enheder}
                        </span>
                        <span className="eyebrow" style={{ fontSize: 9 }}>tømt</span>
                      </div>
                      <Slurkemaaler tilbage={s.slurkeTilbage} bredde={7} />
                      <div className="eyebrow" style={{ fontSize: 9, marginTop: 4 }}>
                        {s.slurkeTilbage}/11 {s.drik.navn}
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
              <div className="eyebrow">Din {drikNavn(jeg.drik)} · {jeg.enheder} tømt</div>
              <div style={{ marginTop: 6 }}><Slurkemaaler tilbage={jeg.slurkeTilbage} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19 }}>{jeg.slurkeTilbage}</div>
              <div className="eyebrow">slurke igen</div>
            </div>
          </div>
        )}
      </div>
      <MeierKort spil={spil} migId={migId} send={send} kompakt />
      <FejringKort spil={spil} kompakt />
    </div>
  );
}
