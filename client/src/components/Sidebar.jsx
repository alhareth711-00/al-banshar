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
  // 3 Live Variants Switcher (Calm | Tactile Kiosk | Apple Glass)
  const [sidebarStyle, setSidebarStyle] = React.useState(() => {
    return localStorage.getItem('ql_sidebar_style') || 'tactile';
  });

  const handleSetStyle = (style) => {
    setSidebarStyle(style);
    localStorage.setItem('ql_sidebar_style', style);
  };

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
        <div className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl bg-slate-900/90 border border-slate-800">
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

        {/* Live Variant Selector Pills (اختيار مباشر بين الأشكال الثلاثة) */}
        <div className="hidden lg:flex items-center justify-between p-1 mb-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] font-bold px-1">الشكل:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSetStyle('calm')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                sidebarStyle === 'calm'
                  ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="النمط الصناعي الهادئ"
            >
              1. هادئ
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('tactile')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition ${
                sidebarStyle === 'tactile'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="النمط اللمسي البارز عالي التباين"
            >
              2. لمسي بارز
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('glass')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                sidebarStyle === 'glass'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="نمط آبل الزجاجي الفاخر"
            >
              3. زجاجي
            </button>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Compute dynamic button styling based on chosen variant
            let buttonClass = 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent';
            let iconBoxClass = 'bg-slate-800/80 text-slate-400 group-hover:text-white';

            if (sidebarStyle === 'tactile') {
              if (isActive) {
                buttonClass = 'bg-amber-400 text-slate-950 font-black border-2 border-amber-300 shadow-lg shadow-amber-400/20';
                iconBoxClass = 'bg-slate-950 text-amber-400 font-black';
              } else {
                buttonClass = 'bg-slate-900/90 text-white hover:bg-slate-800 font-bold border border-white/10';
                iconBoxClass = 'bg-slate-800 text-slate-200 group-hover:text-white';
              }
            } else if (sidebarStyle === 'glass') {
              if (isActive) {
                buttonClass = 'apple-glass bg-gradient-to-r from-amber-500/25 to-orange-500/15 text-amber-300 font-extrabold border border-amber-400/40 shadow-lg';
                iconBoxClass = 'bg-amber-400/20 text-amber-300 border border-amber-400/30';
              } else {
                buttonClass = 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent';
                iconBoxClass = 'bg-white/5 text-slate-300 group-hover:text-white';
              }
            } else {
              // calm
              if (isActive) {
                buttonClass = 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30 shadow-sm';
                iconBoxClass = 'bg-amber-400 text-slate-950 font-bold';
              }
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[50px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-right group relative tap-bounce ${buttonClass}`}
              >
                {isActive && sidebarStyle !== 'tactile' && (
                  <span className="absolute -right-1 top-2.5 bottom-2.5 w-1 rounded-full bg-amber-400" />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconBoxClass}`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                <span className={`hidden lg:block flex-1 truncate ${sidebarStyle === 'tactile' ? 'text-sm font-bold' : 'text-sm'}`}>
                  {item.label}
                </span>

                {item.id === 'vault' && !isOwnerMode && (
                  <span className="hidden lg:inline-flex p-1 rounded bg-slate-800 text-amber-400 border border-slate-700" title="محمي برمز المالك">
                    <Lock className="w-3 h-3" />
                  </span>
                )}

                {item.badge !== null && (
                  <span className={`hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs rounded-full font-bold font-mono tabular-nums ${
                    sidebarStyle === 'tactile' && isActive
                      ? 'bg-slate-950 text-white font-black'
                      : 'bg-rose-500/90 text-white animate-calm-pulse'
                  }`}>
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