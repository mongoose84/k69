import { useState, type JSX } from 'react';
import { BRAET_STR, BraetDefs, BraetPlade, opretSpil, slaaOpSpil } from '@k69/ui';
import { API } from '../api.js';

export function Forside({ onSpil }: { onSpil: (kode: string) => void }): JSX.Element {
  const [kode, saetKode] = useState('');
  const [travl, saetTravl] = useState(false);
  const [fejl, saetFejl] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    saetTravl(true);
    saetFejl(null);
    try {
      onSpil(await opretSpil(API));
    } catch {
      saetFejl('Kunne ikke oprette spillet.');
    } finally {
      saetTravl(false);
    }
  };

  const join = async (): Promise<void> => {
    const k = kode.trim().toUpperCase();
    if (!k) return;
    saetTravl(true);
    saetFejl(null);
    const fundet = await slaaOpSpil(API, k);
    saetTravl(false);
    if (!fundet) {
      saetFejl('Den kode findes ikke.');
      return;
    }
    onSpil(k);
  };

  return (
    <div className="skaerm">
      <div className="hero">
        <svg className="hero-art" viewBox={`0 0 ${BRAET_STR.w} ${BRAET_STR.h}`} aria-hidden="true">
          <BraetDefs id="mf" />
          <BraetPlade id="mf" brikker={[]} taarnAndel={0.4} />
        </svg>
        <div className="hero-slør" />
        <div className="hero-tekst">
          <div className="mark" style={{ fontSize: 64, lineHeight: 0.84 }}>K69</div>
          <p className="hero-lead">Brættet fra Tinglev.<br />38 felter og ét tårn.</p>
        </div>
      </div>

      <div className="ark-fast">
        <button className="knap knap-primaer" style={{ minHeight: 58 }} disabled={travl} onClick={() => void start()}>
          {travl ? 'Opretter…' : 'Start et spil'}
        </button>

        <div className="skille"><span>eller join med en kode</span></div>

        <input
          type="text"
          value={kode}
          maxLength={8}
          placeholder="K7M2Q"
          inputMode="text"
          autoCapitalize="characters"
          style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'var(--serif)', fontSize: 22, textAlign: 'center' }}
          onChange={(e) => saetKode(e.target.value)}
        />
        <button className="knap" style={{ minHeight: 52 }} disabled={travl || !kode.trim()} onClick={() => void join()}>
          Find spillet
        </button>

        {fejl && <div className="fejltekst">{fejl}</div>}
        <div className="note">Ingen konto og ingen kode i mailen. Har du fået et link, så åbn det bare.</div>
      </div>
    </div>
  );
}
