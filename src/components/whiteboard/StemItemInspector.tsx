import React from 'react';
import { 
  Trash2, 
  Copy, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Check, 
  Sliders, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  Flame,
  X
} from 'lucide-react';
import { StemItem } from '../../types/stemWhiteboard';

interface StemItemInspectorProps {
  item: StemItem;
  zoom: number;
  panOffset: { x: number; y: number };
  onUpdateItem: (updated: StemItem) => void;
  onDuplicateItem: (item: StemItem) => void;
  onDeleteItem: (id: string) => void;
  onClose: () => void;
}

export const StemItemInspector: React.FC<StemItemInspectorProps> = ({
  item,
  zoom,
  panOffset,
  onUpdateItem,
  onDuplicateItem,
  onDeleteItem,
  onClose
}) => {
  const { type, params } = item;

  // Calculate screen position anchored to the right of the item
  const screenLeft = item.x * zoom + panOffset.x + item.width * zoom + 16;
  const screenTop = item.y * zoom + panOffset.y;

  const handleParamChange = (key: string, value: any) => {
    onUpdateItem({
      ...item,
      params: {
        ...item.params,
        [key]: value
      }
    });
  };

  const colorPresets = [
    { name: 'أزرق', color: '#3b82f6', fill: '#dbeafe' },
    { name: 'أخضر', color: '#10b981', fill: '#d1fae5' },
    { name: 'بنفسجي', color: '#8b5cf6', fill: '#ede9fe' },
    { name: 'برتقالي', color: '#f59e0b', fill: '#fef3c7' },
    { name: 'وردي', color: '#ec4899', fill: '#fce7f3' },
    { name: 'تركواز', color: '#06b6d4', fill: '#cffafe' }
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        left: `${Math.max(16, screenLeft)}px`,
        top: `${Math.max(60, screenTop)}px`
      }}
      className="fixed z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-blue-500/40 rounded-2xl shadow-2xl p-4 text-white select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
          <h4 className="font-bold text-sm text-slate-100 font-sans">
            {item.label || (
              type.startsWith('physics') ? 'كتلة / أداة فيزيائية' :
              type.startsWith('circuit') ? 'عنصر دارة كهربائية' :
              type.startsWith('optics') ? 'أداة بصريات وضوء' :
              type.startsWith('chem') ? 'أداة معمل كيميائي' :
              'مجسم ثلاثي الأبعاد'
            )}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* ==========================================
            PHYSICS PARAMETERS: Mass & Velocity
        ========================================== */}
        {type === 'physics-mass' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span>الكتلة (Mass m):</span>
              <span className="font-mono font-bold text-blue-400">{params.mass || 5} kg</span>
            </div>
            
            {/* Quick Mass Choice Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 5, 10].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleParamChange('mass', m)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.mass === m 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {m} kg
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={params.mass || 5}
                onChange={(e) => handleParamChange('mass', parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {type === 'physics-cart' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>السرعة (Velocity v):</span>
              <span className="font-mono font-bold text-emerald-400">{params.velocity || 15} m/s</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 25].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleParamChange('velocity', v)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.velocity === v 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {v} m/s
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'physics-vector' && (
          <div className="space-y-2">
            <label className="text-slate-300 block">نص التسمية والقوة:</label>
            <input
              type="text"
              value={params.forceLabel || `F = ${params.force || 20} N`}
              onChange={(e) => handleParamChange('forceLabel', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-blue-500 outline-none"
            />
          </div>
        )}

        {type === 'physics-dimension' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>المسافة (Distance d):</span>
              <span className="font-mono font-bold text-blue-400">{params.distance || 10} {params.distanceUnit || 'm'}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 5, 10, 20].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleParamChange('distance', d)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.distance === d 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {d} m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            CIRCUIT PARAMETERS: Voltage & Resistance & State
        ========================================== */}
        {type === 'circuit-battery' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>القوة الدافعة (E / V):</span>
              <span className="font-mono font-bold text-rose-400">{params.voltage || 12} V</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1.5, 9, 12, 220].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleParamChange('voltage', v)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.voltage === v 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {v}V
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'circuit-resistor' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>المقاومة (Resistance R):</span>
              <span className="font-mono font-bold text-amber-400">{params.resistance || 5} Ω</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 100].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleParamChange('resistance', r)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.resistance === r 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r}Ω
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'circuit-switch' && (
          <button
            type="button"
            onClick={() => handleParamChange('isSwitchClosed', !params.isSwitchClosed)}
            className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              params.isSwitchClosed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Zap size={14} />
            <span>{params.isSwitchClosed ? 'المفتاح مغلق (ON - يمر تيار)' : 'المفتاح مفتوح (OFF - قاطع)'}</span>
          </button>
        )}

        {type === 'circuit-lamp' && (
          <button
            type="button"
            onClick={() => handleParamChange('isLampLit', !params.isLampLit)}
            className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              params.isLampLit
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Sparkles size={14} />
            <span>{params.isLampLit ? 'المصباح مضيء (Lit)' : 'المصباح مطفأ (Off)'}</span>
          </button>
        )}

        {/* ==========================================
            CHEMISTRY PARAMETERS: Liquid Level & Color
        ========================================== */}
        {(type === 'chem-beaker' || type === 'chem-flask' || type === 'chem-test-tube') && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>منسوب السائل:</span>
              <span className="font-mono font-bold text-cyan-400">{params.liquidVolume || 60}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={params.liquidVolume || 60}
              onChange={(e) => handleParamChange('liquidVolume', parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">لون المحلول:</span>
              <div className="flex gap-1.5">
                {['#38bdf8', '#c084fc', '#34d399', '#f87171', '#facc15'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleParamChange('liquidColor', c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      params.liquidColor === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            3D SHAPES PARAMETERS: Dimensions & Formulas
        ========================================== */}
        {type.endsWith('-3d') && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>البعد الرئيسي (Side / Radius):</span>
              <span className="font-mono font-bold text-indigo-400">{params.dimensionA || 5} cm</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[3, 5, 8, 10].map(dim => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => handleParamChange('dimensionA', dim)}
                  className={`py-1 rounded-lg font-mono font-bold text-center transition-all ${
                    params.dimensionA === dim 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {dim} cm
                </button>
              ))}
            </div>

            {params.volumeFormula && (
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] font-mono flex items-center justify-between">
                <span>قانون الحجم:</span>
                <span className="text-indigo-300 font-bold">{params.volumeFormula}</span>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            WAVES PARAMETERS: Amplitude & Wavelength
        ========================================== */}
        {(type === 'physics-wave-transverse' || type === 'physics-wave-longitudinal') && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-slate-300 text-xs">
              <span>الطول الموجي (λ):</span>
              <span className="font-mono font-bold text-blue-400">{params.wavelength || 80} px</span>
            </div>
            <input
              type="range"
              min="40"
              max="160"
              value={params.wavelength || 80}
              onChange={(e) => handleParamChange('wavelength', parseInt(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            {type === 'physics-wave-transverse' && (
              <>
                <div className="flex justify-between items-center text-slate-300 text-xs">
                  <span>سعة الموجة (A):</span>
                  <span className="font-mono font-bold text-amber-400">{params.amplitude || 35} px</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="65"
                  value={params.amplitude || 35}
                  onChange={(e) => handleParamChange('amplitude', parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </>
            )}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono">
              سرعة الموجة: v = λ × f
            </div>
          </div>
        )}

        {/* ==========================================
            CHEMISTRY: Bohr Atom Model Config
        ========================================== */}
        {type === 'chem-atom-bohr' && (
          <div className="space-y-2">
            <label className="text-slate-400 text-[11px] block">اختر العنصر الكيميائي:</label>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              {[
                { sym: 'H', name: 'هيدروجين', p: 1, shells: [1] },
                { sym: 'He', name: 'هيليوم', p: 2, shells: [2] },
                { sym: 'C', name: 'كربون', p: 6, shells: [2, 4] },
                { sym: 'N', name: 'نيتروجين', p: 7, shells: [2, 5] },
                { sym: 'O', name: 'أكسجين', p: 8, shells: [2, 6] },
                { sym: 'Na', name: 'صوديوم', p: 11, shells: [2, 8, 1] },
                { sym: 'Cl', name: 'كلور', p: 17, shells: [2, 8, 7] },
              ].map(el => (
                <button
                  key={el.sym}
                  type="button"
                  onClick={() => {
                    onUpdateItem({
                      ...item,
                      params: {
                        ...item.params,
                        elementSymbol: el.sym,
                        elementNameAr: el.name,
                        atomicNumber: el.p,
                        protons: el.p,
                        neutrons: el.p,
                        electrons: el.p,
                        electronShells: el.shells
                      }
                    });
                  }}
                  className={`py-1 rounded-lg border transition-all ${
                    params.elementSymbol === el.sym
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {el.sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            CHEMISTRY: pH Meter Slider
        ========================================== */}
        {type === 'chem-ph-meter' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-slate-300 text-xs">
              <span>قيمة الرقم الهيدروجيني:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">pH = {(params.phValue ?? 7).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="14"
              step="0.5"
              value={params.phValue ?? 7}
              onChange={(e) => handleParamChange('phValue', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span className="text-red-400">حمض (0-6)</span>
              <span className="text-emerald-400">تعادل (7)</span>
              <span className="text-purple-400">قاعدة (8-14)</span>
            </div>
          </div>
        )}

        {/* ==========================================
            CHEMISTRY: Thermometer Temperature Slider
        ========================================== */}
        {type === 'chem-thermometer' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-slate-300 text-xs">
              <span>درجة الحرارة المخبرية:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">{params.temperature ?? 37}°C</span>
            </div>
            <input
              type="range"
              min="-10"
              max="110"
              value={params.temperature ?? 37}
              onChange={(e) => handleParamChange('temperature', parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex gap-1.5">
              {[0, 25, 37, 78, 100].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleParamChange('temperature', t)}
                  className={`flex-1 py-0.5 text-[10px] rounded font-mono ${
                    params.temperature === t ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            BIOLOGY: Genetics Punnett & Organ Labels
        ========================================== */}
        {type === 'bio-genetics-punnett' && (
          <div className="space-y-2">
            <label className="text-slate-400 text-[11px] block">الأليلات الأبوية:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateItem({
                    ...item,
                    params: { ...item.params, alleleFather: ['B', 'b'], alleleMother: ['B', 'b'] }
                  });
                }}
                className="flex-1 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-bold"
              >
                Bb × Bb (هجين)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateItem({
                    ...item,
                    params: { ...item.params, alleleFather: ['B', 'B'], alleleMother: ['b', 'b'] }
                  });
                }}
                className="flex-1 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-bold"
              >
                BB × bb (نقي)
              </button>
            </div>
          </div>
        )}

        {/* Color Palette Selector */}
        <div className="pt-2 border-t border-slate-800">
          <label className="text-slate-400 text-[11px] block mb-1.5">سمة اللون والمظهر:</label>
          <div className="flex items-center gap-1.5 justify-between">
            {colorPresets.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  onUpdateItem({
                    ...item,
                    color: preset.color,
                    fillColor: preset.fill
                  });
                }}
                style={{ backgroundColor: preset.color }}
                className={`w-6 h-6 rounded-full border-2 transition-transform flex items-center justify-center ${
                  item.color === preset.color ? 'border-white scale-110 shadow-lg' : 'border-slate-800'
                }`}
                title={preset.name}
              >
                {item.color === preset.color && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Toolbar Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDuplicateItem(item)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="تكرار العنصر"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                const currentRot = item.rotation || 0;
                onUpdateItem({
                  ...item,
                  rotation: (currentRot + 90) % 360
                });
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="تدوير 90 درجة"
            >
              <RotateCw size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 transition-colors"
            title="حذف العنصر"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
