import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Check, AlertCircle, Plus, Wrench, Barcode, ShieldCheck, MapPin, Calculator, Calendar, AlertTriangle } from 'lucide-react';

export function calculateDotAge(dotCode) {
  if (!dotCode || String(dotCode).trim().length < 4) return null;
  const clean = String(dotCode).trim().replace(/\D/g, '');
  if (clean.length !== 4) return null;
  const week = parseInt(clean.substring(0, 2), 10);
  const year = 2000 + parseInt(clean.substring(2, 4), 10);
  if (week < 1 || week > 53 || year < 2010 || year > 2035) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = Math.ceil(((now - new Date(currentYear, 0, 1)) / 86400000) / 7);

  const ageInWeeks = (currentYear - year) * 52 + (currentWeek - week);
  const ageInMonths = Math.max(0, Math.round(ageInWeeks / 4.33));
  const ageInYears = Math.round((ageInMonths / 12) * 10) / 10;

  let status = 'fresh';
  let label = `حديث الصنع (${ageInMonths} شهر)`;
  let color = 'emerald';

  if (ageInMonths <= 12) {
    status = 'fresh';
    label = `حديث الصنع (${ageInMonths} شهر)`;
    color = 'emerald';
  } else if (ageInMonths <= 24) {
    status = 'acceptable';
    label = `عمر تشغيلي مناسب (${ageInYears} سنة)`;
    color = 'teal';
  } else if (ageInMonths <= 36) {
    status = 'aging';
    label = `متقادم يوصى بتصريفه (${ageInYears} سنة)`;
    color = 'amber';
  } else {
    status = 'expired';
    label = `إطار قديم عالي الخطورة (${ageInYears} سنة)`;
    color = 'rose';
  }

  return { week, year, ageInMonths, ageInYears, status, label, color };
}

export default function AddInventoryModal({ isOpen, onClose, onCreated, itemToEdit = null }) {
  const isEditMode = Boolean(itemToEdit);

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'oil',
    item_type: 'product',
    brand: 'تويوتا',
    viscosity: '20W-50',
    oil_type: 'معدني تقليدي',
    api_grade: 'SP / CF',
    pack_size: '4L',
    carton_pack_qty: 1,
    tire_battery_spec: '',
    country_of_origin: 'اليابان',
    dot_code: '',
    battery_capacity_ah: '',
    warranty_months: 0,
    cost_price: '',
    sell_price: '',
    min_stock_alert: 5,
    location_shelf: '',
    notes: '',
  });

  const [customMarkup, setCustomMarkup] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form if in edit mode
  useEffect(() => {
    if (itemToEdit) {
      const cost = Number(itemToEdit.cost_price) || 0;
      const sell = Number(itemToEdit.sell_price) || 0;
      const m = cost > 0 && sell > 0 ? Math.round(((sell - cost) / cost) * 100) : 20;

      setFormData({
        sku: itemToEdit.sku || '',
        barcode: itemToEdit.barcode || '',
        name: itemToEdit.name || '',
        category: itemToEdit.category || 'oil',
        item_type: itemToEdit.item_type || (itemToEdit.category === 'service' ? 'service' : 'product'),
        brand: itemToEdit.brand || 'عام',
        viscosity: itemToEdit.viscosity || '20W-50',
        oil_type: itemToEdit.oil_type || 'معدني تقليدي',
        api_grade: itemToEdit.api_grade || 'SP / CF',
        pack_size: itemToEdit.pack_size || '4L',
        carton_pack_qty: itemToEdit.carton_pack_qty || 1,
        tire_battery_spec: itemToEdit.tire_battery_spec || '',
        country_of_origin: itemToEdit.country_of_origin || 'اليابان',
        dot_code: itemToEdit.dot_code || '',
        battery_capacity_ah: itemToEdit.battery_capacity_ah || '',
        warranty_months: itemToEdit.warranty_months || 0,
        cost_price: itemToEdit.cost_price !== undefined ? String(itemToEdit.cost_price) : '',
        sell_price: itemToEdit.sell_price !== undefined ? String(itemToEdit.sell_price) : '',
        min_stock_alert: itemToEdit.min_stock_alert !== undefined ? itemToEdit.min_stock_alert : 5,
        location_shelf: itemToEdit.location_shelf || '',
        notes: itemToEdit.notes || '',
      });
      setCustomMarkup(String(m));
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        category: 'oil',
        item_type: 'product',
        brand: 'تويوتا',
        viscosity: '20W-50',
        oil_type: 'معدني تقليدي',
        api_grade: 'SP / CF',
        pack_size: '4L',
        carton_pack_qty: 1,
        tire_battery_spec: '',
        country_of_origin: 'اليابان',
        dot_code: '',
        battery_capacity_ah: '',
        warranty_months: 0,
        cost_price: '',
        sell_price: '',
        min_stock_alert: 5,
        location_shelf: '',
        notes: '',
      });
      setCustomMarkup('20');
    }
  }, [itemToEdit, isOpen]);

  // Apply markup calculation with rounding to nearest 50 or 100 YER
  const applyMarkup = (markupPercent) => {
    const cost = Number(formData.cost_price) || 0;
    if (cost <= 0) return;
    const rawSell = cost * (1 + markupPercent / 100);
    // Round to nearest 50 YER
    const roundedSell = Math.round(rawSell / 50) * 50;
    setFormData((prev) => ({ ...prev, sell_price: String(roundedSell) }));
    setCustomMarkup(String(markupPercent));
  };

  const handleSellPriceChange = (val) => {
    setFormData((prev) => ({ ...prev, sell_price: val }));
    const cost = Number(formData.cost_price) || 0;
    const sell = Number(val) || 0;
    if (cost > 0 && sell > 0) {
      const m = Math.round(((sell - cost) / cost) * 100);
      setCustomMarkup(String(m));
    }
  };

  const handleCostPriceChange = (val) => {
    setFormData((prev) => ({ ...prev, cost_price: val }));
    const cost = Number(val) || 0;
    const markup = Number(customMarkup) || 20;
    if (cost > 0 && markup > 0) {
      const rawSell = cost * (1 + markup / 100);
      const roundedSell = Math.round(rawSell / 50) * 50;
      setFormData((prev) => ({ ...prev, cost_price: val, sell_price: String(roundedSell) }));
    }
  };

  const dotAnalysis = useMemo(() => {
    if (formData.category !== 'tire') return null;
    return calculateDotAge(formData.dot_code);
  }, [formData.category, formData.dot_code]);

  if (!isOpen) return null;

  const isService = formData.category === 'service';

  const handleCategoryChange = (cat) => {
    const isSrv = cat === 'service';
    setFormData((prev) => ({
      ...prev,
      category: cat,
      item_type: isSrv ? 'service' : 'product',
      brand: isSrv ? 'خدمات المركز' : prev.brand === 'خدمات المركز' ? 'تويوتا' : prev.brand,
      pack_size: isSrv ? 'unit' : prev.pack_size,
      min_stock_alert: isSrv ? 0 : prev.min_stock_alert || 5,
      cost_price: isSrv && !prev.cost_price ? '0' : prev.cost_price,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم الصنف أو الخدمة');
      return;
    }
    if (!isService && (!formData.cost_price || Number(formData.cost_price) < 0)) {
      setError('يرجى إدخال سعر تكلفة صحيح للسلعة');
      return;
    }
    if (!formData.sell_price || Number(formData.sell_price) <= 0) {
      setError('يرجى إدخال سعر بيع / أجرة خدمة صحيحة');
      return;
    }

    try {
      setIsSubmitting(true);
      const sku = formData.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;

      const payload = {
        ...formData,
        sku,
        barcode: formData.barcode.trim() || null,
        cost_price: Number(formData.cost_price) || 0,
        sell_price: Number(formData.sell_price) || 0,
        warranty_months: Number(formData.warranty_months) || 0,
        carton_pack_qty: Number(formData.carton_pack_qty) || 1,
        min_stock_alert: isService ? 0 : Number(formData.min_stock_alert) || 5,
        stock_qty: isService ? 9999 : (isEditMode ? itemToEdit.stock_qty : 0),
      };

      const url = isEditMode ? `/api/inventory/${itemToEdit.id}` : '/api/inventory';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'حدث خطأ أثناء حفظ الصنف');
      }

      if (onCreated) onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const profitMargin = (Number(formData.sell_price) || 0) - (Number(formData.cost_price) || 0);
  const marginPercent = Number(formData.cost_price) > 0
    ? Math.round((profitMargin / Number(formData.cost_price)) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isService ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isService ? <Wrench className="w-5 h-5 stroke-[2.2]" /> : <Package className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isEditMode ? `تعديل بيانات الصنف: ${itemToEdit.name}` : 'إضافة صنف أو خدمة جديدة للكتالوج'}
              </h3>
              <p className="text-xs text-slate-400">
                {isService
                  ? 'الخدمات والتركيب: إيراد ربح مباشر بدون خصم مخزني'
                  : 'أصناف مخزنية: يبدأ الرصيد بـ 0 ويتم توريده بفاتورة شراء رسمية'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[82vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector Tabs */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">فئة الصنف أو الخدمة:</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'oil', label: '🛢️ زيوت' },
                { id: 'filter', label: '🔘 فلاتر' },
                { id: 'tire', label: '🛞 إطارات' },
                { id: 'battery', label: '🔋 بطاريات' },
                { id: 'service', label: '🔧 الخدمات' },
                { id: 'accessory', label: '⚙️ إكسسوار' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryChange(c.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center ${
                    formData.category === c.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name & SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1.5">اسم الصنف أو الخدمة:</label>
              <input
                type="text"
                placeholder={isService ? 'مثال: أجرة غيار زيت وفلتر' : 'مثال: زيت تويوتا أصلي 20W-50'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">كود SKU:</label>
              <input
                type="text"
                placeholder="توليد تلقائي"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-teal-400" />
                رقم الباركود (Barcode):
              </label>
              <input
                type="text"
                placeholder="مسح بالباركود أو إدخال يدوي"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">الماركة / المصنع:</label>
              <input
                type="text"
                placeholder="تويوتا، كاسترول، شل، هانكوك..."
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                موقع الرف / المستودع:
              </label>
              <input
                type="text"
                placeholder="مثلاً: رف A-2، حفرة 1"
                value={formData.location_shelf}
                onChange={(e) => setFormData({ ...formData, location_shelf: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
              />
            </div>
          </div>

          {/* Conditional Specs: Oil */}
          {formData.category === 'oil' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/20 space-y-3">
              <div className="text-amber-400 font-bold text-xs">خصائص زيوت المحركات وسوائل التزييت:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">درجة اللزوجة:</label>
                  <select
                    value={formData.viscosity}
                    onChange={(e) => setFormData({ ...formData, viscosity: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                  >
                    <option value="20W-50">20W-50</option>
                    <option value="10W-40">10W-40</option>
                    <option value="5W-30">5W-30</option>
                    <option value="5W-40">5W-40</option>
                    <option value="0W-20">0W-20</option>
                    <option value="15W-40">15W-40</option>
                    <option value="80W-90">80W-90 (تروس/دفرنش)</option>
                    <option value="ATF-WS">ATF-WS (قير أوتوماتيك)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">نوع الزيت:</label>
                  <select
                    value={formData.oil_type}
                    onChange={(e) => setFormData({ ...formData, oil_type: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs"
                  >
                    <option value="معدني تقليدي">معدني تقليدي (Mineral)</option>
                    <option value="نصف تخليقي">نصف تخليقي (Semi-Syn)</option>
                    <option value="تخليقي بالكامل">تخليقي بالكامل (Fully Syn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">حجم العبوة:</label>
                  <select
                    value={formData.pack_size}
                    onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                  >
                    <option value="4L">4 لتر (دبة)</option>
                    <option value="1L">1 لتر (علبة)</option>
                    <option value="5L">5 لتر</option>
                    <option value="bulk_liter">لتر فلت برميل</option>
                    <option value="carton">كرتون كامل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">سعة الكرتون (علبة):</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="24 أو 6"
                    value={formData.carton_pack_qty}
                    onChange={(e) => setFormData({ ...formData, carton_pack_qty: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Specs: Tire with DOT Parser (المقترح 2) */}
          {formData.category === 'tire' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 space-y-3">
              <div className="text-emerald-400 font-bold text-xs flex items-center justify-between">
                <span>مواصفات الإطارات وتاريخ الإنتاج DOT:</span>
                {dotAnalysis && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    dotAnalysis.color === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : dotAnalysis.color === 'teal'
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : dotAnalysis.color === 'amber'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  }`}>
                    {dotAnalysis.status === 'expired' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                    <span>{dotAnalysis.label}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">مقاس الإطار:</label>
                  <input
                    type="text"
                    placeholder="205/55R16 أو 265/65R17"
                    value={formData.tire_battery_spec}
                    onChange={(e) => setFormData({ ...formData, tire_battery_spec: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">بلد الصنع:</label>
                  <input
                    type="text"
                    placeholder="اليابان، كوريا، الصين..."
                    value={formData.country_of_origin}
                    onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-teal-400" />
                    كود DOT (أسبوع/سنة):
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="مثال: 2423"
                    value={formData.dot_code}
                    onChange={(e) => setFormData({ ...formData, dot_code: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">مدة الضمان (أشهر):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    value={formData.warranty_months}
                    onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Specs: Battery */}
          {formData.category === 'battery' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-teal-500/20 space-y-3">
              <div className="text-teal-400 font-bold text-xs">مواصفات البطارية والقدرة الكهربائية:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">سعة البطارية (Ah أمبير/ساعة):</label>
                  <input
                    type="text"
                    placeholder="55Ah, 70Ah, 80Ah, 100Ah"
                    value={formData.battery_capacity_ah}
                    onChange={(e) => setFormData({ ...formData, battery_capacity_ah: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">نوع المولد / المواصفة:</label>
                  <input
                    type="text"
                    placeholder="كوري إلكتروني جاف، ماء مقطر..."
                    value={formData.tire_battery_spec}
                    onChange={(e) => setFormData({ ...formData, tire_battery_spec: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">فترة الضمان (أشهر):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    value={formData.warranty_months}
                    onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Dynamic Markup Calculator (المقترح 1) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                التسعير وحاسبة هامش الربح الديناميكية (Dynamic Markup Calculator):
              </span>
              <span className="text-[11px] text-slate-400">تقريب تلقائي لأقرب 50 ر.ي</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isService ? 'تكلفة المواد المباشرة:' : 'سعر التكلفة (شراء):'}
                </label>
                <input
                  type="number"
                  placeholder={isService ? '0' : '22000'}
                  value={formData.cost_price}
                  onChange={(e) => handleCostPriceChange(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-sm font-bold"
                  required={!isService}
                />
              </div>

              {!isService && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">نسبة هامش الربح المستهدفة (%):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="20"
                      value={customMarkup}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomMarkup(val);
                        if (val && Number(val) >= 0) {
                          applyMarkup(Number(val));
                        }
                      }}
                      className="w-full min-h-[44px] pr-3 pl-8 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isService ? 'أجرة الخدمة للزبون:' : 'سعر البيع المقترح للزبون:'}
                </label>
                <input
                  type="number"
                  placeholder={isService ? '2500' : '26000'}
                  value={formData.sell_price}
                  onChange={(e) => handleSellPriceChange(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-amber-400 font-mono text-sm font-black"
                  required
                />
              </div>
            </div>

            {/* Quick Markup Presets (Start from 10%) */}
            {!isService && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-bold ml-1">نسب سريعة:</span>
                {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyMarkup(pct)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition border ${
                      Number(customMarkup) === pct
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            )}

            {/* Profit margin summary bar */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">صافي الربح المتوقع للوحدة:</span>
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm ${profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  +{profitMargin.toLocaleString()} ر.ي
                </span>
                <span className="text-slate-400">({marginPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Safety Stock Alert & Shelf Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                {isService ? 'حد الأمان:' : 'حد الأمان (تنبيه النواقص بالعبوة):'}
              </label>
              <input
                type="number"
                disabled={isService}
                value={isService ? 0 : formData.min_stock_alert}
                onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs font-bold disabled:opacity-40"
                required={!isService}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">ملاحظات إضافية:</label>
              <input
                type="text"
                placeholder="ملاحظات حول المورد أو الاستخدام..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[46px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
            >
              {isSubmitting
                ? 'جاري الحفظ...'
                : isEditMode
                ? 'تحديث بيانات الصنف ✅'
                : 'حفظ الصنف في الكتالوج ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
