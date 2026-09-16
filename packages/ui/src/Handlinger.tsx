import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  KULOER_TEGN, RANG_NAVN, STIGE, afventerSpiller, afgangSpaerret, formatCl, formatSlurke, taarnCl,
  taarnKapacitetSlurke, taarnLoeberOver, type Handling, type Spil, type Spiller
} from '@k69/rules';
import { Brik, HoldKnap, Kortbillede, Terning } from './Dele.js';
import { drikNavn, erRoedt, kuloerTegn, opgave, venterPaaSlag } from './tekst.js';

export interface HandlingProps {
  spil: Spil;
  migId: string;
  send: (h: Handling) => void;
  /** Mobilen har mindre plads: færre forklaringer, større trykflader. */
  kompakt?: boolean;
  /** Sandt mens terningen tumler på bordet — så kan man ikke slå igen imens. */
  ruller?: boolean;
}

const raekke: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const kolonne: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };

function aktive(spil: Spil): Spiller[] {
  return spil.spillere.filter((s) => s.tilstand === 'aktiv');
}

function SpillerValg({
  spil, migId, medMigSelv = false, onVaelg, knaptekst
}: {
  spil: Spil; migId: string; medMigSelv?: boolean;
  onVaelg: (id: string) => void; knaptekst?: string;
}): JSX.Element {
  const liste = aktive(spil).filter((s) => medMigSelv || s.id !== migId);
  return (
    <div style={kolonne}>
      {liste.map((s) => (
        <button key={s.id} className="knap" style={{ justifyContent: 'flex-start' }} onClick={() => onVaelg(s.id)}>
          <Brik navn={s.navn} farve={s.farve} str={26} />
          <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>{s.navn}</span>
          {knaptekst && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-faint)' }}>{knaptekst}</span>}
        </button>
      ))}
    </div>
  );
}

function GivSlurke({ spil, migId, send, antal }: HandlingProps & { antal: number }): JSX.Element {
  // Man må gerne være solidarisk og tage en selv — derfor står man selv nederst.
  const modtagere = useMemo(() => {
    const andre = aktive(spil).filter((s) => s.id !== migId);
    const mig = aktive(spil).find((s) => s.id === migId);
    return mig ? [...andre, mig] : andre;
  }, [spil, migId]);
  const [fordeling, saetFordeling] = useState<Record<string, number>>({});

  useEffect(() => saetFordeling({}), [antal, spil.naesteHaendelseId]);

  const brugt = Object.values(fordeling).reduce((n, v) => n + v, 0);
  const rest = antal - brugt;

  return (
    <div style={kolonne}>
      {modtagere.map((s) => {
        const n = fordeling[s.id] ?? 0;
        const erMig = s.id === migId;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Brik navn={s.navn} farve={s.farve} str={30} />
            <span style={{ flexGrow: 1, fontSize: 14, fontWeight: 600 }}>
              {erMig ? 'Dig selv' : s.navn}
              {erMig && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-faint)' }}> · solidarisk</span>}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {formatCl(n, s.drik)}
            </span>
            <button
              className="knap"
              style={{ minHeight: 38, width: 38, padding: 0 }}
              disabled={n === 0}
              onClick={() => saetFordeling({ ...fordeling, [s.id]: n - 1 })}
            >
              −
            </button>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 20, width: 26, textAlign: 'center' }}>{n}</span>
            <button
              className="knap"
              style={{ minHeight: 38, width: 38, padding: 0 }}
              disabled={rest === 0}
              onClick={() => saetFordeling({ ...fordeling, [s.id]: n + 1 })}
            >
              +
            </button>
          </div>
        );
      })}
      <button
        className="knap knap-primaer"
        disabled={rest !== 0}
        onClick={() =>
          send({
            type: 'giv-slurke',
            fordeling: Object.entries(fordeling).map(([spillerId, n]) => ({ spillerId, antal: n }))
          })
        }
      >
        {rest === 0 ? 'Del ud' : `${rest} tilbage at fordele`}
      </button>
    </div>
  );
}

/** Tårnets fyldningsgrad til glas og målere — lidt luft over kanten, så overløbet kan ses. */
export function taarnAndel(spil: Spil): number {
  return spil.taarn.slurke / (taarnKapacitetSlurke(spil.indstillinger.taarnKapacitetCl) + 3);
}

function FyldTaarn({ spil, send, migId }: HandlingProps): JSX.Element {
  const [tilfoejet, saetTilfoejet] = useState(0);
  const mig = spil.spillere.find((s) => s.id === migId);
  const kapCl = spil.indstillinger.taarnKapacitetCl;
  const andel = Math.min(1, taarnAndel(spil));
  const over = taarnLoeberOver(spil);

  return (
    <div style={kolonne}>
      <HoldKnap
        tekst={over ? 'Nu løber det over' : 'Hold for at hælde i tårnet'}
        under={
          tilfoejet > 0
            ? `+${formatSlurke(tilfoejet)}${mig ? ` · ${formatCl(tilfoejet, mig.drik)}` : ''}`
            : 'Slip når du synes det er nok'
        }
        andel={andel}
        onTik={() => {
          saetTilfoejet((t) => t + 0.25);
          send({ type: 'fyld-taarn', slurke: 0.25 });
        }}
        onSlip={() => undefined}
        hoejde={78}
      />
      <div className="note">
        Der står {taarnCl(spil.taarn.slurke)} cl ({formatSlurke(spil.taarn.slurke)})
        {mig && mig.drik.id !== 'ol' ? ` — ${formatCl(spil.taarn.slurke, mig.drik)} af din ${drikNavn(mig.drik)}` : ''}.
        Glasset kan rumme {kapCl} cl — løber det over, bunder du det selv.
      </div>
      <button className="knap knap-primaer" onClick={() => send({ type: 'taarn-faerdig' })}>
        Færdig
      </button>
    </div>
  );
}

function NyRegel({ spil, send }: HandlingProps): JSX.Element {
  const [tekst, saetTekst] = useState('');
  return (
    <div style={kolonne}>
      <input
        type="text"
        value={tekst}
        placeholder="Fx: der må kun snakkes tysk"
        maxLength={140}
        onChange={(e) => saetTekst(e.target.value)}
      />
      <button className="knap knap-primaer" disabled={!tekst.trim()} onClick={() => send({ type: 'ny-regel', regel: tekst })}>
        Lav reglen
      </button>
      {spil.husregler.length > 0 && (
        <>
          <div className="eyebrow">Eller ophæv en der står</div>
          {spil.husregler.map((r, i) => (
            <button key={`${r}-${i}`} className="knap knap-tom" style={{ justifyContent: 'space-between', textTransform: 'none', letterSpacing: 0 }} onClick={() => send({ type: 'fjern-regel', index: i })}>
              <span style={{ fontSize: 13 }}>{r}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Ophæv</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Den der har tårnet, siger selv til når det er tomt — uanset hvis tur det er. */
function TaarnKnap({ spil, migId, send, kompakt }: HandlingProps): JSX.Element | null {
  const t = spil.spillere.find((s) => s.id === spil.taarn.toemmesAfId);
  if (!t) return null;
  const mig = t.id === migId;
  return (
    <div className={`taarn-vagt${mig ? ' taarn-vagt-mig' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Brik navn={t.navn} farve={t.farve} str={26} />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {mig ? 'Du har tårnet' : `${t.navn} har tårnet`}
          </div>
          <div className="note" style={{ fontSize: 11 }}>
            {taarnCl(spil.taarn.slurke)} cl · {formatCl(spil.taarn.slurke, t.drik)} {drikNavn(t.drik)}
            {mig ? ' — spillet kører videre imens.' : ''}
          </div>
        </div>
      </div>
      {mig && (
        <button
          className="knap knap-primaer"
          style={{ minHeight: kompakt ? 48 : 52 }}
          onClick={() => send({ type: 'toem-taarn-faerdig' })}
        >
          Tårnet er bundet
        </button>
      )}
    </div>
  );
}

/**
 * Kortet der viser hvad spillet venter på, og de knapper der hører til.
 * Serveren afviser alt andet end netop dét — knapperne her er kun genvejen.
 */
export function Handlingskort({ spil, migId, send, kompakt, ruller = false }: HandlingProps): JSX.Element | null {
  const a = spil.afventer;
  const o = opgave(spil, migId);
  if (!a || !o) return null;

  const mig = spil.spillere.find((s) => s.id === migId);
  const paaMig = afventerSpiller(a) === migId;
  const spaerre = mig ? afgangSpaerret(spil, mig) : 'Du er ikke med i spillet.';
  const terning = venterPaaSlag(spil) ? null : spil.terning;

  const hoved = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: o.farve }} />
        <span className="eyebrow" style={{ color: o.farve }}>
          {terning && spil.terningAf
            ? `${spil.spillere.find((s) => s.id === spil.terningAf)?.navn ?? 'Nogen'} slog ${terning}`
            : `Runde ${spil.runde}`}
        </span>
      </div>
      <h2 style={{ fontSize: kompakt ? 26 : 30, lineHeight: 1.08, color: o.farve }}>{o.titel}</h2>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-dim)' }}>{o.tekst}</p>
    </div>
  );

  let styring: JSX.Element | null = null;

  if (a.slags === 'slag' || a.slags === 'pit-slag' || a.slags === 'pit-placering') {
    const kanMeldeAfgang = a.slags === 'slag';
    styring = paaMig ? (
      <div style={kolonne}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Terning vaerdi={terning} str={kompakt ? 60 : 76} ruller={ruller} />
          <button
            className="knap knap-primaer"
            style={{ flexGrow: 1, minHeight: 58 }}
            disabled={ruller}
            onClick={() => send({ type: 'slaa' })}
          >
            {ruller ? 'Terningen ruller…' : a.slags === 'pit-placering' ? 'Slå om din plads' : 'Slå med terningen'}
          </button>
        </div>
        {kanMeldeAfgang && (mig?.varslerAfgang ? (
          <div className="note">Du er ude efter dette slag.</div>
        ) : (
          <button
            className="knap knap-tom"
            style={{ minHeight: 38, fontSize: 11 }}
            disabled={Boolean(spaerre)}
            title={spaerre ?? undefined}
            onClick={() => send({ type: 'meld-afgang' })}
          >
            {spaerre ? spaerre : 'Meld afgang efter dette slag'}
          </button>
        ))}
      </div>
    ) : (
      <Terning vaerdi={terning} str={kompakt ? 52 : 64} />
    );
  } else if (a.slags === 'giv-slurke' && paaMig) {
    styring = <GivSlurke spil={spil} migId={migId} send={send} antal={a.antal} />;
  } else if (a.slags === 'fyld-taarn' && paaMig) {
    styring = <FyldTaarn spil={spil} migId={migId} send={send} />;
  } else if (a.slags === 'krone-kast' && paaMig) {
    styring = (
      <div style={raekke}>
        <button className="knap knap-primaer" style={{ flexGrow: 1 }} onClick={() => send({ type: 'krone-resultat', ramte: true })}>
          Den røg i
        </button>
        <button className="knap" style={{ flexGrow: 1 }} onClick={() => send({ type: 'krone-resultat', ramte: false })}>
          Ved siden af
        </button>
      </div>
    );
  } else if (a.slags === 'krone-udpeg' && paaMig) {
    styring = <SpillerValg spil={spil} migId={migId} medMigSelv onVaelg={(id) => send({ type: 'krone-udpeg', spillerId: id })} knaptekst="Bunder tårnet" />;
  } else if (a.slags === 'traek-kort' && paaMig) {
    styring = (
      <button className="knap knap-primaer" style={{ minHeight: 58 }} onClick={() => send({ type: 'traek-kort' })}>
        Træk et kort
      </button>
    );
  } else if (a.slags === 'kort-udfald') {
    styring = (
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Kortbillede
          rang={a.kort.rang}
          tegn={kuloerTegn(a.kort)}
          roed={erRoedt(a.kort)}
          bredde={kompakt ? 92 : 108}
        />
        <div style={{ ...kolonne, flexGrow: 1 }}>
          <div className="note">{RANG_NAVN[a.kort.rang]} {KULOER_TEGN[a.kort.kuloer]}</div>
          {paaMig && (
            <button className="knap knap-primaer" onClick={() => send({ type: 'kort-kvitter' })}>
              {a.kort.rang === '7' ? 'Tag kortet' : 'Videre'}
            </button>
          )}
          {paaMig && a.kort.rang === '7' && (
            <div className="note">Kortet lægger sig oppe i baren. Hold det nede når du vil lægge fingeren — ingen andre får besked.</div>
          )}
        </div>
      </div>
    );
  } else if (a.slags === 'kaploeb') {
    const harTrykket = a.ramte.includes(migId);
    styring = (
      <div style={kolonne}>
        <button
          className={harTrykket ? 'knap' : 'knap knap-primaer'}
          style={{ minHeight: 64 }}
          disabled={harTrykket}
          onClick={() => send({ type: 'kaploeb-tryk' })}
        >
          {harTrykket ? 'Du nåede det' : 'Jeg er med!'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {aktive(spil).map((s) => (
            <span key={s.id} style={{ opacity: a.ramte.includes(s.id) ? 1 : 0.28 }}>
              <Brik navn={s.navn} farve={s.farve} str={26} />
            </span>
          ))}
        </div>
      </div>
    );
  } else if (a.slags === 'ny-regel' && paaMig) {
    styring = <NyRegel spil={spil} migId={migId} send={send} />;
  } else if (a.slags === 'vaelg-taber' && paaMig) {
    styring = <SpillerValg spil={spil} migId={migId} medMigSelv onVaelg={(id) => send({ type: 'vaelg-taber', spillerId: id })} knaptekst="Gik i stå" />;
  } else if (a.slags === 'meier-modstander' && paaMig) {
    styring = <SpillerValg spil={spil} migId={migId} onVaelg={(id) => send({ type: 'meier-vaelg', spillerId: id })} knaptekst="Udfordr" />;
  } else if (a.slags === 'meier') {
    // Meier har sit eget kort hen over pladen — se MeierKort.
    styring = null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TaarnKnap spil={spil} migId={migId} send={send} kompakt={kompakt} />
      {hoved}
      {styring}
    </div>
  );
}

export { STIGE };
