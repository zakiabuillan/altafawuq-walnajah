import React, { useState, useMemo } from 'react';
import { Student, GroupCourse, Session } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, BookOpen, Calendar, 
  Filter, Layers, ArrowUpRight, Award, Sparkles, CheckCircle2 
} from 'lucide-react';
import { motion } from 'motion/react';

interface StudentGrowthAndSubjectDistributionProps {
  students: Student[];
  groupCourses?: GroupCourse[];
  sessions?: Session[];
}

const PALETTE = [
  '#0D365A', // Navy
  '#D4A33C', // Gold
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const StudentGrowthAndSubjectDistribution: React.FC<StudentGrowthAndSubjectDistributionProps> = ({
  students = [],
  groupCourses = [],
  sessions = []
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '12m' | '6m'>('12m');
  const [distributionView, setDistributionView] = useState<'donut' | 'bar'>('donut');
  const [selectedAcademicStage, setSelectedAcademicStage] = useState<string>('all');

  // 1. Calculate Monthly Student Registrations & Cumulative Growth
  const growthData = useMemo(() => {
    if (!students.length) return [];

    // Map year-month to new student count
    const monthCounts: Record<string, number> = {};

    students.forEach(st => {
      // Find date: registrationDate or createdAt or fallback to today
      const dateStr = st.registrationDate || (st as any).createdAt;
      let dateObj: Date;

      if (dateStr) {
        dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date();
        }
      } else {
        dateObj = new Date();
      }

      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;

      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });

    // Generate sorted chronological month sequence
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let monthKeys: string[] = [];
    const numMonths = timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : 24;

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${y}-${m}`);
    }

    // If 'all', merge existing keys that might be older
    if (timeRange === 'all') {
      const existingKeys = Object.keys(monthCounts).sort();
      if (existingKeys.length > 0 && existingKeys[0] < monthKeys[0]) {
        // Expand starting from earliest existing key
        const [earliestY, earliestM] = existingKeys[0].split('-').map(Number);
        monthKeys = [];
        let cursor = new Date(earliestY, earliestM - 1, 1);
        while (cursor <= now) {
          const y = cursor.getFullYear();
          const m = String(cursor.getMonth() + 1).padStart(2, '0');
          monthKeys.push(`${y}-${m}`);
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
    }

    // Calculate count per month & running cumulative total
    // First calculate baseline of students registered before the first visible month
    const firstKey = monthKeys[0];
    let runningTotal = 0;

    Object.entries(monthCounts).forEach(([k, count]) => {
      if (k < firstKey) {
        runningTotal += count;
      }
    });

    return monthKeys.map(key => {
      const [yearStr, monthStr] = key.split('-');
      const mIndex = parseInt(monthStr, 10) - 1;
      const label = `${ARABIC_MONTHS[mIndex]} ${yearStr.slice(-2)}'`;
      const newStudents = monthCounts[key] || 0;
      runningTotal += newStudents;

      return {
        key,
        name: label,
        'طلاب جدد': newStudents,
        'إجمالي الطلاب التراكمي': runningTotal,
      };
    });
  }, [students, timeRange]);

  // 2. Calculate Student Distribution by Subject
  const subjectDistributionData = useMemo(() => {
    const subjectMap: Record<string, { count: number; studentIds: Set<string> }> = {};

    // Helper to add student to subject
    const trackStudentSubject = (subjectName: string, studentId?: string) => {
      const cleanSub = (subjectName || '').trim();
      if (!cleanSub) return;

      if (!subjectMap[cleanSub]) {
        subjectMap[cleanSub] = { count: 0, studentIds: new Set() };
      }
      if (studentId) {
        if (!subjectMap[cleanSub].studentIds.has(studentId)) {
          subjectMap[cleanSub].studentIds.add(studentId);
          subjectMap[cleanSub].count += 1;
        }
      } else {
        subjectMap[cleanSub].count += 1;
      }
    };

    // A. Gather from group courses (where students are assigned to group course)
    groupCourses.forEach(gc => {
      const subject = gc.subject || gc.title || gc.name || '';
      if (!subject) return;

      // Check studentIds in groupCourse
      if (Array.isArray(gc.studentIds) && gc.studentIds.length > 0) {
        gc.studentIds.forEach(stId => {
          trackStudentSubject(subject, stId);
        });
      } else if (gc.instructor) {
        // Fallback: count completed/active seats or base 1
        trackStudentSubject(subject);
      }
    });

    // B. Gather from student assignedCourseId or bookings or custom notes
    students.forEach(st => {
      if (st.assignedCourseId) {
        const matchedCourse = groupCourses.find(c => c.id === st.assignedCourseId);
        if (matchedCourse) {
          const sub = matchedCourse.subject || matchedCourse.title || '';
          if (sub) trackStudentSubject(sub, st.id);
        }
      }

      // Check bookings
      if (Array.isArray(st.bookings)) {
        st.bookings.forEach(b => {
          const sub = (b as any).subject || (b as any).courseTitle || '';
          if (sub) trackStudentSubject(sub, st.id);
        });
      }
    });

    // C. Gather from completed or active sessions
    sessions.forEach(sess => {
      const sub = sess.subject || sess.topic || sess.courseCode;
      if (sub && sess.studentId) {
        trackStudentSubject(sub, sess.studentId);
      }
    });

    // Filter by academic stage if selected
    // Format into chart items
    const rawList = Object.entries(subjectMap).map(([name, val]) => ({
      name,
      value: val.count,
    }));

    // If empty fallback with common defaults based on academic levels or dummy demo
    let result = rawList.sort((a, b) => b.value - a.value);

    if (result.length === 0) {
      // Group students by academic level as proxy
      const levelCounts: Record<string, number> = {};
      students.forEach(st => {
        const lvl = st.academicLevel || st.grade || 'عام';
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      });
      result = Object.entries(levelCounts).map(([name, count]) => ({
        name,
        value: count
      })).sort((a, b) => b.value - a.value);
    }

    const totalStudentsInSubjects = result.reduce((acc, curr) => acc + curr.value, 0);

    return {
      items: result,
      totalCount: totalStudentsInSubjects
    };
  }, [students, groupCourses, sessions]);

  // Quick summary statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => (s.status === 'Active' || s.academicStatus === 'Active')).length;
    
    // Growth in the last month
    const latestMonth = growthData[growthData.length - 1];
    const prevMonth = growthData[growthData.length - 2];
    const newThisMonth = latestMonth ? latestMonth['طلاب جدد'] : 0;
    const newLastMonth = prevMonth ? prevMonth['طلاب جدد'] : 0;
    
    const momGrowthRate = newLastMonth > 0 
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : 0;

    const topSubject = subjectDistributionData.items[0]?.name || 'غير محدد';
    const topSubjectCount = subjectDistributionData.items[0]?.value || 0;

    return {
      totalStudents,
      activeStudents,
      newThisMonth,
      momGrowthRate,
      topSubject,
      topSubjectCount
    };
  }, [students, growthData, subjectDistributionData]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Bar with Controls */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#0D365A] text-[#D4A33C] flex items-center justify-center shadow-xs">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>نمو تسجيل الطلاب وتوزعهم حسب المواد الدراسية</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold rounded-full border border-indigo-100/60">
                  Recharts Analytics
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                رصد تطور أعداد الطلاب الجدد شهرياً وتحليل الإقبال الأكاديمي على التخصصات والمقررات
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Filter Controls */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTimeRange('6m')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              timeRange === '6m'
                ? 'bg-white text-[#0D365A] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            آخر 6 أشهر
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('12m')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              timeRange === '12m'
                ? 'bg-white text-[#0D365A] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            سنة كاملة (12 شهر)
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              timeRange === 'all'
                ? 'bg-white text-[#0D365A] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الكل
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 group hover:border-[#0D365A]/30 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase">إجمالي الطلاب المسجلين</span>
            <Users size={16} className="text-[#0D365A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-slate-900 font-sans">{stats.totalStudents}</h4>
            <span className="text-[11px] font-bold text-slate-400">طالب</span>
          </div>
          <p className="text-[9px] font-extrabold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={10} />
            <span>منهم {stats.activeStudents} طالب نشط</span>
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase">تسجيلات الشهر الحالي</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-emerald-600 font-sans">+{stats.newThisMonth}</h4>
            <span className="text-[11px] font-bold text-slate-400">طالب جديد</span>
          </div>
          <p className="text-[9px] font-extrabold text-slate-500">
            {stats.momGrowthRate >= 0 ? (
              <span className="text-emerald-600">▲ {stats.momGrowthRate}% مقارنة بالشهر السابق</span>
            ) : (
              <span className="text-rose-500">▼ {Math.abs(stats.momGrowthRate)}% مقارنة بالشهر السابق</span>
            )}
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase">المادة الأكثر إقبالاً</span>
            <Award size={16} className="text-[#D4A33C]" />
          </div>
          <div className="flex items-baseline gap-2 truncate">
            <h4 className="text-lg font-black text-slate-900 truncate" title={stats.topSubject}>
              {stats.topSubject}
            </h4>
          </div>
          <p className="text-[9px] font-extrabold text-[#D4A33C] flex items-center gap-1">
            <Sparkles size={10} />
            <span>{stats.topSubjectCount} طالب مسجل</span>
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase">عدد المواد المخدومة</span>
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-indigo-600 font-sans">
              {subjectDistributionData.items.length}
            </h4>
            <span className="text-[11px] font-bold text-slate-400">مقرر / تخصص</span>
          </div>
          <p className="text-[9px] font-extrabold text-slate-500">
            إجمالي المقاعد النشطة: {subjectDistributionData.totalCount}
          </p>
        </div>
      </div>

      {/* Primary Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Monthly Registration Growth Chart (Recharts Area + Bar combination) */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                المنحنى الزمني الشهري
              </span>
              <h4 className="text-base font-black text-slate-900 mt-0.5">
                نمو تسجيل الطلاب شهرياً والتراكمي
              </h4>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                مقارنة الطلاب الجدد الملتحقين في كل شهر مع المنحنى التراكمي الإجمالي
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 self-start sm:self-auto">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0D365A]" />
                <span className="text-[11px]">طلاب جدد (شهري)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4A33C]" />
                <span className="text-[11px]">التراكمي</span>
              </span>
            </div>
          </div>

          <div className="h-[320px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="growthCumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A33C" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#D4A33C" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="growthNewStudentsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D365A" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0D365A" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-right font-sans text-xs space-y-1.5" dir="rtl">
                          <div className="font-black text-[#D4A33C] border-b border-slate-800 pb-1">
                            {label}
                          </div>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: entry.color }} 
                                />
                                {entry.name}:
                              </span>
                              <span className="font-black font-mono text-white">
                                {entry.value} طالب
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="إجمالي الطلاب التراكمي"
                  stroke="#D4A33C"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#growthCumulativeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="طلاب جدد"
                  stroke="#0D365A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#growthNewStudentsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Subject Distribution Chart (Recharts Pie/Donut or Bar) */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                  التصنيف الأكاديمي
                </span>
                <h4 className="text-base font-black text-slate-900 mt-0.5">
                  توزع الطلاب حسب المواد
                </h4>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  نسبة الإقبال على كل مادة وتخصص
                </p>
              </div>

              {/* View Switcher: Donut vs Bar */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDistributionView('donut')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    distributionView === 'donut'
                      ? 'bg-white text-[#0D365A] shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="مخطط دائري مفرغ"
                >
                  دائري
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionView('bar')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    distributionView === 'bar'
                      ? 'bg-white text-[#0D365A] shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="أعمدة بيانية أفقية"
                >
                  أعمدة
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-[230px] w-full relative mt-4" dir="ltr">
              {distributionView === 'donut' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistributionData.items}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {subjectDistributionData.items.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PALETTE[index % PALETTE.length]} 
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const percent = subjectDistributionData.totalCount > 0 
                            ? Math.round(((data.value as number) / subjectDistributionData.totalCount) * 100) 
                            : 0;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-right font-sans text-xs border border-slate-800 space-y-1" dir="rtl">
                              <div className="font-black text-[#D4A33C]">{data.name}</div>
                              <div className="text-slate-300 font-bold">
                                {data.value} طالب ({percent}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectDistributionData.items.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={80}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0];
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-right font-sans text-xs" dir="rtl">
                              <span className="font-black text-[#D4A33C] block">{d.payload.name}</span>
                              <span className="text-slate-300 font-bold">{d.value} طالب</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                      {subjectDistributionData.items.slice(0, 6).map((_, index) => (
                        <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Center Donut Label */}
              {distributionView === 'donut' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 font-sans leading-none">
                    {subjectDistributionData.totalCount}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase mt-1">
                    طالب مسجل
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Compact Subject Legend Breakdown */}
          <div className="pt-3 border-t border-slate-100 space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {subjectDistributionData.items.slice(0, 6).map((item, idx) => {
              const pct = subjectDistributionData.totalCount > 0 
                ? Math.round((item.value / subjectDistributionData.totalCount) * 100) 
                : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} 
                    />
                    <span className="text-slate-700 truncate" title={item.name}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                    <span className="font-black text-slate-900 font-mono">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
