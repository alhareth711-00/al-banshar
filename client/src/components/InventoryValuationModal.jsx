import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle, Boxes, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function InventoryValuationModal({ isOpen, onClose, inventory = [] }) {
  const [valuationData, setValuationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchValuation();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchValuation = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/valuation');
      const data = await res.json();
      if (data.success) {
        setValuationData(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch valuation summary:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getCategoryArabicName = (cat) => {
    switch (cat) {
      case 'oil': return 'زيوت وسوائل المحركات';
      case 'filter': return 'فلاتر (زيت / هواء / مكيف)';
      case 'tire': return 'كفرات وإطارات سيارات';
      case 'battery': return 'بطاريات ومولدات طاقة';
      case 'service': return 'خدمات وتركيبات الورشة';
      case 'accessory': return 'إكسسوارات وقطع عامة';
      default: return cat;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Top Header (Hidden on print) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إجمالي قيمة بضاعة المحل (رأس المال والجرد)</h3>
              <p className="text-xs text-amber-300 font-medium">💡 تلميح: كشف بقيمة البضاعة بالكامل بسعر التكلفة وبسعر البيع، مع صافي الربح المتوقع عند بيعها.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف الرسمي (A4) 🖨️</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200 print:text-black print:bg-white print:p-2">
          {/* Official Sheet Header for Print */}
          <div className="border-b-2 border-slate-700 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white print:text-black">مركز البنشر لخدمات وتغيير زيوت السيارات</h1>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">كشف الجرد الفعلي وتقييم رأس المال المخزني - صنعاء، اليمن</p>
            </div>
            <div className="text-left font-mono text-xs text-slate-400 print:text-gray-700">
              <div>تاريخ الجرد: {new Date().toLocaleDateString('ar-YE')}</div>
              <div>وقت الاستخراج: {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Valuation KPI Summary Cards */}
          {valuationData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 print:border print:border-gray-300">
                <div className="text-xs text-slate-400 print:text-gray-600 font-bold">قيمة رأس المال (بالتكلفة):</div>
                <div className="text-lg font-black font-mono text-white print:text-black mt-1">
                  {valuationData.grand_cost_value.toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 print:border print:border-gray-300">
                <div className="text-xs text-slate-400 print:text-gray-600 font-bold">القيمة البيعية الإجمالية:</div>
                <div className="text-lg font-black font-mono text-amber-400 print:text-gray-900 mt-1">
                  {valuationData.grand_sell_value.toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/20 print:border print:border-gray-300">
                <div className="text-xs text-emerald-400 print:text-gray-600 font-bold">هامش الربح المتوقع:</div>
                <div className="text-lg font-black font-mono text-emerald-400 print:text-black mt-1">
                  +{valuationData.grand_expected_profit.toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
                </div>
                <div className="text-[10px] text-emerald-300 print:text-gray-600">
                  متوسط العائد: {valuationData.overall_margin_percent}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 print:border print:border-gray-300">
                <div className="text-xs text-slate-400 print:text-gray-600 font-bold">إجمالي تشكيلة الكتالوج:</div>
                <div className="text-lg font-black font-mono text-white print:text-black mt-1">
                  {valuationData.total_products} <span className="text-xs font-sans text-slate-400">سلعة</span> + {valuationData.total_services} <span className="text-xs font-sans text-teal-400">خدمة</span>
                </div>
              </div>
            </div>
          )}

          {/* Category Summary Breakdown */}
          {valuationData?.categories && (
            <div>
              <h4 className="text-xs font-extrabold text-slate-300 print:text-black uppercase tracking-wider mb-2">
                📊 التوزيع المالي حسب الأقسام والتصنيفات:
              </h4>
              <div className="overflow-x-auto rounded-xl border border-white/10 print:border-gray-400">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 print:bg-gray-100 text-slate-400 print:text-black font-bold">
                    <tr>
                      <th className="p-2.5">القسم</th>
                      <th className="p-2.5 text-center">عدد الأصناف</th>
                      <th className="p-2.5 text-center">الرصيد الفعلي</th>
                      <th className="p-2.5">قيمة التكلفة</th>
                      <th className="p-2.5">قيمة البيع</th>
                      <th className="p-2.5">الربح المتوقع</th>
                      <th className="p-2.5 text-center">العائد %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-300">
                    {valuationData.categories.map((c, idx) => (
                      <tr key={idx} className="print:text-black">
                        <td className="p-2.5 font-bold">{getCategoryArabicName(c.category)}</td>
                        <td className="p-2.5 text-center font-mono">{c.items_count}</td>
                        <td className="p-2.5 text-center font-mono">
                          {c.item_type === 'service' ? 'غير محدود' : c.total_units}
                        </td>
                        <td className="p-2.5 font-mono">{c.total_cost_value.toLocaleString()} ر.ي</td>
                        <td className="p-2.5 font-mono">{c.total_sell_value.toLocaleString()} ر.ي</td>
                        <td className="p-2.5 font-mono text-emerald-400 print:text-black">
                          +{c.expected_profit.toLocaleString()} ر.ي
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-300 print:text-black">
                          {c.margin_percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Items Table */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-300 print:text-black uppercase tracking-wider mb-2">
              📦 تفاصيل الأصناف والكميات المتوفرة بالمستودع:
            </h4>
            <div className="overflow-x-auto rounded-xl border border-white/10 print:border-gray-400">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 print:bg-gray-100 text-slate-400 print:text-black font-bold">
                  <tr>
                    <th className="p-2 text-center">#</th>
                    <th className="p-2">كود SKU</th>
                    <th className="p-2">اسم الصنف والمواصفات</th>
                    <th className="p-2">الماركة</th>
                    <th className="p-2">العبوة/المقاس</th>
                    <th className="p-2 text-center">الرصيد الفعلي</th>
                    <th className="p-2">سعر الشراء</th>
                    <th className="p-2">إجمالي التكلفة</th>
                    <th className="p-2">سعر البيع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-300">
                  {inventory.map((item, idx) => {
                    const lineCost = (Number(item.cost_price) || 0) * (Number(item.stock_qty) || 0);
                    return (
                      <tr key={item.id} className="print:text-black">
                        <td className="p-2 text-center font-mono text-slate-400 print:text-gray-600">{idx + 1}</td>
                        <td className="p-2 font-mono text-slate-400 print:text-gray-800">{item.sku}</td>
                        <td className="p-2 font-bold text-white print:text-black">
                          {item.name}
                          {item.tire_battery_spec && (
                            <span className="text-[10px] text-teal-400 print:text-gray-700 mr-1.5">({item.tire_battery_spec})</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-300 print:text-black">{item.brand}</td>
                        <td className="p-2 font-mono text-slate-300 print:text-black">{item.pack_size || '-'}</td>
                        <td className="p-2 text-center font-mono font-bold text-emerald-400 print:text-black">
                          {item.item_type === 'service' ? 'خدمة' : item.stock_qty}
                        </td>
                        <td className="p-2 font-mono">{Number(item.cost_price).toLocaleString()}</td>
                        <td className="p-2 font-mono font-bold">{lineCost.toLocaleString()}</td>
                        <td className="p-2 font-mono text-amber-400 print:text-black">{Number(item.sell_price).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures for Official Audit Print */}
          <div className="pt-6 border-t border-slate-700 print:border-gray-400 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-400 print:text-black">
            <div>
              <p>أمين المستودع</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
            <div>
              <p>المحاسب المالي</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
            <div>
              <p>المدير التنفيذي / الاعتماد</p>
              <div className="mt-8 border-b border-dotted border-slate-600 print:border-black w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
