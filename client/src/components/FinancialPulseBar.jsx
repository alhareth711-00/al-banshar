import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Package,
  Receipt,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Wrench,
  Sparkles,
  RefreshCw,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Car,
  ShieldCheck,
  Droplets,
} from 'lucide-react';

export default function FinancialPulseBar({
  onOpenStatement,
  onOpenBayProfitability,
  refreshTrigger,
  isOwnerMode = false,
  onToggleOwnerMode,
}) {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLiquidModal, setShowLiquidModal] = useState(false);

  const fetchPulse = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/financial-pulse');
      const data = await res.json();
      if (data.success) {
        setPulse(data.data);
      }
    } catch (err) {
      console.error('Error fetching financial pulse:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
  }, [refreshTrigger]);

  if (!pulse && loading) {
    return (
      <div className="w-full h-10 apple-glass rounded-2xl mb-3 flex items-center justify-center px-4 text-xs text-slate-400">
        <RefreshCw className="w-3.5 h-3.5 animate-spin ml-2 text-amber-400" />
        <span>جاري قراءة النبض المالي للمركز...</span>
      </div>
    );
  }

  if (!pulse) return null;

  const { liquid, inventory, debts, today } = pulse;

  return (
    <div className="w-full mb-3 flex-shrink-0 select-none">
      {/* Top Header Bar with Quick Navigation Actions */}
      <div className="apple-glass rounded-2xl p-2.5 border border-white/10 flex items-center justify-between gap-3 shadow-lg">
        {/* Left / Title area */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Sparkles className="w-4 h-4 stroke-[2.4]" />
          </div>
          <span className="text-xs font-black text-white tracking-wide hidden sm:inline">
            النبض المالي والتشغيلي الحي
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>النظام متصل ويعمل</span>
          </span>
        </div>

        {/* Center / Action Pills */}
        <div className="flex items-center gap-2">
          {/* Smart Cashier / Owner Mode Toggle Button (الجزء الأول) */}
          <button
            type="button"
            onClick={onToggleOwnerMode}
            className={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm border ${
              isOwnerMode
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
            }`}
            title={isOwnerMode ? 'العودة إلى وضع الكاشير الآمن وإخفاء الأرباح' : 'إدخال رمز PIN لفتح صلاحيات المدير'}
          >
            {isOwnerMode ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>🔓 وضع المدير (إغلاق سريع)</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>🔒 وضع الكاشير (فتح الإدارة)</span>
              </>
            )}
          </button>

          {/* Owner Only Actions: Statement of Account & Bay Profitability */}
          {isOwnerMode && (
            <>
              <button
                type="button"
                onClick={onOpenStatement}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95"
                title="فتح محرك كشوفات الحساب والطباعة"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>كشف حساب تفصيلي 🧾</span>
              </button>

              <button
                type="button"
                onClick={onOpenBayProfitability}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95"
                title="عرض نشاط وحركة سيارات الحفرة ومبيعات الزيوت"
              >
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                <span>حركة سيارات الحفرة 🚗</span>
              </button>
            </>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchPulse}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95 border border-white/5"
            title="تحديث الأرصدة اللحظية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/5"
            title={isExpanded ? 'تصغير الشريط' : 'توسيع الشريط'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded 4 KPI Pulse Cards */}
      {isExpanded && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2 animate-in fade-in duration-200">
          {isOwnerMode ? (
            /* ============================================================ */
            /* 1. OWNER MODE FULL FINANCIAL MANAGEMENT METRICS (وضع المالك) */
            /* ============================================================ */
            <>
              {/* Card 1: Liquid Cash & Wallets */}
              <div
                onClick={() => setShowLiquidModal(true)}
                className="apple-glass-card rounded-2xl p-3 border border-emerald-500/25 hover:border-emerald-500/50 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>النقدية والمحافظ (خزينة):</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-emerald-400 mt-0.5 flex items-baseline gap-1">
                  <span>{liquid.total.toLocaleString()}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center justify-between">
                  <span>الدرج: {liquid.cash_drawer.toLocaleString()} ر.ي</span>
                  <span className="text-emerald-400 text-[9px] font-bold group-hover:underline">التفاصيل &larr;</span>
                </div>
              </div>

              {/* Card 2: Inventory Value at WAC Cost */}
              <div className="apple-glass-card rounded-2xl p-3 border border-blue-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>قيمة المخزون بالتكلفة (WAC):</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-blue-400 mt-0.5 flex items-baseline gap-1">
                  <span>{inventory.cost_value.toLocaleString()}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center justify-between">
                  <span>البيع: {inventory.sell_value.toLocaleString()} ر.ي</span>
                  {inventory.low_stock_count > 0 && (
                    <span className="text-rose-400 text-[10px] font-bold">⚠️ {inventory.low_stock_count} نواقص</span>
                  )}
                </div>
              </div>

              {/* Card 3: Outstanding Customer Debts */}
              <div
                onClick={onOpenStatement}
                className="apple-glass-card rounded-2xl p-3 border border-amber-500/25 hover:border-amber-500/50 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>ديون الزبائن المستحقة:</span>
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-amber-400 mt-0.5 flex items-baseline gap-1">
                  <span>{debts.total_customer_debts.toLocaleString()}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center justify-between">
                  <span>عدد المدينين: {debts.debtors_count} عميل</span>
                  <span className="text-amber-400 text-[9px] font-bold group-hover:underline">كشف الحساب &larr;</span>
                </div>
              </div>

              {/* Card 4: Today's Profit & Pure Services */}
              <div className="apple-glass-card rounded-2xl p-3 border border-purple-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>أرباح وخدمات اليوم:</span>
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-white mt-0.5 flex items-baseline gap-1">
                  <span className={today.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {today.net_profit.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي صافي</span>
                </div>
                <div className="text-[10px] text-purple-300 mt-0.5 truncate flex items-center justify-between">
                  <span>إيراد خدمات: {today.pure_labor_revenue.toLocaleString()} ر.ي</span>
                  <span className="text-slate-400 text-[10px]">{today.total_invoices} سيارات</span>
                </div>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* 2. SAFE CASHIER / WORKER OPERATIONAL METRICS (وضع الكاشير الآمن) */
            /* ============================================================ */
            <>
              {/* Worker Card 1: Shift Total Sales */}
              <div className="apple-glass-card rounded-2xl p-3 border border-emerald-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>مبيعات اليوم الإجمالية:</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-emerald-400 mt-0.5 flex items-baseline gap-1">
                  <span>{((today.goods_sales || 0) + (today.pure_labor_revenue || 0)).toLocaleString()}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  القطع: {(today.goods_sales || 0).toLocaleString()} • الخدمات: {(today.pure_labor_revenue || 0).toLocaleString()}
                </div>
              </div>

              {/* Worker Card 2: Cars Served Today */}
              <div className="apple-glass-card rounded-2xl p-3 border border-amber-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>سيارات مخدومة اليوم:</span>
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-amber-400 mt-0.5 flex items-baseline gap-1">
                  <span>{today.total_invoices || 0}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">سيارات منجزة</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  أداء تشغيلي مستمر للوردية 🚗
                </div>
              </div>

              {/* Worker Card 3: Low Stock Alerts */}
              <div className="apple-glass-card rounded-2xl p-3 border border-rose-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>نواقص المخزن للمتابعة:</span>
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-rose-400 mt-0.5 flex items-baseline gap-1">
                  <span>{inventory.low_stock_count || 0}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">أصناف قاربت النفاد</span>
                </div>
                <div className="text-[10px] text-rose-300 mt-0.5 truncate">
                  {inventory.low_stock_count > 0 ? '⚠️ يلزم تنبيه الإدارة لطلب بضاعة' : 'المخزون متوفر ومستقر ✅'}
                </div>
              </div>

              {/* Worker Card 4: Oils & Services Sales */}
              <div className="apple-glass-card rounded-2xl p-3 border border-teal-500/25">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                  <span>مبيعات الزيوت والخدمات:</span>
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base lg:text-lg font-black font-mono text-teal-400 mt-0.5 flex items-baseline gap-1">
                  <span>{((today.goods_sales || 0) + (today.pure_labor_revenue || 0)).toLocaleString()}</span>
                  <span className="text-[10px] font-sans text-slate-400 font-normal">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  إجمالي مبيعات اليوم للوردية 🛢️
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail Modal for Liquid Cash Breakdown */}
      {showLiquidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-white text-sm">تفصيل السيولة النقدية والمحافظ</h3>
              </div>
              <button onClick={() => setShowLiquidModal(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">إجمالي النقدية والمحافظ:</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {liquid.total.toLocaleString()} ر.ي
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {liquid.accounts.map((acc) => (
                  <div
                    key={acc.code}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 text-[11px]">{acc.code}</span>
                        <span>{acc.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {acc.sub_type === 'cash_drawer' ? 'درج الكاشير' : 'حساب بنكي / محفظة'}
                      </div>
                    </div>
                    <div className="text-left font-mono font-black text-slate-200">
                      {Number(acc.balance).toLocaleString()} ر.ي
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowLiquidModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
