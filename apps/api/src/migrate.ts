import { migrer, pool, ventPaaDb } from './db.js';

await ventPaaDb();
const nye = await migrer();
console.log(nye.length ? `Kørte: ${nye.join(', ')}` : 'Ingen nye migrationer.');
await pool.end();
