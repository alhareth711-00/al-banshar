import React, { useState } from 'react';
import {
  Wrench,
  Store,
  Phone,
  MapPin,
  Lock,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { getShopSettings, saveShopSettings } from '../utils/settings';

export default function OnboardingWizardModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);
  const currentSettings = getShopSettings();

  const [formData, setFormData] = useState({
    shopName: currentSettings.shopName || 'المركز الذهبي لخدمات السيارات وغيار الزيوت',
    shopPhone: currentSettings.shopPhone || '770834754',
    address: currentSettings.address || 'اليمن - صنعاء - شارع الزبيري',
    ownerPhone: currentSettings.ownerPhone || '770834754',
    ownerPin: currentSettings.ownerPin || '1234',
  });

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.shopName.trim()) {
        setErrorMsg('يرجى إدخال اسم المركز أو الورشة');
        return;
      }
      if (!formData.shopPhone.trim()) {
        setErrorMsg('يرجى إدخال رقم الهاتف للتواصل');
        return;
      }
      setErrorMsg('');
      setStep(2);
    } else {
      // Step 2 Completion
      if (!formData.ownerPin || formData.ownerPin.length < 4) {
        setErrorMsg('رمز PIN يجب أن يتكون من 4 أرقام على الأقل');
        return;
      }

      const updated = {
        ...currentSettings,
        shopName: formData.shopName.trim(),
        shopPhone: formData.shopPhone.trim(),
        address: formData.address.trim(),
        ownerPhone: formData.ownerPhone.trim(),
        ownerPin: formData.ownerPin.trim(),
      };

      saveShopSettings(updated);
      try {
        localStorage.setItem('quick_lube_onboarded', 'true');
      } catch (err) {}

      if (onComplete) {
        onComplete(updated);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Wizard Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/25">
            <Wrench className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              مرحباً بك في نظام سريع وبنشر PRO 👋
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              خطوتان فقط لتهيئة هوية ورشتك والبدء في تسجيل الفواتير وخدمات السيارات فوراً
            </p>
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center gap-2 pt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                step === 1 ? 'w-10 bg-amber-400' : 'w-4 bg-emerald-500'
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                step === 2 ? 'w-10 bg-amber-400' : 'w-4 bg-white/20'
              }`}
            />
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleNext} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right duration-200">
              <div className="border-b border-white/10 pb-2">
                <span className="text-xs font-black text-amber-300">الخطوة 1 من 2: بيانات المركز والورشة</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  <span>اسم المركز أو الورشة (يظهر في رأس الفاتورة):</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="مثال: مركز الصقر لخدمات الإطارات وغيار الزيوت"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>رقم الهاتف المعتمد للمركز:</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.shopPhone}
                  onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                  placeholder="770834754"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>عنوان الورشة أو موقعها:</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="اليمن - صنعاء - شارع الزبيري"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-left duration-200">
              <div className="border-b border-white/10 pb-2">
                <span className="text-xs font-black text-amber-300">الخطوة 2 من 2: واتساب الفواتير وحماية الإدارة</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رقم هاتف الواتساب (لإرسال كرت الخدمة والفواتير للعملاء):</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  placeholder="770834754"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-emerald-300 font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>رمز PIN السري للمالك (لحماية الأرباح وتعديل الإعدادات):</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={formData.ownerPin}
                  onChange={(e) => setFormData({ ...formData, ownerPin: e.target.value })}
                  placeholder="1234"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-amber-300 font-mono font-bold text-sm text-center tracking-widest focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  الافتراضي هو: 1234. يمكنك تغييره الآن لحماية أسرار أرباحك عن الكاشير والفنيين.
                </span>
              </div>

              {/* Ready Defaults Badge */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-white/10 flex items-center gap-2.5 text-xs text-slate-300">
                <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  تم ضبط مقاس الطابعة الحرارية تلقائياً على مقاس <strong className="text-cyan-300">80mm القياسي</strong>، مع دعم كامل للواتساب.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex gap-2.5">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2"
            >
              {step === 1 ? (
                <>
                  <span>متابعة الخطوة التالية</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>حفظ وبدء العمل الميداني فوراً 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
