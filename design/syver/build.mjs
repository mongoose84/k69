// Designcanvas for 7'eren: man beholder kortet, lægger fingeren diskret, og
// alle andre skal nå at trykke på fingeren på bordet. Sidste mand drikker.
// Bygger videre på bordet-canvasset (design/bordet/dele.mjs).
// Statiske artboards. Kør: node design/syver/build.mjs
import { writeFileSync } from 'node:fs';
import * as B from '../board.mjs';
import { head, foot } from '../shared.mjs';
import {
  CSS, SANS, SERIF, SPILLERE, LOG, terning, kortFor, kortBag, maerkat, actionArea, topbar, venstreRail,
  hoejreRail, pladeSvg, bordet, brikker
} from '../bordet/dele.mjs';

const OUT = new URL('./', import.meta.url);

// Mette er på tur, Jeppe (DIG) har 7'eren. Sofie og Rasmus er de andre.
const [METTE, JEPPE, SOFIE, RASMUS] = SPILLERE;
const PAA_TUR = METTE;
const HOLDER = JEPPE;

/* ------------------------------------------------------------ SVG-dele */

/** Fingeren på bordkanten: en hånd nedefra med pegefingeren mod kanten. Stregtegnet, 24-grid. */
function fingerIkon(str = 24, farve = '#E8CE7E') {
  return `<svg width="${str}" height="${str}" viewBox="0 0 24 24" fill="none" stroke="${farve}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 3.2v9.3"/>
    <path d="M10 3.2a1.6 1.6 0 0 1 3.2 0V11"/>
    <path d="M13.2 8.6a1.6 1.6 0 0 1 3.2 0v3"/>
    <path d="M16.4 10.2a1.6 1.6 0 0 1 3.2 0v4.6c0 3.4-2.5 6.2-6 6.2h-2.4c-1.7 0-3.2-.7-4.3-1.9L3.6 15a1.5 1.5 0 0 1 2.1-2.1L8 15"/>
  </svg>`;
}

/**
 * Fingeren på bordkanten: nede i spillepladens højre hjørne, uden for banen
 * (Jeppe, 2026-09-15). Brikkerne der har nået det står i rækkefølge ovenover.
 * `ramte` er dem der har nået det; `andre` mangler.
 */
function fingerPaaBordet(ramte, andre, { puls = true } = {}) {
  const cx = 1120, cy = 592;
  const alle = [...ramte.map((s) => ({ s, med: true })), ...andre.map((s) => ({ s, med: false }))];
  const bx = cx - ((alle.length - 1) * 24) / 2, by = cy - 46;
  return `<g class="finger" transform="translate(${cx}, ${cy})">
    ${puls ? '<circle class="finger-ring" cx="0" cy="0" r="26" fill="none" stroke="#E8CE7E" stroke-width="2"/>' : ''}
    <circle cx="0" cy="3" r="22" fill="#0B100D" opacity="0.6"/>
    <circle cx="0" cy="0" r="21" fill="#1F2C25" stroke="#C9A227" stroke-width="1.4"/>
    <g transform="translate(-13, -13)">${fingerIkon(26)}</g>
  </g>
  <g transform="translate(${bx}, ${by})">
    ${alle.map(({ s, med }, i) => `<g transform="translate(${i * 24}, 0)" opacity="${med ? 1 : 0.3}">
      <circle cx="0" cy="0" r="10" fill="${s.farve}" stroke="#0E1512" stroke-width="1.5"/>
      <text x="0" y="0.5" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="700" fill="#14180C" style="font-family: ${SERIF}">${s.navn[0]}</text>
    </g>`).join('')}
  </g>`;
}

/** Det lille 7-kort der ligger ved brikken, så alle kan se hvem der har den. */
function kortVedBrik() {
  return `<g transform="translate(9, -30)">${kortFor(0, 0, '7', '♣', false, 12, 0.5)}</g>`;
}

/* --------------------------------------------------------------- web-dele */

const WEB_CSS = CSS + `
  .syver-chip { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px 0 8px; border: 1px solid var(--line-2);
                border-radius: 2px; background: rgba(20,29,24,0.6); }
  .syver-chip .note { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1.3; }
  .syver-chip .note b { display: block; color: var(--brass-lt); font-weight: 700; }
  .finger-ring { transform-box: fill-box; transform-origin: center; animation: finger-puls 1.8s ease-out infinite; }
  @keyframes finger-puls { 0% { transform: scale(0.85); opacity: 0.9; } 100% { transform: scale(1.6); opacity: 0; } }
  .tur-terning { display: flex; align-items: center; gap: 16px; }`;

const syverChip = `
    <div class="syver-chip">
      <svg width="24" height="34" viewBox="0 0 34 48">${kortFor(0, 0, '7', '♣', false)}</svg>
      <div class="note"><b>Din 7'er</b>Hold nede for at lægge fingeren</div>
    </div>`;

function maerkaterMedSyver(s) {
  return [
    s.navn === 'Rasmus' ? maerkat('BM', '#E8CE7E') : '',
    s === HOLDER ? maerkat("7'ER", '#E8CE7E') : '',
    s.pit ? maerkat('PIT ' + s.pit, '#d98279') : '',
    s === HOLDER ? maerkat('DIG', '#93AE7C') : ''
  ].join('\n        ');
}

function mettesTur() {
  const indhold = `<div class="tur-terning">
    <svg width="64" height="64" viewBox="-10 -10 120 120">${terning(null, { blank: true })}</svg>
    <div class="note">Terningen står blank til Mette slår.</div>
  </div>`;
  return actionArea(indhold, PAA_TUR.farve, 'Mettes tur', 'Mette skal slå med terningen.', 'Runde 4');
}

const LOG_SYVER = [
  ['#8FAF74', 'Jeppe trak Syv klør — han beholder kortet.'],
  ...LOG.slice(0, 4)
];

function webArtboard({ titel, medFinger }) {
  const brikOpts = { paaTur: PAA_TUR, pynt: (s) => (s === HOLDER ? kortVedBrik() : '') };
  const ovenpaa = medFinger ? fingerPaaBordet([JEPPE, METTE], [SOFIE, RASMUS]) : '';
  return head(titel, WEB_CSS) + `
<div class="app">
  ${topbar({ paaTur: PAA_TUR, ekstra: medFinger ? '' : syverChip })}
  <div class="bord-krop">
    ${venstreRail({ paaTur: PAA_TUR, maerkater: maerkaterMedSyver }, { taarnNote: '10,3 slurke. Ingen er i gang med det.' })}
    <main class="scene">
      <div class="plade">
        ${pladeSvg('m', { kort: null, tilbage: 36, terningVaerdi: 3, terningRing: '#C4776B', slogTekst: 'RASMUS SLOG 3' }, { brikOpts, ovenpaa })}
        <div class="plade-hint">Træk for at flytte pladen · rul for at zoome</div>
        <div class="zoom"><div class="zknap">−</div><div class="zknap">⤢</div><div class="zknap">+</div></div>
      </div>
    </main>
    ${hoejreRail({ action: mettesTur(), linjer: LOG_SYVER })}
  </div>
</div>
` + foot('{"$preview":{"width":1440,"height":900}}', 'class Component extends DCLogic {}');
}

/* ------------------------------------------------------------- mobil-dele */

// Mobilens skal, som den er bygget i apps/mobile/src/app.css.
const MOBIL_CSS = `
  .skaerm { position: relative; width: 390px; height: 844px; display: flex; flex-direction: column; overflow: hidden;
            background: radial-gradient(120% 70% at 50% 0%, #1B2821 0%, #0D1310 62%); padding-top: 14px; }
  .mobilbar { height: 56px; flex: 0 0 56px; display: flex; align-items: center; gap: 10px; padding: 0 14px; }
  .mark { font-family: var(--serif); font-size: 24px; font-weight: 700;
          background: linear-gradient(180deg, #F0DCA0 0%, #C9A227 55%, #9A7A18 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .kode-lille { font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--ink-faint); }
  .avatarer { display: flex; }
  .av { display: block; border-radius: 50%; border: 2px solid #0F1613; }
  .av-paa { border-color: var(--brass); }
  .brik { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-weight: 700; color: #14180C;
          box-shadow: inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5); }
  .mobilplade { position: relative; flex-grow: 1; min-height: 180px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); display: flex; }
  .plade { flex-grow: 1; position: relative; overflow: hidden; background: #101815; }
  .plade svg.stor { display: block; width: 100%; height: 100%; }
  .chip { position: absolute; left: 10px; top: 10px; min-height: 34px; padding: 0 12px; display: flex; align-items: center; border: 1px solid var(--line-2); border-radius: 2px;
          background: rgba(11,17,14,0.86); color: var(--ink-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
  .chip-paa { color: var(--brass-lt); border-color: rgba(201,162,39,0.5); }
  .minimap { position: absolute; right: 10px; top: 10px; width: 104px; height: 58px; border: 1px solid var(--line-2); border-radius: 2px; background: rgba(11,17,14,0.86); padding: 3px; }
  .ark { flex: 0 0 auto; margin-top: auto; display: flex; flex-direction: column; background: linear-gradient(180deg, #16211B 0%, #0F1713 100%); padding-bottom: 12px; }
  .greb { width: 40px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 9px auto 6px; }
  .faneblade { display: flex; padding: 0 14px; border-bottom: 1px solid var(--line); }
  .fb { flex-grow: 1; min-height: 42px; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid transparent;
        font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint); }
  .fb-paa { color: var(--brass-lt); border-bottom-color: var(--brass); }
  .ark-krop { padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 14px; }
  .action-farvet { border-left: 4px solid var(--sp); background: linear-gradient(180deg, color-mix(in oklab, var(--sp) 22%, transparent) 0%, color-mix(in oklab, var(--sp) 6%, transparent) 100%); }
  .hoved { display: flex; flex-direction: column; gap: 8px; }
  .hoved h2 { font-size: 26px; line-height: 1.08; }
  .hoved p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-dim); }
  .knap { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 46px; padding: 0 22px;
          border: 1px solid var(--line-2); border-radius: 2px; background: var(--raise); color: var(--ink);
          font-family: var(--sans); font-size: 13px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; }
  .knap-primaer { background: linear-gradient(180deg, #E8CE7E 0%, #C9A227 48%, #A5811A 100%); border-color: #7E6413; color: #14180C; }
  .note { font-size: 11.5px; line-height: 1.55; color: var(--ink-faint); }
  .min-drik { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 6px 16px 2px; padding: 10px 13px;
              border: 1px solid var(--line); border-radius: 2px; background: rgba(20,29,24,0.6); }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); }
  .maaler { display: flex; gap: 3px; }
  .maaler i { display: block; width: 12px; height: 7px; border-radius: 1px; background: #2B382E; }
  .maaler i.fuld { background: linear-gradient(180deg, #F2C060, #C4761A); }
  .kortbillede { width: 92px; height: 132px; flex: 0 0 92px; border-radius: 8px; padding: 8px; background: linear-gradient(168deg, #F6F1E4 0%, #E4DCC8 100%);
                 border: 1px solid #B9AE93; box-shadow: 0 14px 26px rgba(0,0,0,0.55); display: flex; flex-direction: column; color: #1B241C; }
  .kortbillede .rang { font-family: var(--serif); font-size: 19px; font-weight: 700; line-height: 0.95; }
  .kortbillede .tegn { font-size: 13px; line-height: 0.95; }
  .kortbillede .midt { flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 42px; }

  /* 7'eren i baren: et lille kort man holder nede. Ringen fyldes mens man holder. */
  .syver { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
  .syver-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(#E8CE7E var(--fyld), rgba(232,206,126,0.14) 0); }
  .syver-ring::after { content: ''; position: absolute; inset: 2px; border-radius: 50%; background: #121A16; }
  .syver svg { position: relative; }
  .finger-ring { transform-box: fill-box; transform-origin: center; animation: finger-puls 1.8s ease-out infinite; }
  @keyframes finger-puls { 0% { transform: scale(0.85); opacity: 0.9; } 100% { transform: scale(1.6); opacity: 0; } }`;

function mobilBar({ paaTur, syverFyld = null }) {
  const avatarer = SPILLERE.map((s, i) => `<span class="av${s === paaTur ? ' av-paa' : ''}" style="margin-left: ${i === 0 ? 0 : -7}px;">
      <div class="brik" style="width: 28px; height: 28px; font-size: 12px; background: ${s.farve};">${s.navn[0]}</div>
    </span>`).join('');
  const syver = syverFyld === null ? '' : `
    <div class="syver" style="--fyld: ${syverFyld};">
      <div class="syver-ring"></div>
      <svg width="20" height="28" viewBox="0 0 34 48">${kortFor(0, 0, '7', '♣', false)}</svg>
    </div>`;
  return `<header class="mobilbar">
    <div class="mark">K69</div>
    <div class="kode-lille">K7M2Q</div>${syver}
    <div style="flex-grow: 1;"></div>
    <div class="avatarer">${avatarer}</div>
  </header>`;
}

function mobilFaner() {
  return `<div class="faneblade"><div class="fb fb-paa">Turen</div><div class="fb">Tårnet</div><div class="fb">Log</div></div>`;
}

function mobilHoved(farve, eyebrow, titel, tekst) {
  return `<div class="hoved">
    <div style="display: flex; align-items: center; gap: 10px;"><span style="width: 9px; height: 9px; border-radius: 50%; background: ${farve};"></span><span class="eyebrow" style="color: ${farve};">${eyebrow}</span></div>
    <h2 style="color: ${farve};">${titel}</h2>
    <p>${tekst}</p>
  </div>`;
}

function minDrik() {
  return `<div class="min-drik">
    <div>
      <div class="eyebrow">Din Classic · 1 tømt</div>
      <div class="maaler" style="margin-top: 6px;">${Array.from({ length: 11 }, (_, i) => `<i class="${i < 7 ? 'fuld' : ''}"></i>`).join('')}</div>
    </div>
    <div style="text-align: right;"><div style="font-family: var(--serif); font-size: 19px;">7</div><div class="eyebrow">slurke igen</div></div>
  </div>`;
}

/** Pladen på mobilen: kameraet står på et udsnit (viewBox). */
function mobilPlade(p, viewBox, { ovenpaa = '', chipTekst = 'Følger min brik', chipPaa = true, minimapPrik = false, brikOpts = {} } = {}) {
  return `<div class="mobilplade">
    <div class="plade">
      <svg class="stor" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">
        ${B.boardDefs(p)}
        ${B.boardSvg(p)}
        ${bordetLille(p)}
        ${brikkerLille(p, brikOpts)}${ovenpaa}
      </svg>
      <div class="chip${chipPaa ? ' chip-paa' : ''}">${chipTekst}</div>
      <div class="minimap">
        <svg viewBox="0 0 1200 650" style="display: block; width: 100%; height: 100%;">
          <path d="${B.OUTER_PATH}" fill="#1D2A23" stroke="#3E4E42" stroke-width="4"/>
          <path d="${B.INNER_PATH}" fill="#101815" stroke="#3E4E42" stroke-width="4"/>
          ${SPILLERE.map((s) => { const f = s.pit ? B.PIT[s.pit - 1] : B.FIELDS[s.felt - 1]; return `<circle cx="${f.cx}" cy="${f.cy}" r="26" fill="${s.farve}"/>`; }).join('')}
          ${minimapPrik ? '<circle cx="1120" cy="592" r="30" fill="#E8CE7E"/>' : ''}
        </svg>
      </div>
    </div>
  </div>`;
}

// Samme bord og brikker som på web, tegnet direkte så udsnittet kan vælges frit.
const bordetLille = (p) => bordet(p, { kort: null, tilbage: 36, terningVaerdi: 3, terningRing: '#C4776B', slogTekst: 'RASMUS SLOG 3' });
const brikkerLille = (p, opts) => brikker(p, SPILLERE, { paaTur: PAA_TUR, pynt: (s) => (s === HOLDER ? kortVedBrik() : ''), ...opts });

/** Jeppes telefon i det øjeblik han trækker 7'eren. */
function trukketArtboard() {
  const f = B.FIELDS[HOLDER.felt - 1];
  const z = 0.82, vw = 390 / z, vh = 300 / z;
  const viewBox = `${(f.cx - vw / 2).toFixed(0)} ${(f.cy - vh / 2).toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}`;
  const styring = `<div style="display: flex; gap: 16px; align-items: flex-start;">
    <div class="kortbillede"><div><div class="rang">7</div><div class="tegn">♣</div></div><div class="midt">♣</div></div>
    <div style="display: flex; flex-direction: column; gap: 10px; flex-grow: 1;">
      <div class="note">Syv ♣</div>
      <div class="knap knap-primaer">Tag kortet</div>
      <div class="note">Kortet lægger sig oppe i baren. Hold det nede når du vil lægge fingeren — ingen andre får besked.</div>
    </div>
  </div>`;
  return head("Mobil — du trak 7'eren", MOBIL_CSS) + `
<div class="skaerm">
  ${mobilBar({ paaTur: HOLDER })}
  ${mobilPlade('t', viewBox, { brikOpts: { paaTur: HOLDER, pynt: () => '' } })}
  <div class="ark">
    <div class="greb"></div>
    ${mobilFaner()}
    <div class="ark-krop action-farvet" style="--sp: ${HOLDER.farve};">
      ${mobilHoved(HOLDER.farve, 'Jeppe slog 3', 'Fingeren på bordkanten', 'Du beholder 7’eren. Læg diskret en finger på bordkanten når du vil — de andre skal nå at gøre det samme. Sidste mand drikker.')}
      ${styring}
    </div>
    ${minDrik()}
  </div>
</div>
` + foot('{"$preview":{"width":390,"height":844}}', 'class Component extends DCLogic {}');
}

/** Jeppes telefon to ture senere: han holder 7'eren nede. */
function holderArtboard() {
  const f = B.FIELDS[HOLDER.felt - 1];
  const z = 0.82, vw = 390 / z, vh = 300 / z;
  const viewBox = `${(f.cx - vw / 2).toFixed(0)} ${(f.cy - vh / 2).toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}`;
  const styring = `<div style="display: flex; align-items: center; gap: 16px;">
    <svg width="52" height="52" viewBox="-10 -10 120 120">${terning(null, { blank: true })}</svg>
    <div class="note">Terningen står blank til Mette slår.</div>
  </div>`;
  return head("Mobil — du holder 7'eren nede", MOBIL_CSS) + `
<div class="skaerm">
  ${mobilBar({ paaTur: PAA_TUR, syverFyld: '68%' })}
  ${mobilPlade('h', viewBox)}
  <div class="ark">
    <div class="greb"></div>
    ${mobilFaner()}
    <div class="ark-krop action-farvet" style="--sp: ${PAA_TUR.farve};">
      ${mobilHoved(PAA_TUR.farve, 'Runde 4', 'Mettes tur', 'Mette skal slå med terningen.')}
      ${styring}
    </div>
    ${minDrik()}
  </div>
</div>
` + foot('{"$preview":{"width":390,"height":844}}', 'class Component extends DCLogic {}');
}

/** Sofies telefon: fingeren ligger på bordet, og hun har ikke trykket endnu. */
function fingerMobilArtboard() {
  // Kameraet står på det nederste højre hjørne af pladen.
  const viewBox = '860 330 340 320';
  const ovenpaa = fingerPaaBordet([JEPPE, METTE], [SOFIE, RASMUS]);
  return head('Mobil — fingeren på bordet', MOBIL_CSS) + `
<div class="skaerm">
  ${mobilBar({ paaTur: PAA_TUR })}
  ${mobilPlade('f', viewBox, { ovenpaa, chipTekst: 'Overblik', chipPaa: false, minimapPrik: true })}
  <div class="ark">
    <div class="greb"></div>
    ${mobilFaner()}
    <div class="ark-krop action-farvet" style="--sp: ${PAA_TUR.farve};">
      ${mobilHoved(PAA_TUR.farve, 'Mette slog 4', 'Mette landede på SKÅL!', 'Alle ved bordet tager en fællesskål.')}
      <div class="knap knap-primaer">Skål — videre</div>
    </div>
    ${minDrik()}
  </div>
</div>
` + foot('{"$preview":{"width":390,"height":844}}', 'class Component extends DCLogic {}');
}

/* ---------------------------------------------------------------- fejring */

/** Sidste mand: samme kort som Tabt i bordet-canvasset, med 7'erens tekst. */
function sidsteArtboard() {
  const css = `
    .scene { width: 760px; height: 560px; position: relative; overflow: hidden;
             background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
    .scene > svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.35; filter: saturate(0.6); }
    .kort { position: absolute; left: 50%; top: 50%; width: 460px; transform: translate(-50%, -50%);
            display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 34px 36px 26px;
            border-radius: 4px; border: 1px solid rgba(180,72,63,0.6);
            background: linear-gradient(180deg, #1A241E 0%, #121B16 100%);
            box-shadow: 0 30px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.5); }
    .band { display: flex; align-items: center; gap: 10px; align-self: stretch; }
    .band .eyebrow { color: #D98279; }
    .band-h { margin-left: auto; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-faint); }
    .brik-stor { width: 84px; height: 84px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                 font-family: var(--serif); font-size: 38px; font-weight: 700; color: #14180C; filter: saturate(0.8);
                 box-shadow: inset 0 -4px 10px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.6); }
    .glorie { position: absolute; left: 50%; top: 116px; width: 220px; height: 220px; transform: translate(-50%, -50%); border-radius: 50%;
              background: radial-gradient(circle, rgba(180,72,63,0.3) 0%, transparent 65%);
              animation: glorie 1.8s ease-out infinite; pointer-events: none; }
    @keyframes glorie { 0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0.9; } 100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; } }
    .titel { font-family: var(--serif); font-size: 40px; line-height: 1.05; text-align: center; color: #EDE7DA; }
    .under { font-size: 13.5px; line-height: 1.6; color: var(--ink-dim); text-align: center; max-width: 360px; }
    .raekke { display: flex; align-items: center; gap: 8px; }
    .raekke .brik { width: 28px; height: 28px; font-size: 12px; }
    .raekke .pil { font-size: 11px; color: var(--ink-faint); }
    .bjaelke { align-self: stretch; height: 3px; border-radius: 2px; background: #2B382E; overflow: hidden; margin-top: 6px; }
    .bjaelke i { display: block; height: 100%; width: 100%; background: #B4483F; transform-origin: left; animation: ned 5s linear infinite; }
    @keyframes ned { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    .naeste { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint); }
    .brik { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-weight: 700; color: #14180C;
            box-shadow: inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5); }`;
  const brik = (s, op = 1) => `<div class="brik" style="background: ${s.farve}; opacity: ${op};">${s.navn[0]}</div>`;
  const brikOpts = { paaTur: PAA_TUR, pynt: () => '' };
  return head('Fejring — sidste mand', css) + `
<div class="scene">
  ${pladeSvg('s', { kort: null, tilbage: 36, terningVaerdi: 4, terningRing: '#D8A93F', slogTekst: 'METTE SLOG 4' }, { brikOpts, ovenpaa: fingerPaaBordet([JEPPE, METTE, SOFIE], [RASMUS], { puls: false }) })}
  <div class="kort">
    <div class="band"><span style="width: 8px; height: 8px; border-radius: 50%; background: #B4483F;"></span><span class="eyebrow">Fingeren på bordkanten</span><span class="band-h">Jeppes 7'er</span></div>
    <div class="glorie"></div>
    <div class="brik-stor" style="background: ${RASMUS.farve};">R</div>
    <div class="titel">Rasmus så den aldrig</div>
    <div class="under">Jeppe lagde fingeren på bordkanten. Mette og Sofie nåede det — Rasmus var sidste mand og drikker.</div>
    <div class="raekke">${brik(JEPPE)}<span class="pil">→</span>${brik(METTE)}<span class="pil">→</span>${brik(SOFIE)}<span class="pil">→</span>${brik(RASMUS, 0.35)}</div>
    <div class="bjaelke"><i></i></div>
    <div class="naeste">7'eren ryger tilbage i bunken · videre om 5 s</div>
  </div>
</div>
` + foot('{"$preview":{"width":760,"height":560}}', 'class Component extends DCLogic {}');
}

/* --------------------------------------------------------------- skriv */

const skriv = (navn, indhold) => {
  writeFileSync(new URL(navn, OUT), indhold, 'utf8');
  console.log(navn.padEnd(22), (indhold.length / 1024).toFixed(1) + ' KB');
};

skriv('Main.dc.html', webArtboard({ titel: "Jeppe har en 7'er", medFinger: false }));
skriv('Fingeren.dc.html', webArtboard({ titel: 'Fingeren ligger på bordet', medFinger: true }));
skriv('Trukket.dc.html', trukketArtboard());
skriv('Holder.dc.html', holderArtboard());
skriv('Finger.dc.html', fingerMobilArtboard());
skriv('Sidste.dc.html', sidsteArtboard());

const canvas = {
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 1440, h: 900, title: "Web — Jeppe har en 7'er" },
    { file: 'Fingeren.dc.html', x: 0, y: 1040, w: 1440, h: 900, title: 'Web — fingeren ligger på bordet' },
    { file: 'Trukket.dc.html', x: 0, y: 2080, w: 390, h: 844, title: "Mobil — du trak 7'eren" },
    { file: 'Holder.dc.html', x: 480, y: 2080, w: 390, h: 844, title: 'Mobil — du holder kortet nede' },
    { file: 'Finger.dc.html', x: 960, y: 2080, w: 390, h: 844, title: 'Mobil — de andre ser fingeren' },
    { file: 'Sidste.dc.html', x: 1440, y: 2080, w: 760, h: 560, title: 'Fejring — sidste mand' }
  ],
  annotations: [
    {
      id: 'note-hvem', x: -360, y: 0, w: 300,
      text: "Hvem har 7'eren: alle kan se det. Et lille 7-kort ligger ved brikken på pladen, og spilleren får mærkatet 7'ER i listen. På bordet ligger der ikke noget kort vendt — Jeppe tog det.\n\nDen diskrete knap: kun Jeppe har det lille kort oppe i baren. Man HOLDER det nede (ca. 1 s) for at lægge fingeren, så et tilfældigt tryk ikke afslører noget. Ingen andre får besked."
    },
    {
      id: 'note-finger', x: -360, y: 1040, w: 300,
      text: 'Fingeren lander nede i spillepladens højre hjørne, uden for banen — der er den fri af felter, pit og bordplade, og den sidder samme sted hver gang. Den pulser stille, og brikkerne ved siden af viser hvem der har nået det, i rækkefølge (Jeppe tæller som først).\n\nFingeren ER knappen: man trykker på den på pladen. Der kommer ingen linje i loggen og ingen besked — man skal opdage den, ligesom ved bordet.\n\nKapløbet spærrer IKKE turen. Mette kan slå imens, og fingeren bliver liggende til alle har trykket.'
    },
    {
      id: 'note-mobil', x: 0, y: 3010, w: 420,
      text: 'Mobil: 1) Man trækker 7\'eren og tager den — teksten fortæller at kortet lægger sig i baren. 2) To ture senere holder Jeppe det nede; ringen fyldes og fingeren lander når den er fuld. 3) Sofie ser fingeren på bordet i sit udsnit. Kameraet flytter sig IKKE (det ville afsløre den), men fingeren tegnes også som en prik i minimappen, så man kan finde den hvis man følger sin egen brik.\n\nÅbent: skal fingeren OGSÅ kunne trykkes fra Turen-fanen (en lille knap under handlingen), så man ikke skal panorere på en lille skærm? Mit forslag: nej i første omgang — det er en del af spillet at opdage den.'
    },
    {
      id: 'note-sidste', x: 1440, y: 2720, w: 300,
      text: "Når alle har trykket: samme fejringskort som ved Meier og kapløb, i rust fordi nogen tabte. Rækkefølgen står nederst, sidste mand er dæmpet. 7'eren ryger tilbage i bunken.\n\nIkke tegnet: trækker nogen en ny 7'er før Jeppe har lagt fingeren, drikker Jeppe selv 1 slurk, hans kort ryger i bunken og den nye tager over. Det kan bruge Tabt-kortet fra bordet-canvasset."
    }
  ],
  launch: { view: 'canvas' }
};
writeFileSync(new URL('canvas.json', OUT), JSON.stringify(canvas, null, 2), 'utf8');
console.log('canvas.json'.padEnd(22), canvas.artboards.length + ' artboards');
