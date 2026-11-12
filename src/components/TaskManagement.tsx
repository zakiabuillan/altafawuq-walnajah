// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Task, Student, Teacher, formatCustomDate } from '../types';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Calendar, 
  GraduationCap, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Check, 
  X, 
  Search, 
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logActivity } from '../lib/activityLogger';

interface TaskManagementProps {
  currentTeacherId?: string; // Optional: if provided, filters/creates for this teacher
  allowedStudents?: Student[];
  showDelete?: boolean;
}

export default function TaskManagement({ currentTeacherId, allowedStudents, showDelete = false }: TaskManagementProps = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  
  const displayStudents = allowedStudents || students;
  
  // Real-time student balance and consumption calculation
  const getSelectedStudentMetrics = (sId: string) => {
    if (!sId) return null;
    const student = students.find(s => s.id === sId);
    if (!student) return null;

    const studentSessions = sessions.filter(s => s.studentId === sId);
    const studentCredits = credits.filter(c => c.studentId === sId);

    // Filter teacher based on prop, or if missing we can use the student's first teacher
    const teacherId = currentTeacherId || student.teachers?.[0] || '';
    const activeTeacher = teachers.find(t => t.id === teacherId) || teachers[0];

    const totalSpent = studentSessions.reduce((sum, s) => {
      if (s.customFee !== undefined) return sum + s.customFee;
      const t = teachers.find(teacher => teacher.id === s.teacherId);
      const rate = student.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student.hourlyRate ? student.hourlyRate : (t?.billingRate || t?.hourlyRate || 0));
      return sum + (s.durationHours * rate);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
    const balance = totalToppedUp - totalSpent;

    const rate = activeTeacher && student.customRates?.[activeTeacher.id] !== undefined
      ? student.customRates[activeTeacher.id]
      : (student.hourlyRate ? student.hourlyRate : (activeTeacher ? (activeTeacher.billingRate || activeTeacher.hourlyRate || 0) : 0));

    const totalHoursToppedUp = rate > 0 ? (totalToppedUp / rate) : 0;
    const hoursConsumed = rate > 0 ? (totalSpent / rate) : 0;
    const hoursRemaining = rate > 0 ? (balance / rate) : 0;

    const consumptionPercent = totalToppedUp > 0 
      ? Math.min(100, Math.max(0, (totalSpent / totalToppedUp) * 100))
      : (balance < 0 ? 100 : 0);

    return {
      balance,
      totalToppedUp,
      totalSpent,
      rate,
      totalHoursToppedUp,
      hoursConsumed,
      hoursRemaining,
      consumptionPercent,
      isOpenBalance: student.isOpenBalance
    };
  };
  
  // Loading & Submission State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [expirationDate, setExpirationDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 2 days from now
  );

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'approaching' | 'not-started'>('all');
  const [studentFilter, setStudentFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [currentTeacherId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tSnap, sSnap, tkSnap, sessSnap, credSnap] = await Promise.all([
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'tasks')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits'))
      ]);

      const loadedTeachers = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      const loadedStudents = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      const loadedTasks = tkSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      const loadedSessions = sessSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const loadedCredits = credSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setTeachers(loadedTeachers);
      setStudents(loadedStudents);
      setSessions(loadedSessions);
      setCredits(loadedCredits);

      // If rendering for a specific teacher, we can filter or let list show relevant tasks
      setTasks(loadedTasks);
    } catch (error) {
      console.error("Error fetching tasks/students/sessions/credits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !studentId || !expirationDate) return;

    setIsSubmitting(true);
    try {
      const newTask = {
        title: title.trim(),
        description: description.trim(),
        studentId,
        teacherId: currentTeacherId || '',
        expirationDate,
        completed: false,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      
      // Update local state
      setTasks(prev => [{ id: docRef.id, ...newTask }, ...prev]);
      
      setTitle('');
      setDescription('');
      // Keep student selected or reset
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const nextCompleted = !task.completed;
      
      await updateDoc(taskRef, {
        completed: nextCompleted
      });

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const password = window.prompt('صلاحية أمنية فائقة: يرجى إدخال الرمز السري لمدير المنصة لتأكيد عملية حذف المهمة بالكامل:');
    if (password !== '10020030') {
      window.alert('عذراً، تفعيل الحذف مسموح به لمدير المنصة فقط!');
      return;
    }
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه المهمة نهائياً؟')) return;
    try {
      const targetTask = tasks.find(t => t.id === id);
      const taskTitle = targetTask ? targetTask.title : 'مهمة غير معروفة';
      const studentObj = students.find(s => s.id === (targetTask ? targetTask.studentId : ''));
      const studentName = studentObj ? studentObj.name : '';

      await deleteDoc(doc(db, 'tasks', id));
      setTasks(prev => prev.filter(t => t.id !== id));

      await logActivity({
        actionType: 'DELETE_TASK',
        actionName: 'حذف مهمة نهائياً',
        details: `حذف مهمة نهائياً بعنوان: "${taskTitle}" ${studentName ? `الخاصة بالطالب: "${studentName}"` : ''} (معرّف المهمة المحذوفة: ${id})`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  // Helper to determine status and remaining days
  const getTaskStatusMetrics = (task: Task) => {
    if (task.completed) {
      return { label: 'مكتملة', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', days: 0 };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const expParts = task.expirationDate.split('-');
    if (expParts.length !== 3) {
      return { label: 'نشطة', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', days: 99 };
    }

    const expYear = parseInt(expParts[0], 10);
    const expMonth = parseInt(expParts[1], 10) - 1;
    const expDay = parseInt(expParts[2], 10);
    const expDate = new Date(expYear, expMonth, expDay);

    const diffTime = expDate.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (!task.started && !task.submitted) {
      return { label: 'لم تبدأ بعد ⏳', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', days: diffDays };
    }

    if (diffDays < 0) {
      return { label: 'متأخرة / منتهية الصلاحية', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', days: diffDays };
    } else if (diffDays === 0) {
      return { label: 'تستحق اليوم ⚠️', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse', days: 0 };
    } else if (diffDays <= 3) {
      return { label: `مستحقة قريباً (خلال ${diffDays} أيام) ⏳`, color: 'bg-amber-500/10 text-[#D4A33C] border-[#D4A33C]/20', days: diffDays };
    } else {
      return { label: `نشطة (متبقي ${diffDays} يوم)`, color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', days: diffDays };
    }
  };

  // Filter processes
  const filteredTasks = tasks.filter(t => {
    // 1. Teacher Filter (if teacher dashboard context)
    if (currentTeacherId && t.teacherId && t.teacherId !== currentTeacherId) {
      // Show if student is linked to this teacher OR if teacher created it
      const student = students.find(s => s.id === t.studentId);
      const isLinkedStudent = student && student.teachers && student.teachers.includes(currentTeacherId);
      if (!isLinkedStudent && t.teacherId !== currentTeacherId) {
        return false;
      }
    }

    // 2. Search Query filter
    const searchLower = (searchQuery || '').toLowerCase();
    const matchesSearch = (t.title || '').toLowerCase().includes(searchLower) || 
      (t.description || '').toLowerCase().includes(searchLower);

    // 3. Status filter
    let matchesStatus = true;
    const metrics = getTaskStatusMetrics(t);
    if (statusFilter === 'completed') {
      matchesStatus = t.completed;
    } else if (statusFilter === 'pending') {
      matchesStatus = !t.completed;
    } else if (statusFilter === 'not-started') {
      matchesStatus = !t.completed && !t.submitted && !t.started;
    } else if (statusFilter === 'approaching') {
      matchesStatus = !t.completed && metrics.days <= 3;
    }

    // 4. Student Filter
    let matchesStudent = true;
    if (studentFilter !== 'all') {
      matchesStudent = t.studentId === studentFilter;
    }

    return matchesSearch && matchesStatus && matchesStudent;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right" dir="rtl">
      
      {/* Right Column: Add Task Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#D4A33C]/5 rounded-full blur-3xl -ml-24 -mt-24" />
          
          {/* Subtle Gradient Overlay at the bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none z-10 rounded-b-[2rem]" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 leading-tight">إنشاء مهمة دراسية جديدة</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">إسناد وظائف منزلية بمهلة زمنية محدودة للطلاب</p>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-bold">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-black mr-1 flex items-center gap-1.5">
                  <CheckSquare size={12} className="text-[#D4A33C]" />
                  عنوان المهمة
                </label>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: حل صفحة 45 من كتاب الجبر"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold placeholder-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-black mr-1 flex items-center gap-1.5">
                  <FileText size={12} className="text-[#D4A33C]" />
                  وصف المهمة (اختياري)
                </label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="اكتب توجيهات إضافية للطالب لمساعدته في الفهم والاستعداد المتكامل..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold placeholder-slate-300 resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-black mr-1 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-[#D4A33C]" />
                  الطالب المستهدف
                </label>
                <select 
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="">-- اختر الطالب --</option>
                  {displayStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {studentId && (() => {
                  const metrics = getSelectedStudentMetrics(studentId);
                  if (!metrics) return null;
                  const { 
                    balance, 
                    totalToppedUp, 
                    totalSpent, 
                    rate, 
                    totalHoursToppedUp, 
                    hoursConsumed, 
                    hoursRemaining, 
                    consumptionPercent,
                    isOpenBalance 
                  } = metrics;

                  const isLow = hoursRemaining <= 2 && !isOpenBalance;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-4.5 rounded-2xl border-2 transition-all space-y-3 mt-2 ${
                        isLow 
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-xs font-black">حالة رصيد الطالب المالي</span>
                        </div>
                        <span className="text-[10px] font-black bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md">
                          السعر: {rate} ₪/ساعة
                        </span>
                      </div>

                      {/* Progress Bar Display */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-black">
                          <span>الاستهلاك البصري: <strong className={consumptionPercent > 80 ? 'text-rose-700 font-black' : 'text-slate-950 font-black'}>{consumptionPercent.toFixed(1)}%</strong></span>
                          <span>إجمالي المشحون: <strong className="text-slate-950 font-black">{totalHoursToppedUp.toFixed(1)} س</strong></span>
                        </div>

                        {/* Bar track */}
                        <div className="w-full h-3 bg-slate-200 border border-slate-300 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              consumptionPercent >= 90 ? 'bg-rose-600 shadow-sm' :
                              consumptionPercent >= 70 ? 'bg-amber-500 shadow-sm' :
                              'bg-emerald-600 shadow-sm'
                            }`}
                            style={{ width: `${consumptionPercent}%` }}
                          />
                        </div>

                        {/* Micro breakdown labels */}
                        <div className="flex justify-between items-center text-[10px] text-slate-800 font-black">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>المستهلك: <strong>{hoursConsumed.toFixed(1)} س</strong> ({totalSpent.toFixed(0)} ₪)</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A33C]" />
                            <span>المتبقي: <strong className={isLow ? 'text-rose-700 font-black' : 'text-emerald-700 font-black'}>{hoursRemaining.toFixed(1)} س</strong> ({balance.toFixed(0)} ₪)</span>
                          </span>
                        </div>
                      </div>

                      {isLow && (
                        <p className="text-[10px] leading-tight text-rose-600 font-black flex items-center gap-1 animate-pulse">
                          ⚠️ رصيد الطالب من الساعات منخفض جداً أو منتهي! يرجى إخطار الأهل للتعبئة.
                        </p>
                      )}
                    </motion.div>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-black mr-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#D4A33C]" />
                  تاريخ انتهاء الصلاحية وتسليم الواجب
                </label>
                <input 
                  type="date"
                  required
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold"
                />
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>تم إسناد المهمة التعليمية للطالب بنجاح! 🚀</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#D4A33C] hover:bg-amber-600 text-slate-950 font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-4 cursor-pointer select-none"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'إضافة وتعميم المهمة ⚡'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Left Column: Filter and Tasks Grid */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-none">سجل ومتابعة المهام التعليمية</h3>
              <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">تتبع تقدم أداء الواجبات المنزلية والتواريخ الزمنية للاستحقاق</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-500/10 text-[#D4A33C] border border-[#D4A33C]/20 px-3 py-1 rounded-lg font-black">
                {filteredTasks.length} مهام دراسية
              </span>
            </div>
          </div>

          {/* Search, Status and Student Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={14} />
              </span>
              <input 
                type="text"
                placeholder="ابحث بالعنوان أو الوصف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] transition-all"
              />
            </div>

            <div className="relative">
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">فلتر حسب الحالة: الكل</option>
                <option value="pending">المعلّقة والنشطة فقط</option>
                <option value="not-started">المهام التي لم تبدأ بعد ⏳</option>
                <option value="approaching">المستحقة قريباً (3 أيام أو أقل) ⏳</option>
                <option value="completed">المكتملة بنجاح 🏆</option>
              </select>
            </div>

            <div className="relative">
              <select 
                value={studentFilter}
                onChange={e => setStudentFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">فلتر حسب الطالب: الكل</option>
                {displayStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Cards Grid */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-xs font-black">جاري تحميل سجل المهام المحدثة...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <CheckSquare className="text-slate-300 mx-auto mb-3" size={40} />
              <p className="text-sm font-black text-slate-700">لا توجد أي مهام دراسية تطابق خيارات التصفية الحالية</p>
              <p className="text-xs text-slate-450 mt-1">تستطيع البدء بإعداد أو إسناد مهام جديدة للطلاب من اللوحة الجانبية</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((t, index) => {
                  const student = students.find(s => s.id === t.studentId);
                  const teacher = teachers.find(teach => teach.id === t.teacherId);
                  const metrics = getTaskStatusMetrics(t);
                  
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{ contentVisibility: 'auto' }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.4) }}
                      className={`p-5 rounded-2xl border transition-all text-right flex flex-col justify-between gap-4 ${
                        t.completed 
                          ? 'bg-slate-50/50 border-slate-100 text-slate-500' 
                          : 'bg-white border-slate-200/80 hover:border-[#D4A33C]/40 hover:shadow-lg hover:shadow-slate-100'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Upper row: Student name & Status badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1">
                            <GraduationCap size={12} className="text-[#D4A33C]" />
                            {student ? student.name : 'طالب غير معروف'}
                          </span>
                          
                          <span className={`text-[9px] font-black border px-2.5 py-1 rounded-md shrink-0 ${metrics.color}`}>
                            {metrics.label}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h5 className={`text-sm font-black tracking-tight ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {t.title}
                          </h5>
                          {t.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-1.5 whitespace-pre-wrap">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Footer */}
                      <div className="flex items-center justify-between border-t border-slate-100/70 pt-3 mt-1.5 text-[10px] text-slate-400 font-bold">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-semibold">
                            <Clock size={12} className="text-slate-400" />
                            المهلة: <strong className="font-mono text-slate-800 font-black">{formatCustomDate(t.expirationDate)}</strong>
                          </span>
                          {teacher && (
                            <span className="hidden sm:inline font-semibold">
                              المدرب: <strong className="text-slate-600">{teacher.name}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleComplete(t)}
                            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer select-none ${
                              t.completed 
                                ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-500/40 hover:text-emerald-600 hover:bg-emerald-500/5'
                            }`}
                            title={t.completed ? 'إلغاء وسم الاكتمال' : 'تحديد كمكتملة'}
                          >
                            <Check size={14} className="font-black" />
                          </button>
                          
                          {showDelete && (
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg hover:border-rose-500/30 hover:text-rose-600 hover:bg-rose-500/5 transition-all flex items-center justify-center cursor-pointer select-none"
                              title="حذف المهمة"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
