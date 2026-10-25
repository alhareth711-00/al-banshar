import React, { useState } from 'react';
import { X, Star, Check, Search, Plus, RotateCcw } from 'lucide-react';
import { saveQuickGridItemIds } from '../utils/settings';

export default function QuickGridConfigModal({ isOpen, onClose, inventory = [], currentPinnedIds = [], onSave }) {
  const [pinnedIds, setPinnedIds] = useState(currentPinnedIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'service', label: '🔧 خدمات ورقع' },
    { id: 'oil', label: '🛢️ زيوت محركات' },
    { id: 'filter', label: '💨 فلاتر' },
    { id: 'battery', label: '🔋 بطاريات وكفرات' },
    { id: 'accessory', label: '💧 سوائل ومستلزمات' },
  ];

  const filteredItems = inventory.filter((item) => {
    if (activeCategory !== 'all') {
      if (activeCategory === 'battery' && item.category !== 'battery' && item.category !== 'tire') return false;
      if (activeCategory !== 'battery' && item.category !== activeCategory && item.item_type !== activeCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchBrand = (item.brand || '').toLowerCase().includes(q);
      const matchVisc = (item.viscosity || '').toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchVisc) return false;
    }
    return true;
  });

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = () => {
    saveQuickGridItemIds(pinnedIds);
    if (onSave) onSave(pinnedIds);
    onClose();
  };

  const handleResetDefaults = () => {
    saveQuickGridItemIds(null);
    if (onSave) onSave(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-400/40" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">تخصيص شبكة الأصناف السريعة</h3>
              <p className="text-xs text-slate-400">
                حدد وثبّت الأصناف والخدمات التي تريد ظهورها في واجهة الفاتورة السريعة بنقرة واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-white/10 bg-slate-900/60 flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث عن صنف لتثبيته (اسم، ماركة، لزوجة)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[42px] px-3.5 pr-9 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 font-bold text-xs focus:outline-none focus:border-amber-400"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  activeCategory === c.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected count info bar */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-white/5 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-slate-300 font-bold">
            تم تثبيت <span className="text-amber-400 font-mono font-black">{pinnedIds.length}</span> أصناف في الشبكة السريعة
          </span>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-slate-400 hover:text-rose-400 text-[11px] font-bold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>استعادة التثبيت الافتراضي للمركز</span>
          </button>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 custom-scrollbar">
          {filteredItems.map((item) => {
            const isPinned = pinnedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePin(item.id)}
                className={`p-3 rounded-2xl border text-right transition flex items-center justify-between gap-3 active:scale-[0.98] ${
                  isPinned
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:border-white/15'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-xs truncate flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.viscosity && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {item.viscosity}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    <span className="text-amber-400 font-bold">{Number(item.sell_price).toLocaleString()} ر.ي</span>
                    <span>&bull;</span>
                    <span>{item.item_type === 'service' ? 'خدمة ورشة' : `المتوفر: ${item.stock_qty}`}</span>
                  </div>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition flex-shrink-0 ${
                    isPinned
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                      : 'bg-slate-800 text-slate-500 border-white/10'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isPinned ? 'fill-slate-950 text-slate-950' : ''}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>حفظ واعتماد الأصناف السريعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
