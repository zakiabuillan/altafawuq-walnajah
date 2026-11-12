// Types for the Edraak-inspired Learning Management System (LMS)
export type QuestionType = 'true_false' | 'multiple_choice' | 'fill_blank' | 'short_answer';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  email: string;
  phone: string;
  grade: string; // e.g. "الصف الثاني عشر (بجروت)"
  role: UserRole;
  createdAt: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
}

export interface KeyTerm {
  ar: string;
  en: string;
  definition?: string;
}

export type SupportedSourceType = 
  | 'pdf'             // ملفات PDF
  | 'word'            // ملفات Word
  | 'powerpoint'      // عروض PowerPoint
  | 'video'           // فيديوهات تعليمية
  | 'website'         // مواقع إلكترونية
  | 'ebook'           // كتب إلكترونية
  | 'scientific_paper'// مقالات علمية
  | 'image'           // صور تعليمية
  | 'audio'           // ملفات صوتية
  | 'teacher_notes';  // ملاحظات وشروحات يكتبها المعلم داخل المنصة

export interface ApprovedReference {
  id: string;
  title: string;
  sourceType: SupportedSourceType;
  authorOrPublisher: string;
  subject: string;
  gradeLevel: string;
  unitId?: string; // 'unit-1', 'unit-2', etc. or 'all'
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  priority: number; // 1 = أعلى أولوية، 2، 3...
  isApproved: boolean; // حالة الاعتماد الرسمية من معلم المادة
  approvedByTeacherName: string;
  approvedDate: string;
  urlOrContent?: string;
  fileSize?: string;
  notes?: string; // توجيهات وشروحات المعلم
  citation?: string; // التوثيق الأكاديمي
  contentSummary?: string;
  keyConceptsCovered?: string[];
  usedInAssessments?: boolean;
}

export interface LearningUnit {
  id: string;
  unitNumber: number;
  title: string;
  subtitle: string;
  summary: string;
  details: string[];
  chemicalEquation?: string;
  keyTerms?: KeyTerm[];
  iconName?: 'Leaf' | 'Sun' | 'Zap' | 'FlaskConical' | 'Layers' | 'RefreshCw';
  diagram?: {
    title: string;
    caption: string;
    elements: { name: string; role: string }[];
  };
  referenceIds?: string[];
  primaryReferenceTitle?: string;
  primaryReferenceAuthor?: string;
  primaryReferenceType?: SupportedSourceType;
  quiz?: UnitQuiz;
}

export interface UnitQuizQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[]; // typically 4 multiple choice options
  correctAnswer: string;
  correctOptionIndex: number; // 0, 1, 2, 3
  explanation: string;
  referenceExcerpt?: string;
  cognitiveLevel?: 'تذكر' | 'استيعاب ومفاهيم' | 'تطبيق' | 'تحليل وبجروت';
}

export interface UnitQuiz {
  unitId: string;
  unitTitle: string;
  passScorePercentage: number; // default 75
  questions: UnitQuizQuestion[];
  generatedBy?: 'curriculum' | 'gemini_ai';
  generatedAt?: string;
}

export interface StudentUnitQuizResult {
  id: string; // `${studentId}_${unitId}`
  studentId: string;
  studentName: string;
  studentEmail?: string;
  unitId: string;
  unitNumber: number;
  unitTitle: string;
  quizScore: number;
  quizTotal: number;
  quizPercentage: number;
  passed: boolean;
  answers: Record<string, {
    questionId: string;
    questionText: string;
    chosenIndex: number;
    chosenOption: string;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  courseTitle?: string;
  completedAt: string;
  updatedAt: string;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface ReviewQuestion {
  id: string;
  type: QuestionType;
  questionNumber: number;
  questionText: string;
  options?: string[]; // For true_false (['صح', 'خطأ']) and multiple_choice (4 items)
  correctAnswer: string;
  explanation: {
    conclusion: string;
    steps: string[];
    latexFormula?: string;
    englishTerms?: { ar: string; en: string }[];
  };
  hint?: string;
  approvedReferenceId?: string;
  approvedReferenceTitle?: string;
}

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
  explanation: string;
  unitRef?: string;
  approvedReferenceId?: string;
  approvedReferenceTitle?: string;
}

export interface StudentExamSubmission {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle?: string;
  score: number;
  totalPoints: number;
  percentage: number;
  date: string; // ISO or formatted date
  answers: Record<string, string>; // questionId -> studentAnswer
  passed: boolean; // >= 80%
  timeSpentSeconds: number;
}

export interface CurriculumData {
  title: string;
  subtitle: string;
  introduction: string;
  authorOrSource: string;
  learningUnits: LearningUnit[];
  reviewQuestions: ReviewQuestion[];
  examQuestions: ExamQuestion[];
  approvedReferences?: ApprovedReference[];
}

export interface StudentProgress {
  unitsRead: string[]; // unitIds
  reviewQuestionsAnswered: Record<string, boolean>; // questionId -> isCorrect
  examCompleted: boolean;
  highestExamScore?: number;
  highestExamPercentage?: number;
  studentName?: string;
  studentEmail?: string;
  unitQuizResults?: Record<string, StudentUnitQuizResult>; // unitId -> quiz result
}

export interface Course {
  id: string;
  title: string;
  code: string;
  subject: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  description: string;
  thumbnail?: string;
  progressPercent: number;
  status: 'active' | 'completed' | 'upcoming';
  totalLessons: number;
  completedLessons: number;
  enrolledStudentsCount: number;
}

export interface ClassSession {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  teacherName: string;
  status: 'upcoming' | 'completed';
  meetingLink?: string;
  recordingUrl?: string;
  notes?: string;
}

export interface EducationalFile {
  id: string;
  courseId: string;
  courseTitle: string;
  fileName: string;
  fileType: 'pdf' | 'word' | 'ppt' | 'mp4' | 'image' | 'zip';
  fileSize: string;
  uploadDate: string;
  downloadUrl: string;
  description: string;
  uploaderName: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'lesson' | 'file' | 'exam' | 'result' | 'assignment' | 'announcement';
  date: string;
  isRead: boolean;
  linkTab?: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  subject?: string;
  isMiniQuiz?: boolean;
}

export interface StudentAiChatSession {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  subject: string;
  messages: AIChatMessage[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

