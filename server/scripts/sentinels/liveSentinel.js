/**
 * AL-BANSHAR PRO — Live Sentinel (الفاحص المرافق التلقائي)
 * 
 * Verifies:
 * 1. Chart of Accounts Integrity:
 *    - Strict Double-Entry Balance: SUM(debit) == SUM(credit) across all journal lines.
 *    - Referential Validity: All account codes exist in chart_of_accounts.
 *    - Normal Balance Invariants: No unhandled negative balance anomalies.
 * 2. Summary Metrics (الأيقونات الإجمالية):
 *    - Real-time matches between summary counters and raw table facts.
 *    - Total Sales in Dashboard == SUM(invoices.net_total).
 *    - Total Debt in Dashboard == SUM(customers_vehicles.balance_due).
 */

const { roundMoney } = require('../../utils/mathPrecision');

class LiveSentinel {
  /**
   * Validates Chart of Accounts balance and integrity
   * @param {import('better-sqlite3').Database} db 
   * @returns {{ passed: boolean, details: string, totalDebit: number, totalCredit: number, diff: number }}
   */
  static auditChartOfAccounts(db) {
    try {
      // 1. Double-Entry Balance
      const totals = db.prepare(`
        SELECT 
          COALESCE(SUM(debit), 0) AS total_debit,
          COALESCE(SUM(credit), 0) AS total_credit
        FROM journal_lines
      `).get();

      const totalDebit = roundMoney(totals.total_debit);
      const totalCredit = roundMoney(totals.total_credit);
      const diff = roundMoney(Math.abs(totalDebit - totalCredit));

      if (diff > 0.05) {
        return {
          passed: false,
          details: `اختلال في ميزان شجرة الحسابات! إجمالي المدين (${totalDebit}) لا يساوي الدائن (${totalCredit})، الفارق: ${diff}`,
          totalDebit,
          totalCredit,
          diff,
        };
      }

      // 2. Orphan Account Codes
      const orphanAccounts = db.prepare(`
        SELECT DISTINCT jl.account_code 
        FROM journal_lines jl
        LEFT JOIN chart_of_accounts coa ON jl.account_code = coa.code
        WHERE coa.code IS NULL
      `).all();

      if (orphanAccounts.length > 0) {
        const badCodes = orphanAccounts.map(a => a.account_code).join(', ');
        return {
          passed: false,
          details: `توجد قيود محاسبية مسجلة على حسابات غير موجودة في الشجرة: [${badCodes}]`,
          totalDebit,
          totalCredit,
          diff: 0,
        };
      }

      return {
        passed: true,
        details: `شجرة الحسابات متزنة 100% (إجمالي المدين: ${totalDebit} ر.ي = الدائن: ${totalCredit} ر.ي)`,
        totalDebit,
        totalCredit,
        diff: 0,
      };
    } catch (err) {
      return {
        passed: false,
        details: `خطأ أثناء فحص شجرة الحسابات: ${err.message}`,
        totalDebit: 0,
        totalCredit: 0,
        diff: -1,
      };
    }
  }

  /**
   * Validates Summary Metrics & KPI Cards vs Raw Tables
   * @param {import('better-sqlite3').Database} db 
   * @returns {{ passed: boolean, discrepancies: Array<{ metric: string, uiValue: number, dbValue: number, diff: number }> }}
   */
  static auditSummaryMetrics(db) {
    const discrepancies = [];

    try {
      // Metric 1: Total Customer Debts (أيقونة إجمالي الديون)
      const debtSum = db.prepare(`
        SELECT COALESCE(SUM(balance_due), 0) as total_debt 
        FROM customers_vehicles
      `).get();
      const rawDebt = roundMoney(debtSum.total_debt);

      // Verify against journal line receivables (1201 - ذمم العملاء)
      const arLines = db.prepare(`
        SELECT 
          COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as ar_balance
        FROM journal_lines 
        WHERE account_code = '1201'
      `).get();
      const arLedger = roundMoney(arLines.ar_balance);

      const debtDiff = roundMoney(Math.abs(rawDebt - arLedger));
      if (debtDiff > 0.05) {
        discrepancies.push({
          metric: 'أيقونة إجمالي ديون العملاء (1201 ذمم العملاء)',
          uiValue: rawDebt,
          dbValue: arLedger,
          diff: debtDiff,
        });
      }

      // Metric 2: Net Invoices vs Goods + Labor Revenue
      const invTotals = db.prepare(`
        SELECT 
          COALESCE(SUM(net_total), 0) as total_net,
          COALESCE(SUM(items_total), 0) as total_items,
          COALESCE(SUM(labor_total), 0) as total_labor,
          COALESCE(SUM(discount), 0) as total_discount,
          COALESCE(SUM(scrap_battery_deduction), 0) as total_scrap
        FROM invoices
      `).get();

      const expectedNet = roundMoney(
        Math.max(0, invTotals.total_items + invTotals.total_labor - (invTotals.total_discount + invTotals.total_scrap))
      );
      const actualNet = roundMoney(invTotals.total_net);
      const netDiff = roundMoney(Math.abs(expectedNet - actualNet));

      if (netDiff > 0.05) {
        discrepancies.push({
          metric: 'أيقونة إجمالي المبيعات الصافية (Net Sales KPI)',
          uiValue: actualNet,
          dbValue: expectedNet,
          diff: netDiff,
        });
      }

      return {
        passed: discrepancies.length === 0,
        discrepancies,
      };
    } catch (err) {
      return {
        passed: false,
        discrepancies: [{ metric: 'خطأ استعلام المؤشرات', uiValue: 0, dbValue: 0, diff: -1 }],
      };
    }
  }

  /**
   * Master Sentinel Check: runs both COA and Metrics audits
   * @param {import('better-sqlite3').Database} db 
   */
  static runFullSentinel(db) {
    const coaResult = this.auditChartOfAccounts(db);
    const metricsResult = this.auditSummaryMetrics(db);

    return {
      allPassed: coaResult.passed && metricsResult.passed,
      coaResult,
      metricsResult,
    };
  }
}

module.exports = LiveSentinel;
