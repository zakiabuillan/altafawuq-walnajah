import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  Upload, 
  Globe, 
  FileText, 
  ExternalLink, 
  X, 
  Loader2, 
  Tag, 
  CheckCircle2, 
  FolderOpen, 
  ArrowLeftRight, 
  Copy, 
  Filter, 
  Calendar,
  Layers,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  FlaskConical,
  Sparkles,
  Download,
  Presentation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import AICurriculumGenerator from './AICurriculumGenerator';
import JSZip from 'jszip';
import mammoth from 'mammoth';

interface EducationalResource {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: 'pdf' | 'docx' | 'pptx' | 'link' | 'text';
  url?: string;
  content: string;
  tags: string[];
  createdAt: string;
  creatorName?: string;
  courseId?: string;
  academicLevel?: string;
  fileName?: string;
  fileData?: string;
  slidesCount?: number;
  wordCount?: number;
}

const ACADEMIC_LEVELS = [
  'عام / مشترك',
  'مبتدئ (تأسيسي)',
  'متوسط',
  'متقدم',
  'بجروت (3 وحدات)',
  'بجروت (4 وحدات)',
  'بجروت (5 وحدات)',
  'أكاديمي / جامعي'
];

const POPULAR_TAGS = [
  'رياضيات', 'بجروت', 'نحو', 'كيمياء', 'فيزياء', 
  'لغة عربية', 'لغة عبرية', 'لغة إنجليزية', 'مدنيات', 
  'تاريخ', 'بيولوجيا', 'تفاضل وتكامل', 'تمثيل لويس', 'قواعد'
];

const GRADES = [
  'الصف السابع',
  'الصف الثامن',
  'الصف التاسع',
  'الصف العاشر',
  'الصف الحادي عشر',
  'الصف الثاني عشر (بجروت)',
  'تحضيري للجامعة'
];

const SUBJECTS = [
  'الرياضيات',
  'الفيزياء',
  'الكيمياء',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'اللغة العبرية',
  'المدنيات',
  'التاريخ',
  'البيولوجيا',
  'علوم عامة',
  'أخرى'
];

const SUBJECT_EMOJIS: Record<string, string> = {
  'الرياضيات': '📐',
  'الفيزياء': '🧲',
  'الكيمياء': '🧪',
  'اللغة العربية': '📝',
  'اللغة الإنجليزية': '🔤',
  'اللغة العبرية': '🗣️',
  'المدنيات': '⚖️',
  'التاريخ': '📜',
  'البيولوجيا': '🧬',
  'علوم عامة': '🔬',
  'أخرى': '🧩'
};

const GRADE_EMOJIS: Record<string, string> = {
  'الصف السابع': '🌱',
  'الصف الثامن': '🌿',
  'الصف التاسع': '🍀',
  'الصف العاشر': '🎓',
  'الصف الحادي عشر': '🏫',
  'الصف الثاني عشر (بجروت)': '🏆',
  'تحضيري للجامعة': '🚀'
};

export default function EducationalLibrary() {
  const [resources, setResources] = useState<EducationalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'resources' | 'curriculum'>('resources');

  const currentUserRole = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('academy_user_role') || 'guest';
    }
    return 'guest';
  }, []);

  const currentUserName = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('academy_user_name') || 'معلم مجهول';
    }
    return 'معلم مجهول';
  }, []);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'pdf' | 'docx' | 'pptx' | 'link' | 'text'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedAcademicLevel, setSelectedAcademicLevel] = useState<string>('all');
  const [selectedFiltersTags, setSelectedFiltersTags] = useState<string[]>([]);

  // Advanced Search variables
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPresetDate, setFilterPresetDate] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [filterTagsMode, setFilterTagsMode] = useState<'all' | 'any'>('all');

  // Add Resource Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState<'pdf' | 'docx' | 'pptx' | 'link' | 'text'>('pdf');
  const [resourceSubject, setResourceSubject] = useState('الرياضيات');
  const [resourceGrade, setResourceGrade] = useState('الصف العاشر');
  const [resourceCourseId, setResourceCourseId] = useState<string>('none');
  const [resourceAcademicLevel, setResourceAcademicLevel] = useState<string>('عام / مشترك');
  const [resourceContent, setResourceContent] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceTags, setResourceTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [resourceFileName, setResourceFileName] = useState('');
  const [resourceFileData, setResourceFileData] = useState('');
  const [resourceSlidesCount, setResourceSlidesCount] = useState<number | undefined>(undefined);
  const [resourceWordCount, setResourceWordCount] = useState<number | undefined>(undefined);

  // Upload/Parsing State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileParsingLoading, setFileParsingLoading] = useState(false);
  const [fileParsingError, setFileParsingError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractionMode, setExtractionMode] = useState<'raw' | 'semantic' | 'summary'>('semantic');

  // Detail View State
  const [selectedResource, setSelectedResource] = useState<EducationalResource | null>(null);

  // Smart Previews State
  const [previewResource, setPreviewResource] = useState<EducationalResource | null>(null);
  const [previewSearchText, setPreviewSearchText] = useState('');
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const [previewViewMode, setPreviewViewMode] = useState<'full' | 'pages'>('pages');

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to resources in real-time
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'educational_resources');
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: EducationalResource[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EducationalResource);
      });
      // Sort by creation date descending
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setResources(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to educational resources:", error);
      handleFirestoreError(error, OperationType.LIST, 'educational_resources');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to group courses in real-time
  useEffect(() => {
    const colRef = collection(db, 'groupCourses');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCourses(list);
    }, (error) => {
      console.error("Error subscribing to group courses in library:", error);
    });

    return () => unsubscribe();
  }, []);

  // Memoized counts of items per subject and grade for instant status overview
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(res => {
      if (res.subject) {
        counts[res.subject] = (counts[res.subject] || 0) + 1;
      }
    });
    return counts;
  }, [resources]);

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(res => {
      if (res.grade) {
        counts[res.grade] = (counts[res.grade] || 0) + 1;
      }
    });
    return counts;
  }, [resources]);

  // PDF.js Client-Side Extraction Engine
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const existingLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
      if (existingLib) {
        resolve(existingLib);
        return;
      }

      const cdns = [
        {
          script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
          worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        },
        {
          script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
          worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js'
        },
        {
          script: 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js',
          worker: 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js'
        }
      ];

      let currentCdnIndex = 0;

      const tryLoad = () => {
        if (currentCdnIndex >= cdns.length) {
          reject(new Error('فشل تحميل محرك نصوص PDF البديل من جميع المصادر الاحتياطية. يرجى مراجعة الاتصال بالإنترنت وصلاحية روابط CDN.'));
          return;
        }

        const cdn = cdns[currentCdnIndex];
        const script = document.createElement('script');
        script.src = cdn.script;
        
        script.onload = () => {
          const pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = cdn.worker;
            resolve(pdfjsLib);
          } else {
            // Try next CDN
            currentCdnIndex++;
            tryLoad();
          }
        };

        script.onerror = () => {
          currentCdnIndex++;
          tryLoad();
        };

        document.head.appendChild(script);
      };

      tryLoad();
    });
  };

  const handleFileUpload = async (file: File) => {
    setFileParsingError(null);
    setFileParsingLoading(true);
    setUploadedFileName(file.name);
    setResourceFileName(file.name);

    try {
      // 1. Word Document (.docx)
      if (file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml')) {
        setResourceType('docx');
        if (!resourceTitle.trim()) {
          setResourceTitle(file.name.replace(/\.docx$/i, ''));
        }

        const arrayBuffer = await file.arrayBuffer();

        // 1a. Try mammoth first for high quality text extraction
        let extractedRawText = '';
        try {
          const mammothResult = await mammoth.extractRawText({ arrayBuffer });
          extractedRawText = (mammothResult.value || '').trim();
        } catch (mErr) {
          console.warn("Mammoth extraction notice, attempting JSZip XML fallback:", mErr);
        }

        // 1b. Fallback to JSZip XML parsing if mammoth was empty or threw
        if (!extractedRawText) {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXmlFile = zip.file('word/document.xml');
          if (docXmlFile) {
            const xmlStr = await docXmlFile.async('text');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
            const pElements = xmlDoc.getElementsByTagName('w:p');
            const paragraphsList: string[] = [];
            for (let i = 0; i < pElements.length; i++) {
              const tElements = pElements[i].getElementsByTagName('w:t');
              let pText = '';
              for (let j = 0; j < tElements.length; j++) {
                pText += tElements[j].textContent || '';
              }
              if (pText.trim()) {
                paragraphsList.push(pText.trim());
              }
            }
            extractedRawText = paragraphsList.join('\n\n');
          }
        }

        if (!extractedRawText) {
          throw new Error('تعذر العثور على نصوص قابلة للقراءة داخل ملف Word (DOCX). يرجى التأكد من أن المستند غير تالف ويحتوي على محتوى نصي.');
        }

        const paragraphs = extractedRawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const words = extractedRawText.split(/\s+/).filter(Boolean);
        setResourceWordCount(words.length);

        let processedText = '';
        if (extractionMode === 'semantic') {
          processedText += `===============================================\n📘 مستند Word مفهرس ذكياً (DOCX Educational Document)\nاسم الملف: ${file.name}\nالمادة والمستوى: ${resourceSubject} / ${resourceGrade}\nإجمالي الكلمات: ${words.length} كلمة | عدد الفقرات: ${paragraphs.length}\n===============================================\n\n`;
          
          let pageNum = 1;
          let currentChunk = '';
          paragraphs.forEach((p, idx) => {
            currentChunk += p + '\n\n';
            if (currentChunk.length > 700 || idx === paragraphs.length - 1) {
              processedText += `--- [ صفحة ${pageNum} ] ---\n${currentChunk.trim()}\n\n`;
              currentChunk = '';
              pageNum++;
            }
          });
        } else if (extractionMode === 'summary') {
          processedText += `=== ملخص ورصد محاور مستند Word: ${file.name} (${words.length} كلمة) ===\n\n`;
          paragraphs.slice(0, 15).forEach((p, idx) => {
            if (p.length > 15) {
              processedText += `• محور ${idx + 1}: ${p.slice(0, 180)}...\n`;
            }
          });
        } else {
          processedText = extractedRawText;
        }

        setResourceContent(processedText);

        // Store file data for direct downloading if <= 850KB
        if (file.size <= 850000) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setResourceFileData(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }

        triggerToast("📘 تم استخراج نصوص مستند Word (DOCX) وتنسيقها بنجاح!");

      // 2. PowerPoint Presentation (.pptx)
      } else if (file.name.toLowerCase().endsWith('.pptx') || file.type.includes('presentationml')) {
        setResourceType('pptx');
        if (!resourceTitle.trim()) {
          setResourceTitle(file.name.replace(/\.pptx$/i, ''));
        }

        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Collect all slide entries: ppt/slides/slide{N}.xml
        const slideEntries: { name: string; num: number; file: any }[] = [];
        zip.forEach((relativePath, zipEntry) => {
          const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
          if (match) {
            slideEntries.push({
              name: relativePath,
              num: parseInt(match[1], 10),
              file: zipEntry
            });
          }
        });

        // Natural sort by slide number
        slideEntries.sort((a, b) => a.num - b.num);

        if (slideEntries.length === 0) {
          throw new Error('لم يتم العثور على شرائح عرض داخل ملف PowerPoint (PPTX). يرجى التأكد من سلامة الملف.');
        }

        const totalSlides = slideEntries.length;
        setResourceSlidesCount(totalSlides);

        let processedText = '';
        if (extractionMode === 'semantic') {
          processedText += `===============================================\n📊 عرض تقديمي مفهرس ذكياً (PowerPoint PPTX Presentation)\nاسم العرض: ${file.name}\nالمادة والمستوى: ${resourceSubject} / ${resourceGrade}\nإجمالي الشرائح المستخلصة: ${totalSlides} شريحة\n===============================================\n\n`;
        } else if (extractionMode === 'summary') {
          processedText += `=== ملخص شرائح العرض التقديمي (PowerPoint): ${file.name} (${totalSlides} شريحة) ===\n\n`;
        }

        let fullRawText = '';
        const parser = new DOMParser();

        for (let i = 0; i < slideEntries.length; i++) {
          const slide = slideEntries[i];
          const xmlText = await slide.file.async('text');
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const pElements = xmlDoc.getElementsByTagName('a:p');

          const slideLines: string[] = [];
          for (let pIdx = 0; pIdx < pElements.length; pIdx++) {
            const tElements = pElements[pIdx].getElementsByTagName('a:t');
            let pText = '';
            for (let tIdx = 0; tIdx < tElements.length; tIdx++) {
              pText += tElements[tIdx].textContent || '';
            }
            if (pText.trim()) {
              slideLines.push(pText.trim());
            }
          }

          const slideContent = slideLines.join('\n');
          fullRawText += `[الشريحة ${i + 1}]\n` + (slideContent || '(شريحة بصرية / رسم توضيحي)') + '\n\n';

          if (extractionMode === 'semantic') {
            processedText += `--- [ الشريحة ${i + 1} ] ---\n${slideContent || '(شريحة بصرية / رسم توضيحي)'}\n\n`;
          } else if (extractionMode === 'summary') {
            const titleLine = slideLines[0] || 'شريحة بدون عنوان نصي';
            processedText += `• الشريحة ${i + 1}: ${titleLine}\n`;
            if (slideLines.length > 1) {
              processedText += `  - العناصر: ${slideLines.slice(1, 4).join(' | ')}\n`;
            }
          }
        }

        if (extractionMode === 'raw') {
          processedText = fullRawText;
        }

        setResourceContent(processedText);

        // Store file data for direct downloading if <= 850KB
        if (file.size <= 850000) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setResourceFileData(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }

        triggerToast(`📊 تم استخراج جميع شرائح الباوربوينت (${totalSlides} شريحة) بنجاح!`);

      // 3. PDF Document (.pdf)
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setResourceType('pdf');
        if (!resourceTitle.trim()) {
          setResourceTitle(file.name.replace(/\.pdf$/i, ''));
        }

        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let processedText = '';
        const pageLimit = Math.min(pdf.numPages, 15);
        
        if (extractionMode === 'semantic') {
          processedText += `===============================================\n🔍 ملف مرجعي مفهرس ذكياً (Semantic AI Indexing)\nاسم المرجع: ${file.name}\nالمادة والمستوى: ${resourceSubject} / ${resourceGrade}\nعدد الصفحات المستخلصة: ${pageLimit} من أصل ${pdf.numPages}\n===============================================\n\n`;
        } else if (extractionMode === 'summary') {
          processedText += `=== ملخص مكثف واستخلاص مؤشرات الأسئلة من مستند: ${file.name} ===\n\n`;
        }

        let fullRawText = '';
        for (let i = 1; i <= pageLimit; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullRawText += pageText + '\n';
          
          if (extractionMode === 'semantic') {
            processedText += `--- [ صفحة ${i} ] ---\n${pageText.trim()}\n\n`;
          } else if (extractionMode === 'summary') {
            const lines = pageText.split(/[.?!؛:]+/);
            const keyPoints = lines
              .map(l => l.trim())
              .filter(l => l.length > 12)
              .slice(0, 10);
            processedText += `* نقاط رئيسية من الصفحة (${i}):\n` + keyPoints.map(kp => `  • ${kp}`).join('\n') + '\n\n';
          }
        }
        
        if (extractionMode === 'raw') {
          processedText = fullRawText;
        }

        if (pdf.numPages > 15) {
          processedText += `\n[تنبيه نظام المعارف: تم اقتطاع الصفحات الزائدة عن الحد المسموح للأمن وسرعة المحاذاة]`;
        }

        if (!fullRawText.trim()) {
          throw new Error('الملف قد يكون ممسوحاً كصورة (Scanned Pdf). تعذر العثور على قيم نصية بداخله. يرجى إدراجه كنص مباشر أو استخدام PDF مقروء.');
        }
        
        setResourceContent(processedText);

        // Store file data if <= 850KB
        if (file.size <= 850000) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setResourceFileData(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }

        triggerToast("📄 تم استيراد نصوص الـ PDF ونمذجتها آلياً بنوع الفهرسة المعين!");

      // 4. Text document (.txt)
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        setResourceType('text');
        if (!resourceTitle.trim()) {
          setResourceTitle(file.name.replace(/\.txt$/i, ''));
        }
        const text = await file.text();
        setResourceContent(text);
        triggerToast("📄 تم تحميل الملف النصي بنجاح!");
      } else {
        throw new Error('صيغة المرفق غير مدعومة. يرجى رفع ملف بصيغة PDF أو مستند Word (DOCX) أو عرض PowerPoint (PPTX) أو ملف نصي TXT.');
      }
    } catch (err: any) {
      console.error("Document Parsing error inside Administrative Library:", err);
      setFileParsingError(err.message || 'فشل تحميل وطباعة نصوص الملف المرفوع.');
      setUploadedFileName('');
    } finally {
      setFileParsingLoading(false);
    }
  };

  // Submit Action
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim()) {
      alert("الرجاء إدخال عنوان للمرجع والمادة التعليمية.");
      return;
    }

    if (resourceType === 'link' && !resourceUrl.trim()) {
      alert("الرجاء إدخال عنوان الرابط الإلكتروني.");
      return;
    }

    setFileParsingLoading(true);
    try {
      const payload: any = {
        title: resourceTitle.trim(),
        subject: resourceSubject,
        grade: resourceGrade,
        type: resourceType,
        url: resourceType === 'link' ? resourceUrl.trim() : '',
        content: resourceContent.trim() || (resourceType === 'link' ? `مرجع إلكتروني خارجي: ${resourceUrl}` : ''),
        tags: resourceTags,
        createdAt: new Date().toISOString(),
        creatorName: currentUserName,
        courseId: resourceCourseId !== 'none' ? resourceCourseId : '',
        academicLevel: resourceAcademicLevel,
        fileName: resourceFileName || uploadedFileName || '',
        fileData: resourceFileData || '',
        slidesCount: resourceSlidesCount || null,
        wordCount: resourceWordCount || null
      };

      await addDoc(collection(db, 'educational_resources'), payload);

      // Log activity
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'ADD_RESOURCE',
          actionName: 'إضافة مادة دراسية للمكتبة',
          actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
          details: `تم إضافة مرجع تعليمي جديد (${resourceType.toUpperCase()}) بعنوان "${resourceTitle.trim()}" وتصنيفه بمستوى "${resourceAcademicLevel}" ${resourceCourseId !== 'none' ? 'وربطه بدورة.' : ''}`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }
      
      // Reset State
      setResourceTitle('');
      setResourceContent('');
      setResourceUrl('');
      setResourceTags([]);
      setResourceCourseId('none');
      setResourceAcademicLevel('عام / مشترك');
      setUploadedFileName('');
      setResourceFileName('');
      setResourceFileData('');
      setResourceSlidesCount(undefined);
      setResourceWordCount(undefined);
      setShowAddModal(false);
      
      triggerToast("💾 تم تسجيل وإدراج المرجع في المكتبة بنجاح، ومشاركته مع الطاقم التدريسي!");
    } catch (err: any) {
      console.error("Error creating library resource:", err);
      handleFirestoreError(err, OperationType.CREATE, 'educational_resources');
      alert(`عذراً، فشل الإدراج: ${err.message}`);
    } finally {
      setFileParsingLoading(false);
    }
  };

  // Delete Action
  const handleDeleteResource = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المادة الدراسية "${name}" من المكتبة التعليمية كلياً؟`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'educational_resources', id));

      // Log activity
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'DELETE_RESOURCE',
          actionName: 'حذف مادة دراسية من المكتبة',
          actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
          details: `تم حذف المرجع التعليمي "${name}" من المكتبة الدراسية.`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }

      triggerToast("🗑️ تم حذف المرجع من المكتبة التعليمية بنجاح.");
    } catch (err: any) {
      console.error("Error deleting resource:", err);
      handleFirestoreError(err, OperationType.DELETE, `educational_resources/${id}`);
      alert("فشل إجراء الحذف من قاعدة البيانات.");
    }
  };

  // Toggle filtering tags
  const handleToggleFilterTag = (tag: string) => {
    if (selectedFiltersTags.includes(tag)) {
      setSelectedFiltersTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedFiltersTags(prev => [...prev, tag]);
    }
  };

  // Add custom tag to form
  const handleAddCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (!resourceTags.includes(tag)) {
      setResourceTags(prev => [...prev, tag]);
    }
    setCustomTagInput('');
  };

  const handleToggleFormTag = (tag: string) => {
    if (resourceTags.includes(tag)) {
      setResourceTags(prev => prev.filter(t => t !== tag));
    } else {
      setResourceTags(prev => [...prev, tag]);
    }
  };

  // Filter computation
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // 1. Types check
      if (selectedType !== 'all' && res.type !== selectedType) return false;
      
      // 2. Subjects check
      if (selectedSubject !== 'all' && res.subject !== selectedSubject) return false;
      
      // 3. Grades check
      if (selectedGrade !== 'all' && res.grade !== selectedGrade) return false;

      // 3b. Course check
      if (selectedCourseId !== 'all' && res.courseId !== selectedCourseId) return false;

      // 3c. Academic level check
      if (selectedAcademicLevel !== 'all' && res.academicLevel !== selectedAcademicLevel) return false;
      
      // 4. Tags check with advanced mode
      if (selectedFiltersTags.length > 0) {
        if (!res.tags || res.tags.length === 0) return false;
        if (filterTagsMode === 'all') {
          const hasAllSelected = selectedFiltersTags.every(t => res.tags.includes(t));
          if (!hasAllSelected) return false;
        } else {
          const hasAnySelected = selectedFiltersTags.some(t => res.tags.includes(t));
          if (!hasAnySelected) return false;
        }
      }

      // 5. Date filtering
      if (filterPresetDate !== 'all') {
        if (!res.createdAt) return false;
        const createdAtTime = new Date(res.createdAt).getTime();
        const now = new Date();
        
        if (filterPresetDate === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (createdAtTime < todayStart) return false;
        } else if (filterPresetDate === 'week') {
          const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (createdAtTime < weekAgo) return false;
        } else if (filterPresetDate === 'month') {
          const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (createdAtTime < monthAgo) return false;
        } else if (filterPresetDate === 'custom') {
          if (filterStartDate) {
            const startLimit = new Date(filterStartDate).getTime();
            if (createdAtTime < startLimit) return false;
          }
          if (filterEndDate) {
            const endLimit = new Date(filterEndDate).getTime() + 24 * 60 * 60 * 1000 - 1;
            if (createdAtTime > endLimit) return false;
          }
        }
      }

      // 6. Query matching (Instant Search)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = res.title?.toLowerCase().includes(query);
        const matchesContent = res.content?.toLowerCase().includes(query);
        const matchesFileName = res.fileName?.toLowerCase().includes(query);
        const matchesTags = res.tags?.some(t => t.toLowerCase().includes(query));
        const matchesSubject = res.subject?.toLowerCase().includes(query);
        const matchesGrade = res.grade?.toLowerCase().includes(query);
        const matchesAcademicLevel = res.academicLevel?.toLowerCase().includes(query);
        return matchesTitle || matchesContent || matchesUrl || matchesFileName || matchesTags || matchesSubject || matchesGrade || matchesAcademicLevel;
      }

      return true;
    });
  }, [
    resources, 
    searchQuery, 
    selectedType, 
    selectedSubject, 
    selectedGrade, 
    selectedCourseId,
    selectedAcademicLevel,
    selectedFiltersTags, 
    filterPresetDate, 
    filterStartDate, 
    filterEndDate, 
    filterTagsMode
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("📋 تم نسخ المحتوى التعليمي لحافظة جهازك!");
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Dynamic Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-5 bg-slate-900 border border-amber-500/40 text-amber-300 px-5 py-3 rounded-2xl shadow-xl z-[200] text-xs font-black flex items-center gap-2"
          >
            <CheckCircle2 className="text-amber-500 shrink-0" size={16} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner Section */}
      <div className="bg-slate-850/70 border border-slate-750 p-6 rounded-3xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute left-10 bottom-0 w-32 h-32 bg-[#D4A33C]/10 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2.5">
              <FolderOpen className="text-amber-500 animate-pulse" size={24} />
              <span>المكتبة التعليمية للأكاديمية 📚</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold leading-relaxed mt-1.5 max-w-2xl">
              بوابة مركزية لإيداع وفهرسة الملفات المرجعية وتوليد المناهج وتصنيف نواتج ومخرجات التعلم وفق هرم بلوم المعرفي اعتماداً على مرجع VEB Chemistry (https://www.vebschoolchemistry.com/).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveLibraryTab(activeLibraryTab === 'curriculum' ? 'resources' : 'curriculum')}
              className={`px-4 py-3 rounded-2xl font-black text-xs cursor-pointer flex items-center gap-2 transition-all shadow-md ${
                activeLibraryTab === 'curriculum'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
              }`}
            >
              <FlaskConical size={16} />
              <span>{activeLibraryTab === 'curriculum' ? 'الرجوع للمكتبة والملفات 📁' : 'توليد المناهج والمخرجات (VEB) 🧪'}</span>
            </button>
            {activeLibraryTab === 'resources' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-3 bg-[#D4A33C] hover:bg-[#c39330] text-slate-950 font-black text-xs rounded-2xl cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/5 transition-all duration-300 pr-4 shrink-0"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>إضافة مرجع تعليمي جديد ➕</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-750/60 relative z-10">
          <button
            onClick={() => setActiveLibraryTab('resources')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeLibraryTab === 'resources'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderOpen size={14} />
            <span>المكتبة والملفات المرجعية ({resources.length})</span>
          </button>
          <button
            onClick={() => setActiveLibraryTab('curriculum')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeLibraryTab === 'curriculum'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles size={14} className="text-emerald-400" />
            <span>توليد المناهج وتصنيف المخرجات (VEB Chemistry) 🧪</span>
          </button>
        </div>
      </div>

      {activeLibraryTab === 'curriculum' ? (
        <div className="pt-2">
          <AICurriculumGenerator />
        </div>
      ) : (
        <>

      {/* Control Area (Search, Filter Type, Grades & Subjects) */}
      <div className="bg-slate-850/60 border border-slate-750 p-5 rounded-3xl space-y-4 shadow-sm">
        
        {/* Instant Search Quick-Filter Shortcuts */}
        <div className="space-y-3.5 bg-slate-900/40 p-4 rounded-2xl border border-slate-750/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-750/35">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-black text-slate-100">البحث الفوري والاختصارات الذكية (Instant Filter Shortcuts)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#D4A33C] font-extrabold bg-amber-500/10 px-2.5 py-0.5 rounded-lg">
              <span>المطابقات الحية المكتشفة</span>
              <span className="bg-[#D4A33C] text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[9px]">{filteredResources.length}</span>
            </div>
          </div>

          {/* 1. Subjects Quick-Filters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 block">البحث السريع والتنقل الفوري حسب المادة الدراسية:</span>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedSubject('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border flex items-center gap-1.5 ${
                  selectedSubject === 'all'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-black shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-900/60 border-slate-750 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🌐 كافة المواد</span>
              </button>
              {SUBJECTS.map(subj => {
                const count = subjectCounts[subj] || 0;
                const isSelected = selectedSubject === subj;
                const emoji = SUBJECT_EMOJIS[subj] || '📚';
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(isSelected ? 'all' : subj)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-[#D4A33C] font-black shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-750 text-slate-350 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{emoji} {subj}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Grades Quick-Filters */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-750/15">
            <span className="text-[10px] font-black text-slate-400 block">البحث السريع والتنقل الفوري حسب المرحلة والصف الدراسي:</span>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedGrade('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border flex items-center gap-1.5 ${
                  selectedGrade === 'all'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-black shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-900/60 border-slate-750 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🏫 كافة المراحل</span>
              </button>
              {GRADES.map(gr => {
                const count = gradeCounts[gr] || 0;
                const isSelected = selectedGrade === gr;
                const emoji = GRADE_EMOJIS[gr] || '🎓';
                return (
                  <button
                    key={gr}
                    type="button"
                    onClick={() => setSelectedGrade(isSelected ? 'all' : gr)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-[#D4A33C] font-black shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-750 text-slate-350 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{emoji} {gr}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Input, Actions & Broad Categorization Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Main search box */}
          <div className="lg:col-span-4 relative">
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="ابحث باسم المرجـع، الكـلمات الـمفاتيح، أو الوسـوم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold text-slate-200 pr-10 pl-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl focus:border-indigo-500/80 focus:bg-slate-900 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Advanced Search Button */}
          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`w-full h-full py-3 px-4 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                showAdvancedSearch 
                  ? 'bg-amber-500/20 border-amber-500/50 text-[#D4A33C]' 
                  : 'bg-slate-900 border-slate-700 text-slate-350 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Filter size={13} className={showAdvancedSearch ? 'animate-pulse text-[#D4A33C]' : ''} />
              <span>خيارات بحث متكاملة {showAdvancedSearch ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Type filters */}
          <div className="lg:col-span-6 flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-750 rounded-2xl">
            {[
              { id: 'all', label: 'كافة المصادر 📂', icon: BookOpen },
              { id: 'pdf', label: 'PDF 📄', icon: FileText },
              { id: 'docx', label: 'Word (DOCX) 📘', icon: FileText },
              { id: 'pptx', label: 'PowerPoint (PPTX) 📊', icon: Presentation },
              { id: 'link', label: 'روابط مواقع 🌐', icon: Globe },
              { id: 'text', label: 'نصوص وشروح 📝', icon: Layers }
            ].map((type) => {
              const IconComp = type.icon;
              const isActive = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  className={`flex-1 min-w-[100px] px-2 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    isActive 
                      ? 'bg-indigo-600 text-slate-100 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <IconComp size={12} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Collapsible Advanced Search Panel */}
        <AnimatePresence>
          {showAdvancedSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900/80 border border-slate-750 p-4 rounded-2xl space-y-4 text-right" dir="rtl">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <span className="text-xs font-black text-[#D4A33C]">⚙️ لوحة المعايير المتقدمة للبحث والفهرسة الدراسية</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Filters column */}
                  <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-black text-slate-350 block flex items-center gap-1">
                      <Calendar size={12} className="text-amber-500" />
                      <span>تحديد وتصفية تاريخ رفع المرجع:</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'all', label: 'كل التواريخ 🌐' },
                        { id: 'today', label: 'سجل اليوم 🟢' },
                        { id: 'week', label: 'هذا الأسبوع 📅' },
                        { id: 'month', label: 'هذا الشهر 🗓️' },
                        { id: 'custom', label: 'تحديد مخصص 📅' }
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setFilterPresetDate(item.id as any)}
                          className={`py-1.5 px-2 rounded-lg text-[9px] font-black transition-all border text-center cursor-pointer ${
                            filterPresetDate === item.id 
                              ? 'bg-indigo-600/35 border-indigo-500 text-indigo-200 font-bold' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {filterPresetDate === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 pt-1.5 animate-fadeIn">
                        <div>
                          <label className="text-[8.5px] font-black text-slate-500 block mb-1">من تاريخ الحفظ:</label>
                          <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full text-[10px] font-bold text-slate-200 px-2 py-1 bg-slate-900 border border-slate-755 rounded-md focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[8.5px] font-black text-slate-500 block mb-1">إلى تاريخ اليوم:</label>
                          <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full text-[10px] font-bold text-slate-200 px-2 py-1 bg-slate-900 border border-slate-755 rounded-md focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags Multi-matching logic column */}
                  <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-slate-350 block flex items-center gap-1">
                        <Tag size={12} className="text-amber-500" />
                        <span>منهجية ربط ومطابقة الوسوم (Tags):</span>
                      </span>
                      <p className="text-[8.5px] text-slate-450 leading-relaxed font-bold">
                        تسمح بتعريف نوع التقاطع في حال قمت باختيار أكثر من وسم لتصفية المرجعية المعتمدة من الوزارة.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFilterTagsMode('all')}
                        className={`py-2 px-3 rounded-xl text-[9px] font-black transition-all border flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
                          filterTagsMode === 'all'
                            ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>تقاطع صارم (AND) 🔒</span>
                        <span className="text-[7.5px] font-bold opacity-75">يجب أن يتطابق مع كافة الوسوم</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFilterTagsMode('any')}
                        className={`py-2 px-3 rounded-xl text-[9px] font-black transition-all border flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
                          filterTagsMode === 'any'
                            ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>اتحاد مرن (OR) 🔓</span>
                        <span className="text-[7.5px] font-bold opacity-75">يكفي تواجد أحد الوسوم المختارة</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-xl">
                  <span className="text-[8.5px] text-slate-550 font-bold">
                    * يتم معالجة وتصفية المراجع في الوقت الحقيقي وبنسب فلاتر مرنة تدعم سرعة الاستقصاء البصري.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPresetDate('all');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterTagsMode('all');
                      setSelectedFiltersTags([]);
                      setSelectedCourseId('all');
                      setSelectedAcademicLevel('all');
                      triggerToast("🧹 تم تصفية معايير البحث المتقدم والوسوم كلياً!");
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 font-black text-[9px] rounded-lg cursor-pointer transition-all"
                  >
                    تطهير وإعادة تعيين البحث المتقدم 🧹
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
 
        {/* Subjects & Grades breakdown filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-750/50">
          
          {/* Subect selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 block mb-1">المادة التعليمية</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs font-bold text-slate-200 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 bg-none cursor-pointer"
            >
              <option value="all">كافة المواد والمناهج (الكل)</option>
              {SUBJECTS.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
 
          {/* Grade selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 block mb-1">الفئة العمرية / الصف الدراسي</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full text-xs font-bold text-slate-200 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 bg-none cursor-pointer"
            >
              <option value="all">كافة المراحل والصفوف الدراسية</option>
              {GRADES.map(gr => (
                <option key={gr} value={gr}>{gr}</option>
              ))}
            </select>
          </div>

          {/* Course filter selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 block mb-1">الدورة الدراسية المرتبطة</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full text-xs font-bold text-slate-200 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 bg-none cursor-pointer"
            >
              <option value="all">كافة الدورات (الكل)</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
              ))}
            </select>
          </div>

          {/* Academic Level filter selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 block mb-1">المستوى الأكاديمي</label>
            <select
              value={selectedAcademicLevel}
              onChange={(e) => setSelectedAcademicLevel(e.target.value)}
              className="w-full text-xs font-bold text-slate-200 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 bg-none cursor-pointer"
            >
              <option value="all">كافة المستويات الأكاديمية</option>
              {ACADEMIC_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
 
          {/* Quick Active tags indicator */}
          <div className="space-y-1 md:col-span-2 lg:col-span-4">
            <label className="text-[10px] font-black text-slate-400 block mb-1">تصفية حسب الوسوم المنشطة</label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl min-h-[38px] max-h-[38px] overflow-y-auto">
              {selectedFiltersTags.length === 0 ? (
                <span className="text-[9px] text-slate-500 font-bold px-2">لم يتم تحديد وسوم تصفية حتى الآن</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedFiltersTags.map(tag => (
                    <span 
                      key={tag}
                      onClick={() => handleToggleFilterTag(tag)}
                      className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[9px] font-black cursor-pointer hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-1"
                    >
                      <span>#{tag}</span>
                      <span className="text-[8px]">✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
 
        </div>

        {/* POPULAR TAG BOX IN CONTROL AREA */}
        <div className="space-y-1.5 pt-2 border-t border-slate-750/30">
          <span className="text-[9px] font-black text-slate-450 block">انقر على الوسوم الشائعة للتصفية السريعة المتعددة:</span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TAGS.map(tag => {
              const isActive = selectedFiltersTags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleFilterTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-amber-500/25 text-[#D4A33C] border border-[#D4A33C]/40 font-black' 
                      : 'bg-slate-900 text-slate-400 border border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedFiltersTags.length > 0 && (
              <button
                onClick={() => setSelectedFiltersTags([])}
                className="px-2.5 py-1 bg-slate-800 text-slate-350 rounded-lg text-[9px] font-bold border border-slate-700 hover:text-white"
              >
                تصفية تامة للوسوم 🗑️
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Main Material display grid */}
      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-[#D4A33C]" size={36} />
          <span className="text-sm font-black text-slate-400">جاري تحميل مستودع المكتبة الرقمية...</span>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center bg-slate-850/30 border border-dashed border-slate-750 rounded-3xl p-16 space-y-4">
          <FolderOpen size={44} className="text-slate-500 mx-auto opacity-50" />
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-black text-slate-200">المستودع الرقمي خالٍ من المواد المفلترة</h3>
            <p className="text-slate-400 text-xs font-bold leading-relaxed">
              لم نجد أي مراجع تطابق خيارات التصفية المعينة. أضف مصادر إضافية (PDF أو روابط) للبدء في ملء المكتبة والمساعدة على خلق الأسئلة في الفصول التعليمية.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedType('all');
              setSelectedSubject('all');
              setSelectedGrade('all');
              setSelectedFiltersTags([]);
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-black cursor-pointer transition-all"
          >
            إعادة تعيين مرشحات البحث كلياً
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            return (
              <div 
                key={res.id}
                className="bg-slate-850/70 border border-slate-750 hover:border-slate-600 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm group relative overflow-hidden"
              >
                {/* Visual Glow Effect for active items */}
                <div className="absolute top-0 right-0 w-[40%] h-[2px] bg-gradient-to-l from-indigo-500/20 to-transparent"></div>
                
                {/* Card Title & Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2.5">
                    
                    {/* Source type badge */}
                    {res.type === 'pdf' && (
                      <span className="bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-xl px-2.5 py-1 text-[9px] font-black flex items-center gap-1.5 shrink-0">
                        <FileText size={11} />
                        <span>مستند PDF</span>
                      </span>
                    )}
                    {res.type === 'docx' && (
                      <span className="bg-blue-600/15 text-blue-300 border border-blue-500/35 rounded-xl px-2.5 py-1 text-[9px] font-black flex items-center gap-1.5 shrink-0">
                        <FileText size={11} />
                        <span>مستند Word (DOCX)</span>
                      </span>
                    )}
                    {res.type === 'pptx' && (
                      <span className="bg-orange-500/15 text-orange-300 border border-orange-500/35 rounded-xl px-2.5 py-1 text-[9px] font-black flex items-center gap-1.5 shrink-0">
                        <Presentation size={11} />
                        <span>عرض PowerPoint (PPTX)</span>
                      </span>
                    )}
                    {res.type === 'link' && (
                      <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-[9px] font-black flex items-center gap-1.5 shrink-0">
                        <Globe size={11} />
                        <span>رابط موقع</span>
                      </span>
                    )}
                    {res.type === 'text' && (
                      <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-xl px-2.5 py-1 text-[9px] font-black flex items-center gap-1.5 shrink-0">
                        <Layers size={11} />
                        <span>نص توجيهي</span>
                      </span>
                    )}

                    {/* Trash Delete for Admins */}
                    <button
                      onClick={() => handleDeleteResource(res.id, res.title)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-900 border border-slate-750 hover:bg-rose-900/60 hover:text-rose-200 rounded-lg text-slate-400 transition-all cursor-pointer"
                      title="حذف المصدر من المكتبة كلياً"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-white text-xs md:text-sm font-black leading-relaxed line-clamp-2">
                      {res.title}
                    </h4>
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] bg-slate-900 text-slate-350 border border-slate-755/60 font-black px-2 py-0.5 rounded-md">
                        {res.subject}
                      </span>
                      <span className="text-[9px] bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded-md">
                        {res.grade}
                      </span>
                      {res.createdAt && (
                        <span className="text-[8px] text-slate-450 font-black flex items-center gap-0.5 mr-auto">
                          <Calendar size={9} className="text-[#D4A33C]/80" />
                          <span>{new Date(res.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                        </span>
                      )}
                    </div>

                    {/* Slides and Words metadata */}
                    {(res.slidesCount || res.wordCount) && (
                      <div className="flex flex-wrap gap-1 items-center pt-0.5">
                        {res.slidesCount && (
                          <span className="text-[8.5px] bg-orange-500/10 text-orange-300 border border-orange-500/20 font-bold px-1.5 py-0.2 rounded">
                            📊 {res.slidesCount} شريحة
                          </span>
                        )}
                        {res.wordCount && (
                          <span className="text-[8.5px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold px-1.5 py-0.2 rounded">
                            📘 {res.wordCount} كلمة
                          </span>
                        )}
                      </div>
                    )}

                    {/* Course & Academic Level badges */}
                    {(res.academicLevel || res.courseId) && (
                      <div className="flex flex-wrap gap-1 items-center pt-1 border-t border-slate-800/40">
                        {res.academicLevel && (
                          <span className="text-[9px] bg-amber-500/10 text-[#D4A33C] border border-amber-500/25 font-black px-2 py-0.5 rounded-md">
                            ⚡ مستوى: {res.academicLevel}
                          </span>
                        )}
                        {res.courseId && (() => {
                          const course = courses.find(c => c.id === res.courseId);
                          return course ? (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-black px-2 py-0.5 rounded-md block truncate max-w-[150px]" title={course.title}>
                              🎓 دورة: {course.title}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags and content preview */}
                <div className="space-y-3.5">
                  
                  {/* Small description preview */}
                  <div className="bg-slate-900/40 p-2.5 rounded-2xl border border-slate-750/30 text-[10px] text-slate-400 font-bold leading-normal">
                    {res.type === 'link' ? (
                      <span className="font-mono text-slate-500 block truncate" dir="ltr">{res.url}</span>
                    ) : (
                      <span className="line-clamp-2">{res.content || 'لا توجد تفاصيل إضافية مضافة للمستودع'}</span>
                    )}
                  </div>

                  {/* Resource Tags lists */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {res.tags && res.tags.length > 0 ? (
                      res.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="text-[9px] text-[#D4A33C] bg-amber-500/5 px-2 py-0.5 rounded-md font-black border border-amber-500/10"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8px] text-slate-500 font-semibold">بدون وسوم تصنيفية</span>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-755/40">
                    <button
                      onClick={() => {
                        setPreviewResource(res);
                        setPreviewCurrentPage(1);
                        setPreviewSearchText('');
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-600/25 to-amber-500/10 hover:from-amber-600/40 hover:to-amber-500/25 text-[#D4A33C] border border-amber-500/35 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0"
                      title="معاينة المستند أو الرابط مباشرة دون تحميل"
                    >
                      <span>معاينة 🔍</span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedResource(res)}
                      className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1"
                      title="عرض البيانات الفنية"
                    >
                      <span>تفاصيل 👁️</span>
                    </button>

                    {res.type === 'link' && res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/45 text-indigo-200 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 border border-indigo-500/20 shrink-0 cursor-pointer"
                      >
                        <ExternalLink size={10} />
                        <span>زيارة 🌐</span>
                      </a>
                    )}
                    {res.fileData && (
                      <a
                        href={res.fileData}
                        download={res.fileName || `${res.title}.${res.type}`}
                        className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center shrink-0"
                        title="تحميل الملف الأصلي لجهازك"
                      >
                        <Download size={11} />
                      </a>
                    )}
                    {res.type !== 'link' && res.content && (
                      <button
                        onClick={() => copyToClipboard(res.content)}
                        className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center shrink-0"
                        title="نسخ النص الكامل لمستودعك"
                      >
                        <Copy size={10} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD RESOURCE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[190] p-4 text-right duration-300">
          <div className="bg-[#1e293b] text-slate-100 rounded-3xl border border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-sm font-black text-[#D4A33C] flex items-center gap-2">
                <BookOpen size={16} />
                <span>إيداع وتخزين مرجع تعليمي جديد بالمستودع 📚</span>
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setUploadedFileName('');
                  setFileParsingError(null);
                }}
                className="text-slate-400 hover:text-white w-7 h-7 rounded-full border border-slate-700 hover:border-slate-550 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              
              {/* Type selector (PDF, DOCX, PPTX, Link, Text) */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-750">
                <label className="block text-[10px] font-black text-slate-400">نمط ونوع المصدر التعليمي المراد حفظه *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'pdf', label: 'ملف PDF 📄', desc: 'استخراج نصوص الصفحات' },
                    { id: 'docx', label: 'Word (DOCX) 📘', desc: 'استخراج الفقرات والمحاور' },
                    { id: 'pptx', label: 'PowerPoint 📊', desc: 'استخراج وتصفح الشرائح' },
                    { id: 'link', label: 'رابط موقع 🌐', desc: 'موقع تعليمي مرجعي' },
                    { id: 'text', label: 'نص مباشر 📝', desc: 'شروحات وأوراق عمل' }
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => {
                        setResourceType(option.id as any);
                        setResourceContent('');
                        setResourceUrl('');
                        setUploadedFileName('');
                        setResourceFileName('');
                        setResourceFileData('');
                        setResourceSlidesCount(undefined);
                        setResourceWordCount(undefined);
                        setFileParsingError(null);
                      }}
                      className={`p-2.5 rounded-xl text-[10px] font-black transition-all flex flex-col items-center justify-center text-center gap-1 border cursor-pointer ${
                        resourceType === option.id 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' 
                          : 'bg-slate-900 border-slate-700 text-slate-450 hover:bg-slate-800'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-[8px] font-medium opacity-70">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400">اسم / عنوان المادة المرجعية *</label>
                <input
                  type="text"
                  required
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="مثال: أسئلة بجروت كيمياء - تمثيل لويس والتفاعلات، أو رابط بنك أسئلة الوزارة"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:border-[#D4A33C] focus:outline-none"
                />
              </div>

              {/* Subject & Grade selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400">المادة الدراسية *</label>
                  <select
                    value={resourceSubject}
                    onChange={(e) => setResourceSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-[#D4A33C] cursor-pointer"
                  >
                    {SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400">المرتبة الصفية المناسبة *</label>
                  <select
                    value={resourceGrade}
                    onChange={(e) => setResourceGrade(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-[#D4A33C] cursor-pointer"
                  >
                    {GRADES.map(gr => (
                      <option key={gr} value={gr}>{gr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course & Academic Level selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400">ارتباط بالدورة الدراسية (اختياري)</label>
                  <select
                    value={resourceCourseId}
                    onChange={(e) => setResourceCourseId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-[#D4A33C] cursor-pointer"
                  >
                    <option value="none">-- مادة عامة (غير مرتبطة بدورة مخصصة) --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400">المستوى الأكاديمي وتصنيفه *</label>
                  <select
                    value={resourceAcademicLevel}
                    onChange={(e) => setResourceAcademicLevel(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-[#D4A33C] cursor-pointer"
                  >
                    {ACADEMIC_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* conditional: TYPE === LINK */}
              {resourceType === 'link' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-amber-300">رابط الموقع التعليمي (URL) *</label>
                  <input
                    type="url"
                    required
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="https://example-education-site.org/chemistry"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 text-left focus:border-[#D4A33C] focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
              )}

              {/* conditional: TYPE === PDF, DOCX, PPTX */}
              {(resourceType === 'pdf' || resourceType === 'docx' || resourceType === 'pptx') && (
                <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-750">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="block text-[11px] font-black text-[#D4A33C]">
                        ⚙️ محرك استخراج وهيكلة المستندات التعليمية ({resourceType === 'docx' ? 'Word DOCX 📘' : resourceType === 'pptx' ? 'PowerPoint PPTX 📊' : 'PDF 📄'})
                      </span>
                      <span className="text-[8.5px] text-slate-400 block font-semibold mt-0.5">
                        تحويل ملفات {resourceType === 'docx' ? 'Word' : resourceType === 'pptx' ? 'PowerPoint' : 'PDF'} تلقائياً لفهارس وبنى مقرونة بصفحات وشرائح تدعم التوليفة الذكية للأسئلة
                      </span>
                    </div>
                    {uploadedFileName && (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full font-black">
                        محرك الاستخراج نشط 🟢
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'semantic', label: 'فهرسة ذكية 🧠', desc: resourceType === 'pptx' ? 'تفكيك شرائح وهيكلة AI' : 'تقسيم صفحات وهيكلة AI' },
                      { id: 'raw', label: 'نص كامل خام 📄', desc: 'تفريغ النص الأصلي حرفياً' },
                      { id: 'summary', label: 'رصد نقاط وتلخيص ✨', desc: 'استخلاص مكثف وسريع' }
                    ].map((mode) => (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => {
                          setExtractionMode(mode.id as any);
                          if (uploadedFileName) {
                            triggerToast("💡 يرجى إعادة إسقاط الملف لتفريغه بالنمط الجديد المختار!");
                          }
                        }}
                        className={`p-2 rounded-xl text-[9px] font-black transition-all flex flex-col items-center justify-center text-center gap-1 border cursor-pointer ${
                          extractionMode === mode.id 
                            ? 'bg-amber-600/20 border-amber-500 text-amber-200' 
                            : 'bg-slate-950 border-slate-805 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{mode.label}</span>
                        <span className="text-[7.5px] font-medium opacity-70">{mode.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-black text-slate-450">
                        تحميل المستند التعليمي المرجعي ({resourceType === 'docx' ? 'Word DOCX' : resourceType === 'pptx' ? 'PowerPoint PPTX' : 'PDF'})
                      </span>
                      <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
                        <span className="bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">PDF</span>
                        <span className="bg-blue-950/60 text-blue-300 px-1.5 py-0.2 rounded border border-blue-900/50">DOCX</span>
                        <span className="bg-orange-950/60 text-orange-300 px-1.5 py-0.2 rounded border border-orange-900/50">PPTX</span>
                        <span className="bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">TXT</span>
                      </div>
                    </div>
                    
                    {/* File drop area */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => document.getElementById('lib-file-input')?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                        isDraggingFile 
                          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                          : 'border-slate-600 hover:border-[#D4A33C] bg-slate-900/40 text-slate-300'
                      }`}
                    >
                      <input 
                        type="file"
                        id="lib-file-input"
                        className="hidden"
                        accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-[#D4A33C]">
                          {fileParsingLoading ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Upload size={18} />
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-slate-200 block">
                            أسقط ملف (PDF أو Word أو PowerPoint) هنا أو اضغط للتصفح
                          </span>
                          <span className="text-[9px] text-slate-450 font-semibold block mt-0.5">
                            استخراج فوري للنصوص والفقرات والشرائح مع حفظ تلقائي للمستند
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {fileParsingLoading && (
                    <div className="flex items-center gap-2 justify-center text-[10px] text-indigo-300 font-bold bg-indigo-950/20 p-2 border border-indigo-900 rounded-xl">
                      <Loader2 className="animate-spin" size={12} />
                      <span>جاري قراءة واستخراج الملف ({resourceType.toUpperCase()}) وفهرسة محتواه التعليمي...</span>
                    </div>
                  )}

                  {fileParsingError && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-rose-300 bg-rose-950/20 p-2.5 rounded-xl border border-rose-900 font-bold">
                        ⚠️ {fileParsingError}
                      </div>
                      
                      {/* Diagnostic Info Panel */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-right space-y-3 text-xs" dir="rtl">
                        <span className="font-black text-[#D4A33C] text-[11px] block border-b border-slate-800 pb-1.5">🔍 إرشادات رفع المستندات والعروض التعليمية:</span>
                        
                        <div className="space-y-2.5 text-[10px] leading-relaxed text-slate-300">
                          <div>
                            <span className="font-extrabold text-blue-450 block">📘 ملفات Word (DOCX):</span>
                            <p className="font-medium text-slate-400 mt-0.5">يتم تفريغ كافة الفقرات والعناوين والجداول وترتيبها كصفحات متسلسلة قابلة للبحث الفوري.</p>
                          </div>
                          
                          <div className="border-t border-slate-800 pt-2">
                            <span className="font-extrabold text-orange-450 block">📊 عروض PowerPoint (PPTX):</span>
                            <p className="font-medium text-slate-400 mt-0.5">يتم تفكيك كل شريحة على حدة وترقيمها (الشريحة 1، 2...) لتسهيل استعراض العرض شريحة بشريحة داخل المنصة.</p>
                          </div>

                          <div className="border-t border-slate-800 pt-2">
                            <span className="font-extrabold text-rose-450 block">📄 ملفات PDF:</span>
                            <p className="font-medium text-slate-400 mt-0.5">يجب أن يكون ملف الـ PDF نصياً (وليس ممسوحاً ضوئياً كصورة مصمتة) ليتمكن المحرك من استخلاص الحروف والأسئلة بدقة.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadedFileName && (
                    <div className="flex items-center justify-between bg-emerald-950/20 px-3 py-2 border border-emerald-900 rounded-xl text-[10px] font-bold">
                      <div className="text-emerald-300 block truncate" dir="ltr">
                        📄 تم استخراج: {uploadedFileName} {resourceSlidesCount ? `(📊 ${resourceSlidesCount} شريحة)` : ''} {resourceWordCount ? `(📘 ${resourceWordCount} كلمة)` : ''}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileName('');
                          setResourceContent('');
                          setResourceFileName('');
                          setResourceFileData('');
                          setResourceSlidesCount(undefined);
                          setResourceWordCount(undefined);
                          setFileParsingError(null);
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold text-[9px] px-2 py-0.5 rounded border border-rose-900 bg-slate-900 cursor-pointer"
                      >
                        إلغاء 🗑️
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text Area for manual text / PDF preview content */}
              {(resourceType === 'text' || resourceContent) && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400">
                    {resourceType === 'pdf' ? 'محتوى ونصوص المستند المستخلصة (يمكنك تنقيحها):' : 'المحتوى أو نماذج الأسئلة والشروحات المراد حفظها *'}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={resourceContent}
                    onChange={(e) => setResourceContent(e.target.value)}
                    placeholder="اكتب المعارف الأساسية، نماذج أسئلة بجروت سابقة وموازنة، شروحات للتفاعل الكيميائي، أو تفاصيل المنهج كاملة..."
                    className="w-full text-xs font-semibold p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-[#D4A33C] leading-relaxed"
                  />
                </div>
              )}

              {/* TAGS BUILDER IN FORM */}
              <div className="space-y-2 bg-slate-900/40 p-3 rounded-2xl border border-slate-750">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="block text-[10px] font-black text-slate-350">الوسوم المنقوشة (Tags) لتصنيف المرجع التعليمي *</span>
                    <span className="text-[8px] text-slate-450 font-semibold block">اضغط لتفعيل الوسوم الشائعة أو دون وسماً جديداً بيدك</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder="وسم خاص.."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                      className="p-1 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-200 focus:border-[#D4A33C] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-2.5 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-[9px] font-black border border-slate-700 hover:text-white"
                    >
                      أضف 🏷️
                    </button>
                  </div>
                </div>

                {/* Popular Tags Selector Toggle list */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                  {POPULAR_TAGS.map(tag => {
                    const isSelected = resourceTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleFormTag(tag)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#D4A33C] text-slate-950 font-black' 
                            : 'bg-slate-900 text-slate-400 border border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>

                {/* Currently Selected tag badges */}
                {resourceTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-750/30">
                    <span className="text-[8px] font-bold text-slate-450">الوسوم النشطة:</span>
                    {resourceTags.map(tag => (
                      <span 
                        key={tag}
                        className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded text-[8px] font-black flex items-center gap-1"
                      >
                        <span>{tag}</span>
                        <button 
                          type="button" 
                          onClick={() => setResourceTags(prev => prev.filter(t => t !== tag))}
                          className="hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  disabled={fileParsingLoading}
                  onClick={() => {
                    setShowAddModal(false);
                    setUploadedFileName('');
                    setFileParsingError(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-350 hover:bg-slate-800 rounded-xl text-xs font-black cursor-pointer transition-all disabled:opacity-50"
                >
                  تراجع عن الإدخال
                </button>
                <button
                  type="submit"
                  disabled={fileParsingLoading}
                  className="flex-1 py-2.5 bg-[#D4A33C] text-slate-950 hover:bg-amber-500 rounded-xl text-xs font-black cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {fileParsingLoading ? (
                    <>
                      <Loader2 className="animate-spin text-slate-950" size={13} />
                      <span>جاري المعالجة والحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span>أكد الحفظ بالمستودع 💾</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: VIEW RESOURCE */}
      {selectedResource && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[195] p-4 text-right duration-300">
          <div className="bg-[#1e293b] text-slate-100 rounded-3xl border border-slate-700 max-w-4xl w-full p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-700 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    {selectedResource.type === 'pdf' && '📄 مستند PDF تفاعلي'}
                    {selectedResource.type === 'docx' && '📘 مستند Word (DOCX)'}
                    {selectedResource.type === 'pptx' && '📊 عرض PowerPoint (PPTX)'}
                    {selectedResource.type === 'link' && '🌐 رابط منقح'}
                    {selectedResource.type === 'text' && '📝 مسودة شروحات'}
                  </span>
                  {selectedResource.slidesCount && (
                    <span className="bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-md shrink-0">
                      📊 إجمالي الشرائح: {selectedResource.slidesCount}
                    </span>
                  )}
                  {selectedResource.wordCount && (
                    <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-md shrink-0">
                      📘 إجمالي الكلمات: {selectedResource.wordCount}
                    </span>
                  )}
                  <span className="bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-md">
                    {selectedResource.subject}
                  </span>
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-black px-2.5 py-0.5 rounded-md">
                    {selectedResource.grade}
                  </span>
                  {selectedResource.academicLevel && (
                    <span className="bg-amber-500/10 text-[#D4A33C] border border-amber-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-md">
                      ⚡ مستوى: {selectedResource.academicLevel}
                    </span>
                  )}
                  {selectedResource.courseId && (() => {
                    const course = courses.find(c => c.id === selectedResource.courseId);
                    return course ? (
                      <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-md">
                        🎓 دورة: {course.title}
                      </span>
                    ) : null;
                  })()}
                  <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-md">
                    مرفوع بواسطة: {selectedResource.creatorName || 'الإدارة العامة'}
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-black text-white leading-relaxed">
                  {selectedResource.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedResource(null)}
                className="text-slate-400 hover:text-white w-8 h-8 rounded-full border border-slate-700 hover:border-slate-550 flex items-center justify-center cursor-pointer text-xs shrink-0"
              >
                ✕
              </button>
            </div>

            {/* URL Display if Web Link */}
            {selectedResource.type === 'link' && selectedResource.url && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-750 space-y-2">
                <div className="text-[10px] font-black text-[#D4A33C]">الموقع الإلكتروني المرجعي الرسمي:</div>
                <div className="flex items-center justify-between gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono" dir="ltr">
                  <span className="text-slate-400 truncate flex-1 block select-all">{selectedResource.url}</span>
                  <a 
                    href={selectedResource.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>زيارة الآن</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}

            {/* Content Display (parsed texts) */}
            <div className="flex-1 overflow-y-auto my-3 bg-slate-900/80 border border-slate-750 p-5 rounded-2xl max-h-[50vh] text-slate-300 text-xs leading-relaxed font-sans whitespace-pre-wrap select-text">
              {selectedResource.content || 'لا تتوفر نصوص مطبوعة مستقلة كجسم للمدخل.'}
            </div>

            {/* Footer containing tags and print/copy actions */}
            <div className="border-t border-slate-700 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {selectedResource.tags && selectedResource.tags.length > 0 ? (
                  selectedResource.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="text-[9px] bg-amber-500/5 text-[#D4A33C] border border-amber-500/10 px-2.5 py-1 rounded-full font-black"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">بدون وسوم تصنيفية</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                {selectedResource.fileData && (
                  <a
                    href={selectedResource.fileData}
                    download={selectedResource.fileName || `${selectedResource.title}.${selectedResource.type}`}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Download size={13} />
                    <span>تحميل الملف الأصلي ({selectedResource.type.toUpperCase()}) 📥</span>
                  </a>
                )}
                {selectedResource.content && (
                  <button
                    onClick={() => copyToClipboard(selectedResource.content)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <Copy size={12} />
                    <span>نسخ النصوص بالكامل 📋</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedResource(null)}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#D4A33C] text-slate-950 hover:bg-amber-500 rounded-xl text-xs font-black cursor-pointer transition-all shadow-md"
                >
                  إغلاق نافذة العرض
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SMART INTERACTIVE PREVIEW MODAL */}
      {previewResource && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[195] p-4 text-right duration-300">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-750 max-w-5xl w-full p-5 md:p-6 shadow-2xl flex flex-col justify-between max-h-[92vh] overflow-hidden my-auto">
            
            {/* Header section with rich metadata */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    {previewResource.type === 'pdf' && '📄 مستند تفاعلي (PDF)'}
                    {previewResource.type === 'docx' && '📘 مستند Word (DOCX)'}
                    {previewResource.type === 'pptx' && '📊 عرض PowerPoint (PPTX)'}
                    {previewResource.type === 'link' && '🌐 رابط منقح'}
                    {previewResource.type === 'text' && '📝 مسودة شروحات'}
                  </span>
                  {previewResource.slidesCount && (
                    <span className="bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">
                      📊 {previewResource.slidesCount} شريحة
                    </span>
                  )}
                  {previewResource.wordCount && (
                    <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">
                      📘 {previewResource.wordCount} كلمة
                    </span>
                  )}
                  <span className="bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-md shrink-0">
                    مادة: {previewResource.subject}
                  </span>
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">
                    مستوى: {previewResource.grade}
                  </span>
                  <span className="text-[9px] text-slate-450 font-bold hidden sm:inline-block">
                    تاريخ الرفع: {new Date(previewResource.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-black text-white leading-relaxed truncate" title={previewResource.title}>
                  {previewResource.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {previewResource.fileData && (
                  <a 
                    href={previewResource.fileData}
                    download={previewResource.fileName || `${previewResource.title}.${previewResource.type}`}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-md"
                    title="تحميل الملف الأصلي لجهازك"
                  >
                    <Download size={12} />
                    <span>تحميل الملف الأصلي 📥</span>
                  </a>
                )}
                {previewResource.type === 'link' && previewResource.url && (
                  <a 
                    href={previewResource.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <span>زيارة الموقع الخارجي 🌐</span>
                  </a>
                )}
                <button 
                  onClick={() => {
                    setPreviewResource(null);
                    setPreviewSearchText('');
                  }}
                  className="text-slate-400 hover:text-white w-9 h-9 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-950/40 flex items-center justify-center cursor-pointer text-xs"
                  title="إغلاق المعاينة الذكية"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Smart Search Bar & Content View Controls inside Modal */}
            <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 my-3">
              
              {/* Document search inside modal text content */}
              {previewResource.type !== 'link' && previewResource.content ? (
                <div className="relative w-full sm:w-80">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="بحث داخلي فوري عن كلمات ومصطلحات..."
                    value={previewSearchText}
                    onChange={(e) => {
                      setPreviewSearchText(e.target.value);
                      setPreviewCurrentPage(1); // Reset to first page to locate results
                    }}
                    className="w-full text-[10px] font-bold text-slate-200 pr-8 pl-8 py-2 bg-slate-900 border border-slate-750 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                  {previewSearchText && (
                    <button
                      onClick={() => setPreviewSearchText('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[9px] bg-slate-800 rounded-full w-4.5 h-4.5 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[10px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>🌐 معاينة محتوى الويب مباشرة عبر النافذة المضمنة:</span>
                </div>
              )}

              {/* View options (Page-by-page vs Complete continuous text) */}
              {previewResource.type !== 'link' && previewResource.content && (
                <div className="flex gap-1 bg-slate-900 p-1 border border-slate-800 rounded-xl w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setPreviewViewMode('pages')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                      previewViewMode === 'pages'
                        ? 'bg-[#D4A33C] text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {previewResource.type === 'pptx' ? 'عرض شريحة بشريحة 📊' : 'عرض صفحة بصفحة 📄'}
                  </button>
                  <button
                    onClick={() => setPreviewViewMode('full')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                      previewViewMode === 'full'
                        ? 'bg-[#D4A33C] text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    كامل المحتوى المتصل 📜
                  </button>
                </div>
              )}
            </div>

            {/* Main Interactive Canvas / Split layout */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 my-2 h-[50vh] min-h-[350px]">
              
              {/* Document display board */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl p-4 md:p-5 overflow-y-auto flex flex-col justify-between shrink-0 md:shrink relative select-all">
                
                {previewResource.type === 'link' ? (
                  /* Embed live iframe */
                  <div className="w-full h-full flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-2 p-3 bg-indigo-950/30 border border-indigo-900/45 rounded-2xl text-[9px] text-indigo-200 font-bold leading-normal">
                      <span className="text-xs">⚠️</span>
                      <span>
                        معاينة ذكية: توفر الأكاديمية عرضاً حياً مضمناً للرابط التعليمي. إن واجهتك شاشة بيضاء أو تعذر التحميل، فيعود ذلك لسياسات المواقع الخاصة بأمن المشاركة. لتعويض ذلك نوصي بالضغط على "زيارة الموقع الخارجي 🌐".
                      </span>
                    </div>
                    
                    <iframe 
                      src={previewResource.url} 
                      className="w-full flex-1 rounded-2xl border border-slate-750 bg-slate-900" 
                      title="Educational Web Resource Live Preview"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  /* Formatted Document Text Display */
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto text-slate-200 text-xs leading-relaxed font-sans pr-1 whitespace-pre-wrap">
                      {(() => {
                        const contentText = previewResource.content || '';
                        
                        if (previewViewMode === 'pages') {
                          // Extract pages or slides
                          const rawPages = contentText.split(/---\s*\[\s*(?:صفحة|الشريحة|شريحة)\s*\d+\s*\]\s*---/g).map(p => p.trim()).filter(Boolean);
                          
                          // Find index of the page block
                          // Let's guarantee index exists
                          const targetPageIndex = Math.max(0, Math.min(previewCurrentPage - 1, rawPages.length - 1));
                          const pageContent = rawPages[targetPageIndex] || 'لا يتوفر نصوص للمعاينة في هذه الصفحة أو الشريحة المعينة.';
                          
                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-805 pb-2 text-[10px] text-[#D4A33C] font-black">
                                <span>
                                  {previewResource.type === 'pptx' ? '📊 الشريحة النشطة حالياً' : previewResource.type === 'docx' ? '📘 الصفحة النشطة حالياً' : '📄 الصفحة النشطة حالياً'}: {previewCurrentPage} من أصل {rawPages.length}
                                </span>
                                {previewSearchText.trim() && (
                                  <span className="text-[9px] bg-indigo-900/30 text-indigo-300 border border-indigo-550/20 px-2 py-0.5 rounded-full">
                                    نمط التمييز للبحث نشط 💡
                                  </span>
                                )}
                              </div>
                              <div className="py-2 inline-block w-full">
                                {(() => {
                                  if (previewSearchText.trim()) {
                                    // Utility to highlight text
                                    const text = pageContent;
                                    const query = previewSearchText;
                                    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
                                    return parts.map((part, idx) => 
                                      part.toLowerCase() === query.toLowerCase()
                                        ? <mark key={idx} className="bg-amber-400 text-slate-950 font-black px-1 rounded-sm">{part}</mark>
                                        : <span key={idx}>{part}</span>
                                    );
                                  }
                                  return pageContent;
                                })()}
                              </div>
                            </div>
                          );
                        } else {
                          // Continuous view
                          return (
                            <div className="py-1">
                              {previewSearchText.trim() ? (
                                (() => {
                                  const text = contentText;
                                  const query = previewSearchText;
                                  const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
                                  return parts.map((part, idx) => 
                                    part.toLowerCase() === query.toLowerCase()
                                      ? <mark key={idx} className="bg-amber-400 text-slate-950 font-black px-1 rounded-sm">{part}</mark>
                                      : <span key={idx}>{part}</span>
                                  );
                                })()
                              ) : (
                                contentText
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Pagination control below current view */}
                    {previewViewMode === 'pages' && (
                      <div className="flex items-center justify-center gap-3 border-t border-slate-805 pt-3 mt-2 shrink-0 select-none">
                        {(() => {
                          const rawPages = (previewResource.content || '').split(/---\s*\[\s*(?:صفحة|الشريحة|شريحة)\s*\d+\s*\]\s*---/g).map(p => p.trim()).filter(Boolean);
                          const totalPagesCount = Math.max(1, rawPages.length);
                          
                          return (
                            <>
                              <button
                                disabled={previewCurrentPage <= 1}
                                onClick={() => setPreviewCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>السابق</span>
                                <ChevronRight size={12} />
                              </button>
                              
                              <span className="text-[10px] font-black text-slate-450 block px-3">
                                {previewResource.type === 'pptx' ? 'شريحة' : 'صفحة'} {previewCurrentPage} من أصل {totalPagesCount}
                              </span>

                              <button
                                disabled={previewCurrentPage >= totalPagesCount}
                                onClick={() => setPreviewCurrentPage(prev => Math.min(totalPagesCount, prev + 1))}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <ChevronLeft size={12} />
                                <span>التالي</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                  </div>
                )}
                
              </div>

              {/* Side analysis bar - displays tags list and fast stats */}
              <div className="w-full md:w-60 bg-slate-900 border border-slate-800 rounded-3xl p-3.5 flex flex-col justify-between shrink-0 space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">البيانات الإحصائية</span>
                    <div className="grid grid-cols-2 gap-1.5 text-center">
                      <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl">
                        <span className="text-[14px] font-mono text-indigo-400 font-extrabold block">
                          {previewResource.content ? previewResource.content.split(/\s+/).filter(Boolean).length : 0}
                        </span>
                        <span className="text-[7.5px] text-slate-400 font-bold block">مجموع الكلمات</span>
                      </div>
                      <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl">
                        <span className="text-[14px] font-mono text-indigo-400 font-extrabold block">
                          {previewResource.content ? previewResource.content.length : 0}
                        </span>
                        <span className="text-[7.5px] text-slate-450 font-bold block">عدد الحروف</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">الوسوم المصنفة للذكاء الاصطناعي</span>
                    <div className="flex flex-wrap gap-1 p-2 bg-slate-950 rounded-xl border border-slate-805 max-h-[140px] overflow-y-auto">
                      {previewResource.tags && previewResource.tags.length > 0 ? (
                        previewResource.tags.map(tag => (
                          <span 
                            key={tag}
                            className="bg-amber-500/10 text-[#D4A33C] border border-amber-500/15 rounded-md px-2 py-0.5 text-[8.5px] font-black"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[8px] text-slate-500 font-semibold p-1">لا وسوم مرتبطة بالملف المختار</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-805 space-y-1.5 text-right">
                    <span className="text-[8.5px] font-black text-amber-500 block">💡 تلميح للأكاديمية:</span>
                    <p className="text-[8px] text-slate-400 leading-relaxed">
                      هذا المرجع مفهرس ومطابق تماماً في خوادم السحابة. عند قيامك بتوليد أسئلة الامتحان، سيقوم الذكاء الاصطناعي بجلب هذه المستخلصات لبناء الأسئلة وتولينها بما يطابق نفس المعايير بدقة.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {previewResource.content && (
                    <button
                      onClick={() => copyToClipboard(previewResource.content)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Copy size={11} />
                      <span>قراءة ونسخ النص الكلي للـ Clipboard</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPreviewResource(null);
                      setPreviewSearchText('');
                    }}
                    className="w-full py-2.5 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 rounded-xl text-[10px] font-black cursor-pointer transition-all shadow-md text-center inline-block"
                  >
                    إنهاء المعاينة الحالية ✕
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

        </>
      )}

    </div>
  );
}
