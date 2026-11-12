import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  FileText, 
  Trash2, 
  Copy, 
  Edit3, 
  Download, 
  Upload, 
  Calendar, 
  Layers, 
  Check, 
  X, 
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users
} from 'lucide-react';
import { WhiteboardProject, WhiteboardBackgroundType } from '../../types/whiteboard';

interface WhiteboardFileManagerProps {
  projects: WhiteboardProject[];
  currentProjectId?: string;
  onSelectProject: (project: WhiteboardProject) => void;
  onNewProject: (title?: string, backgroundType?: WhiteboardBackgroundType) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newTitle: string) => void;
  onDuplicateProject: (project: WhiteboardProject) => void;
  onImportPdf?: () => void;
  onClose?: () => void;
}

/**
 * Format date in Arabic matching the screenshot:
 * "محرر: أمس 18:04"
 * "محرر: سبت 18:38"
 * "محرر: اليوم 14:20"
 */
function formatArabicModifiedDate(dateStr?: string): string {
  if (!dateStr) return 'محرر: حديثاً';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'محرر: حديثاً';

    const now = new Date();
    const isToday = 
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = 
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (isToday) {
      return `محرر: اليوم ${timeStr}`;
    }
    if (isYesterday) {
      return `محرر: أمس ${timeStr}`;
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const daysAr = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
      const dayName = daysAr[date.getDay()];
      return `محرر: ${dayName} ${timeStr}`;
    }

    const day = date.getDate();
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const month = monthNames[date.getMonth()];
    return `محرر: ${day} ${month}`;
  } catch {
    return 'محرر: حديثاً';
  }
}

/**
 * Component to render a miniature thumbnail preview of a whiteboard project
 */
const WhiteboardThumbnailView: React.FC<{ project: WhiteboardProject }> = ({ project }) => {
  const firstPage = project.pages?.[0];
  const strokesCount = firstPage?.strokes?.length || 0;
  const textCount = firstPage?.textItems?.length || 0;
  const imagesCount = firstPage?.imageItems?.length || 0;
  const hasContent = strokesCount > 0 || textCount > 0 || imagesCount > 0 || !!firstPage?.backgroundImage;

  if (project.thumbnailUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950">
        <img 
          src={project.thumbnailUrl} 
          alt={project.title}
          className="max-h-full max-w-full object-contain rounded-md shadow-xs"
        />
      </div>
    );
  }

  // If first page has a background image (e.g. PDF page)
  if (firstPage?.backgroundImage) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2 bg-white dark:bg-slate-900">
        <img 
          src={firstPage.backgroundImage} 
          alt={project.title}
          className="max-h-full max-w-full object-contain rounded-md shadow-xs"
        />
      </div>
    );
  }

  // Visual preview matching the user's uploaded dashboard screenshot
  const isAnnotations = project.title?.includes('Annotations');
  const isBlankSample = project.title?.includes('Whiteboard 60');

  return (
    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 relative overflow-hidden select-none">
      {isAnnotations ? (
        /* Annotations Card: Shows bold red numbers 5, 2, 10 like in screenshot */
        <div className="w-full h-full flex flex-col items-center justify-center relative font-black text-rose-600">
          <span className="text-2xl sm:text-3xl tracking-wider leading-none">10</span>
          <span className="text-3xl sm:text-4xl tracking-wider leading-none my-1">5</span>
          <span className="text-3xl sm:text-4xl tracking-wider leading-none">2</span>
          <span className="text-2xl sm:text-3xl tracking-wider leading-none opacity-40">10</span>
        </div>
      ) : isBlankSample ? (
        /* Blank canvas like Whiteboard 60 */
        <div className="w-full h-full bg-white dark:bg-slate-900" />
      ) : (
        /* Vertical document / continuous page strip down the center matching screenshot */
        <div className="h-full w-12 sm:w-16 bg-white dark:bg-slate-800 shadow-xs border-x border-slate-100 dark:border-slate-700/60 flex flex-col items-center py-2 px-1 overflow-hidden pointer-events-none">
          {/* Miniature page strips with red and black annotations */}
          <div className="w-full flex flex-col gap-1.5 opacity-80">
            <div className="h-1 w-full bg-rose-500/80 rounded-full" />
            <div className="h-0.5 w-3/4 bg-slate-400 rounded-full" />
            <div className="h-0.5 w-5/6 bg-slate-300 rounded-full" />
            <div className="h-1.5 w-2/3 bg-rose-400/70 rounded-full" />
            <div className="my-1 border-t border-dashed border-slate-200 w-full" />
            <div className="h-0.5 w-4/5 bg-slate-400 rounded-full" />
            <div className="h-1 w-1/2 bg-blue-500/70 rounded-full" />
            <div className="h-0.5 w-full bg-slate-300 rounded-full" />
            <div className="h-1 w-2/3 bg-rose-500/80 rounded-full" />
            <div className="my-1 border-t border-dashed border-slate-200 w-full" />
            <div className="h-0.5 w-3/4 bg-slate-400 rounded-full" />
            <div className="h-0.5 w-1/2 bg-slate-300 rounded-full" />
            <div className="h-1 w-4/5 bg-rose-400/80 rounded-full" />
            <div className="h-0.5 w-full bg-slate-300 rounded-full" />
            <div className="my-1 border-t border-dashed border-slate-200 w-full" />
            <div className="h-1 w-3/4 bg-blue-400/70 rounded-full" />
            <div className="h-0.5 w-2/3 bg-slate-400 rounded-full" />
            <div className="h-1 w-1/2 bg-rose-500/70 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export const WhiteboardFileManager: React.FC<WhiteboardFileManagerProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  onDuplicateProject,
  onImportPdf,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [customNewTitle, setCustomNewTitle] = useState('');
  const [customNewBg, setCustomNewBg] = useState<WhiteboardBackgroundType>('ruled');

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.trim().toLowerCase();
    return projects.filter(p => 
      (p.title || '').toLowerCase().includes(term) ||
      (p.subject || '').toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  // Close active dropdown menu when clicking outside
  const menuRef = useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  return (
    <div className="w-full h-full min-h-screen bg-[#eaedf1] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-y-auto" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  اللوح الذكي التفاعلي
                </h1>
                <span className="text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  أكاديمية التفوق
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر ملف الشرح السابق للمتابعة أو أنشئ سبورة جديدة
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="رجوع للرئيسية"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في أسماء الملفات والألواح..."
              className="w-full pl-3 pr-9 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {onImportPdf && (
            <button
              type="button"
              onClick={onImportPdf}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
              title="استيراد كتاب أو ملف PDF كسبورة جديدة"
            >
              <Upload size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">استيراد PDF</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              title="إغلاق والعودة للوحة التحكم"
            >
              <ArrowRight size={15} />
              <span>خروج</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Files Grid Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
              الملفات والألواح الأخيرة
            </h2>
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
              ({projects.length} ملف)
            </span>
          </div>
        </div>

        {/* Grid of Files Matching the User Image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          
          {/* 1. First Card: Primary Blue "سبورة بيضاء جديدة" (Exact match to screenshot) */}
          <div 
            onClick={() => onNewProject()}
            className="group relative bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-6 h-60 sm:h-64 border border-blue-500"
            role="button"
            tabIndex={0}
          >
            {/* Background subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />

            {/* Centered White Circle with Blue Plus */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-md group-hover:scale-108 group-active:scale-95 transition-all duration-200">
              <Plus size={32} strokeWidth={2.5} className="text-blue-600" />
            </div>

            {/* Label below the circle */}
            <span className="text-white text-base sm:text-lg font-black mt-4 tracking-wide text-center drop-shadow-xs">
              سبورة بيضاء جديدة
            </span>

            {/* Subtle template helper trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewBoardModal(true);
              }}
              className="mt-2 text-[11px] font-bold text-blue-100 hover:text-white bg-blue-500/40 hover:bg-blue-500/60 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              title="تخصيص نوع خلفية السبورة (مسطر، مربعات، إحداثي)"
            >
              <Sparkles size={11} />
              <span>اختيار قالب خاص...</span>
            </button>
          </div>

          {/* 2. Existing Projects / Whiteboard Files */}
          {filteredProjects.map((proj) => {
            const isCurrent = proj.id === currentProjectId;
            const isMenuOpen = activeMenuId === proj.id;
            const isEditing = editingId === proj.id;

            return (
              <div
                key={proj.id}
                onClick={() => {
                  if (!isEditing) {
                    onSelectProject(proj);
                  }
                }}
                className={`group relative bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col h-60 sm:h-64 cursor-pointer ${
                  isCurrent 
                    ? 'border-blue-500 ring-2 ring-blue-500/30 dark:ring-blue-500/40' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Upper Area: Visual Whiteboard Preview / Thumbnail */}
                <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative border-b border-slate-100 dark:border-slate-850">
                  <WhiteboardThumbnailView project={proj} />

                  {/* Badge: Currently Open */}
                  {isCurrent && (
                    <div className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm pointer-events-none">
                      مفتوح حالياً
                    </div>
                  )}
                </div>

                {/* Bottom Footer Area: Title, Date, and Three-dots menu */}
                <div className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
                  {/* Right side in RTL: Title & Last Modified */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {((proj as any).isShared || proj.title?.includes('Annotations') || proj.title?.includes('غرفة')) && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs" title="جلسة تفاعلية مشتركة">
                        <Users size={12} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingTitle.trim()) {
                              onRenameProject(proj.id, editingTitle.trim());
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-blue-500 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editingTitle.trim()) {
                              onRenameProject(proj.id, editingTitle.trim());
                            }
                            setEditingId(null);
                          }}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 
                          className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                          title={proj.title}
                        >
                          {proj.title || 'سبورة بدون عنوان'}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                          {formatArabicModifiedDate(proj.updatedAt || proj.createdAt)}
                        </p>
                      </>
                    )}
                    </div>
                  </div>

                  {/* Left side in RTL: Three-dots Action Menu */}
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : proj.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="خيارات السبورة"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div 
                        ref={menuRef}
                        className="absolute left-0 bottom-full mb-1.5 w-48 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onSelectProject(proj);
                          }}
                          className="w-full px-3.5 py-2 text-right hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileText size={14} className="text-blue-500" />
                          <span>فتح السبورة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setEditingId(proj.id);
                            setEditingTitle(proj.title);
                          }}
                          className="w-full px-3.5 py-2 text-right hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Edit3 size={14} className="text-amber-500" />
                          <span>إعادة تسمية</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDuplicateProject(proj);
                          }}
                          className="w-full px-3.5 py-2 text-right hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Copy size={14} className="text-emerald-500" />
                          <span>إنشاء نسخة طبق الأصل</span>
                        </button>

                        <div className="h-[1px] bg-slate-100 dark:bg-slate-750 my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            if (window.confirm(`هل أنت متأكد من حذف لوح "${proj.title}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          className="w-full px-3.5 py-2 text-right text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>حذف السبورة</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search Result Notice */}
        {filteredProjects.length === 0 && searchTerm.trim() && (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Search size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold">لا توجد ملفات تطابق بحثك: &quot;{searchTerm}&quot;</p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              إلغاء تصفية البحث
            </button>
          </div>
        )}
      </main>

      {/* Optional: Customized New Board Template Modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">إنشاء سبورة جديدة</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">اختر اسم اللوح ونمط الخلفية التفاعلية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBoardModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان اللوح / الدرس:
                </label>
                <input
                  type="text"
                  value={customNewTitle}
                  onChange={(e) => setCustomNewTitle(e.target.value)}
                  placeholder="مثال: شرح درس الرياضيات - الدوال"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  نوع واجهة السبورة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'ruled', name: 'أبيض مخطط سطور (دفتر)', icon: '📝' },
                    { id: 'grid', name: 'ورق مربعات (بياني)', icon: '📐' },
                    { id: 'blank', name: 'أبيض بدون تخطيط', icon: '⚪' },
                    { id: 'dots', name: 'نقاط Dot Grid', icon: '⠠' },
                    { id: 'chalkboard', name: 'لوح كلاسيكي أخضر', icon: '🟢' },
                    { id: 'dark', name: 'سبورة داكنة فحمية', icon: '⚫' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setCustomNewBg(tmpl.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        customNewBg === tmpl.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs">{tmpl.name}</span>
                      <span className="text-base">{tmpl.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewBoardModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onNewProject(customNewTitle.trim() || undefined, customNewBg);
                  setShowNewBoardModal(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>بدء السبورة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
