import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Search,
  Printer,
  Share2,
  Calendar,
  Building,
  User,
  Car,
  Wrench,
  CheckCircle,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function StatementOfAccountModal({ isOpen, onClose, initialPartyType = 'customer', initialPartyId = null }) {
  const [partyType, setPartyType] = useState(initialPartyType); // 'customer' | 'supplier' | 'worker'
  const [partyId, setPartyId] = useState(initialPartyId);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyList, setPartyList] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);

  // Date filters
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paperBillFilter, setPaperBillFilter] = useState('');

  // Data & State
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState('a4'); // 'a4' | 'thermal'
  const [copied, setCopied] = useState(false);

  const printRef = useRef(null);
  const settings = getShopSettings();

  // Load parties list based on selected party type
  useEffect(() => {
    if (!isOpen) return;

    const loadParties = async () => {
      try {
        let endpoint = '/api/vehicles';
        if (partyType === 'supplier') endpoint = '/api/suppliers';
        if (partyType === 'worker') endpoint = '/api/workers';

        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success) {
          setPartyList(data.data || []);
          // Auto select first or matching
          if (initialPartyId && partyType === initialPartyType) {
            const match = (data.data || []).find((p) => p.id === Number(initialPartyId));
            if (match) {
              setSelectedParty(match);
              setPartyId(match.id);
            }
          } else if ((data.data || []).length > 0 && !selectedParty) {
            setSelectedParty(data.data[0]);
            setPartyId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading parties:', err);
      }
    };

    loadParties();
  }, [isOpen, partyType]);

  // Fetch statement data when party or dates change
  const fetchStatement = async () => {
    if (!partyId) return;

    try {
      setLoading(true);
      let url = `/api/accounting/statement-of-account?party_type=${partyType}&party_id=${partyId}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (paperBillFilter.trim()) url += `&paper_bill_number=${encodeURIComponent(paperBillFilter.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStatement(data.data);
      }
    } catch (err) {
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyId) {
      fetchStatement();
    }
  }, [partyId, partyType, startDate, endDate, paperBillFilter]);

  // Handle Quick Date Filters
  const handleDatePreset = (preset) => {
    setDateFilter(preset);
    const today = new Date().toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'month') {
      const firstDay = new Date();
      firstDay.setDate(1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today);
    }
  };

  if (!isOpen) return null;

  // Filter party search
  const filteredParties = partyList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    if (partyType === 'customer') {
      return (
        (p.plate_number && p.plate_number.toLowerCase().includes(q)) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
      );
    } else if (partyType === 'supplier') {
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.company_name && p.company_name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
      );
    } else {
      return p.name && p.name.toLowerCase().includes(q);
    }
  });

  // Prepare WhatsApp text
  const formatWhatsAppMessage = () => {
    if (!statement) return '';

    const roleLabel = partyType === 'customer' ? 'العميل الكريم' : partyType === 'supplier' ? 'المورد الكريم' : 'الفني';
    const linesText = (statement.statement_lines || [])
      .slice(-5)
      .map(
        (l) =>
          `• ${l.entry_date} [${l.description}]: ${l.debit > 0 ? `مدين (+${l.debit})` : `دائن (-${l.credit})`} | رصيد: ${l.running_balance.toLocaleString()} ر.ي`
      )
      .join('\n');

    return `*كشف حساب مالي - مركز ${settings.shopName}*
إلى: ${roleLabel} / ${statement.party_name}
الفترة: من ${statement.start_date} إلى ${statement.end_date}

- الرصيد الافتتاحي السابق: ${statement.opening_balance.toLocaleString()} ر.ي
- إجمالي الحركات المدينة (عليك): ${statement.total_debits.toLocaleString()} ر.ي
- إجمالي المقبوضات/السداد (لك): ${statement.total_credits.toLocaleString()} ر.ي
*الرصيد الختامي المستحق: ${statement.closing_balance.toLocaleString()} ر.ي*

آخر الحركات:
${linesText}

لأي استفسار يرجى التواصل مع إدارة المركز. شاكرين حسن تعاونكم.`;
  };

  const whatsappMessage = formatWhatsAppMessage();
  const whatsappUrl = statement && statement.party_phone ? formatYemeniWhatsAppLink(statement.party_phone, whatsappMessage) : '#';

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* 1. Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>كشف الحساب المالي التفصيلي (Statement of Account)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 font-mono">
                  ERP LEDGER
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                متابعة الحركات المالية، الأرصدة التراكمية، والطباعة الحرارية والرسمية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Top Filter Controls */}
        <div className="p-4 border-b border-white/10 bg-slate-950/60 space-y-3 flex-shrink-0 text-xs">
          {/* Party Type Tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Type selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setPartyType('customer');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'customer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>زبائن / سيارات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartyType('supplier');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'supplier' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>موردين ووكالات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartyType('worker');
                  setSelectedParty(null);
                  setPartyId(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  partyType === 'worker' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>فنيين وعمال</span>
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'كل المدة' },
                { id: 'today', label: 'اليوم' },
                { id: 'month', label: 'هذا الشهر' },
              ].map((dp) => (
                <button
                  key={dp.id}
                  type="button"
                  onClick={() => handleDatePreset(dp.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    dateFilter === dp.id
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {dp.label}
                </button>
              ))}
            </div>

            {/* Print & Share Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrint('thermal')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold flex items-center gap-1.5 transition active:scale-95"
                title="طباعة على ورق فواتير كاشير حراري 80mm"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>حراري 80mm</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint('a4')}
                className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-500/20"
                title="طباعة كشف حساب رسمي A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>رسمي A4</span>
              </button>

              {statement && statement.party_phone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-1.5 transition active:scale-95"
                  title="إرسال كشف الحساب لواتساب الطرف"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </a>
              )}
            </div>
          </div>

          {/* Party Search & Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Search / Select Party */}
            <div className="relative">
              <input
                type="text"
                placeholder={
                  partyType === 'customer'
                    ? 'بحث برقم اللوحة، اسم العميل أو الهاتف...'
                    : partyType === 'supplier'
                    ? 'بحث باسم المورد أو الشركة...'
                    : 'بحث باسم الفني...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-400"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
            </div>

            {/* Party Selector Dropdown */}
            <div>
              <select
                value={partyId || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPartyId(val);
                  const found = partyList.find((p) => p.id === val);
                  if (found) setSelectedParty(found);
                }}
                className="w-full h-9 px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-blue-400"
              >
                <option value="">-- اختر الطرف لعرض حسابه --</option>
                {filteredParties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {partyType === 'customer'
                      ? `${p.plate_number} - ${p.customer_name} (${p.car_make_model})`
                      : partyType === 'supplier'
                      ? `${p.name} ${p.company_name ? `(${p.company_name})` : ''} - رصيد: ${Number(p.balance_due).toLocaleString()} ر.ي`
                      : `${p.name} (${p.role})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range & Paper Booklet Search */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-28 h-9 px-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-[11px]"
                  title="من تاريخ"
                />
                <span className="text-slate-400">&larr;</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-28 h-9 px-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-[11px]"
                  title="إلى تاريخ"
                />
              </div>

              {/* Upgrade 4: Paper Booklet Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="رقم الدفتر الورقي..."
                  value={paperBillFilter}
                  onChange={(e) => setPaperBillFilter(e.target.value)}
                  className="w-36 h-9 px-3 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  title="مطابقة الحساب بأرقام الدفاتر الورقية"
                />
                {paperBillFilter && (
                  <button
                    onClick={() => setPaperBillFilter('')}
                    className="absolute left-2 top-2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Statement Summary Metrics Cards */}
        {statement && (
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/40 border-b border-white/10 flex-shrink-0 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-slate-400 text-[11px]">الرصيد الافتتاحي السابق:</div>
              <div className="text-base font-black font-mono text-slate-200 mt-0.5">
                {statement.opening_balance.toLocaleString()} ر.ي
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <div className="text-rose-300 text-[11px] flex items-center justify-between">
                <span>إجمالي المدين (عليه / سحب):</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-rose-400 mt-0.5">
                +{statement.total_debits.toLocaleString()} ر.ي
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-emerald-300 text-[11px] flex items-center justify-between">
                <span>إجمالي الدائن (له / سدد):</span>
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                -{statement.total_credits.toLocaleString()} ر.ي
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
              <div className="text-amber-300 text-[11px] font-bold">الرصيد الختامي المستحق:</div>
              <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
                {statement.closing_balance.toLocaleString()} ر.ي
              </div>
            </div>
          </div>
        )}

        {/* 4. Statement Table Body */}
        <div className="flex-1 overflow-y-auto p-4" ref={printRef}>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-2" />
              <span>جاري استخراج كشف الحساب من اليومية العامة...</span>
            </div>
          ) : !statement || (statement.statement_lines || []).length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/40 mb-3" />
              <h4 className="font-bold text-sm text-white">لا توجد حركات مالية مسجلة</h4>
              <p className="text-xs text-slate-400 mt-1">
                {selectedParty ? `الحساب متوازن وصافي الرصيد: ${statement?.closing_balance || 0} ر.ي` : 'يرجى اختيار عميل أو مورد لعرض كشف حسابه'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/10 border-b border-white/10 text-slate-300 font-extrabold sticky top-0 backdrop-blur z-10">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم المستند / السند</th>
                    <th className="p-3">رقم الدفتر اليدوي</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">البيان والتفاصيل</th>
                    <th className="p-3 text-rose-300">مدين (عليه)</th>
                    <th className="p-3 text-emerald-300">دائن (له)</th>
                    <th className="p-3 text-amber-300">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {statement.statement_lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-400">{line.entry_date}</td>
                      <td className="p-3 font-mono font-bold text-white text-[11px]">
                        {line.ref_number || line.entry_number}
                      </td>
                      <td className="p-3 font-mono text-amber-300 text-[11px]">
                        {line.paper_bill_number ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                            {line.paper_bill_number}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            line.ref_type === 'invoice'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : line.ref_type === 'debt_collection'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : line.ref_type === 'purchase'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {line.ref_type === 'invoice'
                            ? 'فاتورة بيع'
                            : line.ref_type === 'debt_collection'
                            ? 'سند قبض'
                            : line.ref_type === 'purchase'
                            ? 'فاتورة شراء'
                            : 'سند مالي'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-white">{line.description}</td>
                      <td className="p-3 font-mono font-bold text-rose-400">
                        {line.debit > 0 ? `+${line.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {line.credit > 0 ? `-${line.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-black text-amber-300">
                        {line.running_balance.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. Footer with Quick Copy */}
        <div className="p-3.5 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>الطرف المحدد:</span>
            <span className="font-extrabold text-white">{statement?.party_name || '---'}</span>
            {statement?.party_phone && (
              <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-white/10">
                {statement.party_phone}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم نسخ الملخص!' : 'نسخ نص كشف الحساب'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINT-READY HIDDEN CONTAINERS (FOR CLEAN PRINTING)
           ========================================================================= */}
        {/* Thermal 80mm Print Layout */}
        <div className={`hidden print:${printMode === 'thermal' ? 'block' : 'hidden'} text-black bg-white p-2 font-mono text-[11px] leading-tight`}>
          <div className="text-center pb-2 border-b border-black">
            <div className="font-bold text-sm">{settings.shopName}</div>
            <div className="text-[10px]">{settings.shopAddress}</div>
            <div className="text-[10px]">هاتف: {settings.shopPhone}</div>
            <div className="font-bold mt-1 text-xs">=== كشف حساب مالي ===</div>
          </div>

          <div className="py-2 text-[10px] space-y-0.5 border-b border-black">
            <div>الطرف: {statement?.party_name}</div>
            <div>الهاتف: {statement?.party_phone}</div>
            <div>الفترة: {statement?.start_date} إلى {statement?.end_date}</div>
            <div>الرصيد السابق: {statement?.opening_balance.toLocaleString()} ر.ي</div>
          </div>

          <table className="w-full text-[9px] my-2 text-right">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">التاريخ</th>
                <th className="py-1">البيان</th>
                <th className="py-1">مدين</th>
                <th className="py-1">دائن</th>
                <th className="py-1">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {(statement?.statement_lines || []).map((l, i) => (
                <tr key={i} className="border-b border-gray-300">
                  <td className="py-0.5">{l.entry_date.slice(5)}</td>
                  <td className="py-0.5 truncate max-w-[80px]">{l.description}</td>
                  <td className="py-0.5">{l.debit || 0}</td>
                  <td className="py-0.5">{l.credit || 0}</td>
                  <td className="py-0.5 font-bold">{l.running_balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-2 border-t-2 border-black space-y-1 font-bold text-xs">
            <div className="flex justify-between">
              <span>إجمالي المدين:</span>
              <span>{statement?.total_debits.toLocaleString()} ر.ي</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي المسدد:</span>
              <span>{statement?.total_credits.toLocaleString()} ر.ي</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-black">
              <span>الرصيد الختامي المستحق:</span>
              <span>{statement?.closing_balance.toLocaleString()} ر.ي</span>
            </div>
          </div>

          <div className="text-center text-[9px] pt-4 mt-2 border-t border-black">
            <div>شكراً لتعاملكم معنا</div>
            <div>طبع بتاريخ: {new Date().toLocaleDateString('ar-YE')}</div>
          </div>
        </div>

        {/* Formal A4 Print Layout */}
        <div className={`hidden print:${printMode === 'a4' ? 'block' : 'hidden'} text-black bg-white p-8 font-sans`}>
          <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">{settings.shopName}</h1>
              <p className="text-xs text-gray-600">{settings.shopAddress} &bull; هاتف: {settings.shopPhone}</p>
              <p className="text-xs text-gray-500">سجل تجاري: {settings.taxNumber || '---'}</p>
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-gray-800 border-2 border-gray-800 px-4 py-1 rounded-lg">
                كشف حساب مالي رسمي
              </div>
              <div className="text-xs text-gray-500 mt-1">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6 text-xs">
            <div>
              <span className="text-gray-500">اسم الحساب / العميل:</span>{' '}
              <span className="font-bold text-gray-900">{statement?.party_name}</span>
            </div>
            <div>
              <span className="text-gray-500">رقم الهاتف:</span>{' '}
              <span className="font-mono font-bold text-gray-900">{statement?.party_phone}</span>
            </div>
            <div>
              <span className="text-gray-500">الفترة المالية:</span>{' '}
              <span className="font-bold text-gray-900">من {statement?.start_date} إلى {statement?.end_date}</span>
            </div>
            <div>
              <span className="text-gray-500">الرصيد الافتتاحي السابق:</span>{' '}
              <span className="font-mono font-bold text-gray-900">{statement?.opening_balance.toLocaleString()} ر.ي</span>
            </div>
          </div>

          <table className="w-full text-xs text-right border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100 border-y border-gray-300">
                <th className="p-2">التاريخ</th>
                <th className="p-2">رقم القيد/السند</th>
                <th className="p-2">البيان</th>
                <th className="p-2 text-red-600">مدين (+)</th>
                <th className="p-2 text-green-600">دائن (-)</th>
                <th className="p-2">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(statement?.statement_lines || []).map((l, i) => (
                <tr key={i}>
                  <td className="p-2 font-mono text-[11px]">{l.entry_date}</td>
                  <td className="p-2 font-mono">{l.ref_number || l.entry_number}</td>
                  <td className="p-2">{l.description}</td>
                  <td className="p-2 font-mono font-bold text-red-600">{l.debit ? l.debit.toLocaleString() : '-'}</td>
                  <td className="p-2 font-mono font-bold text-green-600">{l.credit ? l.credit.toLocaleString() : '-'}</td>
                  <td className="p-2 font-mono font-bold">{l.running_balance.toLocaleString()} ر.ي</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-start pt-4 border-t-2 border-gray-800 text-xs">
            <div className="space-y-1">
              <div>إجمالي المدين: <span className="font-mono font-bold">{statement?.total_debits.toLocaleString()} ر.ي</span></div>
              <div>إجمالي الدائن (المسدد): <span className="font-mono font-bold">{statement?.total_credits.toLocaleString()} ر.ي</span></div>
              <div className="text-base font-black pt-2">الرصيد الختامي المستحق: <span className="font-mono">{statement?.closing_balance.toLocaleString()} ر.ي</span></div>
            </div>

            <div className="flex gap-12 text-center text-xs">
              <div className="w-28 border-t border-gray-400 pt-1">
                <div>ختم المركز</div>
              </div>
              <div className="w-28 border-t border-gray-400 pt-1">
                <div>توقيع المحاسب</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
