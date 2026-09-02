import * as B from './board.mjs';
import { head, foot, SPILLERE, KORT } from './shared.mjs';
import { GLAS } from './tpl-mobil.mjs';

/* ------------------------------------------------------------------ Start */

const START_CSS = `
  .app { width: 1440px; height: 900px; display: flex; overflow: hidden;
         background: radial-gradient(130% 100% at 20% 0%, #1B2821 0%, #0D1310 65%); }
  .hero { width: 780px; flex: 0 0 780px; position: relative; overflow: hidden; border-right: 1px solid var(--line); }
  .hero-art { position: absolute; left: -180px; top: 120px; width: 1180px; height: 639px; opacity: 0.5;
              filter: saturate(0.7) brightness(0.85); transform: rotate(-8deg); }
  .hero-fade { position: absolute; inset: 0;
               background: linear-gradient(105deg, rgba(13,19,16,0.94) 8%, rgba(13,19,16,0.45) 52%, rgba(13,19,16,0.92) 100%); }
  .hero-txt { position: absolute; left: 72px; top: 96px; right: 72px; display: flex; flex-direction: column; gap: 26px; }
  .wordmark { font-family: var(--serif); font-size: 128px; line-height: 0.86; font-weight: 700; letter-spacing: -0.02em;
              background: linear-gradient(175deg, #F5E4B0 0%, #C9A227 52%, #8A6C14 100%);
              -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lead { font-family: var(--serif); font-size: 27px; line-height: 1.34; color: var(--ink); max-width: 520px; }
  .kicker { font-size: 13.5px; line-height: 1.75; color: var(--ink-dim); max-width: 470px; }
  .stats { position: absolute; left: 72px; bottom: 72px; display: flex; gap: 46px; }
  .stat b { display: block; font-family: var(--serif); font-size: 34px; color: var(--brass-lt); line-height: 1.1; }
  .stat span { font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-faint); }

  .panel { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; padding: 36px 64px; gap: 22px; }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--line); }
  .tab { padding: 0 4px 14px; margin-right: 30px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em;
         text-transform: uppercase; color: var(--ink-faint); border-bottom: 2px solid transparent; cursor: pointer; }
  .tab-on { color: var(--brass-lt); border-bottom-color: var(--brass); }
  .felt { display: flex; flex-direction: column; gap: 9px; }
  .lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-faint); }
  .input { height: 56px; padding: 0 18px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 2px;
           color: var(--ink); font-family: var(--sans); font-size: 16px; display: flex; align-items: center; }
  .input-brik { display: flex; align-items: center; gap: 14px; }
  .swatches { display: flex; gap: 8px; }
  .sw { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
  .sw-on { border-color: var(--brass-lt); box-shadow: 0 0 0 2px rgba(201,162,39,0.25); }
  .valg { display: flex; flex-direction: column; gap: 10px; }
  .valg-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--line);
              border-radius: 2px; background: var(--panel); cursor: pointer; }
  .valg-row:hover { border-color: var(--line-2); }
  .tick { width: 20px; height: 20px; flex: 0 0 20px; border: 1px solid var(--line-2); border-radius: 2px;
          display: flex; align-items: center; justify-content: center; }
  .tick-on { background: var(--brass); border-color: var(--brass); }
  .valg-t { font-size: 13.5px; font-weight: 600; }
  .valg-d { font-size: 11.5px; color: var(--ink-faint); margin-top: 3px; line-height: 1.45; }
  .fine { font-size: 11.5px; line-height: 1.6; color: var(--ink-faint); }
  .drikke { display: flex; flex-direction: column; gap: 8px; }
  .drik { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid var(--line-2);
          border-radius: 2px; background: var(--panel); color: var(--ink-faint); cursor: pointer; }
  .drik-on { border-color: var(--brass); background: rgba(201,162,39,0.1); color: var(--brass-lt); }
  .drik-n { font-size: 14px; font-weight: 600; color: var(--ink); }
  .drik-d { font-size: 11px; letter-spacing: 0.05em; color: var(--ink-faint); margin-top: 3px; }`;

export function start() {
  return head('Start', START_CSS) + `
<div class="app">
  <section class="hero">
    <svg class="hero-art" viewBox="0 0 1200 650">
      ${B.boardDefs('s')}
      ${B.boardSvg('s', { bg: false })}
      ${B.towerSvg('s', 0.4)}
    </svg>
    <div class="hero-fade"></div>
    <div class="hero-txt">
      <div class="wordmark">K69</div>
      <div class="lead">Brættet fra Tinglev. 38 felter, ét tårn og en pit der gør ondt.</div>
      <div class="kicker">Ingen kode-app, ingen konto. Start et spil, del linket i gruppen, og skriv jeres navne når I kommer ind. Brættet, terningen, kortbunken, Meyer-bægeret og tårnet er med — resten drikker I selv.</div>
    </div>
    <div class="stats">
      <div class="stat"><b>38</b><span>Felter</span></div>
      <div class="stat"><b>6</b><span>Pladser i pitten</span></div>
      <div class="stat"><b>1—8</b><span>Spillere</span></div>
    </div>
  </section>

  <section class="panel">
    <div class="tabs">
      <div class="tab tab-on">Start nyt spil</div>
      <div class="tab">Join med kode</div>
    </div>

    <div class="felt">
      <div class="lbl">Dit navn</div>
      <div class="input input-brik">
        <div style="width: 30px; height: 30px; border-radius: 50%; background: #D8A93F; display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-weight: 700; color: #14180C">J</div>
        <span>Jeppe</span>
      </div>
    </div>

    <div class="felt">
      <div class="lbl">Din brik</div>
      <div class="swatches">
        <div class="sw sw-on" style="background: #D8A93F"></div>
        <div class="sw" style="background: #8FAF74"></div>
        <div class="sw" style="background: #87A4C6"></div>
        <div class="sw" style="background: #C4776B"></div>
        <div class="sw" style="background: #B189A6"></div>
        <div class="sw" style="background: #7FB0A4"></div>
      </div>
    </div>

    <div class="felt">
      <div class="lbl">Hvad drikker du?</div>
      <div class="drikke">
        <div class="drik drik-on">
          ${GLAS.ol}
          <div>
            <div class="drik-n">Pilsner</div>
            <div class="drik-d">4,6% · 0,5 l · 11 slurke</div>
          </div>
        </div>
        <div class="drik">
          ${GLAS.vin}
          <div>
            <div class="drik-n">Vin</div>
            <div class="drik-d">12% · 1 glas · 11 slurke</div>
          </div>
        </div>
        <div class="drik">
          ${GLAS.whisky}
          <div>
            <div class="drik-n">Whisky</div>
            <div class="drik-d">40% · 4 cl · 11 slurke</div>
          </div>
        </div>
      </div>
      <div class="fine">Én enhed er 11 slurke uanset hvad du drikker — det er 11 shots à 3 cl i en øl, og 5 glas på en flaske vin. Appen tæller dine slurke, så I altid kan se hvem der halter bagefter.</div>
    </div>

    <div class="valg">
      <div class="valg-row">
        <div class="tick tick-on">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#14180C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
        </div>
        <div>
          <div class="valg-t">Hold mig til reglerne</div>
          <div class="valg-d">Appen håndhæver dem: du kan ikke hoppe ud mens du er Bier Meister eller der er øl i tårnet, og din tur springes over mens du tømmer det.</div>
        </div>
      </div>
      <div class="valg-row">
        <div class="tick"></div>
        <div>
          <div class="valg-t">Hardcore</div>
          <div class="valg-d">Straf for alle tegn på stivhed. Man kan kun hoppe ud fra et frifelt. Aftal det fra start.</div>
        </div>
      </div>
    </div>

    <button class="btn btn-primary" style="height: 58px">Opret spil og få et link</button>
    <div class="fine">Linket virker i 24 timer. Alle der har det kan skrive et navn og komme med — der er ingen adgangskode og ingen bruger at oprette.</div>
  </section>
</div>
` + foot('{"$preview":{"width":1440,"height":900}}', 'class Component extends DCLogic {}');
}

/* ------------------------------------------------------------------ Lobby */

const LOBBY_CSS = `
  .app { width: 1440px; height: 900px; display: flex; flex-direction: column;
         background: radial-gradient(120% 90% at 50% -10%, #1A2620 0%, #0E1512 62%); }
  .top { height: 74px; flex: 0 0 74px; display: flex; align-items: center; gap: 24px; padding: 0 26px;
         border-bottom: 1px solid var(--line); }
  .mark { font-family: var(--serif); font-size: 30px; font-weight: 700;
          background: linear-gradient(180deg, #F0DCA0 0%, #C9A227 55%, #9A7A18 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .grid { flex-grow: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; }
  .col { padding: 56px 64px; display: flex; flex-direction: column; gap: 34px; }
  .col-r { border-left: 1px solid var(--line); background: rgba(16,23,19,0.5); }
  .h { font-family: var(--serif); font-size: 40px; line-height: 1.1; }
  .sub { font-size: 13.5px; line-height: 1.7; color: var(--ink-dim); max-width: 460px; }
  .linkbox { display: flex; align-items: center; gap: 0; border: 1px solid var(--line-2); border-radius: 2px;
             background: var(--panel); overflow: hidden; }
  .linkbox span { flex-grow: 1; padding: 0 20px; height: 62px; display: flex; align-items: center;
                  font-size: 15px; color: var(--ink); letter-spacing: 0.01em; }
  .kodekort { display: flex; align-items: center; gap: 22px; padding: 24px 26px; border: 1px solid rgba(201,162,39,0.35);
              border-radius: 3px; background: linear-gradient(135deg, rgba(201,162,39,0.11), rgba(201,162,39,0.02)); }
  .kodetal { font-family: var(--serif); font-size: 46px; letter-spacing: 0.13em; color: var(--brass-lt); line-height: 1; }
  .liste { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; border: 1px solid var(--line);
         border-radius: 2px; background: var(--panel); }
  .row-tom { border-style: dashed; background: transparent; color: var(--ink-faint); }
  .brik { width: 36px; height: 36px; flex: 0 0 36px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-family: var(--serif); font-size: 16px; font-weight: 700; color: #14180C; }
  .rname { font-size: 14.5px; font-weight: 600; flex-grow: 1; }
  .tag { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--brass-lt);
         border: 1px solid rgba(201,162,39,0.4); border-radius: 2px; padding: 4px 8px; }
  .ops { display: flex; flex-direction: column; gap: 2px; }
  .op { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 0;
        border-bottom: 1px solid var(--line); }
  .op-t { font-size: 13.5px; font-weight: 600; }
  .op-d { font-size: 11.5px; color: var(--ink-faint); margin-top: 4px; line-height: 1.5; max-width: 330px; }
  .toggle { width: 46px; height: 26px; border-radius: 999px; background: var(--line-2); position: relative; flex: 0 0 46px; cursor: pointer; }
  .toggle-on { background: var(--brass); }
  .knop { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #0E1512; }
  .toggle-on .knop { left: 23px; background: #14180C; }
  .fine { font-size: 11.5px; line-height: 1.6; color: var(--ink-faint); }`;

export function lobby() {
  return head('Lobby', LOBBY_CSS) + `
<div class="app">
  <header class="top">
    <div class="mark">K69</div>
    <div style="flex-grow: 1"></div>
    <div class="fine">Venter på spillere · brættet er klar</div>
  </header>

  <div class="grid">
    <section class="col">
      <div style="display: flex; flex-direction: column; gap: 16px">
        <div class="eyebrow">Inden I går i gang</div>
        <div class="h">Del linket i gruppen</div>
        <div class="sub">Alle der åbner linket skriver bare et navn og vælger en brik. Ingen konto, ingen kode i mailen. Værten starter spillet når I er klar.</div>
      </div>

      <div class="linkbox">
        <span>k69.dk/spil/tinglev-4471</span>
        <button class="btn" style="height: 62px; border: none; border-left: 1px solid var(--line-2); border-radius: 0">Kopiér</button>
      </div>

      <div class="kodekort">
        <div>
          <div class="eyebrow" style="margin-bottom: 8px">Eller skriv koden på k69.dk</div>
          <div class="kodetal">4471</div>
        </div>
        <div style="flex-grow: 1"></div>
        <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
          <rect x="0.75" y="0.75" width="86.5" height="86.5" rx="3" stroke="#3A4A3E"></rect>
          <g fill="#C9A227">
            <rect x="10" y="10" width="20" height="20"></rect><rect x="58" y="10" width="20" height="20"></rect>
            <rect x="10" y="58" width="20" height="20"></rect>
            <rect x="38" y="10" width="6" height="6"></rect><rect x="46" y="18" width="6" height="6"></rect>
            <rect x="38" y="26" width="6" height="6"></rect><rect x="10" y="38" width="6" height="6"></rect>
            <rect x="22" y="38" width="6" height="6"></rect><rect x="38" y="38" width="6" height="6"></rect>
            <rect x="52" y="38" width="6" height="6"></rect><rect x="66" y="38" width="6" height="6"></rect>
            <rect x="38" y="52" width="6" height="6"></rect><rect x="52" y="60" width="6" height="6"></rect>
            <rect x="66" y="52" width="6" height="6"></rect><rect x="44" y="68" width="6" height="6"></rect>
            <rect x="60" y="72" width="6" height="6"></rect><rect x="72" y="62" width="6" height="6"></rect>
          </g>
          <g fill="#0E1512">
            <rect x="16" y="16" width="8" height="8"></rect><rect x="64" y="16" width="8" height="8"></rect>
            <rect x="16" y="64" width="8" height="8"></rect>
          </g>
        </svg>
      </div>

      <div style="display: flex; flex-direction: column; gap: 14px">
        <div class="eyebrow">Ved bordet · 4 af 8</div>
        <div class="liste">
          <div class="row">
            <div class="brik" style="background: #D8A93F">J</div>
            <div class="rname">Jeppe</div><div class="tag">VÆRT</div>
          </div>
          <div class="row">
            <div class="brik" style="background: #8FAF74">M</div>
            <div class="rname">Mette</div>
          </div>
          <div class="row">
            <div class="brik" style="background: #87A4C6">S</div>
            <div class="rname">Sofie</div>
          </div>
          <div class="row">
            <div class="brik" style="background: #C4776B">R</div>
            <div class="rname">Rasmus</div><div class="tag" style="color: var(--sage); border-color: rgba(147,174,124,0.4)">LIGE KOMMET</div>
          </div>
          <div class="row row-tom">
            <div style="width: 36px; height: 36px; border-radius: 50%; border: 1px dashed var(--line-2)"></div>
            <div class="rname" style="font-weight: 400">Venter på flere…</div>
          </div>
        </div>
      </div>
    </section>

    <section class="col col-r">
      <div style="display: flex; flex-direction: column; gap: 14px">
        <div class="eyebrow">Husregler</div>
        <div class="h" style="font-size: 32px">Sådan spiller I</div>
      </div>

      <div class="ops">
        <div class="op">
          <div>
            <div class="op-t">Hardcore</div>
            <div class="op-d">Straf for alle tegn på stivhed. Man kan kun hoppe ud fra et frifelt. Skal aftales fra begyndelsen.</div>
          </div>
          <div class="toggle"><div class="knop"></div></div>
        </div>
        <div class="op">
          <div>
            <div class="op-t">Kortbunken i appen</div>
            <div class="op-d">52 kort blandes digitalt. Slå fra hvis I hellere vil trække fysiske kort ved bordet.</div>
          </div>
          <div class="toggle toggle-on"><div class="knop"></div></div>
        </div>
        <div class="op">
          <div>
            <div class="op-t">Meier i appen</div>
            <div class="op-d">Terningerne er skjulte for alle andre end den der har bægeret. Melding, bluff og løft foregår på skærmen.</div>
          </div>
          <div class="toggle toggle-on"><div class="knop"></div></div>
        </div>
        <div class="op">
          <div>
            <div class="op-t">Tårnet på 0,5 l</div>
            <div class="op-d">Appen holder styr på hvor meget der er hældt i, og hvem der er i gang med at tømme det.</div>
          </div>
          <div class="toggle toggle-on"><div class="knop"></div></div>
        </div>
        <div class="op" style="border-bottom: none">
          <div>
            <div class="op-t">Turen går med uret</div>
            <div class="op-d">Rækkefølgen bliver den I står i her. Træk i navnene for at bytte rundt.</div>
          </div>
          <div class="toggle toggle-on"><div class="knop"></div></div>
        </div>
      </div>

      <div style="flex-grow: 1"></div>
      <button class="btn btn-primary" style="height: 58px">Start spillet</button>
      <div class="fine">Alle skal have en øl og et shotglas klar. Stil de 6 shotglas i pitten og tårnet midt på bordet.</div>
    </section>
  </div>
</div>
` + foot('{"$preview":{"width":1440,"height":900}}', 'class Component extends DCLogic {}');
}

/* ------------------------------------------------------------------- Kort */

const KORT_CSS = `
  .app { width: 760px; height: 860px; display: flex; flex-direction: column; gap: 0;
         background: radial-gradient(110% 80% at 50% 0%, #1E2C24 0%, #0D1310 70%); padding: 34px 40px 36px; }
  .hd { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 26px; }
  .h { font-family: var(--serif); font-size: 34px; }
  .scene { flex-grow: 1; display: flex; gap: 34px; align-items: center; }
  .kortside { width: 258px; height: 372px; flex: 0 0 258px; border-radius: 10px; position: relative; }
  .front { background: linear-gradient(168deg, #F6F1E4 0%, #E4DCC8 100%); border: 1px solid #B9AE93;
           box-shadow: 0 22px 40px rgba(0,0,0,0.55); display: flex; flex-direction: column; padding: 20px; }
  .hjorne { display: flex; flex-direction: column; align-items: center; line-height: 0.92; }
  .rang { font-family: var(--serif); font-size: 38px; font-weight: 700; }
  .kulor { font-size: 26px; }
  .midt { flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 108px; }
  .hjorne-b { transform: rotate(180deg); align-self: flex-end; }
  .info { flex-grow: 1; display: flex; flex-direction: column; gap: 18px; }
  .info-t { font-family: var(--serif); font-size: 30px; line-height: 1.14; color: var(--brass-lt); }
  .info-d { font-size: 14px; line-height: 1.7; color: var(--ink-dim); }
  .regelnote { font-size: 12px; line-height: 1.6; color: var(--ink-faint); border-left: 2px solid var(--line-2); padding-left: 14px; }
  .cta { display: flex; gap: 10px; }
  .bunke { margin-top: 26px; display: flex; flex-direction: column; gap: 12px; }
  .strip { display: flex; gap: 7px; }
  .mini { width: 40px; height: 56px; border-radius: 4px; background: #1B2620; border: 1px solid var(--line-2);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
  .mini b { font-family: var(--serif); font-size: 15px; font-weight: 700; }
  .mini span { font-size: 11px; }
  .tael { display: flex; align-items: center; justify-content: space-between; }`;

export function kort() {
  return head('Kort', KORT_CSS) + `
<div class="app">
  <div class="hd">
    <div>
      <div class="eyebrow" style="margin-bottom: 8px">Felt 28 · Træk et kort</div>
      <div class="h">Mette trak et kort</div>
    </div>
    <div class="eyebrow">Bunke <span style="color: var(--brass-lt)">{{tilbage}}</span> / 52</div>
  </div>

  <div class="scene">
    <div class="kortside front" onClick="{{traek}}" style="cursor: pointer">
      <div class="hjorne" style="color: {{farve}}">
        <div class="rang">{{rang}}</div>
        <div class="kulor">{{tegn}}</div>
      </div>
      <div class="midt" style="color: {{farve}}">{{tegn}}</div>
      <div class="hjorne hjorne-b" style="color: {{farve}}">
        <div class="rang">{{rang}}</div>
        <div class="kulor">{{tegn}}</div>
      </div>
    </div>

    <div class="info">
      <div class="eyebrow">Kortets betydning</div>
      <div class="info-t">{{titel}}</div>
      <div class="info-d">{{tekst}}</div>
      <div class="regelnote">Reglerne her er som de spilles i Tinglev. Spar og klør er sort uheld — du drikker selv; hjerter og ruder må du give væk.</div>
      <div style="flex-grow: 1"></div>
      <div class="cta">
        <button class="btn btn-primary" onClick="{{traek}}">Træk næste</button>
        <button class="btn btn-ghost">Videre i spillet</button>
      </div>
    </div>
  </div>

  <div class="bunke">
    <div class="tael">
      <div class="eyebrow">Trukket indtil nu</div>
      <div class="eyebrow">Blandet da spillet startede</div>
    </div>
    <div class="strip">
      <sc-for list="{{historik}}" as="h" hint-placeholder-count="8">
        <div class="mini" style="color: {{h.farve}}"><b>{{h.rang}}</b><span>{{h.tegn}}</span></div>
      </sc-for>
    </div>
  </div>
</div>
` + foot(
  '{"$preview":{"width":760,"height":860}}',
  `const KORT = ${JSON.stringify(KORT)};
const TEGN = { spar: ['\\u2660', '#1B241C'], 'kl\\u00f8r': ['\\u2663', '#1B241C'], hjerter: ['\\u2665', '#9E3B33'], ruder: ['\\u2666', '#9E3B33'] };

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { i: 6, trukket: [0, 3, 9, 4, 8, 1, 5] }; }
  renderVals() {
    const k = KORT[this.state.i % KORT.length];
    const t = TEGN[k.k] || TEGN.spar;
    return {
      rang: k.r, tegn: t[0], farve: t[1], titel: k.t, tekst: k.d,
      tilbage: 52 - this.state.trukket.length,
      historik: this.state.trukket.slice(-9).map((n) => {
        const c = KORT[n % KORT.length]; const ct = TEGN[c.k] || TEGN.spar;
        return { rang: c.r, tegn: ct[0], farve: ct[1] === '#1B241C' ? '#C7D2C8' : '#C0584E' };
      }),
      traek: () => {
        const n = Math.floor(Math.random() * KORT.length);
        this.setState({ i: n, trukket: this.state.trukket.concat([n]) });
      }
    };
  }
}`
);
}

/* ------------------------------------------------------------------ Meier */

const MEIER_CSS = `
  .app { width: 760px; height: 860px; display: flex; flex-direction: column;
         background: radial-gradient(110% 80% at 50% 0%, #241D24 0%, #0D1310 68%); padding: 34px 40px 36px; gap: 26px; }
  .hd { display: flex; align-items: baseline; justify-content: space-between; }
  .h { font-family: var(--serif); font-size: 34px; }
  .duel { display: flex; align-items: center; gap: 18px; padding: 16px 18px; border: 1px solid var(--line); border-radius: 3px;
          background: var(--panel); }
  .brik { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-family: var(--serif); font-size: 17px; font-weight: 700; color: #14180C; }
  .vs { font-family: var(--serif); font-size: 20px; color: var(--ink-faint); padding: 0 6px; }
  .duel-n { font-size: 15px; font-weight: 600; }
  .duel-s { font-size: 11px; color: var(--ink-faint); margin-top: 2px; }
  .baeger { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
            border: 1px solid var(--line); border-radius: 3px; background: rgba(20,29,24,0.7); position: relative; overflow: hidden; }
  .baeger-bg { position: absolute; inset: 0; background: radial-gradient(60% 60% at 50% 45%, rgba(176,132,160,0.13), transparent 70%); }
  .terninger { display: flex; gap: 18px; position: relative; }
  .melding { font-family: var(--serif); font-size: 56px; color: var(--plum); letter-spacing: 0.04em; position: relative; }
  .hemmelig { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint); position: relative; }
  .valg { display: flex; flex-direction: column; gap: 12px; }
  .knapper { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .stige { display: flex; flex-wrap: wrap; gap: 6px; }
  .trin { padding: 6px 10px; border: 1px solid var(--line-2); border-radius: 2px; font-size: 11.5px; color: var(--ink-dim); cursor: pointer; }
  .trin:hover { border-color: var(--plum); color: var(--ink); }
  .trin-top { border-color: rgba(176,132,160,0.55); color: var(--plum); font-weight: 700; }
  .note { font-size: 11.5px; line-height: 1.6; color: var(--ink-faint); }`;

export function meier() {
  return head('Meier', MEIER_CSS) + `
<div class="app">
  <div class="hd">
    <div>
      <div class="eyebrow" style="margin-bottom: 8px">Felt 26 · Meier</div>
      <div class="h">Bægeret er dit</div>
    </div>
    <div class="eyebrow" style="color: var(--plum)">Runde 3</div>
  </div>

  <div class="duel">
    <div class="brik" style="background: #B189A6">I</div>
    <div>
      <div class="duel-n">Ida</div>
      <div class="duel-s">Meldte {{modstanderMelding}}</div>
    </div>
    <div style="flex-grow: 1"></div>
    <div class="vs">mod</div>
    <div style="flex-grow: 1"></div>
    <div style="text-align: right">
      <div class="duel-n">Dig</div>
      <div class="duel-s">Skal melde {{modstanderMelding}} eller højere</div>
    </div>
    <div class="brik" style="background: #D8A93F">J</div>
  </div>

  <div class="baeger">
    <div class="baeger-bg"></div>
    <div class="hemmelig">Kun du kan se slaget</div>
    <div class="terninger">
      <sc-for list="{{terninger}}" as="d" hint-placeholder-count="2">
        <svg width="104" height="104" viewBox="0 0 100 100">
          <rect x="4" y="4" width="88" height="88" rx="16" fill="#EFE6D4" stroke="#8E8878" stroke-width="1.5"></rect>
          <sc-for list="{{d.pips}}" as="pip" hint-placeholder-count="3">
            <circle cx="{{pip.cx}}" cy="{{pip.cy}}" r="8" fill="#241D24"></circle>
          </sc-for>
        </svg>
      </sc-for>
    </div>
    <div class="melding">{{ditSlag}}</div>
    <div class="hemmelig">Dit rigtige slag · du behøver ikke sige sandheden</div>
  </div>

  <div class="valg">
    <div class="eyebrow">Meld videre</div>
    <div class="stige">
      <sc-for list="{{stige}}" as="s" hint-placeholder-count="9">
        <div class="trin {{s.klasse}}">{{s.navn}}</div>
      </sc-for>
    </div>
    <div class="knapper">
      <button class="btn btn-primary" onClick="{{slaaIgen}}">Slå igen</button>
      <button class="btn">Meld og send videre</button>
      <button class="btn btn-ghost">Det samme eller derover</button>
      <button class="btn btn-ghost" style="color: var(--rust); border-color: rgba(180,72,63,0.5)">Løft bægeret</button>
    </div>
    <div class="note">Kun du og Ida kan se terningerne. Resten af bordet ser kun hvad du melder. Taber du på en Meyer (2—1), drikker du dobbelt — det gør Ida også, hvis hun ikke kan slå den.</div>
  </div>
</div>
` + foot(
  '{"$preview":{"width":760,"height":860}}',
  `const PIPS = {
  1: [[50,50]], 2: [[30,30],[70,70]], 3: [[30,30],[50,50],[70,70]],
  4: [[30,30],[70,30],[30,70],[70,70]], 5: [[30,30],[70,30],[50,50],[30,70],[70,70]],
  6: [[30,28],[70,28],[30,50],[70,50],[30,72],[70,72]]
};
const STIGE = ['32', '41', '51', '52', '61', '62', '63', '64', '65', 'Par 1', 'Par 2', 'Par 3', 'Par 4', 'Par 5', 'Par 6', 'Lillemeyer', 'Meyer'];

function navnFor(a, b) {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi === 2 && lo === 1) return 'Meyer';
  if (hi === 3 && lo === 1) return 'Lillemeyer';
  if (hi === lo) return 'Par ' + hi;
  return '' + hi + lo;
}

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { a: 6, b: 3, melding: '53' }; }
  renderVals() {
    const mit = navnFor(this.state.a, this.state.b);
    const idx = STIGE.indexOf(mit);
    return {
      terninger: [this.state.a, this.state.b].map((v) => ({ pips: PIPS[v].map((p) => ({ cx: p[0], cy: p[1] })) })),
      ditSlag: mit,
      modstanderMelding: this.state.melding,
      stige: STIGE.slice(Math.max(0, idx - 4), Math.max(9, idx + 3)).map((s) => ({ navn: s, klasse: s === mit ? 'trin-top' : '' })),
      slaaIgen: () => this.setState({ a: 1 + Math.floor(Math.random() * 6), b: 1 + Math.floor(Math.random() * 6) })
    };
  }
}`
);
}

/* -------------------------------------------------------- Meier, tilskuer */

const TILSK_CSS = `
  .app { width: 760px; height: 860px; display: flex; flex-direction: column;
         background: radial-gradient(110% 80% at 50% 0%, #241D24 0%, #0D1310 68%); padding: 34px 40px 36px; gap: 24px; }
  .hd { display: flex; align-items: baseline; justify-content: space-between; }
  .h { font-family: var(--serif); font-size: 34px; }
  .bord { display: flex; align-items: stretch; gap: 14px; }
  .saede { flex-grow: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 22px 16px;
           border: 1px solid var(--line); border-radius: 3px; background: var(--panel); }
  .saede-on { border-color: rgba(176,132,160,0.55); background: rgba(176,132,160,0.08); }
  .brik { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: var(--serif); font-size: 18px; font-weight: 700; color: #14180C; }
  .s-navn { font-size: 15px; font-weight: 600; }
  .s-rolle { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint); }
  .imellem { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 96px; }
  .vs { font-family: var(--serif); font-size: 22px; color: var(--ink-faint); }
  .skjult { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
            padding: 30px 20px; border: 1px dashed var(--line-2); border-radius: 3px; background: rgba(20,29,24,0.5); }
  .skjult-t { font-family: var(--serif); font-size: 25px; color: var(--ink-dim); text-align: center; }
  .skjult-d { font-size: 12.5px; line-height: 1.6; color: var(--ink-faint); text-align: center; max-width: 420px; }
  .feed { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
  .f-i { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
  .f-tid { font-size: 10.5px; letter-spacing: 0.1em; color: var(--ink-faint); flex: 0 0 42px; }
  .f-t { font-size: 13.5px; line-height: 1.5; color: var(--ink-dim); flex-grow: 1; }
  .f-t b { color: var(--ink); font-weight: 600; }
  .f-meld { font-family: var(--serif); font-size: 16px; color: var(--plum); flex: 0 0 auto; }
  .note { font-size: 11.5px; line-height: 1.6; color: var(--ink-faint); }`;

export function meierTilskuer() {
  return head('Meier tilskuer', TILSK_CSS) + `
<div class="app">
  <div class="hd">
    <div>
      <div class="eyebrow" style="margin-bottom: 8px">Felt 26 · Meier</div>
      <div class="h">Jeppe mod Ida</div>
    </div>
    <div class="eyebrow" style="color: var(--plum)">Du ser med</div>
  </div>

  <div class="bord">
    <div class="saede saede-on">
      <div class="brik" style="background: #D8A93F">J</div>
      <div class="s-navn">Jeppe</div>
      <div class="s-rolle" style="color: var(--plum)">Har bægeret</div>
    </div>
    <div class="imellem">
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="#7E6B8A" stroke-width="1.6" stroke-linejoin="round">
        <path d="M13 12h22l-2.5 22a3 3 0 0 1-3 2.6h-11a3 3 0 0 1-3-2.6z"></path>
        <path d="M10 12h28"></path>
      </svg>
      <div class="vs">mod</div>
    </div>
    <div class="saede">
      <div class="brik" style="background: #B189A6">I</div>
      <div class="s-navn">Ida</div>
      <div class="s-rolle">Venter på meldingen</div>
    </div>
  </div>

  <div class="skjult">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7E6B8A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"></path>
      <path d="M4 20L20 4"></path>
    </svg>
    <div class="skjult-t">Terningerne er kun synlige for Jeppe og Ida</div>
    <div class="skjult-d">Du ser hvad de melder, om de tror på hinanden, og hvem der løfter — men aldrig hvad der ligger under bægeret. Løfter nogen, ser hele bordet slaget.</div>
  </div>

  <div class="feed">
    <div class="eyebrow" style="margin-bottom: 4px">Ved bordet</div>
    <div class="f-i">
      <div class="f-tid">nu</div>
      <div class="f-t"><b>Jeppe</b> slog og melder</div>
      <div class="f-meld">Par 4</div>
    </div>
    <div class="f-i">
      <div class="f-tid">nu</div>
      <div class="f-t"><b>Jeppe</b> slog igen uden at kigge</div>
    </div>
    <div class="f-i">
      <div class="f-tid">1 min</div>
      <div class="f-t"><b>Jeppe</b> troede på Ida og tog bægeret</div>
    </div>
    <div class="f-i">
      <div class="f-tid">1 min</div>
      <div class="f-t"><b>Ida</b> meldte og sendte videre</div>
      <div class="f-meld">63</div>
    </div>
    <div class="f-i">
      <div class="f-tid">2 min</div>
      <div class="f-t"><b>Ida</b> blev udfordret af Jeppe</div>
    </div>
  </div>

  <div class="note">Bliver der løftet, står slaget her — og appen fordeler selv slurkene. Dobbelt hvis der blev tabt på en Meyer.</div>
</div>
` + foot('{"$preview":{"width":760,"height":860}}', 'class Component extends DCLogic {}');
}
