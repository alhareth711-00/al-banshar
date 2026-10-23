import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';
import { verifyOwnerPin } from '../utils/settings';

export default function OwnerPinModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'رمز المالك السري (محمي)',
  subtitle = 'يرجى إدخال رمز PIN المكون من 4 أرقام لفتح الصلاحية',
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('يرجى إدخال الرمز السري');
      return;
    }
    if (verifyOwnerPin(pin)) {
      setError('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError('الرمز السري غير صحيح! يرجى المحاولة مرة أخرى.');
      setPin('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>الرمز السري للمالك:</span>
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••"
              className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-white/15 text-center font-mono text-2xl tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition active:scale-95 shadow-lg shadow-amber-500/20"
            >
              تأكيد الدخول
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[46px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-white/10"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
