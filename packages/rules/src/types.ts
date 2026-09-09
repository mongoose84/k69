/** Feltets art. Rækkefølgen på pladen ligger i board.ts. */
export type FeltType =
  | 'fri'
  | 'tre'
  | 'skaal'
  | 'bm'
  | 'gobm'
  | 'taarn'
  | 'kort'
  | 'drik'
  | 'meier'
  | 'krone';

export type DrikId = 'ol' | 'vin' | 'whisky';

/** Hvem man drikker med når Dame- eller Kongekortet bliver trukket. */
export type KortHold = 'dame' | 'konge' | 'begge' | 'ingen';

export type Kuloer = 'spar' | 'klor' | 'hjerter' | 'ruder';
export type Rang = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'B' | 'D' | 'K';

export interface Kort {
  rang: Rang;
  kuloer: Kuloer;
}

export interface Spiller {
  id: string;
  navn: string;
  farve: string;
  drik: DrikId;
  kortHold: KortHold;
  /** 1–38 på pladen. 0 betyder at man er i pitten. */
  felt: number;
  /** 0 = ikke i pitten, ellers pladsen 1–6. */
  pitPlads: number;
  /** Slurke tilbage i den enhed man er i gang med (0–11). */
  slurkeTilbage: number;
  /** Hvor mange hele enheder man har lagt bag sig. */
  enheder: number;
  /** Samlet antal slurke spillet har tildelt. */
  slurkeIAlt: number;
  tilstand: 'aktiv' | 'ude';
  /** Sat når man har meldt afgang før sit sidste slag. */
  varslerAfgang: boolean;
  tilsluttet: boolean;
}

/**
 * Hvad spillet venter på lige nu. Serveren afviser enhver handling der ikke
 * svarer til det åbne punkt — det er dét der gør håndhævelsen hård.
 */
export type Afventer =
  | { slags: 'slag'; spillerId: string }
  | { slags: 'pit-slag'; spillerId: string }
  /** En anden spiller er slået hjem og skal slå sig en plads i pitten. */
  | { slags: 'pit-placering'; spillerId: string; kaede: string[] }
  | { slags: 'giv-slurke'; spillerId: string; antal: number }
  | { slags: 'fyld-taarn'; spillerId: string }
  | { slags: 'toem-taarn'; spillerId: string }
  | { slags: 'krone-kast'; spillerId: string }
  | { slags: 'krone-udpeg'; spillerId: string }
  | { slags: 'traek-kort'; spillerId: string }
  | { slags: 'kort-udfald'; spillerId: string; kort: Kort }
  | { slags: 'kaploeb'; kort: Kort; startetAf: string; ramte: string[] }
  | { slags: 'ny-regel'; spillerId: string }
  | { slags: 'vaelg-taber'; spillerId: string; grund: string }
  | { slags: 'meier-modstander'; spillerId: string }
  | { slags: 'meier'; spillerId: string };

export interface MeierHaendelse {
  /** Fri tekst som hele bordet må se. */
  tekst: string;
  melding?: string;
  spillerId: string;
}

export interface MeierSpil {
  udfordrerId: string;
  modstanderId: string;
  /** Hvem bægeret står hos netop nu. */
  holderId: string;
  /** Det faktiske slag. Sendes kun til den der selv slog det. */
  slag: [number, number] | null;
  /**
   * Hvem der slog det slag der ligger under bægeret. Får man bægeret rakt over
   * bordet, må man ikke se hvad der ligger under — man tror på meldingen og
   * slår videre, eller løfter.
   */
  slagAf: string | null;
  /** Sat når holderen har slået uden at kigge ("det samme eller derover"). */
  blindt: boolean;
  /** Seneste melding, som trin i stigen. */
  melding: number | null;
  meldtAf: string | null;
  historik: MeierHaendelse[];
}

export interface Taarn {
  /** Indhold målt i slurke — spillets fælles enhed. */
  slurke: number;
  fyldtAfId: string | null;
  /** Sat mens en spiller er i gang med at bunde tårnet. */
  toemmesAfId: string | null;
}

/**
 * Udfaldet af en Meier-runde. Terningerne er hemmelige lige indtil bægeret
 * løftes — så bliver de hele bordets, og det er dét der står her. Ligger uden
 * for `MeierSpil`, fordi selve runden ryddes i samme øjeblik.
 */
export interface MeierResultat {
  /** Hændelses-id'et for løftet, så klienten kan huske hvad den har kvitteret for. */
  id: number;
  vinderId: string;
  taberId: string;
  /** Det slag der lå under bægeret. */
  slag: [number, number];
  /** Meldingen der blev løftet på, som trin i stigen. */
  melding: number;
  /** Sandt når den der meldte, meldte højere end han havde. */
  loej: boolean;
  slurke: number;
  dobbelt: boolean;
}

export interface Haendelse {
  id: number;
  tid: string;
  slags: string;
  tekst: string;
  spillerId?: string;
  farve?: string;
}

export interface Indstillinger {
  hardcore: boolean;
  /** Slurke til taberen af en Meier-runde. Dobbelt hvis der tabes på en Meyer. */
  meierSlurke: number;
  /** Tårnet løber over her, målt i slurke (16 = et 0,5 l glas i øl-mål). */
  taarnKapacitet: number;
}

export interface Spil {
  id: string;
  kode: string;
  fase: 'lobby' | 'spiller' | 'slut';
  vaertId: string;
  indstillinger: Indstillinger;
  spillere: Spiller[];
  /** Indeks i spillere[] — turen går med uret. */
  turIdx: number;
  runde: number;
  terning: number | null;
  /** Hvem der slog det viste slag. */
  terningAf: string | null;
  taarn: Taarn;
  bierMeisterId: string | null;
  bunke: Kort[];
  brugte: Kort[];
  sidsteKort: Kort | null;
  husregler: string[];
  meier: MeierSpil | null;
  /** Sidste løftede bæger. Bliver stående indtil en ny Meier begynder. */
  meierResultat: MeierResultat | null;
  afventer: Afventer | null;
  log: Haendelse[];
  /** Spillere der skal i pitten når det aktuelle felt er kvitteret. */
  afventerPit: string[];
  naesteHaendelseId: number;
  opdateret: string;
}

/** Handlinger en klient kan sende. Alt andet afvises. */
export type Handling =
  | { type: 'join'; navn: string; farve: string; drik: DrikId; kortHold: KortHold }
  | { type: 'saet-drik'; drik: DrikId }
  | { type: 'saet-indstilling'; hardcore?: boolean; meierSlurke?: number }
  | { type: 'start' }
  | { type: 'slaa' }
  | { type: 'giv-slurke'; fordeling: Array<{ spillerId: string; antal: number }> }
  | { type: 'fyld-taarn'; slurke: number }
  | { type: 'taarn-faerdig' }
  | { type: 'toem-taarn-faerdig' }
  | { type: 'krone-resultat'; ramte: boolean }
  | { type: 'krone-udpeg'; spillerId: string }
  | { type: 'traek-kort' }
  | { type: 'kort-kvitter' }
  | { type: 'kaploeb-tryk' }
  | { type: 'ny-regel'; regel: string }
  | { type: 'fjern-regel'; index: number }
  | { type: 'vaelg-taber'; spillerId: string }
  | { type: 'meier-vaelg'; spillerId: string }
  | { type: 'meier-slaa' }
  | { type: 'meier-meld'; melding: number }
  | { type: 'meier-blindt' }
  | { type: 'meier-tro' }
  | { type: 'meier-loeft' }
  | { type: 'meld-afgang' }
  | { type: 'terning-paa-gulvet' }
  | { type: 'forbindelse'; tilsluttet: boolean };

export interface Kontekst {
  /** Hvem sender handlingen. */
  spillerId: string;
  /** Terningkast — injiceres så motoren kan testes og serveren ejer tilfældet. */
  terning: () => number;
  naa: () => string;
}

export class RegelFejl extends Error {
  override name = 'RegelFejl';
}
