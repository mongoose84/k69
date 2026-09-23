import {
  FELT_INFO, KULOER_TEGN, afventerSpiller, feltType, formatCl, formatSlurke, kortTekst,
  type Afventer, type DrikInfo, type Kort, type Spil, type Spiller
} from '@k69/rules';

/** "din pilsner", "din Classic" — de faste drikke skrives med lille, ens egen som man skrev den. */
export function drikNavn(drik: DrikInfo): string {
  return drik.id === 'egen' ? drik.navn : drik.navn.toLowerCase();
}

export function erRoedt(k: Kort): boolean {
  return k.kuloer === 'hjerter' || k.kuloer === 'ruder';
}

export function kuloerTegn(k: Kort): string {
  return KULOER_TEGN[k.kuloer];
}

/** Er der et terningslag på vej, står terningen blank — ellers viser den det sidste. */
export function venterPaaSlag(spil: Spil): boolean {
  const a = spil.afventer;
  return Boolean(a && (a.slags === 'slag' || a.slags === 'pit-slag' || a.slags === 'pit-placering'));
}

export interface Opgave {
  /** Overskrift i handlingskortet. */
  titel: string;
  /** Hvad man skal gøre — eller hvad man venter på. */
  tekst: string;
  /** Hvem opgaven ligger hos. Null = hele bordet. */
  spillerId: string | null;
  farve: string;
  /** Sandt når det er den kigende spiller der er på. */
  mig: boolean;
}

const FARVE: Record<string, string> = {
  fri: '#8C9689', tre: '#93AE7C', skaal: '#D3B44E', bm: '#C9A227', gobm: '#D08A4E',
  taarn: '#E0A03C', kort: '#88A2C2', drik: '#C4635B', meier: '#B084A0', krone: '#DCC684'
};

export function feltFarve(nr: number): string {
  return FARVE[feltType(nr)] ?? '#8C9689';
}

function navnPaa(spil: Spil, id: string | null | undefined): string {
  if (!id) return 'nogen';
  return spil.spillere.find((s) => s.id === id)?.navn ?? 'nogen';
}

/** Én kilde til hvad der står i handlingskortet — web og mobil siger det samme. */
export function opgave(spil: Spil, migId: string): Opgave | null {
  const a: Afventer | null = spil.afventer;
  if (!a) return null;
  const paa = afventerSpiller(a);
  const mig = paa === migId;
  const dig = mig ? 'Du' : navnPaa(spil, paa);
  const spiller = spil.spillere.find((s) => s.id === paa);
  const farve = spiller?.farve ?? 'var(--brass)';

  const grund = (titel: string, tekst: string): Opgave => ({ titel, tekst, spillerId: paa, farve, mig });

  switch (a.slags) {
    case 'slag':
      return grund(mig ? 'Din tur' : `${dig}s tur`, mig
        ? 'Slå med terningen — appen rykker selv din brik.'
        : `${dig} skal slå med terningen.`);

    case 'pit-slag':
      return grund(mig ? 'Du er i pitten' : `${dig} er i pitten`, mig
        ? 'Slå dig ned mod plads 1. Slår du nok, er du ude og lander på felt 1.'
        : `${dig} slår for at komme ud af pitten.`);

    case 'pit-placering': {
      const skubbet = Boolean(spiller && spiller.pitPlads > 0);
      if (skubbet) {
        return grund(mig ? 'Du blev skubbet' : `${dig} blev skubbet`, mig
          ? 'En anden landede på din plads i pitten. Slå om en ny plads — du har allerede drukket for den gamle.'
          : `${dig} slår om en ny plads i pitten.`);
      }
      return grund(mig ? 'Du røg i pitten' : `${dig} røg i pitten`, mig
        ? 'Slå med terningen. Du får den plads du slår og drikker lige så mange shots.'
        : `${dig} slår om sin plads i pitten — og drikker det tal der kommer.`);
    }

    case 'giv-slurke':
      return grund('3 til..?'.replace('3', String(a.antal)), mig
        ? `Del ${a.antal} slurke ud. Én kan tage det hele, eller I kan dele.`
        : `${dig} deler ${a.antal} slurke ud.`);

    case 'fyld-taarn':
      return grund('Øl i tårnet', mig
        ? 'Hold knappen nede og hæld i. Løber det over, bunder du det selv.'
        : `${dig} hælder i tårnet — der står ${formatSlurke(spil.taarn.slurke)}.`);

    case 'krone-kast':
      return grund('2-krone', mig
        ? 'Ét forsøg. Træk baglæns fra mønten og slip — den skal hoppe på bordet før den ryger i.'
        : `${dig} kaster med 2-kronen.`);

    case 'krone-udpeg':
      return grund('Den røg i!', mig
        ? 'Udpeg den der skal bunde tårnet.'
        : `${dig} udpeger en der skal bunde tårnet.`);

    case 'traek-kort':
      return grund('Træk et kort', mig ? 'Træk fra bunken.' : `${dig} trækker et kort.`);

    case 'kort-udfald': {
      const t = kortTekst(a.kort);
      return grund(t.titel, t.tekst);
    }

    case 'kaploeb': {
      const t = kortTekst(a.kort);
      return {
        titel: t.titel,
        tekst: `${t.tekst} ${a.ramte.length} har trykket.`,
        spillerId: null,
        farve: '#88A2C2',
        mig: !a.ramte.includes(migId)
      };
    }

    case 'ny-regel':
      return grund('Regelkort', mig
        ? 'Lav en regel der gælder alle — eller ophæv en af dem der står.'
        : `${dig} laver en ny husregel.`);

    case 'vaelg-taber':
      return grund('Emne', mig ? a.grund : `${dig} udpeger den der gik i stå.`);

    case 'meier-modstander':
      return grund('Meier', mig ? 'Vælg hvem du vil udfordre.' : `${dig} vælger en modstander.`);

    case 'meier':
      return grund('Meier', mig
        ? 'Bægeret står hos dig.'
        : `Bægeret står hos ${dig}. Resten af bordet ser kun meldingerne.`);

    default:
      return null;
  }
}

/** Hvad tårnet koster den enkelte spiller i hans egen drik. */
export function taarnFor(spil: Spil, spiller: Spiller | undefined): string {
  if (!spiller) return formatSlurke(spil.taarn.slurke);
  return formatCl(spil.taarn.slurke, spiller.drik);
}

export function feltNavn(nr: number): string {
  return FELT_INFO[feltType(nr)].navn;
}

export function feltRegel(nr: number): string {
  return FELT_INFO[feltType(nr)].regel;
}

/** Kort status under navnet i spillerlisten. */
export function spillerStatus(s: Spiller): string {
  if (s.tilstand === 'ude') return 'Hoppet ud';
  if (s.pitPlads > 0) return `Pitten · plads ${s.pitPlads}`;
  return `Felt ${s.felt} · ${feltNavn(s.felt)}`;
}
