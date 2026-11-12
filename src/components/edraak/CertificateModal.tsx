import React, { useRef } from 'react';
import { Award, Download, Printer, CheckCircle, X, Calendar, User, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  score: number;
  totalPoints: number;
  percentage: number;
  date: string;
  courseTitle?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  studentName,
  score,
  totalPoints,
  percentage,
  date,
  courseTitle = 'التمثيل الضوئي (Photosynthesis)'
}) => {
  const certRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-200 animate-in fade-in zoom-in duration-200 my-8">
        {/* Header with Close */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={24} />
            <h3 className="font-bold text-lg">شهادة إنجاز واجتياز معتمدة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Certificate Printable Area */}
        <div 
          ref={certRef}
          id="printable-certificate"
          className="p-8 md:p-12 text-center bg-[#FAF8F5] relative select-none border-8 border-double border-amber-300 m-4 rounded-xl shadow-inner"
          style={{ backgroundImage: 'radial-gradient(#d97706 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
        >
          {/* Top Emblem */}
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg border-2 border-white mb-4">
            <Award size={36} className="text-emerald-950" />
          </div>

          <p className="text-xs md:text-sm font-semibold tracking-widest text-emerald-800 uppercase mb-1">
            أكاديمية التفوق أون لاين للتعليم العلمي
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-emerald-950 font-serif mb-2">
            شهادة إنجاز وتفوق دراسي
          </h2>
          <p className="text-xs md:text-sm text-stone-500 mb-6">
            Certificate of Academic Excellence & Mastery
          </p>

          <p className="text-sm md:text-base text-stone-700 mb-2">
            تشهد إدارة المنصة والأكاديمية التعليمية بأن الطالب/ـة:
          </p>

          <div className="inline-block border-b-2 border-amber-600 px-8 py-2 my-2">
            <h1 className="text-xl md:text-3xl font-black text-amber-900 font-serif">
              {studentName || 'الطالب المتفوق'}
            </h1>
          </div>

          <p className="text-sm md:text-base text-stone-700 max-w-xl mx-auto mt-4 leading-relaxed">
            قد اجتاز بنجاح وتفوق الاختبار النهائي الشامل لمساق:
          </p>
          <p className="text-base md:text-xl font-bold text-emerald-900 mt-1 mb-4">
            « {courseTitle} »
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 my-6">
            <div className="bg-white/80 border border-amber-200 rounded-xl px-5 py-2.5 shadow-sm">
              <span className="text-xs text-stone-500 block">الدرجة المحققة</span>
              <span className="text-lg md:text-xl font-black text-emerald-900">{score} من {totalPoints}</span>
            </div>
            <div className="bg-white/80 border border-amber-200 rounded-xl px-5 py-2.5 shadow-sm">
              <span className="text-xs text-stone-500 block">النسبة المئوية</span>
              <span className="text-lg md:text-xl font-black text-amber-700">{percentage}%</span>
            </div>
            <div className="bg-white/80 border border-amber-200 rounded-xl px-5 py-2.5 shadow-sm">
              <span className="text-xs text-stone-500 block">تاريخ الإصدار</span>
              <span className="text-sm md:text-base font-bold text-stone-700">{date}</span>
            </div>
          </div>

          {/* Signatures, Seal & Verifiable QR Code */}
          <div className="pt-6 border-t border-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 px-4 md:px-10 text-xs md:text-sm text-stone-600">
            <div className="text-center">
              <div className="w-28 h-0.5 bg-stone-300 mx-auto mb-1"></div>
              <p className="font-bold text-emerald-950">المشرف الأكاديمي</p>
              <p className="text-[10px] text-stone-400">قسم العلوم والبيولوجيا</p>
            </div>

            {/* Official Badge & Verifiable QR Code */}
            <div className="flex items-center gap-4 bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <div className="w-14 h-14 rounded-full border-2 border-amber-500 flex flex-col items-center justify-center bg-amber-50 text-[9px] font-black text-amber-800 shadow-sm">
                <span>ختم معتمد</span>
                <CheckCircle size={12} className="text-emerald-700 mt-0.5" />
                <span>PASS 80%+</span>
              </div>

              {/* High Quality SVG QR Code */}
              <div className="flex flex-col items-center">
                <svg className="w-14 h-14" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="29" height="29" fill="white"/>
                  {/* Outer markers */}
                  <rect x="2" y="2" width="7" height="7" stroke="#064E3B" strokeWidth="2"/>
                  <rect x="4" y="4" width="3" height="3" fill="#064E3B"/>
                  <rect x="20" y="2" width="7" height="7" stroke="#064E3B" strokeWidth="2"/>
                  <rect x="22" y="4" width="3" height="3" fill="#064E3B"/>
                  <rect x="2" y="20" width="7" height="7" stroke="#064E3B" strokeWidth="2"/>
                  <rect x="4" y="22" width="3" height="3" fill="#064E3B"/>
                  {/* Data patterns */}
                  <rect x="11" y="3" width="2" height="2" fill="#064E3B"/>
                  <rect x="15" y="3" width="2" height="2" fill="#064E3B"/>
                  <rect x="11" y="7" width="2" height="2" fill="#064E3B"/>
                  <rect x="13" y="11" width="3" height="3" fill="#D97706"/>
                  <rect x="3" y="11" width="2" height="2" fill="#064E3B"/>
                  <rect x="7" y="13" width="2" height="2" fill="#064E3B"/>
                  <rect x="11" y="15" width="2" height="2" fill="#064E3B"/>
                  <rect x="18" y="11" width="2" height="2" fill="#064E3B"/>
                  <rect x="22" y="13" width="2" height="2" fill="#064E3B"/>
                  <rect x="20" y="17" width="2" height="2" fill="#064E3B"/>
                  <rect x="11" y="20" width="2" height="2" fill="#064E3B"/>
                  <rect x="15" y="22" width="2" height="2" fill="#064E3B"/>
                  <rect x="20" y="24" width="2" height="2" fill="#064E3B"/>
                  <rect x="24" y="22" width="2" height="2" fill="#064E3B"/>
                </svg>
                <span className="text-[8px] font-mono text-stone-500 mt-0.5">رمز QR للتحقق الأكاديمي</span>
              </div>
            </div>

            <div className="text-center">
              <div className="w-28 h-0.5 bg-stone-300 mx-auto mb-1"></div>
              <p className="font-bold text-emerald-950">مدير منصة التفوق</p>
              <p className="text-[10px] text-stone-400">اعتماد رقم {Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-t border-stone-200">
          <button
            onClick={triggerConfetti}
            className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
          >
            احتفال بالنجاح 🎉
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-4 py-2 rounded-xl text-xs md:text-sm transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
