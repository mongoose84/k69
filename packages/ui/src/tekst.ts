import {
  FELT_INFO, KULOER_TEGN, afventerSpiller, feltType, formatCl, formatSlurke, kortNavn, kortTekst, taarnCl, trinNavn,
  type Afventer, type DrikInfo, type Haendelse, type Kort, type Spil, type Spiller
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

/** "Mette", "Mette og Jeppe", "Mette, Jeppe og Sofie". */
export function navneliste(navne: string[]): string {
  if (navne.length < 2) return navne[0] ?? '';
  return `${navne.slice(0, -1).join(', ')} og ${navne[navne.length - 1]}`;
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

/** Feltets plakat-farve — samme fyld som på brættet. */
const FARVE: Record<string, string> = {
  fri: '#DFE6ED', tre: '#BCC6D0', skaal: '#CED8E2', bm: '#1B2733', gobm: '#BCC6D0',
  taarn: '#9FB1C3', kort: '#CED8E2', drik: '#1B2733', meier: '#BCC6D0', krone: '#CED8E2'
};

export function feltFarve(nr: number): string {
  return FARVE[feltType(nr)] ?? '#DFE6ED';
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
  const farve = spiller?.farve ?? '#CED8E2';

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
        ? 'Hold knappen nede og hæld i. Løber det over, bunder du det selv — men aldrig mere end et fuldt glas.'
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

    case 'hoejere-lavere': {
      const kaede = a.rigtige ? ` ${a.rigtige} rigtige i træk indtil nu.` : '';
      return grund('Højere eller lavere', mig
        ? `Er næste kort højere eller lavere end ${kortNavn(a.kort).toLowerCase()}? Samme værdi tæller som forkert.${kaede}`
        : `${dig} gætter på næste kort.${kaede}`);
    }

    case 'kaploeb': {
      const t = kortTekst(a.kort);
      return {
        titel: t.titel,
        tekst: `${t.tekst} ${a.ramte.length} har trykket.`,
        spillerId: null,
        farve: '#CED8E2',
        mig: !a.ramte.includes(migId)
      };
    }

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

/* ------------------------------------------------------------------ loggen */

/** Farven på en loglinje — brikfarven på den linjen handler om. */
export function haendelseFarve(spil: Spil, h: Haendelse): string | undefined {
  return h.spillerId ? spil.spillere.find((s) => s.id === h.spillerId)?.farve : undefined;
}

/**
 * En hændelse som den står i loggen. Motoren siger kun hvad der skete; det er
 * her det bliver til dansk. Navne slås op i spillet, så de følger med hvis
 * nogen skifter navn.
 */
export function haendelseTekst(spil: Spil, h: Haendelse): string {
  const n = (id: string | null | undefined): string =>
    (id && spil.spillere.find((s) => s.id === id)?.navn) || 'Nogen';
  const d = h.data;

  switch (d.type) {
    case 'join': return `${n(d.spillerId)} kom med til bordet.`;
    case 'anmodning': return `${d.navn} vil gerne med — venter på at værten lukker ind.`;
    case 'anmodning-afvist': return `${n(d.vaertId)} lukkede ikke ${d.navn} ind.`;
    case 'lukket-ind': return `${n(d.vaertId)} lukkede ${n(d.spillerId)} ind. ${n(d.spillerId)} står på felt ${d.felt}.`;
    case 'ny-vaert': return `${n(d.spillerId)} er ny vært.`;
    case 'start': return `Spillet er i gang. ${d.antal} ved bordet — turen går med uret.`;
    case 'afgang-meldt': return `${n(d.spillerId)} melder afgang efter dette slag.`;
    case 'afgang': return `${n(d.spillerId)} er hoppet ud af spillet.`;
    case 'slut': return 'Spillet er slut — der er ingen tilbage ved bordet.';

    case 'slag': return `${n(d.spillerId)} slog ${d.slag}.`;
    case 'landing': return `${n(d.spillerId)} landede på ${feltNavn(d.felt)} (felt ${d.felt}).`;
    case 'straf': return `${n(d.spillerId)} sendte terningen ud over bordkanten og drikker en straf-slurk.`;
    case 'skaal': return 'SKÅL! Alle ved bordet tager en fællesskål.';
    case 'bier-meister': return `${n(d.spillerId)} er den nye Bier Meister. Find noget grimt til hovedet.`;
    case 'go-bier-meister':
      return d.harBm
        ? `Go! Bier Meister — ${n(d.drikker)} drikker 3 slurke.`
        : `Go! Bier Meister — der er ingen Bier Meister, så ${n(d.landetAf)} drikker selv 3 slurke.`;
    case 'oel-i-taarnet': return `ØL I TÅRNET! ${n(d.drikkesAf)} må stille tårnet fra sig med det samme.`;
    case 'slurke-givet':
      return `${n(d.spillerId)} delte ${d.antal} slurke ud: ${d.fordeling.map((f) => `${n(f.spillerId)} ${f.antal}`).join(', ')}.`;

    case 'pit-plads':
      return d.skubbet
        ? `${n(d.spillerId)} blev skubbet videre i pitten og slog sig til plads ${d.plads}.`
        : `${n(d.spillerId)} slog ${d.plads}: plads ${d.plads} i pitten og ${d.plads} ${d.plads === 1 ? 'shot' : 'shots'}.`;
    case 'pit-slaaes-for': return `Terningen bliver slået for ${n(d.spillerId)}.`;
    case 'pit-ude': return `${n(d.spillerId)} slog ${d.slag} og er ude af pitten.`;
    case 'pit-ned': return `${n(d.spillerId)} slog ${d.slag}, rykkede ned på plads ${d.plads} og drikker ${d.plads} shots.`;

    case 'taarn-fyldt':
      return `${n(d.spillerId)} hældte i tårnet — der står nu ${formatSlurke(d.slurke)} (${taarnCl(d.slurke)} cl).`;
    case 'taarn-givet': {
      const hvorfor = d.grund === 'drik'
        ? `DRIK! ${n(d.spillerId)} skal bunde tårnet — ${formatSlurke(d.slurke)}.`
        : d.grund === 'overloeb'
          ? `Tårnet løb over ${d.kapacitetCl} cl — ${n(d.spillerId)} bunder det selv.`
          : `${n(d.udpegetAf)} udpegede ${n(d.spillerId)} til at bunde tårnet — ${formatSlurke(d.slurke)}.`;
      if (d.udfald === 'tomt') return `${hvorfor} Men tårnet er tomt — der er ikke noget at drikke.`;
      if (d.udfald === 'optaget') {
        return `${hvorfor} Men ${n(d.drikkesAf)} er i gang med at drikke tårnet — det bliver hos ${n(d.drikkesAf)}.`;
      }
      return hvorfor;
    }
    case 'taarn-bundet': return `${n(d.spillerId)} bundede tårnet — ${formatSlurke(d.slurke)}.`;
    case 'taarn-frit': return `Tårnet står frit igen — ${n(d.spillerId)} nåede ikke at bunde det.`;
    case 'krone':
      switch (d.udfald) {
        case 'forbi': return `${n(d.spillerId)} ramte ved siden af med 2-kronen.`;
        case 'tomt-taarn': return `${n(d.spillerId)} ramte i — men tårnet er tomt, så der er ingen at udpege.`;
        case 'taarn-optaget':
          return `${n(d.spillerId)} ramte i — men ${n(d.drikkesAf)} er i gang med at drikke tårnet, så det kan ikke gives videre.`;
        case 'ramt': return `${n(d.spillerId)} fik 2-kronen i tårnet og må udpege en.`;
      }
      break;

    case 'bunke-blandet': return 'Bunken var brugt op — der er blandet et nyt spil kort.';
    case 'kort-trukket': return `${n(d.spillerId)} trak ${kortNavn(d.kort)} — ${kortTekst(d.kort).titel}.`;
    case 'sidemand':
      return d.drikker
        ? `${n(d.drikker)} sidder til ${d.side === 'venstre' ? 'venstre' : 'højre'} og drikker ${d.slurke} slurk.`
        : `Der er ingen ved siden af ${n(d.spillerId)} — ingen drikker.`;
    case 'hold-drikker': {
      const hold = d.hold === 'dame' ? 'Damerne' : 'Herrerne';
      return d.ramte.length
        ? `${hold} drikker ${d.slurke} slurke: ${d.ramte.map(n).join(', ')}.`
        : `${hold} drikker — men ingen ved bordet er med på det hold.`;
    }
    case 'syver-tabt':
      return `${n(d.spillerId)} nåede ikke at lægge fingeren før næste 7'er — han drikker en slurk, og ${n(d.nyHolder)} tager over.`;
    case 'kaploeb-sidst': return `${n(d.spillerId)} var sidste mand og drikker en slurk.`;
    case 'hoejere-lavere': {
      const ord = d.gaet === 'hoejere' ? 'højere' : 'lavere';
      return d.rigtigt
        ? `${n(d.spillerId)} gættede ${ord} og fik ${kortNavn(d.kort)} — rigtigt. ${n(d.naeste)} gætter videre.`
        : `${n(d.spillerId)} gættede ${ord}, men det blev ${kortNavn(d.kort)} — ${n(d.spillerId)} drikker ${d.slurke} slurke.`;
    }
    case 'finger':
      return d.sidste
        ? `${n(d.lagtAf)} lagde fingeren på bordkanten. ${n(d.sidste)} så den aldrig — sidste mand drikker en slurk.`
        : `${n(d.lagtAf)} lagde fingeren på bordkanten — og alle nåede det.`;
    case 'gik-i-staa': return `${n(d.spillerId)} gik i stå og drikker en slurk.`;

    case 'meier-ingen-modstander': return 'Meier kræver en modstander — der er ingen at udfordre.';
    case 'meier-udfordret': return `${n(d.spillerId)} udfordrede ${n(d.modstanderId)} til en runde Meier.`;
    case 'meier-meldt': return `${n(d.spillerId)} melder ${trinNavn(d.melding)}.`;
    case 'meier-blindt': return `${n(d.spillerId)} slog uden at kigge og sagde "det samme eller derover".`;
    case 'meier-loeftet':
      return `${n(d.loefterId)} løftede bægeret: ${trinNavn(d.faktisk)} mod meldingen ${trinNavn(d.meldt)}. `
        + `${d.taberId ? n(d.taberId) : 'Ingen'} drikker ${d.slurke} slurke${d.dobbelt ? ' — dobbelt, det var en Meyer' : ''}.`;
    case 'meier-aflyst': return 'Meier-duellen er aflyst.';

    case 'afstemning-startet':
      return `${n(d.spillerId)} vil ${d.art === 'spring' ? `springe ${n(d.maalId)} over` : `smide ${n(d.maalId)} ud`} — bordet stemmer.`;
    case 'afstemning-afgjort': {
      const st = `${d.ja}–${d.nej}`;
      switch (d.udfald) {
        case 'nej':
          return `Bordet stemte nej (${st}) — ${n(d.maalId)} ${d.art === 'spring' ? 'bliver ikke sprunget over' : 'bliver ved bordet'}.`;
        case 'for-sent': return `Bordet stemte ja (${st}), men ${n(d.maalId)} nåede selv at komme til.`;
        case 'sprunget-over': return `Bordet stemte ja (${st}) — ${n(d.maalId)} bliver sprunget over.`;
        case 'smidt-ud': return `Bordet stemte ja (${st}) — ${n(d.maalId)} er smidt ud af spillet.`;
      }
      break;
    }

    case 'gammel': return d.tekst;
  }
  return ingenTekst(d);
}

/** Får hændelserne en ny slags uden en tekst her, fejler typetjekket på kaldet. */
function ingenTekst(d: never): string {
  return String((d as { type?: unknown }).type ?? '');
}
