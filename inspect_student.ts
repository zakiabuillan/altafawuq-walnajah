import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  const snap = await getDocs(collection(db, 'students'));
  const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const matched = students.filter(s => (s.name || '').includes('سيف') || (s.name || '').includes('الزرو'));
  console.log('MATCHED STUDENTS:', JSON.stringify(matched, null, 2));

  const assSnap = await getDocs(collection(db, 'assignments'));
  const assignments = assSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const matchedAss = assignments.filter(a => matched.some(m => m.id === a.studentId));
  console.log('MATCHED ASSIGNMENTS:', JSON.stringify(matchedAss, null, 2));

  const tSnap = await getDocs(collection(db, 'teachers'));
  const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('TEACHERS:', JSON.stringify(teachers.map(t => ({ id: t.id, name: t.name, email: t.email, username: t.username })), null, 2));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
