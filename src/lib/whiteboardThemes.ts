import { WhiteboardTheme, WhiteboardThemeOption } from '../types/whiteboard';

export const WHITEBOARD_THEMES: Record<WhiteboardTheme, WhiteboardThemeOption> = {
  'classic-dark': {
    id: 'classic-dark',
    name: 'Classic Dark Slate',
    arabicName: 'الفحم الداكن الكلاسيكي',
    description: 'تصميم فحمي عصري هادئ ومريح للعين مع أزرار داكنة مريحة للتركيز',
    icon: '🌑',
    previewColors: ['#0f172a', '#1e293b', '#3b82f6', '#f59e0b'],
    toolbarBg: 'bg-slate-950/95 border-slate-700/80 ring-1 ring-white/10 shadow-2xl',
    headerBg: 'bg-slate-900/95 border-slate-700/80 shadow-xl',
    accentBg: 'bg-amber-400',
    accentBorder: 'border-amber-400',
    accentText: 'text-amber-400',
    buttonActive: 'bg-amber-400 text-slate-950 font-bold shadow-md scale-105',
    buttonHover: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    textColor: 'text-white',
    panelBg: 'bg-slate-900 text-white border-slate-700 shadow-2xl',
    panelBorder: 'border-slate-700',
    canvasBg: 'bg-slate-950',
    defaultPageBgType: 'dark',
    defaultPageBgColor: '#0f172a',
    defaultPenColor: '#FFFFFF'
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Academic Midnight Navy',
    arabicName: 'أزرق منتصف الليل والذهبي',
    description: 'واجهة كحلية داكنة فخمة مع لمسات وأطر ذهبية ملكية راقية',
    icon: '🌌',
    previewColors: ['#070f22', '#1e3a8a', '#d97706', '#fbbf24'],
    toolbarBg: 'bg-[#070f22]/95 border-blue-900/90 ring-1 ring-amber-500/30 shadow-2xl shadow-blue-950/80',
    headerBg: 'bg-[#0c1838]/95 border-blue-800/80 shadow-xl shadow-blue-950/60',
    accentBg: 'bg-gradient-to-r from-amber-400 to-amber-500',
    accentBorder: 'border-amber-400',
    accentText: 'text-amber-300',
    buttonActive: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/25 scale-105',
    buttonHover: 'hover:bg-blue-950/90 text-blue-200 hover:text-amber-300',
    textColor: 'text-blue-50',
    panelBg: 'bg-[#0a142c] text-white border-blue-900/90 shadow-2xl',
    panelBorder: 'border-blue-800/80',
    canvasBg: 'bg-[#050b1a]',
    defaultPageBgType: 'dark',
    defaultPageBgColor: '#070f22',
    defaultPenColor: '#FFFFFF'
  },
  'emerald-forest': {
    id: 'emerald-forest',
    name: 'Academic Emerald Forest',
    arabicName: 'الزمرد الأكاديمي',
    description: 'واجهة غابات عميقة مع لمسات زمردية منعشة ومحفزة للتركيز الذهني',
    icon: '🌲',
    previewColors: ['#02231c', '#065f46', '#10b981', '#6ee7b7'],
    toolbarBg: 'bg-[#021f19]/95 border-emerald-900/90 ring-1 ring-emerald-500/30 shadow-2xl shadow-emerald-950/80',
    headerBg: 'bg-[#043329]/95 border-emerald-800/80 shadow-xl shadow-emerald-950/60',
    accentBg: 'bg-emerald-400',
    accentBorder: 'border-emerald-400',
    accentText: 'text-emerald-300',
    buttonActive: 'bg-emerald-400 text-slate-950 font-extrabold shadow-md shadow-emerald-500/30 scale-105',
    buttonHover: 'hover:bg-emerald-950/90 text-emerald-200 hover:text-emerald-300',
    textColor: 'text-emerald-50',
    panelBg: 'bg-[#032921] text-white border-emerald-900/90 shadow-2xl',
    panelBorder: 'border-emerald-800/80',
    canvasBg: 'bg-[#011712]',
    defaultPageBgType: 'chalkboard',
    defaultPageBgColor: '#1b4332',
    defaultPenColor: '#FFFFFF'
  },
  'royal-purple': {
    id: 'royal-purple',
    name: 'Creative Royal Violet',
    arabicName: 'البنفسجي الملكي الإبداعي',
    description: 'واجهة ليلية بتدرجات البنفسجي الملكي مع لمسات إرجوانية ملهمة ومبتكرة',
    icon: '🔮',
    previewColors: ['#160721', '#4c1d95', '#9333ea', '#e879f9'],
    toolbarBg: 'bg-[#150620]/95 border-purple-900/90 ring-1 ring-purple-500/30 shadow-2xl shadow-purple-950/80',
    headerBg: 'bg-[#220b33]/95 border-purple-800/80 shadow-xl shadow-purple-950/60',
    accentBg: 'bg-gradient-to-r from-purple-400 to-fuchsia-400',
    accentBorder: 'border-purple-400',
    accentText: 'text-purple-300',
    buttonActive: 'bg-gradient-to-r from-purple-400 to-fuchsia-400 text-slate-950 font-extrabold shadow-md shadow-purple-500/30 scale-105',
    buttonHover: 'hover:bg-purple-950/90 text-purple-200 hover:text-fuchsia-300',
    textColor: 'text-purple-50',
    panelBg: 'bg-[#1b0929] text-white border-purple-900/90 shadow-2xl',
    panelBorder: 'border-purple-800/80',
    canvasBg: 'bg-[#0e0415]',
    defaultPageBgType: 'dark',
    defaultPageBgColor: '#160721',
    defaultPenColor: '#FFFFFF'
  },
  'warm-amber': {
    id: 'warm-amber',
    name: 'Warm Amber & Bronze',
    arabicName: 'العنبر والبرونز الدافئ',
    description: 'واجهة ترابية دافئة بتدرجات العنبر والنحاس تضفي جواً من الوقار والراحة',
    icon: '🪵',
    previewColors: ['#170d06', '#78350f', '#d97706', '#f59e0b'],
    toolbarBg: 'bg-[#150c05]/95 border-amber-900/90 ring-1 ring-amber-500/30 shadow-2xl shadow-amber-950/80',
    headerBg: 'bg-[#241308]/95 border-amber-800/80 shadow-xl shadow-amber-950/60',
    accentBg: 'bg-gradient-to-r from-amber-400 to-orange-400',
    accentBorder: 'border-amber-400',
    accentText: 'text-amber-300',
    buttonActive: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-extrabold shadow-md shadow-amber-500/30 scale-105',
    buttonHover: 'hover:bg-amber-950/90 text-amber-200 hover:text-amber-300',
    textColor: 'text-amber-50',
    panelBg: 'bg-[#1c0f06] text-white border-amber-900/90 shadow-2xl',
    panelBorder: 'border-amber-800/80',
    canvasBg: 'bg-[#0e0703]',
    defaultPageBgType: 'dark',
    defaultPageBgColor: '#170d06',
    defaultPenColor: '#FFFFFF'
  },
  'minimal-light': {
    id: 'minimal-light',
    name: 'Clean Light Slate',
    arabicName: 'السمة الفاتحة المشرقة',
    description: 'واجهة ناصعة وعالية التباين مثالية للعرض الصفي وأجهزة البروجكتر الساطعة',
    icon: '☀️',
    previewColors: ['#ffffff', '#f8fafc', '#1e293b', '#2563eb'],
    toolbarBg: 'bg-white/95 border-slate-300 ring-1 ring-slate-900/10 shadow-2xl text-slate-900',
    headerBg: 'bg-slate-50/95 border-slate-300 shadow-xl text-slate-900',
    accentBg: 'bg-[#1A365D]',
    accentBorder: 'border-[#1A365D]',
    accentText: 'text-[#1A365D]',
    buttonActive: 'bg-[#1A365D] text-white font-extrabold shadow-md scale-105',
    buttonHover: 'hover:bg-slate-100 text-slate-700 hover:text-slate-950',
    textColor: 'text-slate-900',
    panelBg: 'bg-white text-slate-900 border-slate-300 shadow-2xl',
    panelBorder: 'border-slate-300',
    canvasBg: 'bg-slate-100',
    defaultPageBgType: 'blank',
    defaultPageBgColor: '#ffffff',
    defaultPenColor: '#1E293B'
  }
};

export const WHITEBOARD_THEMES_LIST: WhiteboardThemeOption[] = Object.values(WHITEBOARD_THEMES);

export const getWhiteboardThemeConfig = (theme?: WhiteboardTheme | string): WhiteboardThemeOption => {
  if (theme && WHITEBOARD_THEMES[theme as WhiteboardTheme]) {
    return WHITEBOARD_THEMES[theme as WhiteboardTheme];
  }
  return WHITEBOARD_THEMES['classic-dark'];
};

export const getThemeDefaultBackground = (theme?: WhiteboardTheme | string) => {
  const config = getWhiteboardThemeConfig(theme);
  // Default whiteboard canvas background is white ruled notebook paper ('ruled')
  return {
    type: 'ruled' as const,
    color: '#ffffff',
    penColor: '#1E293B'
  };
};
