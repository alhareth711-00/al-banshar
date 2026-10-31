import React, { useState } from 'react';
import { X, Ban, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

export default function VoidVoucherModal({
  isOpen,
  onClose,
  voucher,
  onVoucherVoided,
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !voucher) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى توضيح سبب الإلغاء الرسمي للأرشفة الرقابية');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/vouchers/${voucher.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          performed_by: 'المدير المالي',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في إلغاء السند');
      }

      if (onVoucherVoided) {
        onVoucherVoided(data.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إلغاء السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-black text-white">
            تأكيد إلغاء السند ({voucher.voucher_number})
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            سيتم إلغاء السند رسمياً، وعكس الأثر المالي على رصيد الجهة، وتوليد قيد محاسبي عكسي آلياً لمنع التلاعب.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-1 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">الطرف:</span>
            <span className="font-bold text-white font-sans">{voucher.party_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">المبلغ الملغي:</span>
            <span className="font-bold text-rose-400">{Number(voucher.amount).toLocaleString()} ر.ي</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              سبب الإلغاء (إلزامي للرقابة المالية) *:
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تسجيل مكرر بالخطأ، إلغاء المعاملة من الزبون، تصحيح رقم الحساب..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>تأكيد الإلغاء وعكس القيد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
