/**
 * Zephyr Squad Integration Script
 * =================================
 * Reads Playwright JSON results and pushes them to Zephyr Squad on Jira Server:
 *
 *   1. Finds (or creates) a cycle under the version you specify
 *   2. Creates a folder inside that cycle
 *   3. Adds test executions for each ETS test case
 *   4. Updates each execution status to Pass/Fail
 *   5. Attaches screenshots for failed tests
 *
 * Usage:
 *   node scripts/jira-update.js --version "2026_05.2" --cycle "QA1" --folder "VertexTest"
 *   node scripts/jira-update.js --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 1
 *   node scripts/jira-update.js --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --dry-run
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Configuration ─────────────────────────────────────────────────────────
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'ETS';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_BASE_URL || !JIRA_API_TOKEN) {
  console.error('❌ Missing JIRA_BASE_URL or JIRA_API_TOKEN in .env');
  process.exit(1);
}

const RESULTS_PATH = path.resolve(__dirname, '..', 'test-results', 'results.json');
const agent = new https.Agent({ rejectUnauthorized: false });

// ─── Parse CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let versionName = null;
let cycleName = null;
let folderName = null;
let scriptFilter = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) { versionName = args[++i]; }
  if (args[i] === '--cycle' && args[i + 1]) { cycleName = args[++i]; }
  if (args[i] === '--folder' && args[i + 1]) { folderName = args[++i]; }
  if (args[i] === '--script' && args[i + 1]) { scriptFilter = parseInt(args[++i], 10); }
  if (args[i] === '--dry-run') { dryRun = true; }
}

if (!versionName || !cycleName || !folderName) {
  console.error('❌ Missing required arguments.');
  console.error('   Usage: node scripts/jira-update.js --version "2026_05.2" --cycle "QA1" --folder "VertexTest"');
  process.exit(1);
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────
function apiRequest(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = JIRA_BASE_URL + urlPath;
    const parsed = new URL(fullUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': `Bearer ${JIRA_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${method} ${urlPath} → ${res.statusCode}: ${data.substring(0, 200)}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function uploadFile(urlPath, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Date.now();
    const CRLF = '\r\n';

    const parts = [
      `--${boundary}${CRLF}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}`,
      `Content-Type: application/octet-stream${CRLF}${CRLF}`,
    ];
    const bodyStart = Buffer.from(parts.join(''));
    const bodyEnd = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
    const fullBody = Buffer.concat([bodyStart, fileBuffer, bodyEnd]);

    const parsed = new URL(JIRA_BASE_URL + urlPath);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JIRA_API_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
        'X-Atlassian-Token': 'no-check',
        'Accept': 'application/json',
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Upload → ${res.statusCode}: ${data.substring(0, 200)}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

// ─── Delay helper for rate limiting ────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Parse Playwright results ──────────────────────────────────────────────
function parseResults() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error(`❌ Results file not found: ${RESULTS_PATH}`);
    console.error('   Run tests first: npx playwright test');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  const results = [];

  function collectSpecs(suite, currentScriptId) {
    const scriptMatch = suite.title.match(/Script\s+(\d+)/i);
    const scriptId = scriptMatch ? parseInt(scriptMatch[1], 10) : currentScriptId;

    for (const spec of suite.specs || []) {
      const etsMatch = spec.title.match(/ETS-?\s*(\d+)/i);
      if (!etsMatch) continue;

      const etsNumber = etsMatch[1];
      const testResult = spec.tests?.[0]?.results?.[0];
      const status = spec.ok ? 'Pass' : 'Fail';
      const duration = testResult?.duration || 0;
      const errorMessage = testResult?.error?.message || '';

      let screenshotPath = null;
      if (testResult?.attachments) {
        const ss = testResult.attachments.find((a) => a.name === 'screenshot');
        if (ss?.path) screenshotPath = ss.path;
      }

      results.push({
        etsNumber,
        issueKey: `${JIRA_PROJECT_KEY}-${etsNumber}`,
        testTitle: spec.title,
        scriptId,
        status,
        duration,
        errorMessage: errorMessage.substring(0, 1000),
        screenshotPath,
      });
    }

    for (const child of suite.suites || []) {
      collectSpecs(child, scriptId);
    }
  }

  for (const suite of data.suites || []) {
    collectSpecs(suite, null);
  }

  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       ZEPHYR SQUAD - TEST RESULTS INTEGRATION          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (dryRun) console.log('🔍 DRY RUN MODE — no changes will be made\n');

  // Step 1: Parse results
  let results = parseResults();
  console.log(`📋 Found ${results.length} test results`);

  if (scriptFilter) {
    results = results.filter((r) => r.scriptId === scriptFilter);
    console.log(`🔍 Filtered to Script ${scriptFilter}: ${results.length} tests`);
  }

  const passed = results.filter((r) => r.status === 'Pass').length;
  const failed = results.filter((r) => r.status === 'Fail').length;
  console.log(`   ✅ Passed: ${passed}  ❌ Failed: ${failed}\n`);

  // Step 2: Get project info
  console.log('─── Resolving Project & Version ──────────────────────────\n');

  const project = await apiRequest(`/rest/api/2/project/${JIRA_PROJECT_KEY}`);
  const projectId = project.id;
  console.log(`  Project: ${project.name} (id: ${projectId})`);

  // Find version
  const versions = await apiRequest(`/rest/api/2/project/${JIRA_PROJECT_KEY}/versions`);
  const version = versions.find((v) => v.name === versionName);
  if (!version) {
    console.error(`  ❌ Version "${versionName}" not found. Available versions:`);
    versions.slice(-10).forEach((v) => console.error(`     - ${v.name}`));
    process.exit(1);
  }
  const versionId = version.id;
  console.log(`  Version: ${version.name} (id: ${versionId})\n`);

  // Step 3: Find or create cycle
  console.log('─── Finding/Creating Cycle ───────────────────────────────\n');

  const cyclesData = await apiRequest(`/rest/zapi/latest/cycle?projectId=${projectId}&versionId=${versionId}`);
  const existingCycles = Object.entries(cyclesData)
    .filter(([k]) => k !== '-1' && k !== 'recordsCount')
    .map(([id, c]) => ({ id, name: c.name }));

  let cycleId = null;
  const found = existingCycles.find((c) => c.name === cycleName);

  if (found) {
    cycleId = found.id;
    console.log(`  📁 Found existing cycle: "${cycleName}" (id: ${cycleId})`);
  } else if (dryRun) {
    console.log(`  [DRY RUN] Would create cycle: "${cycleName}"`);
    cycleId = 'DRY';
  } else {
    const created = await apiRequest('/rest/zapi/latest/cycle', 'POST', {
      name: cycleName,
      projectId: parseInt(projectId),
      versionId: parseInt(versionId),
      description: `Automation cycle created on ${new Date().toISOString().slice(0, 10)}`,
    });
    cycleId = created.id || String(created.responseMessage).match(/id\s*:\s*(\d+)/)?.[1];
    console.log(`  ✔ Created cycle: "${cycleName}" (id: ${cycleId})`);
  }

  // Step 4: Find or create folder inside cycle
  console.log(`\n─── Finding/Creating Folder ──────────────────────────────\n`);

  let folderId = null;

  try {
    const foldersData = await apiRequest(
      `/rest/zapi/latest/cycle/${cycleId}/folders?projectId=${projectId}&versionId=${versionId}`
    );
    const existingFolder = (Array.isArray(foldersData) ? foldersData : [])
      .find((f) => f.folderName === folderName);

    if (existingFolder) {
      folderId = existingFolder.folderId;
      console.log(`  📁 Found existing folder: "${folderName}" (id: ${folderId})`);
    }
  } catch {
    // No folders yet, that's fine
  }

  if (!folderId && !dryRun) {
    const folderResult = await apiRequest('/rest/zapi/latest/folder/create', 'POST', {
      cycleId: parseInt(cycleId),
      name: folderName,
      description: `Automation results - ${new Date().toISOString().slice(0, 10)}`,
      projectId: parseInt(projectId),
      versionId: parseInt(versionId),
    });
    folderId = folderResult.id;
    console.log(`  ✔ Created folder: "${folderName}" (id: ${folderId})`);
  } else if (!folderId && dryRun) {
    console.log(`  [DRY RUN] Would create folder: "${folderName}"`);
    folderId = 'DRY';
  }

  // Step 5: Resolve Jira issue IDs for each ETS test case
  console.log(`\n─── Resolving Issue IDs ─────────────────────────────────\n`);

  let resolvedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    try {
      const issue = await apiRequest(`/rest/api/2/issue/${r.issueKey}?fields=id`);
      r.issueId = issue.id;
      resolvedCount++;
    } catch {
      console.log(`  ⚠️  ${r.issueKey} — not found in Jira`);
      r.issueId = null;
      failedCount++;
    }
  }

  console.log(`  ✔ Resolved: ${resolvedCount}, Not found: ${failedCount}`);

  // Step 6: Fetch existing executions in this cycle+folder to detect re-runs
  console.log(`\n─── Checking Existing Executions ─────────────────────────\n`);

  let existingExecutions = [];
  try {
    const execList = await apiRequest(
      `/rest/zapi/latest/execution?cycleId=${cycleId}&projectId=${projectId}&versionId=${versionId}` +
      (folderId ? `&folderId=${folderId}` : '') +
      `&offset=0&maxRecords=1000`
    );
    // execList.executions is an object keyed by execution ID
    if (execList && execList.executions) {
      existingExecutions = Object.entries(execList.executions).map(([id, e]) => ({
        execId: id,
        issueId: String(e.issueId),
        issueKey: e.issueKey,
        status: e.executionStatus, // e.g. "PASS", "FAIL", "-1" (unexecuted)
      }));
    }
    console.log(`  Found ${existingExecutions.length} existing execution(s) in this folder`);
  } catch (err) {
    console.log(`  ⚠️ Could not fetch existing executions: ${err.message.substring(0, 80)}`);
  }

  // Step 7: Create/update executions and manage attachments
  console.log(`\n─── Creating Executions & Updating Status ───────────────\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const r of results) {
    const icon = r.status === 'Pass' ? '✅' : '❌';

    if (!r.issueId) {
      console.log(`  ⏭️  ${r.issueKey} — skipped (not found)`);
      skipCount++;
      continue;
    }

    process.stdout.write(`  ${icon} ${r.issueKey} ... `);

    if (dryRun) {
      console.log(`[DRY RUN] ${r.status}`);
      successCount++;
      continue;
    }

    try {
      // Check if there's an existing execution for this issue in the folder
      const existing = existingExecutions.find((e) => e.issueId === r.issueId);
      let execId = null;

      if (existing && r.status === 'Pass') {
        // Re-run scenario: test was previously failed, now passing
        // Remove old attachments from the failed execution
        execId = existing.execId;
        console.log(`found existing (id: ${execId}), updating...`);

        try {
          const attachments = await apiRequest(
            `/rest/zapi/latest/attachment/attachmentsByEntity?entityId=${execId}&entityType=execution`
          );
          const attachmentList = attachments?.data || attachments || [];
          if (Array.isArray(attachmentList) && attachmentList.length > 0) {
            for (const att of attachmentList) {
              const attId = att.fileId || att.id;
              if (attId) {
                await apiRequest(`/rest/zapi/latest/attachment/${attId}`, 'DELETE');
              }
            }
            process.stdout.write(`        🗑️  removed ${attachmentList.length} old attachment(s)\n`);
          }
        } catch (attErr) {
          process.stdout.write(`        ⚠️ could not remove old attachments\n`);
        }

        // Update execution status to Pass
        await apiRequest(`/rest/zapi/latest/execution/${execId}/execute`, 'PUT', {
          status: 1, // 1=Pass
        });

        process.stdout.write(`        ✔ status updated to Pass\n`);
      } else {
        // No existing execution or test is failing — create new execution
        const exec = await apiRequest('/rest/zapi/latest/execution', 'POST', {
          cycleId: cycleId,
          issueId: parseInt(r.issueId),
          projectId: parseInt(projectId),
          versionId: parseInt(versionId),
          folderId: parseInt(folderId),
        });

        // The response has the execution ID as a key in the object
        execId = Object.keys(exec)[0];

        if (execId) {
          // Update status: 1=Pass, 2=Fail, 3=WIP, -1=Unexecuted
          const statusId = r.status === 'Pass' ? 1 : 2;

          await apiRequest(`/rest/zapi/latest/execution/${execId}/execute`, 'PUT', {
            status: statusId,
          });

          console.log(`created & ${r.status === 'Pass' ? 'passed' : 'failed'}`);
        } else {
          console.log('created (no exec ID returned)');
        }
      }

      r.execId = execId;
      successCount++;

      // Attach screenshot for the current result
      if (execId && r.screenshotPath && fs.existsSync(r.screenshotPath)) {
        try {
          await uploadFile(
            `/rest/zapi/latest/attachment?entityId=${execId}&entityType=execution`,
            r.screenshotPath,
            `${r.issueKey}-result.png`
          );
          process.stdout.write(`        📎 screenshot attached\n`);
        } catch (err) {
          process.stdout.write(`        ⚠️ attachment failed\n`);
        }
      }

      // Small delay to avoid rate limiting
      await delay(200);
    } catch (err) {
      console.log(`FAILED (${err.message.substring(0, 80)})`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(` Version:    ${versionName}`);
  console.log(` Cycle:      ${cycleName} (id: ${cycleId})`);
  console.log(` Folder:     ${folderName} (id: ${folderId})`);
  console.log(` Executions: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
  console.log(` Results:    ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
