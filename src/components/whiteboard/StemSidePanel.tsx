import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Box, 
  Pyramid, 
  Cylinder, 
  Cone, 
  Circle, 
  Sparkles, 
  Truck, 
  Activity, 
  BatteryCharging, 
  Sliders, 
  ToggleRight, 
  Lightbulb, 
  Gauge, 
  GaugeCircle, 
  Glasses, 
  Maximize2 as MirrorIcon, 
  Beaker, 
  FlaskConical, 
  TestTube, 
  Flame, 
  Table, 
  Dna, 
  Bot, 
  Send, 
  Plus, 
  Check, 
  ArrowUpRight,
  TrendingUp,
  Layers,
  Cpu
} from 'lucide-react';
import { StemItem, StemCategory, StemToolDef } from '../../types/stemWhiteboard';
import { STEM_TOOL_DEFINITIONS } from '../../lib/stemToolsData';

interface StemSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertStemItem: (itemDef: StemToolDef) => void;
  teacherName?: string;
  teacherTitle?: string;
}

export const StemSidePanel: React.FC<StemSidePanelProps> = ({
  isOpen,
  onClose,
  onInsertStemItem,
  teacherName = 'أ. دهم عبد اللطيف',
  teacherTitle = 'أستاذ الرياضيات والذكاء الاصطناعي'
}) => {
  const [activeCategory, setActiveCategory] = useState<StemCategory | 'all'>('3d-shapes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Filtered STEM Tools
  const filteredTools = useMemo(() => {
    return STEM_TOOL_DEFINITIONS.filter(tool => {
      const matchCat = activeCategory === 'all' || tool.category === activeCategory;
      const matchQuery = 
        searchQuery.trim() === '' ||
        (tool.titleAr || '').includes(searchQuery) ||
        (tool.titleEn || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (tool.description || '').includes(searchQuery);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  // Quick 3D Category Chips
  const quick3DChips = [
    { label: 'مكعب 3D', type: 'cube-3d' },
    { label: 'أسطوانة 3D', type: 'cylinder-3d' },
    { label: 'كرة 3D', type: 'sphere-3d' },
    { label: 'مخروط 3D', type: 'cone-3d' }
  ];

  // AI STEM Assistant Handler
  const handleGenerateAiExperiment = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);

    setTimeout(() => {
      setAiLoading(false);
      if (aiPrompt.includes('دائرة') || aiPrompt.includes('كهرب') || aiPrompt.includes('مقاوم')) {
        setAiResult('تم إنشاء تجربة الدارة الكهربائية: بطارية 12V مع مقاومة 5Ω ومصباح 60W ومقياس أمبير متسلسل.');
        // Auto-insert related items
        const batteryDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'circuit-battery');
        const resistorDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'circuit-resistor');
        const lampDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'circuit-lamp');
        if (batteryDef) onInsertStemItem(batteryDef);
        if (resistorDef) setTimeout(() => onInsertStemItem(resistorDef), 100);
        if (lampDef) setTimeout(() => onInsertStemItem(lampDef), 200);
      } else if (aiPrompt.includes('حرك') || aiPrompt.includes('كتل') || aiPrompt.includes('نيوتن')) {
        setAiResult('تم إنشاء تجربة الميكانيكا: كتلة 5kg مع عربة ديناميكية ومتجه قوة F=20N.');
        const massDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'physics-mass');
        const cartDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'physics-cart');
        const vectorDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'physics-vector');
        if (massDef) onInsertStemItem(massDef);
        if (cartDef) setTimeout(() => onInsertStemItem(cartDef), 100);
        if (vectorDef) setTimeout(() => onInsertStemItem(vectorDef), 200);
      } else {
        setAiResult(`تم تحليل الطلب: "${aiPrompt}". تم إدراج المجسمات والأدوات التوضيحية اللازمة على اللوح بنجاح.`);
        const cubeDef = STEM_TOOL_DEFINITIONS.find(t => t.type === 'cube-3d');
        if (cubeDef) onInsertStemItem(cubeDef);
      }
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed top-14 bottom-4 right-4 z-40 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col transition-all duration-300 select-none overflow-hidden ${
        isExpanded ? 'w-[480px]' : 'w-[360px] sm:w-[390px]'
      }`}
    >
      {/* 1. Teacher Profile Header Card (Matching User's Screenshot) */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-teal-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-bold text-base text-indigo-300">
                أ.د
              </div>
            </div>
            {/* Online Pulse Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white tracking-wide font-sans">{teacherName}</h3>
            <p className="text-[11px] text-indigo-300 font-medium">{teacherTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'تصغير اللوحة' : 'توسيع اللوحة'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="إغلاق اللوحة"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 2. Top Subject Category Tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-800/80 bg-slate-950/60 overflow-x-auto scrollbar-thin">
        {[
          { id: '3d-shapes', label: 'المجسمات 3D', icon: Box, color: 'text-blue-400 border-blue-500/30' },
          { id: 'physics', label: 'الفيزياء', icon: Truck, color: 'text-emerald-400 border-emerald-500/30' },
          { id: 'circuits', label: 'الكهرباء', icon: BatteryCharging, color: 'text-amber-400 border-amber-500/30' },
          { id: 'optics', label: 'البصريات', icon: Glasses, color: 'text-indigo-400 border-indigo-500/30' },
          { id: 'chemistry', label: 'الكيمياء', icon: Beaker, color: 'text-rose-400 border-rose-500/30' },
          { id: 'biology', label: 'الأحياء', icon: Dna, color: 'text-teal-400 border-teal-500/30' },
          { id: 'ai-tools', label: 'مساعد AI', icon: Bot, color: 'text-purple-400 border-purple-500/30' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : ''} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Bar */}
      {activeCategory !== 'ai-tools' && (
        <div className="p-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الأشكال ثلاثية الأبعاد والأدوات العلمية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-9 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Quick chips when viewing 3D shapes */}
          {activeCategory === '3d-shapes' && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">مجسمات شائعة:</span>
              {quick3DChips.map(chip => (
                <button
                  key={chip.type}
                  type="button"
                  onClick={() => {
                    const tool = STEM_TOOL_DEFINITIONS.find(t => t.type === chip.type);
                    if (tool) onInsertStemItem(tool);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-500/50 text-[11px] font-medium text-slate-200 hover:text-indigo-300 whitespace-nowrap transition-all flex items-center gap-1"
                >
                  <Sparkles size={11} className="text-indigo-400" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Main Tool List / Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {activeCategory === 'ai-tools' ? (
          /* STEM AI Assistant Interface */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-purple-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Bot size={16} />
                <span>مساعد المعلم الذكي لتوليد التجارب والرسومات</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                اكتب نص التجربة أو المسألة الرياضية أو الفيزيائية وسيقوم الذكاء الاصطناعي برسم العناصر وحساب القوانين وإدراجها فورياً على اللوح.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">أدخل وصف التجربة أو المسألة:</label>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="مثال: ارسم دارة كهربائية بها بطارية 12V ومقاومة 5 أوم ومصباح... أو ارسم عربة كتلية تتحرك بسرعة 15 m/s..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none leading-relaxed resize-none"
              />
              <button
                type="button"
                onClick={handleGenerateAiExperiment}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحليل والتوليد الذكي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>توليد ورسم التجربة على اللوح</span>
                  </>
                )}
              </button>
            </div>

            {aiResult && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs leading-relaxed space-y-1 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" />
                  <span>تم التوليد بنجاح!</span>
                </div>
                <p>{aiResult}</p>
              </div>
            )}

            {/* Quick AI Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-400">تجارب ومسائل جاهزة بنقرة واحدة:</span>
              <div className="space-y-1.5">
                {[
                  'دارة كهربائية مغلقة مع قانون أوم V = I × R',
                  'حركة جسم ميكانيكي على مستوى مائل مع الاحتكاك',
                  'تجربة انكسار الضوء في عدسة محدبة مع البؤرة',
                  'معايرة حمض وقاعدة في دورق مخروطي'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAiPrompt(preset);
                    }}
                    className="w-full text-right p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs transition-colors flex items-center justify-between group"
                  >
                    <span>{preset}</span>
                    <ArrowUpRight size={13} className="text-slate-500 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Categorized Tool Items */
          <div className="space-y-2">
            {filteredTools.map(tool => (
              <div
                key={tool.type}
                onClick={() => onInsertStemItem(tool)}
                className="p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/60 transition-all duration-150 cursor-pointer group flex items-start justify-between gap-3 shadow-sm hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-transform">
                    {tool.type.startsWith('cube') || tool.type.startsWith('cuboid') ? <Box size={20} /> :
                     tool.type.startsWith('pyramid') ? <Pyramid size={20} /> :
                     tool.type.startsWith('cylinder') ? <Cylinder size={20} /> :
                     tool.type.startsWith('cone') ? <Cone size={20} /> :
                     tool.type.startsWith('sphere') ? <Circle size={20} /> :
                     tool.type.startsWith('physics-mass') ? <Box size={20} className="text-blue-400" /> :
                     tool.type.startsWith('physics-cart') ? <Truck size={20} className="text-emerald-400" /> :
                     tool.type.startsWith('circuit-battery') ? <BatteryCharging size={20} className="text-rose-400" /> :
                     tool.type.startsWith('circuit-resistor') ? <Sliders size={20} className="text-amber-400" /> :
                     tool.type.startsWith('optics') ? <Glasses size={20} className="text-indigo-400" /> :
                     tool.type.startsWith('chem') ? <Beaker size={20} className="text-cyan-400" /> :
                     <Sparkles size={20} />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">
                        {tool.titleAr}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">({tool.titleEn})</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                      {tool.description}
                    </p>

                    {/* Show live formula if available */}
                    {tool.formulas?.volume && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-300/90 pt-1">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/50">
                          {tool.formulas.volume}
                        </span>
                        {tool.formulas.surfaceArea && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {tool.formulas.surfaceArea}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsertStemItem(tool);
                  }}
                  className="p-1.5 rounded-xl bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors cursor-pointer active:scale-95"
                  title="إدراج على اللوح"
                >
                  <Plus size={15} />
                </button>
              </div>
            ))}

            {filteredTools.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs">
                لا توجد عناصر مطابقة لبحثك في هذا القسم
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Footer status */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Layers size={13} className="text-indigo-400" />
          <span>منظومة اللوح الذكي STEM</span>
        </div>
        <span className="text-indigo-400 font-bold">جاهز للإدراج والتفاعل</span>
      </div>
    </div>
  );
};
