/**
 * Helper utility functions for Quick Lube POS (Yemeni Market)
 */

function formatDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDate(dateStr, days = 60) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + Number(days));
  return formatDate(d);
}

function generateInvoiceNumber(db) {
  const today = formatDate().replace(/-/g, '');
  const prefix = `INV-${today}-`;
  
  const lastInvoice = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastInvoice && lastInvoice.invoice_number) {
    const parts = lastInvoice.invoice_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

function calculateRecommendedKm(viscosity, packSize) {
  // Default interval is 3,000 km for all categories in the local market as configured
  return 3000;
}

function validateYemeniPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.trim().replace(/[\s\-\+]/g, '');
  // Matches local 9 digits starting with 70, 71, 73, 77, 78 or with 967 prefix
  const yemeniRegex = /^(?:(?:\+|00)?967)?(7[01378]\d{7})$/;
  return yemeniRegex.test(cleaned);
}

function normalizeYemeniPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/[\s\-\+]/g, '');
  const match = cleaned.match(/(?:(?:\+|00)?967)?(7[01378]\d{7})$/);
  return match ? match[1] : cleaned;
}

module.exports = {
  formatDate,
  addDaysToDate,
  generateInvoiceNumber,
  calculateRecommendedKm,
  validateYemeniPhone,
  normalizeYemeniPhone,
};
