import { useState, type JSX } from 'react';
import {
  BRAET_STR, BraetDefs, BraetPlade, Brik, EgenDrikFelter, StoerrelseValg, egenDrikKlar, fastDrikValg, tomEgenDrik, type EgenDrik
} from '@k69/ui';
import {
  BRIKFARVER, DRIKKE, DRIK_LISTE, formatProcent, type DrikId, type DrikValg, type Handling, type KortHold, type Spil
} from '@k69/rules';

const HOLD: Array<{ id: KortHold; navn: string; forklaring: string }> = [
  { id: 'dame', navn: 'Damerne', forklaring: 'Drikker på Damen' },
  { id: 'konge', navn: 'Herrerne', forklaring: 'Drikker på Kongen' }
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
  const [egen, saetEgen] = useState<EgenDrik>(tomEgenDrik);
  // Størrelsen på den faste drik — nulstilles til standarden når man skifter drik.
  const [cl, saetCl] = useState(DRIKKE.ol.enhedCl);
  const [hold, saetHold] = useState<KortHold | null>(null);

  const iGang = spil.fase === 'spiller';
  const kanJoine = spil.fase !== 'slut';
  const drikValg: DrikValg | null = drik === 'egen' ? (egenDrikKlar(egen) ? egen : null) : fastDrikValg(drik, cl);
  const klar = Boolean(navn.trim()) && hold !== null && drikValg !== null && kanJoine;

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
              ? `${spil.spillere.map((s) => s.navn).join(', ')} ${iGang ? 'er i gang i' : 'venter i'} ${spil.kode}.`
              : `Du er den første i ${spil.kode}.`}
          </p>
        </div>
      </div>

      <div className="rul">
        {iGang && (
          <div className="blok note">
            Spillet kører allerede — men du kan hoppe med. Du får et frifelt og kommer med i turen bagest i rækken.
          </div>
        )}

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
          <div className="fire">
            {DRIK_LISTE.map((d) => (
              <button key={d.id} className={drik === d.id ? 'flise flise-paa' : 'flise'} onClick={() => { saetDrik(d.id); saetCl(d.enhedCl); }}>
                <b>{d.navn}</b>
                <span>{formatProcent(d)} · {drik === d.id ? cl : d.enhedCl} cl</span>
              </button>
            ))}
            <button className={drik === 'egen' ? 'flise flise-paa' : 'flise'} onClick={() => saetDrik('egen')}>
              <b>Andet</b>
              <span>Skriv selv</span>
            </button>
          </div>
          {drik !== 'egen' && (
            <StoerrelseValg drik={DRIKKE[drik]} valgt={cl} onVaelg={(v) => { saetCl(v); ryd(); }} />
          )}
          {drik === 'egen' && (
            <div style={{ marginTop: 10 }}>
              <EgenDrikFelter vaerdi={egen} onSkift={(v) => { saetEgen(v); ryd(); }} />
            </div>
          )}
          <div className="note" style={{ marginTop: 8 }}>
            En slurk er den samme mængde alkohol uanset hvad du drikker — 33 cl pilsner er 11 slurke.
          </div>
        </div>

        <div className="blok">
          <div className="mærke">Dame- og kongekort</div>
          <div className="to">
            {HOLD.map((h) => (
              <button key={h.id} className={hold === h.id ? 'flise flise-paa' : 'flise'} onClick={() => saetHold(h.id)}>
                <b>{h.navn}</b>
                <span>{h.forklaring}</span>
              </button>
            ))}
          </div>
          {hold === null && <div className="note" style={{ marginTop: 8 }}>Vælg den ene.</div>}
        </div>

        {fejl && <div className="fejltekst">{fejl}</div>}
      </div>

      <div className="ark-fast">
        <button
          className="knap knap-primaer"
          style={{ minHeight: 56 }}
          disabled={!klar}
          onClick={() => hold && drikValg && send({ type: 'join', navn, farve, drik: drikValg, kortHold: hold })}
        >
          <Brik navn={navn || '?'} farve={farve} str={26} />
          {!kanJoine ? 'Spillet er slut' : iGang ? 'Hop med i spillet' : 'Kom med i spillet'}
        </button>
      </div>
    </div>
  );
}
