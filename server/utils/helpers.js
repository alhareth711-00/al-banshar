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

  // Ensure document_sequences table exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS document_sequences (
      doc_type TEXT NOT NULL,
      seq_date TEXT NOT NULL,
      last_seq INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (doc_type, seq_date)
    )
  `).run();

  // Initialize today's sequence if not already present
  const existing = db.prepare('SELECT last_seq FROM document_sequences WHERE doc_type = ? AND seq_date = ?').get('invoice', today);

  if (!existing) {
    // Determine highest sequence currently in invoices for today to prevent collision with any existing records
    const lastInvoice = db.prepare(`
      SELECT invoice_number FROM invoices 
      WHERE invoice_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let startingSeq = 0;
    if (lastInvoice && lastInvoice.invoice_number) {
      const parts = lastInvoice.invoice_number.split('-');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) startingSeq = parsed;
    }

    db.prepare(`
      INSERT OR IGNORE INTO document_sequences (doc_type, seq_date, last_seq)
      VALUES ('invoice', ?, ?)
    `).run(today, startingSeq);
  }

  // Atomic increment with RETURNING ensuring gapless concurrency protection [MOD-GAPLESS]
  const row = db.prepare(`
    UPDATE document_sequences 
    SET last_seq = last_seq + 1 
    WHERE doc_type = 'invoice' AND seq_date = ?
    RETURNING last_seq
  `).get(today);

  const nextSeq = row?.last_seq || 1;
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

/**
 * Retrieves the latest recorded transaction timestamp in the database across core transactional tables.
 * Used by [MOD-CHRONO-GUARD] to enforce the monotonic clock invariant and block system clock rollbacks.
 */
function getLatestSystemTimestamp(db) {
  try {
    const row = db.prepare(`
      SELECT MAX(ts) AS max_ts FROM (
        SELECT MAX(created_at) AS ts FROM invoices WHERE is_voided = 0
        UNION ALL
        SELECT MAX(created_at) AS ts FROM official_vouchers WHERE status != 'voided'
        UNION ALL
        SELECT MAX(created_at) AS ts FROM journal_entries
        UNION ALL
        SELECT MAX(opened_at) AS ts FROM cash_shifts
      )
    `).get();
    return row?.max_ts || null;
  } catch (err) {
    return null;
  }
}

/**
 * Validates that the system clock or custom incoming timestamp has not regressed/rolled back [MOD-CHRONO-GUARD].
 * Protects against rogue operators backdating invoices or tampering with the OS date.
 * 
 * @param {object} db Database instance
 * @param {string|null} incomingCreatedAt Optional user-provided timestamp
 * @param {number} gracePeriodSeconds Allowable clock skew margin (default 60 seconds)
 * @returns {boolean} True if clock is valid, throws security Error otherwise
 */
function validateSystemClock(db, incomingCreatedAt = null, gracePeriodSeconds = 60) {
  const maxTs = getLatestSystemTimestamp(db);
  if (!maxTs) return true; // Pristine database state #1

  // Current local SQLite timestamp
  const nowRow = db.prepare("SELECT datetime('now', 'localtime') AS current_now").get();
  const currentNow = incomingCreatedAt || nowRow?.current_now;
  if (!currentNow) return true;

  const maxDate = new Date(maxTs.replace(' ', 'T')).getTime();
  const nowDate = new Date(currentNow.replace(' ', 'T')).getTime();

  if (!isNaN(maxDate) && !isNaN(nowDate)) {
    const gracePeriodMs = gracePeriodSeconds * 1000;
    if (nowDate < (maxDate - gracePeriodMs)) {
      // Record defensive audit incident
      try {
        db.prepare(`
          INSERT INTO financial_audit_logs (
            action, entity_type, entity_id, old_data, new_data, performed_by, created_at
          ) VALUES (?, 'system', NULL, ?, ?, 'security_sentinel', datetime('now', 'localtime'))
        `).run(
          'CHRONO_ROLLBACK_ATTEMPT_BLOCKED',
          JSON.stringify({ last_recorded_timestamp: maxTs }),
          JSON.stringify({ attempted_timestamp: currentNow, drift_seconds: Math.round((maxDate - nowDate) / 1000) })
        );
      } catch (auditErr) {
        // Non-fatal
      }

      throw new Error(`حظر أمني [MOD-CHRONO-GUARD]: تم اكتشاف تراجع في ساعة النظام أو تلاعب في تاريخ الجهاز (${currentNow} يسبق آخر حركة موثقة ${maxTs}). تم إيقاف المعاملة لحماية نزاهة السجلات الجنائية والمحاسبية.`);
    }
  }

  return true;
}

module.exports = {
  formatDate,
  addDaysToDate,
  generateInvoiceNumber,
  calculateRecommendedKm,
  validateYemeniPhone,
  normalizeYemeniPhone,
  getLatestSystemTimestamp,
  validateSystemClock,
};
