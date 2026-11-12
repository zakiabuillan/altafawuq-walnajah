// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion, addDoc, deleteDoc } from 'firebase/firestore';
import { Teacher, Student } from '../types';
import { Sparkles, ArrowLeftRight, CheckCircle2, UserCheck, Trash2, ShieldCheck, Heart, Info, Clock, Check, GraduationCap, User, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { notifyTeacherOnStudentPlacement } from '../lib/notificationUtils';
import { getAcademicStage, getDefaultPricingUnitForGrade, DEFAULT_STAGE_PRICING } from '../lib/sessionPricing';

interface AssignmentMeta {
  id?: string;
  teacherId: string;
  studentId: string;
  teacherPayoutRate: number;
  studentBillingRate: number;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface SmartAssignmentProps {
  studentId?: string;
  hideHeader?: boolean;
  onAssignmentChange?: () => void;
}

export default function SmartAssignment({ studentId, hideHeader = false, onAssignmentChange }: SmartAssignmentProps = {}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMeta[]>([]);
  
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [teacherPayoutRate, setTeacherPayoutRate] = useState<number | string>(0);
  const [studentBillingRate, setStudentBillingRate] = useState<number | string>(0);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ assignmentId: string; studentId: string; teacherId: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (studentId) {
      setSelectedStudentId(studentId);
    }
  }, [studentId]);

  const filteredAssignments = studentId 
    ? assignments.filter(ass => ass.studentId === studentId)
    : assignments;

  const currentSelectedStudent = students.find(s => s.id === selectedStudentId);
  const isStudentSession40 = 
    currentSelectedStudent?.preferredPricingUnit === 'session_40' ||
    currentSelectedStudent?.sessionSystem === 'session_40' ||
    (currentSelectedStudent?.grade ? getDefaultPricingUnitForGrade(currentSelectedStudent.grade) === 'session_40' : false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tSnap, sSnap, aSnap] = await Promise.all([
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'assignments'))
      ]);

      setTeachers(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
      setStudents(sSnap.docs.map(doc => {
        const data = doc.data() as Student;
        if (data.teachers) {
          data.teachers = Array.from(new Set(data.teachers));
        }
        return { id: doc.id, ...data };
      }));

      const rawAssignments = aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentMeta));
      const seen = new Set<string>();
      const uniqueAssignments: AssignmentMeta[] = [];
      const duplicateIdsToDelete: string[] = [];

      for (const ass of rawAssignments) {
        const key = `${ass.studentId}_${ass.teacherId}`;
        if (seen.has(key)) {
          if (ass.id) {
            duplicateIdsToDelete.push(ass.id);
          }
        } else {
          seen.add(key);
          uniqueAssignments.push(ass);
        }
      }

      // Automatically clean up duplicates in Firestore background task
      if (duplicateIdsToDelete.length > 0) {
        console.log(`Found and deleting ${duplicateIdsToDelete.length} duplicate assignments...`);
        Promise.all(duplicateIdsToDelete.map(id => deleteDoc(doc(db, 'assignments', id)))).catch(err => {
          console.error("Error deleting duplicates in background:", err);
        });
      }

      setAssignments(uniqueAssignments);
    } catch (error) {
      console.error("Error fetching data for Smart Matchmaking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-populate default rates from the chosen teacher and student
  useEffect(() => {
    const activeTeacherId = selectedTeacherIds.length > 0 ? selectedTeacherIds[selectedTeacherIds.length - 1] : selectedTeacherId;
    if (activeTeacherId) {
      const teacher = teachers.find(t => t.id === activeTeacherId);
      const student = students.find(s => s.id === selectedStudentId);
      if (teacher) {
        const isSession40 = 
          student?.preferredPricingUnit === 'session_40' ||
          student?.sessionSystem === 'session_40' ||
          (student?.grade ? getDefaultPricingUnitForGrade(student.grade) === 'session_40' : false);

        if (isSession40) {
          const studentStage = getAcademicStage(student?.grade || student?.academicLevel || '');
          const defaultSessionRate = 
            student?.sessionRate && Number(student.sessionRate) > 0
              ? Number(student.sessionRate)
              : studentStage === 'secondary'
                ? (student?.secondarySchoolSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate ?? 50)
                : studentStage === 'middle'
                  ? (student?.middleSchoolSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate ?? 40)
                  : (student?.primarySchoolSessionRate ?? teacher.primarySchoolSessionRate ?? teacher.sessionRate ?? 35);

          const defaultSessionPayout = 
            student?.sessionPayoutTeacher && Number(student.sessionPayoutTeacher) > 0
              ? Number(student.sessionPayoutTeacher)
              : studentStage === 'secondary'
                ? (teacher.secondarySchoolSessionPayout ?? DEFAULT_STAGE_PRICING.secondarySchoolTeacherSessionRate ?? 35)
                : studentStage === 'middle'
                  ? (teacher.middleSchoolSessionPayout ?? DEFAULT_STAGE_PRICING.middleSchoolTeacherSessionRate ?? 25)
                  : (teacher.primarySchoolSessionPayout ?? teacher.sessionPayoutRate ?? Math.round(((teacher.payoutRate || teacher.hourlyRate || 35) * 40) / 60));

          setTeacherPayoutRate(defaultSessionPayout);
          setStudentBillingRate(defaultSessionRate);
        } else {
          setTeacherPayoutRate(teacher.payoutRate || teacher.hourlyRate || 0);
          setStudentBillingRate(student?.hourlyRate || teacher.billingRate || teacher.hourlyRate || 60);
        }
      }
    } else {
      setTeacherPayoutRate(0);
      setStudentBillingRate(0);
    }
  }, [selectedTeacherId, selectedTeacherIds, selectedStudentId, teachers, students]);

  const handlePerformMatch = async () => {
    // Collect all unique target teacher IDs (supports checkbox array, falls back to single state if empty)
    const targetTeacherIds = selectedTeacherIds.length > 0 
      ? selectedTeacherIds 
      : (selectedTeacherId ? [selectedTeacherId] : []);

    if (targetTeacherIds.length === 0 || !selectedStudentId) {
      alert('يرجى تحديد معلم واحد على الأقل وطالب لإتمام عملية التنسيب.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) {
        setIsSubmitting(false);
        return;
      }

      const currentlyLinked = student.teachers || [];
      const updatedTeachersSet = new Set(currentlyLinked);
      const newAssignments: AssignmentMeta[] = [];
      let freshlyAddedCount = 0;

      for (const tId of targetTeacherIds) {
        // Prevent duplicate assignment in local cache or Firestore
        const alreadyAssigned = assignments.some(
          a => a.studentId === selectedStudentId && a.teacherId === tId
        );
        if (alreadyAssigned) {
          continue;
        }

        updatedTeachersSet.add(tId);

        // Calculate custom rate structures for this teacher if available, else fall back to overall inputs
        const teacherObj = teachers.find(t => t.id === tId);
        const payout = Number(teacherPayoutRate) || (teacherObj?.payoutRate || teacherObj?.hourlyRate || 0);
        const billing = Number(studentBillingRate) || (student?.hourlyRate || teacherObj?.billingRate || 60);

        const assignmentData: AssignmentMeta = {
          teacherId: tId,
          studentId: selectedStudentId,
          teacherPayoutRate: Number(payout),
          studentBillingRate: Number(billing),
          priority,
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'assignments'), assignmentData);
        newAssignments.push({ id: docRef.id, ...assignmentData });
        freshlyAddedCount++;
      }

      if (newAssignments.length > 0) {
        // Write the updated union set to Firestore and sync customRates
        const studentRef = doc(db, 'students', selectedStudentId);
        const currentCustomRates = student?.customRates || {};
        const updatedCustomRates = { ...currentCustomRates };
        newAssignments.forEach(ass => {
          updatedCustomRates[ass.teacherId] = ass.studentBillingRate;
        });

        await updateDoc(studentRef, {
          teachers: Array.from(updatedTeachersSet),
          customRates: updatedCustomRates
        });
        setAssignments(prev => [...prev, ...newAssignments]);

        // Send instant placement notification to each newly assigned teacher
        for (const ass of newAssignments) {
          try {
            await notifyTeacherOnStudentPlacement({
              teacherId: ass.teacherId,
              studentId: selectedStudentId,
              studentName: student.name,
              studentGrade: student.grade || student.academicLevel || '',
              studentPhone: student.phone || '',
              notes: student.notes || '',
              source: 'smart_assignment',
              title: `🎉 تم تنسيب الطالب "${student.name}" إلى حسابك التعليمي عبر محرك التنسيب الذكي`
            });
          } catch (notifErr) {
            console.warn('Failed to notify teacher in SmartAssignment:', notifErr);
          }
        }
      } else {
        alert('جميع المعلمين المحددّين منسّبون بالفعل لهذا الطالب سابقاً!');
        setIsSubmitting(false);
        return;
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedTeacherId('');
        setSelectedTeacherIds([]);
        if (!studentId) {
          setSelectedStudentId('');
        }
        setPriority('medium');
      }, 3000);

      fetchData(); // Refresh list to sync layout
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = (assignmentId: string, studentId: string, teacherId: string) => {
    setDeleteConfirm({ assignmentId, studentId, teacherId });
  };

  const executeDeleteAssignment = async (assignmentId: string, studentId: string, teacherId: string) => {
    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
      
      // Also clean up student teachers list and customRates
      const student = students.find(s => s.id === studentId);
      if (student) {
        const updatedTeachers = (student.teachers || []).filter(id => id !== teacherId);
        const updatedCustomRates = { ...(student.customRates || {}) };
        delete updatedCustomRates[teacherId];
        await updateDoc(doc(db, 'students', studentId), {
          teachers: updatedTeachers,
          customRates: updatedCustomRates
        });
      }
      
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      fetchData();
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  if (isLoading) {
    return (
      <div className={`${hideHeader ? 'py-10' : 'py-40'} flex flex-col items-center justify-center gap-4`}>
        <div className="w-8 h-8 border-4 border-slate-100 border-t-[#D4A33C] rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">جاري المزامنة وتحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className={`${hideHeader ? 'space-y-6' : 'space-y-10'} animate-in fade-in duration-500 text-slate-800`} dir="rtl">
      {/* Smart Match Header Block */}
      {!hideHeader && (
        <section className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -mr-40 -mt-40" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#D4A33C] flex items-center justify-center text-white shadow-xl shadow-amber-600/20">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">محرك التنسيب الذكي</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">تنسيب الطلاب للمعلمين وتحديد السياسات المالية والوصول للبيانات.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/50 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold shrink-0">
              <ArrowLeftRight size={14} className="animate-pulse" />
              تنسيق ذكي فوري
            </div>
          </div>
        </section>
      )}

      {/* Main Multi-Step Setup Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Step 1 Card */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-[#D4A33C]/25">
          <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-50/50 rounded-br-[2rem] flex items-center justify-center font-black text-slate-400">01</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-550/15 text-[#D4A33C] flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-[#D4A33C] tracking-widest uppercase">الخطوة 1: المعلم المستهدف</span>
              <h4 className="text-lg font-black text-slate-900 mt-0.5">اختر المعلم من القائمة</h4>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-500">اسم المعلم / المعلمين *</label>
              {selectedTeacherIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTeacherIds([])}
                  className="text-[10px] font-black text-[#D4A33C] hover:underline cursor-pointer"
                >
                  إلغاء تحديد الكل ({selectedTeacherIds.length})
                </button>
              )}
            </div>

            {/* Teacher Search Input */}
            <input
              type="text"
              placeholder="البحث بالاسم أو التخصص..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none placeholder-slate-400 focus:border-[#D4A33C] focus:ring-4 focus:ring-amber-500/5 transition-all text-right"
            />

            {/* Checkbox List */}
            <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 p-4 max-h-64 overflow-y-auto space-y-2.5 custom-scrollbar">
              {teachers
                .filter(t => {
                  const query = (teacherSearch || '').toLowerCase().trim();
                  if (!query) return true;
                  return (t.name || '').toLowerCase().includes(query) || 
                         t.subjects?.some(sub => (sub || '').toLowerCase().includes(query)) ||
                         (t.contact || '').toLowerCase().includes(query);
                })
                .map(t => {
                  const isChecked = selectedTeacherIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-amber-500/10 border-[#D4A33C]/30 text-[#1A365D]'
                          : 'bg-white border-slate-200/80 hover:bg-slate-100/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedTeacherIds(prev => prev.filter(id => id !== t.id));
                          } else {
                            setSelectedTeacherIds(prev => [...prev, t.id]);
                            // Also update selectedTeacherId for compatibility hooks
                            setSelectedTeacherId(t.id);
                          }
                        }}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 mt-0.5 cursor-pointer accent-[#D4A33C]"
                      />
                      <div className="text-right flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{t.name}</p>
                        {t.subjects && t.subjects.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                            {t.subjects.join('، ')}
                          </p>
                        )}
                        <p className="text-[9px] text-slate-400 font-medium font-mono mt-0.5">
                          {t.contact || 'بدون بريد تواصل'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              {teachers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">لا يوجد معلمون في النظام حالياً.</p>
              )}
            </div>

            {selectedTeacherIds.length > 0 && (
              <div className="bg-amber-50/40 rounded-xl p-4 border border-[#D4A33C]/20 text-xs text-slate-600 space-y-1.5 text-right animate-in fade-in duration-200">
                <p className="font-extrabold text-[#D4A33C]">المعلمون المحددون للتنسيب ({selectedTeacherIds.length}):</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTeacherIds.map(id => {
                    const t = teachers.find(teach => teach.id === id);
                    return t ? (
                      <span key={id} className="inline-flex items-center gap-1 bg-[#1A365D] text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {t.name}
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherIds(prev => prev.filter(i => i !== id))}
                          className="hover:text-rose-400 text-slate-300 font-bold text-[11px] pr-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 Card */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-[#D4A33C]/25">
          <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-50/50 rounded-br-[2rem] flex items-center justify-center font-black text-slate-400">02</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-indigo-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-[#D4A33C] tracking-widest uppercase">الخطوة 2: الطالب المنسوب</span>
              <h4 className="text-lg font-black text-slate-900 mt-0.5">
                {studentId ? 'الطالب المحدد' : 'اختر الطالب من القائمة'}
              </h4>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500">اسم الطالب</label>
            {studentId ? (
              <div className="w-full px-5 py-4 bg-slate-100 border border-slate-205 rounded-2xl font-bold text-slate-850 text-slate-800">
                {students.find(s => s.id === selectedStudentId)?.name || 'جاري تحميل اسم الطالب...'}
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="">-- اختر الطالب من القائمة --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {selectedStudentId && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
                <p><strong>المعلمون الحاليون:</strong> {(() => {
                  const student = students.find(s => s.id === selectedStudentId);
                  const linkedTeachers = teachers.filter(t => student?.teachers?.includes(t.id));
                  return linkedTeachers.length > 0 ? linkedTeachers.map(t => t.name).join('، ') : 'لا يوجد حالياً';
                })()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 Card */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-sm flex flex-col gap-5 relative overflow-hidden text-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-[#D4A33C]/25">
          <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-50/50 rounded-br-[2rem] flex items-center justify-center font-black text-slate-400">03</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-[#D4A33C] tracking-widest uppercase">الخطوة النهائية: المحاسبة</span>
              <h4 className="text-lg font-black text-slate-900 mt-0.5">تحديد السياسة المالية والتنسيب</h4>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Hour / 40-min Payout Input */}
            <div className="relative flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500">
                  {isStudentSession40 ? 'أجر المعلم بالحصة (40 دقيقة)' : 'أجر المعلم بالساعة'}
                </label>
                {isStudentSession40 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    🎓 نظام 40 دقيقة
                  </span>
                )}
              </div>
              <div className="relative group">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 select-none group-focus-within:text-[#D4A33C]">
                  {isStudentSession40 ? '₪ / 40 د' : 'SHEKEL ₪'}
                </span>
                <input
                  type="number"
                  value={teacherPayoutRate || ''}
                  onChange={e => setTeacherPayoutRate(e.target.value)}
                  className="w-full pr-24 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                />
              </div>
            </div>

            {/* Hour / 40-min Billing Input */}
            <div className="relative flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-slate-500">
                {isStudentSession40 ? 'سعر الطالب بالحصة (40 دقيقة)' : 'سعر الطالب بالساعة'}
              </label>
              <div className="relative group">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 select-none group-focus-within:text-[#D4A33C]">
                  {isStudentSession40 ? '₪ / 40 د' : 'SHEKEL ₪'}
                </span>
                <input
                  type="number"
                  value={studentBillingRate || ''}
                  onChange={e => setStudentBillingRate(e.target.value)}
                  className="w-full pr-24 pl-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                />
              </div>
            </div>

            {/* Priority Button selectors */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 block">أولوية التنسيب (الأهمية)</label>
              <div className="flex gap-2 text-[10px] font-black uppercase text-center">
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    priority === 'high' 
                      ? 'bg-red-50 text-red-700 border-red-350 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-red-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  مرتفعة
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('medium')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    priority === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-350 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-amber-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  متوسطة
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('low')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    priority === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-350 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-emerald-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  منخفضة
                </button>
              </div>
            </div>

            {/* Match trigger button */}
            <div className="pt-3">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 text-emerald-700"
                  >
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span className="font-bold text-[11px]">تم التنسيب بنجاح وحفظ البيانات المالية!</span>
                  </motion.div>
                ) : (
                  <button
                    onClick={handlePerformMatch}
                    disabled={isSubmitting || !selectedTeacherId || !selectedStudentId}
                    className="w-full py-3.5 bg-slate-900 border border-slate-800 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck size={16} />
                        إتمام عملية التنسيب
                      </>
                    )}
                  </button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Roster of Assignments Ledger */}
      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 uppercase">قائمة التنسيقات النشطة بالساعة</h3>
          <span className="px-2.5 py-1 bg-amber-50 border border-amber-250 text-amber-800 rounded-lg text-xs font-black">
            {filteredAssignments.length} تنسيق نشط
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 xl:w-1/4">المعلم المستهدف</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 xl:w-1/4">الطالب المنسوب</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400">أجر المعلم (حصة/ساعة)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400">سعر الطالب (حصة/ساعة)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400">الأولوية</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <ArrowLeftRight size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-400">لا يوجد عمليات تنسيق نشطة مسجلة حالياً.</p>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map(ass => {
                  const teacher = teachers.find(t => t.id === ass.teacherId);
                  const student = students.find(s => s.id === ass.studentId);
                  const isAssSession40 = 
                    ass.pricingUnit === 'session_40' ||
                    student?.preferredPricingUnit === 'session_40' ||
                    student?.sessionSystem === 'session_40' ||
                    (student?.grade ? getDefaultPricingUnitForGrade(student.grade) === 'session_40' : false);

                  return (
                    <tr key={ass.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-[#D4A33C]/10 text-[#D4A33C] flex items-center justify-center text-xs font-black">
                            {teacher?.name?.charAt(0) || 'م'}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{teacher?.name || 'معلم غير معرّف'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
                            {student?.name?.charAt(0) || 'ط'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">{student?.name || 'طالب غير معرّف'}</span>
                            {isAssSession40 && (
                              <span className="text-[9px] font-bold text-amber-700">نظام 40 دقيقة 🎓</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        ₪{ass.teacherPayoutRate} <span className="text-[10px] text-slate-400">{isAssSession40 ? '/ 40د' : '/ س'}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#D4A33C]">
                        ₪{ass.studentBillingRate} <span className="text-[10px] text-slate-400">{isAssSession40 ? '/ 40د' : '/ س'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase inline-flex items-center gap-1 ${
                          ass.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                          ass.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            ass.priority === 'high' ? 'bg-red-500' :
                            ass.priority === 'medium' ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`} />
                          {ass.priority === 'high' && 'مرتفعة'}
                          {ass.priority === 'medium' && 'متوسطة'}
                          {ass.priority === 'low' && 'منخفضة'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleDeleteAssignment(ass.id!, ass.studentId, ass.teacherId)}
                          className="p-1 px-2.5 text-[9px] font-black text-red-500 border border-transparent rounded hover:bg-red-50 hover:border-red-100 transition-all flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          إلغاء التنسيق
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Secure Delete Governance Confirmation Pop-up */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-rose-600 leading-none">تأكيد عملية الحذف ⚠️</h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                هل أنت متأكد تمامًا من رغبتك في الحذف؟ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </p>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={async () => {
                  const { assignmentId, studentId, teacherId } = deleteConfirm;
                  setDeleteConfirm(null);
                  await executeDeleteAssignment(assignmentId, studentId, teacherId);
                }}
                className="flex-1 py-2.5 bg-rose-650 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md shadow-rose-650/10 text-center"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
