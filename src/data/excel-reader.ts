import * as XLSX from 'xlsx';
import * as path from 'path';
import { TestData } from './test-data.interface';

const EXCEL_FILE_PATH = path.resolve(__dirname, '..', '..', 'test-data', 'vertext_test.xlsx');

export function readTestData(sheetName = 'Sheet1'): TestData[] {
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);
  const worksheet = workbook.Sheets[sheetName];
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Filter out separator/header rows (rows where TestCaseId equals the string "TestCaseId")
  const filtered = rawData.filter(
    (row) => row.TestCaseId !== 'TestCaseId' && row.TestCaseId !== ''
  );

  return filtered.map((row) => ({
    TestCaseId: Number(row.TestCaseId),
    TestCaseName: String(row.TestCaseName).trim(),
    ExecutionFlag: String(row.ExecutionFlag).trim(),
    ProductItem1: String(row.ProductItem1).trim(),
    SearchUrl: String(row.SearchUrl).trim(),
    StoreModel: String(row.StoreModel).trim(),
    CustomerAddress: String(row.CustomerAddress).trim(),
    ProductItem2: String(row.ProductItem2).trim(),
    ProductItem3: String(row.ProductItem3).trim(),
    RequestType: String(row.RequestType).trim(),
    SKU: String(row.SKU).trim(),
    TaxCode: String(row.TaxCode).trim(),
    UnitPrice: String(row.UnitPrice).trim(),
    TaxAmount: String(row.TaxAmount).trim(),
    Quantity: String(row.Quantity).trim(),
    // Manual Store fields
    ManualStoreNumber: String(row.ManualStoreNumber ?? '').trim(),
    ManualStoreCurrency: String(row.ManualStoreCurrency ?? '').trim(),
    ManualStoreAddress1: String(row.ManualStoreAddress1 ?? '').trim(),
    ManualStoreAddress2: String(row.ManualStoreAddress2 ?? '').trim(),
    ManualStoreCity: String(row.ManualStoreCity ?? '').trim(),
    ManualStoreState: String(row.ManualStoreState ?? '').trim(),
    ManualStoreZip: String(row.ManualStoreZip ?? '').trim(),
    ManualStoreCountry: String(row.ManualStoreCountry ?? '').trim(),
    // Manual Customer fields
    ManualCustAddress1: String(row.ManualCustAddress1 ?? '').trim(),
    ManualCustAddress2: String(row.ManualCustAddress2 ?? '').trim(),
    ManualCustCity: String(row.ManualCustCity ?? '').trim(),
    ManualCustState: String(row.ManualCustState ?? '').trim(),
    ManualCustZip: String(row.ManualCustZip ?? '').trim(),
    ManualCustCountry: String(row.ManualCustCountry ?? '').trim(),
    // Manual Product #2 fields
    ManualP2SKU: String(row.ManualP2SKU ?? '').trim(),
    ManualP2TaxCode: String(row.ManualP2TaxCode ?? '').trim(),
    ManualP2UnitPrice: String(row.ManualP2UnitPrice ?? '').trim(),
    ManualP2Quantity: String(row.ManualP2Quantity ?? '').trim(),
    // Manual Product #3 fields
    ManualP3SKU: String(row.ManualP3SKU ?? '').trim(),
    ManualP3TaxCode: String(row.ManualP3TaxCode ?? '').trim(),
    ManualP3UnitPrice: String(row.ManualP3UnitPrice ?? '').trim(),
    ManualP3Quantity: String(row.ManualP3Quantity ?? '').trim(),
  }));
}

export function getExecutableTests(): TestData[] {
  return readTestData().filter((t) => t.ExecutionFlag === 'Y');
}

export function getTestsByProductCount(count: 1 | 2 | 3): TestData[] {
  return getExecutableTests().filter((t) => t.TestCaseId === count);
}
