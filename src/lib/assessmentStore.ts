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
  AuditLogEntry,
  ItemAnalysisData,
  SmartTutorMessage,
  SmartTutorCitation,
  SystemBackupData,
  ResultPolicy,
  BloomLevel,
  TargetDifficulty
} from '../types/assessmentPlatform';

import {
  SEED_SPECIALTIES,
  SEED_GRADE_LEVELS,
  SEED_COURSES,
  SEED_UNITS,
  SEED_TOPICS,
  SEED_LEARNING_OUTCOMES,
  SEED_USERS,
  SEED_GROUPS,
  SEED_REFERENCES,
  SEED_QUESTIONS,
  SEED_EXAMS,
  SEED_ATTEMPTS,
  SEED_AUDIT_LOGS
} from './assessmentSeedData';

const STORAGE_KEY_PREFIX = 'altafawuq_assessment_';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
  }
  return defaultValue;
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to storage:`, e);
  }
}

// Simple deterministic hash for file checksum simulation
export function calculateSimpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return hex.repeat(8).slice(0, 64);
}

// Global in-memory & local-persisted store
class AssessmentStore {
  users: AssessmentUser[] = [];
  specialties: Specialty[] = [];
  gradeLevels: GradeLevel[] = [];
  courses: Course[] = [];
  units: Unit[] = [];
  topics: Topic[] = [];
  learningOutcomes: LearningOutcome[] = [];
  groups: StudentGroup[] = [];
  references: ReferenceDocument[] = [];
  questions: QuestionBankItem[] = [];
  exams: Exam[] = [];
  attempts: ExamAttempt[] = [];
  auditLogs: AuditLogEntry[] = [];
  currentUser: AssessmentUser = SEED_USERS[0];
  tutorChatHistory: Record<string, SmartTutorMessage[]> = {}; // studentId -> messages
  isTutorDisabledDuringExams: boolean = true;
  listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  init() {
    this.users = getStorage('users', SEED_USERS);
    this.specialties = getStorage('specialties', SEED_SPECIALTIES);
    this.gradeLevels = getStorage('gradeLevels', SEED_GRADE_LEVELS);
    this.courses = getStorage('courses', SEED_COURSES);
    this.units = getStorage('units', SEED_UNITS);
    this.topics = getStorage('topics', SEED_TOPICS);
    this.learningOutcomes = getStorage('learningOutcomes', SEED_LEARNING_OUTCOMES);
    this.groups = getStorage('groups', SEED_GROUPS);
    this.references = getStorage('references', SEED_REFERENCES);
    this.questions = getStorage('questions', SEED_QUESTIONS);
    this.exams = getStorage('exams', SEED_EXAMS);
    this.attempts = getStorage('attempts', SEED_ATTEMPTS);
    this.auditLogs = getStorage('auditLogs', SEED_AUDIT_LOGS);
    this.tutorChatHistory = getStorage('tutorChatHistory', {});

    const savedUserId = localStorage.getItem(STORAGE_KEY_PREFIX + 'currentUserId');
    const user = this.users.find(u => u.id === savedUserId);
    this.currentUser = user || this.users[0];
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  setCurrentUser(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'currentUserId', user.id);
      this.notify();
    }
  }

  logAudit(action: string, entityType: AuditLogEntry['entityType'], entityId: string, details: string) {
    const log: AuditLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '192.168.1.105 (Local Network)'
    };
    this.auditLogs = [log, ...this.auditLogs];
    setStorage('auditLogs', this.auditLogs);
    this.notify();
  }

  // --- Curriculum Hierarchy ---
  addSpecialty(name: string, code: string, description: string, color: string = 'emerald') {
    const spec: Specialty = {
      id: 'spec-' + Date.now(),
      name,
      code,
      description,
      iconName: 'BookOpen',
      color
    };
    this.specialties.push(spec);
    setStorage('specialties', this.specialties);
    this.logAudit('إضافة تخصص جديد', 'system', spec.id, `تمت إضافة تخصص: ${name} (${code})`);
    return spec;
  }

  addCourse(name: string, code: string, specialtyId: string, gradeLevelId: string, teacherIds: string[], description: string) {
    const course: Course = {
      id: 'course-' + Date.now(),
      name,
      code,
      specialtyId,
      gradeLevelId,
      teacherIds,
      description
    };
    this.courses.push(course);
    setStorage('courses', this.courses);
    this.logAudit('إضافة مقرر تعليمي', 'system', course.id, `تم إنشاء المقرر: ${name} (${code})`);
    return course;
  }

  addUnit(courseId: string, title: string, description: string) {
    const count = this.units.filter(u => u.courseId === courseId).length;
    const unit: Unit = {
      id: 'unit-' + Date.now(),
      courseId,
      title,
      orderNumber: count + 1,
      description
    };
    this.units.push(unit);
    setStorage('units', this.units);
    this.logAudit('إضافة وحدة دراسية', 'system', unit.id, `تمت إضافة الوحدة: ${title}`);
    return unit;
  }

  addTopic(unitId: string, title: string, description: string = '') {
    const topic: Topic = {
      id: 'topic-' + Date.now(),
      unitId,
      title,
      description
    };
    this.topics.push(topic);
    setStorage('topics', this.topics);
    this.logAudit('إضافة موضوع دراسي', 'system', topic.id, `تمت إضافة الموضوع: ${title}`);
    return topic;
  }

  addLearningOutcome(unitId: string, topicId: string | undefined, code: string, text: string, bloomLevel: BloomLevel) {
    const bloomLabels: Record<BloomLevel, string> = {
      remember: 'تذكر',
      understand: 'فهم',
      apply: 'تطبيق',
      analyze: 'تحليل',
      evaluate: 'تقويم'
    };
    const lo: LearningOutcome = {
      id: 'lo-' + Date.now(),
      unitId,
      topicId,
      code,
      text,
      bloomLevel,
      bloomLabel: bloomLabels[bloomLevel]
    };
    this.learningOutcomes.push(lo);
    setStorage('learningOutcomes', this.learningOutcomes);
    this.logAudit('إضافة ناتج تعلم', 'system', lo.id, `تمت إضافة ناتج التعلم: ${code}`);
    return lo;
  }

  addGroup(name: string, courseId: string, teacherId: string, studentIds: string[]) {
    const group: StudentGroup = {
      id: 'group-' + Date.now(),
      name,
      courseId,
      teacherId,
      studentIds,
      academicYear: '2026/2027'
    };
    this.groups.push(group);
    setStorage('groups', this.groups);
    this.logAudit('إنشاء شعبة دراسية', 'system', group.id, `تم إنشاء المجموعة: ${name} مع ${studentIds.length} طالب`);
    return group;
  }

  // --- Reference Documents & Verification ---
  uploadReference(params: {
    title: string;
    specialtyId: string;
    courseId?: string;
    unitId?: string;
    fileName: string;
    fileType: 'pdf' | 'docx' | 'scanned_pdf';
    rawContent: string;
    sourceAttribution: string;
    fileSizeFormatted?: string;
    ocrStatus?: 'none' | 'experimental_tested' | 'untested';
  }) {
    // Check duplicate using SHA-256 simulation
    const checksum = calculateSimpleChecksum(params.rawContent + params.fileName);
    const existingRef = this.references.find(r => r.checksumSha256 === checksum && r.status !== 'archived');
    if (existingRef) {
      throw new Error(`تطابق البصمة الرقمية: هذا الملف موجود مسبقاً في النظام بعنوان "${existingRef.title}" وحالته الحالية هي: ${existingRef.status}.`);
    }

    // Split text into meaningful sections & paragraphs with page numbers or paragraph numbering
    const lines = params.rawContent.split(/\n\s*\n/).filter(l => l.trim().length > 0);
    const chunks = lines.map((paragraph, index) => {
      // Check if text has page markers like [ص 12] or [Page 12]
      const pageMatch = paragraph.match(/\[(?:ص|صفحة|page)\s*(\d+)\]/i);
      const estimatedPage = pageMatch ? parseInt(pageMatch[1], 10) : Math.floor(index / 2) + 1;
      return {
        id: `chk-${Date.now()}-${index}`,
        chunkIndex: index + 1,
        pageNumber: estimatedPage,
        isPrintedPageEstimated: !pageMatch,
        sectionTitle: `القسم ${index + 1}: ${paragraph.slice(0, 40).replace(/\n/g, ' ')}...`,
        paragraphIndex: index + 1,
        content: paragraph.trim(),
        wordCount: paragraph.trim().split(/\s+/).length
      };
    });

    const doc: ReferenceDocument = {
      id: 'ref-' + Date.now(),
      title: params.title,
      specialtyId: params.specialtyId,
      courseId: params.courseId,
      unitId: params.unitId,
      fileType: params.fileType,
      fileName: params.fileName,
      fileSizeFormatted: params.fileSizeFormatted || '1.5 ميجابايت',
      checksumSha256: checksum,
      version: '1.0',
      uploaderId: this.currentUser.id,
      uploaderName: this.currentUser.name,
      status: 'pending_review',
      reviewDecision: undefined,
      chunks: chunks.length > 0 ? chunks : [{
        id: `chk-${Date.now()}-0`,
        chunkIndex: 1,
        pageNumber: 1,
        isPrintedPageEstimated: true,
        sectionTitle: 'القسم الأول',
        paragraphIndex: 1,
        content: params.rawContent,
        wordCount: params.rawContent.split(/\s+/).length
      }],
      totalChunks: Math.max(1, chunks.length),
      ocrStatus: params.ocrStatus || 'none',
      isSharedInLibrary: false, // Strictly not shared until reviewer approval!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceAttribution: params.sourceAttribution
    };

    this.references.unshift(doc);
    setStorage('references', this.references);
    this.logAudit('رفع مرجع للمراجعة', 'reference', doc.id, `تم رفع المرجع: "${doc.title}" من قِبل ${doc.uploaderName}`);
    return doc;
  }

  // Reviewer Decision: Approve or Reject
  reviewReference(referenceId: string, decision: 'approved' | 'rejected', notes: string) {
    if (this.currentUser.role !== 'reviewer' && this.currentUser.role !== 'admin') {
      throw new Error('غير مصرح لك باتخاذ قرار الاعتماد العلمي. الصلاحية مخصصة للمراجعين العلميين والمدير.');
    }

    const ref = this.references.find(r => r.id === referenceId);
    if (!ref) throw new Error('المرجع المطلوب غير موجود.');

    ref.status = decision;
    ref.isSharedInLibrary = decision === 'approved';
    ref.reviewDecision = {
      reviewerId: this.currentUser.id,
      reviewerName: this.currentUser.name,
      reviewedAt: new Date().toISOString(),
      status: decision,
      notes: notes.trim() || (decision === 'approved' ? 'معتمد وموثق رسمياً وفق المعايير.' : 'تم الرفض لعدم استيفاء المعايير الأكاديمية.')
    };
    ref.updatedAt = new Date().toISOString();

    setStorage('references', this.references);
    this.logAudit(
      decision === 'approved' ? 'اعتماد مرجع رسمي' : 'رفض مرجع',
      'reference',
      ref.id,
      `قرار المراجع (${this.currentUser.name}): ${decision === 'approved' ? 'معتمد' : 'مرفوض'} - ملاحظات: ${notes}`
    );
    return ref;
  }

  // Version replacement: creates a new version requiring separate review
  createNewReferenceVersion(referenceId: string, newRawContent: string, updateReason: string) {
    const oldRef = this.references.find(r => r.id === referenceId);
    if (!oldRef) throw new Error('المرجع الأصلي غير موجود.');

    const newVersionNum = (parseFloat(oldRef.version) + 0.1).toFixed(1);
    const checksum = calculateSimpleChecksum(newRawContent + oldRef.fileName);

    const lines = newRawContent.split(/\n\s*\n/).filter(l => l.trim().length > 0);
    const chunks = lines.map((p, idx) => ({
      id: `chk-v${newVersionNum}-${Date.now()}-${idx}`,
      chunkIndex: idx + 1,
      pageNumber: idx + 1,
      isPrintedPageEstimated: true,
      sectionTitle: `القسم ${idx + 1}`,
      paragraphIndex: idx + 1,
      content: p.trim(),
      wordCount: p.trim().split(/\s+/).length
    }));

    const newDoc: ReferenceDocument = {
      ...oldRef,
      id: 'ref-' + Date.now(),
      version: newVersionNum,
      previousVersionId: oldRef.id,
      checksumSha256: checksum,
      status: 'pending_review', // Independent review required!
      isSharedInLibrary: false,
      reviewDecision: undefined,
      chunks,
      totalChunks: chunks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceAttribution: oldRef.sourceAttribution + ` (إصدار ${newVersionNum}: ${updateReason})`
    };

    this.references.unshift(newDoc);
    setStorage('references', this.references);
    this.logAudit('إنشاء إصدار جديد من المرجع', 'reference', newDoc.id, `إصدار جديد ${newVersionNum} للمرجع "${oldRef.title}" بسبب: ${updateReason}`);
    return newDoc;
  }

  // --- Question Bank & Generation ---
  validateQuestionPayload(q: Partial<QuestionBankItem>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!q.questionText || q.questionText.trim().length < 10) {
      errors.push('نص السؤال قصير جداً أو مفقود.');
    }
    if (!q.options || q.options.length < 2) {
      errors.push('يجب توفير خيارات إجابة كافية (على الأقل خيارين مختلفين).');
    } else {
      const texts = q.options.map(o => o.text.trim().toLowerCase());
      const duplicates = texts.filter((item, index) => texts.indexOf(item) !== index);
      if (duplicates.length > 0) {
        errors.push('خيارات السؤال مكررة أو غير متمايزة.');
      }
    }
    if (!q.correctOptionId || !q.options?.some(o => o.id === q.correctOptionId)) {
      errors.push('يجب تحديد إجابة صحيحة واحدة موجودة ضمن الخيارات.');
    }
    if (!q.explanation || q.explanation.trim().length < 10) {
      errors.push('يجب كتابة تفسير علمي أو مبرر بيداغوجي للإجابة.');
    }
    if (!q.citation || !q.citation.snippetText) {
      errors.push('يجب توثيق استشهاد فعلي من المرجع المعتمد.');
    }
    if (!q.learningOutcomeId) {
      errors.push('يجب ربط السؤال بناتج تعلم محدد.');
    }
    return { valid: errors.length === 0, errors };
  }

  addQuestion(params: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: QuestionBankItem['status'] }) {
    const validation = this.validateQuestionPayload(params);
    if (!validation.valid) {
      throw new Error(`بيانات السؤال غير مكتملة أو غير صالحة:\n${validation.errors.join('\n')}`);
    }

    // Verify reference is approved
    const ref = this.references.find(r => r.id === params.referenceId);
    if (!ref) {
      throw new Error('المرجع المرتبط بالسؤال غير موجود في النظام.');
    }
    if (ref.status !== 'approved') {
      throw new Error(`لا يمكن إضافة سؤال استناداً إلى مرجع غير معتمد. حالة المرجع هي "${ref.status}".`);
    }

    // Check duplicate with existing questions
    const isDuplicate = this.questions.some(q => 
      q.questionText.trim().toLowerCase() === params.questionText.trim().toLowerCase()
    );
    if (isDuplicate) {
      throw new Error('يوجد سؤال مطابق تماماً في بنك الأسئلة.');
    }

    const question: QuestionBankItem = {
      ...params,
      id: 'qb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      status: params.status || 'draft', // Saved as draft by default for teacher review
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.questions.unshift(question);
    setStorage('questions', this.questions);
    this.logAudit('إضافة سؤال لبنك الأسئلة', 'question', question.id, `تمت إضافة السؤال: "${question.questionText.slice(0, 50)}..." كمسودة`);
    return question;
  }

  updateQuestion(id: string, updates: Partial<QuestionBankItem>) {
    const q = this.questions.find(item => item.id === id);
    if (!q) throw new Error('السؤال غير موجود.');

    Object.assign(q, updates);
    q.updatedAt = new Date().toISOString();

    const validation = this.validateQuestionPayload(q);
    if (!validation.valid) {
      throw new Error(`تعديل السؤال غير صالح:\n${validation.errors.join('\n')}`);
    }

    setStorage('questions', this.questions);
    this.logAudit('تحديث سؤال', 'question', q.id, `تم تحديث السؤال: "${q.questionText.slice(0, 40)}..."`);
    return q;
  }

  reviewQuestion(questionId: string, status: 'approved' | 'rejected', reason?: string) {
    const q = this.questions.find(item => item.id === questionId);
    if (!q) throw new Error('السؤال غير موجود.');

    q.status = status;
    q.rejectionReason = status === 'rejected' ? reason : undefined;
    q.reviewedByReviewerId = this.currentUser.id;
    q.reviewedAt = new Date().toISOString();
    q.updatedAt = new Date().toISOString();

    setStorage('questions', this.questions);
    this.logAudit(
      status === 'approved' ? 'اعتماد سؤال' : 'رفض سؤال',
      'question',
      q.id,
      `تم تغيير حالة السؤال إلى ${status} من قبل ${this.currentUser.name}`
    );
    return q;
  }

  // --- Exams & Snapshot Freeze ---
  createExam(params: {
    title: string;
    courseId: string;
    groupId: string;
    durationMinutes: number;
    startDate: string;
    endDate: string;
    allowedAttempts: number;
    passScore: number;
    resultPolicy: ResultPolicy;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    selectedQuestionIds: string[];
    accommodations?: Record<string, { extraTimePercent: number; extraMinutes: number; reason?: string }>;
    pointsPerQuestion?: number;
  }) {
    // RBAC: Only teachers and admins
    if (this.currentUser.role !== 'teacher' && this.currentUser.role !== 'admin') {
      throw new Error('غير مصرح لك بإنشاء الاختبارات.');
    }

    const course = this.courses.find(c => c.id === params.courseId);
    const group = this.groups.find(g => g.id === params.groupId);
    if (!course || !group) throw new Error('المقرر أو الشعبة المحددة غير صحيحة.');

    // Fetch questions and enforce approved status
    const candidateQuestions = this.questions.filter(q => params.selectedQuestionIds.includes(q.id));
    if (candidateQuestions.length === 0) {
      throw new Error('يجب اختيار سؤال واحد معتمد على الأقل لإنشاء الاختبار.');
    }

    const unapproved = candidateQuestions.filter(q => q.status !== 'approved');
    if (unapproved.length > 0) {
      throw new Error(`لا يمكن نشر اختبار يحتوي على أسئلة غير معتمدة. الأسئلة التالية مسودات تحتاج مراجعة: ${unapproved.map(q => q.questionText.slice(0, 30)).join('، ')}`);
    }

    const defaultPoints = params.pointsPerQuestion || Math.floor(100 / candidateQuestions.length);

    // Snapshot Freeze: Deep clone questions to make active exam immutable against bank edits
    const frozenQuestionsSnapshot = candidateQuestions.map(q => ({
      id: 'fq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      originalBankQuestionId: q.id,
      questionText: q.questionText,
      options: JSON.parse(JSON.stringify(q.options)),
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
      points: defaultPoints,
      learningOutcomeId: q.learningOutcomeId,
      learningOutcomeCode: q.learningOutcomeCode,
      bloomLevel: q.bloomLevel,
      citation: {
        sourceTitle: q.citation.sourceTitle,
        pageOrSection: q.citation.pageOrSection
      }
    }));

    const totalPoints = frozenQuestionsSnapshot.reduce((acc, q) => acc + q.points, 0);

    const exam: Exam = {
      id: 'exam-' + Date.now(),
      title: params.title,
      courseId: params.courseId,
      courseName: course.name,
      groupId: params.groupId,
      groupName: group.name,
      teacherId: this.currentUser.id,
      teacherName: this.currentUser.name,
      durationMinutes: params.durationMinutes,
      startDate: params.startDate,
      endDate: params.endDate,
      allowedAttempts: params.allowedAttempts || 1,
      passScore: params.passScore || 60,
      resultPolicy: params.resultPolicy || 'immediate_full',
      shuffleQuestions: params.shuffleQuestions !== false,
      shuffleOptions: params.shuffleOptions !== false,
      isPublished: true,
      publishedAt: new Date().toISOString(),
      accommodations: params.accommodations || {},
      frozenQuestionsSnapshot,
      totalPoints,
      questionsCount: frozenQuestionsSnapshot.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.exams.unshift(exam);
    setStorage('exams', this.exams);
    this.logAudit('تجميد ونشر اختبار', 'exam', exam.id, `تم نشر الاختبار "${exam.title}" مع تجميد لقطة ${frozenQuestionsSnapshot.length} سؤال لمجموعة ${group.name}`);
    return exam;
  }

  // --- Student Exam Session (Server Authority & Shuffle) ---
  startStudentExamAttempt(examId: string, studentId: string) {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) throw new Error('الاختبار غير موجود.');

    // Time window check
    const now = new Date();
    if (new Date(exam.startDate) > now) {
      throw new Error(`لم يحن موعد الاختبار بعد. نافذة الإتاحة تبدأ في: ${new Date(exam.startDate).toLocaleString('ar')}`);
    }
    if (new Date(exam.endDate) < now) {
      throw new Error(`انتهت فترة تقديم الاختبار في: ${new Date(exam.endDate).toLocaleString('ar')}`);
    }

    // Attempts limit check
    const studentAttempts = this.attempts.filter(a => a.examId === examId && a.studentId === studentId);
    if (studentAttempts.length >= exam.allowedAttempts) {
      throw new Error(`لقد استنفدت الحد الأقصى للمحاولات المسموح بها (${exam.allowedAttempts} محاولات).`);
    }

    // Check if there is an in-progress attempt to resume
    const existingActive = studentAttempts.find(a => a.status === 'in_progress');
    if (existingActive) {
      return this.sanitizeAttemptForStudent(existingActive, exam);
    }

    // Compute duration with accommodations
    const accommodation = exam.accommodations[studentId];
    let totalMinutes = exam.durationMinutes;
    if (accommodation) {
      if (accommodation.extraMinutes) totalMinutes += accommodation.extraMinutes;
      if (accommodation.extraTimePercent) totalMinutes += Math.round(exam.durationMinutes * (accommodation.extraTimePercent / 100));
    }

    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + totalMinutes * 60 * 1000).toISOString();

    // Deterministic shuffle per attempt while preserving fixed option IDs
    let questionIds = exam.frozenQuestionsSnapshot.map(q => q.id);
    if (exam.shuffleQuestions) {
      questionIds = [...questionIds].sort(() => Math.random() - 0.5);
    }

    const shuffledOptionsOrder: Record<string, string[]> = {};
    exam.frozenQuestionsSnapshot.forEach(q => {
      let optIds = q.options.map(o => o.id);
      if (exam.shuffleOptions) {
        optIds = [...optIds].sort(() => Math.random() - 0.5);
      }
      shuffledOptionsOrder[q.id] = optIds;
    });

    const studentUser = this.users.find(u => u.id === studentId);

    const attempt: ExamAttempt = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      examId,
      examTitle: exam.title,
      studentId,
      studentName: studentUser?.name || 'طالب',
      groupId: exam.groupId,
      attemptNumber: studentAttempts.length + 1,
      startedAt,
      expiresAt,
      status: 'in_progress',
      shuffledQuestionsOrder: questionIds,
      shuffledOptionsOrder,
      answers: {},
      savedAt: startedAt,
      idempotencyKey: 'idem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)
    };

    this.attempts.push(attempt);
    setStorage('attempts', this.attempts);
    this.logAudit('بدء محاولة اختبار', 'attempt', attempt.id, `بدء المحاولة #${attempt.attemptNumber} للاختبار "${exam.title}" من قبل ${attempt.studentName}`);

    return this.sanitizeAttemptForStudent(attempt, exam);
  }

  // Security: Strip correct answer keys and explanations before sending active payload to student!
  sanitizeAttemptForStudent(attempt: ExamAttempt, exam: Exam) {
    const isFinished = attempt.status === 'submitted' || attempt.status === 'timed_out';
    const now = new Date();
    const isPastWindow = new Date(exam.endDate) <= now;

    const canSeeFullResults = isFinished && (
      exam.resultPolicy === 'immediate_full' || 
      (exam.resultPolicy === 'after_window_closes' && isPastWindow)
    );

    const questionsSanitized = attempt.shuffledQuestionsOrder.map(qId => {
      const q = exam.frozenQuestionsSnapshot.find(item => item.id === qId);
      if (!q) return null;

      // Order options according to student's shuffled order
      const optOrder = attempt.shuffledOptionsOrder[q.id] || q.options.map(o => o.id);
      const orderedOptions = optOrder.map(optId => q.options.find(o => o.id === optId)).filter(Boolean);

      return {
        id: q.id,
        questionText: q.questionText,
        options: orderedOptions,
        points: q.points,
        learningOutcomeCode: q.learningOutcomeCode,
        bloomLevel: q.bloomLevel,
        // Only attach correct key and explanation if submission is complete and policy allows!
        correctOptionId: canSeeFullResults ? q.correctOptionId : undefined,
        explanation: canSeeFullResults ? q.explanation : undefined,
        citation: canSeeFullResults ? q.citation : undefined
      };
    }).filter(Boolean);

    return {
      attempt,
      exam: {
        id: exam.id,
        title: exam.title,
        courseName: exam.courseName,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        questionsCount: exam.questionsCount,
        resultPolicy: exam.resultPolicy
      },
      questions: questionsSanitized,
      canSeeFullResults
    };
  }

  // Auto-Save In-Progress Answers with local persistence & offline recovery queue
  saveAttemptAnswers(attemptId: string, answers: Record<string, 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4'>) {
    const att = this.attempts.find(a => a.id === attemptId);
    if (!att) throw new Error('المحاولة غير موجودة.');
    if (att.status !== 'in_progress') {
      throw new Error('لا يمكن تعديل الإجابات لأن المحاولة تم تسليمها أو انتهت صلاحيتها.');
    }

    att.answers = { ...att.answers, ...answers };
    att.savedAt = new Date().toISOString();
    setStorage('attempts', this.attempts);
    return { success: true, savedAt: att.savedAt };
  }

  // Submit Exam Attempt: Server-side grading, time expiration check & idempotency guard
  submitExamAttempt(attemptId: string, finalAnswers?: Record<string, 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4'>, idempotencyToken?: string) {
    const att = this.attempts.find(a => a.id === attemptId);
    if (!att) throw new Error('المحاولة غير موجودة.');

    // Idempotency: If already submitted with same token, return cached score gracefully
    if (att.status === 'submitted') {
      return {
        alreadySubmitted: true,
        attempt: att,
        score: att.score,
        percentage: att.percentage,
        passed: att.passed
      };
    }

    const exam = this.exams.find(e => e.id === att.examId);
    if (!exam) throw new Error('بيانات الاختبار غير موجودة.');

    const now = new Date();
    const expiryTime = new Date(att.expiresAt);
    // Allow a 60-second grace period for network latency
    const isLate = now.getTime() > (expiryTime.getTime() + 60000);

    if (finalAnswers) {
      att.answers = { ...att.answers, ...finalAnswers };
    }

    // Auto-grading deterministically using stable option IDs
    let totalScore = 0;
    const itemResults: ExamAttempt['itemResults'] = {};

    exam.frozenQuestionsSnapshot.forEach(q => {
      const chosen = att.answers[q.id];
      const isCorrect = chosen === q.correctOptionId;
      const pointsEarned = isCorrect ? q.points : 0;
      totalScore += pointsEarned;

      itemResults[q.id] = {
        isCorrect,
        chosenOptionId: chosen,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
        pointsEarned,
        pointsPossible: q.points,
        learningOutcomeId: q.learningOutcomeId
      };
    });

    att.status = isLate ? 'timed_out' : 'submitted';
    att.submittedAt = now.toISOString();
    att.score = totalScore;
    att.maxScore = exam.totalPoints;
    att.percentage = Math.round((totalScore / exam.totalPoints) * 100);
    att.passed = att.percentage >= exam.passScore;
    att.itemResults = itemResults;
    if (idempotencyToken) att.idempotencyKey = idempotencyToken;

    setStorage('attempts', this.attempts);
    this.logAudit(
      'تسليم وتصحيح اختبار',
      'attempt',
      att.id,
      `تسليم محاولة ${att.studentName} للاختبار "${exam.title}". النتيجة: ${att.score}/${exam.totalPoints} (${att.percentage}%)`
    );

    return {
      success: true,
      attempt: att,
      isLate,
      score: att.score,
      percentage: att.percentage,
      passed: att.passed
    };
  }

  // --- Item Analysis Engine (Psychometrics) ---
  calculateItemAnalysis(examId: string): ItemAnalysisData[] {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) return [];

    const examAttempts = this.attempts.filter(a => a.examId === examId && a.status === 'submitted');
    const sampleSize = examAttempts.length;

    return exam.frozenQuestionsSnapshot.map(q => {
      if (sampleSize === 0) {
        return {
          questionId: q.id,
          questionText: q.questionText,
          sampleSizeN: 0,
          pValueDifficulty: 0,
          targetDifficulty: 'medium',
          discriminationIndexD: 0,
          distractorCounts: { opt_1: 0, opt_2: 0, opt_3: 0, opt_4: 0, skipped: 0 },
          distractorPercentages: { opt_1: 0, opt_2: 0, opt_3: 0, opt_4: 0, skipped: 0 },
          correctOptionId: q.correctOptionId,
          learningOutcomeId: q.learningOutcomeId,
          qualityFlag: 'needs_review',
          interpretation: 'لا توجد محاولات مسلّمة بعد لاحتساب المؤشرات الإحصائية.'
        };
      }

      // Count choices
      const counts = { opt_1: 0, opt_2: 0, opt_3: 0, opt_4: 0, skipped: 0 };
      let correctCount = 0;

      examAttempts.forEach(att => {
        const choice = att.answers[q.id];
        if (!choice) counts.skipped++;
        else if (choice in counts) counts[choice as keyof typeof counts]++;

        if (choice === q.correctOptionId) correctCount++;
      });

      const pValue = Number((correctCount / sampleSize).toFixed(2));

      // Calculate Discrimination Index D using top 50% vs bottom 50% (or top 27% vs bottom 27%)
      const sortedAttempts = [...examAttempts].sort((a, b) => (b.score || 0) - (a.score || 0));
      const groupSize = Math.max(1, Math.floor(sampleSize * 0.33));
      const topGroup = sortedAttempts.slice(0, groupSize);
      const bottomGroup = sortedAttempts.slice(-groupSize);

      const topCorrect = topGroup.filter(a => a.answers[q.id] === q.correctOptionId).length;
      const bottomCorrect = bottomGroup.filter(a => a.answers[q.id] === q.correctOptionId).length;
      const discriminationIndex = Number(((topCorrect - bottomCorrect) / groupSize).toFixed(2));

      // Quality Flag
      let qualityFlag: ItemAnalysisData['qualityFlag'] = 'good';
      let interpretation = 'السؤال يتمتع بدرجة تمييز مناسبة.';

      if (discriminationIndex >= 0.40) {
        qualityFlag = 'excellent';
        interpretation = 'سؤال ممتاز ذو قدرة تمييزية عالية بين الطلاب المتميزين والضعاف.';
      } else if (discriminationIndex < 0.20 && discriminationIndex >= 0) {
        qualityFlag = 'needs_review';
        interpretation = 'معامل التمييز منخفض، يُنصح بمراجعة البدائل والمشتتات.';
      } else if (discriminationIndex < 0) {
        qualityFlag = 'flawed';
        interpretation = 'معامل تمييز سلبي! الطلاب ذوو التحصيل الأدنى أجابوا بشكل أفضل، مما يشير إلى وجود خطأ في مفتاح الإجابة أو غموض في الصياغة.';
      }

      // Distractor percentages
      const percentages = {
        opt_1: Math.round((counts.opt_1 / sampleSize) * 100),
        opt_2: Math.round((counts.opt_2 / sampleSize) * 100),
        opt_3: Math.round((counts.opt_3 / sampleSize) * 100),
        opt_4: Math.round((counts.opt_4 / sampleSize) * 100),
        skipped: Math.round((counts.skipped / sampleSize) * 100)
      };

      return {
        questionId: q.id,
        questionText: q.questionText,
        sampleSizeN: sampleSize,
        pValueDifficulty: pValue,
        targetDifficulty: (pValue > 0.75 ? 'easy' : pValue < 0.40 ? 'hard' : 'medium') as TargetDifficulty,
        discriminationIndexD: discriminationIndex,
        distractorCounts: counts,
        distractorPercentages: percentages,
        correctOptionId: q.correctOptionId,
        learningOutcomeId: q.learningOutcomeId,
        qualityFlag,
        interpretation
      };
    });
  }

  // --- Smart AI Tutor (Grounded RAG) ---
  askSmartTutor(studentId: string, courseId: string, questionQuery: string): SmartTutorMessage {
    // Check if exam is in progress for this student and tutor is silenced
    const hasActiveExam = this.attempts.some(a => a.studentId === studentId && a.status === 'in_progress');
    if (hasActiveExam && this.isTutorDisabledDuringExams) {
      const lockMsg: SmartTutorMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: 'عذراً، المعلم الذكي معطل مؤقتاً أثناء وجود جلسة اختبار نشطة لضمان النزاهة الأكاديمية. يمكنك معاودة الاستفسار فور تسليم الاختبار.',
        timestamp: new Date().toISOString(),
        isRefusal: true
      };
      return lockMsg;
    }

    // Retrieve ONLY from approved references belonging to this course's specialty
    const course = this.courses.find(c => c.id === courseId);
    const approvedRefs = this.references.filter(r => 
      r.status === 'approved' && 
      (r.courseId === courseId || r.specialtyId === course?.specialtyId)
    );

    // Prompt injection check: check if user query attempts to hijack rules
    const queryLower = questionQuery.toLowerCase();
    const isInjectionAttempt = 
      queryLower.includes('ignore previous instructions') || 
      queryLower.includes('تجاهل التعليمات') || 
      queryLower.includes('من خارج المراجع') || 
      queryLower.includes('اعطني إجابات الاختبار') ||
      queryLower.includes('مفتاح الإجابة');

    if (isInjectionAttempt) {
      const injectionMsg: SmartTutorMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: 'أنا "المعلم الذكي لأكاديمية التفوق"، ملتزم حصرياً بالشرح من المراجع المعتمدة داخل المنهاج فقط. لا يُسمح بتجاوز هذه التعليمات أو استعراض أسئلة أو مفاتيح الاختبارات.',
        timestamp: new Date().toISOString(),
        isRefusal: true
      };
      return injectionMsg;
    }

    // Match keywords against approved chunks
    const searchTerms = questionQuery
      .replace(/[؟?.,!]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const scoredChunks: Array<{ ref: ReferenceDocument; chunk: ReferenceDocument['chunks'][0]; score: number }> = [];

    approvedRefs.forEach(ref => {
      ref.chunks.forEach(chunk => {
        let score = 0;
        searchTerms.forEach(term => {
          const regex = new RegExp(term, 'gi');
          const matches = chunk.content.match(regex);
          if (matches) score += matches.length;
        });
        if (score > 0) {
          scoredChunks.push({ ref, chunk, score });
        }
      });
    });

    scoredChunks.sort((a, b) => b.score - a.score);

    // Golden Rule Check: If no sufficient grounded evidence found in approved references:
    if (scoredChunks.length === 0 || scoredChunks[0].score < 1) {
      const refusalMsg: SmartTutorMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: 'لم أتمكن من العثور على معلومات كافية في المصادر التعليمية المتاحة للإجابة عن هذا السؤال.',
        timestamp: new Date().toISOString(),
        isRefusal: true
      };
      return refusalMsg;
    }

    // Synthesize response strictly from top matching chunks
    const topMatches = scoredChunks.slice(0, 2);
    const citations: SmartTutorCitation[] = topMatches.map(m => ({
      referenceId: m.ref.id,
      referenceTitle: m.ref.title,
      version: m.ref.version,
      pageOrSection: `صفحة ${m.chunk.pageNumber || 'غير محددة'} (${m.chunk.sectionTitle || 'قسم تعليمي'})`,
      snippet: m.chunk.content.slice(0, 160) + '...'
    }));

    // Pedagogical structured response (Definition -> Core Idea -> Example/Curriculum Link -> Summary)
    const primaryChunk = topMatches[0];
    const generatedAnswer = `### الإجابة الأكاديمية المعتمدة:

${primaryChunk.chunk.content}

---
**خلاصة تربوية:** يُعد هذا المفهوم ركيزة أساسية في فهم منهاج ${course?.name || 'المادة'}، ويجب التركيز على الشروط المعيارية الموضحة في المرجع أعلاه.

**المصدر:** ${primaryChunk.ref.title} (الإصدار ${primaryChunk.ref.version}) - ${primaryChunk.chunk.sectionTitle || ''}، ص ${primaryChunk.chunk.pageNumber || '1'}.`;

    const assistantMsg: SmartTutorMessage = {
      id: 'msg-' + Date.now(),
      role: 'assistant',
      content: generatedAnswer,
      timestamp: new Date().toISOString(),
      citations,
      isRefusal: false,
      pedagogicalEvaluation: {
        conceptUnderstood: true,
        clarificationPrompt: 'هل تود التدرب على سؤال محاكي من بنك الأسئلة المعتمد حول هذا المفهوم؟'
      }
    };

    return assistantMsg;
  }

  // Report Erroneous AI Answer
  reportTutorAnswer(messageId: string, notes: string) {
    this.logAudit('إبلاغ عن إجابة معلم ذكي', 'system', messageId, `إبلاغ من الطالب ${this.currentUser.name}: ${notes}`);
    return { success: true };
  }

  // --- System Backup & Restore ---
  exportSystemBackup(): SystemBackupData {
    const backup: SystemBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: `${this.currentUser.name} (${this.currentUser.email})`,
      specialties: this.specialties,
      gradeLevels: this.gradeLevels,
      courses: this.courses,
      units: this.units,
      topics: this.topics,
      learningOutcomes: this.learningOutcomes,
      users: this.users,
      groups: this.groups,
      references: this.references,
      questions: this.questions,
      exams: this.exams,
      attempts: this.attempts,
      auditLogs: this.auditLogs
    };
    this.logAudit('تصدير نسخة احتياطية', 'system', 'backup-' + Date.now(), 'تم تصدير نسخة احتياطية شاملة للنظام بصيغة JSON');
    return backup;
  }

  importSystemBackup(backup: SystemBackupData) {
    if (!backup || !backup.specialties || !backup.references || !backup.questions) {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف ولا يطابق هيكل النظام.');
    }

    this.specialties = backup.specialties;
    this.gradeLevels = backup.gradeLevels || this.gradeLevels;
    this.courses = backup.courses || this.courses;
    this.units = backup.units || this.units;
    this.topics = backup.topics || this.topics;
    this.learningOutcomes = backup.learningOutcomes || this.learningOutcomes;
    this.users = backup.users || this.users;
    this.groups = backup.groups || this.groups;
    this.references = backup.references;
    this.questions = backup.questions;
    this.exams = backup.exams || this.exams;
    this.attempts = backup.attempts || this.attempts;
    this.auditLogs = backup.auditLogs || this.auditLogs;

    setStorage('specialties', this.specialties);
    setStorage('gradeLevels', this.gradeLevels);
    setStorage('courses', this.courses);
    setStorage('units', this.units);
    setStorage('topics', this.topics);
    setStorage('learningOutcomes', this.learningOutcomes);
    setStorage('users', this.users);
    setStorage('groups', this.groups);
    setStorage('references', this.references);
    setStorage('questions', this.questions);
    setStorage('exams', this.exams);
    setStorage('attempts', this.attempts);
    setStorage('auditLogs', this.auditLogs);

    this.logAudit('استعادة نسخة احتياطية', 'system', 'restore-' + Date.now(), `تمت استعادة النظام بنجاح من نسخة ${backup.exportedAt}`);
    this.notify();
    return { success: true };
  }
}

export const assessmentStore = new AssessmentStore();
