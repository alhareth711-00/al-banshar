import React from 'react';
import { Printer, CheckCircle, X, Building2, Calendar, FileText, ArrowDownRight } from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';

export default function SupplierPaymentVoucherModal({ isOpen, onClose, voucherData }) {
  if (!isOpen || !voucherData) return null;

  const {
    voucher_number = 'PV-DRAFT',
    date = new Date().toLocaleString('ar-YE'),
    supplier_name = '',
    supplier_company = '',
    amount = 0,
    payment_method = 'cash',
    notes = '',
    previous_balance = 0,
    remaining_balance = 0,
  } = voucherData;

  const verbalAmount = tafqeet(amount);

  const paymentMethodLabel = {
    cash: 'نقداً من الصندوق (كاش)',
    kuraimi: 'تحويل بنكي / بنك الكريمي',
    jeeb: 'محفظة إلكترونية (جيب)',
    bank: 'حوالة بنكية رسمية',
  }[payment_method] || payment_method;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-6 text-right">
        {/* Modal Top Header (Screen Only) */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">سند صرف رسمي لمورد</h3>
              <p className="text-[11px] text-slate-400">سند مالي معتمد ذو قيد مزدوج آلي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div id="supplier-voucher-print" className="p-6 sm:p-8 bg-slate-900/90 text-slate-100 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b-2 border-emerald-500/40 pb-4 mb-6">
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
                  سند صرف / PAYMENT VOUCHER
                </div>
                <div className="text-xs text-amber-300 print:text-black font-bold mt-1">
                  رقم السند: {voucher_number}
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-600 mt-0.5">
                  التاريخ: {date}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Box Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 print:border-black print:bg-gray-50">
            <div>
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">المبلغ المصروف رقماً:</span>
              <span className="text-2xl font-black font-mono text-emerald-400 print:text-black">
                {Number(amount).toLocaleString()} <span className="text-xs font-sans">ر.ي</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">طريقة الصرف:</span>
              <span className="text-sm font-bold text-slate-200 print:text-black">
                {paymentMethodLabel}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">نوع السند:</span>
              <span className="text-sm font-bold text-amber-400 print:text-black">
                سداد مستحقات مورد آجل
              </span>
            </div>
          </div>

          {/* Verbal Amount & Beneficiary Info */}
          <div className="space-y-3 text-xs leading-relaxed border-b border-white/10 print:border-gray-300 pb-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">يصرف للأخ / السادة:</span>
              <span className="font-extrabold text-white print:text-black text-sm">
                {supplier_name} {supplier_company ? `(${supplier_company})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">مبلغ وقدره بالحروف:</span>
              <span className="font-extrabold text-emerald-300 print:text-black underline decoration-emerald-500/50">
                {verbalAmount}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-400 print:text-gray-700 min-w-[120px]">وذلك مقابل (البيان):</span>
              <span className="font-semibold text-slate-200 print:text-black">
                {notes || 'سداد دفعة من الحساب الآجل للمورد وتخفيض رصيد الذمة الدائنة'}
              </span>
            </div>
          </div>

          {/* Supplier Balances Breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 print:border-gray-300 print:bg-white mb-6">
            <div className="text-[11px] font-bold text-slate-400 print:text-gray-700 mb-2">
              حالة حساب المورد بعد هذا السند:
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-white/5 print:border print:border-gray-200">
                <span className="text-[10px] text-slate-400 print:text-gray-600 block">الرصيد السابق</span>
                <span className="font-mono font-bold text-slate-300 print:text-black">
                  {Number(previous_balance).toLocaleString()} ر.ي
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 print:border-black">
                <span className="text-[10px] text-emerald-300 print:text-gray-600 block">المبلغ المسدد بهذا السند</span>
                <span className="font-mono font-black text-emerald-400 print:text-black">
                  - {Number(amount).toLocaleString()} ر.ي
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 print:border-black">
                <span className="text-[10px] text-amber-300 print:text-gray-600 block">الرصيد المتبقي له</span>
                <span className="font-mono font-black text-amber-400 print:text-black">
                  {Number(remaining_balance).toLocaleString()} ر.ي
                </span>
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-700 print:border-black pt-2">
              <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المحاسب / أمين الصندوق</span>
              <div className="h-10"></div>
              <span className="text-[10px] text-slate-500 print:text-gray-500">تم الترحيل للقيد المزدوج آلياً</span>
            </div>
            <div className="border-t border-slate-700 print:border-black pt-2">
              <span className="block font-bold text-slate-400 print:text-gray-700">توقيع المستلم (المورد أو وكيله)</span>
              <div className="h-10"></div>
              <span className="text-[10px] text-slate-500 print:text-gray-500">استلمت المبلغ كاملاً وصحيحاً</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Screen Only) */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between print:hidden">
          <div className="text-[11px] text-slate-400">
            تم تسجيل السند ضمن القيود المحاسبية المركزية (Debit Accounts Payable 2101 / Credit Cash/Bank 1101)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
