import { Settings, Student, Teacher, Session, isTrialSession } from '../types';

export type AcademicStage = 'middle' | 'secondary' | 'primary' | 'university' | 'other';

export const DEFAULT_STAGE_PRICING = {
  // 40-Minute Session Pricing System:
  middleSchoolStudentSessionRate: 40,
  middleSchoolTeacherSessionRate: 25,
  secondarySchoolStudentSessionRate: 50,
  secondarySchoolTeacherSessionRate: 35,
  sessionDurationMinutes: 40,
  // 60-Minute Hourly System:
  // سعر الساعة التلقائي: المرحلة الثانوية 60 شيكل، والمرحلة الإعدادية 50 شيكل (إلا إذا تم تغييره من مدير المنصة)
  secondarySchoolStudentHourlyRate: 60,
  middleSchoolStudentHourlyRate: 50,
  primarySchoolStudentHourlyRate: 50,
  defaultStudentHourlyRate: 60,
  defaultTeacherHourlyRate: 35,
};

export const normalizeArabicText = (text: string = ''): string => {
  return (text || '')
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .trim();
};

/**
 * Detects whether a student grade/level belongs to:
 * - 'middle': المرحلة الإعدادية (الصفوف 7، 8، 9 / سابع، ثامن، تاسع / إعدادي / متوسط)
 * - 'secondary': المرحلة الثانوية (الصفوف 10، 11، 12 / عاشر، أول ثانوي، حادي عشر، ثاني عشر، توجيهي، بجروت، بكالوريا)
 * - 'primary': المرحلة الابتدائية (الصفوف 1 - 6)
 * - 'university': جامعي
 * - 'other': غير محدد أو عام
 */
export function getAcademicStage(gradeOrLevel: string = ''): AcademicStage {
  const norm = normalizeArabicText(gradeOrLevel);
  if (!norm) return 'other';

  // Secondary / High School (includes Tawjihi, Bagrut, 10th, 11th, 12th)
  if (
    norm.includes('توجيهي') ||
    norm.includes('ثانويه عامه') ||
    norm.includes('بجروت') ||
    norm.includes('12') ||
    norm.includes('ثاني عشر') ||
    norm.includes('بكالوريا') ||
    norm.includes('علمي') ||
    norm.includes('ادبي') ||
    norm.includes('صناعي') ||
    norm.includes('رياده') ||
    norm.includes('عاشر') ||
    norm.includes('اول ثانوي') ||
    norm.includes('10') ||
    norm.includes('11') ||
    norm.includes('حادي عشر') ||
    norm.includes('ثانوي')
  ) {
    return 'secondary';
  }

  // Middle School (7th, 8th, 9th)
  if (
    norm.includes('سابع') ||
    norm.includes('ثامن') ||
    norm.includes('تاسع') ||
    norm.includes('7') ||
    norm.includes('8') ||
    norm.includes('9') ||
    norm.includes('اعدادي') ||
    norm.includes('متوسط')
  ) {
    return 'middle';
  }

  // Primary
  if (
    norm.includes('اول') ||
    norm.includes('ثاني') ||
    norm.includes('ثالث') ||
    norm.includes('رابع') ||
    norm.includes('خامس') ||
    norm.includes('سادس') ||
    norm.includes('1') ||
    norm.includes('2') ||
    norm.includes('3') ||
    norm.includes('4') ||
    norm.includes('5') ||
    norm.includes('6') ||
    norm.includes('ابتدائي') ||
    norm.includes('اساسي')
  ) {
    return 'primary';
  }

  if (norm.includes('جامع') || norm.includes('كليه') || norm.includes('دبلوم') || norm.includes('بكالوريوس')) {
    return 'university';
  }

  return 'other';
}

export function getAcademicStageBadge(stage: AcademicStage): { 
  label: string; 
  shortLabel: string; 
  color: string; 
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (stage) {
    case 'middle':
      return { 
        label: 'المرحلة الإعدادية (الصفوف 7 - 9)', 
        shortLabel: 'إعدادي', 
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
        icon: '🌱',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-200'
      };
    case 'secondary':
      return { 
        label: 'المرحلة الثانوية (الصفوف 10 - 12)', 
        shortLabel: 'ثانوي', 
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200', 
        icon: '🎓',
        badgeBg: 'bg-indigo-500/10',
        badgeText: 'text-indigo-700',
        badgeBorder: 'border-indigo-200'
      };
    case 'primary':
      return { 
        label: 'المرحلة الابتدائية (الصفوف 1 - 6)', 
        shortLabel: 'ابتدائي', 
        color: 'bg-amber-50 text-amber-800 border-amber-200', 
        icon: '✏️',
        badgeBg: 'bg-amber-500/10',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200'
      };
    case 'university':
      return { 
        label: 'المرحلة الجامعية', 
        shortLabel: 'جامعي', 
        color: 'bg-purple-50 text-purple-800 border-purple-200', 
        icon: '🏛️',
        badgeBg: 'bg-purple-500/10',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200'
      };
    default:
      return { 
        label: 'مرحلة عامة / غير محدد', 
        shortLabel: 'عام', 
        color: 'bg-slate-50 text-slate-700 border-slate-200', 
        icon: '📚',
        badgeBg: 'bg-slate-500/10',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200'
      };
  }
}

export interface SessionPricingCalculationParams {
  pricingUnit: 'hourly' | 'session_40';
  sessionCount?: number; // For 40-min sessions: 1, 2, 3...
  durationHours?: number; // For hourly sessions: 1, 1.5, 2...
  student?: Partial<Student> | null;
  teacher?: Partial<Teacher> | null;
  settings?: Partial<Settings> | null;
  manualCustomFee?: number | string;
  manualCustomPayout?: number | string;
}

export interface SessionPricingResult {
  pricingUnit: 'hourly' | 'session_40';
  durationHours: number;
  durationMinutes: number;
  stage: AcademicStage;
  stageBadge: ReturnType<typeof getAcademicStageBadge>;
  studentRatePerUnit: number;
  teacherPayoutPerUnit: number;
  totalStudentCost: number;
  totalTeacherPayout: number;
  unitLabel: string;
  summaryText: string;
}

/**
 * Robust calculator for 40-minute period vs 60-minute hourly sessions
 */
export function calculateSessionPricing({
  pricingUnit,
  sessionCount = 1,
  durationHours = 1,
  student,
  teacher,
  settings,
  manualCustomFee,
  manualCustomPayout,
}: SessionPricingCalculationParams): SessionPricingResult {
  const studentGradeStr = student?.grade || student?.academicLevel || '';
  const stage = getAcademicStage(studentGradeStr);
  const stageBadge = getAcademicStageBadge(stage);

  if (pricingUnit === 'session_40') {
    const validSessionCount = Math.max(0.5, Number(sessionCount) || 1);
    const sessionDurationMinutes = settings?.sessionDurationMinutes ?? DEFAULT_STAGE_PRICING.sessionDurationMinutes; // 40
    const totalMinutes = Math.round(validSessionCount * sessionDurationMinutes);
    const computedHours = Number((totalMinutes / 60).toFixed(2));

    // Student rate per 40-minute session
    let studentRatePerUnit = 0;
    if (teacher?.id && student?.customRates?.[teacher.id] !== undefined && Number(student.customRates[teacher.id]) > 0) {
      studentRatePerUnit = Number(student.customRates[teacher.id]);
    } else if (student?.sessionRate !== undefined && student?.sessionRate !== null && Number(student.sessionRate) > 0) {
      studentRatePerUnit = Number(student.sessionRate);
    } else if (stage === 'middle') {
      studentRatePerUnit = student?.middleSchoolSessionRate ?? settings?.middleSchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate;
    } else if (stage === 'secondary') {
      studentRatePerUnit = student?.secondarySchoolSessionRate ?? settings?.secondarySchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate;
    } else {
      // Fallback for primary/other using hourly rate scaled to 40 mins
      const baseHourly = student?.hourlyRate || teacher?.billingRate || settings?.defaultStudentHourlyRate || 60;
      studentRatePerUnit = Math.round((baseHourly * 40) / 60);
    }

    // Teacher payout per 40-minute session
    let teacherPayoutPerUnit = 0;
    if (teacher?.id && (student as any)?.customPayoutRates?.[teacher.id] !== undefined && Number((student as any).customPayoutRates[teacher.id]) > 0) {
      teacherPayoutPerUnit = Number((student as any).customPayoutRates[teacher.id]);
    } else if (student?.sessionPayoutTeacher !== undefined && student?.sessionPayoutTeacher !== null && Number(student.sessionPayoutTeacher) > 0) {
      teacherPayoutPerUnit = Number(student.sessionPayoutTeacher);
    } else if (stage === 'middle') {
      teacherPayoutPerUnit = teacher?.middleSchoolSessionPayout ?? settings?.middleSchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolTeacherSessionRate;
    } else if (stage === 'secondary') {
      teacherPayoutPerUnit = teacher?.secondarySchoolSessionPayout ?? settings?.secondarySchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolTeacherSessionRate;
    } else {
      const baseTeacherHourly = teacher?.payoutRate || teacher?.hourlyRate || settings?.defaultTeacherHourlyRate || 35;
      teacherPayoutPerUnit = Math.round((baseTeacherHourly * 40) / 60);
    }

    const defaultStudentCost = studentRatePerUnit * validSessionCount;
    const defaultTeacherPayout = teacherPayoutPerUnit * validSessionCount;

    const totalStudentCost = manualCustomFee !== undefined && manualCustomFee !== '' && !isNaN(Number(manualCustomFee))
      ? Number(manualCustomFee)
      : defaultStudentCost;

    const totalTeacherPayout = manualCustomPayout !== undefined && manualCustomPayout !== '' && !isNaN(Number(manualCustomPayout))
      ? Number(manualCustomPayout)
      : defaultTeacherPayout;

    const unitLabel = validSessionCount === 1 ? 'حصة (40 دقيقة)' : validSessionCount === 2 ? 'حصتان (80 دقيقة)' : `${validSessionCount} حصص (${totalMinutes} دقيقة)`;
    const summaryText = `نظام الحصص: ${unitLabel} للمرحلة ${stageBadge.shortLabel} (سعر الطالب: ₪${totalStudentCost} / أجر المعلم: ₪${totalTeacherPayout})`;

    return {
      pricingUnit: 'session_40',
      durationHours: computedHours,
      durationMinutes: totalMinutes,
      stage,
      stageBadge,
      studentRatePerUnit,
      teacherPayoutPerUnit,
      totalStudentCost,
      totalTeacherPayout,
      unitLabel,
      summaryText,
    };
  }

  // Hourly pricing logic
  const validHours = Math.max(0.25, Number(durationHours) || 1);
  const totalMinutes = Math.round(validHours * 60);

  const studentHourly = getStudentDefaultHourlyRate(student, settings, teacher);
  const teacherHourly = teacher?.hourlyRate || teacher?.payoutRate || settings?.defaultTeacherHourlyRate || 35;

  const defaultStudentCost = Math.round(studentHourly * validHours);
  const defaultTeacherPayout = Math.round(teacherHourly * validHours);

  const totalStudentCost = manualCustomFee !== undefined && manualCustomFee !== '' && !isNaN(Number(manualCustomFee))
    ? Number(manualCustomFee)
    : defaultStudentCost;

  const totalTeacherPayout = manualCustomPayout !== undefined && manualCustomPayout !== '' && !isNaN(Number(manualCustomPayout))
    ? Number(manualCustomPayout)
    : defaultTeacherPayout;

  const unitLabel = `${validHours} ساعة تدريسية`;
  const summaryText = `نظام الساعات: ${validHours} ساعة للمرحلة ${stageBadge.shortLabel} (سعر الطالب: ₪${totalStudentCost} / أجر المعلم: ₪${totalTeacherPayout})`;

  return {
    pricingUnit: 'hourly',
    durationHours: validHours,
    durationMinutes: totalMinutes,
    stage,
    stageBadge,
    studentRatePerUnit: studentHourly,
    teacherPayoutPerUnit: teacherHourly,
    totalStudentCost,
    totalTeacherPayout,
    unitLabel,
    summaryText,
  };
}

/**
 * Resolves the student's hourly rate automatically based on academic stage:
 * - Secondary (المرحلة الثانوية والتوجيهي): 60 NIS (default) or platform manager setting
 * - Middle (المرحلة الإعدادية): 50 NIS (default) or platform manager setting
 * - Primary / Basic (المرحلة الأساسية): 50 NIS (default) or platform manager setting
 * - Respects manager customization: If the platform manager has set a specific custom rate
 *   on the student (student.hourlyRate > 0) or per-teacher (student.customRates), that custom rate is used.
 */
export function getStudentDefaultHourlyRate(
  student?: Partial<Student> | null,
  settings?: Partial<Settings> | null,
  teacher?: Partial<Teacher> | null
): number {
  // 1. Specific custom rate for this teacher set by platform manager:
  if (teacher?.id && student?.customRates?.[teacher.id] !== undefined && Number(student.customRates[teacher.id]) > 0) {
    return Number(student.customRates[teacher.id]);
  }

  // 2. Specific custom hourly rate set by platform manager on student profile:
  if (student?.hourlyRate !== undefined && student?.hourlyRate !== null && Number(student.hourlyRate) > 0) {
    return Number(student.hourlyRate);
  }

  // 3. Automatic stage-based hourly rate (سعر الساعة تلقائياً حسب المرحلة):
  const gradeStr = student?.grade || student?.academicLevel || (student as any)?.academicStage || '';
  const stage = getAcademicStage(gradeStr);

  if (stage === 'secondary') {
    return settings?.defaultSecondaryStudentHourlyRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentHourlyRate; // 60 NIS
  }

  if (stage === 'middle') {
    return settings?.defaultMiddleStudentHourlyRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentHourlyRate; // 50 NIS
  }

  if (stage === 'primary') {
    return settings?.defaultPrimaryStudentHourlyRate ?? settings?.defaultStudentHourlyRate ?? DEFAULT_STAGE_PRICING.primarySchoolStudentHourlyRate; // 50 NIS
  }

  // If teacher has a custom billingRate specifically configured:
  if (teacher?.billingRate && teacher.billingRate > 0) {
    return teacher.billingRate;
  }

  // Global platform fallback:
  return settings?.defaultStudentHourlyRate ?? settings?.defaultHourlyRate ?? DEFAULT_STAGE_PRICING.defaultStudentHourlyRate;
}

/**
 * Determines whether a grade should automatically use 40-minute sessions or hourly system:
 * - Grades 1 to 4 (من الصف الأول حتى الصف الرابع بما فيها التمهيدي/الروضة): 'session_40' (نظام الحصة 40 دقيقة)
 * - Grades 5 to 12 (الصفوف من الخامس حتى الثاني عشر شامل الإعدادي والثانوي والتوجيهي والبجروت): 'hourly' (نظام الساعة 60 دقيقة)
 */
export function getDefaultPricingUnitForGrade(gradeText: string = ''): 'session_40' | 'hourly' {
  if (!gradeText) return 'hourly';
  const clean = gradeText.trim();

  // 1. High school / Secondary (10th, 11th, 12th, Tawjihi, Bagrut, etc.):
  if (/حادي\s*عشر|ثاني\s*عشر|11|12|توجيهي|ثانوي|بجروت|عاشر|\b10\b/i.test(clean)) {
    return 'hourly';
  }

  // 2. Middle school (7th, 8th, 9th) and Upper Basic / Grades 5 & 6:
  if (/خامس|سادس|سابع|ثامن|تاسع|\b[5-9]\b|إعدادي|اعدادي|متوسط/i.test(clean)) {
    return 'hourly';
  }

  // 3. Early Basic grades 1 to 4 (and early childhood/kindergarten):
  if (/أول|اول|ثاني|ثالث|رابع|\b[1-4]\b|روضة|روضه|تمهيدي|بستان/i.test(clean)) {
    return 'session_40';
  }

  return 'hourly';
}

/**
 * Accurately calculates the monetary cost to be deducted from a student's balance for a session.
 * Protects against the bug where a teacher's payout rate (e.g. 35 NIS) or an erroneous 40-minute period fee
 * was mistakenly saved as customFee or used instead of the student's contractual hourly rate.
 */
export function getStudentSessionCost(
  session: Session | any,
  student?: Partial<Student> | null,
  teacher?: Partial<Teacher> | null,
  globalSettings?: any
): number {
  if (!session) return 0;
  if (isTrialSession(session)) return 0;

  if (session.isGroupSession || session.isGroup) {
    if (session.customFee !== undefined && !isNaN(Number(session.customFee)) && Number(session.customFee) > 0) {
      return Number(session.customFee);
    }
    return 0; // Standard group course sessions consume group course hours
  }

  const durationHours = Math.max(0.1, Number(session.durationHours) || 1);
  const studentHourlyRate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
  const teacherPayoutRate = teacher?.payoutRate || teacher?.hourlyRate || globalSettings?.defaultTeacherHourlyRate || 35;
  const stage = getAcademicStage(student?.grade || student?.academicLevel || (student as any)?.academicStage || session?.academicStage || '');
  const isExplicitSession40 = student?.preferredPricingUnit === 'session_40' || student?.sessionSystem === 'session_40';
  const isHourlySystem = isExplicitSession40 ? false : (student?.preferredPricingUnit === 'hourly' || student?.sessionSystem === 'hours' || stage === 'secondary' || stage === 'middle');

  // Protect against bug where session.customFee was mistakenly recorded:
  // 1. Equal to teacher wage/payout (e.g. 35 NIS or teacherPayoutRate)
  // 2. Erroneously assigned 40-min period rate (e.g. 35 or 33 NIS) for an hourly / middle-secondary student with a ~1-hour duration
  // 3. Mismatched from the student's contractual custom rate with this teacher
  const isBuggedFee = session.customFee !== undefined &&
    session.manualPriceRecalculated !== true &&
    (
      // Case A: Recorded fee matches teacher payout (teacher's wage mistakenly charged to student)
      Math.abs(Number(session.customFee) - (durationHours * teacherPayoutRate)) < 0.01 ||
      Math.abs(Number(session.customFee) - (durationHours * (globalSettings?.defaultTeacherHourlyRate || 35))) < 0.01 ||
      // Case B: Session was mislabeled as 40-min period (~35 or ~33 NIS) for an hourly middle/secondary student with >= 45 min duration
      (session.pricingUnit === 'session_40' && isHourlySystem && durationHours >= 0.75) ||
      // Case C: Explicit custom rate exists between student and this teacher, but session has an old contradictory fee equal to 35 or 33
      (student?.customRates?.[teacher?.id || ''] !== undefined && (Math.abs(Number(session.customFee) - 35) < 0.01 || Math.abs(Number(session.customFee) - 33) < 0.01) && studentHourlyRate > 35)
    ) &&
    Math.abs(studentHourlyRate * durationHours - Number(session.customFee)) > 1;

  if (session.customFee !== undefined && !isNaN(Number(session.customFee)) && Number(session.customFee) > 0 && !isBuggedFee) {
    return Number(session.customFee);
  }

  // 40-Minute Period Session System (only for students genuinely on 40-min system, e.g. Primary 1-4 or explicit session_40)
  if (session.pricingUnit === 'session_40' && !isHourlySystem) {
    const sessionCount = Number(session.sessionCount) || 1;
    let sessionRate = 40;
    if (teacher?.id && student?.customRates?.[teacher.id] !== undefined && Number(student.customRates[teacher.id]) > 0) {
      sessionRate = Number(student.customRates[teacher.id]);
    } else if (student?.sessionRate !== undefined && Number(student.sessionRate) > 0) {
      sessionRate = Number(student.sessionRate);
    } else if (stage === 'secondary') {
      sessionRate = globalSettings?.secondarySchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate ?? 50;
    } else if (stage === 'middle') {
      sessionRate = globalSettings?.middleSchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate ?? 40;
    } else {
      sessionRate = Math.round((studentHourlyRate * 40) / 60);
    }
    return Math.round(sessionCount * sessionRate * 100) / 100;
  }

  // Standard 60-Minute Hourly Session System
  return Math.round(durationHours * studentHourlyRate * 100) / 100;
}

