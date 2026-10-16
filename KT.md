# Knowledge Transfer — Vertex Tax Simulator Automation

Simple explanation of what this project is, how it works, and how to run it.
For copy-paste commands, see [GUIDE.md](GUIDE.md).

---

## 1. What is this project?

Follett has a website called the **Tax Simulator**. You pick a store, a customer address, and
some products, and it calculates the sales tax using the **Vertex** tax engine.

This project is an automated test suite that:
1. Fills out that website automatically, hundreds of times, using data from an **Excel file**.
2. Checks that the tax amount the website calculates matches the amount we expected.
3. Uploads the pass/fail results to **Jira**.

If you need to add a new test, you just add a new row to the Excel file — you almost never need
to write new code.

---

## 2. The main pieces

Think of it as a pipeline:

```
Excel file  →  Test script  →  Website  →  Report  →  Jira
```

- **Excel file** (`test-data/vertext_test.xlsx`) — every test case, one row each.
- **`src/data/excel-reader.ts`** — opens the Excel file and turns each row into a JS object.
- **`tests/vertex-tax.spec.ts`** — for every row, creates one Playwright test.
- **`src/pages/tax-simulator.page.ts`** — all the code that clicks/fills the website. This is
  the file you'd change if the website's UI changes.
- **Reports** — after a run you get an HTML report, a JSON file, and a "cumulative results" file
  (keeps track of pass/fail across multiple runs, so re-runs don't erase history).
- **`scripts/jira-update.js`** — reads the JSON report and creates/updates test results in Jira.

---

## 3. How one test actually runs

For each Excel row, the automation:
1. Opens the Tax Simulator website.
2. Picks the Store Model.
3. Picks the Customer Address.
4. Fills in Product 1 (and 2, 3 if the test uses them).
5. Picks Quote or Audit.
6. Clicks "Calculate Tax".
7. Reads the tax amount shown on screen.
8. Compares it to the expected value from Excel.
9. Takes a screenshot (saved in the report).

All of that logic lives in one method: `executeTestCase()` in `tax-simulator.page.ts`.

---

## 4. The Excel file — what the columns mean

| Column | What it's for |
|---|---|
| `TestCaseName` | The Jira ticket number, e.g. `ETS-2746`. This is the real ID for the test. |
| `ExecutionFlag` | `Y` = run this test, `N` = skip it. |
| `TestCaseId` | Just says how many products the test uses: `1`, `2`, or `3`. Not a unique ID — many rows share the same value. |
| `StoreModel` / `CustomerAddress` | Which dropdown option to pick, or the word `Manual` to type it in by hand. |
| `ProductItem1/2/3` | Which product dropdown option to pick, or `Manual`. |
| `SKU`, `TaxCode`, `UnitPrice`, `Quantity` | Product details (used when a product is set to `Manual`). |
| `TaxAmount` | The tax amount we expect the website to return. |
| `RequestType` | `QUOTE` or `AUDIT`. |

**To add a new test:** add a new row, fill in the columns above, set `ExecutionFlag` to `Y`. Done.

---

## 5. "Script 1 / 2 / 3" — what are those?

Just a way of splitting up the tests:
- **Script 1** = tests that use 1 product
- **Script 2** = tests that use 2 products
- **Script 3** = tests that use 3 products

That's it — it's just a grouping for convenience, not a difference in what's being tested.

---

## 6. Everyday commands

```bash
# Run a group of tests
npm run test:script1

# See the results in a browser
npm run test:report

# Only re-run the tests that failed last time
npm run test:rerun-failed

# Upload results to Jira
npm run jira:update -- --version "2026_05.2" --cycle "QA1" --folder "VertexTest" --script 1
```

More commands and setup instructions are in [GUIDE.md](GUIDE.md).

---

## 7. Common problems

| What you see | Likely reason | What to do |
|---|---|---|
| Test times out | Site was slow, or network issue | Just re-run it |
| Tax amount doesn't match | Website's actual value changed | Confirm with the team, then update `TaxAmount` in Excel |
| "Option not found" on a dropdown | Excel text doesn't exactly match the website's label | Check `tax-simulator.page.ts` — there's a small mapping table for these mismatches |
| Jira upload fails | `.env` file missing or wrong token | Check `.env` against `.env.example` |
| Page looks broken/blank in headless mode | Known issue with some outside images/scripts being blocked | Already handled in the test file — no action needed |

---

## 8. First-week checklist

- [ ] Get the `.env` file / Jira credentials from the team
- [ ] Run `npm install` and `npx playwright install`
- [ ] Run `npm run test:script1` and see it pass
- [ ] Open the HTML report and click through a test's screenshot
- [ ] Open the Excel file and find one normal row and one `Manual` row
- [ ] Skim `tax-simulator.page.ts` once — it's the main file you'll ever touch
- [ ] Try a practice Jira upload using `npm run jira:update:dry` (dry run = no real changes)

---

## 9. Quick Q&A

**Where do I add a new test?** In the Excel file — add a row.

**When do I need to touch code?** Only if the website changes (new field, new dropdown) or a
product name in Excel doesn't match the website anymore.

**Why does it fail sometimes for no clear reason?** The tests run one at a time on purpose
(not in parallel) because the site can be unstable — occasional slowness/timeouts happen. Re-run
before assuming it's a real bug.
