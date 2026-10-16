import { Page, Locator, expect } from '@playwright/test';
import { TestData } from '../data/test-data.interface';

export class TaxSimulatorPage {
  readonly page: Page;

  // --- Tax Total Response ---
  readonly taxTotalAmount: Locator;

  // --- Store Section ---
  readonly storeModelDropdown: Locator;

  // --- Customer Section ---
  readonly customerAddressTypeDropdown: Locator;

  // --- Product Item #1 ---
  readonly product1TypeDropdown: Locator;
  readonly product1UnitPrice: Locator;
  readonly product1Quantity: Locator;
  readonly product1SKU: Locator;
  readonly product1TaxCode: Locator;

  // --- Product Item #2 ---
  readonly product2TypeDropdown: Locator;
  readonly product2UnitPrice: Locator;
  readonly product2Quantity: Locator;
  readonly product2SKU: Locator;
  readonly product2TaxCode: Locator;

  // --- Product Item #3 ---
  readonly product3TypeDropdown: Locator;
  readonly product3UnitPrice: Locator;
  readonly product3Quantity: Locator;
  readonly product3SKU: Locator;
  readonly product3TaxCode: Locator;

  // --- Request Type Radio Buttons ---
  readonly quoteRadio: Locator;
  readonly auditRadio: Locator;

  // --- Calculate Tax Button ---
  readonly calculateTaxButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tax Total Amount (div that shows result after calculation)
    this.taxTotalAmount = page.locator('#totalTaxResponse');

    // Store Model dropdown (id="storeDDL")
    this.storeModelDropdown = page.locator('#storeDDL');

    // Customer Address Type dropdown (id="customerDDL")
    this.customerAddressTypeDropdown = page.locator('#customerDDL');

    // Product Item #1 fields
    this.product1TypeDropdown = page.locator('#itemTypeDDL_1');
    this.product1UnitPrice = page.locator('#unitPrice_1');
    this.product1Quantity = page.locator('#quantity_1');
    this.product1SKU = page.locator('#itemSku_1');
    this.product1TaxCode = page.locator('#taxCode_1');

    // Product Item #2 fields
    this.product2TypeDropdown = page.locator('#itemTypeDDL_2');
    this.product2UnitPrice = page.locator('#unitPrice_2');
    this.product2Quantity = page.locator('#quantity_2');
    this.product2SKU = page.locator('#itemSku_2');
    this.product2TaxCode = page.locator('#taxCode_2');

    // Product Item #3 fields
    this.product3TypeDropdown = page.locator('#itemTypeDDL_3');
    this.product3UnitPrice = page.locator('#unitPrice_3');
    this.product3Quantity = page.locator('#quantity_3');
    this.product3SKU = page.locator('#itemSku_3');
    this.product3TaxCode = page.locator('#taxCode_3');

    // Request Type - click labels since radio inputs are CSS-hidden
    this.quoteRadio = page.locator('label[for="btnGetQuote"]');
    this.auditRadio = page.locator('label[for="btnGetAudit"]');

    // Calculate Tax button (plain button with onclick)
    this.calculateTaxButton = page.locator('button', { hasText: 'calculate tax' });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the store dropdown to be available
    await this.storeModelDropdown.waitFor({ state: 'visible', timeout: 30000 });
    await this.waitForLoading();
  }

  // ---------- Wait for Loading Mask to Disappear ----------
  private async waitForLoading(): Promise<void> {
    // Check if the loading mask is hidden via CSS display:none
    const isHidden = await this.page.evaluate(() => {
      const el = document.querySelector('#loading') as HTMLElement;
      if (!el) return true;
      return getComputedStyle(el).display === 'none';
    });
    if (isHidden) return;
    // The mask is visible — try waiting for the site JS to hide it
    try {
      await this.page.locator('#loading').waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Site JS didn't hide it (headless detection) — force-hide it
      await this.page.evaluate(() => {
        const el = document.querySelector('#loading') as HTMLElement;
        if (el) el.style.display = 'none';
      });
    }
  }

  // ---------- Store Selection ----------
  async selectStoreModel(storeModel: string, data: TestData): Promise<void> {
    if (storeModel === 'Manual') {
      await this.storeModelDropdown.selectOption({ value: 'manual' });
      await this.page.waitForTimeout(500);
      // Fill manual store fields
      if (data.ManualStoreNumber) {
        await this.page.locator('#storeNum').fill(data.ManualStoreNumber);
      }
      if (data.ManualStoreCurrency) {
        await this.page.locator('#currency').selectOption({ value: data.ManualStoreCurrency });
      }
      if (data.ManualStoreAddress1) {
        await this.page.locator('#originAdd_Address1').fill(data.ManualStoreAddress1);
      }
      if (data.ManualStoreAddress2) {
        await this.page.locator('#originAdd_Address2').fill(data.ManualStoreAddress2);
      }
      if (data.ManualStoreCity) {
        await this.page.locator('#originAdd_City').fill(data.ManualStoreCity);
      }
      if (data.ManualStoreState) {
        await this.page.locator('#originAdd_State').fill(data.ManualStoreState);
      }
      if (data.ManualStoreZip) {
        await this.page.locator('#originAdd_ZipCode').fill(data.ManualStoreZip);
      }
      if (data.ManualStoreCountry) {
        await this.setCountryField('#originAdd_Country', data.ManualStoreCountry);
      }
    } else {
      await this.storeModelDropdown.selectOption({ label: storeModel });
    }
    await this.waitForLoading();
  }

  // ---------- Customer Address Selection ----------
  async selectCustomerAddress(customerAddress: string, data: TestData): Promise<void> {
    if (customerAddress === 'Manual') {
      await this.customerAddressTypeDropdown.selectOption({ value: 'manual' });
      await this.page.waitForTimeout(500);
      // Fill manual customer address fields
      if (data.ManualCustAddress1) {
        await this.page.locator('#customerAdd_Address1').fill(data.ManualCustAddress1);
      }
      if (data.ManualCustAddress2) {
        await this.page.locator('#customerAdd_Address2').fill(data.ManualCustAddress2);
      }
      if (data.ManualCustCity) {
        await this.page.locator('#customerAdd_City').fill(data.ManualCustCity);
      }
      if (data.ManualCustState) {
        await this.page.locator('#customerAdd_State').fill(data.ManualCustState);
      }
      if (data.ManualCustZip) {
        await this.page.locator('#customerAdd_ZipCode').fill(data.ManualCustZip);
      }
      if (data.ManualCustCountry) {
        await this.setCountryField('#customerAdd_Country', data.ManualCustCountry);
      }
    } else {
      await this.customerAddressTypeDropdown.selectOption({ label: customerAddress });
    }
    await this.waitForLoading();
  }

  // ---------- Country Field Helper ----------
  private async setCountryField(selector: string, value: string): Promise<void> {
    const el = this.page.locator(selector);
    const tag = await el.evaluate((e) => e.tagName.toLowerCase());
    if (tag === 'select') {
      // Try by value first (e.g. "US", "CA"), then by label
      try {
        await el.selectOption({ value });
      } catch {
        await el.selectOption({ label: value });
      }
    } else {
      await el.fill(value);
    }
  }

  // ---------- Product Item Selection ----------
  private async selectProductItem(
    dropdown: Locator,
    productType: string
  ): Promise<void> {
    if (!productType) return;
    if (productType === 'Manual') {
      await dropdown.selectOption({ value: 'manual' });
    } else {
      // Map special Excel names to exact dropdown label text
      const labelMap: Record<string, string> = {
        'Really Thor !! Computer Product': 'Really Thor !! - Computer Products',
      };
      const label = labelMap[productType] || productType;
      await dropdown.selectOption({ label });
    }
    await this.waitForLoading();
  }

  async selectProductItem1(productType: string): Promise<void> {
    await this.selectProductItem(this.product1TypeDropdown, productType);
  }

  async selectProductItem2(productType: string): Promise<void> {
    await this.selectProductItem(this.product2TypeDropdown, productType);
  }

  async selectProductItem3(productType: string): Promise<void> {
    await this.selectProductItem(this.product3TypeDropdown, productType);
  }

  // ---------- Request Type ----------
  async selectRequestType(requestType: string): Promise<void> {
    await this.waitForLoading();
    if (requestType === 'QUOTE') {
      await this.quoteRadio.click();
    } else if (requestType === 'AUDIT') {
      await this.auditRadio.click();
    }
    await this.waitForLoading();
  }

  // ---------- Set Quantity ----------
  async setQuantity(quantityInput: Locator, quantity: string): Promise<void> {
    const currentVal = await quantityInput.inputValue();
    if (currentVal !== quantity) {
      await quantityInput.fill(quantity);
    }
  }

  // ---------- Fill Manual Product Fields ----------
  private async fillManualProductFields(
    skuInput: Locator,
    taxCodeInput: Locator,
    unitPriceInput: Locator,
    quantityInput: Locator,
    sku: string,
    taxCode: string,
    unitPrice: string,
    quantity: string
  ): Promise<void> {
    await skuInput.fill(sku);
    await taxCodeInput.fill(taxCode);
    await unitPriceInput.fill(unitPrice);
    await quantityInput.fill(quantity);
  }

  // ---------- Verify Product Item #1 Data ----------
  async verifyProductItem1Data(data: TestData): Promise<void> {
    // Verify SKU - strip leading zeros and check either direction contains
    const skuValue = await this.product1SKU.inputValue();
    const normalizedActualSku = skuValue.replace(/^0+/, '');
    const normalizedExpectedSku = data.SKU.replace(/^0+/, '');
    const skuMatch =
      normalizedActualSku.includes(normalizedExpectedSku) ||
      normalizedExpectedSku.includes(normalizedActualSku);
    expect(skuMatch, `SKU mismatch: website="${skuValue}" vs excel="${data.SKU}"`).toBeTruthy();

    // Verify Tax Code
    const taxCodeValue = await this.product1TaxCode.inputValue();
    expect(taxCodeValue).toBe(data.TaxCode);

    // Verify Unit Price
    const unitPriceValue = await this.product1UnitPrice.inputValue();
    expect(parseFloat(unitPriceValue)).toBeCloseTo(parseFloat(data.UnitPrice), 2);

    // Verify Quantity
    const quantityValue = await this.product1Quantity.inputValue();
    expect(quantityValue).toBe(data.Quantity);
  }

  // ---------- Calculate Tax ----------
  async clickCalculateTax(): Promise<void> {
    await this.calculateTaxButton.click();
    // Wait for the AJAX/API response
    await this.page.waitForTimeout(5000);
  }

  // ---------- Verify Tax Amount ----------
  async verifyTaxAmount(expectedTaxAmount: string): Promise<void> {
    // Wait for the tax response div to have content
    await this.page.waitForFunction(
      (selector: string) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.trim().length > 0;
      },
      '#totalTaxResponse',
      { timeout: 15000 }
    );

    const fullText = (await this.taxTotalAmount.textContent()) ?? '';

    // Extract numeric tax amount from the response text
    const taxMatch = fullText.match(/[\d]+\.[\d]+/);
    const actualTaxStr = taxMatch ? taxMatch[0] : fullText.replace(/[^0-9.]/g, '').trim();

    const actual = parseFloat(actualTaxStr);
    const expected = parseFloat(expectedTaxAmount);

    expect(actual).toBeCloseTo(expected, 2);
  }

  // ---------- Full Test Case Execution ----------
  async executeTestCase(data: TestData): Promise<void> {
    // 1. Navigate to the page
    await this.navigate();

    // 2. Select Store Model
    await this.selectStoreModel(data.StoreModel, data);

    // 3. Select Customer Address
    await this.selectCustomerAddress(data.CustomerAddress, data);

    // 4. Select Product Item #1
    await this.selectProductItem1(data.ProductItem1);

    // 5. If Product Item #1 is Manual, fill in fields from Excel
    if (data.ProductItem1 === 'Manual') {
      await this.fillManualProductFields(
        this.product1SKU, this.product1TaxCode, this.product1UnitPrice, this.product1Quantity,
        data.SKU, data.TaxCode, data.UnitPrice, data.Quantity
      );
    }

    // 6. Select Product Item #2 (if present)
    if (data.ProductItem2) {
      await this.selectProductItem2(data.ProductItem2);
      // If Product #2 is Manual, fill in fields from the same SKU/TaxCode/UnitPrice/Quantity columns
      if (data.ProductItem2 === 'Manual') {
        await this.fillManualProductFields(
          this.product2SKU, this.product2TaxCode, this.product2UnitPrice, this.product2Quantity,
          data.SKU, data.TaxCode, data.UnitPrice, data.Quantity
        );
      }
    }

    // 7. Select Product Item #3 (if present)
    if (data.ProductItem3) {
      await this.selectProductItem3(data.ProductItem3);
      // If Product #3 is Manual, fill in fields from the same SKU/TaxCode/UnitPrice/Quantity columns
      if (data.ProductItem3 === 'Manual') {
        await this.fillManualProductFields(
          this.product3SKU, this.product3TaxCode, this.product3UnitPrice, this.product3Quantity,
          data.SKU, data.TaxCode, data.UnitPrice, data.Quantity
        );
      }
    }

    // 8. Select Request Type (QUOTE or AUDIT)
    await this.selectRequestType(data.RequestType);

    // 9. Set Quantity for Product #1 if not Manual (Manual already filled above)
    if (data.ProductItem1 !== 'Manual') {
      await this.setQuantity(this.product1Quantity, data.Quantity);
    }

    // 10. Verify Product Item #1 data matches Excel (SKU, TaxCode, UnitPrice, Quantity)
    await this.verifyProductItem1Data(data);

    // 11. Click Calculate Tax
    await this.clickCalculateTax();

    // 12. Verify Tax Total Amount matches Excel expected value
    await this.verifyTaxAmount(data.TaxAmount);
  }
}
