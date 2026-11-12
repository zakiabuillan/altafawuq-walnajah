import React, { useState, useRef, useEffect } from 'react';
import { 
  XournalTool, 
  PenThickness, 
  EraserType 
} from './types';
import { 
  Minus, 
  Plus,
  ArrowRight, 
  Square, 
  Circle, 
  Grid, 
  Layers, 
  Palette, 
  Sparkles,
  Zap,
  Brush,
  Sliders,
  ChevronDown,
  Check
} from 'lucide-react';

interface XournalSecondaryToolbarProps {
  activeTool: XournalTool;
  thickness: PenThickness;
  onSelectThickness: (thickness: PenThickness) => void;
  customWidth?: number;
  onSelectCustomWidth?: (width: number) => void;
  color: string;
  onSelectColor: (color: string) => void;
  eraserType: EraserType;
  onSelectEraserType: (type: EraserType) => void;
  highlighterMultiply: boolean;
  onToggleHighlighterMultiply: () => void;
  selectedShapeType: 'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes';
  onSelectShapeType: (shapeType: 'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes') => void;
}

const XOURNAL_PALETTE = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Gray', hex: '#4b5563' },
  { name: 'Light Gray', hex: '#9ca3af' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Magenta', hex: '#db2777' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Purple', hex: '#9333ea' }
];

const PRESET_THICKNESSES: { id: PenThickness; labelAr: string; labelEn: string; widthPx: number; dotSize: number }[] = [
  { id: 'very-fine', labelAr: 'دقيق جداً', labelEn: 'Fine 0.8', widthPx: 0.8, dotSize: 3 },
  { id: 'fine', labelAr: 'دقيق', labelEn: 'Fine', widthPx: 1.4, dotSize: 4 },
  { id: 'medium', labelAr: 'متوسط', labelEn: 'Medium', widthPx: 2.5, dotSize: 6 },
  { id: 'bold', labelAr: 'عريض', labelEn: 'Bold', widthPx: 4.5, dotSize: 8 },
  { id: 'marker', labelAr: 'ماركر', labelEn: 'Marker', widthPx: 8.5, dotSize: 11 },
  { id: 'heavy', labelAr: 'سميك', labelEn: 'Heavy', widthPx: 14.0, dotSize: 14 }
];

export const XournalSecondaryToolbar: React.FC<XournalSecondaryToolbarProps> = ({
  activeTool,
  thickness,
  onSelectThickness,
  customWidth = 2.5,
  onSelectCustomWidth,
  color,
  onSelectColor,
  eraserType,
  onSelectEraserType,
  highlighterMultiply,
  onToggleHighlighterMultiply,
  selectedShapeType,
  onSelectShapeType
}) => {
  const [showWidthPopover, setShowWidthPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute actual display width in pixels
  const getDisplayWidth = (): number => {
    if (thickness === 'custom' && customWidth) return customWidth;
    switch (thickness) {
      case 'very-fine': return 0.8;
      case 'fine': return 1.4;
      case 'medium': return 2.5;
      case 'bold': return 4.5;
      case 'marker': return 8.5;
      case 'heavy': return 14.0;
      default: return customWidth || 2.5;
    }
  };

  const effectiveWidth = getDisplayWidth();

  const handleSetCustomWidth = (w: number) => {
    const clamped = Math.max(0.5, Math.min(36, Math.round(w * 10) / 10));
    if (onSelectCustomWidth) onSelectCustomWidth(clamped);
    onSelectThickness('custom');
  };

  const handleStepWidth = (delta: number) => {
    handleSetCustomWidth(effectiveWidth + delta);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowWidthPopover(false);
      }
    };
    if (showWidthPopover) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showWidthPopover]);

  return (
    <div 
      className="bg-[#f2f2f2] border-b border-[#cccccc] px-2 py-1 flex items-center justify-between text-[#222222] select-none text-xs gap-2 flex-wrap min-h-[36px] shadow-xs"
      dir="ltr"
    >
      {activeTool === 'laser' && (
        <div className="flex items-center gap-2 bg-red-50 text-red-900 px-3 py-1 rounded-md text-[11px] font-bold border border-red-200 shadow-2xs">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          <span>وضع مؤشر الليزر (Laser Pointer) نشط: نقطة حمراء متوهجة وشعاع يتلاشى تلقائياً للشرح والتركيز دون ترك أثر على اللوحة</span>
        </div>
      )}
      <div className="flex items-center space-x-2 flex-wrap">
        {/* Thickness Selectors: Enhanced with Quick Presets, Sliders, Step Buttons and Live Preview */}
        <div className="flex items-center space-x-1.5 border-r border-[#d4d4d4] pr-2 shrink-0 relative">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">
              سمك الكتابة:
            </span>
          </div>

          {/* Stepper Down [-] */}
          <button
            type="button"
            onClick={() => handleStepWidth(-0.5)}
            disabled={effectiveWidth <= 0.6}
            className="w-5 h-5 rounded bg-white hover:bg-slate-200 border border-[#b8b8b8] disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer transition-all active:scale-95"
            title="تقليل سمك الكتابة بمقدار 0.5px"
          >
            <Minus size={11} />
          </button>

          {/* Interactive Width Badge & Slider Trigger */}
          <button
            type="button"
            onClick={() => setShowWidthPopover(!showWidthPopover)}
            className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer border ${
              showWidthPopover || thickness === 'custom'
                ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold shadow-xs'
                : 'bg-white hover:bg-[#e8e8e8] border-[#b0b0b0] text-slate-800'
            }`}
            title="انقر لتخصيص سمك الكتابة بمؤشر دقيق ومعاينة حية"
          >
            <Sliders size={12} className="text-amber-600 shrink-0" />
            <div 
              className="rounded-full shrink-0 border border-black/20"
              style={{ 
                width: `${Math.max(3, Math.min(14, effectiveWidth * 1.5))}px`,
                height: `${Math.max(3, Math.min(14, effectiveWidth * 1.5))}px`,
                backgroundColor: color === '#ffffff' ? '#334155' : color 
              }}
            />
            <span className="text-[11px] font-mono font-black">{effectiveWidth}px</span>
            <ChevronDown size={11} className={`text-slate-500 transition-transform ${showWidthPopover ? 'rotate-180' : ''}`} />
          </button>

          {/* Stepper Up [+] */}
          <button
            type="button"
            onClick={() => handleStepWidth(0.5)}
            disabled={effectiveWidth >= 35}
            className="w-5 h-5 rounded bg-white hover:bg-slate-200 border border-[#b8b8b8] disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer transition-all active:scale-95"
            title="زيادة سمك الكتابة بمقدار 0.5px"
          >
            <Plus size={11} />
          </button>

          {/* Quick Presets: Fine, Medium, Bold, Marker */}
          <div className="hidden sm:flex items-center space-x-1 ml-1">
            <button
              type="button"
              onClick={() => onSelectThickness('fine')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
                thickness === 'fine'
                  ? 'bg-white border border-[#888888] shadow-inner font-black text-blue-900 ring-1 ring-blue-500/50'
                  : 'hover:bg-[#e4e4e4] border border-transparent text-slate-700'
              }`}
              title="دقيق (Fine: 1.4px)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span className="text-[10px]">دقيق</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectThickness('medium')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
                thickness === 'medium'
                  ? 'bg-white border border-[#888888] shadow-inner font-black text-blue-900 ring-1 ring-blue-500/50'
                  : 'hover:bg-[#e4e4e4] border border-transparent text-slate-700'
              }`}
              title="متوسط (Medium: 2.5px)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <span className="text-[10px]">متوسط</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectThickness('bold')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
                thickness === 'bold'
                  ? 'bg-white border border-[#888888] shadow-inner font-black text-blue-900 ring-1 ring-blue-500/50'
                  : 'hover:bg-[#e4e4e4] border border-transparent text-slate-700'
              }`}
              title="عريض (Bold: 4.5px)"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-slate-800" />
              <span className="text-[10px]">عريض</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectThickness('marker')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
                thickness === 'marker'
                  ? 'bg-white border border-[#888888] shadow-inner font-black text-blue-900 ring-1 ring-blue-500/50'
                  : 'hover:bg-[#e4e4e4] border border-transparent text-slate-700'
              }`}
              title="ماركر (Marker: 8.5px)"
            >
              <span className="w-4 h-4 rounded-full bg-slate-800" />
              <span className="text-[10px]">ماركر</span>
            </button>
          </div>

          {/* Interactive Popover Menu for Exact Thickness Customization */}
          {showWidthPopover && (
            <div 
              ref={popoverRef}
              className="absolute top-full left-0 mt-2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl border-2 border-slate-700 p-3.5 w-76 sm:w-80 select-none animate-in fade-in zoom-in-95"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={15} className="text-amber-400" />
                  <span className="text-xs font-black text-white">تخصيص سُمك خط الكتابة:</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs shadow-xs">
                  {effectiveWidth} px
                </span>
              </div>

              {/* Real-time Visual Stroke Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1 min-h-[50px] mb-3">
                <span className="text-[9px] text-slate-400 font-bold self-start">معاينة حية لسماكة الخط باللون الحالي:</span>
                <div className="w-full flex items-center justify-center py-2">
                  <div 
                    className="w-full rounded-full transition-all duration-75 shadow-xs"
                    style={{ 
                      height: `${Math.max(1, effectiveWidth)}px`,
                      maxHeight: '36px',
                      backgroundColor: color === '#ffffff' ? '#e2e8f0' : color
                    }}
                  />
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>دقيق (0.5px)</span>
                  <span>متوسط (10px)</span>
                  <span>عريض جداً (30px)</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={effectiveWidth}
                  onChange={(e) => handleSetCustomWidth(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* Direct Quick Presets Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block">خيارات سريعة جاهزة:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_THICKNESSES.map(p => {
                    const isSelected = thickness === p.id || (thickness === 'custom' && Math.abs(effectiveWidth - p.widthPx) < 0.2);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectThickness(p.id);
                          if (onSelectCustomWidth) onSelectCustomWidth(p.widthPx);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="rounded-full" 
                            style={{ 
                              width: `${p.dotSize}px`, 
                              height: `${p.dotSize}px`,
                              backgroundColor: isSelected ? '#0f172a' : '#fbbf24'
                            }} 
                          />
                          <span>{p.labelAr}</span>
                        </div>
                        <span className="font-mono text-[9px] opacity-80">{p.widthPx}px</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Close button */}
              <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWidthPopover(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  تم الاعتماد ✓
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 12 Instant Palette Swatches + Custom Picker */}
        <div className="flex items-center space-x-1 border-r border-[#d4d4d4] pr-2 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
            Color:
          </span>

          <div className="flex items-center gap-1">
            {XOURNAL_PALETTE.map((swatch) => {
              const isSelected = color.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => onSelectColor(swatch.hex)}
                  className={`w-5 h-5 rounded-xs transition-transform cursor-pointer relative ${
                    isSelected ? 'scale-115 ring-2 ring-blue-600 z-10 shadow-xs' : 'hover:scale-110'
                  }`}
                  style={{ 
                    backgroundColor: swatch.hex,
                    border: swatch.hex === '#ffffff' ? '1px solid #c0c0c0' : '1px solid rgba(0,0,0,0.2)' 
                  }}
                  title={swatch.name}
                />
              );
            })}

            {/* Custom Color Picker input */}
            <label 
              className="w-5 h-5 rounded-xs border border-[#c0c0c0] flex items-center justify-center cursor-pointer hover:scale-110 ml-0.5 overflow-hidden shadow-xs"
              title="Custom Color..."
            >
              <input
                type="color"
                value={color}
                onChange={(e) => onSelectColor(e.target.value)}
                className="opacity-0 w-0 h-0 cursor-pointer"
              />
              <Palette size={12} className="text-slate-600" />
            </label>
          </div>
        </div>

        {/* Tool-Specific Options */}
        {activeTool === 'eraser' && (
          <div className="flex items-center space-x-1 border-r border-[#d4d4d4] pr-2 shrink-0 bg-amber-50 p-0.5 rounded border border-amber-200">
            <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider mr-1">
              Eraser Type:
            </span>
            <button
              type="button"
              onClick={() => onSelectEraserType('stroke')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                eraserType === 'stroke'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
              title="Stroke Eraser: Delete entire drawn paths on click or touch"
            >
              ⚡ Stroke Eraser
            </button>
            <button
              type="button"
              onClick={() => onSelectEraserType('standard')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                eraserType === 'standard'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
              title="Standard Eraser: Erase area under pointer"
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => onSelectEraserType('whiteout')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                eraserType === 'whiteout'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
              title="Whiteout: Paint over with white"
            >
              Whiteout
            </button>
          </div>
        )}

        {activeTool === 'highlighter' && (
          <div className="flex items-center space-x-1 border-r border-[#d4d4d4] pr-2 shrink-0">
            <button
              type="button"
              onClick={onToggleHighlighterMultiply}
              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                highlighterMultiply
                  ? 'bg-amber-300 text-slate-900 border border-amber-400 font-black'
                  : 'bg-white border border-[#cccccc] text-slate-700'
              }`}
              title="Highlighter Multiply Blending: Text underneath remains crisp and legible"
            >
              <Layers size={13} />
              <span>Multiply Blend (Translucent)</span>
            </button>
          </div>
        )}

        {/* Geometry Shapes Picker */}
        <div className="flex items-center space-x-1 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
            Shapes:
          </span>
          <button
            type="button"
            onClick={() => onSelectShapeType('line')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              selectedShapeType === 'line'
                ? 'bg-white border border-[#999999] text-blue-700 shadow-xs'
                : 'hover:bg-[#e4e4e4] text-slate-700'
            }`}
            title="Straight Line"
          >
            <Minus size={14} className="rotate-45" />
          </button>
          <button
            type="button"
            onClick={() => onSelectShapeType('arrow')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              selectedShapeType === 'arrow'
                ? 'bg-white border border-[#999999] text-blue-700 shadow-xs'
                : 'hover:bg-[#e4e4e4] text-slate-700'
            }`}
            title="Arrow"
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onSelectShapeType('rect')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              selectedShapeType === 'rect'
                ? 'bg-white border border-[#999999] text-blue-700 shadow-xs'
                : 'hover:bg-[#e4e4e4] text-slate-700'
            }`}
            title="Rectangle / Box"
          >
            <Square size={14} />
          </button>
          <button
            type="button"
            onClick={() => onSelectShapeType('ellipse')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              selectedShapeType === 'ellipse'
                ? 'bg-white border border-[#999999] text-blue-700 shadow-xs'
                : 'hover:bg-[#e4e4e4] text-slate-700'
            }`}
            title="Ellipse / Circle"
          >
            <Circle size={14} />
          </button>
          <button
            type="button"
            onClick={() => onSelectShapeType('coord-axes')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              selectedShapeType === 'coord-axes'
                ? 'bg-white border border-[#999999] text-blue-700 shadow-xs'
                : 'hover:bg-[#e4e4e4] text-slate-700'
            }`}
            title="Coordinate Cartesian Axes (X-Y)"
          >
            <Grid size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
