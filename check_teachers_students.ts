import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  const [sSnap, tSnap, assSnap, sessSnap] = await Promise.all([
    getDocs(collection(db, 'students')),
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'assignments')),
    getDocs(collection(db, 'sessions'))
  ]);

  const students = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const assignments = assSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const sessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  console.log('Total students:', students.length);
  console.log('Total teachers:', teachers.length);
  const trialsSnap = await getDocs(collection(db, 'trialLessons'));
  const trials = trialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const saifTrials = trials.filter(t => (t.studentName || '').includes('سيف') || (t.notes || '').includes('سيف') || t.studentPhone === '+972543666836');
  console.log('SAIF TRIALS:', JSON.stringify(saifTrials, null, 2));

  for (const t of teachers) {
    const directStudents = students.filter(s => s.teachers && s.teachers.includes(t.id));
    const assignmentStudents = students.filter(s => assignments.some(a => a.studentId === s.id && a.teacherId === t.id));
    const allLinked = students.filter(s => (s.teachers && s.teachers.includes(t.id)) || assignments.some(a => a.studentId === s.id && a.teacherId === t.id));
    
    // Check if Saif is in this teacher's list
    const hasSaif = allLinked.some(s => s.name?.includes('سيف'));
    console.log(`Teacher: ${t.name} (id: ${t.id}, username: ${t.username}) -> Direct: ${directStudents.length}, Ass: ${assignmentStudents.length}, TotalLinked: ${allLinked.length}, HasSaif: ${hasSaif}`);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
