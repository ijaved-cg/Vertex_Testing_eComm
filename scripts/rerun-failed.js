/**
 * Re-runs only the failed tests from cumulative-results.json.
 * On pass, the cumulative reporter will automatically override the failed entries.
 *
 * Usage: node scripts/rerun-failed.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.resolve(__dirname, '..', 'test-results', 'cumulative-results.json');

if (!fs.existsSync(RESULTS_FILE)) {
  console.log('No cumulative-results.json found. Run tests first.');
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
const failedTests = Object.values(results.tests).filter(t => t.status !== 'passed');

if (failedTests.length === 0) {
  console.log('All tests are passing. Nothing to re-run.');
  process.exit(0);
}

console.log(`Found ${failedTests.length} failed test(s). Re-running...`);
failedTests.forEach(t => console.log(`  - ${t.etsId}: ${t.testName}`));
console.log('');

// Build a grep pattern that matches any of the failed ETS IDs
const grepPattern = failedTests.map(t => t.etsId).join('|');

try {
  execSync(`npx playwright test --grep "${grepPattern}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
} catch (e) {
  // Playwright exits non-zero if tests fail — that's expected
  process.exit(e.status || 1);
}
