// Course and Reference Management for Altafawuq Online Academy
// Manages Courses, Units, Lessons, Approved References, Question Bank, and AI Content Generation

export type SubjectType = 'علمي' | 'أدبي' | 'لغات' | 'تقني' | 'علوم إنسانية' | 'أخرى';

export type ReferenceSourceType = 
  | 'pdf'             // ملفات PDF
  | 'word'            // ملفات Word
  | 'powerpoint'      // عروض PowerPoint
  | 'text'            // ملفات نصية
  | 'website'         // مواقع إلكترونية
  | 'video'           // فيديوهات تعليمية
  | 'ebook'           // كتب إلكترونية
  | 'article'         // مقالات علمية
  | 'teacher_notes';  // ملاحظات خاصة بالمعلم

export interface CourseReference {
  id: string;
  courseId: string;
  title: string;
  sourceType: ReferenceSourceType;
  authorOrPublisher: string;
  urlOrContent: string;
  fileSize?: string;
  pageCount?: number;
  notes?: string; // ملاحظات خاصة بالمعلم
  citation: string; // التوثيق الأكاديمي الرسمي
  isApproved: boolean; // معتمد رسمياً من المعلم
  approvedDate: string;
  approvedByTeacher: string;
  linkedUnitIds?: string[];
  linkedLessonIds?: string[];
  keyConceptsSummary?: string;
}

export interface BankQuestion {
  id: string;
  courseId: string;
  unitId?: string;
  lessonId?: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string; // تفسير الإجابة
  referenceUsed: string; // المرجع المستخدم
  fileNameOrUrl: string; // اسم الملف أو الموقع
  pageNumber?: string; // رقم الصفحة إن وجد
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  unitTitle?: string;
  lessonTitle?: string;
  createdAt: string;
}

export interface CourseFlashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  referenceCitation: string;
}

export interface CourseKeyConcept {
  id: string;
  term: string;
  definition: string;
  referenceCitation: string;
}

export interface CourseLesson {
  id: string;
  unitId: string;
  courseId: string;
  lessonNumber: number;
  title: string;
  durationMinutes: number;
  summary: string;
  contentMarkdown: string; // 📖 محتوى الشرح
  linkedReferenceIds: string[]; // المرجعيات المرتبطة بالدرس
  practiceQuestions: BankQuestion[]; // 📝 أسئلة المراجعة
  finalQuiz: { // 🎯 الاختبارات
    id: string;
    title: string;
    timeLimitMinutes: number;
    passScorePercentage: number;
    questions: BankQuestion[];
  };
  keyConcepts?: CourseKeyConcept[]; // 🗂 المفاهيم الأساسية
  flashcards?: CourseFlashcard[]; // 📚 البطاقات التعليمية
}

export interface CourseUnit {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  description: string;
  linkedReferenceIds: string[]; // المرجعيات المرتبطة بالوحدة
  lessons: CourseLesson[];
}

export interface TeacherCourse {
  id: string;
  name: string; // اسم المادة
  description: string; // وصف المادة
  gradeLevel: string; // الصف الدراسي
  imageUrl: string; // صورة المادة
  subjectType: SubjectType; // نوع المادة
  status: 'published' | 'draft'; // حالة المادة (منشورة أو غير منشورة)
  leadTeacher: string; // معلم المادة
  createdAt: string;
  updatedAt: string;
  references: CourseReference[]; // 📚 المرجعيات المعتمدة
  units: CourseUnit[]; // الوحدات والدروس
  questionBank: BankQuestion[]; // بنك الأسئلة المعتمد
}

// Default Initial Courses as specified in prompt:
// مادة الأحياء:
// الوحدة الأولى: الخلية
// الوحدة الثانية: التمثيل الضوئي
// الوحدة الثالثة: التنفس الخلوي
export const INITIAL_TEACHER_COURSES: TeacherCourse[] = [
  {
    id: 'course-bio-1',
    name: 'مادة الأحياء والبيولوجيا (بجروت 5 وحدات)',
    description: 'منهاج أكاديمي شامل يغطي تركيب الخلية، التمثيل الضوئي، والتنفس الخلوي استناداً حصرياً إلى المراجع المعتمدة.',
    gradeLevel: 'الصف الثاني عشر (بجروت)',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    subjectType: 'علمي',
    status: 'published',
    leadTeacher: 'أ. د. زكي أبو علان (كبير مدرسي البيولوجيا)',
    createdAt: '2026-08-15',
    updatedAt: '2026-09-02',
    references: [
      {
        id: 'ref-bio-book-11',
        courseId: 'course-bio-1',
        title: 'كتاب الأحياء للصف الحادي عشر والثاني عشر المعتمد',
        sourceType: 'ebook',
        authorOrPublisher: 'وزارة التعليم - إدارة المناهج الرسمية',
        urlOrContent: 'منهاج الأحياء الرسمي المعتمد، الطبعة الأكاديمية المطورة',
        fileSize: '18.4 MB',
        pageCount: 320,
        notes: 'المرجع الرسمي الإلزامي لأسئلة البجروت الوزارية والنظريات الأساسية.',
        citation: 'كتاب الأحياء المعتمد، وزارة التعليم، ص 45-128',
        isApproved: true,
        approvedDate: '2026-08-20',
        approvedByTeacher: 'أ. د. زكي أبو علان',
        linkedUnitIds: ['u-cell', 'u-photo', 'u-resp']
      },
      {
        id: 'ref-bio-pdf-photo',
        courseId: 'course-bio-1',
        title: 'ملف شرح تفاعلات الضوء وحلقة كالفن (PDF)',
        sourceType: 'pdf',
        authorOrPublisher: 'إعداد أ. د. زكي أبو علان',
        urlOrContent: 'ملف شرح تفصيلي بالمعادلات والمخططات لعملية البناء الضوئي',
        fileSize: '4.8 MB',
        pageCount: 24,
        notes: 'يتضمن شرحاً وافياً لإنزيم الروبيسكو ومسارات نقل الإلكترون بالثايلاكويد.',
        citation: 'ملف شرح التمثيل الضوئي PDF، أ. د. زكي أبو علان، ص 1-24',
        isApproved: true,
        approvedDate: '2026-08-25',
        approvedByTeacher: 'أ. د. زكي أبو علان',
        linkedUnitIds: ['u-photo']
      },
      {
        id: 'ref-bio-web-online',
        courseId: 'course-bio-1',
        title: 'موقع Biology Online التعليمي المعتمد',
        sourceType: 'website',
        authorOrPublisher: 'Biology Online Academic Repository',
        urlOrContent: 'https://www.biologyonline.com/tutorials/photosynthesis',
        notes: 'موقع معتمد للاطلاع على المحاكاة الحيوية للبلاستيدات والميتوكوندريا.',
        citation: 'موقع Biology Online المعتمد من المعلم (قسم الأيض والتمثيل الضوئي)',
        isApproved: true,
        approvedDate: '2026-08-28',
        approvedByTeacher: 'أ. د. زكي أبو علان',
        linkedUnitIds: ['u-photo', 'u-resp']
      },
      {
        id: 'ref-bio-ppt-slides',
        courseId: 'course-bio-1',
        title: 'عرض PowerPoint: المسارات الحيوية للخلية والأيض',
        sourceType: 'powerpoint',
        authorOrPublisher: 'أكاديمية التفوق أون لاين',
        urlOrContent: 'شرائح عرض تقدمية تفاعلية للدروس المرئية',
        fileSize: '14.2 MB',
        pageCount: 42,
        notes: 'يُعرض في الحصص التفاعلية المباشرة ويحتوي على رسوم ثلاثية الأبعاد.',
        citation: 'عرض شرائح PowerPoint المعتمد، أكاديمية التفوق، شريحة 1-42',
        isApproved: true,
        approvedDate: '2026-08-30',
        approvedByTeacher: 'أ. د. زكي أبو علان',
        linkedUnitIds: ['u-cell', 'u-photo']
      }
    ],
    units: [
      {
        id: 'u-cell',
        courseId: 'course-bio-1',
        unitNumber: 1,
        title: 'الوحدة الأولى: الخلية',
        description: 'بنية الخلية الحية، الغشاء البلازمي، العضيات الخلوية، ومقارنة بين الخلية النباتية والحيوانية.',
        linkedReferenceIds: ['ref-bio-book-11', 'ref-bio-ppt-slides'],
        lessons: [
          {
            id: 'l-cell-1',
            unitId: 'u-cell',
            courseId: 'course-bio-1',
            lessonNumber: 1,
            title: 'تركيب الغشاء البلازمي والنقل الخلوي',
            durationMinutes: 45,
            summary: 'دراسة النموذج الفسيفسائي السائل للغشاء الخلوي وآليات الانتشار البسيط والميسر والنقل النشط.',
            contentMarkdown: `### تركيب الغشاء البلازمي (Cell Membrane)
وفقاً للمرجع المعتمد (**كتاب الأحياء المعتمد، ص 45**)، يتكون الغشاء البلازمي من:
1. **طبقة فوسفوليبيد ثنائية (Phospholipid Bilayer):** تتكون من رؤوس محبة للماء (Hydrophilic) موجهة للخارج، وذيول كارهة للماء (Hydrophobic) موجهة للداخل.
2. **البروتينات الغشائية:** بروتينات غائرة تعمل كقنوات وناقلات ومستقبلات، وبروتينات طرفية.
3. **الكوليسترول:** ينظم سيولة الغشاء تحت درجات الحرارة المختلفة.

### آليات النقل عبر الغشاء:
- **الانتشار البسيط:** حركة الجزيئات غير القطبية مع تدرج التركيز دون استهلاك طاقة.
- **الخاصية الأسموزية:** حركة جزيئات الماء عبر غشاء شبه منفذ.
- **النقل النشط:** حركة المواد ضد تدرج التركيز باستعمال مضخات بروتينية واستهلاك جزيئات $ATP$.`,
            linkedReferenceIds: ['ref-bio-book-11'],
            practiceQuestions: [
              {
                id: 'pq-cell-1',
                courseId: 'course-bio-1',
                unitId: 'u-cell',
                lessonId: 'l-cell-1',
                question: 'ما هي الخاصية المميزة لذيول الفوسفوليبيدات في الغشاء البلازمي وفق المرجع المعتمد؟',
                options: ['محبة للماء وغير قطبية', 'كارهة للماء وغير قطبية', 'محبة للماء وقطبية', 'ناقلة للأيونات بالانتشار'],
                answer: 'كارهة للماء وغير قطبية',
                explanation: 'الذيول الهيدروكربونية كارهة للماء (Hydrophobic) وتتجه نحو داخل الغشاء لتكوين بيئة غير مائية.',
                referenceUsed: 'كتاب الأحياء للصف الحادي عشر والثاني عشر المعتمد',
                fileNameOrUrl: 'كتاب الأحياء المعتمد',
                pageNumber: '48',
                questionType: 'multiple_choice',
                createdAt: '2026-09-02'
              }
            ],
            finalQuiz: {
              id: 'quiz-cell-1',
              title: 'اختبار الغشاء الخلوي والنقل الحيوي',
              timeLimitMinutes: 15,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-cell-1',
                  courseId: 'course-bio-1',
                  question: 'يتطلب النقل النشط عبر الغشاء استهلاك طاقة خلوية بصيغة ATP.',
                  options: ['صح', 'خطأ'],
                  answer: 'صح',
                  explanation: 'النقل النشط ينقل المواد ضد تدرج التركيز وبالتالي يتطلب طاقة مباشرة من تحلل ATP.',
                  referenceUsed: 'كتاب الأحياء المعتمد',
                  fileNameOrUrl: 'كتاب الأحياء المعتمد',
                  pageNumber: '52',
                  questionType: 'true_false',
                  createdAt: '2026-09-02'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'u-photo',
        courseId: 'course-bio-1',
        unitNumber: 2,
        title: 'الوحدة الثانية: التمثيل الضوئي',
        description: 'التفاعلات الضوئية في الثايلاكويد، إنتاج ATP و NADPH، وتفاعلات حلقة كالفن في الستروما لتثبيت الكربون.',
        linkedReferenceIds: ['ref-bio-book-11', 'ref-bio-pdf-photo', 'ref-bio-web-online', 'ref-bio-ppt-slides'],
        lessons: [
          {
            id: 'l-photo-1',
            unitId: 'u-photo',
            courseId: 'course-bio-1',
            lessonNumber: 1,
            title: 'التفاعلات الضوئية وسلسلة نقل الإلكترون',
            durationMinutes: 50,
            summary: 'كيفية شطر جزيئات الماء، مسار الإلكترونات بين النظامين الضوئيين الثاني والأول، وتكوين ممال البروتونات.',
            contentMarkdown: `### التفاعلات الضوئية في البلاستيدات الخضراء
وفقاً للمرجع المعتمد (**ملف شرح تفاعلات الضوء وحلقة كالفن PDF، ص 6**):
تحدث هذه التفاعلات في **أغشية الثايلاكويد** وتعتمد على الطاقة الشمسية الممتصة بواسطة صبغات الكلوروفيل.

$$2H_2O + 2NADP^+ + 3ADP + 3P_i \\xrightarrow{\\text{ضوء}} O_2 + 2NADPH + 3ATP$$

### الخطوات الرئيسية المعتمدة:
1. **شطر الماء (Photolysis):** يتم شطر جزيء الماء في النظام الضوئي الثاني ($PSII$) لإنتاج الإلكترونات والبروتونات وغاز الأكسجين $O_2$.
2. **سلسلة نقل الإلكترون:** تنتقل الإلكترونات المستثارة عبر نواقل غشائية، مضخمة ممال تركيز أيونات الهيدروجين في تجويف الثايلاكويد.
3. **التفسفر الضوئي:** يتدفق الهيدروجين عبر إنزيم بناء $ATP$ نحو الستروما لإنتاج الطاقة.`,
            linkedReferenceIds: ['ref-bio-pdf-photo', 'ref-bio-web-online'],
            practiceQuestions: [
              {
                id: 'pq-photo-1',
                courseId: 'course-bio-1',
                unitId: 'u-photo',
                lessonId: 'l-photo-1',
                question: 'أين يتم استهلاك وتوظيف نواتج التفاعلات الضوئية (ATP و NADPH)؟',
                options: ['في الستروما خلال حلقة كالفن', 'في تجويف الثايلاكويد لشطر الماء', 'داخل الميتوكوندريا أثناء التنفس', 'في النواة لمضاعفة DNA'],
                answer: 'في الستروما خلال حلقة كالفن',
                explanation: 'تتحرر نواتج تفاعلات الضوء (ATP و NADPH) مباشرة إلى الستروما حيث توجد إنزيمات تثبيت ثاني أكسيد الكربون.',
                referenceUsed: 'ملف شرح تفاعلات الضوء وحلقة كالفن (PDF)',
                fileNameOrUrl: 'ملف شرح التمثيل الضوئي PDF',
                pageNumber: '12',
                questionType: 'multiple_choice',
                createdAt: '2026-09-02'
              }
            ],
            finalQuiz: {
              id: 'quiz-photo-1',
              title: 'اختبار التفاعلات الضوئية والفسفرة',
              timeLimitMinutes: 20,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-photo-1',
                  courseId: 'course-bio-1',
                  question: 'مصدر الأكسجين المنطلق في عملية التمثيل الضوئي هو جزيئات ثاني أكسيد الكربون.',
                  options: ['صح', 'خطأ'],
                  answer: 'خطأ',
                  explanation: 'الأكسجين المنطلق مصدره شطر جزيئات الماء (H2O) في النظام الضوئي الثاني وليس CO2 وفق تجارب روبن وكامين.',
                  referenceUsed: 'كتاب الأحياء المعتمد',
                  fileNameOrUrl: 'كتاب الأحياء المعتمد',
                  pageNumber: '86',
                  questionType: 'true_false',
                  createdAt: '2026-09-02'
                }
              ]
            }
          },
          {
            id: 'l-photo-2',
            unitId: 'u-photo',
            courseId: 'course-bio-1',
            lessonNumber: 2,
            title: 'حلقة كالفن ودور إنزيم الروبيسكو',
            durationMinutes: 45,
            summary: 'مراحل تثبيت الكربون، الاختزال، وإعادة تكوين RuBP، ودور الإنزيم المحفز الروبيسكو.',
            contentMarkdown: `### حلقة كالفن (Calvin Cycle)
المصدر: **ملف شرح تفاعلات الضوء وحلقة كالفن (PDF)، ص 18**
تحدث في **الستروما (الحشوة)** ولا تتطلب ضوءاً مباشراً ولكنها تعتمد كلياً على نواتج تفاعلات الضوء.

### المراحل الثلاث:
1. **تثبيت الكربون (Carbon Fixation):** يربط إنزيم **الروبيسكو (Rubisco)** غاز $CO_2$ مع مركب خماسي الكربون $RuBP$ لإنتاج مركب سداسي غير مستقر ينشطر إلى جزيئين من $3-PGA$.
2. **مرحلة الاختزال:** تستهلك جزيئات $ATP$ و $NADPH$ لاختزال $3-PGA$ إلى سكر $G3P$.
3. **إعادة تكوين RuBP:** استهلاك مزيد من $ATP$ لإعادة بناء المستقبل الخماسي لاستمرار الدورة.`,
            linkedReferenceIds: ['ref-bio-pdf-photo', 'ref-bio-book-11'],
            practiceQuestions: [
              {
                id: 'pq-photo-2',
                courseId: 'course-bio-1',
                unitId: 'u-photo',
                lessonId: 'l-photo-2',
                question: 'ما هو الدور الأساسي لإنزيم الروبيسكو (Rubisco) في حلقة كالفن؟',
                options: ['تثبيت ثاني أكسيد الكربون مع RuBP', 'شطر جزيء الماء إلى أكسجين وهيدروجين', 'ضخ البروتونات للثايلاكويد', 'تخليق ATP عبر ممال التركيز'],
                answer: 'تثبيت ثاني أكسيد الكربون مع RuBP',
                explanation: 'الروبيسكو هو الإنزيم المحفز لتثبيت غاز ثاني أكسيد الكربون على مركب ريبولوز ثنائي الفوسفات الخماسي.',
                referenceUsed: 'ملف شرح تفاعلات الضوء وحلقة كالفن (PDF)',
                fileNameOrUrl: 'ملف شرح التمثيل الضوئي PDF',
                pageNumber: '19',
                questionType: 'multiple_choice',
                createdAt: '2026-09-02'
              }
            ],
            finalQuiz: {
              id: 'quiz-photo-2',
              title: 'اختبار حلقة كالفن وتثبيت الكربون',
              timeLimitMinutes: 15,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-photo-2',
                  courseId: 'course-bio-1',
                  question: 'تتطلب حلقة كالفن وجود الضوء المباشر بصورة مستمرة كي تعمل إنزيماتها.',
                  options: ['صح', 'خطأ'],
                  answer: 'خطأ',
                  explanation: 'حلقة كالفن تسمى تفاعلات لاضوئية لأنها لا تحتاج فوتونات مباشرة وإن كانت تحتاج ATP و NADPH الناتجة من تفاعلات الضوء.',
                  referenceUsed: 'موقع Biology Online المعتمد من المعلم',
                  fileNameOrUrl: 'موقع Biology Online',
                  pageNumber: '-',
                  questionType: 'true_false',
                  createdAt: '2026-09-02'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'u-resp',
        courseId: 'course-bio-1',
        unitNumber: 3,
        title: 'الوحدة الثالثة: التنفس الخلوي',
        description: 'التحلل السكري في السيتوسول، أكسدة البيروفات، دورة كريبس، وسلسلة نقل الإلكترون في الميتوكوندريا.',
        linkedReferenceIds: ['ref-bio-book-11', 'ref-bio-web-online'],
        lessons: [
          {
            id: 'l-resp-1',
            unitId: 'u-resp',
            courseId: 'course-bio-1',
            lessonNumber: 1,
            title: 'التحلل السكري ودورة كريبس',
            durationMinutes: 50,
            summary: 'تحلل جليكوليز لإنتاج 2 ATP و 2 NADH، يليه دخول الميتوكوندريا لإنتاج حاملات الإلكترونات.',
            contentMarkdown: `### التنفس الخلوي (Cellular Respiration)
وفقاً للمرجع المعتمد (**كتاب الأحياء المعتمد، ص 102**):
المعادلة الكلية للتنفس الخلوي الهوائي:
$$C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + 30-32\\ ATP$$

### المراحل الرئيسية:
1. **التحلل السكري (Glycolysis):** يحدث في السيتوسول دون حاجة للأكسجين، وينتج جزيئين من البيروفات وصافي $2 ATP$ و $2 NADH$.
2. **أكسدة البيروفات ودورة كريبس:** تحدث في حشوة الميتوكوندريا (Matrix) وتنتج $CO_2$ وجزيئات $NADH$ و $FADH_2$.
3. **الفسفرة التأكسدية:** تحدث على الغشاء الداخلي للميتوكوندريا لإنتاج معظم جزيئات الطاقة.`,
            linkedReferenceIds: ['ref-bio-book-11'],
            practiceQuestions: [
              {
                id: 'pq-resp-1',
                courseId: 'course-bio-1',
                unitId: 'u-resp',
                lessonId: 'l-resp-1',
                question: 'أين تحدث مرحلة التحلل السكري (Glycolysis) داخل الخلية؟',
                options: ['في السيتوسول (السيتوبلازم)', 'داخل حشوة الميتوكوندريا', 'على غشاء الثايلاكويد', 'داخل النواة'],
                answer: 'في السيتوسول (السيتوبلازم)',
                explanation: 'التحلل السكري هو مسار لاهوائي يتم حصرياً في سيتوسول الخلية ولا يتطلب وجود الميتوكوندريا.',
                referenceUsed: 'كتاب الأحياء المعتمد',
                fileNameOrUrl: 'كتاب الأحياء المعتمد',
                pageNumber: '104',
                questionType: 'multiple_choice',
                createdAt: '2026-09-02'
              }
            ],
            finalQuiz: {
              id: 'quiz-resp-1',
              title: 'اختبار مراحل التنفس الخلوي',
              timeLimitMinutes: 15,
              passScorePercentage: 80,
              questions: [
                {
                  id: 'fq-resp-1',
                  courseId: 'course-bio-1',
                  question: 'ما هو المستقبل النهائي للإلكترونات في سلسلة نقل الإلكترون أثناء التنفس الخلوي الهوائي؟',
                  options: ['غاز الأكسجين (O2)', 'غاز ثاني أكسيد الكربون (CO2)', 'جزيء الجلوكوز', 'حامض اللاكتيك'],
                  answer: 'غاز الأكسجين (O2)',
                  explanation: 'الأكسجين يعمل كمستقبل نهائي للإلكترونات والبروتونات ليتحد معها مكوناً الماء (H2O).',
                  referenceUsed: 'كتاب الأحياء المعتمد',
                  fileNameOrUrl: 'كتاب الأحياء المعتمد',
                  pageNumber: '112',
                  questionType: 'multiple_choice',
                  createdAt: '2026-09-02'
                }
              ]
            }
          }
        ]
      }
    ],
    questionBank: [
      {
        id: 'qb-1',
        courseId: 'course-bio-1',
        unitId: 'u-photo',
        unitTitle: 'الوحدة الثانية: التمثيل الضوئي',
        lessonTitle: 'التفاعلات الضوئية وسلسلة نقل الإلكترون',
        question: 'ما هو الدور الأساسي لإنزيم الروبيسكو (Rubisco) في حلقة كالفن وفق المرجع المعتمد؟',
        options: [
          'تثبيت ثاني أكسيد الكربون مع جزيء RuBP الخماسي',
          'شطر جزيء الماء وإنتاج غاز الأكسجين',
          'امتصاص الفوتونات الضوئية داخل معقد الهوائي',
          'ضخ أيونات الهيدروجين إلى تجويف الثايلاكويد'
        ],
        answer: 'تثبيت ثاني أكسيد الكربون مع جزيء RuBP الخماسي',
        explanation: 'إنزيم الروبيسكو يحفز التفاعل بين CO2 و RuBP لتكوين مركب سداسي يتفكك إلى جزيئين من PGA.',
        referenceUsed: 'ملف شرح تفاعلات الضوء وحلقة كالفن (PDF)',
        fileNameOrUrl: 'ملف شرح التمثيل الضوئي PDF',
        pageNumber: '18',
        questionType: 'multiple_choice',
        createdAt: '2026-09-02'
      },
      {
        id: 'qb-2',
        courseId: 'course-bio-1',
        unitId: 'u-photo',
        unitTitle: 'الوحدة الثانية: التمثيل الضوئي',
        lessonTitle: 'التفاعلات الضوئية وسلسلة نقل الإلكترون',
        question: 'مصدر غاز الأكسجين المنطلق أثناء عملية التمثيل الضوئي هو شطر جزيئات الماء.',
        options: ['صح', 'خطأ'],
        answer: 'صح',
        explanation: 'أثبتت التجارب العلمية المعتمدة أن الأكسجين يتحرر من الماء في النظام الضوئي الثاني وليس من CO2.',
        referenceUsed: 'كتاب الأحياء للصف الحادي عشر والثاني عشر المعتمد',
        fileNameOrUrl: 'كتاب الأحياء المعتمد',
        pageNumber: '86',
        questionType: 'true_false',
        createdAt: '2026-09-02'
      },
      {
        id: 'qb-3',
        courseId: 'course-bio-1',
        unitId: 'u-cell',
        unitTitle: 'الوحدة الأولى: الخلية',
        lessonTitle: 'تركيب الغشاء البلازمي والنقل الخلوي',
        question: 'ما هي الخاصية المميزة للانتشار الميسر مقارنة بالنقل النشط؟',
        options: [
          'لا يستهلك طاقة ATP ويتم مع تدرج التركيز',
          'يستهلك طاقة ATP وينقل ضد تدرج التركيز',
          'ينقل الجزيئات فقط عبر البلعمة',
          'يحدث فقط في الخلايا النباتية'
        ],
        answer: 'لا يستهلك طاقة ATP ويتم مع تدرج التركيز',
        explanation: 'الانتشار الميسر يستعمل بروتينات ناقلة وقنوات لتمرير المواد مع تدرج التركيز دون استهلاك طاقة.',
        referenceUsed: 'كتاب الأحياء المعتمد',
        fileNameOrUrl: 'كتاب الأحياء المعتمد',
        pageNumber: '50',
        questionType: 'multiple_choice',
        createdAt: '2026-09-02'
      },
      {
        id: 'qb-4',
        courseId: 'course-bio-1',
        unitId: 'u-resp',
        unitTitle: 'الوحدة الثالثة: التنفس الخلوي',
        lessonTitle: 'التحلل السكري ودورة كريبس',
        question: 'ما هو الناتج الصافي المباشر من جزيئات ATP لكل جزيء جلوكوز خلال مرحلة التحلل السكري؟',
        options: ['2 ATP', '4 ATP', '30 ATP', '36 ATP'],
        answer: '2 ATP',
        explanation: 'التحلل السكري يستهلك 2 ATP وينتج 4 ATP، ليكون الناتج الصافي 2 ATP لكل جزيء جلوكوز.',
        referenceUsed: 'كتاب الأحياء المعتمد',
        fileNameOrUrl: 'كتاب الأحياء المعتمد',
        pageNumber: '106',
        questionType: 'multiple_choice',
        createdAt: '2026-09-02'
      }
    ]
  }
];

// Helper functions for persistent storage
const STORAGE_KEY = 'altafawuq_teacher_courses_v2';

export function getTeacherCourses(): TeacherCourse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse teacher courses from localStorage:', e);
  }
  // Store default seed on first load
  saveTeacherCourses(INITIAL_TEACHER_COURSES);
  return INITIAL_TEACHER_COURSES;
}

export function saveTeacherCourses(courses: TeacherCourse[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    // Trigger custom event so other components immediately update
    window.dispatchEvent(new CustomEvent('altafawuq_courses_updated', { detail: courses }));
  } catch (e) {
    console.error('Failed to save teacher courses to localStorage:', e);
  }
}

export function saveSingleCourse(course: TeacherCourse): void {
  const courses = getTeacherCourses();
  const index = courses.findIndex(c => c.id === course.id);
  let updated: TeacherCourse[];
  if (index >= 0) {
    updated = [...courses];
    updated[index] = { ...course, updatedAt: new Date().toISOString().slice(0, 10) };
  } else {
    updated = [{ ...course, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) }, ...courses];
  }
  saveTeacherCourses(updated);
}

export function deleteTeacherCourse(courseId: string): void {
  const courses = getTeacherCourses();
  const updated = courses.filter(c => c.id !== courseId);
  saveTeacherCourses(updated);
}

export function toggleCoursePublishStatus(courseId: string): boolean {
  const courses = getTeacherCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return false;
  course.status = course.status === 'published' ? 'draft' : 'published';
  course.updatedAt = new Date().toISOString().slice(0, 10);
  saveTeacherCourses(courses);
  return course.status === 'published';
}
