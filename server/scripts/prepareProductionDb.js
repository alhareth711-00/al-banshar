/**
 * Al-Banshar PRO - Prepare Production Clean Database
 * Populates standard catalog (oils, filters, tires, batteries, workshop services)
 * Ensures 0 past invoices, 0 past transactions, 0 test shifts.
 * Resets invoice and voucher sequences so first invoice is #1.
 */

const db = require('../db/database');
const { initDb } = require('../db/init');

function prepareProductionDb() {
  console.log('[Production DB] Initializing clean production database...');

  // 1. Initialize schema & chart of accounts
  initDb();

  const runClean = db.transaction(() => {
    // Temporarily drop protection trigger for clean preparation
    db.prepare('DROP TRIGGER IF EXISTS trg_prevent_invoice_hard_delete').run();

    // 2. Clear all operational transaction tables
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
    db.prepare('DELETE FROM document_sequences').run();

    // 3. Reset sequences
    db.prepare(`
      DELETE FROM sqlite_sequence WHERE name IN (
        'invoices', 'invoice_items', 'purchases', 'purchase_items',
        'purchase_returns', 'purchase_return_items', 'official_vouchers',
        'voucher_items', 'supplier_payment_vouchers', 'daily_transactions',
        'cash_shifts', 'cash_drawer_audits', 'service_reminders_log',
        'journal_entries', 'journal_lines', 'stock_movements'
      )
    `).run();

    // 4. Ensure walk-in general customer #1
    db.prepare('DELETE FROM customers_vehicles WHERE id != 1').run();
    const generalCustomer = db.prepare('SELECT id FROM customers_vehicles WHERE id = 1').get();
    if (!generalCustomer) {
      db.prepare(`
        INSERT INTO customers_vehicles (
          id, plate_number, plate_type, car_make_model, customer_name, phone,
          last_odometer, next_due_odometer, balance_due, credit_limit, customer_type
        ) VALUES (
          1, 'فاتورة سريعة', 'مؤقت', 'مشتريات وخدمات سريعة', 'عميل عام (نقدي)', '---',
          0, 0, 0, 0, 'individual'
        )
      `).run();
    }

    // 5. Populate standard Yemeni workshop catalog
    db.prepare('UPDATE inventory SET stock_qty = 0').run();
    db.prepare('DELETE FROM inventory').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'inventory'").run();

    const insertInv = db.prepare(`
      INSERT INTO inventory (
        id, sku, barcode, name, category, item_type, brand, viscosity, pack_size,
        tire_battery_spec, warranty_months, cost_price, sell_price,
        stock_qty, min_stock_alert, location_shelf, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    // Standard Oils (معيار السوق اليمني)
    insertInv.run(1, 'OIL-TOY-20W50-4L', '62810010101', 'زيت تويوتا أصلي معدني 20W-50 (دبة 4 لتر)', 'oil', 'product', 'تويوتا', '20W-50', '4L', null, 0, 22000, 26000, 10, 4, 'رف الزيوت A1', 'زيت تويوتا دبة 4 لتر ذهبي');
    insertInv.run(2, 'OIL-TOY-20W50-1L', '62810010102', 'زيت تويوتا أصلي معدني 20W-50 (علبة 1 لتر)', 'oil', 'product', 'تويوتا', '20W-50', '1L', null, 0, 5800, 7000, 24, 6, 'رف الزيوت A1', 'علب لتر تويوتا');
    insertInv.run(3, 'OIL-TOY-5W30-4L', '62810010103', 'زيت تويوتا تخليقي بالكامل 5W-30 (دبة 4 لتر)', 'oil', 'product', 'تويوتا', '5W-30', '4L', null, 0, 34000, 40000, 8, 3, 'رف الزيوت A2', 'زيت تويوتا فضي تخليقي');
    insertInv.run(4, 'OIL-CAS-MAG-10W40-4L', '62810020101', 'زيت كاسترول ماجنتك نصف تخليقي 10W-40 (دبة 4 لتر)', 'oil', 'product', 'كاسترول', '10W-40', '4L', null, 0, 26000, 31000, 12, 4, 'رف الزيوت B1', 'كاسترول ماجنتك حماية فورية');
    insertInv.run(5, 'OIL-CAS-MAG-10W40-1L', '62810020102', 'زيت كاسترول ماجنتك 10W-40 (علبة 1 لتر)', 'oil', 'product', 'كاسترول', '10W-40', '1L', null, 0, 6800, 8200, 18, 6, 'رف الزيوت B1', 'كاسترول لتر ماجنتك');
    insertInv.run(6, 'OIL-CAS-GTX-20W50-1L', '62810020103', 'زيت كاسترول GTX معدني 20W-50 (علبة 1 لتر)', 'oil', 'product', 'كاسترول', '20W-50', '1L', null, 0, 5500, 6800, 15, 5, 'رف الزيوت B2', 'كاسترول أبيض معدني');
    insertInv.run(7, 'OIL-SHL-HX7-10W40-4L', '62810030101', 'زيت شل هيلكس HX7 نصف تخليقي 10W-40 (دبة 4 لتر)', 'oil', 'product', 'شل', '10W-40', '4L', null, 0, 25000, 29500, 10, 4, 'رف الزيوت C1', 'شل هيلكس أزرق');
    insertInv.run(8, 'OIL-SHL-ULT-5W30-4L', '62810030102', 'زيت شل هيلكس الترا تخليقي بالكامل 5W-30 (دبة 4 لتر)', 'oil', 'product', 'شل', '5W-30', '4L', null, 0, 36000, 42000, 6, 2, 'رف الزيوت C2', 'شل هيلكس الترا رمادي');
    insertInv.run(9, 'OIL-TOT-7000-10W40-4L', '62810040101', 'زيت توتال كوارتز 7000 10W-40 (دبة 4 لتر)', 'oil', 'product', 'توتال', '10W-40', '4L', null, 0, 24500, 29000, 8, 3, 'رف الزيوت D1', 'توتال كوارتز فضي');
    insertInv.run(10, 'OIL-TOT-9000-5W30-5L', '62810040102', 'زيت توتال كوارتز 9000 تخليقي 5W-30 (دبة 5 لتر)', 'oil', 'product', 'توتال', '5W-30', '5L', null, 0, 42000, 49000, 5, 2, 'رف الزيوت D2', 'توتال ذهبي تخليقي');
    insertInv.run(11, 'OIL-SQR-20W50-4L', '62810050101', 'زيت صقر الوطني الممتاز 20W-50 (دبة 4 لتر)', 'oil', 'product', 'صقر', '20W-50', '4L', null, 0, 17500, 21000, 16, 5, 'رف الزيوت E1', 'زيت صقر محلي ممتاز');
    insertInv.run(12, 'OIL-SQR-20W50-1L', '62810050102', 'زيت صقر الوطني 20W-50 (علبة 1 لتر)', 'oil', 'product', 'صقر', '20W-50', '1L', null, 0, 4500, 5500, 25, 8, 'رف الزيوت E1', 'صقر علبة 1 لتر');
    insertInv.run(13, 'OIL-SHL-BULK', '62810030199', 'زيت محرك شل فلت معبأ من البرميل (باللتر)', 'oil', 'product', 'شل', '15W-40', 'bulk_liter', null, 0, 4800, 6200, 150, 30, 'براميل الغيار', 'زيت برميل معبأ باللتر');

    // Standard Filters
    insertInv.run(14, 'FLT-TOY-OIL-01', '90915-YZZE1', 'فلتر زيت تويوتا أصلي تايلندي (هايلوكس/برادو/لاند)', 'filter', 'product', 'تويوتا', null, 'unit', null, 0, 3200, 4500, 20, 5, 'قسم الفلاتر F1', 'فلتر زيت تويوتا أصلي');
    insertInv.run(15, 'FLT-HYU-OIL-01', '26300-35505', 'فلتر زيت هيونداي/كيا كوري أصلي (سنتافي/توسان/سبورتاج)', 'filter', 'product', 'هيونداي', null, 'unit', null, 0, 3000, 4200, 18, 5, 'قسم الفلاتر F2', 'فلتر زيت هيونداي كوري');
    insertInv.run(16, 'FLT-TOY-AIR-HLX', '17801-0C010', 'فلتر هواء محرك تويوتا هايلوكس دبل أصلي', 'filter', 'product', 'تويوتا', null, 'unit', null, 0, 4500, 6500, 10, 3, 'قسم الفلاتر F3', 'فلتر هواء هايلوكس');
    insertInv.run(17, 'FLT-ACC-CABIN', '87139-0K010', 'فلتر مكيف كربوني مضاد للروائح والغبار', 'filter', 'product', 'عام', null, 'unit', null, 0, 3500, 5000, 12, 3, 'قسم الفلاتر F4', 'فلتر مكيف عام');

    // Standard Tires & Batteries
    insertInv.run(18, 'TIRE-BRD-2656517', '49619148001', 'إطار بريدجستون دويلر ياباني 265/65R17', 'tire', 'product', 'بريدجستون', null, 'unit', '265/65R17', 12, 82000, 96000, 6, 2, 'مستودع الكفرات', 'كفر بريدجستون ياباني');
    insertInv.run(19, 'TIRE-HNK-2055516', '88085634001', 'إطار هانكوك كوري ممتاز 205/55R16', 'tire', 'product', 'هانكوك', null, 'unit', '205/55R16', 12, 48000, 57000, 8, 2, 'مستودع الكفرات', 'كفر هانكوك كوري');
    insertInv.run(20, 'BAT-BQR-70AH', '8801234070', 'بطارية باقر 70 أمبير كوري جافة صيانة مجانية', 'battery', 'product', 'باقر', null, 'unit', '70Ah', 12, 68000, 79000, 5, 2, 'قسم البطاريات', 'بطارية باقر 70 أمبير كوري');
    insertInv.run(21, 'BAT-AML-55AH', '4901234055', 'بطارية أمل 55 أمبير ياباني تجميع وطني', 'battery', 'product', 'أمل', null, 'unit', '55Ah', 12, 49000, 58000, 6, 2, 'قسم البطاريات', 'بطارية أمل 55 أمبير');

    // Standard Workshop Services
    insertInv.run(22, 'SRV-OIL-CHG', 'SRV001', 'أجرة مصنعية غيار زيت وفلتر', 'service', 'service', 'خدمات المركز', null, 'unit', null, 0, 0, 1500, 9999, 0, 'حفرة الغيار', 'أجرة يد غيار زيت مع فحص الرديتر وسوائل المركبة');
    insertInv.run(23, 'SRV-TIRE-PATCH', 'SRV002', 'رقعة تيوبلس ألماني حراري مع فحص تسريب', 'service', 'service', 'خدمات المركز', null, 'unit', null, 0, 300, 2500, 9999, 0, 'ماكينة البنشر', 'رقعة تيوبلس ألماني حراري');
    insertInv.run(24, 'SRV-WHEEL-BAL', 'SRV003', 'ترصيص أرضي ليزر ديجيتال (للكفر الواحد)', 'service', 'service', 'خدمات المركز', null, 'unit', null, 0, 200, 2000, 9999, 0, 'جهاز الترصيص', 'ترصيص كمبيوتر مع أوزان الرصاص');
    insertInv.run(25, 'SRV-CHASSIS-LUBE', 'SRV004', 'تشحيم شاسيه ومفاصل وعمود كردان كامل', 'service', 'service', 'خدمات المركز', null, 'unit', null, 0, 500, 3500, 9999, 0, 'رافعة التشحيم', 'تشحيم شحم عالي الحرارة');
    insertInv.run(26, 'SRV-DIAG-COMP', 'SRV005', 'فحص كمبيوتر سيارات شامل OBD2 وكشف أعطال', 'service', 'service', 'خدمات المركز', null, 'unit', null, 0, 0, 5000, 9999, 0, 'جهاز الفحص', 'قراءة ومسح أكواد الأعطال وفحص الحساسات');

    // 6. Reset opening balance journal entry for inventory capital
    const totalOpeningCost = db.prepare("SELECT SUM(cost_price * stock_qty) as total FROM inventory WHERE item_type = 'product'").get().total || 0;
    console.log(`[Production DB] Standard catalog seeded with ${26} items. Total Opening Inventory Value: ${totalOpeningCost.toLocaleString()} YER.`);

    // Re-enable hard delete protection trigger [MOD-GAPLESS]
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_prevent_invoice_hard_delete
      BEFORE DELETE ON invoices
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'حظر محاسبي صارم [MOD-GAPLESS]: يُمنع حذف الفواتير نهائياً من قاعدة البيانات. يجب استخدام الإلغاء المحاسبي (Void) لحفظ التسلسل.');
      END;
    `).run();
  });

  runClean();

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {}

  console.log('[Production DB] Database is now 100% PRISTINE, CLEAN, AND READY FOR FIELD HANDOVER! ✅');
}

if (require.main === module) {
  prepareProductionDb();
}

module.exports = { prepareProductionDb };
