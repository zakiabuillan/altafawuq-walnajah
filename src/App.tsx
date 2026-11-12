import React, { useState, useEffect } from 'react';
import { NavbarHeader } from './components/assessment/NavbarHeader';
import { CurriculumManagerView } from './components/assessment/CurriculumManagerView';
import { ReferenceLibraryView } from './components/assessment/ReferenceLibraryView';
import { QuestionBankGeneratorView } from './components/assessment/QuestionBankGeneratorView';
import { ExamManagerView } from './components/assessment/ExamManagerView';
import { StudentExamPortalView } from './components/assessment/StudentExamPortalView';
import { ReportsAnalyticsView } from './components/assessment/ReportsAnalyticsView';
import { SmartTutorChatView } from './components/assessment/SmartTutorChatView';
import { AuditAndBackupView } from './components/assessment/AuditAndBackupView';
import { MandatoryTestSuiteModal } from './components/assessment/MandatoryTestSuiteModal';
import { assessmentStore } from './lib/assessmentStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('curriculum');
  const [showTestSuite, setShowTestSuite] = useState<boolean>(false);
  const [studentLaunchExamId, setStudentLaunchExamId] = useState<string | null>(null);
  const [, setRerender] = useState({});

  useEffect(() => {
    // Subscribe to state updates in assessmentStore
    const unsubscribe = assessmentStore.subscribe(() => {
      setRerender({});
    });
    return unsubscribe;
  }, []);

  const handleTakeExamAsStudent = (examId: string) => {
    // If current user is not student, switch to student account to demonstrate
    if (assessmentStore.currentUser.role !== 'student') {
      const studentUser = assessmentStore.users.find(u => u.role === 'student');
      if (studentUser) {
        assessmentStore.setCurrentUser(studentUser.id);
      }
    }
    setStudentLaunchExamId(examId);
    setActiveTab('student_portal');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans" dir="rtl">
      {/* Clean Navbar & Global Role Switcher */}
      <NavbarHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTestSuite={() => setShowTestSuite(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'curriculum' && <CurriculumManagerView />}
        {activeTab === 'references' && <ReferenceLibraryView />}
        {activeTab === 'questions' && <QuestionBankGeneratorView />}
        {activeTab === 'exams' && <ExamManagerView onTakeExamAsStudent={handleTakeExamAsStudent} />}
        {activeTab === 'student_portal' && <StudentExamPortalView initialExamId={studentLaunchExamId} />}
        {activeTab === 'reports' && <ReportsAnalyticsView />}
        {activeTab === 'tutor' && <SmartTutorChatView />}
        {activeTab === 'audit_backup' && <AuditAndBackupView />}
      </main>

      {/* 12-Point Mandatory Automated Test Suite Modal */}
      {showTestSuite && (
        <MandatoryTestSuiteModal onClose={() => setShowTestSuite(false)} />
      )}

      {/* Minimal Local Network Status Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>أكاديمية التفوق — منصة التقويم الأكاديمي والمراجع المعتمدة (محلية للشبكة المؤسسية)</span>
          <span className="font-mono text-emerald-400 text-[11px]">
            المستخدم: {assessmentStore.currentUser.name} ({assessmentStore.currentUser.role}) • قاعدة بيانات محلية مشفرة
          </span>
        </div>
      </footer>
    </div>
  );
}
