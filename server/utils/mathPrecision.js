/**
 * Math & Financial Precision Utility
 * Handles floating point inaccuracies, safe divisions, currency formatting,
 * and Weighted Average Cost (WAC) calculations with strict defensive checks.
 */

/**
 * Rounds a number to a fixed number of decimal places defensively without floating-point artifacts.
 * @param {number|string} val
 * @param {number} decimals Default is 2 (for standard currency calculation)
 * @returns {number}
 */
function roundMoney(val, decimals = 2) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}

/**
 * Ensures value is a valid finite number, returns fallback otherwise.
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return (!isNaN(num) && isFinite(num)) ? num : fallback;
}

/**
 * Safe division protecting against zero, null, undefined, or NaN denominators.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} fallback
 * @returns {number}
 */
function safeDiv(numerator, denominator, fallback = 0) {
  const n = safeNum(numerator, 0);
  const d = safeNum(denominator, 0);
  if (d === 0) return fallback;
  const res = n / d;
  return (!isNaN(res) && isFinite(res)) ? roundMoney(res) : fallback;
}

/**
 * Calculates Weighted Average Cost (WAC) for inventory restocking.
 * Formula: ((CurrentQty * CurrentCost) + (IncomingQty * IncomingCost)) / (CurrentQty + IncomingQty)
 * Defensive rules:
 * - If current stock is <= 0 (e.g. was out of stock or negative), the new cost is incomingCost.
 * - If incoming qty is <= 0, preserves currentCost.
 * 
 * @param {number} currentQty
 * @param {number} currentCost
 * @param {number} incomingQty
 * @param {number} incomingCost
 * @returns {number} new WAC unit cost
 */
function calcWAC(currentQty, currentCost, incomingQty, incomingCost) {
  const cQty = Math.max(0, safeNum(currentQty, 0));
  const cCost = Math.max(0, safeNum(currentCost, 0));
  const inQty = Math.max(0, safeNum(incomingQty, 0));
  const inCost = Math.max(0, safeNum(incomingCost, 0));

  if (inQty <= 0) return cCost;
  if (cQty <= 0) return roundMoney(inCost);

  const totalCost = (cQty * cCost) + (inQty * inCost);
  const totalQty = cQty + inQty;

  return roundMoney(totalCost / totalQty);
}

/**
 * Calculates line subtotal: (qty * unitPrice) + laborFee
 */
function calcLineSubtotal(qty, unitPrice, laborFee = 0) {
  const q = Math.max(0, safeNum(qty, 1));
  const p = Math.max(0, safeNum(unitPrice, 0));
  const l = Math.max(0, safeNum(laborFee, 0));
  return roundMoney((q * p) + l);
}

/**
 * Calculates net invoice total defensively.
 */
function calcNetTotal(itemsTotal, laborTotal = 0, scrapDeduction = 0, discount = 0) {
  const iTot = Math.max(0, safeNum(itemsTotal, 0));
  const lTot = Math.max(0, safeNum(laborTotal, 0));
  const sDed = Math.max(0, safeNum(scrapDeduction, 0));
  const disc = Math.max(0, safeNum(discount, 0));

  const gross = iTot + lTot;
  const deductions = sDed + disc;
  return roundMoney(Math.max(0, gross - deductions));
}

/**
 * Formats a monetary number with thousands separators.
 * e.g., 25000 -> "25,000 ر.ي"
 */
function formatMoney(amount, currency = 'ر.ي') {
  const num = roundMoney(amount);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

module.exports = {
  roundMoney,
  safeNum,
  safeDiv,
  calcWAC,
  calcLineSubtotal,
  calcNetTotal,
  formatMoney,
};
