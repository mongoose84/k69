import assert from 'node:assert/strict';
import test from 'node:test';

import { tolkHandling } from '../src/handling.js';
import { RegelFejl } from '../src/types.js';

test('gyldige handlinger kommer igennem som de er', () => {
  const eksempler = [
    { type: 'slaa' },
    { type: 'join', navn: 'A', farve: '#D8A93F', drik: 'ol', kortHold: 'dame' },
    { type: 'join', navn: 'A', farve: '#D8A93F', drik: { id: 'ol', enhedCl: 50 }, kortHold: 'konge' },
    { type: 'saet-drik', drik: { navn: 'Cider', enhedCl: 33, procent: 4.5 } },
    { type: 'saet-indstilling' },
    { type: 'saet-indstilling', hardcore: true },
    { type: 'giv-slurke', fordeling: [{ spillerId: 'p1', antal: 2 }, { spillerId: 'p2', antal: 1 }] },
    { type: 'fyld-taarn', slurke: 0.25 },
    { type: 'krone-kast', x: 10, y: -4 },
    { type: 'krone-resultat', ramte: false },
    { type: 'hoejere-lavere', gaet: 'lavere' },
    { type: 'meier-meld', melding: 4 }
  ];
  for (const h of eksempler) assert.deepEqual(tolkHandling(h), h);
});

test('felter motoren ikke kender, bliver skåret fra', () => {
  assert.deepEqual(tolkHandling({ type: 'slaa', snyd: true }), { type: 'slaa' });
  assert.deepEqual(
    tolkHandling({ type: 'fyld-taarn', slurke: 1, spillerId: 'p2' }),
    { type: 'fyld-taarn', slurke: 1 }
  );
});

test('serverens egne hændelser kan ikke sendes af en klient', () => {
  assert.throws(() => tolkHandling({ type: 'forbindelse', tilsluttet: false }), RegelFejl);
});

test('alt med forkert form bliver afvist', () => {
  const daarlige: unknown[] = [
    null, 'slaa', [], {}, { type: 'ukendt' }, { type: 'toString' }, { type: '__proto__' },
    { type: 'fyld-taarn', slurke: 'x' },
    { type: 'fyld-taarn' },
    { type: 'krone-kast', x: 1 },
    { type: 'krone-resultat', ramte: 'ja' },
    { type: 'meier-meld', melding: '4' },
    { type: 'hoejere-lavere', gaet: 'midt' },
    { type: 'giv-slurke', fordeling: 'p1' },
    { type: 'giv-slurke', fordeling: [{ spillerId: 'p1', antal: 'tre' }] },
    { type: 'giv-slurke', fordeling: Array.from({ length: 17 }, () => ({ spillerId: 'p1', antal: 0 })) },
    { type: 'join', navn: 'A', farve: '#fff', drik: 'egen', kortHold: 'dame' },
    { type: 'join', navn: 'A', farve: '#fff', drik: 'ol', kortHold: 'begge' },
    { type: 'join', navn: 7, farve: '#fff', drik: 'ol', kortHold: 'dame' },
    { type: 'saet-indstilling', hardcore: 'ja' },
    { type: 'krone-udpeg', spillerId: 'x'.repeat(65) }
  ];
  for (const h of daarlige) assert.throws(() => tolkHandling(h), RegelFejl, JSON.stringify(h));
});
