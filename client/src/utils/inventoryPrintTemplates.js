import { getShopSettings } from './settings';
import { printHtmlContentSilently } from './thermalReceiptPrinter';

/**
 * Escape HTML to prevent XSS in print templates
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate Thermal 80mm or Formal A4 HTML for Physical Stocktake (كشف الجرد الفعلي للمخزون)
 * Rules:
 * - NO Shelf Location (Removed per user request)
 * - NO SKU Code (Removed per user request: "ازالة كود الصنف")
 * - Includes: Item Name, Specs, Brand, System Stock, and Blank Box for Manual Count [ ..... ]
 */
export function generateStocktakeHtml(items, customSettings = null, layout = 'thermal') {
  const settings = customSettings || getShopSettings();
  const dateStr = new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeItems = (items || [])
    .filter((i) => i.is_active === 1 && i.item_type !== 'service' && i.category !== 'service')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (layout === 'a4') {
    const rowsHtml = activeItems
      .map(
        (item, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; text-align: right;">
        <td style="padding: 8px; text-align: center; font-mono; width: 35px;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: bold;">
          ${escapeHtml(item.name)}
          <span style="font-size: 11px; color: #555;">(${escapeHtml(item.brand)} ${item.pack_size || item.viscosity ? `• ${escapeHtml(item.pack_size || item.viscosity)}` : ''})</span>
        </td>
        <td style="padding: 8px; text-align: center; font-family: monospace; font-weight: 900; background: #f8fafc; width: 100px;">
          ${item.stock_qty}
        </td>
        <td style="padding: 8px; text-align: center; border: 1.5px dashed #94a3b8; width: 110px;"></td>
        <td style="padding: 8px; border: 1px dashed #cbd5e1; width: 140px;"></td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف الجرد الفعلي للمخزون</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 900; }
    .sub { font-size: 12px; color: #444; margin-top: 4px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th { background: #e2e8f0; padding: 8px; border: 1.5px solid #000; font-weight: 900; text-align: right; }
    td { border: 1px solid #94a3b8; }
    .sig { display: flex; justify-content: space-around; margin-top: 35px; font-weight: bold; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(settings.shopName)}</div>
    <div class="sub">استمارة المطابقة والجرد الفعلي للمخزون - ${dateStr}</div>
    <div style="font-size: 11px; margin-top: 3px;">إجمالي الأصناف الخاضعة للجرد: ${activeItems.length} صنف</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>اسم الصنف والمواصفات والماركة</th>
        <th style="width: 100px; text-align: center;">رصيد النظام</th>
        <th style="width: 110px; text-align: center;">العدد الفعلي بالقلم</th>
        <th style="width: 140px;">ملاحظات الجرد</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="sig">
    <div>أمين المستودع: _____________________</div>
    <div>مدقق الجرد: _____________________</div>
    <div>اعتماد الإدارة: _____________________</div>
  </div>
</body>
</html>`;
  }

  // THERMAL 80MM RECEIPT LAYOUT (Default)
  const itemsHtml = activeItems
    .map(
      (item, idx) => `
    <div style="padding: 5px 0; border-bottom: 1px dashed #777;">
      <div style="font-weight: 900; font-size: 13.5px; line-height: 1.25;">
        ${idx + 1}. ${escapeHtml(item.name)}
      </div>
      <div style="font-size: 11.5px; color: #222; font-weight: bold; margin-top: 1px;">
        ${escapeHtml(item.brand)} ${item.pack_size || item.viscosity ? `• ${escapeHtml(item.pack_size || item.viscosity)}` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 13px;">
        <div>
          <span>رصيد النظام:</span>
          <strong style="font-family: monospace; font-size: 14px; margin-right: 2px;">${item.stock_qty}</strong>
        </div>
        <div style="border: 1.5px solid #000; padding: 2px 10px; min-width: 90px; text-align: center; font-weight: bold; font-size: 11.5px;">
          الفعلي: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
        </div>
      </div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف الجرد الفعلي - 80mm</title>
  <style>
    @page {
      margin: 0 !important;
      size: 80mm 297mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      direction: ltr !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 4px 2mm 6px 2mm !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right;
    }
    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2.5px solid #000;
      margin-bottom: 6px;
    }
    .shop-name {
      font-size: 20px;
      font-weight: 900;
      line-height: 1.2;
    }
    .badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border: 1.5px solid #000;
      font-weight: 900;
      font-size: 13px;
    }
    .meta {
      font-size: 12px;
      font-weight: bold;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 2px solid #000;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <div class="header">
    <div class="shop-name">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${escapeHtml(settings.address || '')}</div>
    <div class="badge">كشف الجرد الفعلي للمخزون</div>
    <div class="meta">التاريخ: ${dateStr}</div>
    <div class="meta">عدد الأصناف: ${activeItems.length} صنف</div>
  </div>

  <div>
    ${itemsHtml}
  </div>

  <div class="footer">
    <div style="display: flex; justify-content: space-around; font-weight: 900; font-size: 12px; margin-top: 8px;">
      <div>توقيع أمين المخزن: ............</div>
      <div>اعتماد الإدارة: ............</div>
    </div>
    <div style="font-size: 10px; color: #555; margin-top: 6px; font-mono;">
      نظام سريع وبنشر PRO &bull; ${new Date().toLocaleTimeString('ar-YE')}
    </div>
  </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Thermal 80mm or Formal A4 HTML for Consignment Settlement Audit (كشف تصفية بضاعة الأمانات)
 */
export function generateConsignmentAuditHtml(settlementData, customSettings = null, layout = 'thermal') {
  const settings = customSettings || getShopSettings();
  const dateStr = new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const list = settlementData || [];
  let grandTotalStock = 0;
  let grandTotalSold = 0;
  let grandTotalCostDue = 0;
  let grandTotalPaid = 0;
  let grandCurrentBalance = 0;

  list.forEach((s) => {
    grandTotalStock += Number(s.total_remaining_stock) || 0;
    grandTotalSold += Number(s.total_sold_units) || 0;
    grandTotalCostDue += Number(s.total_cost_due) || 0;
    grandTotalPaid += Number(s.total_paid_vouchers) || 0;
    grandCurrentBalance += Number(s.current_balance_due) || 0;
  });

  if (layout === 'a4') {
    const suppliersTables = list
      .map(
        (s) => `
      <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1.5px solid #000; padding: 10px; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
          <h2 style="font-size: 16px; font-weight: 900; margin: 0;">🏢 المورد: ${escapeHtml(s.supplier_name)}</h2>
          <div style="font-weight: 900; font-size: 13px;">
            المتبقي بذمة المحل: <span style="color: #000; font-family: monospace;">${Number(s.current_balance_due || 0).toLocaleString()} ر.ي</span>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #000;">
              <th style="padding: 6px; text-align: right;">الصنف</th>
              <th style="padding: 6px; text-align: center;">المتبقي بالرف</th>
              <th style="padding: 6px; text-align: center;">المباع</th>
              <th style="padding: 6px; text-align: left;">سعر التوريد</th>
              <th style="padding: 6px; text-align: left;">إجمالي الاستحقاق</th>
            </tr>
          </thead>
          <tbody>
            ${(s.items || [])
              .map(
                (it) => `
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 6px; font-weight: bold;">${escapeHtml(it.name)} (${escapeHtml(it.brand)})</td>
                <td style="padding: 6px; text-align: center; font-family: monospace; font-weight: bold;">${it.stock_qty}</td>
                <td style="padding: 6px; text-align: center; font-family: monospace; font-weight: bold;">${it.total_sold}</td>
                <td style="padding: 6px; text-align: left; font-family: monospace;">${Number(it.cost_price).toLocaleString()}</td>
                <td style="padding: 6px; text-align: left; font-family: monospace; font-weight: 900;">${Number(it.total_cost_due).toLocaleString()} ر.ي</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
      )
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف تصفية بضاعة الأمانات</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 900; }
    .kpis { display: flex; justify-content: space-around; border: 2px solid #000; padding: 10px; margin-bottom: 15px; border-radius: 6px; font-weight: bold; }
    .sig { display: flex; justify-content: space-around; margin-top: 35px; font-weight: bold; font-size: 12px; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">كشف تصفية ومطابقة بضاعة الأمانات والتصريف - ${dateStr}</div>
  </div>
  <div class="kpis">
    <div>إجمالي المتبقي: ${grandTotalStock} عبوة</div>
    <div>إجمالي المباع: ${grandTotalSold} عبوة</div>
    <div>إجمالي الاستحقاق: ${grandTotalCostDue.toLocaleString()} ر.ي</div>
    <div>المسدد: ${grandTotalPaid.toLocaleString()} ر.ي</div>
    <div style="font-size: 14px; font-weight: 900;">الصافي المتبقي: ${grandCurrentBalance.toLocaleString()} ر.ي</div>
  </div>
  ${suppliersTables}
  <div class="sig">
    <div>توقيع واستلام مندوب المورد: ___________________</div>
    <div>توقيع أمين المستودع: ___________________</div>
    <div>اعتماد إدارة المركز: ___________________</div>
  </div>
</body>
</html>`;
  }

  // THERMAL 80MM RECEIPT LAYOUT (Default)
  const suppliersHtml = list
    .map(
      (s) => `
    <div style="border-bottom: 1.5px solid #000; padding: 6px 0;">
      <div style="font-weight: 900; font-size: 14px; margin-bottom: 2px;">
        🏢 ${escapeHtml(s.supplier_name)}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
        <span>المتبقي بالرفوف:</span>
        <span style="font-family: monospace;">${s.total_remaining_stock || 0} عبوة</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
        <span>إجمالي المباع:</span>
        <span style="font-family: monospace;">${s.total_sold_units || 0} عبوة</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
        <span>قيمة الاستحقاق:</span>
        <span style="font-family: monospace;">${Number(s.total_cost_due || 0).toLocaleString()} ر.ي</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
        <span>المسدد بسندات:</span>
        <span style="font-family: monospace;">${Number(s.total_paid_vouchers || 0).toLocaleString()} ر.ي</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 900; border-top: 1px dashed #555; padding-top: 3px; margin-top: 3px;">
        <span>الصافي المستحق:</span>
        <span style="font-family: monospace;">${Number(s.current_balance_due || 0).toLocaleString()} ر.ي</span>
      </div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف بضاعة الأمانات - 80mm</title>
  <style>
    @page {
      margin: 0 !important;
      size: 80mm 297mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      direction: ltr !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 4px 2mm 6px 2mm !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right;
    }
    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 2.5px solid #000;
      margin-bottom: 6px;
    }
    .shop-name {
      font-size: 20px;
      font-weight: 900;
      line-height: 1.2;
    }
    .badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border: 1.5px solid #000;
      font-weight: 900;
      font-size: 13px;
    }
    .grand-box {
      border: 2px solid #000;
      padding: 6px;
      margin: 8px 0;
      font-weight: 900;
      text-align: center;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 2px solid #000;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <div class="header">
    <div class="shop-name">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${escapeHtml(settings.address || '')}</div>
    <div class="badge">كشف تصفية بضاعة الأمانات</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 3px;">التاريخ: ${dateStr}</div>
  </div>

  <div class="grand-box">
    <div>إجمالي الرصيد المتبقي لكافة الموردين:</div>
    <div style="font-size: 18px; font-family: monospace; margin-top: 3px;">
      ${grandCurrentBalance.toLocaleString()} ر.ي
    </div>
  </div>

  <div>
    ${suppliersHtml}
  </div>

  <div class="footer">
    <div style="display: flex; justify-content: space-around; font-weight: 900; font-size: 12px; margin-top: 8px;">
      <div>توقيع المندوب: ............</div>
      <div>اعتماد الإدارة: ............</div>
    </div>
    <div style="font-size: 10px; color: #555; margin-top: 6px; font-mono;">
      نظام سريع وبنشر PRO &bull; ${new Date().toLocaleTimeString('ar-YE')}
    </div>
  </div>
  </div>
</body>
</html>`;
}

/**
 * Print Stocktake Sheet Silently via Persistent Iframe
 */
export async function printStocktakeSilently(items, customSettings = null, layout = 'thermal') {
  const html = generateStocktakeHtml(items, customSettings, layout);
  return await printHtmlContentSilently(html);
}

/**
 * Print Consignment Audit Sheet Silently via Persistent Iframe
 */
export async function printConsignmentAuditSilently(settlementData, customSettings = null, layout = 'thermal') {
  const html = generateConsignmentAuditHtml(settlementData, customSettings, layout);
  return await printHtmlContentSilently(html);
}

/**
 * Pure JavaScript Code 128 Barcode Pattern Generator (Subset B)
 */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export function generateCode128SvgString(text) {
  if (!text) text = 'ITEM-001';
  const startCode = 104;
  let checksum = startCode;
  const patternCodes = [CODE128_PATTERNS[startCode]];

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    const safeCode = charCode >= 0 && charCode <= 94 ? charCode : 0;
    patternCodes.push(CODE128_PATTERNS[safeCode]);
    checksum += safeCode * (i + 1);
  }

  const checkCode = checksum % 103;
  patternCodes.push(CODE128_PATTERNS[checkCode]);
  patternCodes.push(CODE128_PATTERNS[106]);

  const patternString = patternCodes.join('');
  let x = 0;
  let rects = '';

  for (let i = 0; i < patternString.length; i++) {
    const width = parseInt(patternString[i], 10) * 1.8;
    const isBar = i % 2 === 0;
    if (isBar) {
      rects += `<rect x="${x}" y="0" width="${width}" height="42" fill="#000000" />`;
    }
    x += width;
  }

  return `<svg viewBox="0 0 ${x} 42" style="width: 100%; height: 38px;" preserveAspectRatio="none">${rects}</svg>`;
}

/**
 * Generate Barcode Labels HTML (No Shelf Location, pure thermal high contrast)
 */
export function generateBarcodeLabelsHtml(item, copies = 1, labelSize = '80mm', customSettings = null) {
  const settings = customSettings || getShopSettings();
  const barcodeValue = item.barcode || item.sku || `ITEM-${item.id}`;
  const barcodeSvg = generateCode128SvgString(barcodeValue);
  const count = Math.max(1, Math.min(copies, 100));

  const specs = [item.brand, item.viscosity, item.pack_size, item.tire_battery_spec]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  const labelItemHtml = `
    <div class="label-card">
      <div class="label-head">
        <span class="shop">${escapeHtml(settings.shopName)}</span>
        <span class="brand">${escapeHtml(item.brand || '')}</span>
      </div>
      <div class="label-body">
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${specs ? `<div class="item-specs">${specs}</div>` : ''}
        <div class="barcode-box">${barcodeSvg}</div>
      </div>
      <div class="label-foot">
        <span class="code">${escapeHtml(barcodeValue)}</span>
        <span class="price">${Number(item.sell_price || 0).toLocaleString()} ر.ي</span>
      </div>
    </div>
  `;

  let labelsListHtml = '';
  for (let i = 0; i < count; i++) {
    labelsListHtml += labelItemHtml;
  }

  const isSheet = labelSize === 'sheet';
  const isDedicatedLabel = labelSize === '50x25';
  const labelRollWidth = isDedicatedLabel ? '50mm' : '80mm';

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>ملصقات باركود - ${escapeHtml(item.name)}</title>
  <style>
    @page {
      margin: 0 !important;
      size: ${isSheet ? 'A4 portrait' : isDedicatedLabel ? '50mm 25mm' : '80mm 297mm'};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      color: #000;
      direction: ${isSheet ? 'rtl' : 'ltr !important'};
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      margin: 0 !important;
      padding: ${isSheet ? '10mm' : '0'} !important;
      width: ${isSheet ? '100%' : labelRollWidth} !important;
      max-width: ${isSheet ? '100%' : labelRollWidth} !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      width: ${isSheet ? '100%' : labelRollWidth} !important;
      max-width: ${isSheet ? '100%' : labelRollWidth} !important;
      direction: rtl !important;
      padding: ${isSheet ? '0' : '2mm 1mm'} !important;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: ${isSheet ? '6px' : isDedicatedLabel ? '0' : '8px'};
    }
    .label-card {
      width: ${isSheet ? '65mm' : isDedicatedLabel ? '48mm' : '100%'};
      min-height: ${isDedicatedLabel ? '24mm' : 'auto'};
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 4px 6px;
      page-break-inside: avoid;
      display: flex;
      flex-col: column;
      justify-content: space-between;
      margin-bottom: ${isDedicatedLabel ? '0' : '4px'};
      background: #fff;
    }
    .label-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      font-size: 11px;
      font-weight: 900;
    }
    .label-body {
      text-align: center;
      padding: 3px 0;
    }
    .item-name {
      font-size: 13px;
      font-weight: 900;
      line-height: 1.2;
    }
    .item-specs {
      font-size: 10.5px;
      color: #222;
      font-weight: bold;
      margin-top: 1px;
    }
    .barcode-box {
      margin-top: 3px;
      padding: 0 4px;
    }
    .label-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #000;
      padding-top: 2px;
      font-size: 12px;
      font-weight: 900;
    }
    .label-foot .code {
      font-family: monospace;
      font-size: 11px;
    }
    .label-foot .price {
      font-size: 14px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="container">
    ${labelsListHtml}
  </div>
</body>
</html>`;
}

export async function printBarcodeLabelsSilently(item, copies = 1, labelSize = '80mm', customSettings = null) {
  const html = generateBarcodeLabelsHtml(item, copies, labelSize, customSettings);
  return await printHtmlContentSilently(html);
}

/**
 * Generate Reorder / Purchase Suggestion Sheet HTML (NO SKU column per user rule)
 */
export function generateReorderSheetHtml(reorderData, customSettings = null, layout = 'thermal') {
  const settings = customSettings || getShopSettings();
  const dateStr = reorderData?.date || new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const items = reorderData?.items || [];
  const reqNum = reorderData?.requisition_number || 'PO-REQ';

  if (layout === 'a4') {
    const rowsHtml = items
      .map(
        (item, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; text-align: right;">
        <td style="padding: 7px; text-align: center; font-mono; width: 35px;">${idx + 1}</td>
        <td style="padding: 7px; font-weight: bold;">
          ${escapeHtml(item.name)}
          ${item.pack_size ? `<span style="font-size: 11px; color: #555;">(${escapeHtml(item.pack_size)})</span>` : ''}
        </td>
        <td style="padding: 7px;">${escapeHtml(item.brand)} ${item.viscosity ? `• ${escapeHtml(item.viscosity)}` : ''}</td>
        <td style="padding: 7px; text-align: center; font-family: monospace; color: #b91c1c; font-weight: bold;">${item.current_stock}</td>
        <td style="padding: 7px; text-align: center; font-family: monospace;">${item.min_stock_alert}</td>
        <td style="padding: 7px; text-align: center; font-family: monospace; font-weight: 900; background: #f0fdf4; font-size: 13px;">${item.suggested_qty}</td>
        <td style="padding: 7px; text-align: left; font-family: monospace;">${Number(item.unit_cost || 0).toLocaleString()}</td>
        <td style="padding: 7px; text-align: left; font-family: monospace; font-weight: 900;">${Number(item.estimated_cost || 0).toLocaleString()} ر.ي</td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>طلب شراء وتوريد نواقص - ${escapeHtml(reqNum)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 900; }
    .kpis { display: flex; justify-content: space-around; border: 2px solid #000; padding: 10px; margin-bottom: 15px; border-radius: 6px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #e2e8f0; padding: 7px; border: 1.5px solid #000; font-weight: 900; text-align: right; }
    td { border: 1px solid #94a3b8; }
    .sig { display: flex; justify-content: space-around; margin-top: 35px; font-weight: bold; font-size: 12px; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 13px; font-weight: bold; margin-top: 3px;">كشف طلب وتوريد نواقص بضاعة - رقم: ${escapeHtml(reqNum)}</div>
    <div style="font-size: 11px; color: #444; margin-top: 3px;">التاريخ: ${dateStr}</div>
  </div>
  <div class="kpis">
    <div>عدد الأصناف الناقصة: ${reorderData?.total_items_count || items.length} صنف</div>
    <div>إجمالي الكميات المطلوبة: ${reorderData?.total_units_to_order || 0} عبوة/قطعة</div>
    <div>الميزانية التقديرية: ${(reorderData?.total_estimated_cost || 0).toLocaleString()} ر.ي</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>الصنف المطلوب ومواصفاته</th>
        <th>الماركة واللزوجة</th>
        <th style="width: 75px; text-align: center;">الرصيد الحالي</th>
        <th style="width: 65px; text-align: center;">حد الأمان</th>
        <th style="width: 90px; text-align: center;">الكمية المطلوبة</th>
        <th style="width: 80px; text-align: left;">سعر الوحدة</th>
        <th style="width: 95px; text-align: left;">إجمالي التكلفة</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="sig">
    <div>مُعد الطلب (أمين المستودع): _______________</div>
    <div>مسؤول المشتريات: _______________</div>
    <div>اعتماد الإدارة: _______________</div>
  </div>
</body>
</html>`;
  }

  // THERMAL 80MM RECEIPT LAYOUT
  const itemsHtml = items
    .map(
      (item, idx) => `
    <div style="padding: 5px 0; border-bottom: 1px dashed #777;">
      <div style="font-weight: 900; font-size: 13.5px; line-height: 1.25;">
        ${idx + 1}. ${escapeHtml(item.name)}
      </div>
      <div style="font-size: 11.5px; color: #222; font-weight: bold; margin-top: 1px;">
        ${escapeHtml(item.brand)} ${item.viscosity ? `• ${escapeHtml(item.viscosity)}` : ''} ${item.pack_size ? `• ${escapeHtml(item.pack_size)}` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 12.5px;">
        <div>
          <span>المتوفر:</span> <strong style="font-family: monospace;">${item.current_stock}</strong>
        </div>
        <div style="border: 1.5px solid #000; padding: 2px 8px; font-weight: 900; font-size: 13px; background: #fff;">
          المطلوب: ${item.suggested_qty} عبوة
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-top: 2px; font-family: monospace;">
        <span>سعر الحبة التقديري: ${Number(item.unit_cost || 0).toLocaleString()}</span>
        <span>الإجمالي: ${Number(item.estimated_cost || 0).toLocaleString()} ر.ي</span>
      </div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف نواقص البضاعة - 80mm</title>
  <style>
    @page { margin: 0 !important; size: 80mm 297mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      direction: ltr !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 4px 2mm 6px 2mm !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right;
    }
    .header { text-align: center; padding-bottom: 6px; border-bottom: 2.5px solid #000; margin-bottom: 6px; }
    .shop-name { font-size: 20px; font-weight: 900; line-height: 1.2; }
    .badge { display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1.5px solid #000; font-weight: 900; font-size: 13px; }
    .kpi-box { border: 2px solid #000; padding: 6px; margin: 6px 0; text-align: center; font-weight: 900; }
    .footer { text-align: center; margin-top: 10px; padding-top: 6px; border-top: 2px solid #000; font-size: 12px; }
  </style>
</head>
<body>
  <div class="receipt-container">
  <div class="header">
    <div class="shop-name">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${escapeHtml(settings.address || '')}</div>
    <div class="badge">كشف نواقص وطلب توريد بضاعة</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 3px;">رقم الطلب: ${escapeHtml(reqNum)}</div>
    <div style="font-size: 11.5px; margin-top: 1px;">التاريخ: ${dateStr}</div>
  </div>

  <div class="kpi-box">
    <div>إجمالي الأصناف الناقصة: ${reorderData?.total_items_count || items.length} صنف</div>
    <div>إجمالي الكميات المطلوبة: ${reorderData?.total_units_to_order || 0} عبوة/قطعة</div>
    <div style="margin-top: 3px; font-size: 14px;">
      الميزانية التقديرية: ${(reorderData?.total_estimated_cost || 0).toLocaleString()} ر.ي
    </div>
  </div>

  <div>
    ${itemsHtml}
  </div>

  <div class="footer">
    <div style="display: flex; justify-content: space-around; font-weight: 900; font-size: 12px; margin-top: 8px;">
      <div>توقيع المستودع: .........</div>
      <div>اعتماد الإدارة: .........</div>
    </div>
    <div style="font-size: 10px; color: #555; margin-top: 6px; font-mono;">
      نظام سريع وبنشر PRO &bull; ${new Date().toLocaleTimeString('ar-YE')}
    </div>
  </div>
  </div>
</body>
</html>`;
}

export async function printReorderSheetSilently(reorderData, customSettings = null, layout = 'thermal') {
  const html = generateReorderSheetHtml(reorderData, customSettings, layout);
  return await printHtmlContentSilently(html);
}

/**
 * Generate Inventory Valuation Summary Sheet HTML (NO SKU column per user rule)
 */
export function generateInventoryValuationHtml(valuationData, inventory = [], customSettings = null, layout = 'thermal') {
  const settings = customSettings || getShopSettings();
  const dateStr = new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

  const getCatName = (cat) => {
    switch (cat) {
      case 'oil': return 'زيوت وسوائل';
      case 'filter': return 'فلاتر';
      case 'tire': return 'كفرات';
      case 'battery': return 'بطاريات';
      case 'service': return 'خدمات';
      case 'accessory': return 'إكسسوارات';
      default: return cat || 'أخرى';
    }
  };

  if (layout === 'a4') {
    const catsRows = (valuationData?.categories || [])
      .map(
        (c) => `
      <tr style="border-bottom: 1px solid #cbd5e1; text-align: right;">
        <td style="padding: 6px; font-weight: bold;">${getCatName(c.category)}</td>
        <td style="padding: 6px; text-align: center; font-family: monospace;">${c.items_count}</td>
        <td style="padding: 6px; text-align: center; font-family: monospace;">${c.item_type === 'service' ? 'غير محدود' : c.total_units}</td>
        <td style="padding: 6px; font-family: monospace;">${Number(c.total_cost_value).toLocaleString()} ر.ي</td>
        <td style="padding: 6px; font-family: monospace;">${Number(c.total_sell_value).toLocaleString()} ر.ي</td>
        <td style="padding: 6px; font-family: monospace; font-weight: bold;">+${Number(c.expected_profit).toLocaleString()} ر.ي</td>
        <td style="padding: 6px; text-align: center; font-family: monospace; font-weight: 900;">${c.margin_percent}%</td>
      </tr>`
      )
      .join('');

    const itemsRows = (inventory || [])
      .filter((i) => i.is_active === 1 && i.item_type !== 'service')
      .map((item, idx) => {
        const lineCost = (Number(item.cost_price) || 0) * (Number(item.stock_qty) || 0);
        return `
      <tr style="border-bottom: 1px solid #cbd5e1; text-align: right;">
        <td style="padding: 6px; text-align: center; font-family: monospace; width: 35px;">${idx + 1}</td>
        <td style="padding: 6px; font-weight: bold;">
          ${escapeHtml(item.name)}
          ${item.viscosity ? `<span style="font-size: 10px; color: #555;">(${escapeHtml(item.viscosity)})</span>` : ''}
        </td>
        <td style="padding: 6px;">${escapeHtml(item.brand)}</td>
        <td style="padding: 6px; text-align: center; font-family: monospace; font-weight: bold;">${item.stock_qty}</td>
        <td style="padding: 6px; font-family: monospace;">${Number(item.cost_price).toLocaleString()}</td>
        <td style="padding: 6px; font-family: monospace; font-weight: 900;">${lineCost.toLocaleString()} ر.ي</td>
        <td style="padding: 6px; font-family: monospace;">${Number(item.sell_price).toLocaleString()}</td>
      </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>كشف تقييم المخزون ورأس المال</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 10px; font-size: 11.5px; }
    .header { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: 900; }
    .kpis { display: flex; justify-content: space-around; border: 2px solid #000; padding: 8px; margin-bottom: 12px; border-radius: 6px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
    th { background: #e2e8f0; padding: 6px; border: 1.5px solid #000; font-weight: 900; text-align: right; }
    td { border: 1px solid #94a3b8; }
    .sig { display: flex; justify-content: space-around; margin-top: 30px; font-weight: bold; font-size: 12px; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">كشف الجرد المالي وتقييم رأس المال المخزني</div>
    <div style="font-size: 11px; color: #444;">التاريخ: ${dateStr} - ${timeStr}</div>
  </div>

  <div class="kpis">
    <div>قيمة رأس المال (بالتكلفة): <span style="font-family: monospace;">${valuationData?.grand_cost_value?.toLocaleString() || 0} ر.ي</span></div>
    <div>القيمة البيعية المتوقعة: <span style="font-family: monospace;">${valuationData?.grand_sell_value?.toLocaleString() || 0} ر.ي</span></div>
    <div>هامش الربح المتوقع: <span style="font-family: monospace;">+${valuationData?.grand_expected_profit?.toLocaleString() || 0} ر.ي</span> (${valuationData?.overall_margin_percent || 0}%)</div>
  </div>

  <h4 style="margin: 6px 0; font-size: 12px; font-weight: 900;">ملخص الأقسام والتصنيفات:</h4>
  <table>
    <thead>
      <tr>
        <th>القسم</th>
        <th style="text-align: center;">الأصناف</th>
        <th style="text-align: center;">الرصيد الفعلي</th>
        <th>قيمة التكلفة</th>
        <th>قيمة البيع</th>
        <th>الربح المتوقع</th>
        <th style="text-align: center;">العائد %</th>
      </tr>
    </thead>
    <tbody>
      ${catsRows}
    </tbody>
  </table>

  <h4 style="margin: 6px 0; font-size: 12px; font-weight: 900;">تفاصيل الأصناف والكميات:</h4>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>الصنف والمواصفات</th>
        <th>الماركة</th>
        <th style="text-align: center;">الرصيد</th>
        <th>سعر التكلفة</th>
        <th>إجمالي التكلفة</th>
        <th>سعر البيع</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="sig">
    <div>أمين المستودع: _______________</div>
    <div>المحاسب المالي: _______________</div>
    <div>اعتماد المالك: _______________</div>
  </div>
</body>
</html>`;
  }

  // THERMAL 80MM RECEIPT LAYOUT
  const catsThermalHtml = (valuationData?.categories || [])
    .map(
      (c) => `
    <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0;">
      <span>${getCatName(c.category)} (${c.items_count} صنف):</span>
      <strong style="font-family: monospace;">${Number(c.total_cost_value).toLocaleString()} ر.ي</strong>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>تقييم رأس المال المخزني - 80mm</title>
  <style>
    @page { margin: 0 !important; size: 80mm 297mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      direction: ltr !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 4px 2mm 6px 2mm !important;
      box-sizing: border-box !important;
      direction: rtl !important;
      text-align: right;
    }
    .header { text-align: center; padding-bottom: 6px; border-bottom: 2.5px solid #000; margin-bottom: 6px; }
    .shop-name { font-size: 20px; font-weight: 900; line-height: 1.2; }
    .badge { display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1.5px solid #000; font-weight: 900; font-size: 13px; }
    .kpi-box { border: 2px solid #000; padding: 8px; margin: 8px 0; font-weight: 900; text-align: center; }
    .footer { text-align: center; margin-top: 10px; padding-top: 6px; border-top: 2px solid #000; font-size: 12px; }
  </style>
</head>
<body>
  <div class="receipt-container">
  <div class="header">
    <div class="shop-name">${escapeHtml(settings.shopName)}</div>
    <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${escapeHtml(settings.address || '')}</div>
    <div class="badge">كشف تقييم رأس المال المخزني</div>
    <div style="font-size: 11.5px; font-weight: bold; margin-top: 3px;">التاريخ: ${dateStr} - ${timeStr}</div>
  </div>

  <div class="kpi-box">
    <div style="font-size: 12px;">قيمة رأس المال المخزني (بالتكلفة):</div>
    <div style="font-size: 20px; font-family: monospace; margin: 3px 0;">
      ${valuationData?.grand_cost_value?.toLocaleString() || 0} ر.ي
    </div>
    <div style="font-size: 12px; border-top: 1px dashed #555; padding-top: 4px; margin-top: 4px;">
      القيمة البيعية المتوقعة: <span style="font-family: monospace;">${valuationData?.grand_sell_value?.toLocaleString() || 0} ر.ي</span>
    </div>
    <div style="font-size: 12px; margin-top: 2px;">
      هامش الربح المتوقع: <span style="font-family: monospace;">+${valuationData?.grand_expected_profit?.toLocaleString() || 0} ر.ي</span> (${valuationData?.overall_margin_percent || 0}%)
    </div>
    <div style="font-size: 11px; color: #444; margin-top: 3px;">
      تشكيلة الكتالوج: ${valuationData?.total_products || 0} سلعة + ${valuationData?.total_services || 0} خدمة
    </div>
  </div>

  <div style="border: 1px solid #777; padding: 6px; margin: 6px 0; border-radius: 4px;">
    <div style="font-weight: 900; font-size: 12.5px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;">
      📊 توزيع رأس المال بالتكلفة حسب الأقسام:
    </div>
    ${catsThermalHtml}
  </div>

  <div class="footer">
    <div style="display: flex; justify-content: space-around; font-weight: 900; font-size: 12px; margin-top: 8px;">
      <div>توقيع أمين المستودع: .........</div>
      <div>اعتماد المالك: .........</div>
    </div>
    <div style="font-size: 10px; color: #555; margin-top: 6px; font-mono;">
      نظام سريع وبنشر PRO &bull; ${new Date().toLocaleTimeString('ar-YE')}
    </div>
  </div>
  </div>
</body>
</html>`;
}

export async function printInventoryValuationSilently(valuationData, inventory = [], customSettings = null, layout = 'thermal') {
  const html = generateInventoryValuationHtml(valuationData, inventory, customSettings, layout);
  return await printHtmlContentSilently(html);
}
