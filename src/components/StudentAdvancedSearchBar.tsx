import React from 'react';
import { 
  Search, 
  Phone, 
  User, 
  GraduationCap, 
  Filter, 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Wallet, 
  Users, 
  BookOpen, 
  Hash, 
  School,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Teacher } from '../types';

export type SearchCriteriaType = 'all' | 'name' | 'phone' | 'grade';
export type AcademicStageType = 'all' | 'primary' | 'middle' | 'secondary' | 'tawjihi' | 'university';

interface CourseTypeStats {
  total: number;
  individualCount: number;
  groupCount: number;
}

interface BalanceStats {
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  criticalCount: number;
  zeroCount: number;
}

interface StudentAdvancedSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchCriteria: SearchCriteriaType;
  setSearchCriteria: (criteria: SearchCriteriaType) => void;
  academicStageFilter: AcademicStageType;
  setAcademicStageFilter: (stage: AcademicStageType) => void;
  gradeFilter: string;
  setGradeFilter: (grade: string) => void;
  uniqueGrades: string[];
  totalFilteredCount: number;
  totalStudentsCount: number;
  isAdvancedFiltersVisible: boolean;
  setIsAdvancedFiltersVisible: React.Dispatch<React.SetStateAction<boolean>>;
  // Secondary filters
  teacherFilter: string;
  setTeacherFilter: (teacherId: string) => void;
  balanceStatusFilter: string;
  setBalanceStatusFilter: (status: string) => void;
  courseTypeFilter: 'all' | 'individual' | 'group';
  setCourseTypeFilter: (type: 'all' | 'individual' | 'group') => void;
  assignmentStatusFilter: 'all' | 'assigned' | 'unassigned';
  setAssignmentStatusFilter: (status: 'all' | 'assigned' | 'unassigned') => void;
  academicStatusFilter: string;
  setAcademicStatusFilter: (status: string) => void;
  teachers: Teacher[];
  courseTypeStats: CourseTypeStats;
  balanceStats: BalanceStats;
  inactiveCount?: number;
  trialMatchesCount?: number;
  onViewTrialMatches?: () => void;
  onResetAllFilters: () => void;
}

export const StudentAdvancedSearchBar: React.FC<StudentAdvancedSearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  searchCriteria,
  setSearchCriteria,
  academicStageFilter,
  setAcademicStageFilter,
  gradeFilter,
  setGradeFilter,
  uniqueGrades,
  totalFilteredCount,
  totalStudentsCount,
  isAdvancedFiltersVisible,
  setIsAdvancedFiltersVisible,
  teacherFilter,
  setTeacherFilter,
  balanceStatusFilter,
  setBalanceStatusFilter,
  courseTypeFilter,
  setCourseTypeFilter,
  assignmentStatusFilter,
  setAssignmentStatusFilter,
  academicStatusFilter,
  setAcademicStatusFilter,
  teachers,
  courseTypeStats,
  balanceStats,
  inactiveCount = 0,
  trialMatchesCount = 0,
  onViewTrialMatches,
  onResetAllFilters,
}) => {

  const hasAnyFilterActive = 
    searchTerm.trim() !== '' || 
    searchCriteria !== 'all' ||
    academicStageFilter !== 'all' ||
    gradeFilter !== 'all' || 
    courseTypeFilter !== 'all' || 
    balanceStatusFilter !== 'all' || 
    teacherFilter !== 'all' || 
    assignmentStatusFilter !== 'all' || 
    academicStatusFilter !== 'all';

  // Get dynamic search input placeholder based on current criterion
  const getSearchPlaceholder = () => {
    switch (searchCriteria) {
      case 'name':
        return '👤 اكتب اسم الطالب (يدعم البحث الجزئي وتطبيع الهمزات)...';
      case 'phone':
        return '📱 ابحث برقم هاتف الطالب أو ولي الأمر (مثال: 0599xxxxxx أو 056...)...';
      case 'grade':
        return '🎓 ابحث بالمستوى أو الصف الدراسي (مثال: توجيهي، عاشر، تاسع، ابتدائي...)...';
      case 'all':
      default:
        return '🔍 بحث متقدم بالاسم، رقم الهاتف، المستوى الدراسي/الصف، الأستاذ، أو الملاحظات...';
    }
  };

  const getSearchIcon = () => {
    switch (searchCriteria) {
      case 'name':
        return <User size={18} className="text-blue-600" />;
      case 'phone':
        return <Phone size={18} className="text-emerald-600" />;
      case 'grade':
        return <GraduationCap size={18} className="text-amber-600" />;
      case 'all':
      default:
        return <Search size={18} className="text-[#D4A33C]" />;
    }
  };

  const academicStages = [
    { id: 'all', label: 'كافة المراحل 🏫', icon: School },
    { id: 'primary', label: 'المرحلة الأساسية (1-6) 🎒', icon: BookOpen },
    { id: 'middle', label: 'المرحلة الإعدادية (7-9) 📐', icon: Hash },
    { id: 'secondary', label: 'المرحلة الثانوية (10-12) 🎓', icon: GraduationCap },
  ] as const;

  return (
    <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-50/20 flex flex-col gap-4 text-right" dir="rtl">
      
      {/* 🚀 Top Section: Search Criteria Tabs & Search Controls */}
      <div className="flex flex-col gap-3">
        
        {/* Search Scope Tabs & Advanced Filter Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Quick Criteria Pill Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl border border-slate-300/50 shadow-inner">
            <span className="text-[11px] font-black text-slate-700 px-2.5 hidden md:flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-amber-600" />
              <span>نطاق البحث:</span>
            </span>

            {/* 1. All */}
            <button
              type="button"
              onClick={() => setSearchCriteria('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                searchCriteria === 'all'
                  ? 'bg-[#1A365D] text-white shadow-xs scale-102'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Search size={13} className={searchCriteria === 'all' ? 'text-amber-400' : 'text-slate-500'} />
              <span>بحث شامل 🌐</span>
            </button>

            {/* 2. By Name */}
            <button
              type="button"
              onClick={() => setSearchCriteria('name')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                searchCriteria === 'name'
                  ? 'bg-blue-600 text-white shadow-xs scale-102'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <User size={13} className={searchCriteria === 'name' ? 'text-blue-200' : 'text-blue-600'} />
              <span>بالاسم 👤</span>
            </button>

            {/* 3. By Phone */}
            <button
              type="button"
              onClick={() => setSearchCriteria('phone')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                searchCriteria === 'phone'
                  ? 'bg-emerald-600 text-white shadow-xs scale-102'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Phone size={13} className={searchCriteria === 'phone' ? 'text-emerald-200' : 'text-emerald-600'} />
              <span>برقم الهاتف 📱</span>
            </button>

            {/* 4. By Grade / Academic Level */}
            <button
              type="button"
              onClick={() => setSearchCriteria('grade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                searchCriteria === 'grade'
                  ? 'bg-amber-600 text-white shadow-xs scale-102'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap size={13} className={searchCriteria === 'grade' ? 'text-amber-200' : 'text-amber-600'} />
              <span>بالمستوى الدراسي 🎓</span>
            </button>
          </div>

          {/* Advanced Filters Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersVisible(prev => !prev)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border select-none ${
              isAdvancedFiltersVisible 
                ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-md shadow-slate-900/10' 
                : 'bg-white text-slate-750 hover:bg-slate-50 border-slate-200 shadow-2xs'
            }`}
            title="إظهار أو إخفاء فلاتر التصفية الإضافية (الرصيد، الأستاذ المنسق، حالة التنسيب)"
          >
            <SlidersHorizontal size={14} className={isAdvancedFiltersVisible ? 'text-amber-400' : 'text-slate-500'} />
            <span>{isAdvancedFiltersVisible ? 'إخفاء أدوات الفلترة ⚙️' : 'تصفية وفلاتر إضافية ⚙️'}</span>
            {(gradeFilter !== 'all' || academicStageFilter !== 'all' || courseTypeFilter !== 'all' || balanceStatusFilter !== 'all' || teacherFilter !== 'all' || assignmentStatusFilter !== 'all' || academicStatusFilter !== 'all') && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse mr-0.5" />
            )}
          </button>
        </div>

        {/* 🔍 Main Smart Search Input Box */}
        <div className="relative group flex-1 min-w-0">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5 transition-colors pointer-events-none">
            {getSearchIcon()}
            <span className="h-5 w-px bg-slate-200" />
          </div>
          
          <input 
            id="quick-student-search"
            type="text" 
            placeholder={getSearchPlaceholder()} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-14 pl-36 py-3.5 bg-white border-2 border-slate-200 focus:border-[#D4A33C] rounded-2xl text-xs sm:text-sm font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-all shadow-xs placeholder-slate-400 text-slate-900"
          />
          
          {/* Dynamic Action Badges inside the Search Input */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                title="مسح حقل البحث"
              >
                <X size={16} />
              </button>
            )}
            
            {/* Live Matches Count Pill */}
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black leading-none ${
              searchTerm || searchCriteria !== 'all' || academicStageFilter !== 'all' || gradeFilter !== 'all'
                ? 'bg-amber-500/15 text-amber-900 border border-amber-500/30' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span>مطابق:</span>
              <span className="font-mono text-amber-800 font-black">{totalFilteredCount}</span>
              <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">من {totalStudentsCount}</span>
            </span>

            {/* Trial Lesson Matches Indicator */}
            {trialMatchesCount > 0 && (
              <button
                type="button"
                onClick={onViewTrialMatches}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 shadow-xs cursor-pointer transition-all animate-pulse hover:animate-none"
                title="انقر لعرض الحصص التجريبية المطابقة للبحث في المنصة"
              >
                <Sparkles size={12} className="text-amber-500" />
                <span>تجريبي:</span>
                <span className="font-mono font-black">{trialMatchesCount}</span>
              </button>
            )}
          </div>
        </div>

        {/* 🎓 Academic Stage Quick Selector Ribbon (Accessible when 'grade' criteria or in advanced filter) */}
        {(searchCriteria === 'grade' || isAdvancedFiltersVisible) && (
          <div className="flex flex-wrap items-center gap-1.5 p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl animate-in fade-in">
            <span className="text-[11px] font-black text-amber-950 flex items-center gap-1 px-1 shrink-0">
              <GraduationCap size={14} className="text-amber-600" />
              <span>المرحلة الدراسية:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {academicStages.map((stage) => {
                const isSelected = academicStageFilter === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setAcademicStageFilter(stage.id as AcademicStageType)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 select-none ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-xs font-black ring-2 ring-amber-400/40'
                        : 'bg-white hover:bg-amber-100/60 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 📱 Phone Search Helper Hint */}
        {searchCriteria === 'phone' && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-[11px] text-emerald-900 font-bold animate-in fade-in">
            <Phone size={13} className="text-emerald-600 shrink-0" />
            <span>💡 نصيحة للبحث بالهاتف: يدعم البحث أرقام الهواتف مباشرة سواء بالصفر المحلي (0599xxxxxx أو 056xxxxxx) أو بالبحث الجزئي عن آخر 4-6 أرقام.</span>
          </div>
        )}

      </div>

      {/* 🏷️ Active Filter Chips Ribbon */}
      {hasAnyFilterActive && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl text-xs animate-in fade-in">
          <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
            <Filter size={13} className="text-amber-700" />
            <span>الفلاتر والبحث النشط:</span>
          </span>

          {/* Search Term Chip */}
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              {searchCriteria === 'name' && <User size={11} className="text-blue-600" />}
              {searchCriteria === 'phone' && <Phone size={11} className="text-emerald-600" />}
              {searchCriteria === 'grade' && <GraduationCap size={11} className="text-amber-600" />}
              {searchCriteria === 'all' && <Search size={11} className="text-slate-500" />}
              <span>
                {searchCriteria === 'name' ? 'بحث بالاسم' : searchCriteria === 'phone' ? 'بحث بالهاتف' : searchCriteria === 'grade' ? 'بحث بالمستوى' : 'بحث'}: "{searchTerm}"
              </span>
              <button type="button" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Academic Stage Filter Chip */}
          {academicStageFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <School size={11} className="text-amber-600" />
              <span>المرحلة: {academicStages.find(s => s.id === academicStageFilter)?.label}</span>
              <button type="button" onClick={() => setAcademicStageFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Grade Filter Chip */}
          {gradeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <GraduationCap size={11} className="text-amber-600" />
              <span>الصف: {gradeFilter}</span>
              <button type="button" onClick={() => setGradeFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Course Type Filter Chip */}
          {courseTypeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <Layers size={11} className="text-indigo-600" />
              <span>نوع الدورة: {courseTypeFilter === 'individual' ? 'حصة فردية (خصوصي)' : 'دورة جماعية (مجموعة)'}</span>
              <button type="button" onClick={() => setCourseTypeFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Balance Status Filter Chip */}
          {balanceStatusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <Wallet size={11} className="text-emerald-600" />
              <span>الرصيد: {
                balanceStatusFilter === 'positive' ? 'دائن (فائض)' :
                balanceStatusFilter === 'negative' ? 'مدين (مستحقات)' :
                balanceStatusFilter === 'zero' ? 'رصيد صفر (مُسوّى)' : 'رصيد حرج منخفض'
              }</span>
              <button type="button" onClick={() => setBalanceStatusFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Teacher Filter Chip */}
          {teacherFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <Users size={11} className="text-blue-600" />
              <span>الأستاذ: {teachers.find(t => t.id === teacherFilter)?.name || teacherFilter}</span>
              <button type="button" onClick={() => setTeacherFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Assignment Status Filter Chip */}
          {assignmentStatusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <span>التنسيب: {assignmentStatusFilter === 'assigned' ? 'منسّب' : 'غير منسّب'}</span>
              <button type="button" onClick={() => setAssignmentStatusFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Academic Status Filter Chip */}
          {academicStatusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs">
              <span>حالة الطالب: {
                academicStatusFilter === 'Active' ? 'نشط 🟢' : 
                academicStatusFilter === 'Paused' ? 'متوقف مؤقت ⏳' : 
                academicStatusFilter === 'Graduated' ? 'خريج 🎓' : 'خاملون (+6 أشهر) 💤'
              }</span>
              <button type="button" onClick={() => setAcademicStatusFilter('all')} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="إلغاء">
                <X size={11} />
              </button>
            </span>
          )}

          {/* Reset All Filters Button */}
          <button
            type="button"
            onClick={onResetAllFilters}
            className="mr-auto flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <RotateCcw size={11} />
            <span>إعادة تعيين الكل 🔄</span>
          </button>
        </div>
      )}

      {/* ⚙️ Expandable Full Advanced Filters Hub */}
      {isAdvancedFiltersVisible && (
        <div className="bg-white/90 border border-slate-200 p-5 rounded-2xl space-y-5 animate-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A33C] animate-pulse"></span>
              <h4 className="text-xs font-black text-slate-800">شريط البحث والتصفية المتقدم للطلاب</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">تصفية فورية بحسب الصف، نوع الدورة، وحالة الرصيد المالي</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Filter 1: Specific Grade / Class (الصف الدراسي) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <GraduationCap size={14} className="text-amber-600" />
                  <span>الصف والمرحلة الدراسية:</span>
                </label>
                {gradeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setGradeFilter('all')}
                    className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                <button
                  type="button"
                  onClick={() => setGradeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    gradeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  الكل 🏫
                </button>
                {uniqueGrades.map((cl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGradeFilter(cl)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      gradeFilter === cl
                        ? 'bg-[#1A365D] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{cl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2: Course Type Filter (نوع الدورة) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <Layers size={14} className="text-indigo-600" />
                  <span>نوع الدورة ونظام الحصص:</span>
                </label>
                {courseTypeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setCourseTypeFilter('all')}
                    className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setCourseTypeFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    courseTypeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🎓 كامل أنواع الدورات</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${courseTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {courseTypeStats.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCourseTypeFilter('individual')}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    courseTypeFilter === 'individual'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-900 border border-indigo-100/80'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>👤 حصة فردية (خصوصي)</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${courseTypeFilter === 'individual' ? 'bg-white/20 text-white' : 'bg-indigo-200/80 text-indigo-800'}`}>
                    {courseTypeStats.individualCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCourseTypeFilter('group')}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    courseTypeFilter === 'group'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50/60 hover:bg-purple-100/70 text-purple-900 border border-purple-100/80'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>👥 دورة جماعية (مجموعة)</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${courseTypeFilter === 'group' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-800'}`}>
                    {courseTypeStats.groupCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter 3: Balance Status (حالة الرصيد المالي) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <Wallet size={14} className="text-emerald-600" />
                  <span>حالة الرصيد والذمم المالية:</span>
                </label>
                {balanceStatusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setBalanceStatusFilter('all')}
                    className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBalanceStatusFilter('all')}
                  className={`col-span-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    balanceStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>الكل 💰</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${balanceStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {balanceStats.totalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceStatusFilter('positive')}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    balanceStatusFilter === 'positive'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                  }`}
                >
                  <span>دائن (فائض) 🟢</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${balanceStatusFilter === 'positive' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                    {balanceStats.positiveCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceStatusFilter('negative')}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    balanceStatusFilter === 'negative'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-100 hover:bg-rose-100'
                  }`}
                >
                  <span>مدين (مستحقات) 🔴</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${balanceStatusFilter === 'negative' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'}`}>
                    {balanceStats.negativeCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceStatusFilter('zero')}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    balanceStatusFilter === 'zero'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>رصيد صفر ⚪</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${balanceStatusFilter === 'zero' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {balanceStats.zeroCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceStatusFilter('critical')}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                    balanceStatusFilter === 'critical'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100'
                  }`}
                >
                  <span>رصيد حرج ⚠️</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${balanceStatusFilter === 'critical' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
                    {balanceStats.criticalCount}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Secondary Filters Row: Teacher, Academic Status, Assignment Status */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            
            {/* Filter by Specific Coordinator Teacher */}
            <div className="relative group flex-1 sm:flex-none">
              <select 
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full sm:w-48 pr-4 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all shadow-xs appearance-none cursor-pointer text-slate-800"
              >
                <option value="all">الأستاذ المنسق: الكل 👨‍🏫</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>

            {/* Filter by Academic Status */}
            <div className="relative group flex-1 sm:flex-none">
              <select 
                value={academicStatusFilter}
                onChange={(e) => setAcademicStatusFilter(e.target.value)}
                className="w-full sm:w-48 pr-4 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all shadow-xs appearance-none cursor-pointer text-slate-800"
              >
                <option value="all">حالة الطالب: الكل 🎓</option>
                <option value="Active">نشط (Active) 🟢</option>
                <option value="Paused">متوقف مؤقت (Paused) ⏳</option>
                <option value="Graduated">خريج (Graduated) 🎓</option>
                <option value="inactive_6m">خاملون (+6 أشهر خمول) 💤 {inactiveCount > 0 ? `(${inactiveCount})` : ''}</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>

            {/* Filter by Assignment Status */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  assignmentStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                تنسيب: الكل
              </button>
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('assigned')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  assignmentStatusFilter === 'assigned'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                منسّب ✅
              </button>
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter('unassigned')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  assignmentStatusFilter === 'unassigned'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                غير منسّب ❌
              </button>
            </div>

            {/* Matching Status Count */}
            <div className="mr-auto text-xs font-bold text-slate-500">
              مجموع النتائج المطابقة للتصفية: <span className="text-[#D4A33C] font-black">{totalFilteredCount}</span> طالب
            </div>

            {/* Reset Filters Trigger */}
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={onResetAllFilters}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-650 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                title="إعادة تعيين كافة فلاتر التصفية والبحث"
              >
                <RotateCcw size={12} />
                <span>إعادة تعيين 🔄</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
