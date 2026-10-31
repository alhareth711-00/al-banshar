import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Check,
  AlertCircle,
  DollarSign,
  FileText,
  CreditCard,
  Building,
  User,
  ShieldCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';

export default function EditVoucherModal({
  isOpen,
  onClose,
  voucher,
  onVoucherUpdated,
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paperBillNumber, setPaperBillNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (voucher && isOpen) {
      setAmount(String(voucher.amount || ''));
      setPaymentMethod(voucher.payment_method || 'cash');
      setPaperBillNumber(voucher.paper_bill_number || '');
      setDescription(voucher.description || '');
      setNotes(voucher.notes || '');
      setError('');
    }
  }, [voucher, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !voucher) return null;

  const oldAmount = Number(voucher.amount || 0);
  const newAmountNum = Number(amount) || 0;
  const difference = newAmountNum - oldAmount;
  const isReceipt = voucher.voucher_type === 'receipt';

  // Projected new balance calculation
  let projectedBalance = Number(voucher.new_balance || 0);
  if (voucher.party_type === 'customer' || voucher.party_type === 'supplier') {
    const prevBal = Number(voucher.prev_balance || 0);
    projectedBalance = Math.max(0, prevBal - newAmountNum);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newAmountNum || newAmountNum <= 0) {
      setError('مبلغ السند الجديد يجب أن يكون أكبر من الصفر');
      return;
    }

    if (!description.trim()) {
      setError('يرجى كتابة بيان السند والسبب');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: newAmountNum,
          payment_method: paymentMethod,
          paper_bill_number: paperBillNumber.trim() || null,
          description: description.trim(),
          notes: notes.trim() || null,
          performed_by: 'المدير المالي',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في حفظ تعديلات السند');
      }

      if (onVoucherUpdated) {
        onVoucherUpdated(data.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تعديل السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl flex flex-col rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  تعديل {isReceipt ? 'سند القبض' : 'سند الصرف'}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 text-amber-300 font-bold">
                  {voucher.voucher_number}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إعادة تسوية الأرصدة والقيود المحاسبية الذرية (Atomic Rollback-and-Reapply)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Party and Old Amount Reference */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">الجهة / الطرف:</span>
              <span className="text-sm font-bold text-white">{voucher.party_name}</span>
            </div>
            <div className="text-left font-mono">
              <span className="text-[11px] text-slate-400 block">المبلغ الحالي المقيد:</span>
              <span className="text-sm font-bold text-slate-300">{oldAmount.toLocaleString()} ر.ي</span>
            </div>
          </div>

          {/* New Amount Field with Live Numpad Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>المبلغ الجديد المطلوب اعتماده (ر.ي) *</span>
              {newAmountNum > 0 && (
                <span className="text-[11px] font-normal text-amber-300">
                  فقط {tafqeet(newAmountNum)}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ الجديد"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-white/10 text-white font-mono font-black text-lg focus:border-amber-400 focus:outline-none transition-all pl-12 text-right"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                ر.ي
              </span>
            </div>

            {/* Quick Adjustment Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1000, 5000, 10000, 20000, 50000].map((step) => (
                <button
                  type="button"
                  key={step}
                  onClick={() => setAmount(String((Number(amount) || 0) + step))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-white/5 transition-colors"
                >
                  +{step.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(oldAmount))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-xs border border-white/5 transition-colors"
              >
                استعادة الأصلي
              </button>
            </div>
          </div>

          {/* Financial Difference & Balance Impact Preview Widget */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-amber-200 font-sans font-bold flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>أثر التعديل على الحسابات:</span>
              </span>
              <span className="text-slate-300">
                الفارق: {difference > 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString()} ر.ي
              </span>
            </div>

            {(voucher.party_type === 'customer' || voucher.party_type === 'supplier') && (
              <div className="flex justify-between items-center text-[11px] text-slate-300 pt-1 border-t border-amber-500/20">
                <span>الرصيد الدفتري الأصلي: {Number(voucher.prev_balance || 0).toLocaleString()} ر.ي</span>
                <span className="font-bold text-white">
                  الرصيد المتوقع بعد التعديل: {projectedBalance.toLocaleString()} ر.ي
                </span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">طريقة الدفع والحساب:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: '💵 نقداً (الصندوق 1101)' },
                { id: 'kuraimi', label: '🏦 بنك الكريمي (1102)' },
                { id: 'jeeb', label: '📱 محفظة جيب (1103)' },
                { id: 'jawali', label: '📲 محفظة جوالي (1104)' },
                { id: 'onecash', label: '💳 ون كاش (1105)' },
                { id: 'bank', label: '🏛️ تحويل بنكي' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                    paymentMethod === m.id
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-950 text-slate-300 border-white/5 hover:border-white/20'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Bill Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">رقم الدفتر الورقي / المرجع (اختياري):</label>
            <input
              type="text"
              value={paperBillNumber}
              onChange={(e) => setPaperBillNumber(e.target.value)}
              placeholder="مثال: 04928 أو رقم حوالة"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">البيان والشرح *:</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب بيان السند وسبب التعديل..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">ملاحظات داخلية:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات مرجعية إضافية..."
              className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              إلغاء التعديل
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !newAmountNum}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>اعتماد وتحديث السند والقيود</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
