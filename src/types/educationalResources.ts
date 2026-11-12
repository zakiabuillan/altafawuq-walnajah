// Firestore NoSQL Schema & TypeScript Definitions for Educational Materials & Resources
// linking Teachers, Courses, Resources (Unit-Breakdown), and Student Access Permissions

export type ResourceType = 'text' | 'pdf' | 'link';

export const PDF_CATEGORIES = [
  'شروحات ومذكرات دراسية',
  'أوراق عمل وتطبيقات',
  'نماذج امتحانات وبجروت',
  'ملخصات ومراجعات مركزة',
  'حلول ونماذج إجابة رسمية',
  'إثراء ومراجع خارجية'
] as const;

export type PdfCategory = typeof PDF_CATEGORIES[number];

export type CognitiveLevel = 'تذكر' | 'فهم' | 'تطبيق' | 'تحليل';

export interface GeneratedQuestion {
  id: string;
  cognitiveLevel: CognitiveLevel;
  levelBadge: string;
  question: string;
  options: string[];
  correctAnswer: string;
  modelExplanation: string;
  points?: number;
}

export interface GeneratedEducationalContent {
  id: string;
  title: string;
  goal: 'lesson_plan' | 'worksheet' | 'exam' | 'comprehensive';
  createdAt: string;
  summary: string;
  markdownContent: string;
  lessonPlan?: {
    objectives: string[];
    steps: string[];
    durationMinutes: number;
  };
  questions?: GeneratedQuestion[];
  teacherAnswerKeyMarkdown?: string;
}

export interface PdfAnnotation {
  id: string;
  pageNumber: number; // 1-based page number
  highlightText?: string; // snippet or phrase selected
  selectionCoords: {
    x: number; // percentage (0 - 100)
    y: number; // percentage (0 - 100)
    width: number; // percentage (0 - 100)
    height: number; // percentage (0 - 100)
  };
  note: string; // Teacher's short text note / explanation
  color: 'amber' | 'emerald' | 'indigo' | 'rose' | 'sky';
  authorName?: string;
  createdAt: string;
  // Floating Resizable Image Annotation fields
  isImageObject?: boolean;
  imageUrl?: string;
  imageTitle?: string;
  aspectRatio?: number;
  rotation?: number;
  strokeWidth?: number;
}

export interface EducationalResourceDoc {
  id: string;
  title: string;
  subject: string; // e.g., 'كيمياء', 'فيزياء', 'أحياء', 'رياضيات'
  unit_id: string; // Foreign Key: e.g., 'unit-organic-chem', 'unit-gas-laws'
  unit_title: string; // e.g., 'كيمياء العضوية', 'قوانين الغازات'
  type: ResourceType;
  pdf_category?: PdfCategory;
  url?: string;
  file_name?: string;
  file_size?: string;
  page_count?: number;
  content: string; // The raw reference text or content entered by teacher
  teacher_id: string;
  teacher_name: string;
  course_id: string; // e.g., 'course-chem-bagrut-5'
  course_name?: string;
  group_ids: string[]; // e.g., ['group-chem-12a', 'group-bagrut-science']
  student_ids: string[]; // List of student IDs with access permissions
  academic_citation?: string; // التوثيق المرجعي الأكاديمي
  notes?: string;
  tags: string[];
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  generated_materials?: GeneratedEducationalContent[];
  pdf_annotations?: PdfAnnotation[];
  page_rotations?: Record<number, number>;
}

/**
 * Firestore Database Optimal NoSQL JSON Architecture Schema
 * ==========================================================
 * 
 * 1. Collection: `teachers`
 *    Document ID: `{teacher_id}` (e.g., 'teacher-zaki-abu-illan')
 *    {
 *      "name": "أ. د. زكي أبو علان",
 *      "email": "zakiabuillan@gmail.com",
 *      "specialization": "كيمياء وأحياء",
 *      "subjects": ["كيمياء", "أحياء", "فيزياء"],
 *      "assigned_courses": ["course-chem-1", "course-bio-1"]
 *    }
 * 
 * 2. Collection: `courses`
 *    Document ID: `{course_id}` (e.g., 'course-chem-bagrut-5')
 *    {
 *      "name": "كيمياء متقدمة - بجروت 5 وحدات",
 *      "subject": "كيمياء",
 *      "grade": "الصف الثاني عشر",
 *      "teacher_id": "teacher-zaki-abu-illan",
 *      "units": [
 *        {
 *          "unit_id": "unit-chem-organic",
 *          "unit_title": "الوحدة الأولى: الكيمياء العضوية",
 *          "description": "الهيدروكربونات، المجموعات الوظيفية، والتفاعلات الكيميائية"
 *        },
 *        {
 *          "unit_id": "unit-chem-gases",
 *          "unit_title": "الوحدة الثانية: قوانين الغازات وحسابات الاتزان",
 *          "description": "قانون بويل، شارل، الغاز المثالي وضغوط دالتون"
 *        }
 *      ],
 *      "enrolled_group_ids": ["group-12-science-a"],
 *      "enrolled_student_ids": ["student-mohammad-101", "student-sara-102"]
 *    }
 * 
 * 3. Collection: `resources` (or `educational_resources`)
 *    Document ID: `{resource_id}` (e.g., 'res-chem-organic-summary-1')
 *    {
 *      "title": "ملخص تفاعلات الكحولات والإيثرات المعتمد",
 *      "subject": "كيمياء",
 *      "unit_id": "unit-chem-organic",           <-- Foreign Key for Hierarchical Grouping
 *      "unit_title": "الكيمياء العضوية",
 *      "type": "text",                           <-- 'text' | 'pdf' | 'link'
 *      "url": "",
 *      "content": "الكحولات مركبات عضوية تحتوي على مجموعة الهيدروكسيل (-OH)...",
 *      "teacher_id": "teacher-zaki-abu-illan",
 *      "teacher_name": "أ. د. زكي أبو علان",
 *      "course_id": "course-chem-bagrut-5",
 *      "group_ids": ["group-12-science-a"],      <-- Query filter: where('group_ids', 'array-contains', studentGroup)
 *      "student_ids": ["student-mohammad-101"],  <-- Access permissions list
 *      "academic_citation": "كتاب الكيمياء للمرحلة الثانوية، وزارة التعليم، ص 88-104",
 *      "notes": "التركيز على ميكانيكية استبدال النيوكليوفيل",
 *      "tags": ["كيمياء", "كيمياء عضوية", "بجروت"],
 *      "created_at": "2026-09-03T07:00:00Z",
 *      "generated_materials": [ ... ]            <-- AI-generated plans, worksheets & exams
 *    }
 * 
 * 4. Collection: `students`
 *    Document ID: `{student_id}` (e.g., 'student-mohammad-101')
 *    {
 *      "name": "محمد أحمد",
 *      "grade": "الصف الثاني عشر",
 *      "group_ids": ["group-12-science-a"],
 *      "enrolled_courses": ["course-chem-bagrut-5", "course-bio-1"],
 *      "enrolled_subjects": ["كيمياء", "أحياء"]
 *    }
 */
