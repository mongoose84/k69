// Samme tjek som design/tjek.mjs, men for Meier-artboardsene: kører hver
// logik-blok i en sandkasse og sammenholder værdierne fra renderVals() med de
// {{huller}} skabelonen faktisk beder om.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILER = ['Main', 'Bordet', 'Skrivebord', 'Turskift'];
const STUB = `class DCLogic {
  constructor(p) { this.props = p || {}; this.state = {}; }
  setState(s) { Object.assign(this.state, typeof s === 'function' ? s(this.state) : s); }
  forceUpdate() {}
}
`;

let fejl = 0;

for (const f of FILER) {
  const s = readFileSync(new URL(f + '.dc.html', import.meta.url), 'utf8');
  const m = s.match(/<script data-dc-script data-props='([\s\S]*?)'>\n([\s\S]*?)\n<\/script>/);
  if (!m) { console.log('FEJL ' + f + ': ingen logik-blok'); fejl++; continue; }

  try { JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'")); }
  catch (e) { console.log('FEJL ' + f + ': data-props er ikke gyldig JSON — ' + e.message); fejl++; }

  const ctx = vm.createContext({ setInterval, clearInterval, setTimeout, Math, JSON, Array, Object, String, Number, console });
  let vals;
  try {
    new vm.Script(STUB + m[2] + '\nglobalThis.__K = Component;').runInContext(ctx);
    const inst = new ctx.__K({});
    vals = typeof inst.renderVals === 'function' ? inst.renderVals() : {};
  } catch (e) {
    console.log('FEJL ' + f + ': logikken fejler — ' + e.message);
    fejl++;
    continue;
  }

  const skabelon = s.slice(s.indexOf('<x-dc>'), s.indexOf('</x-dc>'));
  const huller = new Set();
  for (const h of skabelon.matchAll(/\{\{\s*([a-zA-Z_$][\w$]*)/g)) huller.add(h[1]);
  for (const v of skabelon.matchAll(/\bas="([\w$]+)"/g)) huller.delete(v[1]);
  huller.delete('true'); huller.delete('false');

  const mangler = [...huller].filter((h) => !(h in vals));
  const ubrugt = Object.keys(vals).filter((k) => !huller.has(k));

  console.log(
    f.padEnd(12)
    + (mangler.length ? 'MANGLER: ' + mangler.join(', ') : 'ok — ' + huller.size + ' huller')
    + (ubrugt.length ? '   (ubrugt: ' + ubrugt.join(', ') + ')' : '')
  );
  if (mangler.length) fejl++;
}

console.log(fejl ? '\n' + fejl + ' problem(er)' : '\nAlt ok');
process.exit(fejl ? 1 : 0);
