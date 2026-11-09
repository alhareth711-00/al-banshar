import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Download,
  PhoneCall,
  Clock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function LicenseLockModal({
  isOpen,
  licenseStatus,
  onActivated,
  onDownloadBackup,
}) {
  const [keyInput, setKeyInput] = useState('');
  const [shopNameInput, setShopNameInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [copiedMid, setCopiedMid] = useState(false);

  if (!isOpen || !licenseStatus) return null;

  const isTampered = licenseStatus.status === 'locked_tampered' || licenseStatus.clockTampered;
  const machineId = licenseStatus.machineId || 'ALB-0000-0000-0000';
  const supportPhone = licenseStatus.supportPhone || '770834754';

  const handleCopyMid = () => {
    navigator.clipboard?.writeText(machineId);
    setCopiedMid(true);
    setTimeout(() => setCopiedMid(false), 2500);
  };

  const handleWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أرغب في تجديد اشتراك نظام سريع وبنشر PRO.\nكود جهازي هو: ${machineId}\nاسم المركز: ${licenseStatus.shopName || ''}`
    );
    window.open(`https://wa.me/967${supportPhone}?text=${text}`, '_blank');
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setActivationError('يرجى إدخال كود مفتاح التفعيل أولاً');
      return;
    }

    setIsActivating(true);
    setActivationError('');

    try {
      const res = await fetch('/api/system/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: keyInput.trim().toUpperCase(),
          shopName: shopNameInput.trim() || licenseStatus.shopName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل تفعيل المفتاح المدخل');
      }

      if (onActivated) {
        onActivated(data.data);
      }
    } catch (err) {
      setActivationError(err.message || 'كود التفعيل غير صحيح أو لا يطابق هذا الجهاز');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-right relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
            {isTampered ? (
              <Clock className="w-9 h-9 animate-pulse" />
            ) : (
              <ShieldAlert className="w-9 h-9 animate-bounce" />
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              {isTampered
                ? '⚠️ تنبيه أمان: رصد تلاعب بساعة النظام'
                : '🔒 انتهت فترة الاشتراك ومهلة السماح'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              {isTampered
                ? 'تم ضبط ساعة الكمبيوتر بتاريخ أقدم من الحركات المسجلة. يرجى إعادة التاريخ والوقت الصحيحين أو إدخال كود تفعيل ساري.'
                : 'لقد انتهت فترة الاشتراك الرسمية وأيام مهلة السماح (7 أيام). لمتابعة إصدار الفواتير، يرجى إدخال مفتاح التجديد.'}
            </p>
          </div>
        </div>

        {/* Machine Fingerprint & Support Info */}
        <div className="bg-slate-950/80 rounded-2xl border border-white/10 p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>كود جهازك الفريد (Machine ID):</span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              خاص بهذا الكمبيوتر فقط
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-4 py-2.5 font-mono text-sm sm:text-base font-black text-cyan-300 text-center tracking-wider selection:bg-cyan-500 selection:text-black">
              {machineId}
            </div>
            <button
              type="button"
              onClick={handleCopyMid}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              title="نسخ الكود"
            >
              {copiedMid ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
            <span className="text-slate-400">للتجديد السريع، أرسل هذا الكود عبر الواتساب:</span>
            <button
              type="button"
              onClick={handleWhatsAppSupport}
              className="text-emerald-400 hover:text-emerald-300 font-black flex items-center gap-1 underline underline-offset-4"
            >
              <span>واتساب الدعم ({supportPhone})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivateSubmit} className="space-y-3.5 mb-5">
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>أدخل كود مفتاح التفعيل والتجديد:</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
              placeholder="ALB-XXXX-XXXX-XXXX-XXXX-XXXX"
              className="w-full min-h-[46px] rounded-xl bg-slate-950 border border-white/20 px-4 font-mono text-sm sm:text-base font-bold text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 text-center tracking-widest"
            />
          </div>

          {activationError && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{activationError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isActivating || !keyInput.trim()}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-98"
          >
            {isActivating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحقق من التوقيع الرقمي...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
                <span>تأكيد وتفعيل الاشتراك الآن ⚡</span>
              </>
            )}
          </button>
        </form>

        {/* Professional Ethics Safe-Harbor: Emergency Backup Download */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400 text-center sm:text-right">
            <span>حقوق بياناتك محفوظة وأمانتك مصانة 🛡️</span>
          </div>

          <button
            type="button"
            onClick={onDownloadBackup}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold transition flex items-center gap-1.5 shrink-0 active:scale-95 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل نسخة احتياطية من بياناتك 💾</span>
          </button>
        </div>
      </div>
    </div>
  );
}
