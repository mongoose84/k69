import { useState, type JSX } from 'react';
import { Elefant, opretSpil, slaaOpSpil } from '@k69/ui';
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
    <div className="skaerm forside">
      <div className="vandmaerke forside-vandmaerke" aria-hidden="true">K69</div>
      <Elefant className="elefant-stor forside-elefant" str={380} titel="Krunk-elefanten" />

      <header className="mobilbar" style={{ justifyContent: 'space-between', padding: '0 20px' }}>
        <div className="mark" style={{ fontSize: 24 }}>K69</div>
        <span className="pille" style={{ fontSize: 11, padding: '6px 11px' }}>1–8 spillere</span>
      </header>

      <div className="forside-hoved">
        <h1>Ét tårn.<br />En pit der gør ondt.</h1>
        <p className="lead">Brættet fra Tinglev.<br />38 felter og ét tårn.</p>
      </div>

      <div className="ark-fast papir">
        <button className="knap knap-primaer" disabled={travl} onClick={() => void start()}>
          {travl ? 'Opretter…' : 'Start et spil'}
        </button>

        <div className="skille"><span>eller deltag med en kode</span></div>

        <input
          type="text"
          className="kode-input"
          value={kode}
          maxLength={8}
          placeholder="K7M2Q"
          aria-label="Spilkode"
          inputMode="text"
          autoCapitalize="characters"
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
