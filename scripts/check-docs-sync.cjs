const { execSync } = require('child_process');

function run(command, options = {}) {
  return execSync(command, { stdio: 'inherit', ...options });
}

run('node ./scripts/sync-docs.js');

const status = execSync('git status --porcelain docs', { encoding: 'utf8' }).trim();

if (status) {
  console.error('\nThe docs/ directory is not in sync with src/.');
  console.error('Run "npm run sync-docs" and commit the updated docs/ tree.');
  const error = new Error('docs/ directory is not in sync with src/.');
  error.name = 'DocsSyncError';
  throw error;
}

console.log('docs/ directory is up-to-date.');
