import { writeFileSync } from 'node:fs';
import { main } from './tpl-main.mjs';
import { start, lobby, kort, meier, meierTilskuer } from './tpl-web.mjs';
import { taarn } from './tpl-taarn.mjs';
import { mobilSpil, mobilStart, mobilKort } from './tpl-mobil.mjs';

const OUT = new URL('./', import.meta.url);
const skriv = (navn, indhold) => {
  writeFileSync(new URL(navn, OUT), indhold, 'utf8');
  console.log(navn.padEnd(22), (indhold.length / 1024).toFixed(1) + ' KB');
};

skriv('Main.dc.html', main());
skriv('Start.dc.html', start());
skriv('Lobby.dc.html', lobby());
skriv('Kort.dc.html', kort());
skriv('Meier.dc.html', meier());
skriv('MeierTilskuer.dc.html', meierTilskuer());
skriv('Taarn.dc.html', taarn());
skriv('MobilSpil.dc.html', mobilSpil());
skriv('MobilStart.dc.html', mobilStart());
skriv('MobilKort.dc.html', mobilKort());

const canvas = {
  pages: [
    { id: 'page-1', name: 'Web' },
    { id: 'page-2', name: 'Mobil' }
  ],
  artboards: [
    { file: 'Main.dc.html', page: 'page-1', x: 0, y: 0, w: 1440, h: 900, title: 'Spilleplade — web', is_interactive: true },
    { file: 'Start.dc.html', page: 'page-1', x: 1560, y: 0, w: 1440, h: 900, title: 'Forside — start eller join' },
    { file: 'Lobby.dc.html', page: 'page-1', x: 3120, y: 0, w: 1440, h: 900, title: 'Lobby — del linket' },
    { file: 'Kort.dc.html', page: 'page-1', x: 0, y: 1060, w: 760, h: 860, title: 'Træk et kort', is_interactive: true },
    { file: 'Meier.dc.html', page: 'page-1', x: 880, y: 1060, w: 760, h: 860, title: 'Meier — dig i duellen', is_interactive: true },
    { file: 'MeierTilskuer.dc.html', page: 'page-1', x: 1760, y: 1060, w: 760, h: 860, title: 'Meier — resten af bordet' },
    { file: 'Taarn.dc.html', page: 'page-1', x: 2640, y: 1060, w: 760, h: 860, title: 'Øl i tårnet — hold for at hælde', is_interactive: true },
    { file: 'MobilStart.dc.html', page: 'page-2', x: 0, y: 0, w: 390, h: 844, title: 'Mobil — join via link' },
    { file: 'MobilSpil.dc.html', page: 'page-2', x: 490, y: 0, w: 390, h: 844, title: 'Mobil — spilleplade', is_interactive: true },
    { file: 'MobilKort.dc.html', page: 'page-2', x: 980, y: 0, w: 390, h: 844, title: 'Mobil — kort trukket' }
  ],
  annotations: [
    {
      id: 'note-plade',
      page: 'page-1',
      x: -360, y: 0, w: 300,
      text: 'Brættet er tegnet 1:1 efter fotoet af det originale bræt.\n\nAlle 38 felter ligger i den rækkefølge de står på pladen, og tællingen passer med reglerne: 2 x 2-krone, 4 x 3 til..?, 3 x SKÅL, 1 x Bier Meister, 3 x Go! Bier Meister, 5 x Øl i tårnet, 4 x Træk et kort, 2 x DRIK, 3 x Meier og 11 frifelter.\n\nPitten er ryddet op: pilene peger mod plads 1, og den stiplede messinglinje viser vejen ud på felt 1 ("3 til..?") — præcis som reglerne siger.'
    },
    {
      id: 'note-proto',
      page: 'page-1',
      x: -360, y: 1060, w: 300,
      text: 'Prøv det: terningen slår rigtigt, appen rykker selv brikken, turen går videre med uret, og lander nogen på "Øl i tårnet" stiger tårnet. Træk i pladen med musen og zoom med hjulet.\n\nMeier ligger som to artboards, fordi de to duellanter og resten af bordet ser noget forskelligt.\n\nNavne, cl i tårnet og loggen er eksempeldata.'
    },
    {
      id: 'note-slurke',
      page: 'page-1',
      x: 1900, y: 0, w: 300,
      text: 'Slurken er spillets fælles enhed. Én enhed = 11 slurke, uanset hvad man drikker — kun mængden bag en slurk skifter:\n\nPilsner 4,6%: 1 slurk = 3 cl (11 shots a 3 cl i en øl, som reglerne selv regner det).\nVin 12%: 1 glas = 11 slurke, 5 glas pr. flaske, altså ca. 1,4 cl pr. slurk.\nWhisky 40%: mit gæt er 4 cl som en enhed, ca. 0,4 cl pr. slurk. Bekræft eller ret mængden.\n\nTårnet måles derfor i slurke og vises omregnet til hver spillers egen drik. Tårnet er sat til at løbe over ved 16 slurke (et 0,5 l glas i øl-mål).'
    },
    {
      id: 'note-mobil',
      page: 'page-2',
      x: -360, y: 0, w: 300,
      text: 'Mobilen viser som udgangspunkt et udsnit omkring din egen brik — hele brættet på 390 px ville gøre felteksterne ulæselige. Minimap øverst til højre viser hvor på pladen du er, og "Overblik" zoomer ud til hele brættet.\n\nIngen falsk statusbar eller tastatur: det tegner telefonen selv oven på.'
    }
  ],
  launch: { view: 'canvas', page: 'page-1' }
};

writeFileSync(new URL('canvas.json', OUT), JSON.stringify(canvas, null, 2), 'utf8');
console.log('canvas.json'.padEnd(22), canvas.artboards.length + ' artboards');
