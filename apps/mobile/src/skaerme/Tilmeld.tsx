import { useState, type JSX } from 'react';
import {
  Brik, EgenDrikFelter, StoerrelseValg, egenDrikKlar, fastDrikValg, tomEgenDrik, type EgenDrik
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

  const navne = spil.spillere.map((s) => s.navn);
  const hvem = navne.length > 1 ? `${navne.slice(0, -1).join(', ')} og ${navne[navne.length - 1]}` : navne[0];

  return (
    <div className="skaerm">
      <div className="vandmaerke side-vandmaerke" aria-hidden="true">{spil.kode}</div>

      <header className="mobilbar">
        <div className="mark" style={{ fontSize: 24 }}>K69</div>
        <span className="pille" style={{ fontSize: 11, padding: '6px 11px' }}>Spil {spil.kode}</span>
      </header>

      <div className="rul">
        <div className="side-hoved">
          <h1>
            {hvem
              ? `${hvem} ${iGang ? 'er i gang.' : 'venter.'}`
              : `Du er den første i ${spil.kode}.`}
          </h1>
          <p className="lead">
            {iGang
              ? 'Spillet kører allerede — men du kan hoppe med. Du får et frifelt og kommer med i turen bagest i rækken.'
              : 'Skriv et navn, vælg en brik og hvad du drikker — så er du med.'}
          </p>
        </div>

        <div className="papir papir-blok">
          <div className="blok">
            <label className="mærke" htmlFor="navn">Dit navn</label>
            <input id="navn" type="text" value={navn} maxLength={24} placeholder="Fx Sofie"
              onChange={(e) => { saetNavn(e.target.value); ryd(); }} />
          </div>

          <div className="blok">
            <div className="mærke">Din brik</div>
            <div className="brikvalg">
              {BRIKFARVER.map((f) => {
                const optaget = taget.has(f);
                return (
                  <button key={f} aria-label={`Brik i farven ${f}${optaget ? ' (taget)' : ''}`} aria-pressed={farve === f}
                    disabled={optaget} onClick={() => saetFarve(f)}
                    className={farve === f ? 'brikvalg-paa' : undefined}
                    style={{ background: f }} />
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
      </div>

      <div className="ark-fast" style={{ padding: 0, marginTop: 0 }}>
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
