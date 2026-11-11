import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  FolderTree,
  DollarSign,
  AlertCircle,
  Sparkles,
  HelpCircle,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';

const SUB_TYPES = [
  { value: 'cash_drawer', label: '💵 صندوق نقدي (كاشير/درج)', type: 'asset', normal: 'debit' },
  { value: 'bank', label: '🏦 حساب بنكي / مصرفي', type: 'asset', normal: 'debit' },
  { value: 'e_wallet', label: '📱 محفظة إلكترونية (جيب/جوالي/ون كاش...)', type: 'asset', normal: 'debit' },
  { value: 'receivable', label: '👥 ذمم مدينة (عملاء/فنيين)', type: 'asset', normal: 'debit' },
  { value: 'inventory', label: '📦 مخزون بضاعة وأصناف', type: 'asset', normal: 'debit' },
  { value: 'payable', label: '🚚 ذمم دائنة (موردون/التزامات)', type: 'liability', normal: 'credit' },
  { value: 'capital', label: '🏛️ رأس مال / جاري المالك', type: 'equity', normal: 'credit' },
  { value: 'goods_sales', label: '🛒 إيرادات مبيعات بضائع', type: 'revenue', normal: 'credit' },
  { value: 'service_revenue', label: '⚙️ إيرادات خدمات وصيانة وبنشر', type: 'revenue', normal: 'credit' },
  { value: 'operating_expense', label: '📑 مصروف تشغيلي / إداري', type: 'expense', normal: 'debit' },
  { value: 'other', label: '📁 تصنيف عام آخر', type: 'asset', normal: 'debit' },
];

export default function AddEditAccountModal({
  isOpen,
  onClose,
  onSaved,
  parentAccount = null,
  editAccount = null,
  allAccounts = [],
}) {
  const isEdit = Boolean(editAccount);

  const [parentCode, setParentCode] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [subType, setSubType] = useState('operating_expense');
  const [description, setDescription] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isActive, setIsActive] = useState(true);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch next suggested code when parent changes
  const fetchNextCode = async (pCode) => {
    setIsLoadingCode(true);
    try {
      const url = pCode
        ? `/api/accounting/accounts/next-code?parent_code=${encodeURIComponent(pCode)}`
        : '/api/accounting/accounts/next-code';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data?.next_code) {
        setCode(data.data.next_code);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCode(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setError('');

    if (isEdit && editAccount) {
      setCode(editAccount.code || '');
      setName(editAccount.name || '');
      setParentCode(editAccount.parent_code || '');
      setSubType(editAccount.sub_type || 'other');
      setDescription(editAccount.description || '');
      setIsActive(editAccount.is_active !== 0);
      setOpeningBalance('');
    } else {
      // Adding new account
      const p = parentAccount ? parentAccount.code : '';
      setParentCode(p);
      setName('');
      setDescription('');
      setOpeningBalance('');
      setIsActive(true);

      if (parentAccount) {
        // Auto pick subtype based on parent
        if (parentAccount.code.startsWith('11')) setSubType('bank');
        else if (parentAccount.code.startsWith('61')) setSubType('operating_expense');
        else setSubType(parentAccount.sub_type || 'other');
      } else {
        setSubType('operating_expense');
      }

      fetchNextCode(p);
    }
  }, [isOpen, isEdit, editAccount, parentAccount]);

  if (!isOpen) return null;

  const selectedParent = allAccounts.find((a) => a.code === parentCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      setError('يرجى إدخال رمز الحساب واسمه بالكامل');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit) {
        const payload = {
          name: cleanName,
          description: description.trim() || null,
          is_active: isActive ? 1 : 0,
          sub_type: subType,
        };

        const res = await fetch(`/api/accounting/accounts/${encodeURIComponent(editAccount.code)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'فشل في تحديث الحساب');
        }
        if (onSaved) onSaved(data.data);
        onClose();
      } else {
        const payload = {
          code: cleanCode,
          name: cleanName,
          parent_code: parentCode || null,
          sub_type: subType,
          description: description.trim() || null,
          opening_balance: Number(openingBalance) || 0,
          opening_balance_date: openingBalanceDate,
        };

        const res = await fetch('/api/accounting/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'فشل في إنشاء الحساب المالي');
        }
        if (onSaved) onSaved(data.data);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-6 text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300">
              <FolderTree className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {isEdit ? `تعديل الحساب: ${editAccount.name}` : 'إضافة حساب جديد في الشجرة'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEdit
                  ? `رمز الحساب: ${editAccount.code}`
                  : parentAccount
                  ? `يتفرع من الحساب: ${parentAccount.name} (${parentAccount.code})`
                  : 'حساب مالي جديد في الهيكل'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parent Account Select */}
          {!isEdit && (
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                الحساب الأب (المجموعة المتفرع منها):
              </label>
              <select
                value={parentCode}
                onChange={(e) => {
                  setParentCode(e.target.value);
                  fetchNextCode(e.target.value);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
              >
                <option value="">-- حساب رئيسي مستقل (مستوى 1) --</option>
                {allAccounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {'—'.repeat(Math.max(0, (acc.level || 1) - 1))} {acc.code} : {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Code & Next Code Suggester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-bold">رمز الحساب المحاسبي (الكود):</label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => fetchNextCode(parentCode)}
                    disabled={isLoadingCode}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isLoadingCode ? 'جارٍ الاقتراح...' : 'اقتراح تلقائي'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={code}
                disabled={isEdit}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 1106"
                className={`w-full min-h-[44px] px-3.5 rounded-xl border font-mono font-bold text-sm ${
                  isEdit
                    ? 'bg-slate-950 text-slate-400 border-white/5 cursor-not-allowed'
                    : 'bg-slate-900 text-amber-300 border-amber-500/30'
                }`}
                required
              />
            </div>

            {/* Sub Type */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">نوع وتصنيف الحساب:</label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
              >
                {SUB_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">اسم الحساب الرسمي:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: بنك التضامن الإسلامي، مصروف كهرباء الماطور..."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">الوصف والغرض المحاسبي (اختياري):</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ملاحظات حول طبيعة الحساب أو استخداماته..."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
            />
          </div>

          {/* Opening Balance (Only when creating) */}
          {!isEdit && (
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <DollarSign className="w-4 h-4" />
                <span>الرصيد الافتتاحي التأسيسي (اختياري):</span>
              </div>
              <p className="text-[10px] text-slate-400">
                إذا كان لدى الحساب رصيد حالي (مثل أموال في البنك)، يمكنك إدخاله هنا وسيقوم النظام آلياً بإنشاء قيد افتتاحي متوازن مقابل حساب رأس المال (3001).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">المبلغ (ريال يمني):</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-white/15 text-amber-300 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">تاريخ القيد الافتتاحي:</label>
                  <input
                    type="date"
                    value={openingBalanceDate}
                    onChange={(e) => setOpeningBalanceDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Status (when editing) */}
          {isEdit && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/10">
              <div>
                <span className="font-bold text-white text-xs block">حالة تنشيط الحساب:</span>
                <span className="text-[10px] text-slate-400">
                  {isActive ? 'الحساب مفعّل ويظهر في العمليات والسندات' : 'الحساب معطّل ومخفي عن العمليات الجديدة'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isActive ? '✓ مفعّل نشط' : '✕ معطّل مؤقتاً'}
              </button>
            </div>
          )}

          {/* Submit & Cancel */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 text-xs"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الحساب الآن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
