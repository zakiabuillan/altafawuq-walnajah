import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Printer, 
  Share2, 
  Sparkles, 
  Layers, 
  Sliders, 
  Eye,
  Loader2,
  FileCheck
} from 'lucide-react';
import { WhiteboardPage, WhiteboardProject } from '../../types/whiteboard';
import { exportWhiteboardToPdf, downloadCanvasImage } from '../../lib/pdfWhiteboardUtils';

interface WhiteboardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: WhiteboardProject;
  activePageIndex: number;
  renderPageToOffscreenCanvas: (page: WhiteboardPage, scaleMultiplier?: number) => Promise<HTMLCanvasElement>;
  onShowNotice?: (message: string) => void;
}

export const WhiteboardExportModal: React.FC<WhiteboardExportModalProps> = ({
  isOpen,
  onClose,
  project,
  activePageIndex,
  renderPageToOffscreenCanvas,
  onShowNotice
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf' | 'jpeg'>('png');
  const [resolution, setResolution] = useState<'hd' | '4k'>('hd');
  const [customTitle, setCustomTitle] = useState(project.title || 'شرح_السبورة_التعليمية');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const currentPage = project.pages[activePageIndex] || project.pages[0];

  // Update title if project title changes
  useEffect(() => {
    if (project.title) {
      setCustomTitle(project.title);
    }
  }, [project.title]);

  // Generate live thumbnail preview of current page
  useEffect(() => {
    if (!isOpen || !currentPage) return;
    let isMounted = true;
    setIsLoadingPreview(true);

    renderPageToOffscreenCanvas(currentPage, 1)
      .then(canvas => {
        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
          setIsLoadingPreview(false);
        }
      })
      .catch(err => {
        console.error('Error generating preview:', err);
        if (isMounted) setIsLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activePageIndex, project.pages]);

  if (!isOpen) return null;

  const getMultiplier = () => (resolution === '4k' ? 2 : 1);

  // Handle PNG / JPEG Download
  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    try {
      setIsExporting(true);
      const mult = getMultiplier();
      const filename = `${customTitle.trim() || 'سبورة'}_صفحة_${activePageIndex + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      
      const canvas = await renderPageToOffscreenCanvas(currentPage, mult);
      downloadCanvasImage(canvas, filename, format);
      
      onShowNotice?.(`تم تنزيل الصورة بنجاح (${format.toUpperCase()}) 📥`);
      onClose();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('حدث خطأ أثناء تصدير الصورة.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle PDF Export
  const handleDownloadPdf = async (scope: 'current' | 'all') => {
    try {
      setIsExporting(true);
      const mult = getMultiplier();
      const pagesToExport = scope === 'current' ? [currentPage] : project.pages;
      const filename = `${customTitle.trim() || 'شرح_السبورة'}${scope === 'current' ? `_صفحة_${activePageIndex + 1}` : '_كامل_اللوح'}.pdf`;

      await exportWhiteboardToPdf(
        pagesToExport,
        (page) => renderPageToOffscreenCanvas(page, mult),
        filename
      );

      onShowNotice?.(`تم تصدير ملف PDF بنجاح (${scope === 'current' ? 'صفحة واحدة' : `${pagesToExport.length} صفحات`}) 📄`);
      onClose();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyToClipboard = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderPageToOffscreenCanvas(currentPage, 1);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('تعذر تحويل الصورة إلى الحافظة.');
          setIsExporting(false);
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setCopiedSuccess(true);
            onShowNotice?.('تم نسخ صورة السبورة إلى الحافظة! يمكنك لصقها مباشرة في واتساب أو تيليجرام 📋✨');
            setTimeout(() => setCopiedSuccess(false), 3000);
          } else {
            alert('متصفحك لا يدعم نسخ الصور إلى الحافظة مباشرة.');
          }
        } catch (clipErr) {
          console.error('Clipboard write error:', clipErr);
          alert('تعذر الوصول إلى الحافظة.');
        } finally {
          setIsExporting(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Copy error:', err);
      setIsExporting(false);
    }
  };

  // Handle Native Print
  const handlePrint = async () => {
    try {
      setIsExporting(true);
      const pagesToPrint = exportScope === 'all' ? project.pages : [currentPage];
      const imagesHtml: string[] = [];

      for (let i = 0; i < pagesToPrint.length; i++) {
        const pageCanvas = await renderPageToOffscreenCanvas(pagesToPrint[i], 1.5);
        const dataUrl = pageCanvas.toDataURL('image/png');
        imagesHtml.push(`
          <div class="print-page">
            <img src="${dataUrl}" alt="صفحة ${i + 1}" />
          </div>
        `);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
        setIsExporting(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
          <head>
            <title>${customTitle || 'طباعة السبورة - أكاديمية التفوق أون لاين'}</title>
            <style>
              body { 
                margin: 0; 
                padding: 10px; 
                background: #fff; 
                font-family: Cairo, sans-serif; 
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .print-page { 
                width: 100%; 
                max-width: 1200px; 
                margin-bottom: 24px; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                page-break-after: always;
              }
              .print-page:last-child {
                page-break-after: auto;
                margin-bottom: 0;
              }
              img { 
                width: 100%; 
                height: auto; 
                max-height: 96vh; 
                object-fit: contain; 
              }
              @media print {
                body { padding: 0; margin: 0; background: #fff; }
                .print-page { 
                  margin: 0; 
                  padding: 0;
                  height: 100vh;
                  max-width: none;
                  page-break-after: always; 
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .print-page:last-child {
                  page-break-after: avoid;
                }
                img { 
                  width: 100%; 
                  height: auto; 
                  max-height: 98vh; 
                }
              }
            </style>
          </head>
          <body>
            ${imagesHtml.join('')}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      onShowNotice?.(`تم إرسال ${pagesToPrint.length > 1 ? `كافة صفحات اللوح (${pagesToPrint.length})` : 'صفحة اللوح'} لأمر الطباعة 🖨️`);
    } catch (err) {
      console.error('Print error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Web Share API if available
  const handleWebShare = async () => {
    try {
      if (!navigator.share) {
        alert('ميزة المشاركة المباشرة غير مدعومة في هذا المتصفح. يمكنك تنزيل الصورة أو نسخها.');
        return;
      }

      setIsExporting(true);
      const canvas = await renderPageToOffscreenCanvas(currentPage, 1);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${customTitle || 'سبورة'}_صفحة_${activePageIndex + 1}.png`, { type: 'image/png' });
        
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: customTitle,
              text: `شرح السبورة التعليمية - ${project.title || ''}`,
              files: [file]
            });
            onShowNotice?.('تمت المشاركة بنجاح 🚀');
          } else {
            await navigator.share({
              title: customTitle,
              text: `شرح السبورة التعليمية: ${customTitle}`
            });
          }
        } catch (shareErr) {
          console.warn('Share cancelled or failed:', shareErr);
        } finally {
          setIsExporting(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
      setIsExporting(false);
    }
  };

  // Primary Action Button Trigger
  const handlePrimaryExport = () => {
    if (exportFormat === 'pdf') {
      handleDownloadPdf(exportScope);
    } else {
      handleDownloadImage(exportFormat);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none"
      dir="rtl"
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                تصدير ومشاركة محتويات السبورة
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {project.pages.length} {project.pages.length === 1 ? 'صفحة' : 'صفحات'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                احفظ شروح الدرس كملف PDF عالي الجودة أو صورة PNG لمشاركتها مع الطلاب
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* File Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              عنوان المستند / اسم ملف التصدير:
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="مثال: شرح_الفيزياء_الحركة_الدائرية"
              className="w-full bg-slate-800/90 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Quick Action Grid: Fast PNG vs Fast PDF vs Clipboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quick PNG Card */}
            <button
              type="button"
              onClick={() => handleDownloadImage('png')}
              disabled={isExporting}
              className="p-3.5 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 border border-sky-500/30 hover:border-sky-400/60 rounded-2xl text-right transition-all cursor-pointer group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon size={18} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-md">
                  PNG فوري
                </span>
              </div>
              <div className="text-xs font-black text-slate-100 mb-0.5">تنزيل صورة PNG</div>
              <div className="text-[11px] text-slate-400">تصدير الصفحة الحالية بدقة عالية للشاشات</div>
            </button>

            {/* Quick PDF Card */}
            <button
              type="button"
              onClick={() => handleDownloadPdf(exportScope)}
              disabled={isExporting}
              className="p-3.5 bg-gradient-to-br from-rose-500/10 to-amber-500/10 hover:from-rose-500/20 hover:to-amber-500/20 border border-rose-500/30 hover:border-rose-400/60 rounded-2xl text-right transition-all cursor-pointer group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={18} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-md">
                  PDF مستند
                </span>
              </div>
              <div className="text-xs font-black text-slate-100 mb-0.5">تصدير مستند PDF</div>
              <div className="text-[11px] text-slate-400">
                {exportScope === 'current' ? 'حفظ الصفحة الحالية كمستند' : `دمج كامل اللوح (${project.pages.length} صفحات)`}
              </div>
            </button>

            {/* Copy To Clipboard Card */}
            <button
              type="button"
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer group shadow-sm border ${
                copiedSuccess
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                  copiedSuccess ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}>
                  {copiedSuccess ? <Check size={18} /> : <Copy size={18} />}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-700 text-slate-300 rounded-md">
                  لصق سريع
                </span>
              </div>
              <div className="text-xs font-black mb-0.5">
                {copiedSuccess ? 'تم النسخ بنجاح! ✨' : 'نسخ للحافظة'}
              </div>
              <div className="text-[11px] text-slate-400">لصق مباشر في واتساب أو كلاس روم</div>
            </button>
          </div>

          {/* Detailed Customization Settings */}
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80 space-y-4">
            
            {/* Export Scope (Current Page vs All Pages) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                نطاق الصفحات المطلوب تصديرها:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('current')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    exportScope === 'current'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <FileCheck size={14} />
                  <span>الصفحة الحالية فقط (صفحة {activePageIndex + 1})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportScope('all');
                    setExportFormat('pdf'); // All pages usually best in PDF
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    exportScope === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <Layers size={14} />
                  <span>كامل المستند ({project.pages.length} صفحات: PDF + صفحات بيضاء)</span>
                </button>
              </div>
            </div>

            {/* Format Selector & Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Format */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  صيغة الملف:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('png')}
                    disabled={exportScope === 'all'}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      exportFormat === 'png'
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    } disabled:opacity-30`}
                  >
                    PNG عالي الدقة
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      exportFormat === 'pdf'
                        ? 'bg-rose-500 text-white border-rose-400 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    PDF مستند
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('jpeg')}
                    disabled={exportScope === 'all'}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      exportFormat === 'jpeg'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    } disabled:opacity-30`}
                  >
                    JPG مضغوط
                  </button>
                </div>
              </div>

              {/* Resolution Multiplier */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  جودة الدقة (Resolution):
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResolution('hd')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      resolution === 'hd'
                        ? 'bg-indigo-500 text-white border-indigo-400 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    HD قياسي (1080p)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('4k')}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      resolution === '4k'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    4K فائق الوضوح ✨
                  </button>
                </div>
              </div>
            </div>

            {/* Extra Share & Print Utility Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">خيارات سريعة إضافية:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isExporting}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                  title="طباعة الصفحة الحالية"
                >
                  <Printer size={12} />
                  <span>طباعة 🖨️</span>
                </button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={handleWebShare}
                    disabled={isExporting}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                    title="مشاركة عبر التطبيقات"
                  >
                    <Share2 size={12} />
                    <span>مشاركة التطبيقات</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Small Preview of Current Page */}
          {previewDataUrl && (
            <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40 flex items-center gap-4">
              <div className="w-24 h-16 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {isLoadingPreview ? (
                  <Loader2 size={16} className="text-amber-400 animate-spin" />
                ) : (
                  <img src={previewDataUrl} alt="معاينة اللوح" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">
                  الصفحة النشطة: {currentPage.title || `صفحة ${activePageIndex + 1}`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  الخطوط والعناصر: {currentPage.strokes?.length || 0} خطوط، {currentPage.textItems?.length || 0} نصوص، {currentPage.imageItems?.length || 0} صور
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handlePrimaryExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>جاري معالجة وتصدير اللوح...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>
                  تصدير {exportFormat.toUpperCase()} ({exportScope === 'current' ? 'صفحة مفردة' : `${project.pages.length} صفحات`})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
