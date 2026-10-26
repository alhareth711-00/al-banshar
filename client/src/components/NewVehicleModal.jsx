import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Car, User, Phone, Gauge, Check, AlertCircle, Building2, 
  Percent, FileText, Hash, ShieldCheck, Wrench
} from 'lucide-react';

export default function NewVehicleModal({ isOpen, onClose, onVehicleCreated, initialVehicle = null }) {
  const [formData, setFormData] = useState({
    plate_number: '',
    plate_divider: '1',
    plate_type: 'خصوصي',
    vehicle_category: 'سيارة',
    car_make_model: '',
    customer_name: '',
    phone: '',
    preferred_oil_brand: 'تويوتا',
    preferred_viscosity: '20W-50',
    last_odometer: '',
    service_interval_km: 3000,
    customer_type: 'individual', // 'individual' | 'fleet' | 'vip'
    corporate_name: '',
    discount_percent: 0,
    credit_limit: 0,
    opening_balance: 0,
    customer_notes: '',
    corporate_tax_no: '',
    billing_cycle: 'instant', // 'instant' | 'monthly'
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (initialVehicle) {
      const isAutoPlate = initialVehicle.plate_number && initialVehicle.plate_number.startsWith('بدون');
      setFormData({
        plate_number: isAutoPlate ? '' : (initialVehicle.plate_number || ''),
        plate_divider: initialVehicle.plate_divider ? String(initialVehicle.plate_divider) : '1',
        plate_type: initialVehicle.plate_type || 'خصوصي',
        vehicle_category: initialVehicle.vehicle_category || 'سيارة',
        car_make_model: initialVehicle.car_make_model || '',
        customer_name: initialVehicle.customer_name || '',
        phone: initialVehicle.phone || '',
        preferred_oil_brand: initialVehicle.preferred_oil_brand || 'تويوتا',
        preferred_viscosity: initialVehicle.preferred_viscosity || '20W-50',
        last_odometer: initialVehicle.last_odometer ? String(initialVehicle.last_odometer) : '',
        service_interval_km: initialVehicle.service_interval_km ? Number(initialVehicle.service_interval_km) : 3000,
        customer_type: initialVehicle.customer_type || 'individual',
        corporate_name: initialVehicle.corporate_name || '',
        discount_percent: initialVehicle.discount_percent || 0,
        credit_limit: initialVehicle.credit_limit || (initialVehicle.customer_type === 'fleet' ? 50000 : initialVehicle.customer_type === 'vip' ? 10000 : 0),
        opening_balance: initialVehicle.balance_due || 0,
        customer_notes: initialVehicle.customer_notes || '',
        corporate_tax_no: initialVehicle.corporate_tax_no || '',
        billing_cycle: initialVehicle.billing_cycle || 'instant',
      });
    } else {
      setFormData({
        plate_number: '',
        plate_divider: '1',
        plate_type: 'خصوصي',
        vehicle_category: 'سيارة',
        car_make_model: '',
        customer_name: '',
        phone: '',
        preferred_oil_brand: 'تويوتا',
        preferred_viscosity: '20W-50',
        last_odometer: '',
        service_interval_km: 3000,
        customer_type: 'individual',
        corporate_name: '',
        discount_percent: 0,
        credit_limit: 0,
        opening_balance: 0,
        customer_notes: '',
        corporate_tax_no: '',
        billing_cycle: 'instant',
      });
    }
    setError('');
  }, [initialVehicle, isOpen]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // Handle ESC key to close
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_name.trim()) {
      setError('يرجى إدخال اسم العميل');
      return;
    }
    if (!formData.phone.trim()) {
      setError('يرجى إدخال رقم هاتف العميل');
      return;
    }

    if (formData.customer_type === 'fleet' && !formData.corporate_name.trim()) {
      setError('يرجى إدخال اسم الشركة أو الجهة أو الأسطول');
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = initialVehicle && initialVehicle.id;
      const url = isEdit ? `/api/vehicles/${initialVehicle.id}` : '/api/vehicles';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        car_make_model: formData.car_make_model.trim() || `${formData.vehicle_category} بدون تحديد`,
        last_odometer: Number(formData.last_odometer) || 0,
        service_interval_km: Number(formData.service_interval_km) || 3000,
        discount_percent: Number(formData.discount_percent) || 0,
        credit_limit: Number(formData.credit_limit) || 0,
        balance_due: Number(formData.opening_balance) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل في حفظ بيانات العميل');
      }

      onVehicleCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Official Yemeni Plate Types - ALL WITH BLACK TEXT
  const plateTypes = [
    { id: 'خصوصي', label: 'خصوصي', bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-slate-950 font-black' },
    { id: 'نقل', label: 'نقل', bg: 'bg-red-500', border: 'border-red-700', text: 'text-slate-950 font-black' },
    { id: 'أجرة', label: 'أجرة', bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-slate-950 font-black' },
    { id: 'مؤقت', label: 'مؤقت', bg: 'bg-white', border: 'border-slate-400', text: 'text-slate-950 font-black' },
  ];

  // Vehicle Categories
  const vehicleCategories = [
    'سيارة',
    'هايلوكس',
    'باص',
    'دراجة نارية',
    'قلاب',
    'دينة',
    'وايت ماء',
    'قاطرة',
    'صالون/شاص',
    'شاحنة كبيرة',
    'أخرى',
  ];

  // Customer Account Types (Taxi & Gov removed per request)
  const customerTypes = [
    { id: 'individual', label: '🚗 فردي (شخصي)', defaultLimit: 0, defaultDiscount: 0 },
    { id: 'fleet', label: '🏢 أسطول شركات', defaultLimit: 50000, defaultDiscount: 10 },
    { id: 'vip', label: '⭐ عميل مميز VIP', defaultLimit: 10000, defaultDiscount: 0 },
  ];

  const handleCustomerTypeSelect = (typeId) => {
    const target = customerTypes.find(c => c.id === typeId);
    setFormData(prev => ({
      ...prev,
      customer_type: typeId,
      credit_limit: target ? target.defaultLimit : 0,
      discount_percent: target ? target.defaultDiscount : 0,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 rounded-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* ─── MODAL HEADER (LOCKED IN DUAL-PANE COCKPIT) ─── */}
        <div className="px-5 py-3.5 bg-slate-950/95 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              📑
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {initialVehicle ? 'تعديل بيانات المركبة والعميل' : 'إضافة مركبة وعميل جديد'}
              </h3>
              <p className="text-[11px] text-slate-400">
                كونسول الاستقبال المزدوج &bull; إدخال سريع بالكيبورد والـ Numpad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 border border-slate-800">
              ESC للإلغاء | Enter للحفظ
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* ─── LOCKED IN: DUAL-PANE CONSOLE FORM ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-800 flex-1 overflow-y-auto">
            
            {/* RIGHT COLUMN: CUSTOMER & FINANCIAL (الجهة اليمنى: بيانات العميل والمالية) */}
            <div className="p-5 space-y-3.5 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> الجهة اليمنى: بيانات العميل والمالية
                </span>
                <span className="text-[10px] text-slate-400 font-mono">TAB &rarr; التالي</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم العميل بالكامل <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={firstInputRef}
                    type="text"
                    tabIndex={1}
                    placeholder="مثال: صالح محمد اليافعي"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    required
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رقم الجوال <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      tabIndex={2}
                      placeholder="77XXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">فئة العميل</label>
                  <div className="flex gap-1 h-10">
                    {customerTypes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCustomerTypeSelect(c.id)}
                        className={`flex-1 rounded-lg text-[10px] font-bold border transition leading-tight ${
                          formData.customer_type === c.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {c.id === 'individual' ? 'فردي' : c.id === 'fleet' ? 'شركات' : 'VIP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fleet Company Name (shown if fleet) */}
              {formData.customer_type === 'fleet' && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-amber-300">اسم الشركة أو الأسطول *</label>
                  <input
                    type="text"
                    tabIndex={3}
                    placeholder="مثال: شركة الجزيرة للتجارة والنقل"
                    value={formData.corporate_name}
                    onChange={(e) => setFormData({ ...formData, corporate_name: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Financial: Opening balance, Credit limit, Discount */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-black text-slate-400 block">المعاملات المالية والائتمان</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 mb-1">رصيد افتتاحي (ر.ي)</label>
                    <input
                      type="number"
                      tabIndex={4}
                      placeholder="0"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-400 font-mono font-black text-xs text-center focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">سقف الائتمان (ر.ي)</label>
                    <input
                      type="number"
                      tabIndex={5}
                      placeholder="0"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">نسبة الخصم %</label>
                    <input
                      type="number"
                      tabIndex={6}
                      min="0"
                      max="100"
                      placeholder="0"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  ملاحظات خاصة بالعميل
                </label>
                <textarea
                  rows={2}
                  tabIndex={7}
                  placeholder="مثال: متعود على التشحيم عند تغيير الزيت، يفضل فحص الهواء دائماً..."
                  value={formData.customer_notes}
                  onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-200 placeholder-slate-600 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none resize-none font-medium"
                />
              </div>
            </div>

            {/* LEFT COLUMN: VEHICLE & ENGINE (الجهة اليسرى: بيانات المركبة والمحرك) */}
            <div className="p-5 space-y-3.5 bg-slate-950/40">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                  <Car className="w-4 h-4" /> الجهة اليسرى: بيانات المركبة والتشغيل
                </span>
                <span className="text-[10px] text-slate-400">اللوحة والفاصل ومسافة الزيت</span>
              </div>

              {/* Yemeni Plate Selector & Colors */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300">نوع اللوحة (كتابة سوداء معتمدة):</label>
                  <div className="flex items-center gap-1">
                    {plateTypes.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, plate_type: p.id })}
                        className={`px-2 py-0.5 rounded text-[10px] font-black border transition ${
                          p.bg
                        } ${p.text} ${p.border} ${
                          formData.plate_type === p.id ? 'ring-2 ring-white shadow' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider, Plate Number, and Category */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الفاصل (1 أو 2)</label>
                    <input
                      type="text"
                      tabIndex={8}
                      value={formData.plate_divider}
                      onChange={(e) => setFormData({ ...formData, plate_divider: e.target.value })}
                      className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-amber-400 font-mono font-black text-sm rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم اللوحة</label>
                    <input
                      type="text"
                      tabIndex={9}
                      placeholder="مثال: 45892"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                      className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-white font-mono font-black text-base rounded-lg focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">تصنيف المركبة</label>
                    <select
                      tabIndex={10}
                      value={formData.vehicle_category}
                      onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                      className="w-full h-10 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-lg px-2 focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      {vehicleCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Car Make & Model Details */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تفاصيل وموديل السيارة
                </label>
                <input
                  type="text"
                  tabIndex={11}
                  placeholder="مثال: تويوتا لاندكروزر V8 2022"
                  value={formData.car_make_model}
                  onChange={(e) => setFormData({ ...formData, car_make_model: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Odometer & Oil Change Interval (Default 3000 km) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    العداد الحالي (كم)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      tabIndex={12}
                      placeholder="0"
                      value={formData.last_odometer}
                      onChange={(e) => setFormData({ ...formData, last_odometer: e.target.value })}
                      className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none"
                    />
                    <Gauge className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    مسافة غيار الزيت (كم)
                  </label>
                  <input
                    type="number"
                    tabIndex={13}
                    placeholder="3000"
                    value={formData.service_interval_km}
                    onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-400 font-mono font-black text-xs text-center focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preferred Oil & Viscosity */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الزيت المعتاد:</label>
                  <select
                    tabIndex={14}
                    value={formData.preferred_oil_brand}
                    onChange={(e) => setFormData({ ...formData, preferred_oil_brand: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="تويوتا">تويوتا أصلي</option>
                    <option value="كاسترول">كاسترول</option>
                    <option value="شل">شل هيلكس</option>
                    <option value="توتال">توتال كوارتز</option>
                    <option value="صقر">صقر الوطني</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اللزوجة المعتادة:</label>
                  <select
                    tabIndex={15}
                    value={formData.preferred_viscosity}
                    onChange={(e) => setFormData({ ...formData, preferred_viscosity: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="20W-50">20W-50 (معدني)</option>
                    <option value="10W-40">10W-40 (نصف تخليقي)</option>
                    <option value="5W-30">5W-30 (تخليقي بالكامل)</option>
                    <option value="5W-40">5W-40</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              إلغاء [ESC]
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                [Enter] للحفظ المباشر
              </span>
              <button
                type="submit"
                disabled={submitting}
                tabIndex={16}
                className="px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                {submitting ? 'جاري الحفظ...' : initialVehicle ? 'حفظ التعديلات' : 'حفظ واعتماد المركبة والعميل'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
