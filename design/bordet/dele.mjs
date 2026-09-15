// Fælles dele for bordet-canvasset og dem der bygger videre på det (syver/).
// Alt her tegner det samme som design/bordet/build.mjs gjorde 2026-09-11 —
// funktionerne har bare fået valgfrie parametre, så et andet canvas kan vise
// en anden spiller på tur, andre mærkater og ekstra pynt på pladen.
import * as B from '../board.mjs';

export const r2 = (v) => Math.round(v * 10) / 10;
export const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";
export const SERIF = "'Bodoni Moda', Georgia, 'Times New Roman', serif";

export const SPILLERE = [
  { navn: 'Mette', farve: '#D8A93F', felt: 24, tilbage: 7, enheder: 2, drik: 'Pilsner' },
  { navn: 'Jeppe', farve: '#8FAF74', felt: 11, tilbage: 11, enheder: 1, drik: 'Classic' },
  { navn: 'Sofie', farve: '#87A4C6', felt: 0, pit: 3, tilbage: 4, enheder: 0, drik: 'Vin' },
  { navn: 'Rasmus', farve: '#C4776B', felt: 32, tilbage: 9, enheder: 3, drik: 'Pilsner' }
];
export const PAA_TUR = SPILLERE[0];

/* ------------------------------------------------------------ SVG-dele */

export const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]]
};

/** Terningen som SVG-gruppe, 100×100, tegnes om (0,0). */
export function terning(vaerdi, opts = {}) {
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
export function kortBag(x, y, rot = 0) {
  return `<g transform="translate(${x}, ${y}) rotate(${rot})">
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#0B100D" opacity="0.5" transform="translate(1, 2)"/>
    <rect x="0" y="0" width="34" height="48" rx="3" fill="#1F2C25" stroke="#8C6F16" stroke-width="1"/>
    <rect x="4" y="4" width="26" height="40" rx="2" fill="none" stroke="#C9A227" stroke-width="0.6" opacity="0.7"/>
    <path d="M17 12 L23 24 L17 36 L11 24 Z" fill="none" stroke="#C9A227" stroke-width="0.8" opacity="0.7"/>
  </g>`;
}

/** Forsiden af et kort, 34×48 (skaleres af kalderen). */
export function kortFor(x, y, rang, tegn, roed, rot = 0, skala = 1) {
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
export function glas(p, x, y, niveau) {
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
export function bordet(p, opts = {}) {
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

/** Brikkerne på pladen. `pynt(s)` kan lægge ekstra SVG oven på en brik (fx et kort på hånden). */
export function brikker(p, liste, { paaTur = PAA_TUR, pynt = () => '' } = {}) {
  const out = [];
  for (const s of liste) {
    let x, y;
    if (s.pit) { const c = B.PIT[s.pit - 1]; x = c.cx; y = c.cy - 4; }
    else { const f = B.FIELDS[s.felt - 1]; x = f.cx; y = f.cy; }
    const paa = s === paaTur;
    out.push(`<g transform="translate(${x}, ${y})">
      <circle cx="0" cy="3" r="17" fill="#0B100D" opacity="0.55"/>
      ${paa ? '<circle cx="0" cy="0" r="22" fill="none" stroke="#C9A227" stroke-width="2" opacity="0.75"/>' : ''}
      <circle cx="0" cy="0" r="16" fill="${s.farve}" stroke="#0E1512" stroke-width="2"/>
      <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="#14180C" style="font-family: ${SERIF}">${s.navn[0]}</text>${pynt(s)}
    </g>`);
  }
  return out.join('\n');
}

/* --------------------------------------------------------------- HTML-dele */

export const CSS = `
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

export function maerkat(tekst, farve) {
  return `<span class="maerkat" style="color: ${farve}; border: 1px solid ${farve}55; background: ${farve}1a;">${tekst}</span>`;
}

export function maaler(tilbage) {
  return `<span class="maaler">${Array.from({ length: 11 }, (_, i) => `<i class="${i < tilbage ? 'fuld' : ''}"></i>`).join('')}</span>`;
}

/** Mærkaterne som de så ud i bordet-canvasset: BM hos Rasmus, tårnet og DIG hos Jeppe. */
export function standardMaerkater(s) {
  return [
    s.navn === 'Rasmus' ? maerkat('BM', '#E8CE7E') : '',
    s.navn === 'Jeppe' ? maerkat('TÅRNET', '#E0A03C') : '',
    s.pit ? maerkat('PIT ' + s.pit, '#d98279') : '',
    s.navn === 'Jeppe' ? maerkat('DIG', '#93AE7C') : ''
  ].join('\n        ');
}

export function spillerRaekke(s, { paaTur = PAA_TUR, maerkater = standardMaerkater } = {}) {
  const enhedOrd = s.drik === 'Pilsner' ? (s.enheder === 1 ? 'pilsner tømt' : 'pilsnere tømt') : s.drik === 'Vin' ? 'glas vin tømt' : `${s.drik} tømt`;
  const status = s.pit ? `Pitten · plads ${s.pit}` : `Felt ${s.felt} · ${B.TYPES[B.FIELDS[s.felt - 1].type].navn}`;
  return `<div class="sp${s === paaTur ? ' sp-paa' : ''}">
    <div class="brik" style="background: ${s.farve};">${s.navn[0]}</div>
    <div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1; min-width: 0;">
      <div style="display: flex; align-items: center; gap: 7px;">
        <span class="sp-navn">${s.navn}</span>
        ${maerkater(s)}
      </div>
      <div class="note" style="font-size: 11px;">${status}</div>
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">${maaler(s.tilbage)}<span class="note" style="font-size: 10px;">${s.tilbage}/11</span></div>
    </div>
    <div class="taeller"><b style="${s.enheder ? '' : 'color: #97A398;'}">${s.enheder}</b><span>${enhedOrd}</span></div>
  </div>`;
}

export const LOG = [
  ['#D8A93F', 'Mette slog 4.'],
  ['#8FAF74', 'Jeppe trak Ni hjerter — Emne.'],
  ['#87A4C6', 'Sofie slog 3: plads 3 i pitten og 3 shots.'],
  ['#C4776B', 'Rasmus landede på Bier Meister (felt 29).'],
  ['#8FAF74', 'DRIK! Jeppe skal bunde tårnet — 10,3 slurke.']
];

export function log(linjer = LOG) {
  return `<div class="log">${linjer.map(([f, t]) => `<div class="log-linje"><span class="log-prik" style="background: ${f};"></span><span>${t}</span></div>`).join('')}</div>`;
}

export function topbar({ paaTur = PAA_TUR, ekstra = '' } = {}) {
  return `<header class="topbar">
    <div class="mark">K69</div>
    <div class="kode-chip"><span>SPIL</span><b>K7M2Q</b></div>
    <div class="tur-pille">
      <div class="brik" style="background: ${paaTur.farve};">${paaTur.navn[0]}</div>
      <div><div class="eyebrow">Tur</div><div style="font-size: 14px; font-weight: 600;">${paaTur.navn}</div></div>
    </div>${ekstra}
    <div style="flex-grow: 1;"></div>
    <div class="note">Runde 3 · turen går med uret</div>
  </header>`;
}

export function venstreRail(raekkeOpts = {}, { taarnNote = '10,3 slurke. Jeppe er i gang med at bunde det.' } = {}) {
  return `<aside class="rail rail-v">
    <section class="rail-sek" style="flex-grow: 1; min-height: 0;">
      <div class="rail-hoved"><span class="eyebrow">Ved bordet</span><span class="eyebrow" style="color: var(--brass);">4</span></div>
      <div class="spillere">${SPILLERE.map((s) => spillerRaekke(s, raekkeOpts)).join('')}</div>
    </section>
    <section class="rail-sek" style="border-bottom: none;">
      <div class="rail-hoved"><span class="eyebrow">Tårnet</span><span class="eyebrow">50 cl glas</span></div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="glasbar"><div class="glas-fyld" style="height: 55%;"></div><div class="glas-skum" style="bottom: 55%;"></div></div>
        <div>
          <div class="taarn-maal">31 cl</div>
          <div class="note">${taarnNote}</div>
        </div>
      </div>
    </section>
  </aside>`;
}

export function actionArea(indhold, farve, titel, tekst, hat) {
  return `<section class="action action-farvet" style="--sp: ${farve};">
    <div class="action-hat"><span style="width: 9px; height: 9px; border-radius: 50%; background: ${farve};"></span><span class="eyebrow">${hat}</span></div>
    <div class="action-titel">${titel}</div>
    <p class="action-txt">${tekst}</p>
    ${indhold}
  </section>`;
}

export function hoejreRail({ action = null, linjer = LOG } = {}) {
  const knapper = `<div style="display: flex; flex-direction: column; gap: 10px;">
    <div class="knap knap-primaer" style="min-height: 58px;">Slå med terningen</div>
    <div class="knap knap-tom">Meld afgang efter dette slag</div>
  </div>`;
  return `<aside class="rail rail-h">
    ${action ?? actionArea(knapper, PAA_TUR.farve, 'Din tur', 'Slå med terningen — den ruller på bordet, og appen rykker selv din brik.', 'Runde 3')}
    <section class="rail-sek" style="flex-grow: 1; min-height: 0; border-bottom: none;">
      <div class="rail-hoved"><span class="eyebrow">Hændelser</span></div>
      ${log(linjer)}
    </section>
  </aside>`;
}

/** Hele pladen som SVG. `ovenpaa` lægges sidst, så det ligger over brikkerne. */
export function pladeSvg(p, bordOpts, { brikOpts = {}, ovenpaa = '' } = {}) {
  return `<svg viewBox="0 0 ${B.GEO.W} ${B.GEO.H}" preserveAspectRatio="xMidYMid meet">
    ${B.boardDefs(p)}
    ${B.boardSvg(p)}
    ${bordet(p, bordOpts)}
    ${brikker(p, SPILLERE, brikOpts)}${ovenpaa}
  </svg>`;
}
