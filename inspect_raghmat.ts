import { db } from './src/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function inspect() {
  const tSnap = await getDocs(collection(db, 'teachers'));
  const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const raghmat = teachers.filter((t: any) => (t.name || '').includes('رغمات'));
  console.log('Teachers found:', JSON.stringify(raghmat, null, 2));

  for (const t of raghmat) {
    const tId = t.id;
    console.log('--- Teacher:', t.name, 'id:', tId);

    const sSnap = await getDocs(collection(db, 'students'));
    const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const linkedStudents = allStudents.filter((s: any) => (s.teachers || []).includes(tId));
    console.log('Linked students count:', linkedStudents.length);
    for (const s of linkedStudents) {
      console.log('Student:', s.id, s.name, 'Grade:', s.grade, 'AcademicLevel:', s.academicLevel, 'PricingUnit:', s.preferredPricingUnit, 'System:', s.sessionSystem, 'CustomRates:', s.customRates, 'CustomPayout:', (s as any).customPayoutRates);
    }

    const aSnap = await getDocs(query(collection(db, 'assignments'), where('teacherId', '==', tId)));
    console.log('Assignments count:', aSnap.docs.length);
    aSnap.docs.forEach(d => console.log('Assignment:', d.id, d.data()));

    const sessSnap = await getDocs(query(collection(db, 'sessions'), where('teacherId', '==', tId)));
    console.log('Sessions count with this teacher:', sessSnap.docs.length);
    sessSnap.docs.forEach(d => {
      const data: any = d.data();
      const st = allStudents.find((s: any) => s.id === data.studentId);
      console.log('Session:', d.id, 'Student:', st?.name || data.studentId, 'Grade:', st?.grade || st?.academicLevel, 'Date:', data.date, 'DurationHours:', data.durationHours, 'PricingUnit:', data.pricingUnit, 'SessionCount:', data.sessionCount, 'CustomFee:', data.customFee, 'CustomPayout:', data.customPayout);
    });
  }
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
