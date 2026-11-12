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
  const falastin = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).find(t => t.name.includes('فلسطين'));
  const assignments = assSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const sessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  const teachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const saif = students.find(s => s.name && s.name.includes('سيف'));
  console.log('SAIF STUDENT:', JSON.stringify(saif, null, 2));

  const saifAssignments = assignments.filter(a => a.studentId === saif?.id);
  console.log('SAIF ASSIGNMENTS:', JSON.stringify(saifAssignments, null, 2));

  // Check if any assignments point to Saif with studentName or something
  const saifAssignmentsByName = assignments.filter(a => a.studentName?.includes('سيف') || a.student?.name?.includes('سيف'));
  console.log('SAIF ASSIGNMENTS BY NAME:', JSON.stringify(saifAssignmentsByName, null, 2));

  // Check all assignments count and list
  console.log('TOTAL ASSIGNMENTS COUNT:', assignments.length);
  assignments.forEach(a => {
    const t = teachers.find(teach => teach.id === a.teacherId);
    const s = students.find(stud => stud.id === a.studentId);
    console.log(`Assignment: Teacher ${t?.name || a.teacherId} <-> Student ${s?.name || a.studentId}`);
  });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
