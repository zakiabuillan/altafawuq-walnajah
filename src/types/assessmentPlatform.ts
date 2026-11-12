// Types for Altafawuq Academic Assessment & Reference Management Platform
// المنظومة المتكاملة لإدارة المراجع المعتمدة وتوليد اختبارات الاختيار من متعدد والمعلم الذكي

export type UserRole = 'admin' | 'reviewer' | 'teacher' | 'student';

export interface AssessmentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialtyIds: string[]; // e.g. ['chem', 'physics', 'math']
  groupIds?: string[];    // For students: assigned groups
  createdAt: string;
}

export interface Specialty {
  id: string;
  code: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  stage: 'middle' | 'high' | 'bagrut';
  description: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  specialtyId: string;
  gradeLevelId: string;
  teacherIds: string[];
  description: string;
}

export interface Unit {
  id: string;
  courseId: string;
  title: string;
  orderNumber: number;
  description: string;
}

export interface Topic {
  id: string;
  unitId: string;
  title: string;
  description?: string;
}

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate';

export interface LearningOutcome {
  id: string;
  unitId: string;
  topicId?: string;
  code: string; // e.g. 'LO-CHEM-01'
  text: string;
  bloomLevel: BloomLevel;
  bloomLabel: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  academicYear: string;
}

export type ReferenceStatus = 
  | 'processing' 
  | 'needs_correction' 
  | 'pending_review' 
  | 'approved' 
  | 'rejected' 
  | 'archived';

export interface ReferenceChunk {
  id: string;
  chunkIndex: number;
  sectionTitle?: string;
  paragraphIndex?: number;
  pageNumber?: number; // Physical or printed page
  isPrintedPageEstimated?: boolean;
  content: string;
  wordCount: number;
}

export interface ReviewDecision {
  reviewerId: string;
  reviewerName: string;
  reviewedAt: string;
  status: 'approved' | 'rejected';
  notes: string;
}

export interface ReferenceDocument {
  id: string;
  title: string;
  specialtyId: string;
  courseId?: string;
  unitId?: string;
  fileType: 'pdf' | 'docx' | 'scanned_pdf';
  fileName: string;
  fileSizeFormatted: string;
  checksumSha256: string;
  version: string; // e.g. '1.0', '1.1'
  previousVersionId?: string;
  uploaderId: string;
  uploaderName: string;
  status: ReferenceStatus;
  reviewDecision?: ReviewDecision;
  chunks: ReferenceChunk[];
  totalChunks: number;
  ocrStatus: 'none' | 'experimental_tested' | 'untested';
  isSharedInLibrary: boolean;
  createdAt: string;
  updatedAt: string;
  sourceAttribution: string; // Citation metadata (e.g. "كتاب الكيمياء المعتمد - وزارة المعارف، الطبعة 2024")
}

export interface MCQOption {
  id: 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4';
  text: string;
}

export type TargetDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionBankItem {
  id: string;
  questionText: string;
  options: MCQOption[];
  correctOptionId: 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4';
  explanation: string;
  learningOutcomeId: string;
  learningOutcomeCode?: string;
  bloomLevel: BloomLevel;
  targetDifficulty: TargetDifficulty;
  referenceId: string;
  referenceVersion: string;
  referenceTitle: string;
  chunkId: string;
  citation: {
    sourceTitle: string;
    pageOrSection: string;
    snippetText: string;
  };
  status: 'draft' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdByTeacherId: string;
  createdByTeacherName: string;
  reviewedByReviewerId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  courseId: string;
  unitId: string;
}

export type ResultPolicy = 
  | 'immediate_full'      // Score and full explanations shown immediately upon submission
  | 'score_only'          // Score shown immediately, explanations hidden
  | 'after_window_closes'; // Hidden completely until exam availability closes

export interface FrozenQuestionSnapshot {
  id: string;
  originalBankQuestionId: string;
  questionText: string;
  options: MCQOption[];
  correctOptionId: 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4'; // Kept on server, stripped in student active payload
  explanation: string;
  points: number;
  learningOutcomeId: string;
  learningOutcomeCode?: string;
  bloomLevel: BloomLevel;
  citation: {
    sourceTitle: string;
    pageOrSection: string;
  };
}

export interface ExamAccommodation {
  extraTimePercent: number; // e.g. 25 for +25%
  extraMinutes: number;
  reason?: string;
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  groupId: string;
  groupName: string;
  teacherId: string;
  teacherName: string;
  durationMinutes: number;
  startDate: string; // ISO date-time
  endDate: string;   // ISO date-time
  allowedAttempts: number;
  passScore: number; // e.g. 60
  resultPolicy: ResultPolicy;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isPublished: boolean;
  publishedAt?: string;
  accommodations: Record<string, ExamAccommodation>; // studentId -> accommodation
  frozenQuestionsSnapshot: FrozenQuestionSnapshot[];
  totalPoints: number;
  questionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentExamSessionQuestion {
  id: string;
  questionText: string;
  options: MCQOption[];
  points: number;
  learningOutcomeCode?: string;
  bloomLevel: BloomLevel;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  groupId: string;
  attemptNumber: number;
  startedAt: string; // Server ISO time
  expiresAt: string; // Server calculated deadline (startedAt + duration + extraTime)
  submittedAt?: string;
  status: 'in_progress' | 'submitted' | 'timed_out';
  shuffledQuestionsOrder: string[]; // Order of question IDs shown to this student
  shuffledOptionsOrder: Record<string, string[]>; // questionId -> option IDs in order shown
  answers: Record<string, 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4'>; // questionId -> chosen optionId
  savedAt: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  itemResults?: Record<string, {
    isCorrect: boolean;
    chosenOptionId?: string;
    correctOptionId?: string;
    explanation?: string;
    pointsEarned: number;
    pointsPossible: number;
    learningOutcomeId: string;
  }>;
  idempotencyKey: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'reference' | 'question' | 'exam' | 'attempt' | 'user' | 'system';
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface ItemAnalysisData {
  questionId: string;
  questionText: string;
  sampleSizeN: number;
  pValueDifficulty: number; // 0.0 to 1.0 (proportion answering correctly)
  targetDifficulty: TargetDifficulty;
  discriminationIndexD: number; // -1.0 to +1.0
  distractorCounts: {
    opt_1: number;
    opt_2: number;
    opt_3: number;
    opt_4: number;
    skipped: number;
  };
  distractorPercentages: {
    opt_1: number;
    opt_2: number;
    opt_3: number;
    opt_4: number;
    skipped: number;
  };
  correctOptionId: string;
  learningOutcomeId: string;
  qualityFlag: 'excellent' | 'good' | 'needs_review' | 'flawed';
  interpretation: string;
}

export interface SmartTutorCitation {
  referenceId: string;
  referenceTitle: string;
  version: string;
  pageOrSection: string;
  snippet: string;
}

export interface SmartTutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: SmartTutorCitation[];
  isRefusal?: boolean;
  isReported?: boolean;
  pedagogicalEvaluation?: {
    conceptUnderstood: boolean;
    clarificationPrompt?: string;
  };
}

export interface SystemBackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  specialties: Specialty[];
  gradeLevels: GradeLevel[];
  courses: Course[];
  units: Unit[];
  topics: Topic[];
  learningOutcomes: LearningOutcome[];
  users: AssessmentUser[];
  groups: StudentGroup[];
  references: ReferenceDocument[];
  questions: QuestionBankItem[];
  exams: Exam[];
  attempts: ExamAttempt[];
  auditLogs: AuditLogEntry[];
}
