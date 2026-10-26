import React, { useRef } from 'react';

// Helper to convert Western/English digits to an array of Eastern Arabic digits
export const toEasternArabicDigitsArray = (val) => {
  if (!val && val !== 0) return ['—'];
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(val)
    .replace(/[0-9]/g, (d) => easternDigits[parseInt(d, 10)])
    .split('');
};

export default function YemeniPlateWidget({
  plateNumber = '',
  plateDivider = '1',
  plateType = 'خصوصي',
  onChange = null,
  editable = true,
  className = '',
  numberTabIndex = 8,
  dividerTabIndex = 9,
}) {
  const numberInputRef = useRef(null);
  const dividerInputRef = useRef(null);

  // Official Yemeni Plate Types (All with black text and black line borders, no RFID chip, no screw holes)
  const plateTypes = [
    { id: 'خصوصي', label: 'خصوصي', bg: 'bg-sky-400', border: 'border-sky-600', activeHex: '#38bdf8' },
    { id: 'نقل', label: 'نقل', bg: 'bg-red-500', border: 'border-red-700', activeHex: '#ef4444' },
    { id: 'أجرة', label: 'أجرة', bg: 'bg-amber-400', border: 'border-amber-600', activeHex: '#facc15' },
    { id: 'مؤقت', label: 'مؤقت', bg: 'bg-white', border: 'border-slate-400', activeHex: '#ffffff' },
  ];

  const currentMeta = plateTypes.find((p) => p.id === plateType) || plateTypes[0];

  const handleTypeSelect = (typeId) => {
    if (onChange) {
      onChange({
        plate_number: plateNumber,
        plate_divider: plateDivider,
        plate_type: typeId,
      });
    }
  };

  const handleDividerChange = (e) => {
    if (onChange) {
      onChange({
        plate_number: plateNumber,
        plate_divider: e.target.value,
        plate_type: plateType,
      });
    }
  };

  const handleNumberChange = (e) => {
    if (onChange) {
      onChange({
        plate_number: e.target.value,
        plate_divider: plateDivider,
        plate_type: plateType,
      });
    }
  };

  // Convert digits into LTR ordered arrays to ensure no RTL bidi inversion happens
  const numberDigitsAr = toEasternArabicDigitsArray(plateNumber);
  const dividerDigitsAr = toEasternArabicDigitsArray(plateDivider);
  const numberEn = plateNumber || '';
  const dividerEn = plateDivider || '1';

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* ─── 1. TYPE SELECTOR PILLS (IF EDITABLE) ─── */}
      {editable && (
        <div className="flex items-center justify-between gap-1.5">
          <label className="text-[11px] font-bold text-slate-300">نوع ترخيص اللوحة:</label>
          <div className="flex items-center gap-1.5">
            {plateTypes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTypeSelect(p.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-black border transition select-none ${
                  p.bg
                } text-slate-950 ${
                  plateType === p.id
                    ? 'border-2 border-slate-950 shadow-md ring-2 ring-white/80 scale-105'
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── 2. AUTHENTIC YEMENI PLATE REPLICA (CORRECT LTR ORDER & SPACING) ─── */}
      <div
        className={`w-full rounded-2xl overflow-hidden border-2 border-slate-950 shadow-2xl transition-colors duration-200 select-none ${currentMeta.bg} text-slate-950`}
        style={{
          boxShadow: '0 8px 22px -3px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Top Header Strip: اليمن أقصى اليمين | نوع اللوحة أقصى الشمال بحجم كبير يملأ المكان */}
        <div className="py-2.5 px-6 flex items-center justify-between border-b-2 border-slate-950 bg-black/5">
          {/* أقصى اليمين: اليَمَن */}
          <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-wider">
            اليَمَن
          </span>

          {/* أقصى الشمال: نوع اللوحة (خصوصي / نقل / أجرة / مؤقت) */}
          <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-wider">
            {plateType}
          </span>
        </div>

        {/* Bottom Section:
             - اليمين (Right): رقم اللوحة الرئيسي (Wider compartment)
             - الشمال (Left): الفاصل (Narrower compartment)
        */}
        <div className="grid grid-cols-12 min-h-[110px] items-stretch text-slate-950">
          
          {/* ─── RIGHT SIDE (يمين النموذج): رقم اللوحة الرئيسي ─── */}
          <div
            className={`col-span-8 sm:col-span-9 flex flex-col items-center justify-center p-3 border-l-2 border-slate-950 relative group ${
              editable ? 'cursor-text hover:bg-black/5 transition' : ''
            }`}
            onClick={() => editable && numberInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1.5 right-3 pointer-events-none select-none">
              رقم اللوحة
            </span>

            {/* Eastern Arabic Numerals: Rendered in strict LTR flex order with gap to match English digits exactly */}
            <div
              dir="ltr"
              className="text-3xl sm:text-4xl font-black leading-none text-slate-950 pointer-events-none select-none flex items-center justify-center gap-3 sm:gap-4.5"
              style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
            >
              {numberDigitsAr.map((d, idx) => (
                <span key={idx} className="inline-block text-center min-w-[1ch]">
                  {d}
                </span>
              ))}
            </div>

            {/* Direct Input Field Inside Plate (Keyboard & Numpad) - Strict LTR alignment */}
            {editable ? (
              <input
                ref={numberInputRef}
                dir="ltr"
                type="text"
                tabIndex={numberTabIndex}
                value={plateNumber}
                maxLength={6}
                placeholder="1100"
                onChange={handleNumberChange}
                className="w-full bg-transparent border-0 text-center font-mono font-black text-2xl sm:text-3xl text-slate-950 leading-none mt-2 focus:outline-none focus:ring-0 placeholder-slate-950/25 selection:bg-slate-950/20"
                style={{
                  letterSpacing: '0.42em',
                  textIndent: '0.42em',
                }}
              />
            ) : (
              <div
                dir="ltr"
                className="font-mono font-black text-2xl sm:text-3xl text-slate-950 leading-none mt-2 text-center"
                style={{
                  letterSpacing: '0.42em',
                  textIndent: '0.42em',
                }}
              >
                {numberEn || '—'}
              </div>
            )}
          </div>

          {/* ─── LEFT SIDE (شمال النموذج): رقم الفاصل ─── */}
          <div
            className={`col-span-4 sm:col-span-3 flex flex-col items-center justify-center p-3 relative group ${
              editable ? 'cursor-text hover:bg-black/5 transition' : ''
            }`}
            onClick={() => editable && dividerInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1.5 right-2.5 pointer-events-none select-none">
              الفاصل
            </span>

            {/* Eastern Arabic Numeral for Divider: Strict LTR */}
            <div
              dir="ltr"
              className="text-2xl sm:text-3xl font-black leading-none text-slate-950 pointer-events-none select-none flex items-center justify-center gap-2"
              style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
            >
              {dividerDigitsAr.map((d, idx) => (
                <span key={idx} className="inline-block text-center min-w-[1ch]">
                  {d}
                </span>
              ))}
            </div>

            {/* Direct Input Field Inside Plate for Divider: Strict LTR */}
            {editable ? (
              <input
                ref={dividerInputRef}
                dir="ltr"
                type="text"
                tabIndex={dividerTabIndex}
                value={plateDivider}
                maxLength={2}
                placeholder="1"
                onChange={handleDividerChange}
                className="w-full bg-transparent border-0 text-center font-mono font-black text-xl sm:text-2xl text-slate-950 leading-none mt-2 focus:outline-none focus:ring-0 placeholder-slate-950/25 selection:bg-slate-950/20"
              />
            ) : (
              <div
                dir="ltr"
                className="font-mono font-black text-xl sm:text-2xl text-slate-950 leading-none mt-2 text-center"
              >
                {dividerEn}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
