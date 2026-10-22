const db = require('../db/database');

const expenseCategoryModel = {
  getAll() {
    return db.prepare('SELECT * FROM expense_categories ORDER BY id ASC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
  },

  create(data) {
    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('اسم تصنيف المصروف مطلوب');
    }

    const stmt = db.prepare(`
      INSERT INTO expense_categories (name, icon, is_system)
      VALUES (?, ?, 0)
    `);

    const result = stmt.run(name, data.icon || 'FileText');
    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('اسم تصنيف المصروف لا يمكن أن يكون فارغاً');
    }

    const stmt = db.prepare(`
      UPDATE expense_categories SET
        name = ?,
        icon = COALESCE(?, icon)
      WHERE id = ?
    `);

    stmt.run(name, data.icon || null, id);
    return this.getById(id);
  },

  delete(id) {
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
    return true;
  },
};

module.exports = expenseCategoryModel;
