import { Student, Teacher, Session } from '../types';

export interface FinancialRule {
  id: string;
  name: string;
  type: 'teacher_bonus_hours' | 'teacher_bonus_students' | 'student_discount_enrollment' | 'student_discount_lessons';
  targetValue: number;      // e.g. 20 hours, 5 students, 90 days enrollment, 30 lessons
  rewardValue: number;      // e.g. 200₪, 10% discount
  rewardType: 'fixed' | 'percentage';
  isActive: boolean;
  description: string;
}

// 1. Calculate student discount for a specific session/rate
export function calculateStudentDiscount(
  student: Student,
  baseRate: number,
  rules: FinancialRule[],
  studentSessionsCount: number // Number of completed sessions for this student
): { discountAmount: number; appliedRules: string[] } {
  let discountAmount = 0;
  const appliedRules: string[] = [];

  const activeRules = (rules || []).filter(r => r.isActive);

  activeRules.forEach(rule => {
    // A. Long-term enrollment discount
    if (rule.type === 'student_discount_enrollment' && student.registrationDate) {
      try {
        const regDate = new Date(student.registrationDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - regDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= rule.targetValue) {
          const ruleDiscount = rule.rewardType === 'fixed' 
            ? rule.rewardValue 
            : baseRate * (rule.rewardValue / 100);
          discountAmount += ruleDiscount;
          appliedRules.push(`${rule.name} (خصم التسجيل لـ ${diffDays} يوماً: -₪${ruleDiscount.toFixed(1)})`);
        }
      } catch (e) {
        console.error("Error evaluating student_discount_enrollment rule:", e);
      }
    }

    // B. Completed lessons discount
    if (rule.type === 'student_discount_lessons') {
      if (studentSessionsCount >= rule.targetValue) {
        const ruleDiscount = rule.rewardType === 'fixed' 
          ? rule.rewardValue 
          : baseRate * (rule.rewardValue / 100);
        discountAmount += ruleDiscount;
        appliedRules.push(`${rule.name} (خصم إنجاز ${studentSessionsCount} حصص: -₪${ruleDiscount.toFixed(1)})`);
      }
    }
  });

  // Ensure discount doesn't exceed base rate
  if (discountAmount > baseRate) {
    discountAmount = baseRate;
  }

  return { discountAmount, appliedRules };
}

// 2. Calculate teacher bonuses for a teacher based on their metrics
export function calculateTeacherBonuses(
  teacher: Teacher,
  rules: FinancialRule[],
  teacherHours: number, // Total hours taught by this teacher in month/period
  teacherStudentsCount: number // Total unique students taught
): { bonusAmount: number; appliedRules: string[] } {
  let bonusAmount = 0;
  const appliedRules: string[] = [];

  const activeRules = (rules || []).filter(r => r.isActive);

  activeRules.forEach(rule => {
    // A. Monthly hours bonus
    if (rule.type === 'teacher_bonus_hours') {
      if (teacherHours >= rule.targetValue) {
        const ruleBonus = rule.rewardType === 'fixed'
          ? rule.rewardValue
          : (teacher.payoutRate || teacher.hourlyRate || 35) * teacherHours * (rule.rewardValue / 100);
        bonusAmount += ruleBonus;
        appliedRules.push(`${rule.name} (مكافأة ساعات التدريس ${teacherHours.toFixed(1)}/${rule.targetValue} ساعة: +₪${ruleBonus.toFixed(1)})`);
      }
    }

    // B. Active students bonus
    if (rule.type === 'teacher_bonus_students') {
      if (teacherStudentsCount >= rule.targetValue) {
        const ruleBonus = rule.rewardType === 'fixed'
          ? rule.rewardValue
          : (teacher.payoutRate || teacher.hourlyRate || 35) * teacherStudentsCount * (rule.rewardValue / 100);
        bonusAmount += ruleBonus;
        appliedRules.push(`${rule.name} (مكافأة الطلاب النشطين ${teacherStudentsCount}/${rule.targetValue} طالب: +₪${ruleBonus.toFixed(1)})`);
      }
    }
  });

  return { bonusAmount, appliedRules };
}
