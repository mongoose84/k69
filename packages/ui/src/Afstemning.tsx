import { useEffect, useRef, useState, type JSX, type PointerEvent as ReactPointerEvent } from 'react';
import { AFSTEMNING_SEKUNDER, venterPaa, type KlientHandling, type Spil } from '@k69/rules';
import { Brik } from './Dele.js';

/** Så længe står udfaldet på skærmen, når bordet har stemt. */
const UDFALD_MS = 3000;
/** Et langt tryk på telefonen er dens højreklik. */
const LANGT_TRYK_MS = 550;

interface Aaben {
  spillerId: string;
  x: number;
  y: number;
}

/**
 * Højreklik (eller et langt tryk på telefonen) på en spiller åbner en lille
 * menu: spring ham over, eller smid ham ud. Bordet stemmer om det bagefter.
 * `props(id)` lægges på det man vil kunne klikke på; `menu` tegnes et sted i
 * skærmen.
 */
export function useSpillerMenu(spil: Spil, migId: string, send: (h: KlientHandling) => void) {
  const [aaben, saetAaben] = useState<Aaben | null>(null);
  const tryk = useRef<{ ur: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  const kanAabne = (id: string): boolean => {
    const s = spil.spillere.find((o) => o.id === id);
    return spil.fase === 'spiller' && id !== migId && Boolean(s && s.tilstand === 'aktiv')
      && spil.spillere.some((o) => o.id === migId && o.tilstand === 'aktiv');
  };

  const slipTryk = (): void => {
    if (tryk.current) clearTimeout(tryk.current.ur);
    tryk.current = null;
  };

  const props = (id: string) => ({
    onContextMenu: (e: { preventDefault: () => void; clientX: number; clientY: number }) => {
      if (!kanAabne(id)) return;
      e.preventDefault();
      slipTryk();
      saetAaben({ spillerId: id, x: e.clientX, y: e.clientY });
    },
    // iOS sender ikke contextmenu ved et langt tryk — så det klares her.
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'touch' || !kanAabne(id)) return;
      const { clientX: x, clientY: y } = e;
      slipTryk();
      tryk.current = { x, y, ur: setTimeout(() => saetAaben({ spillerId: id, x, y }), LANGT_TRYK_MS) };
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const t = tryk.current;
      if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10) slipTryk();
    },
    onPointerUp: slipTryk,
    onPointerCancel: slipTryk
  });

  useEffect(() => {
    if (!aaben) return;
    const luk = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') saetAaben(null);
    };
    window.addEventListener('keydown', luk);
    return () => window.removeEventListener('keydown', luk);
  }, [aaben]);

  useEffect(() => slipTryk, []);

  // Starter en afstemning mens menuen står åben, er den ikke længere til at bruge.
  const aabenAfstemning = spil.afstemning && !spil.afstemning.udfald ? spil.afstemning.id : null;
  useEffect(() => {
    if (aabenAfstemning !== null) saetAaben(null);
  }, [aabenAfstemning]);

  const maal = aaben ? spil.spillere.find((o) => o.id === aaben.spillerId) : undefined;
  const igang = Boolean(spil.afstemning && !spil.afstemning.udfald);
  const kanSpringe = Boolean(maal && venterPaa(spil, maal.id));

  const vaelg = (art: 'spring' | 'smid'): void => {
    if (!maal) return;
    send({ type: 'afstemning-start', art, spillerId: maal.id });
    saetAaben(null);
  };

  const menu = aaben && maal ? (
    <div className="spillermenu-bag" onClick={() => saetAaben(null)} onContextMenu={(e) => { e.preventDefault(); saetAaben(null); }}>
      <div
        className="spillermenu"
        role="menu"
        aria-label={`Handlinger for ${maal.navn}`}
        style={{
          left: Math.max(8, Math.min(aaben.x, window.innerWidth - 248)),
          top: Math.max(8, Math.min(aaben.y, window.innerHeight - 190))
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="spillermenu-hoved">
          <Brik navn={maal.navn} farve={maal.farve} str={24} />
          <span>{maal.navn}</span>
        </div>
        <button role="menuitem" className="spillermenu-valg" disabled={igang || !kanSpringe} onClick={() => vaelg('spring')}>
          Spring {maal.navn} over
          {!kanSpringe && <small>Spillet venter ikke på {maal.navn} lige nu</small>}
        </button>
        <button role="menuitem" className="spillermenu-valg spillermenu-fare" disabled={igang} onClick={() => vaelg('smid')}>
          Smid {maal.navn} ud
        </button>
        {igang && <div className="spillermenu-note">Bordet stemmer allerede om noget.</div>}
        <div className="spillermenu-note">Bordet stemmer om det — I har {AFSTEMNING_SEKUNDER} sekunder.</div>
      </div>
    </div>
  ) : null;

  return { props, menu };
}

/**
 * Afstemningen hen over hele skærmen. Alle der stemmer, får Ja og Nej og en
 * nedtælling; den det handler om og dem der kom til bagefter, ser bare med.
 * Udfaldet står et par sekunder, når det er afgjort.
 */
export function AfstemningKort({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: KlientHandling) => void;
}): JSX.Element | null {
  const a = spil.afstemning ?? null;
  const [nu, saetNu] = useState(() => Date.now());
  // Nedtællingen regnes fra da afstemningen dukkede op her — så skæve ure ikke snyder.
  const [frist, saetFrist] = useState<{ id: number; slut: number } | null>(null);
  const [afgjortSet, saetAfgjortSet] = useState<{ id: number; tid: number } | null>(null);

  const aabenId = a && !a.udfald ? a.id : null;
  useEffect(() => {
    if (aabenId === null || frist?.id === aabenId || !a) return;
    const rest = Date.parse(a.udloeber) - Date.now();
    const ms = rest > 0 && rest <= AFSTEMNING_SEKUNDER * 1000 ? rest : AFSTEMNING_SEKUNDER * 1000;
    saetFrist({ id: aabenId, slut: Date.now() + ms });
  }, [aabenId, frist?.id, a]);

  // Udfaldet vises kun for en afstemning man selv har set køre — ikke en gammel ved genindlæsning.
  const afgjortId = a && a.udfald && frist?.id === a.id ? a.id : null;
  useEffect(() => {
    if (afgjortId !== null && afgjortSet?.id !== afgjortId) saetAfgjortSet({ id: afgjortId, tid: Date.now() });
  }, [afgjortId, afgjortSet?.id]);

  const synlig = Boolean(a && (aabenId !== null || (afgjortSet && afgjortSet.id === a.id && nu - afgjortSet.tid < UDFALD_MS)));
  useEffect(() => {
    if (!synlig) return;
    const ur = setInterval(() => saetNu(Date.now()), 200);
    return () => clearInterval(ur);
  }, [synlig]);

  if (!a || !synlig) return null;

  const maal = spil.spillere.find((o) => o.id === a.maalId);
  const starter = spil.spillere.find((o) => o.id === a.startetAf);
  const maalNavn = a.maalId === migId ? 'dig' : maal?.navn ?? 'en spiller';
  const sporgsmaal = a.art === 'spring' ? `Spring ${maalNavn} over?` : `Smid ${maalNavn} ud?`;
  const minStemme = a.stemmer[migId];
  const maaStemme = a.vaelgere.includes(migId) && !a.udfald;
  const ja = a.vaelgere.filter((id) => a.stemmer[id] === 'ja').length;
  const nej = a.vaelgere.filter((id) => a.stemmer[id] === 'nej').length;
  const sekunder = frist && !a.udfald ? Math.max(0, Math.ceil((frist.slut - nu) / 1000)) : 0;
  const andel = frist && !a.udfald ? Math.max(0, Math.min(1, (frist.slut - nu) / (AFSTEMNING_SEKUNDER * 1000))) : 0;

  return (
    <div className="afstemning-bag" role="dialog" aria-modal="true" aria-labelledby="afstemning-titel">
      <div className={`afstemning-kort${a.udfald ? ` afstemning-${a.udfald}` : ''}`}>
        <div className="eyebrow">
          {a.udfald ? 'Bordet har stemt' : `${starter?.id === migId ? 'Du' : starter?.navn ?? 'Nogen'} spørger bordet`}
        </div>
        {maal && <Brik navn={maal.navn} farve={maal.farve} str={54} />}
        <h2 id="afstemning-titel" className="afstemning-titel">
          {a.udfald
            ? a.udfald === 'ja'
              ? a.art === 'spring' ? `${maal?.navn ?? 'Spilleren'} springes over` : `${maal?.navn ?? 'Spilleren'} er smidt ud`
              : `${maal?.navn ?? 'Spilleren'} bliver`
            : sporgsmaal}
        </h2>

        {!a.udfald && (
          <div className="afstemning-ur" aria-live="polite">
            <div className="afstemning-tal">{sekunder}</div>
            <div className="afstemning-bjaelke"><div style={{ width: `${andel * 100}%` }} /></div>
          </div>
        )}

        {maaStemme && !minStemme && (
          <div className="afstemning-knapper">
            <button className="knap knap-primaer" onClick={() => send({ type: 'afstemning-stem', id: a.id, ja: true })}>Ja</button>
            <button className="knap" onClick={() => send({ type: 'afstemning-stem', id: a.id, ja: false })}>Nej</button>
          </div>
        )}
        {maaStemme && minStemme && (
          <div className="note">Du stemte {minStemme}. Venter på resten af bordet.</div>
        )}
        {!a.udfald && a.maalId === migId && (
          <div className="note">Bordet stemmer om dig. Du kan ikke selv stemme med.</div>
        )}

        <div className="afstemning-stilling">
          <span>Ja {ja}</span>
          <span>Nej {nej}</span>
          <span>{a.vaelgere.length - ja - nej} mangler</span>
        </div>
        {!a.udfald && <div className="note" style={{ textAlign: 'center' }}>Flertal af de afgivne stemmer afgør det. Står det lige, er svaret nej.</div>}
      </div>
    </div>
  );
}
