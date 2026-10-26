import React from 'react';

// Helper to convert Western/English digits to Eastern Arabic digits (٠-٩)
export const toEasternArabicDigits = (val) => {
  if (!val && val !== 0) return '';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(val).replace(/[0-9]/g, (d) => easternDigits[parseInt(d, 10)]);
};

export default function YemeniPlateWidget({
  plateNumber = '',
  plateDivider = '1',
  plateType = 'خصوصي',
  onChange = null,
  editable = true,
  className = '',
}) {
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

  const dividerAr = toEasternArabicDigits(plateDivider) || '١';
  const dividerEn = plateDivider || '1';
  const numberAr = toEasternArabicDigits(plateNumber) || '—';
  const numberEn = plateNumber || '—';

  return (
    <div className={`space-y-3 ${className}`}>
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition select-none ${
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

      {/* ─── 2. AUTHENTIC YEMENI PLATE REPLICA (CLEAN: NO CHIP, NO SCREWS) ─── */}
      <div
        className={`w-full rounded-xl overflow-hidden border-2 border-slate-950 shadow-xl transition-colors duration-200 select-none ${currentMeta.bg} text-slate-950`}
        style={{
          boxShadow: '0 6px 16px -2px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Top Header Strip: "اليمن ــ خصوصي" */}
        <div className="py-1 px-4 text-center border-b-2 border-slate-950">
          <h4 className="text-sm sm:text-base font-black tracking-wider leading-snug">
            اليمن ــ {plateType}
          </h4>
        </div>

        {/* Bottom Section: Left (Divider) | Right (Plate Number) */}
        <div className="grid grid-cols-12 min-h-[76px] items-stretch">
          {/* Left Compartment: الفاصل (Arabic top, English bottom) */}
          <div className="col-span-3 border-l-2 border-slate-950 flex flex-col items-center justify-center p-1.5">
            <span
              className="font-bold text-xl sm:text-2xl leading-none"
              style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
            >
              {dividerAr}
            </span>
            <span
              className="font-black text-base sm:text-lg leading-none mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {dividerEn}
            </span>
          </div>

          {/* Right Compartment: Plate Number (Centered across full width, clean & prominent) */}
          <div className="col-span-9 flex flex-col items-center justify-center py-1.5 px-3">
            <span
              className="font-bold text-2xl sm:text-3xl leading-none tracking-widest"
              style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
            >
              {numberAr}
            </span>
            <span
              className="font-black text-xl sm:text-2xl leading-none tracking-widest mt-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {numberEn}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. RAPID KEYBOARD & NUMPAD INPUTS ─── */}
      {editable && (
        <div className="grid grid-cols-12 gap-2.5 items-center pt-0.5">
          <div className="col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              الفاصل (1 أو 2 أو 9...)
            </label>
            <input
              type="text"
              tabIndex={8}
              value={plateDivider}
              maxLength={2}
              onChange={handleDividerChange}
              placeholder="1"
              className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-amber-400 font-mono font-black text-base rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="col-span-8">
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              رقم اللوحة (أرقام الكيبورد / Numpad)
            </label>
            <input
              type="text"
              tabIndex={9}
              value={plateNumber}
              maxLength={7}
              onChange={handleNumberChange}
              placeholder="مثال: 2008 أو 45892"
              className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-white font-mono font-black text-lg rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 tracking-wider"
            />
          </div>
        </div>
      )}
    </div>
  );
}
