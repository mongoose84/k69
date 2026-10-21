// tsc flytter ikke .sql-filer med over i dist — det gør denne.
// Valgfrit argument: mappen de skal ligge ved siden af (standard dist/).
import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rod = join(dirname(fileURLToPath(import.meta.url)), '..');
const ud = join(rod, process.argv[2] ?? 'dist', 'migrations');
await mkdir(ud, { recursive: true });
await cp(join(rod, 'src', 'migrations'), ud, { recursive: true });
console.log(`kopierede migrations/ til ${process.argv[2] ?? 'dist'}/`);
