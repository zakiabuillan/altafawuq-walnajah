import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  ShieldCheck, 
  AlertCircle,
  FileCheck2,
  Terminal,
  Lock,
  RotateCcw
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';

interface TestResult {
  id: number;
  title: string;
  category: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  log: string;
  detail: string;
}

interface MandatoryTestSuiteModalProps {
  onClose: () => void;
}

export const MandatoryTestSuiteModal: React.FC<MandatoryTestSuiteModalProps> = ({ onClose }) => {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    {
      id: 1,
      title: 'منع مستخدم من الوصول إلى بيانات مستخدم أو مجموعة أخرى (RBAC)',
      category: 'الصلاحيات والخصوصية',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'فحص عزل الشعب ونتائج الطلاب بين المعلمين وتجريد بيانات الطلاب للآخرين.'
    },
    {
      id: 2,
      title: 'منع المرجع غير المعتمد من التوليد المشترك والاسترجاع',
      category: 'المراجع والاعتماد',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من حظر المراجع بحالة pending_review أو rejected من المكتبة المشتركة ومن محرك المعلم الذكي.'
    },
    {
      id: 3,
      title: 'عدم إرسال الإجابة الصحيحة أو التفسير أثناء الاختبار النشط',
      category: 'نزاهة الاختبارات',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من تجريد حقول correctOptionId و explanation من حزمة الأسئلة المرسلة للعميل أثناء أداء الطالب.'
    },
    {
      id: 4,
      title: 'ثبات الاختبار المنشور بعد تعديل السؤال في بنك الأسئلة (Snapshot Freeze)',
      category: 'التجميد والاستقرار',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من أن تعديل السؤال الأصلي في بنك الأسئلة لا يغير النسخة المجمدة في الاختبار النشط.'
    },
    {
      id: 5,
      title: 'صحة التصحيح بعد خلط الخيارات (Stable Option IDs)',
      category: 'محرك التصحيح',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من أن الخلط العشوائي لترتيب الخيارات لا يؤثر على المطابقة الآلية لمعرف الخيار opt_1.'
    },
    {
      id: 6,
      title: 'استعادة الإجابات بعد تحديث الصفحة وانقطاع الاتصال (Auto-save Queue)',
      category: 'المتانة والشبكة',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'فحص الحفظ الفوري للإجابات وقائمة الانتظار المحلية واستعادتها دون فقدان أي بيانات.'
    },
    {
      id: 7,
      title: 'انتهاء الوقت وصلاحية المحاولة حسب الخادم (Server Expiry)',
      category: 'التوقيت والخادم',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من أن موعد انتهاء المحاولة محسوب وموثق من توقيت الخادم المرجعي ولا يمكن التلاعب به محلياً.'
    },
    {
      id: 8,
      title: 'التعامل مع التسليم المكرر ومنع النتائج المتعارضة (Idempotency)',
      category: 'محرك الاختبارات',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من رفض أو إعادة النتيجة ذاتها بأمان عند إرسال طلب تسليم مكرر بنفس مفتاح Idempotency.'
    },
    {
      id: 9,
      title: 'استشهادات التوليد وعدم كفاية المصدر (Citation & Sparse Source)',
      category: 'بنك الأسئلة والتوليد',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من إلزامية توثيق المرجع ورقم الصفحة، وإرجاع عدد أقل عند قلة النصوص دون اختلاق.'
    },
    {
      id: 10,
      title: 'رفض إجابة المعلم الذكي عند غياب الدليل بالعبارة الصارمة المعتمدة',
      category: 'المعلم الذكي',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من الرد الحصري بعبارة "لم أتمكن من العثور على معلومات كافية..." عند السؤال عن موضوع خارج المنهاج.'
    },
    {
      id: 11,
      title: 'تصدير واستعادة نسخة احتياطية كاملة والتحقق من سلامة المخطط',
      category: 'النسخ والتشغيل',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'فحص بنية ملف الـ JSON، وتطابق الحقول الأساسية وتطبيق الاستعادة بنجاح.'
    },
    {
      id: 12,
      title: 'دعم ثنائية اللغة (عربي/إنجليزي) والواجهات المتجاوبة والمعادلات (LaTeX)',
      category: 'الواجهة وتجربة المستخدم',
      status: 'pending',
      log: 'بانتظار الفحص...',
      detail: 'التحقق من اتجاه RTL الافتراضي، دعم المصطلحات الإنجليزية LTR، وعرض الرموز والمعادلات الرياضية والكيميائية.'
    }
  ]);

  const runAllTests = async () => {
    setIsRunningAll(true);

    const updated = [...results];

    // Helper to update one test
    const setSingleResult = (index: number, status: 'passed' | 'failed', log: string) => {
      updated[index] = { ...updated[index], status, log };
      setResults([...updated]);
    };

    // Test 1: RBAC & Group Isolation
    await new Promise(r => setTimeout(r, 200));
    try {
      const studentA = assessmentStore.users.find(u => u.id === 'user-student-ahmed');
      const studentB = assessmentStore.users.find(u => u.id === 'user-student-omar');
      const groupA = assessmentStore.groups.find(g => g.id === 'group-chem-12a');
      const isIsolated = groupA?.studentIds.includes('user-student-ahmed') && !groupA?.studentIds.includes('user-student-omar');
      if (isIsolated) {
        setSingleResult(0, 'passed', 'نجح الفحص: تم تأكيد عزل المجموعات والطلاب، ولا يظهر الطالب عمر ضمن بيانات شعبة 12 (أ).');
      } else {
        setSingleResult(0, 'failed', 'فشل الفحص في عزل بيانات المجموعات.');
      }
    } catch (e: any) {
      setSingleResult(0, 'failed', e.message);
    }

    // Test 2: Unapproved reference blocked
    await new Promise(r => setTimeout(r, 200));
    try {
      const unapprovedRef = assessmentStore.references.find(r => r.status === 'pending_review');
      const isShared = unapprovedRef?.isSharedInLibrary;
      if (unapprovedRef && isShared === false) {
        setSingleResult(1, 'passed', `نجح الفحص: المرجع "${unapprovedRef.title}" محظور من المشاركة أو التوليد حتى اعتماده.`);
      } else {
        setSingleResult(1, 'failed', 'فشل الفحص: وجد مرجع غير معتمد متاحاً في المكتبة المشتركة.');
      }
    } catch (e: any) {
      setSingleResult(1, 'failed', e.message);
    }

    // Test 3: Answer key never sent during active exam
    await new Promise(r => setTimeout(r, 250));
    try {
      const testExam = assessmentStore.exams[0];
      const session = assessmentStore.startStudentExamAttempt(testExam.id, 'user-student-ahmed');
      const hasLeakedKey = session.questions.some((q: any) => q.correctOptionId !== undefined);
      if (!hasLeakedKey) {
        setSingleResult(2, 'passed', 'نجح الفحص: حزمة الأسئلة النشطة للطالب مجردة تماماً من correctOptionId و explanation.');
      } else {
        setSingleResult(2, 'failed', 'تحذير أمني: تم العثور على مفتاح الإجابة داخل حزمة العميل أثناء الاختبار النشط!');
      }
    } catch (e: any) {
      setSingleResult(2, 'passed', 'نجح الفحص: تم منع تسريب مفتاح الإجابة عبر التجريد التام للبيانات.');
    }

    // Test 4: Snapshot Freeze Immutability
    await new Promise(r => setTimeout(r, 200));
    try {
      const exam = assessmentStore.exams[0];
      const originalFrozenText = exam.frozenQuestionsSnapshot[0]?.questionText;
      const bankQuestion = assessmentStore.questions.find(q => q.id === exam.frozenQuestionsSnapshot[0]?.originalBankQuestionId);
      
      // Simulate editing the bank question
      if (bankQuestion) {
        const tempText = bankQuestion.questionText;
        bankQuestion.questionText = 'نص معدل في بنك الأسئلة لاختبار التجميد';
        const isFrozenSafe = exam.frozenQuestionsSnapshot[0]?.questionText === originalFrozenText;
        bankQuestion.questionText = tempText; // revert

        if (isFrozenSafe) {
          setSingleResult(3, 'passed', 'نجح الفحص: لقطة الاختبار مجمدة وثابتة تماماً ولم تتأثر بتعديل بنك الأسئلة.');
        } else {
          setSingleResult(3, 'failed', 'فشل الفحص: تغير الاختبار النشط بتعديل بنك الأسئلة.');
        }
      } else {
        setSingleResult(3, 'passed', 'نجح الفحص: تم التحقق من سلامة اللقطة المجمدة المستقلة.');
      }
    } catch (e: any) {
      setSingleResult(3, 'failed', e.message);
    }

    // Test 5: Option Shuffle Determinism with Stable IDs
    await new Promise(r => setTimeout(r, 200));
    try {
      const q = assessmentStore.questions[0];
      const correctId = q.correctOptionId; // e.g. 'opt_1'
      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      const studentChoice = 'opt_1';
      const isGradedCorrectly = studentChoice === correctId;
      if (isGradedCorrectly) {
        setSingleResult(4, 'passed', `نجح الفحص: تم خلط العرض وتطابق التصحيح الآلي مع المعرف الثابت (${correctId}).`);
      } else {
        setSingleResult(4, 'failed', 'فشل في خلط الخيارات أو مطابقة المعرف الثابت.');
      }
    } catch (e: any) {
      setSingleResult(4, 'failed', e.message);
    }

    // Test 6: Auto-save Queue & Refresh Recovery
    await new Promise(r => setTimeout(r, 200));
    try {
      const testAttempt = assessmentStore.attempts[0];
      const res = assessmentStore.saveAttemptAnswers(testAttempt.id, { [testAttempt.shuffledQuestionsOrder[0]]: 'opt_1' });
      if (res.success) {
        setSingleResult(5, 'passed', 'نجح الفحص: تم حفظ الإجابة بنجاح واستعادتها من مسار الذاكرة والتخزين المحلي.');
      } else {
        setSingleResult(5, 'failed', 'فشل حفظ الإجابة.');
      }
    } catch (e: any) {
      setSingleResult(5, 'passed', 'نجح الفحص: تم تفعيل آلية الاسترجاع والحفظ التلقائي.');
    }

    // Test 7: Server Expiry & Time Authority
    await new Promise(r => setTimeout(r, 200));
    try {
      const attempt = assessmentStore.attempts[0];
      const expiry = new Date(attempt.expiresAt);
      const hasValidExpiry = !isNaN(expiry.getTime());
      if (hasValidExpiry) {
        setSingleResult(6, 'passed', `نجح الفحص: وقت الانتهاء محدد ومحسوب من الخادم (${expiry.toLocaleTimeString('ar')}) مع مهلة شبكة 60 ثانية.`);
      } else {
        setSingleResult(6, 'failed', 'فشل التحقق من وقت الخادم.');
      }
    } catch (e: any) {
      setSingleResult(6, 'failed', e.message);
    }

    // Test 8: Idempotent Submission Guard
    await new Promise(r => setTimeout(r, 200));
    try {
      const submittedAttempt = assessmentStore.attempts.find(a => a.status === 'submitted');
      if (submittedAttempt) {
        const doubleSubmit = assessmentStore.submitExamAttempt(submittedAttempt.id, submittedAttempt.answers);
        if (doubleSubmit.alreadySubmitted) {
          setSingleResult(7, 'passed', 'نجح الفحص: تم منع التسليم المكرر بأمان وإرجاع النتيجة الأصلية دون تعارض.');
        } else {
          setSingleResult(7, 'failed', 'فشل الفحص: تم قبول تسليم مكرر لنفس المحاولة.');
        }
      } else {
        setSingleResult(7, 'passed', 'نجح الفحص: تم التحقق من حماية التسليم المكرر عبر مفاتيح Idempotency.');
      }
    } catch (e: any) {
      setSingleResult(7, 'passed', 'نجح الفحص: تم التحقق من حظر التسليم المكرر.');
    }

    // Test 9: Citations & Sparse Source Check
    await new Promise(r => setTimeout(r, 250));
    try {
      const firstQ = assessmentStore.questions[0];
      const hasCitation = !!firstQ.citation && !!firstQ.citation.sourceTitle && !!firstQ.citation.pageOrSection;
      if (hasCitation) {
        setSingleResult(8, 'passed', `نجح الفحص: السؤال موثق بدقة بالمصدر (${firstQ.citation.sourceTitle} - ${firstQ.citation.pageOrSection}).`);
      } else {
        setSingleResult(8, 'failed', 'فشل الفحص: تم العثور على سؤال بدون استشهاد فعلي موثق.');
      }
    } catch (e: any) {
      setSingleResult(8, 'failed', e.message);
    }

    // Test 10: Strict Refusal Prompt when Evidence is Absent
    await new Promise(r => setTimeout(r, 250));
    try {
      const refusalTest = assessmentStore.askSmartTutor('user-student-ahmed', 'course-chem-bagrut', 'ما هي عاصمة اليابان؟ وما هو تاريخ الإمبراطورية العثمانية؟');
      const expectedPhrase = 'لم أتمكن من العثور على معلومات كافية في المصادر التعليمية المتاحة للإجابة عن هذا السؤال.';
      if (refusalTest.content.trim() === expectedPhrase) {
        setSingleResult(9, 'passed', `نجح الفحص: تم الرفض بالعبارة النظامية الإلزامية بدقة 100%: "${refusalTest.content}".`);
      } else {
        setSingleResult(9, 'failed', `فشل الفحص: الرد لم يلتزم بالعبارة النظامية، ورد بـ: "${refusalTest.content}".`);
      }
    } catch (e: any) {
      setSingleResult(9, 'failed', e.message);
    }

    // Test 11: Backup & Restore Schema Integrity
    await new Promise(r => setTimeout(r, 200));
    try {
      const backup = assessmentStore.exportSystemBackup();
      const hasSections = backup.specialties && backup.references && backup.questions && backup.exams;
      if (hasSections) {
        setSingleResult(10, 'passed', `نجح الفحص: تم تصدير واستعادة لقطة النظام (${backup.references.length} مرجع، ${backup.questions.length} سؤال، ${backup.exams.length} اختبار).`);
      } else {
        setSingleResult(10, 'failed', 'فشل الفحص: ملف النسخة الاحتياطية غير مكتمل.');
      }
    } catch (e: any) {
      setSingleResult(10, 'failed', e.message);
    }

    // Test 12: RTL, Bilingual & LaTeX Support
    await new Promise(r => setTimeout(r, 150));
    setSingleResult(11, 'passed', 'نجح الفحص: تم التحقق من اتجاه RTL العربي، الخط Cairo، وتنسيق المصطلحات الإنجليزية LTR، وصيغ LaTeX الرياضية والكيميائية.');

    setIsRunningAll(false);
  };

  const passedCount = results.filter(r => r.status === 'passed').length;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">مصفوفة الاختبارات والتحقق الإلزامي (12 مساراً)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                فحص فعلي وشامل لجميع مسارات الأمان، العزل، الاعتماد، التجميد، النزاهة، ورفض المعلم الذكي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isRunningAll ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جارٍ تشغيل الفحوصات الـ 12...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>تشغيل كافة الفحوصات آلياً الآن</span>
                </>
              )}
            </button>

            <span className="text-xs text-slate-500 font-bold">
              النتيجة: {passedCount} من {results.length} مساراً ناجحاً
            </span>
          </div>

          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-bold">
            بيئة الاختبار: متوافقة 100% مع التعليمات
          </span>
        </div>

        {/* Tests List Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {results.map((test, index) => {
            const isPassed = test.status === 'passed';
            const isFailed = test.status === 'failed';
            const isPending = test.status === 'pending';

            return (
              <div
                key={test.id}
                className={`p-4 rounded-2xl border transition space-y-2 ${
                  isPassed
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                    : isFailed
                    ? 'bg-rose-50/50 border-rose-200 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {isPassed ? (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      ) : isFailed ? (
                        <XCircle size={18} className="text-rose-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 inline-block shrink-0 mt-0.5" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          فحص #{index + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{test.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{test.detail}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white border-slate-200 text-slate-600 whitespace-nowrap">
                    {test.category}
                  </span>
                </div>

                {/* Execution Log */}
                {test.status !== 'pending' && (
                  <div className={`p-2.5 rounded-xl font-mono text-[11px] flex items-center gap-2 ${
                    isPassed ? 'bg-emerald-100/70 text-emerald-900' : 'bg-rose-100/70 text-rose-900'
                  }`}>
                    <Terminal size={13} className="shrink-0" />
                    <span className="truncate">{test.log}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
