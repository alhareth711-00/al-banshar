import React, { useState, useEffect, useRef } from 'react';
import { Car, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';
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
  const [plateDivider, setPlateDivider] = useState(''); // غير محدد افتراضياً (Unset / Auto)
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
      setPlateDivider(''); // إعادة تعيين الفاصل ليكون غير محدد
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
      setPlateDivider('');
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
            return vNum === cleanNumber || vNum.endsWith(cleanNumber);
          });

          const primary = exactMatch || data.data[0];
          setSearchResults(data.data);
          setMatchedVehicle(primary);

          // Smart Auto-Detection: morph plate color & type to the matched vehicle's type
          if (primary) {
            if (primary.plate_type) {
              setDetectedType(primary.plate_type);
            }
            // Auto-detect divider from DB column or parse from plate_number (e.g. "2-98765")
            let autoDivider = '';
            if (primary.plate_divider) {
              autoDivider = String(primary.plate_divider);
            } else if (primary.plate_number && primary.plate_number.includes('-')) {
              const parts = primary.plate_number.split('-');
              if (parts[0] && /^\d+$/.test(parts[0].trim())) {
                autoDivider = parts[0].trim();
              }
            }
            if (autoDivider) {
              setPlateDivider(autoDivider);
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
      : [{ en: '—', ar: '—' }];

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
            <span
              className="text-xl sm:text-2xl font-black text-slate-950 inline-block origin-right"
              style={{ transform: 'scaleX(2.2)', letterSpacing: '0.08em' }}
            >
              اليــــمــــن
            </span>

            <div className="flex items-center gap-2">
              {detectedType ? (
                <span
                  className="text-xl sm:text-2xl font-black text-slate-950 inline-block origin-left animate-in fade-in"
                  style={{ transform: 'scaleX(2.2)', letterSpacing: '0.08em' }}
                >
                  {detectedType === 'نقل' ? 'نـــــقـــــل' : detectedType === 'أجرة' ? 'أجـــــرة' : detectedType === 'خصوصي' ? 'خــصــوصــي' : detectedType}
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

            {/* LEFT SIDE: Divider (غير محدد افتراضياً / يكتشف تلقائياً) */}
            <div
              className="w-[22%] flex flex-col items-center justify-center px-1.5 py-2.5 relative group cursor-text hover:bg-black/5 focus-within:bg-black/5"
              onClick={() => dividerInputRef.current?.focus()}
            >
              <span className="text-[9px] font-bold text-slate-900/60 absolute top-1 right-1.5 pointer-events-none select-none">
                {cleanDivider ? 'الفاصل' : 'الفاصل (تلقائي)'}
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
                    <span className={`arabic-plate-number text-2xl sm:text-3xl font-black leading-none text-center ${
                      cleanDivider ? 'text-slate-950' : 'text-slate-400/90'
                    }`}>
                      {pair.ar}
                    </span>
                    <span className={`english-plate-number text-xl sm:text-2xl font-black leading-none text-center mt-2 ${
                      cleanDivider ? 'text-slate-950' : 'text-slate-400/90'
                    }`}>
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
                placeholder="—"
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
            {/* Multi-match pills if identical or similar numbers match across different dividers/types */}
            {searchResults.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[11px] font-bold text-amber-300">تطابقات متعددة:</span>
                {searchResults.map((v) => {
                  const isSelected = matchedVehicle && matchedVehicle.id === v.id;
                  const vDiv = v.plate_divider || (v.plate_number && v.plate_number.includes('-') ? v.plate_number.split('-')[0] : '');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setMatchedVehicle(v);
                        if (v.plate_type) setDetectedType(v.plate_type);
                        if (vDiv) setPlateDivider(String(vDiv));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                          : 'bg-slate-800 text-slate-300 border-white/10 hover:border-white/30'
                      }`}
                    >
                      فاصل {vDiv || '1'} ({v.plate_type || 'خصوصي'} - {v.car_make_model})
                    </button>
                  );
                })}
              </div>
            )}

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
                  {/* VIP Customer Card (20px Typography & Arranged Layout) */}
                  <div className="bg-[#0b1220] p-3.5 rounded-2xl border-2 border-cyan-500/50 flex flex-col justify-between shadow-xl shadow-cyan-950/50 min-h-[96px]">
                    {/* Customer Name Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 flex items-center justify-center text-sm font-black shrink-0 shadow-inner">
                        👤
                      </div>
                      <div className="font-black text-white text-[20px] leading-tight truncate tracking-tight" title={matchedVehicle.customer_name}>
                        {matchedVehicle.customer_name}
                      </div>
                    </div>

                    {/* Prominent Phone Number Badge */}
                    <div className="mt-2.5 flex items-center justify-center gap-2 bg-[#070b14] px-3 py-1.5 rounded-xl border border-cyan-500/30">
                      <span className="text-cyan-400 text-base">📱</span>
                      <span className="font-mono text-cyan-300 text-[20px] font-black tracking-widest">
                        {matchedVehicle.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>

                  {/* Car & Approved Oil Card (Model 1 Enlarged) */}
                  <div className="bg-[#0b1220] p-3 rounded-xl border-2 border-cyan-500/50 flex flex-col justify-between shadow-lg shadow-cyan-950/50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center text-sm shrink-0">
                        🚗
                      </div>
                      <div className="font-black text-white text-lg leading-tight truncate" title={matchedVehicle.car_make_model}>
                        {matchedVehicle.car_make_model || 'سيارة غير محددة'}
                      </div>
                    </div>
                    <div className="mt-2 flex items-stretch gap-1.5 w-full">
                      <div className="flex-1 flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-950/40 border border-amber-400/50 px-3 py-1.5 rounded-xl shadow-inner">
                        <span className="text-base">🛢️</span>
                        <span className="font-black text-amber-300 text-sm tracking-tight">{matchedVehicle.preferred_oil_brand || 'تويوتا'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#070b14] border border-cyan-400/50 px-3 py-1.5 rounded-xl shadow-inner">
                        <span className="text-[11px] font-bold text-cyan-400">اللزوجة:</span>
                        <span className="font-mono text-cyan-300 font-black text-base tracking-wider">{matchedVehicle.preferred_viscosity || '20W-50'}</span>
                      </div>
                    </div>
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
                  <span>اللوحة ({cleanDivider ? `${cleanDivider}-` : ''}{cleanNumber}) غير مسجلة مسبقاً — هل تود تسجيلها كعميل جديد؟</span>
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
