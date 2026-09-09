// Lægger den rigtige spilleplade ind som baggrund i Meier-artboardsene.
// Geometrien kommer fra design/board.mjs — den samme der tegner brættet i
// resten af designet — så kortet ligger over det bræt spillet faktisk har.
// Kør igen efter ændringer: node braet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import * as B from '../board.mjs';

const BRIKKER = [
  { felt: 26, farve: '#8FAF74', initial: 'J' },
  { felt: 31, farve: '#B189A6', initial: 'I' },
  { felt: 14, farve: '#D8A93F', initial: 'M' },
  { felt: 7, farve: '#C4776B', initial: 'R' },
  { felt: 19, farve: '#87A4C6', initial: 'S' }
];

// Telefonen beskærer brættet; skrivebordet viser hele pladen i scenen mellem
// de to skinner (1440 - 2 x 340 = 760 px bred).
const MAAL = [
  { fil: 'Main.dc.html', id: 'mb', w: 390, h: 844, z: 0.62 },
  { fil: 'Bordet.dc.html', id: 'bb', w: 390, h: 844, z: 0.62 },
  { fil: 'Skrivebord.dc.html', id: 'db', w: 760, h: 830, z: 0.62 }
];

const r2 = (n) => Math.round(n * 100) / 100;

function brik(f) {
  const felt = B.FIELDS[f.felt - 1];
  return [
    `<g transform="translate(${r2(felt.cx)}, ${r2(felt.cy)})">`,
    '<circle cx="0" cy="3" r="18" fill="#0B100D" opacity="0.55"></circle>',
    `<circle cx="0" cy="0" r="17" fill="${f.farve}" stroke="#0E1512" stroke-width="2"></circle>`,
    `<text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" fill="#14180C" style="font-family: var(--serif)">${f.initial}</text>`,
    '</g>'
  ].join('\n');
}

for (const m of MAAL) {
  const tx = r2((m.w - B.GEO.W * m.z) / 2);
  const ty = r2((m.h - B.GEO.H * m.z) / 2);

  const indhold = [
    B.boardDefs(m.id),
    `<rect x="0" y="0" width="${m.w}" height="${m.h}" fill="url(#${m.id}-felt)"></rect>`,
    `<rect x="0" y="0" width="${m.w}" height="${m.h}" fill="#ffffff" filter="url(#${m.id}-grain)" opacity="0.5"></rect>`,
    `<g transform="translate(${tx}, ${ty}) scale(${m.z})">`,
    B.boardSvg(m.id, { bg: false }),
    B.towerSvg(m.id, 0.45),
    ...BRIKKER.map(brik),
    '</g>'
  ].join('\n');

  const sti = new URL(m.fil, import.meta.url);
  const foer = readFileSync(sti, 'utf8');
  const moenster = new RegExp('(<!-- BRAET:' + m.id + ' -->)[\\s\\S]*?(<!-- /BRAET -->)');
  if (!moenster.test(foer)) {
    console.log('SPRINGER OVER ' + m.fil + ': ingen BRAET:' + m.id + '-markør');
    continue;
  }
  const efter = foer.replace(moenster, '$1\n' + indhold + '\n$2');
  writeFileSync(sti, efter, 'utf8');
  console.log(m.fil.padEnd(22) + (indhold.length / 1024).toFixed(1) + ' KB bræt');
}
