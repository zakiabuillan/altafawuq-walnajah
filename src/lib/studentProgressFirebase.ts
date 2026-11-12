import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { StudentUnitQuizResult } from '../components/edraak/types';

const LOCAL_STORAGE_KEY_PREFIX = 'edraak_student_progress_';

/**
 * Save quiz result to Firestore collection 'studentProgress'
 */
export async function saveStudentUnitQuizResult(
  result: StudentUnitQuizResult
): Promise<{ success: boolean; id: string; error?: string }> {
  const docId = result.id || `${result.studentId}_${result.unitId}`;
  const recordToSave: StudentUnitQuizResult = {
    ...result,
    id: docId,
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately cache in localStorage for instant offline access and preview reliability
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${result.studentId}`;
    const cachedRaw = localStorage.getItem(localKey);
    const cachedData: Record<string, StudentUnitQuizResult> = cachedRaw ? JSON.parse(cachedRaw) : {};
    cachedData[result.unitId] = recordToSave;
    localStorage.setItem(localKey, JSON.stringify(cachedData));
  } catch (err) {
    console.warn('[LOCAL STORAGE] Could not cache quiz progress locally:', err);
  }

  // 2. Persist to Firestore table 'studentProgress'
  try {
    const docRef = doc(db, 'studentProgress', docId);
    await setDoc(docRef, recordToSave, { merge: true });
    console.log(`[FIREBASE] Successfully saved unit quiz result to 'studentProgress/${docId}'`);
    return { success: true, id: docId };
  } catch (err: any) {
    console.error(`[FIREBASE ERROR] Failed to save quiz result to 'studentProgress/${docId}':`, err);
    // Even if Firestore encounters network issues, local storage saved it
    return { success: false, id: docId, error: err.message || 'فشل الاتصال بفايربيس' };
  }
}

/**
 * Load all quiz progress for a specific student from 'studentProgress'
 */
export async function fetchStudentQuizProgress(
  studentId: string
): Promise<Record<string, StudentUnitQuizResult>> {
  const results: Record<string, StudentUnitQuizResult> = {};

  // 1. First populate from localStorage
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${studentId}`;
    const cachedRaw = localStorage.getItem(localKey);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      Object.assign(results, parsed);
    }
  } catch (_) {}

  // 2. Fetch from Firestore 'studentProgress'
  try {
    const q = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', studentId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as StudentUnitQuizResult;
      if (data && data.unitId) {
        results[data.unitId] = data;
      }
    });

    // Update local storage with latest remote data
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(results));
    } catch (_) {}
  } catch (err: any) {
    console.warn(`[FIREBASE WARNING] Could not query 'studentProgress' for student ${studentId}:`, err);
  }

  return results;
}

/**
 * Real-time listener for student progress updates
 */
export function subscribeStudentQuizProgress(
  studentId: string,
  onUpdate: (results: Record<string, StudentUnitQuizResult>) => void
): () => void {
  try {
    const q = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', studentId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: Record<string, StudentUnitQuizResult> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StudentUnitQuizResult;
          if (data && data.unitId) {
            results[data.unitId] = data;
          }
        });

        // Sync to localStorage
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(results));
        } catch (_) {}

        onUpdate(results);
      },
      (error) => {
        console.warn(`[FIREBASE onSnapshot ERROR] 'studentProgress' listener error:`, error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[FIREBASE] Could not establish onSnapshot on studentProgress:', err);
    return () => {};
  }
}
