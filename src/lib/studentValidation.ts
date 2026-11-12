import { cleanLocalPhoneDigits, formatWhatsAppPhone972 } from './phoneUtils';
import { Student } from '../types';

/**
 * Normalizes Arabic text for strict deduplication:
 * - Removes tashkeel / diacritics
 * - Normalizes alef variations (أ, إ, آ, ٱ -> ا)
 * - Normalizes taa marbuta (ة -> ه)
 * - Normalizes alif maqsura (ى -> ي)
 * - Normalizes hamzas (ؤ -> و, ئ -> ي)
 * - Collapses consecutive spaces
 */
export function normalizeArabicName(input: string = ''): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Alif Maqsura
    .replace(/ى/g, 'ي')
    // Normalize Hamza variants
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Collapse all whitespace into a single space
    .replace(/\s+/g, ' ');
}

/**
 * Checks if two student records have matching name AND matching phone number.
 */
export function areStudentsDuplicate(
  nameA: string = '',
  phoneA: string = '',
  nameB: string = '',
  phoneB: string = ''
): boolean {
  const normNameA = normalizeArabicName(nameA);
  const normNameB = normalizeArabicName(nameB);

  if (!normNameA || !normNameB) return false;
  if (normNameA !== normNameB) return false;

  const cleanPhoneA = cleanLocalPhoneDigits(phoneA);
  const cleanPhoneB = cleanLocalPhoneDigits(phoneB);

  // If both have phone numbers, compare normalized digits
  if (cleanPhoneA && cleanPhoneB) {
    return cleanPhoneA === cleanPhoneB;
  }

  // If both have no phone number, but identical name
  return false;
}

/**
 * Searches an array of existing students to find if a student with the same
 * normalized name AND matching phone number already exists.
 */
export function findDuplicateStudent<T extends { id?: string; name?: string; phone?: string; grade?: string }>(
  candidateName: string,
  candidatePhone: string,
  existingStudents: T[],
  excludeId?: string
): T | undefined {
  const normCandidateName = normalizeArabicName(candidateName);
  const cleanCandidatePhone = cleanLocalPhoneDigits(candidatePhone);

  if (!normCandidateName || !cleanCandidatePhone) {
    return undefined;
  }

  return existingStudents.find((st) => {
    if (excludeId && st.id === excludeId) return false;
    const normStName = normalizeArabicName(st.name || '');
    const cleanStPhone = cleanLocalPhoneDigits(st.phone || '');

    return normStName === normCandidateName && cleanStPhone === cleanCandidatePhone;
  });
}

/**
 * Group all students in the database by identical normalized (name + phone)
 * to detect any pre-existing duplicates that need merging/cleaning.
 */
export interface DuplicateStudentGroup {
  key: string;
  normalizedName: string;
  cleanPhone: string;
  primaryStudent: Student;
  duplicateStudents: Student[];
  allStudents: Student[];
}

export function detectDuplicateStudentGroups(students: Student[]): DuplicateStudentGroup[] {
  const map = new Map<string, Student[]>();

  for (const st of students) {
    const normName = normalizeArabicName(st.name || '');
    const cleanPhone = cleanLocalPhoneDigits(st.phone || '');
    if (!normName || !cleanPhone || cleanPhone.length < 5) continue;

    const key = `${normName}___${cleanPhone}`;
    const list = map.get(key) || [];
    list.push(st);
    map.set(key, list);
  }

  const groups: DuplicateStudentGroup[] = [];

  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      // Pick the best primary student:
      // Priority 1: Student with active financial balance or more sessions/assigned teachers
      // Priority 2: Student with oldest registration or highest balance
      const sorted = [...list].sort((a, b) => {
        const balA = Math.abs(a.balance || 0);
        const balB = Math.abs(b.balance || 0);
        if (balA !== balB) return balB - balA;
        const teachersCountA = (a.teachers || []).length;
        const teachersCountB = (b.teachers || []).length;
        if (teachersCountA !== teachersCountB) return teachersCountB - teachersCountA;
        return (a.registrationDate || '').localeCompare(b.registrationDate || '');
      });

      const primary = sorted[0];
      const duplicates = sorted.slice(1);
      const [normName, cleanPhone] = key.split('___');

      groups.push({
        key,
        normalizedName: normName,
        cleanPhone,
        primaryStudent: primary,
        duplicateStudents: duplicates,
        allStudents: list
      });
    }
  }

  return groups;
}
