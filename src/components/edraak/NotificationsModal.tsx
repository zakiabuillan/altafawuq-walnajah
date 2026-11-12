import React from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  Award, 
  UploadCloud, 
  Calendar,
  CheckCheck
} from 'lucide-react';
import { NotificationItem } from './types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onSelectNotification: (item: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectNotification
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'lesson':
        return <BookOpen size={16} className="text-emerald-700" />;
      case 'file':
        return <UploadCloud size={16} className="text-blue-600" />;
      case 'exam':
        return <FileText size={16} className="text-amber-600" />;
      case 'result':
        return <Award size={16} className="text-purple-600" />;
      default:
        return <Bell size={16} className="text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/40 backdrop-blur-2xs">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-top-4 duration-200 text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base font-serif">مركز الإشعارات والتنبيهات</h3>
            {unreadCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 transition-colors"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">تحديد كمقروء</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <Bell size={32} className="mx-auto text-stone-300" />
              <p className="text-xs font-bold">لا توجد إشعارات حالياً.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectNotification(item);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  item.isRead
                    ? 'bg-white border-stone-200 text-stone-600'
                    : 'bg-emerald-50/70 border-emerald-200 text-stone-900 shadow-2xs'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">{item.title}</h4>
                    <span className="text-[10px] text-stone-400">{item.date}</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.message}</p>
                </div>

                {!item.isRead && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
