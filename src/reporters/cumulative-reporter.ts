import * as fs from 'fs';
import * as path from 'path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

const RESULTS_FILE = path.resolve(__dirname, '..', '..', 'test-results', 'cumulative-results.json');

export interface CumulativeTestResult {
  testName: string;
  etsId: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  errors: string[];
  runTimestamp: string;
  retryAttempt: number;
}

export interface CumulativeResults {
  lastUpdated: string;
  summary: { total: number; passed: number; failed: number };
  tests: Record<string, CumulativeTestResult>;
}

function loadExistingResults(): CumulativeResults {
  if (fs.existsSync(RESULTS_FILE)) {
    const raw = fs.readFileSync(RESULTS_FILE, 'utf-8');
    return JSON.parse(raw);
  }
  return { lastUpdated: '', summary: { total: 0, passed: 0, failed: 0 }, tests: {} };
}

function extractEtsId(title: string): string {
  const match = title.match(/ETS-\d+/);
  return match ? match[0] : title;
}

function saveResults(results: CumulativeResults): void {
  const dir = path.dirname(RESULTS_FILE);
  fs.mkdirSync(dir, { recursive: true });

  // Recalculate summary
  const tests = Object.values(results.tests);
  results.summary = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status !== 'passed').length,
  };
  results.lastUpdated = new Date().toISOString();

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8');
}

class CumulativeReporter implements Reporter {
  private cumulative: CumulativeResults = { lastUpdated: '', summary: { total: 0, passed: 0, failed: 0 }, tests: {} };

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.cumulative = loadExistingResults();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const etsId = extractEtsId(test.title);
    const existing = this.cumulative.tests[etsId];

    const newEntry: CumulativeTestResult = {
      testName: test.title,
      etsId,
      status: result.status,
      duration: result.duration,
      errors: result.errors.map(e => e.message || String(e)),
      runTimestamp: new Date().toISOString(),
      retryAttempt: existing ? (existing.retryAttempt + 1) : 0,
    };

    // Always store the result. If re-running a failed test that now passes,
    // this overrides the old failed entry with the new passed one.
    if (!existing) {
      // First run — store regardless of status
      this.cumulative.tests[etsId] = newEntry;
    } else if (existing.status !== 'passed') {
      // Previously failed — override with new result (passed or failed)
      this.cumulative.tests[etsId] = newEntry;
    } else if (result.status === 'passed') {
      // Previously passed, still passing — update timestamp/duration
      this.cumulative.tests[etsId] = newEntry;
    }
    // If previously passed but now fails (shouldn't happen in re-run-failed flow),
    // keep the passed result to avoid regressions being silently hidden.
    // If you want to always override, remove the else-if above and just assign.
  }

  onEnd(_result: FullResult): void {
    saveResults(this.cumulative);
    const { passed, failed, total } = this.cumulative.summary;
    console.log(`\n[Cumulative Results] Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`[Cumulative Results] Saved to: ${RESULTS_FILE}\n`);
  }
}

export default CumulativeReporter;
