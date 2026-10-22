const db = require('../db/database');

const workerModel = {
  getAll(activeOnly = false) {
    let query = 'SELECT * FROM workers';
    if (activeOnly) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY name ASC';
    return db.prepare(query).all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO workers (name, role, phone, daily_base_wage, commission_rate, active)
      VALUES (@name, @role, @phone, @daily_base_wage, @commission_rate, @active)
    `);

    const result = stmt.run({
      name: data.name.trim(),
      role: data.role.trim(),
      phone: data.phone ? data.phone.trim() : null,
      daily_base_wage: Number(data.daily_base_wage) || 0,
      commission_rate: Number(data.commission_rate) || 0,
      active: data.active !== undefined ? (data.active ? 1 : 0) : 1,
    });

    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE workers SET
        name = @name,
        role = @role,
        phone = @phone,
        daily_base_wage = @daily_base_wage,
        commission_rate = @commission_rate,
        active = @active
      WHERE id = @id
    `);

    stmt.run({
      id,
      name: data.name ? data.name.trim() : existing.name,
      role: data.role ? data.role.trim() : existing.role,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone,
      daily_base_wage: data.daily_base_wage !== undefined ? Number(data.daily_base_wage) : existing.daily_base_wage,
      commission_rate: data.commission_rate !== undefined ? Number(data.commission_rate) : existing.commission_rate,
      active: data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
    });

    return this.getById(id);
  },

  getDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const workers = this.getAll(true);

    return workers.map((w) => {
      // Jobs served today
      const jobsCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE worker_id = ? AND date(created_at) = date(?)
      `).get(w.id, targetDate).count;

      // Advances taken today
      const advancesSum = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM daily_transactions 
        WHERE worker_id = ? AND tx_type = 'worker_advance' AND date(created_at) = date(?)
      `).get(w.id, targetDate).total;

      const dailyWage = w.daily_base_wage || 0;
      const netPayable = Math.max(0, dailyWage - advancesSum);

      return {
        ...w,
        cars_served_today: jobsCount,
        advances_today: advancesSum,
        net_due_today: netPayable,
      };
    });
  },
};

module.exports = workerModel;
