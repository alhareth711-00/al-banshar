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
  Tag,
  Receipt,
  Phone,
  Store,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function InvoiceReceiptModal({ isOpen, onClose, invoice, onNewInvoice }) {
  const [activeTab, setActiveTab] = useState('pass'); // 'pass' | 'thermal' | 'sticker'
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const settings = getShopSettings();

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
💰 الإجمالي: ${Number(invoice.net_total).toLocaleString()} ر.ي (طريقة الدفع: ${paymentMethodLabel}).
شكراً لثقتكم ويسعدنا دائماً خدمتكم بكل أهتمام.`;

  const whatsappUrl = formatYemeniWhatsAppLink(invoice.customer_phone, customerWhatsAppMessage);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customerWhatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (tabTarget) => {
    if (tabTarget) setActiveTab(tabTarget);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      {/* Scoped CSS for Thermal Printing & Sticker Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            margin: 0;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
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

          {/* 3 View Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10 text-xs font-bold">
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
              <span>فاتورة حرارية 80mm</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sticker')}
              className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'sticker'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>ملصق الزجاج (ستيكر)</span>
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

                {invoice.remaining_debt > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex justify-between font-bold text-rose-300 text-xs font-mono">
                    <span>المتبقي آجل على العميل:</span>
                    <span>{Number(invoice.remaining_debt).toLocaleString()} ر.ي</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 80mm THERMAL RECEIPT */}
          {activeTab === 'thermal' && (
            <div className="printable-area bg-white text-slate-900 rounded-2xl p-6 font-mono text-xs shadow-2xl border border-slate-300 max-w-sm mx-auto">
              {/* Thermal Shop Header */}
              <div className="text-center border-b-2 border-dashed border-slate-400 pb-3">
                <h3 className="font-black text-base text-slate-950 font-sans">{settings.shopName}</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-[11px] text-slate-800 font-bold mt-0.5">هاتف: {settings.shopPhone}</p>
              </div>

              {/* Invoice Meta */}
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
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
                <div className="flex justify-between">
                  <span>الفني المنفذ:</span>
                  <span>{invoice.worker_name || 'فني المركز'}</span>
                </div>
              </div>

              {/* Odometer Section */}
              <div className="py-2 border-b border-dashed border-slate-300 grid grid-cols-2 gap-2 text-center text-[11px] bg-slate-100 p-2 rounded-lg my-2">
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
                <table className="w-full text-right text-[11px]">
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
              <div className="py-2.5 space-y-1 text-xs">
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
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم الممنوح:</span>
                    <span>-{Number(invoice.discount).toLocaleString()} ر.ي</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-400">
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
                <div className="py-2 border-t border-dashed border-slate-300 text-[10px] text-center text-slate-700 font-sans">
                  ✅ تم إجراء فحص السلامة المجاني لـ 8 نقاط سلامة للمركبة.
                </div>
              )}

              {/* Barcode & Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-1">
                <div className="font-mono text-[10px] tracking-widest text-slate-600">
                  * {invoice.invoice_number} *
                </div>
                <p className="font-bold text-[11px] font-sans">شكراً لزيارتكم ويسعدنا دائماً خدمتكم 🚗</p>
                <p className="text-[9px] text-slate-500 font-sans">نظام سريع وبنشر - Quick Lube POS</p>
              </div>
            </div>
          )}

          {/* TAB 3: OIL CHANGE REMINDER WINDSHIELD STICKER */}
          {activeTab === 'sticker' && (
            <div className="printable-area bg-gradient-to-br from-amber-50 to-orange-50 text-slate-950 rounded-3xl p-5 border-2 border-amber-400 max-w-xs mx-auto shadow-2xl font-sans text-xs space-y-3">
              {/* Sticker Header */}
              <div className="text-center border-b-2 border-amber-400 pb-2.5">
                <div className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
                  ملصق تذكير خدمة الزيت القادم 🏷️
                </div>
                <h4 className="font-black text-sm text-slate-900 mt-0.5">{settings.shopName}</h4>
                <div className="text-[11px] font-mono text-slate-700 font-bold">هاتف: {settings.shopPhone}</div>
              </div>

              {/* Vehicle & Date */}
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">رقم لوحة المركبة:</div>
                  <div className="font-mono font-black text-slate-900 text-sm">{invoice.plate_number}</div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-[10px] text-slate-500">تاريخ الخدمة:</div>
                  <div className="font-bold text-slate-800">{new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              {/* Prominent Next Odometer Box (The core feature of windshield sticker) */}
              <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 text-center shadow-md">
                <div className="text-[11px] font-black tracking-wide uppercase opacity-90">
                  ⚡ موعد التغيير القادم عند العداد:
                </div>
                <div className="text-2xl font-black font-mono mt-0.5 tracking-tight">
                  {Number(invoice.next_odometer).toLocaleString()} <span className="text-xs font-sans">كم</span>
                </div>
                <div className="text-[11px] font-bold font-mono mt-1 opacity-90">
                  أو بتاريخ: {invoice.next_service_date}
                </div>
              </div>

              {/* Oil & Filter Spec */}
              <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">العداد الحالي:</span>
                  <span className="font-mono font-bold">{Number(invoice.current_odometer).toLocaleString()} كم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">الزيت المستخدم:</span>
                  <span className="font-bold truncate max-w-[150px]">{oilDetailsText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">الفلتر:</span>
                  <span className="font-bold truncate max-w-[150px]">{filterDetailsText}</span>
                </div>
              </div>

              {/* Friendly Footer Warning */}
              <div className="text-center text-[10px] text-slate-600 font-medium pt-1">
                يرجى الالتزام بالموعد المحدد للحفاظ على محرك سيارتك وعزمها. نتمنى لكم قيادة آمنة 🌹
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950 space-y-2 flex-shrink-0 no-print">
          {/* PRIMARY ACTION: DIRECT WHATSAPP SENDER */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>إرسال كرت الخدمة فورياً عبر واتساب الزبون 📲</span>
          </a>

          {/* SECONDARY ROW */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="min-h-[44px] px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint(activeTab === 'pass' ? 'thermal' : activeTab)}
              className="min-h-[44px] px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                {activeTab === 'sticker'
                  ? 'طباعة الملصق 🏷️'
                  : activeTab === 'thermal'
                  ? 'طباعة 80mm 🖨️'
                  : 'معاينة وطباعة 🖨️'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNewInvoice();
              }}
              className="min-h-[44px] px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}