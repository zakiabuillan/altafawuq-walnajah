import {
  AssessmentUser,
  Specialty,
  GradeLevel,
  Course,
  Unit,
  Topic,
  LearningOutcome,
  StudentGroup,
  ReferenceDocument,
  QuestionBankItem,
  Exam,
  ExamAttempt,
  AuditLogEntry
} from '../types/assessmentPlatform';

export const SEED_SPECIALTIES: Specialty[] = [
  {
    id: 'spec-chem',
    code: 'CHEM',
    name: 'الكيمياء',
    description: 'الكيمياء العامة والعضوية، الديناميكا الحرارية، الاتزان الكيميائي، ونماذج البجروت المعتمدة.',
    iconName: 'FlaskConical',
    color: 'emerald'
  },
  {
    id: 'spec-phys',
    code: 'PHYS',
    name: 'الفيزياء',
    description: 'الميكانيكا الكلاسيكية، الكهرباء والمغناطيسية، ميكانيكا الكم، والفيزياء الإشعاعية.',
    iconName: 'Atom',
    color: 'sky'
  },
  {
    id: 'spec-math',
    code: 'MATH',
    name: 'الرياضيات',
    description: 'التفاضل والتكامل، الهندسة المستوية والتحليلية، المتجهات، ومستويات 4 و 5 وحدات.',
    iconName: 'Calculator',
    color: 'indigo'
  },
  {
    id: 'spec-bio',
    code: 'BIO',
    name: 'البيولوجيا',
    description: 'علم الأحياء الخلوي، التمثيل الضوئي، التنفس الخلوي، الوراثة الجزيئية، والبيئة.',
    iconName: 'Dna',
    color: 'teal'
  }
];

export const SEED_GRADE_LEVELS: GradeLevel[] = [
  {
    id: 'grade-10',
    name: 'الصف العاشر (المرحلة الثانوية)',
    stage: 'high',
    description: 'تأسيس المفاهيم العلمية الأساسية والمهارات الحسابية والتجريبية.'
  },
  {
    id: 'grade-11',
    name: 'الصف الحادي عشر',
    stage: 'high',
    description: 'التعمق في التخصصات العلمية وبداية مسارات البجروت التخصصية.'
  },
  {
    id: 'grade-12-bagrut',
    name: 'الصف الثاني عشر (مسار البجروت 4 و 5 وحدات)',
    stage: 'bagrut',
    description: 'المستوى الأكاديمي المتقدم والتحضير للامتحانات الوطنية ونماذج الوزارة المعتمدة.'
  }
];

export const SEED_COURSES: Course[] = [
  {
    id: 'course-chem-bagrut',
    code: 'CHEM-501',
    name: 'كيمياء البجروت المتقدمة (5 وحدات)',
    specialtyId: 'spec-chem',
    gradeLevelId: 'grade-12-bagrut',
    teacherIds: ['user-teacher-hani', 'user-teacher-layla'],
    description: 'منهاج شامل يغطي الاتزان الكيميائي، طاقة التفاعل، الكيمياء العضوية المتقدمة ونماذج بجروت 037381 و 037387.'
  },
  {
    id: 'course-phys-mechanics',
    code: 'PHYS-501',
    name: 'الفيزياء المتقدمة - ميكانيكا وحركة (5 وحدات)',
    specialtyId: 'spec-phys',
    gradeLevelId: 'grade-12-bagrut',
    teacherIds: ['user-teacher-layla'],
    description: 'دراسة قوانين نيوتن، الزخم الخطي، الطاقة الميكانيكية، وحركة الكواكب والجاذبية العامة.'
  }
];

export const SEED_UNITS: Unit[] = [
  {
    id: 'unit-chem-equilibrium',
    courseId: 'course-chem-bagrut',
    title: 'الوحدة الأولى: الاتزان الكيميائي وقاعدة لوشاتيليه',
    orderNumber: 1,
    description: 'الاتزان الديناميكي، ثابت الاتزان Kc و Kp، وتأثير العوامل الخارجية على موضع الاتزان.'
  },
  {
    id: 'unit-chem-kinetics',
    courseId: 'course-chem-bagrut',
    title: 'الوحدة الثانية: سرعة التفاعلات ونظرية التصادم',
    orderNumber: 2,
    description: 'طاقة التنشيط، العوامل الحفازة، ورتب التفاعل الكيميائي.'
  },
  {
    id: 'unit-phys-newton',
    courseId: 'course-phys-mechanics',
    title: 'الوحدة الأولى: قوانين الحركة والتحليل الديناميكي',
    orderNumber: 1,
    description: 'قوانين نيوتن الثلاثة، قوى الاحتكاك، والحركة الدائرية المنتظمة.'
  }
];

export const SEED_TOPICS: Topic[] = [
  {
    id: 'topic-le-chatelier',
    unitId: 'unit-chem-equilibrium',
    title: 'مبدأ لوشاتيليه وتأثير الضغط والحرارة والتركيز',
    description: 'استجابة المنظومات المتزنة للتغيرات الخارجية وكيفية استعادة الاتزان.'
  },
  {
    id: 'topic-eq-constant',
    unitId: 'unit-chem-equilibrium',
    title: 'حسابات ثابت الاتزان الكيميائي (Kc)',
    description: 'جدول تقدم التفاعل وحساب تراكيز المتفاعلات والنواتج عند الاتزان.'
  },
  {
    id: 'topic-newton-second',
    unitId: 'unit-phys-newton',
    title: 'قانون نيوتن الثاني وتطبيقات الأجسام المتصلة',
    description: 'معادلات الحركة وقوى الشد ورد الفعل على الأسطح الأفقية والمائلة.'
  }
];

export const SEED_LEARNING_OUTCOMES: LearningOutcome[] = [
  {
    id: 'lo-chem-01',
    unitId: 'unit-chem-equilibrium',
    topicId: 'topic-le-chatelier',
    code: 'LO-CHEM-01',
    text: 'يتنبأ الطالب باتجاه انزياح موضع الاتزان الكيميائي عند تغيير درجة الحرارة أو الضغط أو التراكيز وفق مبدأ لوشاتيليه.',
    bloomLevel: 'apply',
    bloomLabel: 'تطبيق'
  },
  {
    id: 'lo-chem-02',
    unitId: 'unit-chem-equilibrium',
    topicId: 'topic-eq-constant',
    code: 'LO-CHEM-02',
    text: 'يحسب الطالب قيمة ثابت الاتزان Kc للمنظومة الغازية المتزنة بالاعتماد على التراكيز المولارية عند الاتزان.',
    bloomLevel: 'apply',
    bloomLabel: 'تطبيق'
  },
  {
    id: 'lo-chem-03',
    unitId: 'unit-chem-equilibrium',
    topicId: 'topic-le-chatelier',
    code: 'LO-CHEM-03',
    text: 'يحلل الطالب أثر إضافة مادة خاملة أو عامل مساعد على موضع الاتزان وقيمة ثابت الاتزان.',
    bloomLevel: 'analyze',
    bloomLabel: 'تحليل'
  },
  {
    id: 'lo-phys-01',
    unitId: 'unit-phys-newton',
    topicId: 'topic-newton-second',
    code: 'LO-PHYS-01',
    text: 'يطبق الطالب قانون نيوتن الثاني لحساب تسارع منظومة مكونة من كتلتين متصلتين بحبل يمر فوق بكرة ملساء.',
    bloomLevel: 'apply',
    bloomLabel: 'تطبيق'
  }
];

export const SEED_USERS: AssessmentUser[] = [
  {
    id: 'user-admin-zaki',
    name: 'د. زكي أبو علان',
    email: 'admin@altafawuq.edu',
    role: 'admin',
    specialtyIds: ['spec-chem', 'spec-phys', 'spec-math', 'spec-bio'],
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'user-reviewer-samir',
    name: 'د. سمير القاسم (المراجع العلمي المعتمد)',
    email: 'reviewer.samir@altafawuq.edu',
    role: 'reviewer',
    specialtyIds: ['spec-chem', 'spec-bio'],
    createdAt: '2026-02-01T09:30:00Z'
  },
  {
    id: 'user-teacher-hani',
    name: 'أ. هاني عبد الرحمن',
    email: 'hani.chem@altafawuq.edu',
    role: 'teacher',
    specialtyIds: ['spec-chem'],
    createdAt: '2026-02-10T10:00:00Z'
  },
  {
    id: 'user-teacher-layla',
    name: 'أ. ليلى منصور',
    email: 'layla.phys@altafawuq.edu',
    role: 'teacher',
    specialtyIds: ['spec-phys', 'spec-math'],
    createdAt: '2026-02-12T11:00:00Z'
  },
  {
    id: 'user-student-ahmed',
    name: 'أحمد خليل المنصور',
    email: 'ahmed.mansoor@student.altafawuq.edu',
    role: 'student',
    specialtyIds: ['spec-chem', 'spec-phys'],
    groupIds: ['group-chem-12a', 'group-phys-12a'],
    createdAt: '2026-03-01T08:00:00Z'
  },
  {
    id: 'user-student-maryam',
    name: 'مريم عثمان الزعبي',
    email: 'maryam.zoubi@student.altafawuq.edu',
    role: 'student',
    specialtyIds: ['spec-chem'],
    groupIds: ['group-chem-12a'],
    createdAt: '2026-03-02T08:00:00Z'
  },
  {
    id: 'user-student-omar',
    name: 'عمر طارق النجار',
    email: 'omar.najjar@student.altafawuq.edu',
    role: 'student',
    specialtyIds: ['spec-chem'],
    groupIds: ['group-chem-12b'],
    createdAt: '2026-03-03T08:00:00Z'
  }
];

export const SEED_GROUPS: StudentGroup[] = [
  {
    id: 'group-chem-12a',
    name: 'شعبة الكيمياء المتقدمة 12 (أ)',
    courseId: 'course-chem-bagrut',
    teacherId: 'user-teacher-hani',
    studentIds: ['user-student-ahmed', 'user-student-maryam'],
    academicYear: '2026/2027'
  },
  {
    id: 'group-chem-12b',
    name: 'شعبة الكيمياء المتقدمة 12 (ب)',
    courseId: 'course-chem-bagrut',
    teacherId: 'user-teacher-hani',
    studentIds: ['user-student-omar'],
    academicYear: '2026/2027'
  },
  {
    id: 'group-phys-12a',
    name: 'شعبة الفيزياء والميكانيكا 12 (أ)',
    courseId: 'course-phys-mechanics',
    teacherId: 'user-teacher-layla',
    studentIds: ['user-student-ahmed'],
    academicYear: '2026/2027'
  }
];

export const SEED_REFERENCES: ReferenceDocument[] = [
  {
    id: 'ref-chem-equilibrium-textbook',
    title: 'كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي والديناميكا الحرارية',
    specialtyId: 'spec-chem',
    courseId: 'course-chem-bagrut',
    unitId: 'unit-chem-equilibrium',
    fileType: 'pdf',
    fileName: 'Chemistry_Equilibrium_Approved_Ministry_2026.pdf',
    fileSizeFormatted: '4.8 ميجابايت',
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    version: '1.0',
    uploaderId: 'user-teacher-hani',
    uploaderName: 'أ. هاني عبد الرحمن',
    status: 'approved',
    reviewDecision: {
      reviewerId: 'user-reviewer-samir',
      reviewerName: 'د. سمير القاسم (المراجع العلمي المعتمد)',
      reviewedAt: '2026-03-05T14:30:00Z',
      status: 'approved',
      notes: 'تمت مراجعة المحتوى والتأكد من توافقه الكامل مع مصفوفة معايير الوزارة ونماذج بجروت الكيمياء 037381. الترقيم مطابق للأصل والنصوص واضحة ودقيقة.'
    },
    totalChunks: 3,
    chunks: [
      {
        id: 'chk-chem-eq-01',
        chunkIndex: 1,
        pageNumber: 114,
        isPrintedPageEstimated: false,
        sectionTitle: 'القسم 4.1: مفهوم الاتزان الديناميكي وثابت الاتزان Kc',
        paragraphIndex: 1,
        content: `يُعرَّف الاتزان الكيميائي الديناميكي بأنه الحالة التي تتساوى فيها سرعة التفاعل الأمامي مع سرعة التفاعل العكسي، وتثبت عندها تراكيز المواد المتفاعلة والناتجة في وعاء مغلق عند درجة حرارة ثابتة دون أن تتوقف حركة الجزيئات. يُعبَّر عن ثابت الاتزان Kc للتفاعل العام: aA + bB <=> cC + dD بالعلاقة الرياضية: Kc = ([C]^c * [D]^d) / ([A]^a * [B]^b). لا تدخل المواد الصلبة النقية (s) والسوائل النقية (l) في تعبير ثابت الاتزان لأن تراكيزها المولارية تظل ثابتة أثناء سير التفاعل.`,
        wordCount: 78
      },
      {
        id: 'chk-chem-eq-02',
        chunkIndex: 2,
        pageNumber: 118,
        isPrintedPageEstimated: false,
        sectionTitle: 'القسم 4.2: مبدأ لوشاتيليه وأثر التغيرات الفيزيائية على موضع الاتزان',
        paragraphIndex: 2,
        content: `ينص مبدأ لوشاتيليه (Le Chatelier's Principle) على أنه إذا أُثِّر على منظومة كيميائية في حالة اتزان بتغيير في أحد العوامل الخارجية (مثل التركيز، الضغط، أو درجة الحرارة)، فإن المنظومة تنزاح في الاتجاه الذي يقلل من أثر هذا التغيير أو يلغيه. عند رفع درجة الحرارة في تفاعل طارد للحرارة (Exothermic, Delta H < 0)، ينزاح التفاعل نحو الاتجاه العكسي الماص للحرارة، وتقل قيمة ثابت الاتزان Kc. أما عند زيادة الضغط على منظومة غازية، فإن موضع الاتزان ينزاح نحو الطرف الذي يحتوي على عدد مولات غازية أقل.`,
        wordCount: 88
      },
      {
        id: 'chk-chem-eq-03',
        chunkIndex: 3,
        pageNumber: 122,
        isPrintedPageEstimated: false,
        sectionTitle: 'القسم 4.3: العوامل المساعدة والغازات الخاملة',
        paragraphIndex: 3,
        content: `إن إضافة عامل مساعد (Catalyst) إلى خليط متزن يزيد من سرعة التفاعلين الأمامي والعكسي بنفس المقدار من خلال خفض طاقة التنشيط، وبالتالي فإنه لا يغير موضع الاتزان ولا يؤثر إطلاقاً على قيمة ثابت الاتزان Kc، بل يساعد المنظومة فقط على الوصول السريع إلى حالة الاتزان في زمن أقل. كذلك فإن إضافة غاز خامل عند حجم ثابت لا يغير الضغوط الجزئية للمتفاعلات والنواتج، وبالتالي لا يؤثر على موضع الاتزان.`,
        wordCount: 74
      }
    ],
    ocrStatus: 'experimental_tested',
    isSharedInLibrary: true,
    createdAt: '2026-03-04T10:00:00Z',
    updatedAt: '2026-03-05T14:30:00Z',
    sourceAttribution: 'وزارة التربية والتعليم - كتاب الكيمياء للمرحلة الثانوية والبجروت، ص 114-124.'
  },
  {
    id: 'ref-phys-mechanics-guide',
    title: 'دليل ميكانيكا نيوتن والحركة المتسارعة - النماذج المعتمدة 036361',
    specialtyId: 'spec-phys',
    courseId: 'course-phys-mechanics',
    unitId: 'unit-phys-newton',
    fileType: 'docx',
    fileName: 'Newton_Mechanics_Teacher_Guide.docx',
    fileSizeFormatted: '2.1 ميجابايت',
    checksumSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    version: '1.0',
    uploaderId: 'user-teacher-layla',
    uploaderName: 'أ. ليلى منصور',
    status: 'approved',
    reviewDecision: {
      reviewerId: 'user-reviewer-samir',
      reviewerName: 'د. سمير القاسم (المراجع العلمي المعتمد)',
      reviewedAt: '2026-03-06T11:00:00Z',
      status: 'approved',
      notes: 'تم فحص المرجع وتوثيق المسائل. متوافق مع نموذج بجروت الفيزياء 036361.'
    },
    totalChunks: 2,
    chunks: [
      {
        id: 'chk-phys-01',
        chunkIndex: 1,
        pageNumber: 45,
        isPrintedPageEstimated: false,
        sectionTitle: 'الفصل الثاني: قانون نيوتن الثاني ومخطط الجسم الحر',
        paragraphIndex: 1,
        content: `ينص قانون نيوتن الثاني على أن محصلة القوى المؤثرة على جسم تساوي حاصل ضرب كتلته في تسارعه: Sigma F = m * a. لرسم مخطط الجسم الحر (Free Body Diagram)، يجب تحديد جميع القوى الحقيقية المؤثرة على الكتلة: قوة الجاذبية للأسفل (W = m * g)، القوة العمودية السطحية (N)، وقوى الشد في الحبال (T) أو قوى الاحتكاك (f_k = mu_k * N). في المنظومات المتصلة، تتشارك الكتل المتصلة بنفس مقدار التسارع.`,
        wordCount: 77
      },
      {
        id: 'chk-phys-02',
        chunkIndex: 2,
        pageNumber: 48,
        isPrintedPageEstimated: false,
        sectionTitle: 'الفصل الثاني: البكرات الملساء والكتل المعلقة',
        paragraphIndex: 2,
        content: `عند اتصال كتلتين m1 و m2 عبر حبل عديم الامتداد والكتلة يمر فوق بكرة مهملة الكتلة والاحتكاك (آلة أتود)، يُعطى تسارع المنظومة بالعلاقة: a = ((m2 - m1) / (m1 + m2)) * g بشرط m2 > m1. يكون الشد في طرفي الحبل متساوياً ما دامت البكرة مهملة الكتلة والقصور الذاتي.`,
        wordCount: 56
      }
    ],
    ocrStatus: 'none',
    isSharedInLibrary: true,
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-06T11:00:00Z',
    sourceAttribution: 'دليل معلم الفيزياء المعتمد - ميكانيكا البجروت، ص 45-50.'
  },
  {
    id: 'ref-chem-organic-draft',
    title: 'مذكرة الكيمياء العضوية المتقدمة وتفاعلات الإسترة (مسودة مقدمة للاعتماد)',
    specialtyId: 'spec-chem',
    courseId: 'course-chem-bagrut',
    fileType: 'pdf',
    fileName: 'Organic_Chemistry_Reactions_Draft.pdf',
    fileSizeFormatted: '3.4 ميجابايت',
    checksumSha256: '9f8e7d6c5b4a3210fedcba98765432109f8e7d6c5b4a3210fedcba9876543210',
    version: '1.0',
    uploaderId: 'user-teacher-hani',
    uploaderName: 'أ. هاني عبد الرحمن',
    status: 'pending_review',
    totalChunks: 1,
    chunks: [
      {
        id: 'chk-chem-org-01',
        chunkIndex: 1,
        pageNumber: 12,
        isPrintedPageEstimated: false,
        sectionTitle: 'تفاعلات تكوين الإستر وأثر حمض الكبريتيك المركز',
        paragraphIndex: 1,
        content: `يتفاعل الحمض الكربوكسيلي مع الكحول بوجود قطرات من حمض الكبريتيك المركز (H2SO4) كعامل مساعد وماص للماء لينتج الإستر والماء.`,
        wordCount: 22
      }
    ],
    ocrStatus: 'none',
    isSharedInLibrary: false, // NOT shared until approved
    createdAt: '2026-03-10T12:00:00Z',
    updatedAt: '2026-03-10T12:00:00Z',
    sourceAttribution: 'مذكرة إثرائية مقترحة للكيمياء العضوية - بانتظار قرار المراجع العلمي.'
  }
];

export const SEED_QUESTIONS: QuestionBankItem[] = [
  {
    id: 'qb-chem-01',
    questionText: 'في التفاعل المتزن الغازي التالي: N2(g) + 3H2(g) <=> 2NH3(g) حيث أن التفاعل طارد للحرارة (Delta H = -92 kJ). ما هو الإجراء الذي يؤدي إلى زيادة تركيز غاز الأمونيا NH3 عند الاتزان؟',
    options: [
      { id: 'opt_1', text: 'خفض درجة حرارة وعاء التفاعل' },
      { id: 'opt_2', text: 'تقليل الضغط الكلي عبر زيادة حجم الوعاء' },
      { id: 'opt_3', text: 'إضافة عامل مساعد مناسب للتفاعل' },
      { id: 'opt_4', text: 'سحب جزء من غاز النيتروجين N2 من المنظومة' }
    ],
    correctOptionId: 'opt_1',
    explanation: 'وفق مبدأ لوشاتيليه، بما أن التفاعل طارد للحرارة فإن الحرارة تُعد أحد نواتج التفاعل. عند خفض درجة الحرارة، ينزاح موضع الاتزان نحو الطرف الأيمن (الأمامي) لتعويض النقص في الطاقة، مما يرفع تركيز غاز الأمونيا NH3. أما تقليل الضغط فينحاز نحو الطرف ذي المولات الغازية الأكثر (اليسار)، والعامل المساعد لا يغير موضع الاتزان، وسحب N2 يعيد التفاعل لليسار.',
    learningOutcomeId: 'lo-chem-01',
    learningOutcomeCode: 'LO-CHEM-01',
    bloomLevel: 'apply',
    targetDifficulty: 'medium',
    referenceId: 'ref-chem-equilibrium-textbook',
    referenceVersion: '1.0',
    referenceTitle: 'كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي والديناميكا الحرارية',
    chunkId: 'chk-chem-eq-02',
    citation: {
      sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
      pageOrSection: 'القسم 4.2، صفحة 118',
      snippetText: 'عند رفع درجة الحرارة في تفاعل طارد للحرارة ينزاح التفاعل نحو الاتجاه العكسي، بينما عند خفضها ينزاح نحو الأمامي وتزداد النواتج.'
    },
    status: 'approved',
    createdByTeacherId: 'user-teacher-hani',
    createdByTeacherName: 'أ. هاني عبد الرحمن',
    reviewedByReviewerId: 'user-reviewer-samir',
    reviewedAt: '2026-03-06T15:00:00Z',
    createdAt: '2026-03-05T12:00:00Z',
    updatedAt: '2026-03-06T15:00:00Z',
    courseId: 'course-chem-bagrut',
    unitId: 'unit-chem-equilibrium'
  },
  {
    id: 'qb-chem-02',
    questionText: 'ما هو التعبير الصحيح لثابت الاتزان Kc للتفاعل التالي غير المتجانس: CaCO3(s) <=> CaO(s) + CO2(g)؟',
    options: [
      { id: 'opt_1', text: 'Kc = [CO2]' },
      { id: 'opt_2', text: 'Kc = ([CaO] * [CO2]) / [CaCO3]' },
      { id: 'opt_3', text: 'Kc = [CaCO3] / [CO2]' },
      { id: 'opt_4', text: 'Kc = [CaO] / [CaCO3]' }
    ],
    correctOptionId: 'opt_1',
    explanation: 'المواد الصلبة النقية (s) مثل CaCO3 و CaO لا تدخل في تعبير ثابت الاتزان الكيميائي Kc لأن تراكيزها المولارية ثابتة ومستقلة عن الحجم، وبالتالي يقتصر تعبير ثابت الاتزان على تركيز غاز ثاني أكسيد الكربون فقط: Kc = [CO2].',
    learningOutcomeId: 'lo-chem-02',
    learningOutcomeCode: 'LO-CHEM-02',
    bloomLevel: 'understand',
    targetDifficulty: 'easy',
    referenceId: 'ref-chem-equilibrium-textbook',
    referenceVersion: '1.0',
    referenceTitle: 'كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي والديناميكا الحرارية',
    chunkId: 'chk-chem-eq-01',
    citation: {
      sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
      pageOrSection: 'القسم 4.1، صفحة 114',
      snippetText: 'لا تدخل المواد الصلبة والسوائل النقية في تعبير ثابت الاتزان لأن تراكيزها المولارية تظل ثابتة.'
    },
    status: 'approved',
    createdByTeacherId: 'user-teacher-hani',
    createdByTeacherName: 'أ. هاني عبد الرحمن',
    reviewedByReviewerId: 'user-reviewer-samir',
    reviewedAt: '2026-03-06T15:10:00Z',
    createdAt: '2026-03-05T12:30:00Z',
    updatedAt: '2026-03-06T15:10:00Z',
    courseId: 'course-chem-bagrut',
    unitId: 'unit-chem-equilibrium'
  },
  {
    id: 'qb-chem-03',
    questionText: 'عند إضافة عامل مساعد (Catalyst) إلى منظومة كيميائية متزنة عند درجة حرارة وضغط ثابتين، ما هو التغير الذي يطرأ على المنظومة؟',
    options: [
      { id: 'opt_1', text: 'لا يتغير موضع الاتزان ولا تتغير قيمة ثابت الاتزان Kc' },
      { id: 'opt_2', text: 'يزداد تركيز النواتج وتزداد قيمة ثابت الاتزان Kc' },
      { id: 'opt_3', text: 'ينزاح موضع الاتزان نحو الطرف الذي يحتوي على عدد مولات أقل' },
      { id: 'opt_4', text: 'تنخفض قيمة ثابت الاتزان Kc بسبب استهلاك الطاقة' }
    ],
    correctOptionId: 'opt_1',
    explanation: 'العامل المساعد يزيد من سرعة التفاعل الأمامي والعكسي بنفس النسبة من خلال خفض طاقة التنشيط لكلا المسارين، لذلك لا يغير موضع الاتزان ولا يؤثر إطلاقاً على قيمة ثابت الاتزان Kc، بل يسرع فقط من زمن الوصول إلى الاتزان.',
    learningOutcomeId: 'lo-chem-03',
    learningOutcomeCode: 'LO-CHEM-03',
    bloomLevel: 'analyze',
    targetDifficulty: 'medium',
    referenceId: 'ref-chem-equilibrium-textbook',
    referenceVersion: '1.0',
    referenceTitle: 'كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي والديناميكا الحرارية',
    chunkId: 'chk-chem-eq-03',
    citation: {
      sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
      pageOrSection: 'القسم 4.3، صفحة 122',
      snippetText: 'العامل المساعد لا يغير موضع الاتزان ولا يؤثر إطلاقاً على قيمة ثابت الاتزان Kc بل يقلل زمن الوصول للاتزان.'
    },
    status: 'approved',
    createdByTeacherId: 'user-teacher-hani',
    createdByTeacherName: 'أ. هاني عبد الرحمن',
    reviewedByReviewerId: 'user-reviewer-samir',
    reviewedAt: '2026-03-06T15:20:00Z',
    createdAt: '2026-03-05T13:00:00Z',
    updatedAt: '2026-03-06T15:20:00Z',
    courseId: 'course-chem-bagrut',
    unitId: 'unit-chem-equilibrium'
  },
  {
    id: 'qb-chem-04',
    questionText: 'في تفاعل غازي ماص للحرارة: A(g) + B(g) <=> C(g) (Delta H > 0). ماذا يحدث لقيمة ثابت الاتزان Kc ولموضع الاتزان عند رفع درجة الحرارة؟',
    options: [
      { id: 'opt_1', text: 'تزداد قيمة Kc وينزاح موضع الاتزان نحو اليمين (النواتج)' },
      { id: 'opt_2', text: 'تنخفض قيمة Kc وينزاح موضع الاتزان نحو اليسار (المتفاعلات)' },
      { id: 'opt_3', text: 'تظل قيمة Kc ثابتة وينزاح موضع الاتزان نحو اليمين' },
      { id: 'opt_4', text: 'تزداد قيمة Kc ولكن يظل موضع الاتزان ثابتاً دون تغير' }
    ],
    correctOptionId: 'opt_1',
    explanation: 'في التفاعلات الماصة للحرارة تُعد الحرارة بمثابة متفاعل. عند رفع درجة الحرارة، ينزاح موضع الاتزان إلى اليمين لاستهلاك الحرارة الإضافية، وبما أن تركيز النواتج يزداد وتركيز المتفاعلات يقل، فإن قيمة ثابت الاتزان Kc ترتفع بالضرورة.',
    learningOutcomeId: 'lo-chem-01',
    learningOutcomeCode: 'LO-CHEM-01',
    bloomLevel: 'apply',
    targetDifficulty: 'hard',
    referenceId: 'ref-chem-equilibrium-textbook',
    referenceVersion: '1.0',
    referenceTitle: 'كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي والديناميكا الحرارية',
    chunkId: 'chk-chem-eq-02',
    citation: {
      sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
      pageOrSection: 'القسم 4.2، صفحة 118',
      snippetText: 'في التفاعل الماص للحرارة يؤدي التسخين إلى انزياح التفاعل للأمام وزيادة قيمة ثابت الاتزان Kc.'
    },
    status: 'approved',
    createdByTeacherId: 'user-teacher-hani',
    createdByTeacherName: 'أ. هاني عبد الرحمن',
    reviewedByReviewerId: 'user-reviewer-samir',
    reviewedAt: '2026-03-06T15:30:00Z',
    createdAt: '2026-03-05T13:30:00Z',
    updatedAt: '2026-03-06T15:30:00Z',
    courseId: 'course-chem-bagrut',
    unitId: 'unit-chem-equilibrium'
  }
];

export const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-chem-eq-01',
    title: 'اختبار الاتزان الكيميائي ومبدأ لوشاتيليه - الدورة الرسمية',
    courseId: 'course-chem-bagrut',
    courseName: 'كيمياء البجروت المتقدمة (5 وحدات)',
    groupId: 'group-chem-12a',
    groupName: 'شعبة الكيمياء المتقدمة 12 (أ)',
    teacherId: 'user-teacher-hani',
    teacherName: 'أ. هاني عبد الرحمن',
    durationMinutes: 30,
    startDate: '2026-03-01T08:00:00Z',
    endDate: '2026-12-31T23:59:59Z', // Wide window for immediate user testing
    allowedAttempts: 2,
    passScore: 60,
    resultPolicy: 'immediate_full',
    shuffleQuestions: true,
    shuffleOptions: true,
    isPublished: true,
    publishedAt: '2026-03-07T09:00:00Z',
    accommodations: {
      'user-student-maryam': {
        extraTimePercent: 25,
        extraMinutes: 8,
        reason: 'تسهيلات وقت إضافي معتمدة (+25%)'
      }
    },
    totalPoints: 100,
    questionsCount: 4,
    frozenQuestionsSnapshot: [
      {
        id: 'fq-01',
        originalBankQuestionId: 'qb-chem-01',
        questionText: 'في التفاعل المتزن الغازي التالي: N2(g) + 3H2(g) <=> 2NH3(g) حيث أن التفاعل طارد للحرارة (Delta H = -92 kJ). ما هو الإجراء الذي يؤدي إلى زيادة تركيز غاز الأمونيا NH3 عند الاتزان؟',
        options: [
          { id: 'opt_1', text: 'خفض درجة حرارة وعاء التفاعل' },
          { id: 'opt_2', text: 'تقليل الضغط الكلي عبر زيادة حجم الوعاء' },
          { id: 'opt_3', text: 'إضافة عامل مساعد مناسب للتفاعل' },
          { id: 'opt_4', text: 'سحب جزء من غاز النيتروجين N2 من المنظومة' }
        ],
        correctOptionId: 'opt_1',
        explanation: 'وفق مبدأ لوشاتيليه، بما أن التفاعل طارد للحرارة فإن خفض درجة الحرارة يوجه التفاعل للأمام لتعويض النقص في الحرارة، مما يرفع تركيز غاز الأمونيا NH3.',
        points: 25,
        learningOutcomeId: 'lo-chem-01',
        learningOutcomeCode: 'LO-CHEM-01',
        bloomLevel: 'apply',
        citation: {
          sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
          pageOrSection: 'القسم 4.2، ص 118'
        }
      },
      {
        id: 'fq-02',
        originalBankQuestionId: 'qb-chem-02',
        questionText: 'ما هو التعبير الصحيح لثابت الاتزان Kc للتفاعل التالي غير المتجانس: CaCO3(s) <=> CaO(s) + CO2(g)؟',
        options: [
          { id: 'opt_1', text: 'Kc = [CO2]' },
          { id: 'opt_2', text: 'Kc = ([CaO] * [CO2]) / [CaCO3]' },
          { id: 'opt_3', text: 'Kc = [CaCO3] / [CO2]' },
          { id: 'opt_4', text: 'Kc = [CaO] / [CaCO3]' }
        ],
        correctOptionId: 'opt_1',
        explanation: 'المواد الصلبة النقية لا تدخل في تعبير ثابت الاتزان لأن كثافتها وتراكيزها المولارية ثابتة أثناء التفاعل.',
        points: 25,
        learningOutcomeId: 'lo-chem-02',
        learningOutcomeCode: 'LO-CHEM-02',
        bloomLevel: 'understand',
        citation: {
          sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
          pageOrSection: 'القسم 4.1، ص 114'
        }
      },
      {
        id: 'fq-03',
        originalBankQuestionId: 'qb-chem-03',
        questionText: 'عند إضافة عامل مساعد (Catalyst) إلى منظومة كيميائية متزنة عند درجة حرارة وضغط ثابتين، ما هو التغير الذي يطرأ على المنظومة؟',
        options: [
          { id: 'opt_1', text: 'لا يتغير موضع الاتزان ولا تتغير قيمة ثابت الاتزان Kc' },
          { id: 'opt_2', text: 'يزداد تركيز النواتج وتزداد قيمة ثابت الاتزان Kc' },
          { id: 'opt_3', text: 'ينزاح موضع الاتزان نحو الطرف الذي يحتوي على عدد مولات أقل' },
          { id: 'opt_4', text: 'تنخفض قيمة ثابت الاتزان Kc بسبب استهلاك الطاقة' }
        ],
        correctOptionId: 'opt_1',
        explanation: 'العامل المساعد يسرع التفاعلين الأمامي والعكسي بنفس النسبة ولا يغير موضع الاتزان ولا قيمة Kc.',
        points: 25,
        learningOutcomeId: 'lo-chem-03',
        learningOutcomeCode: 'LO-CHEM-03',
        bloomLevel: 'analyze',
        citation: {
          sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
          pageOrSection: 'القسم 4.3، ص 122'
        }
      },
      {
        id: 'fq-04',
        originalBankQuestionId: 'qb-chem-04',
        questionText: 'في تفاعل غازي ماص للحرارة: A(g) + B(g) <=> C(g) (Delta H > 0). ماذا يحدث لقيمة ثابت الاتزان Kc ولموضع الاتزان عند رفع درجة الحرارة؟',
        options: [
          { id: 'opt_1', text: 'تزداد قيمة Kc وينزاح موضع الاتزان نحو اليمين (النواتج)' },
          { id: 'opt_2', text: 'تنخفض قيمة Kc وينزاح موضع الاتزان نحو اليسار (المتفاعلات)' },
          { id: 'opt_3', text: 'تظل قيمة Kc ثابتة وينزاح موضع الاتزان نحو اليمين' },
          { id: 'opt_4', text: 'تزداد قيمة Kc ولكن يظل موضع الاتزان ثابتاً دون تغير' }
        ],
        correctOptionId: 'opt_1',
        explanation: 'في التفاعلات الماصة للحرارة يؤدي التسخين إلى استهلاك الحرارة بالاتجاه الأمامي مما يرفع تراكيز النواتج ويزيد قيمة Kc.',
        points: 25,
        learningOutcomeId: 'lo-chem-01',
        learningOutcomeCode: 'LO-CHEM-01',
        bloomLevel: 'apply',
        citation: {
          sourceTitle: 'كتاب الكيمياء المعتمد، الباب الرابع',
          pageOrSection: 'القسم 4.2، ص 118'
        }
      }
    ],
    createdAt: '2026-03-07T08:30:00Z',
    updatedAt: '2026-03-07T09:00:00Z'
  }
];

export const SEED_ATTEMPTS: ExamAttempt[] = [
  {
    id: 'att-chem-ahmed-01',
    examId: 'exam-chem-eq-01',
    examTitle: 'اختبار الاتزان الكيميائي ومبدأ لوشاتيليه - الدورة الرسمية',
    studentId: 'user-student-ahmed',
    studentName: 'أحمد خليل المنصور',
    groupId: 'group-chem-12a',
    attemptNumber: 1,
    startedAt: '2026-03-08T10:00:00Z',
    expiresAt: '2026-03-08T10:30:00Z',
    submittedAt: '2026-03-08T10:24:15Z',
    status: 'submitted',
    shuffledQuestionsOrder: ['fq-01', 'fq-02', 'fq-03', 'fq-04'],
    shuffledOptionsOrder: {
      'fq-01': ['opt_1', 'opt_2', 'opt_3', 'opt_4'],
      'fq-02': ['opt_1', 'opt_2', 'opt_3', 'opt_4'],
      'fq-03': ['opt_1', 'opt_2', 'opt_3', 'opt_4'],
      'fq-04': ['opt_1', 'opt_2', 'opt_3', 'opt_4']
    },
    answers: {
      'fq-01': 'opt_1',
      'fq-02': 'opt_1',
      'fq-03': 'opt_1',
      'fq-04': 'opt_1'
    },
    savedAt: '2026-03-08T10:24:15Z',
    score: 100,
    maxScore: 100,
    percentage: 100,
    passed: true,
    itemResults: {
      'fq-01': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-01' },
      'fq-02': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-02' },
      'fq-03': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-03' },
      'fq-04': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-01' }
    },
    idempotencyKey: 'idem-ahmed-01'
  },
  {
    id: 'att-chem-maryam-01',
    examId: 'exam-chem-eq-01',
    examTitle: 'اختبار الاتزان الكيميائي ومبدأ لوشاتيليه - الدورة الرسمية',
    studentId: 'user-student-maryam',
    studentName: 'مريم عثمان الزعبي',
    groupId: 'group-chem-12a',
    attemptNumber: 1,
    startedAt: '2026-03-08T11:00:00Z',
    expiresAt: '2026-03-08T11:38:00Z', // With 25% extra time (+8 mins)
    submittedAt: '2026-03-08T11:29:40Z',
    status: 'submitted',
    shuffledQuestionsOrder: ['fq-02', 'fq-01', 'fq-04', 'fq-03'],
    shuffledOptionsOrder: {
      'fq-01': ['opt_2', 'opt_1', 'opt_3', 'opt_4'],
      'fq-02': ['opt_1', 'opt_3', 'opt_2', 'opt_4'],
      'fq-03': ['opt_2', 'opt_1', 'opt_4', 'opt_3'],
      'fq-04': ['opt_1', 'opt_4', 'opt_2', 'opt_3']
    },
    answers: {
      'fq-01': 'opt_1',
      'fq-02': 'opt_1',
      'fq-03': 'opt_2', // Distractor chosen
      'fq-04': 'opt_1'
    },
    savedAt: '2026-03-08T11:29:40Z',
    score: 75,
    maxScore: 100,
    percentage: 75,
    passed: true,
    itemResults: {
      'fq-01': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-01' },
      'fq-02': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-02' },
      'fq-03': { isCorrect: false, chosenOptionId: 'opt_2', correctOptionId: 'opt_1', pointsEarned: 0, pointsPossible: 25, learningOutcomeId: 'lo-chem-03' },
      'fq-04': { isCorrect: true, chosenOptionId: 'opt_1', correctOptionId: 'opt_1', pointsEarned: 25, pointsPossible: 25, learningOutcomeId: 'lo-chem-01' }
    },
    idempotencyKey: 'idem-maryam-01'
  }
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-01',
    timestamp: '2026-03-04T10:00:00Z',
    userId: 'user-teacher-hani',
    userName: 'أ. هاني عبد الرحمن',
    userRole: 'teacher',
    action: 'رفع مرجع جديد للمراجعة',
    entityType: 'reference',
    entityId: 'ref-chem-equilibrium-textbook',
    details: 'تم رفع كتاب الكيمياء المعتمد - الباب الرابع للاتزان الكيميائي (v1.0)'
  },
  {
    id: 'log-02',
    timestamp: '2026-03-05T14:30:00Z',
    userId: 'user-reviewer-samir',
    userName: 'د. سمير القاسم (المراجع العلمي المعتمد)',
    userRole: 'reviewer',
    action: 'اعتماد مرجع رسمي في المكتبة المشتركة',
    entityType: 'reference',
    entityId: 'ref-chem-equilibrium-textbook',
    details: 'تم اعتماد المرجع رسمياً ونشره في مكتبة الكيمياء المشتركة'
  },
  {
    id: 'log-03',
    timestamp: '2026-03-06T15:00:00Z',
    userId: 'user-reviewer-samir',
    userName: 'د. سمير القاسم (المراجع العلمي المعتمد)',
    userRole: 'reviewer',
    action: 'اعتماد سؤال في بنك الأسئلة',
    entityType: 'question',
    entityId: 'qb-chem-01',
    details: 'اعتماد السؤال وربطه بناتج التعلم LO-CHEM-01 والمصدر ص 118'
  },
  {
    id: 'log-04',
    timestamp: '2026-03-07T09:00:00Z',
    userId: 'user-teacher-hani',
    userName: 'أ. هاني عبد الرحمن',
    userRole: 'teacher',
    action: 'تجميد ونشر اختبار رسمي',
    entityType: 'exam',
    entityId: 'exam-chem-eq-01',
    details: 'نشر الاختبار مع تجميد لقطة الأسئلة (4 أسئلة، 100 درجة) لشعبة 12 (أ)'
  }
];
