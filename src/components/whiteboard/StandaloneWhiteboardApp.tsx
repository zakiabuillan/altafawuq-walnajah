import React, { useState } from 'react';
import { SmartTutorInteractiveBoard } from './SmartTutorInteractiveBoard';
import { SmartClassroomBoardView } from './SmartClassroomBoardView';
import { SmartWhiteboard } from './SmartWhiteboard';
import { XournalApp } from './xournal/XournalApp';
import { WhiteboardTheme } from '../../types/whiteboard';
import { Palette, Monitor, Bot, BookOpen } from 'lucide-react';

interface StandaloneWhiteboardAppProps {
  teacherId?: string;
  teacherName?: string;
  theme?: WhiteboardTheme;
  defaultBackground?: any;
  initialMode?: 'xournal' | 'tutor' | 'classroom' | 'canvas';
  onClose?: () => void;
}

export const StandaloneWhiteboardApp: React.FC<StandaloneWhiteboardAppProps> = ({
  teacherId,
  teacherName,
  theme = 'classic-dark',
  defaultBackground = 'ruled',
  initialMode = 'xournal',
  onClose
}) => {
  const [mode, setMode] = useState<'xournal' | 'tutor' | 'classroom' | 'canvas'>(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('mode');
      if (v === 'xournal') return 'xournal';
      if (v === 'tutor' || v === 'smarttutor') return 'tutor';
      if (v === 'canvas') return 'canvas';
      if (v === 'classroom') return 'classroom';
      
      const view = new URLSearchParams(window.location.search).get('view');
      if (view === 'xournal') return 'xournal';
      if (view === 'canvas') return 'canvas';
      if (view === 'classroom' || view === 'classroom-board') return 'classroom';
      if (view === 'tutor' || view === 'smartboard') return 'tutor';
      if (view === 'whiteboard' && !window.location.search.includes('smartboard')) return 'canvas';
    }
    return initialMode;
  });

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#070b14] overflow-hidden select-none" dir="rtl">
      {/* Top Floating Seamless Mode Switcher Pill */}
      <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-950/95 backdrop-blur-md p-1 rounded-2xl border border-slate-700 shadow-2xl transition-all duration-300 ${
        mode === 'xournal' ? 'opacity-25 hover:opacity-100 hover:scale-105' : 'opacity-100'
      }`}>
        
        {/* Mode 0: Xournal++ Pro (PDF Markup & Dynamic Page Insertion) */}
        <button
          type="button"
          onClick={() => setMode('xournal')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'xournal'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Xournal++ المطور لتدوين وشرح ملفات الـ PDF مع إدراج صفحات بيضاء ديناميكياً ودعم القلم الرقمي"
        >
          <BookOpen size={14} />
          <span>Xournal++ Pro 📓</span>
        </button>

        {/* Mode 1: Smart Tutor Interactive Board (70/30 + AI Assistant) */}
        <button
          type="button"
          onClick={() => setMode('tutor')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'tutor'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="اللوح الذكي التفاعلي المتكامل (مساحة 70% للرسم + 30% للمساعد الذكي وأدوات المعلم والطلاب)"
        >
          <Bot size={14} />
          <span>اللوح الذكي 70/30 🤖</span>
        </button>

        {/* Mode 2: 4K Smart Classroom Board */}
        <button
          type="button"
          onClick={() => setMode('classroom')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'classroom'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="معاينة الفصل الدراسي المتطور واللوح التفاعلي 4K ثلاثي الأبعاد"
        >
          <Monitor size={14} />
          <span>الفصل الذكي 4K 🖥️</span>
        </button>

        {/* Mode 3: Desktop Full Canvas */}
        <button
          type="button"
          onClick={() => setMode('canvas')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'canvas'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="لوح الشرح المكتبي الكامل مع أدوات الـ STEM والـ PDF"
        >
          <Palette size={14} />
          <span>لوح الشرح الكامل 🎨</span>
        </button>
      </div>

      {/* Render Selected View */}
      {mode === 'xournal' ? (
        <XournalApp
          teacherName={teacherName || 'أ. زكي أبو علان (المدير العام)'}
          onClose={onClose}
        />
      ) : mode === 'tutor' ? (
        <SmartTutorInteractiveBoard
          teacherName={teacherName || 'أ. زكي أبو علان (المدير العام)'}
          lessonTitle="الفيزياء المتقدمة وميكانيكا الكم - بجروت 5 وحدات"
          subject="فيزياء"
          onClose={onClose}
          isStandalone={true}
        />
      ) : mode === 'classroom' ? (
        <SmartClassroomBoardView
          onClose={onClose}
          onLaunchFullWhiteboard={() => setMode('tutor')}
          isStandalone={true}
        />
      ) : (
        <SmartWhiteboard
          teacherId={teacherId || 'teacher'}
          teacherName={teacherName || 'المعلم'}
          isStandalone={true}
          theme={theme}
          defaultBackground={defaultBackground}
          onClose={onClose}
        />
      )}
    </div>
  );
};
