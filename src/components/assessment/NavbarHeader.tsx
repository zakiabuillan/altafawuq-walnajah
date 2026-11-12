import React from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle, 
  UserCheck, 
  BookOpen, 
  Layers, 
  HelpCircle, 
  FileCheck2, 
  BarChart3, 
  Bot, 
  ShieldAlert, 
  RotateCcw, 
  Download, 
  Sparkles,
  ClipboardCheck,
  Clock,
  User,
  Users
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { UserRole } from '../../types/assessmentPlatform';

interface NavbarHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTestSuite: () => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenTestSuite
}) => {
  const currentUser = assessmentStore.currentUser;
  const users = assessmentStore.users;

  const roleLabels: Record<UserRole, { label: string; bg: string; text: string; icon: any }> = {
    admin: { label: 'مدير النظام الأكاديمي', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: ShieldCheck },
    reviewer: { label: 'مراجع علمي معتمد', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: CheckCircle },
    teacher: { label: 'معلم مادة', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: BookOpen },
    student: { label: 'طالب', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', icon: GraduationCap }
  };

  const navItems = [
    { id: 'curriculum', label: 'الهيكل والمنهاج', icon: Layers, roles: ['admin', 'reviewer', 'teacher'] },
    { id: 'references', label: 'المراجع المعتمدة', icon: FileCheck2, roles: ['admin', 'reviewer', 'teacher', 'student'] },
    { id: 'questions', label: 'بنك الأسئلة والتوليد', icon: HelpCircle, roles: ['admin', 'reviewer', 'teacher'] },
    { id: 'exams', label: 'إدارة الاختبارات', icon: ClipboardCheck, roles: ['admin', 'teacher'] },
    { id: 'student_portal', label: 'بوابة الاختبارات (طالب)', icon: GraduationCap, roles: ['student', 'admin', 'teacher'] },
    { id: 'reports', label: 'التقارير وتحليل الأسئلة', icon: BarChart3, roles: ['admin', 'reviewer', 'teacher'] },
    { id: 'tutor', label: 'المعلم الذكي', icon: Bot, roles: ['admin', 'reviewer', 'teacher', 'student'] },
    { id: 'audit_backup', label: 'الأمان والنسخ الاحتياطي', icon: ShieldAlert, roles: ['admin'] }
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl" dir="rtl">
      {/* Top Banner: Academy Identity & Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                أكاديمية التفوق - منصة التقويم والمراجع المعتمدة
              </h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                شبكة محلية v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إدارة المراجع الموثقة، بنك أسئلة الاختيار من متعدد، الاختبارات المحصنة، والمعلم الذكي
            </p>
          </div>
        </div>

        {/* Right Section: Role Switcher & Automated Test Suite */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Quick Role Switcher (Crucial for Reviewer/Teacher/Student Validation) */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <User size={15} className="text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">المستخدم الحالي:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                assessmentStore.setCurrentUser(e.target.value);
                const switched = assessmentStore.users.find(u => u.id === e.target.value);
                if (switched?.role === 'student') {
                  setActiveTab('student_portal');
                } else if (activeTab === 'student_portal') {
                  setActiveTab('references');
                }
              }}
              className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — ({roleLabels[u.role].label})
                </option>
              ))}
            </select>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleLabels[currentUser.role].bg} ${roleLabels[currentUser.role].text}`}>
              {roleLabels[currentUser.role].label}
            </span>
          </div>

          {/* Test Suite Button (Validates the 12 required test conditions) */}
          <button
            type="button"
            onClick={onOpenTestSuite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="فحص واختبار المسارات الـ 12 الإلزامية للنظام"
          >
            <Sparkles size={14} />
            <span>الاختبارات الإلزامية (12 مساراً)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-thin">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
