import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Scale, DollarSign, CheckCircle2, ArrowRightLeft } from 'lucide-react';

export default function StockAdjustmentModal({ isOpen, onClose, item, onAdjustCompleted }) {
  const [inputMode, setInputMode] = useState('actual_count'); // 'actual_count' (الرصيد الفعلي الجديد) | 'delta' (فارق التسوية)
  const [actualCount, setActualCount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('shrinkage'); // 'shrinkage' (عجز) | 'surplus' (فائض)
  const [qtyDelta, setQtyDelta] = useState('');
  const [reason, setReason] = useState('جرد دوري شهري');
  const [adjustedBy, setAdjustedBy] = useState('أمين المستودع');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset inputs when opened
  useEffect(() => {
    if (item && isOpen) {
      setActualCount(String(Math.max(0, item.stock_qty)));
      setQtyDelta('');
      setError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentStock = Number(item.stock_qty) || 0;

  // Compute final signed delta and projected stock depending on input mode
  let signedDelta = 0;
  let newProjectedStock = currentStock;

  if (inputMode === 'actual_count') {
    const targetCount = actualCount === '' ? currentStock : Number(actualCount);
    signedDelta = Math.round((targetCount - currentStock) * 100) / 100;
    newProjectedStock = targetCount;
  } else {
    const num = Number(qtyDelta) || 0;
    signedDelta = adjustmentType === 'shrinkage' ? -Math.abs(num) : Math.abs(num);
    newProjectedStock = Math.round((currentStock + signedDelta) * 100) / 100;
  }

  const absDelta = Math.abs(signedDelta);
  const financialImpact = Math.round(absDelta * (Number(item.cost_price) || 0));
  const isDeficit = signedDelta < 0;
  const isSurplus = signedDelta > 0;
  const isZero = signedDelta === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isZero) {
      setError('الرصيد الفعلي مطابق للرصيد الحالي في النظام، لا يوجد فارق لتسويته.');
      return;
    }

    if (newProjectedStock < 0) {
      setError(`لا يمكن أن يصبح الرصيد سالباً (${newProjectedStock}). يرجى التحقق من الكمية.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/inventory/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty_delta: signedDelta,
          reason: `${reason} (${isDeficit ? 'عجز/تلف' : 'فائض جرد'})`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">تعديل كميات الجرد الفعلي وتسوية الفوارق</h3>
              <p className="text-xs text-amber-300 font-medium">
                💡 أدخل العدد الفعلي الموجود في الرف وسيقوم النظام باحتساب الفارق وترحيل القيد آلياً.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Info Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-white">{item.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                كود: <span className="text-amber-400 font-bold">{item.sku}</span> | الماركة: {item.brand}
              </div>
            </div>
            <div className="text-left font-mono">
              <div className="text-[11px] text-slate-400">الرصيد بالنظام:</div>
              <div className="text-lg font-black text-emerald-400">
                {currentStock} <span className="text-xs font-sans">عبوة</span>
              </div>
            </div>
          </div>

          {/* Input Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-bold">طريقة إدخال التسوية الجردية:</label>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setInputMode('actual_count')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    inputMode === 'actual_count'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  العد الفعلي الجديد
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('delta')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    inputMode === 'delta'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  تحديد الفارق (+ / -)
                </button>
              </div>
            </div>

            {inputMode === 'actual_count' ? (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-amber-500/20">
                <div>
                  <label className="block text-amber-300 font-bold mb-1">الرصيد الفعلي الجديد بعد العد:</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="اكتب الكمية بالرف..."
                    value={actualCount}
                    onChange={(e) => setActualCount(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-amber-400/50 text-white font-mono text-lg font-black focus:outline-none focus:border-amber-400 text-center"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الفارق المحسوب تلقائياً:</label>
                  <div
                    className={`w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-base font-black flex items-center justify-center gap-1.5 ${
                      isDeficit ? 'text-rose-400 border-rose-500/30' : isSurplus ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400'
                    }`}
                  >
                    <span>{signedDelta > 0 ? `+${signedDelta}` : signedDelta}</span>
                    <span className="text-xs font-sans">
                      {isDeficit ? '(عجز/تلف)' : isSurplus ? '(فائض)' : '(مطابق)'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('shrinkage')}
                    className={`min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                      adjustmentType === 'shrinkage'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <span>🔻 عجز / نقص (- خصم)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('surplus')}
                    className={`min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                      adjustmentType === 'surplus'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <span>🔺 فائض جرد (+ إضافة)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      {adjustmentType === 'shrinkage' ? 'كمية العجز (المخصومة):' : 'كمية الفائض (المضافة):'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="مثال: 2"
                      value={qtyDelta}
                      onChange={(e) => setQtyDelta(e.target.value)}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الرصيد بعد التسوية:</label>
                    <div
                      className={`w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-base font-black flex items-center justify-center ${
                        newProjectedStock < 0 ? 'text-rose-400' : 'text-cyan-400'
                      }`}
                    >
                      {newProjectedStock} <span className="text-xs font-sans text-slate-400 mr-1.5">عبوة</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reason & Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">سبب التسوية:</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer"
              >
                <option value="جرد دوري شهري">جرد دوري شهري</option>
                <option value="تلف أو كسر أثناء المناولة">تلف أو كسر أثناء المناولة</option>
                <option value="عجز جرد فعلي غير مبرر">عجز جرد فعلي غير مبرر</option>
                <option value="استخدام شخصي واستهلاك بالورشة">استخدام شخصي واستهلاك بالورشة</option>
                <option value="تبخر أو تسريب عبوة">تبخر أو تسريب عبوة</option>
                <option value="خطأ إدخال في فاتورة سابقة">خطأ إدخال في فاتورة سابقة</option>
                <option value="صنف منتهي الصلاحية أو تالف">صنف منتهي الصلاحية أو تالف</option>
                <option value="تسوية افتتاحية للمستودع">تسوية افتتاحية للمستودع</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">المسؤول عن الجرد:</label>
              <input
                type="text"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold"
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

            <div className="text-[11px] font-mono text-slate-400 p-2.5 rounded-xl bg-slate-900 border border-white/5 space-y-1">
              {isDeficit ? (
                <>
                  <div className="text-rose-400 font-semibold">• مدين: ح/ 6109 (خسائر وعجز المخزون) {financialImpact.toLocaleString()} ر.ي</div>
                  <div className="text-slate-300 font-semibold">• دائن: ح/ 1301 (مخزون الزيوت والمواد) {financialImpact.toLocaleString()} ر.ي</div>
                </>
              ) : isSurplus ? (
                <>
                  <div className="text-emerald-400 font-semibold">• مدين: ح/ 1301 (مخزون الزيوت والمواد) {financialImpact.toLocaleString()} ر.ي</div>
                  <div className="text-cyan-400 font-semibold">• دائن: ح/ 3201 (أرباح تسوية جردية فائض) {financialImpact.toLocaleString()} ر.ي</div>
                </>
              ) : (
                <div className="text-slate-400 text-center py-0.5">لا توجد فروق جردية لإنشاء قيد محاسبي.</div>
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
              disabled={isSubmitting || isZero || newProjectedStock < 0}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-95 transition"
            >
              {isSubmitting ? 'جاري ترحيل التسوية والقيد...' : 'اعتماد وترحيل التسوية المحاسبية ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
