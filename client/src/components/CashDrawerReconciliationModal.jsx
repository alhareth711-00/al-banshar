import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  CheckCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  History,
  Save,
  Scale,
  RefreshCw,
  FileText,
  DollarSign,
} from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';

export default function CashDrawerReconciliationModal({ isOpen, onClose, onReconciliationSaved }) {
  const [systemBalance, setSystemBalance] = useState(0);
  const [physicalBalanceInput, setPhysicalBalanceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAudit, setSavedAudit] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('match'); // 'match' | 'history'
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustResult, setAdjustResult] = useState(null);

  // Fetch current live system balance of 1101 and audit history
  const fetchCurrentDrawerBalance = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vouchers/cash-drawer');
      const data = await res.json();
      if (data.success && data.data?.cash_drawer) {
        setSystemBalance(Number(data.data.cash_drawer.current_balance) || 0);
      }

      const histRes = await fetch('/api/vouchers/cash-drawer/audits');
      const histData = await histRes.json();
      if (histData.success) {
        setAuditHistory(histData.data || []);
      }
    } catch (e) {
      console.error('Failed to load cash drawer balance for reconciliation:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCurrentDrawerBalance();
      setPhysicalBalanceInput('');
      setNotes('');
      setSavedAudit(null);
      setAdjustResult(null);
      setActiveSubTab('match');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const physicalAmount = physicalBalanceInput !== '' ? Number(physicalBalanceInput) : null;
  const variance = physicalAmount !== null ? physicalAmount - systemBalance : null;
  const isMatched = variance === 0;
  const isShortage = variance !== null && variance < 0;
  const isOverage = variance !== null && variance > 0;

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    if (physicalAmount === null || isNaN(physicalAmount) || physicalAmount < 0) {
      alert('يرجى إدخال المبلغ الإجمالي الفعلي الموجود في الصندوق');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/vouchers/cash-drawer/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physical_balance: physicalAmount,
          notes: notes.trim() || (isMatched ? 'جرد مطابق 100%' : isShortage ? 'عجز في الصندوق' : 'زيادة نقدية'),
          created_by: 'أمين الصندوق',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في حفظ محضر المطابقة');
      }

      setSavedAudit(data.data);
      fetchCurrentDrawerBalance();
      if (onReconciliationSaved) onReconciliationSaved(data.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustVariance = async () => {
    if (!savedAudit || savedAudit.variance === 0) return;
    try {
      setIsAdjusting(true);
      const res = await fetch('/api/vouchers/cash-drawer/adjust-variance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: savedAudit.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في ترحيل قيد التسوية');
      }

      setAdjustResult(data);
      fetchCurrentDrawerBalance();
      if (onReconciliationSaved) onReconciliationSaved(savedAudit);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto select-none">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-4 text-right flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-emerald-500/10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">جرد ومطابقة الصندوق النقدي</h3>
              <p className="text-[11px] text-slate-400">
                مقارنة المبلغ الإجمالي الفعلي الموجود في الصندوق مع الرصيد الدفتري (حساب 1101)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="px-6 pt-3 pb-2 border-b border-white/10 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('match')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'match'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              مطابقة الصندوق الحالية ⚖️
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل الجرد السابق ({auditHistory.length})</span>
            </button>
          </div>

          <button
            onClick={fetchCurrentDrawerBalance}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-white/10"
            title="تحديث الرصيد الدفتري الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Tab 1: Current Matching View */}
        {activeSubTab === 'match' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* System Balance Display Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">
                    الرصيد الدفتري المسجل في النظام (الصندوق 1101):
                  </span>
                  <div className="text-2xl font-black font-mono text-white mt-0.5">
                    {systemBalance.toLocaleString()}{' '}
                    <span className="text-xs text-emerald-400 font-normal">ريال يمني</span>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-400 font-mono block">حساب الدرج الرئيسي</span>
                <span className="text-[10px] text-emerald-400/80 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                  مباشر من القيود
                </span>
              </div>
            </div>

            {/* Form: Total Cash Counted */}
            <form onSubmit={handleSaveAudit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-white mb-2">
                  المبلغ الإجمالي الفعلي الموجود في الصندوق حالياً (ريال يمني):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="أدخل إجمالي النقدية المحسوبة في الدرج..."
                    value={physicalBalanceInput}
                    onChange={(e) => {
                      setPhysicalBalanceInput(e.target.value);
                      setSavedAudit(null);
                      setAdjustResult(null);
                    }}
                    className="w-full min-h-[52px] px-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/40 focus:border-emerald-400 text-white font-mono text-xl font-black placeholder-slate-500 focus:outline-none transition-all shadow-inner"
                    required
                    autoFocus
                  />
                  <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">ريال</span>
                </div>

                {/* Verbal Tafqeet */}
                {physicalAmount > 0 && (
                  <div className="mt-2 text-xs text-slate-300 font-semibold px-2">
                    المبلغ الفعلي كتابة: <span className="text-emerald-300">{tafqeet(physicalAmount)}</span>
                  </div>
                )}
              </div>

              {/* Real-time Variance Evaluation Banner */}
              {physicalAmount !== null && (
                <div
                  className={`p-4 rounded-2xl border transition-all animate-in fade-in ${
                    isMatched
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : isShortage
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isMatched ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertTriangle className={`w-6 h-6 ${isShortage ? 'text-rose-400' : 'text-blue-400'}`} />
                      )}
                      <div>
                        <div className="font-black text-sm">
                          {isMatched
                            ? '✅ الرصيد مطابق تماماً 100% (لا يوجد فارق)'
                            : isShortage
                            ? '⚠️ يوجد عجز نقدي في الصندوق'
                            : 'ℹ️ توجد زيادة نقدية فعلية في الصندوق'}
                        </div>
                        <div className="text-xs mt-0.5 opacity-90">
                          {isMatched
                            ? 'إجمالي النقد الفعلي يساوي الرصيد الدفتري المسجل في النظام بدقة تامة.'
                            : isShortage
                            ? 'النقد الفعلي أقل من الرصيد الدفتري المسجل بمقدار الفارق أدناه.'
                            : 'النقد الفعلي أكبر من الرصيد الدفتري المسجل بمقدار الفارق أدناه.'}
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] block opacity-80">مقدار الفارق:</span>
                      <span className="text-xl font-black">
                        {variance > 0 ? `+${variance.toLocaleString()}` : variance.toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات محضر الجرد (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: جرد نهاية الوردية الصباحية / تسليم المناوب..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                />
              </div>

              {/* Submit / Save Audit */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 min-h-[46px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || physicalAmount === null}
                  className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتوثيق محضر الجرد 💾'}</span>
                </button>
              </div>
            </form>

            {/* Saved Audit Actions & Adjustment Option */}
            {savedAudit && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/15 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>تم توثيق محضر الجرد بنجاح برقم (#{savedAudit.id})</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{savedAudit.created_at}</span>
                </div>

                {savedAudit.variance !== 0 && !adjustResult && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      هل ترغب بترحيل قيد تسوية محاسبي مزدوج لتعديل رصيد الصندوق تلقائياً ومطابقته مع النقد الفعلي؟
                    </p>
                    <button
                      onClick={handleAdjustVariance}
                      disabled={isAdjusting}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{isAdjusting ? 'جاري الترحيل...' : 'ترحيل قيد التسوية ⚖️'}</span>
                    </button>
                  </div>
                )}

                {adjustResult && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    ✅ {adjustResult.message} (رقم القيد: {adjustResult.journal_entry?.entry_number})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Previous Audits History */}
        {activeSubTab === 'history' && (
          <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
            <h4 className="font-bold text-xs text-slate-400 mb-2">سجل جلسات الجرد والمطابقة السابقة:</h4>
            {auditHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد جلسات جرد سابقة مسجلة حتى الآن.
              </div>
            ) : (
              <div className="divide-y divide-white/10 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
                {auditHistory.map((item) => {
                  const itemMatched = item.status === 'matched';
                  const itemShort = item.status === 'shortage';
                  return (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              itemMatched
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : itemShort
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {itemMatched ? 'مطابق' : itemShort ? 'عجز' : 'زيادة'}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">#{item.id}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{item.created_at}</span>
                        </div>
                        {item.notes && <p className="text-slate-300 mt-1 text-[11px]">{item.notes}</p>}
                      </div>

                      <div className="text-left font-mono">
                        <div className="text-white font-bold">
                          فعلي: {Number(item.physical_balance).toLocaleString()} ر.ي
                        </div>
                        <div className="text-[11px] text-slate-400">
                          دفتري: {Number(item.system_balance).toLocaleString()} | الفارق:{' '}
                          <span className={itemMatched ? 'text-emerald-400' : itemShort ? 'text-rose-400' : 'text-blue-400'}>
                            {Number(item.variance) > 0 ? `+${Number(item.variance).toLocaleString()}` : Number(item.variance).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
