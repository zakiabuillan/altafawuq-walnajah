import React, { useState } from 'react';
import { 
  DocumentPage, 
  PageBackgroundStyle 
} from './types';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Grid, 
  List, 
  MoreVertical, 
  FileCheck,
  Sparkles,
  Layers,
  FilePlus
} from 'lucide-react';

interface XournalSidebarProps {
  pages: DocumentPage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onInsertPageAfter: (index: number, style?: PageBackgroundStyle) => void;
  onInsertPageBefore: (index: number, style?: PageBackgroundStyle) => void;
  onInsertPageBeside?: (index: number, style?: PageBackgroundStyle) => void;
  onInsertPageBelow?: (index: number, style?: PageBackgroundStyle) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onChangePageBackground: (index: number, style: PageBackgroundStyle) => void;
}

export const XournalSidebar: React.FC<XournalSidebarProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  onInsertPageAfter,
  onInsertPageBefore,
  onInsertPageBeside,
  onInsertPageBelow,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onChangePageBackground
}) => {
  const [activeContextMenu, setActiveContextMenu] = useState<number | null>(null);

  const getBackgroundName = (style?: PageBackgroundStyle) => {
    switch (style) {
      case 'ruled': return 'مسطر (دفتر)';
      case 'grid': return 'شبكة مربعات';
      case 'dotted': return 'نقاط نقطي';
      case 'plain': return 'أبيض ناصع';
      default: return 'افتراضي';
    }
  };

  return (
    <div 
      className="xournal-sidebar w-60 sm:w-64 bg-[#e6e6e6] border-r border-[#c4c4c4] flex flex-col h-full select-none text-slate-800 text-xs font-sans shrink-0 shadow-inner"
      dir="ltr"
    >
      {/* Sidebar Header */}
      <div className="p-2 border-b border-[#cccccc] bg-[#dcdcdc] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Layers size={14} className="text-blue-700" />
          <span className="text-[11px] uppercase tracking-wide">Pages ({pages.length})</span>
        </div>

        {/* Quick Add Blank Page Button After Current Page */}
        <button
          type="button"
          onClick={() => onInsertPageAfter(currentPageIndex, 'plain')}
          className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold shadow-2xs"
          title={`إدراج صفحة بيضاء جديدة فوراً بعد الصفحة المحددة حالياً (صفحة ${currentPageIndex + 1})`}
        >
          <FilePlus size={12} />
          <span>+ بعد الحالية</span>
        </button>
      </div>

      {/* Prominent Action Banner: Insert Blank Page Beside or Below Selected Page */}
      <div className="p-2 border-b border-[#cccccc] bg-[#f8fafc] flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center gap-1">
          {onInsertPageBeside && (
            <button
              type="button"
              id="sidebar-insert-blank-beside-btn"
              onClick={() => onInsertPageBeside(currentPageIndex, 'plain')}
              className="flex-1 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold rounded shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer text-[10px]"
              title={`إدراج صفحة بيضاء متطابقة الحجم بجانب الصفحة ${currentPageIndex + 1} (عرض جنباً إلى جنب)`}
            >
              <FilePlus size={12} strokeWidth={2.5} />
              <span>+ بجانبها 📑</span>
            </button>
          )}

          <button
            type="button"
            id="sidebar-insert-blank-below-btn"
            onClick={() => (onInsertPageBelow ? onInsertPageBelow(currentPageIndex, 'plain') : onInsertPageAfter(currentPageIndex, 'plain'))}
            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer text-[10px]"
            title={`إدراج صفحة بيضاء متطابقة الحجم تحت الصفحة ${currentPageIndex + 1}`}
          >
            <Plus size={12} />
            <span>+ تحتها ⬇️</span>
          </button>
        </div>
      </div>

      {/* Pages Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar">
        {pages.map((page, index) => {
          const isSelected = index === currentPageIndex;
          const isPdf = page.type === 'pdf';

          return (
            <div
              key={page.id || index}
              onClick={() => onSelectPage(index)}
              className={`group relative rounded-md border p-1.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/40 shadow-sm'
                  : 'bg-white border-[#c8c8c8] hover:border-slate-400 hover:shadow-xs'
              }`}
            >
              {/* Header: Page Number & Type Badge */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {index + 1}
                  </span>

                  {/* DISTINCT VISUAL BADGE DIFFERENTIATING IMPORTED PDF FROM USER-INSERTED BLANK PAGES */}
                  {isPdf ? (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 border border-blue-300 rounded text-[9px] font-bold flex items-center gap-0.5">
                      <FileCheck size={10} className="text-blue-600" />
                      <span>PDF ص {page.pdfPageIndex}</span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold flex items-center gap-0.5">
                      <Sparkles size={10} className="text-emerald-600" />
                      <span>مُدرجة ديناميكياً</span>
                    </span>
                  )}
                </div>

                {/* Context Menu Toggle Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveContextMenu(activeContextMenu === index ? null : index);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                    title="Page Actions"
                  >
                    <MoreVertical size={12} />
                  </button>

                  {/* Context Menu Dropdown */}
                  {activeContextMenu === index && (
                    <div 
                      className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-300 shadow-xl rounded-md py-1 z-50 text-[11px] text-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onInsertPageBeside && (
                        <button
                          type="button"
                          onClick={() => {
                            onInsertPageBeside(index, 'plain');
                            setActiveContextMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-teal-50 text-teal-900 flex items-center gap-2 cursor-pointer font-bold border-b border-slate-100"
                        >
                          <FilePlus size={12} className="text-teal-600" />
                          <span>إدراج صفحة بيضاء بجانبها 📑</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (onInsertPageBelow) onInsertPageBelow(index, 'plain');
                          else onInsertPageAfter(index, 'plain');
                          setActiveContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-900 flex items-center gap-2 cursor-pointer font-bold"
                      >
                        <FilePlus size={12} className="text-emerald-600" />
                        <span>إدراج صفحة بيضاء تحتها ⬇️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onInsertPageBefore(index, 'plain');
                          setActiveContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                      >
                        <Plus size={12} className="text-blue-600" />
                        <span>إدراج صفحة بيضاء قبلها (Insert Before)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDuplicatePage(index);
                          setActiveContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>Duplicate Page</span>
                      </button>

                      {/* Move Up/Down */}
                      <div className="my-1 border-t border-slate-150" />
                      <button
                        type="button"
                        disabled={index <= 0}
                        onClick={() => {
                          onMovePage(index, index - 1);
                          setActiveContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <ArrowUp size={12} />
                        <span>Move Page Up</span>
                      </button>
                      <button
                        type="button"
                        disabled={index >= pages.length - 1}
                        onClick={() => {
                          onMovePage(index, index + 1);
                          setActiveContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <ArrowDown size={12} />
                        <span>Move Page Down</span>
                      </button>

                      {/* If Blank, Background Selector */}
                      {!isPdf && (
                        <>
                          <div className="my-1 border-t border-slate-150" />
                          <div className="px-3 py-0.5 text-[9px] font-black text-slate-400 uppercase">
                            Background
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onChangePageBackground(index, 'ruled');
                              setActiveContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 text-[10px] cursor-pointer"
                          >
                            Ruled / Lined Paper
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onChangePageBackground(index, 'grid');
                              setActiveContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 text-[10px] cursor-pointer"
                          >
                            Grid Paper
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onChangePageBackground(index, 'plain');
                              setActiveContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 text-[10px] cursor-pointer"
                          >
                            Plain White
                          </button>
                        </>
                      )}

                      {/* Delete Page */}
                      {pages.length > 1 && (
                        <>
                          <div className="my-1 border-t border-slate-150" />
                          <button
                            type="button"
                            onClick={() => {
                              onDeletePage(index);
                              setActiveContextMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Delete Page</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Page Thumbnail Miniature Canvas/Image Preview */}
              <div 
                className="w-full h-28 bg-white border border-slate-200 rounded relative overflow-hidden flex items-center justify-center shadow-2xs"
                style={{
                  backgroundImage: !isPdf && page.backgroundStyle === 'ruled'
                    ? 'repeating-linear-gradient(transparent, transparent 11px, #e2e8f0 12px)'
                    : !isPdf && page.backgroundStyle === 'grid'
                    ? 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)'
                    : 'none',
                  backgroundSize: !isPdf && page.backgroundStyle === 'grid' ? '8px 8px' : 'auto'
                }}
              >
                {/* If PDF and has background image */}
                {isPdf && page.pdfDataUrl ? (
                  <img 
                    src={page.pdfDataUrl} 
                    alt={`Page ${index + 1}`} 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                ) : (
                  <div className="p-2 text-center text-slate-400 select-none">
                    {isPdf ? (
                      <span className="text-[10px] font-bold text-blue-600 block">PDF Page #{page.pdfPageIndex}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        {getBackgroundName(page.backgroundStyle)}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {page.strokes.length} strokes • {page.textAnnotations.length} texts
                    </span>
                  </div>
                )}

                {/* Ink annotation indicator badge */}
                {(page.strokes.length > 0 || page.textAnnotations.length > 0) && (
                  <div className="absolute bottom-1 right-1 bg-slate-900/80 text-amber-300 font-mono text-[8px] font-black px-1.5 py-0.2 rounded-full">
                    ✏️ {page.strokes.length}
                  </div>
                )}
              </div>

              {/* Quick Actions: Insert Blank Page Beside (Side-by-Side) or After/Below */}
              <div className="flex flex-col gap-1 w-full mt-0.5">
                {onInsertPageBeside && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsertPageBeside(index, 'plain');
                    }}
                    className={`w-full py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white shadow-2xs' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                    title={`إدراج صفحة بيضاء بجانب الصفحة ${index + 1} وتفعيل نمط العرض جنباً إلى جنب (Side-by-Side) فوراً`}
                  >
                    <Plus size={11} className="stroke-[2.5]" />
                    <span>+ صفحة بيضاء بجانبها 📑</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInsertPageBelow) onInsertPageBelow(index, 'plain');
                    else onInsertPageAfter(index, 'plain');
                  }}
                  className="w-full py-0.5 px-1.5 rounded text-[9px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title={`إدراج صفحة بيضاء متطابقة الحجم تحت الصفحة ${index + 1}`}
                >
                  <ArrowDown size={10} />
                  <span>+ صفحة بيضاء تحتها ⬇️</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer with Insertion Helpers */}
      <div className="p-2 border-t border-[#cccccc] bg-[#dcdcdc] space-y-1.5">
        <button
          type="button"
          onClick={() => onInsertPageAfter(currentPageIndex, 'plain')}
          className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          title={`إدراج صفحة بيضاء جديدة فوراً بعد الصفحة المحددة حالياً (صفحة ${currentPageIndex + 1})`}
        >
          <FilePlus size={13} className="stroke-[2.5]" />
          <span>+ إدراج صفحة بيضاء بعد المحددة (صـ {currentPageIndex + 1})</span>
        </button>

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => onInsertPageBefore(currentPageIndex, 'plain')}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1"
            title="إدراج صفحة بيضاء قبل الصفحة الحالية"
          >
            <Plus size={10} className="text-blue-600" />
            <span>قبل المحددة</span>
          </button>
          <button
            type="button"
            onClick={() => onInsertPageAfter(pages.length - 1, 'plain')}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1"
            title="إضافة صفحة بيضاء في نهاية المستند"
          >
            <Plus size={10} className="text-slate-600" />
            <span>في النهاية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
