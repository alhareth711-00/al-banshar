import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Package,
  Building2,
  Car,
  Zap,
  ArrowRight,
  CornerDownLeft,
  X,
  Layers,
  ShieldCheck,
  BookOpen,
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  Tag,
} from 'lucide-react';
import { normalizeArabic } from './SearchableCombobox';

export default function GlobalCommandPalette({
  isOpen,
  onClose,
  inventory = [],
  onNavigateTab,
  onSelectVehicle,
  onOpenStatement,
  onOpenSettings,
  onOpenUserGuide,
  onToggleOwnerMode,
}) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'items' | 'suppliers' | 'vehicles' | 'actions'
  const [suppliers, setSuppliers] = useState([]);
  const [vehicleResults, setVehicleResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  // Load suppliers on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers');
        const data = await res.json();
        if (data.success) {
          setSuppliers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch suppliers in command palette:', err);
      }
    };
    fetchSuppliers();
  }, [isOpen]);

  // Live Vehicle search when query has 2+ characters
  useEffect(() => {
    if (!isOpen) return;
    const cleanQ = query.trim();
    if (cleanQ.length < 2) {
      setVehicleResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(cleanQ)}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setVehicleResults(data.data || []);
        }
      } catch (err) {
        console.error('Failed to search vehicles in palette:', err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Base System Actions
  const systemActions = useMemo(() => [
    {
      id: 'act-pos',
      category: 'actions',
      title: 'نقطة البيع السريعة (POS)',
      subtitle: 'فتح شاشة فوترة الزيوت وخدمات الحفر والسيارات',
      icon: Receipt,
      iconColor: 'text-amber-400 bg-amber-500/20',
      action: () => onNavigateTab?.('pos'),
    },
    {
      id: 'act-inv',
      category: 'actions',
      title: 'إدارة المخزون والكتالوج المتخصص',
      subtitle: 'جرد الزيوت، الفلاتر، الإطارات والبطاريات',
      icon: Package,
      iconColor: 'text-emerald-400 bg-emerald-500/20',
      action: () => onNavigateTab?.('inventory'),
    },
    {
      id: 'act-pur',
      category: 'actions',
      title: 'المشتريات والموردين',
      subtitle: 'فواتير الشراء، التوريد المخزني، وسندات دفع الموردين',
      icon: Building2,
      iconColor: 'text-sky-400 bg-sky-500/20',
      action: () => onNavigateTab?.('purchases'),
    },
    {
      id: 'act-vouchers',
      category: 'actions',
      title: 'سندات القبض والصرف (Vouchers Hub)',
      subtitle: 'إصدار وتعديل سندات القبض والصرف والطباعة والواتساب',
      icon: Receipt,
      iconColor: 'text-emerald-400 bg-emerald-500/20',
      action: () => onNavigateTab?.('vouchers'),
    },
    {
      id: 'act-vault',
      category: 'actions',
      title: 'الخزينة والمحاسبة المالية (Vault Hub)',
      subtitle: 'حركة النقدية، المصروفات، والقيود اليومية',
      icon: DollarSign,
      iconColor: 'text-yellow-400 bg-yellow-500/20',
      action: () => onNavigateTab?.('vault'),
    },
    {
      id: 'act-radar',
      category: 'actions',
      title: 'رادار التذكير ونبض العملاء',
      subtitle: 'متابعة مواعيد تغيير الزيت والعملاء المتأخرين',
      icon: Clock,
      iconColor: 'text-rose-400 bg-rose-500/20',
      action: () => onNavigateTab?.('radar'),
    },
    {
      id: 'act-stmt',
      category: 'actions',
      title: 'كشف الحساب والديون الرسمية',
      subtitle: 'استعراض أو طباعة كشف حساب عميل أو مورد',
      icon: Layers,
      iconColor: 'text-indigo-400 bg-indigo-500/20',
      action: () => onOpenStatement?.('customer', null),
    },
    {
      id: 'act-guide',
      category: 'actions',
      title: 'دليل التشغيل الميداني (F1)',
      subtitle: 'كتيب استخدام النظام وشرح المميزات خطوة بخطوة',
      icon: BookOpen,
      iconColor: 'text-teal-400 bg-teal-500/20',
      action: () => onOpenUserGuide?.(),
    },
    {
      id: 'act-owner',
      category: 'actions',
      title: 'التبديل بين وضع الكاشير / المدير المالي',
      subtitle: 'قفل أو كشف الأسعار والأرباح برمز PIN',
      icon: ShieldCheck,
      iconColor: 'text-amber-300 bg-amber-500/20',
      action: () => onToggleOwnerMode?.(),
    },
  ], [onNavigateTab, onOpenStatement, onOpenUserGuide, onToggleOwnerMode]);

  // Aggregate and filter all results
  const allResults = useMemo(() => {
    const normQ = normalizeArabic(query);
    const results = [];

    // 1. Actions Filter
    if (filterType === 'all' || filterType === 'actions') {
      const matchedActions = !normQ
        ? systemActions
        : systemActions.filter((a) =>
            normalizeArabic(a.title).includes(normQ) || normalizeArabic(a.subtitle).includes(normQ)
          );
      matchedActions.forEach((a) => results.push({ type: 'action', data: a }));
    }

    // 2. Inventory Items
    if (filterType === 'all' || filterType === 'items') {
      const activeItems = inventory.filter((i) => i.is_active === 1);
      const matchedItems = !normQ
        ? (filterType === 'items' ? activeItems.slice(0, 15) : [])
        : activeItems
            .filter((inv) => {
              return (
                normalizeArabic(inv.name).includes(normQ) ||
                normalizeArabic(inv.brand).includes(normQ) ||
                normalizeArabic(inv.viscosity).includes(normQ) ||
                normalizeArabic(inv.sku).includes(normQ) ||
                normalizeArabic(inv.barcode).includes(normQ) ||
                normalizeArabic(inv.pack_size).includes(normQ)
              );
            })
            .slice(0, 15);

      matchedItems.forEach((inv) =>
        results.push({
          type: 'item',
          data: inv,
          action: () => {
            onNavigateTab?.('inventory');
          },
        })
      );
    }

    // 3. Suppliers
    if (filterType === 'all' || filterType === 'suppliers') {
      const matchedSuppliers = !normQ
        ? (filterType === 'suppliers' ? suppliers.slice(0, 10) : [])
        : suppliers
            .filter((s) => {
              return (
                normalizeArabic(s.name).includes(normQ) ||
                normalizeArabic(s.company_name).includes(normQ) ||
                normalizeArabic(s.phone).includes(normQ) ||
                normalizeArabic(s.agency_brand).includes(normQ)
              );
            })
            .slice(0, 10);

      matchedSuppliers.forEach((s) =>
        results.push({
          type: 'supplier',
          data: s,
          action: () => {
            onOpenStatement?.('supplier', s.id);
          },
        })
      );
    }

    // 4. Vehicles / Customers
    if (filterType === 'all' || filterType === 'vehicles') {
      vehicleResults.slice(0, 8).forEach((v) =>
        results.push({
          type: 'vehicle',
          data: v,
          action: () => {
            onSelectVehicle?.(v);
          },
        })
      );
    }

    return results;
  }, [query, filterType, inventory, suppliers, vehicleResults, systemActions, onNavigateTab, onOpenStatement, onSelectVehicle]);

  // Reset highlighted index on results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [allResults.length, filterType]);

  // Auto-scroll to highlighted item
  useEffect(() => {
    if (resultsContainerRef.current) {
      const el = resultsContainerRef.current.children[highlightedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allResults[highlightedIndex];
      if (selected) {
        onClose();
        if (selected.type === 'action') {
          selected.data.action();
        } else if (selected.action) {
          selected.action();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="bg-slate-950 border border-white/20 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl text-right animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-900/80">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث الشامل: اكتب اسم صنف، لزوجة، ماركة، مورد، رقم لوحة، أو أمر شاشة..."
            className="w-full bg-transparent border-none text-white text-sm font-bold placeholder-slate-500 focus:outline-none"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-white/10 text-[10px] font-mono text-slate-400 border border-white/15">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'items', label: '📦 أصناف المخزن' },
            { id: 'suppliers', label: '🏢 الموردين' },
            { id: 'vehicles', label: '🚗 المركبات والعملاء' },
            { id: 'actions', label: '⚡ أوامر سريعة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 rounded-xl font-bold transition shrink-0 ${
                filterType === tab.id
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Scroll Container */}
        <div ref={resultsContainerRef} className="p-2 overflow-y-auto space-y-1 flex-1 min-h-[240px]">
          {allResults.length > 0 ? (
            allResults.map((item, idx) => {
              const isSelected = highlightedIndex === idx;

              if (item.type === 'action') {
                const act = item.data;
                const IconComponent = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      onClose();
                      act.action();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 text-white font-bold border border-amber-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.iconColor}`}>
                        <IconComponent className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{act.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/10 text-slate-400 font-mono">
                            أمر شاشة
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{act.subtitle}</div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                );
              }

              if (item.type === 'item') {
                const inv = item.data;
                return (
                  <div
                    key={`inv-${inv.id}`}
                    onClick={() => {
                      onClose();
                      item.action();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-white font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{inv.name}</span>
                          {inv.viscosity && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                              {inv.viscosity}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {inv.brand && <span>{inv.brand}</span>}
                          {inv.pack_size && <span>• {inv.pack_size}</span>}
                          {inv.barcode && <span className="font-mono text-[10px]">[{inv.barcode}]</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0 font-mono text-xs">
                      <div className={`${inv.stock_qty <= (inv.min_stock_alert || 5) ? 'text-rose-400' : 'text-emerald-400'} font-bold`}>
                        رصيد: {inv.stock_qty}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {Number(inv.cost_price || 0).toLocaleString()} ر.ي
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === 'supplier') {
                const supp = item.data;
                return (
                  <div
                    key={`supp-${supp.id}`}
                    onClick={() => {
                      onClose();
                      item.action();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-sky-500/20 text-white font-bold border border-sky-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{supp.name}</span>
                          {supp.agency_brand && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300">
                              وكيل {supp.agency_brand}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {supp.company_name && <span>{supp.company_name}</span>}
                          {supp.phone && <span className="font-mono">{supp.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0 font-mono text-xs">
                      {Number(supp.balance_due) > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold">
                          دين: {Number(supp.balance_due).toLocaleString()} ر.ي
                        </span>
                      ) : (
                        <span className="text-emerald-400">حساب خالص</span>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.type === 'vehicle') {
                const v = item.data;
                return (
                  <div
                    key={`veh-${v.id}`}
                    onClick={() => {
                      onClose();
                      item.action();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 text-white font-bold border border-amber-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{v.plate_number || 'لوحة غير مسجلة'}</span>
                          <span className="text-slate-300 font-normal">{v.car_make_model}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>العميل: {v.customer_name}</span>
                          {v.phone && <span className="font-mono">{v.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                        فتح في الكاشير ↵
                      </span>
                    </div>
                  </div>
                );
              }

              return null;
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>لا توجد نتائج مطابقة لبحثك</p>
              <p className="text-[11px] text-slate-500 mt-1">جرب البحث بكلمات أخرى أو تغيير نوع الفلتر</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-900 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↓</kbd>
              <span>للتنقل</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↵ Enter</kbd>
              <span>للاختيار والفتح</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Ctrl + K</kbd>
            <span>لفتح البحث السريع من أي مكان</span>
          </span>
        </div>
      </div>
    </div>
  );
}
