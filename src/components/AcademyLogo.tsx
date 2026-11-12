import React from 'react';

interface AcademyLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number; // width/height of the icon in pixels
  mode?: 'light' | 'dark' | 'header'; // styled for light background, dark background, or custom header
  customLogoUrl?: string;
  customAcademyName?: string;
  customSlogan?: string;
}

export const AcademyLogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 80, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Sparkles & Constellation */}
      {/* Top right golden main star */}
      <path 
        d="M125 45 C125 52 128 55 135 55 C128 55 125 58 125 65 C125 58 122 55 115 55 C122 55 125 52 125 45 Z" 
        fill="#D4A33C" 
      />
      {/* Light blue small sparkles */}
      <path 
        d="M142 68 C142 71 143 72 146 72 C143 72 142 73 142 76 C142 73 141 72 138 72 C141 72 142 71 142 68 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M82 62 C82 64 83 65 85 65 C83 65 82 66 82 68 C82 66 81 65 79 65 C81 65 82 64 82 62 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M109 42 C109 44 110 45 112 45 C110 45 109 46 109 48 C109 46 108 45 106 45 C108 45 109 44 109 42 Z" 
        fill="#38BDF8" 
      />

      {/* Symmetrical Book Pages (Bottom) */}
      {/* Left major deep page */}
      <path 
        d="M100 132 C75 120 42 124 24 138 C18 142 21 148 28 148 C44 148 76 142 100 148 Z" 
        fill="#1A365D" 
      />
      {/* Right major deep page */}
      <path 
        d="M100 132 C125 120 158 124 176 138 C182 142 179 148 172 148 C156 148 124 142 100 148 Z" 
        fill="#1A365D" 
      />

      {/* Under cover shadow / backing */}
      <path 
        d="M26 144 C42 134 74 128 100 135 C126 128 158 134 174 144 L170 148 C154 138 124 133 100 141 C76 133 46 138 30 148 Z" 
        fill="#D4A33C" 
      />

      {/* Left upper bright turquoise page */}
      <path 
        d="M100 125 C75 112 45 116 28 128 C23 131 24 136 30 136 C46 136 76 131 100 137 Z" 
        fill="#0284C7" 
      />
      {/* Right upper bright turquoise page */}
      <path 
        d="M100 125 C125 112 155 116 172 128 C177 131 176 136 170 136 C154 136 124 131 100 137 Z" 
        fill="#0284C7" 
      />

      {/* Golden Abstract Human Figure (Center) */}
      {/* Head */}
      <circle cx="100" cy="98" r="8" fill="#D4A33C" />
      
      {/* Swooshing body springing up */}
      <path 
        d="M100 132 
           C90 128 86 114 78 103 
           C72 95 81 92 84 96 
           C90 102 96 112 100 116 
           C104 112 110 102 116 96 
           C119 92 128 95 122 103 
           C114 114 110 128 100 132 Z" 
        fill="#D4A33C" 
      />

      {/* Tilted Arm reaching out to the golden star */}
      <path 
        d="M109 104 C112 100 119 88 125 80 C128 76 133 78 130 83 C122 93 115 104 111 107 Z" 
        fill="#D4A33C" 
      />

      {/* Graduation Cap on top of Head */}
      {/* Diamond shape (tilted) */}
      <path 
        d="M100 84 L114 78 L100 72 L86 78 Z" 
        fill="#0D365A" 
      />
      {/* Bottom cap trim */}
      <path 
        d="M93 79.5 Q100 83.5 107 79.5 Q100 85 93 79.5 Z" 
        fill="#F59E0B" 
      />
      {/* Tassel */}
      <path 
        d="M92 78 L90 88 C89.5 90 91.5 91 91 92" 
        stroke="#0D365A" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
      <circle cx="91" cy="92.5" r="1" fill="#0D365A" />
    </svg>
  );
};

export const AcademyLogo: React.FC<AcademyLogoProps> = ({ 
  className = "", 
  iconOnly = false, 
  size = 56, 
  mode = 'light',
  customLogoUrl,
  customAcademyName,
  customSlogan
}) => {
  const [imageError, setImageError] = React.useState(false);
  const isDark = mode === 'dark';
  const isHeader = mode === 'header';

  const academyTitle = customAcademyName?.trim() || 'أكاديمية التفوق';
  const academySub = customSlogan?.trim() || 'أون لاين';

  // Reset image error if url changes
  React.useEffect(() => {
    setImageError(false);
  }, [customLogoUrl]);

  return (
    <div className={`flex items-center gap-3.5 text-right ${className}`} dir="rtl">
      {/* Icon / Custom Logo Frame */}
      <div className={`
        relative rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 overflow-hidden
        ${isHeader 
          ? 'bg-slate-800/90 border border-slate-700/60 p-1.5 shadow-md shadow-slate-950/25' 
          : isDark 
            ? 'bg-slate-900/60 border border-slate-850 p-2 shadow-xl shadow-slate-950/40' 
            : 'bg-white p-2 shadow-lg shadow-blue-900/10 border border-slate-100'
        }
      `}
      style={{ width: size + 16, height: size + 16 }}
      >
        {customLogoUrl && !imageError ? (
          <img 
            src={customLogoUrl} 
            alt={academyTitle}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain rounded-xl"
            style={{ maxWidth: size, maxHeight: size }}
          />
        ) : (
          <AcademyLogoIcon size={size} />
        )}
      </div>

      {/* Typography Block */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <h1 className={`
              text-lg font-black tracking-tight leading-none
              ${isHeader || isDark ? 'text-white' : 'text-[#0D365A]'}
            `}>
              {academyTitle}
            </h1>
          </div>
          
          {/* Slogan with decorative lines */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`h-[1px] w-2 ${isHeader || isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <span className={`
              text-[10px] font-extrabold tracking-wider leading-none
              ${isHeader || isDark ? 'text-amber-400' : 'text-[#D4A33C]'}
            `}>
              {academySub}
            </span>
            <div className={`h-[1px] w-2 ${isHeader || isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
          </div>

          <p className={`
            text-[8px] font-black tracking-widest font-mono uppercase mt-1
            ${isHeader || isDark ? 'text-slate-400/80' : 'text-slate-500'}
          `}>
            EXCELLENCE ONLINE ACADEMY
          </p>
        </div>
      )}
    </div>
  );
};

export default AcademyLogo;
