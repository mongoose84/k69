import { useState, type JSX } from 'react';
import { BRAET_STR, BraetDefs, BraetPlade, Brik, DRIK_NAVN } from '@k69/ui';
import { BRIKFARVER, DRIK_LISTE, type DrikId, type Handling, type KortHold, type Spil } from '@k69/rules';

const HOLD: Array<{ id: KortHold; navn: string; forklaring: string }> = [
  { id: 'dame', navn: 'Damerne', forklaring: 'Du drikker på Dame-kortet' },
  { id: 'konge', navn: 'Herrerne', forklaring: 'Du drikker på Konge-kortet' },
  { id: 'begge', navn: 'Begge', forklaring: 'Du drikker på begge kort' },
  { id: 'ingen', navn: 'Ingen', forklaring: 'Kortene går uden om dig' }
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

  const kanJoine = spil.fase === 'lobby';

  return (
    <div className="forside">
      <section className="hero">
        <svg className="hero-art" viewBox={`0 0 ${BRAET_STR.w} ${BRAET_STR.h}`} aria-hidden="true">
          <BraetDefs id="t" />
          <BraetPlade id="t" brikker={[]} taarnAndel={0.35} />
        </svg>
        <div className="hero-slør" />
        <div className="hero-tekst">
          <div className="mark" style={{ fontSize: 96, lineHeight: 0.86 }}>K69</div>
          <p className="hero-lead">
            {spil.spillere.length > 0
              ? `${spil.spillere.map((s) => s.navn).join(', ')} venter i ${spil.kode}.`
              : `Du er den første i ${spil.kode}.`}
          </p>
          <p className="hero-kicker">Skriv et navn, vælg en brik og hvad du drikker — så er du med.</p>
        </div>
      </section>

      <section className="panel">
        <div>
          <label className="mærke" htmlFor="navn">Dit navn</label>
          <input
            id="navn"
            type="text"
            value={navn}
            maxLength={24}
            placeholder="Fx Jeppe"
            autoFocus
            onChange={(e) => { saetNavn(e.target.value); ryd(); }}
          />
        </div>

        <div>
          <div className="mærke">Din brik</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {BRIKFARVER.map((f) => {
              const optaget = taget.has(f);
              return (
                <button
                  key={f}
                  aria-label={`Brik i farven ${f}`}
                  disabled={optaget}
                  onClick={() => saetFarve(f)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', background: f, cursor: optaget ? 'not-allowed' : 'pointer',
                    border: farve === f ? '2px solid var(--brass-lt)' : '2px solid transparent',
                    boxShadow: farve === f ? '0 0 0 2px rgba(201,162,39,0.25)' : 'none',
                    opacity: optaget ? 0.22 : 1
                  }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <div className="mærke">Hvad drikker du?</div>
          <div className="drikke">
            {DRIK_LISTE.map((d) => (
              <button
                key={d.id}
                className={drik === d.id ? 'drik drik-paa' : 'drik'}
                onClick={() => saetDrik(d.id)}
              >
                <b>{DRIK_NAVN[d.id]}</b>
                <span>{d.styrke} · {d.enhedCl} cl · 11 slurke</span>
              </button>
            ))}
          </div>
          <div className="note" style={{ marginTop: 8 }}>
            Én enhed er 11 slurke uanset hvad du drikker. Appen omregner tårnet til din egen drik.
          </div>
        </div>

        <div>
          <div className="mærke">Dame- og kongekort</div>
          <div className="drikke">
            {HOLD.map((h) => (
              <button key={h.id} className={hold === h.id ? 'drik drik-paa' : 'drik'} onClick={() => saetHold(h.id)}>
                <b>{h.navn}</b>
                <span>{h.forklaring}</span>
              </button>
            ))}
          </div>
        </div>

        {fejl && <div className="fejltekst">{fejl}</div>}
        {!kanJoine && <div className="fejltekst">Spillet er allerede gået i gang.</div>}

        <button
          className="knap knap-primaer"
          style={{ minHeight: 58 }}
          disabled={!navn.trim() || !kanJoine}
          onClick={() => send({ type: 'join', navn, farve, drik, kortHold: hold })}
        >
          <Brik navn={navn || '?'} farve={farve} str={26} />
          Kom med i spillet
        </button>
      </section>
    </div>
  );
}
