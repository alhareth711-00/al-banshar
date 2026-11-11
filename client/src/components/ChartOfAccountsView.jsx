import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  ShieldCheck,
  Edit3,
  Trash2,
  Lock,
  Layers,
  ArrowRightLeft,
  Landmark,
  Wallet,
  ShoppingBag,
  CreditCard,
  Building,
  Users,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import AddEditAccountModal from './AddEditAccountModal';
import AccountLedgerModal from './AccountLedgerModal';
import { tafqeet } from '../utils/tafqeet';

const ROOT_COLORS = {
  '1': {
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    bgLight: 'bg-sky-500/5',
    label: 'الأصول والموجودات',
  },
  '2': {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    bgLight: 'bg-amber-500/5',
    label: 'الخصوم والالتزامات',
  },
  '3': {
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    bgLight: 'bg-purple-500/5',
    label: 'حقوق الملكية',
  },
  '4': {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    bgLight: 'bg-emerald-500/5',
    label: 'الإيرادات والمبيعات',
  },
  '5': {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    bgLight: 'bg-rose-500/5',
    label: 'تكلفة المبيعات COGS',
  },
  '6': {
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    bgLight: 'bg-orange-500/5',
    label: 'المصروفات التشغيلية',
  },
};

export default function ChartOfAccountsView({ onNavigateToVouchers }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [treeAccounts, setTreeAccounts] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedRootFilter, setSelectedRootFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  // Expanded nodes map (code -> boolean)
  const [expandedNodes, setExpandedNodes] = useState({});

  // Modals
  const [modalState, setModalState] = useState({
    isOpen: false,
    parentAccount: null,
    editAccount: null,
  });

  const [ledgerModalState, setLedgerModalState] = useState({
    isOpen: false,
    accountCode: null,
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    account: null,
  });

  // Load Accounts
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [flatRes, treeRes] = await Promise.all([
        fetch('/api/accounting/accounts'),
        fetch('/api/accounting/accounts?tree=true'),
      ]);

      const flatData = await flatRes.json();
      const treeData = await treeRes.json();

      if (flatData.success) {
        setAccounts(flatData.data || []);
      }
      if (treeData.success) {
        setTreeAccounts(treeData.data || []);
        // By default expand level 1 and level 2 nodes
        const defaultExpanded = {};
        const expandRecursive = (nodes) => {
          for (const n of nodes) {
            if ((n.level || 1) <= 2) {
              defaultExpanded[n.code] = true;
            }
            if (n.children?.length > 0) {
              expandRecursive(n.children);
            }
          }
        };
        expandRecursive(treeData.data || []);
        setExpandedNodes((prev) => ({ ...defaultExpanded, ...prev }));
      }
    } catch (err) {
      setError('فشل في جلب شجرة الحسابات من الخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Toggle node expand/collapse
  const toggleNode = (code) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    const allExp = {};
    for (const a of accounts) {
      allExp[a.code] = true;
    }
    setExpandedNodes(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Summary Metrics Calculation
  const metrics = useMemo(() => {
    const rootMap = {};
    for (const a of treeAccounts) {
      rootMap[a.code] = Number(a.rollup_balance) || 0;
    }

    const assets = rootMap['1'] || 0;
    const liabilities = rootMap['2'] || 0;
    const equity = rootMap['3'] || 0;
    const revenues = rootMap['4'] || 0;
    const cogs = rootMap['5'] || 0;
    const expenses = rootMap['6'] || 0;
    const netProfit = revenues - (cogs + expenses);

    return {
      assets,
      liabilities,
      equity,
      revenues,
      cogs,
      expenses,
      netProfit,
    };
  }, [treeAccounts]);

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!deleteConfirmation.account) return;
    const code = deleteConfirmation.account.code;
    setError('');
    try {
      const res = await fetch(`/api/accounting/accounts/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل في حذف الحساب');
      }
      setSuccessMessage(`تم حذف الحساب (${code}) بنجاح`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setDeleteConfirmation({ isOpen: false, account: null });
      loadAccounts();
    } catch (err) {
      setError(err.message);
      setDeleteConfirmation({ isOpen: false, account: null });
    }
  };

  // Filtered Tree Renderer
  const filterMatches = useCallback(
    (node) => {
      // Root filter check
      if (selectedRootFilter !== 'all') {
        const rootCode = node.code[0];
        if (rootCode !== selectedRootFilter) return false;
      }

      // Inactive check
      if (!showInactive && node.is_active === 0) {
        return false;
      }

      // Search check
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const codeMatch = node.code.toLowerCase().includes(s);
        const nameMatch = node.name.toLowerCase().includes(s);
        const descMatch = (node.description || '').toLowerCase().includes(s);
        if (codeMatch || nameMatch || descMatch) return true;

        // If child matches, parent should be visible
        if (node.children?.some(filterMatches)) return true;

        return false;
      }

      return true;
    },
    [search, selectedRootFilter, showInactive]
  );

  // Render a Single Node & Children Recursively
  const renderNode = (node) => {
    if (!filterMatches(node)) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = Boolean(expandedNodes[node.code]);
    const rootCode = node.code[0];
    const rootColor = ROOT_COLORS[rootCode] || ROOT_COLORS['1'];
    const isLeaf = !hasChildren;
    const balance = isLeaf ? node.direct_balance : node.rollup_balance;
    const isNormalDebit = node.normal_balance === 'debit';
    const isInactive = node.is_active === 0;

    return (
      <div key={node.code} className="group">
        <div
          className={`flex items-center justify-between py-2.5 px-3 rounded-2xl border transition my-1 ${
            node.level === 1
              ? `${rootColor.bgLight} ${rootColor.border} font-black text-sm`
              : node.level === 2
              ? 'bg-slate-900/80 border-white/10 font-bold text-xs hover:border-white/20'
              : 'bg-slate-950/40 border-white/5 font-medium text-xs hover:bg-white/5 hover:border-white/10'
          } ${isInactive ? 'opacity-50 grayscale' : ''}`}
          style={{ paddingRight: `${Math.max(12, (node.level - 1) * 24 + 12)}px` }}
        >
          {/* Right side: Expand toggle + Code badge + Name + Subtype */}
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.code)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              </span>
            )}

            {/* Account Code Badge */}
            <span
              className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs border shrink-0 ${
                node.level === 1 ? rootColor.badge : 'bg-slate-900 border-white/15 text-amber-300'
              }`}
            >
              {node.code}
            </span>

            {/* Account Name */}
            <span
              className={`truncate ${
                node.level === 1 ? 'text-white text-sm font-black' : 'text-slate-200 font-bold'
              }`}
              title={node.description || node.name}
            >
              {node.name}
            </span>

            {/* Inactive tag */}
            {isInactive && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold shrink-0">
                معطل
              </span>
            )}

            {/* System lock indicator */}
            {node.is_system === 1 && (
              <span
                className="text-slate-500 shrink-0"
                title="حساب قياسي أساسي في بنية النظام المحاسبي"
              >
                <Lock className="w-3 h-3 text-slate-500 inline" />
              </span>
            )}

            {/* Children count badge */}
            {hasChildren && (
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                ({node.children.length} فروع)
              </span>
            )}
          </div>

          {/* Left side: Balance + Badges + Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Balance Badge */}
            <div className="text-left font-mono">
              <span
                className={`text-xs font-black ${
                  balance > 0
                    ? 'text-emerald-400'
                    : balance < 0
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {Number(balance).toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
              </span>
              <span className="block text-[9px] text-slate-500 text-left">
                {hasChildren ? 'مجمّع' : isNormalDebit ? 'مدين' : 'دائن'}
              </span>
            </div>

            {/* Quick Actions (Hover visible) */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
              {/* Add child button */}
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    parentAccount: node,
                    editAccount: null,
                  })
                }
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition"
                title="إضافة حساب فرعي متفرع من هذا الحساب"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* View Ledger Statement */}
              <button
                type="button"
                onClick={() =>
                  setLedgerModalState({
                    isOpen: true,
                    accountCode: node.code,
                  })
                }
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition"
                title="عرض دفتر الأستاذ وكشف حركة الحساب"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    parentAccount: null,
                    editAccount: node,
                  })
                }
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition"
                title="تعديل اسم أو وصف الحساب"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Delete Button (Allowed for non-system accounts) */}
              {node.is_system === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmation({
                      isOpen: true,
                      account: node,
                    })
                  }
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition"
                  title="حذف هذا الحساب"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Children Rows */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 p-4 sm:p-6 text-right">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400">
            <FolderTree className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                شجرة الحسابات والدليل المحاسبي العام
              </h1>
              <span className="px-2.5 py-0.5 rounded-xl font-mono font-bold text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {accounts.length} حسابات
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              الهيكل المالي المركزي المتكامل مع مبيعات الكاشير، المشتريات، الخزينة، والمصروفات
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            📂 توسيع الكل
          </button>

          <button
            type="button"
            onClick={handleCollapseAll}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            📁 طي الكل
          </button>

          <button
            type="button"
            onClick={loadAccounts}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition"
            title="تحديث الشجرة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() =>
              setModalState({
                isOpen: true,
                parentAccount: null,
                editAccount: null,
              })
            }
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold mb-3 flex items-center gap-2 shrink-0 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold mb-3 flex items-center gap-2 shrink-0 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Pulse Financial Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4 shrink-0 text-xs">
        {/* 1 - Assets */}
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
          <span className="text-[10px] text-sky-400 font-bold block mb-1">1. إجمالي الأصول:</span>
          <span className="font-mono font-black text-sm sm:text-base text-sky-300">
            {Number(metrics.assets).toLocaleString()} <span className="text-[9px] text-sky-400/80">ر.ي</span>
          </span>
        </div>

        {/* 2 - Liabilities */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-amber-400 font-bold block mb-1">2. إجمالي الخصوم:</span>
          <span className="font-mono font-black text-sm sm:text-base text-amber-300">
            {Number(metrics.liabilities).toLocaleString()} <span className="text-[9px] text-amber-400/80">ر.ي</span>
          </span>
        </div>

        {/* 3 - Equity */}
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-[10px] text-purple-400 font-bold block mb-1">3. حقوق الملكية:</span>
          <span className="font-mono font-black text-sm sm:text-base text-purple-300">
            {Number(metrics.equity).toLocaleString()} <span className="text-[9px] text-purple-400/80">ر.ي</span>
          </span>
        </div>

        {/* 4 - Revenues */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400 font-bold block mb-1">4. إجمالي الإيرادات:</span>
          <span className="font-mono font-black text-sm sm:text-base text-emerald-300">
            {Number(metrics.revenues).toLocaleString()} <span className="text-[9px] text-emerald-400/80">ر.ي</span>
          </span>
        </div>

        {/* 5 & 6 - COGS & Expenses */}
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-[10px] text-rose-400 font-bold block mb-1">5 & 6. التكلفة والمصروفات:</span>
          <span className="font-mono font-black text-sm sm:text-base text-rose-300">
            {Number(metrics.cogs + metrics.expenses).toLocaleString()} <span className="text-[9px] text-rose-400/80">ر.ي</span>
          </span>
        </div>

        {/* Net Profit */}
        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40">
          <span className="text-[10px] text-amber-300 font-black block mb-1">⚖️ صافي النشاط التراكمي:</span>
          <span className="font-mono font-black text-sm sm:text-base text-amber-400">
            {Number(metrics.netProfit).toLocaleString()} <span className="text-[9px] text-amber-300">ر.ي</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedRootFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              selectedRootFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            جميع الأبواب
          </button>

          {Object.entries(ROOT_COLORS).map(([code, meta]) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedRootFilter(code)}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                selectedRootFilter === code
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <span>{code}.</span>
              <span>{meta.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Search input & Active Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>إظهار المعطلة</span>
          </label>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالرمز أو اسم الحساب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Main Tree Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <p className="text-xs font-bold">جارٍ تجميع وتنسيق شجرة الحسابات بالأرصدة التراكمية...</p>
          </div>
        ) : treeAccounts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
            <FolderTree className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">لا توجد حسابات مسجلة في الشجرة</p>
          </div>
        ) : (
          <div className="space-y-2 pb-6">
            {treeAccounts.map((rootNode) => renderNode(rootNode))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalState.isOpen && (
        <AddEditAccountModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, parentAccount: null, editAccount: null })}
          onSaved={() => {
            loadAccounts();
            setSuccessMessage('تم حفظ بيانات الحساب بنجاح');
            setTimeout(() => setSuccessMessage(''), 4000);
          }}
          parentAccount={modalState.parentAccount}
          editAccount={modalState.editAccount}
          allAccounts={accounts}
        />
      )}

      {/* Account Ledger Statement Modal */}
      {ledgerModalState.isOpen && (
        <AccountLedgerModal
          isOpen={ledgerModalState.isOpen}
          onClose={() => setLedgerModalState({ isOpen: false, accountCode: null })}
          accountCode={ledgerModalState.accountCode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && deleteConfirmation.account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md p-6 shadow-2xl text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-bold">
              <span className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base text-white font-extrabold">تأكيد حذف الحساب</h3>
                <p className="text-xs text-slate-400">
                  {deleteConfirmation.account.name} ({deleteConfirmation.account.code})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الحساب؟ إذا كان الحساب مرتبطاً بأي عمليات أو قيود سابقة سيمنعك النظام المحاسبي تلقائياً لحماية توازن ميزان المراجعة.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, account: null })}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30"
              >
                نعم، احذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
