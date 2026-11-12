import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  BookOpen, 
  Tag, 
  FolderTree, 
  Award, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Filter,
  GraduationCap,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { BloomLevel } from '../../types/assessmentPlatform';

export const CurriculumManagerView: React.FC = () => {
  const specialties = assessmentStore.specialties;
  const gradeLevels = assessmentStore.gradeLevels;
  const courses = assessmentStore.courses;
  const units = assessmentStore.units;
  const topics = assessmentStore.topics;
  const learningOutcomes = assessmentStore.learningOutcomes;
  const groups = assessmentStore.groups;
  const currentUser = assessmentStore.currentUser;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
  
  // Modals / Form toggles
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddLoModal, setShowAddLoModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  // New Course state
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseSpec, setNewCourseSpec] = useState(specialties[0]?.id || '');
  const [newCourseGrade, setNewCourseGrade] = useState(gradeLevels[0]?.id || '');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Unit state
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');

  // New LO state
  const [newLoCode, setNewLoCode] = useState('');
  const [newLoText, setNewLoText] = useState('');
  const [newLoBloom, setNewLoBloom] = useState<BloomLevel>('apply');

  // New Group state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStudents, setNewGroupStudents] = useState<string[]>([]);

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const activeCourseUnits = units.filter(u => u.courseId === activeCourse?.id);
  const activeUnit = units.find(u => u.id === selectedUnitId) || activeCourseUnits[0];
  const activeUnitTopics = topics.filter(t => t.unitId === activeUnit?.id);
  const activeUnitLos = learningOutcomes.filter(lo => lo.unitId === activeUnit?.id);
  const activeCourseGroups = groups.filter(g => g.courseId === activeCourse?.id);

  const bloomColorMap: Record<BloomLevel, string> = {
    remember: 'bg-slate-100 text-slate-800 border-slate-300',
    understand: 'bg-blue-50 text-blue-800 border-blue-200',
    apply: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    analyze: 'bg-amber-50 text-amber-800 border-amber-200',
    evaluate: 'bg-rose-50 text-rose-800 border-rose-200'
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !newCourseCode.trim()) return;
    const c = assessmentStore.addCourse(
      newCourseName,
      newCourseCode,
      newCourseSpec,
      newCourseGrade,
      [currentUser.id],
      newCourseDesc
    );
    setSelectedCourseId(c.id);
    setShowAddCourseModal(false);
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseDesc('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitTitle.trim() || !activeCourse) return;
    const u = assessmentStore.addUnit(activeCourse.id, newUnitTitle, newUnitDesc);
    setSelectedUnitId(u.id);
    setShowAddUnitModal(false);
    setNewUnitTitle('');
    setNewUnitDesc('');
  };

  const handleCreateLo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoText.trim() || !activeUnit) return;
    assessmentStore.addLearningOutcome(
      activeUnit.id,
      undefined,
      newLoCode || `LO-${Date.now().toString().slice(-4)}`,
      newLoText,
      newLoBloom
    );
    setShowAddLoModal(false);
    setNewLoCode('');
    setNewLoText('');
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !activeCourse) return;
    const allStudentIds = assessmentStore.users.filter(u => u.role === 'student').map(u => u.id);
    assessmentStore.addGroup(newGroupName, activeCourse.id, currentUser.id, allStudentIds.slice(0, 2));
    setShowAddGroupModal(false);
    setNewGroupName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Layers size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">الهيكل التنظيمي والمناهج الأكاديمية</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            إدارة التخصصات، الصفوف والمراحل، المقررات، الوحدات التعليمية، ونواتج التعلم (LOs) المرتبطة بأسئلة ومراجع النظام.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowAddCourseModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة مقرر دراسي جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Specialties Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {specialties.map(spec => (
          <div key={spec.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{spec.code}</span>
              <h4 className="text-sm font-bold text-slate-800">{spec.name}</h4>
              <p className="text-xs text-slate-500 truncate max-w-[160px]">{spec.description}</p>
            </div>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              {courses.filter(c => c.specialtyId === spec.id).length} مقررات
            </span>
          </div>
        ))}
      </div>

      {/* Main Course & Units Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Navigation Column: Courses & Groups */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" />
                <span>المقررات التعليمية المتاحة</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">({courses.length})</span>
            </div>

            <div className="space-y-2">
              {courses.map(course => {
                const isSelected = course.id === activeCourse?.id;
                const spec = specialties.find(s => s.id === course.specialtyId);
                const grade = gradeLevels.find(g => g.id === course.gradeLevelId);
                const courseUnitsCount = units.filter(u => u.courseId === course.id).length;
                return (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      const firstUnit = units.find(u => u.courseId === course.id);
                      if (firstUnit) setSelectedUnitId(firstUnit.id);
                    }}
                    className={`w-full text-right p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-slate-50/60 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-100/60 px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {courseUnitsCount} وحدات
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">{course.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{grade?.name} • {spec?.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enrolled Groups in this Course */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Users size={16} className="text-sky-600" />
                <span>الشعب والمجموعات الطلابية</span>
              </h3>
              {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="text-xs text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  + إضافة شعبة
                </button>
              )}
            </div>

            {activeCourseGroups.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">لا توجد شعب مسندة لهذا المقرر حالياً.</p>
            ) : (
              <div className="space-y-2">
                {activeCourseGroups.map(grp => (
                  <div key={grp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{grp.name}</h5>
                      <span className="text-[11px] text-slate-500">
                        {grp.studentIds.length} طلاب مسجلين
                      </span>
                    </div>
                    <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2 py-1 rounded-md border border-sky-200">
                      مفصولة
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Units, Topics & Learning Outcomes */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Course Banner */}
          {activeCourse && (
            <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-bold">
                  <span>{activeCourse.code}</span>
                  <span>•</span>
                  <span>{gradeLevels.find(g => g.id === activeCourse.gradeLevelId)?.name}</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">{activeCourse.name}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{activeCourse.description}</p>
              </div>

              {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                <button
                  onClick={() => setShowAddUnitModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>إضافة وحدة دراسية</span>
                </button>
              )}
            </div>
          )}

          {/* Units Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            {activeCourseUnits.map(unit => {
              const isActive = unit.id === activeUnit?.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {unit.title}
                </button>
              );
            })}
          </div>

          {/* Active Unit Details & Learning Outcomes */}
          {activeUnit ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{activeUnit.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{activeUnit.description}</p>
                </div>

                {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                  <button
                    onClick={() => setShowAddLoModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>إضافة ناتج تعلم (LO)</span>
                  </button>
                )}
              </div>

              {/* Learning Outcomes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Award size={15} className="text-amber-500" />
                    <span>نواتج التعلم المعتمدة للوحدة (Learning Outcomes)</span>
                  </h5>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeUnitLos.length} ناتج تعلم
                  </span>
                </div>

                {activeUnitLos.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500">لا توجد نواتج تعلم مضافة لهذه الوحدة بعد.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeUnitLos.map(lo => (
                      <div
                        key={lo.id}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                              {lo.code}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${bloomColorMap[lo.bloomLevel]}`}>
                              مستوى بلوم: {lo.bloomLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {lo.text}
                          </p>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {assessmentStore.questions.filter(q => q.learningOutcomeId === lo.id).length} أسئلة مرتبطة
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
              يرجى اختيار وحدة دراسية من القائمة لعرض تفاصيلها ونواتج التعلم المرتبطة.
            </div>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900">إضافة مقرر دراسي جديد</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المقرر</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كيمياء البجروت المتقدمة (5 وحدات)"
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رمز المقرر</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: CHEM-501"
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص</label>
                  <select
                    value={newCourseSpec}
                    onChange={e => setNewCourseSpec(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {specialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
                <select
                  value={newCourseGrade}
                  onChange={e => setNewCourseGrade(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {gradeLevels.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف والهدف</label>
                <textarea
                  rows={2}
                  value={newCourseDesc}
                  onChange={e => setNewCourseDesc(e.target.value)}
                  placeholder="وصف مختصر لمحتوى المقرر ومعاييره..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                >
                  حفظ المقرر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900">إضافة وحدة تعليمية جديدة</h3>
            <form onSubmit={handleCreateUnit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الوحدة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الوحدة الثالثة: الديناميكا الحرارية وطاقة جيبس"
                  value={newUnitTitle}
                  onChange={e => setNewUnitTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف محتوى الوحدة</label>
                <textarea
                  rows={3}
                  value={newUnitDesc}
                  onChange={e => setNewUnitDesc(e.target.value)}
                  placeholder="المفاهيم المركزية التي تغطيها هذه الوحدة..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
                >
                  حفظ الوحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Learning Outcome Modal */}
      {showAddLoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900">إضافة ناتج تعلم (Learning Outcome)</h3>
            <form onSubmit={handleCreateLo} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رمز الناتج</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: LO-CHEM-04"
                    value={newLoCode}
                    onChange={e => setNewLoCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المستوى المعرفي (بلوم)</label>
                  <select
                    value={newLoBloom}
                    onChange={e => setNewLoBloom(e.target.value as BloomLevel)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="remember">تذكر (Remember)</option>
                    <option value="understand">فهم (Understand)</option>
                    <option value="apply">تطبيق (Apply)</option>
                    <option value="analyze">تحليل (Analyze)</option>
                    <option value="evaluate">تقويم (Evaluate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نص ناتج التعلم الدقيق</label>
                <textarea
                  rows={3}
                  required
                  value={newLoText}
                  onChange={e => setNewLoText(e.target.value)}
                  placeholder="مثال: يحلل الطالب العلاقة الرياضية بين التغير في الإنثالبي والتغير في الإنتروبي للتنبؤ بالتلقائية..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLoModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                >
                  إضافة الناتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900">إنشاء شعبة دراسية جديدة</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشعبة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شعبة الكيمياء المتقدمة 12 (ج)"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                سيتم فصل نتائج ومحاولات هذه المجموعة بشكل آمن ومستقل عن باقي الشعب.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-sm"
                >
                  إنشاء الشعبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
