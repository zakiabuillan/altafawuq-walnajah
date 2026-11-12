import React, { useState, useRef } from 'react';
import { 
  X, 
  FileText, 
  ImageIcon, 
  Upload, 
  Clipboard, 
  Sparkles, 
  Check, 
  Layers, 
  Maximize, 
  Move, 
  HelpCircle,
  FileCheck,
  Palette
} from 'lucide-react';

export interface WhiteboardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPdfFile: (file: File) => void;
  onInsertImageFile: (file: File, asBackground: boolean) => void;
  onOpenEducationalLibrary: () => void;
  onPasteFromClipboard?: () => void;
}

export const WhiteboardImportModal: React.FC<WhiteboardImportModalProps> = ({
  isOpen,
  onClose,
  onSelectPdfFile,
  onInsertImageFile,
  onOpenEducationalLibrary,
  onPasteFromClipboard
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'pdf' | 'clipboard' | 'library'>('image');
  
  // Image state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [insertAsBackground, setInsertAsBackground] = useState<boolean>(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setImagePreviewSrc(loadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImageInsert = () => {
    if (!selectedImageFile) return;
    onInsertImageFile(selectedImageFile, insertAsBackground);
    onClose();
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSelectPdfFile(file);
    onClose();
  };

  const handleDirectPaste = async () => {
    if (onPasteFromClipboard) {
      onPasteFromClipboard();
      onClose();
    } else {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imageType });
            onInsertImageFile(file, false);
            onClose();
            return;
          }
        }
        alert('لم يتم العثور على صورة في الحافظة. يرجى نسخ صورة أولاً ثم المحاولة أو استخدام Ctrl+V.');
      } catch (err) {
        alert('يرجى الضغط على اختصار Ctrl+V مباشرة على اللوح الذكي للصق الصورة من الحافظة.');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Inputs */}
        <input 
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          onChange={handleImageChange}
          className="hidden"
        />
        <input 
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/40">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                استيراد ملفات وصور للوح الذكي
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  للكتابة والشرح
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                استورد كتباً مدرسية، أوراق عمل (PDF)، أو صور ومسائل للكتابة والرسم فوقها بحرية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 p-2 px-5 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'image'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <ImageIcon size={15} />
            <span>استيراد صورة من جهازك 🖼️</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <FileText size={15} />
            <span>مستند أو كتاب (PDF) 📄</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clipboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clipboard'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Clipboard size={15} />
            <span>لصق لقطة شاشة (Ctrl+V) 📋</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEducationalLibrary();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-950/60 transition-all cursor-pointer whitespace-nowrap border border-indigo-500/30 mr-auto"
          >
            <Palette size={15} />
            <span>مكتبة المخططات الجاهزة 🎨</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* TAB 1: IMAGE IMPORT */}
          {activeTab === 'image' && (
            <div className="space-y-5">
              {!selectedImageFile ? (
                /* Upload Drop Zone */
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      setSelectedImageFile(file);
                      const reader = new FileReader();
                      reader.onload = (loadEvt) => {
                        setImagePreviewSrc(loadEvt.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950/50 hover:bg-cyan-950/20 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer space-y-3 group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                    <ImageIcon size={32} />
                  </div>
                  <h3 className="text-base font-black text-white">
                    انقر لاختيار صورة من جهازك أو اسحبها وأفلتها هنا
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    يدعم صور المسائل، المخططات، والرسوم البيانية بصيغ (PNG, JPG, JPEG, WebP, SVG) بدقة فائقة للكتابة والتأشير عليها.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-colors">
                      <Upload size={14} />
                      استعراض الصور من الكمبيوتر أو الهاتف
                    </span>
                  </div>
                </div>
              ) : (
                /* Image Preview & Placement Mode Selection */
                <div className="space-y-5">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                    {/* Thumbnail Preview */}
                    <div className="relative w-48 h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shrink-0">
                      {imagePreviewSrc ? (
                        <img 
                          src={imagePreviewSrc} 
                          alt="معاينة الصورة" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      ) : (
                        <ImageIcon size={32} className="text-slate-600" />
                      )}
                      <div className="absolute bottom-1 right-1 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                        {(selectedImageFile.size / 1024).toFixed(0)} KB
                      </div>
                    </div>

                    {/* Image Details & Change Button */}
                    <div className="flex-1 space-y-1 text-center md:text-right">
                      <h4 className="text-sm font-black text-white truncate max-w-xs md:max-w-md">
                        {selectedImageFile.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        تم تحميل الصورة بنجاح! اختر طريقة ظهورها على اللوح أدناه:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setImagePreviewSrc(null);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer pt-1"
                      >
                        اختيار صورة أخرى
                      </button>
                    </div>
                  </div>

                  {/* Placement Mode Selection (Element vs Full Background) */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 block">
                      طريقة إدراج الصورة على اللوح الذكي:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option A: Movable Element */}
                      <div 
                        onClick={() => setInsertAsBackground(false)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                          !insertAsBackground
                            ? 'bg-cyan-950/30 border-cyan-400 text-white shadow-lg'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Move size={18} className="text-cyan-400" />
                            <span className="text-sm font-black">عنصر تفاعلي للشرح والكتابة</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            !insertAsBackground ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600'
                          }`}>
                            {!insertAsBackground && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          تظهر الصورة داخل اللوح، ويمكنك تحريكها وتغيير حجمها والكتابة والتأشير فوقها مباشرة بأي قلم أو أداة.
                        </p>
                      </div>

                      {/* Option B: Full-Page Background */}
                      <div 
                        onClick={() => setInsertAsBackground(true)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                          insertAsBackground
                            ? 'bg-indigo-950/30 border-indigo-400 text-white shadow-lg'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Maximize size={18} className="text-indigo-400" />
                            <span className="text-sm font-black">تثبيت كخلفية كاملة للصفحة</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            insertAsBackground ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600'
                          }`}>
                            {insertAsBackground && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          تتمدد الصورة لتملأ صفحة اللوح بالكامل كأنها ورقة عمل أو امتحان رسمي، ويبقى اللوح ثابتاً للحل والكتابة.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageFile(null);
                        setImagePreviewSrc(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmImageInsert}
                      className="px-6 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check size={16} />
                      <span>إدراج الصورة وبدء الكتابة عليها ✓</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PDF DOCUMENT IMPORT */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div 
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type === 'application/pdf') {
                    onSelectPdfFile(file);
                    onClose();
                  }
                }}
                className="border-2 border-dashed border-rose-500/40 hover:border-rose-400 bg-slate-950/50 hover:bg-rose-950/20 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer space-y-3 group"
              >
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                  <FileText size={32} />
                </div>
                <h3 className="text-base font-black text-white">
                  انقر لاختيار ملف PDF من جهازك أو اسحبه وأفلته هنا
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  استيراد الكتب المدرسية، الدوسيات، وملازم الشرح وأوراق العمل. ستتمكن من اختيار الصفحات وعرضها بدقة عالية والكتابة عليها مباشرة.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-md transition-colors">
                    <FileCheck size={14} />
                    استعراض ملف PDF واختيار الصفحات
                  </span>
                </div>
              </div>

              {/* PDF Features Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>دقة طباعة فائقة دون تشويش</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>وضع كتاب مفتوح (PDF + مسودة)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>قفل الصفحات لحمايتها أثناء الشرح</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLIPBOARD PASTE */}
          {activeTab === 'clipboard' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
                <Clipboard size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  لصق مباشر للقطات الشاشة والصور المنسوخة
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  إذا كنت قد التقطت لقطة شاشة لمسألة من كتاب أو متصفح، يمكنك إدراجها فوراً هنا أو بالضغط على اختصار لوحة المفاتيح:
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-300">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">V</kbd>
                <span className="text-slate-400 font-sans mr-2">(أو اضغط الزر أدناه)</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDirectPaste}
                  className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/50 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Clipboard size={16} />
                  <span>لصق الصورة من الحافظة الآن 📋</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span>يمكنك الكتابة والرسم والتظليل واستخراج النصوص بالذكاء الاصطناعي على أي ملف مستورد.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
