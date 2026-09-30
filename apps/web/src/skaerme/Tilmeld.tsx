import { useState, type JSX } from 'react';
import {
  Brik, EgenDrikFelter, Elefant, StoerrelseValg, egenDrikKlar, fastDrikValg, tomEgenDrik, type EgenDrik
} from '@k69/ui';
import {
  BRIKFARVER, DRIKKE, DRIK_LISTE, formatAntal, formatProcent, slurkePrEnhed, type DrikId, type DrikValg, type Handling, type KortHold, type Spil
} from '@k69/rules';

const HOLD: Array<{ id: KortHold; navn: string; forklaring: string }> = [
  { id: 'dame', navn: 'Damerne', forklaring: 'Du drikker når Damen bliver trukket' },
  { id: 'konge', navn: 'Herrerne', forklaring: 'Du drikker når Kongen bliver trukket' }
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

  // "Mette, Jeppe og Sofie venter." — navnene kommer fra spillet.
  const navne = spil.spillere.map((s) => s.navn);
  const hvem = navne.length > 1 ? `${navne.slice(0, -1).join(', ')} og ${navne[navne.length - 1]}` : navne[0];

  return (
    <div className="plakat tilmeld">
      <div className="vandmaerke tilmeld-vandmaerke" aria-hidden="true">{spil.kode}</div>
      <Elefant className="elefant-stor tilmeld-elefant" str={560} />

      <div className="tilmeld-venstre">
        <header className="plakat-top">
          <div className="mark" style={{ fontSize: 28 }}>K69</div>
          <span className="pille">Spil {spil.kode}</span>
        </header>
        <div className="tilmeld-hoved">
          <h1>
            {hvem
              ? `${hvem} ${iGang ? 'er i gang.' : 'venter.'}`
              : `Du er den første i ${spil.kode}.`}
          </h1>
          <p className="lead">
            {iGang
              ? 'Spillet kører allerede — men har du linket, kan du hoppe med. Du får et frifelt og kommer med i turen bagest i rækken.'
              : 'Skriv et navn, vælg en brik og hvad du drikker — så er du med.'}
          </p>
        </div>
      </div>

      <section className="papir tilmeld-panel">
        <div>
          <label className="mærke" htmlFor="navn">Dit navn</label>
          <input
            id="navn"
            type="text"
            value={navn}
            maxLength={24}
            placeholder="Fx Jeppe"
            autoFocus
            style={{ fontSize: 18 }}
            onChange={(e) => { saetNavn(e.target.value); ryd(); }}
          />
        </div>

        <div>
          <div className="mærke">Din brik</div>
          <div className="brikvalg">
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

        <div>
          <div className="mærke">Hvad drikker du?</div>
          <div className="valgkort-gitter">
            {DRIK_LISTE.map((d) => (
              <button
                key={d.id}
                className={drik === d.id ? 'valgkort valgkort-paa' : 'valgkort'}
                aria-pressed={drik === d.id}
                onClick={() => { saetDrik(d.id); saetCl(d.enhedCl); }}
              >
                <b>{d.navn}</b>
                <span>{formatProcent(d)} · {drik === d.id ? cl : d.enhedCl} cl · {formatAntal(slurkePrEnhed({ ...d, enhedCl: drik === d.id ? cl : d.enhedCl }))} slurke</span>
              </button>
            ))}
            <button
              className={drik === 'egen' ? 'valgkort valgkort-paa' : 'valgkort'}
              aria-pressed={drik === 'egen'}
              onClick={() => saetDrik('egen')}
            >
              <b>Noget andet</b>
              <span>Skriv selv navn, størrelse og procent</span>
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
            En slurk er den samme mængde alkohol uanset hvad du drikker — en pilsner på 33 cl er 11
            slurke, en på 50 cl er 16,7. Appen omregner tårnet til din egen drik.
          </div>
        </div>

        <div>
          <div className="mærke">Dame- og kongekort</div>
          <div className="valgkort-gitter">
            {HOLD.map((h) => (
              <button
                key={h.id}
                className={hold === h.id ? 'valgkort valgkort-paa' : 'valgkort'}
                aria-pressed={hold === h.id}
                onClick={() => saetHold(h.id)}
              >
                <b>{h.navn}</b>
                <span>{h.forklaring}</span>
              </button>
            ))}
          </div>
          {hold === null && <div className="note" style={{ marginTop: 8 }}>Vælg den ene — man er enten med damerne eller herrerne.</div>}
        </div>

        {fejl && <div className="fejltekst">{fejl}</div>}
        {!kanJoine && <div className="fejltekst">Spillet er slut.</div>}

        <div style={{ flexGrow: 1 }} />
        <button
          className="knap knap-primaer"
          style={{ minHeight: 60, fontSize: 22, flexShrink: 0 }}
          disabled={!klar}
          onClick={() => hold && drikValg && send({ type: 'join', navn, farve, drik: drikValg, kortHold: hold })}
        >
          <Brik navn={navn || '?'} farve={farve} str={28} />
          {iGang ? 'Hop med i spillet' : 'Kom med i spillet'}
        </button>
      </section>
    </div>
  );
}
