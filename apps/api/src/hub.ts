import { randomUUID } from 'node:crypto';
import type { WebSocket } from '@fastify/websocket';
import { RegelFejl, anvend, forSpiller, tolkHandling, type KlientHandling, type Spil } from '@k69/rules';
import { gem, hentSpil, logHaendelse } from './store.js';

interface Forbindelse {
  sok: WebSocket;
  spilId: string;
  kode: string;
  spillerId: string;
  /** Simpel spand mod klienter der sender for hurtigt. */
  poletter: number;
  sidstFyldt: number;
}

const rum = new Map<string, Set<Forbindelse>>();

const MAX_POLETTER = 60;
const POLETTER_PR_SEKUND = 30;

/** Handlinger der skal ligge på disken med det samme. Resten samles op. */
const VIGTIGE = new Set<KlientHandling['type']>([
  'join', 'start', 'slaa', 'meld-afgang', 'toem-taarn-faerdig', 'taarn-faerdig'
]);

/**
 * Én handling ad gangen pr. spil. Motoren arbejder på en kopi, så to handlinger
 * der kørte samtidig, ville hver lave deres eget nye spil — og den sidste ville
 * skrive den første ud. Køen gør at hver handling bygger videre på den forrige.
 */
const koeer = new Map<string, Promise<void>>();

function iKoe(spilId: string, opgave: () => Promise<void>): Promise<void> {
  const naeste = (koeer.get(spilId) ?? Promise.resolve()).then(opgave);
  const hale = naeste.catch(() => {});
  koeer.set(spilId, hale);
  void hale.then(() => {
    if (koeer.get(spilId) === hale) koeer.delete(spilId);
  });
  return naeste;
}

function send(sok: WebSocket, besked: unknown): void {
  if (sok.readyState !== 1) return;
  sok.send(JSON.stringify(besked));
}

/** Hver klient får sin egen udgave — Meier-slaget må kun holderen se. */
function udsend(spil: Spil): void {
  const flok = rum.get(spil.id);
  if (!flok) return;
  for (const f of flok) send(f.sok, { t: 'spil', spil: forSpiller(spil, f.spillerId) });
}

function harPolet(f: Forbindelse): boolean {
  const nu = Date.now();
  const gaaet = (nu - f.sidstFyldt) / 1000;
  f.sidstFyldt = nu;
  f.poletter = Math.min(MAX_POLETTER, f.poletter + gaaet * POLETTER_PR_SEKUND);
  if (f.poletter < 1) return false;
  f.poletter -= 1;
  return true;
}

function terning(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function ktx(spillerId: string) {
  return { spillerId, terning, naa: () => new Date().toISOString() };
}

export function tilslut(sok: WebSocket): void {
  let f: Forbindelse | null = null;

  sok.on('message', (raa: Buffer) => {
    let besked: { t?: string; kode?: string; spillerId?: string; handling?: unknown };
    try {
      besked = JSON.parse(raa.toString());
    } catch {
      send(sok, { t: 'fejl', besked: 'Kunne ikke læse beskeden.' });
      return;
    }

    if (besked.t === 'hej') {
      void hej(sok, besked.kode ?? '', besked.spillerId).then((ny) => {
        f = ny;
      });
      return;
    }

    if (besked.t === 'handling' && f && besked.handling) {
      void udfoer(f, besked.handling);
      return;
    }

    if (besked.t === 'puls') send(sok, { t: 'puls' });
  });

  sok.on('close', () => {
    if (!f) return;
    const flok = rum.get(f.spilId);
    flok?.delete(f);
    if (flok && flok.size === 0) rum.delete(f.spilId);
    // Samme spiller kan have en nyere forbindelse åben (genforbindelse, to
    // faner, React der monterer to gange). Så er han stadig ved bordet.
    const stadigInde = flok ? [...flok].some((o) => o.spillerId === f!.spillerId) : false;
    if (!stadigInde) void saetForbundet(f, false);
  });
}

async function hej(sok: WebSocket, kode: string, spillerId?: string): Promise<Forbindelse | null> {
  const spil = await hentSpil(kode);
  if (!spil) {
    send(sok, { t: 'fejl', besked: 'Det spil findes ikke — tjek koden i linket.', fatal: true });
    return null;
  }

  const id = spillerId && /^[0-9a-f-]{8,40}$/i.test(spillerId) ? spillerId : randomUUID();
  const f: Forbindelse = {
    sok,
    spilId: spil.id,
    kode: spil.kode,
    spillerId: id,
    poletter: MAX_POLETTER,
    sidstFyldt: Date.now()
  };

  let flok = rum.get(spil.id);
  if (!flok) {
    flok = new Set();
    rum.set(spil.id, flok);
  }
  flok.add(f);

  send(sok, { t: 'velkommen', spillerId: id, spil: forSpiller(spil, id) });
  await saetForbundet(f, true);
  return f;
}

function saetForbundet(f: Forbindelse, tilsluttet: boolean): Promise<void> {
  return iKoe(f.spilId, async () => {
    const spil = await hentSpil(f.kode);
    if (!spil) return;
    try {
      const efter = anvend(spil, { type: 'forbindelse', tilsluttet }, ktx(f.spillerId));
      gem(efter);
      udsend(efter);
    } catch {
      // Er man ikke med i spillet endnu, er der ikke noget at markere.
    }
  });
}

function udfoer(f: Forbindelse, raa: unknown): Promise<void> {
  if (!harPolet(f)) {
    send(f.sok, { t: 'fejl', besked: 'Rolig nu — for mange beskeder på én gang.' });
    return Promise.resolve();
  }

  let handling: KlientHandling;
  try {
    handling = tolkHandling(raa);
  } catch {
    send(f.sok, { t: 'fejl', besked: 'Ugyldig handling.' });
    return Promise.resolve();
  }

  return iKoe(f.spilId, () => anvendOgUdsend(f, handling));
}

async function anvendOgUdsend(f: Forbindelse, handling: KlientHandling): Promise<void> {
  const spil = await hentSpil(f.kode);
  if (!spil) {
    send(f.sok, { t: 'fejl', besked: 'Spillet findes ikke længere.', fatal: true });
    return;
  }

  const foerLog = spil.naesteHaendelseId;

  try {
    const efter = anvend(spil, handling, ktx(f.spillerId));
    gem(efter, VIGTIGE.has(handling.type));
    udsend(efter);

    // Nye linjer til hændelsestabellen, ældste først.
    for (const h of efter.log.filter((l) => l.id >= foerLog).reverse()) {
      logHaendelse(efter.id, h.slags, h.tekst, h.spillerId);
    }
  } catch (e) {
    if (e instanceof RegelFejl) {
      send(f.sok, { t: 'fejl', besked: e.message });
      return;
    }
    console.error('handling fejlede', handling.type, e);
    send(f.sok, { t: 'fejl', besked: 'Der gik noget galt. Prøv igen.' });
  }
}

export function antalTilsluttede(): number {
  let n = 0;
  for (const flok of rum.values()) n += flok.size;
  return n;
}
