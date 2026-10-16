# Vertex Tax Simulator – Automation Guide

## Overview

This project automates tax calculation testing on the **Follett Tax Simulator QA** web application using **Playwright** (TypeScript). Test cases are driven by an Excel spreadsheet and results are reported back to **Jira/Zephyr Squad**.

---

## Project Structure

```
Vertex/
├── test-data/
│   └── vertext_test.xlsx          # Excel file containing all test case data
├── src/
│   ├── data/
│   │   ├── excel-reader.ts        # Reads & parses the Excel file into test data
│   │   └── test-data.interface.ts # TypeScript interface for test data rows
│   └── pages/
│       └── tax-simulator.page.ts  # Page Object Model for the Tax Simulator UI
├── tests/
│   └── vertex-tax.spec.ts         # Main test spec (Script 1, 2, 3)
├── scripts/
│   ├── jira-update.js             # Uploads test results to Jira/Zephyr Squad
│   └── update-excel.js            # Utility to patch Excel data after test runs
├── test-results/
│   └── results.json               # JSON output from the last test run
├── playwright-report/             # HTML report from the last test run
├── playwright.config.ts           # Playwright configuration
├── package.json                   # Dependencies and npm scripts
└── .env                           # Environment variables (not committed)
```

---

## How It Works (Step by Step)

### 1. Test Data (Excel)

- All test cases live in `test-data/vertext_test.xlsx`.
- Each row defines a test case with fields like Store Model, Customer Address, Product Items (up to 3), SKU, Tax Code, Unit Price, Expected Tax Amount, and Request Type (QUOTE/AUDIT).
- The `ExecutionFlag` column (`Y`/`N`) controls whether a test case runs.

### 2. Test Grouping (Scripts 1, 2, 3)

Tests are grouped by the number of products they use:

| Script   | Description                     |
|----------|---------------------------------|
| Script 1 | Test cases with **1 product**   |
| Script 2 | Test cases with **2 products**  |
| Script 3 | Test cases with **3 products**  |

### 3. Test Execution Flow

For each test case the automation:

1. Opens the Tax Simulator web app.
2. Selects the **Store Model** (dropdown or manual entry).
3. Sets the **Customer Address** (dropdown or manual entry).
4. Fills in **Product Item(s)** — type, SKU, tax code, unit price, quantity.
5. Selects the **Request Type** (Quote or Audit).
6. Clicks **Calculate Tax**.
7. Captures the returned tax amount and validates it against expected data.
8. Takes a full-page screenshot (attached to the report).

### 4. Reporting

After execution, three reports are generated:

- **Console** — live step-by-step output.
- **HTML Report** — saved in `playwright-report/` (open with `npm run test:report`).
- **JSON Results** — saved to `test-results/results.json` (used for Jira upload).

### 5. Jira/Zephyr Upload

The `jira-update.js` script reads `test-results/results.json` and:

1. Finds or creates a **Test Cycle** under the specified Jira version.
2. Creates a **Folder** inside that cycle.
3. Adds test executions for each ETS test case.
4. Updates each execution status to **Pass** or **Fail**.
5. Attaches screenshots for failed tests.

---

## Prerequisites

| Requirement     | Details                          |
|-----------------|----------------------------------|
| Node.js         | v18 or higher                    |
| npm             | Comes with Node.js               |
| Playwright      | Installed via npm + browser setup |
| `.env` file     | Required for Jira integration    |

---

## Installation

```bash
# 1. Install npm dependencies
npm install

# 2. Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install
```

---

## Environment Variables (`.env`)

Create a `.env` file in the project root for Jira integration:

```env
JIRA_BASE_URL=https://your-jira-instance.com
JIRA_API_TOKEN=your-personal-access-token
JIRA_PROJECT_KEY=ETS
```

> **Note:** The `.env` file is not committed to source control. Ask your team lead for credentials.

---

## Run Commands

### Running Tests

| Command | What It Does |
|---------|--------------|
| `npm test` | Run **all** test scripts (1, 2, and 3) |
| `npm run test:script1` | Run only **Script 1** (single-product tests) |
| `npm run test:script2` | Run only **Script 2** (two-product tests) |
| `npm run test:script3` | Run only **Script 3** (three-product tests) |
| `npm run test:headed` | Run all tests with browser visible |
| `npm run test:debug` | Run in Playwright debug mode (step through) |
| `npm run test:report` | Open the HTML report in browser |
| `npm run test:single -- "test name"` | Run a single test by its name |

### Uploading Results to Jira

```bash
# Basic usage (required flags: --version, --cycle, --folder)
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest"

# Upload only Script 1 results
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 1

# Upload only Script 2 results
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 2

# Upload only Script 3 results
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 3

# Dry run (preview what would be uploaded without making changes)
npm run jira:update:dry -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest"
```

**Jira Upload Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--version` | Yes | Jira fix version name (e.g., `"2026_05.2"`) |
| `--cycle` | Yes | Zephyr test cycle name (e.g., `"QA1"`) |
| `--folder` | Yes | Folder name inside the cycle (e.g., `"VertexTest"`) |
| `--script` | No | Filter results to a specific script (1, 2, or 3) |
| `--dry-run` | No | Preview mode — no changes made to Jira |

---

## Typical Workflow

```bash
# 1. Run tests
npm run test:script1

# 2. Check the HTML report
npm run test:report

# 3. Upload results to Jira
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 1
```

---

## Updating Test Data

To modify test cases, edit `test-data/vertext_test.xlsx` directly. Key columns:

| Column | Purpose |
|--------|---------|
| `TestCaseId` | Numeric ID |
| `TestCaseName` | Jira issue key (e.g., `ETS-2746`) |
| `ExecutionFlag` | `Y` = run, `N` = skip |
| `StoreModel` | Dropdown value or "Manual" |
| `CustomerAddress` | Dropdown value or "Manual" |
| `ProductItem1/2/3` | Product type |
| `SKU`, `TaxCode`, `UnitPrice`, `Quantity` | Product details |
| `TaxAmount` | Expected tax (for validation) |
| `RequestType` | `QUOTE` or `AUDIT` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Browser not found | Run `npx playwright install` |
| Tests timing out | Check network/VPN; simulator may be slow |
| Jira upload fails | Verify `.env` credentials and Jira connectivity |
| Excel read errors | Ensure `vertext_test.xlsx` exists in `test-data/` |
| Test data mismatch | Run `node scripts/update-excel.js` to sync values |
