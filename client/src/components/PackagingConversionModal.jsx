import React, { useState, useMemo, useEffect } from 'react';
import { X, Layers, ArrowLeftRight, CheckCircle, AlertTriangle, Box, Droplets } from 'lucide-react';

export default function PackagingConversionModal({ isOpen, onClose, inventory = [], onConversionCompleted }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [packagesCount, setPackagesCount] = useState(1);
  const [unitsPerPack, setUnitsPerPack] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Potential parent items (cartons, bulk drums, 4L, etc.)
  const parentCandidates = useMemo(() => {
    return inventory.filter((item) => item.item_type === 'product' && item.is_active === 1);
  }, [inventory]);

  // Selected parent item
  const selectedParent = useMemo(() => {
    return parentCandidates.find((i) => String(i.id) === String(fromId));
  }, [parentCandidates, fromId]);

  // Potential target items (individual cans 1L, etc.)
  const targetCandidates = useMemo(() => {
    return inventory.filter((item) => item.item_type === 'product' && item.is_active === 1 && String(item.id) !== String(fromId));
  }, [inventory, fromId]);

  // Selected target item
  const selectedTarget = useMemo(() => {
    return targetCandidates.find((i) => String(i.id) === String(toId));
  }, [targetCandidates, toId]);

  // When parent selection changes, update default unitsPerPack if carton_pack_qty is set
  const handleParentChange = (id) => {
    setFromId(id);
    const item = parentCandidates.find((i) => String(i.id) === String(id));
    if (item && item.carton_pack_qty && item.carton_pack_qty > 1) {
      setUnitsPerPack(item.carton_pack_qty);
    }
  };

  const totalUnitsProduced = (Number(packagesCount) || 0) * (Number(unitsPerPack) || 0);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fromId || !toId) {
      setError('يرجى اختيار الصنف الأصل (الكرتون/البرميل) والصنف الناتج (العلبة/اللتر)');
      return;
    }

    if (!selectedParent || selectedParent.stock_qty < Number(packagesCount)) {
      setError(`الرصيد المتاح من (${selectedParent?.name}) غير كافٍ لفك ${packagesCount} عبوة`);
      return;
    }

    if (totalUnitsProduced <= 0) {
      setError('إجمالي الوحدات الناتجة يجب أن يكون أكبر من الصفر');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/inventory/convert-packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_id: Number(fromId),
          to_id: Number(toId),
          packages_to_convert: Number(packagesCount),
          units_per_package: Number(unitsPerPack),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشلت عملية فك وتحويل العبوات');
      }

      if (onConversionCompleted) onConversionCompleted(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">فك وتحويل العبوات والكراتين</h3>
              <p className="text-xs text-slate-400">تحويل كرتون أو برميل إلى علب أو لترات فردية للبيع بالقطعة في الكاشير</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Conversion Flow Diagram Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900 border border-white/10 relative">
            {/* From Source */}
            <div className="space-y-1.5">
              <label className="block text-amber-300 font-bold flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                الصنف المصدر (الكرتون / البرميل المراد فكه):
              </label>
              <select
                value={fromId}
                onChange={(e) => handleParentChange(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs cursor-pointer font-bold"
                required
              >
                <option value="">-- اختر الصنف الأصل --</option>
                {parentCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand}) - متاح: {p.stock_qty}
                  </option>
                ))}
              </select>
              {selectedParent && (
                <div className="text-[11px] text-slate-400 font-mono">
                  رصيد المخزن الحالي: <span className="text-emerald-400 font-bold">{selectedParent.stock_qty}</span> عبوة
                </div>
              )}
            </div>

            {/* To Target */}
            <div className="space-y-1.5">
              <label className="block text-teal-300 font-bold flex items-center gap-1.5">
                <Droplets className="w-4 h-4" />
                الصنف الناتج (العلبة أو اللتر الفردي المستهدف):
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs cursor-pointer font-bold"
                required
              >
                <option value="">-- اختر الصنف الناتج --</option>
                {targetCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.brand} - {t.pack_size || 'قطعة'})
                  </option>
                ))}
              </select>
              {selectedTarget && (
                <div className="text-[11px] text-slate-400 font-mono">
                  رصيد المخزن الحالي: <span className="text-teal-400 font-bold">{selectedTarget.stock_qty}</span> عبوة
                </div>
              )}
            </div>
          </div>

          {/* Quantities Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">عدد الكراتين / الحزم المراد فكها:</label>
              <input
                type="number"
                min="1"
                value={packagesCount}
                onChange={(e) => setPackagesCount(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">محتوى الكرتون الواحد (علبة/لتر):</label>
              <input
                type="number"
                min="1"
                value={unitsPerPack}
                onChange={(e) => setUnitsPerPack(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-bold focus:outline-none focus:border-teal-400"
                required
              />
            </div>

            <div>
              <label className="block text-teal-400 font-bold mb-1.5">إجمالي الناتج المضاف للمخزن:</label>
              <div className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-teal-500/30 text-teal-300 font-mono text-lg font-black flex items-center">
                +{totalUnitsProduced} <span className="text-xs font-sans text-slate-400 mr-1.5">علبة</span>
              </div>
            </div>
          </div>

          {/* Summary Audit Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5 text-[11px] text-slate-400 font-mono">
            <div className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              أثر عملية الفك في سجل الحركات المخزنية:
            </div>
            <div>• سيتم خصم ({packagesCount}) من رصيد الصنف المصدر.</div>
            <div>• سيتم إضافة ({totalUnitsProduced}) إلى رصيد الصنف الناتج فوراً.</div>
            <div>• يتم تسجيل قيد حركة مخزنية رسمية (Packaging Conversion) لضمان عدم ضياع التكلفة.</div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fromId || !toId || totalUnitsProduced <= 0}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري تنفيذ الفك والتحويل...' : 'تأكيد فك العبوات وإضافتها للمخزن 🔄'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
