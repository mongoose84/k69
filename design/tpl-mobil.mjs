import * as B from './board.mjs';
import { head, foot, SPILLERE, FELT_TEKST, TAARN_KAPACITET, CL_KODE } from './shared.mjs';

const FELTER = B.FIELDS.map((f) => ({ nr: f.nr, type: f.type, cx: f.cx, cy: f.cy, points: f.points }));
const PIT = B.PIT.map((c) => ({ plads: c.plads, cx: c.cx, cy: c.cy }));

// Glassene tegnes ens i alle artboards.
export const GLAS = {
  ol: '<svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M5 5h13l-1.4 21a2 2 0 0 1-2 1.9h-6.2a2 2 0 0 1-2-1.9z"></path><path d="M18 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3.3"></path><path d="M5.6 13h11.8" stroke-dasharray="2 2"></path></svg>',
  vin: '<svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 3h13v6a6.5 6.5 0 0 1-13 0z"></path><path d="M12.5 15.5V25"></path><path d="M7.5 27h10"></path></svg>',
  whisky: '<svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 8h13v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"></path><path d="M6.4 18h12.2" stroke-dasharray="2 2"></path><circle cx="12.5" cy="22" r="1.6"></circle></svg>'
};

const SKAL = `
  .app { width: 390px; height: 844px; display: flex; flex-direction: column; overflow: hidden;
         background: radial-gradient(120% 70% at 50% 0%, #1B2821 0%, #0D1310 62%); padding-top: 14px; }
  .bar { height: 58px; flex: 0 0 58px; display: flex; align-items: center; gap: 12px; padding: 0 16px; }
  .mark { font-family: var(--serif); font-size: 24px; font-weight: 700;
          background: linear-gradient(180deg, #F0DCA0 0%, #C9A227 55%, #9A7A18 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
  .kode { font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--ink-faint); }
  .brik { border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: var(--serif); font-weight: 700; color: #14180C; }
  .ikon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          color: var(--ink-dim); border: 1px solid var(--line-2); border-radius: 2px; background: transparent; }
  .note { font-size: 11.5px; line-height: 1.55; color: var(--ink-faint); }`;

/* -------------------------------------------------------------- MobilSpil */

const SPIL_CSS = SKAL + `
  .avatarer { display: flex; flex-grow: 1; }
  .av { width: 30px; height: 30px; font-size: 13px; margin-left: -7px; border: 2px solid #0F1613; }
  .av-1 { margin-left: 0; }
  .av-tur { border-color: var(--brass); }

  .vp { flex-grow: 1; position: relative; overflow: hidden; border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line); background: #101815; touch-action: none; }
  .vp svg.plade { display: block; width: 100%; height: 100%; }
  .minimap { position: absolute; right: 12px; top: 12px; width: 118px; height: 66px; border: 1px solid var(--line-2);
             border-radius: 2px; background: rgba(11,17,14,0.86); padding: 4px; }
  .vpknap { position: absolute; left: 12px; top: 12px; display: flex; gap: 6px; }
  .chip { height: 34px; padding: 0 12px; display: flex; align-items: center; gap: 7px; border-radius: 2px;
          border: 1px solid var(--line-2); background: rgba(11,17,14,0.86); font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-dim); }
  .chip-on { color: var(--brass-lt); border-color: rgba(201,162,39,0.5); }

  .sheet { flex: 0 0 318px; display: flex; flex-direction: column; gap: 0; padding: 0 0 12px;
           background: linear-gradient(180deg, #16211B 0%, #0F1713 100%); }
  .greb { width: 40px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 9px auto 4px; }
  .sheet-sec { padding: 12px 16px; }
  .event-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .event-t { font-family: var(--serif); font-size: 27px; line-height: 1.1; }
  .event-d { font-size: 12.5px; line-height: 1.6; color: var(--ink-dim); }
  .slaa-row { display: flex; align-items: center; gap: 14px; padding: 0 16px; }
  .slaaknap { flex-grow: 1; height: 60px; }
  .status-row { display: flex; gap: 8px; padding: 10px 16px 0; }
  .stat { flex-grow: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line);
          border-radius: 2px; background: rgba(20,29,24,0.6); }
  .stat-t { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint); }
  .stat-v { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .glasbar { width: 20px; height: 34px; flex: 0 0 20px; border: 1.2px solid #9FB0A2; border-radius: 3px;
             background: #0E1512; position: relative; overflow: hidden; }
  .glas-fyld { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, #F2C060, #C4761A); }
  .din-drik { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 10px 16px 0;
              padding: 10px 12px; border: 1px solid var(--line); border-radius: 2px; background: rgba(20,29,24,0.6); }
  .ticks { display: flex; gap: 3px; margin-top: 6px; }
  .tick { width: 12px; height: 7px; border-radius: 1px; background: #2B382E; }
  .tick-fuld { background: linear-gradient(180deg, #F2C060, #C4761A); }
  .hold-rad { padding: 0 16px; }
  .hold { position: relative; height: 68px; border-radius: 3px; border: 1px solid #7E6413; overflow: hidden;
          background: #1D2118; user-select: none; touch-action: none; display: flex; align-items: center; justify-content: center; }
  .hold-fyld { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(180deg, #F2C060 0%, #C4761A 100%); }
  .hold-txt { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .hold-t { font-size: 11.5px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
  .hold-d { font-size: 11px; color: var(--ink-dim); }
  .hold-on .hold-t, .hold-on .hold-d { color: #14180C; }`;

export function mobilSpil() {
  return head('Mobil spil', SPIL_CSS) + `
<div class="app">
  <div class="bar">
    <div class="mark">K69</div>
    <div class="kode">4471</div>
    <div style="flex-grow: 1"></div>
    <div class="avatarer" style="flex-grow: 0">
      <sc-for list="{{avatarer}}" as="a" hint-placeholder-count="5">
        <div class="brik av {{a.klasse}}" style="background: {{a.farve}}">{{a.initial}}</div>
      </sc-for>
    </div>
    <div class="ikon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
    </div>
  </div>

  <div class="vp" onPointerDown="{{greb}}" onPointerMove="{{traek}}" onPointerUp="{{slip}}">
    <svg class="plade" viewBox="0 0 390 452" preserveAspectRatio="xMidYMid slice">
      ${B.boardDefs('p')}
      <rect x="0" y="0" width="390" height="452" fill="url(#p-felt)"></rect>
      <rect x="0" y="0" width="390" height="452" fill="#ffffff" filter="url(#p-grain)" opacity="0.5"></rect>
      <g transform="translate({{panX}}, {{panY}}) scale({{zoom}})">
        ${B.boardSvg('p', { bg: false })}
        ${B.towerSvg('p', 0.55)}
        <polygon points="{{aktivPoints}}" fill="none" stroke="#C9A227" stroke-width="4" filter="url(#p-glow)"></polygon>
        <sc-for list="{{brikker}}" as="bk" hint-placeholder-count="5">
          <g transform="translate({{bk.x}}, {{bk.y}})" style="transition: transform 480ms cubic-bezier(0.33, 1.08, 0.45, 1)">
            <circle cx="0" cy="3" r="18" fill="#0B100D" opacity="0.55"></circle>
            <circle cx="0" cy="0" r="17" fill="{{bk.farve}}" stroke="#0E1512" stroke-width="2"></circle>
            <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" fill="#14180C" style="font-family: var(--serif)">{{bk.initial}}</text>
          </g>
        </sc-for>
      </g>
    </svg>

    <div class="vpknap">
      <div class="chip {{fitKlasse}}" onClick="{{skift}}">{{fitTekst}}</div>
    </div>

    <div class="minimap">
      <svg viewBox="0 0 1200 650" style="display: block; width: 100%; height: 100%">
        <path d="${B.OUTER_PATH}" fill="#1D2A23" stroke="#3E4E42" stroke-width="4"></path>
        <path d="${B.INNER_PATH}" fill="#101815" stroke="#3E4E42" stroke-width="4"></path>
        <sc-for list="{{brikker}}" as="bk" hint-placeholder-count="5">
          <circle cx="{{bk.x}}" cy="{{bk.y}}" r="26" fill="{{bk.farve}}"></circle>
        </sc-for>
        <rect x="{{ramX}}" y="{{ramY}}" width="{{ramW}}" height="{{ramH}}" fill="none" stroke="#C9A227" stroke-width="6"></rect>
      </svg>
    </div>
  </div>

  <div class="sheet">
    <div class="greb"></div>

    <div class="sheet-sec">
      <div class="event-hd">
        <div style="width: 9px; height: 9px; border-radius: 50%; background: {{aktivFarve}}"></div>
        <div class="eyebrow" style="color: {{aktivFarve}}">{{turNavn}} slog {{terning}} · felt {{aktivNr}}</div>
      </div>
      <div class="event-t" style="color: {{aktivFarve}}">{{aktivTitel}}</div>
      <div class="event-d" style="margin-top: 7px">{{aktivTekst}}</div>
    </div>

    <sc-if value="{{ikkeTaarn}}" hint-placeholder-val="{{false}}">
      <div class="slaa-row">
        <svg width="60" height="60" viewBox="0 0 100 100">
          <rect x="4" y="4" width="88" height="88" rx="17" fill="#EFE6D4" stroke="#8E8878" stroke-width="1.5"></rect>
          <sc-for list="{{pips}}" as="pip" hint-placeholder-count="4">
            <circle cx="{{pip.cx}}" cy="{{pip.cy}}" r="8" fill="#1B241C"></circle>
          </sc-for>
        </svg>
        <button class="btn btn-primary slaaknap" onClick="{{slaa}}">Slå med terningen</button>
      </div>
    </sc-if>
    <sc-if value="{{erTaarn}}" hint-placeholder-val="{{true}}">
      <div class="hold-rad">
        <div class="hold {{holdKlasse}}" onPointerDown="{{start}}" onPointerUp="{{stop}}" onPointerLeave="{{stop}}" onPointerCancel="{{stop}}">
          <div class="hold-fyld" style="width: {{holdPct}}"></div>
          <div class="hold-txt">
            <div class="hold-t">{{holdTekst}}</div>
            <div class="hold-d">{{holdUnder}}</div>
          </div>
        </div>
      </div>
    </sc-if>

    <div class="status-row">
      <div class="stat">
        <div class="glasbar"><div class="glas-fyld" style="height: {{taarnH}}"></div></div>
        <div>
          <div class="stat-t">Tårnet</div>
          <div class="stat-v" style="color: var(--amber)">{{taarnSlurke}} slurke · {{minCl}}</div>
        </div>
      </div>
      <div class="stat" style="flex: 0 0 132px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.6" stroke-linejoin="round"><path d="M3 8l4 4 5-8 5 8 4-4v10H3z"></path></svg>
        <div>
          <div class="stat-t">Bier Meister</div>
          <div class="stat-v">{{bmNavn}}</div>
        </div>
      </div>
    </div>

    <div class="din-drik">
      <div>
        <div class="stat-t">Din {{minDrik}}</div>
        <div class="ticks">
          <sc-for list="{{minSlurke}}" as="t" hint-placeholder-count="11">
            <div class="tick {{t.klasse}}"></div>
          </sc-for>
        </div>
      </div>
      <div style="text-align: right">
        <div class="stat-v" style="font-family: var(--serif); font-size: 19px">{{minRest}}</div>
        <div class="stat-t">slurke igen</div>
      </div>
    </div>

    <div class="sheet-sec" style="padding-top: 8px; padding-bottom: 0">
      <div class="note">Næste: {{naesteNavn}} · turen går med uret</div>
    </div>
  </div>
</div>
` + foot(
  '{"$preview":{"width":390,"height":844}}',
  `const FELTER = ${JSON.stringify(FELTER)};
const PIT = ${JSON.stringify(PIT)};
const SPILLERE = ${JSON.stringify(SPILLERE)};
const TEKST = ${JSON.stringify(FELT_TEKST)};
const FARVER = { fri: '#8C9689', tre: '#93AE7C', skaal: '#D3B44E', bm: '#C9A227', gobm: '#D08A4E',
  taarn: '#E0A03C', kort: '#88A2C2', drik: '#C4635B', meier: '#B084A0', krone: '#DCC684' };
const PIPS = {
  1: [[50,50]], 2: [[30,30],[70,70]], 3: [[30,30],[50,50],[70,70]],
  4: [[30,30],[70,30],[30,70],[70,70]], 5: [[30,30],[70,30],[50,50],[30,70],[70,70]],
  6: [[30,28],[70,28],[30,50],[70,50],[30,72],[70,72]]
};
const N = 5;
const VW = 390, VH = 452;
const KAP = ${TAARN_KAPACITET};
const DRIK_NAVN = { ol: 'pilsner', vin: 'vin', whisky: 'whisky' };
${CL_KODE}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      pos: [2, 4, 8, 10, 16], pit: [0, 0, 0, 0, 0], tur: 0, terning: 3, aktiv: 9,
      bm: 3, taarn: 5, tilfoejet: 0, holder: false, mig: 0, foelg: true, pan: null, drag: null,
      slurke: 7, drik: 'ol'
    };
  }

  kamera() {
    if (this.state.pan) return this.state.pan;
    if (!this.state.foelg) return { x: 0, y: (VH - 650 * 0.325) / 2, z: 0.325 };
    const f = FELTER[this.state.pos[this.state.mig] - 1];
    const z = 0.8;
    return { x: VW / 2 - f.cx * z, y: VH / 2 - f.cy * z, z };
  }

  slaaTerning() {
    const v = 1 + Math.floor(Math.random() * 6);
    const pos = this.state.pos.slice();
    const i = this.state.tur % N;
    pos[i] = ((pos[i] - 1 + v) % FELTER.length) + 1;
    const felt = FELTER[pos[i] - 1];
    let taarn = this.state.taarn;
    let bm = this.state.bm;
    let slurke = this.state.slurke;
    if (felt.type === 'drik') { if (i === this.state.mig) slurke = Math.max(0, slurke - Math.round(taarn)); taarn = 0; }
    if (felt.type === 'bm') bm = i;
    // Én enhed er 11 slurke; er den tom, hentes en ny.
    if (felt.type === 'skaal') slurke = slurke > 1 ? slurke - 1 : 11;
    if (felt.type === 'gobm' && bm === this.state.mig) slurke = slurke > 3 ? slurke - 3 : 11 + slurke - 3;
    this.setState({ pos, terning: v, aktiv: pos[i], taarn, bm, slurke, tilfoejet: 0, tur: (this.state.tur + 1) % N });
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

  renderVals() {
    const st = this.state;
    const kam = this.kamera();
    const aktiv = FELTER[st.aktiv - 1];
    const t = TEKST[aktiv.type];
    const turIdx = st.tur % N;
    const tal = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ','));

    const paa = {};
    const brikker = SPILLERE.slice(0, N).map((s, i) => {
      const f = FELTER[st.pos[i] - 1];
      const k = paa['f' + st.pos[i]] || 0;
      paa['f' + st.pos[i]] = k + 1;
      return { x: f.cx + (k % 2) * 16 - (k > 0 ? 8 : 0), y: f.cy + Math.floor(k / 2) * 16, farve: s.farve, initial: s.navn.slice(0, 1) };
    });

    return {
      avatarer: SPILLERE.slice(0, N).map((s, i) => ({
        farve: s.farve, initial: s.navn.slice(0, 1), klasse: (i === 0 ? 'av-1 ' : '') + (i === turIdx ? 'av-tur' : '')
      })),
      brikker,
      panX: Math.round(kam.x), panY: Math.round(kam.y), zoom: Math.round(kam.z * 1000) / 1000,
      ramX: Math.round(-kam.x / kam.z), ramY: Math.round(-kam.y / kam.z),
      ramW: Math.round(VW / kam.z), ramH: Math.round(VH / kam.z),
      fitTekst: st.foelg ? 'Overblik' : 'Følg min brik',
      fitKlasse: st.foelg ? '' : 'chip-on',
      turNavn: SPILLERE[turIdx].navn,
      naesteNavn: SPILLERE[(turIdx + 1) % N].navn,
      bmNavn: SPILLERE[st.bm].navn,
      terning: st.terning,
      pips: (PIPS[st.terning] || PIPS[1]).map((p) => ({ cx: p[0], cy: p[1] })),
      aktivNr: aktiv.nr, aktivPoints: aktiv.points, aktivFarve: FARVER[aktiv.type],
      aktivTitel: t[0], aktivTekst: t[1],
      taarnH: Math.round(Math.min(1, st.taarn / (KAP + 3)) * 100) + '%',
      taarnSlurke: tal(Math.round(st.taarn * 10) / 10),
      minCl: iCl(st.taarn, st.drik),
      minDrik: DRIK_NAVN[st.drik],
      minRest: st.slurke,
      minSlurke: Array.from({ length: 11 }, (_, k) => ({ klasse: k < st.slurke ? 'tick-fuld' : '' })),
      erTaarn: aktiv.type === 'taarn',
      ikkeTaarn: aktiv.type !== 'taarn',
      holdKlasse: st.holder ? 'hold-on' : '',
      holdPct: Math.round(Math.min(1, st.taarn / (KAP + 3)) * 100) + '%',
      holdTekst: st.holder ? 'Hælder…' : (st.taarn > KAP ? 'Nu løber det over' : 'Hold for at hælde i tårnet'),
      holdUnder: st.tilfoejet > 0
        ? '+' + tal(Math.round(st.tilfoejet * 10) / 10) + ' slurke · ' + iCl(st.tilfoejet, st.drik)
        : 'Slip når du synes det er nok',
      start: () => this.haeld(),
      stop: () => this.stopHaeld(),
      slaa: () => this.slaaTerning(),
      skift: () => this.setState({ foelg: !st.foelg, pan: null }),
      greb: (e) => { const k = this.kamera(); this.setState({ drag: { x: e.clientX, y: e.clientY, px: k.x, py: k.y, z: k.z } }); },
      traek: (e) => {
        const d = this.state.drag;
        if (!d) return;
        this.setState({ pan: { x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y), z: d.z } });
      },
      slip: () => this.setState({ drag: null })
    };
  }
}`
);
}

/* ------------------------------------------------------------- MobilStart */

const MSTART_CSS = SKAL + `
  .hero { position: relative; height: 232px; flex: 0 0 232px; overflow: hidden; }
  .hero-art { position: absolute; left: -300px; top: 30px; width: 1000px; height: 542px; opacity: 0.5; transform: rotate(-10deg); }
  .hero-fade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,19,16,0.55) 0%, rgba(13,19,16,0.6) 45%, #0D1310 96%); }
  .hero-txt { position: absolute; left: 20px; right: 20px; bottom: 18px; display: flex; flex-direction: column; gap: 12px; }
  .wordmark { font-family: var(--serif); font-size: 62px; line-height: 0.84; font-weight: 700;
              background: linear-gradient(175deg, #F5E4B0 0%, #C9A227 52%, #8A6C14 100%);
              -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lead { font-family: var(--serif); font-size: 19px; line-height: 1.32; color: var(--ink); }
  .form { flex-grow: 1; min-height: 0; padding: 18px 20px 18px; display: flex; flex-direction: column; gap: 16px; }
  .invit { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 2px;
           border: 1px solid rgba(201,162,39,0.35); background: rgba(201,162,39,0.08); }
  .invit-t { font-size: 12.5px; line-height: 1.5; color: var(--ink-dim); }
  .invit-t b { color: var(--brass-lt); }
  .lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-faint); }
  .input { height: 54px; padding: 0 16px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 2px;
           color: var(--ink); font-size: 16px; display: flex; align-items: center; gap: 12px; }
  .caret { width: 1.5px; height: 22px; background: var(--brass); }
  .swatches { display: flex; gap: 10px; }
  .sw { width: 44px; height: 44px; border-radius: 50%; border: 2px solid transparent; }
  .sw-on { border-color: var(--brass-lt); box-shadow: 0 0 0 2px rgba(201,162,39,0.25); }
  .ved { display: flex; flex-direction: column; gap: 8px; }
  .vrow { display: flex; align-items: center; gap: 11px; }
  .drikke { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .drik { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 13px 6px 12px;
          border: 1px solid var(--line-2); border-radius: 2px; background: var(--panel); color: var(--ink-faint); }
  .drik-on { border-color: var(--brass); background: rgba(201,162,39,0.1); color: var(--brass-lt); }
  .drik-n { font-size: 13px; font-weight: 600; color: var(--ink); }
  .drik-d { font-size: 10px; letter-spacing: 0.06em; color: var(--ink-faint); }`;

export function mobilStart() {
  return head('Mobil start', MSTART_CSS) + `
<div class="app">
  <div class="hero">
    <svg class="hero-art" viewBox="0 0 1200 650">
      ${B.boardDefs('ms')}
      ${B.boardSvg('ms', { bg: false })}
      ${B.towerSvg('ms', 0.4)}
    </svg>
    <div class="hero-fade"></div>
    <div class="hero-txt">
      <div class="wordmark">K69</div>
      <div class="lead">Brættet fra Tinglev.<br>38 felter og ét tårn.</div>
    </div>
  </div>

  <div class="form">
    <div class="invit">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v12H3z"></path><path d="M3 7l9 6 9-6"></path></svg>
      <div class="invit-t">Jeppe og Mette venter i <b>TINGLEV-4471</b>. Skriv et navn, så er du med — ingen konto og ingen kode.</div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 9px">
      <div class="lbl">Dit navn</div>
      <div class="input"><span>Sofie</span><div class="caret"></div></div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 11px">
      <div class="lbl">Din brik</div>
      <div class="swatches">
        <div class="sw" style="background: #D8A93F; opacity: 0.28"></div>
        <div class="sw" style="background: #8FAF74; opacity: 0.28"></div>
        <div class="sw sw-on" style="background: #87A4C6"></div>
        <div class="sw" style="background: #C4776B"></div>
        <div class="sw" style="background: #B189A6"></div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 11px">
      <div class="lbl">Hvad drikker du?</div>
      <div class="drikke">
        <div class="drik drik-on">
          ${GLAS.ol}
          <div class="drik-n">Pilsner</div>
          <div class="drik-d">4,6% · 0,5 l</div>
        </div>
        <div class="drik">
          ${GLAS.vin}
          <div class="drik-n">Vin</div>
          <div class="drik-d">12% · 1 glas</div>
        </div>
        <div class="drik">
          ${GLAS.whisky}
          <div class="drik-n">Whisky</div>
          <div class="drik-d">40% · 4 cl</div>
        </div>
      </div>
      <div class="note">Uanset hvad du vælger er der 11 slurke i én enhed. Appen tæller dem for dig.</div>
    </div>

    <div style="flex-grow: 1"></div>
    <button class="btn btn-primary" style="height: 56px">Kom med i spillet</button>
  </div>
</div>
` + foot('{"$preview":{"width":390,"height":844}}', 'class Component extends DCLogic {}');
}

/* -------------------------------------------------------------- MobilKort */

const MKORT_CSS = SKAL + `
  .baggrund { position: absolute; inset: 0; overflow: hidden; }
  .baggrund svg { width: 100%; height: 100%; display: block; opacity: 0.32; filter: blur(1.5px); }
  .skygge { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,19,16,0.5), rgba(13,19,16,0.94)); }
  .wrap { position: relative; flex-grow: 1; }
  .ark { position: absolute; left: 0; right: 0; bottom: 0; border-top-left-radius: 14px; border-top-right-radius: 14px;
         background: linear-gradient(180deg, #1A251E 0%, #0F1713 100%); border: 1px solid var(--line-2); border-bottom: none;
         padding: 0 18px 16px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 -24px 60px rgba(0,0,0,0.7); }
  .greb { width: 40px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 9px auto 2px; }
  .kortrad { display: flex; gap: 16px; align-items: center; }
  .kortside { width: 108px; height: 154px; flex: 0 0 108px; border-radius: 8px; padding: 9px;
              background: linear-gradient(168deg, #F6F1E4 0%, #E4DCC8 100%); border: 1px solid #B9AE93;
              box-shadow: 0 14px 26px rgba(0,0,0,0.55); display: flex; flex-direction: column; }
  .rang { font-family: var(--serif); font-size: 23px; font-weight: 700; line-height: 0.95; }
  .kulor { font-size: 15px; }
  .midt { flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 50px; }
  .k-t { font-family: var(--serif); font-size: 26px; line-height: 1.12; color: var(--brass-lt); }
  .k-d { font-size: 12.5px; line-height: 1.6; color: var(--ink-dim); margin-top: 8px; }
  .knapper { display: flex; flex-direction: column; gap: 9px; }`;

export function mobilKort() {
  return head('Mobil kort', MKORT_CSS) + `
<div class="app">
  <div class="bar">
    <div class="mark">K69</div>
    <div class="kode">4471</div>
    <div style="flex-grow: 1"></div>
    <div class="kode" style="color: var(--slate)">FELT 19 · TRÆK ET KORT</div>
  </div>

  <div class="wrap">
    <div class="baggrund">
      <svg viewBox="0 0 1200 650">
        ${B.boardDefs('mk')}
        ${B.boardSvg('mk', { bg: false })}
        ${B.towerSvg('mk', 0.5)}
      </svg>
      <div class="skygge"></div>
    </div>

    <div class="ark">
      <div class="greb"></div>
      <div>
        <div class="eyebrow">Du trak</div>
      </div>
      <div class="kortrad">
        <div class="kortside">
          <div style="color: #9E3B33">
            <div class="rang">10</div>
            <div class="kulor">♦</div>
          </div>
          <div class="midt" style="color: #9E3B33">♦</div>
        </div>
        <div style="min-width: 0">
          <div class="k-t">Maraton</div>
          <div class="k-d">Alle tager øllen til munden og drikker samtidig. Du må stoppe først — så din venstremand, og så videre rundt.</div>
        </div>
      </div>

      <div class="note" style="border-left: 2px solid var(--line-2); padding-left: 12px">
        Sidder du til højre for den der trak, må du ikke stoppe før alle andre er stoppet. Er øllen tom, rækker du hånden i vejret.
      </div>

      <div class="knapper">
        <button class="btn btn-primary" style="height: 54px">Start maraton</button>
        <button class="btn btn-ghost" style="height: 50px">Vi klarer den selv</button>
      </div>
    </div>
  </div>
</div>
` + foot('{"$preview":{"width":390,"height":844}}', 'class Component extends DCLogic {}');
}
