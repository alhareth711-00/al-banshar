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
  Lock,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  radarCount = 0,
  lowStockCount = 0,
  onOpenSettings,
  onOpenUserGuide,
  isOwnerMode = false,
}) {
  const navItems = [
    {
      id: 'pos',
      label: 'نقطة البيع السريعة',
      shortLabel: 'نقطة البيع',
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
    <aside className="w-20 lg:w-64 flex-shrink-0 bg-slate-950/95 border-l border-slate-800/80 flex flex-col justify-between p-3 lg:p-4 z-40 select-none">
      <div>
        {/* Calm Header */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm flex-shrink-0">
            <Wrench className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide truncate">سريع وبنشر</h1>
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">PRO</span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">مركز غيار الزيوت والبناشر</p>
          </div>
        </div>

        {/* Nav Items - Calm & Focused */}
        <nav className="space-y-1.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[50px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-right group relative tap-bounce ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute -right-1 top-2.5 bottom-2.5 w-1 rounded-full bg-amber-400" />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                <span className="hidden lg:block text-sm flex-1 truncate">
                  {item.label}
                </span>

                {item.id === 'vault' && !isOwnerMode && (
                  <span className="hidden lg:inline-flex p-1 rounded bg-slate-800 text-amber-400 border border-slate-700" title="محمي برمز المالك">
                    <Lock className="w-3 h-3" />
                  </span>
                )}

                {item.badge !== null && (
                  <span className="hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs rounded-full font-bold bg-rose-500/90 text-white font-mono tabular-nums animate-calm-pulse">
                    {item.badge}
                  </span>
                )}

                <span className="lg:hidden absolute right-16 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer - Calm & Clear */}
      <div className="pt-3 border-t border-slate-800 hidden lg:block space-y-2">
        <button
          type="button"
          onClick={onOpenUserGuide}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold tap-bounce border border-slate-800"
          title="دليل التشغيل وإجراءات العمل السريعة (F1)"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>دليل التشغيل الميداني</span>
          </div>
          <span className="text-xs text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">F1</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold tap-bounce border border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>إعدادات النظام</span>
          </div>
          {!isOwnerMode ? (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <span className="text-xs text-slate-400 font-mono">مالك</span>
          )}
        </button>

        <div className="px-3 py-1.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300 font-medium">السوق اليمني</span>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded font-bold">
            YER
          </span>
        </div>
      </div>
    </aside>
  );
}