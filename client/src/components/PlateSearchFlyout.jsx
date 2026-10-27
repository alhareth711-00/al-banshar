import React, { useState, useEffect, useRef } from 'react';
import { Car, CheckCircle2, AlertCircle, Plus, X, Search, Sparkles, ArrowRight } from 'lucide-react';
import { playMatchChime } from '../utils/soundEffects';

const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const PLATE_TYPES = [
  { id: 'خصوصي', label: 'خصوصي', bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-slate-950', hex: '#38bdf8' },
  { id: 'نقل', label: 'نقل', bg: 'bg-red-500', border: 'border-red-700', text: 'text-slate-950', hex: '#ef4444' },
  { id: 'أجرة', label: 'أجرة', bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-slate-950', hex: '#facc15' },
  { id: 'مؤقت', label: 'مؤقت', bg: 'bg-white', border: 'border-slate-400', text: 'text-slate-950', hex: '#ffffff' },
];

export default function PlateSearchFlyout({
  isOpen,
  onClose,
  onSelectVehicle,
  onOpenNewVehicleModal,
}) {
  const [plateNumber, setPlateNumber] = useState('');
  const [plateDivider, setPlateDivider] = useState('1');
  const [detectedType, setDetectedType] = useState(null); // null = neutral white initially
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  const numberInputRef = useRef(null);
  const dividerInputRef = useRef(null);

  // Auto-focus immediately on the RIGHT compartment (plate number) when opened
  useEffect(() => {
    if (isOpen) {
      setPlateNumber('');
      setPlateDivider('1');
      setDetectedType(null);
      setMatchedVehicle(null);
      setSearchResults([]);
      setHasPlayedChime(false);

      const timer = setTimeout(() => {
        if (numberInputRef.current) {
          numberInputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Clean numbers
  const cleanNumber = String(plateNumber || '').replace(/\D/g, '');
  const cleanDivider = String(plateDivider || '').replace(/\D/g, '');

  // Live real-time search as user types digits
  useEffect(() => {
    if (!isOpen) return;

    if (!cleanNumber) {
      setSearchResults([]);
      setMatchedVehicle(null);
      setDetectedType(null);
      setHasPlayedChime(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(cleanNumber)}`);
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
          // Look for exact plate number matches or close matches
          const exactMatch = data.data.find((v) => {
            const vNum = String(v.plate_number || '').replace(/\D/g, '');
            return vNum === cleanNumber;
          });

          const primary = exactMatch || data.data[0];
          setSearchResults(data.data);
          setMatchedVehicle(primary);

          // Smart Auto-Detection: morph plate color & type to the matched vehicle's type
          if (primary && primary.plate_type) {
            setDetectedType(primary.plate_type);
            if (primary.plate_divider) {
              setPlateDivider(String(primary.plate_divider));
            }
            if (!hasPlayedChime) {
              playMatchChime();
              setHasPlayedChime(true);
            }
          }
        } else {
          setSearchResults([]);
          setMatchedVehicle(null);
          setDetectedType(null);
        }
      } catch (err) {
        console.error('Error during plate live search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [cleanNumber, isOpen, hasPlayedChime]);

  // Keyboard navigation inside the flyout
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (matchedVehicle) {
          onSelectVehicle(matchedVehicle);
          onClose();
        } else if (cleanNumber) {
          // Open new vehicle modal pre-filled
          onClose();
          onOpenNewVehicleModal({
            plate_number: cleanNumber,
            plate_divider: cleanDivider || '1',
            plate_type: detectedType || 'خصوصي',
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchedVehicle, cleanNumber, cleanDivider, detectedType, onClose, onSelectVehicle, onOpenNewVehicleModal]);

  if (!isOpen) return null;

  // Active Type Meta or Neutral White
  const currentTypeMeta = detectedType
    ? PLATE_TYPES.find((t) => t.id === detectedType) || PLATE_TYPES[0]
    : {
        id: 'غير محدد',
        label: 'غير محدد الصنف',
        bg: 'bg-white',
        border: 'border-slate-400',
        text: 'text-slate-950',
      };

  // Generate 1-to-1 paired digit columns: [Arabic top, English bottom]
  const numberPairs =
    cleanNumber.length > 0
      ? cleanNumber.split('').map((en) => ({
          en,
          ar: easternDigits[parseInt(en, 10)] || en,
        }))
      : [{ en: '—', ar: '—' }];

  const dividerPairs =
    cleanDivider.length > 0
      ? cleanDivider.split('').map((en) => ({
          en,
          ar: easternDigits[parseInt(en, 10)] || en,
        }))
      : [{ en: '1', ar: '١' }];

  const numDigitsCount = numberPairs.length;
  const numGapClass = numDigitsCount >= 6 ? 'gap-1.5' : numDigitsCount >= 5 ? 'gap-2.5' : 'gap-3.5';
  const numColWidthClass = numDigitsCount >= 6 ? 'min-w-[20px]' : numDigitsCount >= 5 ? 'min-w-[24px]' : 'min-w-[30px]';
  const arNumFontSizeClass = numDigitsCount >= 6 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl';
  const enNumFontSizeClass = numDigitsCount >= 6 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl relative space-y-4"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Car className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base">البحث المباشر برقم اللوحة</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-mono font-bold border border-white/10">
                  F2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                اكتب رقم اللوحة بالكيبورد مباشرة — يتعرف النظام على الصنف ويتحول لونه حياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 flex items-center justify-center transition"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── THE ADAPTIVE YEMENI PLATE REPLICA ─── */}
        <div
          className={`yemen-plate-container w-full rounded-2xl overflow-hidden border-2 transition-all duration-300 select-none ${
            currentTypeMeta.bg
          } ${currentTypeMeta.border} text-slate-950 ${
            matchedVehicle ? 'ring-4 ring-emerald-400/60 shadow-lg scale-[1.01]' : 'shadow-xl'
          }`}
          style={{
            boxShadow: matchedVehicle
              ? '0 12px 30px -5px rgba(16, 185, 129, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Top Header Strip: اليَمَن في اليمين | الصنف المكتشف أو غير محدد في الشمال */}
          <div className="py-2 px-5 flex items-center justify-between border-b-2 border-slate-950 bg-black/5">
            <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-wider">
              اليَمَن
            </span>

            <div className="flex items-center gap-2">
              {detectedType ? (
                <span className="text-lg sm:text-xl font-black text-slate-950 tracking-wider flex items-center gap-1.5 animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-slate-950 inline" />
                  <span>{detectedType}</span>
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-slate-700 bg-black/10 px-3 py-1 rounded-full border border-black/15">
                  أدخل الأرقام للتعرف التلقائي
                </span>
              )}
            </div>
          </div>

          {/* Bottom Digits Section:
               - Right (78%): Plate Number (DIRECT AUTO-FOCUS HERE)
               - Left (22%): Divider
          */}
          <div className="flex min-h-[110px] items-stretch text-slate-950">
            {/* RIGHT SIDE: Plate Number */}
            <div
              className="w-[78%] flex flex-col items-center justify-center px-2 py-2.5 border-l-2 border-slate-950 relative group cursor-text hover:bg-black/5 focus-within:bg-black/5"
              onClick={() => numberInputRef.current?.focus()}
            >
              <span className="text-[9px] font-bold text-slate-900/60 absolute top-1 right-2.5 pointer-events-none select-none">
                رقم اللوحة (اكتب هنا)
              </span>

              {/* Paired Digit Columns */}
              <div
                dir="ltr"
                className={`flex items-center justify-center ${numGapClass} pointer-events-none select-none z-0 py-1 w-full max-w-full px-1`}
              >
                {numberPairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center ${numColWidthClass} shrink-0`}
                  >
                    <span className={`arabic-plate-number ${arNumFontSizeClass} font-black leading-none text-slate-950 text-center`}>
                      {pair.ar}
                    </span>
                    <span className={`english-plate-number ${enNumFontSizeClass} font-black leading-none text-slate-950 text-center mt-2`}>
                      {pair.en}
                    </span>
                  </div>
                ))}
              </div>

              {/* In-Plate Direct Input (Auto-focused) */}
              <input
                ref={numberInputRef}
                dir="ltr"
                type="text"
                autoFocus
                value={cleanNumber}
                maxLength={6}
                placeholder=""
                onChange={(e) => setPlateNumber(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                autoComplete="off"
              />
            </div>

            {/* LEFT SIDE: Divider */}
            <div
              className="w-[22%] flex flex-col items-center justify-center px-1.5 py-2.5 relative group cursor-text hover:bg-black/5 focus-within:bg-black/5"
              onClick={() => dividerInputRef.current?.focus()}
            >
              <span className="text-[9px] font-bold text-slate-900/60 absolute top-1 right-1.5 pointer-events-none select-none">
                الفاصل
              </span>

              {/* Divider Paired Digits */}
              <div
                dir="ltr"
                className="flex items-center justify-center gap-1.5 pointer-events-none select-none z-0 py-1"
              >
                {dividerPairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center min-w-[18px] shrink-0"
                  >
                    <span className="arabic-plate-number text-2xl sm:text-3xl font-black leading-none text-slate-950 text-center">
                      {pair.ar}
                    </span>
                    <span className="english-plate-number text-xl sm:text-2xl font-black leading-none text-slate-950 text-center mt-2">
                      {pair.en}
                    </span>
                  </div>
                ))}
              </div>

              <input
                ref={dividerInputRef}
                dir="ltr"
                type="text"
                value={cleanDivider}
                maxLength={2}
                placeholder="1"
                onChange={(e) => setPlateDivider(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* ─── LIVE RESULT & ACTION AREA ─── */}
        {cleanNumber.length > 0 && (
          <div className="space-y-3 pt-1">
            {matchedVehicle ? (
              /* MATCHED VEHICLE CARD */
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-800 to-slate-800 border-2 border-emerald-500/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300 font-extrabold text-sm">تم التعرف على السيارة في النظام!</span>
                  </div>
                  {matchedVehicle.balance_due > 0 ? (
                    <span className="text-rose-400 bg-rose-500/20 border border-rose-500/30 text-xs font-mono font-black px-2.5 py-0.5 rounded-full">
                      دين سابق: {Number(matchedVehicle.balance_due).toLocaleString()} ر.ي
                    </span>
                  ) : (
                    <span className="text-emerald-400 bg-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                      خالي من الديون ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px]">اسم العميل:</span>
                    <span className="font-extrabold text-white text-sm">{matchedVehicle.customer_name}</span>
                    <span className="text-slate-400 font-mono text-[11px] block mt-0.5">{matchedVehicle.phone}</span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px]">السيارة والزيت المعتمد:</span>
                    <span className="font-bold text-white text-xs">{matchedVehicle.car_make_model}</span>
                    <span className="text-amber-400 font-bold text-[11px] block mt-0.5">
                      🛢️ {matchedVehicle.preferred_oil_brand || 'تويوتا'} ({matchedVehicle.preferred_viscosity || '20W-50'})
                    </span>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectVehicle(matchedVehicle);
                    onClose();
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <span>اختيار هذه السيارة وبدء الفاتورة</span>
                  <span className="px-2 py-0.5 rounded bg-black/20 text-xs font-mono">↵ Enter</span>
                </button>
              </div>
            ) : isSearching ? (
              <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>جاري مطابقة أرقام اللوحة في السجلات...</span>
              </div>
            ) : (
              /* UNREGISTERED / NEW VEHICLE PROMPT */
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>اللوحة ({cleanDivider}-{cleanNumber}) غير مسجلة مسبقاً — هل تود تسجيلها كعميل جديد؟</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewVehicleModal({
                      plate_number: cleanNumber,
                      plate_divider: cleanDivider || '1',
                      plate_type: detectedType || 'خصوصي',
                    });
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ تسجيل هذه السيارة كعميل جديد</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/20 text-xs font-mono">↵ Enter</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Shortcut Instructions */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong className="text-white">Tab / السهم:</strong> للتبديل بين الرقم والفاصل</span>
            <span>&bull;</span>
            <span><strong className="text-white">Enter:</strong> اختيار وتأكيد</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white transition"
          >
            إلغاء [Esc]
          </button>
        </div>
      </div>
    </div>
  );
}
