import React, { useState, useMemo } from 'react';
import { X, Printer, Barcode, Tag, MapPin, Copy, Layers, Check } from 'lucide-react';

/**
 * Pure JavaScript Code 128 Barcode Pattern Generator (Subset B)
 * Encodes ASCII 32..126 into SVG bar widths
 */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (Start B is 104, Stop is 106)
];

function generateCode128Svg(text) {
  if (!text) text = "ITEM-001";
  const startCode = 104; // Start Code B
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
  patternCodes.push(CODE128_PATTERNS[106]); // Stop Code

  // Build bars
  const patternString = patternCodes.join("");
  let x = 0;
  const rects = [];

  for (let i = 0; i < patternString.length; i++) {
    const width = parseInt(patternString[i], 10) * 1.8;
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push(<rect key={i} x={x} y={0} width={width} height={42} fill="#000000" />);
    }
    x += width;
  }

  return (
    <svg viewBox={`0 0 ${x} 42`} className="w-full h-11" preserveAspectRatio="none">
      {rects}
    </svg>
  );
}

export default function BarcodeLabelModal({ isOpen, onClose, item }) {
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState('50x25'); // '50x25' (thermal standard), '40x30' (shelf), 'sheet' (A4 sheet)

  if (!isOpen || !item) return null;

  const barcodeValue = item.barcode || item.sku || `ITEM-${item.id}`;

  const handlePrint = () => {
    window.print();
  };

  const copiesArray = Array.from({ length: Math.max(1, Math.min(copies, 50)) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Top Header (Hidden on print) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Barcode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">طباعة ملصقات الباركود والرفوف الحرارية</h3>
              <p className="text-xs text-slate-400">ستيكرات بدقة عالية متوافقة مع طابعات الباركود الحرارية Xprinter / Zebra</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-teal-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الستيكرات 🖨️</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Controls (Hidden on print) */}
        <div className="p-4 border-b border-white/10 bg-slate-900/60 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">مقاس الملصق:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: '50x25', label: '🏷️ ستيكر علبة (50×25 مم)' },
                { id: '40x30', label: '📌 ملصق رف (40×30 مم)' },
                { id: 'sheet', label: '📄 صفحة كاملة A4' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLabelSize(s.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                    labelSize === s.id
                      ? 'bg-teal-500 text-slate-950 border-teal-400'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">عدد النسخ:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 min-h-[36px] px-2 text-center rounded-xl bg-slate-950 border border-white/20 text-white font-mono font-bold"
            />
            {item.stock_qty > 0 && (
              <button
                type="button"
                onClick={() => setCopies(Math.min(50, Math.max(1, Math.floor(item.stock_qty))))}
                className="text-[11px] text-teal-400 hover:underline"
              >
                (حسب الرصيد: {Math.floor(item.stock_qty)})
              </button>
            )}
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 print:bg-white print:p-0">
          <div className="print:hidden mb-4 text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>معاينة الطباعة ({copies} ملصق):</span>
            <span className="text-teal-400">ستطبع الخلفية بيضاء والنصوص سوداء حادة للطابعات الحرارية</span>
          </div>

          {/* Labels Grid */}
          <div className={`grid gap-3 ${
            labelSize === '50x25'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              : labelSize === '40x30'
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-3 md:grid-cols-4'
          } print:grid-cols-1 print:gap-1 print:m-0`}>
            {copiesArray.map((_, idx) => (
              <div
                key={idx}
                className="bg-white text-black p-2.5 rounded-lg border border-slate-300 shadow-md flex flex-col justify-between select-none print:shadow-none print:border-none print:m-0 print:p-1.5 print:break-inside-avoid"
                style={{
                  width: labelSize === '50x25' ? '188px' : labelSize === '40x30' ? '150px' : '100%',
                  height: labelSize === '50x25' ? '95px' : labelSize === '40x30' ? '112px' : 'auto',
                  margin: 'auto',
                }}
              >
                {/* Header: Shop Name & Brand */}
                <div className="flex items-center justify-between border-b border-black/20 pb-0.5 text-[9px] font-bold">
                  <span className="truncate max-w-[100px]">مركز البنشر للسيارات</span>
                  <span className="font-mono">{item.brand}</span>
                </div>

                {/* Item Name & Specs */}
                <div className="my-0.5 text-center">
                  <div className="font-black text-[11px] leading-tight truncate">{item.name}</div>
                  <div className="text-[9px] font-mono text-gray-700 flex items-center justify-center gap-1.5">
                    {item.viscosity && <span className="font-bold">{item.viscosity}</span>}
                    {item.pack_size && <span>• {item.pack_size}</span>}
                    {item.tire_battery_spec && <span>• {item.tire_battery_spec}</span>}
                  </div>
                </div>

                {/* Barcode SVG */}
                <div className="my-0.5 px-1 bg-white">
                  {generateCode128Svg(barcodeValue)}
                </div>

                {/* Footer: Price, SKU/Barcode, Shelf */}
                <div className="flex items-center justify-between text-[9px] font-mono font-bold pt-0.5 border-t border-black/20">
                  <span className="tracking-tight">{barcodeValue}</span>
                  {item.location_shelf && (
                    <span className="text-[8px] bg-gray-200 px-1 rounded">رف: {item.location_shelf}</span>
                  )}
                  <span className="font-black text-[11px] text-black">
                    {Number(item.sell_price).toLocaleString()} ر.ي
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
