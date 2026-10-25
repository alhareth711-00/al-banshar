import React, { useState, useEffect } from 'react';
import { X, Edit2, Plus, Trash2, Check, Tag, AlertCircle } from 'lucide-react';

export default function ExpenseCategoriesModal({ isOpen, onClose, onCategoriesUpdated }) {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 3 Live Variants Switcher (1. Tactical Industrial | 2. Tactile Touch Kiosk | 3. Executive Apple Glass)
  const [modalStyle, setModalStyle] = useState(() => {
    return localStorage.getItem('ql_cat_modal_style') || 'glass';
  });

  const handleSetStyle = (style) => {
    setModalStyle(style);
    localStorage.setItem('ql_cat_modal_style', style);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expense-categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل في إضافة التصنيف');

      setNewCatName('');
      fetchCategories();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`/api/expense-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل في تحديث التصنيف');

      setEditingId(null);
      fetchCategories();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        if (onCategoriesUpdated) onCategoriesUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 transition-all ${
          modalStyle === 'tactical'
            ? 'rounded-2xl border-2 border-slate-700 bg-slate-950'
            : modalStyle === 'touch'
            ? 'rounded-3xl border-2 border-emerald-500/40 bg-slate-950'
            : 'apple-glass border border-white/20 rounded-3xl relative backdrop-blur-2xl'
        }`}
      >
        {/* Style 3 Top Neon Gradient Stripe */}
        {modalStyle === 'glass' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-500" />
        )}

        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            modalStyle === 'tactical'
              ? 'bg-slate-900 border-slate-800'
              : modalStyle === 'touch'
              ? 'bg-slate-900/90 border-white/10'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                modalStyle === 'tactical'
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : modalStyle === 'touch'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}
            >
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إدارة وتعديل تصنيفات المصاريف</h3>
              <p className="text-xs text-slate-400">تخصيص بنود المصاريف لتقارير إغلاق الوردية</p>
            </div>
          </div>

          {/* Switcher & Close Button */}
          <div className="flex items-center gap-2">
            {/* Live Modal Style Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-white/10 text-xs">
              <span className="text-slate-400 text-[10px] font-bold px-1">الشكل:</span>
              <button
                type="button"
                onClick={() => handleSetStyle('tactical')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition tap-bounce ${
                  modalStyle === 'tactical'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title="الشكل 1: كلاسيكي تكتيكي عالي التباين"
              >
                1. تكتيكي
              </button>
              <button
                type="button"
                onClick={() => handleSetStyle('touch')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition tap-bounce ${
                  modalStyle === 'touch'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title="الشكل 2: بطاقات لمسية للكيوسك"
              >
                2. لمسي
              </button>
              <button
                type="button"
                onClick={() => handleSetStyle('glass')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition tap-bounce ${
                  modalStyle === 'glass'
                    ? 'bg-purple-500 text-white font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title="الشكل 3: نمط آبل الزجاجي الفاخر"
              >
                3. زجاجي
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Category Input Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="أدخل اسم تصنيف جديد (مثال: إيجار المحل، بترول ماطور)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className={`flex-1 transition-all text-xs text-white placeholder-slate-500 focus:outline-none ${
                modalStyle === 'tactical'
                  ? 'min-h-[44px] px-3.5 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400'
                  : modalStyle === 'touch'
                  ? 'min-h-[48px] px-4 rounded-xl bg-slate-900 border-2 border-emerald-500/30 focus:border-emerald-400 font-bold'
                  : 'min-h-[44px] px-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400'
              }`}
            />
            <button
              type="submit"
              className={`font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                modalStyle === 'tactical'
                  ? 'min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                  : modalStyle === 'touch'
                  ? 'min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/30 font-black'
                  : 'min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/25'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`transition-all flex items-center justify-between gap-2 ${
                    modalStyle === 'tactical'
                      ? 'p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700'
                      : modalStyle === 'touch'
                      ? 'p-3.5 rounded-2xl bg-slate-900 border-2 border-white/10 hover:border-emerald-500/40 min-h-[50px]'
                      : 'p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold ${
                          modalStyle === 'tactical'
                            ? 'bg-slate-950 border border-amber-400'
                            : modalStyle === 'touch'
                            ? 'bg-slate-950 border-2 border-emerald-400'
                            : 'bg-slate-950 border border-purple-400'
                        }`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center font-bold"
                        title="حفظ"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
                        title="إلغاء"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        {modalStyle === 'tactical' ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        ) : modalStyle === 'touch' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        ) : (
                          <Tag className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        )}

                        <span className={`text-white text-xs ${modalStyle === 'touch' ? 'font-black' : 'font-extrabold'}`}>
                          {cat.name}
                        </span>

                        {cat.is_system === 1 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                              modalStyle === 'tactical'
                                ? 'bg-slate-800 text-slate-400'
                                : modalStyle === 'touch'
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                            }`}
                          >
                            افتراضي
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className={`rounded-xl flex items-center justify-center transition ${
                            modalStyle === 'touch'
                              ? 'w-9 h-9 bg-slate-800 hover:bg-slate-700 text-white'
                              : 'w-8 h-8 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                          }`}
                          title="تعديل اسم التصنيف"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat.is_system !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id)}
                            className={`rounded-xl flex items-center justify-center transition ${
                              modalStyle === 'touch'
                                ? 'w-9 h-9 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                                : 'w-8 h-8 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                            }`}
                            title="حذف التصنيف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t text-left flex items-center justify-between ${
            modalStyle === 'tactical'
              ? 'bg-slate-900 border-slate-800'
              : modalStyle === 'touch'
              ? 'bg-slate-900 border-white/10'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <span className="text-[11px] text-slate-500 font-medium">
            إجمالي التصنيفات: {categories.length} بند
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[40px] px-6 rounded-xl font-bold text-xs transition active:scale-95 ${
              modalStyle === 'touch'
                ? 'bg-slate-800 hover:bg-slate-700 text-white min-h-[44px]'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
