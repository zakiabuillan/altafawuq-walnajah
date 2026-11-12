import { db } from './firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';

export interface StudentAccount {
  id: string; // Unique ID / Document ID
  studentId: string;
  name: string;
  username: string; // e.g. 'mohammad101'
  password: string; // e.g. 'Bio@2026'
  email: string;
  phone: string;
  grade: string; // الصف الدراسي (مثال: الثاني عشر توجيهي علمي)
  groupName: string; // المجموعة التعليمية (مثال: مجموعة التفوق للبجروت)
  academicId?: string; // الرقم الأكاديمي (اختياري)
  avatarUrl?: string; // الصورة أو الرمز الشخصي
  registeredSubjects: string[]; // المواد المسجل بها (بيولوجيا، كيمياء، فيزياء، رياضيات)
  isActive: boolean; // نشط أم معطل من قبل المدير
  isFirstLogin: boolean; // هل هو أول تسجيل دخول (يتطلب تغيير كلمة المرور وتحديث البيانات)
  termsAccepted: boolean; // الموافقة على سياسة الاستخدام
  createdAt: string;
  lastLogin?: string;
  completedLessonsCount: number;
  completedUnitsCount: number;
  averageGrade: number;
  notes?: string;
}

// Seed default initial accounts adhering strictly to the user specification
export const INITIAL_STUDENT_ACCOUNTS: StudentAccount[] = [
  {
    id: 'student-mohammad-101',
    studentId: 'student-mohammad-101',
    name: 'محمد أحمد',
    username: 'mohammad101',
    password: 'Bio@2026',
    email: 'mohammad.ahmed@altafawuq.edu',
    phone: '059-9123456',
    grade: 'الثاني عشر (توجيهي علمي)',
    groupName: 'مجموعة التفوق للبجروت',
    academicId: 'TAF-2026-101',
    avatarUrl: '👨‍🎓',
    registeredSubjects: ['بيولوجيا', 'كيمياء'],
    isActive: true,
    isFirstLogin: true, // Requires first login flow (password change + terms)
    termsAccepted: false,
    createdAt: '2026-09-01',
    completedLessonsCount: 4,
    completedUnitsCount: 1,
    averageGrade: 88,
    notes: 'طالب متفوق في مسار العلوم الطبية والبيولوجيا'
  },
  {
    id: 'student-sara-102',
    studentId: 'student-sara-102',
    name: 'سارة يوسف',
    username: 'sara2026',
    password: 'Bio@2026',
    email: 'sara.yousef@altafawuq.edu',
    phone: '059-9876543',
    grade: 'الثاني عشر (توجيهي علمي)',
    groupName: 'نخبة العلوم المتقدمة',
    academicId: 'TAF-2026-102',
    avatarUrl: '👩‍🎓',
    registeredSubjects: ['بيولوجيا', 'فيزياء', 'رياضيات'],
    isActive: true,
    isFirstLogin: false, // Already completed first login
    termsAccepted: true,
    createdAt: '2026-08-25',
    completedLessonsCount: 9,
    completedUnitsCount: 2,
    averageGrade: 94,
    notes: 'طالبة ملتزمة في مساقات البجروت المتقدمة'
  },
  {
    id: 'student-khalid-103',
    studentId: 'student-khalid-103',
    name: 'خالد ناصر',
    username: 'khalid103',
    password: 'Math@2026',
    email: 'khalid.nasser@altafawuq.edu',
    phone: '059-8112233',
    grade: 'الحادي عشر علمي',
    groupName: 'مجموعة التأسيس العلمي',
    academicId: 'TAF-2026-103',
    avatarUrl: '👨‍🔬',
    registeredSubjects: ['رياضيات', 'فيزياء'],
    isActive: true,
    isFirstLogin: true,
    termsAccepted: false,
    createdAt: '2026-09-02',
    completedLessonsCount: 2,
    completedUnitsCount: 0,
    averageGrade: 82,
    notes: 'يحتاج تركيز في التفاضل والميكانيكا'
  }
];

const LOCAL_STORAGE_KEY = 'altafawuq_student_accounts_v2';
const LOGGED_IN_STUDENT_KEY = 'academy_logged_in_student';

// Get all student accounts (sync with Firestore and fallback to localStorage/seed)
export async function getAllStudentAccounts(): Promise<StudentAccount[]> {
  try {
    const colRef = collection(db, 'studentAccounts');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const accounts: StudentAccount[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        accounts.push({
          id: docSnap.id,
          studentId: data.studentId || docSnap.id,
          name: data.name || data.studentName || 'طالب الأكاديمية',
          username: data.username || '',
          password: data.password || '',
          email: data.email || '',
          phone: data.phone || '',
          grade: data.grade || 'الثاني عشر (توجيهي علمي)',
          groupName: data.groupName || 'مجموعة التفوق للبجروت',
          academicId: data.academicId || '',
          avatarUrl: data.avatarUrl || '👨‍🎓',
          registeredSubjects: data.registeredSubjects || ['بيولوجيا', 'كيمياء'],
          isActive: data.isActive !== false,
          isFirstLogin: data.isFirstLogin === true,
          termsAccepted: data.termsAccepted !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          completedLessonsCount: data.completedLessonsCount || 4,
          completedUnitsCount: data.completedUnitsCount || 1,
          averageGrade: data.averageGrade || 88,
          notes: data.notes || ''
        } as StudentAccount);
      });
      // Update cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
      }
      return accounts;
    }
  } catch (err) {
    console.warn('Firestore offline or read error, using local fallback:', err);
  }

  // Fallback to local storage or defaults
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    // Seed initial
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_STUDENT_ACCOUNTS));
  }
  return INITIAL_STUDENT_ACCOUNTS;
}

// Authenticate student by username and password
export async function authenticateStudent(username: string, password: string): Promise<{
  success: boolean;
  student?: StudentAccount;
  error?: string;
}> {
  const normUsername = (username || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  const accounts = await getAllStudentAccounts();
  const found = accounts.find(acc => 
    (acc.username || '').trim().toLowerCase() === normUsername
  );

  if (!found) {
    return {
      success: false,
      error: 'اسم المستخدم غير مسجل في النظام. يرجى مراجعة إدارة المنصة للحصول على بيانات الدخول.'
    };
  }

  if (found.isActive === false) {
    return {
      success: false,
      error: 'عذراً، هذا الحساب معطل حالياً من قبل إدارة الأكاديمية. يرجى مراجعة مدير المنصة.'
    };
  }

  if (found.password !== trimmedPassword) {
    return {
      success: false,
      error: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور المعطاة لك أو مراجعة المدير.'
    };
  }

  // Update last login
  const updated = {
    ...found,
    lastLogin: new Date().toISOString()
  };
  await saveStudentAccount(updated);

  // Store in session
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOGGED_IN_STUDENT_KEY, JSON.stringify(updated));
    localStorage.setItem('academy_user_role', 'student');
  }

  return {
    success: true,
    student: updated
  };
}

// Save or update an account in Firestore and local storage
export async function saveStudentAccount(account: StudentAccount): Promise<void> {
  try {
    const docRef = doc(db, 'studentAccounts', account.id);
    await setDoc(docRef, account, { merge: true });
  } catch (err) {
    console.warn('Failed to save student account to Firestore:', err);
  }

  // Update local storage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let accounts: StudentAccount[] = cached ? JSON.parse(cached) : [...INITIAL_STUDENT_ACCOUNTS];
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));

    // Also update logged in student if this is the active user
    const current = getCurrentlyLoggedInStudent();
    if (current && current.id === account.id) {
      localStorage.setItem(LOGGED_IN_STUDENT_KEY, JSON.stringify(account));
    }
  }
}

// Delete student account
export async function deleteStudentAccount(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'studentAccounts', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete student account from Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      let accounts: StudentAccount[] = JSON.parse(cached);
      accounts = accounts.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
    }
  }
}

// Get logged-in student from session
export function getCurrentlyLoggedInStudent(): StudentAccount | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOGGED_IN_STUDENT_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

// Logout student
export function logoutStudent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOGGED_IN_STUDENT_KEY);
    localStorage.removeItem('academy_user_role');
  }
}

// Helper to transliterate an Arabic word into clean latin characters
function transliterateArabicWord(word: string): string {
  return (word || '')
    .toLowerCase()
    .replace(/[أإآا]/g, 'a')
    .replace(/[ب]/g, 'b')
    .replace(/[تط]/g, 't')
    .replace(/[ث]/g, 'th')
    .replace(/[ج]/g, 'j')
    .replace(/[ح]/g, 'h')
    .replace(/[خ]/g, 'kh')
    .replace(/[دض]/g, 'd')
    .replace(/[ذزظ]/g, 'z')
    .replace(/[ر]/g, 'r')
    .replace(/[س]/g, 's')
    .replace(/[ش]/g, 'sh')
    .replace(/[ص]/g, 's')
    .replace(/[ع]/g, 'a')
    .replace(/[غ]/g, 'gh')
    .replace(/[ف]/g, 'f')
    .replace(/[ق]/g, 'q')
    .replace(/[ك]/g, 'k')
    .replace(/[ل]/g, 'l')
    .replace(/[م]/g, 'm')
    .replace(/[ن]/g, 'n')
    .replace(/[هة]/g, 'h')
    .replace(/[و]/g, 'w')
    .replace(/[ي]/g, 'i')
    .replace(/[ى]/g, 'a')
    .replace(/[^a-z0-9]/g, '');
}

// Helper to generate a unique suggested username
export function generateSuggestedUsername(fullName: string, email?: string): string {
  if (email && email.includes('@')) {
    const emailPrefix = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (emailPrefix.length >= 3) {
      return emailPrefix;
    }
  }

  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  let prefix = '';
  if (parts.length >= 2) {
    const first = transliterateArabicWord(parts[0]);
    const second = transliterateArabicWord(parts[1]);
    prefix = `${first.slice(0, 5)}${second.slice(0, 1)}`;
  } else if (parts.length === 1) {
    prefix = transliterateArabicWord(parts[0]).slice(0, 6);
  }

  if (prefix.length < 3) {
    prefix = 'student';
  }

  const rand = Math.floor(100 + Math.random() * 900);
  return `${(prefix || 'student').toLowerCase()}${rand}`;
}

// Helper to generate initial password matching format (e.g. Bio@2026, Tafawuq#2026)
export function generateSuggestedPassword(subject: string = 'Bio'): string {
  const currentYear = new Date().getFullYear();
  const prefixes = ['Bio', 'Chem', 'Phys', 'Math', 'Tafawuq', 'Najah', 'Star'];
  const chosenPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const symbols = ['@', '#', '$', '!', '&'];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${chosenPrefix}${sym}${randNum}`;
}
