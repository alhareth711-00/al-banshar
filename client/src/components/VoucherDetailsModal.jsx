import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  Edit3,
  Ban,
  FileText,
  DollarSign,
  User,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  Layers,
  History,
  Copy,
  Check,
} from 'lucide-react';
import VoucherPrintTemplate from './VoucherPrintTemplate';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import { tafqeet } from '../utils/tafqeet';

export default function VoucherDetailsModal({
  isOpen,
  onClose,
  voucherId,
  onEditVoucher,
  onVoidVoucher,
}) {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'print'
  const [printMode, setPrintMode] = useState('thermal'); // 'thermal' | 'a4'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && voucherId) {
      setLoading(true);
      setError('');
      fetch(`/api/vouchers/${voucherId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setVoucher(res.data);
          } else {
            setError(res.message || 'فشل في تحميل بيانات السند');
          }
        })
        .catch((err) => {
          setError(err.message || 'خطأ في الاتصال بالخادم');
        })
        .finally(() => setLoading(false));
    } else {
      setVoucher(null);
    }
  }, [isOpen, voucherId]);

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

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppMessage = () => {
    if (!voucher) return '';
    const settings = getShopSettings();
    const isReceipt = voucher.voucher_type === 'receipt';
    const amount = Number(voucher.amount || 0).toLocaleString();
    const tafqeetText = tafqeet(voucher.amount || 0);

    return `🧾 *${isReceipt ? 'سند قبض نقدية رسمي' : 'سند صرف نقدية رسمي'}*
🏛️ *${settings.shopName}*
--------------------------------
🔢 *رقم السند:* ${voucher.voucher_number}
📅 *التاريخ:* ${new Date(voucher.created_at).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
👤 *${isReceipt ? 'المستلم منه' : 'المصروف له'}:* ${voucher.party_name}
💰 *المبلغ:* ${amount} ريال يمني
📝 *تفقيطاً:* فقط ${tafqeetText}
📌 *البيان:* ${voucher.description}
${voucher.new_balance > 0 ? `⚖️ *الرصيد المتبقي:* ${Number(voucher.new_balance).toLocaleString()} ر.ي\n` : ''}--------------------------------
شكراً لتعاملكم معنا 🙏
📞 هاتف المركز: ${settings.shopPhone}`;
  };

  const handleCopyWhatsApp = () => {
    const text = getWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const phone = voucher?.phone || '';
    const link = formatYemeniWhatsAppLink(phone, getWhatsAppMessage());
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/80 backdrop-blur-md select-none print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:bg-white print:rounded-none">
        {/* Top Header - Hidden in Print */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
                voucher?.voucher_type === 'receipt'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  تفاصيل {voucher?.voucher_type === 'receipt' ? 'سند القبض' : 'سند الصرف'}
                </h2>
                {voucher?.voucher_number && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 text-amber-300 font-bold">
                    {voucher.voucher_number}
                  </span>
                )}
                {voucher?.status === 'voided' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                    ملغي 🚫
                  </span>
                )}
                {voucher?.status === 'modified' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    معدل ✏️
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                القيود المحاسبية المزدوجة، مسار الأرصدة، وقوالب الطباعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'details'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                البيانات والقيد
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'print'
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                معاينة الطباعة
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 print:p-0 print:overflow-visible">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs">جاري جلب تفاصيل السند والقيد المحاسبي...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !voucher ? null : activeTab === 'print' ? (
            /* Print View */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-white/5 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">قالب الطباعة:</span>
                  <button
                    onClick={() => setPrintMode('thermal')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      printMode === 'thermal'
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    حراري 80mm
                  </button>
                  <button
                    onClick={() => setPrintMode('a4')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      printMode === 'a4'
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    دفتري A4 / A5
                  </button>
                </div>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (Ctrl + P)</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-4 overflow-x-auto shadow-2xl">
                <VoucherPrintTemplate voucher={voucher} mode={printMode} />
              </div>
            </div>
          ) : (
            /* Main Details & Double-Entry Ledger Tab */
            <div className="space-y-6">
              {/* Top Banner KPI Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block">المبلغ الإجمالي</span>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {Number(voucher.amount).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-normal">ر.ي</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight font-bold">
                    فقط {tafqeet(voucher.amount)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block">الجهة / الطرف</span>
                  <div className="text-sm font-black text-white truncate" title={voucher.party_name}>
                    {voucher.party_name}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    النوع: {voucher.party_type === 'customer' ? 'عميل / سيارة' : voucher.party_type === 'supplier' ? 'مورد بضاعة' : voucher.party_type === 'worker' ? 'فني / عامل' : voucher.party_type === 'owner' ? 'جاري المالك' : 'مصروف تشغيلي'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block">طريقة الدفع والحساب</span>
                  <div className="text-xs font-bold text-amber-300">
                    {voucher.payment_method === 'cash'
                      ? '💵 نقداً (الصندوق 1101)'
                      : voucher.payment_method === 'kuraimi'
                      ? '🏦 بنك الكريمي (1102)'
                      : voucher.payment_method === 'jeeb'
                      ? '📱 محفظة جيب (1103)'
                      : voucher.payment_method === 'jawali'
                      ? '📲 محفظة جوالي (1104)'
                      : '💳 محفظة ون كاش (1105)'}
                  </div>
                  {voucher.paper_bill_number && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      رقم الدفتر: {voucher.paper_bill_number}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block">التوقيت والمُنشئ</span>
                  <div className="text-xs font-mono font-bold text-white">
                    {new Date(voucher.created_at).toLocaleString('ar-YE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    بواسطة: {voucher.created_by || 'أمين الصندوق'}
                  </span>
                </div>
              </div>

              {/* Description Box */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-1">
                <span className="text-xs font-bold text-slate-400 block">البيان والشرح:</span>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {voucher.description}
                </p>
                {voucher.notes && (
                  <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-white/5">
                    <span className="font-bold">ملاحظات إضافية: </span>
                    {voucher.notes}
                  </p>
                )}
                {voucher.void_reason && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <span className="font-bold">سبب الإلغاء: </span>
                    {voucher.void_reason} (بتاريخ {voucher.voided_at})
                  </div>
                )}
              </div>

              {/* Multiline Items Table if any */}
              {voucher.items && voucher.items.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>تفاصيل بنود السند المجزأ ({voucher.items.length} بنود):</span>
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-2.5">البند / الفئة</th>
                          <th className="p-2.5">الحساب المحاسبي</th>
                          <th className="p-2.5">الشرح</th>
                          <th className="p-2.5 text-left">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {voucher.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 font-bold text-white font-sans">{it.category_name || '-'}</td>
                            <td className="p-2.5 text-slate-400">{it.account_code} - {it.account_name || 'مصروف'}</td>
                            <td className="p-2.5 text-slate-300 font-sans">{it.description || '-'}</td>
                            <td className="p-2.5 text-left font-black text-amber-300">
                              {Number(it.amount).toLocaleString()} ر.ي
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Central Accounting Double-Entry Ledger Lines */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs font-bold text-white">
                      قيد اليومية العامة المزدوج (Double-Entry General Ledger):
                    </span>
                    {voucher.journal_entry && (
                      <span className="font-mono text-[11px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                        {voucher.journal_entry.entry_number}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    توازن القيد: 100% متطابق
                  </span>
                </div>

                {voucher.journal_lines && voucher.journal_lines.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-2.5">كود الحساب</th>
                          <th className="p-2.5">اسم الحساب في الدليل</th>
                          <th className="p-2.5">البيان</th>
                          <th className="p-2.5 text-left text-emerald-400">مدين (Debit)</th>
                          <th className="p-2.5 text-left text-rose-400">دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {voucher.journal_lines.map((jl, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 font-bold text-amber-300">{jl.account_code}</td>
                            <td className="p-2.5 font-sans font-medium text-white">{jl.account_name}</td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px] truncate max-w-[200px]" title={jl.description}>
                              {jl.description}
                            </td>
                            <td className="p-2.5 text-left font-black text-emerald-400">
                              {Number(jl.debit) > 0 ? Number(jl.debit).toLocaleString() : '-'}
                            </td>
                            <td className="p-2.5 text-left font-black text-rose-400">
                              {Number(jl.credit) > 0 ? Number(jl.credit).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">
                    تم ترحيل القيد في دفتر اليومية العامة المركزي.
                  </p>
                )}
              </div>

              {/* Audit Trail History if modified */}
              {voucher.audit_logs && voucher.audit_logs.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    <span>سجل التدقيق والتعديلات السابقة ({voucher.audit_logs.length}):</span>
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {voucher.audit_logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-between text-slate-400"
                      >
                        <div>
                          <span className="text-white font-bold">{log.action}</span> بواسطة{' '}
                          <span className="text-amber-400 font-sans">{log.performed_by}</span>
                        </div>
                        <div>
                          {new Date(log.created_at).toLocaleString('ar-YE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Footer - Hidden in Print */}
        <div className="p-4 px-6 border-t border-white/10 bg-slate-950 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('print');
                setTimeout(() => handlePrint(), 100);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-white/10 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة السند</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs flex items-center gap-2 border border-emerald-500/30 transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>إرسال واتساب</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
              title="نسخ نص السند"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {voucher?.status !== 'voided' && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    if (onEditVoucher) onEditVoucher(voucher);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-2 border border-amber-500/40 transition-colors shadow-sm"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>تعديل السند</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onVoidVoucher) onVoidVoucher(voucher);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-2 border border-rose-500/40 transition-colors shadow-sm"
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>إلغاء السند</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
