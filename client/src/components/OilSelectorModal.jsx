import React, { useState, useMemo } from 'react';
import { X, Droplets, Check, Plus, Minus, Filter, Sparkles, AlertCircle } from 'lucide-react';

export default function OilSelectorModal({
  isOpen,
  onClose,
  inventory = [],
  onAddItemsToCart,
  preferredBrand = 'تويوتا',
  preferredViscosity = '20W-50',
}) {
  const [selectedBrand, setSelectedBrand] = useState(preferredBrand || 'تويوتا');
  const [selectedViscosity, setSelectedViscosity] = useState(preferredViscosity || '20W-50');

  // Pack selections state
  const [qty1L, setQty1L] = useState(0);
  const [qty4L, setQty4L] = useState(0);
  const [qty5L, setQty5L] = useState(0);
  const [qtyBulk, setQtyBulk] = useState(0);

  // Filters state
  const [addOilFilter, setAddOilFilter] = useState(true);
  const [addAirFilter, setAddAirFilter] = useState(false);
  const [addCabinFilter, setAddCabinFilter] = useState(false);

  if (!isOpen) return null;

  const brands = [
    { id: 'تويوتا', name: 'تويوتا أصلي', logoColor: 'from-red-600 to-rose-700' },
    { id: 'كاسترول', name: 'كاسترول', logoColor: 'from-emerald-600 to-green-700' },
    { id: 'شل', name: 'شل هيلكس', logoColor: 'from-yellow-500 to-amber-600 text-black' },
    { id: 'توتال', name: 'توتال كوارتز', logoColor: 'from-blue-600 to-indigo-700' },
    { id: 'صقر', name: 'زيت صقر الوطني', logoColor: 'from-amber-600 to-orange-700' },
  ];

  const viscosities = ['20W-50', '10W-40', '5W-30'];

  // Find matching items in inventory
  const oils = inventory.filter((item) => item.category === 'oil');
  const filters = inventory.filter((item) => item.category === 'filter');

  const item1L = oils.find(
    (o) => o.brand === selectedBrand && o.viscosity === selectedViscosity && o.pack_size === '1L'
  ) || oils.find((o) => o.pack_size === '1L' && o.brand === selectedBrand);

  const item4L = oils.find(
    (o) => o.brand === selectedBrand && o.viscosity === selectedViscosity && o.pack_size === '4L'
  ) || oils.find((o) => o.pack_size === '4L' && o.brand === selectedBrand);

  const item5L = oils.find(
    (o) => o.brand === selectedBrand && o.pack_size === '5L'
  ) || oils.find((o) => o.pack_size === '5L');

  const itemBulk = oils.find((o) => o.pack_size === 'bulk_liter');

  // Filter items
  const oilFilterItem = filters.find((f) => f.name.includes('فلتر زيت') && (f.brand === selectedBrand || f.brand === 'تويوتا')) || filters.find((f) => f.name.includes('فلتر زيت'));
  const airFilterItem = filters.find((f) => f.name.includes('فلتر هواء'));
  const cabinFilterItem = filters.find((f) => f.name.includes('فلتر مكيف'));

  // Quick preset shortcuts
  const handleSelectPreset = (type) => {
    if (type === '4L') {
      setQty4L(1);
      setQty1L(0);
      setQty5L(0);
    } else if (type === '5L_combo') {
      // 4L + 1L = 5L
      setQty4L(1);
      setQty1L(1);
      setQty5L(0);
    } else if (type === '5L_can') {
      setQty5L(1);
      setQty4L(0);
      setQty1L(0);
    } else if (type === '6L_combo') {
      // 4L + 2x1L = 6L (Hilux / Prado V6)
      setQty4L(1);
      setQty1L(2);
      setQty5L(0);
    }
  };

  // Calculate total price preview
  const totalPrice = useMemo(() => {
    let sum = 0;
    if (item1L && qty1L > 0) sum += item1L.sell_price * qty1L;
    if (item4L && qty4L > 0) sum += item4L.sell_price * qty4L;
    if (item5L && qty5L > 0) sum += item5L.sell_price * qty5L;
    if (itemBulk && qtyBulk > 0) sum += itemBulk.sell_price * qtyBulk;

    if (addOilFilter && oilFilterItem) sum += oilFilterItem.sell_price;
    if (addAirFilter && airFilterItem) sum += airFilterItem.sell_price;
    if (addCabinFilter && cabinFilterItem) sum += cabinFilterItem.sell_price;
    return sum;
  }, [qty1L, qty4L, qty5L, qtyBulk, addOilFilter, addAirFilter, addCabinFilter, item1L, item4L, item5L, itemBulk, oilFilterItem, airFilterItem, cabinFilterItem]);

  const totalLiters = (qty4L * 4) + (qty1L * 1) + (qty5L * 5) + (qtyBulk * 1);

  const handleConfirm = () => {
    const itemsToAdd = [];

    if (item4L && qty4L > 0) {
      itemsToAdd.push({
        inventory_id: item4L.id,
        item_type: 'product',
        description: item4L.name,
        qty: qty4L,
        unit_price: item4L.sell_price,
        labor_fee: 0,
        subtotal: item4L.sell_price * qty4L,
      });
    }

    if (item1L && qty1L > 0) {
      itemsToAdd.push({
        inventory_id: item1L.id,
        item_type: 'product',
        description: item1L.name,
        qty: qty1L,
        unit_price: item1L.sell_price,
        labor_fee: 0,
        subtotal: item1L.sell_price * qty1L,
      });
    }

    if (item5L && qty5L > 0) {
      itemsToAdd.push({
        inventory_id: item5L.id,
        item_type: 'product',
        description: item5L.name,
        qty: qty5L,
        unit_price: item5L.sell_price,
        labor_fee: 0,
        subtotal: item5L.sell_price * qty5L,
      });
    }

    if (itemBulk && qtyBulk > 0) {
      itemsToAdd.push({
        inventory_id: itemBulk.id,
        item_type: 'product',
        description: itemBulk.name,
        qty: qtyBulk,
        unit_price: itemBulk.sell_price,
        labor_fee: 0,
        subtotal: itemBulk.sell_price * qtyBulk,
      });
    }

    if (addOilFilter && oilFilterItem) {
      itemsToAdd.push({
        inventory_id: oilFilterItem.id,
        item_type: 'product',
        description: oilFilterItem.name,
        qty: 1,
        unit_price: oilFilterItem.sell_price,
        labor_fee: 0,
        subtotal: oilFilterItem.sell_price,
      });
    }

    if (addAirFilter && airFilterItem) {
      itemsToAdd.push({
        inventory_id: airFilterItem.id,
        item_type: 'product',
        description: airFilterItem.name,
        qty: 1,
        unit_price: airFilterItem.sell_price,
        labor_fee: 0,
        subtotal: airFilterItem.sell_price,
      });
    }

    if (addCabinFilter && cabinFilterItem) {
      itemsToAdd.push({
        inventory_id: cabinFilterItem.id,
        item_type: 'product',
        description: cabinFilterItem.name,
        qty: 1,
        unit_price: cabinFilterItem.sell_price,
        labor_fee: 0,
        subtotal: cabinFilterItem.sell_price,
      });
    }

    if (itemsToAdd.length === 0) {
      alert('يرجى اختيار عبوة زيت أو فلتر لإضافتها إلى الفاتورة');
      return;
    }

    onAddItemsToCart(itemsToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Droplets className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">محدد غيار الزيت والفلاتر السريع</h3>
              <p className="text-xs text-slate-400">اختر الماركة، اللزوجة، والعبوات بنقرة واحدة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Brands Picker */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>1. ماركة الزيت:</span>
              <span className="text-amber-400 font-semibold">{selectedBrand}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {brands.map((b) => {
                const isSelected = selectedBrand === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrand(b.id)}
                    className={`min-h-[56px] px-3 py-2 rounded-2xl border text-sm font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{b.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Viscosity Picker */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>2. درجة اللزوجة:</span>
              <span className="text-amber-400 font-mono font-bold">{selectedViscosity}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {viscosities.map((v) => {
                const isSelected = selectedViscosity === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedViscosity(v)}
                    className={`min-h-[54px] rounded-2xl border text-base font-extrabold font-mono transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-white/20 border-white text-white shadow-xl shadow-black/40 scale-[1.02]'
                        : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {v}
                    {isSelected && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Quick Combo Shortcuts */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>اختصارات سريعة للسيارات الشائعة:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('4L')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-bold text-slate-200 transition text-center"
              >
                سيارة صغيرة (4 لتر)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('5L_combo')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-bold text-amber-300 transition text-center"
              >
                تويوتا / كيا (4L + 1L)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('6L_combo')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-bold text-slate-200 transition text-center"
              >
                هايلوكس/برادو (4L + 2L)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('5L_can')}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-xs font-bold text-slate-200 transition text-center"
              >
                دبة 5 لتر كاملة
              </button>
            </div>
          </div>

          {/* 4. Pack Sizes & Quantity Controls */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>3. تحديد كميات العبوات:</span>
              {totalLiters > 0 && (
                <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  الإجمالي: {totalLiters} لتر
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {/* 4L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">دبة 4 لتر</div>
                  <div className="text-xs text-slate-400">
                    {item4L ? `${item4L.sell_price.toLocaleString()} ر.ي (متبقي بالمخزن: ${item4L.stock_qty})` : 'غير متوفر'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty4L(Math.max(0, qty4L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qty4L}</span>
                  <button
                    type="button"
                    onClick={() => setQty4L(qty4L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* 1L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">علبة 1 لتر (مفرد أو إضافي)</div>
                  <div className="text-xs text-slate-400">
                    {item1L ? `${item1L.sell_price.toLocaleString()} ر.ي (متبقي بالمخزن: ${item1L.stock_qty})` : 'غير متوفر'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty1L(Math.max(0, qty1L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={qty1L}
                    onChange={(e) => setQty1L(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 h-10 text-center font-mono font-bold text-base bg-slate-800 text-white rounded-xl border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setQty1L(qty1L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* 5L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">دبة 5 لتر</div>
                  <div className="text-xs text-slate-400">
                    {item5L ? `${item5L.sell_price.toLocaleString()} ر.ي` : 'غير متوفر بهذه الماركة'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty5L(Math.max(0, qty5L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qty5L}</span>
                  <button
                    type="button"
                    onClick={() => setQty5L(qty5L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Bulk Liter */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">زيت فلت بالبرميل (باللتر)</div>
                  <div className="text-xs text-slate-400">
                    {itemBulk ? `${itemBulk.sell_price.toLocaleString()} ر.ي/لتر (متبقي: ${itemBulk.stock_qty} لتر)` : 'غير متوفر'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtyBulk(Math.max(0, qtyBulk - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={qtyBulk}
                    onChange={(e) => setQtyBulk(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 h-10 text-center font-mono font-bold text-base bg-slate-800 text-white rounded-xl border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setQtyBulk(qtyBulk + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Accompanying Filters */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>4. الفلاتر المرافقة بنقرة واحدة:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAddOilFilter(!addOilFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  addOilFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">فلتر زيت أصلي</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {oilFilterItem ? `+${oilFilterItem.sell_price.toLocaleString()} ر.ي` : '4,500 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addOilFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addOilFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddAirFilter(!addAirFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  addAirFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">فلتر هواء محرك</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {airFilterItem ? `+${airFilterItem.sell_price.toLocaleString()} ر.ي` : '6,500 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addAirFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addAirFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddCabinFilter(!addCabinFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between ${
                  addCabinFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">فلتر مكيف كربوني</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {cabinFilterItem ? `+${cabinFilterItem.sell_price.toLocaleString()} ر.ي` : '5,000 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addCabinFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addCabinFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">المجموع التقديري:</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {totalPrice.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[50px] px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[50px] px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition flex items-center gap-2 active:scale-95"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>إضافة للخدمة والفاتورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
