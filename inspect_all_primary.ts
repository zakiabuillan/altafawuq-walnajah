import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAcademicStage } from './src/lib/sessionPricing';

async function checkPrimary() {
  const sSnap = await getDocs(collection(db, 'students'));
  const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log('=== ALL PRIMARY STUDENTS ===');
  for (const s of allStudents as any[]) {
    const stage = getAcademicStage(s.grade || s.academicLevel || '');
    if (stage === 'primary') {
      console.log({
        id: s.id,
        name: s.name,
        grade: s.grade || s.academicLevel,
        teachers: s.teachers,
        preferredPricingUnit: s.preferredPricingUnit,
        sessionSystem: s.sessionSystem,
        hourlyRate: s.hourlyRate,
        sessionRate: s.sessionRate,
        sessionPayoutTeacher: s.sessionPayoutTeacher,
        customRates: s.customRates,
        customPayoutRates: s.customPayoutRates
      });
    }
  }

  const sessSnap = await getDocs(collection(db, 'sessions'));
  const allSessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const raghmatSessions = allSessions.filter((s: any) => s.teacherId === 'COumz9DSWigtn4ePdJnI');
  console.log('=== RAGHMAT SESSIONS ===', raghmatSessions.length);
}

checkPrimary().then(() => process.exit(0)).catch(console.error);
