import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Printer,
  Check,
  User,
  DollarSign,
  CreditCard,
  FileText,
  Building,
  CheckCircle,
  Share2,
} from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function ReceiptVoucherModal({
  isOpen,
  onClose,
  initialData = null,
  vehicles = [],
  onVoucherCreated,
}) {
  const [partyType, setPartyType] = useState('customer'); // 'customer' | 'other'
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'kuraimi' | 'jeeb'
  const [paperBillNumber, setPaperBillNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [printedVoucher, setPrintedVoucher] = useState(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.party_type === 'customer' || initialData.vehicle_id) {
        setPartyType('customer');
        setSelectedVehicleId(String(initialData.vehicle_id || initialData.id || ''));
        setPartyName(initialData.customer_name ? `${initialData.customer_name} (${initialData.plate_number})` : '');
        if (initialData.balance_due) {
          setAmount(String(initialData.balance_due));
        }
      } else {
        setPartyType(initialData.party_type || 'other');
        setPartyName(initialData.party_name || '');
        if (initialData.amount) setAmount(String(initialData.amount));
      }
      if (initialData.description) setDescription(initialData.description);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVehicleSelect = (e) => {
    const vId = e.target.value;
    setSelectedVehicleId(vId);
    const v = vehicles.find((item) => String(item.id) === String(vId));
    if (v) {
      setPartyName(`${v.customer_name} (${v.plate_number} - ${v.car_make_model || ''})`);
      if (v.balance_due && Number(v.balance_due) > 0) {
        setAmount(String(v.balance_due));
        setDescription(`سداد حساب آجل للسيارة ${v.plate_number}`);
      }
    }
  };

  const selectedVehicleObj = vehicles.find((v) => String(v.id) === String(selectedVehicleId));
  const verbalAmount = tafqeet(Number(amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        voucher_type: 'receipt',
        party_type: partyType,
        party_id: partyType === 'customer' && selectedVehicleId ? Number(selectedVehicleId) : null,
        party_name: partyName.trim() || (partyType === 'customer' ? 'عميل' : 'مستلم عام'),
        amount: numAmount,
        payment_method: paymentMethod,
        paper_bill_number: paperBillNumber.trim() || null,
        description: description.trim() || 'سند قبض نقدية رسمي',
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/vouchers/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في حفظ سند القبض');
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-4 text-right cursor-default">
        {/* Header (Screen only) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-emerald-500/10 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {printedVoucher ? 'سند قبض رسمي معتمد' : 'إصدار سند قبض نقدية رسمي'}
              </h3>
              <p className="text-[11px] text-amber-300 font-medium">
                {printedVoucher
                  ? `رقم السند: ${printedVoucher.voucher_number}`
                  : '💡 تلميح: استخدم هذا السند عند استلام مبالغ كاش أو حوالات من الزبائن لتسديد دين سابق أو دفعة مقدماً.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {printedVoucher && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
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

        {/* 1. If Voucher is Already Saved -> Printable Paper View */}
        {printedVoucher ? (
          <div className="p-6 sm:p-8 bg-slate-900/90 text-slate-100 print:bg-white print:text-black">
            {/* Header */}
            <div className="border-b-2 border-emerald-500/40 pb-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-emerald-400 print:text-black">
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
                  <div className="inline-block px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-black text-emerald-400 print:text-black print:border-black text-sm">
                    سند قبض / RECEIPT VOUCHER
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
                <span className="text-[11px] text-slate-400 print:text-gray-600 block">المبلغ المقبوض رقماً:</span>
                <span className="text-2xl font-black font-mono text-emerald-400 print:text-black">
                  {Number(printedVoucher.amount).toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 print:text-gray-600 block">طريقة القبض:</span>
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
                <span className="text-sm font-bold text-amber-400 print:text-black">
                  {printedVoucher.party_type === 'customer' ? 'تحصيل دفعة حساب عميل' : 'إيراد نقدية'}
                </span>
              </div>
            </div>

            {/* Verbal & Beneficiary */}
            <div className="space-y-3 text-xs leading-relaxed border-b border-white/10 print:border-gray-300 pb-5 mb-5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">استلمنا من الأخ / السادة:</span>
                <span className="font-extrabold text-white print:text-black text-sm">
                  {printedVoucher.party_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">مبلغ وقدره بالحروف:</span>
                <span className="font-extrabold text-emerald-300 print:text-black underline decoration-emerald-500/50">
                  {tafqeet(printedVoucher.amount)}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">وذلك مقابل (البيان):</span>
                <span className="font-semibold text-slate-200 print:text-black">
                  {printedVoucher.description || 'سداد دفعة نقدية معتمدة'}
                </span>
              </div>
            </div>

            {/* Balance Breakdown if Customer */}
            {printedVoucher.party_type === 'customer' && printedVoucher.prev_balance > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 print:border-gray-300 print:bg-white mb-6">
                <div className="text-[11px] font-bold text-slate-400 print:text-gray-700 mb-2">
                  حالة حساب العميل بعد هذا السند:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/5 print:border print:border-gray-200">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">الرصيد السابق</span>
                    <span className="font-mono font-bold text-slate-300 print:text-black">
                      {Number(printedVoucher.prev_balance).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 print:border-black">
                    <span className="text-[10px] text-emerald-300 print:text-gray-600 block">المبلغ المقبوض</span>
                    <span className="font-mono font-black text-emerald-400 print:text-black">
                      - {Number(printedVoucher.amount).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 print:border-black">
                    <span className="text-[10px] text-amber-300 print:text-gray-600 block">الرصيد المتبقي عليه</span>
                    <span className="font-mono font-black text-amber-400 print:text-black">
                      {Number(printedVoucher.new_balance).toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-slate-700 print:border-black pt-2">
                <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المستلم (أمين الصندوق)</span>
                <div className="h-10"></div>
                <span className="text-[10px] text-slate-500 print:text-gray-500">تم الترحيل للقيد المزدوج آلياً</span>
              </div>
              <div className="border-t border-slate-700 print:border-black pt-2">
                <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المسلّم (العميل)</span>
                <div className="h-10"></div>
                <span className="text-[10px] text-slate-500 print:text-gray-500">شكراً لتعاملكم معنا</span>
              </div>
            </div>

            {/* Action Bar (Screen Only) */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div>
                {selectedVehicleObj?.phone && (
                  <a
                    href={formatYemeniWhatsAppLink(
                      selectedVehicleObj.phone,
                      `*سند قبض مالي رسمي - ${getShopSettings().shopName || 'مركز الصقر'}* 🦅\nتحية طيبة أخي الكريم: *${printedVoucher.party_name}*\nتم استلام دفعة من حسابكم بموجب:\n📄 *سند قبض رقم:* ${printedVoucher.voucher_number}${printedVoucher.paper_bill_number ? `\n📑 رقم السند الدفتري: ${printedVoucher.paper_bill_number}` : ''}\n💵 *المبلغ المستلم:* ${Number(printedVoucher.amount).toLocaleString()} ريال يمني (${tafqeet(Number(printedVoucher.amount))})\n💳 *طريقة الدفع:* ${printedVoucher.payment_method === 'cash' ? 'نقداً بالصندوق' : printedVoucher.payment_method}${printedVoucher.prev_balance > 0 ? `\n\n📊 *تفاصيل الحساب:*\n- الرصيد السابق: ${Number(printedVoucher.prev_balance).toLocaleString()} ر.ي\n- الدفعة المقبوضة: ${Number(printedVoucher.amount).toLocaleString()} ر.ي\n- الرصيد المتبقي عليكم: ${Number(printedVoucher.new_balance).toLocaleString()} ر.ي` : ''}\n\nنسعد دائماً بخدمتكم وشكراً لتعاملكم معنا! 🤝`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>إرسال إشعار للعميل عبر الواتساب 📱</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 2. New Receipt Voucher Creation Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* Party Type Select */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">جهة القبض (من الأخ / السادة):</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setPartyType('customer')}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'customer'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🚗 سداد دين عميل / سيارة
                </button>
                <button
                  type="button"
                  onClick={() => setPartyType('other')}
                  className={`p-2.5 rounded-xl font-bold text-xs border transition ${
                    partyType === 'other'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🏢 جهة أخرى / إيراد متنوع
                </button>
              </div>

              {partyType === 'customer' ? (
                <div className="space-y-2">
                  <select
                    value={selectedVehicleId}
                    onChange={handleVehicleSelect}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
                  >
                    <option value="">-- اختر العميل / لوحة السيارة التي عليها دين --</option>
                    {vehicles
                      .filter((v) => Number(v.balance_due) > 0)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate_number} - {v.customer_name} (دين مستحق: {Number(v.balance_due).toLocaleString()} ر.ي)
                        </option>
                      ))}
                  </select>

                  {selectedVehicleObj && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{selectedVehicleObj.customer_name}</div>
                        <div className="text-slate-400">{selectedVehicleObj.car_make_model} &bull; {selectedVehicleObj.phone}</div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-400 block">إجمالي الدين عليه:</span>
                        <span className="font-black text-rose-400 text-sm">{Number(selectedVehicleObj.balance_due).toLocaleString()} ر.ي</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="اسم الشخص أو الجهة المسلِّمة للمبلغ..."
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
                <label className="block text-slate-300 font-bold mb-1.5">المبلغ المقبوض (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="text-slate-400 block text-[10px]">المبلغ بالحروف (التفقيط المعتمد):</span>
                <span className="font-bold text-emerald-300">{verbalAmount}</span>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">طريقة القبض / الحساب المستلم:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer font-bold"
              >
                <option value="cash">💵 نقداً - يورد إلى صندوق الكاشير (حساب 1101)</option>
                <option value="kuraimi">🏦 تحويل بنكي - حساب مصرف الكريمي (حساب 1102)</option>
                <option value="jeeb">📱 محفظة إلكترونية - محفظة جيب (حساب 1103)</option>
              </select>
            </div>

            {/* Description / Purpose */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">البيان (وذلك مقابل):</label>
              <input
                type="text"
                placeholder="سداد دفعة من الحساب، دفعة مقدمة..."
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
                className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'جاري الترحيل...' : 'اعتماد وحفظ السند 📥'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
