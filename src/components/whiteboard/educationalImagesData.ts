export interface EducationalGraphic {
  id: string;
  title: string;
  category: 'math' | 'physics' | 'chemistry' | 'biology' | 'geography' | 'stickers';
  categoryLabel: string;
  tags: string[];
  description: string;
  width: number;
  height: number;
  svg: string;
  previewColor?: string;
}

// Convert raw SVG string to safe Data URL
export const svgToDataUrl = (svgString: string): string => {
  const encoded = encodeURIComponent(svgString.trim())
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

export const EDUCATIONAL_CATEGORIES = [
  { id: 'all', label: 'جميع الأقسام', icon: '🌟' },
  { id: 'math', label: 'رياضيات وهندسة', icon: '📐' },
  { id: 'physics', label: 'فيزياء وميكانيكا', icon: '⚡' },
  { id: 'chemistry', label: 'كيمياء وذرات', icon: '🧪' },
  { id: 'biology', label: 'أحياء وتشريح', icon: '🧬' },
  { id: 'geography', label: 'جغرافيا وفضاء', icon: '🌍' },
  { id: 'stickers', label: 'شارات وملصقات المعلم', icon: '🏷️' },
] as const;

export const EDUCATIONAL_GRAPHICS: EducationalGraphic[] = [
  // ===================== MATH & GEOMETRY =====================
  {
    id: 'math_pythagoras',
    title: 'مثلث قائم الزاوية ونظرية فيثاغورس',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['فيثاغورس', 'مثلث', 'قائم الزاوية', 'وتر', 'أضلاع', 'هندسة', 'pythagoras', 'triangle'],
    description: 'رسم هندسي لمثلث قائم الزاوية مع تحديد الوتر (c) والضلعين (a, b) وعلاقة a² + b² = c²',
    width: 600,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <defs>
        <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="450" rx="16" fill="#FFFFFF" fill-opacity="0.95" stroke="#E2E8F0" stroke-width="2" />
      <polygon points="120,340 460,340 120,100" fill="url(#triGrad)" stroke="#1E40AF" stroke-width="4" stroke-linejoin="round" />
      <!-- Right angle mark -->
      <path d="M 120,305 L 155,305 L 155,340" fill="none" stroke="#EF4444" stroke-width="3" />
      <circle cx="138" cy="322" r="3" fill="#EF4444" />
      <!-- Labels -->
      <text x="280" y="375" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#1E3A8A" text-anchor="middle">الضلع المجاور (a)</text>
      <text x="70" y="225" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#1E3A8A" text-anchor="middle">الضلع (b)</text>
      <text x="325" y="200" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#DC2626" text-anchor="middle" transform="rotate(-35 325 200)">الوتر (c)</text>
      <!-- Formula Banner -->
      <rect x="180" y="30" width="240" height="50" rx="12" fill="#1E293B" />
      <text x="300" y="63" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#FBBF24" text-anchor="middle">a² + b² = c²</text>
    </svg>`
  },
  {
    id: 'math_unit_circle',
    title: 'دائرة الوحدة والزوايا المثلثية',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['دائرة الوحدة', 'مثلثات', 'جيب', 'جيب تمام', 'sin', 'cos', 'زوايا', 'راديان', 'trig'],
    description: 'دائرة الوحدة مع محاور الإحداثيات والزوايا الأساسية (0, 30, 45, 60, 90) وقيم (cos θ, sin θ)',
    width: 600,
    height: 600,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
      <rect width="600" height="600" rx="16" fill="#FFFFFF" fill-opacity="0.95" stroke="#CBD5E1" stroke-width="2" />
      <!-- Axes -->
      <line x1="60" y1="300" x2="540" y2="300" stroke="#0F172A" stroke-width="2.5" marker-end="url(#arrow)" />
      <line x1="300" y1="540" x2="300" y2="60" stroke="#0F172A" stroke-width="2.5" marker-end="url(#arrow)" />
      <!-- Circle -->
      <circle cx="300" cy="300" r="180" fill="none" stroke="#2563EB" stroke-width="3.5" />
      <circle cx="300" cy="300" r="4" fill="#EF4444" />
      <!-- Angle lines -->
      <line x1="300" y1="300" x2="455" y2="210" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4,4" />
      <line x1="300" y1="300" x2="427" y2="173" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4,4" />
      <line x1="300" y1="300" x2="390" y2="144" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- Key Angle Dots -->
      <circle cx="455" cy="210" r="5" fill="#10B981" />
      <circle cx="427" cy="173" r="5" fill="#F59E0B" />
      <circle cx="390" cy="144" r="5" fill="#8B5CF6" />
      <!-- Labels -->
      <text x="555" y="305" font-family="monospace" font-size="16" font-weight="bold" fill="#0F172A">X</text>
      <text x="300" y="45" font-family="monospace" font-size="16" font-weight="bold" fill="#0F172A" text-anchor="middle">Y</text>
      <text x="495" y="290" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#2563EB">0° (1, 0)</text>
      <text x="300" y="105" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#2563EB" text-anchor="middle">90° (0, 1)</text>
      <text x="85" y="290" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#2563EB">180° (-1, 0)</text>
      <text x="300" y="505" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#2563EB" text-anchor="middle">270° (0, -1)</text>
      <!-- Title -->
      <rect x="190" y="15" width="220" height="35" rx="8" fill="#1E293B" />
      <text x="300" y="39" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#F8FAFC" text-anchor="middle">دائرة الوحدة (Unit Circle)</text>
    </svg>`
  },
  {
    id: 'math_cartesian_grid',
    title: 'المستوى الديكارتي ثنائي الأبعاد (X/Y Plane)',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['محاور', 'مستوى إحداثي', 'ديكارتي', 'x-axis', 'y-axis', 'أرباع', 'نقاط', 'cartesian'],
    description: 'شبكة بيانية كاملة مع المحاور وتسمية الأرباع الأربعة ونقاط مرجعية',
    width: 600,
    height: 500,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" width="600" height="500">
      <rect width="600" height="500" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <!-- Grid lines -->
      <defs>
        <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E2E8F0" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="600" height="500" fill="url(#gridPattern)" />
      <!-- Main Axes -->
      <line x1="40" y1="250" x2="560" y2="250" stroke="#1E293B" stroke-width="3" />
      <line x1="300" y1="460" x2="300" y2="40" stroke="#1E293B" stroke-width="3" />
      <!-- Arrows -->
      <polygon points="565,250 550,244 550,256" fill="#1E293B" />
      <polygon points="300,35 294,50 306,50" fill="#1E293B" />
      <!-- Quadrants -->
      <rect x="340" y="70" width="130" height="35" rx="8" fill="#DBEAFE" fill-opacity="0.8" />
      <text x="405" y="94" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#1E40AF" text-anchor="middle">الربع الأول (+,+)</text>
      <rect x="130" y="70" width="130" height="35" rx="8" fill="#FEE2E2" fill-opacity="0.8" />
      <text x="195" y="94" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#991B1B" text-anchor="middle">الربع الثاني (-,+)</text>
      <rect x="130" y="390" width="130" height="35" rx="8" fill="#FEF3C7" fill-opacity="0.8" />
      <text x="195" y="414" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#92400E" text-anchor="middle">الربع الثالث (-,-)</text>
      <rect x="340" y="390" width="130" height="35" rx="8" fill="#DCFCE7" fill-opacity="0.8" />
      <text x="405" y="414" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#166534" text-anchor="middle">الربع الرابع (+,-)</text>
      <!-- Origin -->
      <circle cx="300" cy="250" r="5" fill="#EF4444" />
      <text x="315" y="270" font-family="monospace" font-size="14" font-weight="bold" fill="#0F172A">(0, 0)</text>
      <text x="560" y="240" font-family="monospace" font-size="16" font-weight="bold" fill="#1E293B">X+</text>
      <text x="315" y="45" font-family="monospace" font-size="16" font-weight="bold" fill="#1E293B">Y+</text>
    </svg>`
  },
  {
    id: 'math_bell_curve',
    title: 'منحنى التوزيع الطبيعي المعياري (Gaussian Bell Curve)',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['توزيع طبيعي', 'إحصاء', 'احتمالات', 'انحراف معياري', 'متوسط', 'bell curve', 'normal distribution'],
    description: 'منحنى الجرس الإحصائي مع نسب التوزيع (68%، 95%، 99.7%) والانحرافات المعيارية (±1σ, ±2σ, ±3σ)',
    width: 650,
    height: 400,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 400" width="650" height="400">
      <rect width="650" height="400" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Baseline Axis -->
      <line x1="50" y1="320" x2="600" y2="320" stroke="#334155" stroke-width="2" />
      <!-- Curve Path & Shading -->
      <path d="M 50,320 C 180,320 220,100 325,100 C 430,100 470,320 600,320 Z" fill="#3B82F6" fill-opacity="0.15" stroke="#2563EB" stroke-width="3.5" />
      <!-- Central Mean line -->
      <line x1="325" y1="100" x2="325" y2="320" stroke="#DC2626" stroke-width="2.5" stroke-dasharray="5,5" />
      <text x="325" y="345" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#DC2626" text-anchor="middle">المتوسط μ</text>
      <!-- Standard Deviations -->
      <line x1="240" y1="180" x2="240" y2="320" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3,3" />
      <line x1="410" y1="180" x2="410" y2="320" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3,3" />
      <text x="240" y="345" font-family="monospace" font-size="14" font-weight="bold" fill="#475569" text-anchor="middle">-1σ</text>
      <text x="410" y="345" font-family="monospace" font-size="14" font-weight="bold" fill="#475569" text-anchor="middle">+1σ</text>
      <!-- Percentage Badges -->
      <rect x="265" y="210" width="120" height="30" rx="8" fill="#1E293B" />
      <text x="325" y="231" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#38BDF8" text-anchor="middle">68.2% (±1σ)</text>
      <!-- Title -->
      <text x="325" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">التوزيع الطبيعي المعياري (Normal Distribution)</text>
    </svg>`
  },
  {
    id: 'math_venn_diagram',
    title: 'مخطط فن للمجموعات والتقاطع والاتحاد (Venn Diagram)',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['فن', 'مجموعات', 'تقاطع', 'اتحاد', 'احتمالات', 'منطق', 'venn diagram', 'sets'],
    description: 'مجموعتان متقاطعتان A و B مع تظليل التقاطع A ∩ B والاتحاد والفرق',
    width: 600,
    height: 420,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
      <rect width="600" height="420" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <!-- Universal set rectangle -->
      <rect x="40" y="40" width="520" height="340" rx="12" fill="#FFFFFF" stroke="#64748B" stroke-width="2" />
      <text x="70" y="75" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#64748B">المجموعة الشاملة (U)</text>
      <!-- Circle A -->
      <circle cx="230" cy="210" r="120" fill="#3B82F6" fill-opacity="0.3" stroke="#2563EB" stroke-width="3" />
      <text x="160" y="215" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#1D4ED8">A</text>
      <!-- Circle B -->
      <circle cx="370" cy="210" r="120" fill="#10B981" fill-opacity="0.3" stroke="#059669" stroke-width="3" />
      <text x="430" y="215" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#047857">B</text>
      <!-- Intersection Label -->
      <text x="300" y="215" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#B45309" text-anchor="middle">A ∩ B</text>
      <!-- Bottom Legend -->
      <rect x="180" y="335" width="240" height="32" rx="8" fill="#1E293B" />
      <text x="300" y="356" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#F8FAFC" text-anchor="middle">منطقة التقاطع المشتركة (A ∩ B)</text>
    </svg>`
  },
  {
    id: 'math_fraction_pies',
    title: 'الكسور والقطاعات الدائرية (Fractions Breakdown)',
    category: 'math',
    categoryLabel: 'رياضيات وهندسة',
    tags: ['كسور', 'نصف', 'ربع', 'ثلث', 'أجزاء', 'قطاع دائري', 'fractions', 'pie'],
    description: 'تمثيل بصري للكسور الشائعة (1/1, 1/2, 1/3, 1/4) بألوان زاهية وواضحة',
    width: 600,
    height: 400,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
      <rect width="600" height="400" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Title -->
      <text x="300" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">تمثيل الكسور الاعتيادية (Visual Fractions)</text>
      <!-- 1 Whole -->
      <g transform="translate(80, 80)">
        <circle cx="50" cy="50" r="45" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2.5" />
        <text x="50" y="130" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#1E3A8A" text-anchor="middle">1 كامل (1/1)</text>
      </g>
      <!-- 1/2 -->
      <g transform="translate(200, 80)">
        <circle cx="50" cy="50" r="45" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
        <path d="M 50,5 A 45,45 0 0,1 50,95 Z" fill="#10B981" stroke="#047857" stroke-width="2" />
        <text x="50" y="130" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#065F46" text-anchor="middle">نصف (1/2)</text>
      </g>
      <!-- 1/3 -->
      <g transform="translate(320, 80)">
        <circle cx="50" cy="50" r="45" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
        <path d="M 50,50 L 50,5 A 45,45 0 0,1 89,72 Z" fill="#F59E0B" stroke="#B45309" stroke-width="2" />
        <text x="50" y="130" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#92400E" text-anchor="middle">ثلث (1/3)</text>
      </g>
      <!-- 1/4 -->
      <g transform="translate(440, 80)">
        <circle cx="50" cy="50" r="45" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
        <path d="M 50,50 L 50,5 A 45,45 0 0,1 95,50 Z" fill="#8B5CF6" stroke="#6D28D9" stroke-width="2" />
        <text x="50" y="130" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#5B21B6" text-anchor="middle">ربع (1/4)</text>
      </g>
      <!-- Formula Bar -->
      <rect x="120" y="270" width="360" height="60" rx="14" fill="#0F172A" />
      <text x="300" y="307" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#FCD34D" text-anchor="middle">البسط (الأجزاء المظللة) ÷ المقام (العدد الكلي)</text>
    </svg>`
  },

  // ===================== PHYSICS & MECHANICS =====================
  {
    id: 'phys_circuit',
    title: 'مخطط دائرة كهربائية بسيطة مع المكونات',
    category: 'physics',
    categoryLabel: 'فيزياء وميكانيكا',
    tags: ['دائرة كهربائية', 'بطارية', 'مصباح', 'مقاومة', 'مفتاح', 'تيار', 'circuit', 'electricity', 'physics'],
    description: 'رسم تخطيطي لدائرة كهربائية مغلقة تشمل بطارية ومفتاح ومقاومة ومصباح مضيء مع اتجاه التيار',
    width: 600,
    height: 420,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
      <rect width="600" height="420" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Circuit Wires -->
      <path d="M 120,210 L 120,100 L 480,100 L 480,320 L 120,320 L 120,250" fill="none" stroke="#1E293B" stroke-width="4" stroke-linecap="round" />
      <!-- Battery on Left -->
      <line x1="90" y1="210" x2="150" y2="210" stroke="#EF4444" stroke-width="5" />
      <line x1="105" y1="230" x2="135" y2="230" stroke="#0F172A" stroke-width="3" />
      <line x1="90" y1="250" x2="150" y2="250" stroke="#EF4444" stroke-width="5" />
      <text x="65" y="215" font-family="monospace" font-size="20" font-weight="bold" fill="#EF4444">+</text>
      <text x="65" y="255" font-family="monospace" font-size="20" font-weight="bold" fill="#0F172A">-</text>
      <text x="50" y="290" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#64748B">بطارية (V)</text>
      <!-- Switch on Top -->
      <circle cx="260" cy="100" r="5" fill="#1E293B" />
      <circle cx="340" cy="100" r="5" fill="#1E293B" />
      <line x1="260" y1="100" x2="335" y2="80" stroke="#059669" stroke-width="4" />
      <text x="300" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#059669" text-anchor="middle">مفتاح مغلق (Switch)</text>
      <!-- Resistor on Right -->
      <path d="M 480,180 L 465,190 L 495,205 L 465,220 L 495,235 L 480,245" fill="none" stroke="#D97706" stroke-width="4" />
      <text x="535" y="215" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#D97706">مقاومة (R)</text>
      <!-- Lamp at Bottom -->
      <circle cx="300" cy="320" r="24" fill="#FEF08A" stroke="#CA8A04" stroke-width="3" />
      <path d="M 285,305 L 315,335 M 315,305 L 285,335" stroke="#CA8A04" stroke-width="2.5" />
      <text x="300" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#854D0E" text-anchor="middle">مصباح كهربائي (Lamp) 💡</text>
      <!-- Current Arrow -->
      <polygon points="200,95 215,100 200,105" fill="#2563EB" />
      <text x="210" y="125" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563EB">اتجاه التيار (I)</text>
    </svg>`
  },
  {
    id: 'phys_prism_dispersion',
    title: 'انكسار الضوء وتحليل الطيف عبر المنشور الزجاجي',
    category: 'physics',
    categoryLabel: 'فيزياء وميكانيكا',
    tags: ['ضوء', 'انكسار', 'طيف', 'منشور', 'ألوان الطيف', 'قوس قزح', 'بصريات', 'prism', 'refraction', 'light'],
    description: 'انكسار شعاع الضوء الأبيض داخل المنشور الزجاجي وتحلله إلى ألوان الطيف السبعة',
    width: 620,
    height: 420,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 420" width="620" height="420">
      <rect width="620" height="420" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2" />
      <!-- Prism Glass Triangle -->
      <polygon points="280,80 430,340 130,340" fill="#38BDF8" fill-opacity="0.2" stroke="#38BDF8" stroke-width="3" />
      <!-- White incident light beam -->
      <line x1="30" y1="260" x2="200" y2="220" stroke="#FFFFFF" stroke-width="5" />
      <text x="90" y="235" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#F8FAFC">ضوء أبيض ناصع</text>
      <!-- Internal refracted rays -->
      <line x1="200" y1="220" x2="330" y2="210" stroke="#F8FAFC" stroke-width="3" stroke-opacity="0.7" />
      <!-- Dispersed Spectral Beams exiting -->
      <!-- Red -->
      <line x1="330" y1="205" x2="570" y2="160" stroke="#EF4444" stroke-width="3.5" />
      <text x="585" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#EF4444">أحمر (Red)</text>
      <!-- Orange -->
      <line x1="330" y1="210" x2="570" y2="185" stroke="#F97316" stroke-width="3" />
      <!-- Yellow -->
      <line x1="330" y1="213" x2="570" y2="210" stroke="#FBBF24" stroke-width="3" />
      <!-- Green -->
      <line x1="330" y1="216" x2="570" y2="235" stroke="#10B981" stroke-width="3" />
      <!-- Blue -->
      <line x1="330" y1="220" x2="570" y2="260" stroke="#3B82F6" stroke-width="3" />
      <!-- Violet -->
      <line x1="330" y1="225" x2="570" y2="285" stroke="#8B5CF6" stroke-width="3.5" />
      <text x="585" y="290" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#A78BFA">بنفسجي (Violet)</text>
      <!-- Title Badge -->
      <rect x="180" y="20" width="260" height="35" rx="8" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="310" y="44" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#F8FAFC" text-anchor="middle">تحليل الضوء الأبيض (Prism Dispersion)</text>
    </svg>`
  },
  {
    id: 'phys_free_body_diagram',
    title: 'مخطط القوى المؤثرة للجسم الحر (Free Body Diagram)',
    category: 'physics',
    categoryLabel: 'فيزياء وميكانيكا',
    tags: ['قوى', 'نيوتن', 'وزن', 'احتكاك', 'جسم حر', 'حركة', 'free body', 'forces', 'newton'],
    description: 'مخطط تفاعلي يوضح قوى الجاذبية (الوزن Fg)، القوة العمودية (Fn)، قوة الدفع (F_applied)، وقوة الاحتكاك (F_friction)',
    width: 600,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Surface Plane -->
      <line x1="60" y1="300" x2="540" y2="300" stroke="#475569" stroke-width="4" />
      <!-- Object Block -->
      <rect x="230" y="180" width="140" height="120" rx="12" fill="#3B82F6" fill-opacity="0.2" stroke="#1D4ED8" stroke-width="3" />
      <text x="300" y="245" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#1E3A8A" text-anchor="middle">الكتلة (m)</text>
      <!-- Center Point -->
      <circle cx="300" cy="240" r="6" fill="#EF4444" />
      <!-- Normal Force Fn Up -->
      <line x1="300" y1="240" x2="300" y2="90" stroke="#10B981" stroke-width="4" marker-end="url(#arrowUp)" />
      <polygon points="300,75 293,95 307,95" fill="#10B981" />
      <text x="300" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#047857" text-anchor="middle">القوة العمودية (Fn)</text>
      <!-- Gravity Force Fg Down -->
      <line x1="300" y1="240" x2="300" y2="390" stroke="#DC2626" stroke-width="4" />
      <polygon points="300,405 293,385 307,385" fill="#DC2626" />
      <text x="300" y="430" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#B91C1C" text-anchor="middle">قوة الجاذبية / الوزن (W = mg)</text>
      <!-- Applied Force Right -->
      <line x1="300" y1="240" x2="480" y2="240" stroke="#2563EB" stroke-width="4" />
      <polygon points="495,240 475,233 475,247" fill="#2563EB" />
      <text x="500" y="225" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#1D4ED8">قوة السحب (F)</text>
      <!-- Friction Force Left -->
      <line x1="300" y1="240" x2="120" y2="240" stroke="#D97706" stroke-width="4" />
      <polygon points="105,240 125,233 125,247" fill="#D97706" />
      <text x="100" y="225" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#B45309" text-anchor="end">قوة الاحتكاك (Fk)</text>
    </svg>`
  },
  {
    id: 'phys_magnetic_field',
    title: 'المجال المغناطيسي لقضيب مغناطيسي (N/S Poles)',
    category: 'physics',
    categoryLabel: 'فيزياء وميكانيكا',
    tags: ['مغناطيس', 'مجال مغناطيسي', 'شمالي', 'جنوبي', 'فيزياء', 'magnet', 'magnetic field'],
    description: 'رسم واضح لخطوط المجال المغناطيسي المنطلقة من القطب الشمالي N إلى القطب الجنوبي S',
    width: 600,
    height: 400,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
      <rect width="600" height="400" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <!-- Field Ellipses -->
      <ellipse cx="300" cy="200" rx="220" ry="110" fill="none" stroke="#93C5FD" stroke-width="2" stroke-dasharray="6,4" />
      <ellipse cx="300" cy="200" rx="260" ry="160" fill="none" stroke="#BFDBFE" stroke-width="1.5" stroke-dasharray="6,4" />
      <!-- Central Bar Magnet -->
      <rect x="180" y="165" width="120" height="70" rx="6" fill="#DC2626" />
      <text x="240" y="210" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">N (ش)</text>
      <rect x="300" y="165" width="120" height="70" rx="6" fill="#2563EB" />
      <text x="360" y="210" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">S (ج)</text>
      <!-- Arrows indicating direction from N to S -->
      <polygon points="300,85 290,95 310,95" fill="#3B82F6" />
      <polygon points="300,315 310,305 290,305" fill="#3B82F6" />
      <!-- Legend -->
      <rect x="150" y="25" width="300" height="35" rx="8" fill="#1E293B" />
      <text x="300" y="49" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#F8FAFC" text-anchor="middle">خطوط المجال المغناطيسي (من N إلى S)</text>
    </svg>`
  },

  // ===================== CHEMISTRY & ATOMS =====================
  {
    id: 'chem_water_molecule',
    title: 'تركيب جزيء الماء والروابط القطبية (H2O Structure)',
    category: 'chemistry',
    categoryLabel: 'كيمياء وذرات',
    tags: ['ماء', 'H2O', 'روابط', 'تساهمية', 'قطبية', 'أكسجين', 'هيدروجين', 'كيمياء', 'molecule', 'water'],
    description: 'رسم ثلاثي الأبعاد لجزيء الماء يوضح ذرة الأكسجين المركزية وذرتا الهيدروجين بزاوية 104.5 درجة والشحنات الجزئية',
    width: 600,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Bonds -->
      <line x1="300" y1="180" x2="160" y2="310" stroke="#64748B" stroke-width="8" stroke-linecap="round" />
      <line x1="300" y1="180" x2="440" y2="310" stroke="#64748B" stroke-width="8" stroke-linecap="round" />
      <!-- Angle Arc -->
      <path d="M 240,230 A 70,70 0 0,1 360,230" fill="none" stroke="#D97706" stroke-width="3" stroke-dasharray="4,4" />
      <text x="300" y="270" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#B45309" text-anchor="middle">104.5°</text>
      <!-- Oxygen Atom (Red) -->
      <circle cx="300" cy="180" r="65" fill="#EF4444" stroke="#B91C1C" stroke-width="4" />
      <text x="300" y="190" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle">O</text>
      <text x="300" y="95" font-family="monospace" font-size="18" font-weight="bold" fill="#DC2626" text-anchor="middle">δ- (سالبة جزئياً)</text>
      <!-- Hydrogen Atom 1 (Blue) -->
      <circle cx="160" cy="310" r="45" fill="#3B82F6" stroke="#1D4ED8" stroke-width="3.5" />
      <text x="160" y="320" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle">H</text>
      <text x="140" y="385" font-family="monospace" font-size="16" font-weight="bold" fill="#2563EB">δ+</text>
      <!-- Hydrogen Atom 2 (Blue) -->
      <circle cx="440" cy="310" r="45" fill="#3B82F6" stroke="#1D4ED8" stroke-width="3.5" />
      <text x="440" y="320" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle">H</text>
      <text x="440" y="385" font-family="monospace" font-size="16" font-weight="bold" fill="#2563EB">δ+</text>
      <!-- Title -->
      <text x="300" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">جزيء الماء والروابط التساهمية القطبية (H₂O)</text>
    </svg>`
  },
  {
    id: 'chem_bohr_atom',
    title: 'نموذج بور الذري (Bohr Model of the Atom)',
    category: 'chemistry',
    categoryLabel: 'كيمياء وذرات',
    tags: ['ذرة', 'بور', 'إلكترونات', 'بروتونات', 'نيوترونات', 'مدارات', 'نواة', 'atom', 'bohr', 'nucleus'],
    description: 'نموذج يوضح النواة المركزية والمستويات والمدارات الإلكترونية K, L مع الإلكترونات السابحة',
    width: 600,
    height: 500,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" width="600" height="500">
      <rect width="600" height="500" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2" />
      <!-- Outer Shell L -->
      <circle cx="300" cy="250" r="170" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,4" />
      <!-- Inner Shell K -->
      <circle cx="300" cy="250" r="100" fill="none" stroke="#64748B" stroke-width="2" stroke-dasharray="5,4" />
      <!-- Nucleus -->
      <circle cx="300" cy="250" r="45" fill="#DC2626" fill-opacity="0.8" stroke="#EF4444" stroke-width="3" />
      <text x="300" y="245" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">النواة</text>
      <text x="300" y="265" font-family="monospace" font-size="11" font-weight="bold" fill="#FEF08A" text-anchor="middle">6p⁺ / 6n⁰</text>
      <!-- Electrons on K Shell (2) -->
      <circle cx="300" cy="150" r="8" fill="#38BDF8" />
      <circle cx="300" cy="350" r="8" fill="#38BDF8" />
      <!-- Electrons on L Shell (4) -->
      <circle cx="130" cy="250" r="8" fill="#38BDF8" />
      <circle cx="470" cy="250" r="8" fill="#38BDF8" />
      <circle cx="300" cy="80" r="8" fill="#38BDF8" />
      <circle cx="300" cy="420" r="8" fill="#38BDF8" />
      <!-- Labels -->
      <text x="415" y="235" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#94A3B8">مستوى K (n=1)</text>
      <text x="485" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#94A3B8">مستوى L (n=2)</text>
      <text x="300" y="40" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#F8FAFC" text-anchor="middle">النموذج الذري لذرة الكربون (Carbon Atom)</text>
    </svg>`
  },
  {
    id: 'chem_ph_scale',
    title: 'مقياس الرقم الهيدروجيني للأحماض والقلويات (pH Scale)',
    category: 'chemistry',
    categoryLabel: 'كيمياء وذرات',
    tags: ['pH', 'حمض', 'قاعدة', 'قلوي', 'متعادل', 'كيمياء', 'acid', 'base', 'neutral'],
    description: 'شريط مقياس الرقم الهيدروجيني الكامل من 0 إلى 14 مع ألوان الكواشف الدالة والأمثلة',
    width: 650,
    height: 380,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 380" width="650" height="380">
      <rect width="650" height="380" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Title -->
      <text x="325" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">مقياس الرقم الهيدروجيني (pH Scale 0 - 14)</text>
      <!-- Gradient Scale Bar -->
      <defs>
        <linearGradient id="phGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#EF4444" />
          <stop offset="25%" stop-color="#F97316" />
          <stop offset="50%" stop-color="#10B981" />
          <stop offset="75%" stop-color="#3B82F6" />
          <stop offset="100%" stop-color="#7C3AED" />
        </linearGradient>
      </defs>
      <rect x="50" y="110" width="550" height="60" rx="12" fill="url(#phGrad)" stroke="#1E293B" stroke-width="2" />
      <!-- Numbers 0, 7, 14 -->
      <text x="60" y="145" font-family="monospace" font-size="20" font-weight="900" fill="#FFFFFF">0</text>
      <text x="325" y="145" font-family="monospace" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">7</text>
      <text x="590" y="145" font-family="monospace" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="end">14</text>
      <!-- Category Badges -->
      <rect x="50" y="200" width="170" height="45" rx="8" fill="#FEE2E2" />
      <text x="135" y="228" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#991B1B" text-anchor="middle">أحماض قوية ومتوسطة</text>
      <rect x="240" y="200" width="170" height="45" rx="8" fill="#DCFCE7" />
      <text x="325" y="228" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#166534" text-anchor="middle">متعادل (ماء نقي)</text>
      <rect x="430" y="200" width="170" height="45" rx="8" fill="#EDE9FE" />
      <text x="515" y="228" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#5B21B6" text-anchor="middle">قواعد وقلويات</text>
      <!-- Bottom helper note -->
      <text x="325" y="310" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#64748B" text-anchor="middle">كلما قل الرقم عن 7 زادت الحامضية، وكلما زاد عن 7 زادت القلوية</text>
    </svg>`
  },

  // ===================== BIOLOGY & LIFE SCIENCES =====================
  {
    id: 'bio_heart_anatomy',
    title: 'تشريح قلب الإنسان وتدفق الدورة الدموية',
    category: 'biology',
    categoryLabel: 'أحياء وتشريح',
    tags: ['قلب', 'تشريح', 'دورة دموية', 'بطين', 'أذين', 'شريان أبهر', 'صمام', 'heart', 'anatomy', 'biology'],
    description: 'رسم تشريحي يوضح حجرات القلب الأربعة (الأذين الأيمن/الأيسر والبطين الأيمن/الأيسر) وتدفق الدم المؤكسج وغير المؤكسج',
    width: 600,
    height: 520,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="600" height="520">
      <rect width="600" height="520" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Main Heart Shape Contour -->
      <path d="M 300,450 C 180,360 120,240 160,150 C 200,60 280,100 300,140 C 320,100 400,60 440,150 C 480,240 420,360 300,450 Z" fill="#FEE2E2" stroke="#DC2626" stroke-width="4" />
      <!-- Chambers Divider -->
      <line x1="300" y1="140" x2="300" y2="440" stroke="#991B1B" stroke-width="4" />
      <line x1="160" y1="260" x2="440" y2="260" stroke="#991B1B" stroke-width="3" stroke-dasharray="6,4" />
      <!-- Right Atrium (Blue - deox) -->
      <rect x="170" y="160" width="110" height="80" rx="8" fill="#3B82F6" fill-opacity="0.3" />
      <text x="225" y="195" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#1E40AF" text-anchor="middle">الأذين الأيمن</text>
      <text x="225" y="215" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#1E40AF" text-anchor="middle">(دم غير مؤكسج)</text>
      <!-- Left Atrium (Red - ox) -->
      <rect x="320" y="160" width="110" height="80" rx="8" fill="#EF4444" fill-opacity="0.3" />
      <text x="375" y="195" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#991B1B" text-anchor="middle">الأذين الأيسر</text>
      <text x="375" y="215" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#991B1B" text-anchor="middle">(دم مؤكسج)</text>
      <!-- Right Ventricle -->
      <rect x="180" y="290" width="100" height="90" rx="8" fill="#3B82F6" fill-opacity="0.3" />
      <text x="230" y="340" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#1E40AF" text-anchor="middle">البطين الأيمن</text>
      <!-- Left Ventricle -->
      <rect x="320" y="290" width="100" height="90" rx="8" fill="#EF4444" fill-opacity="0.3" />
      <text x="370" y="340" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#991B1B" text-anchor="middle">البطين الأيسر</text>
      <!-- Aorta top banner -->
      <rect x="220" y="20" width="160" height="40" rx="8" fill="#DC2626" />
      <text x="300" y="45" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">الشريان الأبهر (Aorta)</text>
    </svg>`
  },
  {
    id: 'bio_dna_helix',
    title: 'شريط الحمض النووي المزدوج (DNA Double Helix)',
    category: 'biology',
    categoryLabel: 'أحياء وتشريح',
    tags: ['DNA', 'حمض نووي', 'جينات', 'وراثة', 'قواعد نيتروجينية', 'أحياء', 'helix', 'genetics'],
    description: 'التركيب اللولبي المزدوج للحمض النووي DNA مع القواعد النيتروجينية (A-T, G-C)',
    width: 600,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#0F172A" stroke="#334155" stroke-width="2" />
      <!-- DNA Backbone strands -->
      <path d="M 100,225 Q 175,100 250,225 T 400,225 T 550,225" fill="none" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" />
      <path d="M 100,225 Q 175,350 250,225 T 400,225 T 550,225" fill="none" stroke="#818CF8" stroke-width="6" stroke-linecap="round" />
      <!-- Base Pair Rungs -->
      <line x1="175" y1="130" x2="175" y2="320" stroke="#F43F5E" stroke-width="4" />
      <line x1="250" y1="225" x2="250" y2="225" stroke="#10B981" stroke-width="8" stroke-linecap="round" />
      <line x1="325" y1="130" x2="325" y2="320" stroke="#FBBF24" stroke-width="4" />
      <line x1="475" y1="130" x2="475" y2="320" stroke="#34D399" stroke-width="4" />
      <!-- Legend of Bases -->
      <g transform="translate(120, 390)">
        <rect x="0" y="0" width="80" height="25" rx="6" fill="#F43F5E" />
        <text x="40" y="17" font-family="monospace" font-size="13" font-weight="900" fill="#FFFFFF" text-anchor="middle">Adenine (A)</text>
        <rect x="90" y="0" width="80" height="25" rx="6" fill="#FBBF24" />
        <text x="130" y="17" font-family="monospace" font-size="13" font-weight="900" fill="#0F172A" text-anchor="middle">Thymine (T)</text>
        <rect x="180" y="0" width="80" height="25" rx="6" fill="#10B981" />
        <text x="220" y="17" font-family="monospace" font-size="13" font-weight="900" fill="#FFFFFF" text-anchor="middle">Guanine (G)</text>
        <rect x="270" y="0" width="80" height="25" rx="6" fill="#38BDF8" />
        <text x="310" y="17" font-family="monospace" font-size="13" font-weight="900" fill="#0F172A" text-anchor="middle">Cytosine (C)</text>
      </g>
      <!-- Title -->
      <text x="300" y="50" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#F8FAFC" text-anchor="middle">التركيب الحلزوني المزدوج للحمض النووي (DNA Helix)</text>
    </svg>`
  },
  {
    id: 'bio_plant_cell',
    title: 'تركيب الخلية النباتية وعضياتها (Plant Cell)',
    category: 'biology',
    categoryLabel: 'أحياء وتشريح',
    tags: ['خلية', 'نباتية', 'جدار خلوي', 'بلاستيدات', 'نواة', 'فجوة عصاريه', 'أحياء', 'plant cell'],
    description: 'رسم توضيحي للخلية النباتية مع الجدار الخلوي، البلاستيدات الخضراء، الفجوة العصارية، والنواة',
    width: 600,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Cell Wall Outer -->
      <polygon points="120,60 480,60 550,230 480,400 120,400 50,230" fill="#DCFCE7" stroke="#16A34A" stroke-width="8" stroke-linejoin="round" />
      <!-- Cell Membrane Inner -->
      <polygon points="125,75 475,75 535,230 475,385 125,385 65,230" fill="#F0FDF4" stroke="#22C55E" stroke-width="3" stroke-linejoin="round" />
      <!-- Large Central Vacuole -->
      <ellipse cx="300" cy="240" rx="120" ry="80" fill="#BAE6FD" fill-opacity="0.6" stroke="#0284C7" stroke-width="2" />
      <text x="300" y="245" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#0369A1" text-anchor="middle">فجوة عصارية مركزية (Vacuole)</text>
      <!-- Nucleus -->
      <circle cx="170" cy="160" r="40" fill="#FCA5A5" stroke="#DC2626" stroke-width="2.5" />
      <circle cx="170" cy="160" r="14" fill="#991B1B" />
      <text x="170" y="165" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#FFFFFF" text-anchor="middle">نواة</text>
      <!-- Chloroplasts -->
      <ellipse cx="440" cy="140" rx="28" ry="16" fill="#15803D" stroke="#14532D" stroke-width="1.5" />
      <ellipse cx="430" cy="320" rx="28" ry="16" fill="#15803D" stroke="#14532D" stroke-width="1.5" />
      <text x="440" y="170" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#15803D" text-anchor="middle">بلاستيدة خضراء</text>
      <!-- Title -->
      <text x="300" y="35" font-family="system-ui, sans-serif" font-size="17" font-weight="900" fill="#14532D" text-anchor="middle">الخلية النباتية النموذجية (Plant Cell Anatomy)</text>
    </svg>`
  },

  // ===================== GEOGRAPHY & SPACE =====================
  {
    id: 'geo_solar_system',
    title: 'المجموعة الشمسية ومدارات الكواكب حول الشمس',
    category: 'geography',
    categoryLabel: 'جغرافيا وفضاء',
    tags: ['شمس', 'كواكب', 'فضاء', 'أرض', 'مريخ', 'مشتري', 'زحل', 'مدارات', 'solar system', 'planets'],
    description: 'الشمس وكواكب المجموعة الشمسية الثمانية مرتبة حسب بعدها عن الشمس مع المدارات التوضيحية',
    width: 650,
    height: 400,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 400" width="650" height="400">
      <rect width="650" height="400" rx="16" fill="#030712" stroke="#1F2937" stroke-width="2" />
      <!-- Sun at Left -->
      <circle cx="20" cy="200" r="100" fill="#F59E0B" stroke="#FBBF24" stroke-width="4" />
      <text x="45" y="205" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#78350F">الشمس</text>
      <!-- Orbits -->
      <ellipse cx="20" cy="200" rx="160" ry="140" fill="none" stroke="#374151" stroke-width="1" stroke-dasharray="3,3" />
      <ellipse cx="20" cy="200" rx="220" ry="160" fill="none" stroke="#374151" stroke-width="1" stroke-dasharray="3,3" />
      <ellipse cx="20" cy="200" rx="280" ry="170" fill="none" stroke="#374151" stroke-width="1" stroke-dasharray="3,3" />
      <ellipse cx="20" cy="200" rx="340" ry="180" fill="none" stroke="#374151" stroke-width="1" stroke-dasharray="3,3" />
      <ellipse cx="20" cy="200" rx="440" ry="190" fill="none" stroke="#374151" stroke-width="1" stroke-dasharray="3,3" />
      <!-- Planets -->
      <!-- Mercury -->
      <circle cx="160" cy="200" r="6" fill="#9CA3AF" />
      <text x="160" y="225" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#D1D5DB" text-anchor="middle">عطارد</text>
      <!-- Venus -->
      <circle cx="220" cy="200" r="10" fill="#FCD34D" />
      <text x="220" y="225" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#FDE68A" text-anchor="middle">الزهرة</text>
      <!-- Earth -->
      <circle cx="280" cy="200" r="11" fill="#38BDF8" stroke="#1D4ED8" stroke-width="1.5" />
      <text x="280" y="228" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#38BDF8" text-anchor="middle">الأرض 🌍</text>
      <!-- Mars -->
      <circle cx="340" cy="200" r="8" fill="#EF4444" />
      <text x="340" y="225" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#FCA5A5" text-anchor="middle">المريخ</text>
      <!-- Jupiter -->
      <circle cx="440" cy="200" r="26" fill="#D97706" />
      <text x="440" y="245" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#FDE68A" text-anchor="middle">المشتري</text>
      <!-- Saturn -->
      <g transform="translate(540, 200)">
        <ellipse cx="0" cy="0" rx="30" ry="7" fill="none" stroke="#FDE047" stroke-width="3" />
        <circle cx="0" cy="0" r="18" fill="#EAB308" />
        <text x="0" y="35" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#FEF08A" text-anchor="middle">زحل</text>
      </g>
      <!-- Title -->
      <text x="325" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#F8FAFC" text-anchor="middle">كواكب المجموعة الشمسية (Solar System)</text>
    </svg>`
  },
  {
    id: 'geo_earth_layers',
    title: 'طبقات كوكب الأرض الجيولوجية (Earth Layers)',
    category: 'geography',
    categoryLabel: 'جغرافيا وفضاء',
    tags: ['أرض', 'طبقات', 'قشرة', 'وشاح', 'لب خارجي', 'لب داخلي', 'جيولوجيا', 'earth layers', 'geology'],
    description: 'قطاع عرضي ثلاثي الأبعاد يوضح طبقات الأرض: القشرة، الوشاح، اللب الخارجي المنصهر، واللب الداخلي الصلب',
    width: 600,
    height: 480,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480" width="600" height="480">
      <rect width="600" height="480" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
      <!-- Earth Outer Circle (Crust) -->
      <circle cx="300" cy="250" r="170" fill="#1E40AF" stroke="#0F172A" stroke-width="3" />
      <!-- Mantle (Brown/Orange) -->
      <circle cx="300" cy="250" r="145" fill="#D97706" />
      <!-- Outer Core (Bright Orange/Yellow) -->
      <circle cx="300" cy="250" r="95" fill="#F59E0B" />
      <!-- Inner Core (Solid Yellow/White) -->
      <circle cx="300" cy="250" r="45" fill="#FEF08A" stroke="#CA8A04" stroke-width="2" />
      <!-- Slice Cutout for 3D view -->
      <path d="M 300,250 L 470,250 A 170,170 0 0,0 300,80 Z" fill="#F8FAFC" fill-opacity="0.9" stroke="#0F172A" stroke-width="2" />
      <!-- Labels with lines -->
      <text x="505" y="140" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#1E40AF">1. القشرة الأرضية (Crust)</text>
      <text x="505" y="180" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#B45309">2. الوشاح / الستار (Mantle)</text>
      <text x="505" y="220" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#D97706">3. اللب الخارجي المنصهر</text>
      <text x="505" y="260" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#A16207">4. اللب الداخلي الصلب</text>
      <!-- Title -->
      <text x="300" y="45" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="#0F172A" text-anchor="middle">الطبقات الجيولوجية لكوكب الأرض</text>
    </svg>`
  },
  {
    id: 'geo_compass_rose',
    title: 'وردة البوصلة والاتجاهات الجغرافية (Compass Rose)',
    category: 'geography',
    categoryLabel: 'جغرافيا وفضاء',
    tags: ['بوصلة', 'اتجاهات', 'شمال', 'جنوب', 'شرق', 'غرب', 'خريطة', 'جغرافيا', 'compass'],
    description: 'وردة البوصلة الدقيقة مع الاتجاهات الأصلية (شمال، جنوب، شرق، غرب) والاتجاهات الفرعية والدرجات 360°',
    width: 550,
    height: 550,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 550 550" width="550" height="550">
      <rect width="550" height="550" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
      <circle cx="275" cy="275" r="180" fill="none" stroke="#94A3B8" stroke-width="3" />
      <circle cx="275" cy="275" r="200" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- North Point (Red/Black) -->
      <polygon points="275,275 260,275 275,80" fill="#EF4444" />
      <polygon points="275,275 290,275 275,80" fill="#B91C1C" />
      <!-- South Point -->
      <polygon points="275,275 260,275 275,470" fill="#64748B" />
      <polygon points="275,275 290,275 275,470" fill="#334155" />
      <!-- East Point -->
      <polygon points="275,275 275,260 470,275" fill="#3B82F6" />
      <polygon points="275,275 275,290 470,275" fill="#1D4ED8" />
      <!-- West Point -->
      <polygon points="275,275 275,260 80,275" fill="#64748B" />
      <polygon points="275,275 275,290 80,275" fill="#334155" />
      <!-- Center Circle -->
      <circle cx="275" cy="275" r="16" fill="#0F172A" stroke="#FFFFFF" stroke-width="3" />
      <!-- Direction Labels -->
      <text x="275" y="60" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#DC2626" text-anchor="middle">الشمال (N)</text>
      <text x="275" y="515" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#0F172A" text-anchor="middle">الجنوب (S)</text>
      <text x="510" y="282" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#1D4ED8">الشرق (E)</text>
      <text x="40" y="282" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#0F172A">الغرب (W)</text>
    </svg>`
  },

  // ===================== TEACHER BADGES & STICKERS =====================
  {
    id: 'sticker_excellent_stamp',
    title: 'ختم تشجيعي: ممتاز جداً مع مرتبة الشرف 🌟',
    category: 'stickers',
    categoryLabel: 'شارات وملصقات المعلم',
    tags: ['ختم', 'ممتاز', 'تشجيع', 'تقييم', 'درجة كاملة', 'نجمة', 'تحفيز', 'excellent', 'stamp', 'badge'],
    description: 'ختم دائري ذهبي احترافي لتكريم إجابات الطلاب المميزة على السبورة',
    width: 450,
    height: 450,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="50%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#B45309" />
        </linearGradient>
      </defs>
      <!-- Outer Jagged/Round Badge -->
      <circle cx="225" cy="225" r="195" fill="url(#goldGrad)" stroke="#78350F" stroke-width="4" />
      <circle cx="225" cy="225" r="170" fill="#FEF3C7" stroke="#D97706" stroke-width="3" stroke-dasharray="6,4" />
      <!-- Star Icon -->
      <polygon points="225,95 242,145 295,145 252,178 268,230 225,198 182,230 198,178 155,145 208,145" fill="#F59E0B" stroke="#B45309" stroke-width="2" />
      <!-- Text -->
      <text x="225" y="280" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#78350F" text-anchor="middle">ممتاز جداً 🌟</text>
      <text x="225" y="325" font-family="system-ui, sans-serif" font-size="20" font-weight="900" fill="#92400E" text-anchor="middle">إجابة نموذجية ورائعة</text>
    </svg>`
  },
  {
    id: 'sticker_important_note',
    title: 'لافتة تنبيه: انتبه! ملحوظة هامة للامتحان ⚠️',
    category: 'stickers',
    categoryLabel: 'شارات وملصقات المعلم',
    tags: ['انتبه', 'ملحوظة', 'مهم', 'امتحان', 'تنبيه', 'warning', 'important', 'note'],
    description: 'لافتة تحذير وتنبيه بلون أصفر فاقع لتسليط الضوء على القوانين والملاحظات الجوهرية',
    width: 550,
    height: 250,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 550 250" width="550" height="250">
      <rect width="550" height="250" rx="20" fill="#FEF08A" stroke="#CA8A04" stroke-width="4" />
      <!-- Warning Triangle -->
      <g transform="translate(430, 60)">
        <polygon points="45,10 85,90 5,90" fill="#DC2626" stroke="#991B1B" stroke-width="3" />
        <text x="45" y="75" font-family="system-ui, sans-serif" font-size="40" font-weight="900" fill="#FFFFFF" text-anchor="middle">!</text>
      </g>
      <!-- Text Content -->
      <text x="390" y="90" font-family="system-ui, sans-serif" font-size="26" font-weight="900" fill="#713F12" text-anchor="end">⚠️ انتبه! نقطة هامة جداً</text>
      <text x="390" y="140" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#854D0E" text-anchor="end">يتكرر هذا القانون وتطبيقه في الاختبارات والأسئلة الوزارية</text>
    </svg>`
  },
  {
    id: 'sticker_thinking_question',
    title: 'شعار: سؤال للتفكير والتحليل الذكي 💡',
    category: 'stickers',
    categoryLabel: 'شارات وملصقات المعلم',
    tags: ['سؤال', 'تفكير', 'ذكاء', 'تحليل', 'مصباح', 'thinking', 'question', 'puzzle'],
    description: 'ملصق تفاعلي لتحفيز النقاش والأسئلة الاستنتاجية أثناء الحصة',
    width: 550,
    height: 250,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 550 250" width="550" height="250">
      <rect width="550" height="250" rx="20" fill="#EDE9FE" stroke="#8B5CF6" stroke-width="4" />
      <text x="60" y="130" font-family="system-ui, sans-serif" font-size="60">💡</text>
      <text x="140" y="95" font-family="system-ui, sans-serif" font-size="26" font-weight="900" fill="#4C1D95">سؤال للتفكير والتحليل 🤔</text>
      <text x="140" y="145" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#5B21B6">استنتج النتيجة وفكر في السبب العلمي قبل الإجابة</text>
    </svg>`
  }
];
