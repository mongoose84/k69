import { head, foot, SPILLERE, TAARN_KAPACITET, CL_KODE } from './shared.mjs';

const CSS = `
  .app { width: 760px; height: 860px; display: flex; flex-direction: column;
         background: radial-gradient(110% 80% at 50% 0%, #2A2116 0%, #0D1310 68%); padding: 34px 40px 34px; gap: 22px; }
  .hd { display: flex; align-items: baseline; justify-content: space-between; }
  .h { font-family: var(--serif); font-size: 34px; }
  .scene { flex-grow: 1; display: flex; gap: 30px; min-height: 0; }
  .glaskol { width: 200px; flex: 0 0 200px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .maal { font-family: var(--serif); font-size: 44px; line-height: 1; color: var(--amber); }
  .maal-u { font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-faint); margin-top: 6px; }
  .hoejre { flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .hold { position: relative; height: 96px; border-radius: 3px; border: 1px solid #7E6413; overflow: hidden;
          background: #1D2118; cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: center; }
  .hold-fyld { position: absolute; left: 0; top: 0; bottom: 0;
               background: linear-gradient(180deg, #F2C060 0%, #C4761A 100%); }
  .hold-txt { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .hold-t { font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
  .hold-d { font-size: 11.5px; color: var(--ink-dim); }
  .hold-on .hold-t, .hold-on .hold-d { color: #14180C; }
  .kvit { display: flex; gap: 10px; }
  .tabel { flex-grow: 1; display: flex; flex-direction: column; min-height: 0; }
  .t-r { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .brik { width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-family: var(--serif); font-size: 14px; font-weight: 700; color: #14180C; }
  .t-n { font-size: 13.5px; font-weight: 600; }
  .t-d { font-size: 10.5px; letter-spacing: 0.05em; color: var(--ink-faint); margin-top: 2px; }
  .t-cl { font-family: var(--serif); font-size: 19px; color: var(--amber); flex: 0 0 74px; text-align: right; }
  .advarsel { display: flex; gap: 11px; align-items: flex-start; padding: 13px 14px; border-radius: 2px;
              border: 1px solid rgba(180,72,63,0.4); background: rgba(180,72,63,0.1);
              font-size: 12px; line-height: 1.55; color: #D0938B; }
  .note { font-size: 11.5px; line-height: 1.6; color: var(--ink-faint); }`;

export function taarn() {
  return head('Tårnet', CSS) + `
<div class="app">
  <div class="hd">
    <div>
      <div class="eyebrow" style="margin-bottom: 8px">Felt 9 · Øl i tårnet</div>
      <div class="h">Hæld så meget du tør</div>
    </div>
    <div class="eyebrow" style="color: var(--amber)">Din tur, Jeppe</div>
  </div>

  <div class="scene">
    <div class="glaskol">
      <svg width="172" height="336" viewBox="0 0 172 336">
        <defs>
          <linearGradient id="tw-beer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F2C060"></stop><stop offset="100%" stop-color="#B96A15"></stop></linearGradient>
          <linearGradient id="tw-glas" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.17"></stop>
            <stop offset="24%" stop-color="#ffffff" stop-opacity="0.03"></stop>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.11"></stop>
          </linearGradient>
        </defs>
        <rect x="28" y="10" width="112" height="316" rx="10" fill="#0E1512"></rect>
        <rect x="32" y="{{fyldY}}" width="104" height="{{fyldH}}" rx="7" fill="url(#tw-beer)"></rect>
        <rect x="32" y="{{skumY}}" width="104" height="13" rx="6" fill="#F7EEDA" opacity="{{skumOp}}"></rect>
        <rect x="28" y="10" width="112" height="316" rx="10" fill="url(#tw-glas)" stroke="#B9C8BB" stroke-width="2"></rect>
        <line x1="20" y1="{{overY}}" x2="148" y2="{{overY}}" stroke="#B4483F" stroke-width="1.5" stroke-dasharray="5 4"></line>
        <text x="168" y="{{overY}}" text-anchor="end" dominant-baseline="central" fill="#B4483F" font-size="8.5" letter-spacing="1.2" style="font-family: var(--sans)">LØBER OVER</text>
      </svg>
      <div style="text-align: center">
        <div class="maal">{{slurke}}</div>
        <div class="maal-u">slurke</div>
      </div>
    </div>

    <div class="hoejre">
      <div class="eyebrow">Hold knappen nede — den fylder til du slipper</div>
      <div class="hold {{holdKlasse}}" onPointerDown="{{start}}" onPointerUp="{{stop}}" onPointerLeave="{{stop}}" onPointerCancel="{{stop}}">
        <div class="hold-fyld" style="width: {{holdPct}}"></div>
        <div class="hold-txt">
          <div class="hold-t">{{holdTekst}}</div>
          <div class="hold-d">{{holdUnder}}</div>
        </div>
      </div>

      <div class="kvit">
        <button class="btn" style="flex-grow: 1" onClick="{{nulstil}}">Fortryd</button>
        <button class="btn btn-primary" style="flex-grow: 1">Færdig</button>
      </div>

      <div class="tabel">
        <div class="eyebrow" style="margin-bottom: 4px">Hvad tårnet koster ved bordet</div>
        <sc-for list="{{bordet}}" as="b" hint-placeholder-count="5">
          <div class="t-r">
            <div class="brik" style="background: {{b.farve}}">{{b.initial}}</div>
            <div style="flex-grow: 1; min-width: 0">
              <div class="t-n">{{b.navn}}</div>
              <div class="t-d">{{b.drik}}</div>
            </div>
            <div class="t-cl">{{b.cl}}</div>
          </div>
        </sc-for>
      </div>
    </div>
  </div>

  <div class="advarsel">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 17px; margin-top: 1px"><path d="M12 3l9.5 17H2.5z"></path><path d="M12 9v5"></path><path d="M12 17.4v.2"></path></svg>
    <div>Løber tårnet over, bunder du det selv. Er mere end halvdelen skum, gør du det også — K69 er et gentleman-spil.</div>
  </div>

  <div class="note">Tårnet måles i slurke, så det rammer lige hårdt uanset hvad man drikker. Alle ved bordet ser tallet omregnet til deres egen drik.</div>
</div>
` + foot('{"$preview":{"width":760,"height":860}}', logik());
}

function logik() {
  const bord = SPILLERE.slice(0, 5).map((s, i) => ({
    navn: s.navn, farve: s.farve, drik: ['ol', 'vin', 'ol', 'whisky', 'ol'][i]
  }));
  return `const KAP = ${TAARN_KAPACITET};
${CL_KODE}
const BORD = ${JSON.stringify(bord)};
const DRIK_NAVN = { ol: 'Pilsner · 4,6%', vin: 'Vin · 12%', whisky: 'Whisky · 40%' };
const TOP = 10, HOEJDE = 316, LOFT = KAP + 3;

class Component extends DCLogic {
  constructor(props) { super(props); this.state = { slurke: 4, tilfoejet: 0, holder: false }; this.t = null; }
  componentWillUnmount() { if (this.t) clearInterval(this.t); }

  haeld() {
    if (this.t) return;
    this.setState({ holder: true });
    this.t = setInterval(() => {
      const nu = this.state.slurke;
      const ny = Math.min(LOFT, nu + 0.25);
      this.setState({ slurke: ny, tilfoejet: this.state.tilfoejet + (ny - nu) });
    }, 95);
  }

  stopHaeld() {
    if (this.t) { clearInterval(this.t); this.t = null; }
    if (this.state.holder) this.setState({ holder: false });
  }

  renderVals() {
    const st = this.state;
    const vist = Math.round(st.slurke * 10) / 10;
    const andel = Math.min(1, st.slurke / LOFT);
    const h = HOEJDE * andel;
    const over = st.slurke > KAP;
    const tal = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ','));
    return {
      slurke: tal(vist),
      fyldY: Math.round(TOP + HOEJDE - h) + 4,
      fyldH: Math.max(0, Math.round(h) - 4),
      skumY: Math.round(TOP + HOEJDE - h),
      skumOp: st.slurke > 0.2 ? 1 : 0,
      overY: Math.round(TOP + HOEJDE - HOEJDE * (KAP / LOFT)),
      holdKlasse: st.holder ? 'hold-on' : '',
      holdPct: Math.round(andel * 100) + '%',
      holdTekst: st.holder ? 'Hælder…' : (over ? 'Nu løber det over' : 'Hold for at hælde'),
      holdUnder: st.tilfoejet > 0
        ? '+' + tal(Math.round(st.tilfoejet * 10) / 10) + ' slurke denne tur'
        : 'Slip når du synes det er nok',
      bordet: BORD.map((b) => ({
        navn: b.navn, farve: b.farve, initial: b.navn.slice(0, 1),
        drik: DRIK_NAVN[b.drik], cl: iCl(st.slurke, b.drik)
      })),
      start: () => this.haeld(),
      stop: () => this.stopHaeld(),
      nulstil: () => {
        this.stopHaeld();
        this.setState({ slurke: Math.max(0, this.state.slurke - this.state.tilfoejet), tilfoejet: 0 });
      }
    };
  }
}`;
}
