import assert from 'node:assert/strict';
import test from 'node:test';

import { anvend, forSpiller, nytSpil, type Spil } from '@k69/rules';
import { genkend, hashAf, medSession, nyToken } from '../src/session.js';

/* --------------------------------------------------------------- værktøj */

const naa = '2026-01-01T00:00:00.000Z';

function ktx(spillerId: string) {
  return { spillerId, terning: () => 1, naa: () => naa };
}

let naeste = 0;
const nytId = (): string => `ny-${++naeste}`;

/** To spillere ved bordet, hver med sin nøgle bundet — som efter join. */
function bord(): { spil: Spil; tokenA: string; tokenB: string } {
  let spil = nytSpil('spil', 'TEST', naa);
  for (const id of ['a', 'b']) {
    spil = anvend(spil, { type: 'join', navn: id, farve: '#D8A93F', drik: 'ol', kortHold: 'konge' }, ktx(id));
  }
  const tokenA = nyToken();
  const tokenB = nyToken();
  spil = medSession(medSession(spil, hashAf(tokenA), 'a'), hashAf(tokenB), 'b');
  return { spil, tokenA, tokenB };
}

/* ------------------------------------------------------------------ tests */

test('en kendt nøgle giver sin egen spiller', () => {
  const { spil, tokenA, tokenB } = bord();
  assert.equal(genkend(spil, tokenA, null, nytId).spillerId, 'a');
  assert.equal(genkend(spil, tokenB, null, nytId).spillerId, 'b');
  assert.equal(genkend(spil, tokenA, null, nytId).bundet, null);
});

test('en andens offentlige id giver ikke hans plads', () => {
  const { spil } = bord();
  // spillerId er synligt for alle — det er præcis det en snyder har.
  const ident = genkend(spil, nyToken(), 'b', nytId);
  assert.notEqual(ident.spillerId, 'b');
  assert.equal(ident.bundet, null);
  assert.notEqual(genkend(spil, 'b', 'b', nytId).spillerId, 'b');
});

test('nøglen gemmes kun som hash', () => {
  const { spil, tokenA } = bord();
  assert.equal(JSON.stringify(spil).includes(tokenA), false);
  assert.equal(JSON.stringify(forSpiller(spil, 'a')).includes(hashAf(tokenA)), false);
});

test('en ukendt men gyldig nøgle beholdes — to faner deler den', () => {
  const { spil } = bord();
  const egen = nyToken();
  const ident = genkend(spil, egen, null, nytId);
  assert.equal(ident.token, egen);
  assert.equal(ident.tokenHash, hashAf(egen));
  assert.match(ident.spillerId, /^ny-/);
});

test('en ugyldig nøgle erstattes af en ny fra serveren', () => {
  const { spil } = bord();
  for (const daarlig of [undefined, null, 42, '', 'kort', 'x'.repeat(43) + '!', { a: 1 }]) {
    const ident = genkend(spil, daarlig, null, nytId);
    assert.match(ident.token, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(ident.token, daarlig);
  }
});

test('en gammel klient kan gøre krav på sin plads — én gang', () => {
  let spil = nytSpil('spil', 'TEST', naa);
  spil = anvend(spil, { type: 'join', navn: 'gammel', farve: '#D8A93F', drik: 'ol', kortHold: 'konge' }, ktx('gammel-id'));

  const foerste = genkend(spil, nyToken(), 'gammel-id', nytId);
  assert.equal(foerste.spillerId, 'gammel-id');
  assert.ok(foerste.bundet);
  assert.equal(foerste.bundet.sessioner?.[foerste.tokenHash], 'gammel-id');

  // Nu er pladen låst: id'et alene giver den ikke igen.
  const anden = genkend(foerste.bundet, nyToken(), 'gammel-id', nytId);
  assert.notEqual(anden.spillerId, 'gammel-id');
  // Men nøglen gør.
  assert.equal(genkend(foerste.bundet, foerste.token, null, nytId).spillerId, 'gammel-id');
});

test('et gammelt id uden spiller giver ikke noget krav', () => {
  const { spil } = bord();
  const ident = genkend(spil, nyToken(), 'findes-ikke', nytId);
  assert.match(ident.spillerId, /^ny-/);
  assert.equal(ident.bundet, null);
});

test('medSession ændrer ikke det spil den får', () => {
  const { spil } = bord();
  const foer = JSON.stringify(spil);
  medSession(spil, 'h', 'c');
  assert.equal(JSON.stringify(spil), foer);
});
