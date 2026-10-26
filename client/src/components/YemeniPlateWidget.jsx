import React, { useState, useRef } from 'react';

// Helper to convert Western/English digits to Eastern Arabic digits with customizable spacing
export const toSpacedEasternDigits = (val, spaceCount = 1) => {
  if (!val && val !== 0) return '—';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const spaces = ' '.repeat(spaceCount);
  return String(val)
    .replace(/[0-9]/g, (d) => easternDigits[parseInt(d, 10)])
    .split('')
    .join(spaces);
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

  // 3 Interactive Typography & Spacing Models
  // 1 = Balanced (0.28em), 2 = Spacious Wide (0.42em - Recommended), 3 = Chiseled Heavy (0.35em)
  const [activeModel, setActiveModel] = useState(() => {
    return localStorage.getItem('al_banshar_plate_model') || '2';
  });

  const handleModelSelect = (m) => {
    setActiveModel(m);
    localStorage.setItem('al_banshar_plate_model', m);
  };

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

  // Model-specific typography calibrations
  const spaceCount = activeModel === '1' ? 1 : 2;
  const letterSpacingStyle =
    activeModel === '1' ? '0.28em' : activeModel === '2' ? '0.42em' : '0.36em';

  const arabicNumFontSize =
    activeModel === '1'
      ? 'text-3xl font-black'
      : activeModel === '2'
      ? 'text-3xl sm:text-4xl font-black'
      : 'text-4xl sm:text-5xl font-black';

  const latinNumFontSize =
    activeModel === '1'
      ? 'text-2xl font-black'
      : activeModel === '2'
      ? 'text-2xl sm:text-3xl font-black'
      : 'text-3xl sm:text-4xl font-black';

  const dividerAr = toSpacedEasternDigits(plateDivider, 1) || '١';
  const dividerEn = plateDivider || '1';
  const numberAr = toSpacedEasternDigits(plateNumber, spaceCount);
  const numberEn = plateNumber || '';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ─── 1. TOP CONTROLS: TYPE SELECTOR & 3-MODEL SWITCHER ─── */}
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          {/* Plate Types */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 ml-1">النوع:</span>
            {plateTypes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTypeSelect(p.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition select-none ${
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

          {/* 3 Interactive Model Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] font-bold text-amber-400 px-1">النموذج:</span>
            <button
              type="button"
              onClick={() => handleModelSelect('1')}
              title="نموذج 1: موزون قياسي (0.28em)"
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                activeModel === '1'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. موزون ⚖️
            </button>
            <button
              type="button"
              onClick={() => handleModelSelect('2')}
              title="نموذج 2: فسيح واسع (0.42em - موصى به)"
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                activeModel === '2'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. فسيح واسع 🌟
            </button>
            <button
              type="button"
              onClick={() => handleModelSelect('3')}
              title="نموذج 3: تكتيكي عريض (0.36em خط كبير)"
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                activeModel === '3'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. تكتيكي ⚡
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. AUTHENTIC YEMENI PLATE REPLICA WITH DIRECT IN-PLATE INPUT ─── */}
      <div
        className={`w-full rounded-2xl overflow-hidden border-2 border-slate-950 shadow-2xl transition-colors duration-200 select-none ${currentMeta.bg} text-slate-950`}
        style={{
          boxShadow: '0 8px 20px -3px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Top Header Strip: اليمن أقصى اليمين | نوع اللوحة أقصى الشمال بحجم كبير يملأ المكان */}
        <div className="py-2 px-6 flex items-center justify-between border-b-2 border-slate-950 bg-black/5">
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
        <div className="grid grid-cols-12 min-h-[105px] items-stretch text-slate-950">
          
          {/* ─── RIGHT SIDE (يمين النموذج): رقم اللوحة الرئيسي ─── */}
          <div
            className={`col-span-8 sm:col-span-9 flex flex-col items-center justify-center p-3 border-l-2 border-slate-950 relative group ${
              editable ? 'cursor-text hover:bg-black/5 transition' : ''
            }`}
            onClick={() => editable && numberInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1 right-3 pointer-events-none select-none">
              رقم اللوحة
            </span>

            {/* Eastern Arabic Numerals (Auto-rendered with model spacing) */}
            <div
              className={`${arabicNumFontSize} leading-none text-slate-950 pointer-events-none select-none`}
              style={{
                fontFamily: "'Amiri', 'Tajawal', serif",
                letterSpacing: letterSpacingStyle,
                textIndent: letterSpacingStyle,
              }}
            >
              {numberAr}
            </div>

            {/* Direct Input Field Inside Plate (Keyboard & Numpad) */}
            {editable ? (
              <input
                ref={numberInputRef}
                type="text"
                tabIndex={numberTabIndex}
                value={plateNumber}
                maxLength={6}
                placeholder="1100"
                onChange={handleNumberChange}
                className={`w-full bg-transparent border-0 text-center font-mono ${latinNumFontSize} text-slate-950 leading-none mt-2 focus:outline-none focus:ring-0 placeholder-slate-950/25`}
                style={{
                  letterSpacing: letterSpacingStyle,
                  textIndent: letterSpacingStyle,
                }}
              />
            ) : (
              <div
                className={`font-mono ${latinNumFontSize} text-slate-950 leading-none mt-2`}
                style={{
                  letterSpacing: letterSpacingStyle,
                  textIndent: letterSpacingStyle,
                }}
              >
                {numberEn || '—'}
              </div>
            )}
          </div>

          {/* ─── LEFT SIDE (شمال النموذج): رقم الفاصل ─── */}
          <div
            className={`col-span-4 sm:col-span-3 flex flex-col items-center justify-center p-2.5 relative group ${
              editable ? 'cursor-text hover:bg-black/5 transition' : ''
            }`}
            onClick={() => editable && dividerInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1 right-2 pointer-events-none select-none">
              الفاصل
            </span>

            <div
              className={`w-full py-1 flex flex-col items-center justify-center ${
                activeModel === '3' ? 'rounded-xl bg-black/5 border border-black/10' : ''
              }`}
            >
              {/* Eastern Arabic Numeral (Auto-rendered) */}
              <div
                className="text-2xl sm:text-3xl font-black leading-none text-slate-950 pointer-events-none select-none"
                style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
              >
                {dividerAr}
              </div>

              {/* Direct Input Field Inside Plate (Keyboard & Numpad) */}
              {editable ? (
                <input
                  ref={dividerInputRef}
                  type="text"
                  tabIndex={dividerTabIndex}
                  value={plateDivider}
                  maxLength={2}
                  placeholder="1"
                  onChange={handleDividerChange}
                  className="w-full bg-transparent border-0 text-center font-mono font-black text-xl sm:text-2xl text-slate-950 leading-none mt-1.5 focus:outline-none focus:ring-0 placeholder-slate-950/25"
                />
              ) : (
                <div className="font-mono font-black text-xl sm:text-2xl text-slate-950 leading-none mt-1.5">
                  {dividerEn}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
