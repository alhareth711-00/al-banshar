import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Gauge,
  Package,
  Landmark,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Wrench,
  Smartphone,
  Printer,
  Scale,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

export default function UserGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('pos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>دليل التشغيل الميداني الشامل للمركز</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono">
                  MANUAL v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                إرشادات العمل اليومية للمدير والمحاسب والكاشير في ورش تغيير الزيوت والبناشر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 border-b border-white/10 bg-slate-900/60 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {[
            { id: 'pos', label: '1. كاشير نقطة البيع (POS)', icon: Gauge },
            { id: 'inventory', label: '2. المخزون والتوريد', icon: Package },
            { id: 'vault', label: '3. الصندوق والسندات (1101)', icon: Landmark },
            { id: 'closing', label: '4. الإغلاق اليومي والذروة', icon: FileSpreadsheet },
            { id: 'security', label: '5. الأمان والنسخ الاحتياطي', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content (Smooth Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed flex-1 text-slate-200">
          {/* TAB 1: POS SCREEN */}
          {activeTab === 'pos' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>دورة استقبال السيارات السريعة وإصدار الفواتير اللمسية:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">1</span>
                    <span>البحث الذكي عن السيارة:</span>
                  </div>
                  <p className="text-slate-300">
                    اكتب رقم اللوحة (مثلاً <b className="text-white">1-45892</b>) أو رقم الهاتف في شريط البحث. يستدعي النظام فوراً نوع الزيت المفضل، اللزوجة، والعداد السابق. إن كانت سيارة جديدة، اضغط <b className="text-amber-400">[+ تسجيل سيارة جديدة]</b>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">2</span>
                    <span>قراءة العداد وفارق 3,000 كم التلقائي:</span>
                  </div>
                  <p className="text-slate-300">
                    أدخل قراءة العداد الحالي، يقوم النظام <b className="text-white">تلقائياً بإضافة 3,000 كم</b> كرقم افتراضي لغيار الزيت القادم. يمكنك أيضاً تعديل العداد القادم يدوياً بكل حرية أو اختيار فترات أخرى (+5000 كم).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">3</span>
                    <span>اختيار الزيوت وفصل الخدمات:</span>
                  </div>
                  <p className="text-slate-300">
                    اضغط زر <b className="text-white">[غيار زيت + فلتر]</b> لاختيار لزوجة الزيت وعدد العلب، أو <b className="text-white">[خدمات الورشة والبنشر]</b> لإضافة خدمات الغيار والتشحيم والرقع. النظام يفصل إيرادات الخدمات بحساب مستقل (4201).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">4</span>
                    <span>قنوات الدفع وفاتورة الواتساب الفورية:</span>
                  </div>
                  <p className="text-slate-300">
                    اختر طريقة الدفع: <b className="text-white">كاش، كريمي، جيب، جوالي، أو آجل</b>. عند الضغط على حفظ الفاتورة، يُطبع إيصال 80mm الحراري ويفتح واتساب العميل بكرت الخدمة الرقمي وفحص السلامة المجاني لـ 8 نقاط!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY & PURCHASES */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span>إدارة المخزون والتوريد المغلق وتوزيع أجور الشحن:</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">نظام التوريد المغلق (منع التلاعب بالمخزن):</div>
                  <p className="text-slate-300">
                    لا يمكن زيادة رصيد أي بضاعة عشوائياً. كل زيادة في المخزون تتم عبر <b className="text-white">فاتورة مشتريات رسمية</b> تخصم قيمتها تلقائياً من الصندوق (كاش) أو تقيّد في حساب المورد (آجل).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">توزيع أجور الشحن وتكلفة العلبة الفعلية (Landed Cost):</div>
                  <p className="text-slate-300">
                    عند إدخال فاتورة الشراء مع تكلفة نقل/شحن، يوزع النظام تكلفة الشحن آلياً على العلب ليعطيك التكلفة الحقيقية الصافية للعلبة، مما يضمن تسعير دقيق وعدم البيع بخسارة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">كشف أمر الشراء للنواقص (PO Reorder Sheet):</div>
                  <p className="text-slate-300">
                    بنقرة واحدة من شاشة المخزون، يستخرج النظام قائمة الأصناف التي قاربت على النفاد لاحتساب الكميات المطلوبة ككراتين ونسخها لواتساب المورد لطلب البضاعة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VAULT & VOUCHERS */}
          {activeTab === 'vault' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>إدارة الصندوق النقدي (1101) وسندات القبض والصرف ومسحوبات المالك:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                  <div className="font-bold text-emerald-400 text-sm">الصندوق النقدي الرئيسي (حساب 1101):</div>
                  <p className="text-slate-300">
                    تستقر كافة المقبوضات النقدية في هذا الحساب بدون ترحيل قسري. كل فاتورة كاش أو سند قبض يرفع رصيد الصندوق، وكل مصروف أو شراء نقدي يخصم منه مباشرة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-2">
                  <div className="font-bold text-purple-400 text-sm">مسحوبات المالك الشخصية (حساب 3101):</div>
                  <p className="text-slate-300">
                    عند سحب المالك مبالغ نقدية لمصاريفه الخاصة، تُقيد في <b className="text-white">حساب حقوق الملكية (3101)</b>. هذه المعالجة المحاسبية تحمي أرباح المركز التشغيلية من النقصان غير الحقيقي.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-bold text-white text-sm">سندات القبض (RV) وتحصيل ديون العملاء:</div>
                  <p className="text-slate-300">
                    عند سداد عميل لدين سابق، أصدر سند قبض نقدي (RV) مع حفظ رقم الدفتر الورقي، ويتم إرسال إشعار رسمي فوري لواتساب العميل برصيده السابق والمسدد والمتبقي.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                  <div className="font-bold text-amber-400 text-sm">جرد ومطابقة الصندوق الفعلي:</div>
                  <p className="text-slate-300">
                    زر <b className="text-white">[جرد ومطابقة الصندوق]</b> يتيح إدخال إجمالي النقد الفعلي الموجود في الدرج، ويقارنه النظام آلياً بالرصيد الدفتري لحساب 1101 لتحديد أي عجز أو فائض فورياً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLOSING & ANALYTICS */}
          {activeTab === 'closing' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>الإغلاق المالي اليومي، رسالة واتساب المالك 2.0، وخريطة الذروة:</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">الوضع الافتراضي: إغلاق يومي مباشر وشامل:</div>
                  <p className="text-slate-300">
                    يعمل المركز بنظام الإغلاق اليومي المباشر دون إجبار الكاشير على فتح وإغلاق وردية. يجمع التقرير كافة مبيعات وسندات ومصاريف اليوم المحددة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">إرسال تقرير الإغلاق المزدوج (المالك + المشرف):</div>
                  <p className="text-slate-300">
                    بنقرة واحدة، يرسل التقرير المالي المنسق لواتساب مالك المركز وللمشرف العام بنص مهني يحوي السيارات، المبيعات، الصندوق، وساعة الذروة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">الطباعة الرسمية المزدوجة (A4 و 80mm):</div>
                  <p className="text-slate-300">
                    يدعم زر الطباعة تقرير الإدارة الكامل بصيغة A4 مع خانات التواقيع الرسمية (الكاشير، المحاسب، المشرف)، أو بون إغلاق الصندوق السريع لطابعة الإيصالات الحرارية 80mm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & BACKUP */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span>حماية البيانات من انقطاع الكهرباء والنسخ الاحتياطي التلقائي:</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">النسخ الاحتياطي التلقائي اليومي (Daily Snapshot):</div>
                  <p className="text-slate-300">
                    يقوم الخادم تلقائياً بحفظ لقطة يومية كاملة من قاعدة البيانات في مجلد <b className="text-white">server/backups/</b> ويحتفظ بنسخ آخر 30 يوماً مع تدوير النسخ القديمة ذاتياً.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">فحص السلامة والصيانة الذاتية (Integrity Check):</div>
                  <p className="text-slate-300">
                    أداة فحص سلامة الجداول المدمجة تضمن عدم تلف ملف قاعدة البيانات حتى في حال انقطاع التيار الكهربائي المفاجئ بالورشة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
                  <div className="font-bold text-white text-sm">التشغيل المكتبي بنقرة واحدة (App Mode):</div>
                  <p className="text-slate-300">
                    انقر نقراً مزدوجاً على ملف <b className="text-amber-400">تشغيل_النظام.bat</b> على سطح المكتب لتشغيل الخادم وفتح الواجهة كنافذة تطبيق مستقلة بدون أشرطة متصفح تناسب شاشات اللمس.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span>نظام سريع وبنشر &bull; السوق اليمني</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition active:scale-95 shadow-md"
          >
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
}
