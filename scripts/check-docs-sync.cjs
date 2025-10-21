const { execSync } = require('child_process');

function run(command, options = {}) {
  return execSync(command, { stdio: 'inherit', ...options });
}

try {
  run('node ./scripts/sync-docs.js');

  const status = execSync('git status --porcelain docs', { encoding: 'utf8' }).trim();

  if (status) {
    console.error('\nThe docs/ directory is not in sync with src/.');
    console.error('Run "npm run sync-docs" and commit the updated docs/ tree.');
    process.exit(1);
  }

  console.log('docs/ directory is up-to-date.');
} catch (error) {
  if (error.status !== undefined) {
    process.exit(error.status);
  }
  process.exit(1);
}
