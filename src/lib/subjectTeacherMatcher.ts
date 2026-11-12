import { Teacher } from '../types';

/**
 * Normalizes Arabic text for flexible matching:
 * - Lowercase
 * - Strips tashkeel (diacritics)
 * - Normalizes alef forms (أ, إ, آ -> ا)
 * - Normalizes yaa (ى -> ي)
 * - Normalizes taa marbouta (ة -> ه)
 * - Collapses spaces
 */
export const normalizeArabicSubjectText = (text: string = ''): string => {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove harakat / tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\(\)\[\]\{\}\-\–\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Checks if a teacher teaches a given subject based on:
 * 1. teacher.specialization
 * 2. teacher.subjects list
 */
export const isTeacherTeachingSubject = (teacher: Teacher, targetSubject: string): boolean => {
  if (!targetSubject || !targetSubject.trim()) {
    return true; // No subject filter specified
  }

  const normTarget = normalizeArabicSubjectText(targetSubject);
  if (!normTarget) return true;

  // Gather all texts from teacher
  const teacherTexts: string[] = [];
  if (teacher.specialization && typeof teacher.specialization === 'string') {
    teacherTexts.push(teacher.specialization);
  }
  if (Array.isArray(teacher.subjects)) {
    teacher.subjects.forEach(s => {
      if (s && typeof s === 'string') {
        teacherTexts.push(s);
      }
    });
  }

  if (teacherTexts.length === 0) {
    return false;
  }

  // Pre-process target subject
  // Strip common prefix words like "مادة", "اللغة", "لغة", "علم", "مسار"
  const cleanTarget = normTarget
    .replace(/^(ماده|اللغه|لغه|علم)\s+/i, '')
    .trim();
  const targetWithoutAl = cleanTarget.startsWith('ال') ? cleanTarget.substring(2) : cleanTarget;

  // Synonyms and root keyword associations
  const subjectKeywordMap: { patterns: string[]; keywords: string[] }[] = [
    {
      patterns: ['رياض', 'math', 'حساب', 'جبر', 'هندس'],
      keywords: ['رياض', 'math', 'حساب', 'جبر', 'هندس']
    },
    {
      patterns: ['فيزيا', 'physics'],
      keywords: ['فيزيا', 'physics']
    },
    {
      patterns: ['كيميا', 'chem'],
      keywords: ['كيميا', 'chem']
    },
    {
      patterns: ['احيا', 'بيولوج', 'bio', 'علوم حياه'],
      keywords: ['احيا', 'بيولوج', 'bio', 'علوم حياه']
    },
    {
      patterns: ['انجليز', 'english', 'انجلش'],
      keywords: ['انجليز', 'english', 'انجلش']
    },
    {
      patterns: ['عرب', 'لغه عربيه', 'ادب عربي', 'قواعد عربي'],
      keywords: ['عرب']
    },
    {
      patterns: ['عبر', 'hebrew'],
      keywords: ['عبر', 'hebrew']
    },
    {
      patterns: ['حاسوب', 'كمبيوتر', 'برمج', 'computer', 'it', 'تطوير'],
      keywords: ['حاسوب', 'كمبيوتر', 'برمج', 'computer', 'it', 'تطوير']
    },
    {
      patterns: ['تاريخ', 'history'],
      keywords: ['تاريخ', 'history']
    },
    {
      patterns: ['مدنيات', 'civics'],
      keywords: ['مدنيات', 'civics']
    },
    {
      patterns: ['جغرافيا', 'geography'],
      keywords: ['جغرافيا', 'geography']
    },
    {
      patterns: ['تاسيس', 'روضه', 'بستان', 'ابتدائي عام'],
      keywords: ['تاسيس', 'روضه', 'بستان', 'ابتدائي', 'طفول']
    },
    {
      patterns: ['علوم', 'science'],
      keywords: ['علوم', 'science', 'علمي']
    }
  ];

  // Find relevant pattern groups for the target subject
  const matchingGroups = subjectKeywordMap.filter(group => 
    group.patterns.some(p => normTarget.includes(p) || cleanTarget.includes(p) || targetWithoutAl.includes(p))
  );

  for (const rawText of teacherTexts) {
    const normTeacher = normalizeArabicSubjectText(rawText);
    if (!normTeacher) continue;

    // Check if teacher is universal / all subjects
    if (
      normTeacher === 'عام' ||
      normTeacher.includes('كافه المواد') ||
      normTeacher.includes('جميع المواد') ||
      normTeacher.includes('معلم شامل')
    ) {
      return true;
    }

    // Direct containment
    if (normTeacher.includes(normTarget) || normTarget.includes(normTeacher)) {
      return true;
    }

    if (cleanTarget && (normTeacher.includes(cleanTarget) || cleanTarget.includes(normTeacher))) {
      return true;
    }

    // Root without "ال"
    if (targetWithoutAl && targetWithoutAl.length >= 3) {
      if (normTeacher.includes(targetWithoutAl)) {
        return true;
      }
      
      // Token-level check
      const tokens = normTeacher.split(/[\s,،\/]+/);
      for (const tok of tokens) {
        const tokWithoutAl = tok.startsWith('ال') ? tok.substring(2) : tok;
        if (tokWithoutAl === targetWithoutAl) {
          return true;
        }
      }
    }

    // Keyword pattern matching (e.g. رياضيات vs معلم رياضيات)
    for (const group of matchingGroups) {
      if (group.keywords.some(k => normTeacher.includes(k))) {
        // Special case: Arabic vs Hebrew distinction
        if (group.keywords.includes('عرب') && normTeacher.includes('عبر')) {
          continue; // Don't match Hebrew for Arabic
        }
        return true;
      }
    }
  }

  return false;
};

/**
 * Filter a list of teachers to only those who teach the given subject.
 */
export const filterTeachersBySubject = (teachers: Teacher[], subject: string): Teacher[] => {
  if (!subject || !subject.trim()) {
    return teachers;
  }
  return teachers.filter(t => isTeacherTeachingSubject(t, subject));
};
