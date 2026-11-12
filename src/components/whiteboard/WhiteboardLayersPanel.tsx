import React, { useState } from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  FileText, 
  Pencil, 
  Type, 
  Image as ImageIcon, 
  Grid, 
  Trash2, 
  Sliders, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { WhiteboardPage, WhiteboardBackgroundType } from '../../types/whiteboard';

interface WhiteboardLayersPanelProps {
  page: WhiteboardPage;
  onUpdatePageLayer: (updates: Partial<WhiteboardPage>) => void;
  onClearAnnotationsOnly?: () => void;
  onClearBackgroundDocument?: () => void;
  hasPdfBackground: boolean;
  strokesCount: number;
  textItemsCount: number;
  imageItemsCount: number;
  onClose?: () => void;
  isCompact?: boolean;
}

export const WhiteboardLayersPanel: React.FC<WhiteboardLayersPanelProps> = ({
  page,
  onUpdatePageLayer,
  onClearAnnotationsOnly,
  onClearBackgroundDocument,
  hasPdfBackground,
  strokesCount,
  textItemsCount,
  imageItemsCount,
  onClose,
  isCompact = false
}) => {
  const [expandedOpacityLayer, setExpandedOpacityLayer] = useState<string | null>(null);

  const showBackgroundTemplate = page.showBackgroundTemplate !== false;
  const showPdfBackground = page.showPdfBackground !== false;
  const showAnnotations = page.showAnnotations !== false;
  const showTextItems = page.showTextItems !== false;
  const showImageItems = page.showImageItems !== false;

  const isPdfLocked = page.isPdfLocked !== false;
  const isAnnotationsLocked = !!page.isAnnotationsLocked;

  const bgTemplateOpacity = page.backgroundTemplateOpacity ?? 1;
  const pdfBgOpacity = page.pdfBackgroundOpacity ?? 1;
  const annotationsOpacity = page.annotationsOpacity ?? 1;
  const textItemsOpacity = page.textItemsOpacity ?? 1;
  const imageItemsOpacity = page.imageItemsOpacity ?? 1;

  // Toggle all layers visible
  const handleShowAllLayers = () => {
    onUpdatePageLayer({
      showBackgroundTemplate: true,
      showPdfBackground: true,
      showAnnotations: true,
      showTextItems: true,
      showImageItems: true,
      backgroundTemplateOpacity: 1,
      pdfBackgroundOpacity: 1,
      annotationsOpacity: 1,
      textItemsOpacity: 1,
      imageItemsOpacity: 1
    });
  };

  // Test Mode: Hide annotations to ask students questions
  const handleToggleStudentQuestionMode = () => {
    const areAnnotationsVisible = showAnnotations;
    onUpdatePageLayer({
      showAnnotations: !areAnnotationsVisible,
      showTextItems: !areAnnotationsVisible
    });
  };

  return (
    <div 
      className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 rounded-3xl shadow-2xl p-3.5 sm:p-4 text-white w-84 sm:w-92 z-50 animate-in fade-in zoom-in-95 space-y-3 font-sans select-none"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
            <Layers size={17} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">إدارة طبقات الصفحة المستقلة</h3>
            <p className="text-[10px] text-slate-400">تحكم بظهور القوالب، المستندات والتعليقات</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick Action Presets */}
      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={handleShowAllLayers}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold border border-slate-700/80 transition-all cursor-pointer"
          title="إظهار كافة الطبقات واستعادة الشفافية 100%"
        >
          <RotateCcw size={12} className="text-emerald-400" />
          <span>إظهار الكل (100%)</span>
        </button>

        <button
          type="button"
          onClick={handleToggleStudentQuestionMode}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
            !showAnnotations 
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}
          title="إخفاء التعليقات والحلول لاختبار الطلاب وطرح الأسئلة"
        >
          <EyeOff size={12} className={!showAnnotations ? 'text-slate-950' : 'text-amber-400'} />
          <span>وضع الاختبار (إخفاء الحل)</span>
        </button>
      </div>

      {/* Layer Stack (Rendered in Visual Z-Order from Top to Bottom) */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">

        {/* LAYER 1: Annotations & Freehand Ink (Top Layer) */}
        <div className={`p-2.5 rounded-2xl border transition-all ${
          showAnnotations 
            ? 'bg-slate-950/80 border-slate-800/90' 
            : 'bg-slate-950/40 border-rose-900/30 opacity-70'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Pencil size={15} />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-100">طبقة التعليقات والرسم (Ink)</span>
                  <span className="text-[10px] font-mono font-bold bg-indigo-950/70 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800/50">
                    {strokesCount}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {showAnnotations ? `الشفافية: ${Math.round(annotationsOpacity * 100)}%` : 'مخفية مؤقتاً'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpandedOpacityLayer(expandedOpacityLayer === 'annotations' ? null : 'annotations')}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  expandedOpacityLayer === 'annotations'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="تعديل نسبة الشفافية"
              >
                <Sliders size={13} />
              </button>

              <button
                type="button"
                onClick={() => onUpdatePageLayer({ isAnnotationsLocked: !isAnnotationsLocked })}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isAnnotationsLocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isAnnotationsLocked ? 'التعليقات مقفلة ومحمية من المسح' : 'قفل طبقة التعليقات لمنع التعديل'}
              >
                {isAnnotationsLocked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>

              <button
                type="button"
                onClick={() => onUpdatePageLayer({ showAnnotations: !showAnnotations })}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  showAnnotations
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
                title={showAnnotations ? 'إخفاء طبقة التعليقات' : 'إظهار طبقة التعليقات'}
              >
                {showAnnotations ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          </div>

          {/* Expanded Opacity Slider */}
          {expandedOpacityLayer === 'annotations' && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">شفافية خطوط الرسم:</span>
                <span className="font-mono font-bold text-indigo-300">{Math.round(annotationsOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={annotationsOpacity}
                onChange={(e) => onUpdatePageLayer({ annotationsOpacity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>
          )}

          {/* Quick Clear Ink Only Button */}
          {onClearAnnotationsOnly && strokesCount > 0 && showAnnotations && (
            <button
              type="button"
              onClick={onClearAnnotationsOnly}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
            >
              <Trash2 size={11} />
              <span>مسح الرسومات والحلول فقط</span>
            </button>
          )}
        </div>

        {/* LAYER 2: Text Items & Sticky Notes */}
        {textItemsCount > 0 && (
          <div className={`p-2.5 rounded-2xl border transition-all ${
            showTextItems 
              ? 'bg-slate-950/80 border-slate-800/90' 
              : 'bg-slate-950/40 border-rose-900/30 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                  <Type size={15} />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-100">طبقة النصوص والبطاقات</span>
                    <span className="text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800/50">
                      {textItemsCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {showTextItems ? `الشفافية: ${Math.round(textItemsOpacity * 100)}%` : 'مخفية'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpandedOpacityLayer(expandedOpacityLayer === 'text' ? null : 'text')}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    expandedOpacityLayer === 'text'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="تعديل نسبة الشفافية"
                >
                  <Sliders size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePageLayer({ showTextItems: !showTextItems })}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showTextItems
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                  title={showTextItems ? 'إخفاء النصوص والملاحظات' : 'إظهار النصوص'}
                >
                  {showTextItems ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </div>
            </div>

            {expandedOpacityLayer === 'text' && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">شفافية النصوص:</span>
                  <span className="font-mono font-bold text-amber-300">{Math.round(textItemsOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={textItemsOpacity}
                  onChange={(e) => onUpdatePageLayer({ textItemsOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* LAYER 3: Educational Images & Diagrams */}
        {imageItemsCount > 0 && (
          <div className={`p-2.5 rounded-2xl border transition-all ${
            showImageItems 
              ? 'bg-slate-950/80 border-slate-800/90' 
              : 'bg-slate-950/40 border-rose-900/30 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                  <ImageIcon size={15} />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-100">طبقة الصور والمخططات</span>
                    <span className="text-[10px] font-mono font-bold bg-sky-950/70 text-sky-300 px-1.5 py-0.2 rounded border border-sky-800/50">
                      {imageItemsCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {showImageItems ? `الشفافية: ${Math.round(imageItemsOpacity * 100)}%` : 'مخفية'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpandedOpacityLayer(expandedOpacityLayer === 'images' ? null : 'images')}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    expandedOpacityLayer === 'images'
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="تعديل نسبة الشفافية"
                >
                  <Sliders size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePageLayer({ showImageItems: !showImageItems })}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showImageItems
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                  title={showImageItems ? 'إخفاء الصور' : 'إظهار الصور'}
                >
                  {showImageItems ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </div>
            </div>

            {expandedOpacityLayer === 'images' && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">شفافية الصور والمخططات:</span>
                  <span className="font-mono font-bold text-sky-300">{Math.round(imageItemsOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={imageItemsOpacity}
                  onChange={(e) => onUpdatePageLayer({ imageItemsOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* LAYER 4: Background Document / PDF Worksheet */}
        {hasPdfBackground && (
          <div className={`p-2.5 rounded-2xl border transition-all ${
            showPdfBackground 
              ? 'bg-slate-950/80 border-slate-800/90' 
              : 'bg-slate-950/40 border-rose-900/30 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                  <FileText size={15} />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-100">طبقة مستند الـ PDF الأصلي</span>
                    {page.pdfPageNumber && (
                      <span className="text-[10px] font-mono font-bold bg-rose-950/70 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800/50">
                        صـ {page.pdfPageNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {showPdfBackground ? `الشفافية: ${Math.round(pdfBgOpacity * 100)}%` : 'مخفي مؤقتاً'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpandedOpacityLayer(expandedOpacityLayer === 'pdf' ? null : 'pdf')}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    expandedOpacityLayer === 'pdf'
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="تعديل شفافية ورقة العمل"
                >
                  <Sliders size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePageLayer({ isPdfLocked: !isPdfLocked })}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isPdfLocked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title={isPdfLocked ? 'المستند مقفل ومحمي' : 'قفل المستند لمنع الإزاحة'}
                >
                  {isPdfLocked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePageLayer({ showPdfBackground: !showPdfBackground })}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showPdfBackground
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                  title={showPdfBackground ? 'إخفاء صفحة الـ PDF' : 'إظهار صفحة الـ PDF'}
                >
                  {showPdfBackground ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </div>
            </div>

            {expandedOpacityLayer === 'pdf' && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">شفافية المستند:</span>
                  <span className="font-mono font-bold text-rose-300">{Math.round(pdfBgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={pdfBgOpacity}
                  onChange={(e) => onUpdatePageLayer({ pdfBackgroundOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-rose-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            )}

            {onClearBackgroundDocument && (
              <button
                type="button"
                onClick={onClearBackgroundDocument}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
              >
                <span>إزالة خلفية الـ PDF والتحويل للوح عادي</span>
              </button>
            )}
          </div>
        )}

        {/* LAYER 5: Background Template & Grid (Base Ground Layer) */}
        <div className={`p-2.5 rounded-2xl border transition-all ${
          showBackgroundTemplate 
            ? 'bg-slate-950/80 border-slate-800/90' 
            : 'bg-slate-950/40 border-slate-800/40 opacity-70'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Grid size={15} />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-100">قالب وشبكة خلفية السبورة</span>
                  <span className="text-[10px] font-bold bg-slate-800 text-emerald-300 px-1.5 py-0.2 rounded border border-slate-700">
                    {page.backgroundType || 'بيضاء'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {showBackgroundTemplate ? `الشفافية: ${Math.round(bgTemplateOpacity * 100)}%` : 'قالب مخفي (لوح فارغ نقي)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpandedOpacityLayer(expandedOpacityLayer === 'bg_template' ? null : 'bg_template')}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  expandedOpacityLayer === 'bg_template'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="تعديل شفافية شبكة القالب"
              >
                <Sliders size={13} />
              </button>

              <button
                type="button"
                onClick={() => onUpdatePageLayer({ showBackgroundTemplate: !showBackgroundTemplate })}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  showBackgroundTemplate
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
                title={showBackgroundTemplate ? 'إخفاء قالب وخلفية السبورة' : 'إظهار قالب السبورة'}
              >
                {showBackgroundTemplate ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          </div>

          {expandedOpacityLayer === 'bg_template' && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">شفافية خطوط القالب:</span>
                <span className="font-mono font-bold text-emerald-300">{Math.round(bgTemplateOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={bgTemplateOpacity}
                onChange={(e) => onUpdatePageLayer({ backgroundTemplateOpacity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>
          )}
        </div>

      </div>

      {/* Layer Visibility Summary / Tips */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-slate-300">
          <Sparkles size={11} className="text-amber-400" />
          <span>كل طبقة مستقلة تماماً عن الأخرى</span>
        </span>
        <span className="font-mono text-indigo-300">
          {[showBackgroundTemplate, showPdfBackground, showAnnotations, showTextItems, showImageItems].filter(Boolean).length} / 5 مفعّلة
        </span>
      </div>
    </div>
  );
};
