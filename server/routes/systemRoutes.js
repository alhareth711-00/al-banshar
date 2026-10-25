const express = require('express');
const router = express.Router();
const db = require('../db/database');
const backupEngine = require('../utils/backupEngine');
const { asyncHandler, AppError } = require('../utils/errorHandler');

/**
 * Factory Reset API (تصفير البيانات وتجهيز النظام لعميل جديد)
 * POST /api/system/factory-reset
 * Body: { mode: 'preserve_catalog' | 'full_wipe', confirmation_word: 'تصفير' }
 */
router.post('/factory-reset', asyncHandler(async (req, res) => {
  const { mode = 'preserve_catalog', confirmation_word } = req.body;

  if (!confirmation_word || confirmation_word.trim() !== 'تصفير') {
    throw new AppError('يرجى كتابة كلمة "تصفير" للتأكيد على تفريغ وتجهيز النظام', 400);
  }

  // 1. Safety First: Automatic pre-reset backup before wiping anything
  let backupResult = null;
  try {
    backupResult = backupEngine.createManualBackup();
    console.log('[System Factory Reset] Pre-reset safety snapshot created:', backupResult);
  } catch (backupErr) {
    console.warn('[System Factory Reset] Pre-reset backup warning:', backupErr.message);
  }

  // 2. Execute Atomic SQLite Transaction for Factory Reset
  const resetTx = db.transaction(() => {
    // Delete operational and financial records
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM purchase_return_items').run();
    db.prepare('DELETE FROM purchase_returns').run();
    db.prepare('DELETE FROM purchase_items').run();
    db.prepare('DELETE FROM purchases').run();
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

    // Clear demo customer vehicles and debts
    db.prepare('DELETE FROM customers_vehicles').run();

    // Reset supplier debt balances to 0
    db.prepare('UPDATE suppliers SET balance_due = 0').run();

    // Reset sequence counters for cleared transaction tables
    db.prepare(`
      DELETE FROM sqlite_sequence WHERE name IN (
        'invoices', 'invoice_items', 'purchases', 'purchase_items',
        'purchase_returns', 'purchase_return_items', 'official_vouchers',
        'supplier_payment_vouchers', 'daily_transactions', 'cash_shifts',
        'cash_drawer_audits', 'service_reminders_log', 'journal_lines',
        'journal_entries', 'stock_movements', 'financial_audit_logs',
        'customers_vehicles'
      )
    `).run();

    if (mode === 'full_wipe') {
      // Full Wipe: Also remove all inventory items
      db.prepare('DELETE FROM inventory').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'inventory'").run();
    } else {
      // Preserve Catalog (Default): Zero out stock quantities while keeping catalog, specs & prices
      db.prepare('UPDATE inventory SET stock_qty = 0').run();
    }

    // Checkpoint WAL and clean up DB state
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      // ignore
    }
  });

  resetTx();

  res.json({
    success: true,
    message: mode === 'full_wipe'
      ? 'تم تصفير النظام بالكامل بنجاح وتجهيزه كنسخة بيضاء من الصفر.'
      : 'تم تصفير العمليات والفواتير والديون بنجاح، وتجهيز المخزون برصيد 0 مع الحفاظ على كتالوج الأصناف والأسعار.',
    backup: backupResult,
    mode,
  });
}));

module.exports = router;
