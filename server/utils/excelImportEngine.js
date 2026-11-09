const XLSX = require('xlsx');
const { postInventoryOpeningBalance } = require('./accountingEngine');

// Strict category mapping as decided in alignment
const CATEGORY_MAP = {
  'زيت': 'oil',
  'oil': 'oil',
  'فلتر': 'filter',
  'filter': 'filter',
  'إطار': 'tire',
  'كفر': 'tire',
  'tire': 'tire',
  'بطارية': 'battery',
  'battery': 'battery',
  'أكسسوار': 'accessory',
  'اكسسوار': 'accessory',
  'accessory': 'accessory',
  'خدمة': 'service',
  'service': 'service',
};

/**
 * Generates an official Excel Template (.xlsx) for inventory import
 */
function generateTemplateBuffer() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template data with guidance examples
  const headers = [
    'اسم الصنف (مطلوب)',
    'الفئة (زيت/فلتر/إطار/بطارية/أكسسوار/خدمة)',
    'الماركة',
    'اللزوجة أو المقاس',
    'حجم العبوة (1L/4L/5L/20L/حبة)',
    'الباركود (اختياري)',
    'رمز الصنف SKU (اختياري)',
    'سعر التكلفة (ريال)',
    'سعر البيع (ريال)',
    'الرصيد الافتتاحي (كمية المخزون)',
    'حد التنبيه الأدنى',
    'موقع الرف',
  ];

  const sampleRows = [
    [
      'زيت بترومين A-1 تخليقي 5W-30 (1L)',
      'زيت',
      'بترومين',
      '5W-30',
      '1L',
      '628100123456',
      'SKU-PET-5W30',
      4500,
      5500,
      48,
      10,
      'A-01',
    ],
    [
      'فلتر زيت هايلوكس ديزل أصلي',
      'فلتر',
      'تويوتا',
      '',
      'حبة',
      '90915-YZZD2',
      'SKU-FLT-HILUX',
      1800,
      2500,
      30,
      5,
      'B-03',
    ],
    [
      'إطار هانكوك 205/65R15 كوري',
      'إطار',
      'هانكوك',
      '205/65R15',
      'حبة',
      '880856312345',
      'SKU-TIRE-HK205',
      35000,
      42000,
      8,
      2,
      'R-01',
    ],
    [
      'بطارية إنديكو 50 أمبير جافة',
      'بطارية',
      'إنديكو',
      '50Ah',
      'حبة',
      '880912345678',
      'SKU-BAT-IND50',
      48000,
      58000,
      5,
      1,
      'BAT-01',
    ],
    [
      'خدمة غيار زيت وتشحيم سريع',
      'خدمة',
      'المركز',
      '',
      'خدمة',
      '',
      'SRV-LUBE-01',
      0,
      1500,
      0,
      0,
      'حفرة 1',
    ],
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 35 }, // اسم الصنف
    { wch: 22 }, // الفئة
    { wch: 15 }, // الماركة
    { wch: 18 }, // اللزوجة
    { wch: 18 }, // الحجم
    { wch: 20 }, // الباركود
    { wch: 18 }, // SKU
    { wch: 16 }, // التكلفة
    { wch: 16 }, // البيع
    { wch: 20 }, // الرصيد
    { wch: 15 }, // التنبيه
    { wch: 14 }, // الرف
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'نموذج الأصناف');

  // Sheet 2: Strict Categories Guide
  const guideData = [
    ['الفئة المعتمدة في النظام', 'المعنى والنوع', 'أمثلة'],
    ['زيت', 'زيوت محركات السيارات والتروس والفرامل', 'بترومين، كاسترول، موبيل، تويوتا، لوك أويل'],
    ['فلتر', 'فلاتر الزيت، الهواء، والمكيف والديزل', 'تويوتا، شيري، نيسان، هيونداي'],
    ['إطار', 'كفرات وإطارات السيارات بمختلف المقاسات', 'هانكوك، يوكوهاما، دنلوب، سيلون'],
    ['بطارية', 'بطاريات السيارات الجافة والمائية', 'هانكوك، إنديكو، سوبر باور'],
    ['أكسسوار', 'معطرات، مياه رديتر، مساحات، لمبات، فيوزات', 'ماء رديتر تويوتا أحمر، مساحات بوش'],
    ['خدمة', 'أجور وفحوصات اليد العاملة والخدمات', 'خدمة غيار زيت، فحص ضغط هواء، ترصيص'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'دليل الفئات المعتمدة');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Normalizes pack_size to strictly match SQLite CHECK constraint:
 * ('1L', '4L', '5L', '20L', '25L', 'bulk_liter', 'unit', 'carton')
 */
function normalizePackSize(rawSize, category) {
  if (!rawSize) return category === 'oil' ? '1L' : 'unit';
  const clean = String(rawSize).trim();
  const upper = clean.toUpperCase();

  if (['1L', '4L', '5L', '20L', '25L', 'bulk_liter', 'unit', 'carton'].includes(clean)) {
    return clean;
  }
  if (['1L', '4L', '5L', '20L', '25L'].includes(upper)) {
    return upper;
  }

  if (clean.includes('4')) return '4L';
  if (clean.includes('5')) return '5L';
  if (clean.includes('20')) return '20L';
  if (clean.includes('25')) return '25L';
  if (clean.includes('1') || clean.includes('علبة') || clean.includes('لتر')) return '1L';
  if (clean.includes('كرتون') || clean.includes('شدة')) return 'carton';
  if (clean.includes('صب') || clean.includes('برميل')) return 'bulk_liter';

  return category === 'oil' ? '1L' : 'unit';
}

/**
 * Normalizes an Arabic or English column header to a known standard key
 */
function normalizeHeader(key) {
  if (!key || typeof key !== 'string') return '';
  const clean = key.trim().toLowerCase().replace(/[\(\)\[\]_]/g, '');

  if (clean.includes('sku') || clean.includes('رمز الصنف') || clean.includes('كود الصنف')) return 'sku';
  if (clean.includes('اسم') || clean.includes('name') || clean.includes('الصنف')) return 'name';
  if (clean.includes('فئة') || clean.includes('category') || clean.includes('نوع الصنف')) return 'category';
  if (clean.includes('ماركة') || clean.includes('براند') || clean.includes('brand') || clean.includes('شركة')) return 'brand';
  if (clean.includes('لزوجة') || clean.includes('مقاس') || clean.includes('viscosity') || clean.includes('spec')) return 'viscosity';
  if (clean.includes('عبوة') || clean.includes('حجم') || clean.includes('pack') || clean.includes('وحدة')) return 'pack_size';
  if (clean.includes('باركود') || clean.includes('barcode')) return 'barcode';
  if (clean.includes('sku') || clean.includes('رمز') || clean.includes('كود')) return 'sku';
  if (clean.includes('تكلفة') || clean.includes('شراء') || clean.includes('cost')) return 'cost_price';
  if (clean.includes('بيع') || clean.includes('سعر') || clean.includes('price') || clean.includes('sell')) return 'sell_price';
  if (clean.includes('رصيد') || clean.includes('كمية') || clean.includes('مخزون') || clean.includes('stock') || clean.includes('qty')) return 'stock_qty';
  if (clean.includes('تنبيه') || clean.includes('حد') || clean.includes('min')) return 'min_stock_alert';
  if (clean.includes('رف') || clean.includes('موقع') || clean.includes('shelf') || clean.includes('location')) return 'location_shelf';

  return clean;
}

/**
 * Parses and validates an uploaded Excel/CSV buffer against existing database inventory
 */
function parseAndValidate(buffer, db) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('الملف المرفوع فارغ أو لا يحتوي على أي صفوف قابلة للقراءة');
  }

  // Pre-fetch all active inventory keys for fast duplicate detection
  const existingItems = db.prepare(`
    SELECT id, sku, barcode, name, cost_price, sell_price, stock_qty
    FROM inventory
    WHERE is_active = 1
  `).all();

  const existingSkus = new Set(existingItems.map((i) => (i.sku || '').toUpperCase()).filter(Boolean));
  const existingBarcodes = new Set(existingItems.map((i) => (i.barcode || '').trim()).filter(Boolean));
  const existingNames = new Set(existingItems.map((i) => (i.name || '').trim().toLowerCase()).filter(Boolean));

  const parsedRows = [];
  let validNewCount = 0;
  let skippedDuplicateCount = 0;
  let errorCount = 0;
  let totalOpeningCost = 0;
  let totalRetailValue = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row

    // Normalize keys
    const item = {};
    for (const [k, v] of Object.entries(raw)) {
      const normKey = normalizeHeader(k);
      if (normKey) {
        item[normKey] = typeof v === 'string' ? v.trim() : v;
      }
    }

    const name = (item.name || '').trim();
    const rawCategory = (item.category || '').trim().toLowerCase();
    const brand = (item.brand || 'عام').trim();
    const viscosity = (item.viscosity || '').trim();
    const packSize = (item.pack_size || 'حبة').trim();
    const barcode = item.barcode ? String(item.barcode).trim() : '';
    let sku = item.sku ? String(item.sku).trim().toUpperCase() : '';

    const costPrice = Math.max(0, Number(item.cost_price) || 0);
    const sellPrice = Math.max(0, Number(item.sell_price) || 0);
    const stockQty = Math.max(0, Number(item.stock_qty) || 0);
    const minAlert = Math.max(1, Number(item.min_stock_alert) || 5);
    const shelf = (item.location_shelf || '').trim();

    // 1. Validation: Name required
    if (!name) {
      errorCount++;
      parsedRows.push({
        rowNum,
        name: '(اسم فارغ)',
        status: 'error',
        errorReason: 'اسم الصنف فارغ أو غير موجود',
      });
      continue;
    }

    // 2. Strict Category Validation
    const mappedCategory = CATEGORY_MAP[rawCategory];
    if (!mappedCategory) {
      errorCount++;
      parsedRows.push({
        rowNum,
        name,
        rawCategory,
        status: 'error',
        errorReason: `الفئة "${rawCategory || 'فارغة'}" غير معتمدة. الفئات المقبولة: زيت، فلتر، إطار، بطارية، أكسسوار، خدمة.`,
      });
      continue;
    }

    // 3. Duplicate check (Barcode, SKU, or Name)
    let isDuplicate = false;
    let dupReason = '';

    if (barcode && existingBarcodes.has(barcode)) {
      isDuplicate = true;
      dupReason = `الباركود (${barcode}) مسجل مسبقاً في النظام`;
    } else if (sku && existingSkus.has(sku)) {
      isDuplicate = true;
      dupReason = `رمز SKU (${sku}) مسجل مسبقاً في النظام`;
    } else if (existingNames.has(name.toLowerCase())) {
      isDuplicate = true;
      dupReason = `صنف بنفس الاسم مسجل مسبقاً`;
    }

    if (isDuplicate) {
      skippedDuplicateCount++;
      parsedRows.push({
        rowNum,
        name,
        category: mappedCategory,
        brand,
        viscosity,
        packSize,
        barcode,
        sku,
        costPrice,
        sellPrice,
        stockQty,
        minAlert,
        shelf,
        status: 'skipped_duplicate',
        skipReason: dupReason,
      });
      continue;
    }

    // 4. Valid New Item
    validNewCount++;
    const rowCost = costPrice * stockQty;
    const rowRetail = sellPrice * stockQty;
    totalOpeningCost += rowCost;
    totalRetailValue += rowRetail;

    parsedRows.push({
      rowNum,
      name,
      category: mappedCategory,
      brand,
      viscosity,
      packSize,
      barcode,
      sku,
      costPrice,
      sellPrice,
      stockQty,
      minAlert,
      shelf,
      status: 'valid_new',
      totalCost: rowCost,
    });
  }

  return {
    summary: {
      totalRows: rawRows.length,
      validNewCount,
      skippedDuplicateCount,
      errorCount,
      totalOpeningCost: Math.round(totalOpeningCost),
      totalRetailValue: Math.round(totalRetailValue),
    },
    rows: parsedRows,
  };
}

/**
 * Commits the valid new items into the database and posts opening balance journal entries
 */
function commitImport(validRows, db) {
  if (!validRows || validRows.length === 0) {
    throw new Error('لا توجد أي أصناف جديدة صالحة للاستيراد');
  }

  const insertStmt = db.prepare(`
    INSERT INTO inventory (
      sku, barcode, name, category, item_type, brand, viscosity,
      pack_size, cost_price, sell_price, stock_qty, min_stock_alert,
      location_shelf, is_consignment, is_active
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, 0, 1
    )
  `);

  let importedCount = 0;
  let openingEntriesCount = 0;
  let totalCommittedCost = 0;

  // Execute everything inside an atomic transaction
  const runTransaction = db.transaction((rows) => {
    rows.forEach((row, idx) => {
      // Auto-generate SKU if omitted
      let sku = row.sku;
      if (!sku) {
        const catPrefix = (row.category || 'PRD').substring(0, 3).toUpperCase();
        sku = `SKU-${catPrefix}-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;
      }

      const itemType = row.category === 'service' ? 'service' : 'product';

      const info = insertStmt.run(
        sku,
        row.barcode || null,
        row.name,
        row.category,
        itemType,
        row.brand || 'عام',
        row.viscosity || null,
        normalizePackSize(row.packSize, row.category),
        row.costPrice || 0,
        row.sellPrice || 0,
        itemType === 'service' ? 0 : (row.stockQty || 0),
        row.minAlert || 5,
        row.shelf || null
      );

      const newId = info.lastInsertRowid;
      importedCount++;

      // Post double-entry opening balance if it has stock and cost
      if (itemType === 'product' && row.stockQty > 0 && row.costPrice > 0) {
        const jv = postInventoryOpeningBalance(db, {
          inventory_id: newId,
          name: row.name,
          category: row.category,
          stock_qty: row.stockQty,
          cost_price: row.costPrice,
          pack_size: normalizePackSize(row.packSize, row.category),
          retail_unit: 'حبة',
        });

        if (jv) {
          openingEntriesCount++;
          totalCommittedCost += Math.round(row.stockQty * row.costPrice);
        }
      }
    });
  });

  runTransaction(validRows);

  return {
    success: true,
    importedCount,
    openingEntriesCount,
    totalCommittedCost,
  };
}

module.exports = {
  generateTemplateBuffer,
  parseAndValidate,
  commitImport,
  CATEGORY_MAP,
};
