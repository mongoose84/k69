import { useState, type JSX } from 'react';
import { Brik, DRIK_NAVN, Maerkat } from '@k69/ui';
import type { Handling, Spil } from '@k69/rules';
import { spilUrl } from '../api.js';

export function Lobby({
  spil, migId, send
}: {
  spil: Spil; migId: string; send: (h: Handling) => void;
}): JSX.Element {
  const [kopieret, saetKopieret] = useState(false);
  const erVaert = spil.vaertId === migId;
  const url = spilUrl(spil.kode);

  const del = async (): Promise<void> => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'K69', text: 'Kom med til K69', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      saetKopieret(true);
      setTimeout(() => saetKopieret(false), 2200);
    } catch {
      /* afbrudt af brugeren */
    }
  };

  return (
    <div className="skaerm">
      <header className="mobilbar">
        <div className="mark" style={{ fontSize: 24 }}>K69</div>
        <div className="kode-lille">{spil.kode}</div>
        <div style={{ flexGrow: 1 }} />
        <div className="note">{spil.spillere.length} af 8</div>
      </header>

      <div className="rul">
        <div className="blok">
          <div className="eyebrow">Inden I går i gang</div>
          <h1 style={{ fontSize: 30, marginTop: 12 }}>Del linket i gruppen</h1>
          <p className="note" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65 }}>
            Alle der åbner linket skriver bare et navn og vælger en brik.
          </p>
        </div>

        <div className="blok">
          <button className="knap knap-primaer" style={{ width: '100%', minHeight: 56 }} onClick={() => void del()}>
            {kopieret ? 'Linket er kopieret' : 'Del linket'}
          </button>
          <div className="linkboks-lille">{url}</div>
        </div>

        <div className="blok">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Ved bordet</div>
          <div className="liste">
            {spil.spillere.map((s) => (
              <div key={s.id} className="raekke">
                <Brik navn={s.navn} farve={s.farve} str={34} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{s.navn}</div>
                  <div className="note">{DRIK_NAVN[s.drik]}</div>
                </div>
                {s.id === spil.vaertId && <Maerkat>VÆRT</Maerkat>}
                {s.id === migId && <Maerkat farve="var(--sage)">DIG</Maerkat>}
              </div>
            ))}
          </div>
        </div>

        <div className="blok">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Husregler</div>
          <div className="valg-r">
            <div>
              <div className="valg-t">Hardcore</div>
              <div className="valg-d">Kun ud fra et blankt felt. Aftal det fra start.</div>
            </div>
            <button
              className={spil.indstillinger.hardcore ? 'kontakt kontakt-paa' : 'kontakt'}
              disabled={!erVaert}
              aria-pressed={spil.indstillinger.hardcore}
              onClick={() => send({ type: 'saet-indstilling', hardcore: !spil.indstillinger.hardcore })}
            >
              <span />
            </button>
          </div>
          <div className="valg-r" style={{ borderBottom: 'none' }}>
            <div>
              <div className="valg-t">Slurke for at tabe en Meier</div>
              <div className="valg-d">Dobbelt hvis der tabes på en Meyer.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="knap" style={{ minHeight: 40, width: 40, padding: 0 }} disabled={!erVaert}
                onClick={() => send({ type: 'saet-indstilling', meierSlurke: spil.indstillinger.meierSlurke - 1 })}>−</button>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 20, width: 22, textAlign: 'center' }}>
                {spil.indstillinger.meierSlurke}
              </span>
              <button className="knap" style={{ minHeight: 40, width: 40, padding: 0 }} disabled={!erVaert}
                onClick={() => send({ type: 'saet-indstilling', meierSlurke: spil.indstillinger.meierSlurke + 1 })}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="ark-fast">
        {erVaert ? (
          <button className="knap knap-primaer" style={{ minHeight: 56 }} onClick={() => send({ type: 'start' })}>
            Start spillet
          </button>
        ) : (
          <div className="note" style={{ textAlign: 'center' }}>
            Venter på at {spil.spillere.find((s) => s.id === spil.vaertId)?.navn ?? 'værten'} starter.
          </div>
        )}
      </div>
    </div>
  );
}
