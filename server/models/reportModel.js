const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum } = require('../utils/mathPrecision');

function getPreviousDate(dateStr, daysAgo = 1) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getDayBriefMetrics(date) {
  const row = db.prepare(`
    SELECT 
      COUNT(*) AS total_invoices,
      COUNT(DISTINCT vehicle_id) AS total_cars_served,
      COALESCE(SUM(items_total), 0) AS goods_sales,
      COALESCE(SUM(labor_total), 0) AS services_revenue,
      COALESCE(SUM(net_total), 0) AS total_net_sales,
      COALESCE(SUM(paid_amount), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END), 0) AS cash_sales
    FROM invoices
    WHERE date(created_at) = date(?)
  `).get(date);

  return {
    date,
    total_invoices: row?.total_invoices || 0,
    total_cars_served: row?.total_cars_served || 0,
    goods_sales: row?.goods_sales || 0,
    services_revenue: row?.services_revenue || 0,
    total_net_sales: row?.total_net_sales || 0,
    total_paid: row?.total_paid || 0,
    cash_sales: row?.cash_sales || 0,
  };
}

function calcGrowthPct(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return roundMoney(((current - previous) / previous) * 100);
}

function getHourlyBreakdown(date) {
  const rows = db.prepare(`
    SELECT 
      strftime('%H', created_at) AS hour_str,
      COUNT(*) AS invoices_count,
      COUNT(DISTINCT vehicle_id) AS cars_count,
      COALESCE(SUM(net_total), 0) AS total_sales,
      COALESCE(SUM(labor_total), 0) AS services_sales
    FROM invoices
    WHERE date(created_at) = date(?)
    GROUP BY hour_str
    ORDER BY hour_str ASC
  `).all(date);

  const hourlyData = [];
  let peakHour = null;
  let maxCars = 0;

  // Cover all 24 hours (00:00 to 23:59) so frontend can dynamically filter by configured settings
  for (let h = 0; h < 24; h++) {
    const hStr = String(h).padStart(2, '0');
    const found = rows.find(r => r.hour_str === hStr);
    const cars = found ? found.cars_count : 0;
    const sales = found ? found.total_sales : 0;
    const invoices = found ? found.invoices_count : 0;
    const services = found ? found.services_sales : 0;

    const period = h < 12 ? 'ص' : 'م';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const label = `${String(displayHour).padStart(2, '0')}:00 ${period}`;

    const item = {
      hour: h,
      hour_str: hStr,
      label,
      cars_count: cars,
      invoices_count: invoices,
      total_sales: sales,
      services_sales: services,
    };
    hourlyData.push(item);

    if (cars > maxCars) {
      maxCars = cars;
      peakHour = item;
    }
  }

  return {
    timeline: hourlyData,
    peak_hour: peakHour || { hour: 16, hour_str: '16', label: '04:00 م', cars_count: 0, total_sales: 0 },
  };
}

const reportModel = {
  getDailyClosing(targetDate) {
    const date = targetDate || formatDate();

    // 1. Invoices stats for the day
    const invoicesSummary = db.prepare(`
      SELECT 
        COUNT(*) AS total_invoices,
        COUNT(DISTINCT vehicle_id) AS total_cars_served,
        COALESCE(SUM(items_total), 0) AS total_items_amount,
        COALESCE(SUM(labor_total), 0) AS total_labor_amount,
        COALESCE(SUM(scrap_battery_deduction), 0) AS total_scrap_deductions,
        COALESCE(SUM(discount), 0) AS total_discounts,
        COALESCE(SUM(net_total), 0) AS total_net_sales,
        COALESCE(SUM(paid_amount), 0) AS total_paid_amount,
        COALESCE(SUM(remaining_debt), 0) AS total_new_debts
      FROM invoices
      WHERE date(created_at) = date(?)
    `).get(date);

    // 2. Payments by method from invoices
    const paymentBreakdownRows = db.prepare(`
      SELECT 
        payment_method,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COUNT(*) AS tx_count
      FROM invoices
      WHERE date(created_at) = date(?)
      GROUP BY payment_method
    `).all(date);

    const paymentMethods = {
      cash: 0,
      jeeb: 0,
      jawali: 0,
      kuraimi: 0,
      onecash: 0,
      credit: 0,
      split: 0,
    };

    let totalWallets = 0;
    for (const row of paymentBreakdownRows) {
      if (paymentMethods[row.payment_method] !== undefined) {
        paymentMethods[row.payment_method] = row.total_paid;
      }
      if (['jeeb', 'jawali', 'kuraimi', 'onecash'].includes(row.payment_method)) {
        totalWallets += row.total_paid;
      }
    }

    // 3. Daily Transactions (Expenses, Worker Advances, Debt Collections)
    const txBreakdownRows = db.prepare(`
      SELECT 
        tx_type,
        payment_method,
        COALESCE(SUM(amount), 0) AS total_amount,
        COUNT(*) AS count
      FROM daily_transactions
      WHERE date(created_at) = date(?)
      GROUP BY tx_type, payment_method
    `).all(date);

    let expensesTotal = 0;
    let expensesCash = 0;
    let workerAdvancesTotal = 0;
    let workerAdvancesCash = 0;
    let debtCollectionsTotal = 0;
    let debtCollectionsCash = 0;

    for (const tx of txBreakdownRows) {
      if (tx.tx_type === 'expense') {
        expensesTotal += tx.total_amount;
        if (tx.payment_method === 'cash') expensesCash += tx.total_amount;
      } else if (tx.tx_type === 'worker_advance') {
        workerAdvancesTotal += tx.total_amount;
        if (tx.payment_method === 'cash') workerAdvancesCash += tx.total_amount;
      } else if (tx.tx_type === 'debt_collection') {
        debtCollectionsTotal += tx.total_amount;
        if (tx.payment_method === 'cash') debtCollectionsCash += tx.total_amount;
      }
    }

    // 4. Net Cash Drawer calculation
    const totalCashInflow = paymentMethods.cash + debtCollectionsCash;
    const totalCashOutflow = expensesCash + workerAdvancesCash;
    const netDrawerCash = totalCashInflow - totalCashOutflow;

    // 5. Official Vouchers for the day (RV & PV)
    let vouchersSummary = {
      total_receipts: 0,
      receipts_cash: 0,
      count_receipts: 0,
      total_payments: 0,
      payments_cash: 0,
      count_payments: 0,
      owner_drawings: 0,
      supplier_payments: 0,
      operating_expenses: 0,
      list: [],
    };

    try {
      const vList = db.prepare(`
        SELECT * FROM official_vouchers
        WHERE date(created_at) = date(?)
        ORDER BY id DESC
      `).all(date);

      vouchersSummary.list = vList;
      for (const v of vList) {
        if (v.voucher_type === 'receipt') {
          vouchersSummary.total_receipts += v.amount;
          vouchersSummary.count_receipts += 1;
          if (v.payment_method === 'cash') vouchersSummary.receipts_cash += v.amount;
        } else {
          vouchersSummary.total_payments += v.amount;
          vouchersSummary.count_payments += 1;
          if (v.payment_method === 'cash') vouchersSummary.payments_cash += v.amount;

          if (v.party_type === 'owner' || v.offset_account_code === '3101') {
            vouchersSummary.owner_drawings += v.amount;
          } else if (v.party_type === 'supplier' || v.offset_account_code === '2101') {
            vouchersSummary.supplier_payments += v.amount;
          } else {
            vouchersSummary.operating_expenses += v.amount;
          }
        }
      }
    } catch (e) {
      // official_vouchers table query fallback
    }

    // 6. Inbound Purchases for the day paid from drawer
    let purchasesToday = {
      count: 0,
      total_amount: 0,
      paid_cash: 0,
      shipping_cash: 0,
    };

    try {
      const purRows = db.prepare(`
        SELECT 
          COUNT(*) AS count,
          COALESCE(SUM(total_amount), 0) AS total_amount,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' AND paid_from_cash_drawer = 1 THEN paid_amount ELSE 0 END), 0) AS paid_cash,
          COALESCE(SUM(CASE WHEN shipping_payer = 'cash_drawer' THEN shipping_cost ELSE 0 END), 0) AS shipping_cash
        FROM purchases
        WHERE date(created_at) = date(?)
      `).get(date);

      if (purRows) {
        purchasesToday = {
          count: purRows.count,
          total_amount: purRows.total_amount,
          paid_cash: purRows.paid_cash,
          shipping_cash: purRows.shipping_cash,
        };
      }
    } catch (e) {
      // purchases query fallback
    }

    // 7. General Ledger Live Balances
    let liveLedger = {
      cash_drawer_1101: 0,
      bank_kuraimi_1102: 0,
      e_wallet_jeeb_1103: 0,
    };

    try {
      const row1101 = db.prepare(`
        SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS bal
        FROM journal_lines WHERE account_code = '1101'
      `).get();
      const row1102 = db.prepare(`
        SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS bal
        FROM journal_lines WHERE account_code = '1102'
      `).get();
      const row1103 = db.prepare(`
        SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS bal
        FROM journal_lines WHERE account_code = '1103'
      `).get();

      liveLedger = {
        cash_drawer_1101: roundMoney(Number(row1101?.bal) || 0),
        bank_kuraimi_1102: roundMoney(Number(row1102?.bal) || 0),
        e_wallet_jeeb_1103: roundMoney(Number(row1103?.bal) || 0),
      };
    } catch (e) {
      // journal lines fallback
    }

    // 8. Overall Debts & Payables Status
    let customerDebtsTotal = 0;
    let supplierPayablesTotal = 0;
    try {
      customerDebtsTotal = db.prepare("SELECT COALESCE(SUM(balance_due), 0) AS total FROM customers_vehicles WHERE balance_due > 0").get().total || 0;
      supplierPayablesTotal = db.prepare("SELECT COALESCE(SUM(balance_due), 0) AS total FROM suppliers WHERE balance_due > 0").get().total || 0;
    } catch (e) {}

    // 9. Oil Packs breakdown (1L, 4L, 5L, bulk_liter)
    const oilPacksBreakdown = db.prepare(`
      SELECT 
        COALESCE(inv.pack_size, 'other') AS pack_size,
        COALESCE(SUM(ii.qty), 0) AS total_qty_sold,
        COALESCE(SUM(ii.subtotal), 0) AS total_amount
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE date(i.created_at) = date(?) AND inv.category = 'oil'
      GROUP BY inv.pack_size
    `).all(date);

    const oilPacks = {
      '1L': 0,
      '4L': 0,
      '5L': 0,
      'bulk_liter': 0,
      'other': 0,
    };
    for (const op of oilPacksBreakdown) {
      if (oilPacks[op.pack_size] !== undefined) {
        oilPacks[op.pack_size] = op.total_qty_sold;
      }
    }

    // Detailed oil items sold
    const oilItemsSold = db.prepare(`
      SELECT 
        inv.name,
        inv.brand,
        inv.viscosity,
        inv.pack_size,
        SUM(ii.qty) AS qty_sold,
        SUM(ii.subtotal) AS total_sales
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE date(i.created_at) = date(?) AND inv.category = 'oil'
      GROUP BY inv.id
      ORDER BY qty_sold DESC
    `).all(date);

    // 10. Filters sold
    const filtersSold = db.prepare(`
      SELECT 
        inv.name,
        inv.brand,
        SUM(ii.qty) AS qty_sold,
        SUM(ii.subtotal) AS total_sales
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE date(i.created_at) = date(?) AND inv.category = 'filter'
      GROUP BY inv.id
      ORDER BY qty_sold DESC
    `).all(date);

    const totalFiltersCount = filtersSold.reduce((acc, curr) => acc + curr.qty_sold, 0);

    // 11. Workers performance & commissions
    const workers = db.prepare('SELECT * FROM workers WHERE active = 1 ORDER BY id ASC').all();
    const workerReports = [];

    for (const w of workers) {
      const workerInvoices = db.prepare(`
        SELECT 
          COUNT(*) AS jobs_done,
          COALESCE(SUM(labor_total), 0) AS total_labor
        FROM invoices
        WHERE worker_id = ? AND date(created_at) = date(?)
      `).get(w.id, date);

      const workerAdvances = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS advances
        FROM daily_transactions
        WHERE worker_id = ? AND tx_type = 'worker_advance' AND date(created_at) = date(?)
      `).get(w.id, date);

      const commissionEarned = (workerInvoices.total_labor * (w.commission_rate / 100));
      const dailyBaseWage = w.daily_base_wage || 0;
      const advancesTaken = workerAdvances.advances || 0;
      const netPayableToday = (dailyBaseWage + commissionEarned) - advancesTaken;

      workerReports.push({
        worker_id: w.id,
        worker_name: w.name,
        role: w.role,
        daily_base_wage: dailyBaseWage,
        commission_rate: w.commission_rate,
        jobs_done: workerInvoices.jobs_done,
        total_labor_generated: workerInvoices.total_labor,
        commission_earned: commissionEarned,
        advances_taken: advancesTaken,
        net_payable_today: netPayableToday,
      });
    }

    // 12. Low Stock alerts (critical inventory items needing reorder)
    const lowStockAlerts = db.prepare(`
      SELECT 
        id, sku, name, category, brand, viscosity, pack_size,
        stock_qty, min_stock_alert,
        (min_stock_alert - stock_qty) AS deficit
      FROM inventory
      WHERE stock_qty <= min_stock_alert
      ORDER BY (min_stock_alert - stock_qty) DESC
    `).all();

    // 13. List of recent transactions for today
    const transactionsList = db.prepare(`
      SELECT 
        dt.*,
        w.name AS worker_name,
        cv.plate_number,
        cv.customer_name
      FROM daily_transactions dt
      LEFT JOIN workers w ON dt.worker_id = w.id
      LEFT JOIN customers_vehicles cv ON dt.vehicle_id = cv.id
      WHERE date(dt.created_at) = date(?)
      ORDER BY dt.id DESC
    `).all(date);

    // 14. Daily Growth & Comparison (Upgrade 1)
    const yesterdayDate = getPreviousDate(date, 1);
    const lastWeekDate = getPreviousDate(date, 7);

    const todayBrief = {
      date,
      total_invoices: invoicesSummary.total_invoices,
      total_cars_served: invoicesSummary.total_cars_served,
      goods_sales: invoicesSummary.total_items_amount,
      services_revenue: invoicesSummary.total_labor_amount,
      total_net_sales: invoicesSummary.total_net_sales,
    };
    const yesterdayBrief = getDayBriefMetrics(yesterdayDate);
    const lastWeekBrief = getDayBriefMetrics(lastWeekDate);

    const comparison = {
      today: todayBrief,
      yesterday: yesterdayBrief,
      last_week_same_day: lastWeekBrief,
      growth_vs_yesterday: {
        cars_growth_pct: calcGrowthPct(todayBrief.total_cars_served, yesterdayBrief.total_cars_served),
        sales_growth_pct: calcGrowthPct(todayBrief.total_net_sales, yesterdayBrief.total_net_sales),
        services_growth_pct: calcGrowthPct(todayBrief.services_revenue, yesterdayBrief.services_revenue),
      },
      growth_vs_last_week: {
        cars_growth_pct: calcGrowthPct(todayBrief.total_cars_served, lastWeekBrief.total_cars_served),
        sales_growth_pct: calcGrowthPct(todayBrief.total_net_sales, lastWeekBrief.total_net_sales),
        services_growth_pct: calcGrowthPct(todayBrief.services_revenue, lastWeekBrief.services_revenue),
      },
    };

    // 15. Hourly Breakdown & Average Ticket Analytics (Upgrade 5)
    const hourlyAnalytics = getHourlyBreakdown(date);
    const avgTicketPerCar = invoicesSummary.total_cars_served > 0 
      ? roundMoney(invoicesSummary.total_net_sales / invoicesSummary.total_cars_served) 
      : 0;
    const avgTicketPerInvoice = invoicesSummary.total_invoices > 0 
      ? roundMoney(invoicesSummary.total_net_sales / invoicesSummary.total_invoices) 
      : 0;
    const avgServicesPerCar = invoicesSummary.total_cars_served > 0 
      ? roundMoney(invoicesSummary.total_labor_amount / invoicesSummary.total_cars_served) 
      : 0;

    hourlyAnalytics.average_ticket_per_car = avgTicketPerCar;
    hourlyAnalytics.average_ticket_per_invoice = avgTicketPerInvoice;
    hourlyAnalytics.average_services_per_car = avgServicesPerCar;

    // 16. Executive Pulse & Profitability (الجزء الرابع: التقرير التنفيذي الشامل)
    const cogsRow = db.prepare(`
      SELECT 
        COALESCE(SUM(ii.qty * COALESCE(inv.cost_price, 0)), 0) AS total_cogs
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE date(i.created_at) = date(?)
    `).get(date);

    const totalCogs = cogsRow ? roundMoney(cogsRow.total_cogs) : 0;
    const grossProfit = roundMoney(Math.max(0, invoicesSummary.total_net_sales - totalCogs));
    const netProfit = roundMoney(grossProfit - expensesTotal);
    const expenseCoverageRatio = expensesTotal > 0 
      ? roundMoney((invoicesSummary.total_net_sales / expensesTotal) * 100) 
      : 100;

    const categoryBreakdownRows = db.prepare(`
      SELECT 
        COALESCE(inv.category, 'service') AS category,
        COALESCE(SUM(ii.subtotal), 0) AS sales_amount
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN inventory inv ON ii.inventory_id = inv.id
      WHERE date(i.created_at) = date(?)
      GROUP BY category
    `).all(date);

    const categoryBreakdown = {
      oil: 0,
      filter: 0,
      tire: 0,
      battery: 0,
      service: invoicesSummary.total_labor_amount || 0,
    };
    for (const cb of categoryBreakdownRows) {
      if (categoryBreakdown[cb.category] !== undefined) {
        categoryBreakdown[cb.category] += roundMoney(cb.sales_amount);
      } else {
        categoryBreakdown.service += roundMoney(cb.sales_amount);
      }
    }

    return {
      report_date: date,
      executive_pulse: {
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        net_profit: netProfit,
        net_margin_pct: invoicesSummary.total_net_sales > 0 
          ? roundMoney((netProfit / invoicesSummary.total_net_sales) * 100) 
          : 0,
        expense_coverage_ratio: expenseCoverageRatio,
        category_breakdown: categoryBreakdown,
      },
      summary: {
        total_cars_served: invoicesSummary.total_cars_served,
        total_invoices: invoicesSummary.total_invoices,
        total_items_amount: invoicesSummary.total_items_amount,
        total_labor_amount: invoicesSummary.total_labor_amount,
        services_revenue: invoicesSummary.total_labor_amount,
        goods_sales_revenue: invoicesSummary.total_items_amount,
        total_scrap_deductions: invoicesSummary.total_scrap_deductions,
        total_discounts: invoicesSummary.total_discounts,
        total_net_sales: invoicesSummary.total_net_sales,
        total_paid_amount: invoicesSummary.total_paid_amount,
        total_new_debts: invoicesSummary.total_new_debts,
      },
      cash_register: {
        inflow_cash_invoices: paymentMethods.cash,
        inflow_cash_debt_collected: debtCollectionsCash,
        total_cash_inflow: totalCashInflow,
        outflow_cash_expenses: expensesCash,
        outflow_cash_worker_advances: workerAdvancesCash,
        total_cash_outflow: totalCashOutflow,
        net_drawer_cash: netDrawerCash,
        live_drawer_balance: liveLedger.cash_drawer_1101,
        bank_kuraimi_balance: liveLedger.bank_kuraimi_1102,
        e_wallet_jeeb_balance: liveLedger.e_wallet_jeeb_1103,
      },
      payment_methods_breakdown: {
        cash: paymentMethods.cash,
        e_wallets: {
          total: totalWallets,
          jeeb: paymentMethods.jeeb,
          jawali: paymentMethods.jawali,
          kuraimi: paymentMethods.kuraimi,
          onecash: paymentMethods.onecash,
        },
        credit_delayed: invoicesSummary.total_new_debts,
      },
      transactions_summary: {
        expenses_total: expensesTotal,
        worker_advances_total: workerAdvancesTotal,
        debt_collections_total: debtCollectionsTotal,
        recent_transactions: transactionsList,
        official_vouchers: vouchersSummary,
        purchases_from_drawer: purchasesToday,
        owner_drawings_total: vouchersSummary.owner_drawings,
      },
      ledger_balances: liveLedger,
      debts_and_payables: {
        total_customer_debts: customerDebtsTotal,
        new_customer_debts_today: invoicesSummary.total_new_debts,
        total_supplier_payables: supplierPayablesTotal,
      },
      oil_sales: {
        packs_summary: oilPacks,
        items_sold: oilItemsSold,
      },
      filters_sales: {
        total_filters_sold: totalFiltersCount,
        items_sold: filtersSold,
      },
      workers_commissions: workerReports,
      low_stock_alerts: lowStockAlerts,
      comparison,
      hourly_analytics: hourlyAnalytics,
    };
  },
};

module.exports = reportModel;
