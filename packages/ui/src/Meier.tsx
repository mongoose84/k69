import { useEffect, useRef, useState, type JSX } from 'react';
import {
  muligeMeldinger, trin, trinNavn, type Handling, type MeierResultat, type Spil, type Spiller
} from '@k69/rules';
import { Terning } from './Dele.js';

/**
 * Bægeret. Tegnet med bunden i vejret som det står på bordet — terningerne
 * ligger under, og de kommer kun frem når nogen vipper det eller løfter det.
 */
function Baeger({ str = 165, laast = false }: { str?: number; laast?: boolean }): JSX.Element {
  return (
    <svg width={str} height={str * 1.095} viewBox="0 0 190 208" aria-hidden="true">
      <defs>
        <linearGradient id="baeger-laeder" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#241B14" />
          <stop offset="0.16" stopColor="#4A3826" />
          <stop offset="0.46" stopColor="#5E4831" />
          <stop offset="0.78" stopColor="#382A1D" />
          <stop offset="1" stopColor="#1F1710" />
        </linearGradient>
        <linearGradient id="baeger-messing" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7E6413" />
          <stop offset="0.3" stopColor="#E8CE7E" />
          <stop offset="0.62" stopColor="#C9A227" />
          <stop offset="1" stopColor="#6E570F" />
        </linearGradient>
      </defs>
      <ellipse cx="95" cy="196" rx="80" ry="12" fill="#050806" opacity="0.55" />
      <path d="M57 24 L133 24 L149 178 Q95 194 41 178 Z" fill="url(#baeger-laeder)" />
      <path d="M43 168 Q95 184 147 168 L149 180 Q95 196 41 180 Z" fill="url(#baeger-messing)" opacity="0.92" />
      <path d="M50 112 Q95 124 140 112 L141 120 Q95 132 49 120 Z" fill="#1B140E" opacity="0.55" />
      <path d="M53 140 Q95 152 137 140 L138 147 Q95 159 52 147 Z" fill="#1B140E" opacity="0.45" />
      <ellipse cx="95" cy="24" rx="38" ry="9" fill="#3B2C1E" />
      <ellipse cx="95" cy="24" rx="38" ry="9" fill="none" stroke="url(#baeger-messing)" strokeWidth="2.4" />
      <path d="M73 26 L80 26 L88 184 L79 183 Z" fill="#FFFFFF" opacity="0.07" />
      {laast && (
        <g transform="translate(78, 78)">
          <rect x="0" y="14" width="34" height="24" rx="4" fill="#141D18" stroke="#B084A0" strokeWidth="2" />
          <path d="M7 14 V8 a10 10 0 0 1 20 0 v6" fill="none" stroke="#B084A0" strokeWidth="2" />
          <circle cx="17" cy="26" r="3" fill="#B084A0" />
        </g>
      )}
    </svg>
  );
}

function Laas({ str = 11 }: { str?: number }): JSX.Element {
  return (
    <svg width={str} height={str} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Messingstemplet der falder ned over vinderen. */
function Stempel(): JSX.Element {
  return (
    <svg width="54" height="54" viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <circle cx="30" cy="30" r="27" stroke="#C9A227" strokeWidth="1.4" opacity="0.75" />
      <circle cx="30" cy="30" r="22" stroke="#C9A227" strokeWidth="0.8" opacity="0.4" />
      <path d="M13 34 Q17 20 22 34" stroke="#E8CE7E" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 34 V22 L33 32 L40 22 V34" stroke="#E8CE7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 34 Q47 20 51 33" stroke="#E8CE7E" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 42 H40" stroke="#C9A227" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

const FLEK_FARVER = ['#C9A227', '#E8CE7E', '#B084A0', '#93AE7C', '#E0A03C'];

function Flitter(): JSX.Element {
  return (
    <>
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="meier-flek"
          style={{
            left: `${4 + i * 6}%`,
            background: FLEK_FARVER[i % FLEK_FARVER.length],
            animationDuration: `${2100 + (i % 5) * 420}ms`,
            animationDelay: `${i * 140}ms`
          }}
        />
      ))}
    </>
  );
}

function Brikprik({ s, str = 30 }: { s: Spiller; str?: number }): JSX.Element {
  return (
    <div className="meier-brik" style={{ width: str, height: str, flex: `0 0 ${str}px`, fontSize: str * 0.44, background: s.farve }}>
      {s.navn.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** Fejringen af den der vandt duellen. Hele bordet ser den samme. */
function Fejring({
  spil, migId, resultat, onLuk
}: {
  spil: Spil; migId: string; resultat: MeierResultat; onLuk: () => void;
}): JSX.Element {
  const vinder = spil.spillere.find((s) => s.id === resultat.vinderId);
  const taber = spil.spillere.find((s) => s.id === resultat.taberId);
  const jegVandt = resultat.vinderId === migId;
  const jegTabte = resultat.taberId === migId;
  const faktisk = trin(resultat.slag[0], resultat.slag[1]);

  return (
    <div className="meier-fejring">
      <Flitter />

      <div className="meier-fej-terninger">
        <Terning vaerdi={resultat.slag[0]} str={66} />
        <Terning vaerdi={resultat.slag[1]} str={66} />
      </div>

      <div className="meier-fej-dom">
        Meldt {trinNavn(resultat.melding)} · under bægeret lå {trinNavn(faktisk)}
      </div>

      <div className="meier-stempel"><Stempel /></div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Vandt duellen</div>
        <div className="meier-fej-navn">{jegVandt ? 'Dig' : vinder?.navn ?? 'Ingen'}</div>
      </div>

      <div className="meier-fej-linje">
        {resultat.loej
          ? `${jegVandt ? 'Du løftede' : `${vinder?.navn ?? 'Vinderen'} løftede`} bægeret på det rigtige tidspunkt — der blev meldt højere end der lå.`
          : `Meldingen holdt. ${jegTabte ? 'Du løftede' : `${taber?.navn ?? 'Taberen'} løftede`} for tidligt.`}
      </div>

      {taber && (
        <div className="meier-fej-taber">
          <Brikprik s={taber} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{jegTabte ? 'Dig' : taber.navn}</div>
            <div className="meier-fej-straf">
              Drikker {resultat.slurke} slurke{resultat.dobbelt ? ' — dobbelt, det var en Meyer' : ''}
            </div>
          </div>
        </div>
      )}

      <div className="meier-fej-alle">Hele bordet ser hvem der vandt</div>

      <button className="knap knap-primaer" style={{ maxWidth: 250 }} onClick={onLuk}>
        Tilbage til brættet
      </button>
    </div>
  );
}

export interface MeierKortProps {
  spil: Spil;
  migId: string;
  send: (h: Handling) => void;
  /** Mobilen lægger kortet over hele skærmen; web lægger det over pladen. */
  kompakt?: boolean;
}

/**
 * Meier som et stort kort hen over spillepladen. Terningerne ligger under
 * bægeret og vises kun mens man holder fingeren nede — det er dét der gør at
 * de aldrig kan forveksles med ens eget slag på brættet.
 */
export function MeierKort({ spil, migId, send, kompakt = false }: MeierKortProps): JSX.Element | null {
  const m = spil.meier;
  const resultat = spil.meierResultat;

  const [kigger, saetKigger] = useState(false);
  const [harKigget, saetHarKigget] = useState(false);
  const [valgt, saetValgt] = useState<number | null>(null);
  const [kvitteret, saetKvitteret] = useState<number | null>(null);

  // Nyt slag i hånden: man skal kigge forfra, og meldingen vælges på ny.
  const slagNoegle = m?.slag ? `${m.holderId}:${m.slag[0]}${m.slag[1]}` : `${m?.holderId ?? ''}:tom`;
  const sidsteNoegle = useRef(slagNoegle);
  useEffect(() => {
    if (sidsteNoegle.current === slagNoegle) return;
    sidsteNoegle.current = slagNoegle;
    saetKigger(false);
    saetHarKigget(false);
    saetValgt(null);
  }, [slagNoegle]);

  // Fejringen må ikke spærre for brættet i det uendelige.
  const visFejring = Boolean(resultat) && resultat!.id !== kvitteret;
  useEffect(() => {
    if (!visFejring || !resultat) return;
    const t = setTimeout(() => saetKvitteret(resultat.id), 14000);
    return () => clearTimeout(t);
  }, [visFejring, resultat]);

  if (!m && !visFejring) return null;

  const jeg = spil.spillere.find((s) => s.id === migId);
  const erHolder = Boolean(m && m.holderId === migId);
  const erMed = Boolean(m && (m.udfordrerId === migId || m.modstanderId === migId));
  const holder = m ? spil.spillere.find((s) => s.id === m.holderId) : undefined;
  const udfordrer = m ? spil.spillere.find((s) => s.id === m.udfordrerId) : undefined;
  const modstander = m ? spil.spillere.find((s) => s.id === m.modstanderId) : undefined;
  const modpart = m && erMed
    ? spil.spillere.find((s) => s.id === (m.udfordrerId === migId ? m.modstanderId : m.udfordrerId))
    : undefined;

  const slag = m?.slag ?? null;
  const laveste = m && m.melding !== null ? m.melding : 0;
  // Man må kun kigge på sit eget slag. Rækker nogen bægeret over bordet, er
  // det de melder alt hvad man har — vil man vide mere, må man løfte.
  const kanKigge = erHolder && Boolean(slag);
  // Når bægeret er løftet, er terningerne hele bordets.
  const matSlag = visFejring && resultat ? resultat.slag : slag;
  const viserTerninger = Boolean(matSlag) && (visFejring || kigger);

  const baegerKlasse = [
    'meier-baeger',
    visFejring ? 'meier-baeger-loeftet' : '',
    !visFejring && kigger && slag ? 'meier-baeger-kig' : '',
    !erHolder && m ? 'meier-baeger-hos-dem' : ''
  ].filter(Boolean).join(' ');

  let matTekst = visFejring ? 'Bægeret er løftet' : 'Bægeret står på bordet';
  if (m) {
    if (erHolder) matTekst = slag
      ? (harKigget ? 'Du har set slaget — meld nu' : 'Slået. Ingen har set det endnu')
      : m.melding !== null
        ? 'Rakt over bordet — tro på det eller løft'
        : 'Bægeret er dit — ryst det';
    else matTekst = `Bægeret står hos ${holder?.navn ?? 'modstanderen'}`;
  }

  const kig = {
    onPointerDown: () => { saetKigger(true); saetHarKigget(true); },
    onPointerUp: () => saetKigger(false),
    onPointerLeave: () => saetKigger(false),
    onPointerCancel: () => saetKigger(false)
  };

  return (
    <div className={`meier-kort${kompakt ? ' meier-kort-mobil' : ''}${visFejring ? ' meier-kort-vundet' : ''}`}>
      <div className="meier-band">
        <span className="meier-prik" />
        <span className="meier-band-tekst">
          Meier{udfordrer && modstander ? ` · ${udfordrer.navn} mod ${modstander.navn}` : ''}
        </span>
        <span style={{ flexGrow: 1 }} />
        <span className="meier-band-h">{erMed ? 'Du er med' : 'Du ser på'}</span>
      </div>

      {m && erMed && (
        <div className="meier-duel">
          <div className="meier-duel-side">
            {jeg && <Brikprik s={jeg} str={34} />}
            <div style={{ minWidth: 0 }}>
              <div className="meier-duel-n">Dig</div>
              <div className="meier-duel-s">
                {m.meldtAf === migId && m.melding !== null ? `Meldte ${trinNavn(m.melding)}` : erHolder ? 'Bægeret er dit' : 'Venter'}
              </div>
            </div>
          </div>
          <div className="meier-mod">mod</div>
          <div className="meier-duel-side meier-duel-side-h">
            <div style={{ minWidth: 0 }}>
              <div className="meier-duel-n">{modpart?.navn ?? '—'}</div>
              <div className="meier-duel-s">
                {m.meldtAf && m.meldtAf === modpart?.id && m.melding !== null
                  ? `Melder ${trinNavn(m.melding)}`
                  : erHolder ? 'Venter på dig' : 'Har bægeret'}
              </div>
            </div>
            {modpart && <Brikprik s={modpart} str={34} />}
          </div>
        </div>
      )}

      <div className="meier-mat">
        <div className="meier-mat-glans" />
        <div className="meier-mat-ring" />
        <div className={`meier-lys${kigger && slag ? ' meier-lys-paa' : ''}`} />

        <div className={`meier-terninger${viserTerninger ? ' meier-terninger-vis' : ''}`}>
          <Terning vaerdi={matSlag ? matSlag[0] : null} str={kompakt ? 56 : 62} />
          <Terning vaerdi={matSlag ? matSlag[1] : null} str={kompakt ? 56 : 62} />
        </div>

        <div className={baegerKlasse}>
          <Baeger str={kompakt ? 140 : 152} laast={!erHolder && Boolean(m)} />
        </div>

        {m && (erHolder ? (
          <div className="meier-segl"><Laas /> Kun du kan se det</div>
        ) : (
          <div className="meier-segl"><Laas /> Terningerne er ikke dine</div>
        ))}

        {erHolder && harKigget && !kigger && slag && (
          <div className="meier-set">Du så {trinNavn(trin(slag[0], slag[1]))}</div>
        )}

        <div className="meier-mat-tekst">{matTekst}</div>
      </div>

      <div className="meier-styring">
        {m && erHolder && (
          <>
            {kanKigge && (
              <div className="meier-kig" role="button" tabIndex={0} {...kig}>
                <span className="meier-kig-h">{kigger ? 'Bliv ved med at holde' : 'Hold fingeren for at kigge'}</span>
                <span className="meier-kig-u">
                  {kigger ? 'Ingen andre kan se skærmen for dig' : 'Bægeret vipper kun mens du holder'}
                </span>
              </div>
            )}

            {!slag && (
              <button className="knap knap-primaer" style={{ minHeight: 54 }} onClick={() => send({ type: 'meier-slaa' })}>
                {m.melding === null ? 'Ryst bægeret og slå' : 'Tro på det og slå'}
              </button>
            )}

            {slag && harKigget && (
              <>
                <div className="eyebrow">Meld — det samme eller højere</div>
                <div className="meier-stige">
                  {muligeMeldinger(laveste).map((t) => (
                    <button
                      key={t}
                      className={`meier-trin${valgt === t ? ' meier-trin-valgt' : ''}`}
                      onClick={() => saetValgt(t)}
                    >
                      {trinNavn(t)}
                    </button>
                  ))}
                </div>
                <button
                  className={valgt === null ? 'knap' : 'knap knap-primaer'}
                  disabled={valgt === null}
                  onClick={() => valgt !== null && send({ type: 'meier-meld', melding: valgt })}
                >
                  {valgt === null ? 'Vælg en melding først' : `Meld ${trinNavn(valgt)} og send videre`}
                </button>
              </>
            )}

            {m.melding !== null && (
              <div className="meier-to">
                <button className="knap knap-tom" onClick={() => send({ type: 'meier-blindt' })}>
                  Det samme eller derover
                </button>
                <button className="knap knap-fare" onClick={() => send({ type: 'meier-loeft' })}>
                  Løft bægeret
                </button>
              </div>
            )}

            <div className="note">
              {slag && harKigget
                ? `Du behøver ikke sige sandheden. ${modpart?.navn ?? 'Modstanderen'} ser kun det tal du melder.`
                : slag
                  ? 'Slip fingeren, så falder bægeret ned igen.'
                  : 'Terningerne kommer aldrig frem af sig selv — de ligger under bægeret indtil nogen løfter det.'}
            </div>
          </>
        )}

        {m && !erHolder && (
          <>
            <div className="eyebrow">Meldinger</div>
            <div className="meier-stroem">
              {m.historik.slice(0, 5).map((h, i) => {
                const s = spil.spillere.find((p) => p.id === h.spillerId);
                return (
                  <div key={`${h.tekst}-${i}`} className={`meier-linje${i === 0 ? ' meier-linje-ny' : ''}`}>
                    {s && <Brikprik s={s} str={28} />}
                    <span className="meier-linje-t">{h.tekst}</span>
                    {h.melding && <span className="meier-linje-v">{h.melding}</span>}
                  </div>
                );
              })}
            </div>
            <div className="note">
              {erMed
                ? `Bægeret står hos ${holder?.navn ?? 'modstanderen'}. Vent på meldingen.`
                : 'Du ser kun hvad de melder. Terningerne kommer frem når nogen løfter bægeret.'}
            </div>
          </>
        )}
      </div>

      {visFejring && resultat && (
        <Fejring spil={spil} migId={migId} resultat={resultat} onLuk={() => saetKvitteret(resultat.id)} />
      )}
    </div>
  );
}
