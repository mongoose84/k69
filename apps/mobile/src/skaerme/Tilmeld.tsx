import { useState, type JSX } from 'react';
import {
  EgenDrikFelter, StoerrelseValg, egenDrikKlar, fastDrikValg, navneliste, tomEgenDrik, type EgenDrik, Maerke
} from '@k69/ui';
import {
  BRIKFARVER, DRIKKE, DRIK_LISTE, formatProcent, type DrikId, type DrikValg, type KlientHandling, type KortHold, type Spil
} from '@k69/rules';
import { VERSION } from '../version.js';

const HOLD: Array<{ id: KortHold; navn: string; forklaring: string }> = [
  { id: 'dame', navn: 'Damerne', forklaring: 'Drikker på Damen' },
  { id: 'konge', navn: 'Herrerne', forklaring: 'Drikker på Kongen' }
];

export function Tilmeld({
  spil, send, fejl, ryd
}: {
  spil: Spil; send: (h: KlientHandling) => void; fejl: string | null; ryd: () => void;
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
    <div className="skaerm grund">
      <div className="vandmaerke mobil-vandmaerke" aria-hidden="true">{spil.kode}</div>

      <header className="mobilbar">
        <Maerke version={VERSION} />
        <span className="pille" style={{ fontSize: 11, padding: '6px 11px' }}>Spil {spil.kode}</span>
      </header>

      <div className="rul">
        <div className="mobil-intro">
          <h1>
            {spil.spillere.length > 0
              ? `${navneliste(spil.spillere.map((s) => s.navn))} ${iGang ? 'er i gang.' : 'venter.'}`
              : 'Du er den første.'}
          </h1>
          <p className="lead">
            {iGang
              ? 'Spillet kører allerede — men du kan hoppe med. Du får et frifelt og kommer med i turen bagest i rækken.'
              : 'Skriv et navn, vælg en brik og hvad du drikker — så er du med.'}
          </p>
        </div>

        <section className="papir mobil-panel">
          <div className="blok">
            <label className="mærke" htmlFor="navn">Dit navn</label>
            <input id="navn" type="text" value={navn} maxLength={24} placeholder="Fx Sofie"
              onChange={(e) => { saetNavn(e.target.value); ryd(); }} />
          </div>

          <div className="blok">
            <div className="mærke">Din brik</div>
            <div className="brikvalg" style={{ gap: 10 }}>
              {BRIKFARVER.map((f) => {
                const optaget = taget.has(f);
                return (
                  <button
                    key={f}
                    aria-label={`Brik i farven ${f}${optaget ? ' (taget)' : ''}`}
                    aria-pressed={farve === f}
                    disabled={optaget}
                    className={farve === f ? 'brikvalg-paa' : undefined}
                    onClick={() => saetFarve(f)}
                    style={{ background: f }}
                  />
                );
              })}
            </div>
          </div>

          <div className="blok">
            <div className="mærke">Hvad drikker du?</div>
            <div className="to">
              {DRIK_LISTE.map((d) => (
                <button key={d.id} className={drik === d.id ? 'valgkort valgkort-paa' : 'valgkort'} onClick={() => { saetDrik(d.id); saetCl(d.enhedCl); }}>
                  <b>{d.navn}</b>
                  <span>{formatProcent(d)} · {drik === d.id ? cl : d.enhedCl} cl</span>
                </button>
              ))}
              <button className={drik === 'egen' ? 'valgkort valgkort-paa' : 'valgkort'} onClick={() => saetDrik('egen')}>
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
            <div className="note" style={{ marginTop: 10 }}>
              En slurk er den samme mængde alkohol uanset hvad du drikker — 33 cl pilsner er 11 slurke.
            </div>
          </div>

          <div className="blok">
            <div className="mærke">Dame- og kongekort</div>
            <div className="to">
              {HOLD.map((h) => (
                <button key={h.id} className={hold === h.id ? 'valgkort valgkort-paa' : 'valgkort'} onClick={() => saetHold(h.id)}>
                  <b>{h.navn}</b>
                  <span>{h.forklaring}</span>
                </button>
              ))}
            </div>
            {hold === null && <div className="note" style={{ marginTop: 8 }}>Vælg den ene.</div>}
          </div>

          {fejl && <div className="fejltekst">{fejl}</div>}
        </section>
      </div>

      <div className="ark-fast lys">
        <button
          className="knap knap-primaer"
          style={{ minHeight: 56 }}
          disabled={!klar}
          onClick={() => hold && drikValg && send({ type: 'join', navn, farve, drik: drikValg, kortHold: hold })}
        >
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: farve, border: '2px solid #ced8e2' }} />
          {!kanJoine ? 'Spillet er slut' : iGang ? 'Hop med i spillet' : 'Kom med i spillet'}
        </button>
      </div>
    </div>
  );
}
