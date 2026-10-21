import type { Kort, KortHold } from './types.js';

/**
 * Hvad der skete, uden ord. Motoren skriver dem i loggen; klienten gør dem til
 * tekst (`haendelseTekst` i @k69/ui), og serveren gemmer dem i
 * `haendelser.data`. Id'er peger på `spil.spillere` — kun en anmodning bærer
 * sit navn selv, for den der spørger, er ikke ved bordet endnu.
 */
export type DomaeneHaendelse =
  /* ------------------------------------------------------------- bordet */
  | { type: 'join'; spillerId: string }
  | { type: 'anmodning'; navn: string }
  | { type: 'anmodning-afvist'; vaertId: string; navn: string }
  | { type: 'lukket-ind'; vaertId: string; spillerId: string; felt: number }
  | { type: 'ny-vaert'; spillerId: string }
  | { type: 'start'; antal: number }
  | { type: 'afgang-meldt'; spillerId: string }
  | { type: 'afgang'; spillerId: string }
  | { type: 'slut' }

  /* ------------------------------------------------- slag og felter */
  | { type: 'slag'; spillerId: string; slag: number }
  | { type: 'landing'; spillerId: string; felt: number }
  | { type: 'straf'; spillerId: string }
  | { type: 'skaal'; spillerId: string }
  | { type: 'bier-meister'; spillerId: string }
  /** `drikker` er Bier Meisteren — eller den der landede, hvis der ingen er. */
  | { type: 'go-bier-meister'; landetAf: string; drikker: string; harBm: boolean }
  /** Landede på "Øl i tårnet" mens en anden var i gang med at bunde det. */
  | { type: 'oel-i-taarnet'; landetAf: string; drikkesAf: string }
  | { type: 'slurke-givet'; spillerId: string; antal: number; fordeling: Array<{ spillerId: string; antal: number }> }

  /* ------------------------------------------------------------- pitten */
  | { type: 'pit-plads'; spillerId: string; plads: number; skubbet: boolean }
  | { type: 'pit-slaaes-for'; spillerId: string }
  | { type: 'pit-ude'; spillerId: string; slag: number }
  | { type: 'pit-ned'; spillerId: string; slag: number; plads: number }

  /* ------------------------------------------------------------- tårnet */
  /** `slurke` er hvad der står i tårnet bagefter. */
  | { type: 'taarn-fyldt'; spillerId: string; slurke: number }
  | {
    type: 'taarn-givet';
    spillerId: string;
    /** Landede på DRIK, tårnet løb over, eller blev udpeget med 2-kronen. */
    grund: 'drik' | 'overloeb' | 'udpeget';
    udpegetAf?: string;
    kapacitetCl?: number;
    slurke: number;
    /** Givet videre, eller ikke — fordi det var tomt, eller en anden drak det. */
    udfald: 'givet' | 'tomt' | 'optaget';
    drikkesAf?: string;
  }
  | { type: 'taarn-bundet'; spillerId: string; slurke: number }
  /** Den der skulle bunde det, er smidt ud. */
  | { type: 'taarn-frit'; spillerId: string }
  | { type: 'krone'; spillerId: string; udfald: 'forbi' | 'tomt-taarn' | 'taarn-optaget' | 'ramt'; drikkesAf?: string }

  /* -------------------------------------------------------------- kortene */
  | { type: 'bunke-blandet' }
  | { type: 'kort-trukket'; spillerId: string; kort: Kort }
  /** `drikker` er null når der ingen sidder ved siden af. */
  | { type: 'sidemand'; spillerId: string; side: 'venstre' | 'hoejre'; drikker: string | null; slurke: number }
  | { type: 'hold-drikker'; spillerId: string; hold: KortHold; ramte: string[]; slurke: number }
  | { type: 'syver-tabt'; spillerId: string; nyHolder: string }
  | { type: 'kaploeb-sidst'; spillerId: string }
  | {
    type: 'hoejere-lavere';
    spillerId: string;
    gaet: 'hoejere' | 'lavere';
    kort: Kort;
    rigtigt: boolean;
    /** Rigtigt: hvem der gætter videre. Forkert: hvor mange slurke. */
    naeste?: string;
    slurke?: number;
  }
  /** `sidste` er null når alle nåede det. */
  | { type: 'finger'; lagtAf: string; sidste: string | null }
  | { type: 'gik-i-staa'; spillerId: string }

  /* ---------------------------------------------------------------- Meier */
  | { type: 'meier-ingen-modstander'; spillerId: string }
  | { type: 'meier-udfordret'; spillerId: string; modstanderId: string }
  | { type: 'meier-meldt'; spillerId: string; melding: number }
  | { type: 'meier-blindt'; spillerId: string }
  | {
    type: 'meier-loeftet';
    loefterId: string;
    faktisk: number;
    meldt: number;
    taberId: string | null;
    slurke: number;
    dobbelt: boolean;
  }
  | { type: 'meier-aflyst' }

  /* ----------------------------------------------------------- afstemning */
  | { type: 'afstemning-startet'; spillerId: string; maalId: string; art: 'spring' | 'smid' }
  | {
    type: 'afstemning-afgjort';
    maalId: string;
    art: 'spring' | 'smid';
    ja: number;
    nej: number;
    /** Nej; ja men han nåede selv at komme til; sprunget over; smidt ud. */
    udfald: 'nej' | 'for-sent' | 'sprunget-over' | 'smidt-ud';
  }

  /* ------------------------------------------- fra før der var struktur */
  | { type: 'gammel'; slags: string; tekst: string };
