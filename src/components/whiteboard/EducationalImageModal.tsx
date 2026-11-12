import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Search, 
  Image as ImageIcon, 
  Sparkles, 
  Link as LinkIcon, 
  Upload, 
  FolderCheck, 
  Layers, 
  ZoomIn, 
  Check, 
  Compass, 
  Atom, 
  Dna, 
  Globe, 
  Award, 
  FileText, 
  Maximize2,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  EDUCATIONAL_CATEGORIES, 
  EDUCATIONAL_GRAPHICS, 
  EducationalGraphic, 
  svgToDataUrl 
} from './educationalImagesData';

export interface InsertedImageOptions {
  src: string;
  title: string;
  width: number;
  height: number;
  insertAsBackground: boolean;
}

interface EducationalImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (options: InsertedImageOptions) => void;
}

type ModalTab = 'library' | 'search' | 'url' | 'upload';

// Curated web/online educational search collection
interface WebEducationalResult {
  id: string;
  title: string;
  subject: string;
  category: string;
  url: string;
  thumbnail: string;
  aspectRatio: number;
  width: number;
  height: number;
}

const CURATED_WEB_DIAGRAMS: WebEducationalResult[] = [
  {
    id: 'web_periodic_table',
    title: 'الجدول الدوري الحديث للعناصر الكيميائية',
    subject: 'كيمياء عامة',
    category: 'chemistry',
    url: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.6,
    width: 800,
    height: 500
  },
  {
    id: 'web_human_brain',
    title: 'تشريح الدماغ البشري والفصوص العصبية',
    subject: 'أحياء وتشريح',
    category: 'biology',
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.4,
    width: 700,
    height: 500
  },
  {
    id: 'web_astronomy_telescope',
    title: 'رصد الفضاء والمجرات والنجوم',
    subject: 'فيزياء وفلك',
    category: 'physics',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.5,
    width: 750,
    height: 500
  },
  {
    id: 'web_math_geometry_tools',
    title: 'أدوات الهندسة والفرجار والمنقلة والمسطرة',
    subject: 'رياضيات وهندسة',
    category: 'math',
    url: 'https://images.unsplash.com/photo-1580584126903-c17d41830450?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1580584126903-c17d41830450?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.5,
    width: 750,
    height: 500
  },
  {
    id: 'web_microscope_lab',
    title: 'المجهر الضوئي وفحص الأنسجة والخلايا',
    subject: 'أحياء وعلوم',
    category: 'biology',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.4,
    width: 700,
    height: 500
  },
  {
    id: 'web_world_map_vintage',
    title: 'خريطة العالم وتضاريس القارات والمحيطات',
    subject: 'جغرافيا وتاريخ',
    category: 'geography',
    url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
    aspectRatio: 1.6,
    width: 800,
    height: 500
  }
];

export const EducationalImageModal: React.FC<EducationalImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImage
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [insertAsBackground, setInsertAsBackground] = useState<boolean>(false);
  const [sizePreset, setSizePreset] = useState<'small' | 'medium' | 'large'>('medium');
  
  // URL Input State
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isUrlValidating, setIsUrlValidating] = useState<boolean>(false);
  const [urlPreviewSrc, setUrlPreviewSrc] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // File Upload State
  const [uploadedFileSrc, setUploadedFileSrc] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedDimensions, setUploadedDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoomed SVG Preview Modal
  const [previewGraphic, setPreviewGraphic] = useState<EducationalGraphic | null>(null);

  // Filtered curated graphics
  const filteredGraphics = useMemo(() => {
    return EDUCATIONAL_GRAPHICS.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;

      const q = (searchQuery || '').toLowerCase().trim();
      const inTitle = (item.title || '').toLowerCase().includes(q);
      const inDesc = (item.description || '').toLowerCase().includes(q);
      const inTags = Array.isArray(item.tags) && item.tags.some(tag => (tag || '').toLowerCase().includes(q));
      return inTitle || inDesc || inTags;
    });
  }, [selectedCategory, searchQuery]);

  // Filtered Web diagrams
  const filteredWebDiagrams = useMemo(() => {
    if (!searchQuery.trim()) return CURATED_WEB_DIAGRAMS;
    const q = (searchQuery || '').toLowerCase().trim();
    return CURATED_WEB_DIAGRAMS.filter(item => 
      (item.title || '').toLowerCase().includes(q) || 
      (item.subject || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  // Calculate target dimensions based on preset
  const getScaledDimensions = (origW: number, origH: number) => {
    let baseWidth = 500;
    if (sizePreset === 'small') baseWidth = 320;
    if (sizePreset === 'large') baseWidth = 720;

    const scale = baseWidth / origW;
    return {
      width: Math.round(origW * scale),
      height: Math.round(origH * scale)
    };
  };

  // Handler for inserting a curated SVG graphic
  const handleInsertGraphic = (graphic: EducationalGraphic) => {
    const dataUrl = svgToDataUrl(graphic.svg);
    const dims = getScaledDimensions(graphic.width, graphic.height);

    onInsertImage({
      src: dataUrl,
      title: graphic.title,
      width: dims.width,
      height: dims.height,
      insertAsBackground
    });
    onClose();
  };

  // Handler for validating & previewing custom URL
  const handleValidateUrl = (url: string) => {
    setCustomUrl(url);
    setUrlError(null);
    if (!url.trim()) {
      setUrlPreviewSrc(null);
      return;
    }

    setIsUrlValidating(true);
    const img = new Image();
    img.onload = () => {
      setIsUrlValidating(false);
      setUrlPreviewSrc(url);
      setUrlError(null);
    };
    img.onerror = () => {
      setIsUrlValidating(false);
      setUrlPreviewSrc(null);
      setUrlError('تعذر تحميل الصورة من هذا الرابط. يرجى التأكد من صحة الرابط وسماحه بالعرض.');
    };
    img.src = url;
  };

  // Handler for inserting custom URL image
  const handleInsertUrl = () => {
    if (!urlPreviewSrc) return;
    const img = new Image();
    img.onload = () => {
      const dims = getScaledDimensions(img.width || 600, img.height || 400);
      onInsertImage({
        src: urlPreviewSrc,
        title: 'صورة من رابط إلكتروني',
        width: dims.width,
        height: dims.height,
        insertAsBackground
      });
      onClose();
    };
    img.src = urlPreviewSrc;
  };

  // Handler for inserting web curated image
  const handleInsertWebImage = (item: WebEducationalResult) => {
    const dims = getScaledDimensions(item.width, item.height);
    onInsertImage({
      src: item.url,
      title: item.title,
      width: dims.width,
      height: dims.height,
      insertAsBackground
    });
    onClose();
  };

  // Handler for file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        setUploadedDimensions({ width: img.width, height: img.height });
        setUploadedFileSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Handler for inserting uploaded file
  const handleInsertUploaded = () => {
    if (!uploadedFileSrc || !uploadedDimensions) return;
    const dims = getScaledDimensions(uploadedDimensions.width, uploadedDimensions.height);

    onInsertImage({
      src: uploadedFileSrc,
      title: uploadedFileName || 'صورة مرفوعة من الجهاز',
      width: dims.width,
      height: dims.height,
      insertAsBackground
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ImageIcon className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>مكتبة الصور والرسومات التعليمية للسبورة</span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  دقة فائقة SVG
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                إدراج مخططات علمية، نماذج ثلاثية الأبعاد، وشارات تشجيعية للشرح البصري والتفاعلي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers size={15} />
              <span>مكتبة المخططات الجاهزة</span>
              <span className="px-1.5 py-0.2 bg-indigo-950/60 text-indigo-200 rounded-md text-[10px] font-mono">
                {EDUCATIONAL_GRAPHICS.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Search size={15} />
              <span>بحث وصور إلكترونية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LinkIcon size={15} />
              <span>رابط صورة مباشر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Upload size={15} />
              <span>رفع من جهازك</span>
            </button>
          </div>

          {/* Quick Search Bar inside Tabs */}
          {(activeTab === 'library' || activeTab === 'search') && (
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو المادة (فيثاغورس، قلب، ذرة)..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: CURATED EDUCATIONAL LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-5">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {EDUCATIONAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Graphics Grid */}
              {filteredGraphics.length === 0 ? (
                <div className="text-center py-16 space-y-3 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                  <div className="text-4xl">🔍</div>
                  <h4 className="text-sm font-bold text-slate-300">لم يتم العثور على رسومات تطابق بحثك</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    جرب البحث بكلمات أخرى مثل "مثلث"، "دائرة"، "خلية"، "مغناطيس"، أو تصفح الأقسام مباشرة.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    عرض جميع الرسومات
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredGraphics.map(graphic => (
                    <div
                      key={graphic.id}
                      className="group bg-slate-950/70 border border-slate-800 hover:border-indigo-500/80 rounded-2xl p-3 flex flex-col justify-between gap-3 transition-all hover:shadow-xl hover:shadow-indigo-500/10"
                    >
                      {/* Live SVG Preview Box */}
                      <div 
                        className="relative w-full aspect-4/3 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-800/80 group-hover:border-slate-700"
                      >
                        <div 
                          className="w-full h-full flex items-center justify-center pointer-events-none select-none"
                          dangerouslySetInnerHTML={{ __html: graphic.svg }}
                        />

                        {/* Hover Overlay with Quick Actions */}
                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => handleInsertGraphic(graphic)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                          >
                            <Sparkles size={14} className="text-amber-300" />
                            <span>إدراج على السبورة فوراً</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewGraphic(graphic)}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                          >
                            <ZoomIn size={14} />
                            <span>معاينة مكبرة</span>
                          </button>
                        </div>
                      </div>

                      {/* Info & Title */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/40">
                            {graphic.categoryLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {graphic.width} × {graphic.height}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {graphic.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {graphic.description}
                        </p>
                      </div>

                      {/* Direct Insert Button */}
                      <button
                        type="button"
                        onClick={() => handleInsertGraphic(graphic)}
                        className="w-full py-1.5 bg-slate-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/60"
                      >
                        <span>إدراج</span>
                        <Check size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEB & CURATED EDUCATIONAL SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-5">
              {/* Quick Search Keyword Chips */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold">كلمات بحث مقترحة ومفتاحية:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'الجدول الدوري',
                    'الدماغ البشري',
                    'خريطة العالم',
                    'رصد الفضاء',
                    'أدوات الهندسة',
                    'المجهر الضوئي'
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearchQuery(tag)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600/40 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Web Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredWebDiagrams.map(item => (
                  <div
                    key={item.id}
                    className="group bg-slate-950/70 border border-slate-800 hover:border-indigo-500 rounded-2xl p-3 flex flex-col justify-between gap-3 transition-all hover:shadow-xl"
                  >
                    <div className="relative aspect-4/3 bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <button
                          type="button"
                          onClick={() => handleInsertWebImage(item)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          <span>إدراج على السبورة</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                          {item.subject}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{item.width} × {item.height}</span>
                      </div>
                      <h4 className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertWebImage(item)}
                      className="w-full py-1.5 bg-slate-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/60"
                    >
                      <span>إدراج الصورة</span>
                      <Check size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT IMAGE URL */}
          {activeTab === 'url' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-300">
                  أدخل رابط الصورة الإلكتروني المباشر (URL):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => handleValidateUrl(e.target.value)}
                      placeholder="https://example.com/images/diagram.png"
                      className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  يدعم الروابط المباشرة لصور PNG, JPG, WebP, SVG من مختلف المصادر التعليمية والمواقع.
                </p>
              </div>

              {/* Validation Status & Preview */}
              {isUrlValidating && (
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-center gap-2 text-xs text-indigo-300 animate-pulse">
                  <span>جاري التحقق من الرابط وتحميل المعاينة...</span>
                </div>
              )}

              {urlError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-2xl text-xs">
                  {urlError}
                </div>
              )}

              {urlPreviewSrc && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check size={16} />
                      <span>تم التحقق من الصورة بنجاح</span>
                    </span>
                  </div>

                  <div className="max-h-72 flex items-center justify-center bg-slate-900/80 rounded-xl overflow-hidden p-2 border border-slate-800">
                    <img
                      src={urlPreviewSrc}
                      alt="معاينة الرابط"
                      className="max-h-64 max-w-full object-contain rounded-lg shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleInsertUrl}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Sparkles size={16} className="text-amber-300" />
                    <span>إدراج الصورة الآن على السبورة</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: UPLOAD FROM DEVICE */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag & Drop Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInputRef.current.files = dt.files;
                    handleFileChange({ target: fileInputRef.current } as any);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-indigo-950/10 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer space-y-3 group"
              >
                <div className="w-16 h-16 rounded-3xl bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto transition-colors">
                  <Upload size={30} />
                </div>
                <h4 className="text-sm font-black text-white">انقر لاختيار صورة من جهازك أو اسحبها وأفلتها هنا</h4>
                <p className="text-xs text-slate-400">
                  ندعم صور المخططات والمسائل الرياضية بصيغ (PNG, JPG, JPEG, SVG, WebP) بدقة عالية
                </p>
              </div>

              {/* Uploaded Preview */}
              {uploadedFileSrc && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">{uploadedFileName}</h5>
                      {uploadedDimensions && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          الأبعاد: {uploadedDimensions.width} × {uploadedDimensions.height} px
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileSrc(null);
                        setUploadedFileName('');
                        setUploadedDimensions(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      إلغاء وتغيير
                    </button>
                  </div>

                  <div className="max-h-72 flex items-center justify-center bg-slate-900/80 rounded-xl overflow-hidden p-2 border border-slate-800">
                    <img
                      src={uploadedFileSrc}
                      alt="معاينة الملف المرفوع"
                      className="max-h-64 max-w-full object-contain rounded-lg shadow-md"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleInsertUploaded}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Sparkles size={16} className="text-amber-300" />
                    <span>إدراج الصورة المختارة على السبورة</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Insertion Controls & Options */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Insertion Mode Option */}
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInsertAsBackground(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !insertAsBackground 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="إدراج كعنصر حر يمكن تحريكه، تكبيره، والرسم فوقه"
              >
                عنصر تفاعلي حر 📌
              </button>
              <button
                type="button"
                onClick={() => setInsertAsBackground(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  insertAsBackground 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="تثبيت الصورة كخلفية لصفحة الشرح والرسم فوقها"
              >
                خلفية كاملة للصفحة 🖼️
              </button>
            </div>

            {/* Size Preset Option */}
            {!insertAsBackground && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>الحجم الأولي:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSizePreset('small')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      sizePreset === 'small' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    صغير (320px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizePreset('medium')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      sizePreset === 'medium' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    متوسط (500px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizePreset('large')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      sizePreset === 'large' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    كبير (720px)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Zoomed Preview Lightbox Dialog */}
      {previewGraphic && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-3xl shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-black text-amber-300">{previewGraphic.title}</h4>
                <p className="text-xs text-slate-400">{previewGraphic.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewGraphic(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full max-h-[50vh] bg-slate-950 rounded-2xl p-4 flex items-center justify-center overflow-hidden border border-slate-800">
              <div 
                className="w-full h-full max-h-96 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: previewGraphic.svg }}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">الكلمات المفتاحية:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {previewGraphic.tags.slice(0, 4).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewGraphic(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInsertGraphic(previewGraphic);
                    setPreviewGraphic(null);
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>إدراج على السبورة الآن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
