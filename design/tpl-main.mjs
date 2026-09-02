import * as B from './board.mjs';
import { head, foot, SPILLERE, FELT_TEKST, TAARN_KAPACITET, CL_KODE } from './shared.mjs';

const CSS = `
  .app { width: 1440px; height: 900px; display: flex; flex-direction: column;
         background: radial-gradient(120% 90% at 50% -10%, #1A2620 0%, #0E1512 62%); }

  .top { height: 74px; flex: 0 0 74px; display: flex; align-items: center; gap: 26px;
         padding: 0 26px; border-bottom: 1px solid var(--line); background: rgba(12,18,15,0.72); }
  .mark { font-family: var(--serif); font-size: 30px; font-weight: 700; letter-spacing: 0.02em;
          background: linear-gradient(180deg, #F0DCA0 0%, #C9A227 55%, #9A7A18 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .kode { display: flex; align-items: center; gap: 9px; height: 30px; padding: 0 12px;
          border: 1px solid var(--line-2); border-radius: 2px; font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.16em; color: var(--ink-dim); }
  .kode b { color: var(--brass-lt); font-weight: 700; }
  .tur-pill { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 18px 0 8px;
              border: 1px solid var(--line-2); border-radius: 999px; background: var(--panel-2); }
  .top-spacer { flex-grow: 1; }
  .top-actions { display: flex; align-items: center; gap: 10px; }
  .icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
              border: 1px solid var(--line-2); border-radius: 2px; background: transparent; cursor: pointer; color: var(--ink-dim); }
  .icon-btn:hover { color: var(--brass-lt); border-color: var(--brass); }

  .body { flex-grow: 1; display: flex; min-height: 0; }
  .rail { width: 316px; flex: 0 0 316px; display: flex; flex-direction: column; gap: 0;
          background: rgba(16,23,19,0.6); overflow: hidden; }
  .rail-l { border-right: 1px solid var(--line); }
  .rail-r { border-left: 1px solid var(--line); }
  .rail-sec { padding: 18px 20px 20px; border-bottom: 1px solid var(--line); }
  .rail-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }

  .spillere { display: flex; flex-direction: column; gap: 4px; }
  .sp { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 2px; border: 1px solid transparent; }
  .sp-aktiv { background: linear-gradient(90deg, rgba(201,162,39,0.14), rgba(201,162,39,0.02)); border-color: rgba(201,162,39,0.4); }
  .brik { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-family: var(--serif); font-size: 15px; font-weight: 700; color: #14180C;
          box-shadow: inset 0 -2px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5); }
  .sp-txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex-grow: 1; }
  .sp-linje { display: flex; align-items: center; gap: 7px; }
  .sp-navn { font-size: 14px; font-weight: 600; color: var(--ink); }
  .sp-sub { font-size: 11px; color: var(--ink-faint); letter-spacing: 0.03em; }
  .slurkebar { height: 3px; border-radius: 2px; background: #2B382E; overflow: hidden; margin-top: 2px; }
  .slurkefyld { height: 100%; border-radius: 2px; opacity: 0.85; }
  .slurketal { text-align: right; flex: 0 0 46px; }
  .slurketal b { display: block; font-family: var(--serif); font-size: 17px; color: var(--ink); line-height: 1.1; }
  .slurketal span { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint); }
  .laast { display: flex; gap: 10px; align-items: flex-start; padding: 11px 12px; border-radius: 2px;
           border: 1px solid rgba(180,72,63,0.35); background: rgba(180,72,63,0.09);
           font-size: 11.5px; line-height: 1.5; color: #C58A83; }
  .laast svg { flex: 0 0 14px; margin-top: 1px; }
  .badge { display: flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px; border-radius: 2px;
           font-size: 10px; font-weight: 700; letter-spacing: 0.1em; }
  .badge-bm { background: rgba(201,162,39,0.18); color: var(--brass-lt); border: 1px solid rgba(201,162,39,0.42); }
  .badge-pit { background: rgba(180,72,63,0.16); color: #D98279; border: 1px solid rgba(180,72,63,0.4); }

  .status { display: flex; flex-direction: column; gap: 14px; }
  .taarn-row { display: flex; align-items: center; gap: 16px; }
  .glasbar { width: 46px; height: 74px; flex: 0 0 46px; border: 1.5px solid #9FB0A2; border-radius: 4px;
             background: #0E1512; position: relative; overflow: hidden; }
  .glas-fyld { position: absolute; left: 0; right: 0; bottom: 0;
               background: linear-gradient(180deg, #F2C060, #C4761A); }
  .glas-skum { position: absolute; left: 0; right: 0; height: 7px; background: #F6EBD4; }
  .taarn-txt { display: flex; flex-direction: column; gap: 5px; }
  .taarn-maal { font-family: var(--serif); font-size: 28px; color: var(--amber); line-height: 1.05; }
  .enhed { font-family: var(--sans); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint); }
  .omregn { display: flex; gap: 6px; }
  .om { flex-grow: 1; display: flex; flex-direction: column; gap: 3px; padding: 8px 9px; border-radius: 2px;
        border: 1px solid var(--line); background: rgba(20,29,24,0.55); }
  .om span { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint); }
  .om b { font-family: var(--serif); font-size: 15px; font-weight: 500; color: var(--ink); }
  .hold { position: relative; height: 66px; border-radius: 3px; border: 1px solid #7E6413; overflow: hidden;
          background: #1D2118; cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: center; }
  .hold-fyld { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(180deg, #F2C060 0%, #C4761A 100%); }
  .hold-txt { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .hold-t { font-size: 11.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
  .hold-d { font-size: 11px; color: var(--ink-dim); }
  .hold-on .hold-t, .hold-on .hold-d { color: #14180C; }
  .note { font-size: 11.5px; line-height: 1.5; color: var(--ink-faint); }

  .bm-row { display: flex; align-items: center; gap: 14px; }
  .krone { width: 42px; height: 42px; flex: 0 0 42px; display: flex; align-items: center; justify-content: center;
           border: 1px solid rgba(201,162,39,0.45); border-radius: 2px; background: rgba(201,162,39,0.1); }

  .stage { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; }
  .viewport { flex-grow: 1; position: relative; overflow: hidden; cursor: grab;
              background: radial-gradient(70% 60% at 50% 42%, #223129 0%, #131C17 70%, #0C120F 100%); }
  .viewport svg { display: block; width: 100%; height: 100%; }
  .vp-hint { position: absolute; left: 18px; bottom: 16px; display: flex; align-items: center; gap: 8px;
             font-size: 10.5px; letter-spacing: 0.14em; color: var(--ink-faint); text-transform: uppercase; }
  .zoom { position: absolute; right: 18px; bottom: 16px; display: flex; gap: 6px; }
  .zbtn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;
          border: 1px solid var(--line-2); border-radius: 2px; background: rgba(14,21,18,0.82); color: var(--ink-dim);
          font-size: 16px; font-family: var(--sans); }
  .zbtn:hover { color: var(--brass-lt); border-color: var(--brass); }

  .dock { height: 150px; flex: 0 0 150px; display: flex; align-items: center; gap: 24px; padding: 0 24px;
          border-top: 1px solid var(--line); background: linear-gradient(180deg, #131C17 0%, #0F1713 100%); }
  .dock-left { display: flex; flex-direction: column; gap: 6px; width: 190px; flex: 0 0 190px; }
  .dock-navn { font-family: var(--serif); font-size: 27px; color: var(--ink); }
  .terning-boks { display: flex; align-items: center; gap: 18px; flex-grow: 1; min-width: 0; }
  .terning-boks .btn { flex-grow: 1; max-width: 290px; }
  .dock-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; width: 165px; flex: 0 0 165px; }
  .miniplan { display: flex; gap: 4px; }
  .mini { width: 9px; height: 9px; border-radius: 1px; background: var(--line-2); }

  .event { display: flex; flex-direction: column; gap: 12px; }
  .event-hat { display: flex; align-items: center; gap: 10px; }
  .event-titel { font-family: var(--serif); font-size: 28px; line-height: 1.05; }
  .event-txt { font-size: 13px; line-height: 1.62; color: var(--ink-dim); }
  .event-cta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .btn-sm { height: 38px; padding: 0 16px; font-size: 11px; }

  .log { display: flex; flex-direction: column; gap: 0; overflow: hidden; }
  .log-i { display: flex; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
  .log-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; margin-top: 5px; }
  .log-t { font-size: 12.5px; line-height: 1.5; color: var(--ink-dim); }
  .log-t b { color: var(--ink); font-weight: 600; }`;

const FELTER = B.FIELDS.map((f) => ({ nr: f.nr, type: f.type, cx: f.cx, cy: f.cy, points: f.points }));
const PIT = B.PIT.map((c) => ({ plads: c.plads, cx: c.cx, cy: c.cy }));

export function main() {
  return head('K69', CSS) + `
<div class="app">

  <header class="top">
    <div class="mark">K69</div>
    <div class="kode"><span>SPIL</span><b>TINGLEV-4471</b></div>
    <div class="tur-pill">
      <div class="brik" style="background: {{turFarve}}">{{turInitial}}</div>
      <div style="display: flex; flex-direction: column; gap: 1px">
        <div class="eyebrow">Tur</div>
        <div style="font-size: 14px; font-weight: 600">{{turNavn}}</div>
      </div>
    </div>
    <div class="top-spacer"></div>
    <div class="top-actions">
      <button class="btn btn-ghost btn-sm" style="height: 40px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"></path><path d="M12 15V3"></path><path d="M8 7l4-4 4 4"></path></svg>
        Del link
      </button>
      <button class="icon-btn" title="Regler">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2z"></path><path d="M8 8h6"></path><path d="M8 12h6"></path></svg>
      </button>
      <button class="icon-btn" title="Indstillinger">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"></path></svg>
      </button>
    </div>
  </header>

  <div class="body">

    <aside class="rail rail-l">
      <div class="rail-sec" style="flex-grow: 1; min-height: 0">
        <div class="rail-head">
          <div class="eyebrow">Ved bordet</div>
          <div class="eyebrow" style="color: var(--brass)">{{antal}}</div>
        </div>
        <div class="spillere">
          <sc-for list="{{spillere}}" as="sp" hint-placeholder-count="5">
            <div class="sp {{sp.klasse}}">
              <div class="brik" style="background: {{sp.farve}}">{{sp.initial}}</div>
              <div class="sp-txt">
                <div class="sp-linje">
                  <div class="sp-navn">{{sp.navn}}</div>
                  <sc-if value="{{sp.erBM}}" hint-placeholder-val="{{true}}">
                    <div class="badge badge-bm">BM</div>
                  </sc-if>
                  <sc-if value="{{sp.iPit}}" hint-placeholder-val="{{false}}">
                    <div class="badge badge-pit">PIT {{sp.pitPlads}}</div>
                  </sc-if>
                </div>
                <div class="sp-sub">{{sp.sub}}</div>
                <div class="slurkebar"><div class="slurkefyld" style="width: {{sp.slurkePct}}; background: {{sp.farve}}"></div></div>
              </div>
              <div class="slurketal">
                <b>{{sp.slurke}}</b>
                <span>{{sp.drik}}</span>
              </div>
            </div>
          </sc-for>
        </div>
      </div>

      <div class="rail-sec" style="border-bottom: none">
        <div class="rail-head"><div class="eyebrow">Bordet</div></div>
        <div class="status">
          <div class="taarn-row">
            <div class="glasbar">
              <div class="glas-fyld" style="height: {{taarnH}}"></div>
              <div class="glas-skum" style="bottom: {{taarnH}}"></div>
            </div>
            <div class="taarn-txt">
              <div class="taarn-maal">{{taarnSlurke}} <span class="enhed">slurke i tårnet</span></div>
              <div class="note">Det er <b style="color: var(--amber)">{{minCl}}</b> af din {{minDrik}}. Sidst fyldt af Rasmus.</div>
            </div>
          </div>
          <div class="omregn">
            <sc-for list="{{omregning}}" as="o" hint-placeholder-count="3">
              <div class="om"><span>{{o.navn}}</span><b>{{o.cl}}</b></div>
            </sc-for>
          </div>
          <div class="bm-row">
            <div class="krone">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.6" stroke-linejoin="round"><path d="M3 8l4 4 5-8 5 8 4-4v10H3z"></path></svg>
            </div>
            <div class="sp-txt">
              <div class="sp-navn">{{bmNavn}} er Bier Meister</div>
              <div class="note">Henter øl og drikker 3 slurke hver gang nogen lander på Go!</div>
            </div>
          </div>
          <div class="laast">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>
            <div>Ingen kan hoppe ud: der er øl i tårnet, og {{bmNavn}} er Bier Meister.</div>
          </div>
        </div>
      </div>
    </aside>

    <main class="stage">
      <div class="viewport" onPointerDown="{{greb}}" onPointerMove="{{traek}}" onPointerUp="{{slip}}" onWheel="{{hjul}}">
        <svg viewBox="0 0 808 676" preserveAspectRatio="xMidYMid slice">
          ${B.boardDefs('m')}
          <rect x="0" y="0" width="808" height="676" fill="url(#m-felt)"></rect>
          <rect x="0" y="0" width="808" height="676" fill="#ffffff" filter="url(#m-grain)" opacity="0.5"></rect>
          <g transform="translate({{panX}}, {{panY}}) scale({{zoom}})">
            ${B.boardSvg('m', { bg: false })}
            ${B.towerSvg('m', 0.55)}
            <polygon points="{{aktivPoints}}" fill="none" stroke="{{accent}}" stroke-width="3.5" filter="url(#m-glow)" opacity="0.95"></polygon>
            <sc-for list="{{brikker}}" as="bk" hint-placeholder-count="5">
              <g transform="translate({{bk.x}}, {{bk.y}})" style="transition: transform 480ms cubic-bezier(0.33, 1.08, 0.45, 1)">
                <circle cx="0" cy="3" r="17" fill="#0B100D" opacity="0.55"></circle>
                <circle cx="0" cy="0" r="16" fill="{{bk.farve}}" stroke="#0E1512" stroke-width="2"></circle>
                <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="#14180C" style="font-family: var(--serif)">{{bk.initial}}</text>
              </g>
            </sc-for>
          </g>
        </svg>
        <div class="vp-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"></path></svg>
          Træk for at flytte pladen · rul for at zoome
        </div>
        <div class="zoom">
          <div class="zbtn" onClick="{{ud}}">−</div>
          <div class="zbtn" onClick="{{fit}}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"></path></svg>
          </div>
          <div class="zbtn" onClick="{{ind}}">+</div>
        </div>
      </div>

      <div class="dock">
        <div class="dock-left">
          <div class="eyebrow">Det er din tur</div>
          <div class="dock-navn">{{turNavn}}</div>
          <div class="note">Slå — appen rykker selv brikken og sender turen videre.</div>
        </div>

        <div class="terning-boks">
          <svg width="86" height="86" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="t-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F3EADA"></stop><stop offset="100%" stop-color="#CFC4AE"></stop></linearGradient>
            </defs>
            <rect x="6" y="9" width="88" height="88" rx="17" fill="#0B100D" opacity="0.55"></rect>
            <rect x="4" y="4" width="88" height="88" rx="17" fill="url(#t-face)" stroke="#8E8878" stroke-width="1.5"></rect>
            <sc-for list="{{pips}}" as="pip" hint-placeholder-count="4">
              <circle cx="{{pip.cx}}" cy="{{pip.cy}}" r="7.5" fill="#1B241C"></circle>
            </sc-for>
          </svg>
          <button class="btn btn-primary" style="height: 54px; padding: 0 20px; font-size: 12px" onClick="{{slaa}}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"></circle><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"></circle></svg>
            Slå med terningen
          </button>
        </div>

        <div class="dock-right">
          <div class="eyebrow">Runde 7 · med uret</div>
          <div class="miniplan">
            <sc-for list="{{turRaekke}}" as="t" hint-placeholder-count="6">
              <div class="mini" style="background: {{t.farve}}"></div>
            </sc-for>
          </div>
          <div class="note" style="text-align: right; max-width: 210px">Næste: {{naesteNavn}}</div>
        </div>
      </div>
    </main>

    <aside class="rail rail-r">
      <div class="rail-sec">
        <div class="rail-head"><div class="eyebrow">Denne tur</div><div class="eyebrow">Felt {{aktivNr}}</div></div>
        <div class="event">
          <div class="event-hat">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: {{aktivFarve}}"></div>
            <div class="eyebrow" style="color: {{aktivFarve}}">{{turNavn}} slog {{terning}}</div>
          </div>
          <div class="event-titel" style="color: {{aktivFarve}}">{{aktivTitel}}</div>
          <div class="event-txt">{{aktivTekst}}</div>
          <sc-if value="{{erDrik}}" hint-placeholder-val="{{false}}">
            <div class="event-txt" style="color: var(--amber)">Det er {{taarnSlurke}} slurke — {{minCl}} af din {{minDrik}}.</div>
          </sc-if>
          <sc-if value="{{erTaarn}}" hint-placeholder-val="{{true}}">
            <div class="hold {{holdKlasse}}" onPointerDown="{{start}}" onPointerUp="{{stop}}" onPointerLeave="{{stop}}" onPointerCancel="{{stop}}">
              <div class="hold-fyld" style="width: {{holdPct}}"></div>
              <div class="hold-txt">
                <div class="hold-t">{{holdTekst}}</div>
                <div class="hold-d">{{holdUnder}}</div>
              </div>
            </div>
          </sc-if>
          <sc-if value="{{ikkeTaarn}}" hint-placeholder-val="{{false}}">
            <div class="event-cta">
              <button class="btn btn-sm">Vælg spiller</button>
              <button class="btn btn-sm btn-ghost">Kvitter</button>
            </div>
          </sc-if>
        </div>
      </div>

      <div class="rail-sec" style="flex-grow: 1; border-bottom: none">
        <div class="rail-head"><div class="eyebrow">Hændelser</div></div>
        <div class="log">
          <sc-for list="{{log}}" as="l" hint-placeholder-count="7">
            <div class="log-i">
              <div class="log-dot" style="background: {{l.farve}}"></div>
              <div class="log-t">{{l.tekst}}</div>
            </div>
          </sc-for>
        </div>
      </div>
    </aside>

  </div>
</div>
` + foot(
  '{"accent":{"editor":"color","default":"#C9A227","options":["#C9A227","#E0A03C","#93AE7C","#88A2C2"],"section":"Stil"},'
  + '"antalSpillere":{"editor":"int","default":5,"min":1,"max":8,"section":"Spil"},'
  + '"$preview":{"width":1440,"height":900}}',
  logik()
);
}

function logik() {
  return `const FELTER = ${JSON.stringify(FELTER)};
const PIT = ${JSON.stringify(PIT)};
const SPILLERE = ${JSON.stringify(SPILLERE)};
const TEKST = ${JSON.stringify(FELT_TEKST)};
const FARVER = { fri: '#8C9689', tre: '#93AE7C', skaal: '#D3B44E', bm: '#C9A227', gobm: '#D08A4E',
  taarn: '#E0A03C', kort: '#88A2C2', drik: '#C4635B', meier: '#B084A0', krone: '#DCC684' };
const PIPS = {
  1: [[50,50]],
  2: [[30,30],[70,70]],
  3: [[30,30],[50,50],[70,70]],
  4: [[30,30],[70,30],[30,70],[70,70]],
  5: [[30,30],[70,30],[50,50],[30,70],[70,70]],
  6: [[30,28],[70,28],[30,50],[70,50],[30,72],[70,72]]
};
const START = [2, 4, 8, 10, 16, 18, 22, 27];
const DRIK_NAVN = { ol: 'Pilsner', vin: 'Vin', whisky: 'Whisky' };
const KAP = ${TAARN_KAPACITET};
${CL_KODE}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      pos: START.slice(),
      pit: [0, 0, 0, 0, 0, 0, 0, 0],
      slurke: [8, 11, 5, 11, 3, 9, 11, 7],
      drik: ['ol', 'ol', 'vin', 'ol', 'whisky', 'ol', 'vin', 'ol'],
      tur: 0,
      terning: 4,
      aktiv: 9,
      bm: 1,
      taarn: 5,
      tilfoejet: 0,
      holder: false,
      pan: { x: 8, y: 120, z: 0.66 },
      drag: null,
      log: [
        { farve: '#C4635B', tekst: 'Mette landede på DRIK! — tårnet skal bundes.' },
        { farve: '#E0A03C', tekst: 'Rasmus hældte 3 slurke i tårnet.' },
        { farve: '#B084A0', tekst: 'Sofie udfordrede Jeppe til Meier — Jeppe tabte på en løftet bluff.' },
        { farve: '#88A2C2', tekst: 'Jeppe trak Bonde — ny regel: kun tysk ved bordet.' },
        { farve: '#C9A227', tekst: 'Ida blev Bier Meister.' },
        { farve: '#93AE7C', tekst: 'Kasper gav 3 slurke til Mette.' },
        { farve: '#8C9689', tekst: 'Spillet startet af Jeppe. 5 spillere ved bordet.' }
      ]
    };
  }

  antal() { return Math.max(1, Math.min(8, this.props.antalSpillere ?? 5)); }


  slaaTerning() {
    const n = this.antal();
    const v = 1 + Math.floor(Math.random() * 6);
    const pos = this.state.pos.slice();
    const pit = this.state.pit.slice();
    const slurke = this.state.slurke.slice();
    const i = this.state.tur % n;
    let taarn = this.state.taarn;
    let bm = this.state.bm;
    // Én enhed er 11 slurke; er den tom, hentes en ny.
    const drik = (k, antal) => { slurke[k] = slurke[k] - antal; if (slurke[k] <= 0) slurke[k] = 11 + slurke[k]; };

    if (pit[i] > 0) {
      const ny = pit[i] - v;
      if (ny <= 0) { pit[i] = 0; pos[i] = 1; } else { pit[i] = ny; }
    } else {
      pos[i] = ((pos[i] - 1 + v) % FELTER.length) + 1;
      for (let j = 0; j < n; j++) {
        if (j !== i && pit[j] === 0 && pos[j] === pos[i]) { pit[j] = 1 + Math.floor(Math.random() * 6); pos[j] = 0; }
      }
    }

    const felt = FELTER[(pos[i] || 1) - 1];
    if (pit[i] > 0) {
      drik(i, pit[i]);
    } else {
      if (felt.type === 'drik') { drik(i, Math.round(taarn)); taarn = 0; }
      if (felt.type === 'bm') bm = i;
      if (felt.type === 'skaal') for (let j = 0; j < n; j++) drik(j, 1);
      if (felt.type === 'gobm') drik(bm === null ? i : bm, 3);
    }

    const navn = SPILLERE[i].navn;
    const linje = pit[i] > 0
      ? { farve: '#C4635B', tekst: navn + ' slog ' + v + ' og er i pitten på plads ' + pit[i] + '.' }
      : { farve: FARVER[felt.type], tekst: navn + ' slog ' + v + ' og landede på ' + (TEKST[felt.type][0]) + '.' };

    this.setState({
      pos, pit, slurke, terning: v, taarn, bm, tilfoejet: 0,
      aktiv: pit[i] > 0 ? this.state.aktiv : pos[i],
      tur: (this.state.tur + 1) % n,
      log: [linje].concat(this.state.log).slice(0, 9)
    });
  }

  // Hold knappen nede: tårnet fyldes videre indtil der slippes.
  haeld() {
    if (this.t) return;
    this.setState({ holder: true });
    this.t = setInterval(() => {
      const nu = this.state.taarn;
      const ny = Math.min(KAP + 3, nu + 0.25);
      this.setState({ taarn: ny, tilfoejet: this.state.tilfoejet + (ny - nu) });
    }, 95);
  }

  stopHaeld() {
    if (this.t) { clearInterval(this.t); this.t = null; }
    if (this.state.holder) this.setState({ holder: false });
  }

  componentWillUnmount() { if (this.t) clearInterval(this.t); }

  zoom(f) {
    const p = this.state.pan;
    const z = Math.max(0.35, Math.min(1.8, p.z * f));
    this.setState({ pan: { x: p.x + (404 - p.x) * (1 - z / p.z), y: p.y + (340 - p.y) * (1 - z / p.z), z } });
  }

  renderVals() {
    const n = this.antal();
    const st = this.state;
    const accent = this.props.accent ?? '#C9A227';

    const spillere = SPILLERE.slice(0, n).map((s, i) => {
      const iPit = st.pit[i] > 0;
      const felt = FELTER[(st.pos[i] || 1) - 1];
      return {
        navn: s.navn,
        farve: s.farve,
        initial: s.navn.slice(0, 1),
        erBM: st.bm === i,
        iPit,
        pitPlads: st.pit[i],
        sub: iPit ? 'Pitten · plads ' + st.pit[i] + ' · ' + st.pit[i] + ' shots' : 'Felt ' + st.pos[i] + ' · ' + TEKST[felt.type][0],
        slurke: st.slurke[i] + '/11',
        slurkePct: Math.round((st.slurke[i] / 11) * 100) + '%',
        drik: DRIK_NAVN[st.drik[i]],
        klasse: (st.tur % n) === i ? 'sp-aktiv' : ''
      };
    });

    const paaFelt = {};
    const brikker = spillere.map((s, i) => {
      let base;
      if (st.pit[i] > 0) { const c = PIT[st.pit[i] - 1]; base = { x: c.cx, y: c.cy - 4 }; }
      else { const f = FELTER[st.pos[i] - 1]; base = { x: f.cx, y: f.cy }; }
      const key = st.pit[i] > 0 ? 'p' + st.pit[i] : 'f' + st.pos[i];
      const k = paaFelt[key] || 0;
      paaFelt[key] = k + 1;
      return { x: base.x + (k % 2) * 15 - (k > 0 ? 7 : 0), y: base.y + Math.floor(k / 2) * 15, farve: s.farve, initial: s.initial };
    });

    const aktiv = FELTER[st.aktiv - 1];
    const t = TEKST[aktiv.type];
    const turIdx = st.tur % n;
    const minDrik = st.drik[turIdx];
    const tal = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ','));
    // Kun de drikke der faktisk sidder ved bordet vises i omregningen.
    const brugte = [];
    for (let j = 0; j < n; j++) if (brugte.indexOf(st.drik[j]) === -1) brugte.push(st.drik[j]);

    return {
      accent,
      antal: n,
      spillere,
      brikker,
      turNavn: SPILLERE[turIdx].navn,
      turFarve: SPILLERE[turIdx].farve,
      turInitial: SPILLERE[turIdx].navn.slice(0, 1),
      naesteNavn: SPILLERE[(turIdx + 1) % n].navn,
      turRaekke: SPILLERE.slice(0, n).map((s, i) => ({ farve: i === turIdx ? s.farve : '#36473A' })),
      bmNavn: st.bm === null ? 'Ingen endnu' : SPILLERE[st.bm].navn,
      terning: st.terning,
      pips: (PIPS[st.terning] || PIPS[1]).map((p) => ({ cx: p[0], cy: p[1] })),
      taarnH: Math.round(Math.min(1, st.taarn / (KAP + 3)) * 100) + '%',
      taarnSlurke: tal(Math.round(st.taarn * 10) / 10),
      minCl: iCl(st.taarn, minDrik),
      minDrik: DRIK_NAVN[minDrik].toLowerCase(),
      omregning: brugte.map((d) => ({ navn: DRIK_NAVN[d], cl: iCl(st.taarn, d) })),
      erTaarn: aktiv.type === 'taarn',
      ikkeTaarn: aktiv.type !== 'taarn',
      erDrik: aktiv.type === 'drik',
      holdKlasse: st.holder ? 'hold-on' : '',
      holdPct: Math.round(Math.min(1, st.taarn / (KAP + 3)) * 100) + '%',
      holdTekst: st.holder ? 'Hælder…' : (st.taarn > KAP ? 'Nu løber det over' : 'Hold for at hælde i tårnet'),
      holdUnder: st.tilfoejet > 0 ? '+' + tal(Math.round(st.tilfoejet * 10) / 10) + ' slurke · ' + iCl(st.tilfoejet, minDrik) : 'Slip når du synes det er nok',
      start: () => this.haeld(),
      stop: () => this.stopHaeld(),
      aktivNr: aktiv.nr,
      aktivPoints: aktiv.points,
      aktivFarve: FARVER[aktiv.type],
      aktivTitel: t[0],
      aktivTekst: t[1],
      panX: Math.round(st.pan.x),
      panY: Math.round(st.pan.y),
      zoom: Math.round(st.pan.z * 1000) / 1000,
      log: st.log,
      slaa: () => this.slaaTerning(),
      ind: () => this.zoom(1.18),
      ud: () => this.zoom(1 / 1.18),
      fit: () => this.setState({ pan: { x: 8, y: 120, z: 0.66 } }),
      hjul: (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.08 : 1 / 1.08); },
      greb: (e) => { this.setState({ drag: { x: e.clientX, y: e.clientY, px: this.state.pan.x, py: this.state.pan.y } }); },
      traek: (e) => {
        const d = this.state.drag;
        if (!d) return;
        this.setState({ pan: { x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y), z: this.state.pan.z } });
      },
      slip: () => this.setState({ drag: null })
    };
  }
}`;
}
