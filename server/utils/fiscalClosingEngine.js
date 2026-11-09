/**
 * AL-BANSHAR PRO — Fiscal Year-End Closing Engine (محرك الإغلاق السنوي وترحيل الأرباح)
 * 
 * Enterprise Double-Entry Accounting Standard:
 * 1. Closes Nominal/Temporary Accounts (4xxx Revenues, 5xxx COGS, 6xxx Expenses)
 * 2. Transfers Net Profit / Loss cleanly into 3201 (الأرباح والخسائر المدورة - Retained Earnings)
 * 3. Enforces Zero-Tolerance Double-Entry Balance (Total Debits === Total Credits)
 * 4. Freezes Closed Periods against retroactive backdating
 * 5. Supports safe administrative reopening with reversible journal entry removal
 */

const { roundMoney, safeNum } = require('./mathPrecision');
const { createJournalEntry } = require('./accountingEngine');

const fiscalClosingEngine = {
  getFiscalYearStatus(db, year) {
    const y = parseInt(year, 10);
    return db.prepare('SELECT * FROM fiscal_years WHERE year = ?').get(y) || null;
  },

  getAllFiscalYears(db) {
    return db.prepare('SELECT * FROM fiscal_years ORDER BY year DESC').all();
  },

  isDateInClosedYear(db, dateStr) {
    if (!dateStr) return false;
    const year = parseInt(dateStr.slice(0, 4), 10);
    if (!year || isNaN(year)) return false;
    const fy = db.prepare('SELECT is_closed FROM fiscal_years WHERE year = ?').get(year);
    return Boolean(fy && fy.is_closed === 1);
  },

  /**
   * Preview nominal accounts to close and calculate net profit/loss without mutating state
   */
  previewFiscalClosing(db, year) {
    const y = parseInt(year, 10);
    if (!y || isNaN(y) || y < 2000 || y > 2100) {
      throw new Error(`السنة المالية المحددة (${year}) غير صالحة.`);
    }

    const existingFY = this.getFiscalYearStatus(db, y);
    if (existingFY && existingFY.is_closed === 1) {
      return {
        is_already_closed: true,
        year: y,
        closed_at: existingFY.closed_at,
        closed_by: existingFY.closed_by,
        closing_jv_id: existingFY.closing_jv_id,
        net_profit: existingFY.net_profit,
        retained_earnings_transferred: existingFY.retained_earnings_transferred,
        message: `السنة المالية (${y}) مقفلة مسبقاً بموجب القيد رقم (${existingFY.closing_jv_id}).`,
      };
    }

    const startDate = `${y}-01-01`;
    const endDate = `${y}-12-31`;

    // Query nominal ledger balances (4xxx, 5xxx, 6xxx) for the target fiscal year
    const rows = db.prepare(`
      SELECT 
        coa.code,
        coa.name,
        coa.type,
        coa.sub_type,
        coa.normal_balance,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM chart_of_accounts coa
      JOIN journal_lines jel ON jel.account_code = coa.code
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE (coa.code LIKE '4%' OR coa.code LIKE '5%' OR coa.code LIKE '6%')
        AND je.entry_date >= ? AND je.entry_date <= ?
        AND (je.ref_type IS NULL OR je.ref_type != 'closing_entry')
      GROUP BY coa.code
      ORDER BY coa.code ASC
    `).all(startDate, endDate);

    let totalRevenues = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    const accountsToClose = [];
    const closingLines = [];

    for (const r of rows) {
      const debit = roundMoney(safeNum(r.total_debit, 0));
      const credit = roundMoney(safeNum(r.total_credit, 0));

      if (r.code.startsWith('4')) {
        // Revenues: normal balance is Credit
        const netRevenue = roundMoney(credit - debit);
        if (Math.abs(netRevenue) > 0.001) {
          totalRevenues = roundMoney(totalRevenues + netRevenue);
          accountsToClose.push({
            code: r.code,
            name: r.name,
            category: 'revenue',
            netBalance: netRevenue,
          });

          // Debit revenue to zero it out
          if (netRevenue > 0) {
            closingLines.push({
              account_code: r.code,
              debit: netRevenue,
              credit: 0,
              description: `إغلاق إيراد: ${r.name} للسنة ${y}`,
            });
          } else {
            closingLines.push({
              account_code: r.code,
              debit: 0,
              credit: Math.abs(netRevenue),
              description: `إغلاق تسوية إيراد: ${r.name} للسنة ${y}`,
            });
          }
        }
      } else if (r.code.startsWith('5')) {
        // COGS: normal balance is Debit
        const netCOGS = roundMoney(debit - credit);
        if (Math.abs(netCOGS) > 0.001) {
          totalCOGS = roundMoney(totalCOGS + netCOGS);
          accountsToClose.push({
            code: r.code,
            name: r.name,
            category: 'cogs',
            netBalance: netCOGS,
          });

          // Credit COGS to zero it out
          if (netCOGS > 0) {
            closingLines.push({
              account_code: r.code,
              debit: 0,
              credit: netCOGS,
              description: `إغلاق تكلفة بضاعة: ${r.name} للسنة ${y}`,
            });
          } else {
            closingLines.push({
              account_code: r.code,
              debit: Math.abs(netCOGS),
              credit: 0,
              description: `إغلاق تسوية تكلفة: ${r.name} للسنة ${y}`,
            });
          }
        }
      } else if (r.code.startsWith('6')) {
        // Operating Expenses: normal balance is Debit
        const netExpense = roundMoney(debit - credit);
        if (Math.abs(netExpense) > 0.001) {
          totalExpenses = roundMoney(totalExpenses + netExpense);
          accountsToClose.push({
            code: r.code,
            name: r.name,
            category: 'expense',
            netBalance: netExpense,
          });

          // Credit Expense to zero it out
          if (netExpense > 0) {
            closingLines.push({
              account_code: r.code,
              debit: 0,
              credit: netExpense,
              description: `إغلاق مصروف: ${r.name} للسنة ${y}`,
            });
          } else {
            closingLines.push({
              account_code: r.code,
              debit: Math.abs(netExpense),
              credit: 0,
              description: `إغلاق تسوية مصروف: ${r.name} للسنة ${y}`,
            });
          }
        }
      }
    }

    // Net Profit or Loss
    const netProfit = roundMoney(totalRevenues - (totalCOGS + totalExpenses));

    // Balancing Line: Retained Earnings Transfer (3201 الأرباح والخسائر المدورة)
    if (Math.abs(netProfit) > 0.001) {
      if (netProfit > 0) {
        // Net Profit -> Credit Equity (3201)
        closingLines.push({
          account_code: '3201',
          debit: 0,
          credit: netProfit,
          description: `ترحيل صافي أرباح السنة المالية ${y} إلى الأرباح والخسائر المدورة`,
        });
      } else {
        // Net Loss -> Debit Equity (3201)
        closingLines.push({
          account_code: '3201',
          debit: Math.abs(netProfit),
          credit: 0,
          description: `ترحيل صافي خسارة السنة المالية ${y} إلى الأرباح والخسائر المدورة`,
        });
      }
    }

    return {
      is_already_closed: false,
      year: y,
      startDate,
      endDate,
      totalRevenues,
      totalCOGS,
      totalExpenses,
      netProfit,
      isProfit: netProfit >= 0,
      accountsToClose,
      closingLines,
    };
  },

  /**
   * Execute atomic fiscal closing and lock the year
   */
  executeFiscalClosing(db, { year, closedBy = 'المشرف العام', notes = '' }) {
    const preview = this.previewFiscalClosing(db, year);
    if (preview.is_already_closed) {
      throw new Error(`السنة المالية (${year}) مقفلة مسبقاً ولا يمكن تكرار الإغلاق.`);
    }

    if (preview.closingLines.length < 2) {
      throw new Error(`لا توجد حسابات أو حركات كافية لإجراء الإغلاق السنوي للسنة (${year}).`);
    }

    const executeTx = db.transaction(() => {
      // 1. Post closing journal entry
      const jv = createJournalEntry(db, {
        entry_date: `${preview.year}-12-31`,
        ref_type: 'closing_entry',
        ref_id: preview.year,
        ref_number: `FY-CLOSE-${preview.year}`,
        description: `قيد الإغلاق السنوي وترحيل الأرباح والخسائر للسنة المالية ${preview.year}`,
        lines: preview.closingLines,
      });

      // 2. Lock fiscal year in fiscal_years table (Supports re-closing if year was reopened)
      const upsertFY = db.prepare(`
        INSERT INTO fiscal_years (
          year, start_date, end_date, is_closed, closed_at, closed_by, closing_jv_id,
          total_revenue, total_cogs, total_expenses, net_profit, retained_earnings_transferred, notes
        ) VALUES (?, ?, ?, 1, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(year) DO UPDATE SET
          is_closed = 1,
          closed_at = datetime('now', 'localtime'),
          closed_by = excluded.closed_by,
          closing_jv_id = excluded.closing_jv_id,
          total_revenue = excluded.total_revenue,
          total_cogs = excluded.total_cogs,
          total_expenses = excluded.total_expenses,
          net_profit = excluded.net_profit,
          retained_earnings_transferred = excluded.retained_earnings_transferred,
          notes = excluded.notes
      `);

      upsertFY.run(
        preview.year,
        preview.startDate,
        preview.endDate,
        closedBy,
        jv.id,
        preview.totalRevenues,
        preview.totalCOGS,
        preview.totalExpenses,
        preview.netProfit,
        preview.netProfit,
        notes || `تم الإغلاق السنوي وترحيل أرباح قدرها ${preview.netProfit.toLocaleString()} ر.ي`
      );

      return {
        success: true,
        year: preview.year,
        closing_jv_id: jv.id,
        entry_number: jv.entry_number,
        total_revenue: preview.totalRevenues,
        total_cogs: preview.totalCOGS,
        total_expenses: preview.totalExpenses,
        net_profit: preview.netProfit,
        closed_by: closedBy,
        closed_at: new Date().toISOString(),
      };
    });

    return executeTx();
  },

  /**
   * Reopen a closed fiscal year for authorized adjustments
   */
  reopenFiscalYear(db, { year, reopenedBy = 'المشرف العام', reason = '' }) {
    const y = parseInt(year, 10);
    const fy = this.getFiscalYearStatus(db, y);
    if (!fy || fy.is_closed !== 1) {
      throw new Error(`السنة المالية (${year}) ليست مقفلة حالياً.`);
    }

    const executeTx = db.transaction(() => {
      // 1. Clear foreign key reference on fiscal_years first
      db.prepare(`
        UPDATE fiscal_years 
        SET is_closed = 0, closing_jv_id = NULL, notes = COALESCE(notes, '') || ' | تم إلغاء الإغلاق بواسطة ' || ?
        WHERE year = ?
      `).run(reopenedBy, y);

      // 2. Safely delete the closing journal entry and its lines
      if (fy.closing_jv_id) {
        db.prepare('DELETE FROM journal_lines WHERE journal_entry_id = ?').run(fy.closing_jv_id);
        db.prepare('DELETE FROM journal_entries WHERE id = ?').run(fy.closing_jv_id);
      }

      return {
        success: true,
        year: y,
        message: `تم إلغاء إغلاق السنة المالية (${y}) بنجاح وإعادة فتح القيود.`,
      };
    });

    return executeTx();
  },
};

module.exports = fiscalClosingEngine;
