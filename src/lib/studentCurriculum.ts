export interface LessonResource {
  id: string;
  title: string;
  type: 'pdf' | 'presentation' | 'summary' | 'exercise';
  teacherName: string;
  size: string;
  downloadUrl?: string;
  pagesCount?: number;
  approvedDate: string;
}

export interface InteractivePracticeQuestion {
  id: string;
  questionNumber: number;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: {
    conclusion: string;
    steps: string[];
    latexFormula?: string;
    englishTerms?: { ar: string; en: string }[];
  };
  hint?: string;
}

export interface FinalQuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  lessonNumber: number;
  durationMinutes: number;
  summary: string;
  contentMarkdown: string;
  approvedReferences: LessonResource[];
  practiceQuestions: InteractivePracticeQuestion[];
  finalQuiz: {
    id: string;
    title: string;
    timeLimitMinutes: number;
    passScorePercentage: number;
    questions: FinalQuizQuestion[];
  };
}

export interface EducationalUnit {
  id: string;
  unitNumber: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface SubjectCurriculum {
  id: string;
  subjectName: string; // 'بيولوجيا' | 'كيمياء' | 'فيزياء' | 'رياضيات'
  englishName: string;
  icon: string;
  colorTheme: {
    primary: string;
    badge: string;
    bgLight: string;
    border: string;
  };
  leadTeacher: string;
  units: EducationalUnit[];
}

export const ACADEMIC_CURRICULUM: Record<string, SubjectCurriculum> = {
  'بيولوجيا': {
    id: 'bio',
    subjectName: 'بيولوجيا',
    englishName: 'Biology',
    icon: '🧬',
    colorTheme: {
      primary: '#133827',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      bgLight: 'bg-emerald-50/50',
      border: 'border-emerald-200'
    },
    leadTeacher: 'أ. د. زكي أبو علان (كبير مدرسي البيولوجيا)',
    units: [
      {
        id: 'bio-unit-1',
        unitNumber: 1,
        title: 'الأيض الخلوي والتمثيل الضوئي',
        description: 'دراسة حيوية عميقة لكيفية تحويل الطاقة الشمسية إلى طاقة كيميائية مخزنة، وتراكيب البلاستيدات وحلقة كالفن.',
        lessons: [
          {
            id: 'bio-l1',
            lessonNumber: 1,
            title: 'تركيب البلاستيدة الخضراء ودور الكلوروفيل',
            durationMinutes: 45,
            summary: 'استكشاف الأغشية الثنائية، الثايلاكويدات، صفائح الغرانا، والستروما، وكيف تلتقط صبغات الكلوروفيل الفوتونات الضوئية.',
            contentMarkdown: `### المقدمة التركيبية للبلاستيدات الخضراء (Chloroplasts)

تعتبر البلاستيدات الخضراء العضيات المركزية المسؤولة عن تحويل الطاقة الإشعاعية إلى طاقة روابط كيميائية.
تتألف البلاستيدة من الأجزاء الرئيسية التالية:

1. **الغشاء المزدوج (Double Membrane):** غشاء خارجي عالي النفاذية وغشاء داخلي منظم للاستيراد البروتيني.
2. **الثايلاكويدات (Thylakoids):** أكياس غشائية قرصية الشكل تترتب في حزم متراصة تسمى **الغرانا (Grana)**. في أغشية الثايلاكويد تتواجد معقدات مراكز التفاعل وصبغات **الكلوروفيل (Chlorophyll a & b)**.
3. **الستروما / الحشوة (Stroma):** الوسط المائي الهلامي الذي يحيط بالغرانا، ويحتوي على DNA حلقي، وريبوسومات، والإنزيمات الحيوية لتثبيت غاز $CO_2$ عبر حلقة كالفن.

---

### المعادلة الكيميائية الإجمالية للتمثيل الضوئي:
$$6CO_2 + 6H_2O \\xrightarrow{\\text{ضوء الشمس / كلوروفيل}} C_6H_{12}O_6 + 6O_2$$`,
            approvedReferences: [
              {
                id: 'ref-bio-1',
                title: 'دليل المعلم المعتمد: تشريح البلاستيدات وسلاسل نقل الإلكترون (PDF)',
                type: 'pdf',
                teacherName: 'أ. د. زكي أبو علان',
                size: '2.4 MB',
                pagesCount: 18,
                approvedDate: '2026-08-30'
              },
              {
                id: 'ref-bio-2',
                title: 'ملخص البجروت المكثف: مقارنة التفاعلات الضوئية واللاضوئية (DOCX)',
                type: 'summary',
                teacherName: 'أ. د. زكي أبو علان',
                size: '850 KB',
                approvedDate: '2026-09-01'
              }
            ],
            practiceQuestions: [
              {
                id: 'pq-bio-1',
                questionNumber: 1,
                type: 'true_false',
                questionText: 'التمثيل الضوئي يحدث في جميع أجزاء النبات الحية بما فيها الجذور.',
                options: ['صح', 'خطأ'],
                correctAnswer: 'خطأ',
                explanation: {
                  conclusion: 'الإجابة الصحيحة هي: خطأ.',
                  steps: [
                    'التمثيل الضوئي (Photosynthesis) يتطلب وجود البلاستيدات الخضراء وصبغة الكلوروفيل.',
                    'خلايا الجذور لا تتعرض للضوء ولا تحتوي على بلاستيدات خضراء فعالة، بل تخزن النشا في بلاستيدات عديمة اللون (Amyloplasts).',
                    'تحصل الجذور على احتياجاتها من السكريات بواسطة النقل النشط عبر أنسجة اللحاء (Phloem).'
                  ],
                  englishTerms: [
                    { ar: 'التمثيل الضوئي', en: 'Photosynthesis' },
                    { ar: 'اللحاء', en: 'Phloem' }
                  ]
                },
                hint: 'تذكر وظيفة الجذور ومكان تواجد صبغة الكلوروفيل الخضراء.'
              },
              {
                id: 'pq-bio-2',
                questionNumber: 2,
                type: 'multiple_choice',
                questionText: 'أين تتواجد الإنزيمات المسؤولة عن تثبيت غاز ثاني أكسيد الكربون وإنتاج السكر في البلاستيدة؟',
                options: [
                  'في أغشية الثايلاكويد',
                  'داخل حيز الثايلاكويد الداخلي',
                  'في سائل الستروما (الحشوة)',
                  'بين الغشائين الخارجي والداخلي'
                ],
                correctAnswer: 'في سائل الستروما (الحشوة)',
                explanation: {
                  conclusion: 'الإجابة الصحيحة هي: في سائل الستروما (الحشوة).',
                  steps: [
                    'تفاعلات حلقة كالفن (Calvin Cycle) لا تحتاج مباشرة إلى الضوء، وتحدث في الستروما (Stroma).',
                    'تحتوي الستروما على إنزيم روبيسكو (RuBisCO) وهو الإنزيم الأكثر وفرة لتثبيت الكربون مع السكر الخماسي RuBP.'
                  ],
                  englishTerms: [
                    { ar: 'الستروما', en: 'Stroma' },
                    { ar: 'إنزيم روبيسكو', en: 'RuBisCO' }
                  ]
                }
              }
            ],
            finalQuiz: {
              id: 'fq-bio-l1',
              title: 'الاختبار الإلكتروني النهائي: تركيب البلاستيدات الخضراء',
              timeLimitMinutes: 10,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-q1',
                  questionText: 'ما هي الصبغة الأساسية المسؤولة عن امتصاص الضوء الأزرق والأحمر في البلاستيدة الخضراء؟',
                  options: ['الكاروتين', 'الكلوروفيل أ', 'الزانثوفيل', 'الأنثوسيانين'],
                  correctAnswerIndex: 1,
                  explanation: 'الكلوروفيل أ (Chlorophyll a) هو الصبغة المحورية في مراكز التفاعل للنظامين الضوئيين الأول والثاني.'
                },
                {
                  id: 'fq-q2',
                  questionText: 'ما هو الناتج الغازي المتحرر نتيجة شطر جزيئات الماء في المرحلة الضوئية؟',
                  options: ['غاز الهيدروجين', 'غاز الميثان', 'غاز الأكسجين O₂', 'غاز ثاني أكسيد الكربون'],
                  correctAnswerIndex: 2,
                  explanation: 'ينتج غاز الأكسجين (O₂) نتيجة التحلل الضوئي للماء (Photolysis of water) عند النظام الضوئي الثاني.'
                },
                {
                  id: 'fq-q3',
                  questionText: 'أين تترتب صفائح الغرانا داخل البلاستيدة؟',
                  options: ['في الستروما محاطة بالغشاء الثايلاكويدي', 'خارج الغشاء الخارجي', 'داخل الميتوكوندريا', 'في النواة'],
                  correctAnswerIndex: 0,
                  explanation: 'تسبح صفائح الغرانا المكونة من أقراص الثايلاكويد داخل المحلول المائي للستروما.'
                }
              ]
            }
          },
          {
            id: 'bio-l2',
            lessonNumber: 2,
            title: 'المرحلة الضوئية وتصنيع مركبات الطاقة ATP و NADPH',
            durationMinutes: 50,
            summary: 'شرح انتقال الإلكترونات في السلسلة الغشائية، التناضح الكيميائي، ودور مضخة البروتونات وإنزيم بناء ATP.',
            contentMarkdown: `### تفاعلات المرحلة المعتمدة على الضوء (Light-Dependent Reactions)

تحدث هذه التفاعلات على غشاء الثايلاكويد وتتضمن:
1. **امتصاص الفوتونات:** يستقبل النظام الضوئي الثاني (Photosystem II - P680) الطاقة الضوئية، مما يؤدي إلى إثارة الإلكترونات.
2. **انشطار الماء الضوئي (Photolysis):**
   $$2H_2O \\rightarrow 4H^+ + 4e^- + O_2$$
3. **سلسلة نقل الإلكترون والتناضح الكيميائي (Chemiosmosis):** تدفق البروتونات عبر إنزيم بناء ATP (ATP Synthase) لإنتاج الطاقة.
4. **اختزال مستقبل الإلكترونات:** يستقبل النظام الضوئي الأول (Photosystem I - P700) الإلكترونات لإنتاج **NADPH**.`,
            approvedReferences: [
              {
                id: 'ref-bio-3',
                title: 'مخطط تدفق الإلكترونات والتناضح الكيميائي المعتمد (PDF)',
                type: 'pdf',
                teacherName: 'أ. د. زكي أبو علان',
                size: '1.9 MB',
                pagesCount: 12,
                approvedDate: '2026-09-01'
              }
            ],
            practiceQuestions: [
              {
                id: 'pq-bio-3',
                questionNumber: 1,
                type: 'multiple_choice',
                questionText: 'ما هو المصدر الأساسي للإلكترونات المعوضة للنظام الضوئي الثاني P680؟',
                options: ['ثاني أكسيد الكربون', 'انشطار جزيئات الماء H₂O', 'سكر الجلوكوز', 'مركب NADPH'],
                correctAnswer: 'انشطار جزيئات الماء H₂O',
                explanation: {
                  conclusion: 'الإجابة الصحيحة: انشطار جزيئات الماء H₂O.',
                  steps: [
                    'عند إثارة الإلكترونات في مركز التفاعل P680 وانطلاقها في السلسلة، يحتاج النظام لتعويض النقص الإلكتروني فوراً.',
                    'يقوم إنزيم شطر الماء بتحليل H₂O إلى بروتونات وإلكترونات وغاز الأكسجين.'
                  ]
                }
              }
            ],
            finalQuiz: {
              id: 'fq-bio-l2',
              title: 'الاختبار الإلكتروني: التفاعلات الضوئية وسلاسل النقل',
              timeLimitMinutes: 10,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-q4',
                  questionText: 'ما وظيفة إنزيم ATP Synthase في غشاء الثايلاكويد؟',
                  options: ['تثبيت ثاني أكسيد الكربون', 'تكسير الجلوكوز', 'تصنيع ATP باستخدام فرق تركيز البروتونات', 'شطر الماء'],
                  correctAnswerIndex: 2,
                  explanation: 'يستغل الإنزيم تدرج البروتونات الكهروكيميائي لفسفرة ADP إلى ATP.'
                }
              ]
            }
          }
        ]
      }
    ]
  },
  'كيمياء': {
    id: 'chem',
    subjectName: 'كيمياء',
    englishName: 'Chemistry',
    icon: '⚗️',
    colorTheme: {
      primary: '#0D365A',
      badge: 'bg-sky-50 text-sky-800 border-sky-200',
      bgLight: 'bg-sky-50/50',
      border: 'border-sky-200'
    },
    leadTeacher: 'أ. د. كمال منصور (مدرس الكيمياء الأول)',
    units: [
      {
        id: 'chem-unit-1',
        unitNumber: 1,
        title: 'الحسابات الكيميائية والمول وقوانين الغازات',
        description: 'إتقان حسابات الكتلة المولية، نسب العناصر، الحجم المولي للغازات عند الظروف المعيارية STP.',
        lessons: [
          {
            id: 'chem-l1',
            lessonNumber: 1,
            title: 'المفهوم المولي والحجم المولي في الظروف المعيارية (STP)',
            durationMinutes: 40,
            summary: 'العلاقة بين عدد المولات والكتلة وثابت أفوغادرو وحجم الغازات المثالية.',
            contentMarkdown: `### المفهوم المولي والحسابات المعيارية (Stoichiometry)

المول (Mole) هو وحدة القياس الدولية لكمية المادة:
1. **ثابت أفوغادرو:** يحتوي المول الواحد من أي مادة على $6.022 \\times 10^{23}$ جسيم.
2. **الحجم المولي للغازات (Molar Volume at STP):**
   عند الظروف المعيارية ($T = 0^\\circ\\text{C} = 273.15\\text{ K}$ و $P = 1\\text{ atm}$):
   $$V_m = 22.4\\text{ L/mol}$$
3. **قانون الغاز المثالي:**
   $$PV = nRT$$`,
            approvedReferences: [
              {
                id: 'ref-chem-1',
                title: 'مرجع الحسابات الكيميائية الشامل للبجروت (PDF)',
                type: 'pdf',
                teacherName: 'أ. د. كمال منصور',
                size: '3.1 MB',
                pagesCount: 24,
                approvedDate: '2026-08-28'
              }
            ],
            practiceQuestions: [
              {
                id: 'pq-chem-1',
                questionNumber: 1,
                type: 'true_false',
                questionText: 'يشغل 2 مول من غاز النيتروجين N₂ حجماً قدره 44.8 لتراً عند الظروف المعيارية STP.',
                options: ['صح', 'خطأ'],
                correctAnswer: 'صح',
                explanation: {
                  conclusion: 'الإجابة الصحيحة هي: صح (True).',
                  steps: [
                    'الحجم = عدد المولات × الحجم المولي عند STP.',
                    'V = 2 mol × 22.4 L/mol = 44.8 L.'
                  ]
                }
              }
            ],
            finalQuiz: {
              id: 'fq-chem-l1',
              title: 'اختبار الحسابات الكيميائية والمول',
              timeLimitMinutes: 10,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-c1',
                  questionText: 'كم عدد ذرات الهيدروجين في 1 مول من غاز الميثان CH₄؟',
                  options: ['6.022 × 10²³', '2.408 × 10²⁴', '1.204 × 10²⁴', '4 ذرات فقط'],
                  correctAnswerIndex: 1,
                  explanation: 'كل جزيء ميثان يحتوي على 4 ذرات هيدروجين، وبالتالي: 4 × (6.022 × 10²³) = 2.408 × 10²⁴ ذرة.'
                }
              ]
            }
          }
        ]
      }
    ]
  },
  'فيزياء': {
    id: 'phys',
    subjectName: 'فيزياء',
    englishName: 'Physics',
    icon: '⚡',
    colorTheme: {
      primary: '#1E293B',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      bgLight: 'bg-indigo-50/50',
      border: 'border-indigo-200'
    },
    leadTeacher: 'د. سمير الخطيب (مشرف الفيزياء المعتمد)',
    units: [
      {
        id: 'phys-unit-1',
        unitNumber: 1,
        title: 'الميكانيكا الكلاسيكية وقوانين نيوتن',
        description: 'دراسة القوى، القصور الذاتي، وقوانين الحركة والتسارع المركزي.',
        lessons: [
          {
            id: 'phys-l1',
            lessonNumber: 1,
            title: 'قوانين نيوتن في الحركة وتطبيقات القوى',
            durationMinutes: 45,
            summary: 'القانون الأول (القصور الذاتي)، القانون الثاني (F=ma)، والقانون الثالث (الفعل ورد الفعل).',
            contentMarkdown: `### قوانين نيوتن الثلاثة في الميكانيكا الكلاسيكية

1. **القانون الأول (القصور الذاتي):** يبقى الجسم على حالته من سكون أو حركة منتظمة في خط مستقيم ما لم تؤثر عليه قوة محصلة خارجية.
2. **القانون الثاني:**
   $$\\sum \\vec{F} = m \\vec{a}$$
3. **القانون الثالث:** لكل قوة فعل قوة رد فعل مساوية لها في المقدار ومضادة لها في الاتجاه وتؤثر في جسمين مختلفين.`,
            approvedReferences: [
              {
                id: 'ref-phys-1',
                title: 'كتاب الميكانيكا المعتمد ومسائل القوى المحلولة (PDF)',
                type: 'pdf',
                teacherName: 'د. سمير الخطيب',
                size: '4.2 MB',
                pagesCount: 30,
                approvedDate: '2026-08-20'
              }
            ],
            practiceQuestions: [
              {
                id: 'pq-phys-1',
                questionNumber: 1,
                type: 'true_false',
                questionText: 'قوتا الفعل ورد الفعل تلغي إحداهما الأخرى لأن مقدارهما متساوٍ ومتعاكستان في الاتجاه.',
                options: ['صح', 'خطأ'],
                correctAnswer: 'خطأ',
                explanation: {
                  conclusion: 'الإجابة الصحيحة هي: خطأ.',
                  steps: [
                    'القوتان لا تلغيان بعضهما لأنهما تؤثران على جسمين مختلفين، ولا توجد قوة محصلة تلغى إلا إذا أثرت القوى على نفس الجسم المفرد.'
                  ]
                }
              }
            ],
            finalQuiz: {
              id: 'fq-phys-l1',
              title: 'اختبار قوانين الحركة والميكانيكا',
              timeLimitMinutes: 10,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-p1',
                  questionText: 'إذا أثرت قوة محصلة مقدارها 20 نيوتن على جسم كتلته 4 كغم، فما هو تسارع الجسم؟',
                  options: ['80 م/ث²', '5 م/ث²', '16 م/ث²', '0.2 م/ث²'],
                  correctAnswerIndex: 1,
                  explanation: 'التسارع a = F / m = 20 / 4 = 5 m/s².'
                }
              ]
            }
          }
        ]
      }
    ]
  },
  'رياضيات': {
    id: 'math',
    subjectName: 'رياضيات',
    englishName: 'Mathematics',
    icon: '📐',
    colorTheme: {
      primary: '#581C87',
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
      bgLight: 'bg-purple-50/50',
      border: 'border-purple-200'
    },
    leadTeacher: 'أ. محمود عبد الهادي (كبير مدرسي الرياضيات 5 وحدات)',
    units: [
      {
        id: 'math-unit-1',
        unitNumber: 1,
        title: 'حساب التفاضل وتطبيقات المشتقة (5 وحدات)',
        description: 'النهايات، قواعد الاشتقاق، دراسة سلوك الدوال، النقاط القصوى والتحدب.',
        lessons: [
          {
            id: 'math-l1',
            lessonNumber: 1,
            title: 'قواعد الاشتقاق الأساسية والمشتقات المتتالية',
            durationMinutes: 50,
            summary: 'مشتقة دالة القوة، حاصل الضرب، حاصل القسمة، وقاعدة السلسلة للدوال المركبة.',
            contentMarkdown: `### قواعد التفاضل الأساسية (Differentiation Rules)

1. **مشتقة القوة:**
   $$\\frac{d}{dx}[x^n] = n x^{n-1}$$
2. **مشتقة حاصل ضرب دالتين:**
   $$\\frac{d}{dx}[u(x) \\cdot v(x)] = u'(x) v(x) + u(x) v'(x)$$
3. **مشتقة حاصل قسمة دالتين:**
   $$\\frac{d}{dx}\\left[\\frac{u(x)}{v(x)}\\right] = \\frac{u'(x)v(x) - u(x)v'(x)}{[v(x)]^2}$$`,
            approvedReferences: [
              {
                id: 'ref-math-1',
                title: 'مرجع بجروت الرياضيات 5 وحدات: بنك مسائل التفاضل والتحليل (PDF)',
                type: 'pdf',
                teacherName: 'أ. محمود عبد الهادي',
                size: '3.8 MB',
                pagesCount: 35,
                approvedDate: '2026-08-25'
              }
            ],
            practiceQuestions: [
              {
                id: 'pq-math-1',
                questionNumber: 1,
                type: 'short_answer',
                questionText: 'أوجد مشتقة الدالة f(x) = 3x² + 5x - 7 عند النقطة x = 2.',
                correctAnswer: '17',
                explanation: {
                  conclusion: 'النتيجة هي: 17.',
                  steps: [
                    'نشتق الدالة: f\'(x) = 6x + 5.',
                    'نعوض x = 2: f\'(2) = 6(2) + 5 = 12 + 5 = 17.'
                  ]
                }
              }
            ],
            finalQuiz: {
              id: 'fq-math-l1',
              title: 'اختبار قواعد الاشتقاق والتفاضل',
              timeLimitMinutes: 10,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-m1',
                  questionText: 'ما هي مشتقة الدالة f(x) = x³ - 4x؟',
                  options: ['3x² - 4', 'x² - 4', '3x - 4', '3x²'],
                  correctAnswerIndex: 0,
                  explanation: 'f\'(x) = 3x² - 4 وفق قاعدة مشتقة القوى.'
                }
              ]
            }
          }
        ]
      }
    ]
  }
};
