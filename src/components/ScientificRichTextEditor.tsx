import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, AlignRight, AlignCenter, AlignLeft, 
  Sparkles, Save, Eye, Edit3, Trash2, HelpCircle, ArrowRight, ArrowLeft, 
  BookOpen, Plus, FileText, Check, ChevronDown, RefreshCw, Layers
} from 'lucide-react';
import { MathJaxSection } from './MathJaxSection';

// Custom interface for the Scientific Editor
interface ScientificRichTextEditorProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onCancel?: () => void;
  title?: string;
  placeholder?: string;
}

export const ScientificRichTextEditor: React.FC<ScientificRichTextEditorProps> = ({
  initialValue,
  onSave,
  onCancel,
  title = "محرر الأكاديمية العلمي المطور 🎓",
  placeholder = "اكتب هنا... يمكنك استخدام أشرطة التنسيق ولوحة الرموز المرفقة لإدراج المعادلات الرياضية والصيغ الكيميائية والرموز."
}) => {
  const [content, setContent] = useState(initialValue);
  const [isPreview, setIsPreview] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'math' | 'chem' | 'greek' | 'templates'>('math');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal / Prompt State for advanced components
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: 'fraction' | 'power' | 'subscript' | 'root' | 'log';
    fields: { label: string; key: string; placeholder: string; value: string }[];
    title: string;
    description: string;
  } | null>(null);

  // Auto-sync content with initialValue if it changes externally
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  // Handle document helper function for cursor-based text insertion
  const insertText = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + " " + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const before = currentText.substring(0, start);
    const after = currentText.substring(end, currentText.length);

    const newValue = before + textToInsert + after;
    setContent(newValue);

    // Focus back on textarea and position cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Wrap selected text or insert formatting tags
  const applyFormatting = (format: 'bold' | 'italic' | 'underline' | 'strike' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numeric' | 'quote' | 'table') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selection = currentText.substring(start, end);

    let prefix = '';
    let suffix = '';
    let defaultText = '';

    switch (format) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        defaultText = 'نص عريض';
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        defaultText = 'نص مائل';
        break;
      case 'underline':
        prefix = '<u>';
        suffix = '</u>';
        defaultText = 'نص مسطر';
        break;
      case 'strike':
        prefix = '~~';
        suffix = '~~';
        defaultText = 'نص يتوسطه خط';
        break;
      case 'h1':
        prefix = '\n# ';
        suffix = '\n';
        defaultText = 'عنوان رئيسي أول';
        break;
      case 'h2':
        prefix = '\n## ';
        suffix = '\n';
        defaultText = 'عنوان فرعي ثانٍ';
        break;
      case 'h3':
        prefix = '\n### ';
        suffix = '\n';
        defaultText = 'عنوان فرعي ثالث';
        break;
      case 'bullet':
        prefix = '\n- ';
        suffix = '';
        defaultText = 'عنصر في القائمة';
        break;
      case 'numeric':
        prefix = '\n1. ';
        suffix = '';
        defaultText = 'عنصر مرقم';
        break;
      case 'quote':
        prefix = '\n> ';
        suffix = '';
        defaultText = 'اقتباس مميز أو تنويه';
        break;
      case 'table':
        prefix = '\n| العمود الأور | العمود الثاني | العمود الثالث |\n| :--- | :--- | :--- |\n| خلية 1 | خلية 2 | خلية 3 |\n| خلية 4 | خلية 5 | خلية 6 |\n';
        suffix = '';
        defaultText = '';
        break;
    }

    const replacement = prefix + (selection || defaultText) + suffix;
    const newValue = currentText.substring(0, start) + replacement + currentText.substring(end);
    setContent(newValue);

    setTimeout(() => {
      textarea.focus();
      const offsetStart = start + prefix.length;
      const offsetEnd = offsetStart + (selection || defaultText).length;
      textarea.setSelectionRange(offsetStart, offsetEnd);
    }, 50);
  };

  // Safe chemical symbols and line-break rendering function
  const renderFormulaContent = (line: string) => {
    // Replace inline chemical tags or arrows for beautiful presentation
    let formatted = line;
    formatted = formatted.replace(/<=>/g, '\\rightleftharpoons');
    formatted = formatted.replace(/-->/g, '\\rightarrow');
    return formatted;
  };

  // Convert raw text into react elements for live typesetting preview
  const parseContentToReact = () => {
    if (!content.trim()) {
      return (
        <div className="text-center py-12 text-slate-400 font-medium">
          يرجى كتابة محتوى أو إدراج رموز علمية لعرض المعاينة الفورية هنا..
        </div>
      );
    }

    const lines = content.split('\n');
    return (
      <div className="space-y-4 text-right" dir="rtl">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          
          if (!trimmed) return <div key={idx} className="h-2" />;

          // Headline 1
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl md:text-2xl font-black text-amber-600 border-r-4 border-amber-500 pr-3 py-1 mt-6 mb-2">
                {line.substring(2)}
              </h1>
            );
          }
          // Headline 2
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-black text-slate-905 border-b border-indigo-100 pb-1.5 mt-5 mb-2">
                {line.substring(3)}
              </h2>
            );
          }
          // Headline 3
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-extrabold text-[#1A365D] mt-4 mb-1">
                {line.substring(4)}
              </h3>
            );
          }
          // Bullet Item
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="mr-5 text-sm text-slate-705 font-bold list-item-custom flex items-start gap-1.5 justify-start">
                <span className="text-amber-500 font-extrabold select-none shrink-0">•</span>
                <span className="leading-relaxed">{line.substring(2)}</span>
              </div>
            );
          }
          // Ordered list
          const matchNumeric = trimmed.match(/^(\d+)\.\s(.*)/);
          if (matchNumeric) {
            return (
              <div key={idx} className="mr-5 text-sm text-slate-750 font-bold flex items-start gap-2 justify-start">
                <span className="text-indigo-650 shrink-0 font-black">{matchNumeric[1]}.</span>
                <span className="leading-relaxed">{matchNumeric[2]}</span>
              </div>
            );
          }
          // Blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={idx} className="bg-slate-100 border-r-4 border-slate-400 p-3 rounded-lg text-xs font-semibold text-slate-700 leading-relaxed my-2">
                {line.substring(2)}
              </blockquote>
            );
          }

          // Render Normal text with math markers
          return (
            <p key={idx} className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold">
              {renderFormulaContent(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Handle popup builder submission
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptModal) return;

    const values: Record<string, string> = {};
    promptModal.fields.forEach(f => {
      values[f.key] = f.value || 'x';
    });

    let generatedLatex = '';
    switch (promptModal.type) {
      case 'fraction':
        generatedLatex = `\\frac{${values.num}}{${values.den}}`;
        break;
      case 'power':
        generatedLatex = `${values.base}^{${values.exp}}`;
        break;
      case 'subscript':
        generatedLatex = `${values.base}_{${values.sub}}`;
        break;
      case 'root':
        generatedLatex = `\\sqrt{${values.val}}`;
        break;
      case 'log':
        generatedLatex = `\\log_{${values.base}}(${values.val})`;
        break;
    }

    insertText(generatedLatex);
    setPromptModal(null);
  };

  return (
    <div className="border border-slate-200 rounded-3xl bg-white shadow-lg overflow-hidden flex flex-col text-right h-auto select-none" dir="rtl">
      
      {/* Editor Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black animate-pulse">
            🧪
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="text-[10px] text-slate-400 font-bold">محرر متكامل مع إضافة MathType والصيغ الكيميائية البصرية</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 font-bold cursor-pointer ${
              isPreview 
                ? 'bg-amber-400 border-amber-300 text-slate-950 font-black' 
                : 'bg-[#273549] border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isPreview ? <Edit3 size={13} /> : <Eye size={13} />}
            <span>{isPreview ? 'العودة للتعديل' : 'معاينة التنسيقات والرموز'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSave(content);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 2500);
            }}
            className="px-4.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white rounded-xl transition-all text-xs flex items-center gap-1.5 font-black cursor-pointer shadow-md"
          >
            {savedSuccess ? <Check size={13} className="animate-bounce" /> : <Save size={13} />}
            <span>{savedSuccess ? 'تم حفظ التعديلات!' : 'تطبيق وحفظ الحصة'}</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
        
        {/* RIGHT SIDE: Rich Scientific Palette (CKEditor & MathType Visual Sidebar) */}
        <div className="lg:col-span-1 bg-slate-50 border-l border-slate-100 p-4 space-y-4 overflow-y-auto max-h-[580px]" dir="rtl">
          
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveCategory('math')}
              className={`flex-1 pb-2 text-center text-[10px] font-black border-b-2 transition-all cursor-pointer ${
                activeCategory === 'math' 
                  ? 'border-amber-500 text-amber-600 font-extrabold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📐 الرياضيات (Math)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('chem')}
              className={`flex-1 pb-2 text-center text-[10px] font-black border-b-2 transition-all cursor-pointer ${
                activeCategory === 'chem' 
                  ? 'border-emerald-500 text-emerald-650 font-extrabold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              ⚛️ الكيمياء (Chem)
            </button>
          </div>

          {activeCategory === 'math' && (
            <div className="space-y-4.5 animate-fadeIn">
              
              {/* Math Interactive prompt builders */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">باني المعادلات البصري (MathType)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPromptModal({
                      isOpen: true,
                      type: 'fraction',
                      title: 'إدراج كسر اعتيادي (Fraction)',
                      description: 'قم بكتابة البسط والمقام ليقوم المحرر بتركيبه بصرياً على شكل كسر رياضي أنيق.',
                      fields: [
                        { label: 'بسط الكسر (Numerator):', key: 'num', placeholder: 'مثال: x+y', value: '' },
                        { label: 'مقام الكسر (Denominator):', key: 'den', placeholder: 'مثال: z', value: '' }
                      ]
                    })}
                    className="p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-indigo-650 text-xs font-black">\frac{`{a}`}{`{b}`}</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">كسر اعتيادي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromptModal({
                      isOpen: true,
                      type: 'power',
                      title: 'إدراج أُس / قوة (Power)',
                      description: 'أدخل العنصر الأساسي والأُس المناسب ليتم تنسيقه رياضياً في الأعلى.',
                      fields: [
                        { label: 'القيمة الأساسية:', key: 'base', placeholder: 'مثال: x', value: '' },
                        { label: 'الأُس الزاوي:', key: 'exp', placeholder: 'مثال: n', value: '' }
                      ]
                    })}
                    className="p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-indigo-650 text-xs font-black">x^{`{y}`}</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">أُس / قوة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromptModal({
                      isOpen: true,
                      type: 'subscript',
                      title: 'إدراج رقم / رمز سفلي (Subscript)',
                      description: 'كتابة تدرج سفلي لعنصر معين أو دليل مجهول.',
                      fields: [
                        { label: 'القيمة الأساسية:', key: 'base', placeholder: 'مثال: a', value: '' },
                        { label: 'الرمز/الرقم التحتيه السفلي:', key: 'sub', placeholder: 'مثال: i', value: '' }
                      ]
                    })}
                    className="p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-indigo-650 text-xs font-black">a_{`{i}`}</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">رقم سفلي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromptModal({
                      isOpen: true,
                      type: 'root',
                      title: 'إدراج جذر تربيعي (Square Root)',
                      description: 'قم بإدراج قيمة لحساب جذرها التربيعي بصرياً.',
                      fields: [
                        { label: 'القيمة داخل الجذر:', key: 'val', placeholder: 'مثال: b^2 - 4ac', value: '' }
                      ]
                    })}
                    className="p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-indigo-650 text-xs font-black">\sqrt{`{x}`}</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">جذر تربيعي</span>
                  </button>
                </div>
              </div>

              {/* Instant standard Math formulas */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">رموز وقواسم رياضية فنية</p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: 'جمع وطرح', val: '\\pm', txt: '±' },
                    { label: 'ضرب', val: '\\times', txt: '×' },
                    { label: 'قسمة', val: '\\div', txt: '÷' },
                    { label: 'أكبر أو يساوي', val: '\\ge', txt: '≥' },
                    { label: 'أصغر أو يساوي', val: '\\le', txt: '≤' },
                    { label: 'لا يساوي', val: '\\ne', txt: '≠' },
                    { label: 'تطابق تماثل', val: '\\equiv', txt: '≡' },
                    { label: 'درجة حرارة/زاوية', val: '^{\\circ}', txt: '°' },
                    { label: 'تقريب', val: '\\approx', txt: '≈' },
                    { label: 'لا نهاية', val: '\\infty', txt: '∞' },
                    { label: 'مجموع', val: '\\sum', txt: '∑' },
                    { label: 'تكامل', val: '\\int', txt: '∫' },
                  ].map((sym, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertText(sym.val)}
                      className="p-1 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 text-[10px] font-black text-center cursor-pointer transition-all flex flex-col items-center justify-center bg-white"
                      title={sym.label}
                    >
                      <span className="font-mono text-indigo-600 font-extrabold text-sm">{sym.txt}</span>
                      <span className="text-[7.5px] text-slate-400 truncate w-full">{sym.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Greek signs */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">الحروف اليونانية (Greek Letters)</p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { val: '\\pi', name: 'باي π' },
                    { val: '\\Delta', name: 'تغير Δ' },
                    { val: '\\theta', name: 'ثيتا θ' },
                    { val: '\\alpha', name: 'ألفا α' },
                    { val: '\\beta', name: 'بيتا β' },
                    { val: '\\gamma', name: 'جاما γ' },
                    { val: '\\lambda', name: 'لامدا λ' },
                    { val: '\\Omega', name: 'أوم Ω' },
                    { val: '\\mu', name: 'مايكرو μ' },
                    { val: '\\sigma', name: 'سيغما σ' },
                    { val: '\\phi', name: 'فاي φ' },
                    { val: '\\rho', name: 'رو ρ' },
                  ].map((greek, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertText(greek.val)}
                      className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-black text-center cursor-pointer transition-all bg-white"
                      title={greek.name}
                    >
                      <span className="font-mono text-indigo-700">{greek.val}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'chem' && (
            <div className="space-y-4.5 animate-fadeIn">
              
              {/* Visual chemically active helpers block */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">التركيب الكيميائي المطور (ChemType)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertText("<=>")}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-emerald-650 text-xs font-black">&lt;=&gt;</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">سهم اتزان تفاعل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertText("-->")}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-emerald-650 text-xs font-black">--&gt;</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">سهم تفاعل طردي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertText("_{2}")}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-emerald-650 text-xs font-black">X_2</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">رقم جزيئات سفلي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertText("^{2+}")}
                    className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-right text-[10px] font-bold text-slate-700 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <span className="font-mono text-emerald-650 text-xs font-black">X^2+</span>
                    <span className="text-[9px] text-slate-500 font-extrabold">أيون شحنة موجبة</span>
                  </button>
                </div>
              </div>

              {/* State signs */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">الحالات الفيزيائية للمركبات</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: '(s)', label: 'صلب (Solid)' },
                    { val: '(l)', label: 'سائل (Liquid)' },
                    { val: '(g)', label: 'غاز (Gas)' },
                    { val: '(aq)', label: 'محلول مائي' },
                  ].map((st, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertText(" " + st.val)}
                      className="p-1 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg text-slate-700 text-[10px] font-black text-center cursor-pointer bg-white transition-all"
                      title={st.label}
                    >
                      <span className="font-mono text-emerald-700 font-black">{st.val}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard active Chem Elements & Formulas */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">صيغ كيميائية جاهزة للإدراج</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'مركب الماء', val: 'H_{2}O' },
                    { label: 'ثاني أكسيد الكربون', val: 'CO_{2}' },
                    { label: 'ملح طعام NaCl', val: 'NaCl' },
                    { label: 'حمض الكبريتيك H2SO4', val: 'H_{2}SO_{4}' },
                    { label: 'حمض الهيدروكلوريك HCl', val: 'HCl' },
                    { label: 'هيدروكسيد الصوديوم NaOH', val: 'NaOH' },
                    { label: 'أيون كربونات CO3^2-', val: 'CO_{3}^{2-}' },
                    { label: 'أيون أمونيوم NH4+', val: 'NH_{4}^{+}' },
                    { label: 'أيون هيدرونيوم H3O+', val: 'H_{3}O^{+}' },
                    { label: 'كربونات الكالسيوم CaCO3', val: 'CaCO_{3}' },
                    { label: 'غلوكوز سكر سداسي', val: 'C_{6}H_{12}O_{6}' },
                    { label: 'أيون كبريتات SO4^2-', val: 'SO_{4}^{2-}' },
                  ].map((ch, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertText(ch.val)}
                      className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-right text-[9px] font-bold text-slate-700 flex items-center justify-between gap-1 cursor-pointer transition-all"
                    >
                      <span className="font-mono text-emerald-600 font-black text-[10px]">{ch.val.replace(/\{|\}/g, '')}</span>
                      <span className="text-slate-500 text-[8.5px] truncate max-w-[80px]">{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auxiliary signals */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">علامات وتفاعلات مساعدة</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: 'تصاعد غاز', val: '\\uparrow' },
                    { label: 'ترسب راسب', val: '\\downarrow' },
                    { label: 'حرارة تفاعل', val: '\\Delta' },
                    { label: 'طاقة مضافة', val: ' + Energy' },
                  ].map((aux, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertText(" " + aux.val)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-[10px] font-extrabold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>{aux.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Quick tips & manual block */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 mt-4">
            <p className="text-[10px] text-amber-800 font-black flex items-center gap-1.5 mb-1">
              <HelpCircle size={12} />
              <span>إرشادات التنسيق السريعة:</span>
            </p>
            <ul className="text-[9px] text-slate-500 font-bold space-y-1 list-disc pr-3.5">
              <li>استخدم الرموز والأسهم لتركيب تفاعلات كيميائية بسلاسة.</li>
              <li>الكسور والجذور تظهر تلقائياً بشكل عالي الدقة في وضع المعاينة وعند الطباعة.</li>
              <li>انقر على "تطبيق وحفظ الحصة" لحفظ المستند في حساب المعلم.</li>
            </ul>
          </div>

        </div>

        {/* LEFT SIDE: WYSIWYG Creative Workspace */}
        <div className="lg:col-span-3 flex flex-col bg-slate-50/20 border-r border-slate-100 relative">
          
          {/* Main Visual WYSIWYG Editing Toolbar (resembles CKEditor Toolbar) */}
          {!isPreview && (
            <div className="bg-slate-100 border-b border-slate-200 p-2 flex flex-wrap gap-1.5 items-center justify-start" dir="rtl">
              
              <div className="flex items-center gap-1 bg-white border border-slate-250 py-1 px-1.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => applyFormatting('bold')}
                  className="p-1 hover:bg-slate-150 rounded text-slate-700 cursor-pointer"
                  title="نص عريض (Bold)"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('italic')}
                  className="p-1 hover:bg-slate-150 rounded text-slate-700 cursor-pointer"
                  title="نص مائل (Italic)"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('underline')}
                  className="p-1 hover:bg-slate-150 rounded text-slate-700 cursor-pointer"
                  title="نص مسطر (Underline)"
                >
                  <Underline size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-250 py-1 px-1.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => applyFormatting('h1')}
                  className="px-1.5 py-0.5 font-black hover:bg-slate-150 rounded text-slate-700 text-xs cursor-pointer"
                  title="عنوان رئيسي (H1)"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('h2')}
                  className="px-1.5 py-0.5 font-black hover:bg-slate-150 rounded text-slate-700 text-xs cursor-pointer"
                  title="عنوان فرعي ثانٍ (H2)"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('h3')}
                  className="px-1.5 py-0.5 font-black hover:bg-slate-150 rounded text-slate-700 text-xs cursor-pointer"
                  title="عنوان فرعي ثالث (H3)"
                >
                  H3
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-250 py-1 px-1.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => applyFormatting('bullet')}
                  className="p-1 hover:bg-slate-150 rounded text-slate-700 cursor-pointer"
                  title="قائمة نقطية"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('numeric')}
                  className="p-1 hover:bg-slate-150 rounded text-slate-700 cursor-pointer"
                  title="قائمة رقمية"
                >
                  <ListOrdered size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-250 py-1 px-1.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => applyFormatting('table')}
                  className="px-1.5 py-0.5 font-bold hover:bg-slate-150 rounded text-slate-700 text-[10px] cursor-pointer"
                  title="إدراج جدول منسق"
                >
                  إدراج جدول 📥
                </button>
                <button
                  type="button"
                  onClick={() => insertText("\n---\n")}
                  className="px-1.5 py-0.5 font-bold hover:bg-slate-150 rounded text-slate-700 text-[10px] cursor-pointer"
                  title="إدراج خط فاصل"
                >
                  خط فاصل ➖
                </button>
              </div>

              <div className="flex items-center gap-1.5 mr-auto">
                <span className="text-[9px] text-slate-450 font-black whitespace-nowrap pl-2">
                  عدد الحروف: <span className="font-mono text-indigo-600">{content.length}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setContent("")}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[9px] font-black cursor-pointer flex items-center gap-1"
                  title="مسح محتويات الورقة بالكامل"
                >
                  <Trash2 size={11} />
                  <span>تصفير</span>
                </button>
              </div>

            </div>
          )}

          {/* Core Content Editing Text Canvas */}
          <div className="flex-1 p-5 relative">
            {!isPreview ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="w-full h-[400px] lg:h-[460px] p-5 bg-white border border-slate-200 focus:border-[#D4A33C] focus:ring-4 focus:ring-amber-500/5 outline-none rounded-2xl font-bold text-xs text-right leading-relaxed resize-y transition-all shadow-inner placeholder:text-slate-400"
                dir="rtl"
              />
            ) : (
              <div className="bg-slate-50/50 border border-slate-250 rounded-2xl p-6 h-[400px] lg:h-[460px] overflow-y-auto relative shadow-inner">
                <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 font-black text-[8px] tracking-wide uppercase px-2 py-0.5 rounded-md shadow-sm select-none">
                  عرض المعاينة التفاعلية والرياضية لـ MathJax
                </div>
                
                {/* Visual Scientific HTML Preview Area */}
                <MathJaxSection className="font-sans text-xs text-slate-800 leading-relaxed text-right space-y-4 prose prose-slate">
                  {parseContentToReact()}
                </MathJaxSection>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Advanced Prompt Insertion Modal Helper */}
      {promptModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
          <form 
            onSubmit={handlePromptSubmit}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 text-right space-y-4 p-5 md:p-6 animate-fadeIn"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                📐
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">{promptModal.title}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{promptModal.description}</p>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              {promptModal.fields.map((f, idx) => (
                <div key={idx} className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-600 block mr-0.5">{f.label}</label>
                  <input
                    type="text"
                    required
                    value={f.value}
                    onChange={(e) => {
                      const updatedFields = [...promptModal.fields];
                      updatedFields[idx].value = e.target.value;
                      setPromptModal({ ...promptModal, fields: updatedFields });
                    }}
                    placeholder={f.placeholder}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 outline-none rounded-xl focus:border-amber-500 text-xs text-left font-bold"
                    dir="ltr"
                    autoFocus={idx === 0}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPromptModal(null)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-650 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#D4A33C] hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                تركيب وإدراج الرمز
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ScientificRichTextEditor;
