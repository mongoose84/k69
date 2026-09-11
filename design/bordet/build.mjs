// Designcanvas for "bordet": terning og kortbunke på pladen, bredere tårn,
// action-area i spillerens farve og fejringen når nogen vinder eller taber.
// Genererer statiske artboards — de er til at kigge på og flytte rundt i, ikke
// til at klikke i. Kør: node design/bordet/build.mjs
import { writeFileSync } from 'node:fs';
import * as B from '../board.mjs';
import { head, foot } from '../shared.mjs';

const OUT = new URL('./', import.meta.url);
const r2 = (v) => Math.round(v * 10) / 10;
const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Bodoni Moda', Georgia, 'Times New Roman', serif";

const SPILLERE = [
  { navn: 'Mette', farve: '#D8A93F', felt: 24, tilbage: 7, enheder: 2, drik: 'Pilsner' },
  { navn: 'Jeppe', farve: '#8FAF74', felt: 11, tilbage: 11, enheder: 1, drik: 'Classic' },
  { navn: 'Sofie', farve: '#87A4C6', felt: 0, pit: 3, tilbage: 4, enheder: 0, drik: 'Vin' },
  { navn: 'Rasmus', farve: '#C4776B', felt: 32, tilbage: 9, enheder: 3, drik: 'Pilsner' }
];
const PAA_TUR = SPILLERE[0];

/* ------------------------------------------------------------ SVG-dele */

const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]]
};

/** Terningen som SVG-gruppe, 100×100, tegnes om (0,0). */
function terning(vaerdi, opts = {}) {
  const { ring = null, blank = false } = opts;
  const pips = PIPS[vaerdi];
  return [
    '<g>',
    ring ? `<rect x="-6" y="-6" width="112" height="112" rx="22" fill="none" stroke="${ring}" stroke-width="3" opacity="0.9"/>` : '',
    '<rect x="6" y="9" width="88" height="88" rx="17" fill="#0B100D" opacity="0.55"/>',
    blank
      ? '<rect x="4" y="4" width="88" height="88" rx="17" fill="#141D18" stroke="#4C5C50" stroke-width="1.5" stroke-dasharray="5 4"/>'
      : '<rect x="4" y="4" width="88" height="88" rx="17" fill="#EFE6D4" stroke="#8E8878" stroke-width="1.5"/>',
    blank
      ? `<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#4C5C50" style="font-family: ${SERIF}">?</text>`
      : pips.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7.5" fill="#1B241C"/>`).join(''),
    '</g>'
  ].filter(Boolean).join('');
}

/** Bagsiden af et kort: mørk filt med messingramme, 34×48. */
function kortBag(x, y, rot = 0) {
  return `<g transform="translate(${x}, ${y}) rotate(${rot})">
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#0B100D" opacity="0.5" transform="translate(1, 2)"/>
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#1F2C25" stroke="#8C6F16" stroke-width="1"/>
    <rect x="4" y="4" width="26" height="40" rx="2" fill="none" stroke="#C9A227" stroke-width="0.6" opacity="0.7"/>
    <path d="M17 12 L23 24 L17 36 L11 24 Z" fill="none" stroke="#C9A227" stroke-width="0.8" opacity="0.7"/>
  </g>`;
}

/** Forsiden af et kort, 34×48 (skaleres af kalderen). */
function kortFor(x, y, rang, tegn, roed, rot = 0, skala = 1) {
  const farve = roed ? '#9E3B33' : '#1B241C';
  return `<g transform="translate(${x}, ${y}) rotate(${rot}) scale(${skala})">
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#0B100D" opacity="0.55" transform="translate(1.5, 3)"/>
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#F3EDDF" stroke="#B9AE93" stroke-width="0.8"/>
    <text x="4" y="10" font-size="9" font-weight="700" fill="${farve}" style="font-family: ${SERIF}">${rang}</text>
    <text x="4" y="18" font-size="7" fill="${farve}" style="font-family: ${SANS}">${tegn}</text>
    <text x="17" y="31" text-anchor="middle" dominant-baseline="central" font-size="16" fill="${farve}" style="font-family: ${SANS}">${tegn}</text>
  </g>`;
}

/** Glasset i tårnet, 42×62 om (x, y) øverst-venstre. */
function glas(p, x, y, niveau) {
  const gW = 42, gH = 62;
  const fillH = r2(gH * niveau);
  const fy = r2(y + gH - fillH);
  return [
    `<rect x="${x}" y="${y}" width="${gW}" height="${gH}" rx="4" fill="#0E1512"/>`,
    `<rect x="${x + 2}" y="${fy}" width="${gW - 4}" height="${fillH}" rx="3" fill="url(#${p}-beer)"/>`,
    niveau > 0.02 ? `<rect x="${x + 2}" y="${r2(fy - 6)}" width="${gW - 4}" height="7" rx="3" fill="#F6EBD4"/>` : '',
    `<rect x="${x}" y="${y}" width="${gW}" height="${gH}" rx="4" fill="none" stroke="#C4D3C6" stroke-width="1.4"/>`
  ].join('');
}

/**
 * Bordet midt på pladen: én bred plade der spænder over begge DRIK!-felter
 * (x 561 og 639), med kortene til venstre, tårnet i midten og terningen til
 * højre. Så står DRIK! ud for tårnet, og alt der sker på bordet, sker ét sted.
 */
function bordet(p, opts = {}) {
  const { niveau = 0.55, cl = 31, terningVaerdi = 4, terningRing = '#D8A93F', slogTekst = 'METTE SLOG 4', kort = { rang: '9', tegn: '♥', roed: true }, tilbage = 37 } = opts;
  const x0 = 452, x1 = 748, y0 = 258, y1 = 382;
  const w = x1 - x0, h = y1 - y0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const out = [];
  out.push('<g class="k69-bordet">');
  out.push(`<rect x="${x0}" y="${y0 + 8}" width="${w}" height="${h}" rx="18" fill="#0D1410" opacity="0.8"/>`);
  out.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="18" fill="#18231D" stroke="url(#${p}-brass)" stroke-width="2"/>`);
  out.push(`<rect x="${x0 + 7}" y="${y0 + 7}" width="${w - 14}" height="${h - 14}" rx="12" fill="none" stroke="#C9A227" stroke-width="0.6" opacity="0.4"/>`);
  // hårstreger mellem de tre zoner
  const zoneL = x0 + 100, zoneR = x1 - 100;
  out.push(`<line x1="${zoneL}" y1="${y0 + 16}" x2="${zoneL}" y2="${y1 - 16}" stroke="#C9A227" stroke-width="0.6" opacity="0.35"/>`);
  out.push(`<line x1="${zoneR}" y1="${y0 + 16}" x2="${zoneR}" y2="${y1 - 16}" stroke="#C9A227" stroke-width="0.6" opacity="0.35"/>`);

  // Kortene: bunken og det sidst trukne kort ved siden af
  const kx = x0 + 22, ky = y0 + 22;
  out.push(kortBag(kx + 3, ky + 3, -3));
  out.push(kortBag(kx + 1.5, ky + 1.5, -1.5));
  out.push(kortBag(kx, ky, 0));
  if (kort) out.push(kortFor(kx + 44, ky + 2, kort.rang, kort.tegn, kort.roed, 7));
  out.push(`<text x="${(x0 + zoneL) / 2}" y="${y1 - 18}" text-anchor="middle" fill="#D3B44E" font-size="9.5" letter-spacing="3" style="font-family: ${SANS}">KORTENE</text>`);
  out.push(`<text x="${(x0 + zoneL) / 2}" y="${y1 - 7}" text-anchor="middle" fill="#6B796D" font-size="7.5" letter-spacing="1.4" style="font-family: ${SANS}">${tilbage} TILBAGE</text>`);

  // Tårnet i midten
  out.push(glas(p, cx - 21, y0 + 14, niveau));
  out.push(`<text x="${cx}" y="${y1 - 18}" text-anchor="middle" fill="#D3B44E" font-size="10.5" letter-spacing="3.4" style="font-family: ${SANS}">TÅRNET</text>`);
  out.push(`<text x="${cx}" y="${y1 - 7}" text-anchor="middle" fill="#E0A03C" font-size="8" letter-spacing="1.4" style="font-family: ${SANS}">${cl} CL · 50 CL GLAS</text>`);

  // Terningen til højre
  const tx = (zoneR + x1) / 2 - 27, ty = y0 + 18;
  out.push(`<g transform="translate(${tx}, ${ty}) scale(0.54)">${terning(terningVaerdi, { ring: terningRing })}</g>`);
  out.push(`<text x="${(zoneR + x1) / 2}" y="${y1 - 18}" text-anchor="middle" fill="#D3B44E" font-size="9.5" letter-spacing="3" style="font-family: ${SANS}">TERNINGEN</text>`);
  out.push(`<text x="${(zoneR + x1) / 2}" y="${y1 - 7}" text-anchor="middle" fill="${terningRing}" font-size="7.5" letter-spacing="1.4" style="font-family: ${SANS}">${slogTekst}</text>`);
  out.push('</g>');
  return out.join('\n');
}

function brikker(p, liste) {
  const out = [];
  for (const s of liste) {
    let x, y;
    if (s.pit) { const c = B.PIT[s.pit - 1]; x = c.cx; y = c.cy - 4; }
    else { const f = B.FIELDS[s.felt - 1]; x = f.cx; y = f.cy; }
    const paa = s === PAA_TUR;
    out.push(`<g transform="translate(${x}, ${y})">
      <circle cx="0" cy="3" r="17" fill="#0B100D" opacity="0.55"/>
      ${paa ? '<circle cx="0" cy="0" r="22" fill="none" stroke="#C9A227" stroke-width="2" opacity="0.75"/>' : ''}
      <circle cx="0" cy="0" r="16" fill="${s.farve}" stroke="#0E1512" stroke-width="2"/>
      <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="#14180C" style="font-family: ${SERIF}">${s.navn[0]}</text>
    </g>`);
  }
  return out.join('\n');
}

/* --------------------------------------------------------------- HTML-dele */

const CSS = `
  .app { width: 1440px; height: 900px; display: flex; flex-direction: column;
         background: radial-gradient(120% 90% at 50% -10%, #1A2620 0%, #0E1512 62%); }
  .topbar { height: 74px; flex: 0 0 74px; display: flex; align-items: center; gap: 24px; padding: 0 26px;
            border-bottom: 1px solid var(--line); background: rgba(12,18,15,0.72); }
  .mark { font-family: var(--serif); font-size: 30px; font-weight: 700; letter-spacing: 0.02em;
          background: linear-gradient(180deg, #F0DCA0 0%, #C9A227 55%, #9A7A18 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .kode-chip { display: flex; align-items: center; gap: 9px; height: 30px; padding: 0 12px; border: 1px solid var(--line-2);
               border-radius: 2px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.16em; color: var(--ink-dim); }
  .kode-chip b { color: var(--brass-lt); }
  .tur-pille { display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 18px 0 6px; border: 1px solid var(--line-2);
               border-radius: 999px; background: var(--panel-2); }
  .bord-krop { flex-grow: 1; display: flex; min-height: 0; }
  .rail { width: 340px; flex: 0 0 340px; display: flex; flex-direction: column; background: rgba(16,23,19,0.6); min-height: 0; overflow: hidden; }
  .rail-v { border-right: 1px solid var(--line); }
  .rail-h { border-left: 1px solid var(--line); }
  .rail-sek { padding: 18px 20px 20px; border-bottom: 1px solid var(--line); }
  .rail-hoved { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
  .brik { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: var(--serif); font-size: 15px; font-weight: 700; color: #14180C;
          box-shadow: inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5); }
  .spillere { display: flex; flex-direction: column; gap: 4px; }
  .sp { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 2px; border: 1px solid transparent; }
  .sp-paa { background: linear-gradient(90deg, rgba(201,162,39,0.14), rgba(201,162,39,0.02)); border-color: rgba(201,162,39,0.4); }
  .sp-navn { font-size: 14px; font-weight: 600; }
  .maerkat { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 2px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; }
  .maaler { display: flex; gap: 3px; }
  .maaler i { display: block; width: 9px; height: 7px; border-radius: 1px; background: #2B382E; }
  .maaler i.fuld { background: linear-gradient(180deg, #F2C060, #C4761A); }
  .taeller { text-align: right; flex: 0 0 62px; }
  .taeller b { display: block; font-family: var(--serif); font-size: 22px; font-weight: 500; line-height: 1; color: var(--amber); }
  .taeller span { display: block; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); margin-top: 3px; }
  .glasbar { width: 46px; height: 74px; flex: 0 0 46px; border: 1.5px solid #9FB0A2; border-radius: 4px; background: #0E1512; position: relative; overflow: hidden; }
  .glas-fyld { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, #F2C060, #C4761A); }
  .glas-skum { position: absolute; left: 0; right: 0; height: 7px; background: #F6EBD4; }
  .taarn-maal { font-family: var(--serif); font-size: 28px; color: var(--amber); line-height: 1.05; }
  .note { font-size: 11.5px; line-height: 1.55; color: var(--ink-faint); }
  .scene { flex-grow: 1; min-width: 0; position: relative; display: flex; }
  .plade { flex-grow: 1; position: relative; overflow: hidden;
           background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
  .plade svg { display: block; width: 100%; height: 100%; }
  .plade-hint { position: absolute; left: 18px; bottom: 18px; font-size: 10.5px; letter-spacing: 0.14em; color: var(--ink-faint); text-transform: uppercase; }
  .zoom { position: absolute; right: 18px; bottom: 16px; display: flex; gap: 6px; }
  .zknap { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line-2);
           border-radius: 2px; background: rgba(14,21,18,0.82); color: var(--ink-dim); font-size: 15px; }

  /* Action-area: hele blokken bærer spillerens farve, så man ser på afstand hvem der er på. */
  .action { display: flex; flex-direction: column; gap: 14px; padding: 18px 20px 20px; border-bottom: 1px solid var(--line); position: relative; }
  .action-farvet { border-left: 4px solid var(--sp); background: linear-gradient(180deg, color-mix(in oklab, var(--sp) 22%, transparent) 0%, color-mix(in oklab, var(--sp) 6%, transparent) 100%); }
  .action-hat { display: flex; align-items: center; gap: 10px; }
  .action-hat .eyebrow { color: var(--sp); }
  .action-titel { font-family: var(--serif); font-size: 30px; line-height: 1.08; color: var(--sp); }
  .action-txt { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-dim); }
  .knap { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 46px; padding: 0 22px;
          border: 1px solid var(--line-2); border-radius: 2px; background: var(--raise); color: var(--ink);
          font-family: var(--sans); font-size: 13px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; }
  .knap-primaer { background: linear-gradient(180deg, #E8CE7E 0%, #C9A227 48%, #A5811A 100%); border-color: #7E6413; color: #14180C; }
  .knap-tom { background: transparent; font-size: 11px; min-height: 38px; }
  .taarn-vagt { display: flex; flex-direction: column; gap: 10px; padding: 10px 12px; border: 1px solid rgba(224,160,60,0.35); border-radius: 3px; background: rgba(224,160,60,0.07); }
  .log { display: flex; flex-direction: column; }
  .log-linje { display: flex; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; line-height: 1.5; color: var(--ink-dim); }
  .log-prik { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; margin-top: 5px; }`;

function maerkat(tekst, farve) {
  return `<span class="maerkat" style="color: ${farve}; border: 1px solid ${farve}55; background: ${farve}1a;">${tekst}</span>`;
}

function maaler(tilbage) {
  return `<span class="maaler">${Array.from({ length: 11 }, (_, i) => `<i class="${i < tilbage ? 'fuld' : ''}"></i>`).join('')}</span>`;
}

function spillerRaekke(s) {
  const enhedOrd = s.drik === 'Pilsner' ? (s.enheder === 1 ? 'pilsner tømt' : 'pilsnere tømt') : s.drik === 'Vin' ? 'glas vin tømt' : `${s.drik} tømt`;
  const status = s.pit ? `Pitten · plads ${s.pit}` : `Felt ${s.felt} · ${B.TYPES[B.FIELDS[s.felt - 1].type].navn}`;
  return `<div class="sp${s === PAA_TUR ? ' sp-paa' : ''}">
    <div class="brik" style="background: ${s.farve};">${s.navn[0]}</div>
    <div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1; min-width: 0;">
      <div style="display: flex; align-items: center; gap: 7px;">
        <span class="sp-navn">${s.navn}</span>
        ${s.navn === 'Rasmus' ? maerkat('BM', '#E8CE7E') : ''}
        ${s.navn === 'Jeppe' ? maerkat('TÅRNET', '#E0A03C') : ''}
        ${s.pit ? maerkat('PIT ' + s.pit, '#d98279') : ''}
        ${s.navn === 'Jeppe' ? maerkat('DIG', '#93AE7C') : ''}
      </div>
      <div class="note" style="font-size: 11px;">${status}</div>
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">${maaler(s.tilbage)}<span class="note" style="font-size: 10px;">${s.tilbage}/11</span></div>
    </div>
    <div class="taeller"><b style="${s.enheder ? '' : 'color: #97A398;'}">${s.enheder}</b><span>${enhedOrd}</span></div>
  </div>`;
}

const LOG = [
  ['#D8A93F', 'Mette slog 4.'],
  ['#8FAF74', 'Jeppe trak Ni hjerter — Emne.'],
  ['#87A4C6', 'Sofie slog 3: plads 3 i pitten og 3 shots.'],
  ['#C4776B', 'Rasmus landede på Bier Meister (felt 29).'],
  ['#8FAF74', 'DRIK! Jeppe skal bunde tårnet — 10,3 slurke.']
];

function log() {
  return `<div class="log">${LOG.map(([f, t]) => `<div class="log-linje"><span class="log-prik" style="background: ${f};"></span><span>${t}</span></div>`).join('')}</div>`;
}

function topbar() {
  return `<header class="topbar">
    <div class="mark">K69</div>
    <div class="kode-chip"><span>SPIL</span><b>K7M2Q</b></div>
    <div class="tur-pille">
      <div class="brik" style="background: ${PAA_TUR.farve};">M</div>
      <div><div class="eyebrow">Tur</div><div style="font-size: 14px; font-weight: 600;">${PAA_TUR.navn}</div></div>
    </div>
    <div style="flex-grow: 1;"></div>
    <div class="note">Runde 3 · turen går med uret</div>
  </header>`;
}

function venstreRail() {
  return `<aside class="rail rail-v">
    <section class="rail-sek" style="flex-grow: 1; min-height: 0;">
      <div class="rail-hoved"><span class="eyebrow">Ved bordet</span><span class="eyebrow" style="color: var(--brass);">4</span></div>
      <div class="spillere">${SPILLERE.map(spillerRaekke).join('')}</div>
    </section>
    <section class="rail-sek" style="border-bottom: none;">
      <div class="rail-hoved"><span class="eyebrow">Tårnet</span><span class="eyebrow">50 cl glas</span></div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="glasbar"><div class="glas-fyld" style="height: 55%;"></div><div class="glas-skum" style="bottom: 55%;"></div></div>
        <div>
          <div class="taarn-maal">31 cl</div>
          <div class="note">10,3 slurke. Jeppe er i gang med at bunde det.</div>
        </div>
      </div>
    </section>
  </aside>`;
}

function actionArea(indhold, farve, titel, tekst, hat) {
  return `<section class="action action-farvet" style="--sp: ${farve};">
    <div class="action-hat"><span style="width: 9px; height: 9px; border-radius: 50%; background: ${farve};"></span><span class="eyebrow">${hat}</span></div>
    <div class="action-titel">${titel}</div>
    <p class="action-txt">${tekst}</p>
    ${indhold}
  </section>`;
}

function hoejreRail() {
  const knapper = `<div style="display: flex; flex-direction: column; gap: 10px;">
    <div class="knap knap-primaer" style="min-height: 58px;">Slå med terningen</div>
    <div class="knap knap-tom">Meld afgang efter dette slag</div>
  </div>`;
  return `<aside class="rail rail-h">
    ${actionArea(knapper, PAA_TUR.farve, 'Din tur', 'Slå med terningen — den ruller på bordet, og appen rykker selv din brik.', 'Runde 3')}
    <section class="rail-sek" style="flex-grow: 1; min-height: 0; border-bottom: none;">
      <div class="rail-hoved"><span class="eyebrow">Hændelser</span></div>
      ${log()}
    </section>
  </aside>`;
}

function pladeSvg(p, bordOpts) {
  return `<svg viewBox="0 0 ${B.GEO.W} ${B.GEO.H}" preserveAspectRatio="xMidYMid meet">
    ${B.boardDefs(p)}
    ${B.boardSvg(p)}
    ${bordet(p, bordOpts)}
    ${brikker(p, SPILLERE)}
  </svg>`;
}

/* ------------------------------------------------------------- artboards */

function mainArtboard() {
  return head('Spillebordet', CSS) + `
<div class="app">
  ${topbar()}
  <div class="bord-krop">
    ${venstreRail()}
    <main class="scene">
      <div class="plade">
        ${pladeSvg('m', {})}
        <div class="plade-hint">Træk for at flytte pladen · rul for at zoome</div>
        <div class="zoom"><div class="zknap">−</div><div class="zknap">⤢</div><div class="zknap">+</div></div>
      </div>
    </main>
    ${hoejreRail()}
  </div>
</div>
` + foot('{"$preview":{"width":1440,"height":900}}', 'class Component extends DCLogic {}');
}

/** Terningen i tre trin: klar, ruller, landet. Den midterste ruller for alvor (CSS). */
function terningslagArtboard() {
  const css = `
    .raekke { width: 1000px; height: 420px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; padding: 32px;
              background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
    .trin { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px;
            border: 1px solid var(--line); border-radius: 3px; background: rgba(16,23,19,0.5); }
    .trin-t { font-family: var(--serif); font-size: 22px; color: var(--ink); }
    .trin-d { font-size: 12px; line-height: 1.6; color: var(--ink-dim); text-align: center; max-width: 250px; }
    .tid { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); }
    .rul { animation: rul 2s cubic-bezier(0.2, 0.7, 0.3, 1) infinite; transform-origin: 50px 50px; }
    @keyframes rul {
      0%   { transform: rotate(0deg) translate(-40px, -30px) scale(0.85); }
      35%  { transform: rotate(410deg) translate(30px, 10px) scale(1.05); }
      70%  { transform: rotate(700deg) translate(-8px, 4px) scale(0.98); }
      85%  { transform: rotate(716deg) translate(0, 0) scale(1); }
      100% { transform: rotate(720deg) translate(0, 0) scale(1); }
    }
    .ring { animation: puls 1.4s ease-out infinite; transform-origin: 50px 50px; }
    @keyframes puls { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.35); } }`;
  const boks = (svg, tid, t, d) => `<div class="trin">
    <div class="tid">${tid}</div>
    <svg width="120" height="120" viewBox="-10 -10 120 120">${svg}</svg>
    <div class="trin-t">${t}</div>
    <div class="trin-d">${d}</div>
  </div>`;
  return head('Terningslaget', css) + `
<div class="raekke">
  ${boks(terning(null, { blank: true }), '0,0 s · før slaget', 'Klar', 'Terningen står blank på bordet indtil der slås. Det sidste slag vises ikke — så ingen tror den allerede har slået.')}
  ${boks(`<g class="rul">${terning(5)}</g>`, '0–2 s · ruller', 'Ruller', 'Man trykker "Slå" oppe til højre. Terningen tumler hen over bordet i 2 sekunder og viser skiftende øjne undervejs. Brikken står stille imens.')}
  ${boks(`<rect class="ring" x="-4" y="-4" width="108" height="108" rx="21" fill="none" stroke="#D8A93F" stroke-width="3"/>${terning(4, { ring: '#D8A93F' })}`, '2,0 s · landet', 'Mette slog 4', 'Terningen lander med spillerens farve som ring, og først nu rykker brikken. Ringen pulser én gang og bliver stående til næste slag.')}
</div>
` + foot('{"$preview":{"width":1000,"height":420}}', 'class Component extends DCLogic {}');
}

/** Kortene på bordet: bunken alene, og bunken med det trukne kort ved siden af. */
function kortbunkeArtboard() {
  const css = `
    .raekke { width: 1000px; height: 460px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; padding: 32px;
              background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
    .trin { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px;
            border: 1px solid var(--line); border-radius: 3px; background: rgba(16,23,19,0.5); }
    .trin-t { font-family: var(--serif); font-size: 22px; color: var(--ink); }
    .trin-d { font-size: 12px; line-height: 1.6; color: var(--ink-dim); text-align: center; max-width: 360px; }
    .vend { animation: vend 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes vend {
      0%, 20% { transform: translate(-44px, 0) scale(0.6) rotate(-10deg); opacity: 0; }
      55%, 100% { transform: translate(0, 0) scale(1) rotate(7deg); opacity: 1; }
    }`;
  const udsnit = (indhold) => `<svg width="420" height="200" viewBox="440 245 320 150">
    ${B.boardDefs('k')}
    ${indhold}
  </svg>`;
  const bunkeAlene = bordet('k', { kort: null, tilbage: 38, terningVaerdi: 2, terningRing: '#8FAF74', slogTekst: 'JEPPE SLOG 2', niveau: 0.55, cl: 31 });
  // det trukne kort vendes op ved siden af bunken — større end i bunken, så man kan læse det
  const medKort = bordet('k', { kort: null, tilbage: 37, terningVaerdi: 2, terningRing: '#8FAF74', slogTekst: 'JEPPE SLOG 2', niveau: 0.55, cl: 31 })
    + `<g class="vend">${kortFor(518, 272, '9', '♥', true, 0, 1.25)}</g>`;
  return head('Kortbunken', css) + `
<div class="raekke">
  <div class="trin">
    <div class="eyebrow">Før man trækker</div>
    ${udsnit(bunkeAlene)}
    <div class="trin-t">Bunken ligger på bordet</div>
    <div class="trin-d">Til venstre for tårnet, hvor der er plads i midten. Man ser hvor mange kort der er tilbage, og at der ikke ligger noget vendt.</div>
  </div>
  <div class="trin">
    <div class="eyebrow">Når kortet er trukket</div>
    ${udsnit(medKort)}
    <div class="trin-t">Ni hjerter vendes op</div>
    <div class="trin-d">Kortet glider ud af bunken og vender sig med forsiden op ved siden af den. Det bliver liggende til næste kort trækkes — så hele bordet kan se hvad der blev trukket, uden at kigge i loggen.</div>
  </div>
</div>
` + foot('{"$preview":{"width":1000,"height":460}}', 'class Component extends DCLogic {}');
}

/** Fejringen: ét stort kort hen over pladen, samme greb som Meier. */
function fejringArtboard(navn, variant) {
  const vundet = variant === 'vundet';
  const css = `
    .scene { width: 760px; height: 560px; position: relative; overflow: hidden;
             background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
    .scene > svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.35; filter: saturate(0.6); }
    .kort { position: absolute; left: 50%; top: 50%; width: 460px; transform: translate(-50%, -50%);
            display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 34px 36px 26px;
            border-radius: 4px; border: 1px solid ${vundet ? 'rgba(201,162,39,0.7)' : 'rgba(180,72,63,0.6)'};
            background: linear-gradient(180deg, #1A241E 0%, #121B16 100%);
            box-shadow: 0 30px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.5);
            animation: ind 600ms cubic-bezier(0.2, 1.1, 0.3, 1) both; }
    @keyframes ind { from { transform: translate(-50%, -44%) scale(0.92); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    .band { display: flex; align-items: center; gap: 10px; align-self: stretch; }
    .band .eyebrow { color: ${vundet ? 'var(--brass-lt)' : '#D98279'}; }
    .band-h { margin-left: auto; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-faint); }
    .brik-stor { width: 84px; height: 84px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                 font-family: var(--serif); font-size: 38px; font-weight: 700; color: #14180C;
                 box-shadow: inset 0 -4px 10px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.6);
                 animation: hop 1.6s ease-in-out infinite; }
    @keyframes hop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .glorie { position: absolute; left: 50%; top: 116px; width: 220px; height: 220px; transform: translate(-50%, -50%); border-radius: 50%;
              background: radial-gradient(circle, ${vundet ? 'rgba(232,206,126,0.35)' : 'rgba(180,72,63,0.3)'} 0%, transparent 65%);
              animation: glorie 1.8s ease-out infinite; pointer-events: none; }
    @keyframes glorie { 0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.9; } 100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; } }
    .titel { font-family: var(--serif); font-size: 40px; line-height: 1.05; text-align: center; color: ${vundet ? 'var(--brass-lt)' : '#EDE7DA'}; }
    .under { font-size: 13.5px; line-height: 1.6; color: var(--ink-dim); text-align: center; max-width: 360px; }
    .tal { display: flex; align-items: baseline; gap: 8px; font-family: var(--serif); font-size: 54px; line-height: 1;
           color: ${vundet ? 'var(--brass-lt)' : '#D98279'}; }
    .tal span { font-family: var(--sans); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-faint); }
    .brikker { display: flex; gap: 6px; }
    .brikker .brik { width: 28px; height: 28px; flex: 0 0 28px; font-size: 12px; }
    .bjaelke { align-self: stretch; height: 3px; border-radius: 2px; background: #2B382E; overflow: hidden; margin-top: 6px; }
    .bjaelke i { display: block; height: 100%; width: 100%; background: ${vundet ? 'var(--brass)' : '#B4483F'}; transform-origin: left; animation: ned 5s linear infinite; }
    @keyframes ned { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    .naeste { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint); }
    .brik { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-family: var(--serif); font-size: 15px; font-weight: 700; color: #14180C;
            box-shadow: inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5); }`;
  const inde = vundet
    ? `<div class="band"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--brass);"></span><span class="eyebrow">Fingeren på bordkanten</span><span class="band-h">Kapløb · 4 med</span></div>
       <div class="glorie"></div>
       <div class="brik-stor" style="background: #D8A93F;">M</div>
       <div class="titel">Mette var først</div>
       <div class="under">Hun lagde fingeren inden nogen så det. Rasmus nåede det aldrig — han var sidste mand og drikker.</div>
       <div class="brikker">
         <div class="brik" style="background: #D8A93F;">M</div><div class="brik" style="background: #8FAF74;">J</div>
         <div class="brik" style="background: #87A4C6;">S</div><div class="brik" style="background: #C4776B; opacity: 0.35;">R</div>
       </div>
       <div class="bjaelke"><i></i></div>
       <div class="naeste">Videre om 5 s · eller tryk hvor som helst</div>`
    : `<div class="band"><span style="width: 8px; height: 8px; border-radius: 50%; background: #B4483F;"></span><span class="eyebrow">Meier · Jeppe mod Rasmus</span><span class="band-h">Bægeret løftet</span></div>
       <div class="glorie"></div>
       <div class="brik-stor" style="background: #C4776B; animation: none; filter: saturate(0.8);">R</div>
       <div class="titel">Rasmus løj om en Meyer</div>
       <div class="under">Han meldte Meyer og havde 4-2. Jeppe løftede — og det koster dobbelt at lyve om en Meyer.</div>
       <div class="tal">6 <span>slurke</span></div>
       <div class="bjaelke"><i></i></div>
       <div class="naeste">Videre om 5 s · eller tryk hvor som helst</div>`;
  return head(navn, css) + `
<div class="scene">
  ${pladeSvg(vundet ? 'v' : 't', { terningVaerdi: 3, terningRing: '#D8A93F', slogTekst: 'METTE SLOG 3', kort: { rang: '7', tegn: '♣', roed: false } })}
  <div class="kort">${inde}</div>
</div>
` + foot('{"$preview":{"width":760,"height":560}}', 'class Component extends DCLogic {}');
}

/* --------------------------------------------------------------- skriv */

const skriv = (navn, indhold) => {
  writeFileSync(new URL(navn, OUT), indhold, 'utf8');
  console.log(navn.padEnd(22), (indhold.length / 1024).toFixed(1) + ' KB');
};

skriv('Main.dc.html', mainArtboard());
skriv('Terningslag.dc.html', terningslagArtboard());
skriv('Kortbunke.dc.html', kortbunkeArtboard());
skriv('Vundet.dc.html', fejringArtboard('Fejring — vundet', 'vundet'));
skriv('Tabt.dc.html', fejringArtboard('Fejring — tabt', 'tabt'));

const canvas = {
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 1440, h: 900, title: 'Spillebordet — terning, kort og tårn på pladen' },
    { file: 'Terningslag.dc.html', x: 0, y: 1040, w: 1000, h: 420, title: 'Terningslaget — 2 sekunder' },
    { file: 'Kortbunke.dc.html', x: 1120, y: 1040, w: 1000, h: 460, title: 'Kortbunken på bordet' },
    { file: 'Vundet.dc.html', x: 0, y: 1620, w: 760, h: 560, title: 'Fejring — nogen vandt' },
    { file: 'Tabt.dc.html', x: 880, y: 1620, w: 760, h: 560, title: 'Fejring — nogen tabte' }
  ],
  annotations: [
    {
      id: 'note-bordet', x: -360, y: 0, w: 300,
      text: 'Bordet midt på pladen er nu én bred plade i stedet for det runde tårn. Den spænder over begge DRIK!-felter, så DRIK! står ud for tårnet.\n\nTre zoner: kortene til venstre, tårnet i midten, terningen til højre. Alt der sker på bordet, sker ét sted — og der er stadig luft til pitten nedenunder.'
    },
    {
      id: 'note-action', x: 1520, y: 0, w: 300,
      text: 'Action-area øverst til højre: hele blokken tager farve efter den der er på tur (venstre kant + tonet baggrund). Knappen "Slå med terningen" bliver her — selve terningen er flyttet ned på bordet.\n\nMens nogen bunder tårnet, ligger "Tårnet er bundet"-knappen øverst i samme blok (ikke tegnet her — det er bygget i koden).'
    },
    {
      id: 'note-fejring', x: -360, y: 1620, w: 300,
      text: 'Fejringen bruger samme greb som Meier: et stort kort hen over pladen, som bliver stående i 5 sekunder (eller til nogen trykker) før turen går videre. Messing når nogen vandt, rust når nogen tabte. Brikken hopper, gloriebølgen pulser, og bjælken i bunden viser hvor lang tid der er tilbage.\n\nSamme kort til kapløb (7 og 8), Meier, Emne (9) og når tårnet løber over.'
    }
  ],
  launch: { view: 'canvas' }
};
writeFileSync(new URL('canvas.json', OUT), JSON.stringify(canvas, null, 2), 'utf8');
console.log('canvas.json'.padEnd(22), canvas.artboards.length + ' artboards');
