import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FileText,
  Search,
  Printer,
  Calendar,
  Building,
  Car,
  Wrench,
  CheckCircle,
  Copy,
  Check,
  Smartphone,
  Download,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import { getLocalTodayDate } from '../utils/dateUtils';

/**
 * Human-friendly Arabic labels for payment methods
 */
export function formatPaymentMethodLabel(method) {
  switch (method) {
    case 'cash':
      return 'نقداً (كاش)';
    case 'kuraimi':
      return 'بنك الكريمي';
    case 'jeeb':
      return 'محفظة جيب';
    case 'jawali':
      return 'جوالي';
    case 'onecash':
      return 'ون كاش';
    case 'bank':
      return 'تحويل بنكي';
    default:
      return method || 'نقداً';
  }
}

/**
 * Builds standalone HTML for vector PDF export and official A4 printing
 * Includes classic double borders, official headers, high-contrast tables, clean totals, and signature boxes.
 * Strictly excludes Tafqit (Arabic text numbers) and the 7-day legal clause as per user specification.
 */
export function buildClassicStatementHtml({ statement, settings, partyType, expenseCategoryFilter = 'all' }) {
  if (!statement) return '';

  const isVoucherMode = statement.is_voucher_mode;

  // 1. VOUCHERS MODE (Receipts or Payments)
  if (isVoucherMode) {
    const isReceipt = statement.voucher_type === 'receipt';
    const roleTitle = isReceipt ? 'كشف حركة سندات القبض' : 'كشف حركة سندات الصرف والمصروفات';
    const totalLabel = isReceipt ? 'إجمالي المقبوضات:' : 'إجمالي المصروفات والمدفوعات:';
    const items = statement.items || [];
    const totalAmount = statement.total_amount ?? 0;

    const rowsHtml =
      items.length === 0
        ? `<tr><td colspan="${isReceipt ? 7 : 8}" style="text-align:center; padding: 30px; color: #64748b; font-size: 12px; font-weight: bold;">لا توجد سندات مسجلة خلال هذه الفترة</td></tr>`
        : items
            .map((v, idx) => {
              const amt = Number(v.amount) || 0;
              const datePart = (v.created_at || '').slice(0, 16).replace('T', ' ');
              const bookletBadge = v.paper_bill_number
                ? `<span style="display:inline-block; font-size:9px; font-family: monospace; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:3px; padding:1px 4px; margin-right:4px;">دفتر: ${v.paper_bill_number}</span>`
                : '';
              const categoryCol = !isReceipt
                ? `<td style="padding: 7px 8px; font-size: 11px; font-weight: 600; color: #334155; border-left: 1px solid #cbd5e1;">${v.offset_account_name || 'مصروف عام'}</td>`
                : '';

              return `
            <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 7px 8px; text-align: center; font-size: 10px; color: #64748b; border-left: 1px solid #cbd5e1;">${idx + 1}</td>
              <td style="padding: 7px 8px; font-family: monospace; font-size: 11px; white-space: nowrap; border-left: 1px solid #cbd5e1;">${datePart}</td>
              <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; border-left: 1px solid #cbd5e1;">
                ${v.voucher_number || '---'}
                ${bookletBadge}
              </td>
              <td style="padding: 7px 8px; font-weight: bold; font-size: 11px; border-left: 1px solid #cbd5e1;">${v.party_name || '---'}</td>
              ${categoryCol}
              <td style="padding: 7px 8px; font-weight: 500; font-size: 11px; border-left: 1px solid #cbd5e1;">${v.description || '---'}</td>
              <td style="padding: 7px 8px; font-size: 10px; color: #475569; border-left: 1px solid #cbd5e1;">${formatPaymentMethodLabel(v.payment_method)}</td>
              <td style="padding: 7px 8px; text-align: left; font-family: monospace; font-weight: 900; font-size: 12px; color: ${isReceipt ? '#047857' : '#b91c1c'};">
                ${amt.toLocaleString()} ر.ي
              </td>
            </tr>
          `;
            })
            .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${roleTitle} - ${settings.shopName || ''}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
      font-size: 11px;
      line-height: 1.4;
    }
    .classic-frame-outer {
      border: 2.5px solid #0f172a;
      padding: 3px;
      background: #ffffff;
      min-height: 275mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .classic-frame-inner {
      border: 1px solid #0f172a;
      padding: 18px 20px;
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .shop-title {
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .shop-meta {
      font-size: 10px;
      color: #475569;
      line-height: 1.6;
    }
    .doc-badge {
      border: 2px solid #0f172a;
      padding: 6px 14px;
      text-align: center;
      display: inline-block;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: -0.2px;
      background: #f8fafc;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #94a3b8;
      background: #f8fafc;
    }
    .info-table td {
      padding: 7px 12px;
      border: 1px solid #cbd5e1;
      font-size: 11px;
    }
    .info-label {
      color: #475569;
      font-weight: 600;
      width: 15%;
      background: #f1f5f9;
    }
    .info-val {
      font-weight: bold;
      color: #0f172a;
      width: 35%;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      margin-bottom: 14px;
    }
    .ledger-table th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 900;
      font-size: 11px;
      padding: 8px;
      border: 1px solid #94a3b8;
      border-bottom: 2px solid #0f172a;
    }
    .signatures-section {
      width: 100%;
      margin-top: 18px;
      border-top: 1px dashed #94a3b8;
      padding-top: 14px;
    }
    .sig-col {
      width: 50%;
      text-align: center;
      vertical-align: top;
      font-size: 11px;
      color: #334155;
    }
    .sig-line {
      margin-top: 45px;
      border-top: 1px solid #475569;
      width: 65%;
      margin-left: auto;
      margin-right: auto;
      padding-top: 4px;
      font-size: 10px;
      color: #64748b;
    }
    .stamp-box {
      width: 75px;
      height: 45px;
      border: 1px dashed #94a3b8;
      margin: 8px auto 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="classic-frame-outer">
    <div class="classic-frame-inner">
      <div>
        <!-- 1. Header -->
        <table class="header-table">
          <tr>
            <td style="width: 62%; vertical-align: top;">
              <div class="shop-title">${settings.shopName || 'مركز سريع وبنشر PRO'}</div>
              <div class="shop-meta">
                ${settings.shopAddress ? `<div>📍 ${settings.shopAddress}</div>` : ''}
                ${settings.shopPhone ? `<div>📞 هاتف: ${settings.shopPhone}</div>` : ''}
                ${settings.taxNumber ? `<div>سجل تجاري / ترخيص: ${settings.taxNumber}</div>` : ''}
              </div>
            </td>
            <td style="width: 38%; text-align: left; vertical-align: top;">
              <div class="doc-badge">${roleTitle}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 6px; font-weight: bold;">
                تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-YE')}
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. Meta Info Box -->
        <table class="info-table">
          <tr>
            <td class="info-label">نوع الحركة:</td>
            <td class="info-val">${isReceipt ? 'سندات قبض نقدية وإيرادات' : 'سندات صرف ومصروفات نقدية'}</td>
            <td class="info-label">الفترة المالية:</td>
            <td class="info-val">من ${statement.start_date || 'البداية'} إلى ${statement.end_date || 'الآن'}</td>
          </tr>
          <tr>
            <td class="info-label">عدد السندات:</td>
            <td class="info-val" style="font-family: monospace;">${statement.vouchers_count || 0} سند</td>
            <td class="info-label">${!isReceipt ? 'البند / التصنيف:' : 'الحساب المستهدف:'}</td>
            <td class="info-val">${!isReceipt && expenseCategoryFilter !== 'all' ? expenseCategoryFilter : 'كافة البنود والحسابات'}</td>
          </tr>
        </table>

        <!-- 3. Vouchers Ledger Table -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">م</th>
              <th style="width: 95px;">التاريخ والوقت</th>
              <th style="width: 105px;">رقم السند</th>
              <th style="width: 120px;">${isReceipt ? 'المقبوض منه' : 'المستلم / المدفوع له'}</th>
              ${!isReceipt ? '<th style="width: 95px;">بند المصروف</th>' : ''}
              <th>البيان والتفاصيل</th>
              <th style="width: 80px;">طريقة الدفع</th>
              <th style="width: 105px; text-align: left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Summary & Signatures Footer -->
      <div>
        <table style="width:100%; border: 1.5px solid #0f172a; background: #f8fafc; border-collapse: collapse; margin-bottom: 14px;">
          <tr>
            <td style="padding: 10px 14px; border-left: 1px solid #cbd5e1; font-size: 11px;">
              <span style="color:#475569;">إجمالي عدد السندات: </span>
              <strong style="font-family: monospace; color: #0f172a; font-size: 13px;">${statement.vouchers_count || 0} سند</strong>
            </td>
            <td style="padding: 10px 16px; text-align: left; background: #ffffff;">
              <span style="font-weight: 800; font-size: 12px; margin-left: 8px; color:#0f172a;">
                ${totalLabel}
              </span>
              <span style="font-family: monospace; font-size: 16px; font-weight: 900; color: ${isReceipt ? '#047857' : '#b91c1c'}; border-bottom: 2px double #0f172a; padding-bottom: 1px;">
                ${totalAmount.toLocaleString()} ر.ي
              </span>
            </td>
          </tr>
        </table>

        <table class="signatures-section">
          <tr>
            <td class="sig-col">
              <div style="font-weight: bold;">توقيع واعتماد أمين الصندوق</div>
              <div class="sig-line">أمين الصندوق</div>
            </td>
            <td class="sig-col">
              <div style="font-weight: bold;">توقيع المحاسب والختم الرسمي</div>
              <div class="sig-line">توقيع المحاسب</div>
              <div class="stamp-box">ختم المركز</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // 2. PARTIES MODE (Customer, Supplier, Worker)
  const isWorker = partyType === 'worker';
  const roleTitle = isWorker
    ? 'كشف حساب مستحقات وأجور فني'
    : partyType === 'supplier'
    ? 'كشف حساب مورد / مشتريات'
    : 'كشف حساب مالي رسمي';

  const partyLabel = isWorker ? 'الفني / العامل:' : partyType === 'supplier' ? 'المورد / الشركة:' : 'اسم الحساب / العميل:';
  const debitHeader = isWorker ? 'سلف ومسحوبات (-)' : 'مدين (عليه)';
  const creditHeader = isWorker ? 'أجور مستحقة (+)' : 'دائن (له)';

  const lines = statement.statement_lines || [];
  const openingBal = statement.opening_balance ?? 0;
  const totalDebits = statement.total_debits ?? 0;
  const totalCredits = statement.total_credits ?? 0;
  const closingBal = statement.closing_balance ?? 0;

  const linesHtml =
    lines.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding: 30px; color: #64748b; font-size: 12px; font-weight: bold;">لا توجد حركات مالية مسجلة خلال هذه الفترة</td></tr>`
      : lines
          .map((l, idx) => {
            const debitVal = Number(l.debit) || 0;
            const creditVal = Number(l.credit) || 0;
            const running = l.running_balance ?? 0;
            const bookletBadge = l.paper_bill_number
              ? `<span style="display:inline-block; font-size:9px; font-family: monospace; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:3px; padding:1px 4px; margin-right:4px;">دفتر: ${l.paper_bill_number}</span>`
              : '';
            const workerSuffix = isWorker ? (running >= 0 ? ' (له)' : ' (عليه)') : '';

            return `
          <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 7px 8px; text-align: center; font-size: 10px; color: #64748b; border-left: 1px solid #cbd5e1;">${idx + 1}</td>
            <td style="padding: 7px 8px; font-family: monospace; font-size: 11px; white-space: nowrap; border-left: 1px solid #cbd5e1;">${l.entry_date || '---'}</td>
            <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; border-left: 1px solid #cbd5e1;">
              ${l.ref_number || l.entry_number || '---'}
              ${bookletBadge}
            </td>
            <td style="padding: 7px 8px; font-weight: 500; font-size: 11px; border-left: 1px solid #cbd5e1;">${l.description || '---'}</td>
            <td style="padding: 7px 8px; text-align: left; font-family: monospace; font-weight: bold; color: ${debitVal > 0 ? '#b91c1c' : '#94a3b8'}; border-left: 1px solid #cbd5e1;">
              ${debitVal > 0 ? Number(debitVal).toLocaleString() : '-'}
            </td>
            <td style="padding: 7px 8px; text-align: left; font-family: monospace; font-weight: bold; color: ${creditVal > 0 ? '#047857' : '#94a3b8'}; border-left: 1px solid #cbd5e1;">
              ${creditVal > 0 ? Number(creditVal).toLocaleString() : '-'}
            </td>
            <td style="padding: 7px 8px; text-align: left; font-family: monospace; font-weight: 800; color: #0f172a;">
              ${Math.abs(running).toLocaleString()} ر.ي ${workerSuffix}
            </td>
          </tr>
        `;
          })
          .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${roleTitle} - ${statement.party_name || ''}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
      font-size: 11px;
      line-height: 1.4;
    }
    .classic-frame-outer {
      border: 2.5px solid #0f172a;
      padding: 3px;
      background: #ffffff;
      min-height: 275mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .classic-frame-inner {
      border: 1px solid #0f172a;
      padding: 18px 20px;
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .shop-title {
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .shop-meta {
      font-size: 10px;
      color: #475569;
      line-height: 1.6;
    }
    .doc-badge {
      border: 2px solid #0f172a;
      padding: 6px 14px;
      text-align: center;
      display: inline-block;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: -0.2px;
      background: #f8fafc;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #94a3b8;
      background: #f8fafc;
    }
    .info-table td {
      padding: 7px 12px;
      border: 1px solid #cbd5e1;
      font-size: 11px;
    }
    .info-label {
      color: #475569;
      font-weight: 600;
      width: 15%;
      background: #f1f5f9;
    }
    .info-val {
      font-weight: bold;
      color: #0f172a;
      width: 35%;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      margin-bottom: 14px;
    }
    .ledger-table th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 900;
      font-size: 11px;
      padding: 8px;
      border: 1px solid #94a3b8;
      border-bottom: 2px solid #0f172a;
    }
    .signatures-section {
      width: 100%;
      margin-top: 18px;
      border-top: 1px dashed #94a3b8;
      padding-top: 14px;
    }
    .sig-col {
      width: 50%;
      text-align: center;
      vertical-align: top;
      font-size: 11px;
      color: #334155;
    }
    .sig-line {
      margin-top: 45px;
      border-top: 1px solid #475569;
      width: 65%;
      margin-left: auto;
      margin-right: auto;
      padding-top: 4px;
      font-size: 10px;
      color: #64748b;
    }
    .stamp-box {
      width: 75px;
      height: 45px;
      border: 1px dashed #94a3b8;
      margin: 8px auto 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="classic-frame-outer">
    <div class="classic-frame-inner">
      <div>
        <!-- 1. Header -->
        <table class="header-table">
          <tr>
            <td style="width: 62%; vertical-align: top;">
              <div class="shop-title">${settings.shopName || 'مركز سريع وبنشر PRO'}</div>
              <div class="shop-meta">
                ${settings.shopAddress ? `<div>📍 ${settings.shopAddress}</div>` : ''}
                ${settings.shopPhone ? `<div>📞 هاتف: ${settings.shopPhone}</div>` : ''}
                ${settings.taxNumber ? `<div>سجل تجاري / ترخيص: ${settings.taxNumber}</div>` : ''}
              </div>
            </td>
            <td style="width: 38%; text-align: left; vertical-align: top;">
              <div class="doc-badge">${roleTitle}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 6px; font-weight: bold;">
                تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-YE')}
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. Meta Info Box -->
        <table class="info-table">
          <tr>
            <td class="info-label">${partyLabel}</td>
            <td class="info-val">${statement.party_name || '---'}</td>
            <td class="info-label">الفترة المالية:</td>
            <td class="info-val">من ${statement.start_date || 'البداية'} إلى ${statement.end_date || 'الآن'}</td>
          </tr>
          <tr>
            <td class="info-label">رقم الهاتف:</td>
            <td class="info-val" style="font-family: monospace;">${statement.party_phone || '---'}</td>
            <td class="info-label">الرصيد السابق:</td>
            <td class="info-val" style="font-family: monospace; font-weight: 800;">
              ${Number(openingBal).toLocaleString()} ر.ي
            </td>
          </tr>
        </table>

        <!-- 3. Financial Movements Table -->
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">م</th>
              <th style="width: 85px;">التاريخ</th>
              <th style="width: 105px;">رقم السند/المرجع</th>
              <th>البيان والتفاصيل</th>
              <th style="width: 95px; text-align: left;">${debitHeader}</th>
              <th style="width: 95px; text-align: left;">${creditHeader}</th>
              <th style="width: 115px; text-align: left;">الرصيد التراكمي</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Summary & Signatures Footer -->
      <div>
        <table style="width:100%; border: 1.5px solid #0f172a; background: #f8fafc; border-collapse: collapse; margin-bottom: 14px;">
          <tr>
            <td style="padding: 10px 14px; border-left: 1px solid #cbd5e1; font-size: 11px;">
              <span style="color:#475569;">إجمالي المدين: </span>
              <strong style="font-family: monospace; color: #b91c1c; font-size: 13px;">+${Number(totalDebits).toLocaleString()} ر.ي</strong>
            </td>
            <td style="padding: 10px 14px; border-left: 1px solid #cbd5e1; font-size: 11px;">
              <span style="color:#475569;">إجمالي الدائن: </span>
              <strong style="font-family: monospace; color: #047857; font-size: 13px;">-${Number(totalCredits).toLocaleString()} ر.ي</strong>
            </td>
            <td style="padding: 10px 16px; text-align: left; background: #ffffff;">
              <span style="font-weight: 800; font-size: 12px; margin-left: 6px; color:#0f172a;">
                ${isWorker ? 'صافي المستحق للفني:' : 'الرصيد الختامي المستحق:'}
              </span>
              <span style="font-family: monospace; font-size: 15px; font-weight: 900; color: #0f172a; border-bottom: 2px double #0f172a; padding-bottom: 1px;">
                ${Math.abs(closingBal).toLocaleString()} ر.ي ${isWorker ? (closingBal >= 0 ? '(له)' : '(عليه)') : ''}
              </span>
            </td>
          </tr>
        </table>

        <table class="signatures-section">
          <tr>
            <td class="sig-col">
              <div style="font-weight: bold;">توقيع واستلام صاحب الحساب</div>
              <div class="sig-line">الاسم والتوقيع</div>
            </td>
            <td class="sig-col">
              <div style="font-weight: bold;">توقيع المحاسب والختم الرسمي</div>
              <div class="sig-line">توقيع المحاسب</div>
              <div class="stamp-box">ختم المركز</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function StatementOfAccountModal({
  isOpen,
  onClose,
  initialPartyType = 'customer',
  initialPartyId = null,
}) {
  const [partyType, setPartyType] = useState(initialPartyType); // 'customer' | 'supplier' | 'worker' | 'receipt' | 'payment'
  const [partyId, setPartyId] = useState(initialPartyId);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyList, setPartyList] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);

  // Date filters
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paperBillFilter, setPaperBillFilter] = useState('');

  // Vouchers Specific Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all' | 'cash' | 'network' | 'transfer'
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Data & State
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState('a4'); // 'a4' | 'thermal'
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  const settings = getShopSettings();
  const isVoucherMode = partyType === 'receipt' || partyType === 'payment';

  // Load expense categories once for payment category filter
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/expense-categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setExpenseCategories(data.data);
        }
      })
      .catch((err) => console.warn('Could not load expense categories:', err.message));
  }, [isOpen]);

  // Sync initial props whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const pType = initialPartyType || 'customer';
      setPartyType(pType);
      setPartyId(initialPartyId || null);
      setSelectedParty(null);
      setSearchQuery('');
      setExportNotice('');
      setPaymentMethodFilter('all');
      setExpenseCategoryFilter('all');

      if (pType === 'receipt' || pType === 'payment') {
        const today = getLocalTodayDate();
        setDateFilter('today');
        setStartDate(today);
        setEndDate(today);
      } else {
        setDateFilter('all');
        setStartDate('');
        setEndDate('');
      }
    }
  }, [isOpen, initialPartyType, initialPartyId]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load parties list based on selected party type (only when in party mode)
  useEffect(() => {
    if (!isOpen || isVoucherMode) return;
    let isCancelled = false;

    const loadParties = async () => {
      try {
        let endpoint = '/api/vehicles';
        if (partyType === 'supplier') endpoint = '/api/suppliers';
        if (partyType === 'worker') endpoint = '/api/workers';

        const res = await fetch(endpoint);
        const data = await res.json();
        if (isCancelled) return;

        if (data.success) {
          const list = data.data || [];
          setPartyList(list);

          // Find target party matching current partyId or initialPartyId
          let target = null;
          const targetId = partyId || (partyType === initialPartyType ? initialPartyId : null);
          if (targetId) {
            target = list.find((p) => Number(p.id) === Number(targetId));
          }
          if (!target && list.length > 0) {
            target = list[0];
          }

          if (target) {
            setSelectedParty(target);
            setPartyId(target.id);
          } else {
            setSelectedParty(null);
            setPartyId(null);
          }
        }
      } catch (err) {
        if (!isCancelled) console.error('Error loading parties:', err);
      }
    };

    loadParties();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, partyType, initialPartyId, initialPartyType, isVoucherMode]);

  // 1. Fetch Party Statement Data
  const fetchPartyStatement = async () => {
    if (!partyId) return;

    try {
      setLoading(true);
      let url = `/api/accounting/statement-of-account?party_type=${partyType}&party_id=${partyId}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (paperBillFilter.trim()) url += `&paper_bill_number=${encodeURIComponent(paperBillFilter.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStatement(data.data);
      }
    } catch (err) {
      console.error('Error fetching party statement:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Vouchers Statement Data (Receipts or Payments)
  const fetchVouchersStatement = async () => {
    try {
      setLoading(true);
      let url = `/api/vouchers?voucher_type=${partyType}`;
      if (startDate) url += `&date_from=${startDate}`;
      if (endDate) url += `&date_to=${endDate}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (paymentMethodFilter !== 'all') url += `&payment_method=${paymentMethodFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        let list = data.data || [];

        // Filter by expense category if selected in payment mode
        if (partyType === 'payment' && expenseCategoryFilter !== 'all') {
          list = list.filter(
            (v) =>
              (v.offset_account_name && v.offset_account_name.includes(expenseCategoryFilter)) ||
              (v.description && v.description.includes(expenseCategoryFilter)) ||
              (v.party_name && v.party_name.includes(expenseCategoryFilter))
          );
        }

        // Filter by paper booklet if entered
        if (paperBillFilter.trim()) {
          const pFilter = paperBillFilter.trim().toLowerCase();
          list = list.filter((v) => v.paper_bill_number && v.paper_bill_number.toLowerCase().includes(pFilter));
        }

        const totalSum = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        setStatement({
          is_voucher_mode: true,
          voucher_type: partyType,
          party_name:
            partyType === 'receipt'
              ? 'كافة مقبوضات وإيرادات الصندوق'
              : expenseCategoryFilter !== 'all'
              ? `مصروفات: ${expenseCategoryFilter}`
              : 'كافة مصروفات ومدفوعات المركز',
          start_date: startDate || 'البداية',
          end_date: endDate || 'الآن',
          total_amount: totalSum,
          vouchers_count: list.length,
          items: list,
        });
      }
    } catch (err) {
      console.error('Error fetching vouchers statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (isVoucherMode) {
      fetchVouchersStatement();
    } else if (partyId) {
      fetchPartyStatement();
    }
  }, [
    partyId,
    partyType,
    startDate,
    endDate,
    paperBillFilter,
    searchQuery,
    paymentMethodFilter,
    expenseCategoryFilter,
    isVoucherMode,
  ]);

  // Handle Quick Date Filters
  const handleDatePreset = (preset) => {
    setDateFilter(preset);
    const today = getLocalTodayDate();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'month') {
      const firstDay = new Date();
      firstDay.setDate(1);
      setStartDate(getLocalTodayDate(firstDay));
      setEndDate(today);
    }
  };

  // Filter party search (Memoized hook)
  const filteredParties = useMemo(() => {
    if (isVoucherMode) return [];
    if (!searchQuery.trim()) return partyList;
    const q = searchQuery.trim().toLowerCase();
    if (partyType === 'customer') {
      return partyList.filter(
        (p) =>
          (p.plate_number && p.plate_number.toLowerCase().includes(q)) ||
          (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q))
      );
    } else if (partyType === 'supplier') {
      return partyList.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.company_name && p.company_name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q))
      );
    } else {
      return partyList.filter((p) => p.name && p.name.toLowerCase().includes(q));
    }
  }, [partyList, searchQuery, partyType, isVoucherMode]);

  // Auto select matching party when searching (Hook called unconditionally)
  useEffect(() => {
    if (!isOpen || isVoucherMode) return;
    if (searchQuery.trim() && filteredParties.length > 0) {
      const alreadySelected = filteredParties.some((p) => Number(p.id) === Number(partyId));
      if (!alreadySelected) {
        setSelectedParty(filteredParties[0]);
        setPartyId(filteredParties[0].id);
      }
    }
  }, [isOpen, searchQuery, filteredParties, partyId, isVoucherMode]);

  // Early return ONLY after all React Hooks have executed unconditionally
  if (!isOpen) return null;

  // Prepare WhatsApp text
  const formatWhatsAppMessage = () => {
    if (!statement) return '';

    if (statement.is_voucher_mode) {
      const isReceipt = statement.voucher_type === 'receipt';
      return `*كشف حركة ${isReceipt ? 'سندات القبض' : 'سندات الصرف'} - مركز ${settings.shopName}*
الفترة: من ${statement.start_date || '---'} إلى ${statement.end_date || '---'}
- عدد السندات: ${statement.vouchers_count || 0} سند
*إجمالي المبلغ: ${(statement.total_amount ?? 0).toLocaleString()} ر.ي*

طبع بتاريخ: ${new Date().toLocaleDateString('ar-YE')}`;
    }

    const roleLabel = partyType === 'customer' ? 'العميل الكريم' : partyType === 'supplier' ? 'المورد الكريم' : 'الفني';
    const linesText = (statement.statement_lines || [])
      .slice(-5)
      .map(
        (l) =>
          `• ${l.entry_date || ''} [${l.description || ''}]: ${
            Number(l.debit) > 0 ? `مدين (+${l.debit})` : `دائن (-${l.credit})`
          } | رصيد: ${(l.running_balance ?? 0).toLocaleString()} ر.ي`
      )
      .join('\n');

    return `*كشف حساب مالي - مركز ${settings.shopName}*
إلى: ${roleLabel} / ${statement.party_name}
الفترة: من ${statement.start_date || '---'} إلى ${statement.end_date || '---'}

- الرصيد الافتتاحي السابق: ${(statement.opening_balance ?? 0).toLocaleString()} ر.ي
- إجمالي الحركات المدينة (عليك): ${(statement.total_debits ?? 0).toLocaleString()} ر.ي
- إجمالي المقبوضات/السداد (لك): ${(statement.total_credits ?? 0).toLocaleString()} ر.ي
*الرصيد الختامي المستحق: ${(statement.closing_balance ?? 0).toLocaleString()} ر.ي*

آخر الحركات:
${linesText}

شاكرين حسن تعاملكم معنا.`;
  };

  const whatsappMessage = formatWhatsAppMessage();
  const whatsappUrl =
    statement && statement.party_phone ? formatYemeniWhatsAppLink(statement.party_phone, whatsappMessage) : '#';

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Direct Vector PDF Export Handler
  const handleExportPdf = async () => {
    if (!statement) return;
    setIsExportingPdf(true);
    setExportNotice('');

    try {
      const html = buildClassicStatementHtml({
        statement,
        settings,
        partyType,
        expenseCategoryFilter,
      });

      let defaultFileName = '';
      if (statement.is_voucher_mode) {
        const isReceipt = statement.voucher_type === 'receipt';
        const prefix = isReceipt ? 'كشف_سندات_القبض' : 'كشف_سندات_الصرف';
        const dateTag = statement.end_date || new Date().toISOString().slice(0, 10);
        defaultFileName = `${prefix}_${dateTag}.pdf`;
      } else {
        const cleanName = (statement.party_name || 'طرف').replace(/[\/\\?%*:|"<>]/g, '_');
        const dateTag = statement.end_date || new Date().toISOString().slice(0, 10);
        defaultFileName = `كشف_حساب_${cleanName}_${dateTag}.pdf`;
      }

      if (window.electronAPI && typeof window.electronAPI.saveStatementPdf === 'function') {
        const result = await window.electronAPI.saveStatementPdf({ html, defaultFileName });
        if (result && result.success) {
          setExportNotice('✅ تم حفظ وتصدير ملف PDF بنجاح!');
          setTimeout(() => setExportNotice(''), 4000);
        }
      } else {
        // Fallback for browser / LAN client: Open print window configured for Save as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
        } else {
          handlePrint('a4');
        }
      }
    } catch (err) {
      console.error('PDF export error:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isWorker = partyType === 'worker';
  const roleTitle = isVoucherMode
    ? partyType === 'receipt'
      ? 'كشف حركة سندات القبض'
      : 'كشف حركة سندات الصرف والمصروفات'
    : isWorker
    ? 'كشف حساب مستحقات وأجور فني'
    : partyType === 'supplier'
    ? 'كشف حساب مورد / مشتريات'
    : 'كشف حساب مالي رسمي';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none cursor-pointer print:p-0 print:bg-white print:static print:inset-auto print:block print:w-full print:h-auto"
    >
      <div className="print:hidden apple-glass border border-white/20 rounded-3xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 cursor-default">
        {/* 1. Modal Top Header & Action Controls */}
        <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>كشف الحساب المالي (Statement of Account)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 font-mono">
                  CLASSIC PDF
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                معاينة مباشرة A4 بنظام السجلات الكلاسيكية وتصدير فوري كملف PDF رقمي
              </p>
            </div>
          </div>

          {/* Export Notice Pill */}
          {exportNotice && (
            <div className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-in fade-in">
              {exportNotice}
            </div>
          )}

          {/* Action Buttons: Direct PDF Download, Print A4, Thermal, WhatsApp */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExportingPdf || !statement}
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              title="تصدير وتنزيل ملف PDF كلاسيكي عالي الدقة"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>تنزيل PDF 📥</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint('a4')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="طباعة ورقية مباشرة A4"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>طباعة A4</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint('thermal')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="طباعة سريعة على ورق فواتير كاشير حراري 80mm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>حراري 80mm</span>
            </button>

            {statement && !isVoucherMode && statement.party_phone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95"
                title="إرسال كشف الحساب لواتساب الطرف"
              >
                <Smartphone className="w-4 h-4" />
                <span>واتساب</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
              title="نسخ ملخص كشف الحساب للحافظة"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Controls & Search Filter Bar */}
        <div className="p-3.5 border-b border-white/10 bg-slate-950/60 space-y-2.5 flex-shrink-0 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Party / Voucher Type selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setPartyType('customer');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'customer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>زبائن / سيارات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartyType('supplier');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'supplier' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>موردين ووكالات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartyType('worker');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'worker' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>فنيين وعمال</span>
              </button>

              {/* Added 2 Voucher Tabs as agreed */}
              <button
                type="button"
                onClick={() => {
                  setPartyType('receipt');
                  handleDatePreset('today'); // Default today as requested
                }}
                className={`px-3.5 py-1.5 rounded-lg font-black transition flex items-center gap-1.5 ${
                  partyType === 'receipt'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-emerald-400 hover:text-white hover:bg-emerald-500/10'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>سندات القبض 📥</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartyType('payment');
                  handleDatePreset('today'); // Default today as requested
                }}
                className={`px-3.5 py-1.5 rounded-lg font-black transition flex items-center gap-1.5 ${
                  partyType === 'payment'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-rose-400 hover:text-white hover:bg-rose-500/10'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>سندات الصرف 📤</span>
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'month', label: 'هذا الشهر' },
                { id: 'all', label: 'كل المدة' },
              ].map((dp) => (
                <button
                  key={dp.id}
                  type="button"
                  onClick={() => handleDatePreset(dp.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    dateFilter === dp.id
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {dp.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range & Booklet Search */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="w-28 h-8 px-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-[11px]"
                title="من تاريخ"
              />
              <span className="text-slate-400">&larr;</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="w-28 h-8 px-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-[11px]"
                title="إلى تاريخ"
              />

              <div className="relative">
                <input
                  type="text"
                  placeholder="رقم الدفتر الورقي..."
                  value={paperBillFilter}
                  onChange={(e) => setPaperBillFilter(e.target.value)}
                  className="w-32 h-8 px-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  title="مطابقة الحساب برقم الدفتر الورقي اليدوي"
                />
                {paperBillFilter && (
                  <button
                    onClick={() => setPaperBillFilter('')}
                    className="absolute left-2 top-2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Filter Row: Depending on Party mode vs Voucher mode */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1">
            {isVoucherMode ? (
              <>
                {/* Search Bar for Vouchers */}
                <div className={`relative ${partyType === 'payment' ? 'md:col-span-5' : 'md:col-span-8'}`}>
                  <input
                    type="text"
                    placeholder={
                      partyType === 'receipt'
                        ? 'بحث برقم سند القبض، المقبوض منه، أو البيان...'
                        : 'بحث برقم سند الصرف، المستلم، أو البيان...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 px-3 pr-8 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-slate-400" />
                </div>

                {/* Expense Category Filter for Payment Vouchers */}
                {partyType === 'payment' && (
                  <div className="md:col-span-4">
                    <select
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-rose-400"
                    >
                      <option value="all">-- كافة بنود ومصروفات المركز --</option>
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Payment Method Filter */}
                <div className={`${partyType === 'payment' ? 'md:col-span-3' : 'md:col-span-4'}`}>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full h-8 px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-blue-400"
                  >
                    <option value="all">-- كل طرق الدفع --</option>
                    <option value="cash">نقداً (كاش الصندوق)</option>
                    <option value="kuraimi">بنك الكريمي</option>
                    <option value="jeeb">محفظة جيب</option>
                    <option value="jawali">جوالي</option>
                    <option value="onecash">ون كاش</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Party Mode: Search Party */}
                <div className="relative md:col-span-6">
                  <input
                    type="text"
                    placeholder={
                      partyType === 'customer'
                        ? 'بحث باللوحة، اسم العميل أو الهاتف...'
                        : partyType === 'supplier'
                        ? 'بحث باسم المورد أو الشركة...'
                        : 'بحث باسم الفني...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 px-3 pr-8 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-slate-400" />
                </div>

                {/* Party Mode: Dropdown Selector */}
                <div className="md:col-span-6">
                  <select
                    value={partyId || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPartyId(val);
                      const found = partyList.find((p) => p.id === val);
                      if (found) setSelectedParty(found);
                    }}
                    className="w-full h-8 px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-blue-400"
                  >
                    <option value="">-- اختر الطرف لعرض حسابه --</option>
                    {filteredParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {partyType === 'customer'
                          ? `${p.plate_number} - ${p.customer_name} (${p.car_make_model || 'سيارة'})`
                          : partyType === 'supplier'
                          ? `${p.name} ${p.company_name ? `(${p.company_name})` : ''} - رصيد: ${Number(
                              p.balance_due || 0
                            ).toLocaleString()} ر.ي`
                          : `${p.name} (${p.role || 'فني'})`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. Main On-Screen Preview Area (Classic A4 Sheet Showcase) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 flex justify-center">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
              <span>جاري استخراج السجلات وتجهيز شيت المعاينة...</span>
            </div>
          ) : !statement ? (
            <div className="p-12 text-center text-slate-400 my-auto">
              <FileText className="w-12 h-12 mx-auto text-blue-500/30 mb-3" />
              <h4 className="font-bold text-sm text-white">يرجى اختيار طرف أو فترة لعرض كشف الحساب</h4>
              <p className="text-xs text-slate-400 mt-1">اختر من القائمة أو الفلاتر أعلاه لعرض وتصدير الكشف مباشرة</p>
            </div>
          ) : isVoucherMode ? (
            /* ==========================================================
               AUTHENTIC CLASSIC A4 VOUCHER STATEMENT (LIVE ON-SCREEN)
               ========================================================== */
            <div className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-4 sm:p-7 select-text font-sans transition-all animate-in fade-in duration-200">
              {/* Outer Classic Double Border Frame */}
              <div className="border-[2.5px] border-slate-900 p-1 bg-white">
                {/* Inner Border Frame */}
                <div className="border border-slate-900 p-4 sm:p-6 flex flex-col justify-between min-h-[250mm]">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {settings.shopName || 'مركز سريع وبنشر PRO'}
                        </h1>
                        <div className="text-[11px] text-slate-600 mt-1 space-y-0.5 leading-relaxed">
                          {settings.shopAddress && <div>📍 {settings.shopAddress}</div>}
                          {settings.shopPhone && <div>📞 هاتف: {settings.shopPhone}</div>}
                          {settings.taxNumber && <div>سجل تجاري / ترخيص: {settings.taxNumber}</div>}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="border-2 border-slate-900 px-4 py-1.5 rounded bg-slate-50 font-black text-sm sm:text-base text-slate-900 shadow-sm">
                          {roleTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 font-bold">
                          تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Box */}
                    <div className="grid grid-cols-2 gap-0 border border-slate-400 rounded bg-slate-50 mb-4 text-xs divide-y divide-x divide-slate-300">
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">نوع الحركة:</span>
                        <span className="font-black text-slate-900">
                          {partyType === 'receipt' ? 'سندات قبض نقدية وإيرادات' : 'سندات صرف ومصروفات نقدية'}
                        </span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">الفترة المالية:</span>
                        <span className="font-bold text-slate-900">
                          من {statement.start_date || 'البداية'} إلى {statement.end_date || 'الآن'}
                        </span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">عدد السندات:</span>
                        <span className="font-mono font-bold text-slate-900">{statement.vouchers_count || 0} سند</span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">
                          {partyType === 'payment' ? 'البند / التصنيف:' : 'الحساب:'}
                        </span>
                        <span className="font-bold text-slate-900">
                          {partyType === 'payment' && expenseCategoryFilter !== 'all'
                            ? expenseCategoryFilter
                            : 'شامل كافة البنود والحسابات'}
                        </span>
                      </div>
                    </div>

                    {/* Vouchers Table */}
                    <div className="border-1.5 border-slate-900 rounded overflow-hidden mb-4">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-900 font-black">
                            <th className="p-2 text-center w-8 border-l border-slate-300">م</th>
                            <th className="p-2 w-24 border-l border-slate-300">التاريخ والوقت</th>
                            <th className="p-2 w-28 border-l border-slate-300">رقم السند</th>
                            <th className="p-2 border-l border-slate-300">
                              {partyType === 'receipt' ? 'المقبوض منه' : 'المستلم / المدفوع له'}
                            </th>
                            {partyType === 'payment' && (
                              <th className="p-2 w-24 border-l border-slate-300">بند المصروف</th>
                            )}
                            <th className="p-2 border-l border-slate-300">البيان والشرح</th>
                            <th className="p-2 w-20 border-l border-slate-300">طريقة الدفع</th>
                            <th className="p-2 text-left w-24 text-slate-900">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 text-slate-800">
                          {(statement.items || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan={partyType === 'payment' ? 8 : 7}
                                className="p-8 text-center text-slate-500 font-bold"
                              >
                                لا توجد سندات مسجلة خلال هذه الفترة
                              </td>
                            </tr>
                          ) : (
                            statement.items.map((v, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="p-2 text-center text-[10px] text-slate-500 border-l border-slate-300">
                                  {idx + 1}
                                </td>
                                <td className="p-2 font-mono text-[11px] whitespace-nowrap border-l border-slate-300">
                                  {(v.created_at || '').slice(0, 16).replace('T', ' ')}
                                </td>
                                <td className="p-2 font-mono font-bold text-[11px] border-l border-slate-300">
                                  <span>{v.voucher_number || '---'}</span>
                                  {v.paper_bill_number && (
                                    <span className="mr-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px]">
                                      دفتر: {v.paper_bill_number}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 font-black text-slate-900 text-[11px] border-l border-slate-300">
                                  {v.party_name || '---'}
                                </td>
                                {partyType === 'payment' && (
                                  <td className="p-2 font-semibold text-slate-700 text-[11px] border-l border-slate-300">
                                    {v.offset_account_name || 'مصروف عام'}
                                  </td>
                                )}
                                <td className="p-2 font-medium text-[11px] border-l border-slate-300">
                                  {v.description || '---'}
                                </td>
                                <td className="p-2 text-[10px] text-slate-600 border-l border-slate-300">
                                  {formatPaymentMethodLabel(v.payment_method)}
                                </td>
                                <td
                                  className={`p-2 text-left font-mono font-black text-[12px] ${
                                    partyType === 'receipt' ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {Number(v.amount || 0).toLocaleString()} ر.ي
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Bar & Signatures */}
                  <div className="mt-4">
                    <div className="border-1.5 border-slate-900 bg-slate-50 p-2.5 rounded flex flex-wrap items-center justify-between text-xs mb-6">
                      <div className="text-slate-600 font-bold">
                        <span>إجمالي عدد السندات: </span>
                        <span className="font-mono text-slate-950 font-black">{statement.vouchers_count || 0} سند</span>
                      </div>

                      <div className="border-2 border-slate-900 bg-white px-4 py-2 rounded text-left">
                        <div className="text-[11px] font-bold text-slate-600">
                          {partyType === 'receipt' ? 'إجمالي المقبوضات:' : 'إجمالي المصروفات والمدفوعات:'}
                        </div>
                        <div
                          className={`text-lg font-black font-mono mt-0.5 ${
                            partyType === 'receipt' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {(statement.total_amount ?? 0).toLocaleString()} ر.ي
                        </div>
                      </div>
                    </div>

                    {/* Dual Signatures */}
                    <div className="border-t border-dashed border-slate-400 pt-3 flex justify-between text-center text-xs">
                      <div className="w-48">
                        <div className="font-bold text-slate-900">توقيع واعتماد أمين الصندوق</div>
                        <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                          أمين الصندوق
                        </div>
                      </div>
                      <div className="w-48">
                        <div className="font-bold text-slate-900">توقيع المحاسب والختم الرسمي</div>
                        <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">توقيع المحاسب</div>
                        <div className="w-16 h-8 border border-dashed border-slate-400 mx-auto mt-1 flex items-center justify-center text-[9px] text-slate-400">
                          ختم المركز
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==========================================================
               AUTHENTIC CLASSIC A4 STATEMENT SHEET (PARTIES: CUSTOMERS/SUPPLIERS/WORKERS)
               ========================================================== */
            <div className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-4 sm:p-7 select-text font-sans transition-all animate-in fade-in duration-200">
              {/* Outer Classic Double Border Frame */}
              <div className="border-[2.5px] border-slate-900 p-1 bg-white">
                {/* Inner Border Frame */}
                <div className="border border-slate-900 p-4 sm:p-6 flex flex-col justify-between min-h-[250mm]">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {settings.shopName || 'مركز سريع وبنشر PRO'}
                        </h1>
                        <div className="text-[11px] text-slate-600 mt-1 space-y-0.5 leading-relaxed">
                          {settings.shopAddress && <div>📍 {settings.shopAddress}</div>}
                          {settings.shopPhone && <div>📞 هاتف: {settings.shopPhone}</div>}
                          {settings.taxNumber && <div>سجل تجاري / ترخيص: {settings.taxNumber}</div>}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="border-2 border-slate-900 px-4 py-1.5 rounded bg-slate-50 font-black text-sm sm:text-base text-slate-900 shadow-sm">
                          {roleTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 font-bold">
                          تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Box */}
                    <div className="grid grid-cols-2 gap-0 border border-slate-400 rounded bg-slate-50 mb-4 text-xs divide-y divide-x divide-slate-300">
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">
                          {isWorker ? 'اسم الفني:' : partyType === 'supplier' ? 'اسم المورد:' : 'اسم العميل / الحساب:'}
                        </span>
                        <span className="font-black text-slate-900">{statement.party_name || '---'}</span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">الفترة المالية:</span>
                        <span className="font-bold text-slate-900">
                          من {statement.start_date || 'البداية'} إلى {statement.end_date || 'الآن'}
                        </span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">رقم الهاتف:</span>
                        <span className="font-mono font-bold text-slate-900">{statement.party_phone || '---'}</span>
                      </div>
                      <div className="p-2.5 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">الرصيد السابق (الافتتاحي):</span>
                        <span className="font-mono font-black text-slate-900">
                          {(statement.opening_balance ?? 0).toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>

                    {/* Movements Ledger Table */}
                    <div className="border-1.5 border-slate-900 rounded overflow-hidden mb-4">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-900 font-black">
                            <th className="p-2 text-center w-8 border-l border-slate-300">م</th>
                            <th className="p-2 w-20 border-l border-slate-300">التاريخ</th>
                            <th className="p-2 w-28 border-l border-slate-300">رقم السند/المرجع</th>
                            <th className="p-2 border-l border-slate-300">البيان والتفاصيل</th>
                            <th className="p-2 text-left w-24 border-l border-slate-300 text-rose-700">
                              {isWorker ? 'سلف ومسحوبات (-)' : 'مدين (عليه)'}
                            </th>
                            <th className="p-2 text-left w-24 border-l border-slate-300 text-emerald-700">
                              {isWorker ? 'أجور مستحقة (+)' : 'دائن (له)'}
                            </th>
                            <th className="p-2 text-left w-28 text-slate-900">الرصيد التراكمي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 text-slate-800">
                          {(statement.statement_lines || []).length === 0 ? (
                            <tr>
                              <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                                لا توجد حركات مالية مسجلة خلال هذه الفترة
                              </td>
                            </tr>
                          ) : (
                            statement.statement_lines.map((line, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="p-2 text-center text-[10px] text-slate-500 border-l border-slate-300">
                                  {idx + 1}
                                </td>
                                <td className="p-2 font-mono text-[11px] whitespace-nowrap border-l border-slate-300">
                                  {line.entry_date}
                                </td>
                                <td className="p-2 font-mono font-bold text-[11px] border-l border-slate-300">
                                  <span>{line.ref_number || line.entry_number || '---'}</span>
                                  {line.paper_bill_number && (
                                    <span className="mr-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px]">
                                      دفتر: {line.paper_bill_number}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 font-medium text-[11px] border-l border-slate-300">
                                  {line.description}
                                </td>
                                <td className="p-2 text-left font-mono font-bold text-rose-700 border-l border-slate-300">
                                  {Number(line.debit) > 0 ? Number(line.debit).toLocaleString() : '-'}
                                </td>
                                <td className="p-2 text-left font-mono font-bold text-emerald-700 border-l border-slate-300">
                                  {Number(line.credit) > 0 ? Number(line.credit).toLocaleString() : '-'}
                                </td>
                                <td className="p-2 text-left font-mono font-black text-slate-900">
                                  {Math.abs(line.running_balance ?? 0).toLocaleString()} ر.ي
                                  {isWorker && (
                                    <span className="text-[10px] text-slate-500 mr-1">
                                      {(line.running_balance ?? 0) >= 0 ? '(له)' : '(عليه)'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Bar & Signatures */}
                  <div className="mt-4">
                    <div className="border-1.5 border-slate-900 bg-slate-50 p-2.5 rounded flex flex-wrap items-center justify-between text-xs mb-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">إجمالي المدين:</span>
                          <span className="font-mono font-bold text-rose-700 text-sm">
                            +{(statement.total_debits ?? 0).toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">إجمالي الدائن:</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            -{(statement.total_credits ?? 0).toLocaleString()} ر.ي
                          </span>
                        </div>
                      </div>

                      <div className="border-2 border-slate-900 bg-white px-4 py-2 rounded text-left">
                        <div className="text-[11px] font-bold text-slate-600">
                          {isWorker ? 'صافي المستحق للفني بذمة المركز:' : 'الرصيد الختامي المستحق:'}
                        </div>
                        <div className="text-lg font-black font-mono text-slate-950 mt-0.5">
                          {Math.abs(statement.closing_balance ?? 0).toLocaleString()} ر.ي
                          {isWorker && (
                            <span className="text-xs font-sans font-bold mr-1.5 text-slate-700">
                              {(statement.closing_balance ?? 0) >= 0 ? '(له)' : '(عليه)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dual Signatures */}
                    <div className="border-t border-dashed border-slate-400 pt-3 flex justify-between text-center text-xs">
                      <div className="w-48">
                        <div className="font-bold text-slate-900">توقيع واستلام صاحب الحساب</div>
                        <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                          الاسم والتوقيع
                        </div>
                      </div>
                      <div className="w-48">
                        <div className="font-bold text-slate-900">توقيع المحاسب والختم الرسمي</div>
                        <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">توقيع المحاسب</div>
                        <div className="w-16 h-8 border border-dashed border-slate-400 mx-auto mt-1 flex items-center justify-center text-[9px] text-slate-400">
                          ختم المركز
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRINT-READY CONTAINERS (CLEAN BLACK & WHITE PRINTING)
         ========================================================================= */}
      {/* 1. Thermal 80mm Print Layout */}
      <div
        className={`hidden print:${
          printMode === 'thermal' ? 'block' : 'hidden'
        } text-black bg-white p-2 font-mono text-[11px] leading-tight w-[80mm] mx-auto`}
      >
        <div className="text-center pb-2 border-b border-black">
          <div className="font-bold text-sm">{settings.shopName}</div>
          <div className="text-[10px]">{settings.shopAddress}</div>
          <div className="text-[10px]">هاتف: {settings.shopPhone}</div>
          <div className="font-bold mt-1 text-xs">{roleTitle}</div>
        </div>

        {isVoucherMode ? (
          <>
            <div className="py-2 text-[10px] space-y-0.5 border-b border-black">
              <div>
                الفترة: {statement?.start_date || '---'} إلى {statement?.end_date || '---'}
              </div>
              <div>عدد السندات: {statement?.vouchers_count || 0} سند</div>
            </div>

            <table className="w-full text-[9px] my-2 text-right">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">السند</th>
                  <th className="py-1">{partyType === 'receipt' ? 'المقبوض منه' : 'المستلم'}</th>
                  <th className="py-1">طريقة الدفع</th>
                  <th className="py-1 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.items || []).map((v, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="py-0.5">{v.voucher_number}</td>
                    <td className="py-0.5 truncate max-w-[70px]">{v.party_name || '---'}</td>
                    <td className="py-0.5">{formatPaymentMethodLabel(v.payment_method)}</td>
                    <td className="py-0.5 font-bold text-left">{Number(v.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-2 border-t-2 border-black space-y-1 font-bold text-xs">
              <div className="flex justify-between text-sm">
                <span>{partyType === 'receipt' ? 'إجمالي المقبوضات:' : 'إجمالي المصروفات:'}</span>
                <span>{(statement?.total_amount ?? 0).toLocaleString()} ر.ي</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="py-2 text-[10px] space-y-0.5 border-b border-black">
              <div>
                {isWorker ? 'الفني / العامل:' : 'الطرف:'} {statement?.party_name || '---'}
              </div>
              {statement?.party_phone && <div>الهاتف: {statement?.party_phone}</div>}
              <div>
                الفترة: {statement?.start_date || '---'} إلى {statement?.end_date || '---'}
              </div>
              <div>الرصيد السابق: {(statement?.opening_balance ?? 0).toLocaleString()} ر.ي</div>
            </div>

            <table className="w-full text-[9px] my-2 text-right">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">التاريخ</th>
                  <th className="py-1">البيان</th>
                  <th className="py-1">{isWorker ? 'سحب' : 'مدين'}</th>
                  <th className="py-1">{isWorker ? 'استحقاق' : 'دائن'}</th>
                  <th className="py-1">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.statement_lines || []).map((l, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="py-0.5">{(l.entry_date || '').slice(5)}</td>
                    <td className="py-0.5 truncate max-w-[80px]">{l.description || '---'}</td>
                    <td className="py-0.5">{Number(l.debit) || 0}</td>
                    <td className="py-0.5">{Number(l.credit) || 0}</td>
                    <td className="py-0.5 font-bold">
                      {Math.abs(l.running_balance ?? 0).toLocaleString()}{' '}
                      {isWorker ? ((l.running_balance ?? 0) >= 0 ? 'له' : 'عليه') : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-2 border-t-2 border-black space-y-1 font-bold text-xs">
              <div className="flex justify-between">
                <span>{isWorker ? 'إجمالي السلف والمسحوبات:' : 'إجمالي المدين:'}</span>
                <span>{(statement?.total_debits ?? 0).toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between">
                <span>{isWorker ? 'إجمالي الأجور المستحقة:' : 'إجمالي المسدد:'}</span>
                <span>{(statement?.total_credits ?? 0).toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-black">
                <span>
                  {isWorker
                    ? (statement?.closing_balance ?? 0) >= 0
                      ? 'صافي المستحق للفني (له):'
                      : 'صافي السلف المتجاوزة (عليه):'
                    : 'الرصيد الختامي المستحق:'}
                </span>
                <span>{Math.abs(statement?.closing_balance ?? 0).toLocaleString()} ر.ي</span>
              </div>
            </div>
          </>
        )}

        <div className="text-center text-[9px] pt-4 mt-2 border-t border-black">
          <div>طبع بتاريخ: {new Date().toLocaleDateString('ar-YE')}</div>
        </div>
      </div>

      {/* 2. Formal A4 Print Layout (Exact Mirror of Classic Vector PDF) */}
      <div
        className={`hidden print:${
          printMode === 'a4' ? 'block' : 'hidden'
        } text-black bg-white p-4 font-sans w-full max-w-[210mm] mx-auto`}
      >
        <div className="border-[2.5px] border-black p-1 bg-white">
          <div className="border border-black p-5 flex flex-col justify-between min-h-[265mm]">
            <div>
              <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
                <div>
                  <h1 className="text-2xl font-black text-black">{settings.shopName}</h1>
                  <p className="text-xs text-gray-700 mt-1">
                    {settings.shopAddress} &bull; هاتف: {settings.shopPhone}
                  </p>
                  {settings.taxNumber && <p className="text-xs text-gray-600">سجل تجاري: {settings.taxNumber}</p>}
                </div>
                <div className="text-left">
                  <div className="text-base font-black border-2 border-black px-4 py-1.5 rounded">{roleTitle}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')}
                  </div>
                </div>
              </div>

              {isVoucherMode ? (
                <>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded bg-gray-50 border border-gray-400 mb-4 text-xs">
                    <div>
                      <span className="text-gray-600">نوع الحركة:</span>{' '}
                      <span className="font-black text-black">
                        {partyType === 'receipt' ? 'سندات قبض نقدية وإيرادات' : 'سندات صرف ومصروفات نقدية'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">الفترة المالية:</span>{' '}
                      <span className="font-bold text-black">
                        من {statement?.start_date || 'البداية'} إلى {statement?.end_date || 'الآن'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">عدد السندات:</span>{' '}
                      <span className="font-mono font-bold text-black">{statement?.vouchers_count || 0} سند</span>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        {partyType === 'payment' ? 'البند / التصنيف:' : 'الحساب:'}
                      </span>{' '}
                      <span className="font-bold text-black">
                        {partyType === 'payment' && expenseCategoryFilter !== 'all'
                          ? expenseCategoryFilter
                          : 'كافة البنود والحسابات'}
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-right border-collapse mb-4 border border-black">
                    <thead>
                      <tr className="bg-gray-200 border-b-2 border-black">
                        <th className="p-2 border-l border-gray-400 text-center w-8">م</th>
                        <th className="p-2 border-l border-gray-400 w-24">التاريخ والوقت</th>
                        <th className="p-2 border-l border-gray-400 w-28">رقم السند</th>
                        <th className="p-2 border-l border-gray-400">
                          {partyType === 'receipt' ? 'المقبوض منه' : 'المستلم / المدفوع له'}
                        </th>
                        {partyType === 'payment' && (
                          <th className="p-2 border-l border-gray-400 w-24">بند المصروف</th>
                        )}
                        <th className="p-2 border-l border-gray-400">البيان والشرح</th>
                        <th className="p-2 border-l border-gray-400 w-20">طريقة الدفع</th>
                        <th className="p-2 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {(statement?.items || []).map((v, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border-l border-gray-400 text-center text-[10px] text-gray-600">{i + 1}</td>
                          <td className="p-2 border-l border-gray-400 font-mono text-[11px] whitespace-nowrap">
                            {(v.created_at || '').slice(0, 16).replace('T', ' ')}
                          </td>
                          <td className="p-2 border-l border-gray-400 font-mono font-bold">
                            {v.voucher_number || '---'}
                            {v.paper_bill_number && (
                              <span className="mr-1 text-[9px] bg-amber-100 border border-amber-300 px-1 rounded">
                                د: {v.paper_bill_number}
                              </span>
                            )}
                          </td>
                          <td className="p-2 border-l border-gray-400 font-bold text-black">{v.party_name || '---'}</td>
                          {partyType === 'payment' && (
                            <td className="p-2 border-l border-gray-400 text-gray-800">
                              {v.offset_account_name || 'مصروف عام'}
                            </td>
                          )}
                          <td className="p-2 border-l border-gray-400">{v.description || '---'}</td>
                          <td className="p-2 border-l border-gray-400 text-[10px]">
                            {formatPaymentMethodLabel(v.payment_method)}
                          </td>
                          <td
                            className={`p-2 font-mono font-black text-left ${
                              partyType === 'receipt' ? 'text-green-700' : 'text-red-700'
                            }`}
                          >
                            {Number(v.amount || 0).toLocaleString()} ر.ي
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded bg-gray-50 border border-gray-400 mb-4 text-xs">
                    <div>
                      <span className="text-gray-600">
                        {isWorker ? 'اسم الفني / العامل:' : partyType === 'supplier' ? 'اسم المورد:' : 'اسم الحساب / العميل:'}
                      </span>{' '}
                      <span className="font-black text-black">{statement?.party_name || '---'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">الفترة المالية:</span>{' '}
                      <span className="font-bold text-black">
                        من {statement?.start_date || 'البداية'} إلى {statement?.end_date || 'الآن'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">رقم الهاتف:</span>{' '}
                      <span className="font-mono font-bold text-black">{statement?.party_phone || '---'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">الرصيد الافتتاحي السابق:</span>{' '}
                      <span className="font-mono font-black text-black">
                        {(statement?.opening_balance ?? 0).toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-right border-collapse mb-4 border border-black">
                    <thead>
                      <tr className="bg-gray-200 border-b-2 border-black">
                        <th className="p-2 border-l border-gray-400 text-center w-8">م</th>
                        <th className="p-2 border-l border-gray-400 w-20">التاريخ</th>
                        <th className="p-2 border-l border-gray-400 w-28">رقم السند/المرجع</th>
                        <th className="p-2 border-l border-gray-400">البيان</th>
                        <th className="p-2 border-l border-gray-400 text-left text-red-700">
                          {isWorker ? 'سلف ومسحوبات (-)' : 'مدين (عليه)'}
                        </th>
                        <th className="p-2 border-l border-gray-400 text-left text-green-700">
                          {isWorker ? 'أجور مستحقة (+)' : 'دائن (له)'}
                        </th>
                        <th className="p-2 text-left">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {(statement?.statement_lines || []).map((l, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border-l border-gray-400 text-center text-[10px] text-gray-600">{i + 1}</td>
                          <td className="p-2 border-l border-gray-400 font-mono text-[11px]">{l.entry_date || '---'}</td>
                          <td className="p-2 border-l border-gray-400 font-mono font-bold">
                            {l.ref_number || l.entry_number || '---'}
                            {l.paper_bill_number && (
                              <span className="mr-1 text-[9px] bg-amber-100 border border-amber-300 px-1 rounded">
                                د: {l.paper_bill_number}
                              </span>
                            )}
                          </td>
                          <td className="p-2 border-l border-gray-400">{l.description || '---'}</td>
                          <td className="p-2 border-l border-gray-400 font-mono font-bold text-red-700 text-left">
                            {Number(l.debit) > 0 ? Number(l.debit).toLocaleString() : '-'}
                          </td>
                          <td className="p-2 border-l border-gray-400 font-mono font-bold text-green-700 text-left">
                            {Number(l.credit) > 0 ? Number(l.credit).toLocaleString() : '-'}
                          </td>
                          <td className="p-2 font-mono font-black text-left">
                            {Math.abs(l.running_balance ?? 0).toLocaleString()} ر.ي{' '}
                            {isWorker ? ((l.running_balance ?? 0) >= 0 ? '(له)' : '(عليه)') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center p-3 rounded border border-black bg-gray-50 mb-6 text-xs">
                {isVoucherMode ? (
                  <>
                    <div className="font-bold text-gray-700">
                      <span>إجمالي عدد السندات: </span>
                      <span className="font-mono text-black font-black">{statement?.vouchers_count || 0} سند</span>
                    </div>

                    <div className="border-2 border-black bg-white px-4 py-2 text-left">
                      <div className="font-bold text-gray-700">
                        {partyType === 'receipt' ? 'إجمالي المقبوضات:' : 'إجمالي المصروفات:'}
                      </div>
                      <div
                        className={`text-base font-black font-mono ${
                          partyType === 'receipt' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {(statement?.total_amount ?? 0).toLocaleString()} ر.ي
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div>
                        <span>إجمالي المدين: </span>
                        <span className="font-mono font-bold text-red-700">
                          +{(statement?.total_debits ?? 0).toLocaleString()} ر.ي
                        </span>
                      </div>
                      <div>
                        <span>إجمالي الدائن: </span>
                        <span className="font-mono font-bold text-green-700">
                          -{(statement?.total_credits ?? 0).toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>

                    <div className="border-2 border-black bg-white px-4 py-2 text-left">
                      <div className="font-bold text-gray-700">
                        {isWorker ? 'صافي المستحق للفني:' : 'الرصيد الختامي المستحق:'}
                      </div>
                      <div className="text-base font-black font-mono">
                        {Math.abs(statement?.closing_balance ?? 0).toLocaleString()} ر.ي{' '}
                        {isWorker ? ((statement?.closing_balance ?? 0) >= 0 ? '(له)' : '(عليه)') : ''}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between text-center text-xs border-t border-dashed border-gray-400 pt-4">
                <div className="w-40 border-t border-gray-500 pt-1">
                  <div>{isVoucherMode ? 'توقيع أمين الصندوق' : 'توقيع صاحب الحساب'}</div>
                </div>
                <div className="w-40 border-t border-gray-500 pt-1">
                  <div>توقيع المحاسب والختم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
