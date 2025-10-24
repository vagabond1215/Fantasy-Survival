#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.git', '.husky', 'dist', 'build', '.vite', '.cache']);
const TARGET_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.css',
  '.scss',
  '.sass',
  '.less'
]);

const htmlExtensions = new Set(['.html', '.htm']);
const styleExtensions = new Set(['.css', '.scss', '.sass', '.less']);

const detectors = [
  {
    regex: /(["'`])\/(?!\/)/g,
    description: 'String literal starting with a leading slash',
    appliesTo: null
  },
  {
    regex: /\burl\(\s*\/(?!\/)/gi,
    description: 'CSS url() with a leading slash',
    appliesTo: styleExtensions
  },
  {
    regex: /=\s*\/(?!\/)/g,
    description: 'Attribute value starting with a leading slash',
    appliesTo: htmlExtensions
  }
];

function scanDirectory(dir, violations) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!TARGET_EXTENSIONS.has(ext)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      detectors.forEach(({ regex, description, appliesTo }) => {
        if (appliesTo && !appliesTo.has(ext)) {
          return;
        }
        regex.lastIndex = 0;
        if (regex.test(line)) {
          violations.push({
            file: path.relative(projectRoot, fullPath),
            line: index + 1,
            description,
            snippet: line.trim()
          });
        }
      });
    });
  }
}

function main() {
  const violations = [];
  scanDirectory(projectRoot, violations);

  if (violations.length > 0) {
    console.error('Found root-relative paths that are not allowed:');
    violations.forEach(({ file, line, description, snippet }) => {
      console.error(`- ${file}:${line}\n  ${description}\n  ${snippet}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log('No root-relative paths detected.');
}

main();
