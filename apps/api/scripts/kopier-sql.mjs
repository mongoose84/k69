// tsc flytter ikke .sql-filer med over i dist — det gør denne.
import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rod = join(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(rod, 'dist', 'migrations'), { recursive: true });
await cp(join(rod, 'src', 'migrations'), join(rod, 'dist', 'migrations'), { recursive: true });
console.log('kopierede migrations/ til dist/');
