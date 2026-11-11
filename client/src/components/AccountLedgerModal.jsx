import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Share2,
  Calendar,
  Search,
  Filter,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FileText,
  AlertCircle,
  Building2,
  Phone,
  Layers,
} from 'lucide-react';
import { tafqeet } from '../utils/tafqeet';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

const REF_TYPE_LABELS = {
  invoice: '🛒 فاتورة مبيعات',
  purchase: '📦 فاتورة مشتريات',
  sale_return: '↩️ مرتجع مبيعات',
  purchase_return: '↩️ مرتجع مشتريات',
  expense: '📑 سند صرف مصروف',
  worker_advance: '🔧 سلفة فني',
  debt_collection: '📥 سداد دين عميل',
  supplier_payment: '🚚 سداد دفعة مورد',
  wage_payout: '💵 صرف مستحقات عامل',
  capital_deposit: '🏛️ إيداع رأس مال',
  opening_balance: '🌟 قيد رصيد افتتاحي',
  balance_adjustment: '⚖️ تسوية رصيد',
  closing_entry: '🔒 قيد إقفال سنوي',
};

export default function AccountLedgerModal({ isOpen, onClose, accountCode }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const loadLedger = useCallback(async () => {
    if (!accountCode) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(
        `/api/accounting/accounts/${encodeURIComponent(accountCode)}/ledger?${params.toString()}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'فشل في تحميل كشف الحساب');
      }
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accountCode, fromDate, toDate, search]);

  useEffect(() => {
    if (isOpen && accountCode) {
      loadLedger();
    }
  }, [isOpen, accountCode, loadLedger]);

  if (!isOpen) return null;

  const shopSettings = getShopSettings();
  const account = data?.account;
  const summary = data?.summary || {
    opening_balance: 0,
    period_debit: 0,
    period_credit: 0,
    period_net: 0,
    closing_balance: 0,
    transactions_count: 0,
  };
  const lines = data?.lines || [];

  const verbalClosing = tafqeet(Math.abs(summary.closing_balance || 0));

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (!account || lines.length === 0) return;

    const headers = [
      'م',
      'التاريخ',
      'رقم القيد',
      'نوع الحركة',
      'المرجع',
      'البيان',
      'الطرف المعني',
      'مدين',
      'دائن',
      'الرصيد التراكمي',
    ];

    const rows = lines.map((l, index) => [
      index + 1,
      l.entry_date || '',
      l.entry_number || '',
      REF_TYPE_LABELS[l.ref_type] || l.ref_type || '',
      l.ref_number || '',
      `"${(l.line_description || l.entry_description || '').replace(/"/g, '""')}"`,
      `"${(l.party_name || '').replace(/"/g, '""')}"`,
      l.debit || 0,
      l.credit || 0,
      l.running_balance || 0,
    ]);

    const csvContent =
      '\uFEFF' +
      [
        `"كشف حساب: ${account.name} (${account.code})"`,
        `"تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-YE')}"`,
        `"الرصيد الافتتاحي: ${summary.opening_balance}"`,
        `"الرصيد الختامي: ${summary.closing_balance}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_${account.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!account) return;
    const text = `*📋 كشف حساب الأستاذ العام - ${shopSettings.shopName || 'سريع وبنشر PRO'}*
🏢 *الحساب:* ${account.name} (كود: ${account.code})
📅 *تاريخ الاستخراج:* ${new Date().toLocaleDateString('ar-YE')}
${fromDate ? `🗓️ *الفترة من:* ${fromDate} *إلى:* ${toDate || 'اليوم'}\n` : ''}
💰 *الرصيد الافتتاحي:* ${Number(summary.opening_balance).toLocaleString()} ر.ي
📈 *إجمالي المدين:* ${Number(summary.period_debit).toLocaleString()} ر.ي
📉 *إجمالي الدائن:* ${Number(summary.period_credit).toLocaleString()} ر.ي
⚖️ *الرصيد الصافي الحالي:* *${Number(summary.closing_balance).toLocaleString()} ر.ي*
(${verbalClosing} ريال يمني فقط لا غير)
📊 *عدد القيود المسجلة:* ${summary.transactions_count} حركة

_تم الاستخراج آلياً عبر نظام سريع وبنشر PRO_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 text-right">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">
                  {account ? account.name : 'كشف حساب الأستاذ العام'}
                </h3>
                {account && (
                  <span className="px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    كود: {account.code}
                  </span>
                )}
                {account && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      account.normal_balance === 'debit'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    طبيعة الحساب: {account.normal_balance === 'debit' ? 'مدين' : 'دائن'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {account?.parent_name ? `يندرج تحت: ${account.parent_name}` : 'دفتر الأستاذ والقيود المركزية المعتمدة'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || lines.length === 0}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-1.5"
              title="طباعة كشف الحساب A4"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">طباعة A4</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || lines.length === 0}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-1.5"
              title="تصدير إلى Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={loading || !account}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition flex items-center gap-1.5"
              title="مشاركة عبر WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">واتساب</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar (Screen Only) */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400">من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم القيد أو البيان..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {(fromDate || toDate || search) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearch('');
                }}
                className="text-[11px] text-rose-400 hover:underline px-1"
              >
                إعادة ضبط
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition flex items-center gap-1"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">تحديث</span>
          </button>
        </div>

        {/* Printable Letterhead (Printed only) */}
        <div className="hidden print:block p-6 border-b border-black text-black">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold">{shopSettings.shopName || 'سريع وبنشر PRO'}</h1>
              <p className="text-xs">{shopSettings.address || 'اليمن - صنعاء'}</p>
              <p className="text-xs">هاتف: {shopSettings.phone || '—'}</p>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold border-b pb-1">كشف حركة حساب الأستاذ العام</h2>
              <p className="text-xs mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-3 rounded border border-slate-300">
            <div>
              <p><strong>اسم الحساب:</strong> {account?.name}</p>
              <p><strong>كود الحساب:</strong> {account?.code}</p>
            </div>
            <div>
              <p><strong>الفترة:</strong> {fromDate || 'البداية'} إلى {toDate || 'اليوم'}</p>
              <p><strong>الرصيد الختامي:</strong> {Number(summary.closing_balance).toLocaleString()} ر.ي ({verbalClosing} ريال يمني)</p>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 print:hidden bg-slate-950/40">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-1">الرصيد الافتتاحي السابق:</span>
            <span className="font-mono font-black text-sm sm:text-base text-slate-200">
              {Number(summary.opening_balance).toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-[11px] text-sky-400 flex items-center gap-1 mb-1 font-bold">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              إجمالي الحركات المدينة:
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-sky-300">
              {Number(summary.period_debit).toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mb-1 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              إجمالي الحركات الدائنة:
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-emerald-300">
              {Number(summary.period_credit).toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 block mb-1 font-black">الرصيد الختامي الصافي:</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-black text-base sm:text-lg text-amber-400">
                {Number(summary.closing_balance).toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-300 font-bold">ر.ي</span>
            </div>
          </div>
        </div>

        {/* Transactions Table Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
              <p className="text-xs font-bold">جارٍ استخراج قيود دفتر الأستاذ وحساب الأرصدة...</p>
            </div>
          ) : lines.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-bold text-slate-400">لا توجد قيود أو حركات مسجلة على هذا الحساب في الفترة المحددة</p>
              <p className="text-[11px] text-slate-600 mt-1">الرصيد الحالي للحساب: {Number(summary.closing_balance).toLocaleString()} ر.ي</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-900/90 text-slate-300 font-bold border-b border-white/10 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 w-28">التاريخ</th>
                    <th className="p-3 w-28">رقم القيد</th>
                    <th className="p-3 w-32">نوع العملية</th>
                    <th className="p-3">البيان والطرف المقابل</th>
                    <th className="p-3 w-24 text-left">مدين</th>
                    <th className="p-3 w-24 text-left">دائن</th>
                    <th className="p-3 w-28 text-left bg-white/5">الرصيد المتحرك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                  {/* Prior Opening Balance Row if exists */}
                  {fromDate && (
                    <tr className="bg-white/5 font-bold text-slate-400 italic">
                      <td className="p-2.5 text-center">—</td>
                      <td className="p-2.5 font-mono">{fromDate}</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5">🌟 رصيد ما قبل الفترة</td>
                      <td className="p-2.5">رصيد مرحل تراكمي للحساب قبل تاريخ {fromDate}</td>
                      <td className="p-2.5 text-left font-mono">—</td>
                      <td className="p-2.5 text-left font-mono">—</td>
                      <td className="p-2.5 text-left font-mono text-amber-300 bg-white/5">
                        {Number(summary.opening_balance).toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {lines.map((l, index) => {
                    const isDebit = Number(l.debit) > 0;
                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-white/5 transition group"
                      >
                        <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                          {index + 1}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-400">
                          {l.entry_date?.split(' ')[0] || l.entry_date}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-amber-400/90">
                          {l.entry_number}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-[10px] font-bold text-slate-300">
                            {REF_TYPE_LABELS[l.ref_type] || l.ref_type}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-white text-xs">
                            {l.line_description || l.entry_description || 'قيد محاسبي'}
                          </div>
                          {l.party_name && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="text-amber-400">الطرف:</span> {l.party_name}
                            </div>
                          )}
                          {l.ref_number && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              مرجع: {l.ref_number}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-sky-400">
                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString() : '—'}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-emerald-400">
                          {Number(l.credit) > 0 ? Number(l.credit).toLocaleString() : '—'}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-amber-300 bg-white/5">
                          {Number(l.running_balance).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-white/20">
                  <tr>
                    <td colSpan="5" className="p-3 text-right">
                      المجموع للفترة ({lines.length} حركة):
                    </td>
                    <td className="p-3 text-left font-mono text-sky-400">
                      {Number(summary.period_debit).toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono text-emerald-400">
                      {Number(summary.period_credit).toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono text-amber-400 bg-white/10">
                      {Number(summary.closing_balance).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Bottom Tafqeet Footer */}
          {summary.closing_balance !== 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">الرصيد كتابة بالريال اليمني (التفقيط المعتمد):</span>
                <span className="font-bold text-amber-300">{verbalClosing} ريال يمني فقط لا غير.</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {lines.length} قيود مسجلة
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
