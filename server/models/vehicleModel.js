const db = require('../db/database');

const vehicleModel = {
  search(q) {
    if (!q || !q.trim()) {
      return db.prepare(`
        SELECT cv.*, 
          (SELECT MAX(created_at) FROM invoices WHERE vehicle_id = cv.id) AS last_visit_date,
          (SELECT COUNT(*) FROM invoices WHERE vehicle_id = cv.id) AS total_visits
        FROM customers_vehicles cv
        ORDER BY cv.id DESC
        LIMIT 25
      `).all();
    }

    const searchTerm = `%${q.trim()}%`;
    return db.prepare(`
      SELECT cv.*, 
        (SELECT MAX(created_at) FROM invoices WHERE vehicle_id = cv.id) AS last_visit_date,
        (SELECT COUNT(*) FROM invoices WHERE vehicle_id = cv.id) AS total_visits
      FROM customers_vehicles cv
      WHERE cv.plate_number LIKE ? 
         OR cv.phone LIKE ? 
         OR cv.customer_name LIKE ?
         OR cv.car_make_model LIKE ?
         OR cv.corporate_name LIKE ?
      ORDER BY 
        CASE 
          WHEN cv.plate_number = ? THEN 1
          WHEN cv.phone = ? THEN 2
          ELSE 3
        END,
        cv.id DESC
      LIMIT 25
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, q.trim(), q.trim());
  },

  getById(id) {
    const vehicle = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(id);
    if (!vehicle) return null;

    // Get service invoices history
    const history = db.prepare(`
      SELECT 
        inv.*,
        w.name AS worker_name,
        w.role AS worker_role
      FROM invoices inv
      LEFT JOIN workers w ON inv.worker_id = w.id
      WHERE inv.vehicle_id = ?
      ORDER BY inv.id DESC
    `).all(id);

    // Fetch items for each historical invoice
    for (const inv of history) {
      inv.items = db.prepare(`
        SELECT * FROM invoice_items WHERE invoice_id = ?
      `).all(inv.id);
    }

    // Fetch reminder logs
    const reminderLogs = db.prepare(`
      SELECT * FROM service_reminders_log WHERE vehicle_id = ? ORDER BY id DESC LIMIT 10
    `).all(id);

    return {
      ...vehicle,
      history,
      reminder_logs: reminderLogs,
    };
  },

  getByPlate(plateNumber) {
    return db.prepare('SELECT * FROM customers_vehicles WHERE plate_number = ?').get(plateNumber.trim());
  },

  getLastService(vehicleId) {
    const lastInvoice = db.prepare(`
      SELECT * FROM invoices 
      WHERE vehicle_id = ? 
      ORDER BY id DESC 
      LIMIT 1
    `).get(vehicleId);

    if (!lastInvoice) return null;

    const items = db.prepare(`
      SELECT ii.*, inv.brand, inv.viscosity, inv.category 
      FROM invoice_items ii
      LEFT JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE ii.invoice_id = ?
    `).all(lastInvoice.id);

    return {
      ...lastInvoice,
      items,
    };
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO customers_vehicles (
        plate_number, plate_type, car_make_model, customer_name, phone,
        preferred_oil_brand, preferred_viscosity, last_odometer,
        next_due_odometer, next_due_date, balance_due, credit_limit,
        customer_type, corporate_name, price_tier, discount_percent,
        corporate_tax_no, billing_cycle
      ) VALUES (
        @plate_number, @plate_type, @car_make_model, @customer_name, @phone,
        @preferred_oil_brand, @preferred_viscosity, @last_odometer,
        @next_due_odometer, @next_due_date, @balance_due, @credit_limit,
        @customer_type, @corporate_name, @price_tier, @discount_percent,
        @corporate_tax_no, @billing_cycle
      )
    `);

    const result = stmt.run({
      plate_number: data.plate_number.trim(),
      plate_type: data.plate_type || 'خصوصي',
      car_make_model: data.car_make_model.trim(),
      customer_name: data.customer_name.trim(),
      phone: data.phone.trim(),
      preferred_oil_brand: data.preferred_oil_brand || null,
      preferred_viscosity: data.preferred_viscosity || null,
      last_odometer: Number(data.last_odometer) || 0,
      next_due_odometer: Number(data.next_due_odometer) || 0,
      next_due_date: data.next_due_date || null,
      balance_due: Number(data.balance_due) || 0,
      credit_limit: data.credit_limit !== undefined ? Number(data.credit_limit) : 50000,
      customer_type: data.customer_type || 'individual',
      corporate_name: data.corporate_name ? data.corporate_name.trim() : null,
      price_tier: data.price_tier || 'standard',
      discount_percent: Number(data.discount_percent) || 0,
      corporate_tax_no: data.corporate_tax_no ? data.corporate_tax_no.trim() : null,
      billing_cycle: data.billing_cycle || 'instant',
    });

    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = db.prepare('SELECT * FROM customers_vehicles WHERE id = ?').get(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE customers_vehicles SET
        plate_number = @plate_number,
        plate_type = @plate_type,
        car_make_model = @car_make_model,
        customer_name = @customer_name,
        phone = @phone,
        preferred_oil_brand = @preferred_oil_brand,
        preferred_viscosity = @preferred_viscosity,
        last_odometer = @last_odometer,
        next_due_odometer = @next_due_odometer,
        next_due_date = @next_due_date,
        balance_due = @balance_due,
        credit_limit = @credit_limit,
        customer_type = @customer_type,
        corporate_name = @corporate_name,
        price_tier = @price_tier,
        discount_percent = @discount_percent,
        corporate_tax_no = @corporate_tax_no,
        billing_cycle = @billing_cycle
      WHERE id = @id
    `);

    stmt.run({
      id,
      plate_number: data.plate_number ? data.plate_number.trim() : existing.plate_number,
      plate_type: data.plate_type || existing.plate_type,
      car_make_model: data.car_make_model ? data.car_make_model.trim() : existing.car_make_model,
      customer_name: data.customer_name ? data.customer_name.trim() : existing.customer_name,
      phone: data.phone ? data.phone.trim() : existing.phone,
      preferred_oil_brand: data.preferred_oil_brand !== undefined ? data.preferred_oil_brand : existing.preferred_oil_brand,
      preferred_viscosity: data.preferred_viscosity !== undefined ? data.preferred_viscosity : existing.preferred_viscosity,
      last_odometer: data.last_odometer !== undefined ? Number(data.last_odometer) : existing.last_odometer,
      next_due_odometer: data.next_due_odometer !== undefined ? Number(data.next_due_odometer) : existing.next_due_odometer,
      next_due_date: data.next_due_date !== undefined ? data.next_due_date : existing.next_due_date,
      balance_due: data.balance_due !== undefined ? Number(data.balance_due) : existing.balance_due,
      credit_limit: data.credit_limit !== undefined ? Number(data.credit_limit) : existing.credit_limit,
      customer_type: data.customer_type !== undefined ? data.customer_type : existing.customer_type,
      corporate_name: data.corporate_name !== undefined ? (data.corporate_name ? data.corporate_name.trim() : null) : existing.corporate_name,
      price_tier: data.price_tier !== undefined ? data.price_tier : existing.price_tier,
      discount_percent: data.discount_percent !== undefined ? Number(data.discount_percent) : existing.discount_percent,
      corporate_tax_no: data.corporate_tax_no !== undefined ? (data.corporate_tax_no ? data.corporate_tax_no.trim() : null) : existing.corporate_tax_no,
      billing_cycle: data.billing_cycle !== undefined ? data.billing_cycle : existing.billing_cycle,
    });

    return this.getById(id);
  },

  updateOdometerAndDue(id, lastOdo, nextOdo, nextDueDate) {
    db.prepare(`
      UPDATE customers_vehicles SET
        last_odometer = ?,
        next_due_odometer = ?,
        next_due_date = ?
      WHERE id = ?
    `).run(lastOdo, nextOdo, nextDueDate, id);
  },

  adjustBalanceDue(id, amountDelta) {
    db.prepare(`
      UPDATE customers_vehicles SET
        balance_due = balance_due + ?
      WHERE id = ?
    `).run(amountDelta, id);
  },

  // Upgrade 3: Fleet & Corporate Accounts Directory
  getCorporateAccounts() {
    return db.prepare(`
      SELECT 
        COALESCE(corporate_name, 'بدون اسم') AS corporate_name,
        customer_type,
        COUNT(id) AS total_vehicles,
        SUM(balance_due) AS total_balance_due,
        MAX(discount_percent) AS discount_percent,
        MAX(credit_limit) AS credit_limit,
        MAX(billing_cycle) AS billing_cycle,
        MAX(corporate_tax_no) AS corporate_tax_no,
        GROUP_CONCAT(plate_number, ' ، ') AS plates_list
      FROM customers_vehicles
      WHERE corporate_name IS NOT NULL AND corporate_name != ''
      GROUP BY corporate_name
      ORDER BY total_balance_due DESC, total_vehicles DESC
    `).all();
  },

  // Upgrade 4: Log WhatsApp / Call Reminders
  logReminder(vehicleId, data = {}) {
    const v = db.prepare('SELECT id, last_odometer FROM customers_vehicles WHERE id = ?').get(vehicleId);
    if (!v) throw new Error('المركبة غير موجودة');

    const stmt = db.prepare(`
      INSERT INTO service_reminders_log (vehicle_id, reminder_type, odometer_at_reminder, notes)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      vehicleId,
      data.reminder_type || 'whatsapp',
      data.odometer !== undefined ? Number(data.odometer) : v.last_odometer,
      data.notes || 'تم إرسال تذكير خدمة الزيت الدوري عبر الواتساب'
    );

    return db.prepare(`
      SELECT * FROM service_reminders_log WHERE vehicle_id = ? ORDER BY id DESC LIMIT 10
    `).all(vehicleId);
  },

  // Upgrade 4: Advanced Predictive Retention Radar with 3000 km standard
  getRetentionRadar() {
    const today = new Date().toISOString().split('T')[0];

    const vehicles = db.prepare(`
      SELECT 
        cv.*,
        (SELECT MAX(created_at) FROM invoices WHERE vehicle_id = cv.id) AS last_service_date,
        (SELECT current_odometer FROM invoices WHERE vehicle_id = cv.id ORDER BY id DESC LIMIT 1) AS last_recorded_odometer,
        (SELECT COUNT(*) FROM invoices WHERE vehicle_id = cv.id) AS visit_count,
        (SELECT sent_at FROM service_reminders_log WHERE vehicle_id = cv.id ORDER BY id DESC LIMIT 1) AS last_reminded_at,
        (SELECT COUNT(*) FROM service_reminders_log WHERE vehicle_id = cv.id) AS reminder_sent_count
      FROM customers_vehicles cv
      WHERE cv.next_due_date IS NOT NULL OR cv.next_due_odometer > 0
    `).all();

    const radarList = [];

    for (const v of vehicles) {
      let isOverdue = false;
      let isDueSoon = false;
      let isApproaching = false;
      let daysDiff = null;
      let reason = '';
      let dailyKm = 40; // Default average km/day in Yemen

      // Calculate historical daily km pace if multiple visits
      if (v.visit_count >= 2) {
        const pastInvoices = db.prepare(`
          SELECT current_odometer, created_at 
          FROM invoices 
          WHERE vehicle_id = ? 
          ORDER BY id DESC LIMIT 2
        `).all(v.id);

        if (pastInvoices.length === 2) {
          const kmDiff = Number(pastInvoices[0].current_odometer) - Number(pastInvoices[1].current_odometer);
          const timeDiffDays = (new Date(pastInvoices[0].created_at) - new Date(pastInvoices[1].created_at)) / (1000 * 60 * 60 * 24);
          if (timeDiffDays > 0 && kmDiff > 0) {
            dailyKm = Math.min(250, Math.max(15, Math.round(kmDiff / timeDiffDays)));
          }
        }
      }

      // Estimate current odometer based on elapsed days since last service
      const daysSinceLast = v.last_service_date
        ? Math.max(0, Math.floor((new Date(today) - new Date(v.last_service_date)) / (1000 * 60 * 60 * 24)))
        : 30;

      const baseOdo = Number(v.last_odometer) || Number(v.last_recorded_odometer) || 0;
      const targetOdo = Number(v.next_due_odometer) || (baseOdo + 3000);
      const estimatedCurrentOdo = Math.round(baseOdo + (dailyKm * daysSinceLast));
      const kmRemaining = targetOdo - estimatedCurrentOdo;

      // Check date diff
      if (v.next_due_date) {
        const dueDate = new Date(v.next_due_date);
        const curDate = new Date(today);
        const diffTime = dueDate - curDate;
        daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // negative = overdue

        if (daysDiff < 0) {
          isOverdue = true;
          reason = `تجاوز موعد الزيارة المحدد بـ ${Math.abs(daysDiff)} يوم`;
        } else if (daysDiff <= 7) {
          isDueSoon = true;
          reason = `موعد الزيارة خلال ${daysDiff === 0 ? 'اليوم' : daysDiff + ' أيام'}`;
        } else if (daysDiff <= 14) {
          isApproaching = true;
          reason = `موعد الزيارة خلال ${daysDiff} يوماً`;
        }
      }

      // Check kilometer pace vs 3000 km target
      if (kmRemaining <= 0 && !isOverdue) {
        isOverdue = true;
        reason = `تجاوز مسافة الـ 3,000 كم بمقدار (${Math.abs(kmRemaining)} كم تقديراً بمعدل ${dailyKm} كم/يوم)`;
      } else if (kmRemaining > 0 && kmRemaining <= (dailyKm * 5) && !isOverdue) {
        isDueSoon = true;
        reason = `على وشك إتمام مسافة 3,000 كم (المتبقي قرابة ${kmRemaining} كم)`;
      }

      let status = 'safe';
      let urgencyLevel = 'normal';
      let statusLabel = 'آمن';

      if (isOverdue) {
        status = 'overdue';
        urgencyLevel = Math.abs(daysDiff || 0) > 15 || kmRemaining < -500 ? 'critical' : 'urgent';
        statusLabel = 'حان موعد التغيير ⚠️';
      } else if (isDueSoon) {
        status = 'due_soon';
        urgencyLevel = 'due_now';
        statusLabel = 'مستحق قريباً 🔔';
      } else if (isApproaching) {
        status = 'approaching';
        urgencyLevel = 'approaching';
        statusLabel = 'تذكير استباقي ⏳';
      }

      // Include all overdue, due soon, approaching or those with pending debt
      if (status !== 'safe' || v.balance_due > 0) {
        // Pre-formatted Yemeni WhatsApp Reminder Message
        const customerFirstName = v.customer_name ? v.customer_name.split(' ')[0] : 'العميل العزيز';
        const customWhatsAppMessage = `السلام عليكم ورحمة الله وبركاته 🚗
الأخ العزيز / ${v.customer_name} المحترم،
تحية طيبة من مركز سريع وبنشر لخدمات السيارات.

نود تذكيركم بموعد خدمة تغيير الزيت الدوري (3,000 كم) لسيارتكم:
🔹 نوع السيارة: ${v.car_make_model} (لوحة: ${v.plate_number})
🔹 قراءة العداد المستهدفة: ${Number(targetOdo).toLocaleString()} كم
🔹 الزيت المعتمد: ${v.preferred_oil_brand || 'الزيت المعتمد'} ${v.preferred_viscosity || ''}
${reason ? `⚠️ الحالة: ${reason}` : ''}

يسعدنا تشريفكم للمركز لتغيير الزيت وفحص السلامة المجاني لـ 8 نقاط للمركبة ✅
نتمنى لكم دوام السلامة والعافية 🌹`;

        radarList.push({
          vehicle_id: v.id,
          plate_number: v.plate_number,
          plate_type: v.plate_type,
          car_make_model: v.car_make_model,
          customer_name: v.customer_name,
          phone: v.phone,
          customer_type: v.customer_type || 'individual',
          corporate_name: v.corporate_name || null,
          discount_percent: v.discount_percent || 0,
          preferred_oil_brand: v.preferred_oil_brand,
          preferred_viscosity: v.preferred_viscosity,
          last_service_date: v.last_service_date,
          last_odometer: baseOdo,
          estimated_current_odometer: estimatedCurrentOdo,
          next_due_odometer: targetOdo,
          km_remaining: kmRemaining,
          daily_km_pace: dailyKm,
          next_due_date: v.next_due_date,
          days_diff: daysDiff,
          days_since_last: daysSinceLast,
          status,
          urgency_level: urgencyLevel,
          status_label: statusLabel,
          reason,
          balance_due: v.balance_due,
          credit_limit: v.credit_limit,
          last_reminded_at: v.last_reminded_at,
          reminder_sent_count: v.reminder_sent_count || 0,
          custom_whatsapp_message: customWhatsAppMessage,
        });
      }
    }

    // Sort: critical/overdue first, then due soon, then approaching
    return radarList.sort((a, b) => {
      const order = { overdue: 1, due_soon: 2, approaching: 3, safe: 4 };
      if (order[a.status] !== order[b.status]) {
        return (order[a.status] || 5) - (order[b.status] || 5);
      }
      return (a.km_remaining || 0) - (b.km_remaining || 0);
    });
  },
};

module.exports = vehicleModel;
