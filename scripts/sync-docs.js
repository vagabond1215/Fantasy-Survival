// @ts-check
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');
const distDir = path.join(projectRoot, 'dist');

await build({
  configFile: path.join(projectRoot, 'vite.config.ts'),
  build: {
    outDir: distDir,
    emptyOutDir: true
  }
});

mkdirSync(docsDir, { recursive: true });

const staleDocsEntries = ['src', 'assets', 'biomes.js'];
for (const entry of staleDocsEntries) {
  const stalePath = path.join(docsDir, entry);
  if (existsSync(stalePath)) {
    rmSync(stalePath, { recursive: true, force: true });
  }
}

const distEntries = [
  { source: 'index.html', target: 'index.html', type: 'file' },
  { source: 'biomes.html', target: 'biomes.html', type: 'file', optional: true },
  { source: 'assets', target: 'assets', type: 'dir' }
];

for (const entry of distEntries) {
  const sourcePath = path.join(distDir, entry.source);
  if (!existsSync(sourcePath)) {
    if (entry.optional) {
      continue;
    }
    throw new Error(`Missing required build output: ${entry.source}`);
  }

  const targetPath = path.join(docsDir, entry.target);
  if (entry.type === 'dir' && existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }

  if (entry.type === 'file') {
    mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  cpSync(sourcePath, targetPath, { recursive: entry.type === 'dir' });
}

const stylesSource = path.join(projectRoot, 'styles');
if (existsSync(stylesSource)) {
  const stylesTarget = path.join(docsDir, 'styles');
  if (existsSync(stylesTarget)) {
    rmSync(stylesTarget, { recursive: true, force: true });
  }
  cpSync(stylesSource, stylesTarget, { recursive: true });
}

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

console.log('Documentation assets synchronised to docs/ from the production build.');
