import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  FolderOpen, 
  Trash2, 
  Calendar, 
  Layers, 
  BookOpen, 
  Check, 
  Edit2, 
  Sparkles,
  Search
} from 'lucide-react';
import { WhiteboardProject, WhiteboardBackgroundType } from '../../types/whiteboard';

interface WhiteboardProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: WhiteboardProject[];
  currentProjectId: string;
  onSelectProject: (project: WhiteboardProject) => void;
  onNewProject: (title: string, backgroundType: WhiteboardBackgroundType) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newTitle: string) => void;
  initialMode?: 'list' | 'new';
}

export const WhiteboardProjectsModal: React.FC<WhiteboardProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  initialMode = 'list'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'new'>(initialMode);
  const [newTitle, setNewTitle] = useState('شرح درس جديد');
  const [newBg, setNewBg] = useState<WhiteboardBackgroundType>('ruled');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setEditingId(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const searchLower = (searchTerm || '').toLowerCase();
  const filtered = projects.filter(p => 
    (p.title || '').toLowerCase().includes(searchLower) ||
    (p.subject && (p.subject || '').toLowerCase().includes(searchLower))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">مشاريع وألواح الشرح الذكية</h3>
              <p className="text-xs text-slate-400">إدارة الألواح المحفوظة وإنشاء دروس وشروحات جديدة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Switcher Tabs & Search */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus size={15} />
              <span>إنشاء ملف جديد ✨</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-md scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen size={15} />
              <span>فتح ملف قديم ({projects.length})</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الألواح السابقة..."
                className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'new' ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>إعدادات اللوح الذكي الجديد</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">اختر عنوان الدرس ونوع خلفية السبورة التفاعلية</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">عنوان اللوح / موضوع الدرس:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: مراجعة الرياضيات - الدوال والمعادلات"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white focus:outline-hidden focus:border-amber-400 shadow-inner"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع وخلفية واجهة السبورة (Background):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {[
                    { id: 'ruled', name: 'أبيض مخطط سطور (دفتر)', icon: '📝', desc: 'سطور أفقية للكتابة مثل هيئة الدفتر (الافتراضي)' },
                    { id: 'grid', name: 'ورق مربعات (بياني / حسابي)', icon: '📐', desc: 'شبكة مربعات للرياضيات والهندسة' },
                    { id: 'blank', name: 'أبيض بدون تخطيط (سادة)', icon: '⚪', desc: 'لوح أبيض ناصع بدون أي خطوط' },
                    { id: 'dots', name: 'نقاط منتظمة Dot Grid', icon: '⠠', desc: 'نقاط إرشادية للرسم والتصميم' },
                    { id: 'chalkboard', name: 'سبورة خضراء (طباشير)', icon: '🟢', desc: 'طراز السبورة المدرسية الكلاسيكية' },
                    { id: 'dark', name: 'سبورة داكنة فحمية', icon: '⚫', desc: 'لوح داكن عصري ومريح للعين' },
                    { id: 'math-plane', name: 'مستوى إحداثي X/Y', icon: '📊', desc: 'شبكة محاور ديكارتية مركزية' },
                    { id: 'isometric', name: 'شبكة أيزومترك 3D', icon: '🧊', desc: 'شبكة مجسمات ثلاثية الأبعاد' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setNewBg(tmpl.id as any)}
                      className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        newBg === tmpl.id 
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10 scale-102' 
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{tmpl.icon}</span>
                        {newBg === tmpl.id && (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">✓</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{tmpl.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{tmpl.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNewProject(newTitle.trim() || 'شرح درس جديد', newBg);
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>بدء اللوح الذكي الآن 🚀</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filtered.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <BookOpen size={24} />
                  </div>
                  <p className="text-xs font-bold">لا توجد ألواح سابقة محفوظة، يمكنك إنشاء لوحك الأول الآن!</p>
                </div>
              ) : (
                filtered.map(proj => {
                  const isCurrent = proj.id === currentProjectId;
                  const pageCount = proj.pages?.length || 1;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isCurrent 
                          ? 'bg-slate-800/90 border-amber-400 shadow-lg shadow-amber-500/10' 
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {editingId === proj.id ? (
                            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-900 border border-amber-400 rounded-lg text-xs text-white"
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
                                className="p-1 bg-amber-500 text-slate-950 rounded cursor-pointer"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <h4 className="text-xs font-black text-slate-200 truncate group-hover:text-amber-300 transition-colors">
                              {proj.title}
                            </h4>
                          )}

                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-md shrink-0">
                              مفتوح حالياً
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Layers size={11} className="text-amber-400" />
                            <span>{pageCount} صفحات</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString('ar-AE')}</span>
                          </span>
                        </div>
                      </div>

                      {/* Footer tools */}
                      <div className="flex items-center justify-end gap-1 mt-4 pt-2 border-t border-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(proj.id);
                            setEditingTitle(proj.title);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="إعادة تسمية"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل أنت متأكد من حذف لوح "${proj.title}"؟`)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/50 cursor-pointer"
                          title="حذف المشروع"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>إجمالي المشاريع: {projects.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
