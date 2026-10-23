import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  DollarSign,
  Droplets,
  Package,
  MessageSquare,
  Copy,
  Check,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Wrench,
  Clock,
  UserCheck,
  Calendar,
  Receipt,
  FileCheck,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Activity,
  BarChart2,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import ShiftHandoverModal from './ShiftHandoverModal';

export default function ClosingReport({ onOpenBayProfitability }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentShiftData, setCurrentShiftData] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [printLayout, setPrintLayout] = useState('a4'); // 'a4' or 'thermal80'

  const settings = getShopSettings();
  const enableShiftsMode = !!settings.enableShiftsMode;
  const openingHour = settings.openingHour !== undefined ? settings.openingHour : 7;
  const closingHour = settings.closingHour !== undefined ? settings.closingHour : 24;

  const fetchReport = async (date) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/daily-closing?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Error fetching closing report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShift = async () => {
    if (!enableShiftsMode) return;
    try {
      const res = await fetch('/api/shifts/current');
      const data = await res.json();
      if (data.success) {
        setCurrentShiftData(data.data);
      }
    } catch (err) {
      console.error('Error fetching current shift:', err);
    }
  };

  useEffect(() => {
    fetchReport(reportDate);
    if (enableShiftsMode) {
      fetchCurrentShift();
    }
  }, [reportDate, enableShiftsMode]);

  const handleStartNewShift = async () => {
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_name: 'كاشير المركز',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCurrentShift();
      } else {
        alert(data.message || 'فشل فتح الوردية');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handlePrint = (layout = 'a4') => {
    setPrintLayout(layout);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading || !reportData) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const {
    summary,
    cash_register,
    payment_methods_breakdown,
    oil_sales,
    filters_sales,
    transactions_summary,
    low_stock_alerts,
    debts_and_payables,
    comparison,
    hourly_analytics,
  } = reportData;

  // Build the critical low stock alert text
  const lowStockText = (low_stock_alerts || []).length > 0
    ? low_stock_alerts.map((ls) => `${ls.name} (متبقي ${ls.stock_qty})`).join(' ، ')
    : 'المخزون كافي ومستقر';

  // Count filter types
  let oilFiltersCount = 0;
  let airFiltersCount = 0;
  let cabinFiltersCount = 0;

  for (const f of filters_sales.items_sold || []) {
    if (f.name.includes('زيت')) oilFiltersCount += f.qty_sold;
    else if (f.name.includes('هواء')) airFiltersCount += f.qty_sold;
    else if (f.name.includes('مكيف')) cabinFiltersCount += f.qty_sold;
    else oilFiltersCount += f.qty_sold;
  }

  const goodsRev = summary.goods_sales_revenue || summary.total_items_amount || 0;
  const servRev = summary.services_revenue || summary.total_labor_amount || 0;
  const ownerDrawings = transactions_summary?.owner_drawings_total || 0;
  const liveDrawerBal = cash_register?.live_drawer_balance ?? cash_register?.net_drawer_cash ?? 0;

  // Upgrades 1 & 5 metrics
  const vsYest = comparison?.growth_vs_yesterday || {};
  const vsLastWeek = comparison?.growth_vs_last_week || {};
  const peakHour = hourly_analytics?.peak_hour || {};
  const avgTicket = hourly_analytics?.average_ticket_per_car || 0;
  const avgServices = hourly_analytics?.average_services_per_car || 0;

  // Filter hourly timeline based on configured operating hours
  const filteredTimeline = (hourly_analytics?.timeline || []).filter((item) => {
    if (closingHour <= 24) {
      return item.hour >= openingHour && item.hour < closingHour;
    }
    return item.hour >= openingHour || item.hour < (closingHour - 24);
  });

  const maxTimelineCars = Math.max(...filteredTimeline.map((t) => t.cars_count), 1);

  // Executive Owner Brief Message 2.0 (Enhanced with Ticket & Peak Stats)
  const ownerBriefMessage =
`📊 إغلاق مالي لمركز ${settings.shopName} - ${reportDate}
🚗 حركة العمليات والخدمة:
- السيارات المخدومة: ${summary.total_cars_served} سيارة (${summary.total_invoices} فاتورة)
- مبيعات الزيوت والقطع: ${goodsRev.toLocaleString()} ر.ي
- إيرادات الخدمات والمصنعية: ${servRev.toLocaleString()} ر.ي
- إجمالي المبيعات الصافية: ${summary.total_net_sales.toLocaleString()} ر.ي
- ⏱️ ساعة الذروة اليومية: ${peakHour.label || '04:00 م'} (${peakHour.cars_count || 0} سيارات)
- 🎫 متوسط الفاتورة للسيارة: ${avgTicket.toLocaleString()} ر.ي

💵 حركة الصندوق النقدي (1101):
- إجمالي الكاش المقبوض من المبيعات: ${cash_register.inflow_cash_invoices.toLocaleString()} ر.ي
- تحصيل ديون سابقة (سندات قبض): ${cash_register.inflow_cash_debt_collected.toLocaleString()} ر.ي
- المصاريف التشغيلية المنصرفة: ${transactions_summary.expenses_total.toLocaleString()} ر.ي
- مسحوبات المالك الشخصية (3101): ${ownerDrawings.toLocaleString()} ر.ي
- رصيد الصندوق النقدي الفعلي الدفتري: ${liveDrawerBal.toLocaleString()} ر.ي

📱 قنوات الدفع الأخرى والآجل:
- إجمالي المحافظ الإلكترونية: ${payment_methods_breakdown.e_wallets.total.toLocaleString()} ر.ي (كريمي: ${payment_methods_breakdown.e_wallets.kuraimi.toLocaleString()} | جيب: ${payment_methods_breakdown.e_wallets.jeeb.toLocaleString()})
- مبيعات الآجل (ديون جديدة): ${summary.total_new_debts.toLocaleString()} ر.ي

🛢️ حركة الزيوت والفلاتر:
- عبوات الزيوت: (${oil_sales.packs_summary['4L']} عبوة 4 لتر | ${oil_sales.packs_summary['1L']} عبوة 1 لتر | ${oil_sales.packs_summary['5L']} عبوة 5 لتر)
- الفلاتر المباعة: (${oilFiltersCount} فلتر زيت | ${airFiltersCount} فلتر هواء | ${cabinFiltersCount} فلتر مكيف)

⚠️ نواقص المخزن الحرجة: [${lowStockText}]`;

  const ownerWhatsAppUrl = formatYemeniWhatsAppLink(settings.ownerPhone, ownerBriefMessage);
  const supervisorWhatsAppUrl = settings.supervisorPhone
    ? formatYemeniWhatsAppLink(settings.supervisorPhone, ownerBriefMessage)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ownerBriefMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setDateToday = () => {
    setReportDate(new Date().toISOString().split('T')[0]);
  };

  const setDateYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    setReportDate(y.toISOString().split('T')[0]);
  };

  const renderGrowthBadge = (pct, label) => {
    if (pct === undefined || pct === null) return null;
    const isUp = pct > 0;
    const isDown = pct < 0;
    return (
      <div
        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 border ${
          isUp
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : isDown
            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            : 'bg-slate-800 text-slate-400 border-white/10'
        }`}
        title={label}
      >
        {isUp ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> : isDown ? <TrendingDown className="w-3 h-3 stroke-[2.5]" /> : <Minus className="w-3 h-3" />}
        <span>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
      </div>
    );
  };

  return (
    <div className="min-h-full flex flex-col gap-4 select-none pb-8">
      {/* 1. Header Bar with Actions */}
      <div className="apple-glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <FileSpreadsheet className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">تقرير الإغلاق المالي والتحليلي الشامل (Executive Management Closing)</h2>
            <p className="text-xs text-slate-400">
              الملخص المالي المترابط مع القيود والسندات وخريطة الذروة ورسائل الواتساب الفورية للمالك والمشرف
            </p>
          </div>
        </div>

        {/* Date & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Pills */}
          <div className="flex items-center bg-slate-900 border border-white/15 rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={setDateToday}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                reportDate === new Date().toISOString().split('T')[0]
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={setDateYesterday}
              className="px-3 py-1.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition"
            >
              أمس
            </button>
          </div>

          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-blue-400"
          />

          {/* Print A4 */}
          <button
            type="button"
            onClick={() => handlePrint('a4')}
            className="min-h-[44px] px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
            title="طباعة التقرير المالي الرسمي A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة A4</span>
          </button>

          {/* Print Thermal 80mm */}
          <button
            type="button"
            onClick={() => handlePrint('thermal80')}
            className="min-h-[44px] px-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
            title="طباعة بون إغلاق الصندوق على طابعة الإيصالات الحرارية 80mm"
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">إيصال 80mm</span>
          </button>

          {onOpenBayProfitability && (
            <button
              type="button"
              onClick={onOpenBayProfitability}
              className="min-h-[44px] px-3.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="عرض مؤشرات ونشاط حركة سيارات الحفرة ومبيعات الزيوت"
            >
              <Wrench className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">حركة سيارات الحفرة 🚗</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ التقرير'}</span>
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body (Screen View) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 print:hidden">
        {/* Optional Shift Management Bar (Active ONLY if enableShiftsMode is true in Settings) */}
        {enableShiftsMode && (
          <div className="apple-glass rounded-3xl p-4 border border-purple-500/30 bg-purple-500/10 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white">نظام إدارة الورديات وتسليم العهدة:</span>
                  {currentShiftData?.has_active_shift ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      وردية نشطة ({currentShiftData.shift.shift_code})
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold">
                      لا توجد وردية مفتوحة حالياً
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {currentShiftData?.has_active_shift
                    ? `الكاشير المسؤول: ${currentShiftData.shift.cashier_name} &bull; بدأت: ${currentShiftData.shift.opened_at}`
                    : 'يمكنك فتح وردية جديدة لتسجيل الكاشير ومتابعة تسليم الصندوق للمناوب'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentShiftData?.has_active_shift ? (
                <button
                  type="button"
                  onClick={() => setShowShiftModal(true)}
                  className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition active:scale-95 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>إغلاق الوردية وتسليم الصندوق للمناوب</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartNewShift}
                  className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition active:scale-95 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>بدء وردية جديدة الآن</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* DUAL WHATSAPP OWNER & SUPERVISOR DIRECT DISPATCH CARD (UPGRADE 2) */}
        <div className="apple-glass rounded-3xl p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-slate-900/80 to-slate-900/90 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 stroke-[2.2] fill-emerald-500/30" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base flex items-center gap-2">
                <span>تقرير الإغلاق المالي لمالك المركز جاهز للإرسال الفوري</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  بنقرة واحدة
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {supervisorWhatsAppUrl ? (
                  <span>
                    متاح الإرسال الفوري لرقم المالك (<b className="text-white font-mono">{settings.ownerPhone}</b>) ورقم المشرف (<b className="text-indigo-300 font-mono">{settings.supervisorPhone}</b>)
                  </span>
                ) : (
                  <span>
                    إرسال الملخص المالي والتشغيلي المباشر إلى رقم المالك ({settings.ownerPhone})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (Dual or Single) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <a
              href={ownerWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>إرسال لواتساب المالك 📲</span>
            </a>

            {supervisorWhatsAppUrl && (
              <a
                href={supervisorWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 lg:flex-none min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                <span>إرسال لواتساب المشرف 📲</span>
              </a>
            )}
          </div>
        </div>

        {/* UPGRADE 1: PERFORMANCE COMPARISON & GROWTH RADAR (Today vs Yesterday & Last Week) */}
        <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>مؤشرات نمو الأداء والنشاط التشغيلي مقارنة بالفترات السابقة (Growth Radar):</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              تاريخ المقارنة: {reportDate}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Box 1: Cars Growth */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold">حركة السيارات المخدومة:</span>
                <span className="font-black text-white text-sm font-mono">{summary.total_cars_served} سيارة</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400 text-[11px]">مقارنة بالأمس:</span>
                {renderGrowthBadge(vsYest.cars_growth_pct, 'نسبة نمو السيارات مقارنة بالأمس')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">مقارنة بالأسبوع الماضي:</span>
                {renderGrowthBadge(vsLastWeek.cars_growth_pct, 'نسبة نمو السيارات مقارنة بنفس اليوم الأسبوع الماضي')}
              </div>
            </div>

            {/* Box 2: Total Sales Growth */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold">إجمالي المبيعات الصافية:</span>
                <span className="font-black text-blue-400 text-sm font-mono">{summary.total_net_sales.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400 text-[11px]">مقارنة بالأمس:</span>
                {renderGrowthBadge(vsYest.sales_growth_pct, 'نسبة نمو المبيعات مقارنة بالأمس')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">مقارنة بالأسبوع الماضي:</span>
                {renderGrowthBadge(vsLastWeek.sales_growth_pct, 'نسبة نمو المبيعات مقارنة بنفس اليوم الأسبوع الماضي')}
              </div>
            </div>

            {/* Box 3: Services Revenue Growth */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold">إيرادات الخدمات والمصنعية:</span>
                <span className="font-black text-purple-400 text-sm font-mono">{servRev.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400 text-[11px]">مقارنة بالأمس:</span>
                {renderGrowthBadge(vsYest.services_growth_pct, 'نسبة نمو الخدمات مقارنة بالأمس')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">مقارنة بالأسبوع الماضي:</span>
                {renderGrowthBadge(vsLastWeek.services_growth_pct, 'نسبة نمو الخدمات مقارنة بالأسبوع الماضي')}
              </div>
            </div>
          </div>
        </div>

        {/* UPGRADE 5: PEAK HOURS HEATMAP & AVERAGE TICKET METRICS */}
        <div className="apple-glass rounded-3xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>خريطة ساعات الذروة وتحليل متوسط قيمة الفاتورة (Peak Heatmap & Ticket Size):</span>
            </h3>
            <span className="text-xs text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              ساعات العمل المعتمدة: من {String(openingHour).padStart(2, '0')}:00 ص حتى {closingHour === 24 ? '12:00 منتصف الليل' : `${closingHour % 12}:00 مساءً`}
            </span>
          </div>

          {/* Ticket Stats & Peak Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[11px] font-bold text-slate-400">ساعة الذروة اليومية (Peak Hour):</div>
              <div className="text-xl font-black font-mono text-amber-400 mt-1 flex items-center gap-2">
                <span>{peakHour.label || '04:00 م'}</span>
                <span className="text-xs font-sans text-slate-300 font-normal">({peakHour.cars_count || 0} سيارات)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                مبيعات الذروة: <b className="text-white font-mono">{Number(peakHour.total_sales || 0).toLocaleString()} ر.ي</b>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[11px] font-bold text-slate-400">متوسط قيمة الفاتورة للسيارة:</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                {avgTicket.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي / سيارة</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                معدل إنفاق العميل الإجمالي في الزيارة
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[11px] font-bold text-slate-400">متوسط إيراد الخدمات للسيارة:</div>
              <div className="text-xl font-black font-mono text-purple-300 mt-1">
                {avgServices.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي / سيارة</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                معدل رسوم غيار الزيت والتشحيم والرقع
              </div>
            </div>
          </div>

          {/* Hourly Timeline Heatmap Bars */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>توزيع استقبال السيارات على مدار اليوم (Heatmap):</span>
              <span className="text-[11px] text-slate-400 font-mono">الارتفاع يعكس كثافة السيارات</span>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-17 gap-1.5 items-end h-28 pt-4 pb-1 px-1 bg-slate-950/70 rounded-2xl border border-white/10 overflow-x-auto">
              {filteredTimeline.map((item) => {
                const isPeak = item.cars_count > 0 && item.hour_str === peakHour.hour_str;
                const heightPct = item.cars_count > 0 ? Math.max(15, Math.round((item.cars_count / maxTimelineCars) * 100)) : 6;
                return (
                  <div
                    key={item.hour}
                    className="flex flex-col items-center justify-end h-full group relative"
                    title={`${item.label}: ${item.cars_count} سيارة (${Number(item.total_sales).toLocaleString()} ر.ي)`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg border border-white/20 whitespace-nowrap z-20 shadow-xl">
                      {item.cars_count} سيارة ({Number(item.total_sales).toLocaleString()} ر.ي)
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isPeak
                          ? 'bg-gradient-to-t from-amber-500 to-yellow-400 shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
                          : item.cars_count > 0
                          ? 'bg-blue-500/60 hover:bg-blue-400'
                          : 'bg-slate-800/40'
                      }`}
                    />
                    <div className="text-[9px] font-mono text-slate-400 mt-1 truncate w-full text-center">
                      {String(item.hour % 12 === 0 ? 12 : item.hour % 12)}
                      <span className="text-[7px] text-slate-500">{item.hour < 12 ? 'ص' : 'م'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Apple Health/Stocks Style KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Net Cash Drawer 1101 */}
          <div className="apple-glass-card rounded-3xl p-5 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">رصيد الصندوق النقدي (1101):</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                💵
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {liveDrawerBal.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-bold">+{cash_register.total_cash_inflow.toLocaleString()} داخل</span>
              <span>&bull;</span>
              <span className="text-rose-400 font-bold">-{cash_register.total_cash_outflow.toLocaleString()} خارج</span>
            </div>
          </div>

          {/* Card 2: Revenue Split (Goods vs Services) */}
          <div className="apple-glass-card rounded-3xl p-5 border border-blue-500/30 shadow-xl shadow-blue-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">صافي المبيعات والإيرادات:</span>
              <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                📈
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {summary.total_net_sales.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>بضائع: <b className="text-white">{goodsRev.toLocaleString()}</b></span>
              <span>خدمات: <b className="text-purple-300">{servRev.toLocaleString()}</b></span>
            </div>
          </div>

          {/* Card 3: E-Wallets */}
          <div className="apple-glass-card rounded-3xl p-5 border border-purple-500/30 shadow-xl shadow-purple-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">المحافظ الإلكترونية:</span>
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                📱
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-purple-300">
              {payment_methods_breakdown.e_wallets.total.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              كريمي: {payment_methods_breakdown.e_wallets.kuraimi.toLocaleString()} ر.ي &bull; جيب: {payment_methods_breakdown.e_wallets.jeeb.toLocaleString()} ر.ي
            </div>
          </div>

          {/* Card 4: New Debts & Collections */}
          <div className="apple-glass-card rounded-3xl p-5 border border-amber-500/30 shadow-xl shadow-amber-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">مبيعات الآجل والتحصيلات:</span>
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                📝
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {summary.total_new_debts.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي آجل</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>تحصيل ديون: <b className="text-emerald-400 font-mono">+{cash_register.inflow_cash_debt_collected.toLocaleString()}</b></span>
            </div>
          </div>
        </div>

        {/* Formatted Text Preview Block */}
        <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>معاينة نص الرسالة الصادرة لواتساب المالك 2.0:</span>
            </h3>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ النص'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-black">
            {ownerBriefMessage}
          </pre>
        </div>

        {/* Breakdown Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Oil & Filter Quantities */}
          <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Droplets className="w-4 h-4 text-amber-400" />
              <span>حركة عبوات الزيوت والفلاتر اليومية:</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <div className="text-slate-400">عبوة 4 لتر</div>
                <div className="text-xl font-mono font-black text-amber-400 mt-1">
                  {oil_sales.packs_summary['4L']}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <div className="text-slate-400">عبوة 1 لتر</div>
                <div className="text-xl font-mono font-black text-amber-400 mt-1">
                  {oil_sales.packs_summary['1L']}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <div className="text-slate-400">عبوة 5 لتر</div>
                <div className="text-xl font-mono font-black text-amber-400 mt-1">
                  {oil_sales.packs_summary['5L']}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>فلاتر زيت مباعة:</span>
                <span className="font-mono font-bold text-emerald-400">{oilFiltersCount} قطعة</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>فلاتر هواء مباعة:</span>
                <span className="font-mono font-bold text-emerald-400">{airFiltersCount} قطعة</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>فلاتر مكيف مباعة:</span>
                <span className="font-mono font-bold text-emerald-400">{cabinFiltersCount} قطعة</span>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>نواقص المخزن الحرجة ({low_stock_alerts.length}):</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {low_stock_alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-400">المخزون كافي ولا توجد نواقص</div>
              ) : (
                low_stock_alerts.map((ls) => (
                  <div
                    key={ls.id}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-extrabold text-white text-xs">{ls.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ls.brand} &bull; {ls.pack_size}</div>
                    </div>
                    <div className="text-left font-mono font-bold text-rose-400">
                      متبقي: {ls.stock_qty} (حد الأمان {ls.min_stock_alert})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Printable Document Structure (Visible ONLY in @media print) */}
      <div className="hidden print:block text-black bg-white p-6 font-sans">
        {printLayout === 'thermal80' ? (
          /* THERMAL 80MM RECEIPT LAYOUT */
          <div className="w-[72mm] mx-auto text-xs leading-tight font-mono space-y-2">
            <div className="text-center border-b pb-2">
              <div className="font-black text-sm">{settings.shopName}</div>
              <div className="text-[10px] text-gray-600">{settings.address} &bull; هاتف: {settings.shopPhone}</div>
              <div className="font-bold mt-1 text-[11px]">إيصال إغلاق الصندوق اليومي</div>
              <div className="text-[10px] text-gray-500">{reportDate}</div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>السيارات المخدومة:</span>
                <span className="font-bold">{summary.total_cars_served}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي الفواتير:</span>
                <span className="font-bold">{summary.total_invoices}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>إجمالي المبيعات:</span>
                <span>{summary.total_net_sales.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 pr-2">
                <span>- مبيعات بضائع:</span>
                <span>{goodsRev.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 pr-2">
                <span>- إيرادات خدمات:</span>
                <span>{servRev.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 pr-2">
                <span>- ساعة الذروة:</span>
                <span>{peakHour.label} ({peakHour.cars_count} سيارات)</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 pr-2">
                <span>- معدل الفاتورة:</span>
                <span>{avgTicket.toLocaleString()} ر.ي / سيارة</span>
              </div>
            </div>

            <div className="border-t pt-1 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>مقبوضات كاش:</span>
                <span className="font-bold">+{cash_register.inflow_cash_invoices.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>تحصيل ديون كاش:</span>
                <span className="font-bold">+{cash_register.inflow_cash_debt_collected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>مصاريف نقدية:</span>
                <span>-{transactions_summary.expenses_total.toLocaleString()}</span>
              </div>
              {ownerDrawings > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>مسحوبات مالك (3101):</span>
                  <span>-{ownerDrawings.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-black text-xs">
                <span>رصيد الصندوق (1101):</span>
                <span>{liveDrawerBal.toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="border-t pt-1 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>محافظ إلكترونية:</span>
                <span>{payment_methods_breakdown.e_wallets.total.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between">
                <span>مبيعات آجل (ديون):</span>
                <span>{summary.total_new_debts.toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="border-t pt-2 text-center text-[10px] space-y-4">
              <div>توقيع الكاشير: ........................</div>
              <div className="text-[9px] text-gray-400">طُبع بتاريخ {new Date().toLocaleString('ar-YE')}</div>
            </div>
          </div>
        ) : (
          /* FORMAL A4 AUDIT REPORT LAYOUT */
          <div className="max-w-4xl mx-auto space-y-4 text-xs font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h1 className="text-lg font-black">{settings.shopName}</h1>
                <div className="text-gray-600 text-[11px]">{settings.address} &bull; هاتف: {settings.shopPhone}</div>
                <div className="text-xs font-bold text-gray-800 mt-1">تقرير التدقيق والإغلاق المالي اليومي للإدارة</div>
              </div>
              <div className="text-left font-mono text-xs">
                <div>التاريخ: <b>{reportDate}</b></div>
                <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</div>
              </div>
            </div>

            {/* Overview Table */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="border p-2 rounded">
                <div className="text-gray-600">السيارات المخدومة</div>
                <div className="text-base font-bold">{summary.total_cars_served}</div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-gray-600">صافي المبيعات</div>
                <div className="text-base font-bold">{summary.total_net_sales.toLocaleString()} ر.ي</div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-gray-600">رصيد الصندوق (1101)</div>
                <div className="text-base font-bold">{liveDrawerBal.toLocaleString()} ر.ي</div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-gray-600">المحافظ الإلكترونية</div>
                <div className="text-base font-bold">{payment_methods_breakdown.e_wallets.total.toLocaleString()} ر.ي</div>
              </div>
            </div>

            {/* Financial Details Table */}
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-400">
                  <th className="border border-gray-400 p-2 text-right">البيان المالي</th>
                  <th className="border border-gray-400 p-2 text-left font-mono">المبلغ (ريال يمني)</th>
                  <th className="border border-gray-400 p-2 text-right">ملاحظات توضيحية</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold">مبيعات الزيوت والقطع (حساب 4101)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">{goodsRev.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2 text-gray-600">إجمالي أصناف المخزون المباعة</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold">إيرادات الخدمات والمصنعية (حساب 4201)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">{servRev.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2 text-gray-600">أجور خدمات الغيار والتشحيم والرقع</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2">مقبوضات كاش من فواتير اليوم</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">{cash_register.inflow_cash_invoices.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2 text-gray-600">نقدية داخلة للصندوق</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2">تحصيل ديون سابقة (سندات قبض RV)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">{cash_register.inflow_cash_debt_collected.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2 text-gray-600">تسديدات العملاء المقبوضة كاش</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2">المصاريف التشغيلية (حساب 6109)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">({transactions_summary.expenses_total.toLocaleString()})</td>
                  <td className="border border-gray-400 p-2 text-gray-600">مصاريف الصيانة والتشغيل اليومية</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2">مسحوبات المالك الشخصية (حساب 3101)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">({ownerDrawings.toLocaleString()})</td>
                  <td className="border border-gray-400 p-2 text-gray-600">مسحوبات حقوق ملكية (لا تخصم من ربح التشغيل)</td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-400 p-2">صافي رصيد الصندوق النقدي الدفتري (حساب 1101)</td>
                  <td className="border border-gray-400 p-2 text-left font-mono">{liveDrawerBal.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2">الرصيد المطابق بدفتر الأستاذ العام</td>
                </tr>
              </tbody>
            </table>

            {/* Analytics Summary */}
            <div className="grid grid-cols-2 gap-4 border p-3 rounded text-xs">
              <div>
                <div className="font-bold mb-1">مؤشرات الأداء والكثافة:</div>
                <div>ساعة الذروة: <b>{peakHour.label}</b> ({peakHour.cars_count} سيارات)</div>
                <div>متوسط الفاتورة للسيارة: <b>{avgTicket.toLocaleString()}</b> ر.ي</div>
                <div>متوسط إيراد الخدمات للسيارة: <b>{avgServices.toLocaleString()}</b> ر.ي</div>
              </div>
              <div>
                <div className="font-bold mb-1">حركة عبوات الزيوت والفلاتر:</div>
                <div>عبوات 4 لتر: <b>{oil_sales.packs_summary['4L']}</b> | 1 لتر: <b>{oil_sales.packs_summary['1L']}</b></div>
                <div>فلاتر زيت: <b>{oilFiltersCount}</b> | فلاتر هواء: <b>{airFiltersCount}</b></div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div className="border-t border-black pt-2">
                <div className="font-bold">أمين الصندوق / الكاشير</div>
                <div className="mt-6 text-gray-400">التوقيع: .....................</div>
              </div>
              <div className="border-t border-black pt-2">
                <div className="font-bold">المحاسب المالي</div>
                <div className="mt-6 text-gray-400">التوقيع: .....................</div>
              </div>
              <div className="border-t border-black pt-2">
                <div className="font-bold">اعتماد الإدارة / مالك المركز</div>
                <div className="mt-6 text-gray-400">التوقيع: .....................</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shift Handover Modal */}
      {showShiftModal && (
        <ShiftHandoverModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          currentShift={currentShiftData}
          onShiftClosed={() => {
            fetchCurrentShift();
            fetchReport(reportDate);
          }}
        />
      )}
    </div>
  );
}
