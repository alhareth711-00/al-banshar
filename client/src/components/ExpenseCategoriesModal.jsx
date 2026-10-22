import React, { useState, useEffect } from 'react';
import { X, Edit2, Plus, Trash2, Check, Tag, AlertCircle } from 'lucide-react';

export default function ExpenseCategoriesModal({ isOpen, onClose, onCategoriesUpdated }) {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إدارة وتعديل تصنيفات المصاريف</h3>
              <p className="text-xs text-slate-400">تخصيص بنود المصاريف لتقارير إغلاق الوردية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Category Input */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="أدخل اسم تصنيف جديد (مثال: إيجار المحل، بترول ماطور)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs flex items-center gap-1 transition"
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
                  className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-2"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-400 text-white text-xs font-bold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center font-bold"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-extrabold text-white text-xs">{cat.name}</span>
                        {cat.is_system === 1 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            افتراضي
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition"
                          title="تعديل اسم التصنيف"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat.is_system !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id)}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition"
                            title="حذف"
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
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 text-left">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
