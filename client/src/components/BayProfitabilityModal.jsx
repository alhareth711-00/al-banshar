import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  TrendingUp,
  Percent,
  Car,
  DollarSign,
  ShieldCheck,
  Calendar,
  Sparkles,
  PieChart,
  Zap,
} from 'lucide-react';

export default function BayProfitabilityModal({ isOpen, onClose }) {
  const [dateRange, setDateRange] = useState('month'); // 'today' | 'week' | 'month' | 'all'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBayData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      let start = '';
      let end = today;

      if (dateRange === 'today') {
        start = today;
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setDate(1);
        start = d.toISOString().split('T')[0];
      }

      let url = '/api/accounting/bay-profitability';
      if (start) url += `?start_date=${start}&end_date=${end}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching bay profitability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBayData();
    }
  }, [isOpen, dateRange]);

  if (!isOpen) return null;

  const summary = data?.summary || {
    pure_labor_revenue: 0,
    goods_gross_profit: 0,
    total_gross_income: 0,
    operating_expenses: 0,
    labor_coverage_ratio_percent: 0,
    vehicles_served: 0,
    avg_labor_per_car: 0,
  };

  const topServices = data?.top_services || [];

  // Coverage percentage evaluation
  const isHealthyCoverage = summary.labor_coverage_ratio_percent >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* 1. Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>مؤشر كفاءة ربحية الحفرة والخدمات (Bay Profitability & Services Margin)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 font-mono">
                  PRO MARGIN
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                فصل أرباح الخدمات النقية (100% ربح صافٍ) عن أرباح السلع وقياس كفاءة تغطية المصاريف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Range Selector */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 flex-shrink-0 text-xs">
          <span className="text-slate-400 font-bold">الفترة التحليلية:</span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'all', label: 'كل المدة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRange(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  dateRange === tab.id
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin ml-2" />
              <span>جاري تحليل ربحية خدمات الحفرة والورشة...</span>
            </div>
          ) : (
            <>
              {/* Highlight Hero Card: OpEx Coverage Ratio */}
              <div className={`apple-glass rounded-3xl p-5 border ${isHealthyCoverage ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'} shadow-xl flex flex-col md:flex-row items-center justify-between gap-4`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${isHealthyCoverage ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'} flex items-center justify-center flex-shrink-0`}>
                    <Zap className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-bold">
                      مؤشر تغطية المصاريف من الخدمات (Services-to-OpEx Coverage):
                    </div>
                    <div className={`text-2xl font-black font-mono mt-0.5 ${isHealthyCoverage ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {summary.labor_coverage_ratio_percent}%
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {isHealthyCoverage
                        ? `ممتاز! إيرادات الخدمات تغطي كامل المصاريف التشغيلية (${summary.operating_expenses.toLocaleString()} ر.ي) بفائض نقدي!`
                        : `تنبيه: الخدمات تغطي ${summary.labor_coverage_ratio_percent}% من المصاريف، ويوصى بزيادة خدمات البنشر والترصيص.`}
                    </div>
                  </div>
                </div>

                <div className="text-center p-3 rounded-2xl bg-slate-900/80 border border-white/10 w-full md:w-auto flex-shrink-0 text-xs">
                  <div className="text-slate-400">متوسط دخل الخدمات لكل سيارة:</div>
                  <div className="text-lg font-black font-mono text-purple-400 mt-0.5">
                    {summary.avg_labor_per_car.toLocaleString()} ر.ي
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    إجمالي السيارات: {summary.vehicles_served}
                  </div>
                </div>
              </div>

              {/* 4 Financial Diagnostic Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Card 1: Pure Services Revenue */}
                <div className="apple-glass-card rounded-2xl p-4 border border-purple-500/25">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                    <span>إيراد الخدمات والتركيب (100% ربح):</span>
                    <Wrench className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-purple-400">
                    {summary.pure_labor_revenue.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                  </div>
                  <div className="text-[11px] text-purple-300 mt-1">
                    أرباح نقدية خالصة بدون خصم مخزني
                  </div>
                </div>

                {/* Card 2: Goods Gross Profit */}
                <div className="apple-glass-card rounded-2xl p-4 border border-blue-500/25">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                    <span>مجمل ربح بيع البضاعة (الزيوت/الفلاتر):</span>
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-blue-400">
                    {summary.goods_gross_profit.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    صافي مبيعات البضائع ناقص تكلفة COGS
                  </div>
                </div>

                {/* Card 3: Total Gross Operating Income */}
                <div className="apple-glass-card rounded-2xl p-4 border border-emerald-500/25">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                    <span>إجمالي الدخل التشغيلي الصافي:</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {summary.total_gross_income.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-1">
                    (أرباح البضاعة + إيراد الخدمات الخالص)
                  </div>
                </div>
              </div>

              {/* Profit Composition Bar */}
              <div className="apple-glass rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>هيكل مصادر دخل المركز:</span>
                  <span>
                    خدمات ({summary.total_gross_income > 0 ? Math.round((summary.pure_labor_revenue / summary.total_gross_income) * 100) : 0}%) &bull; بضاعة ({summary.total_gross_income > 0 ? Math.round((summary.goods_gross_profit / summary.total_gross_income) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-slate-900 border border-white/10 overflow-hidden flex">
                  <div
                    style={{
                      width: `${summary.total_gross_income > 0 ? (summary.pure_labor_revenue / summary.total_gross_income) * 100 : 50}%`,
                    }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                    title="أرباح الخدمات"
                  />
                  <div
                    style={{
                      width: `${summary.total_gross_income > 0 ? (summary.goods_gross_profit / summary.total_gross_income) * 100 : 50}%`,
                    }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    title="مجمل أرباح مبيعات البضائع"
                  />
                </div>
              </div>

              {/* Top Services Performed Table */}
              <div className="apple-glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between text-xs font-extrabold text-white">
                  <span>أكثر خدمات الحفرة جلباً للأرباح والسيولة:</span>
                  <span className="text-purple-400">عدد الخدمات: {topServices.length}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold">
                      <tr>
                        <th className="p-3">اسم الخدمة</th>
                        <th className="p-3 text-center">مرات التنفيذ</th>
                        <th className="p-3">إجمالي الدخل المحقق (100% ربح)</th>
                        <th className="p-3">متوسط السعر لكل مرة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {topServices.map((svc, i) => (
                        <tr key={i} className="hover:bg-white/5 transition">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span>{svc.description}</span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-400">
                            {svc.times_performed} مرة
                          </td>
                          <td className="p-3 font-mono font-black text-purple-300">
                            {svc.total_revenue.toLocaleString()} ر.ي
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {svc.times_performed > 0
                              ? Math.round(svc.total_revenue / svc.times_performed).toLocaleString()
                              : 0}{' '}
                            ر.ي
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {topServices.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      لا توجد خدمات مسجلة في هذه الفترة
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 4. Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            مركز سريع وبنشر &bull; نموذج التحليل المالي لحفر وخدمات السيارات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
