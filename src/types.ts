import { WhiteboardTheme, WhiteboardBackgroundType } from './types/whiteboard';
import { FinancialCategory, FinancialCategoryScope, FinancialCategoryColor, DEFAULT_FINANCIAL_CATEGORIES } from './types/financialCategories';

export * from './types/financialCategories';

export enum StudentStatus {
  Unassigned = "Unassigned", // غير منسّب
  Assigned = "Assigned",     // منسّب
  OnHold = "OnHold",         // معلّق
  Pending = "Pending"        // قيد الانتظار - تسجيل جديد
}

export interface LessonBooking {
  id: string;
  date: string;
  courseTitle: string;
  cost: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  academicLevel: string;
  registrationDate: string;
  status: StudentStatus;
  assignedCourseId?: string;
  notes?: string;
  gender: 'Male' | 'Female';
  balance: number;          // المبلغ المالي للرصيد بالشيكل (₪)
  isOpenBalance: boolean;   // خيار الرصيد المفتوح (يسمح بالرصيد السالب ودفع لاحق)
  bookings?: LessonBooking[]; // سجل الحصص المحجوزة للطلب
  
  // Extra properties used in firebase-integrated modules
  grade?: string;
  teachers?: string[];
  customRates?: Record<string, number>;
  lowBalanceThreshold?: number;
  maxDebtLimit?: number; // سقف أو حد الدين المسموح به للطالب بالشيكل (₪)
  hourlyRate?: number;
  // 40-minute session rates:
  sessionRate?: number;
  sessionPayoutTeacher?: number;
  middleSchoolSessionRate?: number;
  secondarySchoolSessionRate?: number;
  middleSchoolTeacherSessionPayout?: number;
  secondarySchoolTeacherSessionPayout?: number;
  preferredPricingUnit?: 'hourly' | 'session_40';
  sessionSystem?: 'hours' | 'session_40';
  defaultSessionDurationMinutes?: number; // 60 (default) or 30 in hourly system, or 40 in 40-minute system
  academicStage?: 'basic' | 'middle' | 'secondary' | string; // 3 مراحل: أساسي، إعدادي، ثانوي
  archived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  restoredAt?: string;
  targetSessions?: number;
  academicStatus?: 'Active' | 'Paused' | 'Graduated';
  courseType?: 'individual' | 'group' | string;
  courseTypeLabel?: string;
}

export enum CourseStatus {
  Upcoming = "Upcoming",
  Active = "Active",
  Finished = "Finished"
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  password?: string;
  billingRate?: number;
  hourlyRate?: number;
  subjects?: string[];
  status?: string;
  payoutRate?: number;
  contact?: string;
  specialization?: string;
  academicRating?: number;
  tasksEnabled?: boolean;
  whiteboardTheme?: WhiteboardTheme;
  whiteboardDefaultBackground?: WhiteboardBackgroundType;
  // 40-minute session rates and payouts:
  primarySchoolSessionRate?: number;
  primarySchoolSessionPayout?: number;
  middleSchoolSessionPayout?: number;
  secondarySchoolSessionPayout?: number;
  sessionRate?: number;
  sessionPayoutRate?: number;
  preferredPricingUnit?: 'hourly' | 'session_40';
  sessionSystem?: 'hourly' | 'session_40';
  defaultSessionDurationMinutes?: number;
}

export interface Session {
  id: string;
  studentId: string;
  teacherId: string;
  customFee?: number;
  durationHours: number;
  date?: string;
  courseCode?: string;
  notes?: string;
  topic?: string;
  feedback?: string;
  customPayout?: number;
  subject?: string;
  startTime?: string;
  teacherConfirmed?: boolean;
  approved?: boolean;
  status?: 'booked' | 'pending_approval' | 'completed' | 'cancelled';
  isGroupSession?: boolean;
  groupId?: string;
  archived?: boolean;
  // 40-Minute Session vs Hourly System:
  pricingUnit?: 'hourly' | 'session_40';
  sessionCount?: number;
  academicStage?: 'middle' | 'secondary' | 'primary' | 'university' | 'other' | string;
  financialCategory?: string;
  financialCategoryId?: string;
}

export interface StudentCredit {
  id: string;
  studentId: string;
  amount: number;
  date?: string;
  method?: string;
  paymentMethod?: string;
  serviceName?: string;
  reference?: string;
  note?: string;
  financialCategory?: string;
  financialCategoryId?: string;
  isAdjustment?: boolean;       // حركة تعديل رصيد مالي من إدارة المنصة
  hideInStatement?: boolean;    // إخفاء حركة التعديل من كشف الحساب الموجه لولي الأمر
}

export interface Payment {
  id: string;
  teacherId?: string;
  amount?: number;
  date?: string;
  reference?: string;
  note?: string;
  archived?: boolean;
}

export interface Settings {
  id?: string;
  lowBalanceThreshold?: number;
  allowedSubjects?: string[];
  hourlyRateOptions?: number[];
  defaultHourlyRate?: number;
  defaultStudentHourlyRate?: number;
  defaultTeacherHourlyRate?: number;
  // Stage-based hourly rates for students (Secondary: 60 NIS, Middle: 50 NIS):
  defaultSecondaryStudentHourlyRate?: number;
  defaultMiddleStudentHourlyRate?: number;
  defaultPrimaryStudentHourlyRate?: number;
  // 40-Minute Session Pricing System for Middle & Secondary Stages:
  sessionPricingSystemEnabled?: boolean;
  middleSchoolStudentSessionRate?: number;
  middleSchoolTeacherSessionRate?: number;
  secondarySchoolStudentSessionRate?: number;
  secondarySchoolTeacherSessionRate?: number;
  sessionDurationMinutes?: number;
  defaultPricingProgram?: 'hourly' | 'session_40';
  programSelectionManagerOnly?: boolean;
  subjects?: string[];
  financialCategories?: FinancialCategory[];
  financialRules?: any[];
  customReportPeriods?: any[];
  academicAIEnabled?: boolean;
  whiteboardEnabled?: boolean;
  whiteboardTheme?: WhiteboardTheme;
  whiteboardDefaultBackground?: WhiteboardBackgroundType;
  autoBackupEnabled?: boolean;
  lastAutoBackupDate?: string;
  autoArchiveOldSessionsEnabled?: boolean;
  lastAutoArchiveDate?: string;
  // Automated WhatsApp Financial Reminders for low balance:
  autoWhatsAppLowBalanceReminderEnabled?: boolean;
  autoWhatsAppTemplate?: string;
  defaultWhatsAppReminderTemplate?: string;
  autoWhatsAppReminderCooldownDays?: number;
  autoWhatsAppTargetAudience?: 'all' | 'individual_only' | 'open_balance_only';
  lastAutoWhatsAppRunDate?: string;
  // Registration form branding & identity customizer:
  registrationButtonColor?: string;
  registrationButtonTextColor?: string;
  registrationCustomLogo?: string;
  registrationButtonText?: string;
  registrationCardTitle?: string;
  registrationSubtitle?: string;
  academyName?: string;
  academySlogan?: string;
  curriculumSourceMappings?: CurriculumSourceMapping[];
  [key: string]: any;
}

export interface CurriculumSourceMapping {
  id: string;
  subject: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDescription?: string;
  bagrutModels?: string[];
  approvedKeyTopics?: string[];
  strictness: 'exclusive' | 'preferred' | 'optional';
  isPrimaryApprovedSource?: boolean;
  targetGradeLevel?: string;
  academicDifficultyRating?: 'beginner' | 'advanced' | 'intermediate';
  metadata?: {
    targetGradeLevel?: string;
    academicDifficultyRating?: 'beginner' | 'advanced' | 'intermediate';
    [key: string]: any;
  };
  isActive: boolean;
  lastUpdated?: string;
}

export const DEFAULT_CURRICULUM_SOURCE_MAPPINGS: CurriculumSourceMapping[] = [
  {
    id: 'chem-vebschool',
    subject: 'الكيمياء',
    sourceUrl: 'https://www.vebschoolchemistry.com/',
    sourceTitle: 'بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (VebSchool Chemistry)',
    sourceDescription: 'المرجع الرقمي الحصري والمباشر لمناهج الكيمياء، نماذج بجروت، اختبارات تفاعلية، تصنيف بلوم للمخرجات، ومسابقات التميز الأكاديمي.',
    bagrutModels: ['037381 (الكيمياء الموسعة 3 وحدات أساسية)', '037387 (مختبر التقصي وبحث الكيمياء 2 وحدات)'],
    approvedKeyTopics: [
      'مقدمة إلى بنية المادة والروابط الكيميائية والقوى بين الجزيئية',
      'الحسابات الكيميائية (Stoichiometry) وحالات المادة والغازات',
      'الأكسدة والاختزال والخلايا الجلفانية والتحليل الكهربائي',
      'الأحماض والقواعد ومحاليل الاتزان الأيوني والرقم الهيدروجيني',
      'الكيمياء الحيوية وغذاء الإنسان (الدهنيات والسكريات والبروتينات)',
      'الإنتروبيا والطاقة الحرة وسرعة التفاعلات الكيميائية والاتزان الديناميكي',
      'تجارب الاستقصاء العلمي والمهارات المخبرية ومعايير السلامة'
    ],
    strictness: 'exclusive',
    isPrimaryApprovedSource: true,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  },
  {
    id: 'math-bagrut',
    subject: 'الرياضيات',
    sourceUrl: 'https://meyda.education.gov.il/sheeloney_bagrut/',
    sourceTitle: 'مستودع نماذج امتحانات البجروت الرسمية للرياضيات (3، 4، 5 وحدات)',
    sourceDescription: 'بنوك أسئلة رسمية، مقاييس التقييم، وتوزيع الدرجات لمستويات 4 و 5 وحدات تعليمية.',
    bagrutModels: ['035581 (5 وحدات نموذج أول)', '035582 (5 وحدات نموذج ثان)', '035481 (4 وحدات نموذج أول)', '035482 (4 وحدات نموذج ثان)'],
    approvedKeyTopics: [
      'حساب التفاضل والتكامل للدوال النسبية والجذرية والمثلثية',
      'الهندسة المستوية والإقليدية والدائرة ومبرهنات التشابه',
      'المتجهات الجبرية والهندسية وحساب المثلثات في الفضاء',
      'الأعداد المركبة والدوال الأسية واللوغاريتمية ونماذج التزايد والتضاؤل'
    ],
    strictness: 'preferred',
    isPrimaryApprovedSource: false,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  },
  {
    id: 'physics-portal',
    subject: 'الفيزياء',
    sourceUrl: 'https://phet.colorado.edu/ar_SA/',
    sourceTitle: 'بوابة محاكاة الفيزياء التفاعلية ومناهج البجروت المعتمدة',
    sourceDescription: 'محاكاة تفاعلية للتجارب الفيزيائية، الميكانيكا، الكهرومغناطيسية، والفيزياء الحديثة وفق المعايير الوزارية.',
    bagrutModels: ['036361 (الميكانيكا الكلاسيكية)', '036371 (الكهرباء والمغناطيسية)', '036381 (الفيزياء الإشعاعية والكمية)'],
    approvedKeyTopics: [
      'قوانين نيوتن وحركة الأجسام في بعدين والمقذوفات',
      'الكهرباء الساكنة وقانون كولوم والدوائر الكهربائية والتيار المستمر',
      'المجالات المغناطيسية وقوة لورنتز والحث الكهرومغناطيسي وفاراداي',
      'البصريات الموجية والظاهرة الكهروضوئية وميكانيكا الكم'
    ],
    strictness: 'preferred',
    isPrimaryApprovedSource: false,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  },
  {
    id: 'biology-portal',
    subject: 'الأحياء والبيولوجيا',
    sourceUrl: 'https://www.bioteach.org.il/',
    sourceTitle: 'مجتمع معلمي ومناهج علم الأحياء والبجروت',
    sourceDescription: 'منهاج البيولوجيا للثانوية العامة، أبحاث بيوتوب، وأسئلة مستويات التفكير العليا.',
    bagrutModels: ['043381 (النظرية العامة وعلم البيئة)', '043387 (مختبر التقصي في الأحياء والبيوتوب)'],
    approvedKeyTopics: [
      'الخلية: المبنى والوظيفة وعمليات الأيض والإنزيمات والتمثيل الضوئي',
      'جسم الإنسان والاتزان البدني (الجهاز الدوري، المناعي، والتنفسي)',
      'علم البيئة والعلاقات المتبادلة وتدفق الطاقة في الأنظمة الحيوية',
      'الوراثة المندلية والجزيئية والجينات والتقنيات الحيوية الحديثة'
    ],
    strictness: 'preferred',
    isPrimaryApprovedSource: false,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  },
  {
    id: 'arabic-lit',
    subject: 'اللغة العربية والأدب',
    sourceUrl: 'https://meyda.education.gov.il/sheeloney_bagrut/',
    sourceTitle: 'مناهج ونماذج بجروت اللغة العربية والبلاغة وقواعد النحو',
    sourceDescription: 'النصوص الأدبية المقررة، القواعد الصرفية والنحوية، وفنون البلاغة والتعبير الكتابي.',
    bagrutModels: ['020381 (الأدب واللغة 3 وحدات)', '020581 (الأدب العربي الموسّع 5 وحدات)'],
    approvedKeyTopics: [
      'دراسة وتحليل النصوص الشعرية والنثرية المقررة عبر العصور',
      'قواعد الإعراب والأساليب النحوية (المفاعيل، المشتقات، والنداء)',
      'فنون البلاغة العربية (التشبيه، الاستعارة، الكناية، والمحسنات)',
      'مهارات الفهم والتحليل النقدي والتعبير الكتابي الإبداعي والوظيفي'
    ],
    strictness: 'preferred',
    isPrimaryApprovedSource: false,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  },
  {
    id: 'english-bagrut',
    subject: 'اللغة الإنجليزية',
    sourceUrl: 'https://meyda.education.gov.il/sheeloney_bagrut/',
    sourceTitle: 'Bagrut English Curriculum Framework (Modules A-G)',
    sourceDescription: 'Official English Bagrut modules, literature programs (HOTs), and reading comprehension standards.',
    bagrutModels: ['Module C (016104)', 'Module D (016105)', 'Module E (016106)', 'Module F (016116)', 'Module G (016108)'],
    approvedKeyTopics: [
      'Advanced Reading Comprehension & Complex Text Analysis',
      'Higher-Order Thinking Skills (HOTS) in Literature & Poetry',
      'Formal & Opinion Essay Writing Competencies',
      'Listening Comprehension & Lexical Band Enhancement'
    ],
    strictness: 'preferred',
    isPrimaryApprovedSource: false,
    isActive: true,
    lastUpdated: '2026-03-30T00:00:00.000Z'
  }
];

export interface ScheduledWhatsAppReminder {
  id: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  scheduledAt: string; // ISO 8601 string or combined timestamp e.g. 2026-09-10T14:30
  targetMode: 'over_debt_limit' | 'negative' | 'critical' | 'all_debtors' | 'custom';
  selectedStudentIds?: string[];
  messageTemplate: string;
  repeatInterval: 'once' | 'daily' | 'weekly' | 'monthly';
  autoSend: boolean;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy?: string;
  executedAt?: string;
  recipientsCount?: number;
  lastRunDetails?: {
    totalTargeted: number;
    sentCount: number;
    skippedCount: number;
    executedAt: string;
    studentNames?: string[];
  };
}

export interface Task {
  id: string;
  title?: string;
  studentId?: string;
  teacherId?: string;
  dueDate?: string;
  status?: string;
  assignedTo?: string;
  [key: string]: any;
}

export interface GroupCourse {
  id: string;
  code: string;
  title: string;
  level: string;
  instructor: string;
  maxStudents: number;
  completedHours: number;
  totalHours: number;
  status: CourseStatus;
  startDate: string;
  classTime: string;
  
  // Extra fields used in some tracking and rendering
  name?: string;
  subject?: string;
  teacherId?: string;
  studentIds?: string[];
  studentBillingType?: string;
  studentRate?: number;
  teacherPayoutType?: string;
  teacherRate?: number;
  loggedHours?: number;
  studentHoursAllocated?: Record<string, number>;
}

export interface TrialLesson {
  id: string;
  studentName: string;
  grade: string;
  subject: string;
  topic: string;
  phone: string;
  teacherId: string;
  teacherName: string;
  scheduledTime?: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface Expense {
  id: string;
  category: 'electricity' | 'rent' | 'salaries' | 'bills' | 'stationery' | 'marketing' | 'maintenance' | 'hospitality' | 'software' | 'funding' | 'other' | string;
  amount: number;
  date: string;
  title?: string;
  note?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'electronic_wallet' | 'other' | string;
  invoiceRef?: string;
  paidTo?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  defaultTitle?: string;
  description?: string;
  createdAt?: string;
  createdBy?: string;
  isCustom?: boolean;
}

export function formatCustomDate(dateVal: any): string {
  if (!dateVal) return '';
  try {
    if (typeof dateVal === 'string') {
      const match = dateVal.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return `${day}-${month}-${year}`;
      }
      if (dateVal.includes('T')) {
        const datePart = dateVal.split('T')[0];
        const matchIso = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (matchIso) {
          const year = parseInt(matchIso[1], 10);
          const month = parseInt(matchIso[2], 10);
          const day = parseInt(matchIso[3], 10);
          return `${day}-${month}-${year}`;
        }
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return String(dateVal);
    }
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * Helper: Identify if a session is a trial session.
 * Trial sessions do NOT deduct from student balance and do NOT add to teacher payouts.
 */
export function isTrialSession(session: any): boolean {
  if (!session) return false;
  if (session.isTrial || session.isTrialSession || session.sessionType === 'trial') return true;
  const checkStr = (str?: any) => typeof str === 'string' && str.includes('تجريب');
  return (
    checkStr(session.notes) ||
    checkStr(session.subject) ||
    checkStr(session.topic) ||
    checkStr(session.title) ||
    checkStr(session.courseTitle) ||
    checkStr(session.note)
  );
}

/**
 * Resolves the effective hourly payout rate for a teacher on a session or assignment.
 * Priority:
 * 1. Assignment custom teacherPayoutRate (if > 0)
 * 2. Teacher's payoutRate (if > 0)
 * 3. Teacher's hourlyRate (if > 0)
 * 4. Global default teacher hourly rate (defaults to 35)
 */
export function getTeacherHourlyPayoutRate(
  teacher?: { payoutRate?: number; hourlyRate?: number } | null,
  sessionAssignment?: { teacherPayoutRate?: number } | null,
  defaultRate: number = 35
): number {
  if (
    sessionAssignment &&
    sessionAssignment.teacherPayoutRate !== undefined &&
    sessionAssignment.teacherPayoutRate !== null &&
    Number(sessionAssignment.teacherPayoutRate) > 0
  ) {
    return Number(sessionAssignment.teacherPayoutRate);
  }
  if (
    teacher &&
    teacher.payoutRate !== undefined &&
    teacher.payoutRate !== null &&
    Number(teacher.payoutRate) > 0
  ) {
    return Number(teacher.payoutRate);
  }
  if (
    teacher &&
    teacher.hourlyRate !== undefined &&
    teacher.hourlyRate !== null &&
    Number(teacher.hourlyRate) > 0
  ) {
    return Number(teacher.hourlyRate);
  }
  return defaultRate;
}

/**
 * Calculates the exact compensation/payout for a teacher for a given session.
 * Fully aligned with TeacherDashboard calculation rules:
 * 1. Trial sessions (isTrialSession): always 0 ₪.
 * 2. Explicit custom payout on session: customPayout or customTeacherFee.
 * 3. Otherwise: (Number(session.durationHours) || 0) * effective teacher hourly payout rate.
 */
export function calculateTeacherSessionPayout(
  session: any,
  teacher?: { payoutRate?: number; hourlyRate?: number } | null,
  assignments?: Array<{ studentId: string; teacherId: string; teacherPayoutRate?: number }> | null,
  defaultRate: number = 35
): number {
  if (!session) return 0;
  if (isTrialSession(session)) return 0;

  const assignment = assignments?.find(
    a => a.studentId === session.studentId && a.teacherId === session.teacherId
  );
  const rate = getTeacherHourlyPayoutRate(teacher, assignment, defaultRate);
  const hours = Number(session.durationHours) || 0;

  // If session is explicitly 40-minute unit system:
  if (session.pricingUnit === 'session_40') {
    if (session.customPayout !== undefined && session.customPayout !== null) {
      return Number(session.customPayout);
    }
    if (session.customTeacherFee !== undefined && session.customTeacherFee !== null) {
      return Number(session.customTeacherFee);
    }
  }

  // For hourly sessions or standard duration sessions, guarantee exact hours * hourly rate match
  if (hours > 0) {
    return hours * rate;
  }

  if (session.customPayout !== undefined && session.customPayout !== null) {
    return Number(session.customPayout);
  }
  if (session.customTeacherFee !== undefined && session.customTeacherFee !== null) {
    return Number(session.customTeacherFee);
  }

  return hours * rate;
}

