/**
 * AL-BANSHAR PRO — Massive Seed & Stress Testing Data Generator (Sanaa Market)
 * 
 * Generates:
 * - 500+ Customers & Vehicles with authentic Sana'a plates, models, fleets, and odometers.
 * - 150+ Inventory items: oils (20W-50, 10W-40, 5W-30, bulk), filters, tires, batteries, services, consignment items.
 * - 1,500+ Invoices chronologically distributed over 180 virtual days (cash, Kuraimi, Jeeb, Jawali, OneCash, credit, split).
 * - 200+ Inbound Purchases with landed shipping allocations.
 * - 250+ Official Vouchers (RV debt collections, PV supplier payments, operating expenses).
 * - Balanced Double-Entry Journal Entries for all operations.
 */

const db = require('../db/database');
const { roundMoney, safeNum, calcWAC } = require('../utils/mathPrecision');
const { formatDate, addDaysToDate } = require('../utils/helpers');
const { postInvoice, postPurchase, postOfficialVoucher } = require('../utils/accountingEngine');

console.log('🚀 Starting AL-BANSHAR PRO Massive Stress Seed Engine (Phase 1)...');

// Helper: Random choice
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 2) => roundMoney(min + Math.random() * (max - min), dec);

// Realistic Yemeni Names
const FIRST_NAMES = [
  'محمد', 'أحمد', 'عبد الله', 'علي', 'حسين', 'صالح', 'عبد الرحمن', 'يحيى', 'خالد', 'عمر',
  'طارق', 'ماجد', 'فؤاد', 'وليد', 'منصور', 'إبراهيم', 'نبيل', 'جمال', 'أكرم', 'بشير',
  'عمار', 'وضاح', 'همدان', 'معاذ', 'هاشم', 'عبد العزيز', 'سلطان', 'حميد', 'صقر', 'غسان'
];
const MIDDLE_NAMES = [
  'عبد القادر', 'صادق', 'حسن', 'مسعد', 'محسن', 'قاسم', 'عبده', 'سعيد', 'ناجي', 'مقبل',
  'أحمد', 'مهدي', 'قائد', 'فضل', 'مصلح', 'حميد', 'غانم', 'طاهر', 'شاكر', 'جابر'
];
const FAMILY_NAMES = [
  'السنيدار', 'الوادعي', 'الحبيشي', 'المقرمي', 'الحميري', 'الريمي', 'الشميري', 'الصبري',
  'الأكوع', 'الكبسي', 'المؤيد', 'الهمداني', 'الحيمي', 'الخولاني', 'الشاوش', 'العلفي',
  'المتوكل', 'الشامي', 'الرازحي', 'الذماري', 'الزبيدي', 'الصنعاني', 'الحداد', 'البارق'
];

// Realistic Yemeni Vehicles
const CAR_MODELS = [
  { makeModel: 'تويوتا هايلوكس غمارتين دبل 2022', category: 'وانيت / حبة ونص', capacity: 6.0, defaultOil: 'تويوتا', visc: '20W-50', interval: 3000 },
  { makeModel: 'تويوتا لاندكروزر V8 صالون 2021', category: 'صالون دبل', capacity: 7.5, defaultOil: 'تويوتا', visc: '5W-30', interval: 5000 },
  { makeModel: 'تويوتا برادو TXL 2019', category: 'جيب دبل', capacity: 5.5, defaultOil: 'كاسترول', visc: '10W-40', interval: 4000 },
  { makeModel: 'تويوتا باص هايس سقف عالي 2018', category: 'باص نقل', capacity: 5.5, defaultOil: 'صقر', visc: '20W-50', interval: 3000 },
  { makeModel: 'هيونداي سنتافي بانوراما 2020', category: 'سيارة', capacity: 5.0, defaultOil: 'شل', visc: '5W-30', interval: 5000 },
  { makeModel: 'هيونداي توسان دبل 2019', category: 'سيارة', capacity: 4.5, defaultOil: 'توتال', visc: '10W-40', interval: 4000 },
  { makeModel: 'كيا سبورتاج 2021', category: 'سيارة', capacity: 4.2, defaultOil: 'كاسترول', visc: '10W-40', interval: 4000 },
  { makeModel: 'تويوتا يارس سيدان 2018', category: 'سيارة', capacity: 3.5, defaultOil: 'تويوتا', visc: '10W-40', interval: 4000 },
  { makeModel: 'تويوتا كورولا 2020', category: 'سيارة', capacity: 4.0, defaultOil: 'تويوتا', visc: '5W-30', interval: 5000 },
  { makeModel: 'تويوتا شاص لاندكروزر بيج 2023', category: 'وانيت / حبة ونص', capacity: 7.0, defaultOil: 'تويوتا', visc: '20W-50', interval: 3000 },
  { makeModel: 'نيسان باترول فتك 4800 2019', category: 'صالون دبل', capacity: 8.0, defaultOil: 'كاسترول', visc: '20W-50', interval: 3000 },
  { makeModel: 'ايسوزو ديماكس دبل 2021', category: 'وانيت / حبة ونص', capacity: 6.5, defaultOil: 'شل', visc: '15W-40', interval: 3000 },
  { makeModel: 'سوزوكي جراند فيتارا 2016', category: 'جيب دبل', capacity: 4.5, defaultOil: 'توتال', visc: '10W-40', interval: 4000 }
];

// Corporate Fleet Accounts
const CORPORATE_ACCOUNTS = [
  { name: 'شركة سبأفون للهاتف النقال', taxNo: 'TAX-SBF-00124', limit: 1000000, discount: 10, tier: 'fleet_discount' },
  { name: 'شركة يمن موبايل للهاتف النقال', taxNo: 'TAX-YMB-00891', limit: 1500000, discount: 12, tier: 'fleet_discount' },
  { name: 'منظمة أطباء بلا حدود - صنعاء', taxNo: 'TAX-MSF-00332', limit: 2000000, discount: 15, tier: 'vip_discount' },
  { name: 'شركة شاهر للأدوية والمستلزمات', taxNo: 'TAX-SHR-00455', limit: 800000, discount: 8, tier: 'fleet_discount' },
  { name: 'مؤسسة السعيد للتوصيل السريع', taxNo: 'TAX-SAE-00671', limit: 500000, discount: 10, tier: 'fleet_discount' },
  { name: 'شركة مياه حدة المعدنية', taxNo: 'TAX-HDD-00912', limit: 600000, discount: 7, tier: 'fleet_discount' },
  { name: 'أسطول باصات النصر للنقل الداخلي', taxNo: 'TAX-NSR-00219', limit: 750000, discount: 10, tier: 'fleet_discount' }
];

// 1. Seed or Upgrade Suppliers
function seedSuppliers() {
  console.log('📦 [1/6] Seeding Yemeni Suppliers & Agencies...');
  const suppliers = [
    { name: 'شركة بازرعة للسيارات وتويوتا', company: 'مجموعة بازرعة المحدودة', brand: 'تويوتا أصلي', phone: '777100200', reg: 'CR-SN-10291', credit_days: 45 },
    { name: 'وكالة شل اليمن للتوزيع', company: 'الشركة اليمنية لزيوت شل', brand: 'شل هيلكس وريميولا', phone: '771200300', reg: 'CR-SN-20412', credit_days: 30 },
    { name: 'وكالة كاسترول للزيوت', company: 'مؤسسة الهلال التجارية', brand: 'كاسترول ماجنتك وGTX', phone: '733300400', reg: 'CR-SN-30514', credit_days: 30 },
    { name: 'مؤسسة باقر للبطاريات الكورية', company: 'شركة باقر للتجارة الدولية', brand: 'بطاريات باقر وهانكوك', phone: '775400500', reg: 'CR-SN-40891', credit_days: 60 },
    { name: 'وكالة إطارات بريدجستون وهانكوك', company: 'الشركة العربية للإطارات', brand: 'بريدجستون، هانكوك، يوكوهاما', phone: '774500600', reg: 'CR-SN-50123', credit_days: 45 },
    { name: 'مؤسسة صقر الوطنية للزيوت', company: 'مصنع صقر الوطني لخلط الزيوت', brand: 'صقر الوطني الممتاز', phone: '772600700', reg: 'CR-SN-60781', credit_days: 30 },
    { name: 'شركة توتال إنرجيز اليمن', company: 'وكالة توتال الفرنسية المعتمدة', brand: 'توتال كوارتز', phone: '770700800', reg: 'CR-SN-70912', credit_days: 45 },
    { name: 'مؤسسة الفلاتر الحديثة والمستلزمات', company: 'شركة النجم للاستيراد والتصدير', brand: 'فلاتر أصلي وتجاري', phone: '711800900', reg: 'CR-SN-80145', credit_days: 30 }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO suppliers (name, company_name, agency_brand, phone, commercial_reg, credit_days, balance_due, is_active)
    VALUES (@name, @company, @brand, @phone, @reg, @credit_days, 0, 1)
  `);

  const updateStmt = db.prepare(`
    UPDATE suppliers SET 
      company_name = @company, agency_brand = @brand, phone = @phone,
      commercial_reg = @reg, credit_days = @credit_days
    WHERE name = @name
  `);

  for (const s of suppliers) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(s.name);
    if (!existing) {
      stmt.run(s);
    } else {
      updateStmt.run(s);
    }
  }
}

// 2. Seed Rich Inventory Catalog (150+ items)
function seedInventoryCatalog() {
  console.log('🛢️ [2/6] Seeding 150+ Automotive Pit & Tire Inventory Items...');
  
  const currentCount = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
  if (currentCount >= 150) {
    console.log(`  -> Inventory already has ${currentCount} items. Ensuring healthy initial stock.`);
    db.prepare("UPDATE inventory SET stock_qty = MAX(stock_qty, 250) WHERE item_type = 'product'").run();
    return;
  }

  const items = [];

  // Helper to push items
  const addProduct = (sku, barcode, name, cat, brand, visc, pack, cartonQty, cost, sell, stock, minAlert, extra = {}) => {
    items.push({
      sku, barcode, name, category: cat, item_type: 'product', brand, viscosity: visc,
      pack_size: pack, carton_pack_qty: cartonQty, cost_price: cost, sell_price: sell,
      stock_qty: stock, min_stock_alert: minAlert,
      tire_battery_spec: extra.spec || null,
      dot_code: extra.dot || null,
      battery_capacity_ah: extra.ah || null,
      warranty_months: extra.warranty || 0,
      is_consignment: extra.consignment ? 1 : 0,
      consignment_supplier_name: extra.consignmentSupplier || null,
      location_shelf: extra.shelf || 'الرف الرئيسي',
      is_active: 1
    });
  };

  // Oils
  const oilBrands = [
    { brand: 'تويوتا', prefix: 'TOY', costs: { '20W-50': [23000, 27000, 5900, 7200], '5W-30': [35000, 42000, 8900, 10500] } },
    { brand: 'كاسترول', prefix: 'CAS', costs: { '10W-40': [27000, 32000, 7000, 8500], '20W-50': [22000, 26000, 5600, 6900], '5W-30': [36000, 43000, 9200, 11000] } },
    { brand: 'شل', prefix: 'SHL', costs: { '10W-40': [26000, 31000, 6800, 8200], '5W-30': [37000, 44000, 9500, 11500], '15W-40': [21000, 25000, 5400, 6600] } },
    { brand: 'توتال', prefix: 'TOT', costs: { '10W-40': [25000, 30000, 6500, 8000], '5W-30': [34000, 41000, 8800, 10500], '20W-50': [20500, 24500, 5200, 6500] } },
    { brand: 'صقر', prefix: 'SQR', costs: { '20W-50': [17500, 21500, 4500, 5600], '10W-40': [21000, 25500, 5300, 6500] } },
    { brand: 'موبيل', prefix: 'MOB', costs: { '5W-30': [38000, 45000, 9800, 12000], '20W-50': [23500, 28000, 6000, 7400] } },
    { brand: 'موتول', prefix: 'MOT', costs: { '5W-30': [42000, 50000, 11000, 13500], '10W-40': [31000, 37000, 8000, 9800] } },
    { brand: 'لوك أويل', prefix: 'LUK', costs: { '20W-50': [18000, 22000, 4600, 5800], '10W-40': [22500, 27000, 5700, 7000] } }
  ];

  let seq = 100;
  for (const ob of oilBrands) {
    for (const [visc, prices] of Object.entries(ob.costs)) {
      seq++;
      // 4L Gallon
      addProduct(
        `OIL-${ob.prefix}-${visc}-4L-${seq}`,
        `62910${seq}441`,
        `زيت ${ob.brand} أصلي لزوجة ${visc} (دبة 4 لتر)`,
        'oil', ob.brand, visc, '4L', 4, prices[0], prices[1], 400, 15,
        { shelf: 'قسم الزيوت - رف A' }
      );

      // 1L Can
      seq++;
      addProduct(
        `OIL-${ob.prefix}-${visc}-1L-${seq}`,
        `62910${seq}112`,
        `زيت ${ob.brand} أصلي لزوجة ${visc} (علبة 1 لتر)`,
        'oil', ob.brand, visc, '1L', 24, prices[2], prices[3], 600, 30,
        { shelf: 'قسم الزيوت - رف B' }
      );
    }
  }

  // Bulk Drum Oils (براميل فلت باللتر)
  addProduct('OIL-BULK-20W50', 'BULK001', 'زيت محرك فلت برميل أصلي (باللتر) 20W-50', 'oil', 'شل', '20W-50', 'bulk_liter', 1, 4500, 5800, 1500, 100, { shelf: 'مستودع البراميل' });
  addProduct('OIL-BULK-10W40', 'BULK002', 'زيت محرك فلت برميل نصف تخليقي (باللتر) 10W-40', 'oil', 'كاسترول', '10W-40', 'bulk_liter', 1, 5800, 7400, 1200, 100, { shelf: 'مستودع البراميل' });
  addProduct('OIL-BULK-15W40', 'BULK003', 'زيت ديزل محركات ثقيلة فلت (باللتر) 15W-40', 'oil', 'توتال', '15W-40', 'bulk_liter', 1, 4800, 6200, 1800, 150, { shelf: 'مستودع البراميل' });

  // Filters (Oil, Air, Cabin)
  const filterSpecs = [
    { name: 'فلتر زيت تويوتا أصلي (هايلوكس/برادو/لاند)', brand: 'تويوتا', cost: 3200, sell: 4500 },
    { name: 'فلتر زيت تويوتا يارس وكورولا أصلي', brand: 'تويوتا', cost: 2800, sell: 4000 },
    { name: 'فلتر زيت هيونداي وكيا أصلي كوري', brand: 'هيونداي', cost: 3000, sell: 4200 },
    { name: 'فلتر زيت نيسان باترول فتك أصلي', brand: 'نيسان', cost: 3800, sell: 5500 },
    { name: 'فلتر هواء محرك تويوتا هايلوكس دبل', brand: 'تويوتا', cost: 4500, sell: 6500 },
    { name: 'فلتر هواء محرك لاندكروزر V8 أصلي', brand: 'تويوتا', cost: 6500, sell: 9000 },
    { name: 'فلتر هواء سنتافي وتوسان كوري', brand: 'هيونداي', cost: 4200, sell: 6000 },
    { name: 'فلتر مكيف كربوني مضاد للبكتيريا تويوتا', brand: 'عام', cost: 3500, sell: 5000 },
    { name: 'فلتر مكيف هيونداي/كيا كربوني عالي الكفاءة', brand: 'عام', cost: 3400, sell: 4800 },
    { name: 'فلتر ديزل تويوتا شاص وهايلوكس دبل', brand: 'تويوتا', cost: 5000, sell: 7500 },
    { name: 'فلتر قير أوتوماتيك تويوتا برادو مع قسّام', brand: 'تويوتا', cost: 12000, sell: 16500 }
  ];

  for (let i = 0; i < filterSpecs.length; i++) {
    const f = filterSpecs[i];
    seq++;
    addProduct(
      `FLT-${i + 101}`,
      `88019${seq}01`,
      f.name,
      'filter', f.brand, null, 'unit', 10, f.cost, f.sell, 200, 15,
      { shelf: 'ممر الفلاتر - حائط 1' }
    );
  }

  // Tires
  const tireSizes = [
    { size: '265/65R17', brand: 'بريدجستون', cost: 84000, sell: 98000, dot: '2425' },
    { size: '265/65R17', brand: 'هانكوك', cost: 68000, sell: 79000, dot: '1825' },
    { size: '205/55R16', brand: 'هانكوك', cost: 49000, sell: 58000, dot: '3224' },
    { size: '205/55R16', brand: 'يوكوهاما', cost: 52000, sell: 62000, dot: '1025' },
    { size: '195R15C', brand: 'بريدجستون', cost: 56000, sell: 66000, dot: '4024' },
    { size: '195R15C', brand: 'دبل كنج', cost: 38000, sell: 46000, dot: '0525' },
    { size: '245/70R16', brand: 'دانلوب', cost: 72000, sell: 84000, dot: '2224' },
    { size: '285/60R18', brand: 'ميشلان', cost: 110000, sell: 128000, dot: '1525' }
  ];

  for (let i = 0; i < tireSizes.length; i++) {
    const t = tireSizes[i];
    seq++;
    addProduct(
      `TIRE-${t.brand.slice(0, 3)}-${t.size.replace('/', '').replace('R', '')}-${seq}`,
      `9904${seq}77`,
      `إطار ${t.brand} مقاس ${t.size} (تاريخ: ${t.dot})`,
      'tire', t.brand, null, 'unit', 1, t.cost, t.sell, 60, 8,
      { spec: t.size, dot: t.dot, warranty: 12, shelf: 'مستودع الإطارات الأرضي' }
    );
  }

  // Batteries
  const batteries = [
    { name: 'بطارية باقر 70 أمبير كوري جافة صيانة مجانية', brand: 'باقر', ah: '70Ah', cost: 69000, sell: 81000, w: 12 },
    { name: 'بطارية باقر 80 أمبير كوري جيب وصوالين', brand: 'باقر', ah: '80Ah', cost: 78000, sell: 92000, w: 12 },
    { name: 'بطارية أمل 55 أمبير ياباني تجميع وطني', brand: 'أمل', ah: '55Ah', cost: 49000, sell: 58000, w: 12 },
    { name: 'بطارية أمل 70 أمبير هايلوكس وباصات', brand: 'أمل', ah: '70Ah', cost: 62000, sell: 73000, w: 12 },
    { name: 'بطارية هانكوك 60 أمبير كوري أصلية', brand: 'هانكوك', ah: '60Ah', cost: 58000, sell: 68000, w: 12 },
    { name: 'بطارية سولايت 100 أمبير شاحنات ومعدات', brand: 'سولايت', ah: '100Ah', cost: 95000, sell: 112000, w: 18 }
  ];

  for (let i = 0; i < batteries.length; i++) {
    const b = batteries[i];
    seq++;
    addProduct(
      `BAT-${b.brand.slice(0, 3)}-${b.ah}-${seq}`,
      `7710${seq}99`,
      b.name,
      'battery', b.brand, null, 'unit', 1, b.cost, b.sell, 50, 6,
      { ah: b.ah, warranty: b.w, shelf: 'منصة البطاريات' }
    );
  }

  // Consignment Items (بضاعة أمانة الموردين)
  addProduct(
    'CON-LUK-5W30-4L',
    '73391001',
    'زيت لوك أويل جينيسيس أمانة 5W-30 دبة 4L',
    'oil', 'لوك أويل', '5W-30', '4L', 4, 30000, 36000, 80, 10,
    { consignment: true, consignmentSupplier: 'شركة بازرعة المحدودة', shelf: 'قسم بضاعة الأمانات' }
  );
  addProduct(
    'CON-TIRE-YOK-265',
    '73391002',
    'إطار يوكوهاما جيولاندر أمانة 265/65R17',
    'tire', 'يوكوهاما', null, 'unit', 1, 76000, 89000, 24, 4,
    { consignment: true, consignmentSupplier: 'وكالة إطارات بريدجستون وهانكوك', shelf: 'قسم بضاعة الأمانات' }
  );

  // Insert all into DB atomically
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO inventory (
      sku, barcode, name, category, item_type, brand, viscosity, pack_size,
      carton_pack_qty, tire_battery_spec, dot_code, battery_capacity_ah,
      warranty_months, cost_price, sell_price, stock_qty, min_stock_alert,
      is_consignment, consignment_supplier_name, location_shelf, is_active
    ) VALUES (
      @sku, @barcode, @name, @category, @item_type, @brand, @viscosity, @pack_size,
      @carton_pack_qty, @tire_battery_spec, @dot_code, @battery_capacity_ah,
      @warranty_months, @cost_price, @sell_price, @stock_qty, @min_stock_alert,
      @is_consignment, @consignment_supplier_name, @location_shelf, @is_active
    )
  `);

  const runAll = db.transaction(() => {
    for (const it of items) {
      insertStmt.run(it);
    }
  });

  runAll();
  const newCount = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
  console.log(`  -> Inventory catalog populated with ${newCount} active products & services.`);
}

// 3. Seed 500+ Customers and Vehicles with Authentic Yemeni Data
function seedVehiclesAndCustomers() {
  console.log('🚗 [3/6] Seeding 500+ Yemeni Customers & Fleet Vehicles...');
  
  const currentCount = db.prepare('SELECT COUNT(*) as c FROM customers_vehicles').get().c;
  if (currentCount >= 500) {
    console.log(`  -> Customers and vehicles already at target (${currentCount} records).`);
    return;
  }

  const needed = 500 - currentCount;
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO customers_vehicles (
      plate_number, plate_type, plate_divider, car_make_model, vehicle_category,
      customer_name, phone, preferred_oil_brand, preferred_viscosity,
      last_odometer, next_due_odometer, next_due_date, balance_due, credit_limit,
      customer_type, corporate_name, price_tier, discount_percent, corporate_tax_no,
      billing_cycle, customer_notes, service_interval_km, created_at
    ) VALUES (
      @plate_number, @plate_type, @plate_divider, @car_make_model, @vehicle_category,
      @customer_name, @phone, @preferred_oil_brand, @preferred_viscosity,
      @last_odometer, @next_due_odometer, @next_due_date, @balance_due, @credit_limit,
      @customer_type, @corporate_name, @price_tier, @discount_percent, @corporate_tax_no,
      @billing_cycle, @customer_notes, @service_interval_km, @created_at
    )
  `);

  const now = new Date();
  const plateTypes = ['خصوصي', 'أجرة', 'نقل', 'مؤقت'];
  const phonePrefixes = ['77', '71', '73', '78'];

  const runVehicles = db.transaction(() => {
    for (let i = 0; i < needed; i++) {
      const isFleet = Math.random() < 0.22; // 22% corporate fleet
      const isTaxi = !isFleet && Math.random() < 0.28; // 28% taxi
      const car = pick(CAR_MODELS);
      const daysAgo = randInt(1, 180);
      const createdAt = addDaysToDate(formatDate(now), -daysAgo) + ' 09:30:00';

      let customerType = 'individual';
      let corporateName = null;
      let corporateTax = null;
      let discountPct = 0;
      let priceTier = 'standard';
      let creditLimit = 0;
      let billingCycle = 'instant';
      let pType = 'خصوصي';

      if (isFleet) {
        const corp = pick(CORPORATE_ACCOUNTS);
        customerType = 'fleet';
        corporateName = corp.name;
        corporateTax = corp.taxNo;
        discountPct = corp.discount;
        priceTier = corp.tier;
        creditLimit = corp.limit;
        billingCycle = 'monthly';
        pType = pick(['خصوصي', 'نقل']);
      } else if (isTaxi) {
        customerType = 'taxi';
        pType = 'أجرة';
        discountPct = 5;
        priceTier = 'standard';
        creditLimit = 25000;
      }

      // Authentic Yemeni Plate Numbers
      const divider = pick(['1', '2', '3', '4']);
      const plateDigits = randInt(10000, 99999);
      const plateNumber = pType === 'مؤقت'
        ? `مؤقت صنعاء ${plateDigits}`
        : `${divider}-${plateDigits} ${pType}`;

      const custName = `${pick(FIRST_NAMES)} ${pick(MIDDLE_NAMES)} ${pick(FAMILY_NAMES)}`;
      const phone = `${pick(phonePrefixes)}${randInt(1000000, 9999999)}`;
      
      const lastOdo = randInt(15000, 320000);
      const nextDueOdo = lastOdo + (car.interval || 3000);

      // Stagger next due dates to create diverse radar states:
      // ~30% overdue, ~25% due soon, ~25% approaching, ~20% safe
      const radarSeed = Math.random();
      let nextDueDate;
      if (radarSeed < 0.30) {
        // Overdue (due in past)
        nextDueDate = addDaysToDate(formatDate(now), -randInt(3, 40));
      } else if (radarSeed < 0.55) {
        // Due soon (within 7 days)
        nextDueDate = addDaysToDate(formatDate(now), randInt(0, 6));
      } else if (radarSeed < 0.80) {
        // Approaching (within 8 - 14 days)
        nextDueDate = addDaysToDate(formatDate(now), randInt(8, 14));
      } else {
        // Safe (due after 15 to 45 days)
        nextDueDate = addDaysToDate(formatDate(now), randInt(15, 45));
      }

      insertStmt.run({
        plate_number: plateNumber,
        plate_type: pType,
        plate_divider: divider,
        car_make_model: car.makeModel,
        vehicle_category: car.category,
        customer_name: custName,
        phone,
        preferred_oil_brand: car.defaultOil,
        preferred_viscosity: car.visc,
        last_odometer: lastOdo,
        next_due_odometer: nextDueOdo,
        next_due_date: nextDueDate,
        balance_due: 0, // will be updated as invoices are posted
        credit_limit: creditLimit,
        customer_type: customerType,
        corporate_name: corporateName,
        price_tier: priceTier,
        discount_percent: discountPct,
        corporate_tax_no: corporateTax,
        billing_cycle: billingCycle,
        customer_notes: isFleet ? `مركبة رسمية تتبع ${corporateName}` : 'عميل مركز سريع وبنشر',
        service_interval_km: car.interval || 3000,
        created_at: createdAt
      });
    }
  });

  runVehicles();
  const totalVehicles = db.prepare('SELECT COUNT(*) as c FROM customers_vehicles').get().c;
  console.log(`  -> Customers & Vehicles directory now stands at ${totalVehicles} records.`);
}

// 4. Seed 200+ Inbound Purchases with Landed Shipping Costs
function seedPurchasesAndStockMovements() {
  console.log('📥 [4/6] Seeding 200+ Inbound Purchases & Landed Costs (WAC)...');

  const currentPurCount = db.prepare('SELECT COUNT(*) as c FROM purchases').get().c;
  if (currentPurCount >= 200) {
    console.log(`  -> Purchases already at target (${currentPurCount} records).`);
    return;
  }

  const suppliers = db.prepare('SELECT * FROM suppliers WHERE is_active = 1').all();
  const products = db.prepare("SELECT * FROM inventory WHERE item_type = 'product' AND is_active = 1").all();
  if (suppliers.length === 0 || products.length === 0) return;

  const needed = 200 - currentPurCount;
  const now = new Date();

  const runPurchases = db.transaction(() => {
    for (let p = 0; p < needed; p++) {
      const supp = pick(suppliers);
      const daysAgo = randInt(1, 175);
      const dateStr = addDaysToDate(formatDate(now), -daysAgo);
      const purNumber = `PUR-${dateStr.replace(/-/g, '')}-${String(p + 100).padStart(3, '0')}`;

      // 2 to 5 random products per purchase
      const itemsCount = randInt(2, 5);
      const purchaseItems = [];
      let totalAmount = 0;

      for (let k = 0; k < itemsCount; k++) {
        const prod = pick(products);
        const inQty = prod.pack_size === 'bulk_liter' ? randInt(100, 300) : randInt(10, 50);
        const unitCost = prod.cost_price > 0 ? prod.cost_price : 20000;
        const subtotal = roundMoney(inQty * unitCost);
        totalAmount = roundMoney(totalAmount + subtotal);

        purchaseItems.push({
          inventory_id: prod.id,
          qty: inQty,
          unit_cost: unitCost,
          unit_sell: prod.sell_price,
          allocated_shipping: 0,
          effective_unit_cost: unitCost,
          subtotal
        });
      }

      // Add landed shipping cost (paid from cash drawer to transporter)
      const shippingCost = randInt(3000, 15000);
      for (const item of purchaseItems) {
        const ratio = item.subtotal / totalAmount;
        item.allocated_shipping = roundMoney(shippingCost * ratio);
        item.effective_unit_cost = roundMoney(item.unit_cost + (item.allocated_shipping / item.qty));
      }

      // Payment method: cash or credit
      const isCredit = Math.random() < 0.65; // 65% on credit
      const paymentMethod = isCredit ? 'credit' : 'cash';
      const paidAmount = isCredit ? 0 : totalAmount;
      const remainingDebt = roundMoney(totalAmount - paidAmount);

      // Insert Purchase Header
      const purRes = db.prepare(`
        INSERT INTO purchases (
          purchase_number, supplier_id, supplier_name, invoice_ref, paper_bill_number,
          due_date, shipping_cost, shipping_payer, total_amount, paid_amount, remaining_debt,
          payment_method, paid_from_cash_drawer, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'cash_drawer', ?, ?, ?, ?, 1, ?, ?)
      `).run(
        purNumber, supp.id, supp.name, `REF-${randInt(1000, 9999)}`, `BILL-${randInt(5000, 9999)}`,
        addDaysToDate(dateStr, supp.credit_days || 30), shippingCost, totalAmount, paidAmount,
        remainingDebt, paymentMethod, 'توريد مخزون تجريبي دوري', `${dateStr} 11:00:00`
      );

      const purchaseId = purRes.lastInsertRowid;

      // Insert Items & Update inventory stock & WAC
      const itemStmt = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, inventory_id, qty, unit_cost, unit_sell, allocated_shipping, effective_unit_cost, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE inventory SET
          stock_qty = stock_qty + ?,
          cost_price = ?
        WHERE id = ?
      `);

      for (const item of purchaseItems) {
        itemStmt.run(
          purchaseId, item.inventory_id, item.qty, item.unit_cost,
          item.unit_sell, item.allocated_shipping, item.effective_unit_cost, item.subtotal
        );

        const curInv = db.prepare('SELECT stock_qty, cost_price FROM inventory WHERE id = ?').get(item.inventory_id);
        const newWac = calcWAC(curInv.stock_qty, curInv.cost_price, item.qty, item.effective_unit_cost);
        updateStockStmt.run(item.qty, newWac, item.inventory_id);
      }

      // Update supplier balance due
      if (remainingDebt > 0) {
        db.prepare('UPDATE suppliers SET balance_due = balance_due + ? WHERE id = ?').run(remainingDebt, supp.id);
      }

      // Post to General Ledger
      postPurchase(db, {
        purchase: {
          id: purchaseId,
          purchase_number: purNumber,
          supplier_id: supp.id,
          supplier_name: supp.name,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          remaining_debt: remainingDebt,
          shipping_cost: shippingCost,
          payment_method: paymentMethod,
          created_at: `${dateStr} 11:00:00`
        },
        items: purchaseItems
      });
    }
  });

  runPurchases();
  const totalPurchases = db.prepare('SELECT COUNT(*) as c FROM purchases').get().c;
  console.log(`  -> Purchases table populated with ${totalPurchases} complete landed cost records.`);
}

// 5. Seed 1,500+ Invoices Across 180 Days (Sales & Pit Services)
function seedInvoices() {
  console.log('🧾 [5/6] Seeding 1,500+ Sales Invoices Across 180 Virtual Days...');

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
  if (currentCount >= 1500) {
    console.log(`  -> Invoices already at target (${currentCount} records).`);
    return;
  }

  const needed = 1500 - currentCount;
  const vehicles = db.prepare('SELECT * FROM customers_vehicles').all();
  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const oils = db.prepare("SELECT * FROM inventory WHERE category = 'oil' AND is_active = 1").all();
  const filters = db.prepare("SELECT * FROM inventory WHERE category = 'filter' AND is_active = 1").all();
  const services = db.prepare("SELECT * FROM inventory WHERE category = 'service' OR item_type = 'service'").all();
  const tires = db.prepare("SELECT * FROM inventory WHERE category = 'tire' AND is_active = 1").all();

  const now = new Date();
  const paymentMethods = ['cash', 'kuraimi', 'jeeb', 'jawali', 'onecash', 'credit', 'split'];

  let seededInvoices = 0;

  const runBatch = db.transaction(() => {
    for (let i = 0; i < needed; i++) {
      const v = pick(vehicles);
      const w = pick(workers);
      const daysAgo = randInt(0, 180);
      const invDate = addDaysToDate(formatDate(now), -daysAgo);
      const invNumber = `INV-${invDate.replace(/-/g, '')}-${String(i + 1000).padStart(4, '0')}`;

      // Pick items: 1 oil, 1 filter, 1 service labor fee, and 15% chance of a tire
      const oilItem = pick(oils);
      const filterItem = pick(filters);
      const srvItem = pick(services);

      const items = [];
      let itemsTotal = 0;
      let laborTotal = 0;

      // 1. Oil
      if (oilItem && oilItem.stock_qty >= 5) {
        const qty = oilItem.pack_size === 'bulk_liter' ? randInt(4, 7) : (oilItem.pack_size === '1L' ? randInt(3, 5) : 1);
        const unitPrice = oilItem.sell_price;
        const subtotal = roundMoney(qty * unitPrice);
        itemsTotal = roundMoney(itemsTotal + subtotal);

        items.push({
          inventory_id: oilItem.id,
          item_type: 'product',
          description: oilItem.name,
          qty,
          unit_price: unitPrice,
          labor_fee: 0,
          subtotal
        });
      }

      // 2. Filter
      if (filterItem && filterItem.stock_qty >= 2) {
        const subtotal = roundMoney(1 * filterItem.sell_price);
        itemsTotal = roundMoney(itemsTotal + subtotal);

        items.push({
          inventory_id: filterItem.id,
          item_type: 'product',
          description: filterItem.name,
          qty: 1,
          unit_price: filterItem.sell_price,
          labor_fee: 0,
          subtotal
        });
      }

      // 3. Service Labor
      const laborFee = srvItem ? srvItem.sell_price : 1500;
      laborTotal = roundMoney(laborTotal + laborFee);
      items.push({
        inventory_id: srvItem ? srvItem.id : null,
        item_type: 'service',
        description: srvItem ? srvItem.name : 'أجرة مصنعية غيار زيت وفلتر',
        qty: 1,
        unit_price: laborFee,
        labor_fee: laborFee,
        subtotal: laborFee
      });

      // 4. Occasional Tire
      if (Math.random() < 0.12 && tires.length > 0) {
        const tireItem = pick(tires);
        if (tireItem.stock_qty >= 2) {
          const tQty = randInt(1, 2);
          const tSubtotal = roundMoney(tQty * tireItem.sell_price);
          itemsTotal = roundMoney(itemsTotal + tSubtotal);
          items.push({
            inventory_id: tireItem.id,
            item_type: 'product',
            description: tireItem.name,
            qty: tQty,
            unit_price: tireItem.sell_price,
            labor_fee: 0,
            subtotal: tSubtotal
          });
        }
      }

      if (items.length === 0) continue;

      // Discount
      const discount = v.discount_percent > 0 ? roundMoney((itemsTotal + laborTotal) * (v.discount_percent / 100)) : 0;
      const netTotal = Math.max(0, roundMoney(itemsTotal + laborTotal - discount));

      // Payment logic
      let payMethod = pick(paymentMethods);
      if (v.customer_type !== 'fleet' && payMethod === 'credit') {
        payMethod = 'cash'; // only fleets/VIP get routine credit in seed
      }

      let paidAmount = netTotal;
      let remainingDebt = 0;
      let splitPayments = null;

      if (payMethod === 'credit') {
        paidAmount = 0;
        remainingDebt = netTotal;
      } else if (payMethod === 'split') {
        const cashPart = roundMoney(netTotal * 0.5);
        const walletPart = roundMoney(netTotal - cashPart);
        splitPayments = { cash: cashPart, kuraimi: walletPart };
        paidAmount = netTotal;
        remainingDebt = 0;
      }

      // Odometer progression
      const currentOdo = v.last_odometer > 0 ? v.last_odometer : 50000;
      const nextOdo = currentOdo + (v.service_interval_km || 3000);
      const nextDate = addDaysToDate(invDate, 60);

      // 1. Insert Invoice Header
      const invRes = db.prepare(`
        INSERT INTO invoices (
          invoice_number, vehicle_id, worker_id, current_odometer, next_odometer,
          next_service_date, items_total, labor_total, scrap_battery_deduction,
          discount, net_total, payment_method, paid_amount, remaining_debt,
          service_status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'completed', ?
        )
      `).run(
        invNumber, v.id, w.id, currentOdo, nextOdo, nextDate,
        itemsTotal, laborTotal, discount, netTotal, payMethod, paidAmount,
        remainingDebt, `${invDate} ${randInt(8, 20)}:${randInt(10, 59)}:00`
      );

      const invoiceId = invRes.lastInsertRowid;

      // 2. Insert Items & Decrement Inventory
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, inventory_id, item_type, description, qty, unit_price, labor_fee, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const decStockStmt = db.prepare('UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?');

      for (const it of items) {
        insertItemStmt.run(invoiceId, it.inventory_id, it.item_type, it.description, it.qty, it.unit_price, it.labor_fee, it.subtotal);
        if (it.inventory_id && it.item_type !== 'service') {
          decStockStmt.run(it.qty, it.inventory_id);
        }
      }

      // 3. Update Vehicle
      db.prepare(`
        UPDATE customers_vehicles SET
          last_odometer = MAX(COALESCE(last_odometer, 0), ?),
          next_due_odometer = ?,
          next_due_date = ?,
          balance_due = balance_due + ?
        WHERE id = ?
      `).run(currentOdo, nextOdo, nextDate, remainingDebt, v.id);

      // 4. Post to Double-Entry General Ledger
      postInvoice(db, {
        invoice: {
          id: invoiceId,
          invoice_number: invNumber,
          vehicle_id: v.id,
          plate_number: v.plate_number,
          paid_amount: paidAmount,
          remaining_debt: remainingDebt,
          items_total: itemsTotal,
          labor_total: laborTotal,
          scrap_battery_deduction: 0,
          discount,
          net_total: netTotal,
          payment_method: payMethod,
          split_payments: splitPayments,
          created_at: `${invDate} 12:00:00`
        },
        items
      });

      seededInvoices++;
    }
  });

  runBatch();
  const finalCount = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
  console.log(`  -> Successfully seeded ${seededInvoices} invoices. Total invoices in system: ${finalCount}.`);
}

// 6. Seed 250+ Official Vouchers (RV debt collections, PV expenses & supplier payments)
function seedOfficialVouchers() {
  console.log('📜 [6/6] Seeding 250+ Official Vouchers (Receipts & Payments)...');

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM official_vouchers').get().c;
  if (currentCount >= 250) {
    console.log(`  -> Official vouchers already at target (${currentCount} records).`);
    return;
  }

  const needed = 250 - currentCount;
  const customersWithDebt = db.prepare('SELECT * FROM customers_vehicles WHERE balance_due > 0').all();
  const suppliersWithDebt = db.prepare('SELECT * FROM suppliers WHERE balance_due > 0').all();
  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const now = new Date();

  const expenseCategories = [
    { name: 'إيجار المحل والمركز', code: '6101', cat: 'operating_expense' },
    { name: 'ديزل للمولد وفواتير الكهرباء', code: '6102', cat: 'operating_expense' },
    { name: 'غداء وشاي وضيافة الفنيين', code: '6103', cat: 'operating_expense' },
    { name: 'رقع تيوبلس وغراء وبلوف بنشر', code: '6104', cat: 'operating_expense' },
    { name: 'مشاوير ونقل بضاعة من الوكلاء', code: '6105', cat: 'operating_expense' },
    { name: 'صيانة ماطور الهواء والرافعة', code: '6106', cat: 'operating_expense' },
    { name: 'رسوم نظافة وبلدية المركز', code: '6107', cat: 'operating_expense' }
  ];

  let voucherCount = 0;

  const runVouchers = db.transaction(() => {
    for (let i = 0; i < needed; i++) {
      const daysAgo = randInt(1, 170);
      const vDate = addDaysToDate(formatDate(now), -daysAgo);
      const mode = Math.random();

      if (mode < 0.40 && customersWithDebt.length > 0) {
        // Receipt Voucher (RV): Customer paying debt
        const c = pick(customersWithDebt);
        const payAmt = Math.min(c.balance_due, randInt(5000, 30000));
        if (payAmt <= 0) continue;

        const vNum = `RV-${vDate.replace(/-/g, '')}-${String(i + 100).padStart(3, '0')}`;
        const payMethod = pick(['cash', 'kuraimi', 'jeeb', 'jawali']);

        db.prepare(`
          INSERT INTO official_vouchers (
            voucher_number, voucher_type, party_type, party_id, party_name,
            amount, payment_method, cash_account_code, offset_account_code,
            description, status, created_at
          ) VALUES (?, 'receipt', 'customer', ?, ?, ?, ?, '1101', '1201', ?, 'posted', ?)
        `).run(
          vNum, c.id, c.customer_name, payAmt, payMethod,
          `تحصيل دفعة من حساب ديون العميل: ${c.customer_name} (لوحة: ${c.plate_number})`,
          `${vDate} 15:30:00`
        );

        // Reduce balance due
        db.prepare('UPDATE customers_vehicles SET balance_due = MAX(0, balance_due - ?) WHERE id = ?').run(payAmt, c.id);
        c.balance_due -= payAmt;

        // Post to Ledger
        postOfficialVoucher(db, {
          voucher_number: vNum,
          voucher_type: 'receipt',
          party_type: 'customer',
          party_id: c.id,
          party_name: c.customer_name,
          amount: payAmt,
          payment_method: payMethod,
          cash_account_code: '1101',
          offset_account_code: '1201',
          description: `سند قبض دين عميل (${vNum})`,
          created_at: `${vDate} 15:30:00`
        });

      } else if (mode < 0.70 && suppliersWithDebt.length > 0) {
        // Payment Voucher (PV): Paying Supplier
        const s = pick(suppliersWithDebt);
        const payAmt = Math.min(s.balance_due, randInt(25000, 100000));
        if (payAmt <= 0) continue;

        const vNum = `PV-${vDate.replace(/-/g, '')}-${String(i + 100).padStart(3, '0')}`;
        const payMethod = pick(['cash', 'kuraimi']);

        db.prepare(`
          INSERT INTO official_vouchers (
            voucher_number, voucher_type, party_type, party_id, party_name,
            amount, payment_method, cash_account_code, offset_account_code,
            description, status, created_at
          ) VALUES (?, 'payment', 'supplier', ?, ?, ?, ?, '1101', '2101', ?, 'posted', ?)
        `).run(
          vNum, s.id, s.name, payAmt, payMethod,
          `سداد دفعة حساب للمورد: ${s.name}`,
          `${vDate} 16:00:00`
        );

        // Reduce supplier balance
        db.prepare('UPDATE suppliers SET balance_due = MAX(0, balance_due - ?) WHERE id = ?').run(payAmt, s.id);
        s.balance_due -= payAmt;

        postOfficialVoucher(db, {
          voucher_number: vNum,
          voucher_type: 'payment',
          party_type: 'supplier',
          party_id: s.id,
          party_name: s.name,
          amount: payAmt,
          payment_method: payMethod,
          cash_account_code: '1101',
          offset_account_code: '2101',
          description: `سند صرف سداد مورد (${vNum})`,
          created_at: `${vDate} 16:00:00`
        });

      } else {
        // Payment Voucher (PV): Operating Expense
        const exp = pick(expenseCategories);
        const amt = randInt(2000, 18000);
        const vNum = `PV-${vDate.replace(/-/g, '')}-${String(i + 100).padStart(3, '0')}`;

        db.prepare(`
          INSERT INTO official_vouchers (
            voucher_number, voucher_type, party_type, party_id, party_name,
            amount, payment_method, cash_account_code, offset_account_code,
            description, status, created_at
          ) VALUES (?, 'payment', 'expense', NULL, ?, ?, 'cash', '1101', ?, ?, 'posted', ?)
        `).run(
          vNum, exp.name, amt, exp.code,
          `صرف مصروف تشغيلي: ${exp.name}`,
          `${vDate} 17:00:00`
        );

        postOfficialVoucher(db, {
          voucher_number: vNum,
          voucher_type: 'payment',
          party_type: 'expense',
          party_name: exp.name,
          amount: amt,
          payment_method: 'cash',
          cash_account_code: '1101',
          offset_account_code: exp.code,
          description: `سند صرف مصروف تشغيلي (${vNum})`,
          created_at: `${vDate} 17:00:00`
        });
      }

      voucherCount++;
    }
  });

  runVouchers();
  const finalVCount = db.prepare('SELECT COUNT(*) as c FROM official_vouchers').get().c;
  console.log(`  -> Successfully seeded ${voucherCount} official vouchers. Total vouchers in system: ${finalVCount}.`);
}

// Master Execution Flow
function main() {
  const startTime = Date.now();
  seedSuppliers();
  seedInventoryCatalog();
  seedVehiclesAndCustomers();
  seedPurchasesAndStockMovements();
  seedInvoices();
  seedOfficialVouchers();

  // Run WAL Checkpoint to flush to disk
  db.pragma('wal_checkpoint(PASSIVE)');

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Massive Stress Seed Completed in ${durationSec}s!`);

  // Final Summary Stats
  const tables = [
    ['customers_vehicles', 'العملاء والمركبات'],
    ['inventory', 'الأصناف وخدمات الورشة'],
    ['invoices', 'فواتير المبيعات الصادرة'],
    ['invoice_items', 'بنود مبيعات الفواتير'],
    ['purchases', 'فواتير المشتريات والتوريد'],
    ['purchase_items', 'بنود المشتريات'],
    ['official_vouchers', 'سندات القبض والصرف الرسمية'],
    ['journal_entries', 'قيود اليومية العامة (GL)'],
    ['journal_lines', 'أطراف القيود المزدوجة'],
    ['stock_movements', 'حركات المخزون التفصيلية']
  ];

  console.log('\n📊 [Summary of Populated Database Records]:');
  for (const [tbl, label] of tables) {
    const cnt = db.prepare(`SELECT COUNT(*) as c FROM ${tbl}`).get().c;
    console.log(`  - ${label.padEnd(30, ' ')} (${tbl}): ${cnt.toLocaleString()} سجل`);
  }
}

main();
