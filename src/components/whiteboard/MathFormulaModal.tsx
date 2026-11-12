import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Copy, 
  Trash2, 
  Plus, 
  FlaskConical, 
  Calculator, 
  Sigma, 
  Divide, 
  Layers, 
  Eye,
  Type,
  Palette,
  Maximize2
} from 'lucide-react';

export interface MathFormulaInsertOptions {
  latex: string;
  isChemistry?: boolean;
  color: string;
  fontSize: number;
  bgColor?: string;
  borderColor?: string;
  renderedSvgDataUrl?: string;
  svgWidth?: number;
  svgHeight?: number;
}

interface MathFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFormula: (options: MathFormulaInsertOptions) => void;
  initialLatex?: string;
  initialColor?: string;
  initialIsChemistry?: boolean;
}

// Preset categories and curated templates
interface FormulaTemplate {
  name: string;
  latex: string;
  isChemistry?: boolean;
  description: string;
}

interface FormulaCategory {
  id: string;
  name: string;
  icon: string;
  templates: FormulaTemplate[];
}

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    id: 'chemistry',
    name: 'كيمياء وتفاعلات',
    icon: '🧪',
    templates: [
      {
        name: 'تفاعل احتراق الميثان',
        latex: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}',
        isChemistry: true,
        description: 'احتراق غاز الميثان مع الأكسجين'
      },
      {
        name: 'تفاعل تكوين الماء',
        latex: '\\ce{2H2 + O2 -> 2H2O}',
        isChemistry: true,
        description: 'تفاعل الهيدروجين مع الأكسجين'
      },
      {
        name: 'تفاعل تعادل حمض وقاعدة',
        latex: '\\ce{HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)}',
        isChemistry: true,
        description: 'حمض الهيدروكلوريك مع هيدروكسيد الصوديوم'
      },
      {
        name: 'تفكك كربونات الكالسيوم بالحرارة',
        latex: '\\ce{CaCO3(s) ->[ \\Delta ] CaO(s) + CO2(g) ^}',
        isChemistry: true,
        description: 'تفكك حراري مع تصاعد غاز ثاني أكسيد الكربون'
      },
      {
        name: 'اتزان كيميائي - تكوين الأمونيا',
        latex: '\\ce{N2(g) + 3H2(g) <=> 2NH3(g)} \\quad \\Delta H < 0',
        isChemistry: true,
        description: 'طريقة هابر-بوش لتصنيع النشادر'
      },
      {
        name: 'تفاعل أكسدة واختزال (نصف خلية)',
        latex: '\\ce{Zn(s) -> Zn^{2+}(aq) + 2e^{-}} \\quad E^\\circ = +0.76\\text{ V}',
        isChemistry: true,
        description: 'نصف تفاعل أكسدة الخارصين'
      },
      {
        name: 'تخمر الجلوكوز إلى كحول',
        latex: '\\ce{C6H12O6 -> 2C2H5OH + 2CO2 ^}',
        isChemistry: true,
        description: 'التخمر الكحولي للسكريات'
      },
      {
        name: 'ثابت الاتزان الكيميائي Kc',
        latex: 'K_c = \\frac{[\\text{C}]^c [\\text{D}]^d}{[\\text{A}]^a [\\text{B}]^b}',
        isChemistry: true,
        description: 'قانون فعل الكتلة للاتزان الكيميائي'
      },
      {
        name: 'قانون الغاز المثالي',
        latex: 'P \\cdot V = n \\cdot R \\cdot T',
        isChemistry: true,
        description: 'الضغط والحجم وعدد المولات ودرجة الحرارة'
      },
      {
        name: 'معادلة نرنست الكهروكيميائية',
        latex: 'E = E^\\circ - \\frac{R T}{n F} \\ln Q',
        isChemistry: true,
        description: 'حساب جهد الخلية الكهروكيميائية غير القياسي'
      },
      {
        name: 'الرقم الهيدروجيني pH',
        latex: '\\text{pH} = -\\log_{10}[\\text{H}^+] = 14 - \\text{pOH}',
        isChemistry: true,
        description: 'مقياس حموضة المحاليل'
      }
    ]
  },
  {
    id: 'calculus',
    name: 'تفاضل وتكامل',
    icon: '📐',
    templates: [
      {
        name: 'تكامل محدد أساسي',
        latex: '\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)',
        description: 'النظرية الأساسية في التفاضل والتكامل'
      },
      {
        name: 'تكامل الدوال المثلثية',
        latex: '\\int \\sin(kx) \\, dx = -\\frac{1}{k} \\cos(kx) + C',
        description: 'تكامل دالة الجيب'
      },
      {
        name: 'تكامل بالتجزئة',
        latex: '\\int u \\, dv = u \\cdot v - \\int v \\, du',
        description: 'قاعدة التكامل بالتجزئة'
      },
      {
        name: 'تكامل ثنائي في مساحة',
        latex: '\\iint_D f(x, y) \\, dx \\, dy = \\int_{a}^{b} \\left( \\int_{g_1(x)}^{g_2(x)} f(x, y) \\, dy \\right) dx',
        description: 'التكامل الثنائي للمساحات والحجوم'
      },
      {
        name: 'تعريف المشتقة الأولى',
        latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
        description: 'المشتقة باستخدام نهاية معدل التغير'
      },
      {
        name: 'مشتقة حاصل ضرب دالتين',
        latex: '\\frac{d}{dx}[f(x) \\cdot g(x)] = f\'(x)g(x) + f(x)g\'(x)',
        description: 'قاعدة الضرب في التفاضل'
      },
      {
        name: 'مشتقة قسمة دالتين',
        latex: '\\frac{d}{dx}\\left[\\frac{f(x)}{g(x)}\\right] = \\frac{f\'(x)g(x) - f(x)g\'(x)}{[g(x)]^2}',
        description: 'قاعدة القسمة في التفاضل'
      },
      {
        name: 'قاعدة السلسلة (Chain Rule)',
        latex: '\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}',
        description: 'اشتقاق الدوال المركبة'
      },
      {
        name: 'نهاية الدوال المثلثية الشهيرة',
        latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\quad , \\quad \\lim_{x \\to 0} \\frac{1 - \\cos x}{x} = 0',
        description: 'النهايات المثلثية القياسية'
      }
    ]
  },
  {
    id: 'algebra',
    name: 'جبر ومعادلات',
    icon: '🧮',
    templates: [
      {
        name: 'القانون العام للمعادلة التربيعية',
        latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        description: 'حل المعادلة التربيعية ax² + bx + c = 0'
      },
      {
        name: 'المتطابقة التربيعية (مربع مجموع)',
        latex: '(a + b)^2 = a^2 + 2ab + b^2',
        description: 'فك المربع الكامل'
      },
      {
        name: 'الفرق بين مربعين',
        latex: 'a^2 - b^2 = (a - b)(a + b)',
        description: 'تحليل الفرق بين مربعين'
      },
      {
        name: 'مجموع وفرق مكعبين',
        latex: 'a^3 \\pm b^3 = (a \\pm b)(a^2 \\mp ab + b^2)',
        description: 'تحليل المكعبات'
      },
      {
        name: 'قوانين الأسس والجذور',
        latex: '\\sqrt[n]{x^m} = x^{\\frac{m}{n}} \\quad , \\quad x^a \\cdot x^b = x^{a+b}',
        description: 'التحويل بين الجذور والأسس الكسرية'
      },
      {
        name: 'خواص اللوغاريتمات',
        latex: '\\log_b(x \\cdot y) = \\log_b x + \\log_b y \\quad , \\quad \\ln(e^x) = x',
        description: 'جمع وقسمة وقوى اللوغاريتمات'
      },
      {
        name: 'نظرية ذات الحدين (Binomial Theorem)',
        latex: '(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k',
        description: 'مفكوك ذات الحدين'
      }
    ]
  },
  {
    id: 'matrices',
    name: 'مصفوفات ومتجهات',
    icon: '📊',
    templates: [
      {
        name: 'مصفوفة 2x2 وحساب المحدد',
        latex: 'A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\implies \\det(A) = ad - bc',
        description: 'المصفوفة المربعة والمحدد'
      },
      {
        name: 'معكوس مصفوفة 2x2',
        latex: 'A^{-1} = \\frac{1}{\\det(A)} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
        description: 'حساب معكوس المصفوفة المربعة'
      },
      {
        name: 'مصفوفة 3x3',
        latex: 'M = \\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}',
        description: 'مصفوفة الرتبة الثالثة'
      },
      {
        name: 'الضرب القياسي للمتجهات (Dot Product)',
        latex: '\\vec{u} \\cdot \\vec{v} = |\\vec{u}| \\cdot |\\vec{v}| \\cos\\theta = u_x v_x + u_y v_y + u_z v_z',
        description: 'الضرب الداخلي وزاوية المتجهين'
      },
      {
        name: 'الضرب الاتجاهي للمتجهات (Cross Product)',
        latex: '\\vec{u} \\times \\vec{v} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ u_x & u_y & u_z \\\\ v_x & v_y & v_z \\end{vmatrix}',
        description: 'الضرب المتجهي باستخدام المحدد'
      }
    ]
  },
  {
    id: 'trigonometry',
    name: 'حساب مثلثات',
    icon: '📈',
    templates: [
      {
        name: 'متطابقة فيثاغورس المثلثية',
        latex: '\\sin^2\\theta + \\cos^2\\theta = 1 \\quad , \\quad 1 + \\tan^2\\theta = \\sec^2\\theta',
        description: 'المتطابقات الأساسية لدوال المثلثات'
      },
      {
        name: 'جيب ضعف الزاوية',
        latex: '\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta',
        description: 'قانون ضعف الزاوية للجيب'
      },
      {
        name: 'جيب تمام ضعف الزاوية',
        latex: '\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1',
        description: 'قوانين جيب التمام لضعف الزاوية'
      },
      {
        name: 'قانون الجيوب (Law of Sines)',
        latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R',
        description: 'علاقة أضلاع المثلث بجيوب زواياه'
      },
      {
        name: 'قانون جيب التمام (Law of Cosines)',
        latex: 'c^2 = a^2 + b^2 - 2ab\\cos C',
        description: 'حساب طول ضلع بدلالة الضلعين الآخرين والزاوية'
      },
      {
        name: 'مجموع زاويتين للظل',
        latex: '\\tan(\\alpha \\pm \\beta) = \\frac{\\tan\\alpha \\pm \\tan\\beta}{1 \\mp \\tan\\alpha\\tan\\beta}',
        description: 'قانون ظل المجموع والفرق'
      }
    ]
  },
  {
    id: 'physics',
    name: 'فيزياء وقوانين علمية',
    icon: '⚡',
    templates: [
      {
        name: 'تكافؤ الكتلة والطاقة (أينشتاين)',
        latex: 'E = m c^2',
        description: 'معادلة النسبية الشهيرة'
      },
      {
        name: 'قانون نيوتن الثاني للحركة',
        latex: '\\sum \\vec{F} = m \\cdot \\vec{a} = \\frac{d\\vec{p}}{dt}',
        description: 'القوة وكتلة الجسم والتسارع'
      },
      {
        name: 'قانون الجذب العام لنيوتن',
        latex: 'F_g = G \\frac{m_1 m_2}{r^2}',
        description: 'قوة التجاذب الكتلي بين جسمين'
      },
      {
        name: 'قانون كولوم للقوى الكهربائية',
        latex: 'F_e = k_e \\frac{|q_1 q_2|}{r^2} = \\frac{1}{4\\pi\\varepsilon_0} \\frac{|q_1 q_2|}{r^2}',
        description: 'القوة الكهروستاتيكية المتبادلة'
      },
      {
        name: 'طاقة الفوتون وتردد بلانك',
        latex: 'E = h \\cdot \\nu = \\frac{h \\cdot c}{\\lambda}',
        description: 'طاقة الكم لبلانك وأينشتاين'
      },
      {
        name: 'معادلات الحركة بتسارع منتظم',
        latex: 'v = v_0 + at \\quad , \\quad \\Delta x = v_0 t + \\frac{1}{2} a t^2 \\quad , \\quad v^2 = v_0^2 + 2a\\Delta x',
        description: 'معادلات الحركة الخطية في خط مستقيم'
      },
      {
        name: 'قانون أوم والقدرة الكهربائية',
        latex: 'V = I \\cdot R \\quad , \\quad P = V \\cdot I = I^2 R = \\frac{V^2}{R}',
        description: 'الجهد والتيار والمقاومة والقدرة'
      },
      {
        name: 'قانون لورنتز للمجالات الكهرومغناطيسية',
        latex: '\\vec{F} = q(\\vec{E} + \\vec{v} \\times \\vec{B})',
        description: 'القوة المغناطيسية والكهربائية المؤثرة على شحنة متحركة'
      },
      {
        name: 'معادلة العدسات والمرايا الرقيقة',
        latex: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i} \\quad , \\quad M = -\\frac{d_i}{d_o}',
        description: 'البعد البؤري وبعد الجسم وبعد الصورة وقوة التكبير'
      },
      {
        name: 'معادلة الموجات وسرعة الانتشار',
        latex: 'v = \\lambda \\cdot f = \\frac{\\lambda}{T} \\quad , \\quad \\omega = 2\\pi f',
        description: 'التردد والطول الموجي وسرعة انتشار الموجة'
      }
    ]
  },
  {
    id: 'units-and-constants',
    name: 'وحدات وثوابت فيزيائية',
    icon: '⚖️',
    templates: [
      {
        name: 'سرعة الضوء في الفراغ',
        latex: 'c = 2.998 \\times 10^8 \\text{ m/s}',
        description: 'ثابت سرعة الضوء الكهرومغناطيسي'
      },
      {
        name: 'ثابت الجذب الكوني (كافنديش)',
        latex: 'G = 6.674 \\times 10^{-11} \\text{ N}\\cdot\\text{m}^2/\\text{kg}^2',
        description: 'ثابت الجاذبية العام لنيوتن'
      },
      {
        name: 'ثابت بلانك',
        latex: 'h = 6.626 \\times 10^{-34} \\text{ J}\\cdot\\text{s} \\quad , \\quad \\hbar = \\frac{h}{2\\pi}',
        description: 'ثابت ميكانيكا الكم'
      },
      {
        name: 'شحنة الإلكترون الأولية وكتلته',
        latex: 'e = 1.602 \\times 10^{-19} \\text{ C} \\quad , \\quad m_e = 9.109 \\times 10^{-31} \\text{ kg}',
        description: 'شحنة وكتلة الإلكترون'
      },
      {
        name: 'تسارع الجاذبية الأرضية المعياري',
        latex: 'g = 9.807 \\text{ m/s}^2 \\approx 10 \\text{ m/s}^2',
        description: 'تسارع السقوط الحر قرب سطح الأرض'
      },
      {
        name: 'عدد أفوجادرو وثابت الغازات العام',
        latex: 'N_A = 6.022 \\times 10^{23} \\text{ mol}^{-1} \\quad , \\quad R = 8.314 \\text{ J/(mol}\\cdot\\text{K)}',
        description: 'ثوابت الديناميكا الحرارية والغاز المثالي PV = nRT'
      },
      {
        name: 'اشتقاق وحدات القوة والطاقة والشغل',
        latex: '1\\text{ N} = 1\\text{ kg}\\cdot\\text{m/s}^2 \\quad , \\quad 1\\text{ J} = 1\\text{ N}\\cdot\\text{m} = 1\\text{ W}\\cdot\\text{s}',
        description: 'تحويلات الوحدات الأساسية والمشتقة في النظام الدولي SI'
      },
      {
        name: 'وحدات الكهرباء والمغناطيسية والضغط',
        latex: '1\\text{ V} = 1\\text{ J/C} \\quad , \\quad 1\\ \\Omega = 1\\text{ V/A} \\quad , \\quad 1\\text{ T} = 1\\text{ N/(A}\\cdot\\text{m)} \\quad , \\quad 1\\text{ Pa} = 1\\text{ N/m}^2',
        description: 'الفولت والأوم والتسلا والنيوتن والباسكال'
      }
    ]
  },
  {
    id: 'statistics',
    name: 'إحصاء وسلاسل',
    icon: '🔢',
    templates: [
      {
        name: 'المتوسط الحسابي',
        latex: '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i',
        description: 'حساب الوسط الحسابي لبيانات'
      },
      {
        name: 'الانحراف المعياري',
        latex: '\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2}',
        description: 'مقياس تشتت البيانات حول المتوسط'
      },
      {
        name: 'مجموع الأعداد الطبيعية',
        latex: '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2} \\quad , \\quad \\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}',
        description: 'متسلسلة مجموع المتتالية الحسابية'
      },
      {
        name: 'قانون بايز للاحتمال الشرطي',
        latex: 'P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)}',
        description: 'الاحتمال البعدي والاستدلال الإحصائي'
      }
    ]
  }
];

// Quick Symbol Insertion Buttons
const QUICK_SYMBOLS = [
  { label: 'α', code: '\\alpha' },
  { label: 'β', code: '\\beta' },
  { label: 'γ', code: '\\gamma' },
  { label: 'θ', code: '\\theta' },
  { label: 'λ', code: '\\lambda' },
  { label: 'Δ', code: '\\Delta' },
  { label: 'π', code: '\\pi' },
  { label: 'ω', code: '\\omega' },
  { label: 'Ω', code: '\\Omega' },
  { label: '∞', code: '\\infty' },
  { label: '±', code: '\\pm' },
  { label: '×', code: '\\times' },
  { label: '÷', code: '\\div' },
  { label: '·', code: '\\cdot' },
  { label: '≤', code: '\\le' },
  { label: '≥', code: '\\ge' },
  { label: '≠', code: '\\neq' },
  { label: '≈', code: '\\approx' },
  { label: '→', code: '\\rightarrow' },
  { label: '⇌', code: '\\rightleftharpoons' },
  { label: '↑', code: '\\uparrow' },
  { label: '↓', code: '\\downarrow' },
  { label: '√x', code: '\\sqrt{x}' },
  { label: 'a/b', code: '\\frac{a}{b}' },
  { label: 'x²', code: 'x^2' },
  { label: 'xᵢ', code: 'x_i' },
  { label: '∫', code: '\\int_{a}^{b} f(x)\\,dx' },
  { label: '∑', code: '\\sum_{i=1}^{n}' },
  { label: 'lim', code: '\\lim_{x \\to 0}' },
  { label: '🧪 \\ce{}', code: '\\ce{}' },
  { label: '⇄ \\ce{<=>}', code: '\\ce{A + B <=> C + D}' },
  { label: 'Δ الحرارة', code: '\\ce{->[\\Delta]}' }
];

export const MathFormulaModal: React.FC<MathFormulaModalProps> = ({
  isOpen,
  onClose,
  onInsertFormula,
  initialLatex = '',
  initialColor = '#1E293B',
  initialIsChemistry = false
}) => {
  const [latexInput, setLatexInput] = useState<string>(initialLatex || '\\ce{2H2 + O2 -> 2H2O}');
  const [activeTab, setActiveTab] = useState<string>('chemistry');
  const [selectedColor, setSelectedColor] = useState<string>(initialColor || '#1E293B');
  const [fontSize, setFontSize] = useState<number>(24);
  const [cardBackground, setCardBackground] = useState<'transparent' | 'white' | 'dark' | 'yellow'>('transparent');
  const [isRenderError, setIsRenderError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCopyNotice, setIsCopyNotice] = useState<boolean>(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialLatex) {
      setLatexInput(initialLatex);
    }
  }, [initialLatex]);

  // Live MathJax Rendering Trigger
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const renderMath = async () => {
      if (!previewContainerRef.current) return;
      try {
        setIsRenderError(false);
        setErrorMessage('');

        const container = previewContainerRef.current;
        // Clean container
        container.innerHTML = '';

        const mathJax = (window as any).MathJax;
        if (!mathJax) {
          // If MathJax script hasn't loaded yet, show plain text fallback
          container.textContent = latexInput;
          return;
        }

        // Check if equation contains \ce{} or is pure chemistry
        let formattedLatex = latexInput.trim();
        if (!formattedLatex) {
          container.innerHTML = '<span class="text-slate-400 text-sm italic">معاينة المعادلة ستظهر هنا مباشرة...</span>';
          return;
        }

        // Auto-wrap with \ce if user wrote raw chemistry reaction without \ce
        if (activeTab === 'chemistry' && !formattedLatex.includes('\\ce{') && (formattedLatex.includes('->') || formattedLatex.includes('<=>') || formattedLatex.includes('+'))) {
          // If it doesn't have TeX commands like \frac, wrap in \ce
          if (!formattedLatex.includes('\\frac') && !formattedLatex.includes('\\int') && !formattedLatex.includes('\\sum')) {
            formattedLatex = `\\ce{${formattedLatex}}`;
          }
        }

        if (mathJax.tex2svgPromise) {
          const svgNode = await mathJax.tex2svgPromise(formattedLatex, { display: true });
          if (isMounted && container) {
            container.innerHTML = '';
            container.appendChild(svgNode);
            
            // Style MathJax SVG for high crisp visibility
            const svg = container.querySelector('svg');
            if (svg) {
              svg.style.color = selectedColor;
              svg.style.fontSize = `${fontSize}px`;
              svg.setAttribute('color', selectedColor);
            }
          }
        } else if (mathJax.typesetPromise) {
          container.innerHTML = `$$${formattedLatex}$$`;
          await mathJax.typesetPromise([container]);
        }
      } catch (err: any) {
        console.warn('MathJax rendering error:', err);
        if (isMounted) {
          setIsRenderError(true);
          setErrorMessage(err?.message || 'خطأ في صياغة رمز المعادلة LaTeX/Chemistry');
        }
      }
    };

    const timer = setTimeout(renderMath, 60);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [latexInput, selectedColor, fontSize, isOpen, activeTab]);

  // Insert symbol at current cursor position
  const handleInsertSymbol = (code: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setLatexInput(prev => prev + ' ' + code);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = latexInput;
    const updated = current.substring(0, start) + code + current.substring(end);
    setLatexInput(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + code.length, start + code.length);
    }, 10);
  };

  // Convert rendered MathJax SVG to Data URL for drawing onto Canvas and PDF export
  const generateSvgDataUrl = async (): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    try {
      const mathJax = (window as any).MathJax;
      if (!mathJax || !mathJax.tex2svgPromise) return null;

      let formattedLatex = latexInput.trim();
      if (activeTab === 'chemistry' && !formattedLatex.includes('\\ce{') && (formattedLatex.includes('->') || formattedLatex.includes('<=>'))) {
        if (!formattedLatex.includes('\\frac') && !formattedLatex.includes('\\int')) {
          formattedLatex = `\\ce{${formattedLatex}}`;
        }
      }

      const wrapper = await mathJax.tex2svgPromise(formattedLatex, { display: true });
      const svg = wrapper.querySelector('svg');
      if (!svg) return null;

      // Clone SVG & adjust colors & size
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('color', selectedColor);
      clonedSvg.style.color = selectedColor;

      // Get dimensions in ex / em
      const viewBox = clonedSvg.getAttribute('viewBox');
      let w = 400;
      let h = 120;
      if (viewBox) {
        const parts = viewBox.split(' ').map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          w = Math.max(100, Math.round(parts[2] * 0.7));
          h = Math.max(40, Math.round(parts[3] * 0.7));
        }
      }

      // Add background if chosen
      if (cardBackground !== 'transparent') {
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('rx', '8');
        const bgHex = cardBackground === 'white' ? '#FFFFFF' : cardBackground === 'yellow' ? '#FEF08A' : '#0F172A';
        bgRect.setAttribute('fill', bgHex);
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
      }

      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const svgBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;

      return {
        dataUrl: svgBase64,
        width: Math.min(800, Math.max(160, w * 1.5)),
        height: Math.min(500, Math.max(60, h * 1.5))
      };
    } catch (e) {
      console.warn('Failed to generate SVG data url from MathJax:', e);
      return null;
    }
  };

  // Submit and Insert to Board
  const handleSubmit = async () => {
    if (!latexInput.trim()) return;

    const svgResult = await generateSvgDataUrl();

    let bgVal: string | undefined = undefined;
    let borderVal: string | undefined = undefined;
    if (cardBackground === 'white') {
      bgVal = '#ffffff';
      borderVal = '#cbd5e1';
    } else if (cardBackground === 'yellow') {
      bgVal = '#fef08a';
      borderVal = '#eab308';
    } else if (cardBackground === 'dark') {
      bgVal = '#0f172a';
      borderVal = '#334155';
    }

    onInsertFormula({
      latex: latexInput.trim(),
      isChemistry: activeTab === 'chemistry' || latexInput.includes('\\ce'),
      color: selectedColor,
      fontSize,
      bgColor: bgVal,
      borderColor: borderVal,
      renderedSvgDataUrl: svgResult?.dataUrl,
      svgWidth: svgResult?.width,
      svgHeight: svgResult?.height
    });

    onClose();
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexInput);
    setIsCopyNotice(true);
    setTimeout(() => setIsCopyNotice(false), 2000);
  };

  if (!isOpen) return null;

  const currentCategory = FORMULA_CATEGORIES.find(c => c.id === activeTab) || FORMULA_CATEGORIES[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <header className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>محرر المعادلات الرياضية والكيميائية (MathJax)</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  LaTeX & mhchem
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                كتابة وتنسيق الرموز العلمية، التفاعلات الكيميائية، والتكاملات بدقة وجودة فائقة على اللوح
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-800">
            {FORMULA_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 scale-102'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Quick Curated Templates for Active Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>نماذج جاهزة سريعة ({currentCategory.name}):</span>
              <span className="text-[11px] text-teal-400 font-medium">انقر على أي نموذج لاستخدامه مباشرة</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {currentCategory.templates.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLatexInput(tpl.latex)}
                  className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/90 hover:border-amber-400/50 rounded-2xl text-right transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="text-xs font-black text-amber-300 group-hover:text-amber-200 line-clamp-1 mb-1">
                    {tpl.name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 line-clamp-1 text-left" dir="ltr">
                    {tpl.latex}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {tpl.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Symbol Insertion Bar */}
          <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>شريط إدراج الرموز الرياضية والكيميائية السريعة:</span>
              <span className="text-[10px] text-amber-400">انقر لإضافة الرمز في موقع المؤشر</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
              {QUICK_SYMBOLS.map((sym, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertSymbol(sym.code)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border border-slate-700/60 shrink-0"
                  title={`إدراج ${sym.code}`}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main LaTeX/Equation Editor Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-black text-amber-300 flex items-center gap-1.5">
                <Type size={14} />
                <span>كود المعادلة (LaTeX / mhchem):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLatex}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                  title="نسخ كود LaTeX"
                >
                  {isCopyNotice ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{isCopyNotice ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLatexInput('')}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] cursor-pointer"
                  title="مسح الحقل"
                >
                  <Trash2 size={12} />
                  <span>مسح</span>
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl font-mono text-sm text-amber-200 focus:outline-hidden placeholder:text-slate-600 custom-scrollbar text-left"
              dir="ltr"
              placeholder="اكتب كود المعادلة مثلاً: \ce{2H2 + O2 -> 2H2O} أو \int_{a}^{b} f(x)dx"
            />
          </div>

          {/* Live MathJax Preview Display Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-teal-300">
                <Eye size={14} />
                <span>المعاينة اللحظية عالية الجودة (Live MathJax Preview):</span>
              </span>
              {isRenderError ? (
                <span className="text-[11px] text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800">
                  {errorMessage || 'تحقق من صحة صياغة كود LaTeX'}
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={12} />
                  <span>جاهز للإدراج</span>
                </span>
              )}
            </div>

            <div 
              className={`w-full min-h-[110px] p-4 rounded-2xl flex items-center justify-center overflow-x-auto transition-all ${
                cardBackground === 'white' 
                  ? 'bg-white border-2 border-slate-300 text-slate-900 shadow-inner' 
                  : cardBackground === 'yellow'
                    ? 'bg-amber-100 border-2 border-amber-300 text-slate-900 shadow-inner'
                    : cardBackground === 'dark'
                      ? 'bg-slate-950 border-2 border-slate-800 text-white'
                      : 'bg-slate-950/90 border border-teal-500/40 text-white'
              }`}
            >
              <div 
                ref={previewContainerRef} 
                className="w-full flex items-center justify-center select-none text-center"
                dir="ltr"
              />
            </div>
          </div>

          {/* Appearance & Color Options */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Color Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Palette size={14} />
                <span>لون المعادلة:</span>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { name: 'داكن/أسود', color: '#1E293B' },
                  { name: 'أبيض', color: '#FFFFFF' },
                  { name: 'أزرق', color: '#2563EB' },
                  { name: 'أخضر', color: '#10B981' },
                  { name: 'أحمر/قرمزي', color: '#EF4444' },
                  { name: 'ذهبي/برتقالي', color: '#F59E0B' },
                  { name: 'بنفسجي', color: '#8B5CF6' }
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setSelectedColor(c.color)}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      selectedColor === c.color ? 'scale-125 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Background Style */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">خلفية البطاقة:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'transparent', label: 'شفافة' },
                  { id: 'white', label: 'بيضاء' },
                  { id: 'yellow', label: 'صفراء' },
                  { id: 'dark', label: 'داكنة' }
                ].map(bg => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setCardBackground(bg.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      cardBackground === bg.id ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">حجم الخط:</span>
              <input
                type="range"
                min="16"
                max="48"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-amber-300 w-6">{fontSize}px</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <footer className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!latexInput.trim() || isRenderError}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-teal-400 hover:from-amber-400 hover:to-teal-300 text-slate-950 rounded-2xl text-xs font-black shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed scale-102"
          >
            <Check size={16} />
            <span>إدراج المعادلة على اللوح الذكي ✨</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
