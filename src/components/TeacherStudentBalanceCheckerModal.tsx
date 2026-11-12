import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Wallet, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  MessageSquare, 
  Copy, 
  Check, 
  Calendar, 
  X, 
  ChevronDown, 
  Sparkles, 
  BookOpen, 
  Phone,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { Student, Teacher, Session, StudentCredit, isTrialSession } from '../types';
import { getAcademicStage } from '../lib/sessionPricing';

interface TeacherStudentBalanceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedInTeacher: Teacher;
  linkedStudents: Student[];
  allStudents: Student[];
  sessions: Session[];
  credits: StudentCredit[];
  teachers: Teacher[];
  initialSelectedStudentId?: string;
  onLogSessionForStudent: (studentId: string) => void;
}

export const TeacherStudentBalanceCheckerModal: React.FC<TeacherStudentBalanceCheckerModalProps> = ({
  isOpen,
  onClose,
  loggedInTeacher,
  linkedStudents = [],
  allStudents = [],
  sessions = [],
  credits = [],
  teachers = [],
  initialSelectedStudentId = '',
  onLogSessionForStudent
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialSelectedStudentId && linkedStudents.some(s => s.id === initialSelectedStudentId)) {
      return initialSelectedStudentId;
    }
    return linkedStudents.length > 0 ? linkedStudents[0].id : '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'depleted' | 'sufficient'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync initialSelectedStudentId if it changes and is valid
  React.useEffect(() => {
    if (initialSelectedStudentId && linkedStudents.some(s => s.id === initialSelectedStudentId)) {
      setSelectedStudentId(initialSelectedStudentId);
    } else if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [initialSelectedStudentId, linkedStudents]);

  // Helper: calculate student monetary balance
  const calculateStudentBalance = (studentId: string) => {
    if (!studentId) return 0;
    const student = allStudents.find(s => s.id === studentId) || linkedStudents.find(s => s.id === studentId);
    if (!student) return 0;

    const studentSessions = sessions.filter(s => s.studentId === studentId);
    const studentCredits = credits.filter(c => c.studentId === studentId);

    const totalSpent = studentSessions.reduce((sum, s) => {
      if (s.status === 'pending' || s.status === 'booked' || s.approved === false) return sum;
      if (isTrialSession(s)) return sum;
      if (s.isGroupSession || s.isGroup) {
        if (s.customFee !== undefined && s.customFee > 0) {
          return sum + s.customFee;
        }
        return sum;
      }
      if (s.customFee !== undefined) return sum + s.customFee;
      const t = teachers.find(teacher => teacher.id === s.teacherId);
      const rate = (student.hourlyRate ? student.hourlyRate : (student.customRates?.[s.teacherId] || (t?.billingRate || t?.hourlyRate || 0)));
      return sum + (s.durationHours * rate);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
    return totalToppedUp - totalSpent;
  };

  // Helper: calculate student hourly rate with this teacher
  const getStudentRateForTeacher = (student: Student) => {
    if (!student) return 0;
    return (student.hourlyRate ? student.hourlyRate : (student.customRates?.[loggedInTeacher.id] || (loggedInTeacher?.billingRate || loggedInTeacher?.hourlyRate || 0)));
  };

  // Helper: calculate available hours for this teacher
  const calculateStudentHours = (studentId: string) => {
    if (!studentId) return 0;
    const student = allStudents.find(s => s.id === studentId) || linkedStudents.find(s => s.id === studentId);
    if (!student) return 0;

    const balance = calculateStudentBalance(studentId);
    const rate = getStudentRateForTeacher(student);
    if (rate <= 0) return 0;
    const hours = balance / rate;
    return hours < 0 ? 0 : hours;
  };

  // Helper: calculate remaining integer sessions for a student with this teacher
  const getStudentRemainingSessions = (studentId: string): number => {
    if (!studentId) return 0;
    const student = allStudents.find(s => s.id === studentId) || linkedStudents.find(s => s.id === studentId);
    if (!student) return 0;
    const balance = calculateStudentBalance(studentId);
    const rate = getStudentRateForTeacher(student);
    if (rate <= 0) return balance <= 0 ? 0 : 99;
    
    const stStage = getAcademicStage(student.grade || student.academicLevel || '');
    const isSession40 = (stStage !== 'secondary' && stStage !== 'middle') && (student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40');
    const sessionCost = isSession40 ? rate * (40 / 60) : rate;
    const count = Math.floor(balance / sessionCost);
    return count < 0 ? 0 : count;
  };

  // Enriched list of linked students with balance data
  const enrichedStudents = useMemo(() => {
    return linkedStudents.map(student => {
      const studentStage = getAcademicStage(student.grade || student.academicLevel || '');
      const isSession40 = (studentStage !== 'secondary' && studentStage !== 'middle') && (student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40');
      const balance = calculateStudentBalance(student.id);
      const rate = getStudentRateForTeacher(student);
      const hours = calculateStudentHours(student.id);
      const remainingSessions = getStudentRemainingSessions(student.id);
      const isOpenAccount = !!student.isOpenBalance;
      const isDepleted = !isOpenAccount && (remainingSessions <= 0 || balance <= 0);
      const isLow = !isOpenAccount && (remainingSessions > 0 && remainingSessions <= 2);
      const isSufficient = isOpenAccount || remainingSessions > 2;
      
      // Calculate session history with this teacher
      const teacherSessions = sessions.filter(s => 
        (s.studentId === student.id || (Array.isArray(s.studentIds) && s.studentIds.includes(student.id))) && 
        s.teacherId === loggedInTeacher.id
      );
      
      const lastSession = teacherSessions.length > 0 ? 
        [...teacherSessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] : null;

      return {
        student,
        balance,
        rate,
        hours,
        remainingSessions,
        isSession40,
        isDepleted,
        isLow,
        isSufficient,
        totalTeacherSessions: teacherSessions.length,
        lastSession,
        isOpenAccount
      };
    });
  }, [linkedStudents, allStudents, sessions, credits, teachers, loggedInTeacher]);

  // Filtered students for search & category filters
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(item => {
      // Filter category
      if (filterMode === 'low' && !item.isLow) return false;
      if (filterMode === 'depleted' && !item.isDepleted) return false;
      if (filterMode === 'sufficient' && !item.isSufficient) return false;

      // Search query
      if (searchQuery && searchQuery.trim()) {
        const query = (searchQuery || '').toLowerCase().trim();
        const nameMatch = (item.student.name || '').toLowerCase().includes(query);
        const phoneMatch = (item.student.phone || '').includes(query);
        const gradeMatch = (item.student.academicLevel || item.student.grade || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch || gradeMatch;
      }
      return true;
    });
  }, [enrichedStudents, filterMode, searchQuery]);

  // Current selected student item
  const selectedItem = useMemo(() => {
    return enrichedStudents.find(item => item.student.id === selectedStudentId) || enrichedStudents[0] || null;
  }, [enrichedStudents, selectedStudentId]);

  // Copy summary to clipboard
  const handleCopySummary = () => {
    if (!selectedItem) return;
    const { student, remainingSessions, hours } = selectedItem;
    const text = `📊 تقرير رصيد الحصص الدراسية:
👤 اسم الطالب: ${student.name}
👨‍🏫 المعلم: أ. ${loggedInTeacher.name}
⏳ عدد الحصص المتبقية: ${remainingSessions} حصص
⏱️ الساعات المتاحة: ${hours.toFixed(1)} ساعة
${remainingSessions <= 0 ? '🚨 تنبيه: رصيد الحصص نافذ حالياً، يرجى التنسيق لتجديد باقة الحصص.' : remainingSessions <= 2 ? '⚠️ تنبيه: متبقي حصتان أو أقل، يرجى تجديد باقة الحصص قريباً.' : '✅ رصيد الحصص كافٍ وممتاز.'}
التاريخ: ${new Date().toLocaleDateString('ar-EG')}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 text-right font-sans animate-fade-in" 
      dir="rtl"
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#1A365D] via-[#1e3a8a] to-teal-900 text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 -left-12 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-amber-300 flex items-center justify-center shadow-inner">
              <Clock size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-teal-500/30 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full font-black">
                  بوابة المعلم الفعالة ⚡️
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  فاحص الحصص الذكي
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                فحص رصيد الحصص المتبقية لطلابك 🔍📚
              </h2>
              <p className="text-xs text-blue-200/80 font-medium mt-0.5">
                استعلم بدقة عن عدد الحصص والساعات المتوفرة لطلابك المنسبين لك لمتابعة الجداول وتجديد الباقات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0"
            title="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Stats Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">إجمالي طلابك المنسبين:</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-black rounded-lg font-mono">
              {linkedStudents.length} طلاب
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                filterMode === 'all' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'bg-white text-slate-600 hover:bg-slate-150 border border-slate-200'
              }`}
            >
              الكل ({enrichedStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('low')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'low' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs' 
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle size={11} />
              <span>متبقي ≤ 2 حصص ({enrichedStudents.filter(s => s.isLow).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('depleted')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'depleted' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertCircle size={11} />
              <span>نافذ 0 حصص ({enrichedStudents.filter(s => s.isDepleted).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('sufficient')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'sufficient' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 size={11} />
              <span>رصيد كافٍ ({enrichedStudents.filter(s => s.isSufficient).length})</span>
            </button>
          </div>
        </div>

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* 1. Interactive Student Dropdown & Search Section */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-150 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-black text-slate-850 flex items-center gap-2">
                <User size={15} className="text-[#1A365D]" />
                <span>اختر طالباً من القائمة المنسدلة للفحص الفوري:</span>
              </label>
              
              <span className="text-[11px] text-slate-500 font-bold">
                عرض {filteredStudents.length} من أصل {linkedStudents.length} طلاب
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Dropdown Selector with automatic text & border danger coloring */}
              <div className="sm:col-span-8 relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className={`w-full pl-4 pr-10 py-3 rounded-xl text-xs font-black shadow-sm transition-all outline-none cursor-pointer appearance-none ${
                    selectedItem?.isDepleted
                      ? 'bg-rose-50/90 border-2 border-rose-500 text-rose-700 focus:ring-4 focus:ring-rose-500/20'
                      : selectedItem?.isLow
                      ? 'bg-amber-50/90 border-2 border-amber-500 text-amber-900 focus:ring-4 focus:ring-amber-500/20'
                      : 'bg-white border-2 border-blue-300/80 focus:border-blue-600 text-slate-800 focus:ring-4 focus:ring-blue-500/15'
                  }`}
                >
                  {filteredStudents.length === 0 ? (
                    <option value="">لا يوجد طلاب مطابقين للبحث/التصفية</option>
                  ) : (
                    filteredStudents.map(({ student, remainingSessions, isDepleted, isLow, isOpenAccount }) => {
                      const isDanger = isDepleted;
                      return (
                        <option 
                          key={student.id} 
                          value={student.id}
                          style={{
                            color: isOpenAccount ? '#047857' : isDanger ? '#dc2626' : isLow ? '#b45309' : '#047857',
                            backgroundColor: isOpenAccount ? '#ecfdf5' : isDanger ? '#fef2f2' : isLow ? '#fffbeb' : '#ffffff',
                            fontWeight: isOpenAccount || isDanger || isLow ? 'bold' : 'normal'
                          }}
                          className={
                            isOpenAccount
                              ? 'text-emerald-800 bg-emerald-50 font-black py-1.5'
                              : isDanger
                              ? 'text-rose-600 bg-rose-50 font-black py-1.5'
                              : isLow
                              ? 'text-amber-700 bg-amber-50 font-bold py-1.5'
                              : 'text-emerald-800 bg-white font-medium py-1.5'
                          }
                        >
                          {isOpenAccount
                            ? `🔓 [رصيد مفتوح من المدير] ${student.name} — (مسموح بالرصد الكامل)`
                            : isDanger
                            ? `🚨 [خطر - الرصيد نافذ] ${student.name} — (0 حصص متبقية)`
                            : isLow
                            ? `⚠️ [تحذير - اقتراب النفاذ] ${student.name} — (متبقي ${remainingSessions} حصص)`
                            : `✅ [رصيد متاح] ${student.name} — (متوفر ${remainingSessions} حصص)`}
                        </option>
                      );
                    })
                  )}
                </select>
                <ChevronDown 
                  size={16} 
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    selectedItem?.isDepleted ? 'text-rose-500' : selectedItem?.isLow ? 'text-amber-500' : 'text-slate-400'
                  }`} 
                />
              </div>

              {/* Quick Search Input */}
              <div className="sm:col-span-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full pl-8 pr-9 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 shadow-xs outline-none transition-all"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Detailed Student Balance Inspection Card */}
          {selectedItem ? (
            <div className="space-y-4">
              <div 
                className={`rounded-3xl border-2 p-5 sm:p-6 transition-all shadow-md relative overflow-hidden ${
                  selectedItem.isDepleted
                    ? 'bg-gradient-to-br from-rose-50/90 via-white to-red-50/50 border-rose-300 shadow-rose-500/5'
                    : selectedItem.isLow
                    ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 border-amber-300 shadow-amber-500/5'
                    : 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-emerald-300 shadow-emerald-500/5'
                }`}
              >
                {/* Background decorative blob */}
                <div 
                  className={`absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20 ${
                    selectedItem.isDepleted ? 'bg-rose-500' : selectedItem.isLow ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} 
                />

                {/* Top Profile Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div 
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-md shrink-0 ${
                        selectedItem.isDepleted
                          ? 'bg-rose-600 text-white shadow-rose-600/20'
                          : selectedItem.isLow
                          ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                          : 'bg-emerald-600 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {selectedItem.student.name ? selectedItem.student.name.charAt(0) : 'ط'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {selectedItem.student.name}
                        </h3>
                        {selectedItem.isOpenAccount && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <span>رصيد مفتوح من المدير</span>
                            <span>🔓</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1 flex-wrap">
                        <span>📚 {selectedItem.student.academicLevel || selectedItem.student.grade || 'طالب مسجل'}</span>
                        {selectedItem.student.phone && (
                          <span className="font-mono text-slate-600 flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" />
                            {selectedItem.student.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {selectedItem.isOpenAccount ? (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border-2 border-emerald-300 flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>رصيد مفتوح من المدير 🔓 (مسموح بالرصد الكامل)</span>
                      </span>
                    ) : selectedItem.isDepleted ? (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border-2 border-rose-300 flex items-center gap-1.5 animate-pulse">
                        <AlertCircle size={14} className="text-rose-600" />
                        <span>رصيد الحصص نافذ (0 حصة)</span>
                      </span>
                    ) : selectedItem.isLow ? (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border-2 border-amber-300 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>تنبيه: اقتراب النفاذ ({selectedItem.remainingSessions} حصة)</span>
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border-2 border-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>الرصيد ممتاز وكافٍ ({selectedItem.remainingSessions} حصة)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Hero Metrics Row (Only Session Counts & Hours - No Financials) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 py-5">
                  {/* Metric 1: Remaining Sessions */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                      <Clock size={13} className="text-teal-600" />
                      <span>الحصص المتبقية المتاحة:</span>
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      {selectedItem.isOpenAccount ? (
                        <span className="text-lg sm:text-xl font-black text-emerald-700 leading-tight">
                          رصيد مفتوح من المدير 🔓
                        </span>
                      ) : (
                        <>
                          <span 
                            className={`text-3xl sm:text-4xl font-black font-mono leading-none ${
                              selectedItem.isDepleted ? 'text-rose-600' : selectedItem.isLow ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {selectedItem.remainingSessions}
                          </span>
                          <span className="text-xs font-black text-slate-600">حصة دراسية</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {selectedItem.isOpenAccount ? 'معتمد للرصد المباشر من المدير' : selectedItem.remainingSessions > 0 ? 'جاهزة للحجز والرصد' : 'بحاجة لتجديد الباقة'}
                    </span>
                  </div>

                  {/* Metric 2: Available Hours */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                      <Clock size={13} className="text-blue-600" />
                      <span>الساعات المتوفرة:</span>
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800 leading-none">
                        {selectedItem.hours.toFixed(1)}
                      </span>
                      <span className="text-xs font-black text-slate-600">ساعة</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {selectedItem.isOpenAccount ? 'مفتوحة للتدريس دون قيود' : selectedItem.hours > 0 ? 'متاحة للرصد الفوري' : 'غير متوفرة حالياً'}
                    </span>
                  </div>

                  {/* Metric 3: Package Status Indicator */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-600" />
                      <span>حالة باقة الطالب:</span>
                    </span>
                    <div className="mt-1">
                      <span 
                        className={`text-sm font-black px-2.5 py-1 rounded-xl inline-block ${
                          selectedItem.isOpenAccount
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : selectedItem.isDepleted 
                            ? 'bg-rose-100 text-rose-800' 
                            : selectedItem.isLow 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {selectedItem.isOpenAccount ? '🔓 رصيد مفتوح من المدير' : selectedItem.isDepleted ? '🚨 باقة منتهية' : selectedItem.isLow ? '⚠️ قريبة من النفاذ' : '✅ باقة نشطة وكافية'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {selectedItem.isOpenAccount ? 'تم اعتماد الرصيد المفتوح للطالب' : selectedItem.isDepleted ? 'تتطلب تواصل مع ولي الأمر' : selectedItem.isLow ? 'متبقي أقل من حصتين' : 'يمكن إعطاء الحصص بشكل طبيعي'}
                    </span>
                  </div>

                  {/* Metric 4: Sessions Completed with this Teacher */}
                  <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-black text-slate-500 flex items-center gap-1">
                      <BookOpen size={13} className="text-indigo-600" />
                      <span>حصصك السابقة مع الطالب:</span>
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800 leading-none">
                        {selectedItem.totalTeacherSessions}
                      </span>
                      <span className="text-xs font-black text-slate-600">حصة مسجلة</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {selectedItem.lastSession ? `آخر حصة: ${selectedItem.lastSession.date}` : 'لم تسجل حصص سابقة بعد'}
                    </span>
                  </div>
                </div>

                {/* Last Session Info Banner */}
                {selectedItem.lastSession && (
                  <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded">
                        📌 آخر حصة تم تدريسها:
                      </span>
                      <span className="font-black text-slate-800">{selectedItem.lastSession.date}</span>
                      <span className="text-slate-500 font-bold">• المادة: {selectedItem.lastSession.subject || 'عام'}</span>
                      {selectedItem.lastSession.topic && (
                        <span className="text-slate-500 font-bold">• الدرس: {selectedItem.lastSession.topic}</span>
                      )}
                    </div>
                    <span className="text-slate-600 font-mono font-bold bg-slate-50 px-2 py-0.5 rounded">
                      المدة: {selectedItem.lastSession.durationHours || 1} س
                    </span>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Log Session Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogSessionForStudent(selectedItem.student.id);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 hover:scale-102 active:scale-98 cursor-pointer flex items-center gap-2"
                    >
                      <Calendar size={14} className="stroke-[2.5]" />
                      <span>🚀 تسجيل حصة فورية للطالب</span>
                    </button>

                    {/* WhatsApp Reminder Button */}
                    {selectedItem.student.phone && (
                      <a
                        href={`https://wa.me/${selectedItem.student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `السلام عليكم ورحمة الله وبركاته، تحية طيبة من أ. ${loggedInTeacher.name} (أكاديمية التفوق).\nنود إحاطتكم علماً بأن الرصيد المتبقي للطالب (${selectedItem.student.name}) هو [${
                            selectedItem.isDepleted 
                              ? '0 حصص دراسية - الرصيد نافذ' 
                              : selectedItem.isLow 
                              ? `${selectedItem.remainingSessions} حصة دراسية فقط` 
                              : `${selectedItem.remainingSessions} حصص دراسية`
                          }].\n${
                            selectedItem.isDepleted || selectedItem.isLow 
                              ? 'يرجى التنسيق لتجديد باقة الحصص لضمان استمرارية المتابعة الدراسية دون انقطاع. دمتم بكل توفيق ونجاح.' 
                              : 'نتمنى له دوام التقدم والنجاح الأكاديمي.'
                          }`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 hover:scale-102 active:scale-98 cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare size={14} />
                        <span>واتساب تذكير بالحصص 💬</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Copy Summary Button */}
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      title="نسخ تقرير الحصص للحافظة"
                    >
                      {copiedNotification ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-700 font-black">تم النسخ بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-slate-500" />
                          <span>نسخ التقرير 📋</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <User size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">يرجى اختيار طالب من القائمة المنسدلة أعلاه لفحص رصيد الحصص المتبقية.</p>
            </div>
          )}

          {/* 3. Quick Table / Grid of All Assigned Students */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#D4A33C]" />
                <span>نظرة شاملة وسريعة على جميع طلابك المنسبين ({enrichedStudents.length})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold">
                انقر على أي طالب لعرض فحص رصيد حصصه بالتفصيل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {enrichedStudents.map(({ student, remainingSessions, hours, isDepleted, isLow }) => {
                const isCurrentSelected = student.id === selectedStudentId;

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between space-y-2 shadow-xs ${
                      isCurrentSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
                        : student.isOpenBalance
                        ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/60'
                        : isDepleted
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 hover:bg-rose-50'
                        : isLow
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="text-xs font-black text-slate-900 block break-words leading-snug">
                          {student.name}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-bold block truncate">
                          {student.academicLevel || student.grade || 'طالب مسجل'}
                        </span>
                      </div>

                      {/* Badge */}
                      <span 
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                          student.isOpenBalance
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isDepleted 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : isLow 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {student.isOpenBalance ? 'رصيد مفتوح 🔓' : `${remainingSessions} حصص`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold border-t border-slate-100 pt-1.5 text-slate-500">
                      <span>الساعات المتوفرة: <strong className="text-slate-800 font-mono">{student.isOpenBalance ? 'مفتوحة' : `${hours.toFixed(1)} س`}</strong></span>
                      <span>الحالة: <strong className={`font-mono ${student.isOpenBalance ? 'text-emerald-700 font-black' : isDepleted ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-emerald-700'}`}>{student.isOpenBalance ? 'مفتوح من المدير' : isDepleted ? 'نافذ' : isLow ? 'تنبيه' : 'كافٍ'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
            <Info size={13} className="text-blue-600 shrink-0" />
            <span>يتم احتساب عدد الحصص المتبقية آلياً وفق باقة الطالب وساعات الحصص المعتمدة.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black transition-all cursor-pointer shadow-xs"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
