import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, User, Mail, Phone, 
  X, AlertCircle, Info, Coins, Users, UserCheck, UserMinus
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, StudentStatus, GroupCourse } from '../types';
import { formatWhatsAppPhone972, cleanLocalPhoneDigits } from '../lib/phoneUtils';
import { StudentCard } from './StudentCard';

interface StudentPlacementProps {
  students: Student[];
  courses: GroupCourse[];
  onAddStudent: (student: any) => void;
  onDeleteStudent: (id: string) => void;
  onAssignCourse: (studentId: string, courseId: string | undefined) => void;
  onUpdateFinancials: (studentId: string, balance: number, isOpenBalance: boolean) => void;
  onBookLesson: (studentId: string, courseTitle: string, cost: number) => void;
  onCancelLesson: (studentId: string, bookingId: string) => void;
}

export const StudentPlacement: React.FC<StudentPlacementProps> = ({
  students,
  courses,
  onAddStudent,
  onDeleteStudent,
  onAssignCourse,
  onUpdateFinancials,
  onBookLesson,
  onCancelLesson
}) => {
  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus>('ALL');
  const [financeFilter, setFinanceFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE' | 'ZERO'>('ALL');
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(-100);

  useEffect(() => {
    const fetchThreshold = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap && settingsSnap.exists()) {
          const sData = settingsSnap.data();
          if (typeof sData.lowBalanceThreshold === 'number') {
            setLowBalanceThreshold(sData.lowBalanceThreshold);
          }
        }
      } catch (error) {
        console.error('Error loading balance threshold settings in StudentPlacement:', error);
      }
    };
    fetchThreshold();
  }, []);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [academicLevel, setAcademicLevel] = useState('الصف الأول الابتدائي');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [notes, setNotes] = useState('');
  const [initialBalance, setInitialBalance] = useState('0'); // Manual Balance Input
  const [isOpenBalance, setIsOpenBalance] = useState(false); // Open Balance Toggle
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('الرجاء إدخال اسم الطالب');
      return;
    }
    const cleanPhoneDigits = cleanLocalPhoneDigits(phone);
    if (!cleanPhoneDigits) {
      setFormError('الرجاء إدخال رقم هاتف الطالب / الواتساب');
      return;
    }

    const fullFormattedPhone = formatWhatsAppPhone972(phone);

    onAddStudent({
      name,
      email: email || 'No Email',
      phone: fullFormattedPhone,
      academicLevel,
      grade: academicLevel,
      gender,
      notes,
      balance: Number(initialBalance) || 0,
      isOpenBalance
    });

    // Reset Form
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setInitialBalance('0');
    setIsOpenBalance(false);
    setFormError('');
    setShowAddForm(false);
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const q = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !q ||
                          (student.name || '').toLowerCase().includes(q) || 
                          (student.phone || '').includes(searchTerm || '') ||
                          (student.notes && student.notes.toLowerCase().includes(q));
    
    const matchesLevel = levelFilter === 'ALL' || student.academicLevel === levelFilter;
    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

    let matchesFinance = true;
    if (financeFilter === 'POSITIVE') {
      matchesFinance = student.balance > 0;
    } else if (financeFilter === 'NEGATIVE') {
      matchesFinance = student.balance < 0;
    } else if (financeFilter === 'ZERO') {
      matchesFinance = student.balance === 0;
    }

    return matchesSearch && matchesLevel && matchesStatus && matchesFinance;
  });

  const uniqueLevels = Array.from(new Set(students.map(s => s.academicLevel)));

  return (
    <div className="space-y-6">
      {/* Action Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-6 bg-teal-500 rounded-full inline-block"></span>
            لوحة تسجيل وتنسيب وتسيير مالية الطلاب
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            قم بإضافة الطلاب الجدد، وتعديل أرصدتهم المالية يدوياً، وحجز حصص المعلمين (رصيد سالب مسموح في حال الرصيد المفتوح).
          </p>
        </div>
        
        <button 
          id="toggle-add-student-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors duration-200 self-stretch md:self-auto justify-center"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          <span>{showAddForm ? 'إغلاق الاستمارة' : 'تسجيل طالب جديد'}</span>
        </button>
      </div>

      {/* Registration Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm"
          >
            <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-teal-600" />
              تعبئة بيانات الطالب الجديد والمالية المقررة
            </h3>

            {formError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2 mb-4 border border-rose-100">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">اسم الطالب الثنائي/الكامل *</label>
                <div className="relative">
                  <User size={15} className="absolute right-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="مروان أحمد، علي عيسى..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm py-2.5 pr-9 pl-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-right font-medium bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">رقم هاتف الطالب / الواتس آب *</label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                    المقدمة 972+ تلقائية 💬
                  </span>
                </div>
                <div className="relative flex items-center" dir="ltr">
                  <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-3 py-2.5 rounded-l-lg flex items-center gap-1.5 select-none shrink-0 shadow-inner">
                    <Phone size={13} className="text-emerald-600" />
                    <span>+972</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="50 123 4567"
                    value={phone}
                    onChange={(e) => {
                      const clean = cleanLocalPhoneDigits(e.target.value);
                      setPhone(clean);
                    }}
                    className="w-full text-sm py-2.5 px-3 rounded-r-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-left font-mono bg-slate-50/50 font-bold"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  * يتم ربط الرقم تلقائياً بالمقدمة الدولية (+972) لإرسال رسائل الواتس آب المباشرة
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">البريد الإلكتروني (اختياري)</label>
                <div className="relative">
                  <Mail size={15} className="absolute right-3 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm py-2.5 pr-9 pl-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-left font-mono bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">صف الطالب الدراسي</label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full text-sm py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50/50 font-medium"
                >
                  <option value="">-- اختر الصف الدراسي --</option>
                  <optgroup label="مرحلة الطفولة المبكرة">
                    <option value="روضة (جيل 3 - 4 سنوات)">روضة (جيل 3 - 4 سنوات)</option>
                    <option value="بستان / تمهيدي (جيل 5 - 6 سنوات)">بستان / تمهيدي (جيل 5 - 6 سنوات)</option>
                  </optgroup>
                  <optgroup label="المرحلة الابتدائية">
                    <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                    <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                    <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                    <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                    <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                    <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  </optgroup>
                  <optgroup label="المرحلة الإعدادية">
                    <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                    <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                    <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                  </optgroup>
                  <optgroup label="المرحلة الثانوية والبجروت">
                    <option value="الصف العاشر">الصف العاشر</option>
                    <option value="الصف الحادي عشر - مسار البجروت">الصف الحادي عشر - مسار البجروت</option>
                    <option value="الصف الحادي عشر - تخصص علمي (4/5 وحدات)">الصف الحادي عشر - تخصص علمي (4/5 وحدات)</option>
                    <option value="الصف الحادي عشر - تخصص أدبي / إنساني">الصف الحادي عشر - تخصص أدبي / إنساني</option>
                    <option value="الصف الثاني عشر - مسار البجروت">الصف الثاني عشر - مسار البجروت</option>
                    <option value="الصف الثاني عشر - تخصص علمي (4/5 وحدات)">الصف الثاني عشر - تخصص علمي (4/5 وحدات)</option>
                    <option value="الصف الثاني عشر - تخصص أدبي / إنساني">الصف الثاني عشر - تخصص أدبي / إنساني</option>
                  </optgroup>
                  <optgroup label="مسارات تقوية وتأهيل مخصصة">
                    <option value="دورة تحضيرية للبجروت (بكافة الوحدات)">دورة تحضيرية للبجروت (بكافة الوحدات)</option>
                    <option value="دورة بسيخومتري / ياعيل">دورة بسيخومتري / ياعيل</option>
                    <option value="تعليم أكاديمي / جامعي">تعليم أكاديمي / جامعي</option>
                    <option value="تقوية لغة عبرية (محادثة وكتابة)">تقوية لغة عبرية (محادثة وكتابة)</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">الجنس</label>
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setGender('Male')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      gender === 'Male'
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ذكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Female')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      gender === 'Female'
                        ? 'border-pink-500 bg-pink-50/50 text-pink-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    أنثى
                  </button>
                </div>
              </div>

              {/* Manual balance input field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Coins size={14} className="text-teal-600" />
                  شحن رصيد مالي مبدئي يدوياً (شيكل ₪)
                </label>
                <input
                  type="number"
                  placeholder="أدخل الرصيد يدوياً، مثال: 100"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full text-sm py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 font-mono text-left bg-teal-50/10"
                />
              </div>

              {/* Open Balance Choice Toggle */}
              <div className="flex flex-col gap-1 p-3 bg-amber-50/35 border border-amber-200/50 rounded-lg">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertCircle size={13} />
                  خيار الرصيد مفتوح (الدفع لاحقاً):
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="isOpenBalanceFormToggle"
                    checked={isOpenBalance}
                    onChange={(e) => setIsOpenBalance(e.target.checked)}
                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="isOpenBalanceFormToggle" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                    فتح الرصيد (يسمح بالسالب للمعلمين)
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">ملاحظات إضافية (أوقات الدوام، ملاحظات الأهل)</label>
                <textarea
                  placeholder="يفضل الفترة الدوام المسائية فقط / يرغب في التسجيل مع شقيقه..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 text-right bg-slate-50/50"
                  rows={2}
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 border-t border-slate-50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-100 text-xs font-bold rounded-lg transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-all hover:shadow-sm"
                >
                  تأكيد وحفظ الطالب والمالية
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Search & Visual Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن طالب باسمه، أو ملاحظاته، أو هاتفه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm py-2.5 pr-9 pl-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="w-full lg:w-44">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full text-sm py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-white font-medium"
            >
              <option value="ALL">جميع صفوف الطلاب</option>
              {uniqueLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Finance Filter Dropdown */}
          <div className="w-full lg:w-60">
            <select
              value={financeFilter}
              onChange={(e) => setFinanceFilter(e.target.value as any)}
              className="w-full text-sm py-2.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 bg-white font-medium text-slate-700"
            >
              <option value="ALL">جميع الحالات المالية ({students.length})</option>
              <option value="POSITIVE">أرصدة موجبة (+) ({students.filter(s => s.balance > 0).length} طالب)</option>
              <option value="NEGATIVE">أرصدة سالبة / ديون (-) ({students.filter(s => s.balance < 0).length} طالب)</option>
              <option value="ZERO">أرصدة متوازنة (0 ₪) ({students.filter(s => s.balance === 0).length} طالب)</option>
            </select>
          </div>

          {/* Status Tab buttons */}
          <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-150 self-stretch">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={13} className="shrink-0" />
              <span>الكل ({students.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter(StudentStatus.Unassigned)}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === StudentStatus.Unassigned
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-amber-500'
              }`}
            >
              <UserMinus size={13} className="shrink-0" />
              <span>غير منسّب ({students.filter(s => s.status === StudentStatus.Unassigned).length})</span>
            </button>
            <button
              onClick={() => setStatusFilter(StudentStatus.Assigned)}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === StudentStatus.Assigned
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-teal-600'
              }`}
            >
              <UserCheck size={13} className="shrink-0" />
              <span>تم تنسيبه ({students.filter(s => s.status === StudentStatus.Assigned).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Collection Board (اظهر الطلبة بهذا الشكل لتنسيبهم والتحكم في مالياتهم) */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-250 py-10 text-center rounded-xl">
          <Info size={32} className="text-slate-350 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-600">لا يوجد طلاب يطابقون خيارات التصفية</h4>
          <p className="text-xs text-slate-400 mt-1">قم بتغيير الكلمات المفتاحية في شريط البحث أو إدخال طالب جديد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              courses={courses}
              onDeleteStudent={onDeleteStudent}
              onAssignCourse={onAssignCourse}
              onUpdateFinancials={onUpdateFinancials}
              onBookLesson={onBookLesson}
              onCancelLesson={onCancelLesson}
              lowBalanceThreshold={lowBalanceThreshold}
            />
          ))}
        </div>
      )}
    </div>
  );
};
