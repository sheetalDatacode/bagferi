/**
 * Utility functions for tax calculations (GST)
 * Standard GST rate in India is 18% for services
 */

/**
 * Calculates the GST amount for a given base amount
 * @param {number} amount - The base amount
 * @param {number} gstRate - The GST rate in percentage (default 18)
 * @returns {number} The calculated GST amount (rounded)
 */
export const calculateGstAmount = (amount, gstRate = 18) => {
    if (!amount || isNaN(amount)) return 0;
    return Math.round((amount * gstRate) / 100);
};

/**
 * Calculates the total amount including GST
 * @param {number} amount - The base amount
 * @param {number} gstRate - The GST rate in percentage (default 18)
 * @returns {number} The total amount (base + GST)
 */
export const getTotalWithGst = (amount, gstRate = 18) => {
    if (!amount || isNaN(amount)) return 0;
    return amount + calculateGstAmount(amount, gstRate);
};
