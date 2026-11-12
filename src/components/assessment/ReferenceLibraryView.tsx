import React, { useState } from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Hash, 
  GitBranch, 
  Eye, 
  Layers, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Filter, 
  BookOpen, 
  AlertCircle,
  FileCode,
  Archive,
  Download,
  Info
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { ReferenceDocument, ReferenceStatus } from '../../types/assessmentPlatform';

export const ReferenceLibraryView: React.FC = () => {
  const references = assessmentStore.references;
  const specialties = assessmentStore.specialties;
  const courses = assessmentStore.courses;
  const currentUser = assessmentStore.currentUser;

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReferenceModal, setActiveReferenceModal] = useState<ReferenceDocument | null>(null);

  // Review Modal state
  const [reviewDecisionRef, setReviewDecisionRef] = useState<ReferenceDocument | null>(null);
  const [reviewDecisionType, setReviewDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  // Upload Reference Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSpec, setUploadSpec] = useState(specialties[0]?.id || '');
  const [uploadCourse, setUploadCourse] = useState(courses[0]?.id || '');
  const [uploadFileType, setUploadFileType] = useState<'pdf' | 'docx'>('pdf');
  const [uploadAttribution, setUploadAttribution] = useState('');
  const [uploadContentText, setUploadContentText] = useState('');
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  // Version update modal
  const [versionTargetRef, setVersionTargetRef] = useState<ReferenceDocument | null>(null);
  const [versionNewContent, setVersionNewContent] = useState('');
  const [versionReason, setVersionReason] = useState('');

  const statusBadges: Record<ReferenceStatus, { label: string; bg: string; text: string; icon: any }> = {
    pending_review: { label: 'بانتظار الاعتماد', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: Clock },
    approved: { label: 'معتمد رسمياً', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: CheckCircle },
    rejected: { label: 'مرفوض', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', icon: XCircle },
    processing: { label: 'قيد المعالجة', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Sparkles },
    needs_correction: { label: 'يحتاج تصحيحاً', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', icon: AlertTriangle },
    archived: { label: 'مؤرشف', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', icon: Archive }
  };

  // Filter references based on role & selected filters
  const filteredReferences = references.filter(ref => {
    // For students: ONLY approved references are visible
    if (currentUser.role === 'student' && ref.status !== 'approved') {
      return false;
    }
    // For teachers: show their own uploaded references OR any approved reference in the shared library
    if (currentUser.role === 'teacher') {
      const isOwner = ref.uploaderId === currentUser.id;
      const isApprovedShared = ref.status === 'approved';
      if (!isOwner && !isApprovedShared) return false;
    }

    if (selectedSpecialty !== 'all' && ref.specialtyId !== selectedSpecialty) return false;
    if (selectedStatus !== 'all' && ref.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ref.title.toLowerCase().includes(q);
      const matchFile = ref.fileName.toLowerCase().includes(q);
      const matchAttribution = ref.sourceAttribution.toLowerCase().includes(q);
      return matchTitle || matchFile || matchAttribution;
    }
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErrorMessage(null);
    try {
      if (!uploadTitle.trim() || !uploadContentText.trim()) {
        setUploadErrorMessage('يرجى ملء جميع الحقول المطلوبة بما في ذلك نص المرجع.');
        return;
      }

      assessmentStore.uploadReference({
        title: uploadTitle,
        specialtyId: uploadSpec,
        courseId: uploadCourse,
        fileType: uploadFileType,
        fileName: `${uploadTitle.replace(/\s+/g, '_')}.${uploadFileType}`,
        rawContent: uploadContentText,
        sourceAttribution: uploadAttribution || 'مرجع أكاديمي معتمد',
        ocrStatus: 'none'
      });

      setShowUploadModal(false);
      setUploadTitle('');
      setUploadContentText('');
      setUploadAttribution('');
    } catch (err: any) {
      setUploadErrorMessage(err.message || 'حدث خطأ أثناء رفع المرجع.');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDecisionRef) return;
    try {
      assessmentStore.reviewReference(reviewDecisionRef.id, reviewDecisionType, reviewNotes);
      setReviewDecisionRef(null);
      setReviewNotes('');
    } catch (err: any) {
      alert(err.message || 'فشل اتخاذ القرار.');
    }
  };

  const handleVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTargetRef) return;
    try {
      assessmentStore.createNewReferenceVersion(versionTargetRef.id, versionNewContent, versionReason);
      setVersionTargetRef(null);
      setVersionNewContent('');
      setVersionReason('');
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء الإصدار الجديد.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileCheck2 size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">المكتبة الأكاديمية وإدارة المراجع المعتمدة</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            توثيق المراجع، استخراج النصوص والمواضع الأصلية، كشف التطابق بالبصمة الرقمية (SHA-256)، ومسار الاعتماد المستقل.
          </p>
        </div>

        {/* Upload Button (Teachers & Admins) */}
        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <UploadCloud size={16} />
            <span>رفع مرجع جديد للمراجعة</span>
          </button>
        )}
      </div>

      {/* Strict Policy Alert Banner */}
      <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">القاعدة الذهبية الصارمة لاعتماد المراجع:</h4>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            المراجع غير المعتمدة (قيد المراجعة أو المرفوضة) <strong>محظورة تماماً</strong> من الظهور في المكتبة المشتركة، ولا يمكن استرجاعها بواسطة المعلم الذكي أو توليد أسئلة رسمية منها، لضمان أعلى درجات الموثوقية الأكاديمية.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Specialty Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <span>التخصص:</span>
            <select
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 font-medium outline-none"
            >
              <option value="all">كافة التخصصات ({specialties.length})</option>
              {specialties.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter (Hidden for students) */}
          {currentUser.role !== 'student' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>الحالة:</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 font-medium outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="pending_review">بانتظار الاعتماد</option>
                <option value="approved">معتمد رسمياً</option>
                <option value="rejected">مرفوض</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث في عنوان المرجع أو المصدر..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* References Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReferences.map(ref => {
          const spec = specialties.find(s => s.id === ref.specialtyId);
          const badge = statusBadges[ref.status];
          const BadgeIcon = badge.icon;
          const isUploader = ref.uploaderId === currentUser.id;
          const canReview = (currentUser.role === 'reviewer' || currentUser.role === 'admin') && ref.status === 'pending_review';

          return (
            <div
              key={ref.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {spec?.name || 'عام'} • الإصدار {ref.version}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                    <BadgeIcon size={12} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                    {ref.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {ref.sourceAttribution}
                  </p>
                </div>

                {/* Metadata details */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span className="text-slate-400 block">رافع المرجع:</span>
                    <span className="font-medium text-slate-700 truncate block">{ref.uploaderName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">المقاطع المستخرجة:</span>
                    <span className="font-medium text-slate-700">{ref.totalChunks} مقطع موثق</span>
                  </div>
                </div>

                {/* Checksum & OCR badge */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-[10px] space-y-1 font-mono">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash size={11} />
                      <span>البصمة (SHA-256):</span>
                    </span>
                    <span className="truncate max-w-[120px]">{ref.checksumSha256.slice(0, 16)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>نوع الملف: {ref.fileType.toUpperCase()} ({ref.fileSizeFormatted})</span>
                    <span className="text-emerald-700 font-sans font-bold">
                      {ref.ocrStatus === 'experimental_tested' ? 'مفحوص تجريبياً' : 'نصي مباشر'}
                    </span>
                  </div>
                </div>

                {/* Reviewer notes if reviewed */}
                {ref.reviewDecision && (
                  <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    ref.reviewDecision.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50/50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="font-bold flex items-center justify-between">
                      <span>قرار المراجع: {ref.reviewDecision.reviewerName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ref.reviewDecision.reviewedAt).toLocaleDateString('ar')}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed italic">"{ref.reviewDecision.notes}"</p>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReferenceModal(ref)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <Eye size={14} />
                  <span>معاينة المقاطع ({ref.totalChunks})</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Review Action (Scientific Reviewer) */}
                  {canReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewDecisionRef(ref);
                        setReviewDecisionType('approved');
                        setReviewNotes('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      اتخاذ قرار الاعتماد
                    </button>
                  )}

                  {/* Version Replacement (Teacher / Admin) */}
                  {(currentUser.role === 'teacher' || currentUser.role === 'admin') && ref.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => {
                        setVersionTargetRef(ref);
                        setVersionNewContent(ref.chunks.map(c => c.content).join('\n\n'));
                        setVersionReason('');
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition"
                      title="استبدال المحتوى وإنشاء إصدار جديد (v1.1)"
                    >
                      <GitBranch size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chunks Inspector Modal */}
      {activeReferenceModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col justify-between" dir="rtl">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                  {activeReferenceModal.fileName} • الإصدار {activeReferenceModal.version}
                </span>
                <h3 className="text-base font-bold text-slate-900">{activeReferenceModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveReferenceModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chunks scroll area */}
            <div className="overflow-y-auto my-4 space-y-4 pr-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <strong>التوثيق الأكاديمي:</strong> {activeReferenceModal.sourceAttribution}
              </div>

              {activeReferenceModal.chunks.map(chunk => (
                <div key={chunk.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-600" />
                      <span>{chunk.sectionTitle || `المقطع ${chunk.chunkIndex}`}</span>
                    </span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      {chunk.pageNumber ? `صفحة ${chunk.pageNumber} (${chunk.isPrintedPageEstimated ? 'مقدرة' : 'فعلية'})` : `فقرة ${chunk.paragraphIndex}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100 select-text">
                    {chunk.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>عدد الكلمات: {chunk.wordCount} كلمة</span>
                    <span>معرف المقطع: {chunk.id}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveReferenceModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scientific Reviewer Decision Modal */}
      {reviewDecisionRef && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center gap-2 text-purple-700">
              <ShieldCheck size={22} />
              <h3 className="text-base font-bold text-slate-900">اتخاذ قرار الاعتماد العلمي للمرجع</h3>
            </div>
            <p className="text-xs text-slate-500">
              المرجع: <strong>{reviewDecisionRef.title}</strong> ({reviewDecisionRef.fileName})
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">القرار الأكاديمي</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecisionType('approved')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      reviewDecisionType === 'approved'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle size={16} />
                    <span>اعتماد رسمي ونشر للمكتبة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecisionType('rejected')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      reviewDecisionType === 'rejected'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <XCircle size={16} />
                    <span>رفض المرجع مع ذكر الأسباب</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وتوجيهات المراجع العلمي (إلزامية وموثقة في سجل التدقيق):
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="اكتب أسباب القرار الأكاديمي، مطابقة المنهج ونماذج البجروت، ودقة استخراج النصوص..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-purple-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewDecisionRef(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md ${
                    reviewDecisionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  تأكيد وتوثيق القرار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Reference Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud size={20} className="text-emerald-600" />
                <span>رفع وتوثيق مرجع أكاديمي جديد (PDF / DOCX)</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {uploadErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{uploadErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المرجع الأكاديمي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كتاب الكيمياء المعتمد - الباب الرابع: الاتزان الكيميائي"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص</label>
                  <select
                    value={uploadSpec}
                    onChange={e => setUploadSpec(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {specialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المقرر المرتبط</label>
                  <select
                    value={uploadCourse}
                    onChange={e => setUploadCourse(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الملف الأصلي</label>
                  <select
                    value={uploadFileType}
                    onChange={e => setUploadFileType(e.target.value as 'pdf' | 'docx')}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  >
                    <option value="pdf">PDF (نصي مع ترقيم صفحات)</option>
                    <option value="docx">DOCX (Word Document)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التوثيق الرسمي والمصدر (Author / Publisher / Pages)
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وزارة التربية والتعليم - كتاب الكيمياء للمرحلة الثانوية والبجروت، ص 114-124"
                  value={uploadAttribution}
                  onChange={e => setUploadAttribution(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  النص المستخرج من المرجع (مع ترقيم الصفحات والأقسام):
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  نصيحة: يمكنك فصل الفقرات بسطر فارغ لتوليد مقاطع مستقلة، واستخدام [ص 12] لتحديد أرقام الصفحات الفعلية.
                </p>
                <textarea
                  rows={8}
                  required
                  value={uploadContentText}
                  onChange={e => setUploadContentText(e.target.value)}
                  placeholder="الصق نص المحتوى العلمي المأخوذ من ملف الـ PDF أو DOCX هنا..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none font-mono leading-relaxed select-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
                >
                  حفظ وتقديم للاعتماد العلمي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version Replacement Modal */}
      {versionTargetRef && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch size={18} className="text-indigo-600" />
              <span>استبدال المحتوى وإنشاء إصدار جديد من المرجع</span>
            </h3>
            <p className="text-xs text-slate-500">
              سيتم إنشاء إصدار جديد (v{(parseFloat(versionTargetRef.version) + 0.1).toFixed(1)}) يتطلب اعتماداً مستقلاً من المراجع العلمي، مع بقاء الإصدار السابق محفوظاً ومربوطاً بالاختبارات السابقة.
            </p>

            <form onSubmit={handleVersionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب التحديث / الاستبدال</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إضافة نماذج بجروت أحدث وتعديل صياغة الفقرة الثانية"
                  value={versionReason}
                  onChange={e => setVersionReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">النص المحدث للإصدار الجديد</label>
                <textarea
                  rows={6}
                  required
                  value={versionNewContent}
                  onChange={e => setVersionNewContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVersionTargetRef(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md"
                >
                  إنشاء الإصدار المحدث
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
