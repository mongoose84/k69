import { useState, type JSX } from 'react';
import { BRAET_STR, BraetDefs, BraetPlade, Brik, DRIK_NAVN } from '@k69/ui';
import { BRIKFARVER, DRIK_LISTE, type DrikId, type Handling, type KortHold, type Spil } from '@k69/rules';

const HOLD: Array<{ id: KortHold; navn: string }> = [
  { id: 'dame', navn: 'Damerne' },
  { id: 'konge', navn: 'Herrerne' },
  { id: 'begge', navn: 'Begge' },
  { id: 'ingen', navn: 'Ingen' }
];

export function Tilmeld({
  spil, send, fejl, ryd
}: {
  spil: Spil; send: (h: Handling) => void; fejl: string | null; ryd: () => void;
}): JSX.Element {
  const taget = new Set(spil.spillere.map((s) => s.farve));
  const [navn, saetNavn] = useState('');
  const [farve, saetFarve] = useState(BRIKFARVER.find((f) => !taget.has(f)) ?? BRIKFARVER[0]!);
  const [drik, saetDrik] = useState<DrikId>('ol');
  const [hold, saetHold] = useState<KortHold>('ingen');

  return (
    <div className="skaerm">
      <div className="hero hero-lav">
        <svg className="hero-art" viewBox={`0 0 ${BRAET_STR.w} ${BRAET_STR.h}`} aria-hidden="true">
          <BraetDefs id="mt" />
          <BraetPlade id="mt" brikker={[]} taarnAndel={0.35} />
        </svg>
        <div className="hero-slør" />
        <div className="hero-tekst">
          <div className="mark" style={{ fontSize: 46, lineHeight: 0.9 }}>K69</div>
          <p className="hero-lead" style={{ fontSize: 16 }}>
            {spil.spillere.length > 0
              ? `${spil.spillere.map((s) => s.navn).join(', ')} venter i ${spil.kode}.`
              : `Du er den første i ${spil.kode}.`}
          </p>
        </div>
      </div>

      <div className="rul">
        <div className="blok">
          <label className="mærke" htmlFor="navn">Dit navn</label>
          <input id="navn" type="text" value={navn} maxLength={24} placeholder="Fx Sofie"
            onChange={(e) => { saetNavn(e.target.value); ryd(); }} />
        </div>

        <div className="blok">
          <div className="mærke">Din brik</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {BRIKFARVER.map((f) => {
              const optaget = taget.has(f);
              return (
                <button key={f} aria-label="Vælg brik" disabled={optaget} onClick={() => saetFarve(f)}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', background: f,
                    border: farve === f ? '2px solid var(--brass-lt)' : '2px solid transparent',
                    boxShadow: farve === f ? '0 0 0 2px rgba(201,162,39,0.25)' : 'none',
                    opacity: optaget ? 0.22 : 1
                  }} />
              );
            })}
          </div>
        </div>

        <div className="blok">
          <div className="mærke">Hvad drikker du?</div>
          <div className="tre">
            {DRIK_LISTE.map((d) => (
              <button key={d.id} className={drik === d.id ? 'flise flise-paa' : 'flise'} onClick={() => saetDrik(d.id)}>
                <b>{DRIK_NAVN[d.id]}</b>
                <span>{d.styrke} · {d.enhedCl} cl</span>
              </button>
            ))}
          </div>
          <div className="note" style={{ marginTop: 8 }}>
            Én enhed er 11 slurke uanset hvad du drikker.
          </div>
        </div>

        <div className="blok">
          <div className="mærke">Dame- og kongekort</div>
          <div className="fire">
            {HOLD.map((h) => (
              <button key={h.id} className={hold === h.id ? 'flise flise-paa' : 'flise'} onClick={() => saetHold(h.id)}>
                <b>{h.navn}</b>
              </button>
            ))}
          </div>
        </div>

        {fejl && <div className="fejltekst">{fejl}</div>}
      </div>

      <div className="ark-fast">
        <button
          className="knap knap-primaer"
          style={{ minHeight: 56 }}
          disabled={!navn.trim() || spil.fase !== 'lobby'}
          onClick={() => send({ type: 'join', navn, farve, drik, kortHold: hold })}
        >
          <Brik navn={navn || '?'} farve={farve} str={26} />
          {spil.fase === 'lobby' ? 'Kom med i spillet' : 'Spillet er gået i gang'}
        </button>
      </div>
    </div>
  );
}
