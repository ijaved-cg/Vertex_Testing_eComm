export interface TestData {
  TestCaseId: number;
  TestCaseName: string;
  ExecutionFlag: string;
  ProductItem1: string;
  SearchUrl: string;
  StoreModel: string;
  CustomerAddress: string;
  ProductItem2: string;
  ProductItem3: string;
  RequestType: string;
  SKU: string;
  TaxCode: string;
  UnitPrice: string;
  TaxAmount: string;
  Quantity: string;
  // Manual Store fields
  ManualStoreNumber: string;
  ManualStoreCurrency: string;
  ManualStoreAddress1: string;
  ManualStoreAddress2: string;
  ManualStoreCity: string;
  ManualStoreState: string;
  ManualStoreZip: string;
  ManualStoreCountry: string;
  // Manual Customer fields
  ManualCustAddress1: string;
  ManualCustAddress2: string;
  ManualCustCity: string;
  ManualCustState: string;
  ManualCustZip: string;
  ManualCustCountry: string;
  // Manual Product #2 fields
  ManualP2SKU: string;
  ManualP2TaxCode: string;
  ManualP2UnitPrice: string;
  ManualP2Quantity: string;
  // Manual Product #3 fields
  ManualP3SKU: string;
  ManualP3TaxCode: string;
  ManualP3UnitPrice: string;
  ManualP3Quantity: string;
}
