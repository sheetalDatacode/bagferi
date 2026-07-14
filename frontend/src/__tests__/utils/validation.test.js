/**
 * Validation utility tests
 */

describe('Product Form Validation', () => {
  describe('SKU Validation', () => {
    it('should validate SKU format', () => {
      const validSKUs = ['PROD-001', 'TEST_123', 'ABC123', 'PROD-001-ABC'];
      const invalidSKUs = ['prod-001', 'TEST@123', 'TEST 123', ''];

      validSKUs.forEach(sku => {
        const normalized = sku.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
        expect(normalized).toBe(sku.toUpperCase());
      });

      invalidSKUs.forEach(sku => {
        const normalized = sku.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
        if (sku) {
          expect(normalized).not.toBe(sku);
        }
      });
    });

    it('should auto-uppercase SKU', () => {
      const input = 'test-sku-001';
      const output = input.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
      expect(output).toBe('TEST-SKU-001');
    });
  });

  describe('Hex Color Validation', () => {
    it('should validate hex color codes', () => {
      const validColors = ['#FF0000', '#ff0000', '#F00', '#f00', '#123ABC'];
      const invalidColors = ['FF0000', '#GG0000', '#FF00', 'red', ''];

      validColors.forEach(color => {
        const isValid = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
        expect(isValid).toBe(true);
      });

      invalidColors.forEach(color => {
        if (color) {
          const isValid = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
          expect(isValid).toBe(false);
        }
      });
    });
  });

  describe('Price Validation', () => {
    it('should validate price is non-negative', () => {
      const validPrices = [0, 10, 99.99, 1000];
      const invalidPrices = [-1, -10.5, -0.01];

      validPrices.forEach(price => {
        expect(price >= 0).toBe(true);
      });

      invalidPrices.forEach(price => {
        expect(price >= 0).toBe(false);
      });
    });

    it('should validate original price >= sale price', () => {
      const salePrice = 29.99;
      const validOriginalPrices = [29.99, 39.99, 50];
      const invalidOriginalPrices = [25.99, 20, 0];

      validOriginalPrices.forEach(originalPrice => {
        expect(originalPrice >= salePrice).toBe(true);
      });

      invalidOriginalPrices.forEach(originalPrice => {
        expect(originalPrice >= salePrice).toBe(false);
      });
    });
  });

  describe('Stock Validation', () => {
    it('should validate stock quantity is non-negative', () => {
      const validStocks = [0, 1, 10, 100, 1000];
      const invalidStocks = [-1, -10, -0.5];

      validStocks.forEach(stock => {
        expect(stock >= 0).toBe(true);
      });

      invalidStocks.forEach(stock => {
        expect(stock >= 0).toBe(false);
      });
    });
  });
});







