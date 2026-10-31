import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Building2,
  Package,
  Plus,
  Trash2,
  Check,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import SearchableCombobox from './SearchableCombobox';

export default function PurchaseReturnModal({
  isOpen,
  onClose,
  inventory = [],
  suppliers = [],
  initialPurchase = null,
  onReturnCompleted,
}) {
  const [supplierId, setSupplierId] = useState(initialPurchase?.supplier_id ? String(initialPurchase.supplier_id) : '');
  const [supplierName, setSupplierName] = useState(initialPurchase?.supplier_name || '');
  const [purchaseId, setPurchaseId] = useState(initialPurchase?.id ? String(initialPurchase.id) : '');
  const [reason, setReason] = useState('بضاعة تالفة أو عيوب تصنيع');
  const [refundMethod, setRefundMethod] = useState('credit'); // 'credit' (خصم من الدين) | 'cash' (استرداد نقدي) | 'kuraimi'
  const [refundToDrawer, setRefundToDrawer] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Return items
  const [returnItems, setReturnItems] = useState(() => {
    if (initialPurchase?.items && initialPurchase.items.length > 0) {
      return initialPurchase.items.map((i) => ({
        inventory_id: i.inventory_id,
        qty: 1,
        unit_cost: i.unit_cost,
        max_stock: inventory.find((inv) => inv.id === i.inventory_id)?.stock_qty || 99,
      }));
    }
    return [{ inventory_id: '', qty: 1, unit_cost: '', max_stock: 0 }];
  });

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierId));

  // Top suppliers for quick return chips
  const topSuppliers = useMemo(() => {
    return suppliers.slice(0, 5);
  }, [suppliers]);

  // Eligible inventory for returns
  const eligibleInventory = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && i.category !== 'service');
  }, [inventory]);

  // Global Ctrl+Enter shortcut listener
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = document.getElementById('purchase-return-submit-btn');
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  const handleSelectSupplier = (supp) => {
    if (supp) {
      setSupplierId(String(supp.id));
      setSupplierName(supp.name);
    } else {
      setSupplierId('');
      setSupplierName('');
    }
  };

  const handleSupplierChange = (e) => {
    const val = e.target.value;
    setSupplierId(val);
    const found = suppliers.find((s) => String(s.id) === String(val));
    if (found) {
      setSupplierName(found.name);
    } else {
      setSupplierName('');
    }
  };

  const handleItemSelect = (index, invId) => {
    const found = inventory.find((i) => String(i.id) === String(invId));
    setReturnItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        inventory_id: invId,
        unit_cost: found ? found.cost_price : '',
        max_stock: found ? found.stock_qty : 0,
      };
      return updated;
    });
  };

  const handleUpdateLine = (index, field, value) => {
    setReturnItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddLine = () => {
    setReturnItems((prev) => [
      ...prev,
      { inventory_id: '', qty: 1, unit_cost: '', max_stock: 0 },
    ]);
  };

  const handleAddLineAndFocusNext = (currentIdx) => {
    handleAddLine();
    setTimeout(() => {
      const nextInput = document.getElementById(`return-item-input-${currentIdx + 1}`);
      if (nextInput) nextInput.focus();
    }, 100);
  };

  const handleRemoveLine = (index) => {
    if (returnItems.length === 1) return;
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalReturnAmount = useMemo(() => {
    return returnItems.reduce((acc, item) => {
      const q = Number(item.qty) || 0;
      const c = Number(item.unit_cost) || 0;
      return acc + (q * c);
    }, 0);
  }, [returnItems]);

  const reasonsList = [
    'بضاعة تالفة أو عيوب تصنيع',
    'غير مطابقة للمواصفات أو اللزوجة المطلوبة',
    'انتهاء أو قرب انتهاء تاريخ الصلاحية',
    'زيادة عن الطلبية أو خطأ في التوريد',
    'تسوية مرتجع بالاتفاق مع المورد',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validItems = [];
    for (const item of returnItems) {
      if (!item.inventory_id) continue;
      const q = Number(item.qty);
      const c = Number(item.unit_cost);
      if (q <= 0 || c < 0) {
        setError('يرجى التأكد من صحة الكميات وأسعار التكلفة للأصناف المرتجعة');
        return;
      }

      const currentStock = inventory.find((i) => String(i.id) === String(item.inventory_id))?.stock_qty || 0;
      if (q > currentStock) {
        setError(`الكمية المراد إرجاعها (${q}) تتجاوز رصيد المخزن المتوفر حالياً (${currentStock})`);
        return;
      }

      validItems.push({
        inventory_id: Number(item.inventory_id),
        qty: q,
        unit_cost: c,
      });
    }

    if (validItems.length === 0) {
      setError('يرجى اختيار صنف واحد على الأقل لإجراء المرتجع');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        purchase_id: purchaseId ? Number(purchaseId) : null,
        supplier_id: supplierId ? Number(supplierId) : null,
        supplier_name: supplierName.trim() || 'مورد عام',
        total_amount: totalReturnAmount,
        refund_method: refundMethod,
        refund_to_cash_drawer: refundMethod === 'cash' && refundToDrawer,
        reason,
        notes: notes || null,
        items: validItems,
      };

      const res = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل في اعتماد مرتجع المشتريات');
      }

      onReturnCompleted(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-950 border border-white/20 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-rose-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">مرتجع مشتريات رسمي لمورد</h3>
              <p className="text-xs text-slate-400">إرجاع بضاعة تالفة أو غير مطابقة، خصم المخزون، وتعديل الحسابات آلياً</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Reason Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>المورد المرتجع إليه:</span>
                </span>
                {selectedSupplier && (
                  <span className="text-[11px] text-amber-300 font-mono">
                    دين قائم: {Number(selectedSupplier.balance_due).toLocaleString()} ر.ي
                  </span>
                )}
              </label>

              {/* Fast Keyboard-first SearchableCombobox */}
              <SearchableCombobox
                id="return-supplier-combobox"
                options={suppliers}
                value={supplierId}
                onChange={(val) => {
                  const s = suppliers.find((x) => String(x.id) === String(val));
                  handleSelectSupplier(s || null);
                }}
                onSelectOption={(supp) => {
                  handleSelectSupplier(supp);
                }}
                placeholder="ابحث باسم المورد، الشركة، أو الهاتف..."
                searchKeys={['name', 'company_name', 'phone']}
                autoFocus={true}
                onAddNew={(newName) => {
                  setSupplierId('');
                  setSupplierName(newName);
                }}
                addNewLabel="+ قيد كمرتجع لمورد باسم"
                renderOption={(supp) => (
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="truncate text-right">
                        <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                          <span>{supp.name}</span>
                          {supp.company_name && (
                            <span className="text-[11px] text-slate-400 truncate">({supp.company_name})</span>
                          )}
                        </div>
                        {supp.phone && <div className="text-[10px] text-slate-400 font-mono">{supp.phone}</div>}
                      </div>
                    </div>
                    <div className="text-left shrink-0 font-mono text-[11px]">
                      {Number(supp.balance_due) > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
                          دين: {Number(supp.balance_due).toLocaleString()} ر.ي
                        </span>
                      ) : (
                        <span className="text-emerald-400">حساب خالص</span>
                      )}
                    </div>
                  </div>
                )}
              />

              {/* Quick Supplier Chips */}
              {topSuppliers.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-slate-400 shrink-0 font-bold">الموردين:</span>
                  {topSuppliers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSupplier(s)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                        String(supplierId) === String(s.id)
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/40 hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {!supplierId && supplierName && (
                <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center justify-between">
                  <span>اسم المورد للمرتجع: <strong>{supplierName}</strong></span>
                  <button type="button" onClick={() => setSupplierName('')} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">سبب المرتجع:</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-bold cursor-pointer"
              >
                {reasonsList.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Keyboard Shortcuts Hint Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[10px] border border-white/15">Enter ↵</kbd>
                <span>تنقل تلقائي وسطر جديد</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-rose-300 font-mono text-[10px] border border-white/15">Ctrl + Enter</kbd>
                <span>حفظ المرتجع فورياً</span>
              </span>
            </div>
            <span className="flex items-center gap-1 text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono text-[10px] border border-white/15">Esc</kbd>
              <span>إغلاق</span>
            </span>
          </div>

          {/* Return Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-rose-400" />
                <span>الأصناف والكميات المراد إرجاعها (بحث بالكيبورد / باركود):</span>
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 hover:bg-rose-500/30 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ إضافة صنف للمرتجع</span>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-visible bg-slate-900/60 divide-y divide-white/5">
              <div className="grid grid-cols-12 gap-2 p-3 bg-white/5 text-[11px] font-bold text-slate-400">
                <div className="col-span-5">الصنف المرتجع</div>
                <div className="col-span-2 text-center">الكمية المرتجعة</div>
                <div className="col-span-2 text-center">سعر التكلفة</div>
                <div className="col-span-2 text-center">الإجمالي</div>
                <div className="col-span-1 text-center">حذف</div>
              </div>

              {returnItems.map((line, idx) => {
                const subtotal = (Number(line.qty) || 0) * (Number(line.unit_cost) || 0);

                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-white/5 transition">
                    <div className="col-span-5">
                      <SearchableCombobox
                        id={`return-item-input-${idx}`}
                        options={eligibleInventory}
                        value={line.inventory_id}
                        onChange={(val) => handleItemSelect(idx, val)}
                        onSelectOption={(inv) => {
                          if (inv) {
                            setTimeout(() => {
                              const qtyEl = document.getElementById(`return-line-qty-${idx}`);
                              if (qtyEl) {
                                qtyEl.focus();
                                qtyEl.select();
                              }
                            }, 60);
                          }
                        }}
                        placeholder="ابحث بالاسم، الماركة، أو الباركود..."
                        searchKeys={['name', 'brand', 'viscosity', 'pack_size', 'barcode']}
                        renderOption={(inv) => (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="truncate text-right">
                              <div className="font-bold text-white text-xs truncate">
                                {inv.name}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                {inv.brand && <span>{inv.brand}</span>}
                                {inv.viscosity && <span>• {inv.viscosity}</span>}
                              </div>
                            </div>
                            <div className="text-left shrink-0 font-mono text-[11px]">
                              <div className="text-emerald-400 font-bold">متوفر: {inv.stock_qty}</div>
                              <div className="text-[10px] text-slate-400">{Number(inv.cost_price || 0).toLocaleString()} ر.ي</div>
                            </div>
                          </div>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        id={`return-line-qty-${idx}`}
                        type="number"
                        min="1"
                        max={line.max_stock || 9999}
                        step="any"
                        placeholder="الكمية"
                        value={line.qty}
                        onChange={(e) => handleUpdateLine(idx, 'qty', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const costEl = document.getElementById(`return-line-cost-${idx}`);
                            if (costEl) {
                              costEl.focus();
                              costEl.select();
                            }
                          }
                        }}
                        className="w-full min-h-[38px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-white font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        id={`return-line-cost-${idx}`}
                        type="number"
                        placeholder="التكلفة"
                        value={line.unit_cost}
                        onChange={(e) => handleUpdateLine(idx, 'unit_cost', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (idx === returnItems.length - 1) {
                              handleAddLineAndFocusNext(idx);
                            } else {
                              const nextItem = document.getElementById(`return-item-input-${idx + 1}`);
                              if (nextItem) nextItem.focus();
                            }
                          }
                        }}
                        className="w-full min-h-[38px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-amber-300 font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="col-span-2 text-center font-mono font-bold text-white">
                      {subtotal.toLocaleString()} ر.ي
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={returnItems.length === 1}
                        className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund / Financial Settlement Method */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div>
              <span className="text-slate-300 font-bold block mb-1.5">طريقة المعالجة المالية للمرتجع:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('credit')}
                  className={`p-3 rounded-xl border text-right transition flex items-center gap-2.5 ${
                    refundMethod === 'credit'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">خصم من رصيد دين المورد الآجل</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">تخفيض حساب ذمة المورد (حساب 2101)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMethod('cash')}
                  className={`p-3 rounded-xl border text-right transition flex items-center gap-2.5 ${
                    refundMethod === 'cash'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">استرداد نقدي فوري للصندوق (كاش)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">توريد كاش إلى درج المركز (حساب 1101)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Total Financial Summary */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center font-bold">
              <span className="text-slate-300">إجمالي قيمة المرتجع:</span>
              <span className="font-mono text-2xl font-black text-rose-400">
                {totalReturnAmount.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">ملاحظات إضافية:</label>
            <input
              type="text"
              placeholder="رقم محضر الإرجاع، اسم مندوب الاستلام، إلخ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[38px] px-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
            >
              إلغاء
            </button>

            <button
              id="purchase-return-submit-btn"
              type="submit"
              disabled={isSubmitting || totalReturnAmount <= 0}
              className={`flex-1 min-h-[46px] rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition active:scale-95 ${
                totalReturnAmount <= 0 || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/25'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'جاري قيد المرتجع والمخزون...' : 'اعتماد مرتجع المشتريات وقيد اليومية'}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono border border-black/10">Ctrl+↵</kbd>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
