// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getDocsFromCache } from 'firebase/firestore';
import { Task, Student } from '../types';

export interface TaskAlert {
  id: string; // taskId
  title: string;
  studentName: string;
  expirationDate: string;
  daysRemaining: number;
}

export function useTaskAlerts() {
  const [taskAlerts, setTaskAlerts] = useState<TaskAlert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTaskAlertsData = useCallback(async () => {
    setIsLoading(true);
    try {
      let tasksSnap, studentsSnap;
      try {
        [tasksSnap, studentsSnap] = await Promise.all([
          getDocs(collection(db, 'tasks')),
          getDocs(collection(db, 'students'))
        ]);
      } catch (e: any) {
        if (e.message?.includes('offline') || e.code === 'unavailable') {
          console.warn('System is offline. Safe-fetching tasks from local cache...');
          try {
            [tasksSnap, studentsSnap] = await Promise.all([
              getDocsFromCache(collection(db, 'tasks')),
              getDocsFromCache(collection(db, 'students'))
            ]);
          } catch (cacheErr) {
            console.warn('Failed to retrieve tasks from offline cache', cacheErr);
          }
        } else {
          throw e;
        }
      }

      const tasksList = tasksSnap ? tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)) : [];
      const studentsList = studentsSnap ? studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)) : [];

      setTasks(tasksList);

      const activeAlerts: TaskAlert[] = [];
      const now = new Date();
      // Reset hours to start of day for comparison
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const task of tasksList) {
        if (task.completed) continue;

        // Parse expirationDate (format YYYY-MM-DD)
        const expParts = task.expirationDate.split('-');
        if (expParts.length !== 3) continue;

        const expYear = parseInt(expParts[0], 10);
        const expMonth = parseInt(expParts[1], 10) - 1; // 0-indexed
        const expDay = parseInt(expParts[2], 10);
        const expDate = new Date(expYear, expMonth, expDay);

        // Difference in milliseconds
        const diffTime = expDate.getTime() - todayStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Approaching expiration if it is due in 3 days or less (or overdue: diffDays < 0)
        if (diffDays <= 3) {
          const student = studentsList.find(s => s.id === task.studentId);
          activeAlerts.push({
            id: task.id,
            title: task.title,
            studentName: student ? student.name : 'طالب غير معروف',
            expirationDate: task.expirationDate,
            daysRemaining: diffDays
          });
        }
      }

      setTaskAlerts(activeAlerts);
    } catch (err) {
      console.error('Error fetching task alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskAlertsData();
    const interval = setInterval(fetchTaskAlertsData, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTaskAlertsData]);

  return {
    taskAlerts,
    tasks,
    isLoading,
    refresh: fetchTaskAlertsData
  };
}
