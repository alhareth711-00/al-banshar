import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  DollarSign,
  Building2,
  Store,
  Package,
  Layers,
  Calendar,
  Info,
} from 'lucide-react';

export default function PurchaseInvoiceModal({
  isOpen,
  onClose,
  inventory = [],
  suppliers = [],
  initialItems = null,
  onPurchaseCompleted,
}) {
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [paperBillNumber, setPaperBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'kuraimi' | 'credit' | 'jeeb'
  const [paidFromDrawer, setPaidFromDrawer] = useState(true);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Landed Cost (Shipping & Freight Allocation)
  const [hasShipping, setHasShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState('');
  const [shippingPayer, setShippingPayer] = useState('cash_drawer'); // 'cash_drawer' | 'supplier_account'

  // Bill Line Items with Carton support
  const [billItems, setBillItems] = useState([
    {
      inventory_id: '',
      is_carton: false,
      carton_qty: 1,
      units_per_carton: 24,
      carton_cost: '',
      qty: 1,
      unit_cost: '',
      unit_sell: '',
    },
  ]);

  // Load prefilled items from Reorder Order Sheet if provided
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setBillItems(
        initialItems.map((item) => {
          const inv = inventory.find((i) => i.id === (item.inventory_id || item.id));
          const defCartonCap = inv?.carton_pack_qty || 24;
          return {
            inventory_id: item.inventory_id || item.id,
            is_carton: false,
            carton_qty: 1,
            units_per_carton: defCartonCap,
            carton_cost: '',
            qty: item.suggested_qty || 1,
            unit_cost: item.unit_cost !== undefined ? item.unit_cost : (item.cost_price || ''),
            unit_sell: item.sell_price || '',
          };
        })
      );
      if (initialItems[0]?.preferred_supplier_id) {
        setSupplierId(String(initialItems[0].preferred_supplier_id));
        setSupplierName(initialItems[0].preferred_supplier_name || '');
      }
    }
  }, [initialItems, isOpen]);

  // Selected supplier details
  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierId));

  // When supplier is selected from dropdown
  const handleSupplierChange = (e) => {
    const val = e.target.value;
    setSupplierId(val);
    const found = suppliers.find((s) => String(s.id) === String(val));
    if (found) {
      setSupplierName(found.name);
      // Auto-suggest due date based on supplier credit days
      if (found.credit_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(found.credit_days));
        setDueDate(d.toISOString().split('T')[0]);
      }
    } else {
      setSupplierName('');
      setDueDate('');
    }
  };

  // Line Items manipulation
  const handleItemSelect = (index, invId) => {
    const found = inventory.find((i) => String(i.id) === String(invId));
    const defUnitsPerCarton = found?.carton_pack_qty && found.carton_pack_qty > 1 ? found.carton_pack_qty : 24;
    
    setBillItems((prev) => {
      const updated = [...prev];
      const isCarton = updated[index].is_carton;
      const unitCost = found ? found.cost_price : '';
      const cartonCost = found && found.cost_price ? found.cost_price * defUnitsPerCarton : '';
      const cQty = Math.max(1, Number(updated[index].carton_qty) || 1);
      const calculatedQty = isCarton ? cQty * defUnitsPerCarton : (updated[index].qty || 1);

      updated[index] = {
        ...updated[index],
        inventory_id: invId,
        units_per_carton: defUnitsPerCarton,
        unit_cost: unitCost,
        carton_cost: cartonCost,
        qty: calculatedQty,
        unit_sell: found ? found.sell_price : '',
      };
      return updated;
    });
  };

  const handleToggleCartonMode = (index) => {
    setBillItems((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      const newIsCarton = !cur.is_carton;

      if (newIsCarton) {
        // Switching to carton
        const unitsPerCarton = cur.units_per_carton || 24;
        const cartonQty = 1;
        const cartonCost = cur.unit_cost ? cur.unit_cost * unitsPerCarton : '';
        updated[index] = {
          ...cur,
          is_carton: true,
          carton_qty: cartonQty,
          carton_cost: cartonCost,
          qty: cartonQty * unitsPerCarton,
        };
      } else {
        // Switching to units
        const units = cur.carton_qty * (cur.units_per_carton || 1);
        const unitCost = cur.carton_cost && cur.units_per_carton ? Math.round(cur.carton_cost / cur.units_per_carton) : cur.unit_cost;
        updated[index] = {
          ...cur,
          is_carton: false,
          qty: units || 1,
          unit_cost: unitCost,
        };
      }
      return updated;
    });
  };

  const handleUpdateLine = (index, field, value) => {
    setBillItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Live recalculation when in carton mode
      if (item.is_carton) {
        const cQty = Math.max(1, Number(item.carton_qty) || 1);
        const uPerC = Math.max(1, Number(item.units_per_carton) || 1);
        const cCost = Math.max(0, Number(item.carton_cost) || 0);

        item.qty = cQty * uPerC;
        item.unit_cost = cCost > 0 ? Math.round((cCost / uPerC) * 100) / 100 : 0;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleAddLine = () => {
    setBillItems((prev) => [
      ...prev,
      {
        inventory_id: '',
        is_carton: false,
        carton_qty: 1,
        units_per_carton: 24,
        carton_cost: '',
        qty: 1,
        unit_cost: '',
        unit_sell: '',
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (billItems.length === 1) return;
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Total bill calculations with Landed Cost (Shipping)
  const totalGoodsAmount = useMemo(() => {
    return billItems.reduce((acc, item) => {
      if (item.is_carton) {
        const cQty = Number(item.carton_qty) || 0;
        const cCost = Number(item.carton_cost) || 0;
        return acc + (cQty * cCost);
      }
      const q = Number(item.qty) || 0;
      const c = Number(item.unit_cost) || 0;
      return acc + (q * c);
    }, 0);
  }, [billItems]);

  const numShippingCost = hasShipping ? (Math.max(0, Number(shippingCost)) || 0) : 0;
  const totalBillAmount = totalGoodsAmount;
  const totalLandedCost = totalGoodsAmount + numShippingCost;

  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'credit') {
      const p = parseFloat(paidAmountInput);
      return isNaN(p) ? 0 : Math.min(totalBillAmount, Math.max(0, p));
    }
    return totalBillAmount;
  }, [paymentMethod, paidAmountInput, totalBillAmount]);

  const remainingDebt = Math.max(0, totalBillAmount - effectivePaidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const finalSupplierName = supplierName.trim() || 'مورد عام';

    // Validate items
    const validItems = [];
    for (const item of billItems) {
      if (!item.inventory_id) continue;

      if (item.is_carton) {
        const cQty = Number(item.carton_qty);
        const uPerC = Number(item.units_per_carton);
        const cCost = Number(item.carton_cost);
        if (cQty <= 0 || uPerC <= 0 || cCost < 0) {
          setError('يرجى التأكد من إدخال عدد الكراتين وسعة الكرتون وسعر الكرتون بصورة صحيحة');
          return;
        }

        validItems.push({
          inventory_id: Number(item.inventory_id),
          is_carton: true,
          carton_qty: cQty,
          units_per_carton: uPerC,
          carton_cost: cCost,
          qty: cQty * uPerC,
          unit_cost: Math.round((cCost / uPerC) * 100) / 100,
          unit_sell: Number(item.unit_sell) || 0,
        });
      } else {
        const q = Number(item.qty);
        const c = Number(item.unit_cost);
        if (q <= 0 || c < 0) {
          setError('يرجى التأكد من إدخال كميات وأسعار صحيحة لجميع الأصناف');
          return;
        }

        validItems.push({
          inventory_id: Number(item.inventory_id),
          is_carton: false,
          qty: q,
          unit_cost: c,
          unit_sell: Number(item.unit_sell) || 0,
        });
      }
    }

    if (validItems.length === 0) {
      setError('يرجى اختيار صنف واحد على الأقل في فاتورة الشراء');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        supplier_id: supplierId ? Number(supplierId) : null,
        supplier_name: finalSupplierName,
        invoice_ref: invoiceRef || null,
        paper_bill_number: paperBillNumber ? paperBillNumber.trim() : null,
        due_date: dueDate || null,
        shipping_cost: numShippingCost,
        shipping_payer: shippingPayer,
        total_amount: totalBillAmount,
        paid_amount: effectivePaidAmount,
        payment_method: paymentMethod,
        paid_from_cash_drawer: paymentMethod === 'cash' && paidFromDrawer,
        notes: notes || null,
        items: validItems,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل في حفظ فاتورة المشتريات');
      }

      onPurchaseCompleted(data.data);
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
      <div className="bg-slate-950 border border-white/20 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-emerald-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">فاتورة مشتريات وتوريد مخزني رسمية</h3>
              <p className="text-xs text-slate-400">
                تسجيل شراء بضاعة رسمية بالكرتون أو العلبة، تحديث متوسط التكلفة WAC، وضبط أرصدة الموردين
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Invoice Ref Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>المورد / شركة التوزيع:</span>
                </span>
                {selectedSupplier && selectedSupplier.balance_due > 0 && (
                  <span className="text-[11px] text-rose-400 font-mono font-bold">
                    دين سابق: {Number(selectedSupplier.balance_due).toLocaleString()} ر.ي
                  </span>
                )}
              </label>
              <select
                autoFocus
                value={supplierId}
                onChange={handleSupplierChange}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs cursor-pointer font-bold"
              >
                <option value="">-- اختر مورد مسجل أو اكتب بالأسفل --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company_name || s.phone || 'وكيل معتمد'})
                  </option>
                ))}
              </select>

              {!supplierId && (
                <input
                  type="text"
                  placeholder="أو اكتب اسم المورد يدوياً..."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">رقم فاتورة المورد الورقية:</label>
              <input
                type="text"
                placeholder="مثال: INV-88412"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">رقم الفاتورة الدفترية (مانوال - اختياري):</label>
              <input
                type="text"
                placeholder="رقم السند بالدفتر الورقي"
                value={paperBillNumber}
                onChange={(e) => setPaperBillNumber(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold"
                title="يستخدم لمقارنة الحسابات وتجهيز كشف حساب الموردين"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">تاريخ استحقاق الآجل (اختياري):</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs cursor-pointer"
              />
            </div>
          </div>

          {/* Items Inbound Table with Carton Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>الأصناف الموردة في الفاتورة (خيارات الكرتون والوحدة):</span>
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 hover:bg-amber-500/30 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ إضافة صنف للفاتورة</span>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/60 divide-y divide-white/5">
              <div className="grid grid-cols-12 gap-2 p-3 bg-white/5 text-[11px] font-bold text-slate-400">
                <div className="col-span-4">الصنف المراد توريده</div>
                <div className="col-span-2 text-center">نوع الشراء</div>
                <div className="col-span-2 text-center">الكمية</div>
                <div className="col-span-2 text-center">سعر الشراء والتكلفة</div>
                <div className="col-span-1 text-center">سعر البيع</div>
                <div className="col-span-1 text-center">حذف</div>
              </div>

              {billItems.map((line, idx) => {
                const subtotal = line.is_carton
                  ? (Number(line.carton_qty) || 0) * (Number(line.carton_cost) || 0)
                  : (Number(line.qty) || 0) * (Number(line.unit_cost) || 0);

                return (
                  <div key={idx} className="p-3 hover:bg-white/5 transition space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Product Selector */}
                      <div className="col-span-4">
                        <select
                          value={line.inventory_id}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full min-h-[38px] px-2.5 rounded-lg bg-slate-950 border border-white/15 text-white text-xs cursor-pointer font-bold"
                          required
                        >
                          <option value="">-- حدد الصنف من المخزن --</option>
                          {inventory
                            .filter((i) => i.is_active === 1 && i.category !== 'service' && i.item_type !== 'service')
                            .map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} &bull; {inv.brand} ({inv.pack_size || inv.viscosity || 'قطعة'})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Mode Toggle: Unit vs Carton */}
                      <div className="col-span-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCartonMode(idx)}
                          className={`w-full min-h-[36px] px-2 rounded-xl text-[11px] font-extrabold border transition flex items-center justify-center gap-1 ${
                            line.is_carton
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-white/15 hover:text-white'
                          }`}
                        >
                          {line.is_carton ? (
                            <>
                              <Package className="w-3.5 h-3.5" />
                              <span>بالكرتون 📦</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5" />
                              <span>بالعلبة/الحبة</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quantity Input */}
                      <div className="col-span-2">
                        {line.is_carton ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="عدد الكراتين"
                              value={line.carton_qty}
                              onChange={(e) => handleUpdateLine(idx, 'carton_qty', e.target.value)}
                              className="w-full min-h-[36px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                              required
                            />
                            <div className="text-[10px] text-slate-400 text-center">كرتون</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="الكمية"
                              value={line.qty}
                              onChange={(e) => handleUpdateLine(idx, 'qty', e.target.value)}
                              className="w-full min-h-[36px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                              required
                            />
                            <div className="text-[10px] text-slate-400 text-center">علبة/حبة</div>
                          </div>
                        )}
                      </div>

                      {/* Cost Input */}
                      <div className="col-span-2">
                        {line.is_carton ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="سعر الكرتون"
                              value={line.carton_cost}
                              onChange={(e) => handleUpdateLine(idx, 'carton_cost', e.target.value)}
                              className="w-full min-h-[36px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-amber-300 font-mono text-xs font-bold"
                              required
                            />
                            <div className="text-[10px] text-slate-400 text-center">ر.ي للكرتون</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="سعر التكلفة"
                              value={line.unit_cost}
                              onChange={(e) => handleUpdateLine(idx, 'unit_cost', e.target.value)}
                              className="w-full min-h-[36px] px-2 text-center rounded-lg bg-slate-950 border border-white/15 text-amber-300 font-mono text-xs font-bold"
                              required
                            />
                            <div className="text-[10px] text-slate-400 text-center">ر.ي للعلبة</div>
                          </div>
                        )}
                      </div>

                      {/* Sell Price Input */}
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="سعر البيع"
                          value={line.unit_sell}
                          onChange={(e) => handleUpdateLine(idx, 'unit_sell', e.target.value)}
                          className="w-full min-h-[36px] px-1.5 text-center rounded-lg bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={billItems.length === 1}
                          className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Carton Unpacking Manual Capacity Details (Requested by User) */}
                    {line.is_carton && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs">
                        {/* Row 1: Carton Capacity Presets & Custom Input */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              <span>سعة الكرتون:</span>
                            </span>
                            {[
                              { label: '24 علبة (1L)', val: 24 },
                              { label: '12 علبة', val: 12 },
                              { label: '4 دبات (4L)', val: 4 },
                              { label: '6 علب', val: 6 },
                            ].map((preset) => {
                              const isSelected = Number(line.units_per_carton) === preset.val;
                              return (
                                <button
                                  key={preset.val}
                                  type="button"
                                  onClick={() => handleUpdateLine(idx, 'units_per_carton', preset.val)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                                      : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-amber-400/50 hover:text-white'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[11px]">أو يدوي:</span>
                            <input
                              type="number"
                              min="1"
                              value={line.units_per_carton}
                              onChange={(e) => handleUpdateLine(idx, 'units_per_carton', e.target.value)}
                              className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-amber-400/40 text-amber-300 font-mono font-bold text-center text-xs focus:outline-none focus:border-amber-400"
                              placeholder="سعة"
                            />
                            <span className="text-slate-400 text-[11px]">علبة/كرتون</span>
                          </div>
                        </div>

                        {/* Row 2: Live Breakdown & Profit Preview */}
                        <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span>معادلة التفكيك:</span>
                            <span className="text-amber-300 font-bold">{line.carton_qty || 0} كرتون</span>
                            <span>&times;</span>
                            <span className="text-amber-300 font-bold">{line.units_per_carton || 1} علبة</span>
                            <span>=</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                              {line.qty} علبة ستدخل المخزن
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">تكلفة العلبة الفردية:</span>
                            <span className="text-amber-300 font-bold text-xs">
                              {Number(line.unit_cost || 0).toLocaleString()} ر.ي
                            </span>
                            {line.unit_sell && Number(line.unit_sell) > Number(line.unit_cost) && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px] border border-teal-500/20">
                                ربح العلبة: +{(Number(line.unit_sell) - Number(line.unit_cost)).toLocaleString()} ر.ي (
                                {Math.round(((Number(line.unit_sell) - Number(line.unit_cost)) / (Number(line.unit_cost) || 1)) * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Landed Cost Allocation Section (Upgrade 4) */}
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasShipping}
                  onChange={(e) => setHasShipping(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-white/20"
                />
                <span className="font-extrabold text-blue-300 text-xs flex items-center gap-1.5">
                  <span>🚚 توزيع مصاريف النقل والشحن على تكلفة البضاعة (Landed Cost)</span>
                </span>
              </label>
              {hasShipping && numShippingCost > 0 && (
                <span className="text-[11px] font-mono font-bold text-blue-300">
                  + {numShippingCost.toLocaleString()} ر.ي مصاريف شحن
                </span>
              )}
            </div>

            {hasShipping && (
              <div className="pt-2 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">مبلغ أجور الشحن والنقل:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 5000"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-slate-950 border border-blue-400/30 text-blue-300 font-mono font-bold text-sm"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    توزع آلياً على العلب لرفع تكلفة المخزون الواصلة الحقيقية
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة خصم وسداد أجور النقل:</label>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                      💵
                    </span>
                    <div className="flex-1">
                      <div className="font-extrabold text-emerald-300 text-xs flex items-center justify-between">
                        <span>خصم نقدي مباشر من الصندوق (الدرج)</span>
                        <span className="text-[10px] bg-emerald-500/15 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/30">
                          لا يُحمّل على المورد
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        تُصرف أجور التوصيل لسائق النقل كاش من الدرج فوراً، وتُوزع على تكلفة العلب فقط.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment & Settlement Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-slate-400 font-bold">طريقة السداد للمورد:</span>
                <div className="flex gap-2 mt-1.5">
                  {[
                    { id: 'cash', label: '💵 كاش (نقد)' },
                    { id: 'kuraimi', label: '🏦 حساب الكريمي' },
                    { id: 'credit', label: '📝 آجل بذمة المركز' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                        paymentMethod === m.id
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                          : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Drawer toggle if paying cash */}
              {paymentMethod === 'cash' && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-white/10 cursor-pointer self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={paidFromDrawer}
                    onChange={(e) => setPaidFromDrawer(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-white/20"
                  />
                  <span className="text-slate-300 font-bold text-xs">
                    الصرف مباشرة من نقدية الدرج (حساب 1101)
                  </span>
                </label>
              )}
            </div>

            {/* Partial / Credit Settlement */}
            {paymentMethod === 'credit' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">المبلغ المسدد الآن (كاش/تحويل):</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-28 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/20 font-mono text-xs font-bold text-white text-center"
                  />
                  <span>ر.ي</span>
                </div>

                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <span>المبلغ الآجل المتبقي للمورد:</span>
                  <span className="font-mono text-sm">{remainingDebt.toLocaleString()} ر.ي</span>
                </div>
              </div>
            )}

            {/* Total Financial Summary Bar */}
            <div className="pt-1 font-bold space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">إجمالي قيمة أصناف البضاعة:</span>
                <span className="font-mono text-slate-200">
                  {totalGoodsAmount.toLocaleString()} ر.ي
                </span>
              </div>
              {hasShipping && numShippingCost > 0 && (
                <div className="flex justify-between items-center text-xs text-blue-300">
                  <span>أجور النقل والشحن الموزعة على التكلفة:</span>
                  <span className="font-mono font-bold">
                    + {numShippingCost.toLocaleString()} ر.ي (خصم نقدي مباشر من الصندوق)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-white text-sm">
                  {hasShipping && numShippingCost > 0 ? 'إجمالي التكلفة الواصلة للمركز (Landed Cost):' : 'إجمالي قيمة الفاتورة:'}
                </span>
                <span className="font-mono text-2xl font-black text-amber-400">
                  {(hasShipping && numShippingCost > 0 ? totalLandedCost : totalBillAmount).toLocaleString()}{' '}
                  <span className="text-xs font-sans text-slate-400">ر.ي</span>
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">ملاحظات الفاتورة:</label>
            <input
              type="text"
              placeholder="أي تفاصيل خاصة بالشحنة أو المورد..."
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
              type="submit"
              disabled={isSubmitting || totalBillAmount <= 0}
              className={`flex-1 min-h-[46px] rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition active:scale-95 ${
                totalBillAmount <= 0 || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'جاري ترحيل الفاتورة والمخزون...' : 'اعتماد فاتورة الشراء وتوريد المخزن 📦'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
