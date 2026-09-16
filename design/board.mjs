// K69 spilleplade — geometri + SVG-generator.
// Feltrækkefølgen er aflæst direkte fra fotoet af det originale bræt.
// Felt 1 er det første felt efter pitten ("3 til..?").

export const FIELD_ORDER = [
  'tre', 'fri', 'gobm', 'fri', 'drik', 'tre', 'kort', 'fri', 'taarn', 'fri',
  'bm', 'skaal', 'tre', 'krone', 'taarn', 'fri', 'meier', 'fri', 'kort', 'skaal',
  'gobm', 'fri', 'tre', 'drik', 'taarn', 'meier', 'fri', 'kort', 'fri', 'gobm',
  'skaal', 'taarn', 'krone', 'fri', 'meier', 'fri', 'taarn', 'kort'
];

export const TYPES = {
  fri:   { navn: 'Frifelt',          linjer: [],                         farve: '#8C9689', fill: '#1B2820', vaegt: 400, str: 10.5 },
  tre:   { navn: '3 til..?',         linjer: ['3 til..?'],               farve: '#93AE7C', fill: '#1D2A21', vaegt: 600, str: 12 },
  skaal: { navn: 'SKÅL!',            linjer: ['SKÅL!'],                  farve: '#D3B44E', fill: '#252C1D', vaegt: 700, str: 12.5 },
  bm:    { navn: 'Bier Meister',     linjer: ['Bier', 'Meister'],        farve: '#1A1509', fill: '#C9A227', vaegt: 700, str: 11 },
  gobm:  { navn: 'Go! Bier Meister', linjer: ['Go!', 'Bier', 'Meister'], farve: '#D08A4E', fill: '#26221B', vaegt: 600, str: 10 },
  taarn: { navn: 'Øl i tårnet',      linjer: ['Øl i', 'tårnet'],         farve: '#E0A03C', fill: '#27231A', vaegt: 600, str: 11 },
  kort:  { navn: 'Træk et kort',     linjer: ['Træk et', 'kort'],        farve: '#88A2C2', fill: '#1B222B', vaegt: 600, str: 11 },
  drik:  { navn: 'DRIK!',            linjer: ['DRIK!'],                  farve: '#F6E7E1', fill: '#8E2F2C', vaegt: 700, str: 14 },
  meier: { navn: 'Meier',            linjer: ['Meier'],                  farve: '#B084A0', fill: '#241D24', vaegt: 600, str: 12 },
  krone: { navn: '2-krone',          linjer: ['2-krone'],                farve: '#DCC684', fill: '#25241A', vaegt: 600, str: 11 }
};

export const GEO = { W: 1200, H: 650, CX: 600, CY: 320, R: 200, LX: 260, RX: 940, HW: 42 };

const { W, H, CX, CY, R, LX, RX, HW } = GEO;

function cubic(p0, c1, c2, p3) {
  return (t) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]];
  };
}
function arc(cx, cy, r, a0, a1) {
  return (t) => {
    const a = (a0 + (a1 - a0) * t) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
}

const SEGMENTS = [
  cubic([LX, 520], [LX + 80, 520], [LX + 130, 425], [CX, 425]),
  cubic([CX, 425], [RX - 130, 425], [RX - 80, 520], [RX, 520]),
  arc(RX, CY, R, 90, -90),
  cubic([RX, 120], [RX - 80, 120], [RX - 130, 215], [CX, 215]),
  cubic([CX, 215], [LX + 130, 215], [LX + 80, 120], [LX, 120]),
  arc(LX, CY, R, -90, -270)
];

const SAMPLES = [];
for (const seg of SEGMENTS) {
  const n = 260;
  for (let i = 0; i < n; i++) SAMPLES.push(seg(i / n));
}
SAMPLES.push(SAMPLES[0]);

const CUM = [0];
for (let i = 1; i < SAMPLES.length; i++) {
  const dx = SAMPLES[i][0] - SAMPLES[i - 1][0], dy = SAMPLES[i][1] - SAMPLES[i - 1][1];
  CUM.push(CUM[i - 1] + Math.hypot(dx, dy));
}
export const TOTAL = CUM[CUM.length - 1];

function point(d) {
  let x = ((d % TOTAL) + TOTAL) % TOTAL;
  let lo = 0, hi = CUM.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (CUM[mid] <= x) lo = mid; else hi = mid; }
  const span = CUM[hi] - CUM[lo] || 1;
  const f = (x - CUM[lo]) / span;
  return [SAMPLES[lo][0] + (SAMPLES[hi][0] - SAMPLES[lo][0]) * f, SAMPLES[lo][1] + (SAMPLES[hi][1] - SAMPLES[lo][1]) * f];
}

export function at(s) {
  const p = point(s);
  const a = point(s - 1.5), b = point(s + 1.5);
  const tx = b[0] - a[0], ty = b[1] - a[1];
  const len = Math.hypot(tx, ty) || 1;
  return { p, t: [tx / len, ty / len], n: [ty / len, -tx / len] };
}

const r2 = (v) => Math.round(v * 10) / 10;

export const N = FIELD_ORDER.length;
const STEP = TOTAL / N;

export const FIELDS = FIELD_ORDER.map((type, i) => {
  const s0 = i * STEP, s1 = (i + 1) * STEP;
  const outer = [], inner = [];
  const K = 7;
  for (let k = 0; k <= K; k++) {
    const q = at(s0 + (s1 - s0) * (k / K));
    const toward = [CX - q.p[0], CY - q.p[1]];
    const sign = (q.n[0] * toward[0] + q.n[1] * toward[1]) > 0 ? -1 : 1;
    outer.push([q.p[0] + q.n[0] * HW * sign, q.p[1] + q.n[1] * HW * sign]);
    inner.push([q.p[0] - q.n[0] * HW * sign, q.p[1] - q.n[1] * HW * sign]);
  }
  const mid = at(s0 + STEP / 2);
  let ang = Math.atan2(mid.t[1], mid.t[0]) * 180 / Math.PI;
  if (ang > 90 || ang < -90) ang += 180;
  const pts = outer.concat(inner.slice().reverse());
  return {
    nr: i + 1,
    type,
    cx: r2(mid.p[0]),
    cy: r2(mid.p[1]),
    ang: r2(ang),
    points: pts.map((p) => r2(p[0]) + ',' + r2(p[1])).join(' '),
    outer,
    inner
  };
});

export const PIT = (() => {
  const x0 = 420, x1 = 780, y0 = 512, y1 = 584;
  const w = (x1 - x0) / 6;
  return Array.from({ length: 6 }, (_, i) => ({
    plads: i + 1,
    x: r2(x0 + i * w), y: y0, w: r2(w), h: y1 - y0,
    cx: r2(x0 + i * w + w / 2), cy: r2((y0 + y1) / 2)
  }));
})();

export const TOWER = { cx: CX, cy: CY, r: 58 };

function pathFrom(list) {
  return 'M ' + list.map((p, i) => (i ? 'L ' : '') + r2(p[0]) + ' ' + r2(p[1])).join(' ') + ' Z';
}
export const OUTER_PATH = pathFrom(FIELDS.flatMap((f) => f.outer));
export const INNER_PATH = pathFrom(FIELDS.flatMap((f) => f.inner));

const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Bodoni Moda', Georgia, 'Times New Roman', serif";

export function boardDefs(p) {
  return [
    '<defs>',
    `<radialGradient id="${p}-felt" cx="50%" cy="42%" r="72%"><stop offset="0%" stop-color="#25352B"/><stop offset="60%" stop-color="#1A2620"/><stop offset="100%" stop-color="#111A15"/></radialGradient>`,
    `<linearGradient id="${p}-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E8CE7E"/><stop offset="45%" stop-color="#C9A227"/><stop offset="100%" stop-color="#8C6F16"/></linearGradient>`,
    `<linearGradient id="${p}-beer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F2C060"/><stop offset="100%" stop-color="#C4761A"/></linearGradient>`,
    `<filter id="${p}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer></filter>`,
    `<filter id="${p}-glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="7" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    '</defs>'
  ].join('\n');
}

export function boardSvg(p, opts = {}) {
  const out = [];
  if (opts.bg !== false) {
    out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#${p}-felt)"/>`);
    out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" filter="url(#${p}-grain)" opacity="0.55"/>`);
  }
  out.push(`<path d="${OUTER_PATH}" fill="#0C120E" opacity="0.6" transform="translate(0, 8)"/>`);
  out.push(`<path d="${OUTER_PATH}" fill="#16211B" stroke="#3E4E42" stroke-width="1.5"/>`);
  out.push(`<path d="${INNER_PATH}" fill="url(#${p}-felt)" stroke="#3E4E42" stroke-width="1.5"/>`);

  out.push('<g class="k69-felter">');
  for (const f of FIELDS) {
    const T = TYPES[f.type];
    out.push(`<g class="k69-felt" data-nr="${f.nr}" data-type="${f.type}">`);
    out.push(`<polygon points="${f.points}" fill="${T.fill}" stroke="#4C5C50" stroke-width="1"/>`);
    if (f.type === 'fri') {
      out.push(`<circle cx="${f.cx}" cy="${f.cy}" r="3.2" fill="#5E6E5F"/>`);
    } else {
      const lines = T.linjer;
      const dy0 = -((lines.length - 1) * T.str * 1.14) / 2;
      const tspans = lines.map((l, i) => `<tspan x="0" dy="${i === 0 ? r2(dy0) : r2(T.str * 1.14)}">${l}</tspan>`).join('');
      out.push(`<text transform="translate(${f.cx}, ${f.cy}) rotate(${f.ang})" text-anchor="middle" dominant-baseline="central" fill="${T.farve}" font-size="${T.str}" font-weight="${T.vaegt}" letter-spacing="0.4" style="font-family: ${SANS}">${tspans}</text>`);
    }
    out.push('</g>');
  }
  out.push('</g>');

  // Pitten. Man ryger ind på den plads man slår, arbejder sig ned mod 1,
  // og forlader pitten ud på felt 1 — derfor peger hele rækken mod venstre.
  const p0 = PIT[0], p5 = PIT[5];
  const f1 = FIELDS[0];
  const ud = f1.inner[4];                 // midt på felt 1's inderkant
  const udX = r2(ud[0]), udY = r2(ud[1]);
  out.push('<g class="k69-pit">');

  // Vejen ud tegnes under pladserne, så pilen ikke skærer tallene.
  out.push('<g class="k69-pitud">');
  out.push(`<path d="M ${r2(p0.x - 8)} ${r2(p0.cy)} C ${r2(p0.x - 70)} ${r2(p0.cy + 6)} ${r2(udX + 34)} ${r2(udY + 44)} ${r2(udX + 5)} ${r2(udY + 15)}" fill="none" stroke="#C9A227" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.9"/>`);
  out.push(`<path d="M ${r2(udX - 6)} ${r2(udY + 20)} L ${r2(udX + 5)} ${r2(udY + 15)} L ${r2(udX + 2)} ${r2(udY + 27)}" fill="#C9A227" stroke="#C9A227" stroke-width="2" stroke-linejoin="round"/>`);
  out.push('</g>');

  out.push(`<text x="${p0.x}" y="${p0.y - 14}" fill="#8A9A8B" font-size="11.5" letter-spacing="3.6" style="font-family: ${SANS}">PITTEN</text>`);
  out.push(`<text x="${r2(p5.x + p5.w)}" y="${p0.y - 14}" text-anchor="end" fill="#6B796D" font-size="9.5" letter-spacing="1.6" style="font-family: ${SANS}">DU RYGER IND PÅ DEN PLADS DU SLÅR</text>`);

  for (const c of PIT) {
    const sidste = c.plads === 1;
    out.push(`<g class="k69-pitplads" data-plads="${c.plads}">`);
    out.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${sidste ? '#26301F' : '#1D2A23'}" stroke="${sidste ? '#8A722C' : '#4C5C50'}" stroke-width="${sidste ? 1.6 : 1}"/>`);
    out.push(`<text x="${c.cx}" y="${c.cy - 9}" text-anchor="middle" dominant-baseline="central" fill="#D3B44E" font-size="22" style="font-family: ${SERIF}">${c.plads}</text>`);
    out.push(`<text x="${c.cx}" y="${c.cy + 16}" text-anchor="middle" dominant-baseline="central" fill="#8A9A8B" font-size="8.5" letter-spacing="1.1" style="font-family: ${SANS}">${c.plads} SHOTS</text>`);
    if (c.plads > 1) {
      out.push(`<path d="M ${r2(c.x - 4)} ${r2(c.cy - 5)} L ${r2(c.x - 10)} ${c.cy} L ${r2(c.x - 4)} ${r2(c.cy + 5)}" fill="none" stroke="#5C6C5F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    out.push('</g>');
  }

  out.push(`<text x="${p0.x}" y="${p0.y + p0.h + 20}" fill="#C9A227" font-size="9.5" letter-spacing="1.5" style="font-family: ${SANS}">UD PÅ FELT 1</text>`);
  out.push(`<text x="${r2(p5.x + p5.w)}" y="${p0.y + p0.h + 20}" text-anchor="end" fill="#6B796D" font-size="9.5" letter-spacing="1.5" style="font-family: ${SANS}">SLÅ DIG NED MOD 1 — SLÅR DU OVER, ER DU UDE</text>`);
  out.push('</g>');
  return out.join('\n');
}

export function towerSvg(p, niveau) {
  const { cx, cy, r } = TOWER;
  const gW = 42, gH = 62, gx = cx - gW / 2, gTop = cy - 33;
  const fillH = r2(gH * niveau);
  const fy = r2(gTop + gH - fillH);
  const skum = niveau > 0.02;
  return [
    '<g class="k69-taarn">',
    `<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="#0D1410" opacity="0.8"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#18231D" stroke="url(#${p}-brass)" stroke-width="2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r - 7}" fill="none" stroke="#C9A227" stroke-width="0.6" opacity="0.4"/>`,
    `<rect x="${gx}" y="${gTop}" width="${gW}" height="${gH}" rx="4" fill="#0E1512"/>`,
    `<rect x="${gx + 2}" y="${fy}" width="${gW - 4}" height="${fillH}" rx="3" fill="url(#${p}-beer)"/>`,
    skum ? `<rect x="${gx + 2}" y="${r2(fy - 6)}" width="${gW - 4}" height="7" rx="3" fill="#F6EBD4"/>` : '',
    `<rect x="${gx}" y="${gTop}" width="${gW}" height="${gH}" rx="4" fill="none" stroke="#C4D3C6" stroke-width="1.4"/>`,
    `<text x="${cx}" y="${cy + 45}" text-anchor="middle" fill="#D3B44E" font-size="10.5" letter-spacing="3.4" style="font-family: ${SANS}">TÅRNET</text>`,
    '</g>'
  ].filter(Boolean).join('\n');
}
