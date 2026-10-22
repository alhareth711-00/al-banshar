import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  UserCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Printer,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { getShopSettings } from '../utils/settings';

export default function ShiftHandoverModal({ isOpen, onClose, currentShift, onShiftClosed }) {
  const [actualCash, setActualCash] = useState('');
  const [handedOverTo, setHandedOverTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closedSlip, setClosedSlip] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const settings = getShopSettings();

  useEffect(() => {
    if (isOpen && currentShift?.shift?.metrics) {
      const exp = currentShift.shift.metrics.expected_cash || 0;
      setActualCash(String(exp));
      setHandedOverTo('');
      setNotes('');
      setClosedSlip(null);
      setErrorMsg('');
    }
  }, [isOpen, currentShift]);

  if (!isOpen) return null;

  const shiftObj = currentShift?.shift || {};
  const metrics = shiftObj.metrics || {};
  const openingCash = metrics.opening_cash || 0;
  const shiftInflow = metrics.shift_inflow || 0;
  const shiftOutflow = metrics.shift_outflow || 0;
  const expectedCash = metrics.expected_cash || 0;

  const actualNum = parseFloat(actualCash) || 0;
  const diff = actualNum - expectedCash;

  const handleSubmitClose = async (e) => {
    e.preventDefault();
    if (!handedOverTo.trim()) {
      setErrorMsg('يرجى تحديد اسم الكاشير أو المستلم للمناوبة التالية');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: shiftObj.id,
          actual_cash: actualNum,
          handed_over_to: handedOverTo.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل إغلاق الوردية');
      }

      setClosedSlip(data.data);
      if (onShiftClosed) onShiftClosed(data.data);
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إغلاق الوردية');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {closedSlip ? 'محضر تسليم الوردية المعتمد' : 'إغلاق الوردية وتسليم الصندوق'}
              </h3>
              <p className="text-xs text-slate-400">
                {shiftObj.shift_code} &bull; {shiftObj.cashier_name}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {closedSlip ? (
            /* Closed Success & Handover Slip Receipt */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-extrabold text-base">تم إغلاق وتسليم الوردية بنجاح!</div>
                <div className="text-xs text-slate-300">
                  كود الوردية: <span className="font-mono font-bold text-white">{closedSlip.shift_code}</span>
                </div>
              </div>

              {/* Printable Slip Preview */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3 font-mono text-slate-200">
                <div className="text-center border-b border-white/10 pb-2">
                  <div className="font-black text-white text-sm">{settings.shopName}</div>
                  <div className="text-[11px] text-slate-400">محضر تسليم واستلام وردية</div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">كود الوردية:</span>
                    <span className="font-bold text-white">{closedSlip.shift_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المسلِّم (الكاشير):</span>
                    <span className="font-bold text-white">{closedSlip.cashier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المستلِم (المناوب):</span>
                    <span className="font-bold text-emerald-400">{closedSlip.handed_over_to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">وقت البدء:</span>
                    <span>{closedSlip.opened_at}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">وقت الإغلاق:</span>
                    <span>{closedSlip.closed_at}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>رصيد الافتتاح:</span>
                    <span className="font-bold">{Number(closedSlip.opening_cash).toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>إجمالي المقبوضات:</span>
                    <span className="font-bold">+{Number(closedSlip.total_inflow).toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>إجمالي المدفوعات:</span>
                    <span className="font-bold">-{Number(closedSlip.total_outflow).toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/10 pt-1">
                    <span>الرصيد المتوقع:</span>
                    <span>{Number(closedSlip.expected_cash).toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between font-black text-amber-400 text-sm">
                    <span>النقد الفعلي المسلَّم:</span>
                    <span>{Number(closedSlip.actual_cash).toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1">
                    <span>الفارق:</span>
                    <span
                      className={
                        closedSlip.difference === 0
                          ? 'text-emerald-400'
                          : closedSlip.difference < 0
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }
                    >
                      {closedSlip.difference === 0
                        ? 'مطابق تماماً (0 ر.ي)'
                        : `${closedSlip.difference > 0 ? '+' : ''}${Number(closedSlip.difference).toLocaleString()} ر.ي (${
                            closedSlip.difference < 0 ? 'عجز' : 'فائض'
                          })`}
                    </span>
                  </div>
                </div>

                {closedSlip.notes && (
                  <div className="border-t border-white/10 pt-2 text-[10px] text-slate-400">
                    ملاحظات: {closedSlip.notes}
                  </div>
                )}

                {/* Signature box */}
                <div className="border-t border-white/10 pt-3 grid grid-cols-2 text-center text-[10px] text-slate-400 gap-2">
                  <div className="border border-white/10 p-2 rounded-xl">
                    <div>توقيع المسلِّم</div>
                    <div className="mt-4 text-white font-bold">{closedSlip.cashier_name}</div>
                  </div>
                  <div className="border border-white/10 p-2 rounded-xl">
                    <div>توقيع المستلِم</div>
                    <div className="mt-4 text-white font-bold">{closedSlip.handed_over_to}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="flex-1 min-h-[46px] rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة محضر التسليم</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 transition"
                >
                  <span>تم وإغلاق النافذة</span>
                </button>
              </div>
            </div>
          ) : (
            /* Shift Closing Form */
            <form onSubmit={handleSubmitClose} className="space-y-4">
              {/* Financial Metrics Summary Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="text-slate-400 text-[11px]">رصيد بداية الوردية:</div>
                  <div className="text-base font-black font-mono text-white mt-0.5">
                    {openingCash.toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/20">
                  <div className="text-slate-400 text-[11px]">إجمالي المقبوضات (داخل):</div>
                  <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                    +{shiftInflow.toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-rose-500/20">
                  <div className="text-slate-400 text-[11px]">إجمالي المدفوعات (خارج):</div>
                  <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                    -{shiftOutflow.toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-blue-500/30 bg-blue-500/10">
                  <div className="text-blue-300 font-bold text-[11px]">الرصيد الدفتري المتوقع:</div>
                  <div className="text-base font-black font-mono text-blue-300 mt-0.5">
                    {expectedCash.toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Actual Cash Input */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                <label className="block text-amber-300 font-extrabold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span>النقد الفعلي المسلَّم في الصندوق (ريال يمني):</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    المتوقع: {expectedCash.toLocaleString()}
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-400 font-mono text-lg font-black focus:outline-none focus:border-amber-400"
                  required
                />

                {/* Real-time Variance Badge */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-bold text-xs ${
                    diff === 0
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : diff < 0
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {diff === 0 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                    <span>حالة المطابقة:</span>
                  </span>
                  <span className="font-mono text-sm font-black">
                    {diff === 0
                      ? 'مطابق تماماً (لا يوجد فارق) ✅'
                      : `${diff > 0 ? '+' : ''}${diff.toLocaleString()} ر.ي (${diff < 0 ? 'عجز في العهدة ⚠️' : 'فائض في الصندوق ℹ️'})`}
                  </span>
                </div>
              </div>

              {/* Handed Over To Field */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>اسم المناوب / المستلِم للوردية التالية:</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: عبد الله عبده (المناوبة المسائية)"
                  value={handedOverTo}
                  onChange={(e) => setHandedOverTo(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              {/* Handover Notes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>ملاحظات التسليم والتسلّم (اختياري):</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات تخص الصندوق أو الفواتير المعلقة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-purple-400 resize-none text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold shadow-xl shadow-purple-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>اعتماد تسليم الوردية</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
