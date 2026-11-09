const db = require('../db/database');
const { formatDate } = require('../utils/helpers');

const workerModel = {
  getAll(activeOnly = false) {
    let query = 'SELECT * FROM workers';
    if (activeOnly) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY id ASC';
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
      role: data.role ? data.role.trim() : 'فني غيار زيوت وبنشر',
      phone: data.phone ? data.phone.trim() : null,
      daily_base_wage: Number(data.daily_base_wage) || 0,
      commission_rate: 0,
      active: data.active !== undefined ? (data.active ? 1 : 0) : 1,
    });

    const newWorker = this.getById(result.lastInsertRowid);
    // Automatically ensure attendance record for today
    this.ensureAttendance(newWorker.id);
    return newWorker;
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
        commission_rate = 0,
        active = @active
      WHERE id = @id
    `);

    stmt.run({
      id,
      name: data.name ? data.name.trim() : existing.name,
      role: data.role ? data.role.trim() : existing.role,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone,
      daily_base_wage: data.daily_base_wage !== undefined ? Number(data.daily_base_wage) : existing.daily_base_wage,
      active: data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
    });

    // If daily wage was updated, also update today's attendance wage if present
    if (data.daily_base_wage !== undefined) {
      const today = formatDate();
      db.prepare(`
        UPDATE worker_attendance 
        SET daily_wage = ? 
        WHERE worker_id = ? AND work_date = ? AND status = 'present'
      `).run(Number(data.daily_base_wage), id, today);
    }

    return this.getById(id);
  },

  ensureAttendance(workerId, date = null) {
    const targetDate = date ? formatDate(date) : formatDate();
    const worker = this.getById(workerId);
    if (!worker) return null;

    let att = db.prepare(`
      SELECT * FROM worker_attendance 
      WHERE worker_id = ? AND work_date = ?
    `).get(workerId, targetDate);

    if (!att) {
      // Default to 'present' for active workers with their standard daily wage
      const status = worker.active ? 'present' : 'absent';
      const wage = status === 'present' ? Number(worker.daily_base_wage) || 0 : 0;
      const res = db.prepare(`
        INSERT INTO worker_attendance (worker_id, work_date, status, daily_wage)
        VALUES (?, ?, ?, ?)
      `).run(workerId, targetDate, status, wage);

      att = db.prepare('SELECT * FROM worker_attendance WHERE id = ?').get(res.lastInsertRowid);
    }

    return att;
  },

  toggleAttendance(workerId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const worker = this.getById(workerId);
    if (!worker) throw new Error('الفني غير مسجل في النظام');

    let att = this.ensureAttendance(workerId, targetDate);
    const newStatus = att.status === 'present' ? 'absent' : 'present';
    const newWage = newStatus === 'present' ? Number(worker.daily_base_wage) || 0 : 0;

    db.prepare(`
      UPDATE worker_attendance 
      SET status = ?, daily_wage = ?
      WHERE worker_id = ? AND work_date = ?
    `).run(newStatus, newWage, workerId, targetDate);

    return db.prepare('SELECT * FROM worker_attendance WHERE worker_id = ? AND work_date = ?').get(workerId, targetDate);
  },

  getWorkerBalance(workerId) {
    // 1. Total earned wages across all attendance records
    const earnedRow = db.prepare(`
      SELECT COALESCE(SUM(daily_wage), 0) AS total
      FROM worker_attendance
      WHERE worker_id = ? AND status = 'present'
    `).get(workerId);
    const totalEarned = Number(earnedRow ? earnedRow.total : 0);

    // 2. Total advances (from official_vouchers with offset_account_code = '1202', plus any non-duplicated daily_transactions)
    const advVoucherRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM official_vouchers
      WHERE party_type = 'worker' AND party_id = ? AND voucher_type = 'payment' 
        AND offset_account_code = '1202' AND status = 'posted'
    `).get(workerId);

    const legacyAdvRow = db.prepare(`
      SELECT COALESCE(SUM(dt.amount), 0) AS total
      FROM daily_transactions dt
      WHERE dt.worker_id = ? AND dt.tx_type = 'worker_advance'
        AND NOT EXISTS (
          SELECT 1 FROM official_vouchers ov
          WHERE ov.party_type = 'worker' AND ov.party_id = dt.worker_id
            AND ov.amount = dt.amount AND date(ov.created_at) = date(dt.created_at)
        )
    `).get(workerId);

    const totalAdvances = (Number(advVoucherRow ? advVoucherRow.total : 0) + Number(legacyAdvRow ? legacyAdvRow.total : 0));

    // 3. Total salary payouts / settlements (from official_vouchers with offset_account_code = '6108')
    const payoutVoucherRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM official_vouchers
      WHERE party_type = 'worker' AND party_id = ? AND voucher_type = 'payment' 
        AND offset_account_code = '6108' AND status = 'posted'
    `).get(workerId);
    const totalPayouts = Number(payoutVoucherRow ? payoutVoucherRow.total : 0);

    // Net balance due to worker (Positive = Center owes worker / له، Negative = Worker owes center / عليه)
    const netBalance = totalEarned - (totalAdvances + totalPayouts);

    return {
      total_earned: totalEarned,
      total_advances: totalAdvances,
      total_payouts: totalPayouts,
      net_balance: netBalance,
    };
  },

  getDailyStats(date = null) {
    const targetDate = date ? formatDate(date) : formatDate();
    const workers = this.getAll(true);

    return workers.map((w) => {
      // Ensure today's attendance record is generated
      const attendance = this.ensureAttendance(w.id, targetDate);

      // Advances taken on targetDate
      const advTodayRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM official_vouchers
        WHERE party_type = 'worker' AND party_id = ? AND voucher_type = 'payment'
          AND offset_account_code = '1202' AND date(created_at) = date(?) AND status = 'posted'
      `).get(w.id, targetDate);

      const legacyAdvTodayRow = db.prepare(`
        SELECT COALESCE(SUM(dt.amount), 0) AS total
        FROM daily_transactions dt
        WHERE dt.worker_id = ? AND dt.tx_type = 'worker_advance' AND date(dt.created_at) = date(?)
          AND NOT EXISTS (
            SELECT 1 FROM official_vouchers ov
            WHERE ov.party_type = 'worker' AND ov.party_id = dt.worker_id
              AND ov.amount = dt.amount AND date(ov.created_at) = date(dt.created_at)
          )
      `).get(w.id, targetDate);

      const advancesToday = Number(advTodayRow ? advTodayRow.total : 0) + Number(legacyAdvTodayRow ? legacyAdvTodayRow.total : 0);

      // Payouts paid on targetDate
      const payoutTodayRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM official_vouchers
        WHERE party_type = 'worker' AND party_id = ? AND voucher_type = 'payment'
          AND offset_account_code = '6108' AND date(created_at) = date(?) AND status = 'posted'
      `).get(w.id, targetDate);
      const payoutsToday = Number(payoutTodayRow ? payoutTodayRow.total : 0);

      const todayWage = attendance ? Number(attendance.daily_wage) || 0 : Number(w.daily_base_wage) || 0;
      const todayStatus = attendance ? attendance.status : 'present';
      const balanceStats = this.getWorkerBalance(w.id);

      return {
        ...w,
        today_status: todayStatus,
        today_wage: todayWage,
        advances_today: advancesToday,
        advances_taken_today: advancesToday,
        payouts_today: payoutsToday,
        net_due_today: todayWage - advancesToday,
        total_earned_wages: balanceStats.total_earned,
        total_advances: balanceStats.total_advances,
        total_payouts: balanceStats.total_payouts,
        cumulative_balance: balanceStats.net_balance,
      };
    });
  },
};

module.exports = workerModel;
