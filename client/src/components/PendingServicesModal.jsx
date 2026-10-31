import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Car,
  Check,
  CheckCircle,
  Clock,
  ShieldCheck,
  Send,
  MessageSquare,
  Printer,
  Sparkles,
  AlertTriangle,
  Wrench,
  Gauge,
  Tag,
  Phone,
  Droplets,
  RefreshCw,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

const DEFAULT_SAFETY_POINTS = {
  radiator: true,
  brake: true,
  washer: true,
  tires: true,
  air_filter: true,
  cabin_filter: true,
  leaks: true,
  battery: true,
};

const SAFETY_POINT_LABELS = [
  { id: 'radiator', label: '💧 ماء الرديتر', desc: 'مستوى ولون السائل' },
  { id: 'brake', label: '🛑 زيت الفرامل', desc: 'مستوى وجودة الزيت' },
  { id: 'tires', label: '🛞 ضغط الإطارات', desc: 'ضبط الهواء والبلف' },
  { id: 'air_filter', label: '💨 فلتر الهواء', desc: 'فحص وتنظيف الفلتر' },
  { id: 'cabin_filter', label: '❄️ فلتر المكيف', desc: 'فحص النظافة والتدفق' },
  { id: 'leaks', label: '🔍 فحص التهريب', desc: 'خلو الصرة والفلتر' },
  { id: 'battery', label: '🔋 فحص البطارية', desc: 'سلامة الأقطاب والشحن' },
  { id: 'washer', label: '🚿 ماء المساحات', desc: 'تعبئة وفحص الرشاش' },
];

export default function PendingServicesModal({
  isOpen,
  onClose,
  workers = [],
  initialInvoiceId = null,
  onServiceCompleted,
}) {
  const [pendingServices, setPendingServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [safetyPoints, setSafetyPoints] = useState(DEFAULT_SAFETY_POINTS);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [now, setNow] = useState(Date.now());

  const settings = getShopSettings();

  // Keep now updated every 30 seconds for elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices/pending-services');
      const data = await res.json();
      if (data.success) {
        setPendingServices(data.data || []);
        if (data.data.length > 0) {
          if (initialInvoiceId) {
            const found = data.data.find((i) => i.id === initialInvoiceId);
            if (found) {
              handleSelectInvoice(found);
              return;
            }
          }
          if (!selectedInvoice || !data.data.some((i) => i.id === selectedInvoice.id)) {
            handleSelectInvoice(data.data[0]);
          }
        } else {
          setSelectedInvoice(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPending();
    }
  }, [isOpen]);

  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setSafetyPoints(inv.safety_points || DEFAULT_SAFETY_POINTS);
    setNotes(inv.notes || '');
  };

  const getElapsedTimeText = (createdAt) => {
    if (!createdAt) return 'الآن';
    const created = new Date(createdAt).getTime();
    const diffMins = Math.max(0, Math.floor((now - created) / 60000));
    if (diffMins === 0) return 'منذ دقيقة واحدة';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة ⏱️`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `منذ ${hours} س و ${mins} د`;
  };

  const toggleSafetyPoint = (pointId) => {
    setSafetyPoints((prev) => ({
      ...prev,
      [pointId]: !prev[pointId],
    }));
  };

  const handleCompleteService = async (quickAllPass = false) => {
    if (!selectedInvoice) return;

    try {
      setSubmitting(true);
      const pointsToSave = quickAllPass ? DEFAULT_SAFETY_POINTS : safetyPoints;

      const res = await fetch(`/api/invoices/${selectedInvoice.id}/complete-service`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: null,
          safety_points: pointsToSave,
          inspection_notes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل في اعتماد الخدمة والفحص');

      const updatedInv = data.data;

      // Build WhatsApp message
      const items = updatedInv.items || selectedInvoice.items || [];
      const oilItems = items.filter(
        (i) => i.item_type === 'product' && (i.description?.includes('زيت') || i.product_category === 'oil')
      );
      const filterItems = items.filter(
        (i) => i.item_type === 'product' && (i.description?.includes('فلتر') || i.product_category === 'filter')
      );

      const oilText = oilItems.length > 0 ? oilItems.map((o) => `${o.description} (×${o.qty})`).join(' + ') : '---';
      const filterText = filterItems.length > 0 ? filterItems.map((f) => f.description).join(' + ') : 'بدون استبدال فلتر';

      const failedPoints = Object.entries(pointsToSave)
        .filter(([_, pass]) => !pass)
        .map(([id]) => SAFETY_POINT_LABELS.find((l) => l.id === id)?.label)
        .filter(Boolean);

      const safetyReportText =
        failedPoints.length === 0
          ? '✅ تم إجراء الفحص المجاني لـ 8 نقاط (ماء الرديتر، زيت الفرامل، ضغط الإطارات، الفلاتر، خلو السيارة من التهريب سليمة 100% 🛡️).'
          : `⚠️ فحص السلامة (8 نقاط): تنبيه لملاحظات (${failedPoints.join('، ')}) وبقية النقاط سليمة.`;

      const msg = `مرحباً بك أستاذ ${updatedInv.customer_name || selectedInvoice.customer_name} في مركز ${settings.shopName} 🚗✨
تمت خدمة سيارتك بنجاح وأصبحت جاهزة للاستلام:
🔹 نوع السيارة: ${updatedInv.car_make_model || selectedInvoice.car_make_model} (لوحة: ${updatedInv.plate_number && !updatedInv.plate_number.startsWith('بدون') ? updatedInv.plate_number : 'بدون لوحة'}).
🔹 الفاتورة رقم: ${updatedInv.invoice_number}.
🔹 الزيت المستخدم: ${oilText}.
🔹 الفلتر: ${filterText}.
🔹 قراءة العداد الحالية: ${Number(updatedInv.current_odometer).toLocaleString()} كم.
🔹 الموعد المقترح للتغيير القادم: ${Number(updatedInv.next_odometer).toLocaleString()} كم أو بتاريخ ${updatedInv.next_service_date}.
🛡️ تقرير فحص السلامة المجاني:
${safetyReportText}
💰 الإجمالي: ${Number(updatedInv.net_total).toLocaleString()} ر.ي.
شاكرين ثقتكم الغالية ويسعدنا دائماً خدمتكم بكل اهتمام!`;

      const phoneToUse = updatedInv.customer_phone || selectedInvoice.customer_phone;
      if (phoneToUse && phoneToUse !== '---') {
        const whatsappUrl = formatYemeniWhatsAppLink(phoneToUse, msg);
        window.open(whatsappUrl, '_blank');
      }

      setSuccessToast(`تم إتمام الفاتورة ${updatedInv.invoice_number} بنجاح وإرسال التقرير للعميل 📲`);
      setTimeout(() => setSuccessToast(''), 4000);

      if (onServiceCompleted) onServiceCompleted();
      fetchPending();
    } catch (err) {
      setErrorToast(err.message || 'حدث خطأ أثناء حفظ الفحص');
      setTimeout(() => setErrorToast(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSticker = () => {
    if (!selectedInvoice) return;
    const stickerWindow = window.open('', '_blank', 'width=380,height=450');
    if (!stickerWindow) return;

    stickerWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>ملصق غيار الزيت - ${selectedInvoice.plate_number}</title>
          <style>
            @page { size: 60mm 40mm; margin: 2mm; }
            body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; text-align: center; margin: 0; padding: 4px; font-size: 11px; }
            .border-box { border: 2px dashed #000; border-radius: 8px; padding: 6px; }
            .title { font-weight: 900; font-size: 13px; margin-bottom: 4px; }
            .grid { display: flex; justify-content: space-between; margin: 3px 0; font-weight: bold; }
            .highlight { font-size: 14px; font-weight: 900; background: #eee; padding: 2px 4px; border-radius: 4px; }
            .footer { font-size: 9px; margin-top: 4px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="border-box">
            <div class="title">🚗 ${settings.shopName} - موعد غيار الزيت</div>
            <div class="grid">
              <span>رقم اللوحة:</span>
              <span>${selectedInvoice.plate_number || 'بدون لوحة'}</span>
            </div>
            <div class="grid">
              <span>العداد الحالي:</span>
              <span>${Number(selectedInvoice.current_odometer).toLocaleString()} كم</span>
            </div>
            <div class="grid" style="margin: 6px 0;">
              <span>العداد القادم:</span>
              <span class="highlight">${Number(selectedInvoice.next_odometer).toLocaleString()} كم</span>
            </div>
            <div class="grid">
              <span>تاريخ الغيار القادم:</span>
              <span>${selectedInvoice.next_service_date}</span>
            </div>
            <div class="footer">شكراً لزيارتكم • هاتف: ${settings.phone || '---'}</div>
          </div>
        </body>
      </html>
    `);
    stickerWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col apple-glass rounded-3xl border border-white/15 shadow-2xl overflow-hidden bg-slate-950/90 text-white">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">سيارات قيد الخدمة حالياً</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/30">
                  {pendingServices.length} في الحفرة ⏳
                </span>
              </div>
              <p className="text-xs text-slate-400">
                متابعة السيارات الجاري صيانتها — حدد الفني واعتمد فحص السلامة وأرسل تقرير الواتساب بعد خروج السيارة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPending}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorToast && (
          <div className="bg-rose-500/20 border-b border-rose-500/30 px-4 py-2.5 text-xs font-bold text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Cars list in bay (5 cols) */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-l border-white/10 flex flex-col min-h-0 bg-slate-900/40">
            <div className="p-3 border-b border-white/10 text-xs font-black text-slate-400 flex items-center justify-between">
              <span>السيارات المسجلة بالحفرة:</span>
              <span className="text-[11px] text-slate-500 font-mono">اضغط لاختيار السيارة</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {loading && pendingServices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل السيارات قيد الخدمة...</div>
              ) : pendingServices.length === 0 ? (
                <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div className="font-black text-sm text-white">لا توجد سيارات قيد الخدمة حالياً</div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    جميع سيارات غيار الزيت تم إتمام فحصها وتسليمها وإرسال تقاريرها للعملاء.
                  </p>
                </div>
              ) : (
                pendingServices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  const isLate = Math.floor((now - new Date(inv.created_at).getTime()) / 60000) >= 20;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className={`p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-400/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/50'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">
                              {inv.plate_number && !inv.plate_number.startsWith('بدون')
                                ? inv.plate_number
                                : '🚗 (بدون لوحة)'}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                              {inv.car_make_model}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 font-bold mt-1">
                            {inv.customer_name} &bull;{' '}
                            <span className="font-mono text-slate-400">{inv.customer_phone}</span>
                          </div>
                        </div>

                        <div
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isLate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{getElapsedTimeText(inv.created_at)}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-amber-400 font-bold">
                          {inv.invoice_number}
                        </span>
                        <span className="text-emerald-400 font-bold font-mono">
                          {Number(inv.net_total).toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Car Service Completion Pane (7 cols) */}
          <div className="md:col-span-7 flex flex-col min-h-0 bg-slate-950/60">
            {selectedInvoice ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Active Vehicle Info Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-white">
                          {selectedInvoice.plate_number && !selectedInvoice.plate_number.startsWith('بدون')
                            ? selectedInvoice.plate_number
                            : '🚗 (بدون لوحة)'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                          {selectedInvoice.car_make_model}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        العميل: <strong className="text-white">{selectedInvoice.customer_name}</strong> &bull;{' '}
                        <span className="font-mono text-slate-400">{selectedInvoice.customer_phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="text-[11px] text-slate-400">العداد القادم:</div>
                    <div className="text-sm font-black text-teal-400">
                      {Number(selectedInvoice.next_odometer).toLocaleString()} كم
                    </div>
                  </div>
                </div>

                {/* Free Safety Inspection (8 Points - Default All Green / One click toggle) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>فحص السلامة المجاني المعتمد (8 نقاط):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSafetyPoints(DEFAULT_SAFETY_POINTS)}
                      className="text-[11px] text-teal-300 hover:text-teal-200 font-bold underline"
                    >
                      تفعيل الكل سليم 100%
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SAFETY_POINT_LABELS.map((pt) => {
                      const isChecked = safetyPoints[pt.id];
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => toggleSafetyPoint(pt.id)}
                          className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between min-h-[58px] active:scale-95 ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black truncate">{pt.label}</span>
                            {isChecked ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] font-black text-rose-400">⚠️ ملاحظة</span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">{pt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Primary Completion Button */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleCompleteService(false)}
                      className="min-h-[50px] px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <Send className="w-4 h-4 stroke-[2.5]" />
                      <span>{submitting ? 'جاري الاعتماد...' : 'اعتماد الفحص وإرسال واتساب للعميل 📲'}</span>
                    </button>

                    {/* Quick 100% Clean Pass Button */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleCompleteService(true)}
                      className="min-h-[50px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-teal-500/40 text-teal-300 font-black text-xs flex items-center justify-center gap-2 transition active:scale-95"
                      title="اعتماد مباشر أن الفحص 100% سليم وإرسال الواتساب فوراً"
                    >
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <span>⚡ إنجاز سليم 100% وإرسال واتساب</span>
                    </button>
                  </div>

                  {/* Secondary Print Sticker Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handlePrintSticker}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>🏷️ طباعة استكر الزجاج الحراري للسيارة</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Car className="w-12 h-12 stroke-[1.2] mb-2 opacity-40" />
                <p className="text-sm font-semibold">اختر سيارة من القائمة لعرض تفاصيل الفحص</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
