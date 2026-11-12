import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Copy, 
  StickyNote, 
  Download, 
  ListOrdered, 
  List, 
  Sparkles, 
  Clock, 
  Pin,
  FileText
} from 'lucide-react';

export interface LessonNoteItem {
  id: string;
  title: string;
  content: string;
  category: 'objective' | 'summary' | 'formula' | 'homework' | 'reminder';
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

interface WhiteboardNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: LessonNoteItem[];
  onSaveNotes: (notes: LessonNoteItem[]) => void;
  onConvertToStickyNote: (note: LessonNoteItem) => void;
  projectTitle: string;
}

export const WhiteboardNotesDrawer: React.FC<WhiteboardNotesDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  onSaveNotes,
  onConvertToStickyNote,
  projectTitle
}) => {
  const [localNotes, setLocalNotes] = useState<LessonNoteItem[]>(notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [saveStatus, setSaveStatus] = useState<string>('تم الحفظ لحظياً');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    setLocalNotes(notes);
    if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes]);

  const activeNote = localNotes.find(n => n.id === selectedNoteId) || localNotes[0];

  const handleUpdateActiveNote = (updates: Partial<LessonNoteItem>) => {
    if (!activeNote) return;
    const now = Date.now();
    const updatedNotes = localNotes.map(n => 
      n.id === activeNote.id ? { ...n, ...updates, updatedAt: now } : n
    );
    setLocalNotes(updatedNotes);
    onSaveNotes(updatedNotes);
    setSaveStatus('جاري الحفظ...');
    setTimeout(() => setSaveStatus('تم الحفظ لحظياً ✓'), 400);
  };

  const handleAddNote = (category: LessonNoteItem['category'] = 'summary') => {
    const newNote: LessonNoteItem = {
      id: `note_${Date.now()}`,
      title: category === 'objective' ? 'أهداف الدرس' : category === 'homework' ? 'واجب منزلي' : 'ملاحظة جديدة',
      content: '',
      category,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [newNote, ...localNotes];
    setLocalNotes(updated);
    setSelectedNoteId(newNote.id);
    onSaveNotes(updated);
    setSaveStatus('تمت الإضافة والحفظ لحظياً ✓');
  };

  const handleDeleteNote = (id: string) => {
    const updated = localNotes.filter(n => n.id !== id);
    setLocalNotes(updated);
    onSaveNotes(updated);
    if (selectedNoteId === id) {
      setSelectedNoteId(updated[0]?.id || '');
    }
    setSaveStatus('تم الحذف ✓');
  };

  const handleTogglePin = (id: string) => {
    const updated = localNotes.map(n => 
      n.id === id ? { ...n, isPinned: !n.isPinned } : n
    );
    setLocalNotes(updated);
    onSaveNotes(updated);
  };

  const handleExportNotesAsText = () => {
    let text = `ملاحظات الدرس: ${projectTitle}\n`;
    text += `تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}\n`;
    text += `==========================================\n\n`;

    localNotes.forEach((n, idx) => {
      text += `[${idx + 1}] ${n.title} (${getCategoryLabel(n.category)})\n`;
      text += `------------------------------------------\n`;
      text += `${n.content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ملاحظات_الدرس_${projectTitle.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryLabel = (cat: LessonNoteItem['category']) => {
    switch (cat) {
      case 'objective': return '🎯 أهداف الدرس';
      case 'summary': return '📝 ملخص ونقاط';
      case 'formula': return '📐 قوانين وقواعد';
      case 'homework': return '📚 واجب وتمارين';
      case 'reminder': return '⏰ تنبيه وملاحظة';
      default: return '📄 ملاحظة';
    }
  };

  const getCategoryColor = (cat: LessonNoteItem['category']) => {
    switch (cat) {
      case 'objective': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'summary': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'formula': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'homework': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'reminder': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const filteredNotes = localNotes.filter(n => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'pinned') return !!n.isPinned;
    return n.category === filterCategory;
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in"
      dir="rtl"
    >
      <div 
        className="w-full max-w-xl h-full bg-slate-900 border-r border-slate-800 text-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
      >
        {/* Drawer Header */}
        <header className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>مفكرة وملاحظات الحصة اللحظية</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  حفظ تلقائي
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                تدوين منظم لأهداف الدرس، القوانين، والواجبات مع الحفظ الفوري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportNotesAsText}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="تصدير الملاحظات كملف نصي TXT"
            >
              <Download size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="إغلاق المفكرة"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Action Bar & Quick Category Filter */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Add Note Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAddNote('summary')}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>ملاحظة جديدة</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddNote('objective')}
              className="px-2.5 py-1.5 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="إضافة هدف دراسي"
            >
              🎯 هدف
            </button>
            <button
              type="button"
              onClick={() => handleAddNote('homework')}
              className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="إضافة واجب منزلي"
            >
              📚 واجب
            </button>
          </div>

          {/* Real-Time Save Badge */}
          <div className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{saveStatus}</span>
          </div>
        </div>

        {/* Drawer Content: Split View (Notes List & Note Editor) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Notes Sidebar List */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-l border-slate-800 flex flex-col bg-slate-950/40">
            {/* Category Filter Pills */}
            <div className="p-2 border-b border-slate-800/80 flex gap-1 overflow-x-auto custom-scrollbar">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'pinned', label: '📌 مثبت' },
                { id: 'objective', label: '🎯 أهداف' },
                { id: 'summary', label: '📝 ملخص' },
                { id: 'homework', label: '📚 واجب' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterCategory(tab.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                    filterCategory === tab.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  لا توجد ملاحظات في هذا التصنيف
                </div>
              ) : (
                filteredNotes.map(n => {
                  const isSelected = activeNote?.id === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNoteId(n.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400/80 shadow-xs'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-200 line-clamp-1">
                          {n.title || 'بدون عنوان'}
                        </span>
                        {n.isPinned && (
                          <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className={`px-1.5 py-0.2 rounded-md border text-[9px] font-bold ${getCategoryColor(n.category)}`}>
                          {getCategoryLabel(n.category)}
                        </span>
                        <span>{new Date(n.updatedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Note Editor */}
          {activeNote ? (
            <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto custom-scrollbar bg-slate-900/60">
              {/* Note Details Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                  placeholder="عنوان الملاحظة أو النقطة الرئيسية..."
                  className="flex-1 min-w-[180px] bg-transparent text-sm font-black text-amber-300 placeholder:text-slate-600 focus:outline-hidden"
                />

                <div className="flex items-center gap-1.5">
                  {/* Category Selector */}
                  <select
                    value={activeNote.category}
                    onChange={(e) => handleUpdateActiveNote({ category: e.target.value as any })}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-300 font-bold focus:outline-hidden"
                  >
                    <option value="objective">🎯 أهداف الدرس</option>
                    <option value="summary">📝 ملخص ونقاط</option>
                    <option value="formula">📐 قوانين وقواعد</option>
                    <option value="homework">📚 واجب وتمارين</option>
                    <option value="reminder">⏰ تنبيه وملاحظة</option>
                  </select>

                  {/* Pin button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(activeNote.id)}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                      activeNote.isPinned
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title={activeNote.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                  >
                    <Pin size={13} className={activeNote.isPinned ? 'fill-amber-300' : ''} />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-700/60 rounded-xl transition-all cursor-pointer"
                    title="حذف هذه الملاحظة"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Quick Formatting Helpers */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateActiveNote({ content: activeNote.content + '\n• ' })}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <List size={13} />
                  <span>نقطة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateActiveNote({ content: activeNote.content + '\n1. ' })}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <ListOrdered size={13} />
                  <span>ترقيم</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateActiveNote({ content: activeNote.content + '\n⭐ هام: ' })}
                  className="px-2 py-1 text-amber-300 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={13} />
                  <span>هام</span>
                </button>

                <div className="mr-auto">
                  {/* Convert to Sticky Note on Canvas */}
                  <button
                    type="button"
                    onClick={() => onConvertToStickyNote(activeNote)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs"
                    title="إدراج هذه الملاحظة كبطاقة لاصقة على اللوح"
                  >
                    <StickyNote size={13} />
                    <span>لصق على اللوح 📌</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <textarea
                value={activeNote.content}
                onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
                rows={12}
                placeholder="اكتب تفاصيل الملاحظة، الشرح، القوانين أو خطوات الحل هنا..."
                className="w-full flex-1 p-3 bg-slate-950/90 border border-slate-800 focus:border-amber-400 rounded-2xl text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-hidden custom-scrollbar"
              />

              {/* Timestamps */}
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>تاريخ الإنشاء: {new Date(activeNote.createdAt).toLocaleDateString('ar-EG')}</span>
                <span>آخر تعديل: {new Date(activeNote.updatedAt).toLocaleTimeString('ar-EG')}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <FileText size={48} className="mb-2 text-slate-700" />
              <p className="text-sm font-bold">لا توجد ملاحظة محددة</p>
              <button
                type="button"
                onClick={() => handleAddNote('summary')}
                className="mt-3 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
              >
                + إنشاء ملاحظة جديدة
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
