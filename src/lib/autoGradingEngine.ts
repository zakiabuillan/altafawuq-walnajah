import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface GradeBand {
  min: number;
  max: number;
  label: string;
  color: string;
  badge: string;
  feedback: string;
}

export interface AutoGradingRule {
  id: string;
  name: string;
  description: string;
  subjectScope: 'all' | string;
  scoringModel: 'equal' | 'difficulty_weighted';
  maxScore: number;
  easyPoints: number;
  mediumPoints: number;
  hardPoints: number;
  penaltyPerWrongAnswer: number;
  allowNegativeTotal: boolean;
  bonusPoints: number;
  curvePercent: number;
  passThreshold: number;
  excellenceThreshold: number;
  allowRetakeBelow: number;
  gradeBands: GradeBand[];
  autoAlertStudent: boolean;
  autoAlertParent: boolean;
  notifyViaStudentPortal: boolean;
  notifyViaWhatsApp: boolean;
  whatsappTemplate: string;
  portalAlertTitle: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradedResultCalculation {
  score: number;
  rawScore: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalQuestions: number;
  penaltyDeducted: number;
  bonusAdded: number;
  curveAdded: number;
  passed: boolean;
  isExcellence: boolean;
  canRetake: boolean;
  gradeBand: GradeBand;
  feedbackNote: string;
  ruleApplied: {
    id: string;
    name: string;
  };
  questionBreakdown: Array<{
    qIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
  }>;
}

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  {
    min: 90,
    max: 100,
    label: 'ممتاز مع مرتبة الشرف 🏆',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badge: 'امتياز وتفوق استثنائي',
    feedback: 'أداء أكاديمي استثنائي ومتقن لكافة المفاهيم العلمية والتطبيقية، تهانينا على هذا التميز!'
  },
  {
    min: 80,
    max: 89,
    label: 'جيد جداً مرتفع 🌟',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badge: 'إتقان متقدم',
    feedback: 'مستوى ممتاز جداً واستيعاب رصين للمادة، مع إمكانية تحسين طفيفة في الأسئلة الدقيقة.'
  },
  {
    min: 65,
    max: 79,
    label: 'جيد 🟢',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    badge: 'اجتياز معتمد',
    feedback: 'أداء جيد وتجاوز لمعايير الاختبار الأساسية، يُوصى بمراجعة الأسئلة غير الموفقة لتعزيز الفهم.'
  },
  {
    min: 55,
    max: 64,
    label: 'مقبول / يحتاج دعم 🟡',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badge: 'حد الكفاية الأدنى',
    feedback: 'تم اجتياز الحد الأدنى بنجاح، يُرجى إعادة مراجعة شروحات المعلم والتركيز على المفاهيم المركزية.'
  },
  {
    min: 0,
    max: 54,
    label: 'دون المستوى المطلوب / إعادة 🔴',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badge: 'فرصة إعادة متاحة',
    feedback: 'لم يتم تحقيق درجة الاجتياز المطلوبة؛ ننصح بمراجعة المادة التعليمية فوراً وخوض الاختبار مرة أخرى.'
  }
];

export const INITIAL_AUTO_GRADING_RULES: AutoGradingRule[] = [
  {
    id: 'rule-standard-bagrut',
    name: 'القاعدة المعيارية المعتمدة (بجروت ومنهاج المعارف)',
    description: 'توزيع درجات متكافئ بنسبة 100%، بدون خصم أخطاء، نسبة النجاح 60% مع تنبيهات فورية للطالب وولي الأمر.',
    subjectScope: 'all',
    scoringModel: 'equal',
    maxScore: 100,
    easyPoints: 10,
    mediumPoints: 10,
    hardPoints: 10,
    penaltyPerWrongAnswer: 0,
    allowNegativeTotal: false,
    bonusPoints: 0,
    curvePercent: 0,
    passThreshold: 60,
    excellenceThreshold: 85,
    allowRetakeBelow: 55,
    gradeBands: DEFAULT_GRADE_BANDS,
    autoAlertStudent: true,
    autoAlertParent: true,
    notifyViaStudentPortal: true,
    notifyViaWhatsApp: true,
    whatsappTemplate: 'مرحباً {studentName}، نبارك لك إتمام اختبار "{examTitle}" في أكاديمية التفوق. درجتك المعتمدة هي {score}% ({gradeLabel}). للاطلاع على التقرير المفصل: {portalLink}',
    portalAlertTitle: '🎉 صدرت نتيجة اختبارك في {examTitle}',
    isDefault: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  },
  {
    id: 'rule-veb-chemistry',
    name: 'قاعدة كيمياء التفوق والمسابقات (VEB School Chemistry)',
    description: 'قاعدة مخصصة لاختبارات ومسابقات الكيمياء ونماذج بجروت 037381 و 037387 مع بونص تميز وتوثيق فوري.',
    subjectScope: 'كيمياء',
    scoringModel: 'equal',
    maxScore: 100,
    easyPoints: 10,
    mediumPoints: 10,
    hardPoints: 10,
    penaltyPerWrongAnswer: 0,
    allowNegativeTotal: false,
    bonusPoints: 2,
    curvePercent: 0,
    passThreshold: 65,
    excellenceThreshold: 88,
    allowRetakeBelow: 60,
    gradeBands: DEFAULT_GRADE_BANDS,
    autoAlertStudent: true,
    autoAlertParent: true,
    notifyViaStudentPortal: true,
    notifyViaWhatsApp: true,
    whatsappTemplate: '🧪 مرحباً {studentName}، تم تصحيح اختبار الكيمياء "{examTitle}" (مرجع VEB School Chemistry). حصلت على درجة {score}% ({gradeLabel}). فخورون بتفوقك العلمي في أكاديمية التفوق!',
    portalAlertTitle: '🧪 نتيجة اختبار الكيمياء المعتمد: {examTitle}',
    isDefault: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  },
  {
    id: 'rule-guess-penalty',
    name: 'قاعدة التقييم الدقيق ضد التخمين (خصم -0.25 للخطأ)',
    description: 'قاعدة محاكاة للاختبارات المعيارية والبسيخومتري، تخصم ربع درجة السؤال عند الخطأ للحد من التخمين العشوائي.',
    subjectScope: 'all',
    scoringModel: 'equal',
    maxScore: 100,
    easyPoints: 10,
    mediumPoints: 10,
    hardPoints: 10,
    penaltyPerWrongAnswer: 0.25,
    allowNegativeTotal: false,
    bonusPoints: 0,
    curvePercent: 0,
    passThreshold: 60,
    excellenceThreshold: 85,
    allowRetakeBelow: 50,
    gradeBands: DEFAULT_GRADE_BANDS,
    autoAlertStudent: true,
    autoAlertParent: true,
    notifyViaStudentPortal: true,
    notifyViaWhatsApp: true,
    whatsappTemplate: 'مرحباً {studentName}، تم رصد وتصحيح اختبارك "{examTitle}" وفق معيار التقييم الدقيق. درجتك الصافية هي {score}% ({gradeLabel}).',
    portalAlertTitle: '📊 التقييم المعياري الدقيق لاختبار {examTitle}',
    isDefault: false,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  },
  {
    id: 'rule-support-curve',
    name: 'قاعدة الدعم والرفع الأكاديمي (كيرف +5% تشجيعي)',
    description: 'قاعدة مخصصة للاختبارات التشخيصية والتأسيسية الصعبة مع كيرف تصحيحي بنسبة +5% لرفع المعنويات وتحفيز الطلاب.',
    subjectScope: 'all',
    scoringModel: 'equal',
    maxScore: 100,
    easyPoints: 10,
    mediumPoints: 10,
    hardPoints: 10,
    penaltyPerWrongAnswer: 0,
    allowNegativeTotal: false,
    bonusPoints: 5,
    curvePercent: 5,
    passThreshold: 55,
    excellenceThreshold: 80,
    allowRetakeBelow: 50,
    gradeBands: DEFAULT_GRADE_BANDS,
    autoAlertStudent: true,
    autoAlertParent: true,
    notifyViaStudentPortal: true,
    notifyViaWhatsApp: true,
    whatsappTemplate: 'أهلاً يا {studentName}، يسرنا إعلامك بصدور نتيجة اختبار "{examTitle}" بعد التقييم التشخيصي والدعم الأكاديمي. نتيجتك: {score}% ({gradeLabel}). استمر في التميز!',
    portalAlertTitle: '🌟 نتيجة تقييمك التشجيعي في {examTitle}',
    isDefault: false,
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  }
];

const LOCAL_STORAGE_RULES_KEY = 'academy_auto_grading_rules_v1';

/**
 * Fetch all auto-grading rules from Firestore or local fallback
 */
export async function fetchAutoGradingRules(): Promise<AutoGradingRule[]> {
  try {
    const colRef = collection(db, 'auto_grading_rules');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: AutoGradingRule[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as AutoGradingRule);
      });
      // Sort so default is first
      list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn('Could not fetch auto_grading_rules from Firestore, using cache/initial:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
  }

  return INITIAL_AUTO_GRADING_RULES;
}

/**
 * Save or update a rule
 */
export async function saveAutoGradingRule(rule: AutoGradingRule): Promise<void> {
  const payload = {
    ...rule,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'auto_grading_rules', rule.id), payload);
  } catch (err) {
    console.error('Failed to save auto grading rule to Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    const rules = await fetchAutoGradingRules();
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = payload;
    } else {
      rules.push(payload);
    }
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  }
}

/**
 * Set a specific rule as default
 */
export async function setDefaultAutoGradingRule(ruleId: string): Promise<void> {
  const rules = await fetchAutoGradingRules();
  const updated = rules.map(r => ({
    ...r,
    isDefault: r.id === ruleId
  }));

  for (const r of updated) {
    try {
      await setDoc(doc(db, 'auto_grading_rules', r.id), { isDefault: r.isDefault }, { merge: true });
    } catch (e) {
      console.warn('Error setting default rule in Firestore:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(updated));
  }
}

/**
 * Delete a rule
 */
export async function deleteAutoGradingRule(ruleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'auto_grading_rules', ruleId));
  } catch (err) {
    console.error('Failed to delete auto grading rule from Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    const rules = await fetchAutoGradingRules();
    const filtered = rules.filter(r => r.id !== ruleId);
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(filtered));
  }
}

/**
 * Pick the best auto-grading rule for an exam based on subject scope
 */
export function matchAutoGradingRule(rules: AutoGradingRule[], examSubject?: string): AutoGradingRule {
  if (!rules || rules.length === 0) {
    return INITIAL_AUTO_GRADING_RULES[0];
  }

  // 1. Check for specific subject rule (e.g. chemistry)
  if (examSubject) {
    const sub = examSubject.trim().toLowerCase();
    const matchedSubjectRule = rules.find(r => 
      r.subjectScope !== 'all' && sub.includes(r.subjectScope.trim().toLowerCase())
    );
    if (matchedSubjectRule) return matchedSubjectRule;
  }

  // 2. Check for default rule
  const defaultRule = rules.find(r => r.isDefault);
  if (defaultRule) return defaultRule;

  return rules[0];
}

/**
 * Core calculation logic based on Manager's pre-defined rules
 */
export function calculateGradedSubmission(
  examQuestions: Array<{ correctOptionIndex: number; difficulty?: string; points?: number }>,
  studentAnswers: number[] | { [index: number]: number },
  rule: AutoGradingRule
): GradedResultCalculation {
  const totalQuestions = examQuestions.length;
  if (totalQuestions === 0) {
    return {
      score: 0,
      rawScore: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      totalQuestions: 0,
      penaltyDeducted: 0,
      bonusAdded: 0,
      curveAdded: 0,
      passed: false,
      isExcellence: false,
      canRetake: true,
      gradeBand: DEFAULT_GRADE_BANDS[DEFAULT_GRADE_BANDS.length - 1],
      feedbackNote: 'لا توجد أسئلة في هذا الاختبار.',
      ruleApplied: { id: rule.id, name: rule.name },
      questionBreakdown: []
    };
  }

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  // Compute weight per question
  const standardPointPerQuestion = rule.maxScore / totalQuestions;
  let totalEarnedPoints = 0;
  let totalPossiblePoints = 0;
  let penaltyPoints = 0;

  const breakdown: Array<{
    qIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
  }> = [];

  examQuestions.forEach((q, idx) => {
    const studentAns = Array.isArray(studentAnswers) 
      ? studentAnswers[idx] 
      : (studentAnswers as any)[idx];

    let maxPoints = standardPointPerQuestion;
    if (rule.scoringModel === 'difficulty_weighted') {
      const diff = (q.difficulty || 'medium').toLowerCase();
      if (diff === 'easy') maxPoints = rule.easyPoints;
      else if (diff === 'hard') maxPoints = rule.hardPoints;
      else maxPoints = rule.mediumPoints;
    }

    totalPossiblePoints += maxPoints;

    if (studentAns === undefined || studentAns === null || studentAns === -1) {
      unansweredCount++;
      breakdown.push({
        qIndex: idx,
        isCorrect: false,
        pointsEarned: 0,
        maxPoints
      });
    } else if (studentAns === q.correctOptionIndex) {
      correctCount++;
      totalEarnedPoints += maxPoints;
      breakdown.push({
        qIndex: idx,
        isCorrect: true,
        pointsEarned: maxPoints,
        maxPoints
      });
    } else {
      wrongCount++;
      if (rule.penaltyPerWrongAnswer > 0) {
        penaltyPoints += (maxPoints * rule.penaltyPerWrongAnswer);
      }
      breakdown.push({
        qIndex: idx,
        isCorrect: false,
        pointsEarned: 0,
        maxPoints
      });
    }
  });

  // Normalize raw score out of maxScore
  let rawScorePercent = 0;
  if (totalPossiblePoints > 0) {
    rawScorePercent = (totalEarnedPoints / totalPossiblePoints) * rule.maxScore;
  } else {
    rawScorePercent = (correctCount / totalQuestions) * rule.maxScore;
  }

  // Deduct penalty
  let netScore = rawScorePercent - penaltyPoints;
  if (!rule.allowNegativeTotal && netScore < 0) {
    netScore = 0;
  }

  // Add Bonus Points
  let bonusAdded = 0;
  if (rule.bonusPoints > 0) {
    bonusAdded = rule.bonusPoints;
    netScore += bonusAdded;
  }

  // Add Curve Adjustment
  let curveAdded = 0;
  if (rule.curvePercent > 0) {
    curveAdded = (netScore * (rule.curvePercent / 100));
    netScore += curveAdded;
  }

  // Cap at maxScore
  let finalScore = Math.round(netScore);
  if (finalScore > rule.maxScore) {
    finalScore = rule.maxScore;
  }
  if (finalScore < 0) {
    finalScore = 0;
  }

  // Determine Grade Band
  const bands = rule.gradeBands && rule.gradeBands.length > 0 
    ? rule.gradeBands 
    : DEFAULT_GRADE_BANDS;

  let matchedBand = bands.find(b => finalScore >= b.min && finalScore <= b.max);
  if (!matchedBand) {
    matchedBand = bands[bands.length - 1];
  }

  const passed = finalScore >= rule.passThreshold;
  const isExcellence = finalScore >= rule.excellenceThreshold;
  const canRetake = finalScore <= rule.allowRetakeBelow;

  return {
    score: finalScore,
    rawScore: Math.round(rawScorePercent),
    correctCount,
    wrongCount,
    unansweredCount,
    totalQuestions,
    penaltyDeducted: Math.round(penaltyPoints * 10) / 10,
    bonusAdded,
    curveAdded: Math.round(curveAdded * 10) / 10,
    passed,
    isExcellence,
    canRetake,
    gradeBand: matchedBand,
    feedbackNote: matchedBand.feedback,
    ruleApplied: {
      id: rule.id,
      name: rule.name
    },
    questionBreakdown: breakdown
  };
}

/**
 * Generate personal WhatsApp notification message for student
 */
export function buildWhatsAppResultMessage(
  studentName: string,
  examTitle: string,
  gradeCalc: GradedResultCalculation,
  rule: AutoGradingRule
): string {
  const template = rule.whatsappTemplate || 
    'مرحباً {studentName}، نبارك لك إتمام اختبار "{examTitle}" في أكاديمية التفوق. درجتك المعتمدة هي {score}% ({gradeLabel}).';

  return template
    .replace(/{studentName}/g, studentName)
    .replace(/{examTitle}/g, examTitle)
    .replace(/{score}/g, gradeCalc.score.toString())
    .replace(/{gradeLabel}/g, gradeCalc.gradeBand.label)
    .replace(/{badge}/g, gradeCalc.gradeBand.badge)
    .replace(/{feedback}/g, gradeCalc.feedbackNote)
    .replace(/{portalLink}/g, window.location.origin);
}

/**
 * Send / Store student notification in Firestore
 */
export async function dispatchStudentResultAlert(params: {
  studentName: string;
  studentPhone: string;
  examId: string;
  examTitle: string;
  submissionId: string;
  gradeCalc: GradedResultCalculation;
  rule: AutoGradingRule;
}): Promise<{ success: boolean; notificationId?: string; whatsappUrl?: string }> {
  const { studentName, studentPhone, examId, examTitle, submissionId, gradeCalc, rule } = params;

  const alertTitle = (rule.portalAlertTitle || '🎉 نتيجة اختبارك في {examTitle}')
    .replace(/{examTitle}/g, examTitle);

  const alertBody = `أهلاً ${studentName}، تم تصحيح إجاباتك تلقائياً بنجاح وفق (${rule.name}). درجتك النهائية: ${gradeCalc.score}% - ${gradeCalc.gradeBand.label}. ${gradeCalc.feedbackNote}`;

  const cleanPhone = studentPhone ? studentPhone.replace(/\D/g, '') : '';
  const waMessage = buildWhatsAppResultMessage(studentName, examTitle, gradeCalc, rule);
  const waUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone}&text=${encodeURIComponent(waMessage)}`
    : undefined;

  let notificationId: string | undefined = undefined;

  // Save to student_notifications collection
  try {
    const docRef = await addDoc(collection(db, 'student_notifications'), {
      studentPhone: cleanPhone,
      studentName,
      examId,
      examTitle,
      submissionId,
      title: alertTitle,
      message: alertBody,
      score: gradeCalc.score,
      gradeBand: gradeCalc.gradeBand.label,
      ruleName: rule.name,
      passed: gradeCalc.passed,
      whatsappUrl: waUrl || null,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    notificationId = docRef.id;
  } catch (err) {
    console.warn('Failed to save student notification in Firestore:', err);
  }

  // Also log to exam_alerts audit log
  try {
    await addDoc(collection(db, 'exam_alerts'), {
      submissionId,
      examId,
      examTitle,
      studentName,
      studentPhone: cleanPhone,
      score: gradeCalc.score,
      ruleId: rule.id,
      ruleName: rule.name,
      sentAt: new Date().toISOString(),
      channel: 'portal_and_whatsapp',
      status: 'dispatched'
    });
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    notificationId,
    whatsappUrl: waUrl
  };
}
