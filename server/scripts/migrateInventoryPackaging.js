const db = require('../db/database');

console.log('[Migration] Starting inventory packaging & units migration...');

const invCols = db.prepare('PRAGMA table_info(inventory)').all().map(c => c.name);

if (!invCols.includes('retail_unit')) {
  db.exec("ALTER TABLE inventory ADD COLUMN retail_unit TEXT NOT NULL DEFAULT 'حبة'");
  console.log('[Migration] Added column retail_unit');
}

if (!invCols.includes('bulk_unit')) {
  db.exec("ALTER TABLE inventory ADD COLUMN bulk_unit TEXT NOT NULL DEFAULT 'كرتون'");
  console.log('[Migration] Added column bulk_unit');
}

// 1. Sanitize all non-oil records
db.exec("UPDATE inventory SET viscosity = NULL, oil_type = NULL, api_grade = NULL WHERE category != 'oil'");

// 2. Clean records 1 to 6
db.exec(`
  UPDATE inventory SET retail_unit = 'علبة', bulk_unit = 'كرتون', carton_pack_qty = 24 WHERE id = 1;
  UPDATE inventory SET category = 'filter', brand = 'تويوتا', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'حبة', bulk_unit = 'شدة', carton_pack_qty = 10 WHERE id = 2;
  UPDATE inventory SET category = 'battery', brand = 'إنديكو', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'حبة', bulk_unit = 'حبة', carton_pack_qty = 1, battery_capacity_ah = '50Ah' WHERE id = 3;
  UPDATE inventory SET category = 'tire', brand = 'سيلون', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'إطار', bulk_unit = 'إطار', carton_pack_qty = 1 WHERE id = 4;
  UPDATE inventory SET category = 'service', brand = 'خدمات المركز', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'خدمة', bulk_unit = 'خدمة', cost_price = 0 WHERE id = 5;
  UPDATE inventory SET category = 'accessory', brand = 'عام', viscosity = NULL, oil_type = NULL, api_grade = NULL, pack_size = 'unit', retail_unit = 'قطعة', bulk_unit = 'شدة', carton_pack_qty = 10 WHERE id = 6;
`);

console.log('[Migration] Migration completed successfully.');
console.log('[Migration] Current inventory records:');
console.log(db.prepare('SELECT id, sku, name, category, brand, viscosity, oil_type, pack_size, retail_unit, bulk_unit, carton_pack_qty FROM inventory').all());
