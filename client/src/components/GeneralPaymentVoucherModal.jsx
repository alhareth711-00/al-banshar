import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Printer,
  Check,
  User,
  DollarSign,
  FileText,
  Building,
  UserCheck,
  Fuel,
  Wrench,
} from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';

export default function GeneralPaymentVoucherModal({
  isOpen,
  onClose,
  initialData = null,
  suppliers = [],
  workers = [],
  onVoucherCreated,
}) {
  const [partyType, setPartyType] = useState('owner'); // 'owner' | 'supplier' | 'worker' | 'expense' | 'other'
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'kuraimi' | 'jeeb'
  const [paperBillNumber, setPaperBillNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [printedVoucher, setPrintedVoucher] = useState(null);
  const [ownerAnalytics, setOwnerAnalytics] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/vouchers/owner-drawings-summary')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setOwnerAnalytics(d.data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setPartyType(initialData.party_type || 'owner');
      if (initialData.party_id) setSelectedPartyId(String(initialData.party_id));
      if (initialData.party_name) setPartyName(initialData.party_name);
      if (initialData.amount) setAmount(String(initialData.amount));
      if (initialData.description) setDescription(initialData.description);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const verbalAmount = tafqeet(Number(amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    let finalPartyName = partyName.trim();
    if (partyType === 'owner') {
      finalPartyName = finalPartyName || 'مالك المركز (مسحوبات شخصية)';
    } else if (partyType === 'supplier' && selectedPartyId) {
      const s = suppliers.find((item) => String(item.id) === String(selectedPartyId));
      if (s) finalPartyName = s.name;
    } else if (partyType === 'worker' && selectedPartyId) {
      const w = workers.find((item) => String(item.id) === String(selectedPartyId));
      if (w) finalPartyName = w.name;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        voucher_type: 'payment',
        party_type: partyType,
        party_id: selectedPartyId ? Number(selectedPartyId) : null,
        party_name: finalPartyName || 'مستفيد عام',
        amount: numAmount,
        payment_method: paymentMethod,
        paper_bill_number: paperBillNumber.trim() || null,
        description: description.trim() || (partyType === 'owner' ? 'مسحوبات شخصية للمالك (جاري المالك)' : 'سند صرف نقدية'),
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/vouchers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في حفظ سند الصرف');
      }

      setPrintedVoucher(data.data);
      if (onVoucherCreated) onVoucherCreated(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-4 text-right">
        {/* Header (Screen only) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {printedVoucher ? 'سند صرف رسمي معتمد' : 'إصدار سند صرف نقدية رسمي'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {printedVoucher
                  ? `رقم السند: ${printedVoucher.voucher_number}`
                  : 'صرف من الصندوق للمالك، الموردين، أو المصروفات مع قيد مزدوج آلي'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {printedVoucher && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند 🖨️</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. If Voucher is Saved -> Printable Paper View */}
        {printedVoucher ? (
          <div className="p-6 sm:p-8 bg-slate-900/90 text-slate-100 print:bg-white print:text-black">
            {/* Header */}
            <div className="border-b-2 border-amber-500/40 pb-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-amber-400 print:text-black">
                    مركز خدمات وبنشر السيارات المتكامل
                  </h1>
                  <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                    تغيير زيوت وفلاتر &bull; خدمات إطارات وبنشر &bull; صيانة سريعة
                  </p>
                  <p className="text-[11px] text-slate-400 print:text-gray-600">
                    صنعاء - الجمهورية اليمنية &bull; هاتف: 777000000
                  </p>
                </div>
                <div className="text-left font-mono">
                  <div className="inline-block px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 font-black text-amber-400 print:text-black print:border-black text-sm">
                    سند صرف / PAYMENT VOUCHER
                  </div>
                  <div className="text-xs text-amber-300 print:text-black font-bold mt-1">
                    رقم السند: {printedVoucher.voucher_number}
                  </div>
                  {printedVoucher.paper_bill_number && (
                    <div className="text-[11px] text-slate-400 print:text-gray-700 font-bold">
                      رقم الدفتر الورقي: {printedVoucher.paper_bill_number}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 print:text-gray-600 mt-0.5">
                    التاريخ: {printedVoucher.created_at}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 print:border-black print:bg-gray-50">
              <div>
                <span className="text-[11px] text-slate-400 print:text-gray-600 block">المبلغ المصروف رقماً:</span>
                <span className="text-2xl font-black font-mono text-amber-400 print:text-black">
                  {Number(printedVoucher.amount).toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 print:text-gray-600 block">طريقة الصرف:</span>
                <span className="text-sm font-bold text-slate-200 print:text-black">
                  {printedVoucher.payment_method === 'cash'
                    ? '💵 نقداً (صندوق الكاشير)'
                    : printedVoucher.payment_method === 'kuraimi'
                    ? '🏦 تحويل بنك الكريمي'
                    : '📱 محفظة إلكترونية'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 print:text-gray-600 block">نوع السند:</span>
                <span className="text-sm font-bold text-emerald-400 print:text-black">
                  {printedVoucher.party_type === 'owner'
                    ? '👤 مسحوبات شخصية للمالك'
                    : printedVoucher.party_type === 'supplier'
                    ? 'سداد دفعة حساب مورد'
                    : 'صرف نقدية'}
                </span>
              </div>
            </div>

            {/* Verbal & Beneficiary */}
            <div className="space-y-3 text-xs leading-relaxed border-b border-white/10 print:border-gray-300 pb-5 mb-5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">يصرف للأخ / السادة:</span>
                <span className="font-extrabold text-white print:text-black text-sm">
                  {printedVoucher.party_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">مبلغ وقدره بالحروف:</span>
                <span className="font-extrabold text-amber-300 print:text-black underline decoration-amber-500/50">
                  {tafqeet(printedVoucher.amount)}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">وذلك مقابل (البيان):</span>
                <span className="font-semibold text-slate-200 print:text-black">
                  {printedVoucher.description || 'سند صرف نقدية معتمد'}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-slate-700 print:border-black pt-2">
                <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المحاسب / أمين الصندوق</span>
                <div className="h-10"></div>
                <span className="text-[10px] text-slate-500 print:text-gray-500">تم الترحيل للقيد المزدوج آلياً</span>
              </div>
              <div className="border-t border-slate-700 print:border-black pt-2">
                <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المستلم للمبلغ</span>
                <div className="h-10"></div>
                <span className="text-[10px] text-slate-500 print:text-gray-500">استلمت المبلغ كاملاً وصحيحاً</span>
              </div>
            </div>

            {/* Action Bar (Screen Only) */}
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          /* 2. New Payment Voucher Creation Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* Beneficiary Type Selection */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">نوع جهة الصرف (يصرف للأخ / السادة):</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setPartyType('owner');
                    setPartyName('مالك المركز (مسحوبات شخصية)');
                    setDescription('مسحوبات شخصية للمالك من أرباح النشاط');
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'owner'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  👤 مسحوبات مالك
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPartyType('supplier');
                    setPartyName('');
                    setDescription('سداد دفعة حساب للمورد');
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'supplier'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🚚 سداد مورد
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPartyType('worker');
                    setPartyName('');
                    setDescription('سلفة نقدية للفني');
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'worker'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🔧 سلفة فني
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPartyType('expense');
                    setPartyName('');
                    setDescription('مصروف تشغيلي');
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'expense'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  ⚡ مصاريف تشغيل
                </button>
              </div>

              {/* Dynamic Party Selector */}
              {partyType === 'owner' && (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 text-white">
                        <span>👤 مسحوبات المالك الشخصية (جاري المالك 3101)</span>
                      </span>
                      {ownerAnalytics && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            ownerAnalytics.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ownerAnalytics.status === 'caution'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {ownerAnalytics.status === 'safe'
                            ? 'سحب آمن (ضمن الأرباح)'
                            : ownerAnalytics.status === 'caution'
                            ? 'تنبيه: اقتراب من كامل الأرباح'
                            : 'تحذير: استنزاف رأس المال العامل'}
                        </span>
                      )}
                    </div>

                    {ownerAnalytics && (
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">أرباح الشهر الصافية:</span>
                          <span className="font-bold text-emerald-400 text-[11px]">
                            {Number(ownerAnalytics.net_operating_profit || 0).toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">مسحوبات الشهر السابقة:</span>
                          <span className="font-bold text-rose-400 text-[11px]">
                            {Number(ownerAnalytics.total_drawings || 0).toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">حد السحب الآمن (70%):</span>
                          <span className="font-bold text-purple-300 text-[11px]">
                            {Number(ownerAnalytics.safe_cap_amount || 0).toLocaleString()} ر.ي
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-300 border-t border-white/5 pt-1.5">
                      القيد المحاسبي يوجه مباشرة إلى حساب (3101) لحماية دقة قائمة الدخل وصافي أرباح الورشة.
                    </p>
                  </div>
                </div>
              )}

              {partyType === 'supplier' && (
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    setSelectedPartyId(e.target.value);
                    const s = suppliers.find((item) => String(item.id) === String(e.target.value));
                    if (s) {
                      setPartyName(s.name);
                      if (s.balance_due && Number(s.balance_due) > 0) setAmount(String(s.balance_due));
                    }
                  }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
                >
                  <option value="">-- اختر المورد المسدد له --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.company_name || 'مورد'}) &bull; مستحق له: {Number(s.balance_due).toLocaleString()} ر.ي
                    </option>
                  ))}
                </select>
              )}

              {partyType === 'worker' && (
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    setSelectedPartyId(e.target.value);
                    const w = workers.find((item) => String(item.id) === String(e.target.value));
                    if (w) setPartyName(w.name);
                  }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
                >
                  <option value="">-- اختر الفني / العامل المستلم للسلفة --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role_title || 'فني'})
                    </option>
                  ))}
                </select>
              )}

              {partyType === 'expense' && (
                <input
                  type="text"
                  placeholder="اسم المستلم أو جهة الصرف (مثال: محطة الديزل، مالك العقار، فواتير الكهرباء)..."
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold"
                  required
                />
              )}
            </div>

            {/* Amount and Paper Booklet Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">المبلغ المصروف (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 30000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">رقم السند بالدفتر الورقي (اختياري):</label>
                <input
                  type="text"
                  placeholder="رقم السند اليدوي بالدفتر"
                  value={paperBillNumber}
                  onChange={(e) => setPaperBillNumber(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold"
                  title="لمقارنة الحسابات مع الدفاتر الورقية"
                />
              </div>
            </div>

            {/* Live Verbal Tafqeet */}
            {Number(amount) > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="text-slate-400 block text-[10px]">المبلغ بالحروف (التفقيط المعتمد):</span>
                <span className="font-bold text-amber-300">{verbalAmount}</span>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">طريقة الصرف / الحساب المسحوب منه:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer font-bold"
              >
                <option value="cash">💵 نقداً - يصرف من صندوق الكاشير (حساب 1101)</option>
                <option value="kuraimi">🏦 تحويل بنكي - من حساب بنك الكريمي (حساب 1102)</option>
                <option value="jeeb">📱 محفظة إلكترونية - من محفظة جيب (حساب 1103)</option>
              </select>
            </div>

            {/* Description / Purpose */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">البيان (وذلك مقابل):</label>
              <input
                type="text"
                placeholder="سداد دفعة، مسحوبات شخصية، إيجار..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || Number(amount) <= 0}
                className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'جاري الترحيل...' : 'اعتماد وحفظ السند 📤'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
