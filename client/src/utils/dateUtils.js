/**
 * Date Utilities for Al-Banshar POS/ERP System.
 * Guarantees local device/system date formatting (YYYY-MM-DD),
 * preventing the midnight UTC shift bug (where toISOString shifts date to yesterday between 12:00 AM and 03:00 AM).
 */

export function getLocalTodayDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDateArabic(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
