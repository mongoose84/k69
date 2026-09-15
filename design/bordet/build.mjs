// Designcanvas for "bordet": terning og kortbunke på pladen, bredere tårn,
// action-area i spillerens farve og fejringen når nogen vinder eller taber.
// Genererer statiske artboards — de er til at kigge på og flytte rundt i, ikke
// til at klikke i. Kør: node design/bordet/build.mjs
import { writeFileSync } from 'node:fs';
import * as B from '../board.mjs';
import { head, foot } from '../shared.mjs';
import { CSS, terning, kortFor, bordet, topbar, venstreRail, hoejreRail, pladeSvg } from './dele.mjs';

const OUT = new URL('./', import.meta.url);

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
