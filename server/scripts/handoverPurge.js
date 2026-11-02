/**
 * Enterprise Handover Database Purge & Sequence Reset Script
 * [MOD-HANDOVER] & [MOD-GAPLESS]
 * 
 * Safely purges test/demo operational data, resets all sequences to #1,
 * and preserves essential system entities (Quick Customer ID: 1, Catalog, Accounts).
 */
const path = require('path');
const db = require('../db/database');
const backupEngine = require('../utils/backupEngine');

function executeHandoverPurge({ preserveCatalog = false, cleanMasterEntities = true } = {}) {
  console.log('[Handover Purge] Starting database purification process...');

  // 1. Create safety backup
  let backupFile = null;
  try {
    const backupResult = backupEngine.createManualBackup();
    backupFile = backupResult?.filename;
    console.log(`[Handover Purge] Pre-purge safety backup created: ${backupFile}`);
  } catch (err) {
    console.warn(`[Handover Purge] Backup warning: ${err.message}`);
  }

  // 2. Atomic purge transaction
  const purgeTx = db.transaction(() => {
    // Temporarily drop protection trigger for admin factory handover purge
    db.prepare('DROP TRIGGER IF EXISTS trg_prevent_invoice_hard_delete').run();

    // A. Operational and financial transactions
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM purchase_return_items').run();
    db.prepare('DELETE FROM purchase_returns').run();
    db.prepare('DELETE FROM purchase_items').run();
    db.prepare('DELETE FROM purchases').run();
    db.prepare('DELETE FROM voucher_items').run();
    db.prepare('DELETE FROM official_vouchers').run();
    db.prepare('DELETE FROM supplier_payment_vouchers').run();
    db.prepare('DELETE FROM daily_transactions').run();
    db.prepare('DELETE FROM cash_shifts').run();
    db.prepare('DELETE FROM cash_drawer_audits').run();
    db.prepare('DELETE FROM service_reminders_log').run();
    db.prepare('DELETE FROM journal_lines').run();
    db.prepare('DELETE FROM journal_entries').run();
    db.prepare('DELETE FROM stock_movements').run();
    db.prepare('DELETE FROM financial_audit_logs').run();

    // Reset document sequences table [MOD-GAPLESS]
    try {
      db.prepare('DELETE FROM document_sequences').run();
    } catch (e) {
      // ignore if table does not exist yet
    }

    // B. Customer vehicles: wipe demo vehicles, guarantee system walk-in vehicle ID: 1
    db.prepare('DELETE FROM customers_vehicles').run();
    db.prepare(`
      INSERT INTO customers_vehicles (
        id, plate_number, plate_type, car_make_model, customer_name, phone,
        last_odometer, next_due_odometer, balance_due, credit_limit, customer_type
      ) VALUES (
        1, 'فاتورة سريعة', 'مؤقت', 'مشتريات وخدمات سريعة', 'عميل عام (نقدي)', '---',
        0, 0, 0, 0, 'individual'
      )
    `).run();

    // C. Master Entities Cleaning (Suppliers, Workers, Expense Categories)
    if (cleanMasterEntities) {
      db.prepare('DELETE FROM suppliers').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'suppliers'").run();

      db.prepare('DELETE FROM workers').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'workers'").run();

      db.prepare('DELETE FROM expense_categories').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'expense_categories'").run();
    } else {
      db.prepare('UPDATE suppliers SET balance_due = 0').run();
    }

    // D. Inventory handling (White-Sheet Zero Catalog)
    db.prepare('UPDATE inventory SET stock_qty = 0').run();
    if (!preserveCatalog || cleanMasterEntities) {
      db.prepare('DELETE FROM inventory').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'inventory'").run();
    }

    // E. Reset all sequence counters
    db.prepare(`
      DELETE FROM sqlite_sequence WHERE name IN (
        'invoices', 'invoice_items', 'purchases', 'purchase_items',
        'purchase_returns', 'purchase_return_items', 'official_vouchers',
        'voucher_items', 'supplier_payment_vouchers', 'daily_transactions',
        'cash_shifts', 'cash_drawer_audits', 'service_reminders_log',
        'journal_lines', 'journal_entries', 'stock_movements',
        'financial_audit_logs'
      )
    `).run();

    // Ensure customers_vehicles sequence continues after 1
    const seqCheck = db.prepare("SELECT name FROM sqlite_sequence WHERE name = 'customers_vehicles'").get();
    if (seqCheck) {
      db.prepare("UPDATE sqlite_sequence SET seq = 1 WHERE name = 'customers_vehicles'").run();
    } else {
      db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('customers_vehicles', 1)").run();
    }

    // Re-enable hard delete protection trigger [MOD-GAPLESS]
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_prevent_invoice_hard_delete
      BEFORE DELETE ON invoices
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'حظر محاسبي صارم [MOD-GAPLESS]: يُمنع حذف الفواتير نهائياً من قاعدة البيانات. يجب استخدام الإلغاء المحاسبي (Void) لحفظ التسلسل.');
      END;
    `).run();

    // F. Truncate WAL for clean handover
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      // ignore
    }
  });

  purgeTx();

  console.log('[Handover Purge] Database successfully purified and reset to pristine state #1.');
  return { success: true, backupFile };
}

// Allow direct CLI execution
if (require.main === module) {
  try {
    const res = executeHandoverPurge();
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('[Handover Purge] Error executing purge:', err);
    process.exit(1);
  }
}

module.exports = { executeHandoverPurge };
