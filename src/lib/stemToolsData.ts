import { StemToolDef } from '../types/stemWhiteboard';

export const STEM_TOOL_DEFINITIONS: StemToolDef[] = [
  // ==========================================
  // 1. المجسمات ثلاثية الأبعاد (3D Shapes)
  // ==========================================
  {
    type: 'cube-3d',
    category: '3d-shapes',
    titleAr: 'مكعب',
    titleEn: 'Cube',
    iconName: 'Box',
    description: 'مجسم منتظم أوجهه الستة مربعات متطابقة',
    defaultWidth: 140,
    defaultHeight: 140,
    defaultColor: '#3b82f6',
    defaultFillColor: '#dbeafe',
    defaultParams: {
      dimensionA: 5,
      unit: 'cm',
      volumeFormula: 'V = a³',
      areaFormula: 'A = 6a²'
    },
    formulas: {
      volume: 'V = a³',
      surfaceArea: 'A = 6a²'
    }
  },
  {
    type: 'cuboid-3d',
    category: '3d-shapes',
    titleAr: 'متوازي مستطيلات',
    titleEn: 'Cuboid',
    iconName: 'Box',
    description: 'مجسم أوجهه مستطيلة، له 6 وجوه و12 حرفاً و8 رؤوس',
    defaultWidth: 180,
    defaultHeight: 120,
    defaultColor: '#0ea5e9',
    defaultFillColor: '#e0f2fe',
    defaultParams: {
      dimensionA: 6, // Length L
      dimensionB: 4, // Width W
      dimensionC: 3, // Height H
      unit: 'cm',
      volumeFormula: 'V = L × W × H',
      areaFormula: 'A = 2(LW + LH + WH)'
    },
    formulas: {
      volume: 'V = L × W × H',
      surfaceArea: 'A = 2(LW + LH + WH)'
    }
  },
  {
    type: 'pyramid-3d',
    category: '3d-shapes',
    titleAr: 'هرم رباعي',
    titleEn: 'Pyramid',
    iconName: 'Pyramid',
    description: 'مجسم قاعدته مربعة وأوجهه الجانبية مثلثات تلتقي في القمة',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#8b5cf6',
    defaultFillColor: '#ede9fe',
    defaultParams: {
      dimensionA: 6, // base side a
      dimensionB: 8, // height h
      unit: 'cm',
      volumeFormula: 'V = ⅓ × a² × h',
      areaFormula: 'A = a² + 2a × s'
    },
    formulas: {
      volume: 'V = ⅓ B h = ⅓ a² h',
      surfaceArea: 'A = a² + 2a s'
    }
  },
  {
    type: 'triangular-prism-3d',
    category: '3d-shapes',
    titleAr: 'منشور ثلاثي',
    titleEn: 'Triangular Prism',
    iconName: 'Triangle',
    description: 'مجسم قاعدتاه مثلثتان متطابقتان وأوجهه الجانبية متوازيات أضلاع',
    defaultWidth: 170,
    defaultHeight: 130,
    defaultColor: '#10b981',
    defaultFillColor: '#d1fae5',
    defaultParams: {
      dimensionA: 5,
      dimensionB: 4,
      dimensionC: 8,
      unit: 'cm',
      volumeFormula: 'V = ½ × b × h × L',
      areaFormula: 'A = bh + (a+b+c)L'
    }
  },
  {
    type: 'tetrahedron-3d',
    category: '3d-shapes',
    titleAr: 'رباعي الوجوه',
    titleEn: 'Tetrahedron',
    iconName: 'Sparkles',
    description: 'هرم ثلاثي أوجهه الأربعة مثلثات متساوية الأضلاع',
    defaultWidth: 140,
    defaultHeight: 140,
    defaultColor: '#ec4899',
    defaultFillColor: '#fce7f3',
    defaultParams: {
      dimensionA: 4,
      unit: 'cm',
      volumeFormula: 'V = a³ / (6√2)',
      areaFormula: 'A = √3 a²'
    }
  },
  {
    type: 'cylinder-3d',
    category: '3d-shapes',
    titleAr: 'أسطوانة',
    titleEn: 'Cylinder',
    iconName: 'Cylinder',
    description: 'مجسم دوراني قاعدتاه دائرتان متوازيتان ومتطابقتان',
    defaultWidth: 130,
    defaultHeight: 170,
    defaultColor: '#059669',
    defaultFillColor: '#a7f3d0',
    defaultParams: {
      dimensionA: 3, // Radius r
      dimensionB: 7, // Height h
      unit: 'cm',
      volumeFormula: 'V = π r² h',
      areaFormula: 'A = 2πr(r + h)'
    },
    formulas: {
      volume: 'V = π r² h',
      surfaceArea: 'A = 2πr(r + h)'
    }
  },
  {
    type: 'cone-3d',
    category: '3d-shapes',
    titleAr: 'مخروط',
    titleEn: 'Cone',
    iconName: 'Cone',
    description: 'مجسم دوراني قاعدته دائرة وله رأس واحد مدبب',
    defaultWidth: 140,
    defaultHeight: 170,
    defaultColor: '#f59e0b',
    defaultFillColor: '#fef3c7',
    defaultParams: {
      dimensionA: 4, // Radius r
      dimensionB: 9, // Height h
      unit: 'cm',
      volumeFormula: 'V = ⅓ π r² h',
      areaFormula: 'A = πr(r + √(r²+h²))'
    },
    formulas: {
      volume: 'V = ⅓ π r² h',
      surfaceArea: 'A = πr(r + l)'
    }
  },
  {
    type: 'sphere-3d',
    category: '3d-shapes',
    titleAr: 'كرة',
    titleEn: 'Sphere',
    iconName: 'Circle',
    description: 'مجسم دوراني منتظم تبعد جميع نقاط سطحه مسافة متساوية عن المركز',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#6366f1',
    defaultFillColor: '#e0e7ff',
    defaultParams: {
      dimensionA: 5, // Radius r
      unit: 'cm',
      volumeFormula: 'V = ⁴⁄₃ π r³',
      areaFormula: 'A = 4π r²'
    },
    formulas: {
      volume: 'V = ⁴⁄₃ π r³',
      surfaceArea: 'A = 4π r²'
    }
  },
  {
    type: 'hemisphere-3d',
    category: '3d-shapes',
    titleAr: 'نصف كرة',
    titleEn: 'Hemisphere',
    iconName: 'Disc',
    description: 'نصف كرة ناتج عن قطع كرة مستوية بمستوٍ يمر بمركزها',
    defaultWidth: 150,
    defaultHeight: 110,
    defaultColor: '#0284c7',
    defaultFillColor: '#bae6fd',
    defaultParams: {
      dimensionA: 4,
      unit: 'cm',
      volumeFormula: 'V = ⅔ π r³',
      areaFormula: 'A = 3π r²'
    }
  },
  {
    type: 'capsule-3d',
    category: '3d-shapes',
    titleAr: 'كبسولة',
    titleEn: 'Capsule',
    iconName: 'Pill',
    description: 'أسطوانة مدمجة بنصفي كرتين عند طرفيها',
    defaultWidth: 180,
    defaultHeight: 90,
    defaultColor: '#ec4899',
    defaultFillColor: '#fbcfe8',
    defaultParams: {
      dimensionA: 3, // Radius r
      dimensionB: 8, // Cylinder Height a
      unit: 'cm',
      volumeFormula: 'V = πr²(⁴⁄₃r + a)',
      areaFormula: 'A = 2πr(2r + a)'
    }
  },
  {
    type: 'torus-3d',
    category: '3d-shapes',
    titleAr: 'طارة حلقية',
    titleEn: 'Torus',
    iconName: 'Donut',
    description: 'مجسم على شكل حلقة أو كعكة ناتج عن دوران دائرة حول محور خارجي',
    defaultWidth: 160,
    defaultHeight: 120,
    defaultColor: '#eab308',
    defaultFillColor: '#fef9c3',
    defaultParams: {
      dimensionA: 5, // Major Radius R
      dimensionB: 2, // Minor Radius r
      unit: 'cm',
      volumeFormula: 'V = 2π² R r²',
      areaFormula: 'A = 4π² R r'
    }
  },

  // ==========================================
  // 2. أدوات الفيزياء والميكانيكا (Physics & Mechanics)
  // ==========================================
  {
    type: 'physics-mass',
    category: 'physics',
    titleAr: 'كتلة فيزيائية',
    titleEn: 'Mass Block',
    iconName: 'Square',
    description: 'جسم كتلته m كتل قياسية ومتحركة قابلة للربط بالقوى والأسطح',
    defaultWidth: 140,
    defaultHeight: 70,
    defaultColor: '#3b82f6',
    defaultFillColor: '#eff6ff',
    defaultParams: {
      mass: 5,
      massUnit: 'kg',
      frictionCoeff: 0.1,
      force: 20
    }
  },
  {
    type: 'physics-cart',
    category: 'physics',
    titleAr: 'عربة ديناميكية',
    titleEn: 'Dynamics Cart',
    iconName: 'Truck',
    description: 'عربة تجارب حركية مزودة بعجلات ومتجه سرعة وتسارع',
    defaultWidth: 160,
    defaultHeight: 70,
    defaultColor: '#10b981',
    defaultFillColor: '#ecfdf5',
    defaultParams: {
      mass: 2,
      velocity: 15,
      velocityUnit: 'm/s',
      acceleration: 2
    }
  },
  {
    type: 'physics-vector',
    category: 'physics',
    titleAr: 'متجه قوة وسرعة',
    titleEn: 'Force / Vector Arrow',
    iconName: 'MoveRight',
    description: 'سهم متجهي اتجاهي يحمل قيمة القوة F أو التسارع a أو السرعة v',
    defaultWidth: 180,
    defaultHeight: 40,
    defaultColor: '#ef4444',
    defaultFillColor: '#fee2e2',
    defaultParams: {
      force: 20,
      forceLabel: 'F = 20 N'
    }
  },
  {
    type: 'physics-dimension',
    category: 'physics',
    titleAr: 'خط قياس ومسافة',
    titleEn: 'Dimension Line',
    iconName: 'Ruler',
    description: 'خط أبعاد هندسي وفيزيائي للمسافات والإزاحة والارتفاعات',
    defaultWidth: 180,
    defaultHeight: 35,
    defaultColor: '#64748b',
    defaultFillColor: '#f1f5f9',
    defaultParams: {
      distance: 10,
      distanceUnit: 'm'
    }
  },
  {
    type: 'physics-pulley',
    category: 'physics',
    titleAr: 'بكرة ميكانيكية',
    titleEn: 'Pulley System',
    iconName: 'Disc',
    description: 'بكرة ثابتة أو متحركة مع حبل وكتل معلقة (آلة أتوود)',
    defaultWidth: 120,
    defaultHeight: 180,
    defaultColor: '#6366f1',
    defaultFillColor: '#eef2ff',
    defaultParams: {
      mass: 5
    }
  },
  {
    type: 'physics-spring',
    category: 'physics',
    titleAr: 'نابض مرن',
    titleEn: 'Spring Oscillator',
    iconName: 'Activity',
    description: 'زنبرك مرن يخضع لقانون هوك F = -kx مع ثابت مرونة k',
    defaultWidth: 180,
    defaultHeight: 45,
    defaultColor: '#0284c7',
    defaultFillColor: '#e0f2fe',
    defaultParams: {
      springConstant: 200
    }
  },
  {
    type: 'physics-incline',
    category: 'physics',
    titleAr: 'مستوى مائل',
    titleEn: 'Inclined Plane',
    iconName: 'TrendingUp',
    description: 'مستوى مائل بزاوية θ مع كتل منزلقة وقوى تحليلية',
    defaultWidth: 220,
    defaultHeight: 140,
    defaultColor: '#d97706',
    defaultFillColor: '#fef3c7',
    defaultParams: {
      angle: 30,
      mass: 4,
      frictionCoeff: 0.15
    }
  },

  // ==========================================
  // 3. الدوائر الكهربائية (Electric Circuits)
  // ==========================================
  {
    type: 'circuit-battery',
    category: 'circuits',
    titleAr: 'مولد / بطارية (DC)',
    titleEn: 'DC Battery',
    iconName: 'BatteryCharging',
    description: 'مصدر تيار كهربائي مستمر مع قطب موجب وسالب وقوة دافعة E',
    defaultWidth: 120,
    defaultHeight: 60,
    defaultColor: '#ef4444',
    defaultFillColor: '#fee2e2',
    defaultParams: {
      voltage: 12
    }
  },
  {
    type: 'circuit-resistor',
    category: 'circuits',
    titleAr: 'مقاومة كهربائية',
    titleEn: 'Resistor',
    iconName: 'Sliders',
    description: 'مقاومة أومية تخضع لقانون أوم V = I × R',
    defaultWidth: 130,
    defaultHeight: 45,
    defaultColor: '#f59e0b',
    defaultFillColor: '#fef3c7',
    defaultParams: {
      resistance: 5
    }
  },
  {
    type: 'circuit-switch',
    category: 'circuits',
    titleAr: 'قاطع / مفتاح كهربائي',
    titleEn: 'Electrical Switch',
    iconName: 'ToggleRight',
    description: 'مفتاح لفتح وغلق الدارة الكهربائية بضغطة زر',
    defaultWidth: 110,
    defaultHeight: 50,
    defaultColor: '#475569',
    defaultFillColor: '#f8fafc',
    defaultParams: {
      isSwitchClosed: false
    }
  },
  {
    type: 'circuit-lamp',
    category: 'circuits',
    titleAr: 'مصباح كهربائي',
    titleEn: 'Electric Lamp',
    iconName: 'Lightbulb',
    description: 'مصباح توهج مضيء مع قدرة كهربائية P',
    defaultWidth: 100,
    defaultHeight: 100,
    defaultColor: '#eab308',
    defaultFillColor: '#fef08a',
    defaultParams: {
      power: 60,
      isLampLit: true
    }
  },
  {
    type: 'circuit-ammeter',
    category: 'circuits',
    titleAr: 'مقياس أمبير (A)',
    titleEn: 'Ammeter',
    iconName: 'Gauge',
    description: 'جهاز لقياس شدة التيار الكهربائي يُوصل على التوالي',
    defaultWidth: 90,
    defaultHeight: 90,
    defaultColor: '#0284c7',
    defaultFillColor: '#e0f2fe',
    defaultParams: {
      current: 2.4
    }
  },
  {
    type: 'circuit-voltmeter',
    category: 'circuits',
    titleAr: 'مقياس فولتميتر (V)',
    titleEn: 'Voltmeter',
    iconName: 'GaugeCircle',
    description: 'جهاز لقياس فرق الجهد الكهربائي يُوصل على التوازي',
    defaultWidth: 90,
    defaultHeight: 90,
    defaultColor: '#9333ea',
    defaultFillColor: '#f3e8ff',
    defaultParams: {
      voltage: 12
    }
  },
  {
    type: 'circuit-capacitor',
    category: 'circuits',
    titleAr: 'مكثف كهربائي',
    titleEn: 'Capacitor',
    iconName: 'Columns',
    description: 'مكثف لتخزين الشحنة والطاقة الكهربائية سعة C',
    defaultWidth: 110,
    defaultHeight: 50,
    defaultColor: '#0d9488',
    defaultFillColor: '#ccfbf1',
    defaultParams: {
      capacitance: 100
    }
  },

  // ==========================================
  // 4. البصريات والضوء (Optics & Light)
  // ==========================================
  {
    type: 'optics-concave-lens',
    category: 'optics',
    titleAr: 'عدسة مقعرة (مفرقة)',
    titleEn: 'Concave Lens',
    iconName: 'Glasses',
    description: 'عدسة رقيقة تفرق الأشعة الضوئية ذات بعد بؤري سالب F',
    defaultWidth: 120,
    defaultHeight: 180,
    defaultColor: '#2563eb',
    defaultFillColor: '#eff6ff',
    defaultParams: {
      focalLength: -10
    }
  },
  {
    type: 'optics-convex-lens',
    category: 'optics',
    titleAr: 'عدسة محدبة (مجمعة)',
    titleEn: 'Convex Lens',
    iconName: 'Glasses',
    description: 'عدسة رقيقة تجمع الأشعة الضوئية المتوازية في بؤرة حقيقية F',
    defaultWidth: 120,
    defaultHeight: 180,
    defaultColor: '#0284c7',
    defaultFillColor: '#e0f2fe',
    defaultParams: {
      focalLength: 15
    }
  },
  {
    type: 'optics-plane-mirror',
    category: 'optics',
    titleAr: 'مرآة مستوية',
    titleEn: 'Plane Mirror',
    iconName: 'Maximize2',
    description: 'سطح عاكس مستوٍ مع خطوط تظليل للجهة الخلفية',
    defaultWidth: 40,
    defaultHeight: 180,
    defaultColor: '#475569',
    defaultFillColor: '#f1f5f9',
    defaultParams: {}
  },
  {
    type: 'optics-light-ray',
    category: 'optics',
    titleAr: 'شعاع ضوئي',
    titleEn: 'Light Ray',
    iconName: 'ArrowUpRight',
    description: 'مسار شعاع ضوئي ساقط أو منكسر أو منعكس',
    defaultWidth: 180,
    defaultHeight: 40,
    defaultColor: '#eab308',
    defaultFillColor: '#fef08a',
    defaultParams: {
      rayType: 'incident'
    }
  },

  // ==========================================
  // 5. أدوات الكيمياء (Chemistry Tools)
  // ==========================================
  {
    type: 'chem-beaker',
    category: 'chemistry',
    titleAr: 'كأس زجاجي (Beaker)',
    titleEn: 'Beaker',
    iconName: 'Beaker',
    description: 'كأس مدرج مع سائل ملون ومدرج حجوم قابل للتعديل',
    defaultWidth: 120,
    defaultHeight: 150,
    defaultColor: '#0284c7',
    defaultFillColor: '#38bdf8',
    defaultParams: {
      liquidVolume: 60,
      liquidColor: '#38bdf8',
      fluidName: 'CuSO₄ (aq)'
    }
  },
  {
    type: 'chem-flask',
    category: 'chemistry',
    titleAr: 'دورق مخروطي (Erlenmeyer)',
    titleEn: 'Flask',
    iconName: 'FlaskConical',
    description: 'دورق مخروطي لمعايرة وتفاعلات المحاليل',
    defaultWidth: 130,
    defaultHeight: 160,
    defaultColor: '#9333ea',
    defaultFillColor: '#c084fc',
    defaultParams: {
      liquidVolume: 50,
      liquidColor: '#c084fc',
      fluidName: 'KMnO₄'
    }
  },
  {
    type: 'chem-test-tube',
    category: 'chemistry',
    titleAr: 'أنبوب اختبار',
    titleEn: 'Test Tube',
    iconName: 'TestTube',
    description: 'أنبوب اختبار زجاجي للتفاعلات السريعة والترسيب',
    defaultWidth: 60,
    defaultHeight: 160,
    defaultColor: '#10b981',
    defaultFillColor: '#34d399',
    defaultParams: {
      liquidVolume: 70,
      liquidColor: '#34d399',
      fluidName: 'HCl + Zn'
    }
  },
  {
    type: 'chem-burner',
    category: 'chemistry',
    titleAr: 'موقد بنسن',
    titleEn: 'Bunsen Burner',
    iconName: 'Flame',
    description: 'موقد تسخين مع شعلة لهب زرقاء حرارية',
    defaultWidth: 100,
    defaultHeight: 160,
    defaultColor: '#f97316',
    defaultFillColor: '#fdba74',
    defaultParams: {
      isBoiling: true
    }
  },
  {
    type: 'chem-benzene-ring',
    category: 'chemistry',
    titleAr: 'حلقة بنزين كيميائية',
    titleEn: 'Benzene Ring',
    iconName: 'Hexagon',
    description: 'حلقة عطرية سداسية C₆H₆ مع روابط مزدوجة متبادلة',
    defaultWidth: 130,
    defaultHeight: 130,
    defaultColor: '#0f172a',
    defaultFillColor: '#f8fafc',
    defaultParams: {}
  },
  {
    type: 'chem-periodic-card',
    category: 'chemistry',
    titleAr: 'بطاقة عنصر دوري',
    titleEn: 'Element Card',
    iconName: 'Table',
    description: 'بطاقة العنصر مع العدد الذري والكتلي والتوزيع الإلكتروني',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultColor: '#e11d48',
    defaultFillColor: '#ffe4e6',
    defaultParams: {
      atomicNumber: 11,
      elementSymbol: 'Na',
      elementNameAr: 'صوديوم',
      atomicMass: 22.99
    }
  },

  // ==========================================
  // 6. الأحياء والعلوم الطبيعية (Biology & Natural Science)
  // ==========================================
  {
    type: 'bio-cell-animal',
    category: 'biology',
    titleAr: 'خلية حيوانية',
    titleEn: 'Animal Cell',
    iconName: 'CircleDot',
    description: 'مخطط الخلية الحيوانية مع النواة والميتوكوندريا والغشاء',
    defaultWidth: 170,
    defaultHeight: 150,
    defaultColor: '#ec4899',
    defaultFillColor: '#fdf2f8',
    defaultParams: {}
  },
  {
    type: 'bio-cell-plant',
    category: 'biology',
    titleAr: 'خلية نباتية',
    titleEn: 'Plant Cell',
    iconName: 'Hexagon',
    description: 'مخطط الخلية النباتية بجدار السليلوز والبلاستيدات الخضراء',
    defaultWidth: 170,
    defaultHeight: 150,
    defaultColor: '#16a34a',
    defaultFillColor: '#f0fdf4',
    defaultParams: {}
  },
  {
    type: 'bio-dna',
    category: 'biology',
    titleAr: 'شريط الحمض النووي (DNA)',
    titleEn: 'DNA Double Helix',
    iconName: 'Dna',
    description: 'اللولب المزدوج للـ DNA مع القواعد النيتروجينية A-T و G-C',
    defaultWidth: 140,
    defaultHeight: 200,
    defaultColor: '#8b5cf6',
    defaultFillColor: '#f5f3ff',
    defaultParams: {}
  },
  {
    type: 'bio-microscope',
    category: 'biology',
    titleAr: 'مجهر ضوئي مركب',
    titleEn: 'Optical Microscope',
    iconName: 'Search',
    description: 'مخطط المجهر التعليمي مع العدسات العينية والشيئية والمنضدة',
    defaultWidth: 150,
    defaultHeight: 190,
    defaultColor: '#0369a1',
    defaultFillColor: '#f0f9ff',
    defaultParams: {}
  },

  // ==========================================
  // 7. الرياضيات والإحداثيات (Mathematics)
  // ==========================================
  {
    type: 'math-coordinate-plane',
    category: 'math',
    titleAr: 'محاور إحداثيات (X - Y)',
    titleEn: 'Cartesian Grid',
    iconName: 'Grid',
    description: 'المستوى الديكارتي ثنائي الأبعاد مع شبكة وترقيم تدريجي',
    defaultWidth: 240,
    defaultHeight: 240,
    defaultColor: '#0f172a',
    defaultFillColor: '#ffffff',
    defaultParams: {
      xRange: [-5, 5],
      yRange: [-5, 5]
    }
  },
  {
    type: 'math-function-graph',
    category: 'math',
    titleAr: 'رسم بياني لدالة',
    titleEn: 'Function Plotter',
    iconName: 'TrendingUp',
    description: 'رسم منحنى دالة رياضية f(x) مع النقاط الحرجة',
    defaultWidth: 240,
    defaultHeight: 200,
    defaultColor: '#2563eb',
    defaultFillColor: '#eff6ff',
    defaultParams: {
      functionExpression: 'f(x) = x² - 4'
    }
  },
  {
    type: 'math-trig-unit-circle',
    category: 'math',
    titleAr: 'دائرة الوحدة المثلثية',
    titleEn: 'Trigonometric Unit Circle',
    iconName: 'Circle',
    description: 'دائرة الوحدة مع زوايا شهيرة (0, 30, 45, 60, 90) وقيم cos و sin',
    defaultWidth: 200,
    defaultHeight: 200,
    defaultColor: '#0d9488',
    defaultFillColor: '#f0fdfa',
    defaultParams: {}
  },

  // ==========================================
  // 8. الأمواج والاهتزازات (Waves & Acoustics)
  // ==========================================
  {
    type: 'physics-wave-transverse',
    category: 'physics',
    titleAr: 'موجة مستعرضة (Transverse Wave)',
    titleEn: 'Transverse Wave',
    iconName: 'Activity',
    description: 'موجة جيبية توضح القمة والقاع، مع سعة الموجة والطول الموجي والتردد',
    defaultWidth: 260,
    defaultHeight: 160,
    defaultColor: '#3b82f6',
    defaultFillColor: '#dbeafe',
    defaultParams: {
      amplitude: 35,
      wavelength: 80,
      frequency: 2.5,
      waveSpeed: 200,
      showWaveNodes: true
    },
    formulas: {
      law: 'v = \\lambda \\cdot f'
    }
  },
  {
    type: 'physics-wave-longitudinal',
    category: 'physics',
    titleAr: 'موجة طولية (Longitudinal Wave)',
    titleEn: 'Longitudinal Wave',
    iconName: 'Sliders',
    description: 'موجة تضاغطات وتخلخلات (كموجات الصوت والزنبرك)',
    defaultWidth: 260,
    defaultHeight: 120,
    defaultColor: '#8b5cf6',
    defaultFillColor: '#ede9fe',
    defaultParams: {
      wavelength: 70,
      frequency: 2
    }
  },

  // ==========================================
  // 9. الذرات والجزيئات والتفاعلات (Atoms, Molecules, pH)
  // ==========================================
  {
    type: 'chem-atom-bohr',
    category: 'chemistry',
    titleAr: 'نموذج بور للذرة (Bohr Atom)',
    titleEn: 'Bohr Atom Model',
    iconName: 'Atom',
    description: 'نموذج ذري تفاعلي يوضح النواة (بروتونات ونيوترونات) ومستويات الطاقة (K, L, M) والإلكترونات',
    defaultWidth: 220,
    defaultHeight: 220,
    defaultColor: '#06b6d4',
    defaultFillColor: '#ecfeff',
    defaultParams: {
      elementSymbol: 'C',
      elementNameAr: 'كربون',
      atomicNumber: 6,
      protons: 6,
      neutrons: 6,
      electrons: 6,
      electronShells: [2, 4]
    }
  },
  {
    type: 'chem-molecule',
    category: 'chemistry',
    titleAr: 'تركيب جزيء وروابط (Molecule)',
    titleEn: 'Molecule & Bonds',
    iconName: 'Share2',
    description: 'نموذج كروي للجزيئات الكيميائية والروابط الأحادية والمزدوجة (H₂O, CH₄, CO₂)',
    defaultWidth: 200,
    defaultHeight: 180,
    defaultColor: '#10b981',
    defaultFillColor: '#d1fae5',
    defaultParams: {
      moleculeFormula: 'H₂O',
      moleculeName: 'ماء',
      bondType: 'single'
    }
  },
  {
    type: 'chem-reaction-balancer',
    category: 'chemistry',
    titleAr: 'مخطط تفاعل ومعادلة كيميائية',
    titleEn: 'Chemical Reaction',
    iconName: 'ArrowRightLeft',
    description: 'تفاعل كيميائي يوضح المتفاعلات والنواتج وحالة الاتزان والطاقة',
    defaultWidth: 260,
    defaultHeight: 130,
    defaultColor: '#f59e0b',
    defaultFillColor: '#fef3c7',
    defaultParams: {
      equationReactants: '2H₂ + O₂',
      equationProducts: '2H₂O',
      isBalanced: true
    }
  },
  {
    type: 'chem-ph-meter',
    category: 'chemistry',
    titleAr: 'مقياس الرقم الهيدروجيني (pH Meter)',
    titleEn: 'pH Meter & Indicator',
    iconName: 'Gauge',
    description: 'مقياس الحموضة والقاعدية الشامل من 0 إلى 14 مع كاشف لوني إلكتروني',
    defaultWidth: 220,
    defaultHeight: 160,
    defaultColor: '#ef4444',
    defaultFillColor: '#fee2e2',
    defaultParams: {
      phValue: 7.0,
      phType: 'neutral'
    }
  },
  {
    type: 'chem-thermometer',
    category: 'chemistry',
    titleAr: 'ميزان حرارة مخبري (Thermometer)',
    titleEn: 'Laboratory Thermometer',
    iconName: 'Thermometer',
    description: 'ميزان حراري زئبقي/كحولي مدرج من -10 إلى 110 درجة مئوية',
    defaultWidth: 80,
    defaultHeight: 220,
    defaultColor: '#dc2626',
    defaultFillColor: '#fef2f2',
    defaultParams: {
      temperature: 37
    }
  },

  // ==========================================
  // 10. أنظمة العلوم الطبيعية والبيولوجيا (Natural Science Systems)
  // ==========================================
  {
    type: 'bio-digestive-system',
    category: 'biology',
    titleAr: 'الجهاز الهضمي (Digestive System)',
    titleEn: 'Digestive System',
    iconName: 'Activity',
    description: 'مجسم تشريحي للجهاز الهضمي: الفم، المريء، المعدة، الكبد، الأمعاء الدقيقة والغليظة',
    defaultWidth: 220,
    defaultHeight: 300,
    defaultColor: '#d97706',
    defaultFillColor: '#fffbeb',
    defaultParams: {
      activeOrgan: 'stomach',
      showLabels: true
    }
  },
  {
    type: 'bio-respiratory-system',
    category: 'biology',
    titleAr: 'الجهاز التنفسي والرئتان',
    titleEn: 'Respiratory System',
    iconName: 'Wind',
    description: 'مجسم الجهاز التنفسي: القصبة الهوائية، الشعب، الرئتين، والحويصلات الهوائية',
    defaultWidth: 220,
    defaultHeight: 280,
    defaultColor: '#0284c7',
    defaultFillColor: '#f0f9ff',
    defaultParams: {
      showLabels: true
    }
  },
  {
    type: 'bio-circulatory-system',
    category: 'biology',
    titleAr: 'القلب والجهاز الدوري (Circulatory)',
    titleEn: 'Heart & Circulation',
    iconName: 'Heart',
    description: 'نموذج القلب البشري بحجراته الأربع والصمامات وتدفق الدم المؤكسج وغير المؤكسج',
    defaultWidth: 240,
    defaultHeight: 260,
    defaultColor: '#e11d48',
    defaultFillColor: '#fff1f2',
    defaultParams: {
      heartRate: 75,
      showLabels: true
    }
  },
  {
    type: 'bio-neuron',
    category: 'biology',
    titleAr: 'الخلية العصبية (Neuron)',
    titleEn: 'Neuron & Synapse',
    iconName: 'Zap',
    description: 'عصبون تفاعلي مع الزوائد الشجرية، جسم الخلية، المحور، غمد المايلين والسيال العصبي',
    defaultWidth: 280,
    defaultHeight: 170,
    defaultColor: '#8b5cf6',
    defaultFillColor: '#f5f3ff',
    defaultParams: {
      neuronSignalActive: true,
      showLabels: true
    }
  },
  {
    type: 'bio-genetics-punnett',
    category: 'biology',
    titleAr: 'مربع بانيت للوراثة (Punnett Square)',
    titleEn: 'Punnett Square Genetics',
    iconName: 'Grid',
    description: 'مربع بانيت الوراثي لتوارث الصفات المندلية مع نسب الطرز الشكلية والجينية',
    defaultWidth: 240,
    defaultHeight: 240,
    defaultColor: '#10b981',
    defaultFillColor: '#ecfdf5',
    defaultParams: {
      alleleFather: ['B', 'b'],
      alleleMother: ['B', 'b'],
      traitName: 'لون العيون / البذور'
    }
  },
  {
    type: 'bio-food-chain',
    category: 'biology',
    titleAr: 'سلسلة غذائية وهرم الطاقة',
    titleEn: 'Food Chain & Energy Pyramid',
    iconName: 'Layers',
    description: 'مخطط السلسلة الغذائية والمستويات الغذائية وهرم نقل الطاقة (10%)',
    defaultWidth: 260,
    defaultHeight: 220,
    defaultColor: '#65a30d',
    defaultFillColor: '#f7fee7',
    defaultParams: {
      trophicLevel: 3,
      showLabels: true
    }
  }
];
