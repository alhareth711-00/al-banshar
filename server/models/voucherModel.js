const db = require('../db/database');
const { formatDate } = require('../utils/helpers');
const { roundMoney, safeNum } = require('../utils/mathPrecision');
const { postOfficialVoucher, createJournalEntry, getIncomeStatement } = require('../utils/accountingEngine');

function generateVoucherNumber(type = 'receipt') {
  const today = formatDate().replace(/-/g, '');
  const prefix = type === 'receipt' ? `RV-${today}-` : `PV-${today}-`;

  const lastVoucher = db.prepare(`
    SELECT voucher_number FROM official_vouchers 
    WHERE voucher_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastVoucher && lastVoucher.voucher_number) {
    const parts = lastVoucher.voucher_number.split('-');
    const seqStr = parts[parts.length - 1];
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  if (type === 'payment') {
    try {
      const lastSuppVoucher = db.prepare(`
        SELECT voucher_number FROM supplier_payment_vouchers 
        WHERE voucher_number LIKE ? 
        ORDER BY id DESC LIMIT 1
      `).get(`${prefix}%`);

      if (lastSuppVoucher && lastSuppVoucher.voucher_number) {
        const parts = lastSuppVoucher.voucher_number.split('-');
        const seqStr = parts[parts.length - 1];
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

const voucherModel = {
  getAll(filters = {}) {
    let query = `
      SELECT 
        v.*,
        coa_cash.name AS cash_account_name,
        coa_offset.name AS offset_account_name
      FROM official_vouchers v
      LEFT JOIN chart_of_accounts coa_cash ON v.cash_account_code = coa_cash.code
      LEFT JOIN chart_of_accounts coa_offset ON v.offset_account_code = coa_offset.code
      WHERE 1=1
    `;
    const params = [];

    if (filters.voucher_type && filters.voucher_type !== 'all') {
      query += ' AND v.voucher_type = ?';
      params.push(filters.voucher_type);
    }

    if (filters.party_type && filters.party_type !== 'all') {
      query += ' AND v.party_type = ?';
      params.push(filters.party_type);
    }

    if (filters.status && filters.status !== 'all') {
      query += ' AND v.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_method && filters.payment_method !== 'all') {
      query += ' AND v.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.date) {
      query += ' AND date(v.created_at) = date(?)';
      params.push(filters.date);
    }

    if (filters.date_from) {
      query += ' AND date(v.created_at) >= date(?)';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND date(v.created_at) <= date(?)';
      params.push(filters.date_to);
    }

    if (filters.search) {
      query += ' AND (v.voucher_number LIKE ? OR v.party_name LIKE ? OR v.paper_bill_number LIKE ? OR v.description LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY v.id DESC LIMIT 300';
    const vouchers = db.prepare(query).all(...params);

    // If multiline items exist, attach item count or preview
    for (const v of vouchers) {
      if (v.is_multiline) {
        v.items_count = db.prepare('SELECT COUNT(*) as count FROM voucher_items WHERE voucher_id = ?').get(v.id)?.count || 0;
      }
    }

    return vouchers;
  },

  getById(id) {
    const voucher = db.prepare(`
      SELECT 
        v.*,
        coa_cash.name AS cash_account_name,
        coa_offset.name AS offset_account_name
      FROM official_vouchers v
      LEFT JOIN chart_of_accounts coa_cash ON v.cash_account_code = coa_cash.code
      LEFT JOIN chart_of_accounts coa_offset ON v.offset_account_code = coa_offset.code
      WHERE v.id = ? OR v.voucher_number = ?
    `).get(id, id);

    if (!voucher) return null;

    // Attach multiline items if any
    voucher.items = db.prepare(`
      SELECT vi.*, coa.name AS account_name
      FROM voucher_items vi
      LEFT JOIN chart_of_accounts coa ON vi.account_code = coa.code
      WHERE vi.voucher_id = ?
    `).all(voucher.id);

    // Attach journal entry lines if any
    const jv = db.prepare(`
      SELECT * FROM journal_entries 
      WHERE ref_number = ? OR (ref_id = ? AND ref_type IN ('debt_collection', 'supplier_payment', 'worker_advance', 'expense', 'closing_entry'))
      ORDER BY id DESC LIMIT 1
    `).get(voucher.voucher_number, voucher.id);

    if (jv) {
      voucher.journal_entry = jv;
      voucher.journal_lines = db.prepare(`
        SELECT jl.*, coa.name AS account_name
        FROM journal_lines jl
        LEFT JOIN chart_of_accounts coa ON jl.account_code = coa.code
        WHERE jl.journal_entry_id = ?
        ORDER BY jl.id ASC
      `).all(jv.id);
    } else {
      voucher.journal_entry = null;
      voucher.journal_lines = [];
    }

    // Attach audit history
    voucher.audit_logs = db.prepare(`
      SELECT * FROM financial_audit_logs 
      WHERE entity_type = 'voucher' AND entity_id = ?
      ORDER BY id DESC
    `).all(voucher.id);

    return voucher;
  },

  create(data) {
    const execute = db.transaction(() => {
      const voucherType = data.voucher_type === 'payment' ? 'payment' : 'receipt';
      const amount = roundMoney(safeNum(data.amount, 0));
      if (amount <= 0) {
        throw new Error('مبلغ السند يجب أن يكون أكبر من الصفر');
      }

      const partyType = data.party_type || 'other';
      const partyId = data.party_id ? Number(data.party_id) : null;
      let partyName = (data.party_name || '').trim();
      const paymentMethod = data.payment_method || 'cash';
      const paperBillNumber = data.paper_bill_number ? data.paper_bill_number.trim() : null;

      // Duplicate prevention for manual paper voucher numbers in current fiscal year
      if (paperBillNumber) {
        const dupBill = db.prepare(`
          SELECT voucher_number FROM official_vouchers 
          WHERE paper_bill_number = ? AND voucher_type = ? AND strftime('%Y', created_at) = strftime('%Y', 'now')
          LIMIT 1
        `).get(paperBillNumber, voucherType);
        if (dupBill) {
          console.warn(`[Voucher] Warning: paper_bill_number (${paperBillNumber}) already registered under voucher ${dupBill.voucher_number}`);
        }
      }

      // Map payment method to asset account code
      let cashAccountCode = '1101';
      if (paymentMethod === 'kuraimi' || paymentMethod === 'bank') cashAccountCode = '1102';
      else if (paymentMethod === 'jeeb') cashAccountCode = '1103';
      else if (paymentMethod === 'jawali') cashAccountCode = '1104';
      else if (paymentMethod === 'onecash') cashAccountCode = '1105';

      // Determine offset account code & adjust balance if customer/supplier/owner
      let offsetAccountCode = data.offset_account_code;
      let prevBalance = 0;
      let newBalance = 0;

      if (partyType === 'customer') {
        offsetAccountCode = '1201'; // Customer Receivables
        if (partyId) {
          const veh = db.prepare('SELECT customer_name, plate_number, balance_due FROM customers_vehicles WHERE id = ?').get(partyId);
          if (veh) {
            if (!partyName) partyName = `${veh.customer_name} (${veh.plate_number})`;
            prevBalance = Number(veh.balance_due) || 0;
            newBalance = Math.max(0, prevBalance - amount);
            db.prepare('UPDATE customers_vehicles SET balance_due = ? WHERE id = ?').run(newBalance, partyId);

            // Cross-Module Data Integrity: Settle vehicle outstanding invoices using FIFO
            const unpaidInvoices = db.prepare(`
              SELECT id, invoice_number, remaining_debt, paid_amount
              FROM invoices
              WHERE vehicle_id = ? AND remaining_debt > 0
              ORDER BY id ASC
            `).all(partyId);

            let remainingToSettle = amount;
            for (const inv of unpaidInvoices) {
              if (remainingToSettle <= 0) break;
              const billDebt = Number(inv.remaining_debt) || 0;
              const settleAmt = Math.min(billDebt, remainingToSettle);
              db.prepare(`
                UPDATE invoices
                SET 
                  paid_amount = paid_amount + ?,
                  remaining_debt = MAX(0, remaining_debt - ?)
                WHERE id = ?
              `).run(settleAmt, settleAmt, inv.id);
              remainingToSettle = roundMoney(remainingToSettle - settleAmt);
            }
          }
        }
      } else if (partyType === 'supplier') {
        offsetAccountCode = '2101'; // Supplier Payables
        if (partyId) {
          const supp = db.prepare('SELECT name, company_name, balance_due FROM suppliers WHERE id = ?').get(partyId);
          if (supp) {
            if (!partyName) partyName = supp.name;
            prevBalance = Number(supp.balance_due) || 0;
            newBalance = Math.max(0, prevBalance - amount);
            db.prepare('UPDATE suppliers SET balance_due = ? WHERE id = ?').run(newBalance, partyId);
          }
        }
      } else if (partyType === 'owner') {
        // Owner personal drawings: Debits Owner Equity 3101 (Not an operating expense)
        offsetAccountCode = '3101';
        if (!partyName) partyName = 'مالك المركز (مسحوبات شخصية)';
      } else if (partyType === 'worker') {
        offsetAccountCode = '1202'; // Worker advances
        if (partyId) {
          const worker = db.prepare('SELECT name FROM workers WHERE id = ?').get(partyId);
          if (worker && !partyName) partyName = worker.name;
        }
      } else if (partyType === 'expense') {
        offsetAccountCode = data.offset_account_code || '6109'; // Operating expense
      } else {
        offsetAccountCode = voucherType === 'receipt' ? '4201' : '6109';
      }

      if (!partyName) {
        partyName = voucherType === 'receipt' ? 'عميل عام' : 'مستفيد عام';
      }

      const voucherNumber = data.voucher_number || generateVoucherNumber(voucherType);
      const description = (data.description || (voucherType === 'receipt' ? 'سند قبض نقدية' : 'سند صرف نقدية')).trim();
      const notes = data.notes ? data.notes.trim() : null;
      const createdBy = data.created_by || 'أمين الصندوق';

      const isMultiline = Array.isArray(data.items) && data.items.length > 0 ? 1 : 0;

      // 1. Insert Voucher Record
      const insertStmt = db.prepare(`
        INSERT INTO official_vouchers (
          voucher_number, voucher_type, party_type, party_id, party_name,
          amount, payment_method, cash_account_code, offset_account_code,
          paper_bill_number, description, notes, prev_balance, new_balance,
          status, is_multiline, created_by, created_at
        ) VALUES (
          @voucher_number, @voucher_type, @party_type, @party_id, @party_name,
          @amount, @payment_method, @cash_account_code, @offset_account_code,
          @paper_bill_number, @description, @notes, @prev_balance, @new_balance,
          'posted', @is_multiline, @created_by, COALESCE(@created_at, datetime('now', 'localtime'))
        )
      `);

      const result = insertStmt.run({
        voucher_number: voucherNumber,
        voucher_type: voucherType,
        party_type: partyType,
        party_id: partyId,
        party_name: partyName,
        amount,
        payment_method: paymentMethod,
        cash_account_code: cashAccountCode,
        offset_account_code: offsetAccountCode,
        paper_bill_number: paperBillNumber,
        description,
        notes,
        prev_balance: prevBalance,
        new_balance: newBalance,
        is_multiline: isMultiline,
        created_by: createdBy,
        created_at: data.created_at || null,
      });

      const voucherId = result.lastInsertRowid;

      // 1.1 Insert Multiline Items if any
      if (isMultiline && data.items) {
        const itemStmt = db.prepare(`
          INSERT INTO voucher_items (voucher_id, account_code, category_name, amount, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const it of data.items) {
          itemStmt.run(
            voucherId,
            it.account_code || offsetAccountCode,
            it.category_name || null,
            roundMoney(safeNum(it.amount, 0)),
            it.description || description
          );
        }
      }

      // 2. Insert into daily_transactions if cash to keep drawer balance aligned (exclude owner equity drawings)
      if (paymentMethod === 'cash' && partyType !== 'owner') {
        if (voucherType === 'payment') {
          const txType = partyType === 'worker' ? 'worker_advance' : 'expense';
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES (
              ?, ?, ?, ?, 'cash', ?, datetime('now', 'localtime')
            )
          `).run(
            txType,
            partyType === 'worker' ? partyId : null,
            partyType === 'customer' ? partyId : null,
            amount,
            `سند صرف (${voucherNumber}): ${partyName} - ${description} ${paperBillNumber ? `[دفتر:${paperBillNumber}]` : ''}`
          );
        } else {
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES (
              'debt_collection', NULL, ?, ?, 'cash', ?, datetime('now', 'localtime')
            )
          `).run(
            partyType === 'customer' ? partyId : null,
            amount,
            `سند قبض (${voucherNumber}): ${partyName} - ${description} ${paperBillNumber ? `[دفتر:${paperBillNumber}]` : ''}`
          );
        }
      }

      // 3. Post to Central Accounting General Ledger
      const voucherObj = {
        id: voucherId,
        voucher_number: voucherNumber,
        voucher_type: voucherType,
        party_type: partyType,
        party_id: partyId,
        party_name: partyName,
        amount,
        payment_method: paymentMethod,
        cash_account_code: cashAccountCode,
        offset_account_code: offsetAccountCode,
        paper_bill_number: paperBillNumber,
        description,
        notes,
        created_at: data.created_at || null,
      };

      postOfficialVoucher(db, voucherObj);

      return voucherId;
    });

    const newId = execute();
    return this.getById(newId);
  },

  /**
   * Safe Atomic Update for Receipt & Payment Vouchers
   * Reverses previous ledger & balance impacts, applies new values,
   * updates double-entry journal lines, and records full audit trail.
   */
  update(id, data, performedBy = 'المدير') {
    const execute = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM official_vouchers WHERE id = ?').get(id);
      if (!existing) {
        throw new Error('السند المطلوب تعديله غير موجود في النظام');
      }
      if (existing.status === 'voided') {
        throw new Error('لا يمكن تعديل سند ملغي. السندات الملغاة تظل للأرشفة الرقابية فقط.');
      }

      const oldAmount = roundMoney(safeNum(existing.amount, 0));
      const newAmount = roundMoney(safeNum(data.amount !== undefined ? data.amount : existing.amount, 0));
      if (newAmount <= 0) {
        throw new Error('مبلغ السند الجديد يجب أن يكون أكبر من الصفر');
      }

      const oldPartyType = existing.party_type;
      const oldPartyId = existing.party_id;
      const newPartyType = data.party_type || existing.party_type;
      const newPartyId = data.party_id !== undefined ? (data.party_id ? Number(data.party_id) : null) : existing.party_id;

      const oldPaymentMethod = existing.payment_method;
      const newPaymentMethod = data.payment_method || existing.payment_method;

      let newPartyName = (data.party_name || existing.party_name || '').trim();
      const newDescription = (data.description || existing.description || '').trim();
      const newNotes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes;
      const newPaperBillNumber = data.paper_bill_number !== undefined ? (data.paper_bill_number ? data.paper_bill_number.trim() : null) : existing.paper_bill_number;

      // 1. ROLLBACK OLD IMPACTS
      if (existing.voucher_type === 'receipt') {
        if (oldPartyType === 'customer' && oldPartyId) {
          db.prepare('UPDATE customers_vehicles SET balance_due = balance_due + ? WHERE id = ?').run(oldAmount, oldPartyId);
        }
      } else {
        if (oldPartyType === 'supplier' && oldPartyId) {
          db.prepare('UPDATE suppliers SET balance_due = balance_due + ? WHERE id = ?').run(oldAmount, oldPartyId);
        }
      }

      // Remove old cash daily_transactions entry
      db.prepare(`
        DELETE FROM daily_transactions 
        WHERE description LIKE ?
      `).run(`%(${existing.voucher_number})%`);

      // Remove old journal lines and entries
      const oldJvs = db.prepare(`
        SELECT id FROM journal_entries 
        WHERE ref_number = ? OR (ref_id = ? AND ref_type IN ('debt_collection', 'supplier_payment', 'worker_advance', 'expense'))
      `).all(existing.voucher_number, existing.id);

      for (const jv of oldJvs) {
        db.prepare('DELETE FROM journal_lines WHERE journal_entry_id = ?').run(jv.id);
        db.prepare('DELETE FROM journal_entries WHERE id = ?').run(jv.id);
      }

      // Remove old voucher_items if any
      db.prepare('DELETE FROM voucher_items WHERE voucher_id = ?').run(existing.id);

      // 2. APPLY NEW IMPACTS
      let cashAccountCode = '1101';
      if (newPaymentMethod === 'kuraimi' || newPaymentMethod === 'bank') cashAccountCode = '1102';
      else if (newPaymentMethod === 'jeeb') cashAccountCode = '1103';
      else if (newPaymentMethod === 'jawali') cashAccountCode = '1104';
      else if (newPaymentMethod === 'onecash') cashAccountCode = '1105';

      let offsetAccountCode = data.offset_account_code || existing.offset_account_code;
      let newPrevBalance = 0;
      let newBalance = 0;

      if (existing.voucher_type === 'receipt') {
        if (newPartyType === 'customer') {
          offsetAccountCode = '1201';
          if (newPartyId) {
            const veh = db.prepare('SELECT customer_name, plate_number, balance_due FROM customers_vehicles WHERE id = ?').get(newPartyId);
            if (veh) {
              if (!newPartyName || data.party_id) newPartyName = `${veh.customer_name} (${veh.plate_number})`;
              newPrevBalance = Number(veh.balance_due) || 0;
              newBalance = Math.max(0, newPrevBalance - newAmount);
              db.prepare('UPDATE customers_vehicles SET balance_due = ? WHERE id = ?').run(newBalance, newPartyId);
            }
          }
        }
      } else {
        if (newPartyType === 'supplier') {
          offsetAccountCode = '2101';
          if (newPartyId) {
            const supp = db.prepare('SELECT name, company_name, balance_due FROM suppliers WHERE id = ?').get(newPartyId);
            if (supp) {
              if (!newPartyName || data.party_id) newPartyName = supp.name;
              newPrevBalance = Number(supp.balance_due) || 0;
              newBalance = Math.max(0, newPrevBalance - newAmount);
              db.prepare('UPDATE suppliers SET balance_due = ? WHERE id = ?').run(newBalance, newPartyId);
            }
          }
        } else if (newPartyType === 'owner') {
          offsetAccountCode = '3101';
        } else if (newPartyType === 'worker') {
          offsetAccountCode = '1202';
        } else if (newPartyType === 'expense') {
          offsetAccountCode = data.offset_account_code || '6109';
        }
      }

      // Handle multiline items if provided
      let isMultiline = 0;
      if (Array.isArray(data.items) && data.items.length > 0) {
        isMultiline = 1;
        const itemStmt = db.prepare(`
          INSERT INTO voucher_items (voucher_id, account_code, category_name, amount, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const it of data.items) {
          itemStmt.run(
            existing.id,
            it.account_code || offsetAccountCode,
            it.category_name || null,
            roundMoney(safeNum(it.amount, 0)),
            it.description || newDescription
          );
        }
      }

      // 3. UPDATE OFFICIAL_VOUCHERS RECORD
      db.prepare(`
        UPDATE official_vouchers
        SET 
          party_type = ?,
          party_id = ?,
          party_name = ?,
          amount = ?,
          payment_method = ?,
          cash_account_code = ?,
          offset_account_code = ?,
          paper_bill_number = ?,
          description = ?,
          notes = ?,
          prev_balance = ?,
          new_balance = ?,
          status = 'modified',
          is_multiline = ?
        WHERE id = ?
      `).run(
        newPartyType,
        newPartyId,
        newPartyName,
        newAmount,
        newPaymentMethod,
        cashAccountCode,
        offsetAccountCode,
        newPaperBillNumber,
        newDescription,
        newNotes,
        newPrevBalance,
        newBalance,
        isMultiline,
        existing.id
      );

      // 4. RE-INSERT DAILY_TRANSACTIONS IF CASH
      if (newPaymentMethod === 'cash' && newPartyType !== 'owner') {
        if (existing.voucher_type === 'payment') {
          const txType = newPartyType === 'worker' ? 'worker_advance' : 'expense';
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES (?, ?, ?, ?, 'cash', ?, datetime('now', 'localtime'))
          `).run(
            txType,
            newPartyType === 'worker' ? newPartyId : null,
            newPartyType === 'customer' ? newPartyId : null,
            newAmount,
            `سند صرف (${existing.voucher_number}): ${newPartyName} - ${newDescription} ${newPaperBillNumber ? `[دفتر:${newPaperBillNumber}]` : ''}`
          );
        } else {
          db.prepare(`
            INSERT INTO daily_transactions (
              tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at
            ) VALUES ('debt_collection', NULL, ?, ?, 'cash', ?, datetime('now', 'localtime'))
          `).run(
            newPartyType === 'customer' ? newPartyId : null,
            newAmount,
            `سند قبض (${existing.voucher_number}): ${newPartyName} - ${newDescription} ${newPaperBillNumber ? `[دفتر:${newPaperBillNumber}]` : ''}`
          );
        }
      }

      // 5. RE-POST TO GENERAL JOURNAL
      const updatedVoucher = {
        id: existing.id,
        voucher_number: existing.voucher_number,
        voucher_type: existing.voucher_type,
        party_type: newPartyType,
        party_id: newPartyId,
        party_name: newPartyName,
        amount: newAmount,
        payment_method: newPaymentMethod,
        cash_account_code: cashAccountCode,
        offset_account_code: offsetAccountCode,
        paper_bill_number: newPaperBillNumber,
        description: newDescription,
        notes: newNotes,
        created_at: existing.created_at,
      };

      postOfficialVoucher(db, updatedVoucher);

      // 6. RECORD AUDIT LOG
      db.prepare(`
        INSERT INTO financial_audit_logs (
          action, entity_type, entity_id, old_data, new_data, performed_by, created_at
        ) VALUES (?, 'voucher', ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        'UPDATE_VOUCHER',
        existing.id,
        JSON.stringify(existing),
        JSON.stringify(updatedVoucher),
        performedBy || 'المدير'
      );

      return existing.id;
    });

    const updatedId = execute();
    return this.getById(updatedId);
  },

  /**
   * Safe Cancellation / Void with Reversal Entry
   */
  voidVoucher(id, reason, performedBy = 'المدير') {
    const execute = db.transaction(() => {
      const voucher = db.prepare('SELECT * FROM official_vouchers WHERE id = ?').get(id);
      if (!voucher) {
        throw new Error('السند غير موجود');
      }
      if (voucher.status === 'voided') {
        throw new Error('هذا السند تم إلغاؤه بالفعل مسبقاً');
      }

      const amount = roundMoney(safeNum(voucher.amount, 0));

      // 1. REVERSE PARTY BALANCE
      if (voucher.voucher_type === 'receipt') {
        if (voucher.party_type === 'customer' && voucher.party_id) {
          db.prepare('UPDATE customers_vehicles SET balance_due = balance_due + ? WHERE id = ?').run(amount, voucher.party_id);
        }
      } else {
        if (voucher.party_type === 'supplier' && voucher.party_id) {
          db.prepare('UPDATE suppliers SET balance_due = balance_due + ? WHERE id = ?').run(amount, voucher.party_id);
        }
      }

      // 2. REMOVE FROM DAILY_TRANSACTIONS
      db.prepare(`
        DELETE FROM daily_transactions 
        WHERE description LIKE ?
      `).run(`%(${voucher.voucher_number})%`);

      // 3. CREATE REVERSAL JOURNAL ENTRY
      const jv = db.prepare(`
        SELECT * FROM journal_entries 
        WHERE ref_number = ? OR (ref_id = ? AND ref_type IN ('debt_collection', 'supplier_payment', 'worker_advance', 'expense'))
        ORDER BY id DESC LIMIT 1
      `).get(voucher.voucher_number, voucher.id);

      if (jv) {
        const origLines = db.prepare('SELECT * FROM journal_lines WHERE journal_entry_id = ?').all(jv.id);
        const reversedLines = origLines.map((l) => ({
          account_code: l.account_code,
          debit: l.credit,
          credit: l.debit,
          party_type: l.party_type,
          party_id: l.party_id,
          description: `قيد عكسي لتسوية وإلغاء السند (${voucher.voucher_number}): ${reason || 'إلغاء رسمي'}`,
        }));

        createJournalEntry(db, {
          entry_date: formatDate(),
          ref_type: 'closing_entry',
          ref_id: voucher.id,
          ref_number: `REV-${voucher.voucher_number}`,
          description: `قيد عكسي لتسوية وإلغاء السند رقم (${voucher.voucher_number}) - السبب: ${reason || 'إلغاء رسمي'}`,
          lines: reversedLines,
        });
      }

      // 4. UPDATE VOUCHER STATUS
      db.prepare(`
        UPDATE official_vouchers
        SET 
          status = 'voided',
          void_reason = ?,
          voided_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(reason || 'إلغاء بطلب الإدارة', voucher.id);

      // 5. AUDIT LOG
      db.prepare(`
        INSERT INTO financial_audit_logs (
          action, entity_type, entity_id, old_data, new_data, performed_by, created_at
        ) VALUES (?, 'voucher', ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        'VOID_VOUCHER',
        voucher.id,
        JSON.stringify(voucher),
        JSON.stringify({ status: 'voided', reason }),
        performedBy || 'المدير'
      );

      return voucher.id;
    });

    const voidedId = execute();
    return this.getById(voidedId);
  },

  /**
   * High-Level Executive Metrics for Vouchers Management Dashboard
   */
  getSummaryMetrics() {
    const metrics = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN voucher_type = 'receipt' AND status != 'voided' AND date(created_at) = date('now', 'localtime') THEN amount ELSE 0 END), 0) AS today_receipts_amount,
        COALESCE(COUNT(CASE WHEN voucher_type = 'receipt' AND status != 'voided' AND date(created_at) = date('now', 'localtime') THEN 1 END), 0) AS today_receipts_count,
        COALESCE(SUM(CASE WHEN voucher_type = 'payment' AND status != 'voided' AND date('now', 'localtime') = date(created_at) THEN amount ELSE 0 END), 0) AS today_payments_amount,
        COALESCE(COUNT(CASE WHEN voucher_type = 'payment' AND status != 'voided' AND date('now', 'localtime') = date(created_at) THEN 1 END), 0) AS today_payments_count,
        COALESCE(COUNT(CASE WHEN status = 'voided' THEN 1 END), 0) AS total_voided_count,
        COALESCE(COUNT(*), 0) AS total_vouchers_count
      FROM official_vouchers
    `).get();

    // Cash drawer live balance (1101)
    const cashDrawer = db.prepare(`
      SELECT COALESCE(SUM(debit - credit), 0) as balance
      FROM journal_lines WHERE account_code = '1101'
    `).get()?.balance || 0;

    // Kuraimi bank balance (1102)
    const kuraimi = db.prepare(`
      SELECT COALESCE(SUM(debit - credit), 0) as balance
      FROM journal_lines WHERE account_code = '1102'
    `).get()?.balance || 0;

    // Wallets (1103 + 1104 + 1105)
    const wallets = db.prepare(`
      SELECT COALESCE(SUM(debit - credit), 0) as balance
      FROM journal_lines WHERE account_code IN ('1103', '1104', '1105')
    `).get()?.balance || 0;

    return {
      today_receipts: roundMoney(metrics.today_receipts_amount),
      today_receipts_count: metrics.today_receipts_count,
      today_payments: roundMoney(metrics.today_payments_amount),
      today_payments_count: metrics.today_payments_count,
      net_today_flow: roundMoney(metrics.today_receipts_amount - metrics.today_payments_amount),
      cash_drawer_balance: roundMoney(cashDrawer),
      kuraimi_balance: roundMoney(kuraimi),
      wallets_balance: roundMoney(wallets),
      total_bank_and_wallets: roundMoney(kuraimi + wallets),
      total_liquidity: roundMoney(cashDrawer + kuraimi + wallets),
      total_voided_count: metrics.total_voided_count,
      total_vouchers_count: metrics.total_vouchers_count,
    };
  },

  /**
   * Unified Fast Search for Vouchers Parties (Customers, Suppliers, Workers)
   */
  searchParties(query = '', type = 'all') {
    const q = `%${(query || '').trim()}%`;
    const results = [];

    if (type === 'all' || type === 'customer') {
      const customers = db.prepare(`
        SELECT 
          id, 
          'customer' as party_type,
          customer_name as name, 
          plate_number, 
          car_make_model,
          balance_due,
          phone
        FROM customers_vehicles
        WHERE customer_name LIKE ? OR plate_number LIKE ? OR phone LIKE ?
        ORDER BY balance_due DESC LIMIT 25
      `).all(q, q, q);

      customers.forEach((c) => {
        results.push({
          id: c.id,
          party_type: 'customer',
          name: `${c.name} (${c.plate_number}${c.car_make_model ? ` - ${c.car_make_model}` : ''})`,
          customer_name: c.name,
          plate_number: c.plate_number,
          car_make_model: c.car_make_model,
          balance_due: Number(c.balance_due || 0),
          phone: c.phone,
          display_sub: `رصيد متبقي: ${Number(c.balance_due || 0).toLocaleString()} ر.ي`,
        });
      });
    }

    if (type === 'all' || type === 'supplier') {
      const suppliers = db.prepare(`
        SELECT id, 'supplier' as party_type, name, company_name, balance_due, phone
        FROM suppliers
        WHERE name LIKE ? OR company_name LIKE ? OR phone LIKE ?
        ORDER BY balance_due DESC LIMIT 25
      `).all(q, q, q);

      suppliers.forEach((s) => {
        results.push({
          id: s.id,
          party_type: 'supplier',
          name: s.name,
          company_name: s.company_name,
          balance_due: Number(s.balance_due || 0),
          phone: s.phone,
          display_sub: `مستحقات للمورد: ${Number(s.balance_due || 0).toLocaleString()} ر.ي`,
        });
      });
    }

    if (type === 'all' || type === 'worker') {
      const workers = db.prepare(`
        SELECT id, 'worker' as party_type, name, role, phone
        FROM workers
        WHERE name LIKE ? OR role LIKE ?
        ORDER BY name ASC LIMIT 25
      `).all(q, q);

      workers.forEach((w) => {
        results.push({
          id: w.id,
          party_type: 'worker',
          name: w.name,
          role: w.role,
          balance_due: 0,
          phone: w.phone,
          display_sub: `فني / عامل (${w.role || 'طاقم الورشة'})`,
        });
      });
    }

    return results;
  },

  getCashDrawerSummary() {
    // Current cash in drawer 1101
    const rowCash = db.prepare(`
      SELECT 
        SUM(jl.debit) AS total_inflow,
        SUM(jl.credit) AS total_outflow
      FROM journal_lines jl
      WHERE jl.account_code = '1101'
    `).get();

    const inflow = Number(rowCash?.total_inflow) || 0;
    const outflow = Number(rowCash?.total_outflow) || 0;
    const netCash = roundMoney(inflow - outflow);

    // Bank & E-wallet balances
    const rowKuraimi = db.prepare(`
      SELECT SUM(jl.debit) - SUM(jl.credit) AS balance
      FROM journal_lines jl
      WHERE jl.account_code = '1102'
    `).get();

    const rowJeeb = db.prepare(`
      SELECT SUM(jl.debit) - SUM(jl.credit) AS balance
      FROM journal_lines jl
      WHERE jl.account_code = '1103'
    `).get();

    // Today's total cash drawer inflows and outflows from journal
    const todayJournal = db.prepare(`
      SELECT 
        SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) AS cash_inflow_today,
        SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END) AS cash_outflow_today
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE jl.account_code = '1101'
        AND date(je.entry_date) = date('now', 'localtime')
    `).get();

    // Today's official vouchers summary
    const todayVouchers = db.prepare(`
      SELECT 
        SUM(CASE WHEN voucher_type = 'receipt' THEN amount ELSE 0 END) AS vouchers_receipt_today,
        SUM(CASE WHEN voucher_type = 'payment' THEN amount ELSE 0 END) AS vouchers_payment_today,
        COUNT(CASE WHEN voucher_type = 'receipt' THEN 1 END) AS count_receipts_today,
        COUNT(CASE WHEN voucher_type = 'payment' THEN 1 END) AS count_payments_today
      FROM official_vouchers
      WHERE date(created_at) = date('now', 'localtime')
    `).get();

    return {
      cash_drawer: {
        code: '1101',
        name: 'الصندوق النقدي الرئيسي (الدرج)',
        current_balance: netCash,
        total_inflow: inflow,
        total_outflow: outflow,
      },
      bank_kuraimi: {
        code: '1102',
        name: 'حساب بنك الكريمي',
        current_balance: roundMoney(Number(rowKuraimi?.balance) || 0),
      },
      e_wallet_jeeb: {
        code: '1103',
        name: 'محفظة جيب الإلكترونية',
        current_balance: roundMoney(Number(rowJeeb?.balance) || 0),
      },
      today: {
        cash_inflow: Number(todayJournal?.cash_inflow_today) || 0,
        cash_outflow: Number(todayJournal?.cash_outflow_today) || 0,
        vouchers_receipt_today: Number(todayVouchers?.vouchers_receipt_today) || 0,
        vouchers_payment_today: Number(todayVouchers?.vouchers_payment_today) || 0,
        count_receipts_today: Number(todayVouchers?.count_receipts_today) || 0,
        count_payments_today: Number(todayVouchers?.count_payments_today) || 0,
      },
    };
  },

  getCustomerDebts() {
    return db.prepare(`
      SELECT 
        cv.id,
        cv.plate_number,
        cv.customer_name,
        cv.phone,
        cv.car_make_model,
        cv.customer_type,
        cv.corporate_name,
        cv.balance_due,
        (SELECT MAX(created_at) FROM invoices WHERE vehicle_id = cv.id) AS last_service_date,
        (SELECT COUNT(*) FROM invoices WHERE vehicle_id = cv.id AND remaining_debt > 0) AS unpaid_invoices_count
      FROM customers_vehicles cv
      WHERE cv.balance_due > 0
      ORDER BY cv.balance_due DESC
    `).all();
  },

  // =========================================================================
  // STAGE 5 PRO UPGRADES METHODS
  // =========================================================================

  // Upgrade 2: Save Cash Drawer Actual Count vs System Ledger Balance
  saveCashDrawerAudit(data) {
    const physicalBalance = roundMoney(safeNum(data.physical_balance, 0));

    // Get current live system drawer balance (Account 1101)
    const rowCash = db.prepare(`
      SELECT 
        SUM(jl.debit) AS total_inflow,
        SUM(jl.credit) AS total_outflow
      FROM journal_lines jl
      WHERE jl.account_code = '1101'
    `).get();

    const inflow = Number(rowCash?.total_inflow) || 0;
    const outflow = Number(rowCash?.total_outflow) || 0;
    const systemBalance = roundMoney(inflow - outflow);

    const variance = roundMoney(physicalBalance - systemBalance);
    const status = variance === 0 ? 'matched' : (variance < 0 ? 'shortage' : 'overage');
    const notes = data.notes ? data.notes.trim() : null;
    const createdBy = data.created_by || 'أمين الصندوق';

    const stmt = db.prepare(`
      INSERT INTO cash_drawer_audits (
        system_balance, physical_balance, variance, status, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const info = stmt.run(systemBalance, physicalBalance, variance, status, notes, createdBy);
    return this.getCashDrawerAuditById(info.lastInsertRowid);
  },

  getCashDrawerAuditById(id) {
    return db.prepare('SELECT * FROM cash_drawer_audits WHERE id = ?').get(id);
  },

  getCashDrawerAudits(limit = 30) {
    return db.prepare('SELECT * FROM cash_drawer_audits ORDER BY id DESC LIMIT ?').all(limit);
  },

  adjustCashDrawerVariance(auditId) {
    const audit = this.getCashDrawerAuditById(auditId);
    if (!audit) throw new Error('سجل الجرد والمطابقة غير موجود');
    if (audit.variance === 0) {
      return { adjusted: false, message: 'الرصيد مطابق تماماً، لا يوجد عجز أو زيادة لتسويتها' };
    }

    const variance = Number(audit.variance);
    const absVariance = Math.abs(variance);
    const execute = db.transaction(() => {
      let jv;
      if (variance < 0) {
        // Shortage (عجز صندوق): Debit Operating Expense 6109, Credit Cash 1101
        jv = createJournalEntry(db, {
          entry_date: formatDate(),
          ref_type: 'expense',
          ref_id: audit.id,
          ref_number: `ADJ-AUDIT-${audit.id}`,
          description: `قيد تسوية عجز الصندوق النقدي بموجب محضر المطابقة #${audit.id}`,
          lines: [
            {
              account_code: '6109',
              debit: absVariance,
              credit: 0,
              description: `تسوية عجز نقدي في الصندوق (محضر #${audit.id})`,
            },
            {
              account_code: '1101',
              debit: 0,
              credit: absVariance,
              description: `خصم عجز النقدية من الصندوق (محضر #${audit.id})`,
            },
          ],
        });
      } else {
        // Overage or negative balance funding: If system balance was negative, credit Owner Capital 3101 to protect P&L
        const isFundingNegative = Number(audit.system_balance) < 0;
        const targetOffsetAcc = isFundingNegative ? '3101' : '4201';
        const offsetDesc = isFundingNegative
          ? `تسوية عجز رصيد الصندوق كتمويل رأس مال / جاري المالك (محضر #${audit.id})`
          : `قيد إيراد زيادة نقدية بالصندوق (محضر #${audit.id})`;

        jv = createJournalEntry(db, {
          entry_date: formatDate(),
          ref_type: isFundingNegative ? 'capital_deposit' : 'closing_entry',
          ref_id: audit.id,
          ref_number: `ADJ-AUDIT-${audit.id}`,
          description: `قيد تسوية زيادة/تمويل الصندوق النقدي بموجب محضر المطابقة #${audit.id}`,
          lines: [
            {
              account_code: '1101',
              debit: absVariance,
              credit: 0,
              description: `توريد نقدية فعلية بالصندوق (محضر #${audit.id})`,
            },
            {
              account_code: targetOffsetAcc,
              debit: 0,
              credit: absVariance,
              description: offsetDesc,
            },
          ],
        });
      }

      // Update notes in audit record
      db.prepare(`
        UPDATE cash_drawer_audits 
        SET notes = COALESCE(notes || ' | ', '') || 'تم ترحيل قيد التسوية المحاسبي ' || ?
        WHERE id = ?
      `).run(jv.entry_number, audit.id);

      return jv;
    });

    const jv = execute();
    return {
      adjusted: true,
      message: 'تم ترحيل قيد التسوية المحاسبي المزدوج وتحديث رصيد الصندوق بنجاح',
      journal_entry: jv,
      audit: this.getCashDrawerAuditById(auditId),
    };
  },

  recordOpeningCapital({ amount, target_account_code = '1101', notes, created_by }) {
    const numAmount = roundMoney(safeNum(amount, 0));
    if (numAmount <= 0) throw new Error('مبلغ الرصيد الافتتاحي / التمويل يجب أن يكون أكبر من الصفر');

    const validAccounts = ['1101', '1102', '1103', '1104', '1105'];
    if (!validAccounts.includes(target_account_code)) {
      throw new Error('الحساب المستهدف غير صحيح');
    }

    const today = formatDate();
    const todayCompact = today.replace(/-/g, '');
    const prefix = `CAP-${todayCompact}-`;

    const lastCap = db.prepare(`
      SELECT entry_number FROM journal_entries 
      WHERE entry_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextSeq = 1;
    if (lastCap && lastCap.entry_number) {
      const parts = lastCap.entry_number.split('-');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
    const entryNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    const accName = target_account_code === '1101' ? 'الصندوق النقدي الرئيسي (الدرج)' : 
                    (target_account_code === '1102' ? 'حساب بنك الكريمي' : 'محفظة جيب الإلكترونية');

    const execute = db.transaction(() => {
      const jv = createJournalEntry(db, {
        entry_number: entryNumber,
        entry_date: today,
        ref_type: 'capital_deposit',
        ref_id: null,
        ref_number: entryNumber,
        description: notes ? notes.trim() : `تمويل رأس مال / رصيد افتتاحي لحساب: ${accName}`,
        lines: [
          {
            account_code: target_account_code,
            debit: numAmount,
            credit: 0,
            description: `إيداع رصيد افتتاحي / رأس مال في ${accName}`,
          },
          {
            account_code: '3101',
            debit: 0,
            credit: numAmount,
            description: `رأس المال / مساهمة المالك لتمويل ${accName}`,
          },
        ],
      });

      return jv;
    });

    const jv = execute();
    return {
      success: true,
      message: `تم إيداع الرصيد الافتتاحي بنجاح في ${accName} وترحيل قيد رأس المال رقم (${entryNumber})`,
      journal_entry: jv,
    };
  },

  // Upgrade 3: Owner Drawings vs Current Month Operating Profit
  getOwnerDrawingsAnalytics() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Total owner drawings this month
    const drawingsRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_drawings
      FROM official_vouchers
      WHERE voucher_type = 'payment'
        AND party_type = 'owner'
        AND strftime('%Y-%m', created_at) = ?
    `).get(currentMonth);

    const totalDrawings = Number(drawingsRow?.total_drawings) || 0;

    // 2. Net Operating Profit for this month
    const incomeStmt = getIncomeStatement(db, {
      start_date: `${currentMonth}-01`,
      end_date: `${currentMonth}-31`,
    });

    const netOperatingProfit = Number(incomeStmt?.net_operating_profit) || 0;

    // 3. Ratio & Status calculation
    let ratio = 0;
    let status = 'safe'; // 'safe', 'caution', 'danger', 'zero'

    if (totalDrawings === 0) {
      status = 'zero';
      ratio = 0;
    } else if (netOperatingProfit <= 0) {
      status = 'danger';
      ratio = 100;
    } else {
      ratio = roundMoney((totalDrawings / netOperatingProfit) * 100);
      if (ratio <= 70) {
        status = 'safe';
      } else if (ratio <= 100) {
        status = 'caution';
      } else {
        status = 'danger';
      }
    }

    const safeCapAmount = roundMoney(Math.max(0, netOperatingProfit * 0.7));

    return {
      current_month: currentMonth,
      net_operating_profit: netOperatingProfit,
      total_drawings: totalDrawings,
      ratio_percent: ratio,
      safe_cap_amount: safeCapAmount,
      status,
      working_capital_protected: status !== 'danger',
    };
  },

  // Upgrade 5: Cash Flow Analytics (Daily Inflows & Outflows for Account 1101)
  getCashFlowAnalytics(days = 7) {
    const numDays = Math.max(3, Math.min(90, parseInt(days, 10) || 7));
    const offsetStr = `-${numDays - 1} days`;

    const rows = db.prepare(`
      SELECT 
        date(je.entry_date) AS day_date,
        ROUND(SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END), 2) AS inflow,
        ROUND(SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END), 2) AS outflow,
        ROUND(SUM(CASE WHEN jl.debit > 0 THEN jl.debit ELSE 0 END) - SUM(CASE WHEN jl.credit > 0 THEN jl.credit ELSE 0 END), 2) AS net_cash
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = '1101'
        AND date(je.entry_date) >= date('now', 'localtime', ?)
      GROUP BY date(je.entry_date)
      ORDER BY day_date ASC
    `).all(offsetStr);

    let totalInflow = 0;
    let totalOutflow = 0;
    let peakInflowDay = null;
    let maxInflow = -1;

    for (const r of rows) {
      totalInflow = roundMoney(totalInflow + r.inflow);
      totalOutflow = roundMoney(totalOutflow + r.outflow);
      if (r.inflow > maxInflow) {
        maxInflow = r.inflow;
        peakInflowDay = r.day_date;
      }
    }

    return {
      period_days: numDays,
      daily_timeline: rows,
      summary: {
        total_inflow: totalInflow,
        total_outflow: totalOutflow,
        net_cash_flow: roundMoney(totalInflow - totalOutflow),
        daily_average_inflow: roundMoney(totalInflow / (rows.length || 1)),
        peak_inflow_day: peakInflowDay,
        peak_inflow_amount: maxInflow > 0 ? maxInflow : 0,
      },
    };
  },

  getOperatingExpenses(filters = {}) {
    const vouchers = db.prepare(`
      SELECT 
        v.id,
        v.voucher_number,
        v.amount,
        v.payment_method,
        COALESCE(coa.name, 'مصروفات تشغيلية عامة') AS category,
        v.description,
        v.created_by,
        v.created_at,
        v.paper_bill_number
      FROM official_vouchers v
      LEFT JOIN chart_of_accounts coa ON v.offset_account_code = coa.code
      WHERE v.voucher_type = 'payment' AND v.party_type = 'expense'
      ORDER BY v.id DESC
    `).all();

    const dailyTxs = db.prepare(`
      SELECT 
        dt.id,
        NULL AS voucher_number,
        dt.amount,
        dt.payment_method,
        'مصروفات تشغيلية يومية' AS category,
        dt.description,
        'الكاشير' AS created_by,
        dt.created_at,
        NULL AS paper_bill_number
      FROM daily_transactions dt
      WHERE dt.tx_type = 'expense'
        AND dt.description NOT LIKE '%سداد فاتورة مشتريات%'
        AND dt.description NOT LIKE '%سند صرف%'
        AND dt.description NOT LIKE '%أجور شحن%'
        AND dt.description NOT LIKE '%سداد دفعة%'
        AND dt.description NOT LIKE '%مورد%'
      ORDER BY dt.id DESC
    `).all();

    let list = [...vouchers, ...dailyTxs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (filters.search) {
      const s = filters.search.trim().toLowerCase();
      list = list.filter(item => 
        (item.description && item.description.toLowerCase().includes(s)) ||
        (item.voucher_number && item.voucher_number.toLowerCase().includes(s)) ||
        (item.category && item.category.toLowerCase().includes(s))
      );
    }
    return list;
  },
};

module.exports = voucherModel;
