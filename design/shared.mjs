// Fælles stil og stilladser for alle K69-artboards.
// Retning: "mørk kro-luksus" — filtgrøn, messing, ravgul øl-glød.

export const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,700&family=Karla:wght@400;500;600;700&display=swap">';

export const TOKENS = `
  :root {
    --bg: #0E1512;
    --panel: #141D18;
    --panel-2: #1A241E;
    --raise: #1F2C25;
    --line: #26332B;
    --line-2: #364739;
    --ink: #EDE7DA;
    --ink-dim: #97A398;
    --ink-faint: #6B796D;
    --brass: #C9A227;
    --brass-lt: #E8CE7E;
    --amber: #E0A03C;
    --rust: #B4483F;
    --sage: #93AE7C;
    --slate: #88A2C2;
    --plum: #B084A0;
    --serif: 'Bodoni Moda', Georgia, 'Times New Roman', serif;
    --sans: Karla, 'Helvetica Neue', Arial, sans-serif;
  }`;

export const BASE = `
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
  a { color: var(--brass-lt); text-decoration: none; }
  a:hover { color: var(--brass); }
  h1, h2, h3 { margin: 0; font-family: var(--serif); font-weight: 500; letter-spacing: 0.01em; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); }
  .rule { height: 1px; background: var(--line); }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 3px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 46px; padding: 0 22px;
         border: 1px solid var(--line-2); border-radius: 2px; background: var(--raise); color: var(--ink);
         font-family: var(--sans); font-size: 13px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; cursor: pointer; }
  .btn:hover { border-color: var(--brass); color: var(--brass-lt); }
  .btn-primary { background: linear-gradient(180deg, #E8CE7E 0%, #C9A227 48%, #A5811A 100%); border-color: #7E6413; color: #14180C; }
  .btn-primary:hover { color: #14180C; filter: brightness(1.06); }
  .btn-ghost { background: transparent; }
  .k69-felt { cursor: pointer; }
  .k69-felt:hover polygon { stroke: var(--brass); stroke-width: 1.6; }`;

export function head(title, extraCss) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONTS}
  <style>${TOKENS}${BASE}${extraCss || ''}
  </style>
</helmet>`;
}

export function foot(props, logic) {
  return `</x-dc>
<script data-dc-script data-props='${props}'>
${logic}
</script>
</body>
</html>
`;
}

// Spillerfarver — samme lyshed/chroma, kun kulør varierer.
export const SPILLERE = [
  { navn: 'Mette', farve: '#D8A93F' },
  { navn: 'Jeppe', farve: '#8FAF74' },
  { navn: 'Sofie', farve: '#87A4C6' },
  { navn: 'Rasmus', farve: '#C4776B' },
  { navn: 'Ida', farve: '#B189A6' },
  { navn: 'Kasper', farve: '#7FB0A4' },
  { navn: 'Line', farve: '#C9A227' },
  { navn: 'Emil', farve: '#9C9A78' }
];

// Slurken er spillets fælles enhed. Én enhed = 11 slurke, uanset drik —
// kun mængden bag en slurk skifter. Øl: 11 shots à 3 cl i en øl (fra reglerne).
// Vin: 5 glas på en flaske. Whisky er mit gæt og skal bekræftes.
export const DRIKKE = [
  { id: 'ol', navn: 'Pilsner', styrke: '4,6%', maal: '33 cl', cl: 33, slurke: 11 },
  { id: 'vin', navn: 'Vin', styrke: '12%', maal: '15 cl', cl: 15, slurke: 11 },
  { id: 'whisky', navn: 'Whisky', styrke: '40%', maal: '4 cl', cl: 4, slurke: 11 }
];

// Tårnet er et 0,5 l glas. Målt i øl-slurke à 3 cl løber det over ved 16.
export const TAARN_KAPACITET = 16;

// Delt hjælper: hvad koster N slurke i cl af den drik man selv har valgt?
export const CL_KODE = `
const CL_PR_SLURK = { ol: 3, vin: 15 / 11, whisky: 4 / 11 };
function iCl(slurke, drik) {
  const v = slurke * (CL_PR_SLURK[drik] || 3);
  return (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)).toString().replace('.', ',') + ' cl';
}`;

export const FELT_TEKST = {
  fri: ['Frifelt', 'Der sker ingenting. Men fredet er du ikke — de andre må stadig give dig slurke.'],
  tre: ['3 til..?', 'Du deler tre slurke ud. Du bestemmer selv om én tager alle tre, eller om tre tager én hver.'],
  skaal: ['SKÅL!', 'Alle ved bordet tager en fællesskål.'],
  bm: ['Bier Meister', 'Du er nu Bier Meister. Find noget grimt at sætte på hovedet. Du henter øl, og du drikker hver gang nogen lander på Go! Bier Meister. Titlen ryger først videre når en anden lander her.'],
  gobm: ['Go! Bier Meister', 'Bier Meisteren drikker 3 slurke. Er der ingen Bier Meister, drikker du selv.'],
  taarn: ['Øl i tårnet', 'Hæld så meget øl i tårnet du har lyst til. Løber det over, bunder du det selv.'],
  kort: ['Træk et kort', 'Træk et kort fra bunken og gør hvad der står.'],
  drik: ['DRIK!', 'Kort og godt: bund tårnet.'],
  meier: ['Meier', 'Udfordr en spiller til én runde Meyer. Taberen drikker — taber du på en Meyer, drikker du dobbelt.'],
  krone: ['2-krone', 'Ét forsøg: smid 2-kronen i tårnet. Den skal ramme bordet først. Lykkes det, udpeger du én der skal bunde tårnet.']
};

export const KORT = [
  { r: 'A', k: 'spar', t: 'Sort uheld', d: 'Spar og klør er sort uheld — du drikker selv. 1 slurk for es.' },
  { r: '4', k: 'hjerter', t: 'Del ud', d: 'Hjerter og ruder må du give væk. 4 slurke at fordele.' },
  { r: '6', k: 'ruder', t: 'Frikort', d: 'Der sker ingenting.' },
  { r: '7', k: 'klør', t: 'Fingeren på bordkanten', d: 'Læg diskret en finger på bordkanten. Sidste mand drikker. Når du ikke det inden næste 7’er, drikker du selv.' },
  { r: '8', k: 'spar', t: 'Fingeren på næsen', d: 'Hurtigt op på næsen. Sidste mand drikker.' },
  { r: '9', k: 'hjerter', t: 'Emne', d: 'Sig et emne. Alle nævner noget nyt på skift indtil en går i stå eller gentager.' },
  { r: '10', k: 'ruder', t: 'Maraton', d: 'Alle drikker samtidig. Du må stoppe først, så din venstremand, og så videre rundt.' },
  { r: 'B', k: 'klør', t: 'Regelkort', d: 'Lav en regel der gælder alle — eller ophæv en eksisterende. Den sidste regel gælder.' },
  { r: 'D', k: 'hjerter', t: 'Damerne drikker', d: 'Alle kvinder ved bordet drikker.' },
  { r: 'K', k: 'spar', t: 'Herrerne drikker', d: 'Alle mænd ved bordet drikker.' }
];

export const KULOER = {
  spar: { tegn: '♠', farve: '#C7D2C8' },
  klor: { tegn: '♣', farve: '#C7D2C8' },
  klør: { tegn: '♣', farve: '#C7D2C8' },
  hjerter: { tegn: '♥', farve: '#C0584E' },
  ruder: { tegn: '♦', farve: '#C0584E' }
};
