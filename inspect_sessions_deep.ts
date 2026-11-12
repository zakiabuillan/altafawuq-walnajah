import { db } from './src/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function deepInspect() {
  const sessSnap = await getDocs(collection(db, 'sessions'));
  console.log('Total sessions in DB:', sessSnap.docs.length);
  
  const sarahSessions = sessSnap.docs.filter(d => d.data().studentId === 'kzvywsbj7tiGMLIMW9w1');
  console.log('Sarah sessions:', sarahSessions.length);
  sarahSessions.forEach(d => console.log('Sarah session:', d.id, d.data()));

  const mohammadJH = sessSnap.docs.filter(d => d.data().studentId === 'oZkd0cgfeOad0WhH0l4k');
  console.log('Mohammad Jalal sessions:', mohammadJH.length);
  mohammadJH.forEach(d => console.log('Mohammad session:', d.id, d.data()));

  const tSnap = await getDocs(collection(db, 'teachers'));
  tSnap.docs.forEach(d => {
    const data = d.data();
    if ((data.name || '').includes('رغمات')) {
      console.log('Teacher doc:', d.id, data);
    }
  });

  const sSnap = await getDocs(collection(db, 'students'));
  sSnap.docs.forEach(d => {
    const data = d.data();
    if ((data.name || '').includes('ساره') || (data.name || '').includes('حليحل')) {
      console.log('Student doc:', d.id, data.name, 'balance:', data.balance, 'teachers:', data.teachers, 'pricingUnit:', data.preferredPricingUnit, 'system:', data.sessionSystem, 'sessionRate:', data.sessionRate, 'customRates:', data.customRates);
    }
  });
}

deepInspect().then(() => process.exit(0)).catch(console.error);
