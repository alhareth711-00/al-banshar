import React from 'react';
import {
  Wrench,
  Radio,
  Package,
  ShoppingBag,
  Users,
  FileSpreadsheet,
  Gauge,
  Sparkles,
  Settings,
  Landmark,
  BookOpen,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  radarCount = 0,
  lowStockCount = 0,
  onOpenSettings,
  onOpenUserGuide,
}) {
  const navItems = [
    {
      id: 'pos',
      label: 'نقطة البيع السريعة',
      shortLabel: 'الـ POS',
      icon: Gauge,
      accent: 'from-amber-500 to-orange-500',
      badge: null,
    },
    {
      id: 'radar',
      label: 'رادار التذكير والأساطيل',
      shortLabel: 'الرادار والواتساب',
      icon: Radio,
      accent: 'from-rose-500 to-pink-500',
      badge: radarCount > 0 ? radarCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'inventory',
      label: 'المخزون والعبوات',
      shortLabel: 'المخزون',
      icon: Package,
      accent: 'from-emerald-500 to-teal-500',
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'purchases',
      label: 'المشتريات والموردين',
      shortLabel: 'المشتريات',
      icon: ShoppingBag,
      accent: 'from-cyan-500 to-blue-600',
      badge: null,
    },
    {
      id: 'vault',
      label: 'الخزينة والمحاسبة وسندات القبض',
      shortLabel: 'الخزينة والمحاسبة',
      icon: Landmark,
      accent: 'from-emerald-500 to-teal-600',
      badge: null,
    },
    {
      id: 'workers',
      label: 'العمال والفنيين والرواتب',
      shortLabel: 'العمال والرواتب',
      icon: Users,
      accent: 'from-purple-500 to-indigo-500',
      badge: null,
    },
    {
      id: 'report',
      label: 'إغلاق الوردية وتقرير المالك',
      shortLabel: 'الإغلاق اليومي',
      icon: FileSpreadsheet,
      accent: 'from-blue-500 to-cyan-500',
      badge: null,
    },
  ];

  return (
    <aside className="w-20 lg:w-64 flex-shrink-0 apple-glass border-l border-white/10 flex flex-col justify-between p-3 lg:p-4 z-40 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 flex-shrink-0">
            <Wrench className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="text-sm font-extrabold text-white tracking-tight truncate flex items-center gap-1.5">
              <span>سريع وبنشر</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate">Quick Lube & Tire Touch</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[56px] flex items-center gap-3.5 px-3 py-3 rounded-2xl transition-all duration-200 text-right group relative ${
                  isActive
                    ? 'bg-white/15 text-white shadow-xl shadow-black/30 border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <span className="absolute -right-1 top-3 bottom-3 w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50" />
                )}

                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? `bg-gradient-to-br ${item.accent} text-white shadow-md shadow-black/20`
                      : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>

                <span className="hidden lg:block font-bold text-sm tracking-wide flex-1 truncate">
                  {item.label}
                </span>

                {item.badge !== null && (
                  <span
                    className={`hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] rounded-full font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Mobile Tooltip */}
                <span className="lg:hidden absolute right-16 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & Settings */}
      <div className="pt-3 border-t border-white/10 hidden lg:block space-y-2">
        <button
          type="button"
          onClick={onOpenUserGuide}
          className="w-full px-3 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-300 hover:text-amber-200 flex items-center justify-between text-xs font-bold transition border border-amber-500/30 active:scale-95 shadow-sm"
          title="دليل التشغيل وإجراءات العمل السريعة (F1)"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>دليل التشغيل الشامل 📖</span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">F1</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-between text-xs font-bold transition border border-white/10 active:scale-95"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            <span>إعدادات وهوية المركز ⚙️</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">واتساب</span>
        </button>

        <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="font-semibold text-slate-300">السوق اليمني</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            YER
          </span>
        </div>
      </div>
    </aside>
  );
}