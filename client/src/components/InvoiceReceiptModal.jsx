import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  MessageSquare,
  Printer,
  Plus,
  Car,
  Gauge,
  Calendar,
  Share2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Receipt,
  Phone,
  Store,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import { getLocalTodayDate } from '../utils/dateUtils';
import { printThermalReceiptSilently } from '../utils/thermalReceiptPrinter';

export default function InvoiceReceiptModal({ isOpen, onClose, invoice, onNewInvoice }) {
  const rawCustomerPhone = String(invoice?.customer_phone || '').trim();
  const hasValidPhone = Boolean(rawCustomerPhone && rawCustomerPhone !== '---' && rawCustomerPhone !== '000000000' && rawCustomerPhone.length >= 7);

  const [activeTab, setActiveTab] = useState(hasValidPhone ? 'pass' : 'thermal'); // 'pass' | 'thermal'
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  if (!isOpen || !invoice) return null;

  const settings = getShopSettings();
  const is58mm = (settings.receiptPaperSize === '58mm');

  // Extract Oil & Filter details for message and pass
  const items = invoice.items || [];
  const oilItems = items.filter(
    (i) => i.item_type === 'product' && (i.description.includes('زيت') || i.product_category === 'oil')
  );
  const filterItems = items.filter(
    (i) => i.item_type === 'product' && (i.description.includes('فلتر') || i.product_category === 'filter')
  );
  const otherItems = items.filter((i) => !oilItems.includes(i) && !filterItems.includes(i));

  // Build formatted strings
  const oilDetailsText =
    oilItems.length > 0 ? oilItems.map((o) => `${o.description} (×${o.qty})`).join(' + ') : '---';

  const filterDetailsText =
    filterItems.length > 0 ? filterItems.map((f) => f.description).join(' + ') : 'بدون استبدال فلتر';

  const paymentMethodLabel =
    {
      cash: 'نقداً (كاش)',
      jeeb: 'محفظة جيب',
      jawali: 'محفظة جوالي',
      kuraimi: 'حساب الكريمي',
      onecash: 'ون كاش',
      credit: 'آجل / جزئي',
      split: 'مجزأ',
    }[invoice.payment_method] || invoice.payment_method;

  // Build WhatsApp Message
  const hasSafetyInspection = invoice.safetyPoints && Object.values(invoice.safetyPoints).some(Boolean);
  const safetyNote = hasSafetyInspection
    ? '\n🔹 فحص السلامة: تم إجراء الفحص المجاني لـ 8 نقاط (ماء الرديتر، ضغط الإطارات، وزيت الفرامل سليمة ✅).'
    : '';

  const customerWhatsAppMessage = `مرحباً بك أستاذ ${invoice.customer_name} في مركز ${settings.shopName} 🚗
تمت خدمة سيارتك بنجاح:
🔹 نوع السيارة: ${invoice.car_make_model} (لوحة: ${invoice.plate_number}).
🔹 الزيت المستخدم: ${oilDetailsText}.
🔹 الفلتر: ${filterDetailsText}.
🔹 قراءة العداد الحالية: ${Number(invoice.current_odometer).toLocaleString()} كم.
🔹 الموعد المقترح للتغيير القادم: ${Number(invoice.next_odometer).toLocaleString()} كم أو بتاريخ ${invoice.next_service_date}.${safetyNote}
${Number(invoice.scrap_battery_deduction) > 0 ? `🔹 خصم بدل بطارية قديمة (سكراب): -${Number(invoice.scrap_battery_deduction).toLocaleString()} ر.ي\n` : ''}${Number(invoice.discount) > 0 ? `🔹 الخصم الممنوح: -${Number(invoice.discount).toLocaleString()} ر.ي\n` : ''}💰 الإجمالي: ${Number(invoice.net_total).toLocaleString()} ر.ي (طريقة الدفع: ${paymentMethodLabel}).
شكراً لثقتكم ويسعدنا دائماً خدمتكم بكل أهتمام.`;

  const whatsappUrl = formatYemeniWhatsAppLink(invoice.customer_phone, customerWhatsAppMessage);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customerWhatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (tabTarget) => {
    const target = tabTarget || activeTab;
    if (tabTarget) setActiveTab(tabTarget);
    if (target === 'thermal') {
      printThermalReceiptSilently(invoice);
    } else {
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      {/* Scoped CSS for Thermal Receipt (80mm / 58mm) & Windshield Sticker Printing */}
      <style>{`
        @media print {
          @page {
            size: ${is58mm ? '48mm 297mm' : '80mm 297mm'};
            margin: 0 !important;
          }
          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            direction: ltr !important;
            width: ${is58mm ? '48mm' : '80mm'} !important;
            max-width: ${is58mm ? '48mm' : '80mm'} !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is58mm ? '48mm' : '80mm'} !important;
            max-width: ${is58mm ? '48mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4px ${is58mm ? '1.5mm' : '2mm'} 12px ${is58mm ? '1.5mm' : '2mm'} !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            direction: rtl !important;
            text-align: right;
            box-sizing: border-box !important;
            font-size: ${is58mm && activeTab === 'thermal' ? '11px' : 'inherit'};
            line-height: ${is58mm && activeTab === 'thermal' ? '1.2' : 'inherit'};
          }
          .fixed, .overflow-hidden, .overflow-y-auto {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header & Tab Switcher */}
        <div className="px-5 py-3 border-b border-white/10 flex flex-col gap-2.5 bg-white/5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold text-sm text-white">إصدار الفاتورة وكروت الخدمة</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2 View Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('pass')}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'pass'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>كرت أبل وواتساب</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('thermal')}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'thermal'
                  ? 'bg-white/20 text-white shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فاتورة {is58mm ? '58mm' : '80mm'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: APPLE WALLET PASS */}
          {activeTab === 'pass' && (
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-white/15 shadow-2xl">
              <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-black tracking-widest opacity-80">
                    {settings.shopName}
                  </div>
                  <div className="text-lg font-black tracking-tight flex items-center gap-1.5 mt-0.5">
                    <Car className="w-5 h-5 stroke-[2.5]" />
                    <span>{invoice.car_make_model}</span>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <div className="px-3 py-1 rounded-xl bg-slate-950/20 backdrop-blur text-xs font-black border border-black/10">
                    {invoice.plate_number}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">العميل العزيز</div>
                    <div className="text-base font-extrabold text-white mt-0.5">{invoice.customer_name}</div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">رقم الفاتورة</div>
                    <div className="text-xs font-bold text-amber-300 mt-0.5">{invoice.invoice_number}</div>
                  </div>
                </div>

                {/* Odometer Display */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      <span>العداد الحالي</span>
                    </div>
                    <div className="text-lg font-mono font-black text-white mt-0.5">
                      {Number(invoice.current_odometer).toLocaleString()} <span className="text-[10px] font-sans text-slate-400">كم</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>التغيير القادم المقترح</span>
                    </div>
                    <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
                      {Number(invoice.next_odometer).toLocaleString()} <span className="text-[10px] font-sans text-slate-400">كم</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      تاريخ: {invoice.next_service_date}
                    </div>
                  </div>
                </div>

                {/* Oil & Filter Used */}
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold">الزيت المعتمد:</div>
                    <div className="font-extrabold text-white text-xs">{oilDetailsText}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold">الفلاتر والخدمات:</div>
                    <div className="font-extrabold text-slate-200 text-xs">
                      {filterDetailsText}
                      {otherItems.length > 0 && ` + ${otherItems.map((o) => o.description).join(' + ')}`}
                    </div>
                  </div>
                </div>

                {/* Safety Inspection Badge */}
                {hasSafetyInspection && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-bold text-[11px]">
                      تم إجراء فحص السلامة المجاني لـ 8 نقاط بنجاح (ماء الرديتر، ضغط الإطارات، وزيت الفرامل)
                    </span>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="flex justify-between items-center pt-1 border-t border-white/10">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">طريقة الدفع</div>
                    <div className="font-bold text-slate-200 text-xs mt-0.5">{paymentMethodLabel}</div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-[10px] text-slate-400 font-bold">إجمالي الفاتورة</div>
                    <div className="text-2xl font-black text-amber-400">
                      {Number(invoice.net_total).toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                    </div>
                  </div>
                </div>

                {Number(invoice.scrap_battery_deduction) > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex justify-between font-bold text-emerald-300 text-xs font-mono">
                    <span>خصم بدل بطارية قديمة (سكراب):</span>
                    <span>-{Number(invoice.scrap_battery_deduction).toLocaleString()} ر.ي</span>
                  </div>
                )}

                {invoice.remaining_debt > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex justify-between font-bold text-rose-300 text-xs font-mono">
                    <span>المتبقي آجل على العميل:</span>
                    <span>{Number(invoice.remaining_debt).toLocaleString()} ر.ي</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: THERMAL RECEIPT (80mm / 58mm) */}
          {activeTab === 'thermal' && (
            <div className={`printable-area bg-white text-slate-900 rounded-2xl font-mono shadow-2xl border border-slate-300 mx-auto ${
              is58mm ? 'p-3.5 max-w-[270px] text-[10.5px] leading-tight' : 'p-6 max-w-sm text-xs'
            }`}>
              {/* Thermal Shop Header */}
              <div className={`text-center border-b-2 border-dashed border-slate-400 ${is58mm ? 'pb-2' : 'pb-2.5'}`}>
                <h3 className={`font-black text-slate-950 font-sans ${is58mm ? 'text-sm' : 'text-base'}`}>{settings.shopName}</h3>
                <div className={`flex justify-between items-center text-slate-800 font-bold mt-1 px-1 ${is58mm ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                  <span>📍 {settings.address}</span>
                  <span>📞 {settings.shopPhone}</span>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className={`border-b border-dashed border-slate-300 space-y-1 ${is58mm ? 'py-1.5 text-[10px]' : 'py-2.5 text-[11px]'}`}>
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{invoice.created_at || new Date().toLocaleString('ar-YE')}</span>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-bold font-sans">{invoice.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>السيارة واللوحة:</span>
                  <span className="font-bold">{invoice.plate_number}</span>
                </div>
              </div>

              {/* Odometer Section */}
              <div className={`border-b border-dashed border-slate-300 grid grid-cols-2 gap-1.5 text-center bg-slate-100 rounded-lg my-2 ${
                is58mm ? 'py-1.5 px-1 text-[10px]' : 'py-2 p-2 text-[11px]'
              }`}>
                <div>
                  <div className="text-slate-500">العداد الحالي:</div>
                  <div className="font-black text-slate-900">{Number(invoice.current_odometer).toLocaleString()} كم</div>
                </div>
                <div>
                  <div className="text-slate-500">التغيير القادم:</div>
                  <div className="font-black text-slate-900">{Number(invoice.next_odometer).toLocaleString()} كم</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b-2 border-dashed border-slate-400">
                <table className={`w-full text-right ${is58mm ? 'text-[10px]' : 'text-[11px]'}`}>
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="pb-1">الصنف والخدمة</th>
                      <th className="pb-1 text-center">الكمية</th>
                      <th className="pb-1 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-sans">{it.description}</td>
                        <td className="py-1 text-center font-bold">{it.qty}</td>
                        <td className="py-1 text-left font-bold">{(it.qty * it.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className={`space-y-1 ${is58mm ? 'py-1.5 text-[11px]' : 'py-2.5 text-xs'}`}>
                <div className="flex justify-between">
                  <span>إجمالي القطع والزيوت:</span>
                  <span className="font-bold">{Number(invoice.items_total).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>إجمالي الخدمات:</span>
                  <span className="font-bold text-emerald-700">
                    {Number(invoice.labor_total || 0) > 0
                      ? `${Number(invoice.labor_total).toLocaleString()} ر.ي`
                      : '0 ر.ي (مجاناً)'}
                  </span>
                </div>
                {Number(invoice.scrap_battery_deduction) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>خصم بدل بطارية قديمة (سكراب):</span>
                    <span>-{Number(invoice.scrap_battery_deduction).toLocaleString()} ر.ي</span>
                  </div>
                )}
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم الممنوح:</span>
                    <span>-{Number(invoice.discount).toLocaleString()} ر.ي</span>
                  </div>
                )}
                <div className={`flex justify-between font-black pt-1 border-t border-slate-400 ${is58mm ? 'text-xs' : 'text-sm'}`}>
                  <span>الصافي النهائي:</span>
                  <span>{Number(invoice.net_total).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>طريقة السداد:</span>
                  <span>{paymentMethodLabel}</span>
                </div>
                {invoice.remaining_debt > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-dashed border-rose-300">
                    <span>المتبقي آجل بذمة العميل:</span>
                    <span>{Number(invoice.remaining_debt).toLocaleString()} ر.ي</span>
                  </div>
                )}
              </div>

              {/* Safety Inspection Note */}
              {hasSafetyInspection && (
                <div className="py-1.5 border-t border-dashed border-slate-300 text-[9.5px] text-center text-slate-700 font-sans">
                  ✅ تم إجراء فحص السلامة المجاني لـ 8 نقاط سلامة للمركبة.
                </div>
              )}

              {/* Barcode & Footer */}
              <div className="text-center pt-2.5 border-t border-dashed border-slate-300 space-y-1">
                <div className="font-mono text-[10px] tracking-widest text-slate-600">
                  * {invoice.invoice_number} *
                </div>
                <p className="font-bold text-[10.5px] font-sans">شكراً لزيارتكم ويسعدنا دائماً خدمتكم 🚗</p>
                <p className="text-[8.5px] text-slate-500 font-sans">نظام سريع وبنشر - Quick Lube POS</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950 space-y-2 flex-shrink-0 no-print">
          {/* PRIMARY ACTION: WHATSAPP IF PHONE AVAILABLE, OTHERWISE INSTANT THERMAL PRINT */}
          {hasValidPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>إرسال كرت الخدمة فورياً عبر واتساب الزبون 📲</span>
            </a>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePrint('thermal')}
                className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>طباعة الفاتورة الحرارية فوراً ({is58mm ? '58mm' : '80mm'}) 🖨️</span>
              </button>

              {/* Fast Inline WhatsApp Input for Walk-in Customer */}
              {!showPhoneInput ? (
                <button
                  type="button"
                  onClick={() => setShowPhoneInput(true)}
                  className="w-full py-1 text-center text-xs text-slate-400 hover:text-emerald-400 transition font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>هل يرغب العميل باستلام الفاتورة عبر واتسابه؟ (انقر لإدخال الرقم)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-in fade-in p-1 bg-white/5 rounded-xl border border-white/10">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="رقم هاتف العميل (مثال: 777123456)..."
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 min-h-[36px] px-3 rounded-lg bg-slate-900 border border-white/15 text-white font-mono text-xs font-bold focus:border-emerald-400 focus:outline-none"
                  />
                  <a
                    href={customPhone.length >= 7 ? formatYemeniWhatsAppLink(customPhone, customerWhatsAppMessage) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (customPhone.length < 7) e.preventDefault();
                    }}
                    className={`min-h-[36px] px-3 rounded-lg font-black text-xs flex items-center gap-1 transition ${
                      customPhone.length >= 7
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>إرسال 📲</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* SECONDARY ROW: 1-TOUCH DIRECT BUTTONS (الحرارية/الواتساب، النسخ، فاتورة جديدة) */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Direct Action Tab */}
            {hasValidPhone ? (
              <button
                type="button"
                onClick={() => handlePrint('thermal')}
                className={`min-h-[44px] px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                  activeTab === 'thermal'
                    ? 'bg-white text-slate-950 font-black shadow-md'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>فاتورة {is58mm ? '58mm' : '80mm'} 🖨️</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('pass')}
                className={`min-h-[44px] px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                  activeTab === 'pass'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>كرت الخدمة 📲</span>
              </button>
            )}

            {/* 2. Copy Message */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="min-h-[44px] px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
            </button>

            {/* 3. New Invoice */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewInvoice();
              }}
              className="min-h-[44px] px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>فاتورة جديدة 🚗</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}