// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, deleteDoc, getDoc, setDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Teacher, Student, Session, StudentCredit, GroupCourse, formatCustomDate, Payment, isTrialSession, Settings } from '../types';
import { calculateSessionPricing, getAcademicStage, getAcademicStageBadge, DEFAULT_STAGE_PRICING, getStudentDefaultHourlyRate, getStudentSessionCost } from '../lib/sessionPricing';
import { normalizeArabicName } from '../lib/studentValidation';
import OnlineExamsPanel from './OnlineExamsPanel';
import { getWhiteboardLink } from '../lib/urlUtils';

export const stripTeacherTitles = (name: string = ''): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\(.*?\)/g, '') // remove parenthesized roles e.g. (المدير المعلم)
    .replace(/^(أ\.?|أستاذ|أستاذة|المعلم|المعلمة|د\.?|دكتور|دكتورة)\s+/i, '')
    .trim();
};
import { 
  Calendar, 
  CalendarPlus,
  CalendarCheck,
  User, 
  Users, 
  BookOpen, 
  Clock, 
  Timer,
  Check,
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  ArrowRight, 
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Sparkles, 
  Plus, 
  Minus, 
  BookOpenCheck, 
  Wallet, 
  Lock, 
  Clipboard, 
  Printer, 
  Loader2,
  BookmarkCheck,
  Award,
  CheckSquare,
  Download,
  FileDown,
  FileText,
  FileCode,
  Bell,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  History,
  ListFilter,
  Search,
  ChevronDown,
  Trash2,
  Pencil,
  X,
  FolderPlus,
  Tags,
  Tag,
  Eye,
  GripVertical,
  MessageSquare,
  Mail,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Phone,
  MessageCircle,
  Send,
  CheckCheck,
  Palette,
  ExternalLink,
  RefreshCw,
  FlaskConical,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import TaskManagement from './TaskManagement';
import { MathJaxSection } from './MathJaxSection';
import { ScientificRichTextEditor } from './ScientificRichTextEditor';
import { TeacherQuickDashboard } from './TeacherQuickDashboard';
import { TeacherWeeklySchedule } from './TeacherWeeklySchedule';
import { TeacherStudentBalanceCheckerModal } from './TeacherStudentBalanceCheckerModal';
import { QuickSessionFloatingButton } from './QuickSessionFloatingButton';
import { WhiteboardTheme, WhiteboardBackgroundType } from '../types/whiteboard';
import { SmartWhiteboard } from './whiteboard/SmartWhiteboard';
import { SmartClassroomBoardView } from './whiteboard/SmartClassroomBoardView';
import { StandaloneWhiteboardApp } from './whiteboard/StandaloneWhiteboardApp';
import { ErrorBoundary } from './ErrorBoundary';
import EducationalMaterialsManager from './EducationalMaterialsManager';
import { WelcomeNewStudentsCard } from './WelcomeNewStudentsCard';
import { TeacherStudentProfileModal } from './TeacherStudentProfileModal';
import { TeacherExportReportModal } from './TeacherExportReportModal';
import { TeacherBalanceStatementModal } from './TeacherBalanceStatementModal';
import CurriculumSourcesManager from './CurriculumSourcesManager';
import AICurriculumGenerator from './AICurriculumGenerator';
import { CurriculumSourceMapping, DEFAULT_CURRICULUM_SOURCE_MAPPINGS } from '../types';
import { 
  notifyTeacherOnGroupCourseHoursDepletion, 
  generateParentGroupCourseDepletionWhatsAppUrl,
  notifyTeacherOnSessionCreate
} from '../lib/notificationUtils';

const parseScientificTextToReact = (text: string): React.ReactNode => {
  if (!text) return '';
  
  const hasDelimiters = text.includes('$') || text.includes('\\(') || text.includes('\\[') || text.includes('\\ce{');
  
  if (hasDelimiters) {
    return (
      <span className="tex2jax_process inline-block font-sans select-all" dir="ltr">
        {text}
      </span>
    );
  }
  
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  
  if (hasArabic) {
    // Tokenize scientific content so we only run MathJax on the scientific formulas, leaving normal Arabic text untouched!
    const scientificTokenRegex = /(\\[a-zA-Z]+(?:\{[^}]*\})*|\b[a-zA-Z][a-zA-Z0-9_{}^+-]*(?:_|\^)[a-zA-Z0-9_{}^+-]*|<=>|-->|->|⇌|→)/g;
    const parts = text.split(scientificTokenRegex);
    
    return (
      <span className="inline" style={{ unicodeBidi: 'plaintext' }}>
        {parts.map((part, idx) => {
          if (!part) return null;
          
          // Check if this part is a scientific formula matching our criteria
          const isFormula = /^(?:\\[a-zA-Z]+|\b[a-zA-Z][a-zA-Z0-9_{}^+-]*(?:_|\^)[a-zA-Z0-9_{}^+-]*|<=>|-->|->|⇌|→)$/.test(part);
          
          if (isFormula) {
            const isChem = /^[A-Z]/.test(part) || part === '<=>' || part === '-->' || part === '->' || part === '⇌' || part === '→';
            const mathContent = isChem ? `$\\ce{${part}}$` : `$${part}$`;
            return (
              <span key={idx} className="tex2jax_process inline-block mx-1 font-sans select-all" dir="ltr">
                {mathContent}
              </span>
            );
          }
          
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  }
  
  // For purely non-Arabic strings, we can run the original full-wrapper logic safely
  let mathjaxText = text;
  const isChem = /(?:[A-Z][a-z]?\d+|\b[A-Z][a-z]?\b[^a-z]*\b[A-Z][a-z]?\b|⇌|→|<=>|->|\\rightleftharpoons)/.test(text);
  if (isChem) {
    mathjaxText = `$\\ce{${text}}$`;
  } else if (text.includes('\\') || text.includes('_') || text.includes('^') || text.includes('=') || text.includes('+') || text.includes('-')) {
    mathjaxText = `$${text}$`;
  }
  
  return (
    <span className="tex2jax_process inline-block font-sans select-all" dir="ltr">
      {mathjaxText}
    </span>
  );
};

const formatToScientificHtml = (rawText: string): string => {
  if (!rawText) return '';
  
  // Strip LaTeX inline wrappers \( and \) first
  let html = rawText.replace(/\\\(|\\\)/g, '');

  // 1. Resolve sub with braces: _{content} -> <sub>content</sub>
  html = html.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
  
  // 2. Resolve sup with braces: ^{content} -> <sup>content</sup>
  html = html.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');

  // 3. Resolve sub with continuous letters/digits: e.g. H_2O -> H<sub>2</sub>O or CO_2 -> CO<sub>2</sub>
  html = html.replace(/_([0-9a-zA-Z]+)/g, '<sub>$1</sub>');

  // 4. Resolve sup with continuous letters/digits: e.g. E=mc^2 -> E=mc<sup>2</sup>
  html = html.replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>');

  return html;
};

const cleanRawAiResult = (text: string): string => {
  if (!text) return '';
  return text
    // 1. Convert ^\circ C or \circ C formatting to standard degree symbols:
    .replace(/\\?\^?\{\\circ\}\s*C/g, '°C')
    .replace(/\\?\^?\\circ\s*C/g, '°C')
    .replace(/_?\{\\circ\}\s*C/g, '°C')
    .replace(/\\circ\s*C/g, '°C')
    .replace(/\\?\^?\\circ/g, '°')
    .replace(/\\?\^?\{\\circ\}/g, '°')
    .replace(/\\circ/g, '°')
    
    // 2. Remove redundant divider block patterns like:
    // ----- or =================
    .replace(/^[-\s=_*]{5,}/gm, '')
    
    // 3. Remove excess nested markdown hashes
    .replace(/####+/g, '###')
    
    // 4. Remove empty brackets or placeholders if any
    .trim();
};

const splitContentByAnswers = (text: string) => {
  const keywords = [
    'الإجابات النموذجية',
    'إجابة الأسئلة',
    'مفتاح الحل',
    'حلول الأسئلة',
    'ملحق الإجابات',
    'دليل الإجابات',
    'الإجابات الصحيحة',
    'الأجوبة النموذجية',
    'الأجوبة الصحيحة'
  ];
  
  const lines = text.split('\n');
  let answerSectionStartIndex = -1;
  const lowerKeywords = (keywords || []).map(k => (k || '').toLowerCase());
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line.startsWith('#') || line.startsWith('**') || line.startsWith('__')) {
      const hasKeyword = keywords.some(keyword => line.includes(keyword));
      if (hasKeyword) {
        answerSectionStartIndex = idx;
        break;
      }
    } else {
      const hasKeyword = keywords.some(keyword => line.toLowerCase() === keyword.toLowerCase() || line.startsWith(keyword));
      if (hasKeyword && line.length < 50) {
        answerSectionStartIndex = idx;
        break;
      }
    }
  }
  
  if (answerSectionStartIndex !== -1) {
    const mainBodyLines = lines.slice(0, answerSectionStartIndex);
    const answerLines = lines.slice(answerSectionStartIndex);
    return {
      mainBody: mainBodyLines.join('\n'),
      answers: answerLines.join('\n')
    };
  }
  
  return {
    mainBody: text,
    answers: ''
  };
};

const isOptionLine = (str: string): boolean => {
  const s = str.trim();
  return /^[أبجد_هـa-dA-D]\s*[\)\.\-]\s+/.test(s) || /^[1-4]\s*[\)\-]\s+/.test(s);
};

const generateCleanHtmlBody = (rawText: string): string => {
  const cleaned = cleanRawAiResult(rawText);
  const { mainBody, answers } = splitContentByAnswers(cleaned);
  
  const parseSection = (bodyText: string) => {
    const lines = bodyText.split('\n');
    let html = '';
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (isOptionLine(line)) {
        const choices: string[] = [];
        while (i < lines.length && isOptionLine(lines[i])) {
          choices.push(lines[i].trim());
          i++;
        }
        
        // Render horizontal columns/grids to save printing space
        html += `<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 4px 0; font-family: 'Calibri', 'Arial', sans-serif; direction: rtl; text-align: right; width: 100%;">`;
        choices.forEach(ch => {
          html += `<div style="flex: 1; min-width: 130px; font-size: 13pt; font-weight: bold; background: #fafaf9; padding: 5px 10px; border-radius: 6px; border: 1px solid #e7e5e4; display: inline-flex; align-items: center; gap: 5px; margin-bottom: 4px;">
            <span style="color: #b45309; font-weight: 900; font-size: 14pt;">•</span>
            <span>${formatToScientificHtml(ch)}</span>
          </div>`;
        });
        html += `</div>`;
        continue;
      }
      
      if (trimmed.startsWith('### ')) {
        html += `<h3 style="color: #1a365d; font-family: 'Calibri', 'Arial', sans-serif; font-size: 14pt; margin: 8px 0 4px 0; font-weight: bold; text-align: right; direction: rtl; line-height: 1.3;">${formatToScientificHtml(trimmed.replace('### ', ''))}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        html += `<h2 style="color: #1a365d; font-family: 'Calibri', 'Arial', sans-serif; font-size: 15pt; margin: 15px 0 8px 0; font-weight: bold; border-right: 4px solid #b45309; padding-right: 8px; text-align: right; direction: rtl; line-height: 1.3;">${formatToScientificHtml(trimmed.replace('## ', ''))}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        html += `<h1 style="color: #b45309; font-family: 'Calibri', 'Arial', sans-serif; font-size: 18pt; text-align: center; margin: 12px 0 8px 0; font-weight: bold; direction: rtl; line-height: 1.3;">${formatToScientificHtml(trimmed.replace('# ', ''))}</h1>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        html += `<ul style="direction: rtl; text-align: right; padding-right: 15px; margin: 4px 0; font-family: 'Calibri', 'Arial', sans-serif; list-style-type: square;"><li style="margin-bottom: 2px; font-size: 13pt; line-height: 1.3;">${formatToScientificHtml(trimmed.replace(/^[\s-*]+/, ''))}</li></ul>`;
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const matchNum = trimmed.match(/^\d+/);
        const startNum = matchNum ? matchNum[0] : '1';
        html += `<ol start="${startNum}" style="direction: rtl; text-align: right; padding-right: 15px; margin: 4px 0; font-family: 'Calibri', 'Arial', sans-serif;"><li style="margin-bottom: 2px; font-size: 13pt; line-height: 1.3; font-weight: bold; color: #1c1917;">${formatToScientificHtml(trimmed.replace(/^\d+[\s.]*/, ''))}</li></ol>`;
      } else if (trimmed === '') {
        // Skip empty lines to reduce margin bloat
      } else {
        html += `<p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 13pt; margin-bottom: 4px; margin-top: 4px; line-height: 1.3; text-align: right; direction: rtl;">${formatToScientificHtml(trimmed)}</p>`;
      }
      i++;
    }
    
    return html;
  };

  let outputHtml = parseSection(mainBody);
  
  if (answers) {
    outputHtml += `
    <div style="page-break-before: always; break-before: page; margin-top: 25px; border-top: 3px dashed #b45309; padding-top: 20px;">
      <h2 style="color: #b45309; font-family: 'Calibri', 'Arial', sans-serif; font-size: 16pt; text-align: center; font-weight: bold; direction: rtl; margin-bottom: 15px; margin-top: 5px;">🎓 ملحق الحلول النموذجية والتقييم الذاتي 🎓</h2>
      ${parseSection(answers)}
    </div>`;
  }
  
  return outputHtml;
};

interface ReactBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'question' | 'options-grid' | 'answers-divider';
  content: string;
  columns?: string[];
  number?: string;
}

const parseTextToReactBlocks = (rawText: string): ReactBlock[] => {
  const cleaned = cleanRawAiResult(rawText);
  const { mainBody, answers } = splitContentByAnswers(cleaned);
  
  const processStr = (textStr: string): ReactBlock[] => {
    const lines = textStr.split('\n');
    const b: ReactBlock[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (isOptionLine(line)) {
        const choices: string[] = [];
        while (i < lines.length && isOptionLine(lines[i])) {
          choices.push(lines[i].trim());
          i++;
        }
        b.push({
          type: 'options-grid',
          content: '',
          columns: choices
        });
        continue;
      }
      
      if (trimmed.startsWith('### ')) {
        b.push({ type: 'h3', content: trimmed.replace('### ', '') });
      } else if (trimmed.startsWith('## ')) {
        b.push({ type: 'h2', content: trimmed.replace('## ', '') });
      } else if (trimmed.startsWith('# ')) {
        b.push({ type: 'h1', content: trimmed.replace('# ', '') });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        b.push({ type: 'bullet', content: trimmed.replace(/^[\s-*]+/, '') });
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const match = trimmed.match(/^(\d+\.)\s+(.*)/);
        if (match) {
          b.push({ type: 'question', content: match[2], number: match[1] });
        } else {
          b.push({ type: 'paragraph', content: trimmed });
        }
      } else if (trimmed === '') {
        // skip empty lines
      } else {
        b.push({ type: 'paragraph', content: trimmed });
      }
      i++;
    }
    return b;
  };

  const list = processStr(mainBody);
  if (answers) {
    list.push({ type: 'answers-divider', content: 'ملحق الحلول النموذجية والتقييم الذاتي' });
    list.push(...processStr(answers));
  }
  
  return list;
};

const renderFormattedLineContent = (text: string) => {
  if (!text) return '';
  
  // Check if the entire line is a mathematical equation, chemical formula, or English notes (no Arabic letters)
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const isFormula = !hasArabic && (
    text.includes('=') || 
    text.includes('+') || 
    text.includes('-') || 
    text.includes('*') || 
    text.includes('/') || 
    text.includes('^') || 
    text.includes('>') || 
    text.includes('<') ||
    text.includes('➔') ||
    text.includes('→') ||
    /[a-zA-Z]/.test(text)
  );

  if (isFormula && text.trim().length > 0) {
    return (
      <div dir="ltr" className="text-left font-mono bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/60 my-2 overflow-x-auto text-xs text-[#1A365D] font-extrabold tracking-wide shadow-sm">
        {parseScientificTextToReact(text)}
      </div>
    );
  }

  // Parse inline elements: `code` and **bold**
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);

  return (
    <span className="inline" style={{ unicodeBidi: 'plaintext' }}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const clean = part.slice(1, -1);
          return (
            <code key={i} dir="ltr" className="inline-block font-mono bg-indigo-50 text-indigo-700 border border-indigo-100/40 px-1.5 py-0.5 rounded text-[11px] font-black mx-1">
              {parseScientificTextToReact(clean)}
            </code>
          );
        } else if (part.startsWith('**') && part.endsWith('**')) {
          const clean = part.slice(2, -2);
          return (
            <strong key={i} className="font-black text-slate-950 mx-0.5">
              {parseScientificTextToReact(clean)}
            </strong>
          );
        }
        return <span key={i}>{parseScientificTextToReact(part)}</span>;
      })}
    </span>
  );
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseArabicDays = (classTimeStr: string): number[] => {
  if (!classTimeStr || typeof classTimeStr !== 'string') return [];
  const lowercase = (classTimeStr || '').toLowerCase().replace(/إ/g, 'ا').replace(/أ/g, 'ا');
  const days: number[] = [];
  
  const dayMap: { [key: string]: number } = {
    'احد': 0,
    'اثنين': 1,
    'ثلاثاء': 2,
    'اربعاء': 3,
    'خميس': 4,
    'جمعة': 5,
    'سبت': 6
  };
  
  Object.entries(dayMap).forEach(([dayName, dayNum]) => {
    if (lowercase.includes(dayName)) {
      days.push(dayNum);
    }
  });
  
  return Array.from(new Set(days));
};

interface TeacherDashboardProps {
  loggedInTeacher: Teacher;
  onLogout: () => void;
  onSwitchToManager?: () => void;
  isManagerUser?: boolean;
}

export default function TeacherDashboard({ 
  loggedInTeacher, 
  onLogout,
  onSwitchToManager,
  isManagerUser
}: TeacherDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'log-session' | 'log-group-session' | 'book-session' | 'ai-planner' | 'tasks' | 'pending-sessions' | 'tasks-evaluation' | 'trials' | 'calendar' | 'previous-sessions' | 'online-exams' | 'whiteboard' | 'educational-library' | 'my-students' | 'curriculum-generator'>('home');
  
  // Curriculum sources and generator states for teachers (Exclusive to Teachers)
  const [teacherCurriculumSources, setTeacherCurriculumSources] = useState<CurriculumSourceMapping[]>(DEFAULT_CURRICULUM_SOURCE_MAPPINGS);
  const [isSavingCurriculumSources, setIsSavingCurriculumSources] = useState(false);
  const [curriculumActiveView, setCurriculumActiveView] = useState<'generator' | 'sources'>('generator');

  // Sync approved curriculum sources from settings/global so teacher can view and add sources
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.curriculumSourceMappings && Array.isArray(data.curriculumSourceMappings) && data.curriculumSourceMappings.length > 0) {
          setTeacherCurriculumSources(data.curriculumSourceMappings);
        }
      }
    }, (error) => {
      console.warn("Could not subscribe to curriculum sources in teacher dashboard:", error);
    });
    return () => unsub();
  }, []);

  const handleSaveCurriculumSources = async (updatedMappings: CurriculumSourceMapping[]) => {
    setIsSavingCurriculumSources(true);
    try {
      setTeacherCurriculumSources(updatedMappings);
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, {
        curriculumSourceMappings: updatedMappings
      }, { merge: true });
      triggerToast('تم حفظ وتحديث المصادر التعليمية المعتمدة بنجاح 📚✨');
    } catch (err) {
      console.error("Error saving curriculum sources from teacher dashboard:", err);
      triggerToast('حدث خطأ أثناء حفظ المصادر');
    } finally {
      setIsSavingCurriculumSources(false);
    }
  };

  // Student search states for instant filtering
  const [logStudentSearch, setLogStudentSearch] = useState('');
  const [homeStudentSearch, setHomeStudentSearch] = useState('');
  const [myStudentsSearch, setMyStudentsSearch] = useState('');
  const [myStudentsFilterStatus, setMyStudentsFilterStatus] = useState<'all' | 'active' | 'low-balance'>('all');
  
  // Teacher Whiteboard Theme Personal Preference
  const [teacherWhiteboardTheme, setTeacherWhiteboardTheme] = useState<WhiteboardTheme>(() => {
    return loggedInTeacher?.whiteboardTheme || (localStorage.getItem(`teacher_whiteboard_theme_${loggedInTeacher?.id}`) as WhiteboardTheme) || 'classic-dark';
  });

  const [teacherWhiteboardBg, setTeacherWhiteboardBg] = useState<WhiteboardBackgroundType>(() => {
    return (loggedInTeacher as any)?.whiteboardDefaultBackground || 
      (localStorage.getItem(`teacher_whiteboard_bg_${loggedInTeacher?.id}`) as WhiteboardBackgroundType) || 
      (localStorage.getItem('whiteboard_preferred_bg') as WhiteboardBackgroundType) || 
      'ruled';
  });

  const handleUpdateTeacherWhiteboardTheme = async (newTheme: WhiteboardTheme) => {
    setTeacherWhiteboardTheme(newTheme);
    try {
      if (loggedInTeacher?.id) {
        localStorage.setItem(`teacher_whiteboard_theme_${loggedInTeacher.id}`, newTheme);
        const teacherRef = doc(db, 'teachers', loggedInTeacher.id);
        await updateDoc(teacherRef, { whiteboardTheme: newTheme });
      }
    } catch (error) {
      console.error("Error updating teacher whiteboard theme:", error);
    }
  };

  const getTeacherWhiteboardUrl = () => {
    const teacherId = loggedInTeacher?.id || 'teacher';
    const teacherName = loggedInTeacher?.name || 'المعلم';
    const theme = teacherWhiteboardTheme || 'classic-dark';
    const bg = teacherWhiteboardBg || 'ruled';
    return getWhiteboardLink({ teacherId, teacherName, theme, bg });
  };

  // In-app Interactive Whiteboard & Xournal++ Fullscreen State
  const [isWhiteboardModalOpen, setIsWhiteboardModalOpen] = useState(false);
  const [whiteboardModalMode, setWhiteboardModalMode] = useState<'xournal' | 'tutor' | 'classroom' | 'canvas'>('xournal');

  const handleOpenWhiteboardNewTab = (e?: React.MouseEvent, targetMode: 'xournal' | 'tutor' | 'classroom' | 'canvas' = 'xournal') => {
    if (e) {
      e.stopPropagation();
    }
    const baseUrl = getTeacherWhiteboardUrl();
    let url = `${baseUrl}&mode=xournal`;
    if (targetMode === 'classroom') url = `${baseUrl}&view=smartboard`;
    else if (targetMode === 'canvas') url = `${baseUrl}&mode=canvas`;
    else if (targetMode === 'tutor') url = `${baseUrl}&mode=tutor`;
    else if (targetMode === 'xournal') url = `${baseUrl}&mode=xournal`;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Could not open whiteboard in new window:', err);
    }
  };

  // If activeSubTab is set to whiteboard, open the in-app interactive whiteboard overlay
  useEffect(() => {
    if (activeSubTab === 'whiteboard') {
      setIsWhiteboardModalOpen(true);
      setActiveSubTab('home');
    }
  }, [activeSubTab]);
  
  // New States for Redesigned Teacher Dashboard
  const [showNotifications, setShowNotifications] = useState(false);
  const [miniChartType, setMiniChartType] = useState<'weekly' | 'students'>('weekly');
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Collect all unique identifiers and aliases for the logged-in teacher to guarantee comprehensive student matching
  const teacherIdentifiersSet = useMemo(() => {
    const ids = new Set<string>();
    if (!loggedInTeacher) return ids;

    const addIdentifier = (val?: any) => {
      if (!val) return;
      const raw = String(val).trim();
      if (!raw) return;
      ids.add(raw);
      ids.add(raw.toLowerCase());
      const normRaw = normalizeArabicName(raw);
      if (normRaw) ids.add(normRaw);

      const stripped = stripTeacherTitles(raw);
      if (stripped) {
        ids.add(stripped);
        ids.add(stripped.toLowerCase());
        const normStripped = normalizeArabicName(stripped);
        if (normStripped) ids.add(normStripped);
      }
    };

    addIdentifier(loggedInTeacher.id);
    addIdentifier(loggedInTeacher.username);
    addIdentifier(loggedInTeacher.name);
    addIdentifier(loggedInTeacher.email);

    const isZaki = 
      loggedInTeacher.username === 'zakiabuillan' || 
      loggedInTeacher.id === 'zaki_teacher' || 
      (loggedInTeacher.name && loggedInTeacher.name.includes('زكي')) ||
      (loggedInTeacher as any).role === 'manager';

    if (isZaki) {
      addIdentifier('zaki_teacher');
      addIdentifier('zakiabuillan');
      addIdentifier('zakiabuillan@gmail.com');
      addIdentifier('زكي أبو علان');
      addIdentifier('أستاذ زكي');
      addIdentifier('زكي ابو علان');
      addIdentifier('زكي');
    }

    teachers.forEach(t => {
      const tNorm = normalizeArabicName(stripTeacherTitles(t.name || ''));
      const loggedNorm = normalizeArabicName(stripTeacherTitles(loggedInTeacher.name || ''));

      const match = 
        (loggedInTeacher.id && t.id && t.id.trim() === loggedInTeacher.id.trim()) ||
        (loggedInTeacher.username && t.username && t.username.trim().toLowerCase() === loggedInTeacher.username.trim().toLowerCase()) ||
        (loggedInTeacher.name && t.name && (
          t.name.trim() === loggedInTeacher.name.trim() ||
          (tNorm && loggedNorm && tNorm === loggedNorm) ||
          (t.name && loggedInTeacher.name && (t.name.includes(loggedInTeacher.name) || loggedInTeacher.name.includes(t.name)))
        )) ||
        (loggedInTeacher.email && t.email && t.email.trim().toLowerCase() === loggedInTeacher.email.trim().toLowerCase()) ||
        (isZaki && (t.id === 'zaki_teacher' || t.username === 'zakiabuillan' || (t.name && t.name.includes('زكي'))));

      if (match) {
        addIdentifier(t.id);
        addIdentifier(t.username);
        addIdentifier(t.name);
        addIdentifier(t.email);
      }
    });

    return ids;
  }, [loggedInTeacher, teachers]);

  // Instant Alerts / Notifications for edited sessions and student placements
  const [instantNotifications, setInstantNotifications] = useState<any[]>([]);
  const [hasUnseenNotifications, setHasUnseenNotifications] = useState(false);
  const [selectedNotificationForDetail, setSelectedNotificationForDetail] = useState<any | null>(null);
  const [selectedPlacementForDetail, setSelectedPlacementForDetail] = useState<any | null>(null);
  const [currentPlacementIndex, setCurrentPlacementIndex] = useState(0);
  const [selectedStudentForProfileModal, setSelectedStudentForProfileModal] = useState<Student | null>(null);
  const [selectedStudentNotificationMeta, setSelectedStudentNotificationMeta] = useState<any | null>(null);
  const [isBalanceCheckerModalOpen, setIsBalanceCheckerModalOpen] = useState(false);
  const [balanceCheckerStudentId, setBalanceCheckerStudentId] = useState<string>('');
  const [dismissedWelcomeStudentsCard, setDismissedWelcomeStudentsCard] = useState(false);

  // Filter unseen student placement, transfer & trial migration notifications for full-screen overlay
  const unseenPlacementNotifications = useMemo(() => {
    return instantNotifications.filter(
      (n) => !n.seen && (
        n.type === 'student_placement' || 
        n.type === 'student_transfer_in' || 
        n.type === 'student_transfer_out' || 
        n.type === 'trial_migration' || 
        n.type === 'trial_booking'
      )
    );
  }, [instantNotifications]);

  // The active placement to show in the full-screen modal
  const activePlacementModal = selectedPlacementForDetail || (unseenPlacementNotifications.length > 0 ? unseenPlacementNotifications[currentPlacementIndex] || unseenPlacementNotifications[0] : null);

  const handleOpenStudentProfile = async (studentOrId: Student | string, notif?: any) => {
    if (notif?.id && !notif.seen) {
      await handleMarkNotificationAsSeen(notif.id);
    }
    setShowNotifications(false);

    let targetStudent: Student | undefined;
    if (typeof studentOrId === 'string') {
      targetStudent = students.find(s => s.id === studentOrId);
    } else {
      targetStudent = studentOrId;
    }

    if (targetStudent) {
      setSelectedStudentForProfileModal(targetStudent);
      setSelectedStudentNotificationMeta(notif || null);
    } else if (notif?.studentName) {
      // Fallback virtual student profile from notification metadata
      setSelectedStudentForProfileModal({
        id: notif.studentId || 'unknown',
        name: notif.studentName,
        grade: notif.studentGrade || '',
        phone: notif.studentPhone || '',
        email: '',
        notes: notif.notes || notif.details || '',
        status: StudentStatus.Assigned,
        teachers: [loggedInTeacher?.id || ''],
        registrationDate: notif.date || new Date().toISOString().split('T')[0],
      } as Student);
      setSelectedStudentNotificationMeta(notif);
    } else {
      setActiveSubTab('my-students');
    }
  };

  useEffect(() => {
    if (!loggedInTeacher?.id && !loggedInTeacher?.username) return;

    const teacherIds = teacherIdentifiersSet;
    const unsub = onSnapshot(collection(db, 'teacherNotifications'), (snapshot) => {
      const loadedNotifications = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as any))
        .filter(n => {
          const tId = (n.teacherId || '').trim();
          const tName = (n.teacherName || '').trim();
          return (
            (tId && (teacherIds.has(tId) || teacherIds.has(tId.toLowerCase()))) ||
            (tName && (teacherIds.has(tName) || teacherIds.has(tName.toLowerCase())))
          );
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

      setInstantNotifications(loadedNotifications);
      setHasUnseenNotifications(loadedNotifications.some(n => !n.seen));
    }, (error) => {
      console.warn("Realtime listener on teacherNotifications:", error);
    });

    return () => unsub();
  }, [loggedInTeacher?.id, loggedInTeacher?.username, teacherIdentifiersSet]);

  const handleMarkNotificationAsSeen = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'teacherNotifications', notificationId);
      await updateDoc(docRef, { seen: true });
    } catch (error) {
      console.error("Error marking notification as seen:", error);
    }
  };

  const handleDismissPlacementModal = async (notificationId?: string) => {
    if (notificationId) {
      await handleMarkNotificationAsSeen(notificationId);
    }
    if (selectedPlacementForDetail) {
      setSelectedPlacementForDetail(null);
    } else {
      if (currentPlacementIndex >= unseenPlacementNotifications.length - 1) {
        setCurrentPlacementIndex(0);
      }
    }
  };

  const handleDismissAllPlacements = async () => {
    try {
      await Promise.all(
        unseenPlacementNotifications.map((n) => {
          const docRef = doc(db, 'teacherNotifications', n.id);
          return updateDoc(docRef, { seen: true });
        })
      );
      setSelectedPlacementForDetail(null);
      setCurrentPlacementIndex(0);
    } catch (err) {
      console.error('Error dismissing all placement notifications:', err);
    }
  };

  const handleMarkAllNotificationsAsSeen = async () => {
    try {
      const unseen = instantNotifications.filter(n => !n.seen);
      await Promise.all(unseen.map(n => {
        const docRef = doc(db, 'teacherNotifications', n.id);
        return updateDoc(docRef, { seen: true });
      }));
    } catch (error) {
      console.error("Error marking all notifications as seen:", error);
    }
  };

  const [activeStudentsExpanded, setActiveStudentsExpanded] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: `مرحباً بك أخي المعلم! أنا مساعدك العائم للذكاء الاصطناعي 🪄. يمكنني مساعدتك في تحليل وتتبع تحصيل طلابك، أو التوصية بخطط علاجية مبتكرة، أو تقديم اقتراحات تحسين فوري للشروحات وأوراق العمل.`
    }
  ]);
  const [isSendingAi, setIsSendingAi] = useState(false);
  const [aiSelectedStudentId, setAiSelectedStudentId] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [classManagementTab, setClassManagementTab] = useState<'log' | 'history' | 'reminders'>('log');

  // Private student notes states
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [activeNotesStudentId, setActiveNotesStudentId] = useState<string>('');
  const [activeNotesText, setActiveNotesText] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  // Custom interactive calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [draggedObject, setDraggedObject] = useState<{ id: string; type: 'trial' | 'session' } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [calendarToast, setCalendarToast] = useState<string | null>(null);
  const [dragDroppedSession, setDragDroppedSession] = useState<{ sessionId: string; targetDate: string } | null>(null);
  const [quickTimeVal, setQuickTimeVal] = useState<string>('16:00');
  const [quickDurationVal, setQuickDurationVal] = useState<number>(1);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [previousSessionsSearch, setPreviousSessionsSearch] = useState<string>('');
  const [previousSessionsStudentFilter, setPreviousSessionsStudentFilter] = useState<string>('all');
  const [previousSessionsMonthFilter, setPreviousSessionsMonthFilter] = useState<string>('all');

  const sortedStudents = useMemo(() => {
    const lastSessionMap: Record<string, string> = {};
    sessions.forEach(session => {
      const timeKey = session.createdAt || session.date || '';
      if (!timeKey) return;

      const stIds: string[] = [];
      if (session.studentId) stIds.push(session.studentId);
      if (Array.isArray(session.studentIds)) {
        session.studentIds.forEach((id: string) => { if (id && !stIds.includes(id)) stIds.push(id); });
      }
      if (Array.isArray(session.students)) {
        session.students.forEach((st: any) => {
          const id = typeof st === 'string' ? st : st?.id;
          if (id && !stIds.includes(id)) stIds.push(id);
        });
      }

      stIds.forEach(id => {
        const currentLast = lastSessionMap[id];
        if (!currentLast || timeKey > currentLast) {
          lastSessionMap[id] = timeKey;
        }
      });
    });

    return [...students].sort((a, b) => {
      // 1. Active students first (Active > Paused / Graduated)
      const isActiveA = (a.academicStatus || 'Active') === 'Active' ? 1 : 0;
      const isActiveB = (b.academicStatus || 'Active') === 'Active' ? 1 : 0;
      if (isActiveA !== isActiveB) {
        return isActiveB - isActiveA;
      }

      // 2. Students with sessions come first, ordered by latest session date/entry timestamp (newest first)
      const dateA = lastSessionMap[a.id] || '';
      const dateB = lastSessionMap[b.id] || '';

      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      if (dateA) return -1;
      if (dateB) return 1;
      
      // 3. Fallback: Registration date (newest first)
      const regA = a.registrationDate || a.createdAt || '';
      const regB = b.registrationDate || b.createdAt || '';
      if (regA && regB) {
        return regB.localeCompare(regA);
      }
      if (regA) return -1;
      if (regB) return 1;

      // 4. Fallback: Name
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [students, sessions]);

  const getSessionType = (sess: any): 'individual' | 'group' | 'trial' => {
    if (sess.isGroupSession || sess.isGroup || sess.groupId || sess.courseCode) {
      return 'group';
    }
    if (sess.isTrial || sess.isTrialSession || (sess.notes && sess.notes.includes('تجريب')) || (sess.subject && sess.subject.includes('تجريب')) || (sess.topic && sess.topic.includes('تجريب'))) {
      return 'trial';
    }
    return 'individual';
  };

  const getSessionBgAndBorder = (sess: any, isReadOnly: boolean = false) => {
    const type = getSessionType(sess);
    if (isReadOnly) {
      if (type === 'group') return 'bg-purple-50 text-purple-500 border-purple-200 cursor-not-allowed';
      if (type === 'trial') return 'bg-amber-55 text-amber-600 border-amber-250 cursor-not-allowed';
      return 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed';
    }
    if (type === 'group') {
      return 'bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-400 hover:bg-purple-100 cursor-grab active:cursor-grabbing';
    }
    if (type === 'trial') {
      return 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400 hover:bg-amber-100 cursor-grab active:cursor-grabbing';
    }
    return 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 cursor-grab active:cursor-grabbing';
  };

  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [groupCourses, setGroupCourses] = useState<GroupCourse[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trialLessons, setTrialLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Overdue trials state & memo
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const hasOverdueTrials = useMemo(() => {
    return trialLessons.some(t => 
      t.teacherId === loggedInTeacher.id && 
      t.status === 'pending' && 
      t.createdAt && 
      (Date.now() - new Date(t.createdAt).getTime() > 24 * 60 * 60 * 1000)
    );
  }, [trialLessons, loggedInTeacher.id]);

  const pendingTrialsCount = useMemo(() => {
    return trialLessons.filter(t => t.teacherId === loggedInTeacher.id && t.status === 'pending').length;
  }, [trialLessons, loggedInTeacher.id]);

  // Check if teacher has at least one active (and not completed/archived) group course
  const hasActiveGroupCourse = useMemo(() => {
    return groupCourses.some(c => 
      c.teacherId === loggedInTeacher.id && 
      c.status?.toLowerCase() === 'active' && 
      !(c.completedHours >= c.totalHours && c.totalHours > 0)
    );
  }, [groupCourses, loggedInTeacher.id]);

  // Trial Lessons filtering states
  const [trialStatusFilter, setTrialStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [trialSearchQuery, setTrialSearchQuery] = useState('');
  const [activeCalendarTrialId, setActiveCalendarTrialId] = useState<string | null>(null);
  const [trialScheduleDates, setTrialScheduleDates] = useState<{[key: string]: string}>({});
  const [trialScheduleTimes, setTrialScheduleTimes] = useState<{[key: string]: string}>({});
  const [selectedTrialForCalendar, setSelectedTrialForCalendar] = useState<any | null>(null);
  const [calendarFormDate, setCalendarFormDate] = useState<string>('');
  const [calendarFormStartTime, setCalendarFormStartTime] = useState<string>('16:00');
  const [calendarFormEndTime, setCalendarFormEndTime] = useState<string>('17:00');
  const [calendarShowModal, setCalendarShowModal] = useState<boolean>(false);
  const [calendarCustomTitle, setCalendarCustomTitle] = useState<string>('');
  const [calendarCustomDesc, setCalendarCustomDesc] = useState<string>('');

  // Task Evaluation States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [evalGrade, setEvalGrade] = useState<string>('');
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [evalSubmitted, setEvalSubmitted] = useState<boolean>(false);
  const [evalStarted, setEvalStarted] = useState<boolean>(false);
  const [evalTitle, setEvalTitle] = useState<string>('');
  const [evalDescription, setEvalDescription] = useState<string>('');
  const [evalExpirationDate, setEvalExpirationDate] = useState<string>('');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState<boolean>(false);
  const [evalSubFilter, setEvalSubFilter] = useState<'all' | 'not-started' | 'pending-submission' | 'pending-evaluation' | 'completed'>('all');

  // Group Logging State
  const [logGroupCourseId, setLogGroupCourseId] = useState('');
  const [isGroupLogging, setIsGroupLogging] = useState(false);
  const [groupLogSuccess, setGroupLogSuccess] = useState(false);
  const [groupLogError, setGroupLogError] = useState('');
  const [groupLogDuration, setGroupLogDuration] = useState(2);
  const [groupLogDate, setGroupLogDate] = useState(getLocalDateString());
  const [groupLogNote, setGroupLogNote] = useState('');
  const [groupLogTopic, setGroupLogTopic] = useState('');

  // Form State - Class Logging
  const [logStudentId, setLogStudentId] = useState('');
  const [logStudentIds, setLogStudentIds] = useState<string[]>([]);
  const [logSubject, setLogSubject] = useState('');
  const [logTopic, setLogTopic] = useState('');
  const [logDuration, setLogDuration] = useState(1);
  const [logDurationMinutes, setLogDurationMinutes] = useState(60);
  const [logDate, setLogDate] = useState(getLocalDateString());
  const [logCustomFee, setLogCustomFee] = useState<string>('');
  const [logTeacherRateOverride, setLogTeacherRateOverride] = useState<number | null>(null);
  const [logNotes, setLogNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);

  // Derived state to get the active student ID for notes
  const currentSelectedNotesStudentId = activeNotesStudentId || (logStudentIds && logStudentIds.length === 1 ? logStudentIds[0] : '');

  useEffect(() => {
    if (currentSelectedNotesStudentId) {
      setActiveNotesText(studentNotes[currentSelectedNotesStudentId] || '');
    } else {
      setActiveNotesText('');
    }
  }, [currentSelectedNotesStudentId, studentNotes]);

  // Warning bypass state for teachers
  const [teacherBypassWarning, setTeacherBypassWarning] = useState(false);

  // Autofill state for logging sessions
  const [showAutoFillAlert, setShowAutoFillAlert] = useState(false);
  const [autoFillSourceStudent, setAutoFillSourceStudent] = useState('');
  const [autoFillSubject, setAutoFillSubject] = useState('');
  const [autoFillFee, setAutoFillFee] = useState('');

  // States for Previous Sessions filters
  const [prevSessionSearchStudentId, setPrevSessionSearchStudentId] = useState<string>('all');
  const [prevSessionDateFilter, setPrevSessionDateFilter] = useState<'all' | 'today' | 'this-month' | 'specific-month' | 'custom'>('all');
  const [prevSessionStartDate, setPrevSessionStartDate] = useState<string>('');
  const [prevSessionEndDate, setPrevSessionEndDate] = useState<string>('');
  const [prevSessionSelectedMonth, setPrevSessionSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // simulated automatic notifications/alerts state
  const [notifiedCourseIds, setNotifiedCourseIds] = useState<string[]>([]);
  const [sentProposals, setSentProposals] = useState<string[]>([]);
  const [sendingProposalId, setSendingProposalId] = useState<string | null>(null);
  const [showAutoAlertToast, setShowAutoAlertToast] = useState<boolean>(false);
  const [toastMessageText, setToastMessageText] = useState<string>('');

  // Low Remaining Sessions Alerts state (students with <= 2 sessions left)
  const [dismissedLowSessionBanner, setDismissedLowSessionBanner] = useState<boolean>(false);
  const [dismissedGroupDepletionBanner, setDismissedGroupDepletionBanner] = useState<boolean>(false);
  const [hasShownLowSessionToast, setHasShownLowSessionToast] = useState<boolean>(false);

  // Session Success Notification Modal & Summary State
  const [sessionSuccessInfo, setSessionSuccessInfo] = useState<{
    isOpen: boolean;
    title: string;
    subject: string;
    topic?: string;
    studentsCount: number;
    studentsNames: string[];
    durationMinutes: number;
    date: string;
    isGroup?: boolean;
    groupCourseName?: string;
    pricingUnit?: 'hourly' | 'session_40';
    studentFee?: number | null;
    teacherPayout?: number | null;
    sessionCount?: number | null;
    studentsBalanceDetails?: Array<{
      studentId?: string;
      studentName: string;
      isOpenBalance: boolean;
      prevBalance?: number;
      newBalance: number;
      remainingSessions: number;
      rate?: number;
    }>;
  } | null>(null);

  const [lastLoggedSessionSummary, setLastLoggedSessionSummary] = useState<{
    subject: string;
    topic?: string;
    durationMinutes: number;
    studentsCount: number;
    studentsNames: string[];
    isSession40Mode?: boolean;
    studentFee?: number;
    teacherPayout?: number;
    sessionCount?: number;
  } | null>(null);

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.18);
      playTone(659.25, now + 0.09, 0.22);
      playTone(783.99, now + 0.18, 0.26);
      playTone(1046.50, now + 0.27, 0.4);
    } catch (e) {
      // Audio autoplay policy or not supported
    }
  };

  // Reset bypass toggle when inputs change to make sure they actively override if anything changes
  useEffect(() => {
    setTeacherBypassWarning(false);
  }, [logStudentIds, logDurationMinutes, logCustomFee]);

  // Filter students by session system in logging view
  const [studentSystemFilter, setStudentSystemFilter] = useState<'all' | 'hourly' | 'session_40'>('all');
  // Toggle between viewing assigned students and all academy students
  const [studentViewScope, setStudentViewScope] = useState<'linked' | 'all'>('linked');

  // Global platform settings state
  const [globalSettings, setGlobalSettings] = useState<Settings | null>(null);
  const settings = globalSettings;

  // Session system choice at start of registration ('session_40' | 'hourly') - Defaults to hourly
  const [sessionPricingSystemChoice, setSessionPricingSystemChoice] = useState<'session_40' | 'hourly'>('hourly');
  const [isPricingSystemManuallyChanged, setIsPricingSystemManuallyChanged] = useState<boolean>(false);

  // 40-minute rates for student and teacher
  const [logSession40StudentRate, setLogSession40StudentRate] = useState<string>('40');
  const [logSession40TeacherPayout, setLogSession40TeacherPayout] = useState<string>('25');
  const [isSession40RateManuallyEdited, setIsSession40RateManuallyEdited] = useState<boolean>(false);

  // Active session mode: follows user choice or defaults to hourly system
  const isSession40Mode = sessionPricingSystemChoice === 'session_40';

  // Check stage for selected students: Secondary & Middle school default to hourly
  const selectedStudentsForLog = useMemo(() => {
    return students.filter(s => logStudentIds.includes(s.id));
  }, [students, logStudentIds]);

  const hasSecondaryStudent = useMemo(() => {
    return selectedStudentsForLog.some(s => {
      const stage = getAcademicStage(s.grade || s.academicLevel || (s as any)?.academicStage || '');
      return stage === 'secondary';
    });
  }, [selectedStudentsForLog]);

  const hasMiddleStudent = useMemo(() => {
    return selectedStudentsForLog.some(s => {
      const stage = getAcademicStage(s.grade || s.academicLevel || (s as any)?.academicStage || '');
      return stage === 'middle';
    });
  }, [selectedStudentsForLog]);

  const isSecondaryOrMiddleSelected = hasSecondaryStudent || hasMiddleStudent;

  // Synchronize 40-minute rates and automatic hourly system based on selected student's stage
  useEffect(() => {
    if (logStudentIds.length > 0) {
      const selectedStudent = students.find(s => logStudentIds.includes(s.id));
      
      const hasSecondary = logStudentIds.some(sid => {
        const s = students.find(st => st.id === sid);
        if (!s) return false;
        return getAcademicStage(s.grade || s.academicLevel || (s as any)?.academicStage || '') === 'secondary';
      });

      const hasMiddle = logStudentIds.some(sid => {
        const s = students.find(st => st.id === sid);
        if (!s) return false;
        return getAcademicStage(s.grade || s.academicLevel || (s as any)?.academicStage || '') === 'middle';
      });

      // User Rule: نظام الطلاب الثانوي والإعدادي نظام ساعة تلقائي وحصري عند التسجيل من صفحة المعلم
      if (hasSecondary || hasMiddle) {
        // طلاب المرحلتين الثانوية والإعدادية: نظام الساعات فقط (حصراً وتلقائياً)
        setSessionPricingSystemChoice('hourly');
        setIsPricingSystemManuallyChanged(false);
      } else {
        // صفوف المرحلة الأساسية/الابتدائية: فحص التفضيل
        const hasSession40Student = logStudentIds.some(sid => {
          const s = students.find(st => st.id === sid);
          return s?.preferredPricingUnit === 'session_40' || s?.sessionSystem === 'session_40';
        });

        if (!isPricingSystemManuallyChanged) {
          if (hasSession40Student) {
            setSessionPricingSystemChoice('session_40');
          } else {
            setSessionPricingSystemChoice('hourly');
          }
        }
      }

      if (selectedStudent) {
        const stage = getAcademicStage(selectedStudent.grade || selectedStudent.academicLevel || (selectedStudent as any)?.academicStage || '');
        let defStudentRate = 40;
        let defTeacherPayout = 25;

        if (stage === 'secondary') {
          defStudentRate = selectedStudent.secondarySchoolSessionRate ?? globalSettings?.secondarySchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate;
          defTeacherPayout = loggedInTeacher?.secondarySchoolSessionPayout ?? globalSettings?.secondarySchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolTeacherSessionRate;
        } else if (stage === 'middle') {
          defStudentRate = selectedStudent.middleSchoolSessionRate ?? globalSettings?.middleSchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate;
          defTeacherPayout = loggedInTeacher?.middleSchoolSessionPayout ?? globalSettings?.middleSchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolTeacherSessionRate;
        } else {
          const baseHourly = selectedStudent.hourlyRate || loggedInTeacher?.billingRate || globalSettings?.defaultStudentHourlyRate || 60;
          defStudentRate = Math.round((baseHourly * 40) / 60) || 40;
          const teacherHourly = loggedInTeacher?.payoutRate || loggedInTeacher?.hourlyRate || globalSettings?.defaultTeacherHourlyRate || 35;
          defTeacherPayout = Math.round((teacherHourly * 40) / 60) || 25;
        }

        if (!isSession40RateManuallyEdited) {
          setLogSession40StudentRate(String(defStudentRate));
          setLogSession40TeacherPayout(String(defTeacherPayout));
        }
      }
    } else {
      // إذا لم يتم تحديد أي طالب، فإن النظام الافتراضي دائماً نظام الساعات (60 دقيقة)
      if (!isPricingSystemManuallyChanged) {
        setSessionPricingSystemChoice('hourly');
      }
    }
  }, [logStudentIds, students, loggedInTeacher, globalSettings, isPricingSystemManuallyChanged, isSession40RateManuallyEdited]);

  // Session count and computed 40-minute costs
  const session40UnitsCount = useMemo(() => {
    return Number((logDurationMinutes / 40).toFixed(2));
  }, [logDurationMinutes]);

  const computed40MinStudentCost = useMemo(() => {
    const rate = Number(logSession40StudentRate) || 0;
    return Math.round(rate * session40UnitsCount);
  }, [logSession40StudentRate, session40UnitsCount]);

  const computed40MinTeacherPayout = useMemo(() => {
    const payout = Number(logSession40TeacherPayout) || 0;
    return Math.round(payout * session40UnitsCount);
  }, [logSession40TeacherPayout, session40UnitsCount]);

  // Auto-switch default duration when student is selected or system is switched
  useEffect(() => {
    if (logStudentIds.length > 0 || isPricingSystemManuallyChanged) {
      if (isSession40Mode && !hasSecondaryStudent && !hasMiddleStudent) {
        if (logDurationMinutes === 60 || logDurationMinutes === 30) {
          setLogDurationMinutes(40);
        }
      } else {
        const firstStudent = students.find(st => logStudentIds.includes(st.id));
        const preferredDuration = firstStudent?.defaultSessionDurationMinutes === 30 ? 30 : 60;
        if (logDurationMinutes === 40) {
          setLogDurationMinutes(preferredDuration);
        }
      }
    }
  }, [isSession40Mode, logStudentIds, students, isPricingSystemManuallyChanged, hasSecondaryStudent, hasMiddleStudent]);

  // Enforce default values (1 hour duration, current local date, hourly system) when opening class logging tab
  useEffect(() => {
    if (activeSubTab === 'log-session') {
      setLogDuration(1);
      setLogDurationMinutes(60);
      setLogDate(getLocalDateString());
      setLogStudentIds([]);
      setSessionPricingSystemChoice('hourly');
      setIsPricingSystemManuallyChanged(false);
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'log-group-session' && !hasActiveGroupCourse) {
      setActiveSubTab('home');
    }
  }, [activeSubTab, hasActiveGroupCourse]);

  // Form State - Booking Appointment
  const [bookStudentSearchQuery, setBookStudentSearchQuery] = useState('');
  const [bookStudentId, setBookStudentId] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookTopic, setBookTopic] = useState('');
  const [bookDuration, setBookDuration] = useState(1);
  const [bookDate, setBookDate] = useState(getLocalDateString());
  const [bookStartTime, setBookStartTime] = useState('16:00');
  const [bookCustomFee, setBookCustomFee] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookError, setBookError] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Overdue session direct edit state
  const [editingOverdueSessionId, setEditingOverdueSessionId] = useState<string | null>(null);
  const [overdueEditDuration, setOverdueEditDuration] = useState<number>(1);
  const [overdueEditSubject, setOverdueEditSubject] = useState<string>('');
  const [overdueEditDate, setOverdueEditDate] = useState<string>('');
  const [overdueEditStartTime, setOverdueEditStartTime] = useState<string>('16:00');

  // Pending sessions edit state
  const [editingPendingSessionId, setEditingPendingSessionId] = useState<string | null>(null);
  const [pendingEditDuration, setPendingEditDuration] = useState<number>(1);
  const [pendingEditSubject, setPendingEditSubject] = useState<string>('');
  const [pendingEditDate, setPendingEditDate] = useState<string>('');
  const [pendingEditStartTime, setPendingEditStartTime] = useState<string>('16:00');
  const [pendingEditNotes, setPendingEditNotes] = useState<string>('');
  const [isUpdatingSession, setIsUpdatingSession] = useState<string | null>(null);
  const [isApprovingBooking, setIsApprovingBooking] = useState<string | null>(null);

  // General teacher session edit state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionEditDuration, setSessionEditDuration] = useState<number>(1);
  const [sessionEditDate, setSessionEditDate] = useState<string>('');
  const [sessionEditStartTime, setSessionEditStartTime] = useState<string>('16:00');

  // Daily Schedule Observer view states
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState<string>(getLocalDateString());
  const [upcomingSearch, setUpcomingSearch] = useState<string>('');
  const [upcomingTypeFilter, setUpcomingTypeFilter] = useState<'all' | 'private' | 'course' | 'trial'>('all');

  const selectedDateSessions = useMemo(() => {
    return sessions.filter(s => 
      s.teacherId === loggedInTeacher.id && 
      s.date === dashboardSelectedDate
    );
  }, [sessions, loggedInTeacher.id, dashboardSelectedDate]);

  const selectedDateStats = useMemo(() => {
    let totalHours = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let bookedCount = 0;

    selectedDateSessions.forEach(s => {
      totalHours += (s.durationHours || 0);
      if (s.approved) {
        completedCount++;
      } else if (s.teacherConfirmed === false) {
        bookedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalHours,
      completedCount,
      pendingCount,
      bookedCount,
      totalCount: selectedDateSessions.length
    };
  }, [selectedDateSessions]);

  // Form State - AI Planner & Builder
  const [aiTopics, setAiTopics] = useState('');
  const [aiSourceType, setAiSourceType] = useState<'none' | 'website' | 'file' | 'repo'>('none');
  const [aiSourceValue, setAiSourceValue] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini' | 'auto'>('openai');
  const [aiModel, setAiModel] = useState<string>('gpt-4o');
  const [aiGeneratedEngineBadge, setAiGeneratedEngineBadge] = useState<string>('');
  const [aiApiStatus, setAiApiStatus] = useState<{
    openaiAvailable: boolean;
    geminiAvailable: boolean;
    defaultProvider: string;
    activeProviderLabel: string;
    models: any[];
  }>({
    openaiAvailable: true,
    geminiAvailable: true,
    defaultProvider: 'openai',
    activeProviderLabel: 'ChatGPT (OpenAI API)',
    models: []
  });

  useEffect(() => {
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setAiApiStatus(data);
          if (data.openaiAvailable) {
            setAiProvider('openai');
            setAiModel('gpt-4o');
          } else if (data.geminiAvailable) {
            setAiProvider('gemini');
            setAiModel('gemini-3.8-flash');
          }
        }
      })
      .catch(err => {
        console.warn("Could not fetch /api/ai/status:", err);
      });
  }, []);
  
  // Educational Resources and Tags State
  const [eduResources, setEduResources] = useState<any[]>([]);
  const [eduLoading, setEduLoading] = useState(false);
  const [showSaveResourceModal, setShowSaveResourceModal] = useState(false);
  const [resourceSaveTitle, setResourceSaveTitle] = useState('');
  const [resourceSaveTags, setResourceSaveTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [eduSearchQuery, setEduSearchQuery] = useState('');
  const [eduSelectedTagFilter, setEduSelectedTagFilter] = useState('');
  const [selectedResourceToView, setSelectedResourceToView] = useState<any | null>(null);
  const [activePlannerView, setActivePlannerView] = useState<'generator' | 'repository'>('generator');

  const POPULAR_TAGS = ['رياضيات', 'بجروت', 'نحو', 'كيمياء', 'فيزياء', 'لغة عربية', 'لغة عبرية', 'لغة إنجليزية', 'مدنيات', 'تاريخ', 'بيولوجيا', 'تفاضل وتكامل', 'تمثيل لويس', 'قواعد'];
  const [aiSandboxText, setAiSandboxText] = useState('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [aiGrade, setAiGrade] = useState('الصف العاشر');
  
  const insertToTopicsText = (symbol: string) => {
    setAiTopics(prev => prev ? prev + " " + symbol : symbol);
  };
  const [aiFileType, setAiFileType] = useState('شرح مفصل ومكتمل للموضوع');
  const [aiIsWorksheet, setAiIsWorksheet] = useState(false);
  const [aiWorksheetLevel, setAiWorksheetLevel] = useState('diverse'); // 'diverse' or 'advanced'
  const [aiQuestionTypes, setAiQuestionTypes] = useState({
    multipleChoice: true,
    fillBlanks: true,
    openQuestions: true,
    trueFalse: true
  });
  const [aiQuestionCounts, setAiQuestionCounts] = useState({
    multipleChoice: 5,
    fillBlanks: 5,
    openQuestions: 3,
    trueFalse: 5
  });
  const [aiResult, setAiResult] = useState('');
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [isUsingRichSandbox, setIsUsingRichSandbox] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [academicAIEnabled, setAcademicAIEnabled] = useState<boolean>(true);
  const [whiteboardEnabled, setWhiteboardEnabled] = useState<boolean>(true);
  const [globalThreshold, setGlobalThreshold] = useState<number>(-100);
  const [studentLimitAlert, setStudentLimitAlert] = useState<{
    id: string;
    studentName: string;
    balance: number;
    threshold: number;
  } | null>(null);

  // AI Quality Evaluation States
  const [aiEvalRating, setAiEvalRating] = useState<'up' | 'down' | null>(null);
  const [aiEvalFeedbackText, setAiEvalFeedbackText] = useState('');
  const [aiEvalIsSubmitting, setAiEvalIsSubmitting] = useState(false);
  const [aiEvalSubmitted, setAiEvalSubmitted] = useState(false);
  const [aiEvalError, setAiEvalError] = useState('');

  // Print Preview Overlay States
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');
  const [isExportReportModalOpen, setIsExportReportModalOpen] = useState(false);
  const [isBalanceStatementModalOpen, setIsBalanceStatementModalOpen] = useState(false);

  // Loaded status check
  useEffect(() => {
    fetchMainData();
  }, [loggedInTeacher]);

  // Real-time synchronization for students, assignments, and sessions
  useEffect(() => {
    let unsubStudents: (() => void) | undefined;
    let unsubAssignments: (() => void) | undefined;
    let unsubSessions: (() => void) | undefined;

    try {
      unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
        const loadedStudents = snap.docs.map(d => {
          const data = d.data() as Student;
          if (data.teachers) {
            data.teachers = Array.from(new Set(data.teachers));
          }
          return { id: d.id, ...data };
        });
        setStudents(loadedStudents);
      }, (err) => console.warn('Realtime students listener in TeacherDashboard:', err));

      unsubAssignments = onSnapshot(collection(db, 'assignments'), (snap) => {
        const rawAssignments = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const seen = new Set<string>();
        const loadedAssignments: any[] = [];
        for (const ass of rawAssignments) {
          const key = `${ass.studentId}_${ass.teacherId}`;
          if (!seen.has(key)) {
            seen.add(key);
            loadedAssignments.push(ass);
          }
        }
        setAssignments(loadedAssignments);
      }, (err) => console.warn('Realtime assignments listener in TeacherDashboard:', err));

      unsubSessions = onSnapshot(collection(db, 'sessions'), (snap) => {
        const loadedSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        setSessions(loadedSessions);
      }, (err) => console.warn('Realtime sessions listener in TeacherDashboard:', err));
    } catch (err) {
      console.warn('Realtime setup error in TeacherDashboard:', err);
    }

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubAssignments) unsubAssignments();
      if (unsubSessions) unsubSessions();
    };
  }, []);

  const fetchMainData = async () => {
    setLoading(true);
    try {
      const [sSnap, tSnap, sessSnap, credSnap, assSnap, gcSnap, tasksSnap, settingsSnap, trialsSnap, eduResourcesSnap, paymentsSnap, notesSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'groupCourses')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] } as any)),
        getDoc(doc(db, 'settings', 'global')).catch(() => null),
        getDocs(collection(db, 'trialLessons')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'educational_resources')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'payments')).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, 'teacherStudentNotes')).catch(() => ({ docs: [] } as any))
      ]);

      const loadedStudents = sSnap.docs.map(d => {
        const data = d.data() as Student;
        if (data.teachers) {
          data.teachers = Array.from(new Set(data.teachers));
        }
        return { id: d.id, ...data };
      });
      const loadedTeachers = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
      const loadedSessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      
      if (loggedInTeacher && (loggedInTeacher.username === 'zakiabuillan' || loggedInTeacher.id === 'zaki_teacher' || loggedInTeacher.name?.includes('زكي'))) {
        const uniqueSessionsSubjects = Array.from(new Set(
          loadedSessions
            .filter(s => s.teacherId === loggedInTeacher.id)
            .map(s => s.subject)
            .filter(Boolean)
        ));
        loggedInTeacher.subjects = uniqueSessionsSubjects;
      }

      const loadedCredits = credSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentCredit));

      const rawAssignments = assSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const seen = new Set<string>();
      const loadedAssignments: any[] = [];
      const duplicateIdsToDelete: string[] = [];

      for (const ass of rawAssignments) {
        const key = `${ass.studentId}_${ass.teacherId}`;
        if (seen.has(key)) {
          duplicateIdsToDelete.push(ass.id);
        } else {
          seen.add(key);
          loadedAssignments.push(ass);
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        console.log(`Found and deleting ${duplicateIdsToDelete.length} duplicate assignments in TeacherDashboard...`);
        Promise.all(duplicateIdsToDelete.map(id => deleteDoc(doc(db, 'assignments', id)))).catch(err => {
          console.error("Error deleting duplicates in background:", err);
        });
      }

      const loadedGroupCourses = gcSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as GroupCourse));
      const loadedTasks = tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Task));
      const loadedTrials = trialsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const loadedEduResources = eduResourcesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const loadedPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

      // Parse private teacher notes
      const loadedNotes: Record<string, string> = {};
      if (notesSnap && notesSnap.docs) {
        notesSnap.docs.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data && data.teacherId === loggedInTeacher.id) {
            loadedNotes[data.studentId] = data.notesText || '';
          }
        });
      }
      setStudentNotes(loadedNotes);

      setStudents(loadedStudents);
      setTeachers(loadedTeachers);
      setSessions(loadedSessions);
      setCredits(loadedCredits);
      setPayments(loadedPayments);
      setAssignments(loadedAssignments);
      setGroupCourses(loadedGroupCourses);
      setTasks(loadedTasks);
      setTrialLessons(loadedTrials);
      setEduResources(loadedEduResources);

      if (settingsSnap && settingsSnap.exists()) {
        const sData = settingsSnap.data();
        setGlobalSettings(sData as Settings);
        setAcademicAIEnabled(sData.academicAIEnabled !== false);
        setWhiteboardEnabled(sData.whiteboardEnabled !== false);
        setGlobalThreshold(typeof sData.lowBalanceThreshold === 'number' ? sData.lowBalanceThreshold : -100);
      } else {
        setAcademicAIEnabled(true);
        setWhiteboardEnabled(true);
        setGlobalThreshold(-100);
      }

      // Pre-select first valid values for forms
      const linked = getLinkedStudents(loadedStudents, loadedAssignments);
      if (linked.length > 0) {
        setLogStudentId(linked[0].id);
        setBookStudentId(linked[0].id);
      }

      const teacherCourses = loadedGroupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
      if (teacherCourses.length > 0) {
        setLogGroupCourseId(teacherCourses[0].id);
      }

      if (loggedInTeacher.subjects && loggedInTeacher.subjects.length > 0) {
        if (loggedInTeacher.subjects.length === 1) {
          setLogSubject(loggedInTeacher.subjects[0]);
          setBookSubject(loggedInTeacher.subjects[0]);
          setAiSubject(loggedInTeacher.subjects[0]);
        } else {
          setLogSubject('');
          setBookSubject('');
          setAiSubject(loggedInTeacher.subjects[0] || '');
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper variables for overdue booked sessions that need teacher confirmation
  const overdueSessions = useMemo(() => {
    const booked = sessions.filter(s => 
      s.teacherId === loggedInTeacher.id && 
      s.approved === false && 
      s.teacherConfirmed === false
    );

    const now = new Date();
    // Get local date as YYYY-MM-DD
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDate = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDate}`;
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return booked.filter(s => {
      if (!s.date) return false;
      if (s.date < todayStr) return true;
      if (s.date === todayStr) {
        const sTime = s.startTime || "16:00"; 
        const [h, m] = sTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        
        const startMinutes = h * 60 + m;
        const durationMin = Math.round((s.durationHours || 1) * 60);
        const endMinutes = startMinutes + durationMin;
        
        return currentMinutes >= endMinutes;
      }
      return false;
    });
  }, [sessions, loggedInTeacher.id]);

  // Dedicated memoized list of subjects taught exclusively by the logged-in teacher
  const teacherAssignedSubjects = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(loggedInTeacher.subjects)) {
      loggedInTeacher.subjects.forEach(s => {
        const trimmed = typeof s === 'string' ? s.trim() : '';
        if (trimmed && !list.includes(trimmed)) {
          list.push(trimmed);
        }
      });
    }
    if (loggedInTeacher.specialization && typeof loggedInTeacher.specialization === 'string') {
      const trimmed = loggedInTeacher.specialization.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    }
    if (Array.isArray(groupCourses)) {
      groupCourses
        .filter(c => c.teacherId === loggedInTeacher.id && c.subject)
        .forEach(c => {
          const trimmed = c.subject?.trim();
          if (trimmed && !list.includes(trimmed)) {
            list.push(trimmed);
          }
        });
    }
    return list;
  }, [loggedInTeacher.subjects, loggedInTeacher.specialization, loggedInTeacher.id, groupCourses]);

  // Initialize default aiSubject if not yet set
  useEffect(() => {
    if (!aiSubject) {
      if (teacherAssignedSubjects.length > 0) {
        setAiSubject(teacherAssignedSubjects[0]);
      } else {
        setAiSubject('كيمياء');
      }
    }
  }, [teacherAssignedSubjects]);

  // Sessions recorded by the teacher that are awaiting manager's approval
  const pendingSessions = useMemo(() => {
    return sessions.filter(s => 
      s.teacherId === loggedInTeacher.id && 
      s.approved === false
    );
  }, [sessions, loggedInTeacher.id]);

  // Filtered list of all historical sessions taught by this teacher
  const filteredTeacherSessions = useMemo(() => {
    let list = sessions.filter(s => s.teacherId === loggedInTeacher.id && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
    
    // Filter by student ID
    if (prevSessionSearchStudentId && prevSessionSearchStudentId !== 'all') {
      list = list.filter(s => s.studentId === prevSessionSearchStudentId);
    }
    
    // Filter by date quick range
    if (prevSessionDateFilter === 'today') {
      const todayStr = getLocalDateString();
      list = list.filter(s => s.date === todayStr);
    } else if (prevSessionDateFilter === 'this-month') {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `${yr}-${mo}`;
      list = list.filter(s => s.date && s.date.startsWith(prefix));
    } else if (prevSessionDateFilter === 'specific-month') {
      if (prevSessionSelectedMonth) {
        list = list.filter(s => s.date && s.date.startsWith(prevSessionSelectedMonth));
      }
    } else if (prevSessionDateFilter === 'custom') {
      if (prevSessionStartDate) {
        list = list.filter(s => s.date && s.date >= prevSessionStartDate);
      }
      if (prevSessionEndDate) {
        list = list.filter(s => s.date && s.date <= prevSessionEndDate);
      }
    }
    
    // Sort in chronological order (newest first)
    return list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const dateComp = dateB.localeCompare(dateA);
      if (dateComp !== 0) return dateComp;
      const createA = a.createdAt || '';
      const createB = b.createdAt || '';
      return createB.localeCompare(createA);
    });
  }, [sessions, loggedInTeacher.id, prevSessionSearchStudentId, prevSessionDateFilter, prevSessionStartDate, prevSessionEndDate, prevSessionSelectedMonth]);

  // Statistics for the filtered sessions
  const prevSessionStats = useMemo(() => {
    const totalCount = filteredTeacherSessions.length;
    const totalHours = filteredTeacherSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const approvedCount = filteredTeacherSessions.filter(s => s.approved !== false).length;
    const pendingCount = filteredTeacherSessions.filter(s => s.approved === false).length;
    
    return { totalCount, totalHours, approvedCount, pendingCount };
  }, [filteredTeacherSessions]);

  const exportTeacherStatementToPDF = () => {
    const actualPayoutRate = loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35;
    const totalHours = filteredTeacherSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const totalEarnings = filteredTeacherSessions.reduce((sum, s) => {
      if (s.customPayout !== undefined) return sum + s.customPayout;
      
      const sessionAssignment = assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id);
      const sessionPayoutRate = sessionAssignment?.teacherPayoutRate !== undefined ? sessionAssignment.teacherPayoutRate : actualPayoutRate;
      
      return sum + (s.durationHours * sessionPayoutRate);
    }, 0);

    let teacherPayments = payments.filter(p => p.teacherId === loggedInTeacher.id);
    if (prevSessionDateFilter === 'today') {
      const todayStr = getLocalDateString();
      teacherPayments = teacherPayments.filter(p => p.date === todayStr);
    } else if (prevSessionDateFilter === 'this-month') {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `${yr}-${mo}`;
      teacherPayments = teacherPayments.filter(p => p.date && p.date.startsWith(prefix));
    } else if (prevSessionDateFilter === 'specific-month') {
      if (prevSessionSelectedMonth) {
        teacherPayments = teacherPayments.filter(p => p.date && p.date.startsWith(prevSessionSelectedMonth));
      }
    } else if (prevSessionDateFilter === 'custom') {
      if (prevSessionStartDate) {
        teacherPayments = teacherPayments.filter(p => p.date && p.date >= prevSessionStartDate);
      }
      if (prevSessionEndDate) {
        teacherPayments = teacherPayments.filter(p => p.date && p.date <= prevSessionEndDate);
      }
    }
    const totalPaid = teacherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingBalance = totalEarnings - totalPaid;

    const startStr = prevSessionStartDate || 'بداية التسجيل';
    const endStr = prevSessionEndDate || 'اليوم';
    const periodString = prevSessionDateFilter === 'all' 
      ? 'جميع التواريخ المسجلة'
      : prevSessionDateFilter === 'today'
        ? 'اليوم الحالي'
        : prevSessionDateFilter === 'this-month'
          ? 'الشهر الحالي'
          : prevSessionDateFilter === 'specific-month'
            ? `لشهر: ${prevSessionSelectedMonth}`
            : `للفترة المحددة: من ${startStr} إلى ${endStr}`;

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف الحساب والدروس - الأستاذ ${loggedInTeacher.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;850&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background-color: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #1a365d;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 850;
      color: #1a365d;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 700;
      margin: 3px 0 0 0;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 850;
      color: #1a365d;
      text-align: center;
      margin: 15px 0;
      background: #f8fafc;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .summary-boxes {
      display: table;
      width: 100%;
      margin-bottom: 20px;
      table-layout: fixed;
    }
    .summary-cell {
      display: table-cell;
      padding: 5px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 5px solid #1a365d;
      border-radius: 8px;
      padding: 10px;
    }
    .stat-box.highlight {
      border-right-color: #d4a33c;
      background: #fffdf5;
    }
    .stat-box.balance {
      border-right-color: #ef4444;
      background: #fef2f2;
    }
    .stat-label {
      font-size: 9px;
      color: #475569;
      font-weight: 700;
    }
    .stat-amount {
      font-size: 14px;
      font-weight: 850;
      color: #0f172a;
      margin-top: 3px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table.data-table th {
      background: #1a365d;
      color: white;
      font-size: 11px;
      font-weight: 750;
      padding: 6px 10px;
      text-align: right;
      border: 1px solid #cbd5e1;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      font-size: 10.5px;
      color: #334155;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .section-title {
      font-size: 12px;
      font-weight: 850;
      color: #1a365d;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 3px;
      margin: 20px 0 10px 0;
    }
    .no-print-bar {
      background: #f1f5f9;
      padding: 10px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #cbd5e1;
    }
    .btn {
      background: #1a365d;
      color: white;
      border: none;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar {
        display: none;
      }
      body { padding: 0; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: bold; font-size: 11px; color: #1e293b;">
      ✨ كشف الحساب الأكاديمي جاهز للطباعة والتحميل كـ PDF
    </div>
    <button class="btn" onclick="window.print()">🖨️ طباعة أو حفظ PDF</button>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">أبو علان سنتر للخدمات التعليمية</h1>
        <p class="brand-sub">تقرير المعلم المعتمد لبيان سجل الحصص وساعات التدريس</p>
      </td>
      <td style="text-align: left; vertical-align: top;">
        <span style="font-size: 10px; color: #64748b; font-weight: 700;">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</span>
      </td>
    </tr>
  </table>

  <div class="doc-title">
    بيان وسجل الحصص التدريسية للأستاذ: <strong style="color: #d4a33c;">${loggedInTeacher.name}</strong> <br/>
    <span style="font-size: 11px; font-weight: 600; color: #475569;">النطاق الزمني للتقرير: ${periodString}</span>
  </div>

  <div class="section-title">خلاصة الحصص والساعات التدريسية</div>
  <div class="summary-boxes">
    <div class="summary-cell">
      <div class="stat-box highlight">
        <div class="stat-label">مجموع الحصص المنجزة</div>
        <div class="stat-amount">${filteredTeacherSessions.length} حصة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">مجموع الساعات</div>
        <div class="stat-amount">${totalHours.toFixed(1)} ساعة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box" style="border-right-color: #10b981; background: #f0fdf4;">
        <div class="stat-label">الحصص المعتمدة</div>
        <div class="stat-amount">${filteredTeacherSessions.filter(s => s.approved !== false).length} حصة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box" style="border-right-color: #f59e0b; background: #fffbeb;">
        <div class="stat-label">الحصص قيد المراجعة</div>
        <div class="stat-amount">${filteredTeacherSessions.filter(s => s.approved === false).length} حصة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">الطلاب المشمولون</div>
        <div class="stat-amount">${new Set(filteredTeacherSessions.map(s => s.studentId)).size} طلاب</div>
      </div>
    </div>
  </div>

  <div class="section-title">كشف تفصيلي بالحصص المنجزة للفترة المحددة</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 25%;">الطالب</th>
        <th style="width: 20%;">المادة الدراسيّة</th>
        <th style="width: 15%;">التاريخ والوقت</th>
        <th style="width: 25%;">الموضوع المشروح</th>
        <th style="width: 10%;">المدة (ساعة)</th>
      </tr>
    </thead>
    <tbody>
      ${filteredTeacherSessions.length === 0 ? `
        <tr>
          <td colspan="6" style="text-align: center; color: #94a3b8;">لا توجد حصص منجزة مسجلة ومطابقة في هذا التقرير.</td>
        </tr>
      ` : filteredTeacherSessions.map((s, index) => {
        const studentObj = students.find(st => st.id === s.studentId);
        return `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${studentObj?.name || 'مجهول'}</strong></td>
            <td>${s.subject || 'مادة تخصصية'}</td>
            <td>${s.date || ''} ${s.startTime || ''}</td>
            <td>${s.topic || s.notes || 'لم يحدد الموضوع'}</td>
            <td>${s.durationHours} س</td>
          </tr>
        `;
      }).join('')}
    </tbody>
    ${filteredTeacherSessions.length > 0 ? `
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colspan="5" style="text-align: right; font-weight: 800; font-size: 13px; padding: 10px;">
          مجموع ساعات الحصص المنفذة (${filteredTeacherSessions.length} حصة):
        </td>
        <td style="font-weight: 900; color: #1d4ed8; font-size: 14px; font-family: sans-serif; padding: 10px; background: #e0f2fe;">
          ${totalHours.toFixed(1)} س
        </td>
      </tr>
    </tfoot>
    ` : ''}
  </table>

  <div style="margin-top: 25px; padding: 16px 20px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; page-break-inside: avoid;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⏱️</span>
      <div>
        <div style="font-size: 11px; color: #64748b; font-weight: bold;">مجموع ساعات العمل والتدريس (نهاية الكشف)</div>
        <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; font-family: sans-serif;">
          ${totalHours.toFixed(1)} ساعة تدريسية (${filteredTeacherSessions.length} حصة)
        </div>
      </div>
    </div>
    <div>
      <div style="font-size: 11px; color: #64748b; font-weight: bold; text-align: left;">الحصص المعتمدة والمطابقة</div>
      <div style="font-size: 16px; font-weight: 900; color: #16a34a; text-align: left;">
        ${filteredTeacherSessions.filter(s => s.approved !== false).length} من أصل ${filteredTeacherSessions.length} حصة
      </div>
    </div>
  </div>

  <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-weight: 700; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
    <div>أبو علان سنتر للخدمات التعليمية - تقارير دقيقة وموثوقة 🌟</div>
    <div>المصادقة والاعتماد: مدير المنصة أ.زكي أبو علان</div>
  </div>
</body>
</html>
    `;

    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(`كشف حصص المعلم - الأستاذ ${loggedInTeacher.name}`);
    setShowPrintPreview(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleSaveTaskEvaluation = async (taskId: string) => {
    setIsSavingEvaluation(true);
    try {
      const updates: any = {
        title: evalTitle.trim(),
        description: evalDescription.trim(),
        expirationDate: evalExpirationDate,
        submitted: evalSubmitted,
        started: evalStarted || evalSubmitted,
        grade: evalGrade.trim(),
        teacherFeedback: evalFeedback.trim(),
        completed: evalSubmitted && evalGrade.trim() !== ''
      };
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      setEditingTaskId(null);
    } catch (error) {
      console.error("Error evaluating task:", error);
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const handleUpdatePendingSession = async (id: string) => {
    setIsUpdatingSession(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        durationHours: Number(pendingEditDuration),
        subject: pendingEditSubject,
        date: pendingEditDate,
        startTime: pendingEditStartTime,
        notes: pendingEditNotes
      });
      setEditingPendingSessionId(null);
      await fetchMainData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSession(null);
    }
  };

  const triggerToast = (msg: string) => {
    setCalendarToast(msg);
    setTimeout(() => {
      setCalendarToast(null);
    }, 4000);
  };

  const handleDeleteSession = (sessionId: string) => {
    setConfirmDeleteSessionId(sessionId);
  };

  const executeDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    if (session.teacherId !== loggedInTeacher.id) {
      triggerToast("عذراً، غير مسموح لك بحذف هذه الحصة لأنك لست المعلم صاحب الحصة.");
      return;
    }
    
    const student = students.find(s => s.id === session.studentId);
    
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'DELETE_SESSION',
          actionName: 'حذف حصة دراسية',
          actor: `${loggedInTeacher.name} (معلم المادة)`,
          teacherId: loggedInTeacher.id,
          teacherName: loggedInTeacher.name,
          studentId: student?.id,
          studentName: student?.name || 'مجهول',
          details: `قام معلم المادة (${loggedInTeacher.name}) بحذف حصته التدريسية المسجلة للطالب ${student?.name || 'مجهول'} بمادة ${session.subject || 'مجهول'} (تاريخ: ${session.date || ''}، مدة: ${session.durationHours} ساعة). تم استرداد رصيد الطالب تلقائياً.`
        });
      } catch (err) {
        console.error("Error logging activity:", err);
      }
      triggerToast('تم حذف الحصة التدريسية واسترداد رصيد الطالب تلقائياً بنجاح 🗑️');
      await fetchMainData();
    } catch (error) {
      console.error(error);
      triggerToast('حدث خطأ أثناء محاولة حذف الحصة.');
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const handleSaveEditedSession = async (_id: string) => {
    triggerToast('عذراً، تعديل مواعيد وأوقات وتاريخ الحصص مقتصر على مدير المنصة فقط 🔒');
    setEditingSessionId(null);
    return;
  };

  const [trialTimes, setTrialTimes] = useState<{[key: string]: string}>({});
  const [isSavingTrialTime, setIsSavingTrialTime] = useState<string | null>(null);
  const [isClosingTrial, setIsClosingTrial] = useState<string | null>(null);
  const [isPlayingCalendarLoader, setIsPlayingCalendarLoader] = useState<string | null>(null);

  const handleSaveTrialToCalendar = async (trialId: string, dateValue: string, timeValue: string) => {
    if (!dateValue) {
      alert("الرجاء اختيار تاريخ مجدول لإضافة الحصة للتقويم!");
      return;
    }
    setIsPlayingCalendarLoader(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      const timeStr = timeValue ? `, في تمام الساعة: ${timeValue}` : "";
      const displayTime = `اللقاء المجدول بتاريخ: ${dateValue}${timeStr}`;
      
      await updateDoc(docRef, {
        scheduledDate: dateValue,
        scheduledTime: displayTime
      });
      
      await fetchMainData();
      setCalendarToast(`تمت جدولة الحصة وإضافتها للتقويم بنجاح بتاريخ: ${dateValue} 🎉`);
      setTimeout(() => {
        setCalendarToast(null);
      }, 4000);
      setActiveCalendarTrialId(null);
    } catch (err) {
      console.error("Error saving trial to calendar: ", err);
    } finally {
      setIsPlayingCalendarLoader(null);
    }
  };

  const handleUpdateTrialTime = async (trialId: string, timeValue: string) => {
    if (!timeValue) return;
    setIsSavingTrialTime(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      await updateDoc(docRef, {
        scheduledTime: timeValue
      });
      await fetchMainData();
    } catch (err) {
      console.error("Error updating trial time: ", err);
    } finally {
      setIsSavingTrialTime(null);
    }
  };

  // Add to Calendar Integration Functions
  const handleOpenCalendarModal = (trial: any) => {
    setSelectedTrialForCalendar(trial);
    setCalendarCustomTitle(`حصة تجريبية - ${trial.studentName}`);
    
    let defaultDate = '';
    const dateMatch = trial.scheduledTime ? trial.scheduledTime.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) : null;
    if (dateMatch) {
      defaultDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    } else if (trial.scheduledDate) {
      defaultDate = trial.scheduledDate;
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      defaultDate = tomorrow.toISOString().substring(0, 10);
    }
    
    setCalendarFormDate(defaultDate);
    setCalendarFormStartTime('16:00');
    setCalendarFormEndTime('17:00');
    setCalendarCustomDesc(
      `حصة تجريبية للتنسيق والتقييم\nالطالب: ${trial.studentName}\nالمرحلة: ${trial.grade || 'غير محدد'}\nالمادة: ${trial.subject}\nالموضوع: ${trial.topic || ''}\nرقم الهاتف: ${trial.phone || ''}`
    );
    setCalendarShowModal(true);
  };

  const handleConfirmLocalAndAddToCalendar = async () => {
    if (!selectedTrialForCalendar) return;
    
    const displayTimeValue = `${calendarFormDate} الساعة ${calendarFormStartTime}`;
    setIsSavingTrialTime(selectedTrialForCalendar.id);
    try {
      const docRef = doc(db, 'trialLessons', selectedTrialForCalendar.id);
      await updateDoc(docRef, {
        scheduledDate: calendarFormDate,
        scheduledTime: displayTimeValue
      });
      
      setTrialTimes(prev => ({ ...prev, [selectedTrialForCalendar.id]: displayTimeValue }));
      await fetchMainData();
      
      setCalendarToast(`تمت جدولة الحصة بنجاح في النظام: ${calendarFormDate} 🎉`);
      setTimeout(() => {
        setCalendarToast(null);
      }, 4000);
    } catch (err) {
      console.error("Error confirming schedule in local calendar: ", err);
    } finally {
      setIsSavingTrialTime(null);
    }
  };

  const generateGoogleCalendarUrl = (title: string, dateStr: string, startTime: string, endTime: string, description: string) => {
    const start = `${dateStr.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
    const end = `${dateStr.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(description)}&sf=true&output=xml`;
  };

  const downloadIcsFile = (title: string, dateStr: string, startTime: string, endTime: string, description: string) => {
    const start = `${dateStr.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
    const end = `${dateStr.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendTrialReminder = async (trialId: string, trial: any) => {
    setSendingReminderId(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      const newReminderCount = (trial.reminderCount || 0) + 1;
      await updateDoc(docRef, {
        lastReminderSentAt: new Date().toISOString(),
        reminderCount: newReminderCount
      });
      
      if (trial.phone) {
        const messageText = `السلام عليكم ورحمة الله وبركاته، معك الأستاذ ${loggedInTeacher.name} من الأكاديمية. بخصوص الحصة التجريبية المقترحة للطالب ${trial.studentName} في مادة ${trial.subject}، أود التنسيق معكم لتحديد الموعد المناسب للقاء.`;
        const whatsappUrl = `https://wa.me/${trial.phone.replace(/\D/g, '')}?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        alert("تنبيه: لا يوجد رقم هاتف مسجل لهذه الحصة التجريبية.");
      }
      
      await fetchMainData();
    } catch (err) {
      console.error("Error sending trial coordinator reminder: ", err);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleCompleteTrial = async (trialId: string) => {
    setIsClosingTrial(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      await updateDoc(docRef, {
        status: 'completed'
      });
      await fetchMainData();
    } catch (err) {
      console.error("Error completing trial: ", err);
    } finally {
      setIsClosingTrial(null);
    }
  };

  const handleReopenTrial = async (trialId: string) => {
    setIsClosingTrial(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      await updateDoc(docRef, {
        status: 'pending'
      });
      await fetchMainData();
    } catch (err) {
      console.error("Error re-opening trial: ", err);
    } finally {
      setIsClosingTrial(null);
    }
  };

  const handleApprovePendingBooking = async (id: string) => {
    setIsApprovingBooking(id);
    try {
      const session = sessions.find(s => s.id === id);
      if (!session) return;

      const studentObj = students.find(s => s.id === session.studentId);
      const currentBalance = calculateStudentBalance(session.studentId);
      
      const t = teachers.find(teacher => teacher.id === session.teacherId);
      const rate = (studentObj?.hourlyRate ? studentObj.hourlyRate : (studentObj?.customRates?.[session.teacherId] || (t?.billingRate || t?.hourlyRate || 0)));
      const sessionCost = (session.durationHours || 1) * rate;

      if (currentBalance < sessionCost && !studentObj?.isOpenBalance) {
        alert(`عذراً! لا يمكن إتمام عملية الاعتماد التلقائي لعدم توفر رصيد كافٍ في محفظة الطالب ${studentObj?.name || ''} حالياً. يرجى توجيه الإدارة لمراجعة حالة ومستوى شحن المحفظة.`);
        return;
      }

      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        approved: true,
        teacherConfirmed: true,
        status: 'completed'
      });
      await fetchMainData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApprovingBooking(null);
    }
  };

  const [isConfirmingSession, setIsConfirmingSession] = useState<string | null>(null);

  const handleConfirmSessionConduct = async (id: string) => {
    setIsConfirmingSession(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        teacherConfirmed: true,
        approved: true,
        status: 'completed'
      });
      await fetchMainData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConfirmingSession(null);
    }
  };

  const handleSaveAndConfirmSessionConduct = async (id: string) => {
    setIsConfirmingSession(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        durationHours: Number(overdueEditDuration),
        subject: overdueEditSubject,
        date: overdueEditDate,
        startTime: overdueEditStartTime,
        teacherConfirmed: true,
        approved: true,
        status: 'completed'
      });
      setEditingOverdueSessionId(null);
      await fetchMainData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConfirmingSession(null);
    }
  };

  // Helper: Find students assigned to logged-in teacher (supporting direct array, assignments collection, direct properties, customRates keys, migrated trials, sessions, and enrolled group courses)
  const getLinkedStudents = (allStudentsList = sortedStudents, allAssignmentsList = assignments) => {
    const teacherIds = teacherIdentifiersSet;
    if (!teacherIds || teacherIds.size === 0) return [];

    const isMatch = (val?: any): boolean => {
      if (!val) return false;
      const raw = String(val).trim();
      if (!raw) return false;
      if (teacherIds.has(raw) || teacherIds.has(raw.toLowerCase())) return true;
      const norm = normalizeArabicName(raw);
      if (norm && teacherIds.has(norm)) return true;
      const stripped = stripTeacherTitles(raw);
      if (stripped) {
        if (teacherIds.has(stripped) || teacherIds.has(stripped.toLowerCase())) return true;
        const normStripped = normalizeArabicName(stripped);
        if (normStripped && teacherIds.has(normStripped)) return true;
      }
      return false;
    };

    return allStudentsList.filter(s => {
      if (s.archived) return false;

      // 1. Direct teachers array (supporting both string IDs/usernames/names and object structures)
      const directTeachers = Array.isArray(s.teachers)
        ? s.teachers.map(t => (typeof t === 'string' ? t.trim() : (t as any)?.id || (t as any)?.name || ''))
        : [];
      if (directTeachers.some(t => isMatch(t))) return true;

      // 2. Custom rates map (where StudentManagement sets s.customRates[teacherId] or s.customRates[teacherName])
      if (s.customRates && typeof s.customRates === 'object') {
        const rateKeys = Object.keys(s.customRates);
        if (rateKeys.some(k => isMatch(k))) return true;
      }

      // 3. Alternate teacher arrays on student document
      const otherTeacherArrays = [
        (s as any).assignedTeachers,
        (s as any).teacherIds,
        (s as any).teachersList
      ];
      for (const arr of otherTeacherArrays) {
        if (Array.isArray(arr) && arr.some(item => isMatch(typeof item === 'string' ? item : item?.id || item?.name))) {
          return true;
        }
      }

      // 4. Direct property matches on student document
      const directProps = [
        s.teacherId, 
        (s as any).assignedTeacherId, 
        (s as any).teacher, 
        (s as any).assignedTeacher, 
        (s as any).teacherName
      ];
      if (directProps.some(p => isMatch(p))) return true;

      // 5. Bidirectional link from assignments collection
      const isLinkedByAssignment = allAssignmentsList.some(a => {
        if (!a || a.studentId !== s.id) return false;
        return isMatch(a.teacherId) || isMatch(a.teacherName) || isMatch(a.teacher);
      });
      if (isLinkedByAssignment) return true;

      // 6. Migrated trial lesson link (student was migrated from a trial lesson assigned to this teacher)
      const isLinkedByTrial = trialLessons.some(tl => {
        const matchesTeacher = isMatch(tl.teacherId) || isMatch(tl.teacherName);
        if (!matchesTeacher) return false;

        return (
          tl.studentId === s.id ||
          tl.migratedToStudentId === s.id ||
          (s.migratedFromTrialId && s.migratedFromTrialId === tl.id) ||
          (tl.phone && s.phone && tl.phone === s.phone && normalizeArabicName(tl.studentName || '') === normalizeArabicName(s.name || ''))
        );
      });
      if (isLinkedByTrial) return true;

      // 7. Enrolled in group course taught by this teacher
      const isLinkedByCourse = groupCourses.some(gc => {
        if (!isMatch(gc.teacherId) && !isMatch((gc as any).teacherName)) return false;
        return (
          (Array.isArray(gc.studentIds) && gc.studentIds.includes(s.id)) ||
          s.assignedCourseId === gc.id
        );
      });
      if (isLinkedByCourse) return true;

      // 8. Has recorded sessions with this teacher
      const isLinkedBySession = sessions.some(sess => {
        if (sess.studentId !== s.id) return false;
        return isMatch(sess.teacherId) || isMatch(sess.teacherName);
      });
      if (isLinkedBySession) return true;

      return false;
    });
  };

  // Helper: Get weekly calendar days
  const weekDays = useMemo(() => {
    const current = new Date();
    const index = current.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - index);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i],
        dayShortName: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'][i],
        isToday: dateStr === getLocalDateString()
      });
    }
    return days;
  }, []);

  // Helper: Sessions count this week
  const sessionsThisWeekCount = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];

    return sessions.filter(s => 
      s.teacherId === loggedInTeacher.id && 
      s.date && 
      s.date >= startStr && 
      s.date <= endStr
    ).length;
  }, [sessions, loggedInTeacher.id]);

  const getLocalMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const teacherSessions = useMemo(() => {
    return sessions.filter(s => s.teacherId === loggedInTeacher.id);
  }, [sessions, loggedInTeacher.id]);

  const teacherMonthlySessions = useMemo(() => {
    const currentPrefix = getLocalMonthString();
    return sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date && s.date.startsWith(currentPrefix));
  }, [sessions, loggedInTeacher.id]);

  const teacherMonthlyHours = useMemo(() => {
    return teacherMonthlySessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
  }, [teacherMonthlySessions]);

  const teacherMonthlyApprovedHours = useMemo(() => {
    return teacherMonthlySessions.filter(s => s.approved !== false).reduce((sum, s) => sum + (s.durationHours || 0), 0);
  }, [teacherMonthlySessions]);

  const teacherMonthlyPendingHours = useMemo(() => {
    return teacherMonthlySessions.filter(s => s.approved === false).reduce((sum, s) => sum + (s.durationHours || 0), 0);
  }, [teacherMonthlySessions]);

  const teacherMonthlyEarnings = useMemo(() => {
    const actualPayoutRate = loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35;
    return teacherMonthlySessions.reduce((sum, s) => {
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const sessionAssignment = assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id);
      const sessionPayoutRate = sessionAssignment?.teacherPayoutRate !== undefined ? sessionAssignment.teacherPayoutRate : actualPayoutRate;
      return sum + ((s.durationHours || 0) * sessionPayoutRate);
    }, 0);
  }, [teacherMonthlySessions, assignments, loggedInTeacher.id, loggedInTeacher.payoutRate, loggedInTeacher.hourlyRate]);

  const teacherFinancialDues = useMemo(() => {
    const actualPayoutRate = loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35;
    
    // 1. All sessions (including pending)
    const allSessions = sessions.filter(s => s.teacherId === loggedInTeacher.id);
    const totalEarnedAll = allSessions.reduce((sum, s) => {
      if (isTrialSession(s)) return sum; // Trial sessions do NOT add payout for teacher
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const sessionAssignment = assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id);
      const sessionPayoutRate = sessionAssignment?.teacherPayoutRate !== undefined ? sessionAssignment.teacherPayoutRate : actualPayoutRate;
      return sum + ((s.durationHours || 0) * sessionPayoutRate);
    }, 0);

    // 2. Only approved sessions
    const approvedSessions = allSessions.filter(s => s.approved !== false);
    const totalEarnedApproved = approvedSessions.reduce((sum, s) => {
      if (isTrialSession(s)) return sum; // Trial sessions do NOT add payout for teacher
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const sessionAssignment = assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id);
      const sessionPayoutRate = sessionAssignment?.teacherPayoutRate !== undefined ? sessionAssignment.teacherPayoutRate : actualPayoutRate;
      return sum + ((s.durationHours || 0) * sessionPayoutRate);
    }, 0);

    // 3. Total payments received
    const totalPaid = payments.filter(p => p.teacherId === loggedInTeacher.id).reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalEarnedAll,
      totalEarnedApproved,
      totalPaid,
      outstandingAll: totalEarnedAll - totalPaid,
      outstandingApproved: totalEarnedApproved - totalPaid
    };
  }, [sessions, payments, assignments, loggedInTeacher.id, loggedInTeacher.payoutRate, loggedInTeacher.hourlyRate]);

  const weeklyHoursData = useMemo(() => {
    const weeks = [
      { name: 'الأسبوع 1', hours: 0, earnings: 0 },
      { name: 'الأسبوع 2', hours: 0, earnings: 0 },
      { name: 'الأسبوع 3', hours: 0, earnings: 0 },
      { name: 'الأسبوع 4', hours: 0, earnings: 0 },
    ];
    
    const actualPayoutRate = loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35;

    teacherMonthlySessions.forEach(s => {
      if (!s.date) return;
      const day = new Date(s.date).getDate();
      let weekIdx = 0;
      if (day <= 7) weekIdx = 0;
      else if (day <= 14) weekIdx = 1;
      else if (day <= 21) weekIdx = 2;
      else weekIdx = 3;

      const payout = isTrialSession(s)
        ? 0
        : (s.customPayout !== undefined ? s.customPayout : ((s.durationHours || 0) * (assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id)?.teacherPayoutRate ?? actualPayoutRate)));
      
      weeks[weekIdx].hours += (s.durationHours || 0);
      weeks[weekIdx].earnings += payout;
    });

    return weeks;
  }, [teacherMonthlySessions, assignments, loggedInTeacher.id, loggedInTeacher.payoutRate, loggedInTeacher.hourlyRate]);

  const studentHoursData = useMemo(() => {
    const map: Record<string, { name: string; hours: number; earnings: number }> = {};
    const actualPayoutRate = loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35;

    teacherMonthlySessions.forEach(s => {
      const studentId = s.studentId;
      const studentName = students.find(std => std.id === studentId)?.name || 'طالب آخر';
      if (!map[studentId]) {
        map[studentId] = { name: studentName, hours: 0, earnings: 0 };
      }
      const payout = isTrialSession(s)
        ? 0
        : (s.customPayout !== undefined ? s.customPayout : ((s.durationHours || 0) * (assignments.find(a => a.studentId === s.studentId && a.teacherId === loggedInTeacher.id)?.teacherPayoutRate ?? actualPayoutRate)));
      map[studentId].hours += (s.durationHours || 0);
      map[studentId].earnings += payout;
    });

    return Object.values(map).sort((a, b) => b.hours - a.hours).slice(0, 5);
  }, [teacherMonthlySessions, students, assignments, loggedInTeacher.id, loggedInTeacher.payoutRate, loggedInTeacher.hourlyRate]);

  // Helper: Next session dynamic countdown or details
  const nextSessionInfo = useMemo(() => {
    const todayStr = getLocalDateString();
    
    const upcoming = sessions.filter(s => 
      s.teacherId === loggedInTeacher.id && 
      s.date && s.date >= todayStr &&
      s.approved === false
    );

    if (upcoming.length === 0) return null;

    upcoming.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const tA = a.startTime || '00:00';
      const tB = b.startTime || '00:00';
      return tA.localeCompare(tB);
    });

    const nextS = upcoming[0];
    const student = students.find(std => std.id === nextS.studentId);
    return {
      session: nextS,
      studentName: student?.name || "طالب مجهول",
      timeStr: nextS.startTime || 'غير محدد',
      remainingStr: nextS.date === todayStr ? `اليوم في ${nextS.startTime || 'غير محدد'}` : nextS.date
    };
  }, [sessions, students, loggedInTeacher.id]);

  // Selector: Find active group courses taught by the teacher that are nearing completion (less than 10% hours remaining)
  const activeNearingCompletionCourses = useMemo(() => {
    return groupCourses.filter(c => {
      if (c.teacherId !== loggedInTeacher.id || c.status !== 'active') return false;
      const total = Number(c.totalHours) || 0;
      if (total === 0) return false;
      const progressRatio = c.completedHours / total;
      // less than 10% remaining hours, i.e., completedHours/totalHours >= 0.9 and ongoing
      return progressRatio >= 0.9 && c.completedHours < total;
    });
  }, [groupCourses, loggedInTeacher]);

  // Effect: Trigger simulated push alert/toast on load or update
  useEffect(() => {
    if (activeNearingCompletionCourses.length > 0) {
      const untracked = activeNearingCompletionCourses.filter(c => !notifiedCourseIds.includes(c.id));
      if (untracked.length > 0) {
        const names = untracked.map(c => c.title || c.name || c.code).join('، ');
        setToastMessageText(`تنبيـه تلقائـي عاجـل: الدورات الجماعية (${names}) أوشكت على الانتهاء! الساعات المتبقية أقل من 10%. يرجى التخطيط الفوري والعمل لاستباقية المخرجات.`);
        setShowAutoAlertToast(true);
        setNotifiedCourseIds(prev => [...prev, ...untracked.map(c => c.id)]);
        
        const timer = setTimeout(() => {
          setShowAutoAlertToast(false);
        }, 12000);
        return () => clearTimeout(timer);
      }
    }
  }, [activeNearingCompletionCourses, notifiedCourseIds]);

  // Helper: Calculate real-time student balance
  const calculateStudentBalance = (studentId: string) => {
    if (!studentId) return 0;
    const student = students.find(s => s.id === studentId);
    if (!student) return 0;

    const studentSessions = sessions.filter(s => s.studentId === studentId);
    const studentCredits = credits.filter(c => c.studentId === studentId);

    const totalSpent = studentSessions.reduce((sum, s) => {
      if (s.status === 'pending' || s.status === 'booked' || s.approved === false) return sum;
      if (isTrialSession(s)) return sum; // Trial sessions do NOT deduct from student balance!
      if (s.isGroupSession || s.isGroup) {
        if (s.customFee !== undefined && s.customFee > 0) {
          return sum + s.customFee;
        }
        return sum; // Otherwise group sessions consume group hours, not money
      }
      const t = teachers.find(teacher => teacher.id === s.teacherId);
      // Hourly billing rate charged to the parent
      const rate = (student.hourlyRate ? student.hourlyRate : (student.customRates?.[s.teacherId] || (t?.billingRate || t?.hourlyRate || 0)));
      const stage = getAcademicStage(student?.grade || student?.academicLevel || (student as any)?.academicStage || '');
      const isHourly = s.pricingUnit === 'hourly' || stage === 'secondary' || stage === 'middle' || student?.sessionSystem === 'hours';
      if (isHourly) {
        return sum + ((Number(s.durationHours) || 1) * rate);
      }
      if (s.customFee !== undefined) return sum + s.customFee;
      return sum + ((Number(s.durationHours) || 1) * rate);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
    return totalToppedUp - totalSpent;
  };

  // Helper: Calculate real-time available hours based on student's hourly rate for this teacher
  const calculateStudentHours = (studentId: string) => {
    if (!studentId) return 0;
    const student = students.find(s => s.id === studentId);
    if (!student) return 0;

    const balance = calculateStudentBalance(studentId);
    const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
    if (rate <= 0) return 0;
    const hours = balance / rate;
    return hours < 0 ? 0 : hours;
  };

  // Helper to format remaining sessions count without revealing monetary balance
  const formatRemainingSessionsText = (balance: number, sessionCost: number, isOpenAccount?: boolean): string => {
    if (isOpenAccount) {
      return 'رصيد مفتوح من المدير 🔓';
    }
    if (sessionCost <= 0) {
      if (balance <= 0) return '0 حصة متبقية';
      return 'رصيد كافٍ';
    }
    const sessions = Math.floor(balance / sessionCost);
    if (sessions <= 0) {
      if (balance <= 0) return 'لا توجد حصص متبقية (0 حصة)';
      return 'أقل من حصة واحدة (0 حصة متبقية)';
    }
    if (sessions === 1) return 'تبقى حصة واحدة (1)';
    if (sessions === 2) return 'تبقى حصتان (2)';
    if (sessions >= 3 && sessions <= 10) return `تبقى ${sessions} حصص`;
    return `تبقى ${sessions} حصة`;
  };

  // Helper: calculate remaining integer sessions for a student with this teacher
  const getStudentRemainingSessions = (studentId: string): number => {
    if (!studentId) return 0;
    const student = students.find(s => s.id === studentId);
    if (!student) return 0;
    const balance = calculateStudentBalance(studentId);
    const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
    if (rate <= 0) return balance <= 0 ? 0 : 99;
    const sessions = Math.floor(balance / rate);
    return sessions < 0 ? 0 : sessions;
  };

  // Memo: Students assigned to teacher with 2 or fewer remaining sessions (متبقي 2 فقط أو أقل) - باستثناء من اختار لهم المدير رصيداً مفتوحاً
  const studentsWithLowRemainingSessions = useMemo(() => {
    const linked = getLinkedStudents();
    return linked.map(student => {
      const balance = calculateStudentBalance(student.id);
      const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
      const remainingSessions = getStudentRemainingSessions(student.id);
      const isOpenAccount = !!student.isOpenBalance;
      const isLow = !isOpenAccount && remainingSessions <= 2;

      return {
        student,
        balance,
        rate,
        remainingSessions,
        isLow,
        isOpenAccount
      };
    }).filter(item => item.isLow)
      .sort((a, b) => a.remainingSessions - b.remainingSessions);
  }, [students, sessions, credits, assignments, loggedInTeacher, sortedStudents]);

  // Memo: Students in teacher's active group courses who are close to consuming all allocated hours (remaining <= 2 hours)
  const groupStudentsNearDepletion = useMemo(() => {
    if (!loggedInTeacher?.id) return [];

    // Active group courses taught by this teacher
    const myCourses = groupCourses.filter(c =>
      c.teacherId === loggedInTeacher.id &&
      (c.status?.toLowerCase() === 'active')
    );

    const alerts: Array<{
      student: Student;
      course: GroupCourse;
      allocatedHours: number;
      consumedHours: number;
      remainingHours: number;
      percentageConsumed: number;
      alertLevel: 'exhausted' | 'critical' | 'warning';
      alertKey: string;
      parentPhone: string;
      whatsAppUrl: string;
    }> = [];

    myCourses.forEach(course => {
      const studentIds = course.studentIds || [];
      const totalCourseHours = Number(course.totalHours) || 0;
      const completedCourseHours = Number(course.completedHours) || Number(course.loggedHours) || 0;
      const allocatedMap = course.studentHoursAllocated || {};

      studentIds.forEach(sid => {
        const student = students.find(s => s.id === sid);
        if (!student) return;

        const allocated = allocatedMap[sid] !== undefined
          ? Number(allocatedMap[sid])
          : (totalCourseHours > 0 ? totalCourseHours : 10);

        // Find sessions for this student in this course
        const studentCourseSessions = sessions.filter(s =>
          s.studentId === sid &&
          (s.isGroupSession || s.isGroup) &&
          (s.groupId === course.id || s.groupCourseId === course.id || s.courseCode === course.code) &&
          s.approved !== false
        );

        const sessionConsumed = studentCourseSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
        const consumed = sessionConsumed > 0 ? sessionConsumed : completedCourseHours;
        const remaining = Math.max(0, allocated - consumed);

        // Alert condition: remaining <= 2 hours and allocated > 0
        if (remaining <= 2 && allocated > 0) {
          const percentage = Math.min(100, Math.round((consumed / allocated) * 100));
          const alertLevel: 'exhausted' | 'critical' | 'warning' =
            remaining <= 0 ? 'exhausted' : remaining <= 1 ? 'critical' : 'warning';

          const parentPhone = student.phone || (student as any).whatsappNumber || (student as any).parentPhone || '';
          const whatsAppUrl = generateParentGroupCourseDepletionWhatsAppUrl({
            teacherName: loggedInTeacher.name,
            studentName: student.name,
            courseTitle: course.title || course.name || course.code,
            remainingHours: remaining,
            allocatedHours: allocated,
            consumedHours: consumed,
            phone: parentPhone
          });

          alerts.push({
            student,
            course,
            allocatedHours: allocated,
            consumedHours: consumed,
            remainingHours: remaining,
            percentageConsumed: percentage,
            alertLevel,
            alertKey: `${course.id}_${student.id}_${remaining}`,
            parentPhone,
            whatsAppUrl
          });
        }
      });
    });

    return alerts.sort((a, b) => a.remainingHours - b.remainingHours);
  }, [groupCourses, loggedInTeacher, students, sessions]);

  // Total unified alerts count for Teacher Dashboard
  const totalAlertsCount = useMemo(() => {
    return (
      studentsWithLowRemainingSessions.length +
      groupStudentsNearDepletion.length +
      instantNotifications.filter(n => !n.seen).length +
      (hasOverdueTrials ? 1 : 0)
    );
  }, [studentsWithLowRemainingSessions.length, groupStudentsNearDepletion.length, instantNotifications, hasOverdueTrials]);

  // Effect: Auto-sync group course hours depletion alerts into Firestore teacherNotifications for persistence
  useEffect(() => {
    if (!loggedInTeacher?.id || loading || groupStudentsNearDepletion.length === 0) return;

    groupStudentsNearDepletion.forEach((alert) => {
      // Check if already notified in instantNotifications
      const alreadyNotified = instantNotifications.some(n =>
        n.type === 'group_course_hours_depleted' &&
        n.studentId === alert.student.id &&
        n.courseId === alert.course.id &&
        Math.abs((n.remainingHours ?? 99) - alert.remainingHours) < 0.5
      );

      if (!alreadyNotified) {
        notifyTeacherOnGroupCourseHoursDepletion({
          teacherId: loggedInTeacher.id,
          studentId: alert.student.id,
          studentName: alert.student.name,
          studentGrade: alert.student.grade || '',
          studentPhone: alert.parentPhone,
          courseId: alert.course.id,
          courseTitle: alert.course.title || alert.course.name || alert.course.code,
          courseCode: alert.course.code,
          allocatedHours: alert.allocatedHours,
          consumedHours: alert.consumedHours,
          remainingHours: alert.remainingHours
        });
      }
    });
  }, [groupStudentsNearDepletion, loggedInTeacher?.id, instantNotifications, loading]);

  // Effect: Auto-show alert toast on page load / teacher open if students have <= 2 sessions / hours left
  useEffect(() => {
    if (!loading && !hasShownLowSessionToast) {
      if (groupStudentsNearDepletion.length > 0 || studentsWithLowRemainingSessions.length > 0) {
        const parts = [];
        if (groupStudentsNearDepletion.length > 0) {
          const names = groupStudentsNearDepletion.slice(0, 2).map(s => `${s.student.name} (${s.course.title || s.course.name || 'دورة جماعية'})`).join('، ');
          parts.push(`لديك (${groupStudentsNearDepletion.length}) طلاب بدورات جماعية قارب رصيد ساعاتهم على الانتهاء (${names})`);
        }
        if (studentsWithLowRemainingSessions.length > 0) {
          parts.push(`(${studentsWithLowRemainingSessions.length}) طلاب بحصص فردية متبقي لهم حصتان أو أقل`);
        }
        setToastMessageText(`⚠️ تنبيه لمعلم المادة: ${parts.join(' | ')} - يرجى التواصل المبكر مع أولياء الأمور.`);
        setShowAutoAlertToast(true);
        setHasShownLowSessionToast(true);
      }
    }
  }, [loading, studentsWithLowRemainingSessions, groupStudentsNearDepletion, hasShownLowSessionToast]);

  const currentLogIssues = useMemo(() => {
    return logStudentIds.map(sid => {
      const student = students.find(s => s.id === sid);
      if (!student) return null;
      const balance = calculateStudentBalance(sid);
      const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
      const durationHours = logDurationMinutes / 60;
      const cost = isSession40Mode
        ? computed40MinStudentCost
        : (logCustomFee !== '' ? Number(logCustomFee) : (durationHours * rate));
      const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : (globalThreshold || 50);
      const isInsufficient = balance < cost;
      const isLowOrDepleting = isInsufficient || (balance - cost <= threshold) || (balance <= threshold);
      const isOpenAccount = !!student.isOpenBalance;
      // Triggers warning for teacher if balance is low/depleting AND manager did NOT activate open account option
      const hasIssue = isLowOrDepleting && !isOpenAccount;

      return {
        student,
        balance,
        rate,
        cost,
        threshold,
        isInsufficient,
        isLowOrDepleting,
        isOpenAccount,
        hasIssue,
      };
    }).filter((x): x is NonNullable<typeof x> => !!x && x.hasIssue);
  }, [logStudentIds, students, logDurationMinutes, loggedInTeacher, globalThreshold, isSession40Mode, computed40MinStudentCost]);

  // Log completed session for multiple students
  const handleLogSessionSubmit = async () => {
    if (logStudentIds.length === 0 || !logSubject) return;

    // Real-time balance check before submitting for each student
    const selectedStudentsWithIssues = logStudentIds.map(sid => {
      const student = students.find(s => s.id === sid);
      if (!student) return null;
      const balance = calculateStudentBalance(sid);
      const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
      const durationHours = logDurationMinutes / 60;
      const cost = isSession40Mode
        ? computed40MinStudentCost
        : (logCustomFee !== '' ? Number(logCustomFee) : (durationHours * rate));
      const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : (globalThreshold || 50);
      const isInsufficient = balance < cost;
      const isLowOrDepleting = isInsufficient || (balance - cost <= threshold) || (balance <= threshold);
      const isOpenAccount = !!student.isOpenBalance;
      const hasIssue = isLowOrDepleting && !isOpenAccount;
      return {
        student,
        balance,
        rate,
        cost,
        hasIssue,
      };
    }).filter((x): x is NonNullable<typeof x> => !!x && x.hasIssue);

    const hasLogInsufficientBalance = selectedStudentsWithIssues.length > 0;

    if (hasLogInsufficientBalance && !teacherBypassWarning) {
      const names = selectedStudentsWithIssues.map(i => `${i.student.name} (${formatRemainingSessionsText(i.balance, i.cost)})`).join('، ');
      alert(`⚠️ تحذير للمعلم:\nرصيد الطالب (${names}) قارب على النفاذ أو غير كافٍ، ولم يقم المدير بتفعيل خيار "الحساب المفتوح" له!\n\nيرجى تحديد إقرار "تجاوز التنبيه" للمتابعة الاستثنائية، أو مراجعة إدارة المركز لشحن حساب المحفظة.`);
      return;
    }

    setIsLogging(true);
    try {
      // Record a session for each selected student
      const durationHours = logDurationMinutes / 60;
      const promises = logStudentIds.map(async sid => {
        const studentObj = students.find(s => s.id === sid);
        const stage = getAcademicStage(studentObj?.grade || studentObj?.academicLevel || (studentObj as any)?.academicStage || '');
        const hourlyRate = getStudentDefaultHourlyRate(studentObj, settings, loggedInTeacher);
        
        // طلاب المرحلتين الثانوية والإعدادية والطلاب بنظام الساعات معتمدون حصراً وتلقائياً بنظام الساعات
        const isHourlyOnly = stage === 'secondary' || stage === 'middle' || studentObj?.preferredPricingUnit === 'hourly' || studentObj?.sessionSystem === 'hours';
        const effectiveIsSession40Mode = isHourlyOnly ? false : isSession40Mode;

        const studentCost = effectiveIsSession40Mode
          ? computed40MinStudentCost
          : (logCustomFee !== '' ? Number(logCustomFee) : (durationHours * hourlyRate));

        const teacherPayout = effectiveIsSession40Mode
          ? computed40MinTeacherPayout
          : (durationHours * (loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35));

        const sessionPayload = {
          teacherId: loggedInTeacher.id,
          studentId: sid,
          subject: logSubject || 'عام',
          topic: logTopic || '',
          notes: logNotes || '',
          durationHours: durationHours,
          date: logDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          approved: true, // Completed session is automatically approved for payroll
          teacherConfirmed: true,
          status: 'completed',
          pricingUnit: effectiveIsSession40Mode ? 'session_40' : 'hourly',
          sessionDurationMinutes: effectiveIsSession40Mode ? 40 : 60,
          customFee: studentCost,
          customPayout: teacherPayout,
          customTeacherFee: teacherPayout,
          teacherPayoutRate: effectiveIsSession40Mode ? (Number(logSession40TeacherPayout) || 25) : (loggedInTeacher.payoutRate || loggedInTeacher.hourlyRate || 35),
          ...(effectiveIsSession40Mode ? {
            sessionCount: session40UnitsCount,
            academicStage: stage,
          } : {
            sessionCount: durationHours,
            academicStage: stage,
          })
        };
        const docRef = await addDoc(collection(db, 'sessions'), sessionPayload);

        // Deduct from student's balance in Firestore for immediate consistency
        try {
          const prevBal = calculateStudentBalance(sid);
          const newBal = prevBal - studentCost;
          await updateDoc(doc(db, 'students', sid), {
            balance: newBal,
            updatedAt: new Date().toISOString()
          });
        } catch (balErr) {
          console.warn("Could not sync student balance doc directly:", balErr);
        }

        try {
          await notifyTeacherOnSessionCreate(docRef.id, sessionPayload);
        } catch (notifErr) {
          console.error("Error creating teacher notification for session:", notifErr);
        }
        return docRef;
      });

      await Promise.all(promises);

      try {
        const { logActivity } = await import('../lib/activityLogger');
        const studentsNames = logStudentIds.map(sid => students.find(s => s.id === sid)?.name || 'طالب مجهول').join('، ');
        await logActivity({
          actionType: 'ADD_SESSION',
          actionName: 'إضافة حصة دراسية جديدة',
          actor: loggedInTeacher.name,
          details: `قام المعلم (${loggedInTeacher.name}) بتسجيل حصة لـ (${studentsNames}) بمادة: "${logSubject || 'عام'}" وموضوع: "${logTopic || 'لا يوجد'}" بنظام: ${isSession40Mode ? 'حصص 40 دقيقة (سعر الطالب: ₪' + computed40MinStudentCost + ' / أجر المعلم: ₪' + computed40MinTeacherPayout + ')' : durationHours + ' ساعة'} بتاريخ: ${logDate}`
        });
      } catch (err) {
        console.error("Error logging activity in log session:", err);
      }

      // Capture details before resetting form state
      const loggedStudentNames = logStudentIds.map(sid => students.find(s => s.id === sid)?.name || 'طالب مجهول');
      const recordedSubject = logSubject || 'عام';
      const recordedTopic = logTopic || '';
      const recordedDate = logDate || getLocalDateString();
      const recordedDurationMinutes = logDurationMinutes;
      const count = logStudentIds.length;

      // Calculate real-time updated balance and remaining sessions for each student post-registration
      const studentsBalanceDetails = logStudentIds.map(sid => {
        const student = students.find(s => s.id === sid);
        const studentName = student?.name || 'طالب مجهول';
        const isOpenBalance = !!student?.isOpenBalance;
        
        // Rate & session cost
        const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
        const sessionCost = isSession40Mode
          ? computed40MinStudentCost
          : (logCustomFee !== '' ? Number(logCustomFee) : (durationHours * rate));
        
        const prevBalance = calculateStudentBalance(sid);
        const newBalance = prevBalance - sessionCost;
        const remainingSessions = isSession40Mode
          ? ((Number(logSession40StudentRate) || 40) > 0 ? Math.max(0, Math.floor(newBalance / (Number(logSession40StudentRate) || 40))) : 0)
          : (rate > 0 ? Math.max(0, Math.floor(newBalance / rate)) : (newBalance <= 0 ? 0 : 99));

        return {
          studentId: sid,
          studentName,
          isOpenBalance,
          prevBalance,
          newBalance,
          remainingSessions,
          rate
        };
      });

      // Construct clear Arabic notification message displaying remaining sessions if account is not open
      const statusSnippets = studentsBalanceDetails.map(item => {
        if (item.isOpenBalance) {
          return `${item.studentName}: حساب معتمد (دفع لاحق) ♾️`;
        }
        const remText = item.remainingSessions === 0
          ? 'نفد رصيد الحصص بالكامل (0 حصة متبقية)'
          : item.remainingSessions === 1
          ? 'متبقي حصة واحدة فقط (1)'
          : item.remainingSessions === 2
          ? 'متبقي حصتان (2)'
          : `متبقي ${item.remainingSessions} حصص`;
        return `${item.studentName}: ${remText}`;
      });

      const fullToastMessage = isSession40Mode
        ? `🎉 تم تسجيل الحصة بنجاح بنظام 40 دقيقة!\nتم رصد وتوثيق الحصة وتحديث رصيد الحصص في السجل الأكاديمي\n${statusSnippets.join(' | ')}`
        : `🎉 تم تسجيل الحصة بنجاح!\n${statusSnippets.join(' | ')}`;

      // Notify teacher: Play soft chime and show prominent success toast and modal
      playSuccessChime();
      triggerToast(fullToastMessage);

      setSessionSuccessInfo({
        isOpen: true,
        title: 'تم تسجيل ورصد الحصة بنجاح! 🌟',
        subject: recordedSubject,
        topic: recordedTopic,
        studentsCount: count,
        studentsNames: loggedStudentNames,
        studentsBalanceDetails,
        durationMinutes: recordedDurationMinutes,
        date: recordedDate,
        isGroup: false,
        pricingUnit: isSession40Mode ? 'session_40' : 'hourly',
        studentFee: isSession40Mode ? computed40MinStudentCost : (logCustomFee !== '' ? Number(logCustomFee) : null),
        teacherPayout: isSession40Mode ? computed40MinTeacherPayout : null,
        sessionCount: isSession40Mode ? session40UnitsCount : null,
      });

      setLastLoggedSessionSummary({
        subject: recordedSubject,
        topic: recordedTopic,
        durationMinutes: recordedDurationMinutes,
        studentsCount: count,
        studentsNames: loggedStudentNames,
        isSession40Mode,
        studentFee: computed40MinStudentCost,
        teacherPayout: computed40MinTeacherPayout,
        sessionCount: session40UnitsCount,
      });

      setLogSuccess(true);
      setIsLogSessionModalOpen(false);
      // Keep subject, but reset selected students and reset duration
      setLogStudentIds([]);
      setLogTopic('');
      setLogNotes('');
      setLogDurationMinutes(isSession40Mode ? 40 : 60);
      setLogDate(getLocalDateString());
      setLogCustomFee('');
      setTeacherBypassWarning(false);
      fetchMainData(); // Refresh history
      setTimeout(() => setLogSuccess(false), 7000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
      setIsLogging(false);
    }
  };

  // Log completed group session
  const handleLogGroupSessionSubmit = async () => {
    if (!logGroupCourseId) return;
    const course = groupCourses.find(c => c.id === logGroupCourseId);
    if (!course) return;
    if (course.studentIds.length === 0) {
      alert("يرجى مراجعة إدارة المنصة لإضافة طلاب لهذه الدورة الجماعية أولاً لتتمكن من تسجيل الحصة.");
      return;
    }

    setIsGroupLogging(true);
    setGroupLogError('');
    try {
      // Calculate individual costs based on durations
      let calculatedStudentFee = 0;
      const studentRate = Number(course.studentRate) || 0;
      const totalHours = Number(course.totalHours) || Number(course.completedHours) || 0;

      if (course.studentBillingType === 'total') {
        calculatedStudentFee = totalHours > 0 ? (groupLogDuration / totalHours) * studentRate : 0;
      } else if (course.studentBillingType === 'per_hour') {
        calculatedStudentFee = groupLogDuration * studentRate;
      } else {
        calculatedStudentFee = studentRate;
      }

      let calculatedTeacherPayout = 0;
      const teacherRate = Number(course.teacherRate) || 0;

      if (course.teacherPayoutType === 'total') {
        calculatedTeacherPayout = totalHours > 0 ? (groupLogDuration / totalHours) * teacherRate : 0;
      } else if (course.teacherPayoutType === 'per_hour') {
        calculatedTeacherPayout = groupLogDuration * teacherRate;
      } else {
        calculatedTeacherPayout = teacherRate;
      }

      // Add dual-calc session objects
      for (let i = 0; i < course.studentIds.length; i++) {
        const studentId = course.studentIds[i];
        const groupSessionPayload = {
          teacherId: loggedInTeacher.id,
          studentId: studentId,
          subject: course.subject || course.title || 'حصة جماعية',
          topic: groupLogTopic || '',
          durationHours: groupLogDuration,
          date: groupLogDate || new Date().toISOString().split('T')[0],
          isGroup: true,
          groupCourseId: course.id,
          isGroupSession: true,
          groupId: course.id,
          courseCode: course.code || '',
          customFee: Math.round((calculatedStudentFee || 0) * 100) / 100,
          customPayout: i === 0 ? (Math.round((calculatedTeacherPayout || 0) * 100) / 100) : 0, // Recorded only once to avoid duplication
          note: groupLogNote || `حصة جماعية: ${course.name || course.title || ''}`,
          createdAt: new Date().toISOString(),
          approved: true
        };
        const docRef = await addDoc(collection(db, 'sessions'), groupSessionPayload);
        try {
          await notifyTeacherOnSessionCreate(docRef.id, groupSessionPayload);
        } catch (notifErr) {
          console.error("Error creating group session teacher notification:", notifErr);
        }
      }

      // Update loggedHours and completedHours on course
      const nextLoggedHours = (course.loggedHours || 0) + groupLogDuration;
      await updateDoc(doc(db, 'groupCourses', course.id), {
        loggedHours: nextLoggedHours,
        completedHours: nextLoggedHours
      });

      // Check and notify teacher if any student in this group course is nearing hours depletion
      for (const sid of course.studentIds) {
        const student = students.find(s => s.id === sid);
        const allocated = course.studentHoursAllocated?.[sid] !== undefined 
          ? Number(course.studentHoursAllocated[sid]) 
          : (totalHours > 0 ? totalHours : 10);

        const prevSessions = sessions.filter(s =>
          s.studentId === sid &&
          (s.isGroupSession || s.isGroup) &&
          (s.groupId === course.id || s.groupCourseId === course.id || s.courseCode === course.code) &&
          s.approved !== false
        );

        const newConsumed = prevSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0) + groupLogDuration;
        const newRemaining = Math.max(0, allocated - newConsumed);

        if (newRemaining <= 2 && allocated > 0) {
          notifyTeacherOnGroupCourseHoursDepletion({
            teacherId: loggedInTeacher.id,
            studentId: sid,
            studentName: student?.name || 'طالب',
            studentGrade: student?.grade || '',
            studentPhone: student?.phone || (student as any)?.whatsappNumber || (student as any)?.parentPhone || '',
            courseId: course.id,
            courseTitle: course.title || course.name || course.code,
            courseCode: course.code,
            allocatedHours: allocated,
            consumedHours: newConsumed,
            remainingHours: newRemaining
          }).catch(err => console.error("Error triggering group course depletion notification:", err));
        }
      }

      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'ADD_SESSION',
          actionName: 'إضافة حصة دراسية جديدة',
          actor: loggedInTeacher.name,
          details: `قام المعلم (${loggedInTeacher.name}) بتسجيل حصة دورة جماعية لمساق "${course.name || course.title || 'دورة جماعية'}" بموضوع: "${groupLogTopic || 'لا يوجد'}" ومدتها: ${groupLogDuration} ساعة للطلاب المسجلين بالدورة.`
        });
      } catch (err) {
        console.error("Error logging group session activity:", err);
      }

      const courseTitle = course.name || course.title || 'دورة جماعية';
      const courseStudents = course.studentIds.map(sid => students.find(s => s.id === sid)?.name || 'طالب');

      // Play soft chime and notify teacher
      playSuccessChime();
      triggerToast(`🎉 تم تسجيل حصة الدورة الجماعية (${courseTitle}) بنجاح! 🌟`);

      setSessionSuccessInfo({
        isOpen: true,
        title: 'تم تسجيل حصة الدورة الجماعية بنجاح! 🌟',
        subject: course.subject || courseTitle,
        topic: groupLogTopic || '',
        studentsCount: course.studentIds.length,
        studentsNames: courseStudents,
        durationMinutes: Math.round(groupLogDuration * 60),
        date: groupLogDate || getLocalDateString(),
        isGroup: true,
        groupCourseName: courseTitle
      });

      setGroupLogSuccess(true);
      fetchMainData();
      setGroupLogNote('');
      setGroupLogTopic('');
      setTimeout(() => setGroupLogSuccess(false), 7000);
    } catch (error) {
      console.error("Group logging error: ", error);
      setGroupLogError(error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء تسجيل الدورة الجماعية");
    } finally {
      setIsGroupLogging(false);
    }
  };

  // Book next appointment (Balance Contingent!)
  const handleBookSessionSubmit = async () => {
    setBookError('');
    if (!bookStudentId || !bookSubject) return;
    const selectedStudent = students.find(s => s.id === bookStudentId);

    // 1. Calculate student balance in real-time
    const currentBalance = calculateStudentBalance(bookStudentId);
    
    // Check if balance is low or negative, unless open balance option is enabled
    if (currentBalance <= 0 && !selectedStudent?.isOpenBalance) {
      setBookError(`عذراً! لا يمكننا إتمام الجدولة لعدم توفر رصيد كافٍ في محفظة الطالب ${selectedStudent?.name || ''} حالياً. يرجى مراجعة إدارة المركز لإتاحة تسجيل الحصة.`);
      return;
    }

    setIsBooking(true);
    try {
      const bookPayload = {
        teacherId: loggedInTeacher.id,
        studentId: bookStudentId,
        subject: bookSubject || 'عام',
        topic: bookTopic || '',
        durationHours: bookDuration,
        date: bookDate || new Date().toISOString().split('T')[0],
        startTime: bookStartTime || '',
        createdAt: new Date().toISOString(),
        teacherConfirmed: true,
        approved: true,
        status: 'completed',
        ...(bookCustomFee !== '' ? { customFee: Number(bookCustomFee) } : {})
      };
      const docRef = await addDoc(collection(db, 'sessions'), bookPayload);
      try {
        await notifyTeacherOnSessionCreate(docRef.id, bookPayload);
      } catch (notifErr) {
        console.error("Error creating booked session teacher notification:", notifErr);
      }

      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'ADD_SESSION',
          actionName: 'إضافة حصة دراسية جديدة',
          actor: loggedInTeacher.name,
          details: `قام المعلم (${loggedInTeacher.name}) بحجز وجدولة حصة جديدة للطالب "${selectedStudent?.name || 'مجهول'}" بمادة: "${bookSubject || 'عام'}" وموضوع: "${bookTopic || 'لا يوجد'}" ومدتها: ${bookDuration} ساعة بتاريخ: ${bookDate}`
        });
      } catch (err) {
        console.error("Error logging booked session activity:", err);
      }

      // Calculate updated balance and remaining sessions for booked student
      const isStudentOpenBalance = !!selectedStudent?.isOpenBalance;
      const studentRate = getStudentDefaultHourlyRate(selectedStudent, settings, loggedInTeacher);
      const bookSessionCost = bookCustomFee !== '' ? Number(bookCustomFee) : (bookDuration * studentRate);
      const studentPrevBalance = calculateStudentBalance(bookStudentId);
      const studentNewBalance = studentPrevBalance - bookSessionCost;
      const studentRemainingSessions = studentRate > 0 ? Math.max(0, Math.floor(studentNewBalance / studentRate)) : (studentNewBalance <= 0 ? 0 : 99);

      let bookToastMsg = `🎉 تم حجز وجدولة الحصة للطالب (${selectedStudent?.name || ''}) بنجاح! 🌟`;
      if (!isStudentOpenBalance) {
        const remText = studentRemainingSessions === 0 
          ? 'نفد الرصيد بالكامل (0 حصة متبقية)' 
          : studentRemainingSessions === 1 
          ? 'متبقي حصة واحدة (1)' 
          : studentRemainingSessions === 2 
          ? 'متبقي حصتان (2)' 
          : `متبقي ${studentRemainingSessions} حصص`;
        bookToastMsg = `🎉 تم حجز الحصة بنجاح للطالب (${selectedStudent?.name || ''}) | ${remText} 🌟`;
      }

      playSuccessChime();
      triggerToast(bookToastMsg);

      setSessionSuccessInfo({
        isOpen: true,
        title: 'تم حجز وجدولة الحصة بنجاح! 📅',
        subject: bookSubject || 'عام',
        topic: bookTopic || '',
        studentsCount: 1,
        studentsNames: [selectedStudent?.name || 'طالب'],
        studentsBalanceDetails: [{
          studentId: bookStudentId,
          studentName: selectedStudent?.name || 'طالب',
          isOpenBalance: isStudentOpenBalance,
          prevBalance: studentPrevBalance,
          newBalance: studentNewBalance,
          remainingSessions: studentRemainingSessions,
          rate: studentRate
        }],
        durationMinutes: Math.round(bookDuration * 60),
        date: bookDate || getLocalDateString(),
        isGroup: false
      });

      setBookSuccess(true);
      setBookCustomFee('');
      setBookTopic('');
      fetchMainData();
      setTimeout(() => setBookSuccess(false), 7000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
      setIsBooking(false);
    }
  };

  // Link unlinked student directly to logged-in teacher's roster
  const handleLinkStudent = async (studentId: string) => {
    if (!studentId) return;
    setIsLinking(true);
    setLinkSuccess(false);
    setBookError('');
    try {
      await updateDoc(doc(db, 'students', studentId), {
        teachers: arrayUnion(loggedInTeacher.id)
      });
      setLinkSuccess(true);
      await fetchMainData();
      setTimeout(() => setLinkSuccess(false), 5000);
    } catch (error) {
      console.error("Error linking student:", error);
      setBookError("عذراً، واجهنا مشكلة أثناء تحديث الرابط. يرجى التحقق من اتصالك والمحاولة مجدداً.");
    } finally {
      setIsLinking(false);
    }
  };

  // Save private student notes
  const handleSaveStudentNotes = async (studentId: string, text: string) => {
    if (!studentId) return;
    setIsSavingNotes(true);
    try {
      const noteId = `${loggedInTeacher.id}_${studentId}`;
      const docRef = doc(db, 'teacherStudentNotes', noteId);
      await setDoc(docRef, {
        id: noteId,
        teacherId: loggedInTeacher.id,
        studentId,
        notesText: text,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setStudentNotes(prev => ({
        ...prev,
        [studentId]: text
      }));
      triggerToast('تم حفظ ملاحظات الطالب الخاصة بنجاح! 💾');
    } catch (err) {
      console.error("Error saving student private notes:", err);
      triggerToast('حدث خطأ أثناء حفظ ملاحظات الطالب.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Fast activation and upgrade for testing/evaluation
  const handleActivateAIService = async () => {
    try {
      setIsGenerating(true);
      await setDoc(doc(db, 'settings', 'global'), { academicAIEnabled: true }, { merge: true });
      setAcademicAIEnabled(true);
      setAiError('');
    } catch (err) {
      console.error(err);
      setAiError('فشل تنشيط الخدمة. يرجى التحقق من اتصالك بالإنترنت.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit question/command to the Floating AI Assistant
  const handleFloatingAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt) return;

    // Append user message
    const updatedMessages = [...aiMessages, { sender: 'user' as const, text: prompt }];
    setAiMessages(updatedMessages);
    setAiInput('');
    setIsSendingAi(true);

    try {
      // Create student context for precise recommendations
      const ctxText = getLinkedStudents().map(s => {
        const lastSession = sessions.find(sess => sess.studentId === s.id && sess.teacherId === loggedInTeacher.id);
        const lastSessionText = lastSession ? `آخر حصة كانت بتاريخ ${lastSession.date} بموضوع ${lastSession.subject || 'متابعة'}` : 'لا توجد حصص مسجلة معه مؤخراً';
        return `طالب: ${s.name} في الصف/المستوى: ${s.grade || s.academicLevel || 'غير محدد'} (${lastSessionText})`;
      }).join('\n');

      const response = await fetch('/api/teacher/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: prompt,
          studentsContext: ctxText,
          teacherName: loggedInTeacher.name
        })
      });

      const data = await response.json();
      if (data.reply) {
        setAiMessages(prev => [...prev, { sender: 'assistant' as const, text: data.reply }]);
      } else {
        setAiMessages(prev => [...prev, { sender: 'assistant' as const, text: data.error || 'عذرًا، حدث خطأ أثناء الاتصال بالمساعد الذكي بالخادم.' }]);
      }
    } catch (error: any) {
      console.error("Floating AI Submit Error:", error);
      setAiMessages(prev => [...prev, { sender: 'assistant' as const, text: 'عذراً، حدث خطأ في الشبكة أو في جدار الحماية للاتصال بالذكاء الاصطناعي.' }]);
    } finally {
      setIsSendingAi(false);
    }
  };

  // Handler when teacher selects/changes the AI curriculum subject
  // When Chemistry is chosen -> adopts WebSchool Chemistry sources (https://www.vebschoolchemistry.com/)
  // When Physics is chosen -> adopts Physics sources (PhET Simulations: https://phet.colorado.edu/)
  // When Biology is chosen -> adopts Biology sources (https://www.bioteach.org.il/)
  // When Mathematics is chosen -> adopts Bagrut Math models (https://meyda.education.gov.il/sheeloney_bagrut/)
  const handleSelectAiSubject = (newSub: string) => {
    setAiSubject(newSub);
    const sLower = (newSub || '').toLowerCase();

    if (sLower.includes('كيمياء') || sLower.includes('chem')) {
      setAiSourceType('website');
      setAiSourceValue('https://www.vebschoolchemistry.com/');
      setCalendarToast('تم اعتماد مصادر مدرسة ويب للكيمياء (VebSchool Chemistry) المعتمدة 🧪');
      setTimeout(() => setCalendarToast(null), 3000);
      if (!aiTopics || aiTopics.includes('نيوتن') || aiTopics.includes('خلوي') || aiTopics.includes('تفاضل')) {
        setAiTopics('الاتزان وسرعة التفاعل ومبدأ لوشاتيليه، والحسابات الكيميائية والمول (نماذج بجروت 037381 و 037387)');
      }
    } else if (sLower.includes('فيزياء') || sLower.includes('physic')) {
      setAiSourceType('website');
      setAiSourceValue('https://phet.colorado.edu/ar_SA/simulations/filter?subjects=physics');
      setCalendarToast('تم اعتماد مصادر وبوابة الفيزياء ومحاكاة PhET التفاعلية وبنك أسئلة البجروت ⚡');
      setTimeout(() => setCalendarToast(null), 3000);
      if (!aiTopics || aiTopics.includes('كيمياء') || aiTopics.includes('لوشاتيليه') || aiTopics.includes('خلوي') || aiTopics.includes('تفاضل')) {
        setAiTopics('قوانين نيوتن في الميكانيكا، حركة المقذوفات ومتجهات القوى، مع تجارب محاكاة ونماذج بجروت 036361');
      }
    } else if (sLower.includes('بيولوج') || sLower.includes('أحياء') || sLower.includes('bio')) {
      setAiSourceType('website');
      setAiSourceValue('https://www.bioteach.org.il/');
      setCalendarToast('تم اعتماد مصادر وأطلس البيولوجيا وعلم الأحياء والوراثة المعتمدة 🌿');
      setTimeout(() => setCalendarToast(null), 3000);
      if (!aiTopics || aiTopics.includes('كيمياء') || aiTopics.includes('نيوتن') || aiTopics.includes('تفاضل')) {
        setAiTopics('الغشاء الخلوي، النقل النشط، والتمثيل الضوئي والتنفس الخلوي، وتجارب الوراثة وقوانين مندل (نماذج بجروت 043381)');
      }
    } else if (sLower.includes('رياضيات') || sLower.includes('math')) {
      setAiSourceType('website');
      setAiSourceValue('https://meyda.education.gov.il/sheeloney_bagrut/');
      setCalendarToast('تم اعتماد نماذج وبنك أسئلة بجروت الرياضيات الرسمية (3، 4، 5 وحدات) 📐');
      setTimeout(() => setCalendarToast(null), 3000);
      if (!aiTopics || aiTopics.includes('كيمياء') || aiTopics.includes('نيوتن') || aiTopics.includes('خلوي')) {
        setAiTopics('حساب التفاضل والتكامل، تحليل الدوال المثلثية والجذرية والمماسات، والمتتاليات الحسابية والهندسية (نماذج 804 / 805 / 806)');
      }
    }
  };

  // Generate lesson guide via server-side Gemini endpoint
  const handleGenerateAiLesson = async () => {
    setAiError('');
    setAiResult('');
    setAiEvalRating(null);
    setAiEvalFeedbackText('');
    setAiEvalSubmitted(false);
    setAiEvalError('');

    const missingFields: string[] = [];
    if (!aiTopics || !aiTopics.trim()) missingFields.push('تحديد مواضيع الشرح والجوانب الرئيسية');
    if (!aiSubject) missingFields.push('اختيار المادة الدراسية');
    if (!aiGrade) missingFields.push('اختيار الفئة / الصف الدراسي المستهدف');

    if (missingFields.length > 0) {
      setAiError(`يرجى استكمال الحقول التالية أولاً لتفعيل محرك التوليد الفوري: ${missingFields.join('، ')}.`);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/teacher/lesson-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topics: aiTopics,
          subject: aiSubject,
          grade: aiGrade,
          fileType: aiFileType,
          isWorksheet: aiIsWorksheet,
          questionTypes: aiQuestionTypes,
          worksheetLevel: aiWorksheetLevel,
          questionCounts: aiQuestionCounts,
          sourceType: aiSourceType,
          sourceValue: aiSourceValue,
          aiProvider: aiProvider,
          aiModel: aiModel
        })
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON model response received from lesson-builder:", responseText);
        if (responseText && (responseText.includes("Starting Server") || responseText.includes("<!doctype html>"))) {
          throw new Error("الخادم قيد الإقلاع والتهيئة حالياً، يرجى إعادة المحاولة بعد بضع ثوانٍ.");
        }
        let errMsg = "عذراً، حدث خطأ في اتصال النظام أو انتهت مهلة معالجة الطلب في السيرفر الذكي.";
        if (response.status === 504) {
          errMsg = "انتهت مهلة خادم المعالجة الذكية (504 Gateway Timeout). يرجى تقليل حجم المدخلات أو المحاولة مجدداً.";
        } else if (response.status === 503) {
          errMsg = "خادم التوليد غير متوفر حالياً (503 Service Unavailable). يرجى المحاولة مرة أخرى بعد قليل.";
        } else if (response.status === 404) {
          errMsg = "لم يتم العثور على عنوان الـ API المطلوب (404 Not Found)؛ يرجى مراجعة صلاحيات وجودة الخادم.";
        } else if (response.status === 413) {
          errMsg = "حجم البيانات المرسلة كبير جداً بالنسبة للخادم (413 Payload Too Large).";
        }
        throw new Error(`${errMsg} (رمز الاستجابة: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'فشل التوليد من الخادم.');
      }

      if (data.providerBadge) {
        setAiGeneratedEngineBadge(data.providerBadge);
      } else if (data.aiProvider === 'openai') {
        setAiGeneratedEngineBadge(`ChatGPT (${data.aiModel || aiModel}) عبر OpenAI API المباشر 🤖`);
      }

      const generatedContent = typeof data.data === 'string'
        ? data.data
        : (data.raw || (data.data && data.data.markdownContent) || data.result || data.content || '');

      setAiResult(generatedContent);
    } catch (err) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : 'خطأ غير متوقع أثناء الاتصال بالخادم.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save AI Quality Evaluation / Thumbs Up/Down & Feedback Notes to Firestore
  const handleSaveAiEvaluation = async () => {
    if (!aiEvalRating) {
      setAiEvalError('الرجاء اختيار تقييم قبل الحفظ.');
      return;
    }
    setAiEvalIsSubmitting(true);
    setAiEvalError('');
    const path = 'aiEvaluations';
    try {
      const evaluationData = {
        teacherId: loggedInTeacher.id,
        teacherName: loggedInTeacher.name,
        rating: aiEvalRating,
        feedback: aiEvalFeedbackText.trim(),
        topic: aiTopics,
        subject: aiSubject,
        grade: aiGrade,
        fileType: aiFileType,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, path), evaluationData);
      setAiEvalSubmitted(true);
    } catch (error) {
      console.error("Error saving AI evaluation:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (formattedErr) {
        setAiEvalError(formattedErr instanceof Error ? formattedErr.message : String(formattedErr));
      }
    } finally {
      setAiEvalIsSubmitting(false);
    }
  };

  // Save educational resource to Firestore repository
  const handleSaveResourceToRepo = async () => {
    if (!resourceSaveTitle.trim()) {
      setCalendarToast("الرجاء تحديد عنوان للمصدر ⚠️");
      setTimeout(() => setCalendarToast(null), 3000);
      return;
    }

    setEduLoading(true);
    try {
      const newResource = {
        title: resourceSaveTitle.trim(),
        subject: aiSubject || 'أخرى',
        grade: aiGrade || 'غير محدد',
        content: aiResult,
        tags: resourceSaveTags,
        teacherId: loggedInTeacher.id,
        teacherName: loggedInTeacher.name,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'educational_resources'), newResource);
      const savedRes = { id: docRef.id, ...newResource };
      setEduResources(prev => [savedRes, ...prev]);
      setShowSaveResourceModal(false);
      
      setCalendarToast("تم حفظ المصدر التعليمي وتصنيفه بنجاح! 📂🏷️");
      setTimeout(() => setCalendarToast(null), 4000);
    } catch (err) {
      console.error("Error saving resource to repository:", err);
      setCalendarToast("عذراً، فشل في حفظ المصدر التعليمي. ❌");
      setTimeout(() => setCalendarToast(null), 4000);
    } finally {
      setEduLoading(false);
    }
  };

  // Delete educational resource from Firestore repository
  const handleDeleteResource = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا المصدر التعليمي نهائياً من مستودع المصادر؟ ⚠️")) {
      return;
    }
    
    setEduLoading(true);
    try {
      await deleteDoc(doc(db, 'educational_resources', id));
      setEduResources(prev => prev.filter(r => r.id !== id));
      if (selectedResourceToView?.id === id) {
        setSelectedResourceToView(null);
      }
      setCalendarToast("تم حذف المصدر بنجاح من المستودع. 🗑️");
      setTimeout(() => setCalendarToast(null), 3500);
    } catch (err) {
      console.error("Error deleting resource:", err);
      setCalendarToast("فشل حذف المصدر من قاعدة البيانات ❌");
      setTimeout(() => setCalendarToast(null), 3500);
    } finally {
      setEduLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult)
      .then(() => {
        setCalendarToast("تم نسخ النص بنجاح إلى الحافظة! 📋");
        setTimeout(() => setCalendarToast(null), 3000);
      })
      .catch((err) => {
        console.warn("Modern clipboard write failed, trying fallback:", err);
        try {
          const textarea = document.createElement("textarea");
          textarea.value = aiResult;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (successful) {
            setCalendarToast("تم نسخ النص بنجاح إلى الحافظة! 📋");
            setTimeout(() => setCalendarToast(null), 3000);
          } else {
            console.error("Fallback copy execution unsuccessful.");
          }
        } catch (fallbackErr) {
          console.error("Fallback copy failed completely:", fallbackErr);
        }
      });
  };

  const downloadAsDoc = () => {
    if (!aiResult) return;
    
    const formattedDate = formatCustomDate(new Date());
    const titleText = aiIsWorksheet ? 'ورقة عمل وتقييم مهارات' : 'اختبار وتقييم تحصيلي بالذكاء الاصطناعي';

    const htmlDocContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${titleText}</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;
      font-size: 14pt;
      line-height: 1.4;
      color: #1e293b;
      margin: 40px;
    }
    sub, sup {
      font-size: 75%;
      line-height: 0;
      position: relative;
      vertical-align: baseline;
    }
    sub {
      bottom: -0.25em;
    }
    sup {
      top: -0.5em;
    }
  </style>
</head>
<body style="font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif; font-size: 14pt; direction: rtl; text-align: right;">
  <div style="border: 3px double #1e293b; padding: 20px; margin-bottom: 25px; border-radius: 12px; direction: rtl; text-align: right;">
    <h2 style="font-size: 20pt; font-weight: bold; color: #1a365d; margin: 0 0 10px 0; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;">أكاديمية التفوق أونلاين &nbsp;&nbsp;|&nbsp;&nbsp; التواصل 0509329568</h2>
    <p style="font-size: 12pt; color: #64748b; margin: 0 0 15px 0; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;">
      المدرس: ${loggedInTeacher.name} | المادة: ${aiSubject || 'عام'} | الصف: ${aiGrade || 'عام'}
    </p>
    <h2 style="font-size: 22pt; font-weight: bold; color: #b45309; text-align: center; margin: 15px 0; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;">${titleText}</h2>
    <table style="width: 100%; font-size: 12pt; background: #f8fafc; border-collapse: collapse; margin-top: 15px; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px dotted #94a3b8; font-weight: bold; text-align: right; direction: rtl;">اسم الطالب: __________________</td>
        <td style="padding: 8px; border-bottom: 1px dotted #94a3b8; font-weight: bold; text-align: center; direction: rtl;">التاريخ: ${formattedDate}</td>
        <td style="padding: 8px; border-bottom: 1px dotted #94a3b8; font-weight: bold; text-align: left; direction: rtl;">الدرجة الكلية: _____</td>
      </tr>
    </table>
  </div>
  <div style="direction: rtl; text-align: right; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif; font-size: 14pt;">
    ${generateCleanHtmlBody(aiResult)}
  </div>
  <p style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11pt; text-align: center; color: #94a3b8; font-weight: bold; font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;">
    تمنياتنا لجميع طلبة أكاديمية التفوق بمسيرة عامرة بالتفوق والتميز المستمر ✨ <br/>
    مدير المنصة أ.زكي أبو علان
  </p>
</body>
</html>`;

    // Download formatted .doc using HTML-based rich document content
    const blob = new Blob([htmlDocContent], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${aiSubject || 'academic'}_${aiGrade || 'grade'}_sheet.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsHtml = () => {
    if (!aiResult) return;
    
    const formattedDate = formatCustomDate(new Date());
    const titleText = aiIsWorksheet ? 'ورقة عمل وتقييم مهارات' : 'اختبار وتقييم تحصيلي بالذكاء الاصطناعي';
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${titleText} - ${aiSubject} - ${aiGrade}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    body {
      font-family: 'Calibri', 'Arial', 'Times New Roman', 'Cairo', sans-serif;
      font-size: 14pt !important;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      direction: rtl;
      background: #fff;
    }
    sub, sup {
      font-size: 75%;
      line-height: 0;
      position: relative;
      vertical-align: baseline;
    }
    sub {
      bottom: -0.25em;
    }
    sup {
      top: -0.5em;
    }
    .sheet-header {
      border: 3px double #1e293b;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 12px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .academy-title {
      font-size: 20px;
      font-weight: 900;
      color: #1a365d;
    }
    .sheet-title {
      font-size: 22px;
      font-weight: 900;
      color: #b45309;
      text-align: center;
      margin: 10px 0;
    }
    .student-info-grid {
      display: grid;
      grid-template-cols: 2fr 1fr 1fr;
      gap: 15px;
      font-size: 13px;
      font-weight: bold;
      color: #334155;
      background: #f8fafc;
      padding: 10px 15px;
      border-radius: 8px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-line {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      height: 18px;
    }
    .content-area {
      font-size: 14pt !important;
      font-family: 'Calibri', 'Arial', 'Times New Roman', 'Cairo', sans-serif;
    }
    h1, h2, h3, h4 {
      color: #1a365d;
    }
    h2 {
      border-right: 5px solid #b45309;
      padding-right: 10px;
      margin-top: 30px;
      font-size: 18px;
      font-weight: 950;
    }
    h3 {
      font-size: 16px;
      margin-top: 20px;
      color: #27272a;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 5px;
    }
    ul, ol {
      padding-right: 20px;
    }
    li {
      margin-bottom: 10px;
      font-size: 14pt !important;
    }
    p {
      font-size: 14pt !important;
      margin-bottom: 12px;
    }
    .no-print-bar {
      background: #f1f5f9;
      padding: 15px 25px;
      border-radius: 12px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
    }
    .btn {
      background: #1a365d;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn:hover {
      background: #2563eb;
    }
    .btn-gold {
      background: #b45309;
      color: white;
    }
    .btn-gold:hover {
      background: #9a3412;
    }
    @media print {
      .no-print-bar {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div style="font-weight: bold; font-size: 14px; color: #1e293b; font-family: sans-serif;">
      ✨ مستند جاهز للتحميل والطباعة كـ PDF (اضغط طباعة ثم اختر الحفظ بصيغة PDF)
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ طباعة أو تحميل PDF</button>
      <button class="btn" onclick="window.close()">إغلاق الصفحة</button>
    </div>
  </div>

  <div class="sheet-header">
    <div class="header-top">
      <div class="academy-title">أكاديمية التفوق أونلاين - التواصل 0509329568</div>
      <div style="text-align: left; font-size: 12px; color: #64748b; font-weight: bold;">
        المدرس: ${loggedInTeacher.name}<br>
        المادة: ${aiSubject || 'عام'}<br>
        الصف: ${aiGrade || 'عام'}
      </div>
    </div>
    
    <div class="sheet-title">
      ${titleText}
    </div>
    
    <div class="student-info-grid">
      <div class="info-item">اسم الطالب الكلي: <span class="info-line"></span></div>
      <div class="info-item">التاريخ: <span class="info-line">${formattedDate}</span></div>
      <div class="info-item">الدرجة الكلية: <span class="info-line"></span></div>
    </div>
  </div>

  <div class="content-area">
    ${aiResult
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return '<h3>' + formatToScientificHtml(trimmed.replace('### ', '')) + '</h3>';
        } else if (trimmed.startsWith('## ')) {
          return '<h2>' + formatToScientificHtml(trimmed.replace('## ', '')) + '</h2>';
        } else if (trimmed.startsWith('# ')) {
          return '<h1>' + formatToScientificHtml(trimmed.replace('# ', '')) + '</h1>';
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return '<ul><li>' + formatToScientificHtml(trimmed.replace(/^[\s-*]+/, '')) + '</li></ul>';
        } else if (/^\d+\.\s+/.test(trimmed)) {
          const matchNum = trimmed.match(/^\d+/);
          const startNum = matchNum ? matchNum[0] : '1';
          return '<ol start="' + startNum + '"><li>' + formatToScientificHtml(trimmed.replace(/^\d+[\s.]*/, '')) + '</li></ol>';
        } else if (trimmed === '') {
          return '<br/>';
        } else {
          return '<p>' + formatToScientificHtml(trimmed) + '</p>';
        }
      })
      .join('\n')}
  </div>

  <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; text-align: center; color: #94a3b8; font-weight: bold;">
    تمنياتنا لجميع طلبة أكاديمية التفوق بمسيرة عامرة بالتفوق والتميز المستمر ✨ <br/>
    مدير المنصة أ.زكي أبو علان
  </div>

</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const downloadAsMarkdown = () => {
    if (!aiResult) return;
    const blob = new Blob([aiResult], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${aiSubject || 'academic'}_${aiGrade || 'grade'}_sheet.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    if (!aiResult) return;
    
    const formattedDate = formatCustomDate(new Date());
    const titleText = aiIsWorksheet ? 'ورقة عمل وتقييم مهارات' : 'اختبار وتقييم تحصيلي بالذكاء الاصطناعي';
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${titleText} - ${aiSubject} - ${aiGrade}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    body {
      font-family: 'Calibri', 'Arial', 'Times New Roman', 'Cairo', sans-serif;
      font-size: 14pt !important;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      direction: rtl;
      background: #fff;
    }
    sub, sup {
      font-size: 75%;
      line-height: 0;
      position: relative;
      vertical-align: baseline;
    }
    sub {
      bottom: -0.25em;
    }
    sup {
      top: -0.5em;
    }
    .sheet-header {
      border: 3px double #1e293b;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 12px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .academy-title {
      font-size: 20px;
      font-weight: 900;
      color: #1a365d;
    }
    .sheet-title {
      font-size: 22px;
      font-weight: 900;
      color: #b45309;
      text-align: center;
      margin: 10px 0;
    }
    .student-info-grid {
      display: grid;
      grid-template-cols: 2fr 1fr 1fr;
      gap: 15px;
      font-size: 13px;
      font-weight: bold;
      color: #334155;
      background: #f8fafc;
      padding: 10px 15px;
      border-radius: 8px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-line {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      height: 18px;
    }
    .content-area {
      font-size: 14pt !important;
      font-family: 'Calibri', 'Arial', 'Times New Roman', 'Cairo', sans-serif;
    }
    h1, h2, h3, h4 {
      color: #1a365d;
    }
    h2 {
      border-right: 5px solid #b45309;
      padding-right: 10px;
      margin-top: 30px;
      font-size: 18px;
      font-weight: 950;
    }
    h3 {
      font-size: 16px;
      margin-top: 20px;
      color: #27272a;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 5px;
    }
    ul, ol {
      padding-right: 20px;
    }
    li {
      margin-bottom: 10px;
      font-size: 14pt !important;
    }
    p {
      font-size: 14pt !important;
      margin-bottom: 12px;
    }
    .no-print-bar {
      background: #f1f5f9;
      padding: 15px 25px;
      border-radius: 12px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
    }
    .btn {
      background: #1a365d;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn:hover {
      background: #2563eb;
    }
    .btn-gold {
      background: #b45309;
      color: white;
    }
    .btn-gold:hover {
      background: #9a3412;
    }
    @media print {
      .no-print-bar {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div style="font-weight: bold; font-size: 14px; color: #1e293b; font-family: sans-serif;">
      ✨ مستند جاهز للطباعة الفورية
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ طباعة</button>
      <button class="btn" onclick="window.close()">إغلاق الصفحة</button>
    </div>
  </div>

  <div class="sheet-header">
    <div class="header-top">
      <div class="academy-title">أكاديمية التفوق أونلاين - التواصل 0509329568</div>
      <div style="text-align: left; font-size: 12px; color: #64748b; font-weight: bold;">
        المدرس: ${loggedInTeacher.name}<br>
        المادة: ${aiSubject || 'عام'}<br>
        الصف: ${aiGrade || 'عام'}
      </div>
    </div>
    
    <div class="sheet-title">
      ${titleText}
    </div>
    
    <div class="student-info-grid">
      <div class="info-item">اسم الطالب الكلي: <span class="info-line"></span></div>
      <div class="info-item">التاريخ: <span class="info-line">${formattedDate}</span></div>
      <div class="info-item">الدرجة الكلية: <span class="info-line"></span></div>
    </div>
  </div>

  <div class="content-area">
    ${aiResult
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return '<h3>' + formatToScientificHtml(trimmed.replace('### ', '')) + '</h3>';
        } else if (trimmed.startsWith('## ')) {
          return '<h2>' + formatToScientificHtml(trimmed.replace('## ', '')) + '</h2>';
        } else if (trimmed.startsWith('# ')) {
          return '<h1>' + formatToScientificHtml(trimmed.replace('# ', '')) + '</h1>';
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return '<ul><li>' + formatToScientificHtml(trimmed.replace(/^[\s-*]+/, '')) + '</li></ul>';
        } else if (/^\d+\.\s+/.test(trimmed)) {
          const matchNum = trimmed.match(/^\d+/);
          const startNum = matchNum ? matchNum[0] : '1';
          return '<ol start="' + startNum + '"><li>' + formatToScientificHtml(trimmed.replace(/^\d+[\s.]*/, '')) + '</li></ol>';
        } else if (trimmed === '') {
          return '<br/>';
        } else {
          return '<p>' + formatToScientificHtml(trimmed) + '</p>';
        }
      })
      .join('\n')}
  </div>

  <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; text-align: center; color: #94a3b8; font-weight: bold;">
    تمنياتنا لجميع طلبة أكاديمية التفوق بمسيرة عامرة بالتفوق والتميز المستمر ✨ <br/>
    مدير المنصة أ.زكي أبو علان
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const linkedStudentsList = useMemo(() => {
    return getLinkedStudents();
  }, [sortedStudents, assignments, teacherIdentifiersSet, trialLessons, groupCourses, sessions]);

  const activeStudentsList = useMemo(() => {
    return sortedStudents.filter(s => !s.archived);
  }, [sortedStudents]);

  const linkedStudentIdsSet = useMemo(() => {
    return new Set(linkedStudentsList.map(s => s.id));
  }, [linkedStudentsList]);

  // Determine effective base student list:
  // If user selected 'all' OR if there are no linked students yet, use active students
  const effectiveBaseStudents = useMemo(() => {
    if (studentViewScope === 'all') {
      return activeStudentsList;
    }
    if (linkedStudentsList.length > 0) {
      return linkedStudentsList;
    }
    return activeStudentsList;
  }, [studentViewScope, linkedStudentsList, activeStudentsList]);

  // User Rule: طلاب الثانوي والإعدادي نظام ساعة تلقائي
  const isStudentSession40Mode = (s: Student) => {
    const stStage = getAcademicStage(s.grade || s.academicLevel || (s as any)?.academicStage || '');
    if (stStage === 'secondary' || stStage === 'middle') return false;
    return s.preferredPricingUnit === 'session_40' || s.sessionSystem === 'session_40';
  };

  // Count of students by system for quick filter tabs in session logging
  const session40Count = useMemo(() => {
    return effectiveBaseStudents.filter(s => isStudentSession40Mode(s)).length;
  }, [effectiveBaseStudents]);

  const hourlyCount = useMemo(() => {
    return effectiveBaseStudents.filter(s => !isStudentSession40Mode(s)).length;
  }, [effectiveBaseStudents]);

  const filteredLinkedStudents = useMemo(() => {
    let list = effectiveBaseStudents;
    if (studentSystemFilter === 'session_40') {
      list = list.filter(s => isStudentSession40Mode(s));
    } else if (studentSystemFilter === 'hourly') {
      list = list.filter(s => !isStudentSession40Mode(s));
    }
    const q = logStudentSearch.trim().toLowerCase();
    const qNorm = normalizeArabicName(q);
    if (q) {
      let filtered = list.filter(s => {
        const sNameNorm = normalizeArabicName(s.name || '');
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (qNorm && sNameNorm.includes(qNorm)) ||
          (s.phone || '').includes(q) ||
          (s.grade || s.academicLevel || '').toLowerCase().includes(q)
        );
      });
      // Fallback search across all active students if no match found in current list
      if (filtered.length === 0 && studentViewScope === 'linked') {
        filtered = activeStudentsList.filter(s => {
          const sNameNorm = normalizeArabicName(s.name || '');
          return (
            (s.name || '').toLowerCase().includes(q) ||
            (qNorm && sNameNorm.includes(qNorm)) ||
            (s.phone || '').includes(q) ||
            (s.grade || s.academicLevel || '').toLowerCase().includes(q)
          );
        });
      }
      return filtered;
    }
    return list;
  }, [effectiveBaseStudents, studentSystemFilter, logStudentSearch, studentViewScope, activeStudentsList]);

  const filteredBookStudentsList = useMemo(() => {
    const query = bookStudentSearchQuery.trim().toLowerCase();
    if (!query) return linkedStudentsList;
    return linkedStudentsList.filter(s => 
      (s.name || '').toLowerCase().includes(query) || 
      (s.grade || s.academicLevel || '').toLowerCase().includes(query)
    );
  }, [linkedStudentsList, bookStudentSearchQuery]);

  const selectedStudentsWithIssues = useMemo(() => {
    return logStudentIds.map(sid => {
      const student = students.find(s => s.id === sid);
      if (!student) return null;
      const balance = calculateStudentBalance(sid);
      const rate = getStudentDefaultHourlyRate(student, settings, loggedInTeacher);
      const durationHours = logDurationMinutes / 60;
      const cost = durationHours * rate;
      const hasIssue = balance < cost;
      const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : globalThreshold;
      const hasExceededThresholdLimit = balance < threshold;
      return {
        student,
        balance,
        rate,
        cost,
        hasIssue,
        threshold,
        hasExceededThresholdLimit,
      };
    }).filter((x): x is NonNullable<typeof x> => !!x && (x.hasIssue || x.hasExceededThresholdLimit));
  }, [logStudentIds, students, logDurationMinutes, loggedInTeacher.id, globalThreshold]);

  const recentlyAssignedStudents = useMemo(() => {
    const placementNotifs = instantNotifications.filter(n => 
      n.type === 'student_placement' || 
      n.type === 'student_transfer_in' || 
      n.type === 'trial_migration'
    );
    
    const recentStudentIds = new Set<string>();
    const studentNotifMap = new Map<string, any>();

    placementNotifs.forEach(n => {
      if (n.studentId) {
        recentStudentIds.add(n.studentId);
        if (!studentNotifMap.has(n.studentId)) {
          studentNotifMap.set(n.studentId, n);
        }
      }
    });

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateThreshold = fourteenDaysAgo.toISOString().split('T')[0];

    linkedStudentsList.forEach(s => {
      if (s.registrationDate && s.registrationDate >= dateThreshold) {
        recentStudentIds.add(s.id);
      }
    });

    return linkedStudentsList
      .filter(s => {
        if (!recentStudentIds.has(s.id)) return false;

        // تختفي الطلبة من بطاقة "طلاب جدد تم إسنادهم إليك مؤخراً 🎉" بعد تسجيل أول حصة لهم (سواء من قِبل مدير المنصة أو المعلم)
        const hasLoggedSession = sessions.some(sess => {
          if (!sess) return false;
          if (sess.status === 'cancelled') return false;
          // التحقق من هوية الطالب
          if (sess.studentId && sess.studentId === s.id) return true;
          // التحقق في حال كانت الحصة جماعية تحتوي على مصفوفة studentIds
          if (Array.isArray((sess as any).studentIds) && (sess as any).studentIds.includes(s.id)) return true;
          // التحقق من الاسم في السجلات التوافقية
          if (sess.studentName && s.name && sess.studentName.trim().toLowerCase() === s.name.trim().toLowerCase()) return true;
          return false;
        });

        // إذا تم تسجيل أول حصة للطالب، لا يظهر في بطاقة الطلاب الجدد
        if (hasLoggedSession) return false;

        return true;
      })
      .map(s => ({
        student: s,
        notification: studentNotifMap.get(s.id)
      }));
  }, [instantNotifications, linkedStudentsList, sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-800" dir="rtl">
        <Loader2 size={48} className="animate-spin text-[#1A365D] mb-4" />
        <p className="text-sm font-black">جاري تحميل لوحة عمل المعلم الفورية المزامنة...</p>
      </div>
    );
  }

  const relevantTasks = tasks.filter(t => {
    const linkedIds = getLinkedStudents(students, assignments).map(s => s.id);
    return t.teacherId === loggedInTeacher.id || linkedIds.includes(t.studentId || '');
  });

  const hasLogInsufficientBalance = selectedStudentsWithIssues.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans" dir="rtl">
      
      {/* Floating System Toast Notification */}
      <AnimatePresence>
        {calendarToast && (
          <motion.div
            key="calendar-toast"
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] max-w-lg w-[90%] sm:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center justify-between gap-3 text-right cursor-pointer"
            onClick={() => setCalendarToast(null)}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white">
                <CheckCircle2 size={18} className="animate-bounce" />
              </div>
              <p className="text-xs font-black leading-snug">{calendarToast}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCalendarToast(null);
              }}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Logged Successfully Celebration & Notification Modal */}
      <AnimatePresence>
        {sessionSuccessInfo && sessionSuccessInfo.isOpen && (
          <div key="session-success-info-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-950/50 animate-fade-in" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-emerald-200 text-right"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -ml-20 -mt-20 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-amber-300 shadow-inner">
                      <CheckCircle2 size={28} className="animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full inline-block mb-1">
                        إشعار رسمي معتمد
                      </span>
                      <h3 className="text-xl font-black text-white">{sessionSuccessInfo.title}</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSessionSuccessInfo(null)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Congratulatory message */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                  <Sparkles size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold text-emerald-950 leading-relaxed">
                    <p className="font-black text-sm text-emerald-900 mb-0.5">
                      أحسنت أستاذ {loggedInTeacher.name}! تم رصد بيانات الحصة بنجاح في سجلات الأكاديمية.
                    </p>
                    <p className="text-emerald-800">
                      تم خصم الحصص فورياً من رصيد الطلاب، وتوثيق الحصة بنجاح في السجل الأكاديمي المعتمد.
                    </p>
                  </div>
                </div>

                {/* Session Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold">المادة والموضوع:</span>
                    <strong className="text-slate-900 font-black">
                      {sessionSuccessInfo.subject} {sessionSuccessInfo.topic ? `• ${sessionSuccessInfo.topic}` : ''}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold">التاريخ والمدة:</span>
                    <strong className="text-slate-900 font-mono font-bold">
                      {sessionSuccessInfo.date} • ({sessionSuccessInfo.durationMinutes} دقيقة)
                    </strong>
                  </div>

                  <div className="flex items-start justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-bold shrink-0">الطلاب المسجل لهم:</span>
                    <div className="text-left font-black text-slate-800 flex flex-wrap gap-1 justify-end max-w-xs">
                      {sessionSuccessInfo.studentsNames.map((sName, i) => (
                        <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[11px]">
                          {sName}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-emerald-700 font-black">
                    <span>حالة الاعتماد والرصد:</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
                      معتمدة ومسجلة في السجل الأكاديمي ✅
                    </span>
                  </div>
                </div>

                {/* Academic Session Confirmation Details for 40-minute session */}
                {sessionSuccessInfo.pricingUnit === 'session_40' && (
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-950 font-black flex items-center gap-1.5">
                        <GraduationCap size={16} className="text-amber-600" />
                        <span>نظام الحصة التعليمية المعتمد:</span>
                      </span>
                      <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2.5 py-1 rounded-md border border-amber-300">
                        {sessionSuccessInfo.sessionCount ? `${sessionSuccessInfo.sessionCount} حصة (40 دقيقة)` : 'حصة معتمدة (40 دقيقة)'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 font-bold leading-relaxed pt-1">
                      تم توثيق ورصد الحصة بنجاح في السجل الأكاديمي للطلاب، وتحديث رصيد الحصص المتبقية تلقائياً.
                    </p>
                  </div>
                )}

                {/* Students Remaining Sessions Status Card */}
                {sessionSuccessInfo.studentsBalanceDetails && sessionSuccessInfo.studentsBalanceDetails.length > 0 && (
                  <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-indigo-600" />
                        <span>الحصص المتبقية للطلاب بعد تسجيل الحصة:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">تحديث فوري</span>
                    </div>

                    <div className="space-y-2">
                      {sessionSuccessInfo.studentsBalanceDetails.map((item, idx) => {
                        const isDepleted = item.remainingSessions <= 0;
                        const isLow = item.remainingSessions === 1;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              item.isOpenBalance
                                ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                                : isDepleted
                                ? 'bg-rose-50 border-rose-300 text-rose-950'
                                : isLow
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                item.isOpenBalance ? 'bg-blue-500' : isDepleted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              <strong className="font-black text-slate-900">{item.studentName}</strong>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {item.isOpenBalance ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs">
                                  <span>رصيد مفتوح من المدير</span>
                                  <span className="text-xs font-mono font-bold">🔓</span>
                                </span>
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border flex items-center gap-1 ${
                                  isDepleted
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}>
                                  <span>المتبقي:</span>
                                  <strong className="font-mono text-xs font-black">
                                    {item.remainingSessions === 0 
                                      ? '0 حصة (نفد رصيد الحصص)' 
                                      : item.remainingSessions === 1 
                                      ? 'حصة واحدة فقط (1)' 
                                      : item.remainingSessions === 2 
                                      ? 'حصتان (2)' 
                                      : `${item.remainingSessions} حصص`}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSessionSuccessInfo(null);
                    setIsBalanceCheckerModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <BookOpen size={14} className="text-emerald-700" />
                  <span>فحص الحصص المتبقية للطلاب ⏱️</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSessionSuccessInfo(null);
                    setActiveSubTab('log-session');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0d365a] hover:bg-[#1a4a75] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <span>تسجيل حصة أخرى ➕</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionSuccessInfo(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-all cursor-pointer"
                >
                  <span>إغلاق ✔️</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Auto-Alert Toast */}
      <AnimatePresence>
        {showAutoAlertToast && (
          <motion.div
            key="auto-alert-toast"
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md bg-slate-900 border border-amber-500/45 text-white p-5 rounded-2xl shadow-2xl font-sans z-50 flex items-start gap-4 text-right cursor-pointer"
            onClick={() => setShowAutoAlertToast(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-400">إشعار نظام تلقائي (محاكاة) 🔔</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">الآن</span>
              </div>
              <p className="text-xs font-bold leading-relaxed mt-2 text-slate-100">{toastMessageText}</p>
              <p className="text-[10px] text-slate-400 mt-2.5 font-medium">انقر في أي مكان لإخفاء هذا التنبيه.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Low-Balance Limit Popup Alert */}
      <AnimatePresence>
        {studentLimitAlert && (
          <div key={`student-limit-alert-${studentLimitAlert.student?.id || 'alert'}`} className="fixed inset-0 z-[160] flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/40" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative text-right p-6 md:p-8 border border-rose-100"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setStudentLimitAlert(null)}
                className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer border-none bg-transparent outline-none flex items-center justify-center"
                type="button"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3.5 mb-5 text-right w-full">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-rose-600 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">تجاوز حد السحب الفوري المسموح به 🚨</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">تحديث مالي لحظي لخطوط الائتمان للأكاديمية.</p>
                </div>
              </div>

              <div className="bg-rose-50/50 p-4.5 rounded-2xl border border-rose-100/60 text-xs font-bold text-slate-800 space-y-3 w-full">
                <p className="leading-relaxed text-right">
                  تنبيه: <strong className="text-rose-700 font-extrabold">"{studentLimitAlert.studentName}"</strong> ليس لديه رصيد كافٍ لتسجيل هذه الحصة.
                </p>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed pt-1 text-right">
                  لقد تراجع رصيد الطالب دون خط الأمان المعتمد للتسجيل من قبل الإدارة. يرجى لفت انتباه الأهل بلطف لشحن محفظة الطالب لضمان استمرار رصد الدروس بلا انقطاع.
                </p>
              </div>

              <div className="flex gap-2.5 mt-6 justify-end w-full">
                <button
                  type="button"
                  onClick={() => {
                    setTeacherBypassWarning(true);
                    setStudentLimitAlert(null);
                  }}
                  className="flex-1 px-4 py-3 bg-[#1A365D] hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer border-none outline-none shadow-sm shadow-[#1A365D]/10 text-center"
                >
                  تأكيد والبدء بالحصة الاستثنائية
                </button>
                <button
                  type="button"
                  onClick={() => setStudentLimitAlert(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer border-none outline-none text-center"
                >
                  أفهم ذلك
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Session Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteSessionId && (
          <div key={`confirm-delete-session-${confirmDeleteSessionId}`} className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/40" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative text-right p-6 md:p-8 border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setConfirmDeleteSessionId(null)}
                className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer border-none bg-transparent outline-none flex items-center justify-center"
                type="button"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3.5 mb-5 text-right w-full">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-650 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">تأكيد حذف الحصة نهائياً ⚠️</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">تنبيه عملياتي حرج لحذف السجلات التعليمية والمالية.</p>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 space-y-3 w-full text-right" dir="rtl">
                {(() => {
                  const sess = sessions.find(s => s.id === confirmDeleteSessionId);
                  if (!sess) return <p>جاري تحميل بيانات الحصة...</p>;
                  const stud = students.find(s => s.id === sess.studentId);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">اسم الطالب:</span>
                        <span className="font-black text-slate-900 text-sm">👤 {stud?.name || 'غير محدد'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">المادة / الموضوع:</span>
                        <span className="font-bold text-blue-900">📚 {sess.subject || 'عام'} {sess.topic ? ` - ${sess.topic}` : ''}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">التاريخ والمدة:</span>
                        <span className="font-bold text-slate-800">📅 {sess.date || ''} {sess.startTime ? `(${sess.startTime})` : ''} • ⏱️ {sess.durationHours} ساعة</span>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/70 text-emerald-850 text-[11px] font-black leading-relaxed">
                        ✅ سيتم استرداد الساعات/الحصة المخصومة وإعادتها فوراً إلى رصيد الطالب ({stud?.name || 'الطالب'}).
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[10px] text-rose-650 font-black bg-rose-50 p-2.5 rounded-xl leading-relaxed text-right border border-rose-200/60">
                  ⚠️ هذا الإجراء سيحذف الحصة نهائياً من سجلك التدريسي ولن يتم احتسابها ضمن تقرير الساعات المنجزة.
                </p>
              </div>

              <div className="flex gap-2.5 mt-6 justify-end w-full">
                <button
                  type="button"
                  onClick={async () => {
                    const sid = confirmDeleteSessionId;
                    setConfirmDeleteSessionId(null);
                    await executeDeleteSession(sid);
                  }}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer border-none outline-none text-center"
                >
                  نعم، احذف الحصة نهائياً
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteSessionId(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer border-none outline-none text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Top Banner Region */}
      <header className="bg-[#1A365D] text-white p-8 border-b border-slate-750 relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -ml-40 -mt-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative">
          
          <div className="flex items-center gap-4.5 text-right w-full md:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A33C]/20 border border-[#D4A33C]/40 flex items-center justify-center text-[#D4A33C] shadow-lg">
              <Award size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#D4A33C]/25 text-[#D4A33C] px-2.5 py-0.5 rounded-full font-bold">بوابة المعلم الفعالة</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1 leading-tight">{loggedInTeacher.name}</h1>
              <p className="text-xs text-slate-300 font-bold mt-1">تخصص: {loggedInTeacher.specialization || loggedInTeacher.subjects?.join('، ') || 'معلم معتمد'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto justify-end">
            {/* 1. FIRST & PROMINENT: Check Student Balance & Hours */}
            <button 
              type="button"
              onClick={() => {
                setBalanceCheckerStudentId(linkedStudentsList.length > 0 ? linkedStudentsList[0].id : '');
                setIsBalanceCheckerModalOpen(true);
              }}
              className="px-5 py-3.5 bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-700 hover:from-teal-600 hover:to-emerald-800 hover:scale-105 border-2 border-teal-300 text-white rounded-xl text-xs font-black transition-all shadow-xl hover:shadow-teal-500/40 cursor-pointer flex items-center gap-2.5 select-none ring-4 ring-teal-400/30 active:scale-95 animate-pulse hover:animate-none"
              title="فحص رصيد وساعات الحصص المتبقية لجميع طلابك المنسوبين فورياً"
              id="teacher-check-students-balance-btn"
            >
              <Clock size={17} className="shrink-0 text-amber-300 stroke-[2.5]" />
              <span className="text-sm">فحص رصيد وساعات الطلاب 🔍</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">أولوية ⭐</span>
            </button>

            {/* 2. SECOND: Log Individual Session */}
            <button 
              type="button"
              onClick={() => {
                setActiveSubTab('log-session');
                const element = document.getElementById('teacher-main-tabs-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-[#D4A33C] to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:scale-105 border border-amber-300 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-amber-500/30 cursor-pointer flex items-center gap-2 select-none active:scale-95"
              title="تسجيل ورصد حصة فردية لطلابك فورياً"
              id="teacher-log-individual-session-btn"
            >
              <Calendar size={16} className="shrink-0 text-slate-950" />
              <span>تسجيل حصة فردية ⚡️</span>
            </button>

            {/* 3. THIRD: Smart Alerts Icon */}
            <button
              type="button"
              onClick={() => {
                setShowNotifications(true);
              }}
              className="px-4 py-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-2 select-none relative group"
              title="مركز التنبيهات الذكي: رصيد الحصص، الحصص المعلقة، والتنسيبات"
              id="teacher-header-alerts-btn"
            >
              <div className="relative">
                <Bell size={16} className={`text-amber-400 ${totalAlertsCount > 0 ? 'animate-bounce' : ''}`} />
                {totalAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-ping" />
                )}
              </div>
              <span>تنبيهات</span>
              {totalAlertsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black shadow-xs">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {/* 4. FOURTH: Linked Students Overview */}
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('my-students');
                const element = document.getElementById('teacher-main-tabs-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-sky-500/40 px-3.5 py-2.5 rounded-xl text-right transition-all cursor-pointer group"
              title="انقر لاستعراض قائمة الطلاب المنسوبين كاملة مع أدوات البحث والفرز"
            >
              <p className="text-[10px] text-slate-400 group-hover:text-sky-300 font-bold block">طلابك المسجلون 👨‍🎓</p>
              <p className="text-xs font-black text-white group-hover:text-sky-200 leading-tight mt-0.5 flex items-center gap-1">
                <span>{linkedStudentsList.length} طلاب</span>
                <span className="text-[9px] text-sky-400 font-bold bg-sky-500/10 px-1 py-0.5 rounded">عرض ←</span>
              </p>
            </button>

            {/* 5. FIFTH: Educational Library */}
            <button 
              type="button"
              onClick={() => setActiveSubTab('educational-library')}
              className="px-4 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 hover:scale-105 border border-indigo-400/40 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer flex items-center gap-2 select-none"
              title="المواد والمصادر التعليمية والمساعد الأكاديمي الذكي"
              id="teacher-header-educational-library-btn"
            >
              <BookOpenCheck size={16} className="shrink-0 text-amber-300" />
              <span>المواد والمصادر 📚</span>
            </button>

            {/* 6. SIXTH: AI Curriculum Generator */}
            <button 
              type="button"
              onClick={() => setActiveSubTab('curriculum-generator')}
              className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 hover:scale-105 border border-emerald-400/40 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-2 select-none"
              title="توليد المناهج والمخرجات وهرم بلوم ومرجع VEB Chemistry ورفع المصادر"
              id="teacher-header-curriculum-generator-btn"
            >
              <FlaskConical size={16} className="shrink-0 text-emerald-200" />
              <span>توليد المناهج 🧪</span>
            </button>

            {/* 7. SEVENTH: Export Balance Statement */}
            <button 
              type="button"
              onClick={() => setIsBalanceStatementModalOpen(true)}
              className="px-4 py-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-emerald-400/50 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 select-none"
              title="تصدير كشف حساب الرصيد كملف PDF منظم مع تفاصيل العمليات لكل طالب خلال فترة زمنية محددة"
            >
              <FileDown size={15} className="shrink-0 text-amber-300" />
              <span>كشف الرصيد 📄</span>
            </button>

            {hasActiveGroupCourse && (
              <button 
                onClick={() => {
                  setActiveSubTab('log-group-session');
                  const activeCourses = groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
                  if (activeCourses.length > 0 && !logGroupCourseId) {
                    setLogGroupCourseId(activeCourses[0].id);
                  }
                  const element = document.getElementById('teacher-main-tabs-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-650 hover:to-indigo-800 hover:scale-105 border border-indigo-500/50 text-white rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
                title="رصد وتسجيل حصة كورس جماعي فورياً"
              >
                <Users size={15} className="shrink-0 text-indigo-200" />
                <span>رصد حصة جماعية (كورس) 👥</span>
              </button>
            )}

            {Boolean(
              onSwitchToManager &&
              isManagerUser &&
              (loggedInTeacher?.username?.toLowerCase() === 'zakiabuillan' ||
               loggedInTeacher?.email?.toLowerCase() === 'zakiabuillan@gmail.com' ||
               loggedInTeacher?.id === 'zaki_teacher')
            ) && (
              <button 
                type="button"
                onClick={onSwitchToManager}
                className="px-5 py-3.5 bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-400 hover:to-emerald-500 hover:scale-105 border border-teal-400/50 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-teal-500/25 cursor-pointer flex items-center gap-2 select-none active:scale-95"
                title="التحويل الفوري والسلس إلى لوحة تحكم المدير العام"
              >
                <ShieldCheck size={16} className="shrink-0 text-slate-950" />
                <span>التحويل لصفحة المدير 👨‍💼</span>
              </button>
            )}

            <button 
              onClick={onLogout}
              className="px-5 py-3.5 bg-rose-600/15 border border-rose-500/35 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer select-none"
            >
              تسجيل الخروج الآمن
            </button>
          </div>

        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        
        {/* Navigation Sidebar & Student list summary (disabled as subtabs are rendered in pop-up modals!) */}
        {false && (
          <div className="lg:col-span-1 space-y-6">
          
          {/* Main Controls Menu - Styled like the screenshot! */}
          <div className="bg-[#18181b] rounded-3xl border border-neutral-800 shadow-md p-4 space-y-2 text-right" dir="rtl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1 text-right">قائمة الصلاحيات والمزايا 🎛️</p>
            
            <button
              onClick={() => setActiveSubTab('home')}
              className="group w-full text-right flex items-center justify-between px-4 py-4 border rounded-xl font-black transition-all text-xs cursor-pointer select-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-750 text-slate-950 border-amber-400 shadow-sm mb-3"
            >
              <ArrowRight size={12} className="shrink-0 stroke-[3.5]" />
              <div className="flex items-center gap-2">
                <span className="font-black text-xs">الرجوع للشاشة الرئيسية</span>
                <span>🏠</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveSubTab('book-session')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'book-session'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
            >
              <ChevronDown size={11} className="opacity-40 shrink-0" />
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">توفر ساعات</span>
                <Clock size={14} className="shrink-0 text-amber-400" />
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('log-session')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'log-session'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/15'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full font-black animate-pulse">هام ⭐️</span>
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">تسجيل حصة فردية</span>
                <Calendar size={14} className="shrink-0 text-emerald-400 animate-pulse" />
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('ai-planner')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'ai-planner'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
            >
              <ChevronDown size={11} className="opacity-40 shrink-0" />
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">شرح محتوى ذكي (AI)</span>
                <Sparkles size={14} className="shrink-0 text-[#D4A33C]" />
              </div>
            </button>

            {hasActiveGroupCourse && (
              <button
                onClick={() => {
                  setActiveSubTab('log-group-session');
                  const activeCourses = groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
                  if (activeCourses.length > 0 && !logGroupCourseId) {
                    setLogGroupCourseId(activeCourses[0].id);
                  }
                }}
                className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                  activeSubTab === 'log-group-session'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
                }`}
              >
                <ChevronDown size={11} className="opacity-40 shrink-0" />
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-xs">تسجيل حصة دورة جماعية</span>
                  <Users size={14} className="shrink-0 text-indigo-400" />
                </div>
              </button>
            )}

            {!!loggedInTeacher.tasksEnabled && (
              <>
                <button
                  onClick={() => setActiveSubTab('tasks')}
                  className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                    activeSubTab === 'tasks'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
                  }`}
                >
                  <ChevronDown size={11} className="opacity-40 shrink-0" />
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-xs">إدارة الواجبات والمهام الدراسيّة</span>
                    <CheckSquare size={14} className="shrink-0 text-rose-400" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveSubTab('tasks-evaluation')}
                  className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                    activeSubTab === 'tasks-evaluation'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    {relevantTasks.filter(t => !t.completed).length > 0 && (
                      <span className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full transition-all ${
                        activeSubTab === 'tasks-evaluation' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-neutral-800 text-slate-300 font-bold'
                      }`}>
                        {relevantTasks.filter(t => !t.completed).length}
                      </span>
                    )}
                    <ChevronDown size={11} className="opacity-40" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-xs">تقييم وتسليم الواجبات</span>
                    <BookmarkCheck size={14} className="shrink-0 text-amber-500" />
                  </div>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveSubTab('previous-sessions')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'previous-sessions'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
            >
              <ChevronDown size={11} className="opacity-40 shrink-0" />
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">سجل كافة الحصص السابقة</span>
                <History size={14} className="shrink-0 text-slate-300" />
              </div>
            </button>

            {/* Trial Lessons Subtab for Teachers */}
            <button
              onClick={() => setActiveSubTab('trials')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'trials'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md animate-none'
                  : pendingTrialsCount > 0
                    ? 'bg-gradient-to-r from-amber-950/30 via-[#1d1b16] to-amber-950/30 text-amber-400 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
                    : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
              id="teacher-trials-subtab"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                {hasOverdueTrials && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black animate-pulse flex items-center gap-0.5">
                    <AlertTriangle size={8} />
                    <span>تنبيه 24h</span>
                  </span>
                )}
                {pendingTrialsCount > 0 && (
                  <span className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full transition-all ${
                    activeSubTab === 'trials' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-rose-500 text-white font-bold animate-bounce'
                  }`}>
                    {pendingTrialsCount}
                  </span>
                )}
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-2.5">
                {pendingTrialsCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-amber-300">رسائل جديدة: حصص تجريبية معلّقة 🧪</span>
                    <div className="relative">
                      <MessageSquare size={14} className="shrink-0 text-amber-400 animate-bounce" />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-extrabold text-xs">الحصص التجريبية المؤتمتة 💫</span>
                    <Sparkles size={14} className="shrink-0 text-amber-400" />
                  </>
                )}
              </div>
            </button>

            {/* Xournal++ PDF Notebook & Interactive Whiteboard Tab Button */}
            {whiteboardEnabled && (
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={() => {
                    setWhiteboardModalMode('xournal');
                    setIsWhiteboardModalOpen(true);
                  }}
                  className="w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none bg-gradient-to-r from-emerald-950/70 via-slate-900 to-[#1e1e1e] hover:from-emerald-700 hover:to-teal-600 text-emerald-300 hover:text-white border-emerald-800/70 hover:border-emerald-400 shadow-xs hover:shadow-lg hover:shadow-emerald-500/20"
                  id="teacher-xournal-subtab"
                  title="فتح دفتر Xournal++ لتدوين وشرح ملفات الـ PDF مع إدراج صفحات ديناميكية ودعم القلم الرقمي"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenWhiteboardNewTab(e, 'xournal');
                      }}
                      className="text-[9px] font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                      title="فتح Xournal++ في تبويب متصفح مستقل ↗"
                    >
                      <span>مستقل</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="font-black text-xs block text-white">دفتر Xournal++ واللوح التفاعلي 📓</span>
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">شرح PDF + إدراج صفحات ديناميكية</span>
                    </div>
                    <BookOpen size={16} className="shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                </button>
              </div>
            )}

            {/* Weekly Schedule Tab Button */}
            <button
              onClick={() => setActiveSubTab('weekly-schedule')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'weekly-schedule'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
              id="teacher-weekly-schedule-subtab"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md">جديد</span>
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">الجدول الزمني الأسبوعي 🗓️</span>
                <CalendarDays size={14} className="shrink-0 text-amber-400" />
              </div>
            </button>

            {/* Premium Interactive Calendar Tab Button */}
            <button
              onClick={() => setActiveSubTab('calendar')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
              id="teacher-calendar-subtab"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-semibold text-slate-400">نشط</span>
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">التقويم التفاعلي والجدولة 📅</span>
                <CalendarPlus size={14} className="shrink-0 text-sky-400" />
              </div>
            </button>

            {/* Educational Library & Resources Tab Button */}
            <button
              onClick={() => setActiveSubTab('educational-library')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4.5 border rounded-xl font-black transition-all text-xs cursor-pointer select-none ${
                activeSubTab === 'educational-library'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md'
                  : 'bg-[#1e1e1e] text-slate-300 hover:bg-[#28282b] hover:text-white border-neutral-800/80'
              }`}
              id="teacher-educational-library-subtab"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-black bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded-md">جديد</span>
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xs">المواد والمصادر التعليمية 📚</span>
                <BookOpenCheck size={14} className="shrink-0 text-emerald-400" />
              </div>
            </button>

            {/* AI Curriculum Generator & Bloom's Taxonomy & VEB Chemistry Sources (Exclusive to Teachers) */}
            <button
              onClick={() => setActiveSubTab('curriculum-generator')}
              className={`group w-full text-right flex items-center justify-between px-4 py-4 border rounded-2xl font-black transition-all cursor-pointer select-none relative overflow-hidden ${
                activeSubTab === 'curriculum-generator'
                  ? 'border-emerald-500 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/50 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/30'
                  : 'bg-gradient-to-r from-[#17221e] to-[#1e1e1e] hover:from-[#1b2b24] hover:to-[#252525] text-emerald-300 hover:text-white border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              }`}
              id="teacher-curriculum-generator-subtab"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                  حصري للمعلم ✨
                </span>
                <ChevronDown size={11} className="opacity-40" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-black tracking-tight leading-snug">
                    توليد المناهج والمخرجات 🧪
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-0.5 leading-snug">
                    هرم بلوم ومرجع VEB Chemistry
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  activeSubTab === 'curriculum-generator' 
                    ? 'bg-emerald-500/30 text-emerald-300 ring-2 ring-emerald-400/30' 
                    : 'bg-emerald-900/40 text-emerald-300 group-hover:scale-110'
                }`}>
                  <FlaskConical size={18} strokeWidth={2.2} />
                </div>
              </div>
            </button>
          </div>

          {/* Quick List of Your Linked Students */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users size={14} className="text-[#D4A33C]" />
              <span>طلابك المسجلون</span>
            </h3>

            {linkedStudentsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-xs font-bold">لا يوجد طلاب مربوطين بك حالياً.</p>
                <p className="text-[10px] mt-1">يرجى من المدير الفني تنسيب الطلاب لك.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                {linkedStudentsList.map(item => {
                  const hours = calculateStudentHours(item.id);
                  const isSufficient = hours > 0;
                  return (
                    <div key={item.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-right transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800 break-words leading-snug">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSufficient ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                          <span className={`text-[10px] font-bold ${isSufficient ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isSufficient ? 'ساعات متوفرة' : 'لا يوجد ساعات متوفرة'}
                          </span>
                        </div>
                      </div>
                      <div className="text-left shrink-0 pl-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black ${
                          isSufficient ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {hours.toFixed(1)} س
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const foundStudent = students.find(s => s.id === item.id);
                            if (foundStudent) setSelectedStudentForProfileModal(foundStudent);
                          }}
                          className="p-1 rounded-lg bg-white hover:bg-teal-50 text-slate-400 hover:text-teal-700 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer"
                          title={`عرض بطاقة الطالب ${item.name}`}
                        >
                          <GraduationCap size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
        )}

        {/* Form Body Areas */}
        <div className="w-full space-y-6" id="teacher-main-tabs-section">

          <div className={`space-y-8 transition-all duration-300 ${activeSubTab !== 'home' ? 'blur-sm pointer-events-none opacity-20 scale-98' : 'animate-fade-in'}`} dir="rtl">
              {/* 1. Header with custom alerts dropdown and primary action log button */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-205 pb-6">
                <div className="text-right flex-1">
                  <span className="text-xs bg-[#1A365D]/10 text-blue-800 px-3 py-1 rounded-full font-black">لوحة شؤون المعلمين الفعالة ⚡️</span>
                  <h1 className="text-2xl font-black text-slate-900 mt-2">مرحباً بك مجدداً، أ. {loggedInTeacher.name} 👋</h1>
                  <p className="text-xs text-slate-500 font-bold mt-1">تابع حصصك اليومية، وحوكم الواجبات والأنشطة الأكاديمية بكل سلاسة وبساطة وفق معايير وزارة المعارف.</p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  {/* Teacher Balance Statement Modal Button */}
                  <button
                    type="button"
                    onClick={() => setIsBalanceStatementModalOpen(true)}
                    className="h-12 px-4.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-700/25 cursor-pointer font-black text-xs"
                    title="تصدير كشف حساب الرصيد كملف PDF منظم مع عرض تفاصيل العمليات لكل طالب خلال فترة زمنية محددة"
                  >
                    <FileDown size={17} className="text-amber-300" />
                    <span>تصدير كشف الرصيد 💰</span>
                  </button>

                  {/* Export Monthly Report PDF Button */}
                  <button
                    type="button"
                    onClick={() => setIsExportReportModalOpen(true)}
                    className="h-12 px-4 rounded-2xl bg-gradient-to-r from-[#0d365a] via-[#1a4a75] to-slate-900 hover:from-[#09253e] hover:to-[#133758] text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#0d365a]/25 cursor-pointer font-black text-xs"
                    title="تصدير تقرير شهري لجميع الحصص المسجلة وأسماء الطلاب وتواريخ الجلسات بصيغة PDF"
                  >
                    <FileDown size={17} className="text-amber-300" />
                    <span>تصدير تقرير الحصص</span>
                  </button>

                  {/* Immediate Manual Refresh Button */}
                  <button
                    type="button"
                    onClick={() => {
                      fetchMainData();
                      triggerToast('تم تحديث قائمة الطلاب والحصص بنجاح 🔄');
                    }}
                    disabled={loading}
                    className="h-12 px-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-2 hover:bg-slate-50 hover:scale-105 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    title="تحديث فوري لقائمة الطلاب والحصص"
                  >
                    <RefreshCw size={17} className={`${loading ? 'animate-spin text-amber-500' : 'text-slate-600'}`} />
                    <span className="text-xs font-black hidden sm:inline">تحديث</span>
                  </button>

                  {/* Notification Dropdown toggler */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowNotifications(!showNotifications)}
                      className={`h-12 px-4 rounded-2xl bg-white border text-slate-800 flex items-center gap-2 hover:bg-slate-50 hover:scale-105 transition-all shadow-sm cursor-pointer relative font-black text-xs ${
                        totalAlertsCount > 0 
                          ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/20' 
                          : 'border-slate-200'
                      }`}
                      title="التنبيهات الفورية والأكاديمية"
                      id="teacher-subbar-notifications-btn"
                    >
                      <Bell size={18} className={`${showNotifications || totalAlertsCount > 0 ? 'text-amber-600' : 'text-slate-600'}`} />
                      <span>تنبيهات</span>
                      {totalAlertsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black shadow-xs">
                          {totalAlertsCount}
                        </span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div className="absolute left-0 mt-3 w-96 sm:w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 text-right animate-fade-in" dir="rtl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                          <span className="text-xs font-black text-slate-850">مركز التنبيهات الفورية والأكاديمية ⚡️</span>
                          <button type="button" onClick={() => setShowNotifications(false)} className="text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-200 rounded px-2 py-0.5 font-bold transition-all">إغلاق</button>
                        </div>
                        
                        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
                          {/* Section: Group Course Hours Depletion Alert (متبقي ساعتان أو أقل بالدورة الجماعية) */}
                          {groupStudentsNearDepletion.length > 0 && (
                            <div className="space-y-2 pb-3 border-b border-slate-100 bg-rose-50/40 p-3 rounded-2xl border border-rose-150">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertCircle size={11} className="text-rose-600 shrink-0" />
                                  <span>تنبيه ساعات الدورات الجماعية ({groupStudentsNearDepletion.length} طلاب) 📚</span>
                                </span>
                                <span className="text-[9px] text-rose-700 font-black">متبقي ساعتان أو أقل</span>
                              </div>
                              <p className="text-[9px] text-slate-500 font-medium leading-tight">
                                قارب هؤلاء الطلاب على استهلاك كامل الساعات المخصصة لهم بالدورة. يرجى التواصل المبكر مع أولياء الأمور لتجديد الساعات.
                              </p>
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                                {groupStudentsNearDepletion.map((item) => (
                                  <div key={item.alertKey} className="p-2.5 bg-white border border-rose-200/80 rounded-xl text-[10px] flex flex-col gap-1.5 shadow-2xs">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 font-black text-slate-900">
                                          <User size={12} className="text-rose-600 shrink-0" />
                                          <strong className="break-words leading-snug">{item.student.name}</strong>
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                                          {item.course.title || item.course.name || item.course.code}
                                        </span>
                                      </div>
                                      <div className="shrink-0 text-left">
                                        {item.remainingHours <= 0 ? (
                                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white animate-pulse">
                                            🚨 نافذ (0 س)
                                          </span>
                                        ) : item.remainingHours === 1 ? (
                                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-orange-500 text-white">
                                            ⚠️ متبقي 1 س
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-slate-950">
                                            ⏳ متبقي 2 س
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Progress visual bar */}
                                    <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-600">
                                        <span>استهلك: <strong className="font-mono text-slate-850">{item.consumedHours}</strong> من أصل <strong className="font-mono text-slate-850">{item.allocatedHours} س</strong></span>
                                        <span className="font-mono font-black">{item.percentageConsumed}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${
                                            item.remainingHours <= 0 ? 'bg-rose-600' : item.remainingHours === 1 ? 'bg-orange-500' : 'bg-amber-500'
                                          }`}
                                          style={{ width: `${Math.min(100, item.percentageConsumed)}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Direct Action: WhatsApp Parent Contact */}
                                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSubTab('courses');
                                          setShowNotifications(false);
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[9px] font-bold transition-all cursor-pointer"
                                      >
                                        الدورة 📚
                                      </button>

                                      {item.whatsAppUrl ? (
                                        <a
                                          href={item.whatsAppUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => setShowNotifications(false)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[9px] font-black flex items-center gap-1.5 transition-all shadow-xs"
                                          title="مراسلة ولي الأمر مباشرة عبر واتساب بنص رسمي منسق"
                                        >
                                          <MessageSquare size={11} />
                                          <span>مراسلة ولي الأمر 💬</span>
                                        </a>
                                      ) : (
                                        <span className="text-[8px] text-slate-400 font-bold">لا يوجد رقم هاتف</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Section 0: Low Remaining Sessions Alerts (<= 2 sessions left) */}
                          {studentsWithLowRemainingSessions.length > 0 && (
                            <div className="space-y-2 pb-3 border-b border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                  <span>تنبيه نفاذ الحصص الفردية ({studentsWithLowRemainingSessions.length} طلاب) ⚠️</span>
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">متبقي 2 حصص أو أقل</span>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {studentsWithLowRemainingSessions.map(({ student, remainingSessions, balance }) => (
                                  <div key={student.id} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[10px] flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <strong className="text-slate-800 font-black break-words leading-snug block">{student.name}</strong>
                                      <span className="text-[9px] font-bold block mt-0.5">
                                        {remainingSessions <= 0 ? (
                                          <span className="text-rose-600 font-black">🚨 الرصيد نافذ (0 حصص متبقية)</span>
                                        ) : remainingSessions === 1 ? (
                                          <span className="text-orange-600 font-black">⚠️ متبقي حصة واحدة فقط (1)</span>
                                        ) : (
                                          <span className="text-amber-700 font-black">⚠️ متبقي حصتان فقط (2)</span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0 flex items-center gap-1.5">
                                      <span className="text-[9px] font-mono font-black text-slate-700 bg-white border border-amber-200 px-1.5 py-0.5 rounded">
                                        {remainingSessions} حصص
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLogStudentIds([student.id]);
                                          setIsLogSessionModalOpen(true);
                                          setShowNotifications(false);
                                        }}
                                        className="px-2 py-1 bg-[#1A365D] hover:bg-slate-800 text-white rounded-md text-[9px] font-black cursor-pointer shadow-xs"
                                      >
                                        تسجيل
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Section 1: Placement & Session Notifications */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">التنسيبات وتعديلات المدير ⚡️</span>
                              {hasUnseenNotifications && (
                                <button 
                                  type="button" 
                                  onClick={handleMarkAllNotificationsAsSeen}
                                  className="text-[9px] text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer"
                                >
                                  تحديد الكل كمقروء ✔️
                                </button>
                              )}
                            </div>
                            
                            {instantNotifications.length === 0 ? (
                              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-400 font-bold text-center">
                                لا توجد إشعارات أو تعديلات مسجلة حتى الآن.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {instantNotifications.slice(0, 10).map((n) => (
                                  <div 
                                    key={n.id} 
                                    className={`p-3 rounded-2xl border text-[10px] leading-relaxed transition-all flex flex-col gap-2 ${
                                      !n.seen 
                                        ? (n.type === 'group_course_hours_depleted')
                                          ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
                                          : (n.type === 'student_placement' || n.type === 'student_transfer_in' || n.type === 'trial_migration' || n.type === 'trial_booking')
                                          ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                                          : (n.type === 'student_transfer_out')
                                          ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20'
                                          : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50' 
                                        : 'bg-white border-slate-150 hover:bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        {!n.seen && (
                                          <span className={`w-2.5 h-2.5 rounded-full animate-ping shrink-0 ${
                                            n.type === 'group_course_hours_depleted'
                                              ? 'bg-rose-500'
                                              : (n.type === 'student_placement' || n.type === 'student_transfer_in' || n.type === 'trial_migration' || n.type === 'trial_booking')
                                              ? 'bg-emerald-500'
                                              : (n.type === 'student_transfer_out')
                                              ? 'bg-amber-500'
                                              : 'bg-indigo-500'
                                          }`} />
                                        )}
                                        <span className="text-slate-900 font-black text-xs">
                                          {n.type === 'group_course_hours_depleted'
                                            ? `⏳ ساعات دورة جماعية: ${n.studentName}`
                                            : (n.type === 'student_placement' || n.type === 'student_transfer_in')
                                            ? `🎓 تم إسناد طالب جديد إليك`
                                            : (n.type === 'student_transfer_out')
                                            ? `🔄 تم نقل طالب من قائمتك التعليمية`
                                            : (n.type === 'trial_migration' || n.type === 'trial_booking')
                                            ? `🌟 حصة تجريبية / تنسيب: ${n.studentName}`
                                            : `حصة الطالب: ${n.studentName}`}
                                        </span>
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-mono shrink-0">{n.assignedAt || n.date || 'اليوم'}</span>
                                    </div>
                                    
                                    <div className="text-[10px] text-slate-700 font-medium">
                                      {n.type === 'group_course_hours_depleted' ? (
                                        <div className="space-y-1">
                                          <p className="text-rose-700 font-black">
                                            {n.title || `قارب رصيد ساعات الدورة الجماعية على الانتهاء`}
                                          </p>
                                          <p className="text-slate-600 font-medium">
                                            {n.details || `المادة: ${n.courseTitle || n.subject} - متبقي ${n.remainingHours} س (استهلك ${n.consumedHours} من ${n.allocatedHours} س)`}
                                          </p>
                                        </div>
                                      ) : (n.type === 'student_placement' || n.type === 'student_transfer_in') ? (
                                        <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 space-y-1">
                                          <p className="font-black text-emerald-850 text-xs">"تم إسناد طالب جديد إليك"</p>
                                          <div className="text-[10px] space-y-0.5 text-slate-700">
                                            <p><span className="font-bold text-slate-900">اسم الطالب:</span> {n.studentName}</p>
                                            <p><span className="font-bold text-slate-900">المادة:</span> {n.subject || 'عام'}</p>
                                            <p><span className="font-bold text-slate-900">الصف:</span> {n.studentGrade || 'غير محدد'}</p>
                                            {n.assignedAt && <p><span className="font-bold text-slate-900">تاريخ ووقت الإسناد:</span> {n.assignedAt}</p>}
                                          </div>
                                          <p className="text-emerald-750 font-bold text-[9px] pt-1">يمكنك الآن متابعة الطالب والاطلاع على ملفه.</p>
                                        </div>
                                      ) : n.type === 'student_transfer_out' ? (
                                        <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
                                          <p className="font-black text-amber-900 text-xs">"تم نقل طالب من قائمتك التعليمية"</p>
                                          <div className="text-[10px] space-y-0.5 text-slate-700">
                                            <p><span className="font-bold text-slate-900">اسم الطالب:</span> {n.studentName}</p>
                                            <p><span className="font-bold text-slate-900">المادة:</span> {n.subject || 'عام'}</p>
                                            <p><span className="font-bold text-slate-900">الصف:</span> {n.studentGrade || 'غير محدد'}</p>
                                            {n.newTeacherName && <p><span className="font-bold text-slate-900">المعلم الجديد:</span> {n.newTeacherName}</p>}
                                            {n.assignedAt && <p><span className="font-bold text-slate-900">تاريخ ووقت العملية:</span> {n.assignedAt}</p>}
                                          </div>
                                        </div>
                                      ) : n.type === 'trial_migration' ? (
                                        <span className="text-emerald-700 font-black">🚀 تم ترحيل الطالب من الحصة التجريبية وتنسيبه لحسابك رسمياً!</span>
                                      ) : n.type === 'trial_booking' ? (
                                        <span className="text-blue-700 font-black">📅 تم تنسيب وحجز حصة تجريبية للطالب معك (المادة: {n.subject || 'عام'})</span>
                                      ) : n.type === 'create' ? (
                                        <span className="text-emerald-700 font-black">• تم إضافة حصة دراسية جديدة لك من قبل المدير (المادة: {n.newSubject || 'عام'} - المدة: {n.newDuration || 1} ساعة)</span>
                                      ) : n.durationChanged && n.notesChanged ? (
                                        <span>• تم تعديل ساعات وملاحظات الحصة من قبل المدير</span>
                                      ) : n.durationChanged ? (
                                        <span>• تم تعديل ساعات الحصة من قبل المدير ({n.oldDuration} ➔ {n.newDuration} ساعة)</span>
                                      ) : n.dateChanged ? (
                                        <span>• تم تعديل تاريخ الحصة من قبل المدير ({n.oldDate} ➔ {n.newDate})</span>
                                      ) : n.subjectChanged ? (
                                        <span>• تم تعديل مادة الحصة من قبل المدير ({n.oldSubject} ➔ {n.newSubject})</span>
                                      ) : (
                                        <span>• تم تعديل ملاحظات أو تفاصيل الحصة من قبل المدير</span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mt-1 justify-end">
                                      {(n.type === 'student_placement' || n.type === 'student_transfer_in' || n.type === 'trial_migration' || n.studentId) && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenStudentProfile(n.studentId, n)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[9px] transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                          title="الانتقال مباشرة إلى صفحة ملف الطالب ووضع علامة مقروء"
                                        >
                                          <GraduationCap size={12} />
                                          <span>الانتقال لملف الطالب 📂</span>
                                        </button>
                                      )}

                                      {(n.type === 'student_placement' || n.type === 'student_transfer_in' || n.type === 'trial_migration' || n.type === 'trial_booking') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedPlacementForDetail(n);
                                            setShowNotifications(false);
                                            if (!n.seen) {
                                              handleMarkNotificationAsSeen(n.id);
                                            }
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-black text-[9px] transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <Eye size={11} />
                                          <span>شعار التنسيب 👁️</span>
                                        </button>
                                      )}

                                      {n.type === 'group_course_hours_depleted' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveSubTab('courses');
                                              setShowNotifications(false);
                                              if (!n.seen) {
                                                handleMarkNotificationAsSeen(n.id);
                                              }
                                            }}
                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[9px] transition-all cursor-pointer"
                                          >
                                            الدورات 📚
                                          </button>
                                          {n.parentPhone ? (
                                            <a
                                              href={generateParentGroupCourseDepletionWhatsAppUrl({
                                                teacherName: loggedInTeacher?.name,
                                                studentName: n.studentName,
                                                courseTitle: n.courseTitle || n.subject || 'الدورة الجماعية',
                                                remainingHours: n.remainingHours ?? 0,
                                                allocatedHours: n.allocatedHours,
                                                consumedHours: n.consumedHours,
                                                phone: n.parentPhone
                                              })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={() => {
                                                if (!n.seen) handleMarkNotificationAsSeen(n.id);
                                                setShowNotifications(false);
                                              }}
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-black text-[9px] transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                            >
                                              <MessageSquare size={11} />
                                              <span>واتساب ولي الأمر 💬</span>
                                            </a>
                                          ) : null}
                                        </>
                                      )}

                                      {!n.type?.startsWith('student_') && n.type !== 'trial_migration' && n.type !== 'trial_booking' && n.type !== 'group_course_hours_depleted' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedNotificationForDetail(n);
                                            setShowNotifications(false);
                                            if (!n.seen) {
                                              handleMarkNotificationAsSeen(n.id);
                                            }
                                          }}
                                          className="px-2 py-1 bg-[#D4A33C]/10 text-[#D4A33C] hover:bg-[#D4A33C]/20 rounded-md font-black text-[9px] transition-all cursor-pointer"
                                        >
                                          عرض التفاصيل والتغيير 👁️
                                        </button>
                                      )}
                                      
                                      {!n.seen && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkNotificationAsSeen(n.id)}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[9px] transition-all cursor-pointer"
                                        >
                                          مقروء ✔️
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {instantNotifications.length > 10 && (
                                  <div className="text-[9px] text-slate-400 text-center pt-1 font-bold">
                                    + يظهر آخر {instantNotifications.length} إشعار
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Section 2: General/System Alerts */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-black text-slate-500">التنبيهات الإدارية والأكاديمية العامة 📋</span>
                            
                            {sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === getLocalDateString()).length === 0 ? (
                              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 leading-relaxed font-bold">
                                ⚠️ تنبيه الحصص: لم تقم بتسجيل أي حصة اليوم حتى الآن. يرجى رصد حصصك أولاً بأول للحفاظ على دقة الأرشيف ورصيد حصص الطلاب.
                              </div>
                            ) : (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-700 leading-relaxed font-bold">
                                ✅ رائع! لقد قمت بتمثيل ورصد حصص اليوم بنجاح وذكاء.
                              </div>
                            )}
                            {nextSessionInfo && (
                              <div className="p-2.5 bg-blue-50 border border-blue-105 rounded-xl text-[10px] text-blue-700 leading-relaxed font-bold">
                                ⏰ حصة قادمة: لديك حصة مجدولة قريباً مع الطالب <span className="underline">{nextSessionInfo.studentName}</span> ({nextSessionInfo.remainingStr}).
                              </div>
                            )}
                            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 leading-relaxed font-bold">
                              📌 إرشاد: استخدم المساعد العائم بالذكاء الاصطناعي في الزاوية للحصول على اقتراحات علاجية متكاملة لأي طالب.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Big Action Buttons: Ordered 1st Check Balance (Prominent), 2nd Log Session */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. FIRST & PROMINENT: Check Student Balance & Hours */}
                    <button
                      type="button"
                      onClick={() => {
                        setBalanceCheckerStudentId(linkedStudentsList.length > 0 ? linkedStudentsList[0].id : '');
                        setIsBalanceCheckerModalOpen(true);
                      }}
                      className="px-7 py-4.5 bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-700 hover:from-teal-600 hover:to-emerald-800 text-white rounded-2xl hover:scale-105 hover:shadow-2xl active:scale-95 transition-all shadow-lg shadow-teal-600/30 flex items-center gap-3 cursor-pointer font-black text-sm border-2 border-teal-300 outline-none select-none ring-4 ring-teal-400/25 animate-pulse hover:animate-none"
                      title="فحص رصيد وساعات الحصص المتبقية لجميع الطلاب"
                      id="teacher-primary-check-balance-btn"
                    >
                      <Clock size={19} className="text-amber-300 stroke-[2.5]" />
                      <span>🔍 فحص رصيد وساعات الطلاب</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">أولوية ⭐</span>
                    </button>

                    {/* 2. SECOND: Log Individual Session */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogSessionModalOpen(true);
                      }}
                      className="px-6 py-4.5 bg-gradient-to-r from-amber-500 via-[#D4A33C] to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl hover:scale-105 hover:shadow-xl active:scale-95 transition-all shadow-md shadow-amber-500/30 flex items-center gap-3 cursor-pointer font-black text-xs border border-amber-300 outline-none select-none ring-4 ring-amber-500/15"
                      id="teacher-primary-log-individual-btn"
                    >
                      <Calendar size={16} />
                      <span>🚀 ابدأ / سجل حصة فردية</span>
                    </button>

                    {/* 3. THIRD: Export Balance Statement */}
                    <button
                      type="button"
                      onClick={() => setIsBalanceStatementModalOpen(true)}
                      className="px-5 py-4 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-slate-200 hover:text-white rounded-2xl hover:scale-105 hover:shadow-md active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer font-bold text-xs select-none"
                      title="تصدير كشف حساب الرصيد كملف PDF منظم مع تفاصيل العمليات لكل طالب خلال فترة زمنية محددة"
                    >
                      <FileDown size={16} className="text-amber-300 stroke-[2.2]" />
                      <span>تصدير كشف الرصيد (PDF) 📄</span>
                    </button>

                    {/* 4. FOURTH: Group Course Logging (if active) */}
                    {hasActiveGroupCourse && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubTab('log-group-session');
                          const activeCourses = groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
                          if (activeCourses.length > 0 && !logGroupCourseId) {
                            setLogGroupCourseId(activeCourses[0].id);
                          }
                        }}
                        className="px-5 py-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-750 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-2xl hover:scale-105 hover:shadow-xl active:scale-95 transition-all shadow-md shadow-indigo-500/30 flex items-center gap-2.5 cursor-pointer font-black text-xs border-none outline-none select-none ring-4 ring-indigo-500/15"
                      >
                        <Users size={16} />
                        <span>👥 تسجيل حصة دورة جماعية</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Prominent Welcome New Students / Assigned Notification Card */}
              {recentlyAssignedStudents.length > 0 && !dismissedWelcomeStudentsCard && (
                <WelcomeNewStudentsCard
                  recentlyAssigned={recentlyAssignedStudents}
                  recentStudents={recentlyAssignedStudents}
                  teacherName={loggedInTeacher?.name || 'المعلم'}
                  onOpenStudentProfile={(student, notif) => {
                    handleOpenStudentProfile(student, notif);
                  }}
                  onOpenProfile={(student, notif) => {
                    handleOpenStudentProfile(student, notif);
                  }}
                  onLogSessionForStudent={(student) => {
                    if (!logStudentIds.includes(student.id)) {
                      setLogStudentIds([student.id]);
                    }
                    setClassManagementTab('log');
                    const el = document.getElementById('class-management-master-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onDismiss={() => setDismissedWelcomeStudentsCard(true)}
                />
              )}

              {/* Prominent Teacher Quick Dashboard - Group Courses 2-Session Alerts */}
              <TeacherQuickDashboard
                loggedInTeacher={loggedInTeacher}
                groupCourses={groupCourses}
                students={students}
                sessions={sessions}
                onNavigateToGroupLog={(courseId) => {
                  setActiveSubTab('log-group-session');
                  setLogGroupCourseId(courseId);
                  const el = document.getElementById('class-management-master-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onSelectStudent={(studentId) => {
                  if (!logStudentIds.includes(studentId)) {
                    setLogStudentIds([studentId]);
                  }
                  setClassManagementTab('log');
                  const el = document.getElementById('class-management-master-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onNavigateToTab={(tab) => setActiveSubTab(tab)}
              />

              {/* Compact Unified Alert Strip - Eliminates clutter and scattered cards */}
              {studentsWithLowRemainingSessions.length > 0 && !dismissedLowSessionBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-amber-50/95 border border-amber-300 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-right shadow-sm select-none"
                  id="teacher-low-sessions-compact-strip"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle size={18} className="animate-bounce" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          تنبيه رصيد الحصص: يوجد ({studentsWithLowRemainingSessions.length}) طلاب شارف رصيدهم على النفاد (متبقي حصتان أو أقل)
                        </span>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full">
                          مجمعة بالأيقونة
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        تم تجميع كافة التنبيهات وبطاقات الطلاب المنظمة داخل أيقونة <strong className="text-amber-950 font-black">"تنبيهات"</strong> بأعلى لوحة التحكم لتقليل التشتت البصري.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowNotifications(true)}
                      className="px-4 py-2 bg-[#1A365D] hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Bell size={14} className="text-amber-400" />
                      <span>عرض في التنبيهات 🔔</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedLowSessionBanner(true)}
                      className="px-2.5 py-2 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="إخفاء التنبيه مؤقتاً"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Compact Group Course Hours Depletion Strip */}
              {groupStudentsNearDepletion.length > 0 && !dismissedGroupDepletionBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-rose-50/95 border border-rose-300 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-right shadow-sm select-none"
                  id="teacher-group-course-compact-strip"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Users size={18} className="animate-bounce" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          تنبيه الدورات الجماعية: اقتراب نفاد ساعات ({groupStudentsNearDepletion.length}) طلاب (متبقي 2 س أو أقل)
                        </span>
                        <span className="text-[10px] font-bold text-rose-900 bg-rose-200/90 px-2 py-0.5 rounded-full">
                          مجمعة بالأيقونة
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        تم تجميع تفاصيل الساعات وروابط المراسلة المباشرة داخل أيقونة <strong className="text-rose-950 font-black">"تنبيهات"</strong> بأعلى اللوحة.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowNotifications(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Bell size={14} className="text-amber-300" />
                      <span>عرض في التنبيهات 🔔</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedGroupDepletionBanner(true)}
                      className="px-2.5 py-2 text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="إخفاء التنبيه مؤقتاً"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Prominent Pending Trial Lessons Warning Alert Banner */}
              {(() => {
                const pendingTrialsForTeacher = trialLessons.filter(t => t.teacherId === loggedInTeacher.id && t.status === 'pending');
                if (pendingTrialsForTeacher.length === 0) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: -15 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-amber-50/90 border-2 border-amber-400/60 rounded-3xl p-6 text-right space-y-4 shadow-lg shadow-amber-500/5 relative overflow-hidden"
                  >
                    {/* Animated glow background */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-400/20 pb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center animate-bounce shrink-0 shadow-md shadow-amber-500/25">
                          <Sparkles size={18} className="animate-pulse" />
                        </div>
                        <div className="text-right">
                          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span>لديك {pendingTrialsForTeacher.length} حصة تجريبية جديدة معلّقة بانتظار التنسيق والجدولة! ✨</span>
                          </h2>
                          <p className="text-[10px] text-slate-500 font-bold mt-1">
                            تم إسناد طلبات حصص تجريبية جديدة لك. يرجى التواصل مع الطالب لتحديد الموعد ثم تأكيد المعالجة والإغلاق لتختفي من هذه اللوحة.
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('trials')}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-300 text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer select-none"
                      >
                        <span>الذهاب لإدارة الطلبات بالتفصيل 💫</span>
                        <ArrowRight size={12} className="rotate-180 text-amber-400" />
                      </button>
                    </div>

                    {/* Grid of trials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingTrialsForTeacher.map((trial) => {
                        const localTimeVal = trialTimes[trial.id] ?? trial.scheduledTime ?? '';
                        return (
                          <div key={trial.id} className="bg-white border border-amber-200 rounded-2xl p-4.5 space-y-4 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between">
                            <div className="space-y-3.5">
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <User size={13} className="text-[#D4A33C]" />
                                  <span>الطالب: <strong className="text-[#1A365D] font-extrabold">{trial.studentName}</strong></span>
                                </span>
                                <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black">{trial.grade}</span>
                              </div>
                              
                              {/* Subject & Topic info */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-550">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  <span className="text-slate-450 block font-semibold">المادة المطلوبة:</span>
                                  <span className="text-slate-800 font-extrabold mt-0.5 block">{trial.subject}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  <span className="text-slate-450 block font-semibold">الموضوع المقترح:</span>
                                  <span className="text-slate-800 font-extrabold mt-0.5 block truncate" title={trial.topic}>{trial.topic || '(غير محدد)'}</span>
                                </div>
                              </div>

                              {/* Phone & WhatsApp Quick action */}
                              {trial.phone && (
                                <div className="flex items-center justify-between bg-emerald-50/30 border border-emerald-500/10 p-3 rounded-xl text-[10px]">
                                  <div className="flex flex-col">
                                    <span className="text-slate-550 font-bold">التنسيق الهاتفي والمتابعة:</span>
                                    <span className="text-slate-850 font-black font-mono mt-0.5">{trial.phone}</span>
                                  </div>
                                  <a 
                                    href={`https://wa.me/${trial.phone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
                                  >
                                    <span>واتساب مباشر 💬</span>
                                  </a>
                                </div>
                              )}

                              {/* Inline scheduling inputs */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-black text-slate-400 block">تحديد موعد اللقاء:</span>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="مثال: غداً الساعة 5 عصراً"
                                    value={localTimeVal}
                                    onChange={(e) => setTrialTimes(prev => ({ ...prev, [trial.id]: e.target.value }))}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[10.5px] flex-1 focus:border-amber-400 focus:bg-white transition-all text-right"
                                  />
                                  <button
                                    type="button"
                                    disabled={isSavingTrialTime === trial.id}
                                    onClick={() => handleUpdateTrialTime(trial.id, localTimeVal)}
                                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-[10px] font-black rounded-xl transition-all cursor-pointer whitespace-nowrap select-none"
                                  >
                                    {isSavingTrialTime === trial.id ? 'حفظ...' : 'حفظ الموعد'}
                                  </button>
                                </div>
                                {trial.scheduledTime && (
                                  <p className="text-[9.5px] text-indigo-700 font-black mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                    <span>الموعد المثبت حالياً: {trial.scheduledTime}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Complete Action directly in-card */}
                            <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3">
                              <span className="text-[9.5px] text-slate-400 font-extrabold">عند الانتهاء من الحصة التجريبية:</span>
                              <button
                                type="button"
                                disabled={isClosingTrial === trial.id}
                                onClick={() => handleCompleteTrial(trial.id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap active:scale-[0.98] select-none shrink-0"
                              >
                                {isClosingTrial === trial.id ? (
                                  <Loader2 className="animate-spin" size={11} />
                                ) : (
                                  <>
                                    <ThumbsUp size={11} />
                                    <span>تأكيد المعالجة والإنجاز ✓</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}

              {/* 2. Top Stats Bar (Dashboard) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Classes Today */}
                <div className="bg-white hover:scale-[1.02] duration-300 transition-all rounded-3xl p-5 border border-blue-500/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-sans">اليوم</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
                      <CalendarCheck size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-extrabold block">عدد الحصص اليوم</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-800">{sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === getLocalDateString()).length}</span>
                    <span className="text-[10px] font-bold text-slate-550">جلسات رصدت</span>
                  </div>
                </div>

                {/* 2. Next Session */}
                <div className="bg-white hover:scale-[1.02] duration-300 transition-all rounded-3xl p-5 border border-blue-500/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg">المواعيد</span>
                    <div className="w-10 h-10 rounded-xl bg-sky-100/80 text-sky-600 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-extrabold block">الحصة القادمة (الوقت المتبقي)</p>
                  <p className="text-xs font-black text-slate-800 mt-2 break-words leading-snug">
                    {nextSessionInfo ? (
                      <span className="text-[#1A365D] font-black">{nextSessionInfo.studentName} ({nextSessionInfo.remainingStr})</span>
                    ) : (
                      <span className="text-slate-450">لا يوجد حصص متبقية اليوم</span>
                    )}
                  </p>
                </div>

                {/* 3. Interactive Active Students */}
                <button
                  type="button"
                  onClick={() => setActiveStudentsExpanded(!activeStudentsExpanded)}
                  className="bg-white hover:scale-[1.02] duration-300 transition-all rounded-3xl p-5 border border-emerald-500/10 shadow-sm relative overflow-hidden text-right w-full cursor-pointer group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 rounded-lg flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                      إحصاء تفاعلي
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center">
                      <Users size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-extrabold block">عدد الطلاب النشطين</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-800">{getLinkedStudents().length} طلاب</span>
                    <span className="text-[9px] text-slate-400 font-medium">(اضغط لعرض القائمة تفصيلياً 💬)</span>
                  </div>
                </button>

                {/* 4. Weekly classes */}
                <div className="bg-white hover:scale-[1.02] duration-300 transition-all rounded-3xl p-5 border border-indigo-500/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">التراكمي</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
                      <History size={16} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-extrabold block">عدد الحصص هذا الأسبوع</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-800">{sessionsThisWeekCount}</span>
                    <span className="text-[10px] font-bold text-slate-550">حصص منجزة</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Teacher Educational Sessions & Student Remaining Sessions Banner */}
              <div className="bg-gradient-to-r from-[#0d365a] via-[#164069] to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-slate-700/60">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start sm:items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                    <GraduationCap size={30} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        متابعة الحصص ورصيد الطلاب
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">
                        تحديث فوري ومباشر
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                      سجل الحصص ورصيد الطلاب للأستاذ {loggedInTeacher.name} 🎓
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-xl">
                      متابعة تفصيلية وفورية للحصص المنجزة وساعات التدريس، مع فحص الحصص المتبقية لكل طالب بصيغة منظمة وسهلة.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end relative z-10">
                  {/* KPI Micro stats - Strictly ONLY Remaining Sessions & Educational Hours */}
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-white/15">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-300 block">الحصص المنجزة</span>
                      <span className="text-sm font-black font-mono text-emerald-300" dir="ltr">
                        {teacherSessions.length} حصة
                      </span>
                    </div>
                    <div className="w-px h-7 bg-white/20" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-300 block">ساعات هذا الشهر</span>
                      <span className="text-sm font-black font-mono text-sky-300" dir="ltr">
                        {teacherMonthlyHours.toFixed(1)} س
                      </span>
                    </div>
                    <div className="w-px h-7 bg-white/20" />
                    <div className="text-center">
                      <span className="text-[10px] font-black text-amber-300 block">الحصص المتبقية للطلاب</span>
                      <span className="text-base font-black font-mono text-amber-300" dir="ltr">
                        {(() => {
                          let totalRemaining = 0;
                          linkedStudentsList.forEach(st => {
                            const bal = Number(st.balance) || 0;
                            const r = st.hourlyRate || (st.customRates?.[loggedInTeacher.id]) || loggedInTeacher.billingRate || loggedInTeacher.hourlyRate || 80;
                            const is40 = st.sessionDurationPricingModel === '40min' || (st as any).pricingSystem === '40min';
                            const effRate = is40 ? (r * 40 / 60) : r;
                            const rem = effRate > 0 ? Math.floor(bal / effRate) : 0;
                            totalRemaining += Math.max(0, rem);
                          });
                          return `${totalRemaining} حصة ⏱️`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Big Action Button */}
                  <button
                    type="button"
                    onClick={() => setIsBalanceCheckerModalOpen(true)}
                    className="h-12 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="فحص رصيد وساعات الحصص المتبقية لجميع الطلاب"
                  >
                    <BookOpen size={18} className="text-amber-200 stroke-[2.4]" />
                    <span>فحص الحصص المتبقية للطلاب 🔍</span>
                  </button>
                </div>
              </div>

              {/* Graphical Performance & Financial Dashboard Widget */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white border-2 border-indigo-500/10 rounded-3xl p-6 shadow-sm relative overflow-hidden text-right"
                dir="rtl"
              >
                {/* Visual Glow background accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-105 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">لوحة الإحصائيات والأداء الأكاديمي 📊</h2>
                      <p className="text-[10.5px] text-slate-400 font-bold mt-0.5">تحليل بياني وتفصيلي دقيق لإجمالي ساعات الحصص المنفذة هذا الشهر وتوزيعها الأكاديمي.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 p-1.5 rounded-2xl">
                    <span className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-xl">
                      شهر: {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })} 🗓️
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBalanceCheckerModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black transition-all shadow-xs cursor-pointer active:scale-95"
                      title="فحص رصيد وساعات الحصص المتبقية لجميع الطلاب"
                    >
                      <BookOpen size={13} className="text-amber-300" />
                      <span>فحص الحصص المتبقية ⏱️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExportReportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d365a] hover:bg-[#1a4a75] text-white rounded-xl text-[10px] font-black transition-all shadow-xs cursor-pointer active:scale-95"
                      title="تحميل تقرير شهري تفصيلي بصيغة PDF"
                    >
                      <FileDown size={13} className="text-amber-300" />
                      <span>تصدير تقرير PDF</span>
                    </button>
                  </div>
                </div>

                {/* Grid Layout for Analytics sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Card 1: Monthly Hours circular visual gauge */}
                  <div className="bg-slate-50/50 border border-slate-200/65 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">ساعات هذا الشهر</span>
                      <h3 className="text-sm font-black text-slate-850 mt-1">توزيع ساعات التدريس ورصدها</h3>
                    </div>

                    <div className="flex items-center justify-center py-2 gap-6">
                      {/* Interactive Circular Progress gauge */}
                      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background Ring */}
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            className="stroke-slate-200"
                            strokeWidth="7"
                            fill="transparent"
                          />
                          {/* Progress Ring */}
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            className="stroke-indigo-600 transition-all duration-1000"
                            strokeWidth="7"
                            fill="transparent"
                            strokeDasharray={239}
                            strokeDashoffset={239 - (239 * (teacherMonthlyHours > 0 ? (teacherMonthlyApprovedHours / teacherMonthlyHours) * 100 : 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-base font-black text-slate-900 leading-none">{teacherMonthlyHours.toFixed(1)}</span>
                          <span className="text-[8px] text-slate-400 font-extrabold mt-0.5">ساعة إجمالية</span>
                        </div>
                      </div>

                      {/* Side metrics breakdown */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-500">ساعات معتمدة:</span>
                          </div>
                          <span className="text-[11px] font-black text-indigo-700 font-mono">{teacherMonthlyApprovedHours.toFixed(1)} س</span>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-[10px] font-bold text-slate-500">قيد المراجعة:</span>
                          </div>
                          <span className="text-[11px] font-black text-amber-600 font-mono">{teacherMonthlyPendingHours.toFixed(1)} س</span>
                        </div>
                        <div className="h-px bg-slate-200/80 my-1" />
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black text-slate-700">نسبة الاعتماد:</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {teacherMonthlyHours > 0 ? Math.round((teacherMonthlyApprovedHours / teacherMonthlyHours) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-150 p-2.5 rounded-2xl flex items-center justify-between text-[10px]">
                      <span className="text-slate-450 font-bold">إجمالي الحصص المنفذة هذا الشهر:</span>
                      <span className="text-indigo-700 font-black font-mono text-xs">{teacherMonthlySessions.length} حصص</span>
                    </div>
                  </div>

                  {/* Card 2: Session Approval & Status Metrics */}
                  <div className="bg-slate-50/50 border border-slate-200/65 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">اعتماد وتوثيق الحصص</span>
                      <h3 className="text-sm font-black text-slate-850 mt-1">حالة توثيق واعتماد الدروس</h3>
                    </div>

                    <div className="space-y-3.5 my-1">
                      {/* Approved Sessions Count Card */}
                      <div className="bg-gradient-to-br from-[#1A365D] to-[#2B4C7E] text-white p-3.5 rounded-2xl shadow-sm relative overflow-hidden">
                        <p className="text-[9.5px] text-slate-300 font-bold">الحصص المعتمدة رسمياً من إدارة الأكاديمية ✓</p>
                        <p className="text-lg font-black text-emerald-300 mt-1 font-mono">
                          {teacherSessions.filter(s => s.approved !== false).length} حصة معتمدة
                        </p>
                      </div>

                      {/* Sessions breakdown */}
                      <div className="grid grid-cols-2 gap-2 text-[9.5px] font-bold text-slate-550">
                        <div className="bg-white border border-slate-150 p-2.5 rounded-xl">
                          <span className="text-slate-400 block font-bold">إجمالي الحصص المنجزة:</span>
                          <span className="text-indigo-900 font-black font-mono text-xs mt-0.5 block">
                            {teacherSessions.length} حصة
                          </span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-xl">
                          <span className="text-slate-400 block font-bold">حصص قيد المراجعة:</span>
                          <span className="text-amber-700 font-black font-mono text-xs mt-0.5 block">
                            {teacherSessions.filter(s => s.approved === false).length} حصة
                          </span>
                        </div>
                      </div>

                      {/* Approval Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-extrabold">
                          <span>نسبة الاعتماد الإجمالية:</span>
                          <span>
                            {teacherSessions.length > 0 
                              ? Math.min(100, Math.round((teacherSessions.filter(s => s.approved !== false).length / teacherSessions.length) * 100)) 
                              : 100}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                            style={{ 
                              width: `${teacherSessions.length > 0 
                                ? Math.min(100, (teacherSessions.filter(s => s.approved !== false).length / teacherSessions.length) * 100) 
                                : 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-450 font-medium leading-relaxed">
                      * يتم توثيق الحصص فور تسجيلها ومراجعتها واعتمادها من قبل إدارة المنصة لضمان دقة السجلات الأكاديمية.
                    </p>
                  </div>

                  {/* Card 3: Mini chart and visualization */}
                  <div className="bg-slate-50/50 border border-slate-200/65 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">التحليلات والمخططات</span>
                        <h3 className="text-sm font-black text-slate-850 mt-1">الرسم البياني لتوزيع الحصص</h3>
                      </div>
                      
                      {/* Chart tabs buttons */}
                      <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => setMiniChartType('weekly')}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                            miniChartType === 'weekly'
                              ? 'bg-white text-[#1A365D] shadow-sm font-extrabold'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          أسبوعي 📈
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiniChartType('students')}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                            miniChartType === 'students'
                              ? 'bg-white text-[#1A365D] shadow-sm font-extrabold'
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          الطلاب 👥
                        </button>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-44 flex items-center justify-center bg-white border border-slate-150 rounded-2xl p-2 relative overflow-hidden shadow-sm">
                      {teacherMonthlyHours === 0 ? (
                        <div className="text-center p-3 space-y-1.5 z-10">
                          <p className="text-[10.5px] font-black text-slate-600">لا توجد حصص مرصودة هذا الشهر بعد 📊</p>
                          <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                            قم برصد حصص لطلابك هذا الشهر لتظهر الرسوم البيانية التفاعلية ومخطط الأداء الأسبوعي فوراً هنا.
                          </p>
                        </div>
                      ) : miniChartType === 'weekly' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyHoursData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 8, fill: '#64748b', fontWeight: 'bold' }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <YAxis 
                              tick={{ fontSize: 8, fill: '#64748b' }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip 
                              contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '9.5px', fontWeight: 'bold' }}
                              formatter={(value: any, name: any) => [`${value} ساعة`, 'الحصص المنجزة']}
                            />
                            <Bar dataKey="hours" radius={[5, 5, 0, 0]} barSize={22}>
                              {weeklyHoursData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={index % 2 === 0 ? '#1A365D' : '#D4A33C'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentHoursData} layout="vertical" margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              tick={{ fontSize: 7, fill: '#475569', fontWeight: 'bold' }} 
                              width={70} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip 
                              contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '9.5px' }}
                              formatter={(value: any) => [`${value} ساعة`, 'مجموع الساعات']}
                            />
                            <Bar dataKey="hours" fill="#10b981" radius={[0, 5, 5, 0]} barSize={10}>
                              {studentHoursData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#8b5cf6'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1">
                      <span>* رسم بياني مصغر لآخر تطورات ساعات عملك</span>
                      <span>تحديث فوري ⚡️</span>
                    </div>
                  </div>

                </div>
              </motion.div>

              {/* Today's Logged Sessions Summary Widget */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4" dir="rtl">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3" dir="rtl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1A365D]">ملخص الحصص التي تم رصدها اليوم</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">متابعة فورية للحصص المنجزة والمسجلة بتاريخ اليوم: {getLocalDateString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-lg">
                    إجمالي حصص اليوم: {sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === getLocalDateString()).length}
                  </span>
                </div>

                {sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === getLocalDateString()).length === 0 ? (
                  <div className="text-center py-7 text-slate-450 border border-dashed border-slate-200 rounded-2xl bg-white">
                    <p className="text-[11px] font-black text-slate-600">لا توجد حصص مرصودة باسمك لليوم بعد 📌</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold">قم بتسجيل ورصد حصص الطلاب الفردية أو دورات المجموعات عبر استخدام الأزرار أعلاه لتظهر هنا فوراً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {sessions
                      .filter(s => s.teacherId === loggedInTeacher.id && s.date === getLocalDateString())
                      .map((session, idx) => {
                        const student = students.find(std => std.id === session.studentId);
                        const formatSecDuration = (hours: number = 1) => {
                          if (hours === 0.5) return '30 دقيقة ⏱️';
                          if (hours === 1) return 'ساعة واحدة ⏱️';
                          if (hours === 1.5) return 'ساعة ونصف ⏱️';
                          if (hours === 2) return 'ساعتان ⏱️';
                          return `${hours} ساعة ⏱️`;
                        };
                        return (
                          <div 
                            key={session.id || idx} 
                            className="p-4 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl flex flex-col justify-between transition-all duration-350 hover:scale-[1.01] hover:shadow-md relative overflow-hidden group"
                          >
                            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500/80" />
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-black text-slate-800 break-words leading-snug" title={student ? student.name : 'طالب غير محدد'}>
                                  👤 {student ? student.name : 'طالب غير محدد'}
                                </span>
                                <span className="text-[9px] font-black text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md shrink-0">
                                  📚 {session.subject || 'متابعة'}
                                </span>
                              </div>
                              
                              {session.topic && (
                                <p className="text-[10px] text-slate-650 font-bold mt-2.5 leading-relaxed line-clamp-1">
                                  <span className="text-slate-400">العنوان:</span> {session.topic}
                                </p>
                              )}
                              
                              {session.notes && (
                                <p className="text-[9px] text-slate-400 font-medium mt-1 leading-relaxed line-clamp-2 italic">
                                  "{session.notes}"
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-3 text-[10px] font-bold text-slate-500">
                              <span className="flex items-center gap-1">
                                ⏱️ {formatSecDuration(session.durationHours || 1)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  مكتملة
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="p-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-[10px] font-black border border-rose-150 hover:border-rose-600 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 group/btn"
                                  title="حذف هذه الحصة واسترداد الرصيد للطالب"
                                >
                                  <Trash2 size={12} className="transition-transform group-hover/btn:scale-110" />
                                  <span>حذف الحصة</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 2.4 Unified Upcoming Daily Schedule Section */}
              <div id="unified-upcoming-teacher-schedule-box" className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm text-right" dir="rtl">
                
                {/* Header of Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1A365D]/5 text-[#1A365D] flex items-center justify-center font-bold">
                      <CalendarCheck size={20} className="text-[#1A365D]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#1A365D]">جدول الحصص اليومية القادمة ومواعيد الدورات ⏳</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        رصد وجدولة فورية للحصص المجدولة مسبقاً، اللقاءات التجريبية، والمواعيد الدورية للدورات المشتركة
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions/Quick details */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1.5 rounded-xl border border-blue-100">
                      تاريخ اليوم: {getLocalDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDashboardSelectedDate(getLocalDateString())}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      العودة لليوم 📍
                    </button>
                  </div>
                </div>

                {/* 7-Days Visual Schedule Navigation Slider */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dateStr = day.dateStr;
                    let count = 0;
                    
                    // 1. Private
                    count += sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === dateStr).length;
                    
                    // 2. Trials
                    count += trialLessons.filter(t => t.teacherId === loggedInTeacher.id && t.scheduledDate === dateStr).length;
                    
                    // 3. Courses recurring times
                    const dayOfWeek = new Date(dateStr).getDay();
                    const activeCourses = groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
                    activeCourses.forEach(c => {
                      const days = parseArabicDays(c.classTime || '');
                      if (days.includes(dayOfWeek)) {
                        count++;
                      }
                    });

                    const isSelected = dashboardSelectedDate === dateStr;

                    return (
                      <button
                        type="button"
                        key={dateStr}
                        onClick={() => setDashboardSelectedDate(dateStr)}
                        className={`p-3 rounded-2xl border text-center flex flex-col justify-between items-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-md scale-[1.03] font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-[9px] block uppercase ${isSelected ? 'text-amber-300 font-black' : 'text-slate-400 font-bold'}`}>
                            {day.isToday ? 'اليوم' : day.dayName}
                          </span>
                          <span className="text-sm font-extrabold block">
                            {day.dayNum}
                          </span>
                        </div>
                        
                        <div className="mt-2.5">
                          {count > 0 ? (
                            <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black block ${
                              isSelected ? 'bg-amber-400 text-slate-900' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {count} {count === 1 ? 'حصة' : 'حصص'}
                            </span>
                          ) : (
                            <span className={`text-[8px] font-bold block ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                              فارغ ☕
                            </span>
                          )}
                        </div>

                        {day.isToday && (
                          <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-rose-500'} animate-pulse`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Filters Row: Type Filter & Internal Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                  
                  {/* Select filters */}
                  <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    {[
                      { id: 'all', label: 'كافة الحصص 🔍' },
                      { id: 'private', label: 'فردية 👤' },
                      ...(hasActiveGroupCourse ? [{ id: 'course', label: 'دورات جماعية 👥' }] : []),
                      { id: 'trial', label: 'تجريبية 🌠' }
                    ].map(tab => (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setUpcomingTypeFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border cursor-pointer ${
                          upcomingTypeFilter === tab.id
                            ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] font-black shadow-sm'
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Day Search input */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={12} />
                    </span>
                    <input
                      type="text"
                      placeholder="ابحث باسم الطالب أو المادة..."
                      value={upcomingSearch}
                      onChange={(e) => setUpcomingSearch(e.target.value)}
                      className="w-full text-[10px] font-bold text-slate-750 pr-8 pl-3 py-2 bg-white border border-slate-250 rounded-xl focus:border-blue-500 focus:outline-none placeholder-slate-400"
                    />
                    {upcomingSearch && (
                      <button
                        onClick={() => setUpcomingSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[9px] bg-slate-100 hover:bg-slate-200 rounded-full w-4.5 h-4.5 flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Schedule List Section */}
                <div className="space-y-3.5">
                  {(() => {
                    const dateStr = dashboardSelectedDate;
                    const dayOfWeek = new Date(dateStr).getDay();
                    const dayItems: any[] = [];

                    // 1. Private sessions
                    const dayPrivate = sessions.filter(s => 
                      s.teacherId === loggedInTeacher.id && 
                      s.date === dateStr
                    );
                    dayPrivate.forEach(s => {
                      const studentObj = students.find(st => st.id === s.studentId);
                      const studentName = studentObj ? studentObj.name : 'طالب غير محدد';
                      const isCompleted = s.status === 'completed' || s.approved;
                      const statusLabel = isCompleted ? 'مكتملة ومؤكدة ✓' : 'حصة معلقة بانتظار الرصد والتحقق ⏳';
                      const badgeColor = isCompleted 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                        : 'bg-amber-50 text-[#D4A33C] border-amber-200/55';

                      dayItems.push({
                        id: s.id,
                        type: 'private',
                        title: `حصة فردية - الطالب: ${studentName}`,
                        time: s.startTime || 'غير محدد',
                        subject: s.subject || 'مادة تعليمية',
                        studentName,
                        topic: s.topic || 'لا يوجد تفاصيل إضافية موضوعة',
                        statusLabel,
                        badgeColor,
                        isCompleted,
                        rawObj: s
                      });
                    });

                    // 2. Trials
                    const dayTrials = trialLessons.filter(t => 
                      t.teacherId === loggedInTeacher.id && 
                      t.scheduledDate === dateStr
                    );
                    dayTrials.forEach(t => {
                      const studentName = t.studentName || t.parentName || 'طالب زائر';
                      const isCompleted = t.status === 'completed';
                      const statusLabel = isCompleted ? 'تجريبية مكتملة ✓' : 'لقاء تجريبي مجدول قادم 🌠';
                      const badgeColor = isCompleted 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                        : 'bg-[#FFF2E6] text-[#FF8000] border-[#FFD9B3]';

                      dayItems.push({
                        id: t.id,
                        type: 'trial',
                        title: `حصة تجريبية - الطالب: ${studentName}`,
                        time: t.scheduledTime || 'غير محدد',
                        subject: t.subject || 'تأسيس وتقييم',
                        studentName,
                        topic: `رقم الهاتف: ${t.studentPhone || t.phone || 'غير مسجل'}`,
                        statusLabel,
                        badgeColor,
                        isCompleted,
                        rawObj: t
                      });
                    });

                    // 3. Courses
                    const activeCourses = groupCourses.filter(c => 
                      c.teacherId === loggedInTeacher.id && 
                      c.status?.toLowerCase() === 'active'
                    );
                    activeCourses.forEach(c => {
                      const days = parseArabicDays(c.classTime || '');
                      if (days.includes(dayOfWeek)) {
                        let timeLabel = c.classTime || 'غير محدد';
                        const timeMatch = timeLabel.match(/\(([^)]+)\)/);
                        if (timeMatch) {
                          timeLabel = timeMatch[1];
                        }

                        dayItems.push({
                          id: `course-${c.id}-${dayOfWeek}`,
                          type: 'course',
                          title: `دورة جماعية: ${c.name || c.title}`,
                          time: timeLabel,
                          subject: c.subject || 'مقرر الكورس',
                          studentName: `طلاب المجموعة (${c.studentIds?.length || 0} طالباً)`,
                          topic: `الرمز الأكاديمي: ${c.code || 'غير محدد'} | المنجز: ${c.loggedHours || c.completedHours || 0} من ${c.totalHours || 0} ساعات`,
                          statusLabel: 'دورة جماعية نشطة مجدولة دورياً 👥',
                          badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-150',
                          isCompleted: false,
                          rawObj: c
                        });
                      }
                    });

                    // Sort by time
                    dayItems.sort((a, b) => {
                      const tA = a.time || '00:00';
                      const tB = b.time || '00:00';
                      return tA.localeCompare(tB);
                    });

                    // Filter by type
                    let filteredItems = upcomingTypeFilter === 'all' 
                      ? dayItems 
                      : dayItems.filter(item => item.type === upcomingTypeFilter);

                    // Filter by search
                    if (upcomingSearch.trim()) {
                      const searchLower = upcomingSearch.toLowerCase();
                      filteredItems = filteredItems.filter(item => 
                        (item.title || '').toLowerCase().includes(searchLower) ||
                        (item.subject || '').toLowerCase().includes(searchLower) ||
                        (item.studentName || '').toLowerCase().includes(searchLower)
                      );
                    }

                    if (filteredItems.length === 0) {
                      return (
                        <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center text-slate-450 bg-slate-50/50">
                          <p className="text-xs font-black text-slate-700">لا يوجد مواعيد أو حصص تطابق الخيارات المحددة لهذا اليوم 🏖️</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-bold">
                            استغل هذا الفراغ في التخطيط الأكاديمي، إسناد الواجبات، أو مراجعة لوحة المعايير والمناهج!
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(item => {
                          return (
                            <div 
                              key={item.id}
                              className="bg-white border border-slate-200 hover:border-[#1A365D]/40 hover:scale-[1.01] hover:shadow-md rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-all text-right"
                            >
                              <div className={`absolute top-0 right-0 left-0 h-1 ${
                                item.type === 'private' ? 'bg-emerald-500' : item.type === 'trial' ? 'bg-amber-500' : 'bg-indigo-600'
                              }`} />
                              
                              <div className="space-y-2.5 text-right w-full">
                                <div className="flex items-start justify-between gap-1.5 w-full">
                                  <span className="text-[10px] text-slate-400 font-black flex items-center gap-1 shrink-0">
                                    <Clock size={11} className="text-[#D4A33C]" />
                                    <span>{item.time}</span>
                                  </span>
                                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md border shrink-0 ${item.badgeColor}`}>
                                    {item.statusLabel}
                                  </span>
                                </div>

                                <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-1" title={item.title}>
                                  {item.title}
                                </h4>

                                <div className="space-y-1">
                                  <p className="text-[10px] text-slate-650 font-black leading-relaxed">
                                    <span className="text-slate-400">📚 المادة:</span> {item.subject}
                                  </p>
                                  {item.topic && (
                                    <p className="text-[9.5px] text-slate-500 font-bold leading-relaxed line-clamp-1">
                                      <span className="text-slate-400">📝 العنوان:</span> {item.topic}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-3 mt-3.5 flex items-center justify-between gap-2.5">
                                <span className="text-[8.5px] text-[#1A365D] bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 font-black shrink-0">
                                  {item.type === 'private' ? '👤 حصة فردية' : item.type === 'trial' ? '🌠 تجريبية مجانية' : '👥 كورس مشترك/دورة'}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.type === 'private' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLogStudentIds([item.rawObj.studentId]);
                                        setLogSubject(item.rawObj.subject || '');
                                        setLogTopic(item.rawObj.topic || '');
                                        setLogDate(item.rawObj.date || getLocalDateString());
                                        setClassManagementTab('log');
                                        const el = document.getElementById('class-management-master-card');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        triggerToast("🚀 تم تحميل تفاصيل الحصة الفردية لنموذج الرصد أدناه!");
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-xl transition-all cursor-pointer shadow-sm border-none"
                                    >
                                      رصد الحصة 🚀
                                    </button>
                                  )}

                                  {item.type === 'course' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLogGroupCourseId(item.rawObj.id);
                                        setActiveSubTab('log-group-session');
                                        const el = document.getElementById('teacher-main-tabs-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        triggerToast(`👥 تم توجيهك لرصد حصة المجموعة (${item.rawObj.name || item.rawObj.title})!`);
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-xl transition-all cursor-pointer shadow-sm border-none"
                                    >
                                      رصد جماعي 👥
                                    </button>
                                  )}

                                  {item.type === 'trial' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSubTab('trials');
                                        const el = document.getElementById('teacher-main-tabs-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                      }}
                                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] rounded-xl transition-all cursor-pointer shadow-sm border-none"
                                    >
                                      عرض الطلب 🌠
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Info Note in footer of upcoming classes */}
                <div className="text-[8.5px] text-slate-400 font-bold bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between gap-2 border border-slate-150">
                  <span>
                    💡 ملاحظة: يتم رصد الدورات وتحديث الساعات والحصص المتبقية تلقائياً بمجرد تأكيد درس المجموعة.
                  </span>
                  <span className="text-[#1A365D] font-black">أكاديمية المعلمين المعتمدة</span>
                </div>
              </div>

              {/* 2.5 Quick Actions Dashboard Grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3" dir="rtl">
                  <h3 className="text-xs font-black text-[#1A365D] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-650 flex items-center justify-center text-xs">🛠️</span>
                    <span>الأدوات الأكاديمية والعمليات السريعة للمعلم</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">الوصول السريع لجميع المهام والتقارير الأكاديمية</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5" dir="rtl">
                  
                  {/* Option 1: Log Group Session */}
                  {hasActiveGroupCourse && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab('log-group-session');
                        const activeCourses = groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'));
                        if (activeCourses.length > 0 && !logGroupCourseId) {
                          setLogGroupCourseId(activeCourses[0].id);
                        }
                      }}
                      className="p-4 bg-white hover:bg-slate-50 border border-slate-201 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 duration-300">
                        <Users size={20} />
                      </div>
                      <span className="text-[11px] font-black text-slate-800 block">رصد درس جماعي 👥</span>
                      <span className="text-[9px] text-slate-400 font-bold block leading-normal line-clamp-2">رصد وحسم حصص المجموعات والكورسات المشتركة</span>
                    </button>
                  )}

                  {/* Option 2: Interactive Calendar */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('calendar')}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-201 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-110 duration-300">
                      <CalendarPlus size={20} />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 block">التقويم والجدولة 📅</span>
                    <span className="text-[9px] text-slate-400 font-bold block leading-normal line-clamp-2">حجز وإدارة مواعيد وتحديد توفر الساعات للطلبة</span>
                  </button>

                  {/* Option 3: AI Planner / Advisor */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('ai-planner')}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-201 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center group-hover:scale-110 duration-300">
                      <Sparkles size={20} />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 block">مستشار الدروس (AI) 🧠</span>
                    <span className="text-[9px] text-slate-400 font-bold block leading-normal line-clamp-2">تخطيط الدروس بالذكاء الصناعي وإنشاء خطط ومواد</span>
                  </button>

                  {/* Option 4: Tasks Enablement */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tasks')}
                    className={`p-4 bg-white hover:bg-slate-50 border border-slate-201 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350 ${!loggedInTeacher.tasksEnabled ? 'opacity-50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 duration-300">
                      <CheckSquare size={20} />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 block">الواجبات والمهام 📝</span>
                    <span className="text-[9px] text-slate-400 font-bold block leading-normal line-clamp-2">إسناد وتعيين واجبات جديدة ومتابعة حلولها</span>
                  </button>

                  {/* Option 4.5: Tasks Evaluation */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tasks-evaluation')}
                    className={`p-4 bg-white hover:bg-slate-50 border border-slate-201 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350 ${!loggedInTeacher.tasksEnabled ? 'opacity-50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-705 flex items-center justify-center group-hover:scale-110 duration-300">
                      <BookmarkCheck size={20} />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 block">تصحيح الواجبات ⭐</span>
                    <span className="text-[9px] text-slate-400 font-bold block leading-normal line-clamp-2">تقييم حلول الواجبات ورصد مستويات الطلاب</span>
                  </button>

                  {/* Option 5: Trial Sessions */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('trials')}
                    className={`p-4 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350 ${
                      pendingTrialsCount > 0
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse'
                        : 'bg-white hover:bg-slate-50 border border-slate-201'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 duration-300 relative ${
                      pendingTrialsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {pendingTrialsCount > 0 ? (
                        <>
                          <MessageSquare size={20} className="animate-bounce" />
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                          </span>
                        </>
                      ) : (
                        <Award size={20} />
                      )}
                    </div>
                    <span className={`text-[11px] font-black block ${pendingTrialsCount > 0 ? 'text-amber-950 font-extrabold' : 'text-slate-800'}`}>
                      {pendingTrialsCount > 0 ? 'لديك رسائل تجريبية معلّقة! 💬' : 'الحصص التجريبية 💫'}
                    </span>
                    <span className={`text-[9px] font-bold block leading-normal line-clamp-2 ${pendingTrialsCount > 0 ? 'text-amber-700/90' : 'text-slate-400'}`}>
                      {pendingTrialsCount > 0 ? `هناك ${pendingTrialsCount} حصة تجريبية معلّقة بانتظار معالجتك الفورية.` : 'متابعة طلبات التأسيس والتجريب المجاني للطلاب'}
                    </span>
                  </button>

                  {/* Option: Xournal++ PDF Markup & Interactive Whiteboard */}
                  {whiteboardEnabled && (
                    <div
                      onClick={() => {
                        setWhiteboardModalMode('xournal');
                        setIsWhiteboardModalOpen(true);
                      }}
                      className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 hover:border-emerald-400 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350 relative select-none"
                      id="teacher-xournal-subtab-card"
                      title="فتح دفتر Xournal++ الذكي لتدوين وشرح ملفات الـ PDF مع إدراج صفحات بيضاء ومسطرة ديناميكياً"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center group-hover:scale-110 duration-300 shadow-md shadow-emerald-500/30">
                        <BookOpen size={18} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-900 block">دفتر Xournal++ وشرح الـ PDF 📓</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhiteboardNewTab(e, 'xournal');
                          }}
                          className="p-1 hover:bg-emerald-200/80 rounded-md text-emerald-800 transition-colors"
                          title="فتح Xournal++ في تبويب متصفح مستقل جديد ↗"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                      <span className="text-[9px] text-emerald-950 font-bold block leading-normal line-clamp-2">
                        تدوين وشرح PDF + إدراج صفحات بيضاء ومسطرة وشبكية ديناميكية ودعم القلم الرقمي
                      </span>
                    </div>
                  )}

                  {/* Option 6: Online Exams & Submissions */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('online-exams')}
                    className="p-4 bg-[#EEF2FF] hover:bg-indigo-50 border border-indigo-150 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350"
                    id="teacher-exams-subtab-card"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-650 text-white flex items-center justify-center group-hover:scale-110 duration-300 shadow-md">
                      <BookOpen size={18} />
                    </div>
                    <span className="text-[11px] font-black text-indigo-900 block">الامتحانات الإلكترونية 📝</span>
                    <span className="text-[9px] text-indigo-500 font-black block leading-normal line-clamp-2">صناعة وتصدير اختبارات تفاعلية، ورصد نتائج الطلاب بالاسم ورقم الهاتف</span>
                  </button>

                  {/* Option 7: Educational Materials & Pedagogical AI */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('educational-library')}
                    className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50/40 hover:from-emerald-100/70 hover:to-indigo-100/70 border border-emerald-200/80 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-sm group duration-350 relative"
                    id="teacher-educational-library-subtab-card"
                  >
                    <span className="absolute top-2 left-2 text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md shadow-xs">
                      جديد ✨
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center group-hover:scale-110 duration-300 shadow-md">
                      <BookOpenCheck size={20} />
                    </div>
                    <span className="text-[11px] font-black text-emerald-950 block">المواد والمصادر التعليمية 📚</span>
                    <span className="text-[9px] text-emerald-800/90 font-bold block leading-normal line-clamp-2">
                      المراجع المعتمدة، بنك الأسئلة، الشروحات والاختبارات الذكية
                    </span>
                  </button>

                  {/* Option 8: AI Curriculum Generator & Blooms Taxonomy & VEB Chemistry Sources (Teacher Exclusive) */}
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('curriculum-generator')}
                    className="p-4 bg-gradient-to-br from-emerald-950/20 via-teal-900/10 to-slate-900/60 hover:from-emerald-900/30 hover:to-teal-800/30 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl flex flex-col items-center text-center justify-center gap-2.5 transition-all hover:scale-102 cursor-pointer shadow-md group duration-350 relative"
                    id="teacher-curriculum-generator-card"
                  >
                    <span className="absolute top-2 left-2 text-[8px] font-black bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-md shadow-xs animate-pulse">
                      حصري 🧪
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center group-hover:scale-110 duration-300 shadow-md">
                      <FlaskConical size={20} strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-black text-emerald-300 block">توليد المناهج والمخرجات 🧪</span>
                    <span className="text-[9px] text-emerald-400/90 font-bold block leading-normal line-clamp-2">
                      هرم بلوم، تصنيف نواتج التعلم، ورفع وإدارة المصادر المعتمدة (VEB Chemistry)
                    </span>
                  </button>

                </div>
              </div>

              {/* Expandable Active Students detail list widget */}
              <AnimatePresence>
                {activeStudentsExpanded && (
                  <motion.div
                    key="active-students-expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-3xl border border-slate-205 p-6 shadow-sm overflow-hidden text-right"
                  >
                    <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-slate-800">قائمة الطلاب النشطين تفصيلياً مع آخر نشاط</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveStudentsExpanded(false)}
                        className="text-xs text-slate-450 hover:text-slate-700 font-bold"
                      >
                        إغلاق القائمة التفاعلية ×
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getLinkedStudents().map(student => {
                        const studentSessions = sessions.filter(s => s.studentId === student.id && s.teacherId === loggedInTeacher.id);
                        let lastActivityText = 'لا توجد حصص مسجلة بعد';
                        if (studentSessions.length > 0) {
                          studentSessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                          const lastS = studentSessions[0];
                          lastActivityText = `حصة ${lastS.subject || 'متابعة'} في ${lastS.date} (${lastS.topic || 'لا توجد تفاصيل'})`;
                        }
                        const balance = calculateStudentBalance(student.id);
                        const remaining = getStudentRemainingSessions(student.id);
                        const isLow = remaining <= 2;

                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              if (!logStudentIds.includes(student.id)) {
                                setLogStudentIds([student.id]);
                              }
                              setClassManagementTab('log');
                              const el = document.getElementById('class-management-master-card');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 border ${
                              isLow
                                ? remaining <= 0
                                  ? 'bg-rose-50/40 hover:bg-rose-50 border-rose-200'
                                  : remaining === 1
                                  ? 'bg-orange-50/40 hover:bg-orange-50 border-orange-200'
                                  : 'bg-amber-50/40 hover:bg-amber-50 border-amber-200'
                                : 'bg-emerald-50/30 hover:bg-emerald-50 border-emerald-500/10'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{student.name}</p>
                                  <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black mt-1 inline-block">
                                    {student.grade || student.academicLevel || 'طالب'}
                                  </span>
                                </div>
                                
                                {isLow ? (
                                  remaining <= 0 ? (
                                    <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0 border border-rose-200 flex items-center gap-1">
                                      <AlertCircle size={10} />
                                      0 حصص
                                    </span>
                                  ) : remaining === 1 ? (
                                    <span className="text-[9px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0 border border-orange-200 flex items-center gap-1">
                                      <AlertTriangle size={10} />
                                      متبقي حصة (1)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0 border border-amber-200 flex items-center gap-1">
                                      <AlertTriangle size={10} />
                                      متبقي حصتان (2)
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black shrink-0">
                                    {remaining} حصص
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-2">آخر نشاط للمعلم:</p>
                              <p className="text-[10px] text-slate-650 font-bold mt-1 line-clamp-1">{lastActivityText}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 3. Main Dashboard Double Column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Right Area (col-span-8): Unified "إدارة الحصص" Card */}
                <div className="lg:col-span-8 space-y-6" id="class-management-master-card">
                  <div className="bg-white rounded-3xl border border-blue-500/10 shadow-sm overflow-hidden">
                    
                    {/* Header and inner tab bar */}
                    <div className="bg-slate-50 border-b border-slate-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <CalendarCheck size={18} />
                        </div>
                        <div className="text-right">
                          <h2 className="text-xs font-extrabold text-[#1A365D]">بطاقة إدارة الحصص الشاملة 📝</h2>
                          <p className="text-[9px] text-slate-400 font-bold">رصد الحصص، وأرشفة السجل وتتبع الفواتير المتكاملة في وجهة واحدة ميسرة.</p>
                        </div>
                      </div>

                      {/* Switchers inside main card */}
                      <div className="flex gap-1.5 bg-slate-200/60 p-1.5 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => setClassManagementTab('log')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                            classManagementTab === 'log' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          تسجيل حصة
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassManagementTab('history')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                            classManagementTab === 'history' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          سجل الحصص
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassManagementTab('reminders')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                            classManagementTab === 'reminders' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          تذكير الحصص والمواعيد
                        </button>
                      </div>
                    </div>

                    {/* Content view panels */}
                    <div className="p-6">
                      
                      {/* Sub-tab 1: Quick Log Form */}
                      {classManagementTab === 'log' && (
                        <div className="space-y-5 animate-fade-in text-right">
                          
                          {/* اختيار نظام الحصة في بداية التسجيل */}
                          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                              <div>
                                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-amber-600" />
                                  <span>اختيار نظام الحصة في بداية التسجيل:</span>
                                </span>
                                <p className="text-[10px] text-amber-900/80 font-bold mt-0.5">
                                  حدد نظام الاحتساب للحصة (نظام 40 دقيقة معتمد أو نظام الساعات 60 دقيقة) لرصد وتوثيق الحصة فورياً.
                                </p>
                              </div>
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full border self-start sm:self-auto ${
                                isSession40Mode
                                  ? 'bg-amber-200 text-amber-950 border-amber-400 font-black'
                                  : 'bg-blue-100 text-blue-900 border-blue-300 font-black'
                              }`}>
                                {isSession40Mode 
                                  ? '🎓 نظام 40 دقيقة مُختار' 
                                  : (hasSecondaryStudent || hasMiddleStudent)
                                  ? '⏱️ نظام الساعات (إلزامي للثانوي والإعدادي)' 
                                  : '⏱️ نظام الساعات مُختار'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Option 1: 40-Minute Session */}
                              <button
                                type="button"
                                disabled={hasSecondaryStudent || hasMiddleStudent}
                                onClick={() => {
                                  if (hasSecondaryStudent || hasMiddleStudent) {
                                    alert('تنبيه: طلاب المرحلتين الثانوية والإعدادية معتمدون حصراً بنظام الساعات (60 دقيقة) ولا يمكن تسجيل حصصهم بنظام 40 دقيقة.');
                                    return;
                                  }
                                  setSessionPricingSystemChoice('session_40');
                                  setIsPricingSystemManuallyChanged(true);
                                  setLogDurationMinutes(40);
                                }}
                                className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-3 ${
                                  (hasSecondaryStudent || hasMiddleStudent)
                                    ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400'
                                    : isSession40Mode
                                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/50'
                                    : 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700'
                                }`}
                                title={(hasSecondaryStudent || hasMiddleStudent) ? 'مغلق: طلاب الثانوي والإعدادي بنظام الساعات فقط' : 'نظام الحصة 40 دقيقة'}
                              >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  (hasSecondaryStudent || hasMiddleStudent)
                                    ? 'bg-slate-200 text-slate-400'
                                    : isSession40Mode ? 'bg-slate-950 text-amber-400 shadow-xs' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {(hasSecondaryStudent || hasMiddleStudent) ? <Lock size={16} /> : <GraduationCap size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-xs">نظام الحصة 40 دقيقة</span>
                                    {(hasSecondaryStudent || hasMiddleStudent) ? (
                                      <span className="text-[8px] bg-slate-300 text-slate-700 font-black px-1.5 py-0.5 rounded">
                                        مغلق للثانوي والإعدادي 🔒
                                      </span>
                                    ) : isSession40Mode ? (
                                      <span className="text-[9px] bg-slate-950 text-white font-black px-1.5 py-0.5 rounded">
                                        مُفعّل ✓
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className={`text-[9px] block mt-0.5 ${(hasSecondaryStudent || hasMiddleStudent) ? 'text-slate-400 font-bold' : isSession40Mode ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-medium'}`}>
                                    {(hasSecondaryStudent || hasMiddleStudent) ? 'طلاب الثانوي والإعدادي فقط ساعات' : '1 حصة = 40 د • 1.5 حصة = 60 د • 2 حصة = 80 د'}
                                  </span>
                                </div>
                              </button>

                              {/* Option 2: Hourly Session */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSessionPricingSystemChoice('hourly');
                                  setIsPricingSystemManuallyChanged(true);
                                  setLogDurationMinutes(60);
                                }}
                                className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-3 ${
                                  !isSession40Mode
                                    ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-md ring-2 ring-blue-400/50'
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  !isSession40Mode ? 'bg-white/20 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Clock size={17} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-xs">نظام الساعات (60 دقيقة)</span>
                                    {!isSession40Mode && (
                                      <span className="text-[9px] bg-white text-slate-900 font-black px-1.5 py-0.5 rounded">
                                        مُفعّل تلقائياً ✓
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[9px] block mt-0.5 ${!isSession40Mode ? 'text-blue-100 font-extrabold' : 'text-slate-500 font-medium'}`}>
                                    {isSecondaryOrMiddleSelected 
                                      ? 'تلقائي معتمد للمرحلتين الثانوية والإعدادية (30 د • 60 د • 90 د • 120 د)' 
                                      : 'ساعة تدريسية كاملة (30 د • 60 د • 90 د • 120 د)'}
                                  </span>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Student checkbox select array */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-700 mb-2">2. حدد الطلاب المنسوبين للحصة للحفظ بالخادم:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                              {getLinkedStudents().map(s => {
                                const isSelected = logStudentIds.includes(s.id);
                                const balance = calculateStudentBalance(s.id);
                                const rate = getStudentDefaultHourlyRate(s, settings, loggedInTeacher);
                                const durationHours = logDurationMinutes / 60;
                                const sessionCost = durationHours * rate;
                                const threshold = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : (globalThreshold || 50);
                                const isLowOrDepleting = (balance < sessionCost) || (balance - sessionCost <= threshold) || (balance <= threshold);
                                const isOpenAccount = !!s.isOpenBalance;

                                return (
                                  <label
                                    key={s.id}
                                    className={`p-2.5 border rounded-xl flex items-center justify-between cursor-pointer select-none transition-all ${
                                      isSelected ? 'bg-blue-50 border-blue-500/50 text-blue-800 scale-102 font-black' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          if (isSelected) {
                                            setLogStudentIds(prev => prev.filter(x => x !== s.id));
                                          } else {
                                            setLogStudentIds(prev => [...prev, s.id]);
                                          }
                                        }}
                                        className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                      />
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] font-black">{s.name}</span>
                                          {isStudentSession40Mode(s) ? (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-100 text-amber-950 font-black px-1 rounded border border-amber-300 shrink-0">
                                              <GraduationCap size={9} className="text-amber-700" />
                                              40 د
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] bg-blue-100 text-blue-950 font-black px-1 rounded border border-blue-200 shrink-0">
                                              <Clock size={8} className="text-blue-700" />
                                              ساعات
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-[9px] font-bold ${isOpenAccount ? 'text-emerald-700 font-black' : balance <= 0 ? 'text-rose-600' : balance <= threshold ? 'text-amber-600' : 'text-slate-400'}`}>
                                          {isOpenAccount ? 'رصيد مفتوح من المدير 🔓' : formatRemainingSessionsText(balance, sessionCost)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Low Balance Warning Badge when manager has NOT enabled open account */}
                                    {isLowOrDepleting && !isOpenAccount && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse shrink-0" title="الرصيد قارب على النفاذ والمدير لم يفعّل خيار الحساب المفتوح!">
                                        ⚠️ رصيد منخفض (غير مفعّل حساب مفتوح)
                                      </span>
                                    )}

                                    {/* Open Account Enabled Badge from Manager */}
                                    {isOpenAccount && (
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1 shadow-2xs" title="اختار مدير المنصة أن يكون رصيد هذا الطالب مفتوحاً">
                                        <span>رصيد مفتوح من المدير</span>
                                        <span>🔓</span>
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Row with Subject and Topic */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-black text-slate-700 mb-1.5">2. اختيار المادة التعليمية:</label>
                              {loggedInTeacher.subjects && loggedInTeacher.subjects.length === 1 ? (
                                <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl font-bold text-xs flex items-center justify-between h-[38px]" dir="rtl">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    <span className="text-slate-500 font-bold">تم الاختيار تلقائياً لتخصصك:</span>
                                    <span className="font-extrabold text-[#D4A33C]">{loggedInTeacher.subjects[0]}</span>
                                  </div>
                                  <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-lg shrink-0">مادة وحيدة ✨</span>
                                </div>
                              ) : (
                                <select
                                  value={logSubject}
                                  onChange={(e) => setLogSubject(e.target.value)}
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-sans pr-10 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                >
                                  <option value="">-- اختر المادة --</option>
                                  {(loggedInTeacher.subjects && loggedInTeacher.subjects.length > 0
                                    ? loggedInTeacher.subjects
                                    : ["الرياضيات", "اللغة الإنجليزية", "اللغة العربية", "اللغة العبرية", "الفيزياء", "الكيمياء", "متابعة عامة وتأسيس"]
                                  ).map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-black text-slate-700 mb-1.5">3. الجانب التعليمي والمحتوى (الموضوع الدقيق للبحث):</label>
                              <input
                                type="text"
                                value={logTopic}
                                onChange={(e) => setLogTopic(e.target.value)}
                                placeholder="مثال: مراجعة هندسة تحليلية، حل نماذج بجروت 2025"
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold pr-3 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Row with Date and duration */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-black text-slate-700 mb-1.5">4. تاريخ الحصة مسبقاً/حالياً:</label>
                              <input
                                type="date"
                                value={logDate}
                                onChange={(e) => setLogDate(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-center focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-[11px] font-black text-slate-700">
                                  {isSession40Mode ? '5. عدد الحصص والمدة المعتمدة:' : '5. مدة الجلسة التعليمية بالساعات:'}
                                </label>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                                  isSession40Mode 
                                    ? 'bg-amber-100 text-amber-950 border-amber-300' 
                                    : 'bg-blue-100 text-blue-900 border-blue-200'
                                }`}>
                                  {isSession40Mode ? '🎓 نظام 40 دقيقة (مضبوط من المدير)' : '⏱️ نظام الساعات (مضبوط من المدير)'}
                                </span>
                              </div>

                              {/* Quick Visual Duration Buttons */}
                              <div className={`grid gap-1.5 mb-2 ${isSession40Mode ? 'grid-cols-4' : 'grid-cols-5'}`}>
                                {(isSession40Mode
                                  ? [
                                      { mins: 40, label: '1 حصة', note: '40 د', icon: GraduationCap },
                                      { mins: 60, label: '1.5 حصة', note: '60 د', icon: Clock },
                                      { mins: 80, label: '2 حصة', note: '80 د', icon: GraduationCap },
                                      { mins: 120, label: '3 حصص', note: '120 د', icon: Sparkles },
                                    ]
                                  : [
                                      { mins: 30, label: '0.5 س', note: '30 د', icon: Clock },
                                      { mins: 60, label: '1 ساعة', note: '60 د (تلقائي)', icon: Clock },
                                      { mins: 90, label: '1.5 س', note: '90 د', icon: Clock },
                                      { mins: 120, label: '2 س', note: '120 د', icon: Clock },
                                      { mins: 180, label: '3 س', note: '180 د', icon: Sparkles },
                                    ]
                                ).map((opt) => {
                                  const isSelected = logDurationMinutes === opt.mins;
                                  const OptIcon = opt.icon;
                                  return (
                                    <button
                                      key={opt.mins}
                                      type="button"
                                      onClick={() => setLogDurationMinutes(opt.mins)}
                                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                        isSelected
                                          ? isSession40Mode
                                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-2 ring-amber-400/40'
                                            : 'bg-[#1A365D] text-white border-[#1A365D] font-black shadow-xs ring-2 ring-blue-400/40'
                                          : isSession40Mode
                                          ? 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50/50'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <OptIcon size={10} className={isSelected ? (isSession40Mode ? 'text-slate-950' : 'text-blue-200') : (isSession40Mode ? 'text-amber-600' : 'text-blue-600')} />
                                        <span className="text-[10px] font-black">{opt.label}</span>
                                      </div>
                                      <span className={`text-[8px] ${isSelected ? (isSession40Mode ? 'text-slate-900 font-bold' : 'text-blue-100') : 'text-slate-400'}`}>
                                        {opt.note}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              <select
                                value={logDurationMinutes}
                                onChange={(e) => setLogDurationMinutes(Number(e.target.value))}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-center focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              >
                                {isSession40Mode ? (
                                  <>
                                    <option value={40}>1 حصة (40 دقيقة) ⭐ الخيار القياسي</option>
                                    <option value={60}>1.5 حصة (60 دقيقة)</option>
                                    <option value={80}>2 حصة (80 دقيقة)</option>
                                    <option value={120}>3 حصص (120 دقيقة)</option>
                                  </>
                                ) : (
                                  <>
                                    <option value={30}>0.5 ساعة (30 دقيقة)</option>
                                    <option value={60}>1 ساعة (60 دقيقة) ⭐ الخيار التلقائي</option>
                                    <option value={90}>1.5 ساعة (90 دقيقة)</option>
                                    <option value={120}>2 ساعة (120 دقيقة)</option>
                                    <option value={180}>3 ساعات (180 دقيقة)</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-700 mb-1.5">7. ملاحظات المعلم الأكاديمية وصعوبات الطالب:</label>
                            <textarea
                              value={logNotes}
                              onChange={(e) => setLogNotes(e.target.value)}
                              rows={2}
                              placeholder="موجز للتحصيل والصعوبات التي واجهها الطالب لتسهيل المتابعة من قبل المدير وأولياء الأمور."
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          {/* Warning of low balance on teacher page */}
                          {currentLogIssues.length > 0 && (
                            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-slate-900 mb-4 text-right animate-in fade-in duration-300 shadow-xs">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="shrink-0 mt-0.5 text-rose-600 animate-pulse" size={18} />
                                <div className="text-xs font-bold leading-relaxed space-y-1.5 flex-1">
                                  <p className="font-black text-rose-900 text-xs">
                                    ⚠️ تحذير للمعلم: رصيد الطالب قارب على النفاذ والمدير لم يفعّل الحساب المفتوح!
                                  </p>
                                  <p className="text-slate-700 text-[11px] font-extrabold bg-rose-100/80 p-2 rounded-lg border border-rose-200">
                                    الطلاب المحددون لم يفعّل المدير لهم خيار "الحساب المفتوح":
                                    <span className="block mt-1 font-black text-rose-800">
                                      {currentLogIssues.map(issue => `${issue.student.name} (${formatRemainingSessionsText(issue.balance, issue.cost)})`).join('، ')}
                                    </span>
                                  </p>
                                  <p className="text-slate-500 text-[10px]">
                                    يرجى التواصل مع إدارة المركز لشحن حساب المحفظة للطالب أو تفعيل خيار الحساب المفتوح.
                                  </p>
                                  
                                  <div className="flex items-center gap-2 pt-1 pb-0.5">
                                    <input 
                                      type="checkbox"
                                      id="teacherBypassWarningCheckbox"
                                      checked={teacherBypassWarning}
                                      onChange={e => setTeacherBypassWarning(e.target.checked)}
                                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                                    />
                                    <label htmlFor="teacherBypassWarningCheckbox" className="text-[10px] font-black text-rose-900 cursor-pointer select-none">
                                      تجاوز التنبيه ورصد الحصة الاستثنائية (بالرغم من عدم تفعيل الحساب المفتوح من المدير)
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Submit Action */}
                          {logSuccess && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl flex items-center gap-3">
                              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 animate-bounce" />
                              <div>
                                <p className="text-xs font-black">رائع! تم تسجيل ورصد الحصة بنجاح 🌟</p>
                                <p className="text-[11px] text-emerald-700 mt-0.5">
                                  تم خصم الساعات فورياً من رصيد الطلاب، وتوثيق الحصة بنجاح في السجل الأكاديمي.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            {logStudentIds.length > 0 && logSubject && (
                              <span className="text-[10px] font-bold text-slate-500">تم تجهيز الحصة لـ ({logStudentIds.length}) طلاب</span>
                            )}
                            <button
                              type="button"
                              onClick={handleLogSessionSubmit}
                              disabled={isLogging || logStudentIds.length === 0 || !logSubject}
                              className={`px-6 py-3 rounded-xl font-black text-xs text-white transition-all cursor-pointer ${
                                logStudentIds.length === 0 || !logSubject
                                  ? 'bg-slate-300 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-102 shadow-md hover:shadow-blue-500/10'
                              }`}
                            >
                              {isLogging ? 'جاري تقييد الجلسة وقيد الساعات...' : 'رصد وتقييد الدرس للطلاب اللآن 💾'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 2: Class log lists */}
                      {classManagementTab === 'history' && (
                        <div className="space-y-4 animate-fade-in text-right">
                          <h3 className="text-xs font-black text-slate-800">الحصص الستة الأخيرة المسجلة:</h3>
                          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-[11px] font-bold text-amber-800 flex items-center gap-2 font-sans">
                            <span className="text-amber-600 animate-pulse text-base shrink-0">💡</span>
                            <span>تلميح: يمكنك سحب أي حصة غير معتمدة (Drag) وإفلاتها (Drop) مباشرة على أي يوم في **تقويم المواعيد الأسبوعي** بالجانب الأيسر لتغيير تاريخها وتوقيتها فوراً!</span>
                          </div>
                          <div className="overflow-x-auto rounded-2xl border border-slate-205">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="p-3 font-black text-slate-700">تاريخ الحصة</th>
                                  <th className="p-3 font-black text-slate-700">اسم الطالب</th>
                                  <th className="p-3 font-black text-slate-700">المادة</th>
                                  <th className="p-3 font-black text-slate-700">التفصيل والموضع</th>
                                  <th className="p-3 font-black text-slate-700">حالة الدفعة والاعتماد</th>
                                  <th className="p-3 font-black text-slate-700 text-left">التحكم</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sessions
                                  .filter(s => s.teacherId === loggedInTeacher.id)
                                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                                  .slice(0, 6)
                                  .map(s => {
                                    const student = students.find(std => std.id === s.studentId);
                                    const isEditing = editingSessionId === s.id;
                                    
                                    if (isEditing) {
                                      return (
                                        <tr key={s.id} className="border-b border-[#D4A33C]/30 bg-amber-50/20">
                                          <td className="p-3 font-sans">
                                            <div className="flex flex-col gap-1.5">
                                              <input
                                                type="date"
                                                value={sessionEditDate}
                                                onChange={e => setSessionEditDate(e.target.value)}
                                                className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-right font-sans"
                                              />
                                              <div className="flex items-center gap-1">
                                                <span className="text-[9px] text-slate-400 font-sans">التوقيت:</span>
                                                <input
                                                  type="time"
                                                  value={sessionEditStartTime}
                                                  onChange={e => setSessionEditStartTime(e.target.value)}
                                                  className="p-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none text-right font-sans"
                                                />
                                              </div>
                                            </div>
                                          </td>
                                          <td className="p-3 font-black text-slate-800">{student?.name || 'طالب ممسوح'}</td>
                                          <td className="p-3 font-bold text-slate-700">{s.subject}</td>
                                          <td className="p-3">
                                            <div className="flex flex-col gap-1.5">
                                              <span className="text-slate-500 truncate max-w-[120px]">{s.topic || 'بدون تفاصيل'}</span>
                                              <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400">المدة:</span>
                                                <select
                                                  value={sessionEditDuration}
                                                  onChange={e => setSessionEditDuration(Number(e.target.value))}
                                                  className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                                >
                                                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4].map((p) => (
                                                    <option key={p} value={p}>{p} س</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="p-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black ${
                                              s.approved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                            }`}>
                                              {s.approved ? 'معتمد ومصدق' : 'بانتظار الاعتماد'}
                                            </span>
                                          </td>
                                          <td className="p-3 text-left">
                                            <div className="flex items-center gap-1.5 justify-end">
                                              <button
                                                type="button"
                                                onClick={() => handleSaveEditedSession(s.id)}
                                                disabled={isUpdatingSession === s.id}
                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                              >
                                                {isUpdatingSession === s.id ? (
                                                  <Loader2 className="animate-spin" size={10} />
                                                ) : (
                                                  <>
                                                    <span>حفظ</span>
                                                    <Check size={10} />
                                                  </>
                                                )}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingSessionId(null)}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] rounded-lg transition-all cursor-pointer"
                                              >
                                                إلغاء
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return (
                                      <tr 
                                        key={s.id} 
                                        draggable={!s.approved}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('application/json', JSON.stringify({ id: s.id, type: 'session' }));
                                          setDraggedObject({ id: s.id, type: 'session' });
                                        }}
                                        className={`border-b border-slate-150 transition-all duration-150 hover:bg-indigo-50/40 relative group ${
                                          !s.approved ? 'cursor-grab active:cursor-grabbing hover:bg-amber-50/20' : ''
                                        }`}
                                      >
                                        <td className="p-3 font-sans font-bold text-slate-600">
                                          <div className="flex flex-col gap-0.5">
                                            <span>{s.date}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">توقيت: {s.startTime || '16:00'}</span>
                                          </div>
                                        </td>
                                        <td className="p-3 font-black text-slate-800">{student?.name || 'طالب ممسوح'}</td>
                                        <td className="p-3 font-bold text-slate-700">
                                          <div className="flex flex-col gap-0.5">
                                            <span>{s.subject}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">المدة: {s.durationHours} ساعة</span>
                                          </div>
                                        </td>
                                        <td className="p-3 text-slate-500 font-medium truncate max-w-[120px]">{s.topic || 'بدون تفاصيل'}</td>
                                        <td className="p-3">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black ${
                                            s.approved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                          }`}>
                                            {s.approved ? 'معتمد ومصدق' : 'بانتظار الاعتماد'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-left">
                                          <div className="flex items-center gap-1.5 justify-end">
                                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 px-2 py-1 bg-slate-50 rounded border border-slate-200" title="تعديل وقت وتاريخ الحصص مقتصر على مدير المنصة فقط 🔒">
                                              <Lock size={10} className="text-slate-400" />
                                              <span>التعديل للمدير</span>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSession(s.id)}
                                              className="p-1.5 px-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1.5 text-[10px] font-black border border-rose-150 hover:border-rose-600 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 group/delbtn"
                                              title="حذف الحصة المسجلة نهائياً واسترداد الرصيد للطالب"
                                            >
                                              <Trash2 size={12} className="transition-transform group-hover/delbtn:scale-110" />
                                              <span>حذف</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {sessions.filter(s => s.teacherId === loggedInTeacher.id).length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-6 text-center text-slate-400 font-black">لم يتم رصد أي حصص في قواعد البيانات حتى اليوم.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveSubTab('previous-sessions')}
                              className="text-[11px] text-blue-600 font-black hover:underline"
                            >
                              عرض الأرشيف الأكاديمي الكامل لسجل الحصص السابقة »
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 3: Class Reminders */}
                      {classManagementTab === 'reminders' && (
                        <div className="space-y-4 animate-fade-in text-right">
                          <h3 className="text-xs font-black text-slate-850">حصص مجدولة أو تجارب بانتظار تفعيل الرصد الفوري:</h3>
                          <div className="space-y-3">
                            {sessions
                              .filter(s => s.teacherId === loggedInTeacher.id && s.approved === false && s.date >= getLocalDateString())
                              .slice(0, 4)
                              .map(s => {
                                const student = students.find(std => std.id === s.studentId);
                                return (
                                  <div key={s.id} className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-black text-blue-800">حصة قادمة مسجلة في التاريخ المسبق</p>
                                      <p className="text-[11px] font-semibold text-slate-700 mt-1">
                                        تاريخ: {s.date} مع الطالب <span className="font-extrabold">{student?.name}</span> بموضوع {s.subject}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLogStudentIds([s.studentId]);
                                        setLogSubject(s.subject || '');
                                        setLogTopic(s.topic || '');
                                        setLogDate(s.date || getLocalDateString());
                                        setClassManagementTab('log');
                                      }}
                                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition-all hover:scale-103"
                                    >
                                      حضر وارصد الآن
                                    </button>
                                  </div>
                                );
                              })}
                            
                            {sessions.filter(s => s.teacherId === loggedInTeacher.id && s.approved === false).length === 0 && (
                              <div className="p-6 text-center bg-slate-50 border border-slate-205 rounded-2xl text-slate-400 font-bold">
                                🎉 لا توجد تذكيرات لحصص معلقة أو متأخرة. جميع مواعيدك حوكمت بنجاح!
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                {/* Left Area (col-span-4): Weekly Slider Calendar and last active students */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Calendar Widget */}
                  <div className="bg-white rounded-3xl border border-blue-500/10 shadow-sm p-5 space-y-4 text-right">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <CalendarPlus size={15} className="text-blue-500 animate-pulse" />
                        <span>تقويم المواعيد الأسبوعي 📂</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('calendar')}
                        className="text-[9px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-black hover:underline"
                      >
                        عرض التقويم الكامل
                      </button>
                    </div>

                    {/* Weekly days display */}
                    <div className="grid grid-cols-7 gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-xl">
                      {weekDays.map(day => {
                        const isHovered = dragOverDay === day.dateStr;
                        return (
                          <button
                            type="button"
                            key={day.dateStr}
                            onClick={() => setDashboardSelectedDate(day.dateStr)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragOverDay !== day.dateStr) {
                                setDragOverDay(day.dateStr);
                              }
                            }}
                            onDragLeave={() => setDragOverDay(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverDay(null);
                              let id = '';
                              let type = '';
                              try {
                                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                id = data.id;
                                type = data.type;
                              } catch (err) {
                                if (draggedObject) {
                                  id = draggedObject.id;
                                  type = draggedObject.type;
                                }
                              }

                              if (!id || type !== 'session') return;

                              const sessionToMove = sessions.find(s => s.id === id);
                              if (sessionToMove && (sessionToMove.approved || sessionToMove.status === 'completed')) {
                                setCalendarToast(`❌ تنبيه: لا يمكن تعديل موعد حصة معتمدة أو مكتملة مسبقاً!`);
                                setTimeout(() => setCalendarToast(null), 4000);
                                return;
                              }

                              // Trigger the quick configuration overlay!
                              setQuickTimeVal(sessionToMove?.startTime || '16:00');
                              setQuickDurationVal(sessionToMove?.durationHours || 1);
                              setDragDroppedSession({ sessionId: id, targetDate: day.dateStr });
                            }}
                            className={`py-2 rounded-lg flex flex-col justify-center items-center transition-all cursor-pointer relative ${
                              isHovered
                                ? 'bg-amber-100 text-amber-950 border border-amber-500 font-black scale-103 shadow'
                                : dashboardSelectedDate === day.dateStr
                                ? 'bg-blue-600 text-white shadow-md scale-102 font-black'
                                : 'hover:bg-slate-200/50 text-slate-650'
                            }`}
                          >
                            <span className="text-[9px] font-extrabold block">{day.dayShortName}</span>
                            <span className="text-xs font-extrabold mt-0.5 block">{day.dayNum}</span>
                            {day.isToday && (
                              <span className={`w-1 h-1 rounded-full ${dashboardSelectedDate === day.dateStr ? 'bg-white' : 'bg-blue-650'} mt-1 block`} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day specific scheduled list */}
                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {(() => {
                        const daySessions = sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date === dashboardSelectedDate);
                        const dayTrials = trialLessons.filter(t => t.teacherId === loggedInTeacher.id && t.scheduledDate === dashboardSelectedDate);
                        
                        if (daySessions.length === 0 && dayTrials.length === 0) {
                          return (
                            <p className="text-center text-[10px] text-slate-400 py-4 font-bold">لا توجد حصص مجدولة في هذا اليوم.</p>
                          );
                        }

                        return (
                          <>
                            {daySessions.map(s => {
                              const student = students.find(std => std.id === s.studentId);
                              const sType = getSessionType(s);
                              let containerClass = "p-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl text-right cursor-pointer transition-colors border-r-4 border-r-blue-500";
                              let textClass = "text-blue-800";
                              let label = "👤 فردي";
                              if (sType === 'group') {
                                containerClass = "p-2.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl text-right cursor-pointer transition-colors border-r-4 border-r-purple-500";
                                textClass = "text-purple-800";
                                label = "👥 جماعي";
                              } else if (sType === 'trial') {
                                containerClass = "p-2.5 bg-amber-50/50 hover:bg-amber-100/50 border border-amber-200/50 rounded-xl text-right cursor-pointer transition-colors border-r-4 border-r-amber-500";
                                textClass = "text-amber-850";
                                label = "🧪 تجريبي";
                              }
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => {
                                    setLogStudentIds([s.studentId]);
                                    setLogSubject(s.subject || '');
                                    setLogTopic(s.topic || '');
                                    setLogDate(s.date || getLocalDateString());
                                    setClassManagementTab('log');
                                  }}
                                  className={containerClass}
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                                      <span>{student?.name || 'طالب ممسوح'}</span>
                                      <span className="text-[8px] opacity-70 px-1 py-0.2 rounded bg-white/60 border border-black/5 font-extrabold">{label}</span>
                                    </p>
                                    <span className="text-[9px] text-slate-500 font-bold">{s.startTime || 'مستمر'}</span>
                                  </div>
                                  <p className={`text-[10px] ${textClass} mt-1 font-bold`}>{s.subject} {s.topic ? `- ${s.topic}` : ''}</p>
                                </div>
                              );
                            })}
                            
                            {dayTrials.map(t => (
                              <div
                                key={t.id}
                                onClick={() => setActiveSubTab('trials')}
                                className="p-2.5 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/50 rounded-xl text-right cursor-pointer transition-colors border-r-4 border-r-amber-500"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                                    <span>{t.studentName || 'طالب تجريبي'}</span>
                                    <span className="text-[8px] text-amber-700 px-1 py-0.2 rounded bg-amber-100 border border-amber-200 font-extrabold">🧪 تجريبي</span>
                                  </p>
                                  <span className="text-[9px] text-slate-500 font-bold">{t.timeSlot || 'طلب تجريبي'}</span>
                                </div>
                                <p className="text-[10px] text-amber-850 mt-1 font-black">درس تجريبي في {t.subject}</p>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Active Students & Last Activity widget */}
                  <div className="bg-white rounded-3xl border border-emerald-500/10 shadow-sm p-5 space-y-3 text-right">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <Users size={15} className="text-emerald-500" />
                        <span>الوصول السريع للطلاب 🧑‍🎓 ({linkedStudentsList.length})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('my-students')}
                        className="text-[10px] text-sky-700 hover:text-sky-900 hover:underline font-black cursor-pointer flex items-center gap-1"
                      >
                        <span>إدارة الكل</span>
                        <ArrowLeft size={10} />
                      </button>
                    </div>

                    {/* Quick Search input in widget */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن طالب..."
                        value={homeStudentSearch}
                        onChange={(e) => setHomeStudentSearch(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-right outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                      />
                      {homeStudentSearch && (
                        <button
                          type="button"
                          onClick={() => setHomeStudentSearch('')}
                          className="absolute left-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar">
                      {(() => {
                        const all = getLinkedStudents();
                        const q = homeStudentSearch.trim().toLowerCase();
                        const list = q
                          ? all.filter(s => (s.name || '').toLowerCase().includes(q) || (s.phone || '').includes(q))
                          : all;

                        if (list.length === 0) {
                          return (
                            <p className="text-center text-xs text-slate-400 py-6 font-bold">
                              {q ? `لم يتم العثور على طالب يطابق "${q}"` : 'لا يوجد طلاب منسوبين لك حالياً.'}
                            </p>
                          );
                        }

                        return list.slice(0, q ? 30 : 8).map(s => {
                        const studentSessions = sessions.filter(sess => sess.studentId === s.id && sess.teacherId === loggedInTeacher.id);
                        let lastActive = 'لا يوجد أنشطة مسجلة';
                        if (studentSessions.length > 0) {
                          studentSessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                          const topS = studentSessions[0];
                          lastActive = `حصة ${topS.subject} بتاريخ ${topS.date}`;
                        }
                        const balance = calculateStudentBalance(s.id);
                        const remaining = getStudentRemainingSessions(s.id);
                        const isLow = remaining <= 2;

                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              if (!logStudentIds.includes(s.id)) {
                                setLogStudentIds([s.id]);
                              }
                              setClassManagementTab('log');
                              const el = document.getElementById('class-management-master-card');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`p-3 rounded-xl flex items-center justify-between cursor-pointer text-right transition-all duration-200 border ${
                              isLow
                                ? remaining <= 0
                                  ? 'bg-rose-50/50 hover:bg-rose-50 border-rose-200'
                                  : remaining === 1
                                  ? 'bg-orange-50/50 hover:bg-orange-50 border-orange-200'
                                  : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200'
                                : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-800 break-words leading-snug">{s.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-1 block truncate">آخر نشاط: {lastActive}</p>
                            </div>
                            
                            {isLow && (
                              <div className="shrink-0 mr-2">
                                {remaining <= 0 ? (
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                                    0 حصص
                                  </span>
                                ) : remaining === 1 ? (
                                  <span className="text-[9px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                                    متبقي 1
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                    متبقي 2
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubTab('my-students')}
                      className="w-full mt-2 py-2 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl text-center text-[10px] font-black text-sky-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users size={12} />
                      <span>فتح السجل الكامل للطلاب المنسوبين ({linkedStudentsList.length}) ←</span>
                    </button>
                  </div>

                  {/* Private Student Notes Sidebar Widget */}
                  <div className="bg-white rounded-3xl border border-blue-500/10 shadow-sm p-5 space-y-3 text-right">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <FileText size={15} className="text-blue-500" />
                        <span>ملاحظات الطلاب الخاصة (سري)</span>
                      </h3>
                      <span className="text-[9px] bg-slate-150 text-slate-650 px-2 py-0.5 rounded-lg font-black shrink-0 flex items-center gap-1">
                        <Lock size={9} className="text-slate-500" />
                        <span>سري للمعلم</span>
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1">اختر الطالب لتدوين ملاحظات خاصة به:</label>
                        <select
                          value={currentSelectedNotesStudentId}
                          onChange={(e) => setActiveNotesStudentId(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">-- اختر طالباً --</option>
                          {getLinkedStudents().map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentSelectedNotesStudentId ? (
                        <div className="space-y-2.5">
                          <div>
                            <textarea
                              value={activeNotesText}
                              onChange={(e) => setActiveNotesText(e.target.value)}
                              rows={4}
                              placeholder="اكتب ملاحظات خاصة وسرية حول تقدم الطالب، سلوكه، نقاط ضعفه، أو خططك للمستقبل معه أثناء الجلسة..."
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveStudentNotes(currentSelectedNotesStudentId, activeNotesText)}
                            disabled={isSavingNotes}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isSavingNotes ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>جاري حفظ الملاحظة...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>حفظ الملاحظة الخاصة</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-[10px] text-slate-400 py-3 font-bold leading-relaxed">
                          يرجى اختيار طالب من القائمة أعلاه أو تحديد طالب من "الوصول السريع" لعرض وتعديل ملاحظاته الخاصة.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

          {activeSubTab !== 'home' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-[#18181b] border border-neutral-800 rounded-[2.5rem] w-full max-w-5xl shadow-2xl relative overflow-hidden flex flex-col h-[90vh]"
              >
                {/* Modal Banner Header */}
                <div className="bg-[#1A365D] text-white p-5 shrink-0 relative overflow-hidden flex items-center justify-between border-b border-[#2A4D7C]/30 shadow-md">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3.5 z-10 text-right">
                    <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shadow-lg">
                      {activeSubTab === 'log-session' && <CalendarCheck size={18} className="text-emerald-400" />}
                      {activeSubTab === 'book-session' && <Clock size={18} className="text-amber-400" />}
                      {activeSubTab === 'previous-sessions' && <History size={18} className="text-slate-350" />}
                      {activeSubTab === 'ai-planner' && <Sparkles size={18} className="text-violet-400" />}
                      {activeSubTab === 'log-group-session' && <Users size={18} className="text-indigo-400" />}
                      {activeSubTab === 'tasks' && <CheckSquare size={18} className="text-rose-400" />}
                      {activeSubTab === 'tasks-evaluation' && <BookmarkCheck size={18} className="text-amber-400" />}
                      {activeSubTab === 'trials' && (
                        pendingTrialsCount > 0 ? (
                          <MessageSquare size={18} className="text-amber-400 animate-pulse" />
                        ) : (
                          <Sparkles size={18} className="text-orange-400" />
                        )
                      )}
                      {activeSubTab === 'calendar' && <CalendarPlus size={18} className="text-sky-400" />}
                      {activeSubTab === 'online-exams' && <BookOpen size={18} className="text-indigo-300" />}
                      {activeSubTab === 'educational-library' && <BookOpenCheck size={18} className="text-emerald-400" />}
                      {activeSubTab === 'my-students' && <Users size={18} className="text-sky-400" />}
                      {activeSubTab === 'curriculum-generator' && <FlaskConical size={18} className="text-emerald-400" />}
                    </div>
                    <div className="text-right">
                      <h2 className="text-sm font-black leading-tight text-white">
                        {activeSubTab === 'log-session' && "تفاصيل: تسجيل وإدراج حصة فردية للطلاب"}
                        {activeSubTab === 'book-session' && "تفاصيل: رصيد ساعات وجدولة الطلاب"}
                        {activeSubTab === 'previous-sessions' && "لوحة الحصص السابقة ومتابعة جدول اليوم والإنذارات"}
                        {activeSubTab === 'ai-planner' && "مساعد الدروس الذكي والمخطط الأكاديمي المتقدم (AI)"}
                        {activeSubTab === 'log-group-session' && "تسجيل وتأكيد حصة الكورس أو المجموعة المشتركة"}
                        {activeSubTab === 'tasks' && "إسناد وتعيين الواجبات والمهام التعليمية للطلبة"}
                        {activeSubTab === 'tasks-evaluation' && "تقييم حلول الواجبات ورصد درجات ومستويات الطلاب"}
                        {activeSubTab === 'trials' && (
                          pendingTrialsCount > 0
                            ? "رسائل تنبيهية: لديك حصص تجريبية معلّقة بانتظار المعالجة الفورية 🧪"
                            : "الحصص التجريبية المجانية وبطاقات تأسيس المجموعات"
                        )}
                        {activeSubTab === 'calendar' && "الجدولة الفورية والتقويم الأكاديمي التفاعلي للمواعيد"}
                        {activeSubTab === 'online-exams' && "بوابة الاختبارات الإلكترونية التفاعلية وصناعة المسابقات الأكاديمية (المرجع الأساسي المعتمد للكيمياء: VEB School Chemistry 🧪)"}
                        {activeSubTab === 'educational-library' && "المواد والمصادر التعليمية وبنك الأسئلة والمساعد الأكاديمي التربوي 📚"}
                        {activeSubTab === 'my-students' && "قائمة وسجل الطلاب المنسوبين لحسابك التدريسي 👨‍🎓"}
                        {activeSubTab === 'curriculum-generator' && "توليد المناهج والمخرجات وهرم بلوم ورفع المصادر المعتمدة (VEB Chemistry) 🧪"}
                      </h2>
                      <p className="text-[10px] text-slate-300 font-bold mt-0.5 select-none">
                        نافذة تفاعلية لحوكمة العملية التعليمية وإدارة العمليات بلحظات وتحكم كامل
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('home')}
                    className="px-4 py-2.5 text-[11px] font-black bg-white/10 hover:bg-[#E11D48]/30 text-white hover:text-white border border-white/10 hover:border-[#E11D48]/40 cursor-pointer rounded-xl transition-all flex items-center gap-1.5 z-10 select-none shadow-sm"
                  >
                    <span>الرجوع للشاشة الرئيسية 🏠</span>
                  </button>
                </div>

                {/* Scrollable Content Wrapper */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8 text-right bg-slate-50">
                  {/* Session Overview & Today's Schedule for Session-Related subtabs */}
                  {(activeSubTab === 'log-session' || activeSubTab === 'previous-sessions' || activeSubTab === 'book-session' || activeSubTab === 'log-group-session') && (
                    <>
                      {/* Quick-Launch Session Logger Banner */}
                      <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border-2 border-amber-500/30 rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center gap-4 text-right">
                          <div className="w-12 h-12 rounded-2xl bg-[#D4A33C] text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0 transform hover:scale-105 transition-transform" id="banner-logging-icon">
                            <Calendar size={22} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <span>بوابة رصد الأنشطة والدراسة السريعة</span>
                              <span className="text-[9px] bg-[#D4A33C] text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse">رئيسي ⚡️</span>
                            </h4>
                            <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                              هل قمت بإنهاء درس إرشادي أو حصة تعليمية للتو؟ سجل البيانات فوراً لتحديث سجل الحصص ورصيد الساعات المتبقية للطلاب.
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setActiveSubTab('log-session');
                          }}
                          className="px-6 py-3.5 bg-slate-950 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-300 rounded-2xl text-xs font-black transition-all hover:shadow-md hover:shadow-amber-500/5 active:scale-95 cursor-pointer shrink-0 text-center flex items-center justify-center gap-2 border border-slate-900"
                          id="banner-start-logging-btn"
                        >
                          <CalendarCheck size={16} />
                          <span>ابدأ تسجيل حصة الآن</span>
                        </button>
                      </div>

                      {/* Daily Schedule Observer & Controller widget */}
                      <div className="bg-gradient-to-br from-[#1A365D] via-[#2A4D7C] to-[#1A365D] text-white rounded-3xl border border-slate-700 shadow-md p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 font-sans">
                              <Calendar size={20} className="text-amber-400" />
                            </div>
                            <div className="text-right">
                              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>جدول الحصص والأنشطة لليوم</span>
                                {dashboardSelectedDate === getLocalDateString() && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black animate-pulse font-sans">
                                    اليوم الحالي
                                  </span>
                                )}
                              </h3>
                              <p className="text-[10px] text-slate-300 font-bold mt-1">
                                تعرض اللوحة تلقائيًا حصص المعاينة ليوم الدخول مع إمكانية التنقل والتصفح الفوري لأي تاريخ
                              </p>
                            </div>
                          </div>

                          {/* Date controller tool */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {dashboardSelectedDate !== getLocalDateString() && (
                              <button
                                onClick={() => setDashboardSelectedDate(getLocalDateString())}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer"
                                title="الرجوع الفوري لتاريخ اليوم الحالي"
                              >
                                عرض اليوم ↩
                              </button>
                            )}
                            
                            <div className="relative">
                              <input
                                type="date"
                                value={dashboardSelectedDate}
                                onChange={(e) => setDashboardSelectedDate(e.target.value)}
                                className="bg-white/10 hover:bg-white/15 border border-white/25 text-white text-xs font-black rounded-xl px-3 py-1.5 outline-none transition-all cursor-pointer text-right min-w-[140px]"
                                style={{ colorScheme: 'dark' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Daily Metrics Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5 text-right font-bold">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-350 block">مجموع حصص اليوم</span>
                            <span className="text-xs font-black text-white">{selectedDateStats.totalCount} حصة تعليمية</span>
                          </div>
                          <div className="space-y-0.5 border-r border-white/10 pr-3">
                            <span className="text-[9px] text-slate-350 block">ساعات العمل المقررة</span>
                            <span className="text-xs font-black text-amber-300 font-sans">{selectedDateStats.totalHours.toFixed(1)} س</span>
                          </div>
                          <div className="space-y-0.5 border-r border-white/10 pr-3">
                            <span className="text-[9px] text-slate-350 block">حصص معتمدة مكتملة</span>
                            <span className="text-xs font-black text-emerald-300">{selectedDateStats.completedCount}</span>
                          </div>
                          <div className="space-y-0.5 border-r border-white/10 pr-3">
                            <span className="text-[9px] text-slate-350 block">بانتظار التأكيد/مجدول</span>
                            <span className="text-xs font-black text-indigo-300">{selectedDateStats.bookedCount + selectedDateStats.pendingCount}</span>
                          </div>
                        </div>

                        {/* List of Sessions */}
                        <div className="space-y-3">
                          {selectedDateSessions.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-slate-300">
                              <p className="text-xs font-bold leading-relaxed">
                                لا توجد أي حصص مسجلة أو مجدولة لهذا التاريخ:{" "}
                                <span className="font-mono text-amber-300">{formatCustomDate(dashboardSelectedDate)}</span> 📅
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1.5">
                                بإمكانك حجز موعد جديد أو رصد حصة تم تقديمها كلياً من خلال القائمة الجانبية.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                              {selectedDateSessions.map((session) => {
                                const student = students.find((s) => s.id === session.studentId);
                                
                                // Determine Status badge styling
                                let statusLabel = "";
                                let statusColor = "";
                                if (session.approved) {
                                  statusLabel = "تم تقديمها ومعتمدة بالكامل ✅";
                                  statusColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
                                } else if (session.teacherConfirmed === false) {
                                  statusLabel = "موعد محجوز (مجدول) 🗓️";
                                  statusColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
                                } else {
                                  statusLabel = "قيد تدقيق الإدارة للاعتماد ⏳";
                                  statusColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
                                }

                                const sType = getSessionType(session);
                                let borderTypeClass = "border-r-4 border-r-blue-500 bg-blue-500/5";
                                let subjectBadgeStyle = "bg-blue-500/20 text-blue-300";
                                let typeLabel = "👤 فردي";
                                if (sType === 'group') {
                                  borderTypeClass = "border-r-4 border-r-purple-500 bg-purple-500/5";
                                  subjectBadgeStyle = "bg-purple-500/20 text-purple-300";
                                  typeLabel = "👥 جماعي";
                                } else if (sType === 'trial') {
                                  borderTypeClass = "border-r-4 border-r-amber-500 bg-amber-500/5";
                                  subjectBadgeStyle = "bg-amber-500/20 text-amber-300";
                                  typeLabel = "🧪 تجريبي";
                                }

                                return (
                                  <div
                                    key={session.id}
                                    className={`border border-white/10 hover:bg-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${borderTypeClass}`}
                                  >
                                    <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0 w-full text-right">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${subjectBadgeStyle}`}>
                                          {session.subject || "متابعة وتقويم"}
                                        </span>
                                        <span className="text-[9px] opacity-75 font-bold px-1.5 py-0.5 rounded bg-white/10 text-white">
                                          {typeLabel}
                                        </span>
                                        <h4 className="text-xs font-black text-white break-words leading-snug">
                                          حصة لصالح الطالب: {student?.name || "طالب مغادر"}
                                        </h4>
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-300 font-medium">
                                        <span className="flex items-center gap-1">
                                          <Clock size={11} className="text-slate-400" />
                                          <span>المدة: <strong>{session.durationHours || 1} ساعة</strong></span>
                                        </span>
                                        {session.startTime && (
                                          <>
                                            <span className="text-slate-500">•</span>
                                            <span>موعد البدء: {session.startTime}</span>
                                          </>
                                        )}
                                        {session.notes && (
                                          <>
                                            <span className="text-slate-500">•</span>
                                            <span className="truncate max-w-[200px]" title={session.notes}>
                                              ملاحظات المعلم: {session.notes}
                                            </span>
                                          </>
                                        )}
                                        {session.topic && (
                                          <>
                                            <span className="text-slate-500">•</span>
                                            <span className="text-amber-300 font-extrabold truncate max-w-[250px]" title={session.topic}>
                                              الموضوع المشروح: {session.topic}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex items-center justify-between w-full sm:w-auto border-t border-white/5 pt-2 sm:pt-0 sm:border-0">
                                      <span className={`text-[9px] font-black border px-2.5 py-1.5 rounded-xl ${statusColor}`}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Automatic Proactive Warnings for Group Courses Nearing Completion (less than 10% remaining) */}
                      {activeNearingCompletionCourses.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-50/70 border border-amber-300/60 text-slate-800 p-6 rounded-3xl text-right space-y-4 shadow-sm"
                          id="nearing-completion-alerts-panel"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                                <AlertTriangle size={20} className="animate-pulse" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                                  <span>تنبيهات تلقائية مبرمجة: دورات جماعية تشرف على الانتهاء ⚠️</span>
                                </h3>
                                <p className="text-[10px] text-amber-805 font-medium mt-0.5 leading-relaxed">
                                  يُحدد النظام الحصص التي نفدت منها الساعات (أقل من 10% من الساعات المقررة المتبقية). تم تفعيل هذا الإجراء تلقائياً لدعم التخطيط الاستباقي ومشاركة المستوى المطلوب التالي مع الإدارة العامة لضمان عدم خسارة الطلبة أو انقطاعهم.
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-amber-500/20 text-amber-950 font-black px-3.5 py-1.5 rounded-full shrink-0 align-middle">
                              دورات مسجلة قريبة الانتهاء ({activeNearingCompletionCourses.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3.5">
                            {activeNearingCompletionCourses.map(course => {
                              const completed = Number(course.completedHours) || 0;
                              const total = Number(course.totalHours) || 0;
                              const remaining = total - completed;
                              const progressPercentage = Math.min(100, Math.round((completed / total) * 100));
                              
                              const isSent = sentProposals.includes(course.id);
                              const isSending = sendingProposalId === course.id;

                              // Simulate submitting a proactive proposal to extend or renew the course
                              const handleSendSimulation = (courseId: string) => {
                                setSendingProposalId(courseId);
                                setTimeout(() => {
                                  setSentProposals(prev => [...prev, courseId]);
                                  setSendingProposalId(null);
                                }, 1200);
                              };

                              return (
                                <div 
                                  key={course.id} 
                                  className="p-4 bg-white/70 border border-slate-100 rounded-2xl flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition-all text-right"
                                >
                                  <div className="flex-1 min-w-0 w-full">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 rounded">
                                        كود الدورة: <strong className="font-mono">{course.code}</strong>
                                      </span>
                                      <span className="text-xs font-black text-indigo-950">{course.title || course.name}</span>
                                      <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-extrabold px-2 py-0.5 rounded-full">
                                        المستوى: {course.level}
                                      </span>
                                    </div>

                                    {/* Progress slider showing visual percentage */}
                                    <div className="mt-3.5 space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                        <span>الساعات المتبقية: <strong className="text-rose-600 font-black">{remaining.toFixed(1)} س</strong></span>
                                        <span>أنجزت الدورة: <strong className="text-slate-900 font-black">{progressPercentage}%</strong></span>
                                      </div>
                                      <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                                          style={{ width: `${progressPercentage}%` }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mt-2">
                                      <span>إجمالي الساعات المقررة للعمل: {total} س</span>
                                      <span>|</span>
                                      <span>الساعات المستهلكة المعتمدة: {completed} س</span>
                                    </div>
                                  </div>

                                  <div className="shrink-0 w-full md:w-auto text-left">
                                    {isSent ? (
                                      <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/50 p-2.5 rounded-xl font-black flex items-center gap-1 justify-center md:justify-end">
                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                        <span>تم إرسال المقترح للتخطيط والمتابعة 🚀</span>
                                      </div>
                                    ) : (
                                      <button
                                        disabled={isSending}
                                        onClick={() => handleSendSimulation(course.id)}
                                        className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1A365D] hover:bg-slate-800 text-white text-[11px] font-black rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                      >
                                        {isSending ? (
                                          <>
                                            <Loader2 size={12} className="animate-spin" />
                                            <span>جاري إرسال المقترح...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles size={12} className="text-amber-400" />
                                            <span>مزامنة واقتراح المستوى التكميلي</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Overdue Booked Sessions Alert Panel */}
                      {overdueSessions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-500/10 border border-amber-500/20 text-slate-800 p-6 rounded-3xl text-right space-y-4 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                                <AlertCircle size={18} />
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-amber-950">تنبيه حوكمة الحصص المستحقة للاعتماد والرصد الأكاديمي ⏰</h3>
                                <p className="text-[10px] text-amber-700 font-bold mt-0.5">لقد انقضى الوقت المحدد لهذه الحصص المقررة مسبقاً دون رصدها. يمنحك النظام الآن الصلاحية الممتدة لاعتمادها مباشرة كما هي، أو تعديل تفاصيلها ثم اعتمادها وتوثيقها فوراً كحصة مكتملة ومسجلة.</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-amber-500/20 text-amber-900 font-extrabold px-3 py-1 rounded-full shrink-0 align-middle self-start sm:self-auto">
                              بانتظار تأكيدك ({overdueSessions.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                            {overdueSessions.map(session => {
                              const studentUser = students.find(s => s.id === session.studentId);
                              const isEditing = editingOverdueSessionId === session.id;

                              if (isEditing) {
                                return (
                                  <div key={session.id} className="p-4 bg-white border border-[#D4A33C]/40 rounded-2xl flex flex-col gap-3 shadow-md text-right">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800">تعديل حصة الطالب: <strong className="text-indigo-950">{studentUser?.name || 'مجهول'}</strong></span>
                                      <span className="text-[9px] bg-amber-500/15 text-amber-900 font-extrabold px-2 py-0.5 rounded">نمط التعديل ✏️</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 flex items-center gap-1 justify-start">
                                          <span>المادة الدراسية</span>
                                        </label>
                                        <select
                                          value={overdueEditSubject}
                                          onChange={e => setOverdueEditSubject(e.target.value)}
                                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                                        >
                                          {loggedInTeacher.subjects?.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                          ))}
                                          <option value="متابعة وتقويم">متابعة وتقويم</option>
                                        </select>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 flex items-center gap-1 justify-start">
                                          <span>مدة الحصة (ساعات)</span>
                                        </label>
                                        <select
                                          value={overdueEditDuration}
                                          onChange={e => setOverdueEditDuration(Number(e.target.value))}
                                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                                        >
                                          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((p) => (
                                            <option key={p} value={p}>{p} ساعة</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 flex items-center gap-1 justify-start">
                                          <span>تاريخ الحصة</span>
                                        </label>
                                        <input
                                          type="date"
                                          value={overdueEditDate}
                                          onChange={e => setOverdueEditDate(e.target.value)}
                                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 flex items-center gap-1 justify-start">
                                          <span>توقيت الحصة</span>
                                        </label>
                                        <input
                                          type="time"
                                          value={overdueEditStartTime}
                                          onChange={e => setOverdueEditStartTime(e.target.value)}
                                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-50">
                                      <button
                                        onClick={() => setEditingOverdueSessionId(null)}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                      
                                      <button
                                        disabled={isConfirmingSession === session.id}
                                        onClick={() => handleSaveAndConfirmSessionConduct(session.id)}
                                        className="px-4.5 py-2 bg-[#D4A33C] hover:bg-[#b0852d] text-slate-950 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
                                      >
                                        {isConfirmingSession === session.id ? (
                                          <Loader2 className="animate-spin" size={12} />
                                        ) : (
                                          <>
                                            <span>حفظ وتأكيد للاعتماد</span>
                                            <CheckCircle2 size={12} />
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={session.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-slate-800">الطالب: <strong className="text-indigo-950">{studentUser?.name || 'مجهول'}</strong></span>
                                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-black">{session.subject}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-bold">
                                      <span>التاريخ: {formatCustomDate(session.date)}</span>
                                      <span>ساعة البدء: {session.startTime || "16:00"}</span>
                                      <span>المدة: {session.durationHours} س</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <button
                                      onClick={() => {
                                        setEditingOverdueSessionId(session.id);
                                        setOverdueEditDuration(session.durationHours || 1);
                                        setOverdueEditSubject(session.subject || (loggedInTeacher.subjects?.[0] || 'متابعة وتقويم'));
                                        setOverdueEditDate(session.date || '');
                                        setOverdueEditStartTime(session.startTime || '16:00');
                                      }}
                                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <span>تعديل</span>
                                    </button>

                                    <button
                                      disabled={isConfirmingSession === session.id}
                                      onClick={() => handleConfirmSessionConduct(session.id)}
                                      className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-sm disabled:opacity-50"
                                    >
                                      {isConfirmingSession === session.id ? (
                                        <Loader2 className="animate-spin" size={12} />
                                      ) : (
                                        <>
                                          <span>اعتماد كما هي</span>
                                          <CheckCircle2 size={12} />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

          {/* TAB 1: Log Session (Completed Class) */}
          {activeSubTab === 'log-session' && (
            <>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
              
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="w-10 h-10 rounded-xl bg-[#1A365D]/10 text-[#1A365D] flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-slate-950">تسجيل حصة تم تقديمها وإعطاؤها</h2>
                  <p className="text-[10px] text-slate-400 font-semibold">يقوم هذا النموذج برصد وتوثيق الحصة وتحديث رصيد الحصص في السجل الأكاديمي للطلاب فورياً.</p>
                </div>
              </div>

              {logSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-855 p-4.5 rounded-2xl flex items-center gap-3 text-right"
                >
                  <CheckCircle2 className="text-emerald-600 shrink-0 animate-bounce" size={20} />
                  <div>
                    <p className="text-sm font-black text-emerald-900 font-sans">رائع ومميز! تم تسجيل ورصد الحصص التعليمية بنجاح 🌟</p>
                    <p className="text-xs mt-1 text-emerald-800 font-medium leading-relaxed">
                      أنت تصنع فارقاً حقيقياً وبصمة فخر في مسيرة طلابك العلمية! تم رصد وتسجيل مادة ({lastLoggedSessionSummary?.subject || logSubject || 'المادة'}) بمدة ({lastLoggedSessionSummary?.durationMinutes || logDurationMinutes} دقيقة) للطلاب ({lastLoggedSessionSummary?.studentsNames.join('، ') || 'المحددين'}) بنجاح، وتحديث رصيد الحصص المتبقية في السجل الأكاديمي. دمتم منارة للعلم والعطاء!
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="space-y-6">
                
                {/* 1. اختيار نظام الحصة في بداية التسجيل */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                    <div>
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-amber-600" />
                        <span>اختيار نظام الحصة المعتمد في بداية التسجيل:</span>
                      </span>
                      <p className="text-[10px] text-amber-900/80 font-bold mt-0.5">
                        حدد نظام الاحتساب للحصة (نظام 40 دقيقة المعياري أو نظام الساعات 60 دقيقة) لتوثيق ورصد الحصة بدقة.
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border self-start sm:self-auto ${
                      isSession40Mode
                        ? 'bg-amber-200 text-amber-950 border-amber-400 font-black shadow-2xs'
                        : 'bg-blue-100 text-blue-900 border-blue-300 font-black shadow-2xs'
                    }`}>
                      {isSession40Mode 
                        ? '🎓 نظام 40 دقيقة نشط' 
                        : hasSecondaryStudent 
                        ? '⏱️ نظام الساعات (إلزامي للثانوي)' 
                        : hasMiddleStudent 
                        ? '⏱️ نظام الساعات (تلقائي للإعدادي)' 
                        : '⏱️ نظام الساعات نشط'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: نظام الحصة 40 دقيقة */}
                    <button
                      type="button"
                      disabled={hasSecondaryStudent}
                      onClick={() => {
                        if (hasSecondaryStudent) {
                          alert('تنبيه: طلاب المرحلة الثانوية معتمدون حصراً بنظام الساعات (60 دقيقة) ولا يمكن تسجيل حصصهم بنظام 40 دقيقة.');
                          return;
                        }
                        setSessionPricingSystemChoice('session_40');
                        setIsPricingSystemManuallyChanged(true);
                        setLogDurationMinutes(40);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center gap-3.5 ${
                        hasSecondaryStudent
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400'
                          : isSession40Mode
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700'
                      }`}
                      title={hasSecondaryStudent ? 'مغلق: طلاب المرحلة الثانوية بنظام الساعات فقط' : 'نظام الحصة 40 دقيقة'}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        hasSecondaryStudent
                          ? 'bg-slate-200 text-slate-400'
                          : isSession40Mode ? 'bg-slate-950 text-amber-400 shadow-md' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {hasSecondaryStudent ? <Lock size={20} /> : <GraduationCap size={22} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">نظام الحصة 40 دقيقة</span>
                          {hasSecondaryStudent ? (
                            <span className="text-[9px] bg-slate-300 text-slate-700 font-black px-2 py-0.5 rounded-md">
                              مغلق للثانوي 🔒
                            </span>
                          ) : isSession40Mode ? (
                            <span className="text-[9px] bg-slate-950 text-white font-black px-2 py-0.5 rounded-md">
                              مُفعّل ومختار ✓
                            </span>
                          ) : null}
                        </div>
                        <span className={`text-[10px] block mt-1 ${
                          hasSecondaryStudent
                            ? 'text-slate-400 font-bold'
                            : isSession40Mode ? 'text-slate-950 font-black' : 'text-slate-500 font-medium'
                        }`}>
                          {hasSecondaryStudent 
                            ? 'غير متاح: طلاب المرحلة الثانوية فقط ساعات' 
                            : 'الحصة المدرسية المعيارية 40 دقيقة (1 حصة = 40 د • 1.5 حصة = 60 د • 2 حصة = 80 د)'}
                        </span>
                      </div>
                    </button>

                    {/* Option B: نظام الساعات */}
                    <button
                      type="button"
                      onClick={() => {
                        setSessionPricingSystemChoice('hourly');
                        setIsPricingSystemManuallyChanged(true);
                        setLogDurationMinutes(60);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center gap-3.5 ${
                        !isSession40Mode
                          ? 'bg-gradient-to-r from-[#1A365D] to-[#244b7f] text-white border-[#1A365D] shadow-md ring-2 ring-blue-400/50'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        !isSession40Mode ? 'bg-white/20 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Clock size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">نظام الساعات (60 دقيقة)</span>
                          {!isSession40Mode && (
                            <span className="text-[9px] bg-white text-slate-900 font-black px-2 py-0.5 rounded-md">
                              مُفعّل تلقائياً ✓
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] block mt-1 ${!isSession40Mode ? 'text-blue-100 font-black' : 'text-slate-500 font-medium'}`}>
                          {isSecondaryOrMiddleSelected 
                            ? 'تلقائي معتمد للمرحلتين الثانوية والإعدادية (30 د • 60 د • 90 د • 120 د • 180 د)' 
                            : 'نظام الساعة الكاملة المعتمد (30 د • 60 د • 90 د • 120 د • 180 د)'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
                  
                  {/* Select Students with Checkboxes */}
                  <div className="col-span-1 md:col-span-2 space-y-2.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#1A365D]" />
                        <span className="text-xs font-black text-slate-800">
                          الطلاب المشتركون في هذه الحصة
                          {logStudentIds.length > 0 && (
                            <span className="mr-2 px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-mono font-bold">
                              {logStudentIds.length} محدد
                            </span>
                          )}:
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Scope Toggle: Assigned vs All */}
                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setStudentViewScope('linked')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                              studentViewScope === 'linked'
                                ? 'bg-[#1A365D] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="عرض الطلاب المنسوبين لك رسمياً"
                          >
                            <span>المنسوبون لي</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${studentViewScope === 'linked' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              {linkedStudentsList.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentViewScope('all')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                              studentViewScope === 'all'
                                ? 'bg-[#1A365D] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="عرض كافة طلاب المنصة النشطين للاختيار والتسجيل المباشر"
                          >
                            <span>كافة الطلاب</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${studentViewScope === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              {activeStudentsList.length}
                            </span>
                          </button>
                        </div>

                        {/* Visual Filter by System */}
                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setStudentSystemFilter('all')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              studentSystemFilter === 'all'
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            الكل ({effectiveBaseStudents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentSystemFilter('hourly')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                              studentSystemFilter === 'hourly'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            <Clock size={10} className={studentSystemFilter === 'hourly' ? 'text-white' : 'text-blue-600'} />
                            <span>الساعات ({hourlyCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentSystemFilter('session_40')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                              studentSystemFilter === 'session_40'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-amber-800 hover:bg-amber-50'
                            }`}
                          >
                            <GraduationCap size={11} className={studentSystemFilter === 'session_40' ? 'text-slate-950' : 'text-amber-600'} />
                            <span>40 دقيقة ({session40Count})</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notice if teacher has no linked students yet */}
                    {studentViewScope === 'linked' && linkedStudentsList.length === 0 && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 font-bold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-blue-600 shrink-0" />
                          <span>لم يتم تعيين طلاب منسوبين لك رسمياً بعد، يتم عرض كافة طلاب الأكاديمية النشطين لتتمكن من تسجيل الحصة بحرية.</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Student Search Bar in Log Session */}
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف عن الطالب المراد تسجيل حصة له..."
                        value={logStudentSearch}
                        onChange={(e) => setLogStudentSearch(e.target.value)}
                        className="w-full pr-9 pl-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 shadow-2xs"
                      />
                      {logStudentSearch && (
                        <button
                          type="button"
                          onClick={() => setLogStudentSearch('')}
                          className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                          title="مسح البحث"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 max-h-[240px] overflow-y-auto custom-scrollbar">
                      {filteredLinkedStudents.length === 0 ? (
                        <div className="col-span-full py-6 text-center space-y-2">
                          <p className="text-slate-500 text-xs font-bold leading-relaxed">
                            {logStudentSearch.trim()
                              ? `لم يتم العثور على طالب يطابق "${logStudentSearch}".`
                              : 'لا يوجد طلاب يطابقون الفلتر الحالي.'}
                          </p>
                          {studentViewScope === 'linked' && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentViewScope('all');
                                setStudentSystemFilter('all');
                              }}
                              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Users size={12} />
                              <span>البحث في كافة طلاب الأكاديمية ({activeStudentsList.length})</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredLinkedStudents.map(s => {
                          const isSelected = logStudentIds.includes(s.id);
                          const isSess40 = isStudentSession40Mode(s);
                          const isAssignedToTeacher = linkedStudentIdsSet.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  const updated = logStudentIds.filter(id => id !== s.id);
                                  setLogStudentIds(updated);
                                  if (updated.length === 0) {
                                    setLogCustomFee('');
                                    setShowAutoFillAlert(false);
                                  }
                                } else {
                                  setLogStudentIds(prev => [...prev, s.id]);
                                  // Auto-fill from last session of this student
                                  const sortedSess = [...sessions]
                                    .filter(sess => sess.studentId === s.id && sess.teacherId === loggedInTeacher.id && sess.approved !== false && (sess.subject || sess.customFee !== undefined))
                                    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
                                  const studentLastSess = sortedSess[0];
                                  if (studentLastSess) {
                                    if (studentLastSess.subject) {
                                      setLogSubject(studentLastSess.subject);
                                    }
                                    if (studentLastSess.customFee !== undefined && studentLastSess.customFee !== null) {
                                      setLogCustomFee(String(studentLastSess.customFee));
                                      setAutoFillFee('مضبوط مسبقاً من الإدارة');
                                    } else {
                                      setLogCustomFee('');
                                      setAutoFillFee('تلقائي معتمد');
                                    }
                                    setAutoFillSourceStudent(s.name);
                                    setAutoFillSubject(studentLastSess.subject || 'متابعة عامة');
                                    setShowAutoFillAlert(true);
                                    // Auto-dismiss after 6 seconds
                                    setTimeout(() => setShowAutoFillAlert(false), 6000);
                                  }
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-right cursor-pointer select-none transition-all active:scale-95 text-xs font-black relative group/btn ${
                                isSelected
                                  ? isSess40
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-950 ring-2 ring-amber-500/25 shadow-xs'
                                    : 'bg-[#1A365D]/10 border-[#1A365D] text-[#1A365D] ring-2 ring-[#1A365D]/25 shadow-xs'
                                  : isSess40
                                  ? 'bg-white border-amber-200/70 hover:bg-amber-50/40 hover:border-amber-300 text-slate-800'
                                  : 'bg-white border-slate-200 hover:bg-blue-50/30 hover:border-blue-200 text-slate-800'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isSelected 
                                  ? isSess40
                                    ? 'bg-amber-500 border-amber-600 text-slate-950'
                                    : 'bg-[#1A365D] border-[#1A365D] text-white' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check size={12} className="stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold leading-snug break-words">{s.name}</span>
                                    {isAssignedToTeacher ? (
                                      <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.2 rounded-md font-black shrink-0">
                                        ⭐ منسّب لك
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded-md font-bold shrink-0">
                                        طالب المنصة
                                      </span>
                                    )}
                                  </div>
                                  {isSess40 ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2 py-0.5 rounded-md border border-amber-400 shrink-0 shadow-2xs">
                                      <GraduationCap size={11} className="text-slate-950 shrink-0" />
                                      <span>حصص 40 دقيقة</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-2 py-0.5 rounded-md border border-blue-500 shrink-0 shadow-2xs">
                                      <Clock size={10} className="text-blue-100 shrink-0" />
                                      <span>حصص ساعات ({s.defaultSessionDurationMinutes === 30 ? '30 د' : '60 د'})</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 block mt-1">المستوى: {s.academicLevel || 'غير محدد'}</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Select Subject */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>المادة الدراسية</span>
                      <BookOpen size={13} className="text-[#D4A33C]" />
                    </label>
                    {loggedInTeacher.subjects && loggedInTeacher.subjects.length === 1 ? (
                      <div className="w-full px-4 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-between h-[52px]" dir="rtl">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="text-slate-500 font-bold">تم التثبيت لسرعة التسجيل:</span>
                          <span className="font-extrabold text-[#D4A33C]">{loggedInTeacher.subjects[0]}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg">خيار وحيد ذكي ✨</span>
                      </div>
                    ) : (
                      <select
                        value={logSubject}
                        onChange={e => setLogSubject(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none transition-all font-bold text-xs cursor-pointer h-[52px]"
                      >
                        <option value="">-- اختر المادة الدراسية --</option>
                        {loggedInTeacher.subjects?.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}
                  </div>

                </div>

                {/* Visual Mode Callout Banner */}
                {logStudentIds.length > 0 ? (
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isSession40Mode
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-amber-300 text-amber-950 shadow-xs'
                      : 'bg-gradient-to-r from-blue-500/10 via-blue-50 to-indigo-50 border-blue-200 text-blue-950 shadow-xs'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isSession40Mode
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                            : 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                        }`}>
                          {isSession40Mode ? <GraduationCap size={22} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm">
                              {isSession40Mode ? 'نظام حصص الـ 40 دقيقة (الحصص المدرسية)' : 'نظام حصص الساعات (الساعة الكاملة)'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                              isSession40Mode
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : 'bg-blue-100 text-blue-900 border-blue-200'
                            }`}>
                              مضبوط من الإدارة 🔒
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                            {isSession40Mode
                              ? 'تم ضبط الطالب المختار على نظام الـ 40 دقيقة للحصة الواحدة. يتم خصم الحصص التعليمية تلقائياً وفق هذا المعيار.'
                              : 'تم ضبط الطالب المختار على نظام الساعة الكاملة (60 دقيقة). يتم خصم رصيد الحصص بناءً على عدد الساعات التدريسية.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Conversions Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto justify-end">
                        {isSession40Mode ? (
                          <>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-amber-950 rounded-lg border border-amber-200 flex items-center gap-1 shadow-2xs">
                              <GraduationCap size={11} className="text-amber-700" />
                              1 حصة = 40 د
                            </span>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-amber-950 rounded-lg border border-amber-200 flex items-center gap-1 shadow-2xs">
                              <Clock size={10} className="text-amber-700" />
                              1.5 حصة = 60 د
                            </span>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-amber-950 rounded-lg border border-amber-200 flex items-center gap-1 shadow-2xs">
                              <GraduationCap size={11} className="text-amber-700" />
                              2 حصة = 80 د
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-blue-950 rounded-lg border border-blue-200 flex items-center gap-1 shadow-2xs">
                              <Clock size={10} className="text-blue-700" />
                              0.5 س = 30 د
                            </span>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-blue-950 rounded-lg border border-blue-200 flex items-center gap-1 shadow-2xs">
                              <Clock size={10} className="text-blue-700" />
                              1 ساعة = 60 د
                            </span>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-blue-950 rounded-lg border border-blue-200 flex items-center gap-1 shadow-2xs">
                              <Clock size={10} className="text-blue-700" />
                              1.5 ساعة = 90 د
                            </span>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/90 text-blue-950 rounded-lg border border-blue-200 flex items-center gap-1 shadow-2xs">
                              <Clock size={10} className="text-blue-700" />
                              2 ساعة = 120 د
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#D4A33C] shrink-0" />
                      <span className="text-[11px] font-extrabold text-slate-700">
                        أنظمة الحصص المتاحة بالمنصة (يتم التبديل تلقائياً بمجرد اختيار الطالب):
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-2.5 py-1 rounded-lg border border-blue-500 shadow-2xs">
                        <Clock size={11} className="text-blue-100" />
                        نظام الساعات (60 د / 30 د) ⏱️
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2.5 py-1 rounded-lg border border-amber-400 shadow-2xs">
                        <GraduationCap size={12} className="text-slate-950" />
                        نظام الـ 40 دقيقة 🎓
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
                  
                  {/* Duration & Session Count Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 justify-start">
                        <span>{isSession40Mode ? 'عدد الحصص والمدة المعتمدة' : 'عدد الساعات والمدة المعتمدة'}</span>
                        {isSession40Mode ? (
                          <GraduationCap size={14} className="text-amber-600" />
                        ) : (
                          <Clock size={13} className="text-blue-600" />
                        )}
                      </label>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                        isSession40Mode 
                          ? 'bg-amber-100 text-amber-950 border-amber-300' 
                          : 'bg-blue-100 text-blue-900 border-blue-200'
                      }`}>
                        <Lock size={9} />
                        {isSession40Mode ? 'نظام 40 دقيقة (المدير)' : 'نظام الساعات (المدير)'}
                      </span>
                    </div>

                    {/* Selector with (40, 60, 80, 120) or (30, 60, 90, 120, 180) */}
                    <div className={`grid gap-1.5 ${isSession40Mode ? 'grid-cols-4' : 'grid-cols-5'}`}>
                      {(isSession40Mode
                        ? [
                            { count: '1', mins: 40, label: '1 حصة', note: '40 د', icon: GraduationCap },
                            { count: '1.5', mins: 60, label: '1.5 حصة', note: '60 د', icon: Clock },
                            { count: '2', mins: 80, label: '2 حصة', note: '80 د', icon: GraduationCap },
                            { count: '3', mins: 120, label: '3 حصص', note: '120 د', icon: Sparkles },
                          ]
                        : [
                            { count: '0.5', mins: 30, label: '0.5 س', note: '30 د', icon: Clock },
                            { count: '1', mins: 60, label: '1 ساعة', note: '60 د (تلقائي)', icon: Clock },
                            { count: '1.5', mins: 90, label: '1.5 س', note: '90 د', icon: Clock },
                            { count: '2', mins: 120, label: '2 ساعة', note: '120 د', icon: Clock },
                            { count: '3', mins: 180, label: '3 ساعات', note: '180 د', icon: Sparkles },
                          ]
                      ).map((opt) => {
                        const isSelected = logDurationMinutes === opt.mins;
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.count}
                            type="button"
                            onClick={() => setLogDurationMinutes(opt.mins)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? isSession40Mode
                                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-600 text-slate-950 font-black shadow-sm ring-2 ring-amber-400'
                                  : 'bg-gradient-to-br from-[#1A365D] to-[#254A7B] border-[#1A365D] text-white font-black shadow-sm ring-2 ring-blue-400'
                                : isSession40Mode
                                ? 'bg-white border-amber-200 hover:border-amber-300 text-slate-700 font-bold hover:bg-amber-50/40'
                                : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700 font-bold hover:bg-blue-50/40'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <OptIcon size={11} className={isSelected ? (isSession40Mode ? 'text-slate-950' : 'text-blue-200') : (isSession40Mode ? 'text-amber-600' : 'text-blue-600')} />
                              <span className="text-[11px] font-black">{opt.label}</span>
                            </div>
                            <span className={`text-[10px] ${isSelected ? (isSession40Mode ? 'text-slate-900 font-black' : 'text-blue-100 font-bold') : 'text-slate-500 font-semibold'}`}>
                              {opt.note}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepper / Manual minute adjuster */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl h-[42px]">
                      <button
                        type="button"
                        onClick={() => setLogDurationMinutes(prev => Math.max(5, prev - (isSession40Mode ? 20 : 15)))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all font-bold active:scale-90 cursor-pointer text-xs"
                        title="تقليل المدة"
                      >
                        <ArrowDown size={13} className="stroke-[2.5]" />
                      </button>
                      
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          id="logDurationMinutesInput"
                          min="5"
                          step="5"
                          value={logDurationMinutes}
                          onChange={e => {
                            const val = e.target.value;
                            setLogDurationMinutes(val === '' ? 5 : Math.max(5, parseInt(val)));
                          }}
                          className="w-full text-center bg-transparent border-0 outline-none focus:ring-0 font-black text-slate-900 text-xs pr-1 pl-7"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">دقيقة</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLogDurationMinutes(prev => prev + (isSession40Mode ? 20 : 15))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all font-bold active:scale-90 cursor-pointer text-xs"
                        title="زيادة المدة"
                      >
                        <ArrowUp size={13} className="stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                      <Sparkles size={11} className="text-amber-600 shrink-0" />
                      <span>النظام المعتمد تم ضبطه تلقائياً وفق المرحلة الدراسية للطلبة</span>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>تاريخ اللقاء (تاريخ اليوم تلقائياً)</span>
                      <Calendar size={13} className="text-slate-400" />
                    </label>
                    <input 
                      type="date"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none font-bold text-xs h-[52px]"
                    />
                  </div>

                </div>

                {/* Topic Explained */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                    <span>الموضوع الذي تم شرحه في الحصة (اختياري)</span>
                    <BookOpen size={13} className="text-[#D4A33C]" />
                  </label>
                  <input 
                    type="text"
                    value={logTopic}
                    onChange={e => setLogTopic(e.target.value)}
                    placeholder="توضيح العناوين الرئيسية التي تناولتها الفعالية الدراسية (مثل: مراجعة الدوران في الهندسة المستوية)"
                    className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none font-semibold text-xs text-right placeholder-slate-400"
                    dir="rtl"
                  />
                </div>

                {/* Active Session Mode Summary Badge */}
                {logStudentIds.length > 0 && (
                  <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-black ${
                    isSession40Mode
                      ? 'bg-amber-500/15 border-amber-300 text-amber-950 shadow-xs'
                      : 'bg-blue-500/10 border-blue-200 text-blue-950 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {isSession40Mode ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                          <GraduationCap size={16} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Clock size={15} />
                        </div>
                      )}
                      <span className="leading-relaxed">
                        {isSession40Mode
                          ? `ملخص الحصة: ${logStudentIds.length} طالب • نظام حصص 40 دقيقة (${session40UnitsCount} حصة = ${logDurationMinutes} دقيقة)`
                          : `ملخص الحصة: ${logStudentIds.length} طالب • نظام حصص الساعات (${(logDurationMinutes / 60).toFixed(1)} ساعة = ${logDurationMinutes} دقيقة)`}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold shrink-0 border ${
                      isSession40Mode ? 'bg-amber-200 text-amber-950 border-amber-300' : 'bg-blue-200 text-blue-950 border-blue-300'
                    }`}>
                      جاهز للتسجيل المعتمد ✅
                    </span>
                  </div>
                )}

                {/* Confirm Button */}
                <div className="pt-2">

                  <button
                    onClick={handleLogSessionSubmit}
                    disabled={isLogging || logStudentIds.length === 0 || !logSubject}
                    className="w-full py-4 bg-[#1A365D] text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLogging ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <span>تسجيل الحصة للجميع 👥</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-[10px] text-blue-800 font-bold leading-relaxed flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>تنبيه: تأكد من تدوين المدة الدقيقة لضمان محاسبة الأكاديمية والطلبة بالشكل القانوني المنسق.</span>
                </div>

              </div>

            </div>

            {/* زر عائم لتسجيل الحصة السريعة بنقرة واحدة (Quick Session FAB) */}
            <QuickSessionFloatingButton
              loggedInTeacher={loggedInTeacher}
              students={students}
              linkedStudents={linkedStudentsList}
              selectedStudentIds={logStudentIds}
              currentSubject={logSubject}
              onSessionLogged={fetchMainData}
              calculateStudentBalance={calculateStudentBalance}
              globalThreshold={globalThreshold}
              formatRemainingSessionsText={formatRemainingSessionsText}
            />
          </>
          )}

          {/* TAB 1.2: Previous Sessions Archive & Management */}
          {activeSubTab === 'previous-sessions' && (() => {
            const teacherSessions = sessions
              .filter(s => s.teacherId === loggedInTeacher.id)
              .sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                if (dateB !== dateA) return dateB.localeCompare(dateA);
                return (b.startTime || '').localeCompare(a.startTime || '');
              });

            const totalHours = teacherSessions.reduce((acc, s) => acc + (s.durationHours || 1), 0);
            const distinctStudentIds = new Set(teacherSessions.map(s => s.studentId).filter(Boolean));
            const currentMonthStr = getLocalDateString().substring(0, 7);
            const thisMonthSessions = teacherSessions.filter(s => (s.date || '').startsWith(currentMonthStr));

            // Available months for filtering
            const availableMonths = Array.from(
              new Set(teacherSessions.map(s => (s.date || '').substring(0, 7)).filter(Boolean))
            ).sort().reverse();

            // Filtered sessions
            const filteredSessions = teacherSessions.filter(s => {
              const student = students.find(std => std.id === s.studentId);
              const studentName = student?.name || '';
              const subject = s.subject || '';
              const topic = s.topic || '';
              const notes = s.notes || '';

              if (previousSessionsStudentFilter !== 'all' && s.studentId !== previousSessionsStudentFilter) {
                return false;
              }

              if (previousSessionsMonthFilter !== 'all' && !(s.date || '').startsWith(previousSessionsMonthFilter)) {
                return false;
              }

              if (previousSessionsSearch.trim()) {
                const q = previousSessionsSearch.toLowerCase().trim();
                const matchName = studentName.toLowerCase().includes(q);
                const matchSub = subject.toLowerCase().includes(q);
                const matchTopic = topic.toLowerCase().includes(q);
                const matchNotes = notes.toLowerCase().includes(q);
                const matchDate = (s.date || '').includes(q);
                if (!matchName && !matchSub && !matchTopic && !matchNotes && !matchDate) {
                  return false;
                }
              }

              return true;
            });

            return (
              <div className="space-y-6 text-right" dir="rtl">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 font-black">
                        <History size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                            صلاحية معلم المادة ⚡️
                          </span>
                          <span className="text-xs text-indigo-200 font-bold">
                            إدارة وحذف الحصص
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                          أرشيف وسجل الحصص السابقة للمعلم
                        </h2>
                        <p className="text-xs text-indigo-200 mt-1 font-medium max-w-2xl leading-relaxed">
                          يمكنك من هذه اللوحة استعراض كافة الحصص الدراسية التي قمت بتسجيلها، وتعديل تفاصيلها، أو حذف أي حصة مسجلة عن طريق الخطأ؛ حيث سيتم استرداد الساعات المخصومة إلى رصيد الطالب فوراً وبشكل تلقائي.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsBalanceStatementModalOpen(true)}
                        className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all border border-emerald-400/30 shadow-md flex items-center gap-2 justify-center cursor-pointer shrink-0 active:scale-95"
                        title="تصدير كشف حساب الرصيد كملف PDF منظم مع تفاصيل العمليات لكل طالب خلال فترة زمنية محددة"
                      >
                        <FileDown size={15} className="text-amber-300" />
                        <span>تصدير كشف الرصيد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsExportReportModalOpen(true)}
                        className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs transition-all border border-white/20 shadow-md flex items-center gap-2 justify-center cursor-pointer shrink-0 active:scale-95"
                        title="تصدير تقرير شهري لجميع الحصص المسجلة وأسماء الطلاب وتواريخ الجلسات بصيغة PDF"
                      >
                        <FileDown size={15} className="text-amber-300" />
                        <span>تصدير تقرير شهري (PDF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('log-session')}
                        className="px-5 py-3 rounded-2xl bg-[#D4A33C] hover:bg-[#b0852d] text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-2 justify-center cursor-pointer shrink-0 active:scale-95"
                      >
                        <span>+ تسجيل حصة جديدة</span>
                        <Calendar size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                      <div className="text-[10px] text-indigo-200 font-bold">إجمالي الحصص المسجلة</div>
                      <div className="text-xl font-black text-white mt-0.5">{teacherSessions.length} حصة</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                      <div className="text-[10px] text-indigo-200 font-bold">إجمالي الساعات المنجزة</div>
                      <div className="text-xl font-black text-amber-300 mt-0.5">{totalHours.toFixed(1)} س</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                      <div className="text-[10px] text-indigo-200 font-bold">عدد الطلاب المستفيدين</div>
                      <div className="text-xl font-black text-white mt-0.5">{distinctStudentIds.size} طالب</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                      <div className="text-[10px] text-indigo-200 font-bold">حصص الشهر الحالي</div>
                      <div className="text-xl font-black text-emerald-300 mt-0.5">{thisMonthSessions.length} حصة</div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                      <input
                        type="text"
                        value={previousSessionsSearch}
                        onChange={(e) => setPreviousSessionsSearch(e.target.value)}
                        placeholder="ابحث باسم الطالب، المادة، التاريخ..."
                        className="w-full pr-10 pl-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                      />
                      <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      {previousSessionsSearch && (
                        <button
                          type="button"
                          onClick={() => setPreviousSessionsSearch('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      {/* Filter by Student */}
                      <select
                        value={previousSessionsStudentFilter}
                        onChange={(e) => setPreviousSessionsStudentFilter(e.target.value)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">جميع الطلاب ({distinctStudentIds.size})</option>
                        {Array.from(distinctStudentIds).map(stId => {
                          const st = students.find(s => s.id === stId);
                          return (
                            <option key={stId} value={stId}>
                              {st?.name || stId}
                            </option>
                          );
                        })}
                      </select>

                      {/* Filter by Month */}
                      <select
                        value={previousSessionsMonthFilter}
                        onChange={(e) => setPreviousSessionsMonthFilter(e.target.value)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">كافة الأشهر</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      {(previousSessionsSearch || previousSessionsStudentFilter !== 'all' || previousSessionsMonthFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviousSessionsSearch('');
                            setPreviousSessionsStudentFilter('all');
                            setPreviousSessionsMonthFilter('all');
                          }}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          إعادة ضبط
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsExportReportModalOpen(true)}
                        className="text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title="تصدير تقرير شهري لجميع الحصص المسجلة وأسماء الطلاب وتواريخ الجلسات بصيغة PDF"
                      >
                        <FileDown size={14} />
                        <span>تصدير تقرير PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold pt-2 border-t border-slate-100">
                    <span>عدد الحصص المعروضة: <strong className="text-slate-900">{filteredSessions.length}</strong> من أصل {teacherSessions.length}</span>
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      يمكنك حذف أي حصة في حال تسجيلها بالخطأ أو تكرارها
                    </span>
                  </div>
                </div>

                {/* Sessions Cards Grid */}
                {filteredSessions.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <History size={26} />
                    </div>
                    <h3 className="text-sm font-black text-slate-700">لا توجد حصص تطابق خيارات البحث</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                      لم يتم العثور على أي حصص مسجلة مطابقة لمعايير البحث الحالية. جرب تغيير عوامل التصفية أو تسجيل حصة جديدة.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSessions.map((session) => {
                      const student = students.find(st => st.id === session.studentId);
                      
                      const formatDuration = (hours: number = 1) => {
                        if (hours === 0.5) return '30 دقيقة';
                        if (hours === 0.67 || hours === 0.66) return '40 دقيقة (حصة)';
                        if (hours === 1) return 'ساعة واحدة';
                        if (hours === 1.5) return 'ساعة ونصف';
                        if (hours === 2) return 'ساعتان';
                        return `${hours} ساعة`;
                      };

                      return (
                        <div
                          key={session.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400/50 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                          
                          <div>
                            {/* Card Top: Student & Subject */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                  {student?.name?.charAt(0) || 'ط'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                                    {student?.name || 'طالب غير محدد'}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    {student?.grade || student?.academicLevel || 'طالب مسجل'}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0 border border-blue-100">
                                📚 {session.subject || 'متابعة'}
                              </span>
                            </div>

                            {/* Topic & Notes */}
                            {session.topic && (
                              <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-700">
                                <span className="text-slate-400 text-[10px] block">عنوان وموضوع الحصة:</span>
                                <span className="text-slate-800 font-black">{session.topic}</span>
                              </div>
                            )}

                            {session.notes && (
                              <p className="text-[10px] text-slate-500 font-medium mt-2 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/50 leading-relaxed">
                                📝 "{session.notes}"
                              </p>
                            )}

                            {/* Session Metrics Bar */}
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                <span>{session.date || 'بدون تاريخ'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-slate-400" />
                                <span>{session.startTime || '16:00'} ({formatDuration(session.durationHours || 1)})</span>
                              </div>
                            </div>
                          </div>

                          {/* Footer & Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              مكتملة
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className="p-1.5 px-2.5 rounded-xl bg-slate-50 text-slate-400 font-bold text-[9px] flex items-center gap-1 border border-slate-200" title="تعديل وقت وتاريخ الحصة محصور بمدير المنصة فقط 🔒">
                                <Lock size={10} className="text-slate-400" />
                                <span>التعديل للمدير</span>
                              </span>

                              {/* Delete Session (Subject Teacher Privilege) */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-all duration-200 cursor-pointer text-[10px] font-black flex items-center gap-1.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 border border-rose-150 hover:border-rose-600 group/del"
                                title="حذف الحصة واسترداد الرصيد لمحفظة الطالب تلقائياً"
                              >
                                <Trash2 size={13} className="transition-transform group-hover/del:scale-110" />
                                <span>حذف الحصة</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 1.5: Log Group Session */}
          {activeSubTab === 'log-group-session' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 text-right">
              
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">تسجيل حصة جماعية مكتملة</h2>
                  <p className="text-[10px] text-slate-400 font-semibold">يقوم هذا النموذج برصد ساعات الحصة وخصمها تلقائياً من رصيد كل طالب مسجل بالمجموعة، وتوثيق الحصة في سجلك الأكاديمي.</p>
                </div>
              </div>

              {groupLogSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-855 p-4.5 rounded-2xl flex items-center gap-3 text-right"
                >
                  <CheckCircle2 className="text-emerald-700 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-black text-emerald-900">رائع! تم تسجيل الحصة الجماعية وتحديث رصيد الحصص بنجاح 🌟</p>
                    <p className="text-xs mt-1 text-emerald-700 font-bold leading-relaxed">
                      تم رصد الحصة بنجاح وسيتلقى المشرف التقرير الأكاديمي فوراً لدورة ({groupCourses.find(c => c.id === logGroupCourseId)?.name}) المشتركة.
                    </p>
                  </div>
                </motion.div>
              )}

              {groupLogError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-800 p-4.5 rounded-2xl flex items-center gap-3 text-right text-xs font-bold leading-relaxed"
                >
                  <AlertCircle className="text-rose-700 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-black text-rose-900">وقع خطأ أثناء تسجيل ورصد الحصة الجماعية ⚠️</p>
                    <p className="text-xs mt-1 text-rose-700 font-medium leading-relaxed">
                      {groupLogError}
                    </p>
                  </div>
                </motion.div>
              )}

              {groupCourses.filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active')).length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-black text-slate-800">لا توجد دورات جماعية نشطة باسمك حالياً</p>
                  <p className="text-xs text-slate-400 mt-1">تواصل مع إدارة المنصة لتأسيس وتنسيب دوراتك الجماعية وتعديل الطلاب المنتسبين إليها.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Select Group Course */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block mr-0.5">الدورة الجماعية النشطة *</label>
                      <select
                        value={logGroupCourseId}
                        onChange={(e) => setLogGroupCourseId(e.target.value)}
                        className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1A365D] outline-none text-right font-bold text-xs cursor-pointer"
                      >
                        <option value="">-- اختر الدورة الجماعية --</option>
                        {groupCourses
                          .filter(c => c.teacherId === loggedInTeacher.id && (c.status?.toLowerCase() === 'active'))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Quick Course Rate details */}
                    {groupCourses.find(c => c.id === logGroupCourseId) && (() => {
                      const selectedC = groupCourses.find(c => c.id === logGroupCourseId)!;
                      return (
                        <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex flex-col justify-center text-right space-y-1">
                          <span className="text-[10px] font-black text-indigo-700">معلومات الدورة:</span>
                          <span className="text-xs font-bold text-slate-700">عدد الطلاب بالدورة: <strong>{selectedC.studentIds?.length || 0} طلاب</strong></span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 mr-0.5">عدد ساعات الحصة المنفذة *</label>
                      <input
                        type="number"
                        step="0.5"
                        value={groupLogDuration}
                        onChange={(e) => setGroupLogDuration(Math.max(0.5, parseFloat(e.target.value) || 0))}
                        className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1A365D] outline-none text-right font-semibold text-xs"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 mr-0.5">تاريخ وتوقيت الحصة *</label>
                      <input
                        type="date"
                        value={groupLogDate}
                        onChange={(e) => setGroupLogDate(e.target.value)}
                        className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1A365D] outline-none text-right font-bold text-xs cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 mr-0.5 flex items-center gap-1.5 justify-start">
                      <span>الموضوع الذي تم شرحه في الحصة (اختياري)</span>
                      <BookOpen size={13} className="text-[#D4A33C]" />
                    </label>
                    <input 
                      type="text"
                      value={groupLogTopic}
                      onChange={e => setGroupLogTopic(e.target.value)}
                      placeholder="توضيح العناوين الرئيسية التي تناولتها الفعالية الدراسية (مثل: مراجعة الدوران في الهندسة المستوية)"
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1A365D] outline-none font-semibold text-xs text-right placeholder-slate-400"
                      dir="rtl"
                    />
                  </div>

                  {/* Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 mr-0.5">موضوع الدراسة / ملخص الحصة (اختياري)</label>
                    <textarea
                      value={groupLogNote}
                      onChange={(e) => setGroupLogNote(e.target.value)}
                      rows={3}
                      placeholder="اكتب مواضيع شرح الحصة، الواجب المعطى ومستوى تفاعل طلاب المجموعة..."
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1A365D] outline-none text-right font-medium text-xs leading-relaxed"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleLogGroupSessionSubmit}
                      disabled={isGroupLogging}
                      className="w-full py-4.5 bg-[#1A365D] hover:bg-[#122643] text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-900/10 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGroupLogging ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>جاري تسجيل ورصد الحصة الجماعية...</span>
                        </>
                      ) : (
                        <>
                          <Users size={16} />
                          <span>رصد وتوثيق الحصة الجماعية وخصم الساعات لجميع الطلاب</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-[10px] text-blue-800 font-bold leading-relaxed flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>تنبيه: سيتم خصم ساعات الحصة تلقائياً وتحديث رصيد الحصص المتبقية لجميع الطلاب المسجلين بالدورة.</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Book Appointment (Contingent on Student Wallet Balance) */}
          {activeSubTab === 'book-session' && (
            <div className="space-y-6">
              {/* Main Directory & Search Widget */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#1A365D] flex items-center justify-center">
                    <Clock size={20} className="text-[#D4A33C]" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black text-slate-950">توفر ساعات الطلاب (المنسبين وإمكانية الحجز)</h2>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      تصفّح قائمة الطلاب المنسبين إليك وساعاتهم المتوفرة بالمحفظة التعليمية مع ميزة البحث الذكي دون حاجة لحجز موعد.
                    </p>
                  </div>
                </div>

                {/* Real-time Interactive Search Bar */}
                <div className="relative text-right max-w-xl mx-auto md:mx-0">
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-450" />
                  <input
                    type="text"
                    value={bookStudentSearchQuery}
                    onChange={e => setBookStudentSearchQuery(e.target.value)}
                    placeholder="البحث السريع عن طالب بالاسم أو الصف الدراسي..."
                    className="w-full pr-11 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:ring-4 focus:ring-blue-900/5 focus:bg-white focus:border-[#1A365D] outline-none transition-all placeholder-slate-400 text-right"
                    dir="rtl"
                  />
                  {bookStudentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBookStudentSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-650 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      تفريغ ✕
                    </button>
                  )}
                </div>

                {/* Active Assigned Students Directory Cards */}
                <div>
                  <h3 className="text-xs font-black text-slate-800 mb-3 text-right">قائمة الطلاب المنسبين وساعاتهم المتبقية ({filteredBookStudentsList.length})</h3>
                  
                  {filteredBookStudentsList.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-black text-slate-600">لا يوجد طلاب يطابقون بحثك حالياً</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">تأكد من كتابة الاسم الصحيح أو الصف الدراسي للطلاب المسجلين تحت إشرافك.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBookStudentsList.map(item => {
                        const availableHours = calculateStudentHours(item.id);
                        const balance = calculateStudentBalance(item.id);
                        const isSelected = bookStudentId === item.id;
                        
                        return (
                          <div 
                            key={item.id}
                            className={`border rounded-2xl p-4.5 transition-all duration-300 text-right flex flex-col justify-between ${
                              isSelected 
                                ? 'bg-[#1A365D]/5 border-[#1A365D] ring-2 ring-[#1A365D]/10' 
                                : 'bg-white hover:bg-slate-50/55 border-slate-200 hover:border-slate-300 shadow-sm'
                            }`}
                            dir="rtl"
                          >
                            <div className="space-y-2">
                              {/* Top metadata row */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                  item.gender === 'Female' 
                                    ? 'bg-pink-100/70 text-pink-600 border border-pink-200/40' 
                                    : 'bg-blue-100/70 text-blue-600 border border-blue-200/40'
                                }`}>
                                  {item.gender === 'Female' ? 'أنثى 🌸' : 'ذكر 👤'}
                                </span>
                                
                                {item.grade ? (
                                  <span className="text-[9.5px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/30">
                                    الصف {item.grade}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] font-bold text-slate-300">بلا صف تجميلي</span>
                                )}
                              </div>

                              {/* Student name */}
                              <h4 className="text-xs font-extrabold text-slate-900 tracking-tight leading-snug">{item.name}</h4>

                              {/* Student contact details */}
                              <div className="text-[10px] text-slate-400 space-y-0.5 font-medium">
                                {item.phone ? (
                                  <p className="font-mono">هاتف: {item.phone}</p>
                                ) : (
                                  <p className="text-slate-300 font-bold">بلا تفاصيل اتصال</p>
                                )}
                              </div>

                              {/* Dynamic Hours Meter */}
                            </div>

                            {/* Select / Schedule button */}
                            <div className="mt-4 pt-3 border-t border-slate-50">
                              <button
                                type="button"
                                onClick={() => {
                                  setBookStudentId(item.id);
                                  setBookError('');
                                  setTimeout(() => {
                                    document.getElementById('booking-form-card')?.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                                className={`w-full py-2 px-3.5 rounded-xl text-[10px] font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-[#1A365D] hover:bg-[#0D365A] text-white shadow-md' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-[#1A365D] hover:text-white'
                                }`}
                              >
                                <CalendarPlus size={12} />
                                <span>{isSelected ? 'تم الاختيار كطالب مستهدف للحجز ✓' : 'حجز موعد جديد لهذا الطالب 📅'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Booking Scheduler Form - Expanded on student selection */}
              <div id="booking-form-card" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="text-right">
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {bookStudentId 
                        ? `نموذج جدولة موعد للطالب المختار: (${students.find(s => s.id === bookStudentId)?.name || ''})` 
                        : 'نموذج جدولة موعد حصة جديدة 🗓️'
                      }
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {bookStudentId 
                        ? 'يرجى مراجعة تفاصيل الحصة والموضوع والتواريخ أدناه لتأكيد الإدراج في جدول الرصيد.' 
                        : 'يرجى تحديد طالب من القائمة أعلاه أو اختياره مباشرة لتحديث الموعد.'
                      }
                    </p>
                  </div>
                  
                  {bookStudentId && (
                    <button
                      type="button"
                      onClick={() => setBookStudentId('')}
                      className="text-[10px] font-black text-rose-600 hover:text-rose-800 transition cursor-pointer"
                    >
                      إلغاء التحديد الحسابي ✕
                    </button>
                  )}
                </div>

                {linkSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-855 p-4.5 rounded-2xl flex items-center gap-3 text-right"
                  >
                    <CheckCircle2 className="text-emerald-600 shrink-0 animate-bounce" size={20} />
                    <div>
                      <p className="text-sm font-black text-emerald-900 font-sans">تم ربط الطالب بملفك بنجاح! 🎉</p>
                      <p className="text-xs mt-1 text-emerald-705 font-medium leading-relaxed">
                        تمت إضافة الطالب ({students.find(s => s.id === bookStudentId)?.name || 'الذي اخترته'}) بنجاح إلى جدول رصيد إشرافك المباشر. يمكنك الآن حجز المواعيد أو تسجيل الحصص له بكل يسر وسهولة.
                      </p>
                    </div>
                  </motion.div>
                )}

                {bookSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-855 p-4.5 rounded-2xl flex items-center gap-3 text-right"
                  >
                    <CheckCircle2 className="text-emerald-600 shrink-0 animate-bounce" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-emerald-900 font-sans">رائع وممتاز! تم حجز وجدولة الحصة التعليمية بنجاح 📅</p>
                      <p className="text-xs mt-1 text-emerald-705 font-medium leading-relaxed">
                        خطوة ذكية نحو تفعيل التميز! تم حجز وتدوين موعد الحصة لمادة ({bookSubject}) لصالح الطالب ({students.find(s => s.id === bookStudentId)?.name || 'الذي اخترته'}) بتاريخ ({formatCustomDate(bookDate)}) بنجاح. تمنياتنا لكما بلقاء مثمر ومليء بالإنجاز! ✨
                      </p>
                      <div className="mt-3 flex justify-start">
                        <a
                          id="add-to-google-calendar-button"
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`حصة ${bookSubject} - ${students.find(s => s.id === bookStudentId)?.name || 'طالب'}`)}&dates=${(() => {
                            try {
                              const dateStr = bookDate || getLocalDateString();
                              const timeStr = bookStartTime || '16:00';
                              const startDateObj = new Date(`${dateStr}T${timeStr}:00`);
                              if (isNaN(startDateObj.getTime())) {
                                return '';
                              }
                              const durationMinutes = (bookDuration || 1) * 60;
                              const endDateObj = new Date(startDateObj.getTime() + durationMinutes * 60 * 1000);
                              const pad = (num: number) => String(num).padStart(2, '0');
                              const formatForCal = (d: Date) => {
                                const year = d.getFullYear();
                                const month = pad(d.getMonth() + 1);
                                const day = pad(d.getDate());
                                const hours = pad(d.getHours());
                                const minutes = pad(d.getMinutes());
                                const seconds = pad(d.getSeconds());
                                return `${year}${month}${day}T${hours}${minutes}${seconds}`;
                              };
                              return `${formatForCal(startDateObj)}/${formatForCal(endDateObj)}`;
                            } catch (err) {
                              return '';
                            }
                          })()}&details=${encodeURIComponent(`حصة مادة ${bookSubject} المجدولة عبر أكاديمية التفوق.\nالطالب: ${students.find(s => s.id === bookStudentId)?.name || 'طالب'}\nالمدة: ${bookDuration} ساعة\nالتوقيت: ${bookStartTime || '16:00'}`)}&sf=true&output=xml`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl transition-colors cursor-pointer shadow-md shadow-emerald-600/15"
                        >
                          <CalendarPlus size={13} />
                          <span>إضافة إلى تقويم Google</span>
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}

                {bookError && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-200 text-rose-855 p-4.5 rounded-2xl flex items-start gap-3 text-right"
                  >
                    <AlertCircle className="text-rose-650 shrink-0 mt-0.5 animate-bounce" size={20} />
                    <div>
                      <p className="text-sm font-black text-rose-900 font-sans">تنبيه فحص ملاءمة محفظة الحصص</p>
                      <p className="text-xs mt-1 text-rose-705 font-medium leading-relaxed">{bookError}</p>
                      <p className="text-[10px] mt-1.5 text-rose-600 font-bold leading-relaxed">
                        💡 فكرة مساعدة: تواصل مع ولي الأمر بريادة أو اطلب من الإدارة شحن الرصيد ليتسنى لكما تثبيت الموعد.
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
                    
                    {/* Select Student */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                        <span>الطالب لحجز الحصة له</span>
                        <Users size={13} className="text-slate-400" />
                      </label>
                      <select
                        id="booking-student-select-field"
                        value={bookStudentId}
                        onChange={e => {
                          setBookStudentId(e.target.value);
                          setBookError('');
                        }}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none transition-all font-bold text-xs"
                      >
                        <option value="">-- اختر الطالب المستهدف للحصّة --</option>
                        {linkedStudentsList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                        <span>المادة الدراسية</span>
                        <BookOpen size={13} className="text-[#D4A33C]" />
                      </label>
                      {loggedInTeacher.subjects && loggedInTeacher.subjects.length === 1 ? (
                        <div className="w-full px-4 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl font-bold text-xs flex items-center justify-between h-[52px]" dir="rtl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-slate-500 font-bold">تم التثبيت لسرعة الحجز:</span>
                            <span className="font-extrabold text-[#D4A33C]">{loggedInTeacher.subjects[0]}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg">خيار وحيد ذكي ✨</span>
                        </div>
                      ) : (
                        <select
                          value={bookSubject}
                          onChange={e => setBookSubject(e.target.value)}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-[#CBD5E1] rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none transition-all font-bold text-xs cursor-pointer h-[52px]"
                        >
                          <option value="">-- اختر المادة الدراسية --</option>
                          {loggedInTeacher.subjects?.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
                    
                    {/* Duration Slider / Picker */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                        <span>المدة المتوقعة (ساعات)</span>
                        <Clock size={13} className="text-slate-400" />
                      </label>
                      <div className="flex flex-col gap-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <input 
                            type="range"
                            min="0.5"
                            max="6"
                            step="0.25"
                            value={bookDuration || ''}
                            onChange={e => setBookDuration(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A365D]"
                          />
                          <div className="relative w-23 shrink-0">
                            <input
                              type="number"
                              min="0.1"
                              max="12"
                              step="0.1"
                              value={bookDuration === 0 ? '' : bookDuration}
                              onChange={e => {
                                const val = e.target.value;
                                setBookDuration(val === '' ? 0 : parseFloat(val));
                              }}
                              onBlur={() => {
                                if (!bookDuration || bookDuration < 0.1) setBookDuration(1);
                              }}
                              className="w-full text-center pr-2 pl-6 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 text-xs focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none"
                              placeholder="عدد"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#1A365D]/70 pointer-events-none">س</span>
                          </div>
                        </div>
                        
                        {/* Presets */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {[0.75, 1, 1.5, 2, 3].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setBookDuration(p)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                bookDuration === p
                                  ? 'bg-[#1A365D] text-white'
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {p === 0.75 ? '45 د' : `${p} س`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Date & Time Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 flex items-center gap-1.5 justify-start">
                          <span>تاريخ الحصة المجدولة</span>
                          <Calendar size={13} className="text-slate-400" />
                        </label>
                        <input 
                          type="date"
                          value={bookDate}
                          onChange={e => setBookDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none font-bold text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-600 flex items-center gap-1.5 justify-start">
                          <span>ساعة البدء (موعد الحصة)</span>
                          <Clock size={13} className="text-slate-400" />
                        </label>
                        <input 
                          type="time"
                          value={bookStartTime}
                          onChange={e => setBookStartTime(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none font-bold text-xs"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Booking Topic Explained */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>الموضوع الذي سيتم شرحه في الحصة (اختياري)</span>
                      <BookOpen size={13} className="text-[#D4A33C]" />
                    </label>
                    <input 
                      type="text"
                      value={bookTopic}
                      onChange={e => setBookTopic(e.target.value)}
                      placeholder="توضيح العنوان أو الخطة الدراسية للحصة (مثال: مدخل للوحدة الرابعة هندسة أو تطبيقات المتتاليات الحسابية)"
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-900/5 focus:border-[#1A365D] outline-none font-semibold text-xs text-right placeholder-slate-400"
                      dir="rtl"
                    />
                  </div>

                  {/* Confirm Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleBookSessionSubmit}
                      disabled={isBooking || !bookStudentId || !bookSubject || calculateStudentHours(bookStudentId) <= 0}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isBooking ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <span>تأكيد وجدولة موعد الحصة الأكاديمية</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>
                    {!bookStudentId && (
                      <p className="text-[10px] text-amber-600 font-bold text-center mt-2 leading-relaxed">
                        ⚠️ يرجى اختيار أحد الطلاب من القائمة أعلاه أولاً ليتم التحقق من ميزانيته وتمكين الحجز.
                      </p>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 3: AI Planner & Worksheet Builder */}
          {activeSubTab === 'ai-planner' && !academicAIEnabled && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-12 text-center space-y-8 max-w-4xl mx-auto relative overflow-hidden" dir="rtl">
              {/* Top Accent line or indicator */}
              <div className="absolute top-0 right-0 w-full h-1.5 bg-amber-500" />
              
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 text-[#D4A33C] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <Sparkles size={38} className="animate-pulse" />
                </div>
                
                <div className="space-y-3">
                  <span className="bg-amber-500/10 text-[#D4A33C] text-[10px] font-black tracking-wider px-3 py-1.5 rounded-full border border-[#D4A33C]/20 inline-block uppercase animate-bounce">
                    بوابة الذكاء الاصطناعي الأكاديمي الشاملة ⚡
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 leading-snug">ميزات الذكاء الاصطناعي الأكاديمي تطلب تفعيلاً أو ترقية</h2>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    ميزات الذكاء الاصطناعي الأكاديمي غير مفعلة حاليًا على حسابك. يرجى مراجعة إدارة الأكاديمية لتفعيل الميزة أو الترقية للخدمة للبدء في توليد الدروس وتصميم أوراق العمل الذكية الفورية!
                  </p>
                </div>
              </div>

              {/* Three detailed features unlocked upon direct activation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-4 text-right">
                
                {/* Feature 1 */}
                <div className="bg-slate-50/60 border border-slate-200/50 hover:border-amber-500/30 rounded-3xl p-6 transition-all space-y-3 relative group">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">توليد الدروس والملخصات</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    توفير أداة ذكية مخصصة تلخص وبدقة كافة تفاصيل المناهج التعليمية وتقدم شروحات منسقة بناءً على مدخلات المعلم.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-slate-50/60 border border-slate-200/50 hover:border-amber-500/30 rounded-3xl p-6 transition-all space-y-3 relative group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <BookOpenCheck size={18} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">تأليف وبناء محتوى الشرح</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    صياغة وبناء محتوى الشرح المدرسي بطريقة تتوافق تمامًا وبشكل دقيق مع المناهج التعليمية المعتمدة ونماذج البجروت الرسمية.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-slate-50/60 border border-slate-200/50 hover:border-amber-500/30 rounded-3xl p-6 transition-all space-y-3 relative group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <BookmarkCheck size={18} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">تصميم أوراق العمل الذكية</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    إنشاء أوراق عمل تفاعلية واختبارات قصيرة تحتوي تلقائيًا على مساحات حلول مخصصة وكافية لإجابات الطلاب دون تداخل للنصوص.
                  </p>
                </div>

              </div>

              {/* Action buttons (either simulated upgrade or request) */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={handleActivateAIService}
                  disabled={isGenerating}
                  className="w-full py-4 px-6 bg-[#D4A33C] hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>تنشيط وتفعيل الخدمة فوراً (ترقية سريعة للخدمة)</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'ai-planner' && academicAIEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Right Column: Primary form generator & viewer */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black text-slate-950">توليد المناهج وتصنيف المخرجات بالذكاء الاصطناعي</h2>
                    <p className="text-[10px] text-slate-400 font-semibold font-sans">تطوير أوراق عمل وبناء شروحات مرجعية مصنفة للمدارس الثانوية وامتحانات البجروت الرسمية.</p>
                  </div>
                </div>

                {/* Sub-planner Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto text-right">
                  <button
                    type="button"
                    onClick={() => setActivePlannerView('generator')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      activePlannerView === 'generator'
                        ? 'bg-[#D4A33C] text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>صانع ومصمم المحتوى 🧠</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlannerView('repository')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePlannerView === 'repository'
                        ? 'bg-[#D4A33C] text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    <FolderPlus size={14} />
                    <span>مستودع المخرجات والوسوم (Tags) 📂</span>
                    {eduResources.length > 0 && (
                      <span className="bg-slate-950 text-[#D4A33C] text-[10px] font-sans font-black px-1.5 py-0.5 rounded-full">
                        {eduResources.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-2 mb-2" />

              {activePlannerView === 'generator' ? (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Worksheet Level / Mode Selector Inside the Form */}
                  <div className="bg-slate-50 border border-slate-205/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right" dir="rtl">
                    <div>
                      <span className="text-xs font-black text-slate-850 block">حدد طبيعة ونطاق المخرج الأكاديمي المطلوب:</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto text-right">
                      <button
                        type="button"
                        onClick={() => setAiIsWorksheet(false)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          !aiIsWorksheet
                            ? 'bg-[#D4A33C] text-slate-950 shadow-sm'
                            : 'text-slate-650 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        <BookOpen size={11} />
                        <span>إنشاء شرح ومحتوى تعليمي 📑</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiIsWorksheet(true)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          aiIsWorksheet
                            ? 'bg-[#D4A33C] text-slate-950 shadow-sm'
                            : 'text-slate-650 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        <BookmarkCheck size={11} />
                        <span>إنشاء ورقة عمل للبجروت ✍️</span>
                      </button>
                    </div>
                  </div>

                  {/* OpenAI API / ChatGPT Model & Engine Selector */}
                  <div className="bg-gradient-to-r from-emerald-950/10 via-emerald-900/5 to-slate-50 border border-emerald-500/30 rounded-2xl p-4 text-right flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xs" dir="rtl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                        <Bot size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900">محرك ChatGPT المتصل مباشرة عبر OpenAI API 🤖</h4>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {aiApiStatus.openaiAvailable ? 'OpenAI API متصل ونشط' : 'OpenAI API جاهز'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                          تم ربط المنصة مباشرة بـ ChatGPT لتوليد أوراق العمل والمخططات الأكاديمية ونماذج البجروت.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
                      <span className="text-[10px] font-black text-slate-600">اختر النموذج:</span>
                      <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                        <button
                          type="button"
                          onClick={() => { setAiProvider('openai'); setAiModel('gpt-4o'); }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            aiProvider === 'openai' && aiModel === 'gpt-4o'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-650 hover:text-slate-950 bg-transparent'
                          }`}
                        >
                          <span>ChatGPT 4o</span>
                          <span className="text-[8px] bg-black/20 px-1 py-0.5 rounded text-emerald-100 font-sans">الأقوى للبجروت</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAiProvider('openai'); setAiModel('gpt-4o-mini'); }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            aiProvider === 'openai' && aiModel === 'gpt-4o-mini'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-650 hover:text-slate-950 bg-transparent'
                          }`}
                        >
                          <span>ChatGPT 4o-mini</span>
                          <span className="text-[8px] bg-black/20 px-1 py-0.5 rounded text-emerald-100 font-sans">سريع</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAiProvider('gemini'); setAiModel('gemini-3.8-flash'); }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            aiProvider === 'gemini'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-slate-650 hover:text-slate-950 bg-transparent'
                          }`}
                        >
                          <span>Google Gemini</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Israel Ministry of Education Curriculum Standards Notice */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-right flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-1">
                <div className="flex items-start gap-3">
                  <Award className="text-[#D4A33C] shrink-0 mt-0.5 animate-pulse" size={18} />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">توليد أكاديمي متوافق مع نظام وزارة المعارف الإسرائيلية 🎓</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      نظام توليد الأسئلة والشروحات يحاكي المنهاج الإسرائيلي الرسمي بالكامل بما يشمل مستويات البجروت من 3 إلى 5 وحدات تعليمية وبأعلى معايير الدقة والضبط العلمي للاصطلاحات والرموز.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-center bg-[#D4A33C]/10 text-[#D4A33C] text-[9px] font-extrabold px-2.5 py-1 rounded-full border border-[#D4A33C]/20 shrink-0">
                  منهاج رسمي معتمد
                </span>
              </div>

              {aiError && (
                <div className="bg-rose-50 border border-rose-205 text-rose-800 p-4.5 rounded-2xl flex items-center gap-3 text-right text-xs font-bold">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right font-bold">
                
                {/* Subject Material with Dynamic Source Adoption */}
                <div className="space-y-1.5 font-bold">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 justify-start">
                      <span>المادة الدراسية والمصادر المعتمدة</span>
                      <BookOpenCheck size={13} className="text-[#D4A33C]" />
                    </label>
                    {teacherAssignedSubjects.length > 0 && (
                      <span className="text-[9px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        مادتك: {teacherAssignedSubjects[0]}
                      </span>
                    )}
                  </div>

                  {/* Subject Dropdown Selector */}
                  <select
                    value={aiSubject}
                    onChange={e => handleSelectAiSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#D4A33C] rounded-xl focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-black text-xs cursor-pointer shadow-xs"
                  >
                    <option value="">-- اختر المادة الدراسية --</option>
                    <optgroup label="المواد العلمية والطبيعية (مع اعتماد المصادر والمحاكاة)">
                      <option value="كيمياء">🧪 كيمياء (اعتماد منصة VebSchool Chemistry ونماذج البجروت)</option>
                      <option value="فيزياء">⚡ فيزياء (اعتماد محاكاة PhET وبنك أسئلة الميكانيكا والكهرباء)</option>
                      <option value="بيولوجيا">🌿 بيولوجيا / أحياء (اعتماد أطلس الخلية والوراثة والعلوم الحياتية)</option>
                      <option value="رياضيات">📐 رياضيات (اعتماد نماذج امتحانات البجروت 3 و 4 و 5 وحدات)</option>
                      <option value="علوم عامة">🔬 علوم عامة وتكنولوجيا</option>
                    </optgroup>
                    <optgroup label="اللغات والآداب">
                      <option value="لغة عربية">📖 لغة عربية وأدب</option>
                      <option value="لغة إنجليزية">🔤 لغة إنجليزية (English Modules)</option>
                      <option value="لغة عبرية">🇮🇱 لغة عبرية (عبرية محادثة وبجروت)</option>
                    </optgroup>
                    <optgroup label="العلوم الاجتماعية والإنسانية">
                      <option value="تاريخ">📜 تاريخ</option>
                      <option value="مدنيات">⚖️ مدنيات</option>
                      <option value="جغرافيا">🌍 جغرافيا وبيئة</option>
                      <option value="حاسوب وتكنولوجيا">💻 علم الحاسوب والبرمجة</option>
                    </optgroup>
                  </select>

                  {/* Quick Clickable Subject Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAiSubject('كيمياء')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        aiSubject?.includes('كيمياء')
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      title="اختيار الكيمياء واعتماد مصادر مدرسة ويب للكيمياء (VebSchool Chemistry)"
                    >
                      <span>🧪</span>
                      <span>كيمياء</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAiSubject('فيزياء')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        aiSubject?.includes('فيزياء')
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400/40'
                          : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200'
                      }`}
                      title="اختيار الفيزياء واعتماد مصادر ومحاكاة PhET وبنك أسئلة البجروت"
                    >
                      <span>⚡</span>
                      <span>فيزياء</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAiSubject('بيولوجيا')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        aiSubject?.includes('بيولوجيا') || aiSubject?.includes('أحياء')
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400/40'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200'
                      }`}
                      title="اختيار البيولوجيا واعتماد مصادر وأطلس الخلية والوراثة والعلوم الحياتية"
                    >
                      <span>🌿</span>
                      <span>بيولوجيا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAiSubject('رياضيات')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        aiSubject?.includes('رياضيات')
                          ? 'bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-400/40'
                          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border-sky-200'
                      }`}
                      title="اختيار الرياضيات واعتماد نماذج امتحانات البجروت الرسمية"
                    >
                      <span>📐</span>
                      <span>رياضيات</span>
                    </button>
                  </div>
                </div>

                {/* Grade Class */}
                <div className="space-y-1.5 font-bold">
                  <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                    <span>الفئة / الصف الدراسي المستهدف</span>
                    <Award size={13} className="text-[#D4A33C]" />
                  </label>
                  <select
                    value={aiGrade}
                    onChange={e => setAiGrade(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs cursor-pointer text-right"
                  >
                    <option value="">-- اختر الصف الدراسي --</option>
                    <optgroup label="مرحلة الطفولة المبكرة">
                      <option value="روضة (جيل 3 - 4 سنوات)">روضة (جيل 3 - 4 سنوات)</option>
                      <option value="بستان / تمهيدي (جيل 5 - 6 سنوات)">بستان / تمهيدي (جيل 5 - 6 سنوات)</option>
                    </optgroup>
                    <optgroup label="المرحلة الابتدائية">
                      <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                      <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                      <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                      <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                      <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                      <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                    </optgroup>
                    <optgroup label="المرحلة الإعدادية">
                      <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                      <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                      <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                    </optgroup>
                    <optgroup label="المرحلة الثانوية والبجروت">
                      <option value="الصف العاشر">الصف العاشر</option>
                      <option value="الصف الحادي عشر - مسار البجروت">الصف الحادي عشر - مسار البجروت</option>
                      <option value="الصف الحادي عشر - تخصص علمي (4/5 وحدات)">الصف الحادي عشر - تخصص علمي (4/5 وحدات)</option>
                      <option value="الصف الحادي عشر - تخصص أدبي / إنساني">الصف الحادي عشر - تخصص أدبي / إنساني</option>
                      <option value="الصف الثاني عشر - مسار البجروت">الصف الثاني عشر - مسار البجروت</option>
                      <option value="الصف الثاني عشر - تخصص علمي (4/5 وحدات)">الصف الثاني عشر - تخصص علمي (4/5 وحدات)</option>
                      <option value="الصف الثاني عشر - تخصص أدبي / إنساني">الصف الثاني عشر - تخصص أدبي / إنساني</option>
                    </optgroup>
                    <optgroup label="مسارات تقوية وتأهيل مخصصة">
                      <option value="دورة تحضيرية للبجروت (بكافة الوحدات)">دورة تحضيرية للبجروت (بكافة الوحدات)</option>
                      <option value="دورة بسيخومتري / ياعيل">دورة بسيخومتري / ياعيل</option>
                      <option value="تعليم أكاديمي / جامعي">تعليم أكاديمي / جامعي</option>
                      <option value="تقوية لغة عبرية (محادثة وكتابة)">تقوية لغة عبرية (محادثة وكتابة)</option>
                    </optgroup>
                  </select>
                </div>

                {/* File Layout Type or Question Types Selection */}
                {!aiIsWorksheet ? (
                  <div className="space-y-1.5 font-bold">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>طبيعة وهيكل الملف</span>
                      <Clock size={13} className="text-[#D4A33C]" />
                    </label>
                    <select
                      value={aiFileType}
                      onChange={e => setAiFileType(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                    >
                      <option value="شرح درس تفصيلي مبسط ومكتمل مع أمثلة محلولة خطوة بخطوة">شرح تفصيلي للموضوع مع أمثلة وحلول نموذجية خطوة بخطوة</option>
                      <option value="ملخص نقاط فهم ومصطلحات رئيسية وقوانين علمية">ملخص مراجعة سريعة للمصطلحات والقوانين الذهبية</option>
                      <option value="دليل حل نماذج وتدريبات البجروت والامتحانات الرسمية للوزارة">دليل كامل لحلول أسئلة ونماذج امتحانات البجروت الرسمية</option>
                      <option value="خطة درس تطبيقية للمعلم مع استراتيجيات التدريس وتقسيم الوقت">مخطط درس متكامل للمعلم (شرح، استراتيجيات، وتوقيت الزمني)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5 font-bold text-right">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>خيارات طبيعة الأسئلة المطلوبة</span>
                      <CheckSquare size={13} className="text-[#D4A33C]" />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-h-[53px] items-center text-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none justify-center hover:bg-white/80 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.multipleChoice}
                          onChange={e => setAiQuestionTypes(prev => ({ ...prev, multipleChoice: e.target.checked }))}
                          className="w-3.5 h-3.5 text-[#D4A33C] border-slate-300 rounded focus:ring-amber-500 accent-[#D4A33C]"
                        />
                        <span className="text-[10px] font-black text-slate-705 flex items-center gap-1">
                          <CheckSquare size={11} className="text-amber-500 shrink-0" />
                          <span>خيارات</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none justify-center hover:bg-white/80 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.fillBlanks}
                          onChange={e => setAiQuestionTypes(prev => ({ ...prev, fillBlanks: e.target.checked }))}
                          className="w-3.5 h-3.5 text-[#D4A33C] border-slate-300 rounded focus:ring-amber-500 accent-[#D4A33C]"
                        />
                        <span className="text-[10px] font-black text-slate-705 flex items-center gap-1">
                          <BookOpenCheck size={11} className="text-blue-500 shrink-0" />
                          <span>فراغ</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none justify-center hover:bg-white/80 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.openQuestions}
                          onChange={e => setAiQuestionTypes(prev => ({ ...prev, openQuestions: e.target.checked }))}
                          className="w-3.5 h-3.5 text-[#D4A33C] border-slate-300 rounded focus:ring-amber-500 accent-[#D4A33C]"
                        />
                        <span className="text-[10px] font-black text-[#D4A33C] flex items-center gap-1 shrink-0">
                          <HelpCircle size={11} className="text-[#D4A33C] shrink-0" />
                          <span>أسئلة مفتوحة</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none justify-center hover:bg-white/80 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={aiQuestionTypes.trueFalse}
                          onChange={e => setAiQuestionTypes(prev => ({ ...prev, trueFalse: e.target.checked }))}
                          className="w-3.5 h-3.5 text-[#D4A33C] border-slate-300 rounded focus:ring-amber-500 accent-[#D4A33C]"
                        />
                        <span className="text-[10px] font-black text-slate-705 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                          <span>صح/خطأ</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

              </div>

              {/* Optional Advanced Settings for Worksheet */}
              {aiIsWorksheet && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right font-bold border-t border-slate-100/80 pt-4 mt-1 animate-fadeIn">
                  {/* Level of Worksheet */}
                  <div className="space-y-1.5 font-bold">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>مستوى صعوبة ورقة العمل</span>
                      <Award size={13} className="text-[#D4A33C]" />
                    </label>
                    <select
                      value={aiWorksheetLevel}
                      onChange={e => setAiWorksheetLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                    >
                      <option value="diverse">متنوع ومتدرج الصعوبة (تأسيسي / فهم / متقدم)</option>
                      <option value="advanced">عالي متوّسع (محاكاة لأسئلة البجروت ومهارات عليا)</option>
                    </select>
                  </div>

                  {/* Question Counts Section */}
                  <div className="space-y-1.5 font-bold text-right">
                    <label className="text-xs font-black text-slate-655 flex items-center gap-1.5 justify-start">
                      <span>تحديد عدد أسئلة كل نمط مفعل</span>
                      <CheckSquare size={13} className="text-[#D4A33C]" />
                    </label>
                    
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="flex flex-col gap-1 bg-slate-50 border border-slate-150 rounded-xl p-1.5">
                        <span className="text-[9px] font-black text-slate-500">خيارات</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          disabled={!aiQuestionTypes.multipleChoice}
                          value={aiQuestionTypes.multipleChoice ? aiQuestionCounts.multipleChoice : 0}
                          onChange={e => setAiQuestionCounts(prev => ({ ...prev, multipleChoice: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-white border border-slate-200 rounded text-center text-[10px] font-black py-0.5 focus:border-[#D4A33C] focus:ring-1 focus:ring-amber-500/10 disabled:opacity-50"
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-slate-50 border border-slate-150 rounded-xl p-1.5">
                        <span className="text-[9px] font-black text-slate-500">فراغ</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          disabled={!aiQuestionTypes.fillBlanks}
                          value={aiQuestionTypes.fillBlanks ? aiQuestionCounts.fillBlanks : 0}
                          onChange={e => setAiQuestionCounts(prev => ({ ...prev, fillBlanks: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-white border border-slate-200 rounded text-center text-[10px] font-black py-0.5 focus:border-[#D4A33C] focus:ring-1 focus:ring-amber-500/10 disabled:opacity-50"
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-slate-50 border border-slate-150 rounded-xl p-1.5">
                        <span className="text-[9px] font-black text-[#D4A33C] flex items-center gap-1 justify-center">
                          <HelpCircle size={10} className="text-[#D4A33C]" />
                          <span>أسئلة مفتوحة</span>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          disabled={!aiQuestionTypes.openQuestions}
                          value={aiQuestionTypes.openQuestions ? aiQuestionCounts.openQuestions : 0}
                          onChange={e => setAiQuestionCounts(prev => ({ ...prev, openQuestions: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-white border border-slate-200 rounded text-center text-[10px] font-black py-0.5 focus:border-[#D4A33C] focus:ring-1 focus:ring-amber-500/10 disabled:opacity-50"
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-slate-50 border border-slate-150 rounded-xl p-1.5">
                        <span className="text-[9px] font-black text-slate-500">صح/خطأ</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          disabled={!aiQuestionTypes.trueFalse}
                          value={aiQuestionTypes.trueFalse ? aiQuestionCounts.trueFalse : 0}
                          onChange={e => setAiQuestionCounts(prev => ({ ...prev, trueFalse: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-full bg-white border border-slate-200 rounded text-center text-[10px] font-black py-0.5 focus:border-[#D4A33C] focus:ring-1 focus:ring-amber-500/10 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Topics Input */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-black text-slate-655 font-bold">تحديد موضوع الحصة والمفاصل الرئيسية</label>
                <textarea
                  placeholder="المتتاليات الحسابية والهندسية، الهندسة التحليلية، أو حل أسئلة نموذج بجروت صيف..."
                  rows={3}
                  value={aiTopics}
                  onChange={e => setAiTopics(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-205 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right"
                />
              </div>

              {/* Reference Source Selection for Israeli Ministry alignment */}
              <div className="space-y-3 bg-amber-50/20 p-5 border border-amber-200/40 rounded-2xl text-right" dir="rtl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-amber-950 block">🇮🇱 ملاءمة لمناهج وزارة المعارف الإسرائيلية وامتحانات البجروت (اختياري)</span>
                    <p className="text-[10px] text-slate-500 font-bold">يمكنك الإشارة لموقع الكتروني أو لصق محتويات ملف PDF/امتحان بجروت لتكون نموذجاً ومصدراً أساسياً في صياغة الشروح والأسئلة بنفس اللغة والمستوى العلمي.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setAiSourceType('none'); setAiSourceValue(''); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${aiSourceType === 'none' ? 'bg-[#D4A33C] text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      لا يوجد (من المنهاج المعتمد)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAiSourceType('website'); setAiSourceValue(''); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${aiSourceType === 'website' ? 'bg-[#D4A33C] text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      🌐 موقع إلكتروني (رابط)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAiSourceType('file'); setAiSourceValue(''); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${aiSourceType === 'file' ? 'bg-[#D4A33C] text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      📄 مستند / نص منسوخ
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAiSourceType('repo'); setAiSourceValue(''); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${aiSourceType === 'repo' ? 'bg-[#D4A33C] text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      📂 من مستودع المصادر
                    </button>
                  </div>
                </div>

                {aiSourceType === 'website' && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-black text-slate-700 block mb-1">رابط الموقع الرسمي لوزارة المعارف أو موقع المادة المرجعي *</label>
                    <input
                      type="url"
                      required
                      placeholder="أدخل رابط الموقع، مثال: https://cms.education.gov.il/EducationCMS/Units/Mazkirut_Pedagogit/Chemistry"
                      value={aiSourceValue}
                      onChange={(e) => setAiSourceValue(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-[#D4A33C] bg-white text-left text-right"
                      dir="rtl"
                    />
                  </div>
                )}

                {aiSourceType === 'file' && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-black text-slate-700 block mb-1">قم بنسخ ولصق نصوص مادة امتحان البجروت أو ملف الـ PDF هنا لنسج الأسئلة على نمطه *</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="ألصق نصوص الملف أو أسئلة الامتحانات السابقة هنا بالتفصيل (مثل موضوعات أو فصول بجروت لوزارة المعارف)..."
                      value={aiSourceValue}
                      onChange={(e) => setAiSourceValue(e.target.value)}
                      className="w-full text-xs font-semibold p-3.5 border border-slate-200 rounded-xl focus:border-[#D4A33C] bg-white leading-relaxed text-right"
                    />
                  </div>
                )}

                {aiSourceType === 'repo' && (
                  <div className="mt-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-700 block mb-1">اختر مادة تعليمية / ورقة عمل محفوظة من المستودع لتطبيق نفس أسلوب ولغة بجروت المعارف *</label>
                    {eduResources.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <span className="text-xs font-semibold text-slate-400">لا توجد مواد محفوظة ومصنفة في المستودع حتى الآن. اذهب إلى علامة تبويب "مستودع المواد" أو قم بحفظ المواد بعد توليدها!</span>
                      </div>
                    ) : (
                      <select
                        required
                        value={aiSourceValue}
                        onChange={(e) => setAiSourceValue(e.target.value)}
                        className="w-full text-xs font-black px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-right outline-none focus:border-[#D4A33C]"
                      >
                        <option value="">-- اختر من المستودع المرجعي لتطابق اللغة العلمية --</option>
                        {eduResources.map((res: any) => (
                          <option key={res.id} value={res.content}>
                            [{res.subject}] {res.title} ({res.grade}) - الوسوم: {res.tags?.join('، ') || 'بدون وسوم'}
                          </option>
                        ))}
                      </select>
                    )}
                    {aiSourceValue && (
                      <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-[10px] text-slate-650 space-y-1.5 leading-relaxed font-bold">
                        <span className="text-indigo-950 font-black">المحتوى المستهدف للتكرار العلمي وصناعة شبه الشبيه:</span>
                        <div className="max-h-20 overflow-y-auto whitespace-pre-wrap font-mono text-[9px] bg-white p-2.5 rounded-lg border border-indigo-100" dir="ltr">
                          {aiSourceValue.slice(0, 300)}{aiSourceValue.length > 300 ? '...' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Virtual Lab & Approved Curriculum Integration Banner */}
              {(() => {
                const sLower = (aiSubject || '').toLowerCase();
                const isPhysics = sLower.includes('فيزياء') || sLower.includes('physic');
                const isBiology = sLower.includes('بيولوج') || sLower.includes('أحياء') || sLower.includes('bio');
                const isMath = sLower.includes('رياضيات') || sLower.includes('math');
                const isChemistry = sLower.includes('كيمياء') || sLower.includes('chem') || (!isPhysics && !isBiology && !isMath);

                if (isPhysics) {
                  return (
                    <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4.5 space-y-3.5 text-right animate-fadeIn" dir="rtl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          ⚡
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                            <span>محاكاة PhET وبنك أسئلة بجروت الفيزياء مدمجة 🌐</span>
                            <span className="bg-indigo-100 text-indigo-700 text-[8px] px-2 py-0.5 rounded-md font-extrabold animate-pulse">المصدر المعتمد</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                            تم اعتماد 
                            <a href="https://phet.colorado.edu/ar_SA/simulations/filter?subjects=physics" target="_blank" rel="noopener noreferrer" className="mx-1 text-indigo-600 font-black hover:underline inline-flex items-center gap-1">
                              محاكاة PhET التفاعلية ونماذج بجروت الفيزياء (036361 و 036371)
                            </a>
                            كمرجعية أساسية للشروحات والتجارب الافتراضية وحسابات القوى والسرعة والكهرباء.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-indigo-200/60 pt-3">
                        <p className="text-[9px] text-indigo-900 font-black mb-2 flex items-center gap-1">
                          <span>💡 كبسولات فيزياء جاهزة للاعتماد الفوري:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("قوانين نيوتن في الميكانيكا الكلاسيكية، حركة الأجسام في بعدين والمقذوفات مع محاكاة متجهات السرعة والتسارع.");
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🚀 قوانين نيوتن والمقذوفات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("الدوائر الكهربائية وقانون أوم، وتوصيل المقاومات على التوالي والتوازي وحساب القدرة الكهربائية.");
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🔌 الدوائر الكهربائية وقانون أوم
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("الحث الكهرومغناطيسي، قانون فاراداي وقانون لينز، وحركة موصل داخل مجال مغناطيسي منتظم.");
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🧲 الحث الكهرومغناطيسي وفاراداي
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("البصريات وانكسار الضوء وقانون سنيل، والعدسات المحدبة والمقعرة وتطبيقاتها العلمية.");
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            💡 انكسار الضوء والبصريات
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isBiology) {
                  return (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4.5 space-y-3.5 text-right animate-fadeIn" dir="rtl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          🌿
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <span>بوابة مجتمع البيولوجيا Bioteach وأطلس الخلية مدمجة 🌐</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] px-2 py-0.5 rounded-md font-extrabold animate-pulse">المصدر المعتمد</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                            تم اعتماد 
                            <a href="https://www.bioteach.org.il/" target="_blank" rel="noopener noreferrer" className="mx-1 text-emerald-600 font-black hover:underline inline-flex items-center gap-1">
                              مناهج بجروت البيولوجيا الرسمية (043381 و 043387)
                            </a>
                            كمرجعية أساسية لتصميم تجارب استقصاء الخلية، الوراثة، والاتزان البدني.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-emerald-200/60 pt-3">
                        <p className="text-[9px] text-emerald-900 font-black mb-2 flex items-center gap-1">
                          <span>💡 كبسولات بيولوجيا جاهزة للاعتماد الفوري:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("الغشاء الخلوي، النقل النشط، الخاصية الأسموزية والانتشار، ودور الإنزيمات في عمليات الأيض.");
                            }}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🔬 الغشاء الخلوي والنقل النشط
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("التمثيل الضوئي والتنفس الخلوي في النبات والحيوان، ودور البلاستيدات الخضراء والميتوكوندريا في إنتاج ATP.");
                            }}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🍃 التمثيل الضوئي وإنتاج الطاقة ATP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("علم الوراثة الكلاسيكية والجزيئية، قوانين مندل، ومبنى الحمض النووي DNA ومراحل تضاعفه.");
                            }}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🧬 الوراثة المندلية والحمض النووي DNA
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("الاتزان البدني في جسم الإنسان: الجهاز الدوري وتنظيم درجة الحرارة، وجهاز المناعة وخطوط الدفاع.");
                            }}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            ❤️ الاتزان البدني وجهاز المناعة
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isMath) {
                  return (
                    <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4.5 space-y-3.5 text-right animate-fadeIn" dir="rtl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                          📐
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                            <span>مستودع نماذج بجروت الرياضيات الرسمية مدمج 🌐</span>
                            <span className="bg-sky-100 text-sky-800 text-[8px] px-2 py-0.5 rounded-md font-extrabold animate-pulse">المصدر المعتمد</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                            تم اعتماد 
                            <a href="https://meyda.education.gov.il/sheeloney_bagrut/" target="_blank" rel="noopener noreferrer" className="mx-1 text-sky-600 font-black hover:underline inline-flex items-center gap-1">
                              نماذج امتحانات بجروت الرياضيات الرسمية (3، 4، 5 وحدات)
                            </a>
                            كمرجعية أساسية لحساب التفاضل، التكامل، المتتاليات، والتحليل الرياضي المتقدم.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-sky-200/60 pt-3">
                        <p className="text-[9px] text-sky-900 font-black mb-2 flex items-center gap-1">
                          <span>💡 كبسولات رياضيات جاهزة للاعتماد الفوري:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("بحث ودراسة الدوال النسبية والجذرية: مجالات التعريف، المحاذيات الأفقية والعمودية، والنقاط القصوى ومجالات التصاعد والتنازل.");
                            }}
                            className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            📈 بحث الدوال والمشتقات والمحاذيات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("المتتاليات الحسابية والهندسية: الحد العام، قانون المجموع، والمتتاليات التراجعية ونماذج البجروت.");
                            }}
                            className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            🔢 المتتاليات الحسابية والهندسية
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("حساب المساحات بالتعويض والتكامل المحدد والتطبيقات الهندسية للتكامل وحجوم الأجسام الدورانية.");
                            }}
                            className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            ∫ التكامل والمساحات المحصورة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiTopics("الهندسة التحليلية: معادلة المستقيم والدائرة والقطع الناقص والمكافئ وتطبيقاتها في البجروت.");
                            }}
                            className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                          >
                            📐 الهندسة التحليلية والدائرة
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default: Chemistry
                return (
                  <div className="bg-emerald-550/5 border border-emerald-500/15 rounded-2xl p-4.5 space-y-3.5 text-right animate-fadeIn" dir="rtl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        🧪
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <span>منصة VebSchool Chemistry مدمجة بالكامل 🌐</span>
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded-md font-extrabold animate-pulse">الموقع الشريك</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          بناءً على طلبك، فإن موقع 
                          <a href="https://www.vebschoolchemistry.com/" target="_blank" rel="noopener noreferrer" className="mx-1 text-emerald-600 font-black hover:underline inline-flex items-center gap-1">
                            VebSchool Chemistry (https://www.vebschoolchemistry.com/)
                          </a>
                          هو المرجعية المعتمدة لتقديم التجارب، المحاكاة البصرية، الاختبارات، وحل المعادلات في هذا الدرس. سيقوم الذكاء الاصطناعي بتوليد شروحات وأسئلة مستندة لقدرات وأدوات الموقع الافتراضية تلقائياً!
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-emerald-500/10 pt-3">
                      <p className="text-[9px] text-[#065F46] font-black mb-2 flex items-center gap-1">
                        <span>💡 اضغط لتحميل كبسولات وموضوعات تفاعلية مستندة للموقع فوراً:</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAiTopics("الروابط الكيميائية (التساهمية والأيونية) وحساب تمثيل لويس للمركبات وربط ذلك بالمسائل التفاعلية في معمل موقع VebSchool Chemistry (https://www.vebschoolchemistry.com/) لتوطيد الفهم البصري.");
                          }}
                          className="p-2 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border border-emerald-150 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                        >
                          🧬 درس الروابط وتمثيل لويس
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiTopics("معالجة وحساب الصيغ التجريبية والجزيئية للمركبات الكيميائية، وتدريب الطلاب على حل معادلات كيميائية تفاعلية بمساعدة حاسبة المركبات على موقع VebSchool Chemistry.");
                          }}
                          className="p-2 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border border-emerald-150 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                        >
                          ⚖️ حساب الصيغ والمعادلات
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiTopics("مستويات الطاقة الذرية وتوزيع الإلكترونات الكهروستاتيكي، وتوجيه الطلاب لإنشاء تمثيل تفاعل الجدول الدوري التفاعلي على موقع VebSchool Chemistry.");
                          }}
                          className="p-2 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border border-emerald-150 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                        >
                          ⚛️ توزيع الإلكترونات والجدول الدوري
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiTopics("قواسم وموازنة المعادلات الكيميائية وقانون حفظ الشحنة والكتلة للمحاليل المائية بمرجعية وتطبيقات علمية مأخوذة من منصة VebSchool Chemistry مع اختبار قصير.");
                          }}
                          className="p-2 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border border-emerald-150 rounded-xl transition-all font-black text-[9px] text-right cursor-pointer hover:scale-[1.01]"
                        >
                          🧪 موازنة تفاعلات وقانون حفظ المادة
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Generate Trigger */}
              <button
                onClick={handleGenerateAiLesson}
                disabled={isGenerating}
                className="w-full py-4.5 bg-[#D4A33C] hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-xs hover:shadow-xl hover:shadow-amber-500/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="animate-spin" size={16} />
                    <span>جاري التفكير والتوليد التربوي بذكاء... يرجى الانتظار</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{aiIsWorksheet ? 'صمم ورقة عمل تفاعلية بالذكاء الاصطناعي الأكاديمي' : 'صمم محتوى الشرح بالذكاء الاصطناعي الفوري'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Repository Interface */
            <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
              
              {/* Header info */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>مستودع المطبوعات والمواد المرجعية المحفوظة 📑</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full font-black font-sans">سحابي آمن</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  هنا يجتمع كنز الأكاديمية الخاص بك! ابحث وفلتر المواد التعليمية، الامتحانات، وأوراق عمل البجروت الخاصة بك باستخدام نظام الوسوم (Tags) الذكي. يمكنك مراجعتها، أو اتخاذها كمرجع علمي فوري لتوليد أوراق عمل شبيهة بنفس الصياغة اللغوية والعلمية لوزارة المعارف الإسرائيلية.
                </p>
              </div>

              {/* Search and Filters Bar */}
              <div className="bg-white p-4.5 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث في العناوين بكلمات دلالية..."
                      value={eduSearchQuery}
                      onChange={(e) => setEduSearchQuery(e.target.value)}
                      className="w-full text-xs font-bold pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#D4A33C] focus:bg-white transition-all text-right"
                    />
                  </div>
                  
                  {/* Clear Filters Button */}
                  {(eduSearchQuery || eduSelectedTagFilter) && (
                    <button
                      onClick={() => {
                        setEduSearchQuery('');
                        setEduSelectedTagFilter('');
                      }}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      إلغاء الفلاتر 🔄
                    </button>
                  )}
                </div>

                {/* Tag Filters Bar */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 block text-right">مرشحات الوسوم السريعة (Tags Filter):</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100 custom-scrollbar">
                    <button
                      onClick={() => setEduSelectedTagFilter('')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        eduSelectedTagFilter === ''
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      كل المصادر ({eduResources.length})
                    </button>
                    {POPULAR_TAGS.map((tag) => {
                      const count = eduResources.filter(r => r.tags?.includes(tag)).length;
                      return (
                        <button
                          key={tag}
                          onClick={() => setEduSelectedTagFilter(tag)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                            eduSelectedTagFilter === tag
                              ? 'bg-[#D4A33C] text-slate-950 font-black shadow-sm'
                              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          <span>#{tag}</span>
                          <span className="text-[8px] opacity-70 font-sans">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid of resources */}
              {eduLoading ? (
                <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                  <Loader2 className="animate-spin mx-auto text-[#D4A33C]" size={28} />
                  <span className="text-xs">جاري معالجة المستودع السحابي...</span>
                </div>
              ) : (
                (() => {
                  const filtered = eduResources.filter(resource => {
                    const q = (eduSearchQuery || '').toLowerCase();
                    const matchesSearch = !q || 
                      (resource.title || '').toLowerCase().includes(q) ||
                      (resource.content || '').toLowerCase().includes(q) ||
                      (resource.subject || '').toLowerCase().includes(q);
                      
                    const matchesTag = !eduSelectedTagFilter || resource.tags?.includes(eduSelectedTagFilter);
                    
                    return matchesSearch && matchesTag;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white border border-slate-205 rounded-3xl p-10 text-center space-y-3">
                        <span className="text-3xl block">🗂️</span>
                        <h4 className="text-xs font-black text-slate-800">لم يتم العثور على مخرجات مطابقة للبحث</h4>
                        <p className="text-[10px] text-slate-450 font-bold leading-relaxed">
                          La توجد مواد تعليمية تطابق كلمة البحث "{eduSearchQuery}" أو وسم الفلترة المختار. جرب وسماً آخر أو قم بصناعة معايير جديدة وحفظها!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((res: any) => (
                        <div 
                          key={res.id} 
                          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-3xl p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between text-right"
                        >
                          <div className="space-y-2.5">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black px-2 py-0.5 rounded-md">
                                  {res.subject}
                                </span>
                                <span className="bg-slate-100 text-slate-600 border border-slate-200/50 text-[9px] font-black px-2 py-0.5 rounded-md">
                                  {res.grade}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono" dir="ltr">
                                {res.createdAt ? new Date(res.createdAt).toLocaleDateString('ar-EG') : ''}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="text-xs font-black text-slate-800 leading-snug line-clamp-2">
                              {res.title}
                            </h4>

                            {/* Dynamic Tags list */}
                            {res.tags && res.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 justify-start">
                                {res.tags.map((tag: string) => (
                                  <span 
                                    key={tag} 
                                    onClick={() => setEduSelectedTagFilter(tag)}
                                    className="text-[8px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/50 px-2 py-0.5 rounded-full font-black cursor-pointer transition-colors"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setSelectedResourceToView(res)}
                              className="py-2.5 bg-indigo-55/10 hover:bg-indigo-55 text-indigo-800 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-100/40"
                            >
                              <Eye size={11} />
                              <span>عرض مادة</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setAiSourceType('repo');
                                setAiSourceValue(res.content);
                                setAiSubject(res.subject);
                                setAiGrade(res.grade);
                                setActivePlannerView('generator');
                                setCalendarToast(`تم ضبط [${res.title}] كمصدر علمي شبيه! ✍️✨`);
                                setTimeout(() => setCalendarToast(null), 4000);
                              }}
                              className="py-2.5 bg-amber-50 hover:bg-[#D4A33C] hover:text-slate-950 text-[#785413] border border-amber-250/50 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="استخدام هذا الملف كنموذج مرجعي لتوليد أوراق عمل شبيهة لوزارة المعارف"
                            >
                              <Sparkles size={11} />
                              <span>صناعة شبيه</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteResource(res.id)}
                              className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Trash2 size={11} />
                              <span>مسح</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

              {/* Live Preview Display of generated text content */}
              <AnimatePresence>
                {aiResult && (
                  <motion.div
                    key="ai-result-preview"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 md:p-8 bg-slate-50 border border-slate-200 rounded-3xl space-y-6 text-right relative pr-6 leading-relaxed"
                  >
                    
                    {/* Header bar of actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles size={12} className="animate-spin" />
                          <span>الملف التعليمي الجاهز للاستخدام الفوري</span>
                        </p>
                        {aiGeneratedEngineBadge && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {aiGeneratedEngineBadge}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => {
                            setResourceSaveTitle(`${aiSubject || 'ملف تعليمي'} - ${aiTopics.trim().slice(0, 30)}${aiTopics.trim().length > 30 ? '...' : ''}`);
                            
                            // Auto-tag based on subject and topic text
                            const autoTags: string[] = [];
                            const combinedText = `${aiSubject} ${aiTopics}`.toLowerCase();
                            if (combinedText.includes('رياضيات') || combinedText.includes('حساب') || combinedText.includes('math')) autoTags.push('رياضيات');
                            if (combinedText.includes('بجروت')) autoTags.push('بجروت');
                            if (combinedText.includes('نحو') || combinedText.includes('قواعد') || combinedText.includes('اعراب') || combinedText.includes('إعراب')) autoTags.push('نحو');
                            if (combinedText.includes('كيمياء') || combinedText.includes('chemistry')) autoTags.push('كيمياء');
                            if (combinedText.includes('فيزياء') || combinedText.includes('physics')) autoTags.push('فيزياء');
                            if (combinedText.includes('أحياء') || combinedText.includes('بيولوجيا') || combinedText.includes('biology')) autoTags.push('بيولوجيا');
                            if (combinedText.includes('دوال') || combinedText.includes('تفاضل') || combinedText.includes('تكامل')) autoTags.push('تفاضل وتكامل');
                            if (combinedText.includes('لغة عربية') || combinedText.includes('عربي')) autoTags.push('لغة عربية');
                            if (combinedText.includes('عبري') || combinedText.includes('עברית') || combinedText.includes('عبرية')) autoTags.push('لغة عبرية');
                            if (combinedText.includes('إنجليز') || combinedText.includes('english') || combinedText.includes('انجليز')) autoTags.push('لغة إنجليزية');
                            if (combinedText.includes('مدنيات')) autoTags.push('مدنيات');
                            if (combinedText.includes('تاريخ')) autoTags.push('تاريخ');
                            
                            setResourceSaveTags(autoTags);
                            setCustomTagInput('');
                            setShowSaveResourceModal(true);
                          }}
                          className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer font-black"
                          title="حفظ في مستودع المصادر لسهولة البحث والفلترة مستقبلاً"
                        >
                          <FolderPlus size={14} className="text-indigo-600" />
                          <span className="text-[10px]">حفظ في مخرجات المصادر 📂</span>
                        </button>

                        <button
                          onClick={() => setIsEditingResult(!isEditingResult)}
                          className={`p-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer font-black border ${
                            isEditingResult 
                              ? 'bg-amber-400 border-amber-300 text-slate-950 font-black' 
                              : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                          }`}
                          title="تعديل محتوى ورقة العمل باستخدام محرر النصوص العلمي والمات لايف"
                        >
                          <Pencil size={14} className="text-amber-600" />
                          <span className="text-[10px]">{isEditingResult ? 'معاينة ورقة العمل 👁️' : 'تعديلات وتخصيص الرموز ✍️'}</span>
                        </button>

                        <button
                          onClick={copyToClipboard}
                          className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all text-xs flex items-center gap-1 cursor-pointer"
                          title="نسخ النص بالكامل"
                        >
                          <Clipboard size={14} />
                          <span className="text-[10px] font-bold">نسخ النص</span>
                        </button>

                        <button
                          onClick={downloadAsHtml}
                          className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer font-black"
                          title="توليد وتحميل بصيغة طباعة PDF احترافية"
                        >
                          <FileCode size={14} className="text-emerald-600" />
                          <span className="text-[10px]">تحميل PDF (عبر قالب الطباعة)</span>
                        </button>

                        <button
                          onClick={downloadAsDoc}
                          className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer font-black"
                          title="تحميل كملف وورد DOC"
                        >
                          <Download size={14} className="text-blue-600" />
                          <span className="text-[10px]">تحميل Word (.doc)</span>
                        </button>

                        <button
                          onClick={downloadAsMarkdown}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                          title="تحميل كملف نصي عادي"
                        >
                          <FileText size={14} className="text-slate-600" />
                          <span className="text-[10px]">تحميل نص (.txt)</span>
                        </button>

                        <button
                          onClick={triggerPrint}
                          className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                          title="طباعة سريعة للملف"
                        >
                          <Printer size={14} />
                          <span className="text-[10px] font-bold">طباعة سريعة</span>
                        </button>
                      </div>
                    </div>

                     {/* Styled View Container (renders basic Markdown spacing beautifully) or Rich Scientific Editor */}
                     {isEditingResult ? (
                       <ScientificRichTextEditor
                         initialValue={aiResult}
                         onSave={(newValue) => {
                           setAiResult(newValue);
                           setIsEditingResult(false);
                         }}
                         onCancel={() => {
                           setIsEditingResult(false);
                         }}
                         title="معدل ومطور محتوى الحصة العلمي النشط 📝"
                       />
                     ) : (
                       <MathJaxSection className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed text-right space-y-3 prose-editor">
                         {parseTextToReactBlocks(aiResult).map((block, idx) => {
                           switch (block.type) {
                             case 'h1':
                               return (
                                 <h2 key={idx} className="text-xl font-black text-amber-600 border-r-4 border-amber-500 pr-3.5 py-1 pt-4 text-right">
                                   {renderFormattedLineContent(block.content)}
                                 </h2>
                               );
                             case 'h2':
                               return (
                                 <h3 key={idx} className="text-base font-black text-[#1A365D] border-b border-indigo-200/40 pb-1 pt-3 text-right">
                                   {renderFormattedLineContent(block.content)}
                                 </h3>
                               );
                             case 'h3':
                               return (
                                 <h4 key={idx} className="text-sm font-black text-[#1A365D] pt-2 pb-1 text-right">
                                   {renderFormattedLineContent(block.content)}
                                 </h4>
                               );
                             case 'bullet':
                               return (
                                 <div key={idx} className="mr-4 text-xs text-slate-705 font-bold list-item-custom text-right flex items-center justify-start gap-1">
                                   <span className="text-amber-500 font-extrabold">•</span>
                                   <div>{renderFormattedLineContent(block.content)}</div>
                                 </div>
                               );
                             case 'question':
                               return (
                                 <div key={idx} className="mr-4 text-xs text-slate-705 font-bold text-right flex items-start gap-1 justify-start">
                                   <span className="text-[#1A365D] shrink-0 font-black">{block.number}</span>
                                   <div className="flex-1">
                                     {renderFormattedLineContent(block.content)}
                                   </div>
                                 </div>
                               );
                             case 'options-grid':
                               return (
                                 <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pr-4 my-2 text-right">
                                   {block.columns?.map((col, colIdx) => (
                                     <div key={colIdx} className="bg-slate-100/70 hover:bg-amber-50/50 border border-slate-200/50 rounded-xl p-2.5 transition-all flex items-center justify-start gap-1.5 cursor-pointer">
                                       <span className="w-1.5 h-1.5 rounded-full bg-[#D4A33C] shrink-0" />
                                       <span className="text-[10px] font-black text-slate-700">{renderFormattedLineContent(col)}</span>
                                     </div>
                                   ))}
                                 </div>
                               );
                             case 'answers-divider':
                               return (
                                 <div key={idx} className="border-t-2 border-dashed border-amber-500/30 my-6 pt-5 text-center">
                                   <div className="inline-block bg-amber-500/5 border border-amber-500/10 text-[#D4A33C] text-[10px] font-extrabold px-3.5 py-1.5 rounded-full shadow-sm">
                                     🎓 {block.content} 🎓
                                   </div>
                                 </div>
                               );
                             default:
                               return (
                                 <div key={idx} className="text-xs transition-all text-right">
                                   {renderFormattedLineContent(block.content)}
                                 </div>
                               );
                           }
                         })}
                       </MathJaxSection>
                     )}

                    {/* Thumbs Up/Down Evaluation & Notes Section */}
                    <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 text-right" dir="rtl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1 border-b border-slate-200/50">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-start">
                            <span>✨ تقييم جودة المحتوى المولد (الذكاء الاصطناعي الأكاديمي)</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            رأيك يهمنا بمجرد تصفح الملف! شاركنا تقييمك للمساعدة في تعزيز دقة المخرجات لتناسب المناهج المعتمدة تماماً.
                          </p>
                        </div>

                        {/* Thumbs Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={aiEvalSubmitted || aiEvalIsSubmitting}
                            onClick={() => {
                              setAiEvalRating('up');
                              setAiEvalSubmitted(false);
                              setAiEvalError('');
                            }}
                            className={`p-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-[11px] font-black cursor-pointer select-none ${
                              aiEvalRating === 'up'
                                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm font-black scale-102'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } ${aiEvalSubmitted ? 'opacity-65 cursor-not-allowed' : ''}`}
                            title="ممتاز ومناسب للمنهاج"
                          >
                            <ThumbsUp size={14} className={aiEvalRating === 'up' ? 'text-emerald-600' : ''} />
                            <span>محتوى ممتاز</span>
                          </button>

                          <button
                            type="button"
                            disabled={aiEvalSubmitted || aiEvalIsSubmitting}
                            onClick={() => {
                              setAiEvalRating('down');
                              setAiEvalSubmitted(false);
                              setAiEvalError('');
                            }}
                            className={`p-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-[11px] font-black cursor-pointer select-none ${
                              aiEvalRating === 'down'
                                ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm font-black scale-102'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } ${aiEvalSubmitted ? 'opacity-65 cursor-not-allowed' : ''}`}
                            title="بحاجة لتحسين أو غير دقيق"
                          >
                            <ThumbsDown size={14} className={aiEvalRating === 'down' ? 'text-rose-600' : ''} />
                            <span>بحاجة لتحسين</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes / Feedback textarea */}
                      {aiEvalRating && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 pt-1"
                        >
                          {!aiEvalSubmitted ? (
                            <>
                              <div className="space-y-1.5 text-right">
                                <label className="text-[11px] font-black text-slate-705 block pr-1">ملاحظاتك الإضافية واقتراحاتك لتحسين النتائج مستقبلاً:</label>
                                <textarea
                                  value={aiEvalFeedbackText}
                                  onChange={(e) => setAiEvalFeedbackText(e.target.value)}
                                  placeholder={
                                    aiEvalRating === 'up'
                                      ? 'اكتب أي ملاحظة إضافية تود مشاركتها حول نقاط التميز in هذا الشرح...'
                                      : 'ما الذي وجدته غير دقيق أو بحاجة لتحسين ليتوافق أفضل مع المنهج الدراسي للمعرفة؟'
                                  }
                                  className="w-full min-h-[75px] pb-5 p-3 text-xs bg-white border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl placeholder:text-slate-400 font-bold resize-none leading-relaxed text-right transition-all outline-none"
                                />
                              </div>

                              {aiEvalError && (
                                <p className="text-[10px] text-rose-600 font-black pr-1">{aiEvalError}</p>
                              )}

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={handleSaveAiEvaluation}
                                  disabled={aiEvalIsSubmitting}
                                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold text-[10px] rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {aiEvalIsSubmitting ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      <span>جاري إرسال ملاحظاتك...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>إرسال وحفظ التقييم</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 p-4 rounded-xl text-center text-xs font-bold leading-relaxed space-y-1">
                              <p className="font-black text-sm">✓ تم حفظ تقييمك وملاحظاتك بنجاح!</p>
                              <p className="text-[10px] text-emerald-600 font-bold">نشكرك جزيل الشكر على دعمك وتوجيهاتك للمنصة لتحسين محرك الذكاء الاصطناعي الأكاديمي.</p>
                              {aiEvalFeedbackText.trim() && (
                                <div className="mt-2.5 p-2 bg-white/60 border border-emerald-500/10 rounded-lg text-right text-[10px] text-slate-700 italic font-medium">
                                  <strong>ملاحظتك المحفوظة:</strong> « {aiEvalFeedbackText} »
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-slate-200/60 pt-4 text-[9px] text-slate-400 font-bold flex items-center justify-between">
                      <span>حقوق إعداد الملف محفوظة لأكاديمية التفوق مع Gemini AI</span>
                      <span>تاريخ الإنشاء: {formatCustomDate(new Date())}</span>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Left Column: Reference & Quick Assist Cheatsheet (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6 animate-fadeIn" dir="rtl">
              
              {/* Quick presets configuration tailored to teacher's subjects */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center font-black animate-pulse">
                    ✨
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-black text-slate-900">نماذج ذكية سريعة لموادك</h3>
                    <p className="text-[10px] text-slate-400 font-bold">نقرة واحدة لتثبيت المادة واقتراح موضوع جاهز للمنهاج</p>
                  </div>
                </div>

                {/* Field Selection presets matching teacher's subjects only */}
                <div className="space-y-3.5 text-right">
                  <p className="text-[10px] text-slate-500 font-black">المواد المعتمدة لحسابك التدريسي:</p>
                  
                  {teacherAssignedSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {teacherAssignedSubjects.map((subjectName) => {
                        const sLower = (subjectName || '').toLowerCase();
                        let icon = '📚';
                        let bgClasses = 'bg-amber-50 text-amber-950 hover:bg-amber-100/90 border-amber-200';
                        let sampleTopic = `شرح تفصيلي لوحدة دراسية شاملة في مادة ${subjectName} مع أسئلة تدريبية وتمارين نموذجية.`;

                        if (sLower.includes('رياضيات') || sLower.includes('math')) {
                          icon = '📐';
                          bgClasses = 'bg-sky-50 text-sky-900 hover:bg-sky-100/90 border-sky-150';
                          sampleTopic = 'حساب التفاضل والتكامل، تحليل الدوال المثلثية والهندسة التحليلية مع أسئلة بجروت نموذجية.';
                        } else if (sLower.includes('فيزياء') || sLower.includes('physic')) {
                          icon = '⚡';
                          bgClasses = 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100/90 border-indigo-150';
                          sampleTopic = 'قوانين الميكانيكا الكلاسيكية، حركة المقذوفات ومتجهات القوى مع إثبات معادلة السرعة v = u + a * t.';
                        } else if (sLower.includes('كيمياء') || sLower.includes('chem')) {
                          icon = '🧪';
                          bgClasses = 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border-emerald-150';
                          sampleTopic = 'توازن الغازات ومبدأ لوشاتيليه ومعادلة توازن غاز الأمونيا H_2 و N_2 بتفاعلات طاردة للحرارة.';
                        } else if (sLower.includes('بيولوجيا') || sLower.includes('أحياء') || sLower.includes('bio')) {
                          icon = '🌿';
                          bgClasses = 'bg-rose-50 text-rose-900 hover:bg-rose-100/90 border-rose-150';
                          sampleTopic = 'التركيب الضوئي في الخلايا النباتية وتفاعل التمثيل الكلوروفيلي وتحليل دور إنزيمات التمثيل.';
                        } else if (sLower.includes('عربي') || sLower.includes('لغة عربية')) {
                          icon = '📖';
                          bgClasses = 'bg-amber-50 text-amber-900 hover:bg-amber-100/90 border-amber-200';
                          sampleTopic = 'قواعد النحو والإعراب: المفاعيل، الحال والتمييز، مع تحليل نص أدبي من منهاج البجروت.';
                        } else if (sLower.includes('إنجليز') || sLower.includes('english')) {
                          icon = '🔤';
                          bgClasses = 'bg-teal-50 text-teal-900 hover:bg-teal-100/90 border-teal-200';
                          sampleTopic = 'Reading Comprehension for Module E/G with vocabulary expansion, inferential questions, and formal letter writing.';
                        } else if (sLower.includes('عبري') || sLower.includes('hebrew')) {
                          icon = '🇮🇱';
                          bgClasses = 'bg-blue-50 text-blue-900 hover:bg-blue-100/90 border-blue-200';
                          sampleTopic = 'הבנה והבעה, מערכת הצורות והפועל בבגרות, וניתוח טקסט עיוני מותאם.';
                        } else if (sLower.includes('تاريخ') || sLower.includes('مدنيات')) {
                          icon = '📜';
                          bgClasses = 'bg-orange-50 text-orange-900 hover:bg-orange-100/90 border-orange-200';
                          sampleTopic = 'مبادئ الديمقراطية وحقوق الإنسان ووثيقة الاستقلال مع نماذج أسئلة تحليلية لبجروت المدنيات والتاريخ.';
                        }

                        return (
                          <button
                            key={subjectName}
                            type="button"
                            onClick={() => {
                              handleSelectAiSubject(subjectName);
                              setAiTopics(sampleTopic);
                            }}
                            className={`p-2.5 ${bgClasses} border rounded-xl transition-all font-black text-[10px] text-center hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1`}
                          >
                            <span>{icon}</span>
                            <span className="truncate">{subjectName}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-[10px] font-bold">
                      لم يتم تعيين مواد لحسابك بعد.
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Subject Portal & Virtual Lab Integration (Adapts to Chemistry, Physics, Biology, Math) */}
              {(() => {
                const sLower = (aiSubject || '').toLowerCase();
                const isPhysics = sLower.includes('فيزياء') || sLower.includes('physic');
                const isBiology = sLower.includes('بيولوج') || sLower.includes('أحياء') || sLower.includes('bio');
                const isMath = sLower.includes('رياضيات') || sLower.includes('math');

                if (isPhysics) {
                  return (
                    <div className="bg-gradient-to-br from-indigo-950 via-[#1e1b4b] to-indigo-900 text-white rounded-3xl border border-indigo-700/80 shadow-xl p-6 space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2.5 border-b border-indigo-700/60 pb-3 font-bold">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black animate-pulse text-lg">
                          ⚡
                        </div>
                        <div className="text-right">
                          <h3 className="text-xs font-black text-indigo-300">بوابة محاكاة الفيزياء التفاعلية PhET</h3>
                          <p className="text-[9px] text-indigo-200 font-bold">الموقع الأكاديمي المعتمد لتجارب ومختبرات ونماذج بجروت الفيزياء</p>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-right font-bold">
                        <p className="text-[10px] text-indigo-100 font-semibold leading-relaxed">
                          تم تكامل مختبرات المحاكاة التفاعلية PhET ونماذج بجروت الفيزياء (036361 و 036371) ليكون دليلك الأساسي في تحضير دروس الفيزياء وتجارب الميكانيكا والكهرباء بدقة بالغة.
                        </p>

                        <div className="space-y-2">
                          <a
                            href="https://phet.colorado.edu/ar_SA/simulations/filter?subjects=physics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                          >
                            🌐 تصفح مختبرات محاكاة الفيزياء PhET التفاعلية ↗
                          </a>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("فيزياء");
                                setAiTopics("إعداد درس تفصيلي لقوانين نيوتن وحركة المقذوفات ومتجهات القوى مدعماً بنماذج محاكاة عملية وتطبيقات بجروت الفيزياء (نموذج 036361).");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              ⚡ تحضير درس فيزياء
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("فيزياء");
                                setAiTopics("توليد ورقة عمل واختبار بجروت فيزياء حول الدوائر الكهربائية، قانون أوم، والمجالات المغناطيسية والحث الكهرومغناطيسي وفاراداي.");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              📝 ورقة عمل فيزياء
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isBiology) {
                  return (
                    <div className="bg-gradient-to-br from-emerald-950 via-[#064e3b] to-teal-950 text-white rounded-3xl border border-emerald-700/80 shadow-xl p-6 space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2.5 border-b border-emerald-700/60 pb-3 font-bold">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black animate-pulse text-lg">
                          🌿
                        </div>
                        <div className="text-right">
                          <h3 className="text-xs font-black text-emerald-300">بوابة ومصادر البيولوجيا والعلوم الحياتية Bioteach</h3>
                          <p className="text-[9px] text-emerald-200 font-bold">المرجع الأكاديمي لمختبرات وأبحاث علم الأحياء والوراثة</p>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-right font-bold">
                        <p className="text-[10px] text-emerald-100 font-semibold leading-relaxed">
                          تم تكامل مصادر مجتمع معلمي ومناهج علم الأحياء والبجروت (Bioteach) وأطلس الخلية لتصميم شروحات وتجارب استقصائية في الوراثة، التمثيل الضوئي، والتنفس الخلوي.
                        </p>

                        <div className="space-y-2">
                          <a
                            href="https://www.bioteach.org.il/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                          >
                            🌐 تصفح بوابة مراجع البيولوجيا الرسمية ↗
                          </a>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("بيولوجيا");
                                setAiTopics("إعداد درس تفصيلي حول الغشاء الخلوي، النقل النشط والانتشار، والتمثيل الضوئي والتنفس الخلوي وفق منهاج بجروت البيولوجيا (نموذج 043381).");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              🌿 تحضير درس بيولوجيا
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("بيولوجيا");
                                setAiTopics("توليد ورقة عمل ومسائل وراثة وتجارب استقصاء علمي حول قوانين مندل، DNA، وانقسام الخلية الميتوزي والميوزي.");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              📝 ورقة عمل بيولوجيا
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isMath) {
                  return (
                    <div className="bg-gradient-to-br from-slate-900 via-[#0f172a] to-blue-950 text-white rounded-3xl border border-blue-800 shadow-xl p-6 space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2.5 border-b border-blue-800/60 pb-3 font-bold">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-black animate-pulse text-lg">
                          📐
                        </div>
                        <div className="text-right">
                          <h3 className="text-xs font-black text-blue-300">بوابة نماذج امتحانات بجروت الرياضيات</h3>
                          <p className="text-[9px] text-blue-200 font-bold">المرجع الرسمي لبنوك أسئلة ونماذج البجروت (3، 4، 5 وحدات)</p>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-right font-bold">
                        <p className="text-[10px] text-blue-100 font-semibold leading-relaxed">
                          تم تكامل بنك أسئلة ونماذج بجروت الرياضيات الرسمية لوزارة المعارف (نماذج 804، 805، 806، 807) لتوليد تمارين متدرجة وحلول تحليلية نموذجية.
                        </p>

                        <div className="space-y-2">
                          <a
                            href="https://meyda.education.gov.il/sheeloney_bagrut/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                          >
                            🌐 تصفح بنك نماذج بجروت الرياضيات ↗
                          </a>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("رياضيات");
                                setAiTopics("إعداد درس تفصيلي في حساب التفاضل والتكامل: بحث الدوال الجذرية والمثلثية والمماسات والنقاط القصوى مع نماذج أسئلة بجروت.");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              📐 تحضير درس تفاضل
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAiSubject("رياضيات");
                                setAiTopics("توليد ورقة عمل بجروت رياضيات حول المتتاليات الحسابية والهندسية ومسائل التزايد والتضاؤل مع حلول تفصيلية خطوة بخطوة.");
                              }}
                              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              📝 ورقة عمل رياضيات
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default: Chemistry (VebSchool Chemistry)
                return (
                  <div className="bg-gradient-to-br from-teal-900 to-[#115e59] text-white rounded-3xl border border-teal-800 shadow-xl p-6 space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2.5 border-b border-teal-800/60 pb-3 font-bold">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black animate-pulse text-lg">
                        🧪
                      </div>
                      <div className="text-right">
                        <h3 className="text-xs font-black text-emerald-300">مدرسة فيب للكيمياء WebSchool</h3>
                        <p className="text-[9px] text-teal-200 font-bold">الموقع الأكاديمي المرجعي لإعداد وتصميم دروس ومهام الكيمياء</p>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-right font-bold">
                      <p className="text-[10px] text-teal-100 font-semibold leading-relaxed">
                        تم تكامل هذا الموقع التفاعلي ليكون دليلك الأساسي في تحضير دروس الكيمياء، صياغة الاختبارات، أو إنشاء أوراق عمل تفاعلية تعتمد على تجارب المحاكاة في الكيمياء الحديثة.
                      </p>

                      <div className="space-y-2">
                        <a
                          href="https://www.vebschoolchemistry.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl text-center shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                        >
                          🌐 تصفح بوابة WebSchool Chemistry التفاعلية ↗
                        </a>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAiSubject("كيمياء (بجروت)");
                              setAiTopics("إعداد درس تفصيلي مبني بالكامل على معايير ومنهج مدرسة فيب للكيمياء (https://www.vebschoolchemistry.com/) لتغطية موضوع: سرعة التفاعلات الكيميائية وتأثير العوامل المساعدة، والاتزان الكيميائي.");
                            }}
                            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            ⚡ تحضير درس WebSchool
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAiSubject("كيمياء (بجروت)");
                              setAiTopics("توليد ورقة عمل واختبار بجروت موضوعي وعملي استناداً إلى بوابة مدرسة فيب للكيمياء (https://www.vebschoolchemistry.com/) يشمل أسئلة حول بنية المادة والروابط الكيميائية وثنائيات الأقطاب.");
                            }}
                            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[9px] rounded-xl text-center transition-all hover:scale-[1.02] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            📝 اختبار / ورقة عمل
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Advanced Math/Physics/Chemistry symbol shortcuts panel */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                    🔬
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-black text-slate-900">دليل رموز المعادلات العلمية</h3>
                    <p className="text-[10px] text-slate-400 font-bold">اضغط على أي رمز أو صيغة لإدراجها تلقائياً في خانة الموضوع</p>
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  {/* Mathematics & Physics Symbols list */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#1A365D] font-black border-r-2 border-indigo-500 pr-1.5 py-0.5 bg-indigo-50/40">📐 اختصارات وعلامات الرياضيات والفيزياء</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => insertToTopicsText("\frac{a}{b}")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[9px] text-slate-700 rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono text-indigo-600 font-black">\frac{}{}</span>
                        <span>كسر عادي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => insertToTopicsText("\sqrt{x}")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[9px] text-slate-700 rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono text-indigo-600 font-black">\sqrt{}</span>
                        <span>جذر تربيعي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => insertToTopicsText("x^2 + y^2")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[9px] text-slate-700 rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono text-indigo-600 font-black">x^2</span>
                        <span>أس مرتفع</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => insertToTopicsText("\int_{a}^{b} f(x)dx")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-[9px] text-slate-700 rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono text-indigo-600 font-black">\int</span>
                        <span>تكامل</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Educational Materials, Resource Hub & Pedagogical AI Assistant */}
        {activeSubTab === 'educational-library' && (
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm" dir="rtl">
            <EducationalMaterialsManager
              initialViewMode="teacher"
              currentTeacherName={loggedInTeacher?.name || 'المعلم'}
              onClose={() => setActiveSubTab('home')}
            />
          </div>
        )}

        {/* Interactive Online Exams & Academic Competitions Portal */}
        {activeSubTab === 'online-exams' && (
          <div className="space-y-6" dir="rtl">
            <OnlineExamsPanel loggedInTeacher={loggedInTeacher} />
          </div>
        )}

        {/* Dedicated "My Students" Portal */}
        {activeSubTab === 'my-students' && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
            {/* Header & Metrics */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                    👨‍🎓
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">سجل الطلاب المنسوبين لحسابك التدريسي</h2>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      جميع الطلاب المنسوبين لك بواسطة إدارة المنصة مع تفاصيل الرصيد والتواصل السريع
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBalanceStatementModalOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="تصدير كشف حساب الرصيد كملف PDF منظم مع تفاصيل العمليات لكل طالب خلال فترة زمنية محددة"
                >
                  <FileDown size={14} className="text-amber-300" />
                  <span>تصدير كشف الرصيد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetchMainData();
                    triggerToast('تم تحديث قائمة الطلاب المنسوبين بنجاح 🔄');
                  }}
                  disabled={loading}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="تحديث البيانات الفوري"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin text-amber-500' : 'text-slate-500'} />
                  <span>تحديث القائمة</span>
                </button>

                <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-black">
                  إجمالي الطلاب: {linkedStudentsList.length}
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="ابحث باسم الطالب، رقم الهاتف، المرحلة الدراسية أو الصف..."
                  value={myStudentsSearch}
                  onChange={(e) => setMyStudentsSearch(e.target.value)}
                  className="w-full pr-10 pl-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-right outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
                {myStudentsSearch && (
                  <button
                    type="button"
                    onClick={() => setMyStudentsSearch('')}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMyStudentsFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    myStudentsFilterStatus === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({linkedStudentsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMyStudentsFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    myStudentsFilterStatus === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  رصيد متوفر ({linkedStudentsList.filter(s => s.isOpenBalance || getStudentRemainingSessions(s.id) > 1).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMyStudentsFilterStatus('low-balance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    myStudentsFilterStatus === 'low-balance'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  رصيد منخفض ({linkedStudentsList.filter(s => !s.isOpenBalance && getStudentRemainingSessions(s.id) <= 1).length})
                </button>
              </div>
            </div>

            {/* Students Grid */}
            {(() => {
              const q = myStudentsSearch.trim().toLowerCase();
              let list = linkedStudentsList;
              if (q) {
                list = list.filter(s => 
                  (s.name || '').toLowerCase().includes(q) ||
                  (s.phone || '').includes(q) ||
                  (s.grade || s.academicLevel || '').toLowerCase().includes(q) ||
                  (s.notes || '').toLowerCase().includes(q)
                );
              }
              if (myStudentsFilterStatus === 'active') {
                list = list.filter(s => s.isOpenBalance || getStudentRemainingSessions(s.id) > 1);
              } else if (myStudentsFilterStatus === 'low-balance') {
                list = list.filter(s => !s.isOpenBalance && getStudentRemainingSessions(s.id) <= 1);
              }

              if (list.length === 0) {
                return (
                  <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-black text-slate-700">
                      {q ? `لم يتم العثور على طالب يطابق "${myStudentsSearch}"` : 'لا توجد نتائج مطابقة للفلتر المحدد'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-bold">
                      {q ? 'تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح، أو أعد ضبط شريط البحث.' : 'يمكنك التبديل إلى عرض "الكل" لرؤية جميع طلابك المنسوبين.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map(student => {
                    const isOpenAccount = !!student.isOpenBalance;
                    const remaining = getStudentRemainingSessions(student.id);
                    const isLow = !isOpenAccount && remaining <= 1;
                    const isZero = !isOpenAccount && remaining <= 0;
                    const studentSessions = sessions.filter(sess => sess.studentId === student.id && sess.teacherId === loggedInTeacher.id);
                    const sessionsCount = studentSessions.length;
                    
                    let lastSessionInfo = 'لا توجد حصص مسجلة بعد';
                    if (studentSessions.length > 0) {
                      const sortedSess = [...studentSessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                      const last = sortedSess[0];
                      lastSessionInfo = `${last.subject || 'حصة'} (${last.date || ''})`;
                    }

                    const isSess40 = student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40';

                    return (
                      <div
                        key={student.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isOpenAccount
                            ? 'bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/20 border-emerald-300 hover:border-emerald-400 hover:shadow-sm'
                            : isZero
                            ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                            : isLow
                            ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Row: Name, System & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 flex items-center justify-center font-black text-sm border border-slate-250 shrink-0">
                                {student.name ? student.name.trim().charAt(0) : 'ط'}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-black text-slate-900 leading-snug truncate">{student.name}</h3>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {student.grade || student.academicLevel || 'طالب مسجل'}
                                  </span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                    isSess40 ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                                  }`}>
                                    {isSess40 ? '40 دقيقة' : 'ساعات'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Remaining Sessions Badge */}
                            <div className="shrink-0">
                              {isOpenAccount ? (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 shadow-2xs" title="اختار مدير المنصة أن يكون رصيد هذا الطالب مفتوحاً">
                                  <span>رصيد مفتوح من المدير</span>
                                  <span>🔓</span>
                                </span>
                              ) : isZero ? (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                                  <span>0 حصص</span>
                                </span>
                              ) : isLow ? (
                                <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                  <span>متبقي {remaining}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                  <span>{remaining} حصص</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Student Details */}
                          <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 text-[11px] font-bold text-slate-700">
                            {student.phone && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">الهاتف:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-800" dir="ltr">{student.phone}</span>
                                  <a
                                    href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-bold"
                                    title="محادثة واتساب"
                                  >
                                    واتساب 💬
                                  </a>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">الحصص المنجزة:</span>
                              <span className="font-black text-slate-800">{sessionsCount} حصة</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">آخر حصة:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[140px]" title={lastSessionInfo}>
                                {lastSessionInfo}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] border-t border-slate-200/60 pt-1 mt-1">
                              <span className="text-slate-400">حالة التنسيب:</span>
                              <span className="text-emerald-700 font-black flex items-center gap-1">
                                <Check size={11} className="stroke-[3]" />
                                <span>معتمد من الإدارة</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-150">
                          <button
                            type="button"
                            onClick={() => {
                              setLogStudentIds([student.id]);
                              setActiveSubTab('log-session');
                            }}
                            className="py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-[11px] rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar size={12} />
                            <span>رصد حصة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setBalanceCheckerStudentId(student.id);
                              setIsBalanceCheckerModalOpen(true);
                            }}
                            className="py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title="فحص رصيد وساعات الطالب المتبقية"
                          >
                            <Clock size={12} className="text-teal-650" />
                            <span>فحص الرصيد ⏱️</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForProfileModal(student);
                            }}
                            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="عرض بطاقة ومتابعة الطالب"
                          >
                            <GraduationCap size={12} />
                            <span>البطاقة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Dedicated Teacher AI Curriculum Generator & Approved Sources Hub (Teacher Exclusive) */}
        {activeSubTab === 'curriculum-generator' && (
          <div className="space-y-6" dir="rtl">
            {/* Top Navigation & Role Disclaimer */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 text-right flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                  <FlaskConical size={22} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">منصة المعلم: توليد المناهج ورفع المصادر المعتمدة</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      صلاحية المعلم المباشرة 🎓
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    المعلم هو المسؤول الأول عن رفع المصادر وتحديث روابط المراجع المعتمدة (مثل مرجع VEB Chemistry)، وتوليد مخرجات التعلم وفق هرم بلوم
                  </p>
                </div>
              </div>

              {/* View Mode Switcher Pills */}
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => setCurriculumActiveView('generator')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    curriculumActiveView === 'generator'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  id="teacher-subtab-view-generator"
                >
                  <Sparkles size={14} className={curriculumActiveView === 'generator' ? 'text-amber-300' : ''} />
                  <span>توليد المناهج الذكي (AI) 🧪</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurriculumActiveView('sources')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    curriculumActiveView === 'sources'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  id="teacher-subtab-view-sources"
                >
                  <BookOpen size={14} className={curriculumActiveView === 'sources' ? 'text-emerald-200' : ''} />
                  <span>رفع وإدارة المصادر المعتمدة 📚</span>
                  <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                    إضافة ورفع المصادر ➕
                  </span>
                </button>
              </div>
            </div>

            {/* Active Sub-View Body */}
            {curriculumActiveView === 'generator' ? (
              <div className="animate-in fade-in duration-300">
                <AICurriculumGenerator />
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <CurriculumSourcesManager
                  mappings={teacherCurriculumSources}
                  onSaveMappings={handleSaveCurriculumSources}
                  isSaving={isSavingCurriculumSources}
                  availableSubjects={loggedInTeacher?.subjects && loggedInTeacher.subjects.length > 0 ? loggedInTeacher.subjects : ['الكيمياء', 'الفيزياء', 'الرياضيات', 'الأحياء والبيولوجيا', 'اللغة الإنجليزية', 'اللغة العربية والأدب']}
                  onOpenGenerator={() => setCurriculumActiveView('generator')}
                />
              </div>
            )}
          </div>
        )}

      </div>
      </motion.div>
    </div>
  )}

      {/* Fullscreen In-App Interactive Smart Whiteboard Overlay */}
      {isWhiteboardModalOpen && (
        <div className="fixed inset-0 z-[250] w-screen h-screen bg-[#070b14] overflow-hidden select-none" dir="rtl">
          <ErrorBoundary fallbackTitle="اللوح الذكي التفاعلي 4K">
            <StandaloneWhiteboardApp
              teacherId={loggedInTeacher?.id || 'teacher'}
              teacherName={loggedInTeacher?.name || 'المعلم'}
              theme={teacherWhiteboardTheme || 'classic-dark'}
              defaultBackground={teacherWhiteboardBg || 'ruled'}
              initialMode={whiteboardModalMode}
              onClose={() => setIsWhiteboardModalOpen(false)}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Student Profile Modal opened directly from assignment/transfer notification */}
      {selectedStudentForProfileModal && (
        <TeacherStudentProfileModal
          student={selectedStudentForProfileModal}
          notificationMeta={selectedStudentNotificationMeta}
          sessions={sessions}
          credits={credits}
          loggedInTeacher={loggedInTeacher}
          onClose={() => {
            setSelectedStudentForProfileModal(null);
            setSelectedStudentNotificationMeta(null);
          }}
          onLogSessionForStudent={(studentId) => {
            setSelectedStudentForProfileModal(null);
            setSelectedStudentNotificationMeta(null);
            if (!logStudentIds.includes(studentId)) {
              setLogStudentIds([studentId]);
            }
            setClassManagementTab('log');
            const el = document.getElementById('class-management-master-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenBalanceChecker={(studentId) => {
            setSelectedStudentForProfileModal(null);
            setSelectedStudentNotificationMeta(null);
            setBalanceCheckerStudentId(studentId);
            setIsBalanceCheckerModalOpen(true);
          }}
        />
      )}

      {/* Teacher Export Monthly Sessions Report Modal */}
      <TeacherExportReportModal
        isOpen={isExportReportModalOpen}
        onClose={() => setIsExportReportModalOpen(false)}
        loggedInTeacher={loggedInTeacher}
        sessions={sessions}
        students={students}
        groupCourses={groupCourses}
        triggerToast={triggerToast}
        onSwitchToBalanceStatement={() => {
          setIsExportReportModalOpen(false);
          setIsBalanceStatementModalOpen(true);
        }}
      />

      {/* Teacher Balance Statement Modal */}
      <TeacherBalanceStatementModal
        isOpen={isBalanceStatementModalOpen}
        onClose={() => setIsBalanceStatementModalOpen(false)}
        loggedInTeacher={loggedInTeacher}
        sessions={sessions}
        students={students}
        payments={payments}
        assignments={assignments}
        groupCourses={groupCourses}
        triggerToast={triggerToast}
      />

      {/* Teacher Student Balance & Remaining Hours Checker Modal */}
      <TeacherStudentBalanceCheckerModal
        isOpen={isBalanceCheckerModalOpen}
        onClose={() => setIsBalanceCheckerModalOpen(false)}
        loggedInTeacher={loggedInTeacher}
        linkedStudents={linkedStudentsList}
        allStudents={students}
        sessions={sessions}
        credits={credits}
        teachers={teachers}
        initialSelectedStudentId={balanceCheckerStudentId}
        onLogSessionForStudent={(studentId) => {
          setIsBalanceCheckerModalOpen(false);
          if (!logStudentIds.includes(studentId)) {
            setLogStudentIds([studentId]);
          }
          setClassManagementTab('log');
          const el = document.getElementById('class-management-master-card');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      </div>
    </div>
  );
}
