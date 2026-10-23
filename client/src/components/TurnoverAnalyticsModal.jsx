import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Flame, Clock, Snowflake, DollarSign, Printer, ArrowDownRight } from 'lucide-react';

export default function TurnoverAnalyticsModal({ isOpen, onClose, onEditItem }) {
  const [period, setPeriod] = useState(90);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'A', 'B', 'C'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics(period);
    }
  }, [isOpen, period]);

  const fetchAnalytics = async (days) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/inventory/turnover-analytics?days=${days}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch turnover analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const summary = data?.summary || {
    total_products: 0,
    class_a_fast: 0,
    class_b_moderate: 0,
    class_c_slow: 0,
    total_stock_cost: 0,
    dead_stock_cost: 0,
    dead_stock_ratio_percent: 0,
  };

  const filteredItems = (data?.items || []).filter((item) => {
    if (activeTab === 'all') return true;
    return item.turnover_class === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">حركة الأصناف (الأكثر طلباً والراكد في الرفوف)</h3>
              <p className="text-xs text-amber-300 font-medium">💡 تلميح: كشف الأصناف السريعة التي تمشي يومياً، والبضاعة الراكدة التي حبست رأس مالك دون تصريف.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة التقرير</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-900/40 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">فترة التحليل:</span>
            {[30, 60, 90, 180].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPeriod(d)}
                className={`px-3 py-1 rounded-xl font-bold transition border ${
                  period === d
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                آخر {d} يوم
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            {isLoading ? 'جاري تحديث المؤشرات...' : `تحليل مبني على فواتير المبيعات الفعلية`}
          </span>
        </div>

        {/* KPI Cards */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Class A: Fast */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  سريع الدوران (A):
                </span>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">طلب متكرر</span>
              </div>
              <div className="text-xl font-black font-mono text-emerald-300 mt-1">
                {summary.class_a_fast} <span className="text-xs font-sans text-slate-400">صنف</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">بيع خلال آخر أسبوعين</div>
            </div>

            {/* Class B: Moderate */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  متوسط الحركة (B):
                </span>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">حركة دورية</span>
              </div>
              <div className="text-xl font-black font-mono text-amber-300 mt-1">
                {summary.class_b_moderate} <span className="text-xs font-sans text-slate-400">صنف</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">بيع خلال 15-45 يوم</div>
            </div>

            {/* Class C: Dead/Slow Stock */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <Snowflake className="w-4 h-4 text-rose-400" />
                  راكد / ميت (C):
                </span>
                <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded">يحتاج تنشيط</span>
              </div>
              <div className="text-xl font-black font-mono text-rose-300 mt-1">
                {summary.class_c_slow} <span className="text-xs font-sans text-slate-400">صنف</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">لم يبع منذ &gt; 45 يوم</div>
            </div>

            {/* Frozen Dead Capital */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  رأس المال المجمد (C):
                </span>
              </div>
              <div className="text-lg font-black font-mono text-amber-400 mt-1">
                {summary.dead_stock_cost.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                يمثل <span className="text-rose-400 font-bold">{summary.dead_stock_ratio_percent}%</span> من إجمالي المخزون
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Class Filtering */}
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
            {[
              { id: 'all', label: `جميع الأصناف (${summary.total_products})` },
              { id: 'A', label: `🔥 سريعة الدوران A (${summary.class_a_fast})` },
              { id: 'B', label: `⏱️ متوسطة الحركة B (${summary.class_b_moderate})` },
              { id: 'C', label: `❄️ بضاعة راكدة C (${summary.class_c_slow})`, isAlert: true },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  activeTab === t.id
                    ? t.isAlert
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                      : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-400 font-bold">
                <tr>
                  <th className="p-3">الصنف والمواصفات</th>
                  <th className="p-3">الفئة والماركة</th>
                  <th className="p-3 text-center">الرصيد بالمخزن</th>
                  <th className="p-3 text-center">المباع (خلال {period} يوم)</th>
                  <th className="p-3">إجمالي الإيراد</th>
                  <th className="p-3 text-center">آخر حركة بيع</th>
                  <th className="p-3">قيمة التكلفة المخزنة</th>
                  <th className="p-3 text-center">التصنيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-bold text-white">
                      <div>{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>{item.brand}</div>
                      {item.viscosity && (
                        <span className="text-[10px] font-mono text-amber-300">{item.viscosity}</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-400">
                      {item.stock_qty}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-amber-300">
                      {item.total_sold_qty} عبوة
                    </td>
                    <td className="p-3 font-mono">
                      {item.total_revenue.toLocaleString()} ر.ي
                    </td>
                    <td className="p-3 text-center text-[11px] text-slate-400">
                      {item.last_sold_date ? (
                        <div>
                          <div>{item.last_sold_date.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            (منذ {item.days_since_last_sale} يوم)
                          </div>
                        </div>
                      ) : (
                        <span className="text-rose-400">لا توجد مبيعات</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-300">
                      {item.stock_cost_value.toLocaleString()} ر.ي
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.turnover_class === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : item.turnover_class === 'B'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        Class {item.turnover_class} - {item.status_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                لا توجد أصناف في هذا التصنيف حالياً.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
