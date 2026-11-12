import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  KeyRound, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  Lock, 
  Phone, 
  Mail, 
  Layers,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { UserAccount, UserRole, Course } from './types';

interface AdminDashboardViewProps {
  users: UserAccount[];
  courses: Course[];
  onAddUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateUser: (id: string, updates: Partial<UserAccount>) => void;
  onDeleteUser: (id: string) => void;
  onResetPassword: (id: string, newPass: string) => void;
  onOpenTeacherView: () => void;
  onOpenAnalytics: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  users,
  courses,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onOpenTeacherView,
  onOpenAnalytics
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'system'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Add/Edit User
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    grade: 'الصف الثاني عشر (بجروت)',
    role: 'student' as UserRole,
    status: 'active' as 'active' | 'inactive'
  });

  // Modal State for Password Reset
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Calculations
  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalTeachers = users.filter((u) => u.role === 'teacher').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalActiveUsers = users.filter((u) => u.status === 'active').length;
  const activityRate = users.length > 0 ? Math.round((totalActiveUsers / users.length) * 100) : 100;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q);
    return matchesRole && matchesSearch;
  });

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: 'Pass' + Math.floor(1000 + Math.random() * 9000),
      grade: 'الصف الثاني عشر (بجروت)',
      role: 'student',
      status: 'active'
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setFormData({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone,
      password: u.password || '',
      grade: u.grade,
      role: u.role,
      status: u.status
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية: الاسم، اسم المستخدم، والبريد الإلكتروني.');
      return;
    }

    if (editingUserId) {
      onUpdateUser(editingUserId, formData);
    } else {
      onAddUser(formData);
    }
    setIsUserModalOpen(false);
  };

  const handleDoResetPassword = () => {
    if (!resetModalUserId || !newPasswordInput.trim()) return;
    onResetPassword(resetModalUserId, newPasswordInput.trim());
    setResetModalUserId(null);
    setNewPasswordInput('');
    alert('تم تعيين كلمة المرور الجديدة بنجاح للمستخدم وتحديث بيانات الدخول.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 md:p-10 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold flex items-center gap-1">
                <ShieldCheck size={14} />
                لوحة الإدارة المركزية والتحكم الشامل
              </span>
              <span className="text-xs text-slate-400">
                صلاحيات مدير المنصة (Admin Root)
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black font-serif mb-2">
              إدارة مستخدمي ومساقات أكاديمية التفوق
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              تحكم كامل في الحسابات، الطلاب، المعلمين، الصلاحيات، كلمات المرور، وهيكل المساقات التعليمية مع منع التسجيل العشوائي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddUser}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>إضافة حساب جديد (طالب / معلم)</span>
            </button>
            <button
              onClick={onOpenAnalytics}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <TrendingUp size={16} />
              <span>التقارير والإحصائيات وتصدير Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">إجمالي الطلاب</span>
            <GraduationCap size={18} className="text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalStudents} طالب</div>
          <span className="text-[11px] text-emerald-600 font-bold">مسجلون تحت إشراف الإدارة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">الكادر التعليمي</span>
            <Users size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalTeachers} معلمين</div>
          <span className="text-[11px] text-stone-400">بصلاحيات بناء المساقات</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">المواد التعليمية</span>
            <BookOpen size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{courses.length} مواد</div>
          <span className="text-[11px] text-stone-400">شاملة مساق التمثيل الضوئي</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">الحسابات النشطة</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalActiveUsers}</div>
          <span className="text-[11px] text-stone-400">من أصل {users.length} حساب</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">نسبة النشاط والأمان</span>
            <ShieldCheck size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">{activityRate}%</div>
          <span className="text-[11px] text-purple-700 font-bold">RBAC مشفر ومؤمن</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl p-2 border border-stone-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users size={15} />
          <span>إدارة المستخدمين والطلاب والمعلمين ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BookOpen size={15} />
          <span>إدارة المواد والأقسام الدراسية ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Settings size={15} />
          <span>إعدادات النظام والأمان والصلاحيات</span>
        </button>
      </div>

      {/* Tab 1: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
                className="w-full pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
              />
              <Search size={16} className="absolute right-3.5 top-3 text-stone-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-stone-500">تصفية الدور:</span>
              {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === r
                      ? 'bg-emerald-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r === 'all' && 'الكل'}
                  {r === 'student' && 'الطلاب'}
                  {r === 'teacher' && 'المعلمين'}
                  {r === 'admin' && 'المدراء'}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-bold">
                <tr>
                  <th className="p-3.5">المستخدم</th>
                  <th className="p-3.5">الدور</th>
                  <th className="p-3.5">الصف / التخصص</th>
                  <th className="p-3.5">بيانات الاتصال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات المدير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      لا يوجد مستخدمون مطابقون لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block">{u.fullName}</span>
                            <span className="text-[11px] text-stone-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-block ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-900' 
                            : u.role === 'teacher' 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {u.role === 'admin' && 'مدير المنصة'}
                          {u.role === 'teacher' && 'معلم'}
                          {u.role === 'student' && 'طالب'}
                        </span>
                      </td>

                      <td className="p-3.5 text-stone-700">
                        {u.grade || 'عام'}
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5 text-[11px] text-stone-500">
                          <div className="flex items-center gap-1">
                            <Mail size={12} className="text-stone-400" />
                            <span>{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-stone-400" />
                            <span>{u.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {u.status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          <span>{u.status === 'active' ? 'نشط' : 'معطل'}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="تعديل بيانات الحساب"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            onClick={() => {
                              setResetModalUserId(u.id);
                              setNewPasswordInput('Pass' + Math.floor(1000 + Math.random() * 9000));
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound size={15} />
                          </button>

                          {u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف حساب الطالب/المعلم "${u.fullName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف الحساب"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Courses Management */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-stone-900 font-serif">
                المواد والأقسام الدراسية المعتمدة
              </h3>
              <p className="text-xs text-stone-500">
                يمكن للمدير والمعلمين المعتمدين إنشاء وتعديل مساقات جديدة وتعيين المعلمين المشرفين.
              </p>
            </div>

            <button
              onClick={onOpenTeacherView}
              className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>فتح لوحة بناء المساقات والدروس</span>
              <BookOpen size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="p-5 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
                      {c.subject} • {c.code}
                    </span>
                    <span className="text-xs text-stone-500">{c.grade}</span>
                  </div>
                  <h4 className="text-base font-extrabold text-stone-900">{c.title}</h4>
                  <p className="text-xs text-stone-600 line-clamp-2">{c.description}</p>
                  <p className="text-xs text-stone-500 font-medium">المعلم المشرف: {c.teacherName}</p>
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                  <span>{c.totalLessons} وحدات ودروس</span>
                  <span className="font-bold text-emerald-800">{c.enrolledStudentsCount} طالب مسجل</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System & Security */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-lg font-extrabold text-stone-900 font-serif">
              سياسات الأمان والتحكم في التسجيل
            </h3>
            <p className="text-xs text-stone-500">
              قواعد حماية المنصة وفق تعليمات الأكاديمية الصارمة.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-emerald-950">
                  منع التسجيل المباشر للطلاب (Admin Exclusive Provisioning)
                </h5>
                <p className="text-xs text-emerald-800 leading-relaxed mt-1">
                  ميزة التسجيل الذاتي للطلاب مغلقة تماماً. فقط مدير المنصة يملك صلاحية إنشاء حسابات الطلاب الجدد وتعيين الصف الدراسي وإرسال بيانات الدخول لهم.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
              <Lock size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-amber-950">
                  إعادة تعيين كلمات المرور وتأمين الحسابات
                </h5>
                <p className="text-xs text-amber-800 leading-relaxed mt-1">
                  يمكن للمدير في أي وقت إعادة تعيين كلمة مرور أي طالب أو معلم بنقرة واحدة، وتحديثها فوراً في قاعدة البيانات لمنع فقدان الوصول.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200 space-y-5 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="text-lg font-black text-stone-900 font-serif">
                {editingUserId ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد في المنصة'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الاسم الكامل الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="مثال: يوسف أحمد التميمي"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="مثال: yousef2026"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الدور الوظيفي *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-bold"
                  >
                    <option value="student">طالب (Student)</option>
                    <option value="teacher">معلم (Teacher)</option>
                    <option value="admin">مدير منصة (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@altafawuq.com"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="050-1234567"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الصف الدراسي / التخصص</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="الصف الثاني عشر (بجروت)"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور الأولية *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Pass1234"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {editingUserId ? 'حفظ التعديلات' : 'إنشاء وتأكيد الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 text-right" dir="rtl">
            <h4 className="text-base font-extrabold text-stone-900 font-serif flex items-center gap-2">
              <KeyRound size={18} className="text-amber-600" />
              <span>إعادة تعيين كلمة المرور</span>
            </h4>
            <p className="text-xs text-stone-500">
              أدخل كلمة المرور الجديدة للمستخدم لتحديث وصوله للمنصة:
            </p>

            <input
              type="text"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-amber-600"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setResetModalUserId(null)}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDoResetPassword}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs"
              >
                تأكيد التغيير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
