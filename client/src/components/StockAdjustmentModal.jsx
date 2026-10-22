import React, { useState } from 'react';
import { X, Sliders, AlertTriangle, CheckCircle, Scale, DollarSign } from 'lucide-react';

export default function StockAdjustmentModal({ isOpen, onClose, item, onAdjustCompleted }) {
  const [adjustmentType, setAdjustmentType] = useState('shrinkage'); // 'shrinkage' (عجز/تلف) or 'surplus' (فائض)
  const [qtyDelta, setQtyDelta] = useState('');
  const [reason, setReason] = useState('جرد دوري شهري');
  const [adjustedBy, setAdjustedBy] = useState('أمين المستودع');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const numericDelta = Number(qtyDelta) || 0;
  const signedDelta = adjustmentType === 'shrinkage' ? -Math.abs(numericDelta) : Math.abs(numericDelta);
  const newProjectedStock = Math.round(((Number(item.stock_qty) || 0) + signedDelta) * 100) / 100;
  const financialImpact = Math.round(Math.abs(numericDelta) * (Number(item.cost_price) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (numericDelta <= 0) {
      setError('يرجى إدخال كمية تسوية صحيحة أكبر من الصفر');
      return;
    }

    if (newProjectedStock < 0) {
      setError(`لا يمكن خصم كمية ${numericDelta}؛ لأن الرصيد الحالي (${item.stock_qty}) غير كافٍ.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/inventory/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty_delta: signedDelta,
          reason: `${reason} (${adjustmentType === 'shrinkage' ? 'عجز/تلف' : 'فائض جرد'})`,
          adjusted_by: adjustedBy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشلت عملية التسوية الجردية');
      }

      if (onAdjustCompleted) onAdjustCompleted(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">تسوية جردية رسمية (مع قيد محاسبي)</h3>
              <p className="text-xs text-slate-400">تحديث رصيد الصنف وترحيل الأثر المالي في الأرباح والخسائر فوراً</p>
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

          {/* Item Info Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-white">{item.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                كود: <span className="text-amber-400">{item.sku}</span> | الماركة: {item.brand}
              </div>
            </div>
            <div className="text-left font-mono">
              <div className="text-xs text-slate-400">الرصيد الفعلي الحالي:</div>
              <div className="text-lg font-black text-emerald-400">{item.stock_qty} <span className="text-xs font-sans">عبوة</span></div>
            </div>
          </div>

          {/* Adjustment Type Tabs */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">نوع التسوية الجردية:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('shrinkage')}
                className={`min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  adjustmentType === 'shrinkage'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-lg shadow-rose-500/10'
                    : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                <span>🔻 عجز / نقص / تلف (- خصم)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('surplus')}
                className={`min-h-[44px] rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  adjustmentType === 'surplus'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                <span>🔺 فائض جرد (+ إضافة)</span>
              </button>
            </div>
          </div>

          {/* Qty Delta Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                {adjustmentType === 'shrinkage' ? 'كمية العجز (المفقود/التالف):' : 'كمية الفائض المكتشفة:'}
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder="مثال: 2"
                value={qtyDelta}
                onChange={(e) => setQtyDelta(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">الرصيد بعد التسوية:</label>
              <div className={`w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-base font-black flex items-center ${
                newProjectedStock < 0 ? 'text-rose-400' : 'text-cyan-400'
              }`}>
                {newProjectedStock} <span className="text-xs font-sans text-slate-400 mr-1.5">عبوة</span>
              </div>
            </div>
          </div>

          {/* Reason & Responsible */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">سبب التسوية:</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer"
              >
                <option value="جرد دوري شهري">جرد دوري شهري</option>
                <option value="تلف أو كسر أثناء المناولة">تلف أو كسر أثناء المناولة</option>
                <option value="تبخر أو تسريب عبوة">تبخر أو تسريب عبوة</option>
                <option value="خطأ إدخال في فاتورة سابقة">خطأ إدخال في فاتورة سابقة</option>
                <option value="صنف منتهي الصلاحية">صنف منتهي الصلاحية</option>
                <option value="تسوية افتتاحية للمستودع">تسوية افتتاحية للمستودع</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">المسؤول عن الجرد:</label>
              <input
                type="text"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                required
              />
            </div>
          </div>

          {/* Accounting Impact Preview Box */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                الأثر المالي في دفتر اليومية العامة:
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {financialImpact.toLocaleString()} ر.ي
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 p-2 rounded-xl bg-slate-900 border border-white/5 space-y-1">
              {adjustmentType === 'shrinkage' ? (
                <>
                  <div className="text-rose-400 font-semibold">• مدين: ح/ 6109 (خسائر وعجز المخزون) {financialImpact.toLocaleString()} ر.ي</div>
                  <div className="text-slate-300 font-semibold">• دائن: ح/ 1301 (مخزون الزيوت والمواد) {financialImpact.toLocaleString()} ر.ي</div>
                </>
              ) : (
                <>
                  <div className="text-emerald-400 font-semibold">• مدين: ح/ 1301 (مخزون الزيوت والمواد) {financialImpact.toLocaleString()} ر.ي</div>
                  <div className="text-cyan-400 font-semibold">• دائن: ح/ 3201 (أرباح تسوية جردية فائض) {financialImpact.toLocaleString()} ر.ي</div>
                </>
              )}
            </div>
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
              disabled={isSubmitting || numericDelta <= 0 || newProjectedStock < 0}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري ترحيل التسوية والقيد...' : 'اعتماد وترحيل التسوية المحاسبية ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
