import React, { useRef } from 'react';

const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

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

  // Official Yemeni Plate Types
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

  // Extract clean digits for strict paired column layout
  const cleanNumber = String(plateNumber || '').replace(/\D/g, '');
  const cleanDivider = String(plateDivider || '').replace(/\D/g, '');

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

      {/* ─── 2. AUTHENTIC YEMENI PLATE REPLICA (PERFECT COLUMN ALIGNMENT) ─── */}
      <div
        className={`yemen-plate-container w-full rounded-2xl overflow-hidden border-2 border-slate-950 shadow-2xl transition-colors duration-200 select-none ${currentMeta.bg} text-slate-950`}
        style={{
          boxShadow: '0 8px 22px -3px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
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
        <div className="grid grid-cols-12 min-h-[110px] items-stretch text-slate-950">
          
          {/* ─── RIGHT SIDE (يمين النموذج): رقم اللوحة الرئيسي ─── */}
          <div
            className={`col-span-8 sm:col-span-9 flex flex-col items-center justify-center p-3 border-l-2 border-slate-950 relative group transition-colors ${
              editable ? 'cursor-text hover:bg-black/5 focus-within:bg-black/5' : ''
            }`}
            onClick={() => editable && numberInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1.5 right-3 pointer-events-none select-none">
              رقم اللوحة
            </span>

            {/* Paired Columns: Each Arabic digit directly above its English counterpart */}
            <div
              dir="ltr"
              className="flex items-center justify-center gap-3 sm:gap-5.5 pointer-events-none select-none z-0 py-1"
            >
              {numberPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center min-w-[26px] sm:min-w-[32px]"
                >
                  {/* Top: Arabic Digit (Amiri-Bold) */}
                  <span className="arabic-plate-number text-3xl sm:text-4xl font-black leading-none text-slate-950 text-center">
                    {pair.ar}
                  </span>
                  {/* Bottom: English Digit (Oswald-Bold) */}
                  <span className="english-plate-number text-2xl sm:text-3xl font-black leading-none text-slate-950 text-center mt-2.5">
                    {pair.en}
                  </span>
                </div>
              ))}
            </div>

            {/* Direct Input Field Overlay (Captures all keyboard & Numpad strokes) */}
            {editable && (
              <input
                ref={numberInputRef}
                dir="ltr"
                type="text"
                tabIndex={numberTabIndex}
                value={cleanNumber}
                maxLength={6}
                placeholder="رقم اللوحة"
                onChange={handleNumberChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                autoComplete="off"
              />
            )}
          </div>

          {/* ─── LEFT SIDE (شمال النموذج): رقم الفاصل ─── */}
          <div
            className={`col-span-4 sm:col-span-3 flex flex-col items-center justify-center p-3 relative group transition-colors ${
              editable ? 'cursor-text hover:bg-black/5 focus-within:bg-black/5' : ''
            }`}
            onClick={() => editable && dividerInputRef.current?.focus()}
          >
            <span className="text-[9px] font-bold text-slate-900/60 absolute top-1.5 right-2.5 pointer-events-none select-none">
              الفاصل
            </span>

            {/* Paired Columns for Divider */}
            <div
              dir="ltr"
              className="flex items-center justify-center gap-2 sm:gap-3 pointer-events-none select-none z-0 py-1"
            >
              {dividerPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center min-w-[22px] sm:min-w-[26px]"
                >
                  {/* Top: Arabic Divider Digit (Amiri-Bold) */}
                  <span className="arabic-plate-number text-2xl sm:text-3xl font-black leading-none text-slate-950 text-center">
                    {pair.ar}
                  </span>
                  {/* Bottom: English Divider Digit (Oswald-Bold) */}
                  <span className="english-plate-number text-xl sm:text-2xl font-black leading-none text-slate-950 text-center mt-2.5">
                    {pair.en}
                  </span>
                </div>
              ))}
            </div>

            {/* Direct Input Field Overlay for Divider */}
            {editable && (
              <input
                ref={dividerInputRef}
                dir="ltr"
                type="text"
                tabIndex={dividerTabIndex}
                value={cleanDivider}
                maxLength={2}
                placeholder="1"
                onChange={handleDividerChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                autoComplete="off"
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
