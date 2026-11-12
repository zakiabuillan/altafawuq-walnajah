import React from 'react';
import { 
  X, 
  Plus, 
  Copy, 
  Trash2, 
  Layers, 
  FileText, 
  FileCheck2,
  Sparkles,
  BookOpen,
  Columns,
  ArrowDown,
  ArrowUp,
  FilePlus2,
  Zap
} from 'lucide-react';
import { WhiteboardPage } from '../../types/whiteboard';

interface WhiteboardPagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: WhiteboardPage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onInsertPageAt?: (index: number, position: 'before' | 'after') => void;
  onInsertBlankPageBeside?: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onQuickPdfImport?: () => void;
  onOpenPdfImport?: () => void;
}

export const WhiteboardPagesDrawer: React.FC<WhiteboardPagesDrawerProps> = ({
  isOpen,
  onClose,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onInsertPageAt,
  onInsertBlankPageBeside,
  onDuplicatePage,
  onDeletePage,
  onQuickPdfImport,
  onOpenPdfImport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
      <div className="w-80 md:w-96 bg-slate-900 text-white h-full shadow-2xl flex flex-col border-r border-slate-800 animate-in slide-in-from-right-10 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-amber-400" />
            <div>
              <h3 className="text-sm font-black">فهرس وإدارة صفحات اللوح ({pages.length})</h3>
              <p className="text-[10px] text-slate-400">إدراج صفحات بيضاء في أي موقع مع ترقيم تلقائي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Insert After Current Page */}
            <button
              type="button"
              onClick={() => {
                if (onInsertPageAt) {
                  onInsertPageAt(currentPageIndex, 'after');
                } else {
                  onAddPage();
                }
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-[11px] font-black rounded-xl transition-all cursor-pointer shadow-sm"
              title={`إدراج صفحة بيضاء بعد الصفحة الحالية (في الموقع ${currentPageIndex + 2})`}
            >
              <FilePlus2 size={13} className="text-amber-300" />
              <span>إدراج بعد الحالية ➕</span>
            </button>

            {/* Add Page at the end */}
            <button
              type="button"
              onClick={onAddPage}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
              title="إضافة صفحة بيضاء في نهاية المستند"
            >
              <Plus size={13} />
              <span>إضافة في النهاية</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDuplicatePage(currentPageIndex)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer border border-slate-700/60"
              title="تكرار الصفحة الحالية"
            >
              <Copy size={13} />
              <span>تكرار الصفحة الحالية</span>
            </button>
          </div>

          {onQuickPdfImport && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onQuickPdfImport();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-600/30 hover:from-amber-500/40 hover:via-rose-500/40 hover:to-purple-600/40 text-amber-200 border border-amber-400/40 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm mb-2"
              title="استيراد PDF سريع وتقسيم صفحاته تلقائياً"
            >
              <Zap size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
              <span>استيراد PDF سريع وتقسيمه لصفحات ⚡</span>
            </button>
          )}

          {onOpenPdfImport && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPdfImport();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-rose-600/30 to-purple-600/30 hover:from-rose-600/50 hover:to-purple-600/50 text-rose-200 border border-rose-500/40 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <FileText size={14} className="text-rose-400" />
              <span>استرداد صفحات من ملف PDF للشرح 📄</span>
            </button>
          )}
        </div>

        {/* Pages Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          
          {/* Quick button to insert blank page at the very beginning */}
          {onInsertPageAt && (
            <div className="pb-1">
              <button
                type="button"
                onClick={() => onInsertPageAt(0, 'before')}
                className="w-full py-2 px-3 bg-slate-950/80 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-400 hover:text-indigo-200 rounded-xl text-[10px] font-black border border-dashed border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                title="إدراج صفحة بيضاء جديدة في بداية المستند قبل الصفحة الأولى"
              >
                <Plus size={12} className="text-amber-400" />
                <span>إدراج صفحة بيضاء في بداية المستند (صفحة 1)</span>
              </button>
            </div>
          )}

          {pages.map((page, idx) => {
            const isSelected = idx === currentPageIndex;
            const strokeCount = page.strokes?.length || 0;
            const textCount = page.textItems?.length || 0;
            const isPdfPage = !!page.backgroundImage;
            const isDual = page.isDualSpread;

            return (
              <React.Fragment key={page.id}>
                <div
                  onClick={() => {
                    onSelectPage(idx);
                    onClose();
                  }}
                  className={`relative rounded-2xl p-3 border-2 transition-all cursor-pointer group ${
                    isSelected 
                      ? 'bg-slate-800/90 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
                            {page.title || `صفحة ${idx + 1}`}
                          </h4>
                          {isDual && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[9px] font-black flex items-center gap-1">
                              <BookOpen size={10} />
                              صفحتان
                            </span>
                          )}
                          {!isPdfPage && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8.5px] font-bold border border-emerald-500/30">
                              صفحة بيضاء
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {isDual ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Columns size={10} />
                              {page.pdfPageNumbers ? `صـ ${page.pdfPageNumbers.join(' - ')}` : (page.pdfPageNumber ? `صـ ${page.pdfPageNumber} + مسودة` : 'عرض مزدوج')}
                            </span>
                          ) : isPdfPage ? (
                            <span className="text-rose-400 flex items-center gap-1">
                              <FileText size={10} />
                              مستند PDF (صـ {page.pdfPageNumber || idx + 1})
                            </span>
                          ) : (
                            <span>
                              {page.backgroundType === 'ruled' ? 'دفتر مخطط (سطور)' :
                               page.backgroundType === 'grid' ? 'مربعات بيانية' :
                               page.backgroundType === 'blank' ? 'أبيض سادة' :
                               page.backgroundType === 'dots' ? 'شبكة نقاط' :
                               page.backgroundType === 'chalkboard' ? 'سبورة خضراء' :
                               page.backgroundType === 'dark' ? 'سبورة داكنة' :
                               page.backgroundType === 'math-plane' ? 'محاور X/Y' :
                               page.backgroundType === 'isometric' ? 'أيزومترك 3D' :
                               `قالب: ${page.backgroundType}`}
                            </span>
                          )}
                          <span>•</span>
                          <span>{strokeCount + textCount} عنصر</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions on this page */}
                    <div className="flex items-center gap-1">
                      {/* Insert blank page after button */}
                      {onInsertPageAt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertPageAt(idx, 'after');
                          }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded cursor-pointer transition-colors"
                          title={`إدراج صفحة بيضاء بعد هذه الصفحة مباشرة (في الموقع ${idx + 2})`}
                        >
                          <Plus size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 cursor-pointer"
                        title="تكرار هذه الصفحة"
                      >
                        <Copy size={12} />
                      </button>

                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل أنت متأكد من حذف الصفحة ${idx + 1}؟`)) {
                              onDeletePage(idx);
                            }
                          }}
                          className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/50 cursor-pointer"
                          title="حذف الصفحة"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Page Preview Miniature Box */}
                  <div 
                    className={`mt-2.5 h-24 rounded-xl border border-slate-700 flex items-center justify-center relative overflow-hidden ${
                      page.backgroundType === 'chalkboard' 
                        ? 'bg-[#1b4332]' 
                        : page.backgroundType === 'dark' 
                          ? 'bg-[#0f172a]' 
                          : 'bg-white'
                    }`}
                  >
                    {page.backgroundImage ? (
                      <img 
                        src={page.backgroundImage} 
                        alt="معاينة الصفحة" 
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-[10px] gap-1 p-2">
                        <FileCheck2 size={18} className="opacity-40" />
                        <span className="text-[9px] font-mono opacity-80 text-center">
                          صفحة بيضاء ({strokeCount} رسومات / {textCount} نصوص)
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-md shadow-xs">
                        الحالية
                      </div>
                    )}
                  </div>

                  {/* Quick Inline Insert Bar below each card */}
                  {onInsertPageAt && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {onInsertBlankPageBeside && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInsertBlankPageBeside(idx);
                            }}
                            className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded text-[9px] font-black cursor-pointer transition-all flex items-center gap-0.5 shadow-2xs"
                            title={`إدراج صفحة بيضاء بجانب الصفحة ${idx + 1} وتفعيل العرض جنباً إلى جنب (Side-by-Side) فوراً`}
                          >
                            <span>+ بجانبها 📑</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertPageAt(idx, 'before');
                          }}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
                          title={`إدراج صفحة بيضاء قبل الصفحة ${idx + 1}`}
                        >
                          + قبل
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertPageAt(idx, 'after');
                          }}
                          className="px-1.5 py-0.5 bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
                          title={`إدراج صفحة بيضاء بعد الصفحة ${idx + 1}`}
                        >
                          + بعد
                        </button>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">موقع {idx + 1} من {pages.length}</span>
                    </div>
                  )}
                </div>

                {/* Visible insertion divider between page N and N+1 */}
                {onInsertPageAt && idx < pages.length - 1 && (
                  <div className="relative py-1 flex items-center justify-center group/divider">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800/80 group-hover/divider:border-indigo-500/50 transition-colors" />
                    </div>
                    <button
                      type="button"
                      onClick={() => onInsertPageAt(idx, 'after')}
                      className="relative z-10 px-2.5 py-0.5 bg-slate-900 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-full text-[9px] font-black border border-slate-700/80 hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-1 shadow-2xs opacity-60 hover:opacity-100"
                      title={`إدراج صفحة بيضاء هنا بين الصفحة ${idx + 1} والصفحة ${idx + 2}`}
                    >
                      <Plus size={10} className="text-amber-400" />
                      <span>إدراج صفحة بيضاء هنا (موقع {idx + 2})</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="font-bold">إجمالي الصفحات: <strong className="text-amber-400 font-mono">{pages.length}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
