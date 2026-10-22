import React, { useState } from 'react';
import { X, Car, User, Phone, Gauge, Check, AlertCircle, Building2, Percent, ShieldCheck } from 'lucide-react';

export default function NewVehicleModal({ isOpen, onClose, onVehicleCreated }) {
  const [formData, setFormData] = useState({
    plate_number: '',
    plate_type: 'خصوصي',
    car_make_model: '',
    customer_name: '',
    phone: '',
    preferred_oil_brand: 'تويوتا',
    preferred_viscosity: '20W-50',
    last_odometer: '',
    customer_type: 'individual', // 'individual' | 'fleet' | 'taxi' | 'gov' | 'vip'
    corporate_name: '',
    discount_percent: 0,
    credit_limit: 50000,
    corporate_tax_no: '',
    billing_cycle: 'instant', // 'instant' | 'monthly'
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.plate_number.trim()) {
      setError('يرجى إدخال رقم اللوحة');
      return;
    }
    if (!formData.customer_name.trim()) {
      setError('يرجى إدخال اسم العميل');
      return;
    }
    if (!formData.car_make_model.trim()) {
      setError('يرجى إدخال نوع وموديل السيارة');
      return;
    }
    if (!formData.phone.trim()) {
      setError('يرجى إدخال رقم هاتف العميل');
      return;
    }

    if (formData.customer_type !== 'individual' && !formData.corporate_name.trim()) {
      setError('يرجى إدخال اسم الشركة أو الجهة أو الأسطول');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          last_odometer: Number(formData.last_odometer) || 0,
          discount_percent: Number(formData.discount_percent) || 0,
          credit_limit: Number(formData.credit_limit) || 50000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل في حفظ بيانات السيارة');
      }

      onVehicleCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const plateTypes = ['خصوصي', 'أجرة', 'نقل', 'مؤقت'];

  const customerTypes = [
    { id: 'individual', label: '🚗 فردي (شخصي)' },
    { id: 'fleet', label: '🏢 أسطول شركات' },
    { id: 'taxi', label: '🚕 أجرة وتكاسي' },
    { id: 'gov', label: '🏛️ جهة حكومية' },
    { id: 'vip', label: '⭐ عميل مميز VIP' },
  ];

  const isCorporate = formData.customer_type !== 'individual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Car className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">تسجيل مركبة وعميل جديد</h3>
              <p className="text-xs text-slate-400">إضافة سريعة مع خيارات التسعير التفضيلي وأساطيل الشركات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer / Account Type Selector (Upgrade 3) */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">نوع الحساب والتسعير:</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {customerTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const defaultDiscount = t.id === 'fleet' ? 10 : t.id === 'taxi' ? 15 : t.id === 'vip' ? 5 : 0;
                    const defaultLimit = t.id !== 'individual' ? 250000 : 50000;
                    setFormData({
                      ...formData,
                      customer_type: t.id,
                      discount_percent: defaultDiscount,
                      credit_limit: defaultLimit,
                    });
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition text-center ${
                    formData.customer_type === t.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Corporate Fleet Details (Revealed when not individual) */}
          {isCorporate && (
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-indigo-300 font-black text-xs">
                <Building2 className="w-4 h-4" />
                <span>بيانات تسعير الأسطول والجهة:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم الشركة / الأسطول:</label>
                  <input
                    type="text"
                    placeholder="مثال: شركة النجم لنقل البضائع"
                    value={formData.corporate_name}
                    onChange={(e) => setFormData({ ...formData, corporate_name: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-white/10 text-white font-bold"
                    required={isCorporate}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">نسبة الخصم التلقائي %:</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="10"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className="w-full min-h-[40px] px-3 pl-8 rounded-xl bg-slate-900 border border-white/10 text-amber-300 font-mono font-bold"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">سقف الائتمان الآجل (ر.ي):</label>
                  <input
                    type="number"
                    placeholder="250000"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">دورة الفوترة:</label>
                  <select
                    value={formData.billing_cycle}
                    onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-900 border border-white/10 text-white font-bold cursor-pointer"
                  >
                    <option value="instant">دفع فوري لكل زيارة</option>
                    <option value="monthly">تجميع شهري / فوترة دورية للشركة</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Plate Number & Type */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              رقم اللوحة ونوعها <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="مثال: 1-45892"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-900/90 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm font-bold"
                required
                autoFocus
              />
              <select
                value={formData.plate_type}
                onChange={(e) => setFormData({ ...formData, plate_type: e.target.value })}
                className="min-h-[44px] px-3 rounded-xl bg-slate-900/90 border border-white/15 text-slate-200 focus:outline-none focus:border-amber-400 font-bold cursor-pointer"
              >
                {plateTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-900 text-white">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Car Make & Model */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              نوع وموديل السيارة <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: تويوتا هايلوكس دبل 2022"
              value={formData.car_make_model}
              onChange={(e) => setFormData({ ...formData, car_make_model: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900/90 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
              required
            />
          </div>

          {/* Customer Name & Yemeni Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                اسم السائق أو المسؤول <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 pr-9 rounded-xl bg-slate-900/90 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                رقم الجوال <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="77XXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 pr-9 rounded-xl bg-slate-900/90 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  required
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Preferred Oil & Viscosity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">الماركة المعتادة:</label>
              <select
                value={formData.preferred_oil_brand}
                onChange={(e) => setFormData({ ...formData, preferred_oil_brand: e.target.value })}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900/90 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-bold"
              >
                <option value="تويوتا">تويوتا أصلي</option>
                <option value="كاسترول">كاسترول</option>
                <option value="شل">شل هيلكس</option>
                <option value="توتال">توتال كوارتز</option>
                <option value="صقر">زيت صقر الوطني</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">اللزوجة المعتادة:</label>
              <select
                value={formData.preferred_viscosity}
                onChange={(e) => setFormData({ ...formData, preferred_viscosity: e.target.value })}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900/90 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-mono font-bold"
              >
                <option value="20W-50">20W-50 (معدني تقليدي)</option>
                <option value="10W-40">10W-40 (نصف تخليقي)</option>
                <option value="5W-30">5W-30 (تخليقي بالكامل)</option>
              </select>
            </div>
          </div>

          {/* Current Odometer */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              قراءة العداد الحالية (كم):
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="مثال: 125000"
                value={formData.last_odometer}
                onChange={(e) => setFormData({ ...formData, last_odometer: e.target.value })}
                className="w-full min-h-[42px] px-3.5 pr-9 rounded-xl bg-slate-900/90 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono font-bold"
              />
              <Gauge className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
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
              disabled={submitting}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {submitting ? 'جاري الحفظ...' : 'حفظ واختيار المركبة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
