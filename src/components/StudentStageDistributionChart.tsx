import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  HelpCircle, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  CheckCircle2, 
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Student } from '../types';
import { detectAcademicStage } from './StudentFinancialBalancesChartCard';

export interface StudentStageDistributionChartProps {
  students: Student[];
  onSelectStage?: (stageKey: 'all' | 'secondary' | 'middle' | 'primary' | 'other') => void;
  selectedStageFilter?: string;
  className?: string;
}

interface StageMetadata {
  key: 'secondary' | 'middle' | 'primary' | 'other';
  label: string;
  shortLabel: string;
  gradeRange: string;
  color: string;
  hoverColor: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const STAGES_CONFIG: Record<'secondary' | 'middle' | 'primary' | 'other', StageMetadata> = {
  secondary: {
    key: 'secondary',
    label: 'المرحلة الثانوية والبجروت',
    shortLabel: 'الثانوية والبجروت',
    gradeRange: 'الصفوف 10 - 12 (توجيهي وبجروت)',
    color: '#1E40AF', // Deep Royal Navy Blue
    hoverColor: '#1D4ED8',
    bgLight: 'bg-blue-50/60',
    borderLight: 'border-blue-200/80',
    badgeBg: 'bg-blue-100 text-blue-900',
    badgeText: 'text-blue-700',
    icon: GraduationCap,
    description: 'طلاب شهادة الثانوية العامة، البجروت، والصفوف العاشر والحادي عشر'
  },
  middle: {
    key: 'middle',
    label: 'المرحلة الإعدادية والمتوسطة',
    shortLabel: 'المرحلة الإعدادية',
    gradeRange: 'الصفوف 7 - 9 (سابع، ثامن، تاسع)',
    color: '#D97706', // Academy Amber/Gold
    hoverColor: '#B45309',
    bgLight: 'bg-amber-50/60',
    borderLight: 'border-amber-200/80',
    badgeBg: 'bg-amber-100 text-amber-900',
    badgeText: 'text-amber-700',
    icon: School,
    description: 'الصفوف الإعدادية الأساسية وتجهيز الطلاب للمرحلة الثانوية'
  },
  primary: {
    key: 'primary',
    label: 'المرحلة الأساسية والابتدائية',
    shortLabel: 'المرحلة الأساسية',
    gradeRange: 'الصفوف 1 - 6 (تأسيس ومتابعة)',
    color: '#059669', // Emerald Green
    hoverColor: '#047857',
    bgLight: 'bg-emerald-50/60',
    borderLight: 'border-emerald-200/80',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    badgeText: 'text-emerald-700',
    icon: BookOpen,
    description: 'صفوف التأسيس المبكر والمتابعة المدرسية الابتدائية'
  },
  other: {
    key: 'other',
    label: 'أخرى وغير محدد',
    shortLabel: 'أخرى',
    gradeRange: 'تعليم عام / جامعي / دورات خاصة',
    color: '#64748B', // Slate
    hoverColor: '#475569',
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800',
    badgeText: 'text-slate-600',
    icon: HelpCircle,
    description: 'الطلاب المسجلون بدورات نوعية بدون تصنيف مرحلي مدرسي'
  }
};

export const StudentStageDistributionChart: React.FC<StudentStageDistributionChartProps> = ({
  students = [],
  onSelectStage,
  selectedStageFilter = 'all',
  className = ''
}) => {
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hoveredStageKey, setHoveredStageKey] = useState<string | null>(null);

  // Compute distribution of students across academic stages
  const distributionData = useMemo(() => {
    const counts: Record<'secondary' | 'middle' | 'primary' | 'other', {
      count: number;
      activeCount: number;
      gradesBreakdown: Record<string, number>;
    }> = {
      secondary: { count: 0, activeCount: 0, gradesBreakdown: {} },
      middle: { count: 0, activeCount: 0, gradesBreakdown: {} },
      primary: { count: 0, activeCount: 0, gradesBreakdown: {} },
      other: { count: 0, activeCount: 0, gradesBreakdown: {} }
    };

    let total = 0;
    let totalActive = 0;

    students.forEach(st => {
      const isArchived = Boolean(st.archived || (st.status as any) === 'archived');
      if (!includeArchived && isArchived) return;

      const stage = detectAcademicStage(st.grade || st.academicLevel || '');
      counts[stage].count += 1;
      total += 1;

      const isActive = !isArchived && ((st.academicStatus || 'Active') === 'Active');
      if (isActive) {
        counts[stage].activeCount += 1;
        totalActive += 1;
      }

      const rawGrade = (st.grade || st.academicLevel || 'غير محدد').trim();
      counts[stage].gradesBreakdown[rawGrade] = (counts[stage].gradesBreakdown[rawGrade] || 0) + 1;
    });

    const stagesList: Array<StageMetadata & {
      count: number;
      activeCount: number;
      percentage: number;
      topGrades: Array<{ name: string; count: number }>;
    }> = (['secondary', 'middle', 'primary', 'other'] as const).map(key => {
      const stageMeta = STAGES_CONFIG[key];
      const count = counts[key].count;
      const activeCount = counts[key].activeCount;
      const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

      const topGrades = Object.entries(counts[key].gradesBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, gCount]) => ({ name, count: gCount }));

      return {
        ...stageMeta,
        count,
        activeCount,
        percentage,
        topGrades
      };
    });

    // Recharts dataset (only non-zero or all if empty)
    const chartData = stagesList.map(st => ({
      key: st.key,
      name: st.shortLabel,
      fullName: st.label,
      value: st.count,
      activeCount: st.activeCount,
      percentage: st.percentage,
      color: st.color
    }));

    // Find the most represented stage
    const highestStage = [...stagesList].sort((a, b) => b.count - a.count)[0];

    return {
      total,
      totalActive,
      stagesList,
      chartData,
      highestStage
    };
  }, [students, includeArchived]);

  // Custom Recharts Donut Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const meta = STAGES_CONFIG[data.key as keyof typeof STAGES_CONFIG] || STAGES_CONFIG.other;
      return (
        <div 
          className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-right min-w-[210px] backdrop-blur-sm"
          dir="rtl"
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            <span 
              className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
              style={{ backgroundColor: data.color }} 
            />
            <span className="font-black text-xs text-white leading-tight">
              {data.fullName}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>إجمالي الطلاب:</span>
              <strong className="text-white font-mono font-black text-xs">{data.value} طالب</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>النسبة المئوية:</span>
              <strong className="text-amber-400 font-mono font-black text-xs">{data.percentage}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>الطلاب النشطون:</span>
              <strong className="text-emerald-400 font-mono font-bold">{data.activeCount} طالب</strong>
            </div>
            <p className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 leading-normal">
              {meta.gradeRange}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Bar Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-right min-w-[190px]"
          dir="rtl"
        >
          <div className="flex items-center gap-2 mb-1.5 font-black text-xs text-white">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.fullName}</span>
          </div>
          <div className="text-[11px] space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span>عدد الطلاب:</span>
              <strong className="font-mono text-white text-xs">{data.value}</strong>
            </div>
            <div className="flex justify-between">
              <span>النسبة:</span>
              <strong className="font-mono text-amber-400 text-xs">{data.percentage}%</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleStageCardClick = (key: 'secondary' | 'middle' | 'primary' | 'other') => {
    if (!onSelectStage) return;
    if (selectedStageFilter === key) {
      onSelectStage('all');
    } else {
      onSelectStage(key);
    }
  };

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all text-right font-sans ${className}`} 
      dir="rtl"
    >
      {/* Executive Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D365A] to-[#1E40AF] text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap size={20} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                توزيع الطلاب حسب المرحلة الدراسية
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {distributionData.total} طالب مسجل
              </span>
              {distributionData.highestStage && distributionData.highestStage.count > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  <Sparkles size={11} className="text-amber-500" />
                  الأكثر كثافة: {distributionData.highestStage.shortLabel} ({distributionData.highestStage.percentage}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              مخطط بياني مرئي ومبسط لحجم ونسب الطلاب في المراحل: الثانوية والبجروت، الإعدادية، والأساسية
            </p>
          </div>
        </div>

        {/* View Controls & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'donut'
                  ? 'bg-white text-[#0D365A] shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كمخطط دائري مفرغ"
            >
              <PieIcon size={13} />
              <span>دائري</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-[#0D365A] shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كمخطط أعمدة متجاورة"
            >
              <BarChart3 size={13} />
              <span>أعمدة</span>
            </button>
          </div>

          {/* Active vs Archived Toggle */}
          <button
            type="button"
            onClick={() => setIncludeArchived(!includeArchived)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              includeArchived
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="تضمين أو استثناء الطلاب المؤرشفين"
          >
            <Filter size={12} className={includeArchived ? 'text-amber-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">{includeArchived ? 'كافة الطلاب (مع الأرشيف)' : 'النشطون فقط'}</span>
            <span className="sm:hidden">{includeArchived ? 'الكل' : 'النشطون'}</span>
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
            title={isCollapsed ? 'توسيع الرسم البياني' : 'طي الرسم البياني'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content Area (Collapsible) */}
      {!isCollapsed && (
        <div className="p-5 space-y-5">
          {/* Grid Layout: Visual Chart on Left (or center), Stage KPI Cards on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Visual Chart Panel (5 cols on lg) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-50/70 to-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Layers size={13} className="text-[#0D365A]" />
                  التمثيل البياني المباشر للنسب
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  المجموع: <strong className="font-mono text-slate-700">{distributionData.total}</strong>
                </span>
              </div>

              {/* Chart Canvas */}
              <div className="h-[220px] w-full relative flex items-center justify-center">
                {distributionData.total === 0 ? (
                  <div className="text-center text-xs text-slate-400 font-medium py-10">
                    لا توجد بيانات طلاب مسجلة حالياً لعرض الرسم البياني
                  </div>
                ) : chartType === 'donut' ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={distributionData.chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={92}
                          paddingAngle={3}
                          onMouseEnter={(entry) => setHoveredStageKey(entry.key)}
                          onMouseLeave={() => setHoveredStageKey(null)}
                          onClick={(entry) => handleStageCardClick(entry.key)}
                          cursor="pointer"
                          animationDuration={800}
                        >
                          {distributionData.chartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.key}`}
                              fill={entry.color}
                              stroke="#ffffff"
                              strokeWidth={2}
                              opacity={hoveredStageKey && hoveredStageKey !== entry.key ? 0.45 : 1}
                              style={{ transition: 'opacity 0.2s ease' }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">إجمالي</span>
                      <strong className="text-2xl font-black font-mono text-slate-900 leading-tight">
                        {distributionData.total}
                      </strong>
                      <span className="text-[10px] font-bold text-emerald-600">طالب</span>
                    </div>
                  </>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributionData.chartData}
                      layout="vertical"
                      margin={{ top: 8, right: 15, left: 15, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 700 }}
                        width={90}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 6, 6, 0]}
                        onClick={(entry) => handleStageCardClick(entry.key)}
                        cursor="pointer"
                        animationDuration={800}
                      >
                        {distributionData.chartData.map((entry) => (
                          <Cell 
                            key={`bar-${entry.key}`} 
                            fill={entry.color}
                            opacity={hoveredStageKey && hoveredStageKey !== entry.key ? 0.45 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Chart Legend Footer */}
              <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-slate-150 mt-1">
                {distributionData.stagesList.map((stage) => {
                  const isSelected = selectedStageFilter === stage.key;
                  return (
                    <button
                      key={`legend-${stage.key}`}
                      type="button"
                      onClick={() => handleStageCardClick(stage.key)}
                      onMouseEnter={() => setHoveredStageKey(stage.key)}
                      onMouseLeave={() => setHoveredStageKey(null)}
                      className={`flex items-center justify-between px-2 py-1 rounded-md text-[10px] transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 text-white font-black' 
                          : 'hover:bg-slate-100 text-slate-700 font-bold'
                      }`}
                      title={`تصفية حسب: ${stage.label}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-sm shrink-0" 
                          style={{ backgroundColor: stage.color }} 
                        />
                        <span className="truncate">{stage.shortLabel}</span>
                      </div>
                      <span className="font-mono font-black shrink-0 mr-1 text-[11px]">
                        {stage.percentage}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage KPI Cards (7 cols on lg) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
              {distributionData.stagesList.map((stage) => {
                const IconComponent = stage.icon;
                const isSelected = selectedStageFilter === stage.key;
                const isHovered = hoveredStageKey === stage.key;

                return (
                  <div
                    key={`card-${stage.key}`}
                    onClick={() => handleStageCardClick(stage.key)}
                    onMouseEnter={() => setHoveredStageKey(stage.key)}
                    onMouseLeave={() => setHoveredStageKey(null)}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer relative overflow-hidden select-none ${
                      isSelected
                        ? 'border-2 ring-2 ring-offset-1 ring-slate-900 shadow-md bg-white'
                        : `${stage.borderLight} ${stage.bgLight} hover:shadow-xs hover:border-slate-400/80`
                    } ${isHovered && !isSelected ? 'scale-[1.015]' : ''}`}
                    style={isSelected ? { borderColor: stage.color } : {}}
                  >
                    {/* Top Accent Strip */}
                    <div 
                      className="absolute top-0 right-0 left-0 h-1" 
                      style={{ backgroundColor: stage.color }} 
                    />

                    {/* Card Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-2xs"
                            style={{ backgroundColor: stage.color }}
                          >
                            <IconComponent size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {stage.label}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {stage.gradeRange}
                            </span>
                          </div>
                        </div>

                        {/* Percentage Tag */}
                        <span 
                          className="font-mono text-xs font-black px-2 py-0.5 rounded-md shadow-2xs shrink-0"
                          style={{
                            backgroundColor: `${stage.color}15`,
                            color: stage.color
                          }}
                        >
                          {stage.percentage}%
                        </span>
                      </div>

                      {/* Main Count Figure */}
                      <div className="my-2.5 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black font-mono text-slate-900">
                            {stage.count}
                          </span>
                          <span className="text-xs font-bold text-slate-500">طالب</span>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-md">
                          {stage.activeCount} نشط
                        </span>
                      </div>

                      {/* Visual Linear Progress Bar */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden my-2">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.max(stage.percentage, stage.count > 0 ? 4 : 0)}%`,
                            backgroundColor: stage.color 
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Footer: Top Sample Grades & Filter CTA */}
                    <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <div className="truncate max-w-[170px] text-slate-500">
                        {stage.topGrades.length > 0 ? (
                          <span>
                            الأبرز: <strong className="text-slate-700">{stage.topGrades[0].name}</strong> ({stage.topGrades[0].count})
                          </span>
                        ) : (
                          <span className="text-slate-400">لا يوجد طلاب مسجلون</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 font-bold text-[10px] text-slate-700">
                        {isSelected ? (
                          <span className="text-slate-900 font-black inline-flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            مفعل بالجدول
                          </span>
                        ) : (
                          <span className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5">
                            تصفية الجدول
                            <ArrowUpRight size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Quick Filter Reset Banner if a stage is actively selected */}
          {selectedStageFilter && selectedStageFilter !== 'all' && (
            <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-bold shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  يتم حالياً تصفية قائمة الطلاب لعرض: <strong className="text-amber-300">{STAGES_CONFIG[selectedStageFilter as keyof typeof STAGES_CONFIG]?.label || selectedStageFilter}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectStage && onSelectStage('all')}
                className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-black transition-colors cursor-pointer"
              >
                إلغاء التصفية وعرض الكل ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentStageDistributionChart;
