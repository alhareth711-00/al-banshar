import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertCircle, CheckCircle2, ShieldCheck, User } from 'lucide-react';

export default function ConsignmentInboundModal({
  isOpen,
  onClose,
  consignmentItems = [],
  selectedItem = null,
  onInboundSuccess,
}) {
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [receivedBy, setReceivedBy] = useState('أمين المستودع');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setQty('');
    setNotes('');
    setReceivedBy('أمين المستودع');

    if (selectedItem) {
      setItemId(String(selectedItem.id));
      setSupplierName(selectedItem.consignment_supplier_name || '');
    } else if (consignmentItems.length > 0) {
      setItemId(String(consignmentItems[0].id));
      setSupplierName(consignmentItems[0].consignment_supplier_name || '');
    } else {
      setItemId('');
      setSupplierName('');
    }
  }, [isOpen, selectedItem, consignmentItems]);

  // Handle item change
  const handleItemChange = (newId) => {
    setItemId(newId);
    const item = consignmentItems.find((i) => String(i.id) === String(newId));
    if (item) {
      setSupplierName(item.consignment_supplier_name || '');
    }
  };

  const currentItem = consignmentItems.find((i) => String(i.id) === String(itemId)) || selectedItem;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numQty = Number(qty);
    if (!numQty || numQty <= 0) {
      setError('يرجى إدخال كمية مستلمة صحيحة أكبر من الصفر');
      return;
    }

    if (!itemId) {
      setError('يرجى تحديد صنف الأمانة المراد توريده');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/inventory/${itemId}/consignment-inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: numQty,
          supplier_name: supplierName.trim(),
          notes: notes.trim(),
          received_by: receivedBy.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشلت عملية استلام دفعة الأمانة');
      }

      if (onInboundSuccess) {
        onInboundSuccess(data.data, numQty, currentItem?.name);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="apple-glass border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 text-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">استلام وتوريد دفعة بضاعة أمانة</h3>
              <p className="text-[11px] text-amber-200/80 font-medium">
                إيداع كميات جديدة برسم البيع والتصريف (بدون توليد دين مالي مسبق)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Golden Accounting Rule Banner */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>الحماية المحاسبية الذكية:</strong> زيادة رصيد الأمانة لا تُسجل كشراء تجاري ولا تخصم كاش من الصندوق. مستحقات المورد تُحسب آلياً فقط عند بيع العبوات للعملاء في شاشة البيع (POS).
            </div>
          </div>

          {/* Select Consignment Item */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              صنف الأمانة المراد استلام كميات منه: <span className="text-amber-400">*</span>
            </label>
            <select
              value={itemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-bold focus:outline-none focus:border-amber-400"
              required
            >
              {consignmentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.brand} - {item.viscosity || item.pack_size}) - الرصيد الحالي: {item.stock_qty}
                </option>
              ))}
            </select>
          </div>

          {/* Item Details Info Card */}
          {currentItem && (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-400">الرصيد الحالي بالرف:</div>
                <div className="text-sm font-black font-mono text-amber-300 mt-0.5">
                  {currentItem.stock_qty} عبوة
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">سعر التكلفة المتفق:</div>
                <div className="text-sm font-black font-mono text-white mt-0.5">
                  {Number(currentItem.cost_price).toLocaleString()} ر.ي
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">سعر البيع للجمهور:</div>
                <div className="text-sm font-black font-mono text-emerald-400 mt-0.5">
                  {Number(currentItem.sell_price).toLocaleString()} ر.ي
                </div>
              </div>
            </div>
          )}

          {/* Grid: Quantity & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                الكمية المستلمة الجديدة (علبة/حبة): <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="مثال: 12 أو 24"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-amber-300 text-sm font-black font-mono focus:outline-none focus:border-amber-400"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                اسم المورد / الشركة صاحبة الأمانة:
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="اسم المورد..."
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Receiver & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">المستلم بالمحل:</label>
              <div className="relative">
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full min-h-[42px] pl-3 pr-8 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-amber-400"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">ملاحظات / رقم إذن التسليم:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: سند تسليم مندوب رقم 402"
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Projected Stock Preview */}
          {currentItem && qty && Number(qty) > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>الرصيد الإجمالي بعد إيداع الدفعة:</span>
              <span className="font-mono text-base font-black">
                {Number(currentItem.stock_qty) + Number(qty)} عبوة
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التوريد...' : 'تأكيد استلام الدفعة وإيداعها 📥'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
