import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');

mkdirSync(docsDir, { recursive: true });

const entries = [
  { source: 'index.html', target: 'index.html', type: 'file' },
  { source: 'biomes.html', target: 'biomes.html', type: 'file', optional: true },
  { source: 'biomes.js', target: 'biomes.js', type: 'file', optional: true },
  { source: 'styles', target: 'styles', type: 'dir' },
  { source: 'src', target: 'src', type: 'dir' },
  { source: 'assets', target: 'assets', type: 'dir' }
];

for (const entry of entries) {
  const sourcePath = path.join(projectRoot, entry.source);
  const targetPath = path.join(docsDir, entry.target);
  if (!existsSync(sourcePath)) {
    if (entry.optional) {
      continue;
    }
    throw new Error(`Missing required source: ${entry.source}`);
  }

  if (entry.type === 'dir' && existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }

  if (entry.type === 'file') {
    mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  cpSync(sourcePath, targetPath, { recursive: entry.type === 'dir' });
}

console.log('Documentation assets synchronised to docs/.');
