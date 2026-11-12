import React, { useState } from 'react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, Legend 
} from 'recharts';
import { 
  LayoutGrid, Download, FileSpreadsheet, FileText, Users, 
  CreditCard, DollarSign, Clock, BarChart3, Activity, Loader2 
} from 'lucide-react';
import { TeacherSalariesFlowChart } from './TeacherSalariesFlowChart';
import { MonthlyPerformanceSummaryDashboard } from './MonthlyPerformanceSummaryDashboard';
import { StudentGrowthAndSubjectDistribution } from './StudentGrowthAndSubjectDistribution';
import { MonthlyProfitComparisonDashboard } from './MonthlyProfitComparisonDashboard';

interface CustomizableDashboardProps {
  teachers: any[];
  students: any[];
  sessions: any[];
  allSessions?: any[];
  payments: any[];
  credits: any[];
  expenses?: any[];
  groupCourses?: any[];
  assignments?: any[];
  stats: any;
  monthlyPerfChartData: any[];
  perfMetric: string;
  setPerfMetric: (metric: string) => void;
  perfTeacherId: string;
  setPerfTeacherId: (id: string) => void;
  globalSettings: any;
  allStudentAlerts: any[];
  exportStudentBalances: (format: 'xlsx' | 'csv') => void;
  TeacherProductivityDashboard: React.ComponentType<any>;
  onOpenMonthlyFinancialReport?: (year?: number, month?: number) => void;
  onNavigateToStudentFinancials?: () => void;
  onExportFinancialDashboardPDF?: () => void;
  isExportingFinancialPDF?: boolean;
  onExportFinancialDashboardExcel?: () => void;
  isExportingFinancialExcel?: boolean;
}

export const CustomizableDashboard: React.FC<CustomizableDashboardProps> = ({
  teachers,
  students,
  sessions,
  allSessions,
  payments,
  credits,
  expenses = [],
  groupCourses = [],
  assignments = [],
  stats,
  monthlyPerfChartData,
  perfMetric,
  setPerfMetric,
  perfTeacherId,
  setPerfTeacherId,
  globalSettings,
  allStudentAlerts,
  exportStudentBalances,
  TeacherProductivityDashboard,
  onOpenMonthlyFinancialReport,
  onNavigateToStudentFinancials,
  onExportFinancialDashboardPDF,
  isExportingFinancialPDF = false,
  onExportFinancialDashboardExcel,
  isExportingFinancialExcel = false,
}) => {
  // Widget Customization States
  const [widgets, setWidgets] = useState<any[]>(() => {
    const defaultWidgets = [
      { id: 'monthly_profit_comparison', name: 'المقارنة البيانية لأرباح المركز (الشهر الحالي مقابل السابق)', description: 'لوحة تفاعلية متقدمة تعرض مقارنة بيانية ورسوماً إحصائية بين أرباح المركز في الشهر الحالي والشهر السابق', visible: true },
      { id: 'student_growth_distribution', name: 'نمو تسجيل الطلاب وتوزعهم حسب المواد الدراسية', description: 'رصد بياني (Recharts) لنمو تسجيل الطلاب شهرياً وتوزعهم ونسب الإقبال حسب المواد', visible: true },
      { id: 'top_performance_summary', name: 'أكثر 5 مواد طلباً وأكثر المعلمين إنتاجية', description: 'تحليل بياني وإحصائي للمواد الأكثر طلباً وكفاءة المعلمين للشهر الحالي مع لوحة الشرف', visible: true },
      { id: 'indicators', name: 'المؤشرات الكلية اليومية السريعة', description: 'إيرادات اليوم، الطلاب النشطين، حصص اليوم، والنشاط المباشر', visible: true },
      { id: 'salaries_flow', name: 'التحليل البياني للرواتب والتدفقات المالية الشهرية', description: 'كشف بياني تفاعلي لإجمالي الرواتب المكتسبة والمسددة وإيرادات الحصص شهرياً', visible: true },
      { id: 'productivity', name: 'إنتاجية المعلمين والأجور الجارية', description: 'تتبع كفاءة المدرسين المنجزة ومستحقاتهم المالية للفترة الحالية', visible: true },
      { id: 'liquidity', name: 'توزيع الأرصدة والسيولة الوقائية للطلاب', description: 'تحليل توزيع ملاءة أرصدة الطلاب الكلية (السيولة والذمم والديون)', visible: true },
      { id: 'charts', name: 'الرسوم التحليلية والربحية الكلية للمركز', description: 'المحاسبة والربحية الإجمالية، كثافة عمل المعلمين، ونسبة تسوية الذمم', visible: true },
      { id: 'evolution', name: 'منحنى تطور أداء المعلمين التاريخي والشهري', description: 'تتبع تطور ساعات التدريس المنجزة، العائدات وصافي الفوائد شهرياً', visible: true },
      { id: 'temporal', name: 'المنحنى الزمني للمبيعات والتعليم الجاري', description: 'كشف مقارن بالإيرادات وتكاليف التشغيل اليومية التراكمية لآخر 30 يوماً', visible: true }
    ];

    const saved = typeof window !== 'undefined' ? localStorage.getItem('manager_dashboard_widgets_v4') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let updated = [...parsed];
        if (!updated.some((w: any) => w.id === 'monthly_profit_comparison')) {
          updated = [defaultWidgets[0], ...updated];
        }
        if (!updated.some((w: any) => w.id === 'student_growth_distribution')) {
          updated = [defaultWidgets[1], ...updated];
        }
        return updated;
      } catch (e) {
        console.error(e);
      }
    }
    return defaultWidgets;
  });
  
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showStudentExDropdown, setShowStudentExDropdown] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...widgets];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setWidgets(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    localStorage.setItem('manager_dashboard_widgets_v4', JSON.stringify(widgets));
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v4', JSON.stringify(updated));
  };

  const resetWidgets = () => {
    const defaultWidgets = [
      { id: 'student_growth_distribution', name: 'نمو تسجيل الطلاب وتوزعهم حسب المواد الدراسية', description: 'رصد بياني (Recharts) لنمو تسجيل الطلاب شهرياً وتوزعهم ونسب الإقبال حسب المواد', visible: true },
      { id: 'top_performance_summary', name: 'أكثر 5 مواد طلباً وأكثر المعلمين إنتاجية', description: 'تحليل بياني وإحصائي للمواد الأكثر طلباً وكفاءة المعلمين للشهر الحالي مع لوحة الشرف', visible: true },
      { id: 'indicators', name: 'المؤشرات الكلية اليومية السريعة', description: 'إيرادات اليوم، الطلاب النشطين، حصص اليوم، والنشاط المباشر', visible: true },
      { id: 'salaries_flow', name: 'التحليل البياني للرواتب والتدفقات المالية الشهرية', description: 'كشف بياني تفاعلي لإجمالي الرواتب المكتسبة والمسددة وإيرادات الحصص شهرياً', visible: true },
      { id: 'productivity', name: 'إنتاجية المعلمين والأجور الجارية', description: 'تتبع كفاءة المدرسين المنجزة ومستحقاتهم المالية للفترة الحالية', visible: true },
      { id: 'liquidity', name: 'توزيع الأرصدة والسيولة الوقائية للطلاب', description: 'تحليل توزيع ملاءة أرصدة الطلاب الكلية (السيولة والذمم والديون)', visible: true },
      { id: 'charts', name: 'الرسوم التحليلية والربحية الكلية للمركز', description: 'المحاسبة والربحية الإجمالية، كثافة عمل المعلمين، ونسبة تسوية الذمم', visible: true },
      { id: 'evolution', name: 'منحنى تطور أداء المعلمين التاريخي والشهري', description: 'تتبع تطور ساعات التدريس المنجزة، العائدات وصافي الفوائد شهرياً', visible: true },
      { id: 'temporal', name: 'المنحنى الزمني للمبيعات والتعليم الجاري', description: 'كشف مقارن بالإيرادات وتكاليف التشغيل اليومية التراكمية لآخر 30 يوماً', visible: true }
    ];
    setWidgets(defaultWidgets);
    localStorage.setItem('manager_dashboard_widgets_v4', JSON.stringify(defaultWidgets));
  };

  const moveWidgetUp = (index: number) => {
    if (index === 0) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v4', JSON.stringify(updated));
  };

  const moveWidgetDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v4', JSON.stringify(updated));
  };

  return (
    <div className="space-y-10">
      {/* Customizer Controls Banner */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100 p-6 rounded-[2rem] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-right">
          <h4 className="text-sm font-black text-[#0D365A] flex items-center gap-2">
            <span>لوحة التحكم الذكية للمدير ⚙️</span>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-extrabold">تخصيص كامل بالسحب والإفلات</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1 font-bold">يمكنك الآن إعادة ترتيب وإخفاء أقسام لوحة الإحصائيات لتناسب أولويات المتابعة السريعة لديك.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {onExportFinancialDashboardPDF && (
            <button
              onClick={onExportFinancialDashboardPDF}
              disabled={isExportingFinancialPDF}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm bg-gradient-to-r from-emerald-600 via-teal-700 to-[#0D365A] text-white hover:opacity-95 select-none ${
                isExportingFinancialPDF ? 'opacity-80 cursor-wait' : ''
              }`}
              title="تصدير كشف رسمي فوري للمركز المالي وصافي الأرباح وأرصدة ومستحقات الطلاب كملف PDF"
              id="dashboard-header-export-financial-pdf-btn"
            >
              <FileText size={14} className="text-emerald-300" />
              <span>{isExportingFinancialPDF ? 'جاري تجهيز تقرير المركز المالي...' : 'تقرير المركز المالي والأرصدة (PDF) 📊'}</span>
            </button>
          )}

          {onExportFinancialDashboardExcel && (
            <button
              onClick={onExportFinancialDashboardExcel}
              disabled={isExportingFinancialExcel}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:opacity-95 select-none border border-emerald-400/50 ${
                isExportingFinancialExcel ? 'opacity-80 cursor-wait' : ''
              }`}
              title="تصدير كشف رسمي فوري للمركز المالي وصافي الأرباح وأرصدة الطلاب بصيغة ملف Excel (.xlsx)"
              id="dashboard-header-export-financial-excel-btn"
            >
              {isExportingFinancialExcel ? (
                <Loader2 size={14} className="animate-spin text-emerald-200" />
              ) : (
                <FileSpreadsheet size={14} className="text-emerald-200" />
              )}
              <span>{isExportingFinancialExcel ? 'جاري إنشاء ملف Excel...' : 'تقرير المركز المالي والأرصدة (Excel) 📊'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              isCustomizing 
                ? 'bg-amber-500 text-slate-900 font-black shadow-md' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            <LayoutGrid size={14} className={isCustomizing ? 'animate-spin' : ''} />
            <span>{isCustomizing ? 'إغلاق نافذة التخصيص 💾' : 'تعديل وتخصيص المظهر 🛠️'}</span>
          </button>
        </div>
      </div>

      {/* Expanded customization drawer / panel */}
      {isCustomizing && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-md text-right space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h5 className="font-black text-slate-800 text-sm">ترتيب وتفعيل عناصر اللوحة الجارية</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 font-bold">قم بسحب وإفلات العناصر باستخدام المقبض ☰ أو استخدم الأسهم لتعديل الترتيب.</p>
            </div>
            <button
              onClick={resetWidgets}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer"
            >
              🔄 إعادة تعيين للوضع التلقائي
            </button>
          </div>

          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  draggedIndex === index
                    ? 'bg-indigo-50/50 border-indigo-300 border-dashed opacity-70 scale-[0.99]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-150'
                }`}
              >
                {/* Visibility check & manual sorting arrows */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      widget.visible
                        ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-350'
                    }`}
                  >
                    {widget.visible ? '🟢 مرئي' : '⚪ مخفي'}
                  </button>

                  <div className="flex items-center gap-1 font-sans">
                    <button
                      onClick={() => moveWidgetUp(index)}
                      disabled={index === 0}
                      className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveWidgetDown(index)}
                      disabled={index === widgets.length - 1}
                      className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Widget details */}
                <div className="flex items-center gap-3 flex-1 text-right justify-end">
                  <div>
                    <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 justify-end">
                      {!widget.visible && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">مخفي حالياً</span>}
                      <span>{widget.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-bold">{widget.description}</div>
                  </div>
                  <span className="text-slate-400 font-black cursor-grab select-none text-base">☰</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Render according to user layout */}
      {widgets.map((widget) => {
        if (!widget.visible) return null;

        switch (widget.id) {
          case 'monthly_profit_comparison':
            return (
              <div key="monthly_profit_comparison">
                <MonthlyProfitComparisonDashboard
                  teachers={teachers}
                  sessions={allSessions || sessions}
                  students={students}
                  assignments={assignments}
                  payments={payments}
                  credits={credits}
                  expenses={expenses}
                  groupCourses={groupCourses}
                  globalSettings={globalSettings}
                  onOpenMonthlyFinancialReport={onOpenMonthlyFinancialReport}
                />
              </div>
            );

          case 'top_performance_summary':
            return (
              <div key="top_performance_summary">
                <MonthlyPerformanceSummaryDashboard
                  teachers={teachers}
                  sessions={sessions}
                  students={students}
                  assignments={assignments}
                  payments={payments}
                  credits={credits}
                  expenses={expenses}
                  groupCourses={groupCourses}
                  globalSettings={globalSettings}
                  onOpenMonthlyFinancialReport={onOpenMonthlyFinancialReport}
                />
              </div>
            );

          case 'indicators':
            return (
              <div key="indicators" className="bg-gradient-to-r from-slate-900 to-[#0d365a] text-white rounded-[2rem] p-8 shadow-md relative overflow-hidden text-right border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">المؤشرات اللحظية الجارية</span>
                    <h3 className="text-lg font-black text-white mt-0.5">لوحة القيادة والمؤشرات الكلية السريعة لليوم</h3>
                    <p className="text-[11px] text-slate-350 font-bold mt-1">
                      رصد فوري لتدفق الأموال الواردة (شحن الأرصدة) والنشاط التعليمي للمعلمين والطلاب النشطين اليوم {getLocalDateString()}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-slate-850 border border-slate-700/60 rounded-2xl text-[10px] font-black text-slate-300">
                    محدث تلقائياً 🟢
                  </div>
                </div>

                {/* Dynamic Metrics Cards (Bento-style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                  
                  {/* Active Students Card */}
                  <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase">الطلاب النشطون</span>
                      <span className="text-2xl font-black text-white block font-sans mt-1">
                        {students.filter(s => s.archived !== true).length} <span className="text-xs text-slate-400 font-bold">طالب</span>
                      </span>
                    </div>
                    <div className="p-3 bg-teal-500/10 rounded-xl text-teal-300">
                      <Users size={20} />
                    </div>
                  </div>

                  {/* Daily Deposits (Daily income) */}
                  {(() => {
                    const todayDateStr = getLocalDateString();
                    const todayDeposits = credits
                      .filter(c => c.date === todayDateStr)
                      .reduce((sum, c) => sum + c.amount, 0);
                    return (
                      <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase">الدخل اليومي (شحن الأرصدة)</span>
                          <span className="text-2xl font-black text-emerald-400 block font-sans mt-1">
                            ₪{todayDeposits.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-300">
                          <CreditCard size={20} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Today Accrued Sessions Income */}
                  {(() => {
                    const todayDateStr = getLocalDateString();
                    const todaySessions = sessions.filter(s => s.date === todayDateStr && s.approved !== false);
                    const todayAccrued = todaySessions.reduce((sum, s) => {
                      if (s.customFee !== undefined) return sum + s.customFee;
                      const student = students.find(st => st.id === s.studentId);
                      const rate = student?.hourlyRate ?? student?.customRates?.[s.teacherId] ?? globalSettings?.defaultStudentHourlyRate ?? 50;
                      return sum + (s.durationHours * rate);
                    }, 0);
                    return (
                      <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase">قيمة الحصص الجارية (اليوم)</span>
                          <span className="text-2xl font-black text-[#D4A33C] block font-sans mt-1">
                            ₪{todayAccrued.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-300">
                          <DollarSign size={20} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Today Completed Sessions Count */}
                  {(() => {
                    const todayDateStr = getLocalDateString();
                    const todaySessions = sessions.filter(s => s.date === todayDateStr && s.approved !== false);
                    return (
                      <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase">عدد حصص اليوم المنجزة</span>
                          <span className="text-2xl font-black text-indigo-300 block font-sans mt-1">
                            {todaySessions.length} <span className="text-xs text-slate-400 font-bold">حصص</span>
                          </span>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-300">
                          <Clock size={20} />
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            );

          case 'productivity':
            return (
              <div key="productivity">
                <TeacherProductivityDashboard 
                  teachers={teachers} 
                  sessions={sessions} 
                  payments={payments} 
                  assignments={assignments}
                />
              </div>
            );

          case 'liquidity':
            return (
              <div key="liquidity" className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden text-right">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="mb-6 pb-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">تحليلات السيولة وتوزع الذمم المالية</span>
                    <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                      <span>مركز توزيع أرصدة الطلاب والسيولة الوقائية</span>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-md font-black">تحليل تفاعلي</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-bold">تتبع ملاءة الحسابات للطلاب المسجلين، الرصد الإيجابي والسلبي ومؤشر شحن المحافظ المالي</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onNavigateToStudentFinancials && (
                      <button
                        onClick={onNavigateToStudentFinancials}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer select-none"
                        title="عرض التحليلات التفصيلية والمخططات البيانية بالـ Recharts"
                      >
                        <BarChart3 size={14} />
                        <span>مخططات الأرصدة والتحصيل (Recharts) 📊</span>
                      </button>
                    )}

                    {/* Student Balances Export Dropdown Button */}
                    <div className="relative shrink-0">
                    <button
                      onClick={() => setShowStudentExDropdown(!showStudentExDropdown)}
                      className="h-10 px-4 bg-indigo-650 hover:bg-slate-900 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer select-none"
                    >
                      <Download size={14} />
                      <span>تصدير أرصدة كلي للطلاب</span>
                    </button>
                    
                    {showStudentExDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowStudentExDropdown(false)} />
                        <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-150 rounded-xl shadow-xl z-20 text-right overflow-hidden animate-fade-in font-sans">
                          {onExportFinancialDashboardPDF && (
                            <button
                              onClick={() => { onExportFinancialDashboardPDF(); setShowStudentExDropdown(false); }}
                              className="w-full px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors flex items-center gap-2 justify-start border-b border-slate-100 cursor-pointer"
                            >
                              <FileText size={15} className="text-emerald-600" />
                              <span>تصدير تقرير المركز والأرصدة (PDF) 📄</span>
                            </button>
                          )}
                          <button
                            onClick={() => { exportStudentBalances('xlsx'); setShowStudentExDropdown(false); }}
                            className="w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors flex items-center gap-2 justify-start border-b border-slate-100"
                          >
                            <FileSpreadsheet size={15} className="text-indigo-600" />
                            <span>تنزيل مخصص لبرنامج إكسل (Excel)</span>
                          </button>
                          <button
                            onClick={() => { exportStudentBalances('csv'); setShowStudentExDropdown(false); }}
                            className="w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 justify-start"
                          >
                            <FileText size={15} className="text-slate-500" />
                            <span>تنزيل كملف CSV عام</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right">
                  {/* SPEEDOMETER PANEL */}
                  <div className="lg:col-span-1 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-between min-h-[380px] text-center">
                     <div className="w-full text-right mb-2">
                        <span className="text-[10px] font-black text-slate-400 block uppercase">مؤشر الملاءة والتحصيل المالي</span>
                        <h4 className="text-sm font-black text-slate-800">معدل الحسابات الآمنة (موجب)</h4>
                     </div>

                     {/* Gauge graphics using custom Recharts PieChart */}
                     {(() => {
                        const totalSt = allStudentAlerts.length;
                        const posSt = allStudentAlerts.filter(s => s.balance >= 0).length;
                        const negSt = allStudentAlerts.filter(s => s.balance < 0).length;
                        const ratioReal = totalSt > 0 ? (posSt / totalSt) * 100 : 0;
                        
                        const cx = 110;
                        const cy = 110;
                        const r = 6;
                        const angle = 180 - (ratioReal / 100) * 180;
                        const length = 75;
                        const xp = cx + length * Math.cos(-(Math.PI / 180) * angle);
                        const yp = cy + length * Math.sin(-(Math.PI / 180) * angle);

                        return (
                          <div className="relative flex flex-col items-center justify-center py-2 w-full">
                             <div className="h-[140px] flex items-center justify-center w-full relative">
                                <ResponsiveContainer width={220} height={140}>
                                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Pie
                                      data={[
                                        { value: 33.3, name: 'Negative', fill: '#f43f5e' },
                                        { value: 33.3, name: 'Warning', fill: '#f59e0b' },
                                        { value: 33.4, name: 'Positive', fill: '#10b981' }
                                      ]}
                                      cx={cx}
                                      cy={cy}
                                      startAngle={180}
                                      endAngle={0}
                                      innerRadius={65}
                                      outerRadius={85}
                                      paddingAngle={2}
                                      dataKey="value"
                                      stroke="none"
                                    />
                                    <g>
                                      <line x1={cx} y1={cy} x2={xp} y2={yp} stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
                                      <path d={`M ${cx - 3} ${cy} L ${cx + 3} ${cy} L ${xp} ${yp} Z`} fill="#0f172a" />
                                      <circle cx={cx} cy={cy} r={r} fill="#0d365a" />
                                      <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
                                    </g>
                                  </PieChart>
                                </ResponsiveContainer>
                                
                                <div className="absolute top-[85px] text-center">
                                   <span className="text-3xl font-black text-slate-800 tracking-tight">{ratioReal.toFixed(0)}%</span>
                                   <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mt-0.5">ملاءة المحفظة</span>
                                </div>
                             </div>

                             <div className="w-full grid grid-cols-2 gap-3 mt-4 text-right">
                               <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/40 text-center">
                                  <span className="text-[9px] text-slate-400 font-bold block">🟢 حسابات إيجابية</span>
                                  <span className="text-base font-black text-emerald-600 font-sans">{posSt} <span className="text-[10px] text-slate-400 font-bold">طلاب</span></span>
                               </div>
                               <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/40 text-center">
                                  <span className="text-[9px] text-slate-400 font-bold block">🔴 مكشوفة / سالبة</span>
                                  <span className="text-base font-black text-rose-600 font-sans">{negSt} <span className="text-[10px] text-slate-400 font-bold">طلاب</span></span>
                               </div>
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium mt-3 leading-relaxed">
                                تشير زاوية المؤشر إلى النسبة المئوية للحسابات المشحونة بالكامل والجاهزة للتعليم تفادياً للسحب الجائر على الحصص دون دفع مسبق.
                             </p>
                          </div>
                        );
                     })()}
                  </div>

                  {/* DUAL GAUGE DISTRIBUTION BOARD */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-indigo-50/20 p-6 rounded-[2rem] border border-slate-200/60 shadow-xs space-y-6 text-right">
                     <div className="border-b border-indigo-100/50 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-bold">
                       <div>
                         <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">تحليلات الأرصدة المرئية</span>
                         <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                           <span>مقياس توزيع أرصدة الطلاب الكلية (موجب / سالب)</span>
                         </h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1">توضيح مرئي لنسبة الأموال والذمم والطلاب في المناطق الآمنة مقابل السحب المكشوف</p>
                       </div>
                       
                       <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          <span className="text-[9px] font-black text-slate-500">لوحة عدادات الـ Speedometers الجارية</span>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gauge 1: Capital Liquidity Volume */}
                        {(() => {
                           const posVol = allStudentAlerts.filter(s => s.balance >= 0).reduce((sum, s) => sum + s.balance, 0);
                           const negVol = allStudentAlerts.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
                           const totalSum = posVol + negVol;
                           const ratioVol = totalSum > 0 ? (posVol / totalSum) * 100 : 0;
                           
                           const cx = 110;
                           const cy = 110;
                           const r = 6;
                           const angle = 180 - (ratioVol / 100) * 180;
                           const length = 75;
                           const xp = cx + length * Math.cos(-(Math.PI / 180) * angle);
                           const yp = cy + length * Math.sin(-(Math.PI / 180) * angle);
                           
                           return (
                              <div className="bg-white p-5 rounded-3xl border border-slate-200/55 shadow-sm flex flex-col items-center justify-between min-h-[290px]">
                                 <div className="w-full text-right mb-2">
                                    <span className="text-[10px] font-black text-slate-400 block uppercase">حجم السيولة والودائع</span>
                                    <h5 className="text-xs font-black text-slate-800">الأرصدة المشحونة مقابل السحوبات المكشوفة</h5>
                                 </div>
                                 
                                 <div className="relative flex flex-col items-center justify-center py-2 w-full">
                                    <div className="h-[140px] flex items-center justify-center w-full relative">
                                       <ResponsiveContainer width={220} height={140}>
                                          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                             <Pie
                                                data={[
                                                   { value: 30, name: 'Sufficient shortage', fill: '#ef4444' },
                                                   { value: 40, name: 'Caution area', fill: '#f59e0b' },
                                                   { value: 30, name: 'Safe zone', fill: '#10b981' }
                                                ]}
                                                cx={cx}
                                                cy={cy}
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={65}
                                                outerRadius={85}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                             />
                                             <g>
                                                <line x1={cx} y1={cy} x2={xp} y2={yp} stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
                                                <path d={`M ${cx - 3} ${cy} L ${cx + 3} ${cy} L ${xp} ${yp} Z`} fill="#0f172a" />
                                                <circle cx={cx} cy={cy} r={r} fill="#0d365a" />
                                                <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
                                             </g>
                                          </PieChart>
                                       </ResponsiveContainer>
                                       <div className="absolute top-[85px] text-center">
                                          <span className="text-2xl font-black text-slate-800 tracking-tight">{ratioVol.toFixed(1)}%</span>
                                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mt-0.5">معدل السيولة الآمنة</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="w-full grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-emerald-50/40 p-2 rounded-xl text-center border border-emerald-100/30">
                                       <span className="text-[8px] text-slate-400 font-bold block">ودائع موجب متاح للتعليم</span>
                                       <span className="text-xs font-black text-emerald-600 font-sans">₪{posVol.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                    </div>
                                    <div className="bg-rose-50/40 p-2 rounded-xl text-center border border-rose-100/30">
                                       <span className="text-[8px] text-slate-400 font-bold block">مجموع العجز (الديون)</span>
                                       <span className="text-xs font-black text-rose-600 font-sans">₪{negVol.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                    </div>
                                 </div>
                              </div>
                           );
                        })()}

                        {/* Gauge 2: Student Wallet Headcount Compliance */}
                        {(() => {
                           const totalSt = allStudentAlerts.length;
                           const posSt = allStudentAlerts.filter(s => s.balance >= 0).length;
                           const negSt = allStudentAlerts.filter(s => s.balance < 0).length;
                           const ratioSt = totalSt > 0 ? (posSt / totalSt) * 100 : 0;
                           
                           const cx = 110;
                           const cy = 110;
                           const r = 6;
                           const angle = 180 - (ratioSt / 100) * 180;
                           const length = 75;
                           const xp = cx + length * Math.cos(-(Math.PI / 180) * angle);
                           const yp = cy + length * Math.sin(-(Math.PI / 180) * angle);

                           return (
                              <div className="bg-white p-5 rounded-3xl border border-slate-200/55 shadow-sm flex flex-col items-center justify-between min-h-[290px]">
                                 <div className="w-full text-right mb-2">
                                    <span className="text-[10px] font-black text-slate-400 block uppercase hidden">التزام أرصدة الطلاب</span>
                                    <h5 className="text-xs font-black text-slate-800">الالتزام بالشحن ونسب الاستبقاء الجارية</h5>
                                 </div>
                                 
                                 <div className="relative flex flex-col items-center justify-center py-2 w-full">
                                    <div className="h-[140px] flex items-center justify-center w-full relative">
                                       <ResponsiveContainer width={220} height={140}>
                                          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                             <Pie
                                                data={[
                                                   { value: 30, name: 'Sufficient shortage', fill: '#ef4444' },
                                                   { value: 40, name: 'Caution area', fill: '#f59e0b' },
                                                   { value: 30, name: 'Safe zone', fill: '#10b981' }
                                                ]}
                                                cx={cx}
                                                cy={cy}
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={65}
                                                outerRadius={85}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                             />
                                             <g>
                                                <line x1={cx} y1={cy} x2={xp} y2={yp} stroke="#0f172a" strokeWidth={3} strokeLinecap="round" />
                                                <path d={`M ${cx - 3} ${cy} L ${cx + 3} ${cy} L ${xp} ${yp} Z`} fill="#0f172a" />
                                                <circle cx={cx} cy={cy} r={r} fill="#0d365a" />
                                                <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
                                             </g>
                                          </PieChart>
                                       </ResponsiveContainer>
                                       <div className="absolute top-[85px] text-center">
                                          <span className="text-2xl font-black text-slate-800 tracking-tight">{ratioSt.toFixed(1)}%</span>
                                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider mt-0.5">نسبة الطلاب المنتظمين مالياً</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="w-full grid grid-cols-2 gap-2 mt-2 font-bold">
                                    <div className="bg-indigo-50/40 p-2 rounded-xl text-center border border-indigo-100/30">
                                       <span className="text-[8px] text-slate-400 block">طلاب برصيد إيجابي آمن</span>
                                       <span className="text-xs font-black text-indigo-650 font-sans">{posSt} طالب</span>
                                    </div>
                                    <div className="bg-rose-50/40 p-2 rounded-xl text-center border border-rose-100/30">
                                       <span className="text-[8px] text-slate-400 block">طلاب ذوي رصيد مَدين</span>
                                       <span className="text-xs font-black text-rose-600 font-sans">{negSt} طالب</span>
                                    </div>
                                 </div>
                              </div>
                           );
                        })()}
                     </div>
                  </div>

                  {/* Visual Summary Insights Block */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-205 flex flex-col md:flex-row items-center justify-between gap-4 font-bold text-slate-700 col-span-3">
                     <p className="text-[10px] leading-relaxed text-right md:max-w-[70%]">
                        💡 <strong className="text-slate-900">توجيه مالي جاري:</strong> عداد سرعة السيولة وعداد التزام الطلاب يسلطان الضوء على الكفاءة الائتمانية للمركز. في حال هبوط مؤشر الأمان النقدي أو مؤشر الحسابات المنتظمة عن 75%، ننصح بشدّة باتخاذ إجراءات وقائية وتذكير الطلاب بالشحن قبل استهلاك الحصص.
                     </p>
                     <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-[#D4A33C] px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-200 shrink-0 select-none">
                           بيانات ذكاء الأعمال 📊
                        </span>
                     </div>
                  </div>
                </div>
              </div>
            );

          case 'charts':
            return (
              <div key="charts" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Margin Chart */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm col-span-1">
                  <div className="mb-4 border-b border-slate-100 pb-3 text-right">
                     <h4 className="text-xs font-black text-slate-400">تحليل مقارنة الأرباح والمصروفات</h4>
                     <h3 className="text-base font-black text-slate-900 mt-1">المحاسبة والربحية الإجمالية</h3>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'الإيرادات', قيمة: stats.totalRevenue, fill: '#6366f1' },
                        { name: 'الأجور', قيمة: stats.totalCosts, fill: '#f43f5e' },
                        { name: 'الصافي', قيمة: stats.margin, fill: stats.margin >= 0 ? '#10b981' : '#ef4444' }
                      ]}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="قيمة" radius={[6, 6, 0, 0]} barSize={40}>
                          <Cell fill="#D4A33C" />
                          <Cell fill="#f43f5e" />
                          <Cell fill={stats.margin >= 0 ? "#10b981" : "#ef4444"} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Utilization distribution */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm col-span-1">
                  <div className="mb-4 border-b border-slate-100 pb-3 text-right">
                     <h4 className="text-xs font-black text-slate-400">توزيع الحصص التدريسية</h4>
                     <h3 className="text-base font-black text-slate-900 mt-1">كثافة عمل المعلمين (ساعة)</h3>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.utilizationData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={60} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, border: 'none' }} />
                        <Bar dataKey="hours" fill="#D4A33C" radius={[0, 4, 4, 0]} barSize={10} name="ساعات التدريس" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Payout ratios */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm col-span-1 text-right">
                  <div className="mb-4 border-b border-slate-100 pb-3">
                     <h4 className="text-xs font-black text-slate-400">نسبة الالتزامات المالية والمسدد منها</h4>
                     <h3 className="text-base font-black text-slate-900 mt-1">معدل تسوية فواتير المعلمين</h3>
                  </div>
                  <div className="h-[200px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'مدفوع للمعلم', value: stats.totalPaid },
                            { name: 'معلق بالذمة', value: stats.payoutDue }
                          ]}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f43f5e" fillOpacity={0.15} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 text-[10px] font-black text-slate-400 justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-555 inline-block" />
                        <span>مدفوع: ₪{stats.totalPaid}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/30 inline-block" />
                        <span>معلق: ₪{stats.payoutDue.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );

          case 'evolution':
            return (
              <div key="evolution" className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden text-right">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#D4A33C]/5 rounded-full blur-2xl pointer-events-none" />

                <div className="mb-6 pb-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">تتبع الكفاءة والتطور التاريخي</span>
                    <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2 justify-end">
                      <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md font-black">تحليل تفاعلي</span>
                      <span>منحنى تطور أداء المعلمين شهرياً</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-bold">تتبع تطور ساعات التدريس المنجزة، العائدات المالية وصافي الفوائد شهرياً</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-end">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                      <button
                        onClick={() => setPerfMetric('hours')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          perfMetric === 'hours'
                            ? 'bg-white text-[#0D365A] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ⌛ إجمالي الساعات
                      </button>
                      <button
                        onClick={() => setPerfMetric('financial')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          perfMetric === 'financial'
                            ? 'bg-white text-[#0D365A] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ₪ الأرباح والمستحقات
                      </button>
                    </div>

                    <select
                      value={perfTeacherId}
                      onChange={(e) => setPerfTeacherId(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#D4A33C] focus:ring-4 focus:ring-[#D4A33C]/10 focus:outline-none transition-all cursor-pointer"
                      dir="rtl"
                    >
                      <option value="all">🔍 جميع المعلمين بالتراكم</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>👤 {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Accessibility Legend Guide for Monochrome & Colorblind differentiation */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50/90 border border-slate-200/80 rounded-xl text-[11px] font-bold text-slate-600 mb-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="text-xs">👁️</span>
                    <span>أنماط تمييز الخطوط (سهولة القراءة باللونين الأبيض والأسود أو عمى الألوان):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                      <span className="font-mono text-amber-600 font-black">─── ●</span>
                      <span>خط متصل بنقاط مصمتة (الإيرادات/الساعات)</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                      <span className="font-mono text-rose-500 font-black">╌╌╌ ○</span>
                      <span>خط متقطع بشرطات ونقاط مجوفة (الأجور)</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                      <span className="font-mono text-emerald-600 font-black">┈┈┈ ◆</span>
                      <span>خط منقط بنقاط مميزة (صافي الأرباح)</span>
                    </span>
                  </div>
                </div>

                {monthlyPerfChartData.length === 0 ? (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                    <BarChart3 size={32} strokeWidth={1.5} className="animate-pulse text-slate-300" />
                    <p className="text-xs font-black">لا توجد بيانات حصص مضافة لعرض المنحنى البياني</p>
                    <p className="text-[10px] text-slate-300">تأكد من تسجيل بعض الحصص وتفعيل تاريخها لعرض تطور الأداء</p>
                  </div>
                ) : (
                  <div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {perfMetric === 'hours' ? (
                          <AreaChart data={monthlyPerfChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4A33C" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#D4A33C" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#94a3b8' }} 
                            />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: 16, 
                                border: '1px solid #f1f5f9', 
                                boxShadow: '0 8px 30px rgba(0,0,0,0.06)', 
                                fontSize: 11,
                                textAlign: 'right',
                                direction: 'rtl'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="hours" 
                              stroke="#D4A33C" 
                              fillOpacity={1} 
                              fill="url(#colorHours)" 
                              strokeWidth={3} 
                              strokeDasharray="0"
                              dot={{ r: 4, fill: '#D4A33C', stroke: '#ffffff', strokeWidth: 2 }}
                              activeDot={{ r: 7, fill: '#D4A33C', stroke: '#ffffff', strokeWidth: 2 }}
                              name="إجمالي الساعات (خط متصل ── ●)" 
                            />
                          </AreaChart>
                        ) : (
                          (() => {
                            const isProfitGrowing = (() => {
                              if (!monthlyPerfChartData || monthlyPerfChartData.length === 0) return true;
                              if (monthlyPerfChartData.length === 1) return (monthlyPerfChartData[0]?.profit ?? 0) >= 0;
                              const last = monthlyPerfChartData[monthlyPerfChartData.length - 1]?.profit ?? 0;
                              const prev = monthlyPerfChartData[monthlyPerfChartData.length - 2]?.profit ?? 0;
                              return last >= prev;
                            })();
                            const profitStrokeColor = isProfitGrowing ? '#10b981' : '#ef4444';

                            return (
                              <AreaChart data={monthlyPerfChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D4A33C" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#D4A33C" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.10}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={profitStrokeColor} stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor={profitStrokeColor} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    borderRadius: 16, 
                                    border: '1px solid #f1f5f9', 
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.06)', 
                                    fontSize: 11,
                                    textAlign: 'right',
                                    direction: 'rtl'
                                  }} 
                                />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="plainline"
                                  wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 'bold' }} 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  stroke="#D4A33C" 
                                  fillOpacity={1} 
                                  fill="url(#colorRevenue)" 
                                  strokeWidth={2.5} 
                                  strokeDasharray="0"
                                  dot={{ r: 4, fill: '#D4A33C', stroke: '#ffffff', strokeWidth: 2 }}
                                  activeDot={{ r: 7, fill: '#D4A33C', stroke: '#ffffff', strokeWidth: 2 }}
                                  name="أقساط الطلاب المستحقة (متصل ── ●)" 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="payout" 
                                  stroke="#f43f5e" 
                                  fillOpacity={1} 
                                  fill="url(#colorPayout)" 
                                  strokeWidth={2.5} 
                                  strokeDasharray="6 4"
                                  dot={{ r: 4, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 2 }}
                                  activeDot={{ r: 7, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                                  name="مستحقات المعلمين (متقطع ╌╌ ○)" 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="profit" 
                                  stroke={profitStrokeColor} 
                                  fillOpacity={1} 
                                  fill="url(#colorProfit)" 
                                  strokeWidth={3} 
                                  strokeDasharray="2 3"
                                  dot={{ r: 4.5, fill: profitStrokeColor, stroke: '#ffffff', strokeWidth: 2 }}
                                  activeDot={{ r: 7.5, fill: profitStrokeColor, stroke: '#ffffff', strokeWidth: 2 }}
                                  name={isProfitGrowing ? "صافي ربح المركز (منقط ┈┈ ◆ نمو 🟢)" : "صافي ربح المركز (منقط ┈┈ ◆ انخفاض 🔴)"} 
                                />
                              </AreaChart>
                            );
                          })()
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Sub-KPI Summary Row inside Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-150 text-right">
                      {(() => {
                        const totalHours = monthlyPerfChartData.reduce((sum, d) => sum + d.hours, 0);
                        const totalRevenue = monthlyPerfChartData.reduce((sum, d) => sum + d.revenue, 0);
                        const totalPayout = monthlyPerfChartData.reduce((sum, d) => sum + d.payout, 0);
                        const totalProfit = monthlyPerfChartData.reduce((sum, d) => sum + d.profit, 0);
                        return [
                          { label: 'ساعات العمل التراكمية بحسب الفرز', value: `${totalHours.toFixed(1)} ساعة`, color: 'text-amber-600', desc: 'إجمالي الحصص المسجلة والمكتملة' },
                          { label: 'الذمم والمستحقات المدفوعة والمستحقة', value: `₪${totalPayout.toLocaleString()}`, color: 'text-rose-500', desc: 'أتعاب التدريس للمعلمين المعنيين' },
                          { label: 'إجمالي الإيرادات الناتجة للفرز', value: `₪${totalRevenue.toLocaleString()}`, color: 'text-indigo-600', desc: 'ما يدفعه الطلاب مقابل هذه الحصص' },
                          { label: 'صافي الأرباح وقيمة الإضافة للمركز', value: `₪${totalProfit.toLocaleString()}`, color: 'text-emerald-600', desc: 'الهامش المالي المتبقي للأكاديمية' }
                        ].map((stat, i) => (
                          <div key={i} className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 block uppercase">{stat.label}</span>
                            <h4 className={`text-lg font-black ${stat.color}`}>{stat.value}</h4>
                            <p className="text-[9px] text-slate-400 font-bold">{stat.desc}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );

          case 'salaries_flow':
            return (
              <div key="salaries_flow" className="w-full">
                <TeacherSalariesFlowChart
                  teachers={teachers}
                  sessions={sessions}
                  payments={payments}
                  students={students}
                  assignments={assignments}
                  globalSettings={globalSettings}
                />
              </div>
            );

          case 'temporal':
            return (
              <div key="temporal" className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-right">
                 <div className="mb-6 border-b border-slate-50 pb-4 flex items-center justify-between">
                    <Activity size={24} className="text-slate-300 ml-auto" />
                    <div>
                       <h3 className="text-lg font-black text-slate-900">الكشف التحليلي والمنحنى الزمني للمبيعات والتعليم</h3>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">كشف مقارن بالنشاطات خلال الثلاثين يوماً السابقة</span>
                    </div>
                 </div>
                 <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.timeSeriesData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }} 
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 11 }} />
                        <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', paddingBottom: 15 }} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#D4A33C" 
                          fillOpacity={1} 
                          fill="url(#colorRev)" 
                          strokeWidth={2.5} 
                          strokeDasharray="0"
                          dot={{ r: 3, fill: '#D4A33C', stroke: '#ffffff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#D4A33C' }}
                          name="الإيرادات (خط متصل ── ●)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="costs" 
                          stroke="#f43f5e" 
                          fillOpacity={0} 
                          strokeWidth={2} 
                          strokeDasharray="6 4" 
                          dot={{ r: 3, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#f43f5e' }}
                          name="التكاليف (خط متقطع ╌╌ ○)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="margin" 
                          stroke={stats.margin >= 0 ? "#10b981" : "#ef4444"} 
                          fillOpacity={0} 
                          strokeWidth={2.5} 
                          strokeDasharray="2 3"
                          dot={{ r: 3.5, fill: stats.margin >= 0 ? "#10b981" : "#ef4444", stroke: '#ffffff', strokeWidth: 2 }}
                          activeDot={{ r: 6.5, fill: stats.margin >= 0 ? "#10b981" : "#ef4444" }}
                          name={stats.margin >= 0 ? "الربح التشغيلي (خط منقط ┈┈ ◆ نمو 🟢)" : "الربح التشغيلي (خط منقط ┈┈ ◆ انخفاض 🔴)"} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
            );

          case 'student_growth_distribution':
            return (
              <div key={widget.id} className="relative">
                <StudentGrowthAndSubjectDistribution
                  students={students}
                  groupCourses={groupCourses}
                  sessions={sessions}
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
