import React, { useState, useEffect } from 'react';
import { X, Printer, ShoppingBag, Send, AlertTriangle, FileText, CheckCircle, Copy, Share2 } from 'lucide-react';

export default function ReorderOrderSheetModal({
  isOpen,
  onClose,
  onConvertToPurchaseInvoice,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReorderSuggestions();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchReorderSuggestions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/reorder-suggestions');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch reorder suggestions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsAppText = () => {
    if (!data || !data.items) return;
    let text = `*طلب توريد أصناف / نواقص مركز البنشر للسيارات*\n`;
    text += `رقم الطلب: ${data.requisition_number}\n`;
    text += `التاريخ: ${data.date}\n`;
    text += `------------------------------------\n`;
    data.items.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}* (${item.brand})\n`;
      text += `   - المطلوب: *${item.suggested_qty}* عبوة/قطعة\n`;
      text += `   - الرصيد الحالي: ${item.current_stock}\n`;
    });
    text += `------------------------------------\n`;
    text += `إجمالي الأصناف المطلوبة: ${data.total_items_count}\n`;
    text += `يرجى إرسال عروض الأسعار والتوريد بالسرعة الممكنة. وشكراً.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const items = data?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header (Hidden on print) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">كشف نواقص البضاعة لطلب التوريد</h3>
              <p className="text-xs text-amber-300 font-medium">
                💡 تلميح: كشف تلقائي بالزيوت والفلاتر الناقصة في المحل لإرسالها بالواتساب للموردين وتجهيز طلبيتك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppText}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ للواتساب 📲'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة أمر الشراء (A4) 🖨️</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Bar (Hidden on print) */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300 font-semibold print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              يمكنك طباعة هذا الكشف لإرساله للمورد. وعند وصول البضاعة فعلياً ودفع قيمتها، اضغط زر تسجيل الفاتورة بالأسفل.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onConvertToPurchaseInvoice && items.length > 0) {
                onConvertToPurchaseInvoice(items);
                onClose();
              }
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>تسجيل فاتورة مشتريات (عند استلام البضاعة من المورد) 📥</span>
          </button>
        </div>

        {/* Printable Purchase Requisition Sheet */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-200 print:text-black print:bg-white print:p-2">
          {/* Sheet Header */}
          <div className="border-b-2 border-slate-700 pb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white print:text-black">مركز البنشر لخدمات وتغيير زيوت السيارات</h1>
              <p className="text-xs text-slate-400 print:text-gray-600">طلب شراء وتوريد بضاعة ونواقص مخزنية - صنعاء، اليمن</p>
            </div>
            <div className="text-left font-mono text-xs text-slate-400 print:text-gray-700">
              <div>رقم أمر الشراء: <span className="font-bold text-amber-400 print:text-black">{data?.requisition_number}</span></div>
              <div>تاريخ الطلب: {data?.date || new Date().toLocaleDateString('ar-YE')}</div>
            </div>
          </div>

          {/* Requisition Summary KPIs */}
          <div className="grid grid-cols-3 gap-3 print:border print:border-gray-300 print:p-2 rounded-2xl bg-slate-900 border border-white/10 p-3.5">
            <div>
              <span className="text-slate-400 print:text-gray-600 text-xs font-bold">عدد الأصناف الناقصة:</span>
              <div className="text-lg font-black font-mono text-rose-400 print:text-black mt-0.5">
                {data?.total_items_count || 0} <span className="text-xs font-sans text-slate-400">صنف بحاجة توريد</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-600 text-xs font-bold">إجمالي الكميات المطلوبة:</span>
              <div className="text-lg font-black font-mono text-amber-300 print:text-black mt-0.5">
                {data?.total_units_to_order || 0} <span className="text-xs font-sans text-slate-400">عبوة / قطعة</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-600 text-xs font-bold">الميزانية التقديرية للشحنة:</span>
              <div className="text-lg font-black font-mono text-emerald-400 print:text-black mt-0.5">
                {(data?.total_estimated_cost || 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 print:border-gray-400">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 print:bg-gray-100 text-slate-400 print:text-black font-bold">
                <tr>
                  <th className="p-2 text-center">#</th>
                  <th className="p-2">كود الصنف</th>
                  <th className="p-2">الصنف المطلوب ومواصفاته</th>
                  <th className="p-2">الماركة واللزوجة</th>
                  <th className="p-2 text-center">الرصيد الحالي</th>
                  <th className="p-2 text-center">حد الأمان</th>
                  <th className="p-2 text-center">الكمية المطلوبة للتوريد</th>
                  <th className="p-2">سعر الشراء التقديري</th>
                  <th className="p-2">إجمالي التكلفة المتوقعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300">
                {items.map((item, idx) => (
                  <tr key={item.inventory_id} className="print:text-black">
                    <td className="p-2 text-center font-mono text-slate-400 print:text-gray-600">{idx + 1}</td>
                    <td className="p-2 font-mono text-slate-400 print:text-gray-800">{item.sku}</td>
                    <td className="p-2 font-bold text-white print:text-black">
                      {item.name}
                      {item.pack_size && <span className="text-slate-400 print:text-gray-700 text-[10px] mr-1">({item.pack_size})</span>}
                    </td>
                    <td className="p-2 text-slate-300 print:text-black">
                      {item.brand}
                      {item.viscosity && <span className="text-[10px] text-amber-300 print:text-black mr-1">({item.viscosity})</span>}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-rose-400 print:text-black">
                      {item.current_stock}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-400 print:text-black">
                      {item.min_stock_alert}
                    </td>
                    <td className="p-2 text-center font-mono font-black text-emerald-400 print:text-black text-sm">
                      {item.suggested_qty}
                    </td>
                    <td className="p-2 font-mono">{Number(item.unit_cost).toLocaleString()}</td>
                    <td className="p-2 font-mono font-bold text-amber-400 print:text-black">
                      {Number(item.estimated_cost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                🎉 ممتاز! لا توجد أي نواقص في المخزون حالياً، جميع الأصناف فوق حد الأمان.
              </div>
            )}
          </div>

          {/* Signatures for Print */}
          <div className="pt-6 border-t border-slate-700 print:border-gray-400 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-400 print:text-black">
            <div>
              <p>مُعد الطلب (أمين المستودع)</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
            <div>
              <p>مسؤول المشتريات والتوريد</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
            <div>
              <p>الاعتماد المالي / الإدارة</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
