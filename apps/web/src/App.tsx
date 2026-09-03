import { useEffect, useState, type JSX } from 'react';
import { useSpil } from '@k69/ui';
import { API } from './api.js';
import { Bord } from './skaerme/Bord.js';
import { Forside } from './skaerme/Forside.js';
import { Lobby } from './skaerme/Lobby.js';
import { Tilmeld } from './skaerme/Tilmeld.js';

/** To ruter er nok: forsiden og et spil. Derfor ingen router-afhængighed. */
function laesKode(): string | null {
  const m = /^\/spil\/([A-Za-z0-9]{3,10})\/?$/.exec(window.location.pathname);
  return m ? m[1]!.toUpperCase() : null;
}

export function App(): JSX.Element {
  const [kode, saetKode] = useState<string | null>(laesKode);

  useEffect(() => {
    const paa = (): void => saetKode(laesKode());
    window.addEventListener('popstate', paa);
    return () => window.removeEventListener('popstate', paa);
  }, []);

  const gaaTil = (nyKode: string | null): void => {
    const sti = nyKode ? `/spil/${nyKode}` : '/';
    window.history.pushState({}, '', sti);
    saetKode(nyKode);
  };

  if (!kode) return <Forside onSpil={gaaTil} />;
  return <Spilrute kode={kode} onForlad={() => gaaTil(null)} />;
}

function Spilrute({ kode, onForlad }: { kode: string; onForlad: () => void }): JSX.Element {
  const { spil, spillerId, forbundet, fejl, fatal, send, ryd } = useSpil(kode, API);

  if (fatal) {
    return (
      <div className="tomskaerm">
        <h1 style={{ fontSize: 40 }}>Det spil findes ikke</h1>
        <p className="note" style={{ maxWidth: 420 }}>
          {fejl ?? 'Tjek koden i linket — eller start et nyt spil.'}
        </p>
        <button className="knap knap-primaer" onClick={onForlad}>Til forsiden</button>
      </div>
    );
  }

  if (!spil) {
    return (
      <div className="tomskaerm">
        <div className="mark" style={{ fontSize: 64 }}>K69</div>
        <p className="note">{forbundet ? 'Henter bordet…' : 'Forbinder…'}</p>
      </div>
    );
  }

  const jeg = spil.spillere.find((s) => s.id === spillerId);

  if (!jeg) {
    return <Tilmeld spil={spil} send={send} fejl={fejl} ryd={ryd} />;
  }

  if (spil.fase === 'lobby') {
    return <Bane forbundet={forbundet} fejl={fejl} ryd={ryd}>
      <Lobby spil={spil} migId={spillerId} send={send} />
    </Bane>;
  }

  return (
    <Bane forbundet={forbundet} fejl={fejl} ryd={ryd}>
      <Bord spil={spil} migId={spillerId} send={send} />
    </Bane>
  );
}

function Bane({
  children, forbundet, fejl, ryd
}: {
  children: JSX.Element; forbundet: boolean; fejl: string | null; ryd: () => void;
}): JSX.Element {
  useEffect(() => {
    if (!fejl) return;
    const t = setTimeout(ryd, 5000);
    return () => clearTimeout(t);
  }, [fejl, ryd]);

  return (
    <>
      {children}
      {!forbundet && <div className="stribe">Forbindelsen røg — prøver igen…</div>}
      {fejl && (
        <div className="brummer" role="status" onClick={ryd}>
          {fejl}
        </div>
      )}
    </>
  );
}
