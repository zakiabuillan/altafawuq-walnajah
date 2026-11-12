import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Filter, Pencil, Trash2, Receipt, Calendar, CreditCard, 
  Wallet, AlertTriangle, CheckCircle2, User, UserCheck, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Download, Printer, RefreshCw,
  Clock, ShieldAlert, Sparkles, Building, Phone
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Student, Teacher, Session, StudentCredit, Payment, formatCustomDate } from '../types';
import { logActivity } from '../lib/activityLogger';
import { generateStudentPaymentReceiptHtml, StudentPaymentReceiptData } from '../lib/studentPaymentReceipt';

interface UnifiedPaymentsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'students' | 'teachers';
  students: Student[];
  teachers: Teacher[];
  sessions: Session[];
  credits: StudentCredit[];
  payments: Payment[];
  setCredits?: React.Dispatch<React.SetStateAction<StudentCredit[]>>;
  setPayments?: React.Dispatch<React.SetStateAction<Payment[]>>;
  setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  onRefreshData?: () => Promise<void>;
}

export default function UnifiedPaymentsManagerModal({
  isOpen,
  onClose,
  initialTab = 'students',
  students,
  teachers,
  sessions,
  credits,
  payments,
  setCredits,
  setPayments,
  setStudents,
  onRefreshData
}: UnifiedPaymentsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  // Editing state for Student Credit
  const [editingCredit, setEditingCredit] = useState<StudentCredit | null>(null);
  const [editCreditAmount, setEditCreditAmount] = useState('');
  const [editCreditDate, setEditCreditDate] = useState('');
  const [editCreditNote, setEditCreditNote] = useState('');
  const [editCreditMethod, setEditCreditMethod] = useState('');
  const [editCreditCategory, setEditCreditCategory] = useState('');
  const [editCreditStudentId, setEditCreditStudentId] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // Editing state for Teacher Payment
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState('');
  const [editPayDate, setEditPayDate] = useState('');
  const [editPayNote, setEditPayNote] = useState('');
  const [editPayTeacherId, setEditPayTeacherId] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Deletion confirm modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'studentCredit' | 'teacherPayment';
    name: string;
    amount: number;
    date: string;
    note?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    desc: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered Student Credits
  const filteredCredits = useMemo(() => {
    return credits.filter(c => {
      if (filterStudentId && c.studentId !== filterStudentId) return false;
      if (startDate && (c.date || '') < startDate) return false;
      if (endDate && (c.date || '') > endDate) return false;
      if (filterMethod && (c.paymentMethod || c.method || '') !== filterMethod) return false;
      
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const student = students.find(s => s.id === c.studentId);
        const stName = student?.name?.toLowerCase() || '';
        const note = (c.note || '').toLowerCase();
        const method = (c.paymentMethod || c.method || '').toLowerCase();
        const category = (c.financialCategory || '').toLowerCase();
        const ref = (c.reference || '').toLowerCase();
        return stName.includes(term) || note.includes(term) || method.includes(term) || category.includes(term) || ref.includes(term);
      }
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [credits, students, filterStudentId, startDate, endDate, filterMethod, searchTerm]);

  // Filtered Teacher Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filterTeacherId && p.teacherId !== filterTeacherId) return false;
      if (startDate && (p.date || '') < startDate) return false;
      if (endDate && (p.date || '') > endDate) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const teacher = teachers.find(t => t.id === p.teacherId);
        const tName = teacher?.name?.toLowerCase() || '';
        const note = (p.note || '').toLowerCase();
        const ref = (p.reference || '').toLowerCase();
        return tName.includes(term) || note.includes(term) || ref.includes(term);
      }
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [payments, teachers, filterTeacherId, startDate, endDate, searchTerm]);

  // Statistics
  const totalCreditsAmount = useMemo(() => {
    return filteredCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [filteredCredits]);

  const totalPaymentsAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  // Open Edit Credit
  const handleOpenEditCredit = (credit: StudentCredit) => {
    setEditingCredit(credit);
    setEditCreditAmount(String(credit.amount || ''));
    setEditCreditDate(credit.date || new Date().toISOString().split('T')[0]);
    setEditCreditNote(credit.note || '');
    setEditCreditMethod(credit.paymentMethod || credit.method || 'نقداً (كاش)');
    setEditCreditCategory(credit.financialCategory || '');
    setEditCreditStudentId(credit.studentId);
  };

  // Submit Edit Credit
  const handleSaveEditCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredit || !editCreditAmount || Number(editCreditAmount) <= 0 || !editCreditDate || !editCreditStudentId) {
      showToast('خطأ في البيانات', 'يرجى إدخال مبلغ صحيح وتاريخ واسم الطالب.', 'error');
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const updatedAmount = parseFloat(editCreditAmount);
      const oldAmount = Number(editingCredit.amount || 0);
      const oldStudentId = editingCredit.studentId;
      const targetStudentId = editCreditStudentId;
      const originalStudent = students.find(s => s.id === oldStudentId);
      const newStudent = students.find(s => s.id === targetStudentId);
      const creditRef = doc(db, 'studentCredits', editingCredit.id);

      const updatePayload: any = {
        amount: updatedAmount,
        date: editCreditDate,
        note: editCreditNote.trim(),
        paymentMethod: editCreditMethod,
        method: editCreditMethod,
        ...(editCreditCategory ? { financialCategory: editCreditCategory } : {})
      };

      if (targetStudentId !== oldStudentId) {
        updatePayload.studentId = targetStudentId;
      }

      await updateDoc(creditRef, updatePayload);

      // Update local credits state
      if (setCredits) {
        setCredits(prev => prev.map(c => c.id === editingCredit.id ? { ...c, ...updatePayload } : c));
      }

      // Synchronize students balance in Firestore
      if (setStudents) {
        if (targetStudentId === oldStudentId) {
          const diff = updatedAmount - oldAmount;
          if (originalStudent && diff !== 0) {
            const currentBal = typeof originalStudent.balance === 'number' ? originalStudent.balance : 0;
            const newBal = Number((currentBal + diff).toFixed(2));
            updateDoc(doc(db, 'students', oldStudentId), { balance: newBal, updatedAt: new Date().toISOString() }).catch(console.warn);
            setStudents(prev => prev.map(s => s.id === oldStudentId ? { ...s, balance: newBal } : s));
          }
        } else {
          // Changed target student: revert old student, add to new student
          if (originalStudent) {
            const currentOldBal = typeof originalStudent.balance === 'number' ? originalStudent.balance : 0;
            const newOldBal = Number((currentOldBal - oldAmount).toFixed(2));
            updateDoc(doc(db, 'students', oldStudentId), { balance: newOldBal, updatedAt: new Date().toISOString() }).catch(console.warn);
            setStudents(prev => prev.map(s => s.id === oldStudentId ? { ...s, balance: newOldBal } : s));
          }
          if (newStudent) {
            const currentNewBal = typeof newStudent.balance === 'number' ? newStudent.balance : 0;
            const newNewBal = Number((currentNewBal + updatedAmount).toFixed(2));
            updateDoc(doc(db, 'students', targetStudentId), { balance: newNewBal, updatedAt: new Date().toISOString() }).catch(console.warn);
            setStudents(prev => prev.map(s => s.id === targetStudentId ? { ...s, balance: newNewBal } : s));
          }
        }
      }

      await logActivity({
        actionType: 'UPDATE_CREDIT',
        actionName: 'تعديل دفعة رصيد طالب',
        details: `قام مدير المنصة بتعديل دفعة رصيد الطالب "${newStudent?.name || originalStudent?.name}" بقيمة: ₪${updatedAmount} (السابق: ₪${oldAmount}) وتاريخ: ${editCreditDate}، طريقة: ${editCreditMethod}`,
        amount: updatedAmount
      });

      showToast('تم حفظ التعديل بنجاح', `تم تعديل دفعة الطالب بقيمة ₪${updatedAmount} وتحديث الرصيد فورياً.`);
      setEditingCredit(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error updating student credit:', err);
      showToast('تعذر حفظ التعديل', err?.message || 'حدث خطأ أثناء تعديل الدفعة في قاعدة البيانات.', 'error');
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Open Edit Teacher Payment
  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPayAmount(payment.amount !== undefined ? String(payment.amount) : '');
    setEditPayDate(payment.date || new Date().toISOString().split('T')[0]);
    setEditPayNote(payment.note || '');
    setEditPayTeacherId(payment.teacherId || '');
  };

  // Submit Edit Teacher Payment
  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editPayAmount || Number(editPayAmount) <= 0 || !editPayDate || !editPayTeacherId) {
      showToast('خطأ في البيانات', 'يرجى إدخال مبلغ صحيح وتاريخ واسم المعلم.', 'error');
      return;
    }

    setIsSubmittingPay(true);
    try {
      const updatedAmount = Number(editPayAmount);
      const oldAmount = Number(editingPayment.amount || 0);
      const targetTeacherId = editPayTeacherId;
      const targetTeacher = teachers.find(t => t.id === targetTeacherId);
      const pNote = editPayNote.trim() || 'صرف مستحقات المعلم';
      const paymentRef = doc(db, 'payments', editingPayment.id);

      const updatePayload = {
        amount: updatedAmount,
        date: editPayDate,
        note: pNote,
        teacherId: targetTeacherId
      };

      await updateDoc(paymentRef, updatePayload);

      if (setPayments) {
        setPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...p, ...updatePayload } : p));
      }

      await logActivity({
        actionType: 'PAYMENT_UPDATE',
        actionName: 'تعديل دفعة معلم',
        details: `قام مدير المنصة بتعديل الدفعة المالية للمدرس "${targetTeacher?.name || 'مجهول'}" بقيمة: ₪${updatedAmount} (السابق: ₪${oldAmount}) وتاريخ: ${editPayDate} بملاحظة: "${pNote}"`
      });

      showToast('تم حفظ التعديل بنجاح', `تم تعديل دفعة المعلم بقيمة ₪${updatedAmount} وتحديث السجلات المحاسبية فورياً.`);
      setEditingPayment(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error updating teacher payment:', err);
      showToast('تعذر حفظ التعديل', err?.message || 'حدث خطأ أثناء تعديل الدفعة.', 'error');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'studentCredit') {
        const creditId = deleteConfirm.id;
        const originalCredit = credits.find(c => c.id === creditId);
        const studentObj = students.find(s => s.id === originalCredit?.studentId);
        const amount = deleteConfirm.amount;

        await deleteDoc(doc(db, 'studentCredits', creditId));
        
        if (setCredits) {
          setCredits(prev => prev.filter(c => c.id !== creditId));
        }

        // Adjust student balance
        if (studentObj && setStudents) {
          const currentBal = typeof studentObj.balance === 'number' ? studentObj.balance : 0;
          const newBal = Number((currentBal - amount).toFixed(2));
          updateDoc(doc(db, 'students', studentObj.id), { balance: newBal, updatedAt: new Date().toISOString() }).catch(console.warn);
          setStudents(prev => prev.map(s => s.id === studentObj.id ? { ...s, balance: newBal } : s));
        }

        await logActivity({
          actionType: 'DELETE_CREDIT',
          actionName: 'حذف دفعة رصيد طالب',
          details: `قام مدير المنصة بحذف دفعة رصيد الطالب "${deleteConfirm.name}" بقيمة: ₪${amount} (رقم الحركة: ${creditId})`,
          amount: -amount
        });

        showToast('تم حذف الدفعة بنجاح', `تم حذف دفعة الطالب (₪${amount}) وخصمها من رصيد محفظته.`);
      } else {
        const paymentId = deleteConfirm.id;
        await deleteDoc(doc(db, 'payments', paymentId));

        if (setPayments) {
          setPayments(prev => prev.filter(p => p.id !== paymentId));
        }

        await logActivity({
          actionType: 'PAYMENT_DELETE',
          actionName: 'حذف دفعة معلم',
          details: `قام مدير المنصة بحذف الدفعة المالية للمدرس "${deleteConfirm.name}" بقيمة: ₪${deleteConfirm.amount} (رقم الحركة: ${paymentId})`
        });

        showToast('تم حذف الدفعة بنجاح', `تم حذف الدفعة المالية للمعلم (₪${deleteConfirm.amount}) وإلغاء إثبات الصرف.`);
      }

      setDeleteConfirm(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      showToast('تعذر الحذف', err?.message || 'حدث خطأ أثناء حذف الدفعة من قاعدة البيانات.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate Receipt for Student Credit
  const handlePrintReceipt = (credit: StudentCredit) => {
    const student = students.find(s => s.id === credit.studentId);
    if (!student) {
      showToast('تعذر الطباعة', 'بيانات الطالب غير موجودة.', 'error');
      return;
    }

    const receiptData: StudentPaymentReceiptData = {
      receiptNumber: `REC-${(credit.date || '').replace(/-/g, '')}-${credit.id.slice(0, 4).toUpperCase()}`,
      receiptDate: credit.date || new Date().toISOString().split('T')[0],
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone || student.parentPhone || '',
      studentGrade: student.grade || 'غير محدد',
      parentName: student.parentName || `ولي أمر الطالب/ة ${student.name}`,
      amount: credit.amount,
      currency: 'شيكل جديد ₪',
      paymentMethod: credit.paymentMethod || credit.method || 'نقداً (كاش)',
      serviceName: credit.serviceName || 'شحن رصيد المحفظة التعليمية',
      note: credit.note || 'دفعة تعليمية معتمدة من إدارة أكاديمية التفوق',
      previousBalance: typeof student.balance === 'number' ? student.balance - credit.amount : undefined,
      newBalance: typeof student.balance === 'number' ? student.balance : undefined,
      cashierName: 'مدير النظام المالي',
      managerName: 'إدارة أكاديمية التفوق',
      academyName: 'أكاديمية التفوق التعليمية أونلاين',
      centerPhone: '0590000000',
      centerEmail: 'finance@tafawwaq.edu'
    };

    const html = generateStudentPaymentReceiptHtml(receiptData);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      showToast('تنبيه المتصفح', 'يرجى السماح بالنوافذ المنبثقة لطباعة سند القبض.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto" dir="rtl">
      {/* Toast Alert Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-400' 
                : 'bg-rose-600 text-white border-rose-400'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <p className="font-black text-sm">{toastMessage.title}</p>
              <p className="text-xs opacity-90">{toastMessage.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[92vh] text-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-150 bg-gradient-to-l from-slate-900 via-slate-850 to-[#0A192F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">إدارة وتعديل الدفعات المالية</h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  لوحة تحكم المدير
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                تعديل وحذف ومراقبة كافة دفعات الطلاب وشحن المحافظ ومستحقات وصرفيات المعلمين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshData && (
              <button
                type="button"
                onClick={() => onRefreshData()}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 transition-all cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Quick Stats */}
        <div className="px-6 py-4 md:px-8 border-b border-slate-150 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex bg-slate-200/80 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard size={16} className={activeTab === 'students' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>دفعات ومقبوضات الطلاب</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {credits.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'teachers'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet size={16} className={activeTab === 'teachers' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>صرفيات ومستحقات المعلمين</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {payments.length}
              </span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            {activeTab === 'students' ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-2xl">
                <TrendingUp size={16} className="text-emerald-600" />
                <div className="text-right">
                  <span className="text-[9px] font-black text-emerald-800 uppercase block">إجمالي المقبوضات المعروضة</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">₪{totalCreditsAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 px-4 py-2 rounded-2xl">
                <DollarSign size={16} className="text-indigo-600" />
                <div className="text-right">
                  <span className="text-[9px] font-black text-indigo-800 uppercase block">إجمالي المصروفات المعروضة</span>
                  <span className="text-sm font-black text-indigo-700 font-mono">₪{totalPaymentsAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3.5 md:px-8 border-b border-slate-150 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'students' ? 'بحث باسم الطالب، البيان، الرمز...' : 'بحث باسم المعلم، البيان...'}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C] outline-none"
            />
          </div>

          {/* User Filter Dropdown */}
          {activeTab === 'students' ? (
            <select
              value={filterStudentId}
              onChange={e => setFilterStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C] outline-none"
            >
              <option value="">جميع الطلاب ({students.length})</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={filterTeacherId}
              onChange={e => setFilterTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C] outline-none"
            >
              <option value="">جميع المعلمين ({teachers.length})</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Date Range Start */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-transparent text-xs font-bold outline-none text-slate-700"
            />
          </div>

          {/* Date Range End & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex-1">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-transparent text-xs font-bold outline-none text-slate-700"
              />
            </div>
            {(searchTerm || startDate || endDate || filterStudentId || filterTeacherId || filterMethod) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  setFilterStudentId('');
                  setFilterTeacherId('');
                  setFilterMethod('');
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="إعادة تعيين الفلاتر"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content Body / Scrollable Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          {activeTab === 'students' ? (
            /* STUDENT PAYMENTS / CREDITS TABLE */
            filteredCredits.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <CreditCard size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                <h4 className="text-base font-black text-slate-700">لم يتم العثور على أي دفعات طلاب</h4>
                <p className="text-xs text-slate-400 mt-1">جرب تغيير كلمات البحث أو إعادة ضبط فلاتر التاريخ والطلاب.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3.5 font-black text-slate-400 text-center w-12">#</th>
                      <th className="p-3.5 font-black text-slate-700">اسم الطالب</th>
                      <th className="p-3.5 font-black text-slate-700 text-center">المبلغ المشحون</th>
                      <th className="p-3.5 font-black text-slate-700">تاريخ الدفعة</th>
                      <th className="p-3.5 font-black text-slate-700">طريقة الدفع / التصنيف</th>
                      <th className="p-3.5 font-black text-slate-700">البيان والملاحظات</th>
                      <th className="p-3.5 font-black text-slate-700 text-center w-36">إجراءات المدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCredits.map((credit, idx) => {
                      const student = students.find(s => s.id === credit.studentId);
                      return (
                        <tr key={credit.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-[11px] shrink-0">
                                {student?.name ? student.name.charAt(0) : '؟'}
                              </div>
                              <div>
                                <p className="font-black text-xs text-slate-900 leading-tight">{student?.name || 'طالب مجهول'}</p>
                                <span className="text-[9px] text-slate-400 font-mono">{student?.phone || credit.studentId.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-emerald-600 bg-emerald-50/30">
                            +₪{Number(credit.amount || 0).toFixed(1)}
                          </td>
                          <td className="p-3.5 font-bold text-slate-600 whitespace-nowrap">
                            {formatCustomDate(credit.date)}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {credit.paymentMethod || credit.method || 'نقداً'}
                              </span>
                              {credit.financialCategory && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  {credit.financialCategory}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={credit.note || ''}>
                            {credit.note || <span className="text-slate-350 italic">شحن رصيد محفظة</span>}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print Receipt */}
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(credit)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                                title="طباعة سند قبض مالي رسمي (PDF)"
                              >
                                <Receipt size={14} />
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCredit(credit)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-[#D4A33C] hover:text-slate-950 transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="تعديل تفاصيل وقيمة الدفعة"
                              >
                                <Pencil size={13} />
                                <span>تعديل</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({
                                  id: credit.id,
                                  type: 'studentCredit',
                                  name: student?.name || 'طالب مجهول',
                                  amount: credit.amount,
                                  date: credit.date || '',
                                  note: credit.note
                                })}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="حذف الدفعة"
                              >
                                <Trash2 size={13} />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TEACHER PAYOUTS TABLE */
            filteredPayments.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Wallet size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                <h4 className="text-base font-black text-slate-700">لم يتم العثور على أي صرفيات للمعلمين</h4>
                <p className="text-xs text-slate-400 mt-1">جرب تغيير كلمات البحث أو إعادة ضبط فلاتر التاريخ والمعلمين.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3.5 font-black text-slate-400 text-center w-12">#</th>
                      <th className="p-3.5 font-black text-slate-700">اسم المعلم المستفيد</th>
                      <th className="p-3.5 font-black text-slate-700 text-center">المبلغ المسلم</th>
                      <th className="p-3.5 font-black text-slate-700">تاريخ الصرف</th>
                      <th className="p-3.5 font-black text-slate-700">البيان والملاحظات</th>
                      <th className="p-3.5 font-black text-slate-700 text-center w-36">إجراءات المدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((payment, idx) => {
                      const teacher = teachers.find(t => t.id === payment.teacherId);
                      return (
                        <tr key={payment.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-[11px] shrink-0">
                                {teacher?.name ? teacher.name.charAt(0) : '؟'}
                              </div>
                              <div>
                                <p className="font-black text-xs text-slate-900 leading-tight">{teacher?.name || 'معلم مجهول'}</p>
                                <span className="text-[9px] text-slate-400 font-mono">{teacher?.subject || payment.teacherId?.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-indigo-700 bg-indigo-50/30">
                            ₪{Number(payment.amount || 0).toFixed(1)}
                          </td>
                          <td className="p-3.5 font-bold text-slate-600 whitespace-nowrap">
                            {formatCustomDate(payment.date)}
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-[250px] truncate" title={payment.note || ''}>
                            {payment.note || <span className="text-slate-350 italic">صرف مستحقات المعلم</span>}
                            {payment.archived && (
                              <span className="mr-2 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[8px] font-black">مؤرشفة</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditPayment(payment)}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-[#D4A33C] hover:text-slate-950 transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="تعديل تفاصيل وقيمة دفعة المعلم"
                              >
                                <Pencil size={13} />
                                <span>تعديل</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({
                                  id: payment.id,
                                  type: 'teacherPayment',
                                  name: teacher?.name || 'معلم مجهول',
                                  amount: payment.amount || 0,
                                  date: payment.date || '',
                                  note: payment.note
                                })}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="حذف الدفعة"
                              >
                                <Trash2 size={13} />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 md:px-8 border-t border-slate-150 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-bold shrink-0">
          <span>
            {activeTab === 'students' 
              ? `عرض ${filteredCredits.length} من إجمالي ${credits.length} دفعة طالب`
              : `عرض ${filteredPayments.length} من إجمالي ${payments.length} دفعة معلم`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs transition-all cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>

      {/* EDIT STUDENT CREDIT MODAL */}
      <AnimatePresence>
        {editingCredit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6 text-right"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">تعديل دفعة رصيد الطالب 💳</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">تعديل المبلغ أو التاريخ أو تحويلها لطالب آخر</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCredit(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditCredit} className="space-y-4">
                {/* Target Student Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الطالب المستفيد من الدفعة:</label>
                  <select
                    value={editCreditStudentId}
                    onChange={e => setEditCreditStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    required
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone || 'بدون هاتف'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ المشحون (₪):</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={editCreditAmount}
                      onChange={e => setEditCreditAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm text-emerald-600 outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ الدفعة:</label>
                    <input
                      type="date"
                      required
                      value={editCreditDate}
                      onChange={e => setEditCreditDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">طريقة الدفع:</label>
                    <select
                      value={editCreditMethod}
                      onChange={e => setEditCreditMethod(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    >
                      <option value="نقداً (كاش)">نقداً (كاش)</option>
                      <option value="حوالة بنكية">حوالة بنكية</option>
                      <option value="بطاقة ائتمان (فيزا)">بطاقة ائتمان (فيزا)</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  {/* Financial Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">التصنيف المالي:</label>
                    <input
                      type="text"
                      value={editCreditCategory}
                      onChange={e => setEditCreditCategory(e.target.value)}
                      placeholder="رسوم باقة، أقساط، عام..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">البيان والملاحظات:</label>
                  <textarea
                    rows={2}
                    value={editCreditNote}
                    onChange={e => setEditCreditNote(e.target.value)}
                    placeholder="ملاحظات المحاسب أو سند القبض..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingCredit}
                    className="flex-1 py-3 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingCredit ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    <span>حفظ التعديلات وتحديث الرصيد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCredit(null)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TEACHER PAYMENT MODAL */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6 text-right"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">تعديل الدفعة المالية للمعلم 💸</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">تعديل المبلغ المسلم أو التاريخ أو المعلم المستفيد</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditPayment} className="space-y-4">
                {/* Target Teacher Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">المعلم المستفيد:</label>
                  <select
                    value={editPayTeacherId}
                    onChange={e => setEditPayTeacherId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subject || 'معلم'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ المصروف (₪):</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={editPayAmount}
                      onChange={e => setEditPayAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ الصرف:</label>
                    <input
                      type="date"
                      required
                      value={editPayDate}
                      onChange={e => setEditPayDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">البيان وملاحظة الصرف:</label>
                  <textarea
                    rows={2}
                    value={editPayNote}
                    onChange={e => setEditPayNote(e.target.value)}
                    placeholder="مثال: صرف مستحقات الحصص المنفذة لشهر مايو..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingPay}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingPay ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    <span>حفظ تعديلات الدفعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6 text-right"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {deleteConfirm.type === 'studentCredit' ? 'تأكيد حذف دفعة الطالب ⚠️' : 'تأكيد حذف دفعة المعلم ⚠️'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">إجراء إداري دقيق ينعكس على السجلات المحاسبية فوراً</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">{deleteConfirm.type === 'studentCredit' ? 'اسم الطالب:' : 'اسم المعلم:'}</span>
                  <span className="font-black text-slate-900">{deleteConfirm.name}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-bold">المبلغ المسجل:</span>
                  <span className="font-mono font-black text-rose-600 text-sm">₪{Number(deleteConfirm.amount).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-bold">التاريخ:</span>
                  <span className="font-mono font-bold text-slate-700">{formatCustomDate(deleteConfirm.date)}</span>
                </div>
                {deleteConfirm.note && (
                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500 font-bold block mb-1">البيان:</span>
                    <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/40 text-[11px]">{deleteConfirm.note}</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold leading-relaxed">
                {deleteConfirm.type === 'studentCredit'
                  ? 'تنبيه: سيتم خصم هذا المبلغ من رصيد محفظة الطالب تلقائياً وإلغاء سند القبض نهائياً.'
                  : 'تنبيه: سيتم إلغاء قيد هذا الصرف المالي وإعادته كذمة مستحقة على المركز لصالح المعلم.'}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Clock className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  <span>تأكيد الحذف نهائياً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
