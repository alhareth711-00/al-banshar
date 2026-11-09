import { getShopSettings } from './settings';
import { tafqeet } from './tafqeet';

/**
 * Generate clean, self-contained HTML for an 80mm (or 58mm) Thermal Voucher (Receipt or Payment)
 * Incorporates:
 * - Single-line compact header (Address on right, Phone on left)
 * - Complete financial details (party, tafqeet, amount, description, items, balances)
 * - Zero signatures (removed per user request to save paper)
 * - Clean footer (no system branding, only customer appreciation)
 */
export function generateThermalVoucherHtml(voucher, customSettings = null) {
  if (!voucher) return '';

  const settings = customSettings || getShopSettings();
  const is58mm = settings.receiptPaperSize === '58mm';
  const widthCss = is58mm ? '48mm' : '72mm';
  const fontSizeCss = is58mm ? '12px' : '14px';

  const isReceipt = voucher.voucher_type === 'receipt';
  const isVoided = voucher.status === 'voided';
  const amount = Number(voucher.amount || 0);
  const tafqeetText = tafqeet(amount);

  const getPaymentMethodName = (method) => {
    switch (method) {
      case 'kuraimi':
        return 'حساب بنك الكريمي (1102)';
      case 'jeeb':
        return 'محفظة جيب الإلكترونية (1103)';
      case 'jawali':
        return 'محفظة جوالي الإلكترونية (1104)';
      case 'onecash':
        return 'محفظة ون كاش (1105)';
      case 'bank':
        return 'تحويل بنكي رسمي';
      case 'cash':
      default:
        return 'نقداً من الصندوق (1101)';
    }
  };

  const getPartyLabel = () => {
    if (isReceipt) {
      return voucher.party_type === 'customer' ? 'المستلم منه (العميل)' : 'المستلم منه';
    }
    switch (voucher.party_type) {
      case 'supplier':
        return 'يصرف للمورد';
      case 'worker':
        return 'يصرف للفني / العامل';
      case 'owner':
        return 'مسحوبات جاري المالك';
      case 'expense':
        return 'المصروف في جهة';
      default:
        return 'يصرف إلى';
    }
  };

  const formattedDate = voucher.created_at
    ? new Date(voucher.created_at).toLocaleString('ar-YE', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('ar-YE');

  const itemsRows = (voucher.items && voucher.items.length > 0)
    ? voucher.items.map((it, idx) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 3px 0; text-align: right;">${it.category_name || it.description || '-'}</td>
          <td style="padding: 3px 0; text-align: left; font-weight: bold; font-family: monospace;">${Number(it.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('')
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${isReceipt ? 'سند قبض' : 'سند صرف'} #${voucher.voucher_number || ''}</title>
  <style>
    @page {
      margin: 0 !important;
      size: ${is58mm ? '48mm 297mm' : '72mm 297mm'};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', 'Segoe UI Arabic', 'Tajawal', Tahoma, sans-serif;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 0 8px 0 !important;
      font-size: ${fontSizeCss};
      line-height: 1.35;
      color: #000;
      background: #fff;
      direction: rtl;
    }
    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2px dashed #000;
      margin-bottom: 5px;
    }
    .shop-name {
      font-size: ${is58mm ? '15px' : '20px'};
      font-weight: 900;
      margin-bottom: 3px;
    }
    .contact-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${is58mm ? '10.5px' : '12.5px'};
      font-weight: bold;
      margin-top: 2px;
      padding: 0 2px;
    }
    .badge-box {
      margin-top: 6px;
      display: inline-block;
      padding: 3px 10px;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: ${is58mm ? '12px' : '14px'};
      border-radius: 4px;
    }
    .void-alert {
      margin-top: 4px;
      color: #000;
      font-weight: 900;
      border: 2px solid #000;
      padding: 3px;
      font-size: 13px;
    }
    .meta-box {
      border-bottom: 1.5px dashed #000;
      padding-bottom: 5px;
      margin-bottom: 5px;
      font-size: ${is58mm ? '11px' : '13.5px'};
      font-weight: bold;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-top: 3px;
    }
    .party-box {
      margin-bottom: 6px;
    }
    .party-label {
      font-size: 11.5px;
      color: #111;
      font-weight: bold;
    }
    .party-name {
      font-weight: 900;
      font-size: ${is58mm ? '12.5px' : '15px'};
    }
    .amount-card {
      background: #fff;
      border: 2px solid #000;
      border-radius: 4px;
      padding: 6px;
      text-align: center;
      margin: 6px 0;
    }
    .amount-val {
      font-size: ${is58mm ? '16px' : '21px'};
      font-weight: 900;
      font-family: monospace;
      display: block;
    }
    .tafqeet-val {
      font-size: ${is58mm ? '11px' : '13px'};
      font-weight: 900;
      display: block;
      margin-top: 2px;
    }
    .desc-box {
      margin: 6px 0;
      padding-bottom: 6px;
      border-bottom: 1.5px dashed #000;
    }
    .desc-text {
      font-size: ${is58mm ? '11px' : '13.5px'};
      font-weight: bold;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
      font-size: 13px;
    }
    .balance-box {
      display: flex;
      justify-content: space-between;
      background: #f8f8f8;
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 5px 6px;
      margin-top: 5px;
      font-size: 12.5px;
      font-weight: 900;
    }
    .footer {
      text-align: center;
      padding-top: 6px;
      margin-top: 6px;
      border-top: 1px dashed #000;
      font-weight: bold;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${settings.shopName}</div>
    <!-- Compact single line for Address (Right) & Phone (Left) to save paper -->
    <div class="contact-line">
      <span>📍 ${settings.address || 'صنعاء'}</span>
      <span>📞 ${settings.shopPhone || ''}</span>
    </div>
    <div class="badge-box">
      ${isReceipt ? 'سند قبض نقدية (رسمي)' : 'سند صرف نقدية (رسمي)'}
    </div>
    ${isVoided ? '<div class="void-alert">*** سند ملغي (VOIDED) ***</div>' : ''}
  </div>

  <div class="meta-box">
    <div class="meta-row">
      <span>رقم السند:</span>
      <strong style="font-family: monospace;">${voucher.voucher_number || '-'}</strong>
    </div>
    <div class="meta-row">
      <span>التاريخ والوقت:</span>
      <span>${formattedDate}</span>
    </div>
    ${
      voucher.paper_bill_number
        ? `<div class="meta-row">
            <span>المرجع اليدوي:</span>
            <strong>${voucher.paper_bill_number}</strong>
          </div>`
        : ''
    }
    <div class="meta-row">
      <span>طريقة الدفع:</span>
      <strong>${getPaymentMethodName(voucher.payment_method)}</strong>
    </div>
  </div>

  <div class="party-box">
    <div class="party-label">${getPartyLabel()}:</div>
    <div class="party-name">${voucher.party_name || '-'}</div>
  </div>

  <div class="amount-card">
    <span style="font-size: 10px;">المبلغ الصافي:</span>
    <span class="amount-val">${amount.toLocaleString()} ريال يمني</span>
    <span class="tafqeet-val">فقط ${tafqeetText}</span>
  </div>

  <div class="desc-box">
    <div class="party-label">البيان والغرض:</div>
    <div class="desc-text">${voucher.description || '-'}</div>
  </div>

  ${
    itemsRows
      ? `
    <div style="margin: 4px 0;">
      <div style="font-size: 10px; font-weight: bold;">تفاصيل البنود:</div>
      <table>
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: right; padding: 2px 0;">البند</th>
            <th style="text-align: left; padding: 2px 0;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>`
      : ''
  }

  ${
    Number(voucher.prev_balance) > 0 || Number(voucher.new_balance) > 0
      ? `
    <div class="balance-box">
      <span>السابق: ${Number(voucher.prev_balance || 0).toLocaleString()}</span>
      <span>المتبقي: ${Number(voucher.new_balance || 0).toLocaleString()} ر.ي</span>
    </div>`
      : ''
  }

  <!-- (Signatures completely removed per user request) -->

  <div class="footer">
    <p>شكراً لتعاملكم معنا 🙏</p>
  </div>
</body>
</html>`;
}

/**
 * Print thermal voucher directly without UI distortion or page cutting
 */
export async function printThermalVoucherSilently(voucher, customSettings = null) {
  try {
    if (!voucher) return { success: false, reason: 'no_voucher' };

    const settings = customSettings || getShopSettings();
    const html = generateThermalVoucherHtml(voucher, settings);

    // 1. Electron Desktop Native Silent Print
    if (window.electronAPI?.printSilent) {
      const res = await window.electronAPI.printSilent(html);
      return res || { success: true };
    }

    // 2. Web Browser Fallback (Persistent off-screen iframe compatible with Kiosk Print)
    return new Promise((resolve) => {
      try {
        let iframe = document.getElementById('thermal-voucher-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'thermal-voucher-iframe';
          iframe.style.position = 'fixed';
          iframe.style.top = '0';
          iframe.style.left = '-9999px';
          iframe.style.width = '80mm';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          iframe.style.opacity = '0';
          iframe.style.pointerEvents = 'none';
          document.body.appendChild(iframe);
        }

        iframe.contentDocument.open();
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();

        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            console.log('[Browser Voucher Print notice]:', e);
          }
          resolve({ success: true });
        }, 150);
      } catch (err) {
        console.log('[Browser Voucher Print fallback error]:', err);
        resolve({ success: false, error: err.message });
      }
    });
  } catch (err) {
    console.log('[Silent Voucher Print handled safely]:', err);
    return { success: false, error: err.message };
  }
}
