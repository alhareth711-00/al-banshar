import { getShopSettings } from './settings.js';

/**
 * Generate clean, self-contained HTML for an 80mm or 58mm Thermal Receipt
 */
export function generateThermalReceiptHtml(invoice, customSettings = null) {
  const settings = customSettings || getShopSettings();
  const is58mm = settings.receiptPaperSize === '58mm';
  const widthCss = is58mm ? '48mm' : '72mm';
  const fontSizeCss = is58mm ? '12px' : '14.5px';

  const items = invoice.items || [];
  const paymentMethodLabel =
    {
      cash: 'نقداً (كاش)',
      jeeb: 'محفظة جيب',
      jawali: 'محفظة جوالي',
      kuraimi: 'حساب الكريمي',
      onecash: 'ون كاش',
      credit: 'آجل / جزئي',
      split: 'مجزأ (كاش + إلكتروني)',
    }[invoice.payment_method] || invoice.payment_method || 'نقداً (كاش)';

  const hasOdometer =
    Number(invoice.current_odometer) > 0 || Number(invoice.next_odometer) > 0;

  const formattedDate =
    invoice.created_at ||
    new Date().toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const itemsRows = items
    .map(
      (it) => `
      <tr style="border-bottom: 1px dashed #555;">
        <td style="padding: 6px 2px; text-align: right; font-weight: bold; font-size: ${is58mm ? '12px' : '14px'}; line-height: 1.25;">${it.description}</td>
        <td style="padding: 6px 2px; text-align: center; font-weight: 900; font-size: ${is58mm ? '12px' : '14px'};">${it.qty}</td>
        <td style="padding: 6px 2px; text-align: left; font-weight: 900; font-size: ${is58mm ? '12px' : '14px'};">${Number(it.qty * it.unit_price).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8">
  <title>فاتورة #${invoice.invoice_number}</title>
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
    html, body {
      width: ${widthCss} !important;
      max-width: ${widthCss} !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      font-size: ${fontSizeCss};
      line-height: 1.35;
      color: #000;
      background: #fff;
      direction: ltr !important; /* Fixed left-origin anchor prevents RTL wide-spooler shifting */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: ${widthCss} !important;
      max-width: ${widthCss} !important;
      margin: 0 !important;
      padding: 4px ${is58mm ? '1.5mm' : '3mm'} 16px ${is58mm ? '1.5mm' : '3mm'} !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right;
    }
    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2px solid #000;
      margin-bottom: 6px;
    }
    .shop-name {
      font-size: ${is58mm ? '16px' : '21px'};
      font-weight: 900;
      line-height: 1.25;
      margin-bottom: 3px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 3px;
      font-size: ${is58mm ? '12px' : '14px'};
      font-weight: bold;
      gap: 4px;
      word-break: break-word;
    }
    .meta-row > span {
      flex-shrink: 0;
    }
    .meta-section {
      padding: 4px 0 6px 0;
      border-bottom: 1.5px solid #000;
    }
    .odo-box {
      margin: 5px 0;
      padding: 5px;
      background: #f4f4f4;
      border: 1px solid #000;
      border-radius: 4px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      font-size: ${is58mm ? '11px' : '13px'};
    }
    table {
      width: 100% !important;
      table-layout: fixed;
      border-collapse: collapse;
      margin: 6px 0;
      word-break: break-word;
    }
    th {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      padding: 5px 2px;
      font-weight: 900;
      font-size: ${is58mm ? '12px' : '14.5px'};
      word-break: break-word;
    }
    td {
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .totals-section {
      padding: 6px 0;
      border-top: 1.5px solid #000;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 3px;
      font-size: ${is58mm ? '12px' : '14px'};
    }
    .grand-total {
      font-size: ${is58mm ? '16px' : '20px'};
      font-weight: 900;
      border: 2px solid #000;
      padding: 6px 4px;
      margin: 6px 0;
    }
    .footer {
      text-align: center;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1.5px solid #000;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="shop-name">${settings.shopName}</div>
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 2px;">${settings.address || ''}</div>
      <div style="font-size: 13.5px; font-weight: 900;">هاتف: ${settings.shopPhone || ''}</div>
    </div>

  <div class="meta-section">
    <div class="meta-row">
      <span>رقم الفاتورة:</span>
      <strong dir="ltr" style="font-family: monospace; font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900;">#${invoice.invoice_number}</strong>
    </div>
    <div class="meta-row">
      <span>التاريخ والوقت:</span>
      <span style="font-weight: bold;">${formattedDate}</span>
    </div>
    <div class="meta-row">
      <span>العميل:</span>
      <strong style="font-size: ${is58mm ? '12px' : '14px'};">${invoice.customer_name || 'عميل عام (نقدي)'}</strong>
    </div>
    <div class="meta-row">
      <span>السيارة واللوحة:</span>
      <strong style="font-size: ${is58mm ? '12px' : '14px'};">${invoice.plate_number || 'بدون لوحة'}${invoice.car_make_model ? ` • ${invoice.car_make_model}` : ''}</strong>
    </div>
  </div>

  ${
    hasOdometer
      ? `
  <div class="odo-box">
    <div>
      <div style="color: #444; font-size: 10px;">العداد الحالي:</div>
      <strong style="font-size: 12px;">${Number(invoice.current_odometer || 0).toLocaleString()} كم</strong>
    </div>
    <div>
      <div style="color: #444; font-size: 10px;">الغيار القادم:</div>
      <strong style="font-size: 12px;">${Number(invoice.next_odometer || 0).toLocaleString()} كم</strong>
    </div>
  </div>
  ${invoice.next_service_date ? `<div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 4px;">الموعد المقترح: ${invoice.next_service_date}</div>` : ''}
  `
      : ''
  }

  <table>
    <thead>
      <tr>
        <th style="text-align: right; width: 56%;">الصنف / الخدمة</th>
        <th style="text-align: center; width: 14%;">الكمية</th>
        <th style="text-align: left; width: 30%;">المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-section">
    ${
      Number(invoice.items_total || 0) > 0
        ? `
    <div class="total-row">
      <span>إجمالي الأصناف:</span>
      <span style="font-weight: 900;">${Number(invoice.items_total).toLocaleString()} ر.ي</span>
    </div>`
        : ''
    }
    ${
      Number(invoice.labor_total || 0) > 0
        ? `
    <div class="total-row">
      <span>أجور الخدمات:</span>
      <span style="font-weight: 900;">${Number(invoice.labor_total).toLocaleString()} ر.ي</span>
    </div>`
        : ''
    }
    ${
      Number(invoice.scrap_battery_deduction || 0) > 0
        ? `
    <div class="total-row" style="color: #000; font-weight: bold;">
      <span>خصم بطارية رجيع (سكراب):</span>
      <span style="font-weight: 900;">-${Number(invoice.scrap_battery_deduction).toLocaleString()} ر.ي</span>
    </div>`
        : ''
    }
    ${
      Number(invoice.discount || 0) > 0
        ? `
    <div class="total-row">
      <span>الخصم الممنوح:</span>
      <span style="font-weight: 900;">-${Number(invoice.discount).toLocaleString()} ر.ي</span>
    </div>`
        : ''
    }
    <div class="total-row grand-total">
      <span>الصافي المطلوب:</span>
      <span>${Number(invoice.net_total || 0).toLocaleString()} ر.ي</span>
    </div>
    <div class="total-row" style="margin-top: 4px; font-weight: bold;">
      <span>طريقة السداد:</span>
      <span>${paymentMethodLabel}</span>
    </div>
    ${
      Number(invoice.remaining_debt || 0) > 0
        ? `
    <div class="total-row" style="color: #000; font-weight: 900; margin-top: 3px;">
      <span>المتبقي آجل بذمة العميل:</span>
      <span>${Number(invoice.remaining_debt).toLocaleString()} ر.ي</span>
    </div>`
        : ''
    }
  </div>

  <div class="footer">
    <div style="font-family: monospace; letter-spacing: 2px; font-size: 13px; font-weight: 900; margin-bottom: 4px;">
      * ${invoice.invoice_number} *
    </div>
    <div style="font-weight: 900; font-size: 13px; margin-bottom: 2px;">شكراً لزيارتكم ويسعدنا دائماً خدمتكم</div>
    <div style="font-size: 10px; color: #444;">نظام سريع وبنشر PRO</div>
  </div>
  </div>
</body>
</html>`;
}

/**
 * Print any raw HTML content silently in the background without popups or blocking UI
 */
export async function printHtmlContentSilently(html) {
  try {
    if (!html) return { success: false, reason: 'no_content' };

    // 1. Electron Desktop Native Silent Print (Recommended)
    if (window.electronAPI?.printSilent) {
      const res = await window.electronAPI.printSilent(html);
      return res || { success: true };
    }

    // 2. Web Browser Fallback (Persistent off-screen iframe compatible with Kiosk Print)
    return new Promise((resolve) => {
      try {
        let iframe = document.getElementById('thermal-print-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'thermal-print-iframe';
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

        // Allow styling and layout to compute before printing
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (e) {
            console.log('[Browser Silent Print fallback notice]:', e);
          }
          resolve({ success: true });
        }, 250);
      } catch (err) {
        console.log('[Silent Print fallback handled safely]:', err);
        resolve({ success: false, error: err.message });
      }
    });
  } catch (err) {
    console.log('[Silent Print top-level handled safely]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Print thermal receipt silently in the background without throwing errors or blocking UI
 */
export async function printThermalReceiptSilently(invoice, customSettings = null) {
  try {
    if (!invoice) return { success: false, reason: 'no_invoice' };
    const settings = customSettings || getShopSettings();
    const html = generateThermalReceiptHtml(invoice, settings);
    return await printHtmlContentSilently(html);
  } catch (err) {
    console.log('[Silent Print top-level handled safely]:', err);
    return { success: false, error: err.message };
  }
}
