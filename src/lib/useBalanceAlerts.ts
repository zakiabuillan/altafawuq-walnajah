import { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, getDocFromCache, getDocsFromCache } from 'firebase/firestore';
import { Student, Teacher, Session, StudentCredit, isTrialSession } from '../types';
import { getStudentDefaultHourlyRate } from './sessionPricing';

export interface BalanceAlert {
  id: string; // studentId
  studentName: string;
  balance: number;
  threshold: number;
  totalSpent: number;
  totalToppedUp: number;
}

export function useBalanceAlerts() {
  const [alerts, setAlerts] = useState<BalanceAlert[]>([]);
  const [threshold, setThreshold] = useState<number>(-100);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAlertsData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch settings to get configurable threshold
      let settingsSnap;
      try {
        settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      } catch (e: any) {
        if (e.message?.includes('offline') || e.code === 'unavailable') {
          console.warn('System is offline. Safe-fetching balance alert settings from local cache...');
          try {
            settingsSnap = await getDocFromCache(doc(db, 'settings', 'global'));
          } catch (cacheErr) {
            console.warn('Failed to retrieve settings from offline cache', cacheErr);
          }
        } else {
          throw e;
        }
      }

      let currentThreshold = -100;
      let settingsData: any = null;
      if (settingsSnap && settingsSnap.exists()) {
        const data = settingsSnap.data();
        settingsData = data;
        if (typeof data.lowBalanceThreshold === 'number') {
          currentThreshold = data.lowBalanceThreshold;
        }
      }
      setThreshold(currentThreshold);

      // 2. Fetch students, sessions, credits, and teachers in parallel with offline fallback
      let studentsSnap, sessionsSnap, creditsSnap, teachersSnap;
      try {
        [studentsSnap, sessionsSnap, creditsSnap, teachersSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'sessions')),
          getDocs(collection(db, 'studentCredits')),
          getDocs(collection(db, 'teachers'))
        ]);
      } catch (e: any) {
        if (e.message?.includes('offline') || e.code === 'unavailable') {
          console.warn('System is offline. Safe-fetching student lists and sessions from local cache...');
          try {
            [studentsSnap, sessionsSnap, creditsSnap, teachersSnap] = await Promise.all([
              getDocsFromCache(collection(db, 'students')),
              getDocsFromCache(collection(db, 'sessions')),
              getDocsFromCache(collection(db, 'studentCredits')),
              getDocsFromCache(collection(db, 'teachers'))
            ]);
          } catch (cacheErr) {
            console.warn('Failed to retrieve student and session collections from offline cache', cacheErr);
          }
        } else {
          throw e;
        }
      }

      const studentsList = studentsSnap ? studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)) : [];
      const sessionsList = sessionsSnap ? sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session)) : [];
      const creditsList = creditsSnap ? creditsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentCredit)) : [];
      const teachersList = teachersSnap ? teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)) : [];

      const activeAlerts: BalanceAlert[] = [];

      for (const student of studentsList) {
        const studentSessions = sessionsList.filter(s => s.studentId === student.id);
        const studentCredits = creditsList.filter(c => c.studentId === student.id);

        const totalSpent = studentSessions.reduce((sum, s) => {
          if (isTrialSession(s)) return sum; // Trial sessions do NOT deduct from student balance!
          if (s.isGroupSession || (s as any).isGroup) {
            if (s.customFee !== undefined && s.customFee > 0) return sum + s.customFee;
            return sum;
          }
          if (s.customFee !== undefined) return sum + s.customFee;
          const teacher = teachersList.find(t => t.id === s.teacherId);
          const rate = getStudentDefaultHourlyRate(student, settingsData, teacher);
          return sum + (s.durationHours * rate);
        }, 0);

        const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
        const balance = totalToppedUp - totalSpent;

        const studentThreshold = typeof student.lowBalanceThreshold === 'number'
          ? student.lowBalanceThreshold
          : currentThreshold;

        // Balance alert triggered if balance is strictly below specified threshold
        if (balance < studentThreshold) {
          activeAlerts.push({
            id: student.id,
            studentName: student.name,
            balance,
            threshold: studentThreshold,
            totalSpent,
            totalToppedUp
          });
        }
      }

      setAlerts(activeAlerts);
    } catch (err) {
      console.error('Error fetching balance alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsData();

    // Set up brief intervals or rely on focus/render triggers
    const interval = setInterval(fetchAlertsData, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAlertsData]);

  return {
    alerts,
    threshold,
    isLoading,
    refresh: fetchAlertsData
  };
}
