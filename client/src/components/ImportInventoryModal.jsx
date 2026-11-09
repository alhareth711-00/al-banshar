import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  PackagePlus,
  Coins,
} from 'lucide-react';

export default function ImportInventoryModal({ isOpen, onClose, onImportSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'valid' | 'skipped' | 'error'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.location.href = '/api/inventory/import-template';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationError('');
    setPreviewData(null);
    setCommitSuccess(null);
    setIsValidating(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await fetch('/api/inventory/import-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'فشل فحص ملف الإكسل');
          }

          setPreviewData(data.data);
        } catch (err) {
          setValidationError(err.message || 'حدث خطأ أثناء فحص الملف');
        } finally {
          setIsValidating(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setValidationError('تعذر قراءة الملف من الجهاز');
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || !previewData.rows) return;

    const validItems = previewData.rows.filter((r) => r.status === 'valid_new');
    if (validItems.length === 0) {
      setValidationError('لا توجد أي أصناف جديدة صالحة للاستيراد');
      return;
    }

    setIsCommitting(true);
    setValidationError('');

    try {
      const res = await fetch('/api/inventory/import-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل حفظ واستيراد الأصناف');
      }

      setCommitSuccess(data.message);
      if (onImportSuccess) {
        onImportSuccess(data.data);
      }
    } catch (err) {
      setValidationError(err.message || 'فشلت عملية الاستيراد');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setValidationError('');
    setCommitSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredRows = previewData
    ? previewData.rows.filter((r) => {
        if (activeFilter === 'valid') return r.status === 'valid_new';
        if (activeFilter === 'skipped') return r.status === 'skipped_duplicate';
        if (activeFilter === 'error') return r.status === 'error';
        return true;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl text-right relative flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>استيراد الأصناف والمخزون من ملف Excel / CSV</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  تجهيز فوري للعميل
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تنزيل قالب مجهز، رفع ملف الأصناف، معاينة الأسعار والمخزون، وتوليد القيود المحاسبية آلياً.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Commit Success State */}
          {commitSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/50 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">تم استيراد الأصناف بنجاح تام! 🎉</h4>
                <p className="text-xs text-emerald-300 font-bold mt-1 max-w-lg mx-auto leading-relaxed">
                  {commitSuccess}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  العودة لشاشة المخزون 📦
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template Download & Guidance Bar */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="text-xs space-y-1 text-center sm:text-right">
                  <span className="font-black text-white block">تحتاج إلى نموذج جاهز لتعبئة بياناتك؟</span>
                  <span className="text-slate-400 text-[11px] block">
                    حمل القالب الرسمي المعتمد المجهز بالأعمدة العربية والفئات الصالحة (زيت، فلتر، إطار، بطارية، أكسسوار، خدمة).
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-black transition flex items-center gap-2 shrink-0 active:scale-95 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل نموذج Excel الجاهز 📥</span>
                </button>
              </div>

              {/* Step 2: File Selector / Dropzone if no preview yet */}
              {!previewData && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isValidating
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-white/20 hover:border-emerald-500/50 bg-slate-950/50 hover:bg-emerald-500/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {isValidating ? (
                    <>
                      <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                      <span className="text-sm font-black text-amber-300">
                        جاري فحص وتدقيق بنية ملف الإكسل والأصناف...
                      </span>
                      <span className="text-xs text-slate-400">
                        مطابقة الفئات، واكتشاف الأصناف المكررة، واحتساب قيمة بضاعة أول المدة
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-black text-white block">
                          اضغط لاختيار ملف الإكسل أو قم بسحبه وإفلاته هنا
                        </span>
                        <span className="text-xs text-slate-400 block">
                          الصيغ المدعومة: ملفات Excel (.xlsx, .xls) أو ملفات CSV
                        </span>
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>يتم الفحص والمعاينة مسبقاً قبل كتابة أي بيان في النظام</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Step 3: Interactive Preview & Verification Table */}
              {previewData && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Valid New Items */}
                    <div
                      onClick={() => setActiveFilter('valid')}
                      className={`p-3 rounded-2xl border cursor-pointer transition ${
                        activeFilter === 'valid'
                          ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/30'
                          : 'bg-slate-950 border-emerald-500/30 hover:border-emerald-400/60'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 block font-bold">أصناف جديدة معتمدة</span>
                      <strong className="text-lg font-mono font-black text-emerald-300">
                        {previewData.summary.validNewCount}
                      </strong>
                      <span className="text-[10px] text-emerald-400/80 block mt-0.5">جاهزة للاستيراد ✅</span>
                    </div>

                    {/* Skipped Duplicates */}
                    <div
                      onClick={() => setActiveFilter('skipped')}
                      className={`p-3 rounded-2xl border cursor-pointer transition ${
                        activeFilter === 'skipped'
                          ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-slate-950 border-amber-500/30 hover:border-amber-400/60'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 block font-bold">أصناف مسجلة مسبقاً</span>
                      <strong className="text-lg font-mono font-black text-amber-300">
                        {previewData.summary.skippedDuplicateCount}
                      </strong>
                      <span className="text-[10px] text-amber-400/80 block mt-0.5">سيتم تخطيها حمايةً للأسعار 🛡️</span>
                    </div>

                    {/* Errors */}
                    <div
                      onClick={() => setActiveFilter('error')}
                      className={`p-3 rounded-2xl border cursor-pointer transition ${
                        activeFilter === 'error'
                          ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-400/30'
                          : 'bg-slate-950 border-rose-500/30 hover:border-rose-400/60'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 block font-bold">صفوف بها أخطاء</span>
                      <strong className="text-lg font-mono font-black text-rose-300">
                        {previewData.summary.errorCount}
                      </strong>
                      <span className="text-[10px] text-rose-400/80 block mt-0.5">فئة غير معتمدة أو اسم فارغ ❌</span>
                    </div>

                    {/* Total Opening Capital */}
                    <div
                      onClick={() => setActiveFilter('all')}
                      className={`p-3 rounded-2xl border cursor-pointer transition ${
                        activeFilter === 'all'
                          ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30'
                          : 'bg-slate-950 border-cyan-500/30 hover:border-cyan-400/60'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 block font-bold">بضاعة أول المدة</span>
                      <strong className="text-sm font-mono font-black text-cyan-300 block truncate">
                        {previewData.summary.totalOpeningCost.toLocaleString()} ر.ي
                      </strong>
                      <span className="text-[10px] text-cyan-400/80 block mt-0.5">قيد محاسبي آلي (1301/3001) ⚖️</span>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-bold">
                      جدول الأصناف المقروءة ({filteredRows.length} من {previewData.summary.totalRows}):
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          activeFilter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        الكل ({previewData.summary.totalRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('valid')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          activeFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        الجديدة ({previewData.summary.validNewCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('skipped')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          activeFilter === 'skipped' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        المتخطاة ({previewData.summary.skippedDuplicateCount})
                      </button>
                      {previewData.summary.errorCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter('error')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition ${
                            activeFilter === 'error' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          الأخطاء ({previewData.summary.errorCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950 max-h-60 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-bold sticky top-0 border-b border-white/10 z-10">
                        <tr>
                          <th className="p-2.5 w-12 text-center">#</th>
                          <th className="p-2.5">اسم الصنف</th>
                          <th className="p-2.5">الفئة</th>
                          <th className="p-2.5">الماركة</th>
                          <th className="p-2.5">سعر التكلفة</th>
                          <th className="p-2.5">سعر البيع</th>
                          <th className="p-2.5">الرصيد</th>
                          <th className="p-2.5">الحالة والإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-sans">
                        {filteredRows.map((row) => (
                          <tr
                            key={row.rowNum}
                            className={`hover:bg-white/[0.02] transition ${
                              row.status === 'valid_new'
                                ? 'bg-emerald-950/10'
                                : row.status === 'skipped_duplicate'
                                ? 'bg-amber-950/10 text-slate-400'
                                : 'bg-rose-950/20 text-rose-200'
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono text-slate-500">{row.rowNum}</td>
                            <td className="p-2.5 font-bold text-white max-w-[200px] truncate">{row.name}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">
                                {row.category || row.rawCategory || 'غير محدد'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300">{row.brand || '-'}</td>
                            <td className="p-2.5 font-mono text-slate-300">
                              {Number(row.costPrice || 0).toLocaleString()} ر.ي
                            </td>
                            <td className="p-2.5 font-mono text-amber-300 font-bold">
                              {Number(row.sellPrice || 0).toLocaleString()} ر.ي
                            </td>
                            <td className="p-2.5 font-mono text-cyan-300 font-black">
                              {row.stockQty || 0}
                            </td>
                            <td className="p-2.5">
                              {row.status === 'valid_new' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  <span>صنف جديد سيعتمد</span>
                                </span>
                              ) : row.status === 'skipped_duplicate' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                  <span>تخطي (مكرر)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                                  <span>{row.errorReason}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!commitSuccess && (
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
            {previewData ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={isCommitting}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>اختيار ملف آخر</span>
              </button>
            ) : (
              <div className="text-xs text-slate-500">
                يدعم الإكسل بصيغتي (.xlsx, .xls) و (.csv)
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCommitting}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
              >
                إلغاء
              </button>

              {previewData && (
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={isCommitting || previewData.summary.validNewCount === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ الأصناف وترحيل القيود المحاسبية...</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        تأكيد واستيراد ({previewData.summary.validNewCount}) صنف جديد 🚀
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
