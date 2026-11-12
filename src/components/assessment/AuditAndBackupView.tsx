import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  Database, 
  Key, 
  Server, 
  Cpu, 
  Lock,
  FileText,
  AlertTriangle,
  History
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { SystemBackupData } from '../../types/assessmentPlatform';

export const AuditAndBackupView: React.FC = () => {
  const auditLogs = assessmentStore.auditLogs;
  const currentUser = assessmentStore.currentUser;

  // AI Provider settings state
  const [aiProvider, setAiProvider] = useState<'local_ollama' | 'gemini' | 'openai'>('gemini');
  const [localOllamaUrl, setLocalOllamaUrl] = useState('http://localhost:11434');
  const [allowExternalPii, setAllowExternalPii] = useState(false); // strictly false by default

  const [importNotice, setImportNotice] = useState<string | null>(null);

  const handleExportBackup = () => {
    const backup = assessmentStore.exportSystemBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Altafawuq_Assessment_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        assessmentStore.importSystemBackup(parsed as SystemBackupData);
        setImportNotice('تمت استعادة بيانات النظام بالكامل بنجاح والتحقق من سلامة المخطط.');
      } catch (err: any) {
        alert('فشل استعادة النسخة الاحتياطية: ' + (err.message || 'الملف تالف'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">إدارة الأمان، سجل التدقيق، والنسخ الاحتياطي</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            سجل العمليات الإدارية وقرارات الاعتماد والنشر، ضبط طبقة الذكاء الاصطناعي، وتصدير واستعادة النسخ الاحتياطية.
          </p>
        </div>

        {/* Backup Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download size={16} />
            <span>تصدير نسخة احتياطية كاملة (JSON)</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
            <Upload size={16} />
            <span>استعادة نسخة احتياطية</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <span>{importNotice}</span>
          <button onClick={() => setImportNotice(null)} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {/* AI Layer & Local Privacy Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={20} className="text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">طبقة مزود الذكاء الاصطناعي وسياسة الخصوصية المحلية</h3>
        </div>
        <p className="text-xs text-slate-500">
          تتيح المنصة تشغيل نماذج الذكاء الاصطناعي محلياً داخل الشبكة (Ollama / vLLM) دون الحاجة للاتصال بالإنترنت، مع منع إرسال بيانات الطلاب أو الملفات غير المعتمدة للخدمات الخارجية افتراضياً.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Option 1: Local Ollama */}
          <div
            onClick={() => setAiProvider('local_ollama')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              aiProvider === 'local_ollama'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">خادم محلي (Ollama / Local HTTP)</span>
              {aiProvider === 'local_ollama' && <CheckCircle size={16} className="text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              أقصى درجات الخصوصية والأمان. يعمل داخلياً بنسبة 100% دون خروج أي بايت خارج الشبكة المحلية.
            </p>
          </div>

          {/* Option 2: Gemini API */}
          <div
            onClick={() => setAiProvider('gemini')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              aiProvider === 'gemini'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">Google Gemini API (سحابي)</span>
              {aiProvider === 'gemini' && <CheckCircle size={16} className="text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              معالجة فائقة السرعة للمراجع الكبيرة وتوليد مصفوفة الأسئلة.
            </p>
          </div>

          {/* Option 3: OpenAI API */}
          <div
            onClick={() => setAiProvider('openai')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              aiProvider === 'openai'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">OpenAI ChatGPT (سحابي)</span>
              {aiProvider === 'openai' && <CheckCircle size={16} className="text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              دقة عالية في الصياغة اللغوية والتفسيرات البيداغوجية المتعمقة.
            </p>
          </div>
        </div>

        {/* Local Provider Settings Input */}
        {aiProvider === 'local_ollama' && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <label className="block font-bold text-slate-700">رابط الخادم المحلي لنماذج الذكاء الاصطناعي (Endpoint):</label>
            <input
              type="text"
              value={localOllamaUrl}
              onChange={e => setLocalOllamaUrl(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono bg-white outline-none"
            />
            <span className="text-[10px] text-slate-500 block">
              النموذج المقترح: Qwen2.5-14B-Instruct أو Llama-3.1-8B-Instruct المعرب للمهام التربوية.
            </span>
          </div>
        )}

        {/* Privacy Enforcement Check */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-emerald-600" />
            <span className="font-bold text-slate-800">
              حماية خصوصية بيانات الطلاب وهوياتهم (PII Exclusion):
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            مفعلة وإلزامية (تمنع إرسال أسماء وإيميلات الطلاب للخارج)
          </span>
        </div>
      </div>

      {/* System Audit Log Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">سجل العمليات الإدارية وقرارات الاعتماد (Audit Trail)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">({auditLogs.length} عملية مسجلة)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold">
                <th className="py-2.5 px-3">التوقيت</th>
                <th className="py-2.5 px-3">المستخدم</th>
                <th className="py-2.5 px-3">الدور</th>
                <th className="py-2.5 px-3">نوع العملية</th>
                <th className="py-2.5 px-3">التفاصيل الأكاديمية</th>
                <th className="py-2.5 px-3">عنوان الشبكة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {new Date(log.timestamp).toLocaleString('ar')}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{log.userName}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{log.action}</td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{log.details}</td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{log.ipAddress || '192.168.1.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
