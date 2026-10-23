import React, { useState, useEffect } from 'react';
import { X, Settings, Store, Phone, Smartphone, MapPin, Check, Lock, KeyRound } from 'lucide-react';
import { getShopSettings, saveShopSettings } from '../utils/settings';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [formData, setFormData] = useState(getShopSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getShopSettings());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    saveShopSettings(formData);
    setSavedSuccess(true);
    if (onSettingsUpdated) onSettingsUpdated(formData);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إعدادات وهوية المركز</h3>
              <p className="text-xs text-slate-400">تخصيص اسم المحل وأرقام الواتساب للرسائل</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>اسم المركز / المحل (يظهر بالرسائل والكرت):</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Shop Phone */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>رقم هاتف المركز / خدمة العملاء:</span>
            </label>
            <input
              type="tel"
              value={formData.shopPhone}
              onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Owner WhatsApp Phone */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>رقم واتساب مالك المركز (لاستلام تقرير الإغلاق اليومي):</span>
            </label>
            <input
              type="tel"
              value={formData.ownerPhone}
              onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Supervisor / Partner WhatsApp Phone (Upgrade 2) */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>رقم واتساب المشرف العام / الشريك (اختياري):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">استلام نسخة التقرير</span>
            </label>
            <input
              type="tel"
              placeholder="مثال: 777987654 (اختياري)"
              value={formData.supervisorPhone || ''}
              onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Operating Hours for Peak Heatmap (Upgrade 5 Adjustment) */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10">
            <div>
              <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                ساعة بدء العمل اليومي:
              </label>
              <select
                value={formData.openingHour !== undefined ? formData.openingHour : 7}
                onChange={(e) => setFormData({ ...formData, openingHour: Number(e.target.value) })}
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                {[5, 6, 7, 8, 9, 10].map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 صباحاً
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                ساعة إغلاق المركز اليومي:
              </label>
              <select
                value={formData.closingHour !== undefined ? formData.closingHour : 24}
                onChange={(e) => setFormData({ ...formData, closingHour: Number(e.target.value) })}
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                <option value={22}>10:00 مساءً</option>
                <option value={23}>11:00 مساءً</option>
                <option value={24}>12:00 منتصف الليل (مساءً)</option>
                <option value={25}>01:00 فجراً (بعد منتصف الليل)</option>
                <option value={26}>02:00 فجراً</option>
              </select>
            </div>
          </div>

          {/* Owner PIN Protection (الجزء الأول) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-extrabold flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>رمز المالك السري (PIN Lock):</span>
              </label>
              <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                افتراضي: 1234
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              رمز أمان مكون من 4 أرقام لحماية الأرباح، شاشة الخزينة، وتعديل أسعار وكميات المخزون.
            </p>
            <input
              type="password"
              maxLength={4}
              value={formData.ownerPin || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setFormData({ ...formData, ownerPin: val });
              }}
              placeholder="1234"
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-950 border border-white/20 text-amber-400 font-mono text-center text-lg font-black tracking-widest focus:outline-none focus:border-amber-400 shadow-inner"
              required
            />

            {/* Auto-Lock Inactivity Setting (المقترح 1) */}
            <div className="pt-2 border-t border-amber-500/20">
              <label className="block text-slate-300 font-bold mb-1.5 text-[11px] flex items-center justify-between">
                <span>⏱️ مدة القفل التلقائي لوضع المدير عند عدم النشاط:</span>
                <span className="text-[10px] text-amber-300 font-mono">
                  {formData.autoLockMinutes === 0 ? 'معطل' : `${formData.autoLockMinutes || 3} دقائق`}
                </span>
              </label>
              <select
                value={formData.autoLockMinutes !== undefined ? formData.autoLockMinutes : 3}
                onChange={(e) => setFormData({ ...formData, autoLockMinutes: Number(e.target.value) })}
                className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                <option value={1}>دقيقة واحدة (أعلى درجات الحماية)</option>
                <option value={2}>دقيقتان</option>
                <option value={3}>3 دقائق (موصى به لمحلات الخدمة السريعة)</option>
                <option value={5}>5 دقائق</option>
                <option value={10}>10 دقائق</option>
                <option value={0}>تعطيل القفل التلقائي</option>
              </select>
            </div>
          </div>

          {/* Shop Address */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>العنوان / المدينة:</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Shifts Mode Toggle */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={!!formData.enableShiftsMode}
                onChange={(e) => setFormData({ ...formData, enableShiftsMode: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded accent-amber-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>تفعيل نظام الورديات وتسليم الصندوق (Shift Mode)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">اختياري</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  معطل افتراضياً للعمل بالإغلاق المالي اليومي المباشر. عند التفعيل، يتيح فتح وإغلاق الورديات واحتساب العجز/الفائض ومحضر التسليم.
                </div>
              </div>
            </label>
          </div>

          {/* Database Backup & Security Section */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-bold text-slate-400">حماية البيانات والنسخ الاحتياطي:</div>
            <a
              href="/api/backup"
              download
              className="w-full min-h-[46px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
            >
              <span>تنزيل نسخة احتياطية من قاعدة البيانات (.sqlite) 💾</span>
            </a>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
