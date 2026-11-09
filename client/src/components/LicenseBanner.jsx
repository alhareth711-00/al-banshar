import React from 'react';
import { AlertTriangle, Clock, KeyRound, Sparkles } from 'lucide-react';

export default function LicenseBanner({ licenseStatus, onOpenActivation }) {
  if (!licenseStatus) return null;

  const { status, daysRemaining, graceDaysRemaining, isTrial } = licenseStatus;

  // 1. Grace Period State (انتهى الاشتراك وبدأت مهلة الـ 7 أيام)
  if (status === 'grace_period') {
    return (
      <div className="w-full bg-gradient-to-r from-rose-900/90 via-amber-900/90 to-rose-900/90 border-b border-rose-500/50 px-4 py-2 text-white flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in duration-300">
        <div className="flex items-center gap-2 font-black">
          <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
          <span>
            ⚠️ تنبيه هام: انتهت فترة الاشتراك! متبقي{' '}
            <span className="text-amber-300 underline font-extrabold text-sm px-1">
              {graceDaysRemaining} {graceDaysRemaining === 1 ? 'يوم' : 'أيام'}
            </span>{' '}
            في مهلة السماح قبل إيقاف إصدار الفواتير.
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenActivation}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>إدخال كود التجديد 🔑</span>
        </button>
      </div>
    );
  }

  // 2. Initial Free Trial State (نسخة تجريبية 14 يوماً)
  if (status === 'trial' || isTrial) {
    return (
      <div className="w-full bg-slate-900/90 border-b border-cyan-500/30 px-4 py-1.5 text-slate-300 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            نسخة تجريبية مجانية 🚀 (متبقي{' '}
            <strong className="text-cyan-300 font-mono text-sm px-0.5">
              {Math.max(0, daysRemaining)}
            </strong>{' '}
            يوم)
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenActivation}
          className="px-3 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-500/50 hover:text-white text-cyan-300 font-bold text-[11px] transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-3 h-3 text-cyan-300" />
          <span>تفعيل الاشتراك السنوي 🔑</span>
        </button>
      </div>
    );
  }

  // 3. Paid Active License with <= 15 days remaining (تذكير مبكر قبل الانتهاء)
  if (status === 'active' && daysRemaining <= 15 && daysRemaining > 0) {
    return (
      <div className="w-full bg-amber-950/70 border-b border-amber-500/30 px-4 py-1.5 text-amber-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            تذكير: ينتهي اشتراك النظام السنوي بعد{' '}
            <span className="font-mono font-black text-amber-300 underline">{daysRemaining}</span> يوماً
            ({licenseStatus.expiresAt}).
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenActivation}
          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition active:scale-95 flex items-center gap-1 shrink-0"
        >
          <KeyRound className="w-3 h-3" />
          <span>تجديد مبكر 🔑</span>
        </button>
      </div>
    );
  }

  return null;
}
