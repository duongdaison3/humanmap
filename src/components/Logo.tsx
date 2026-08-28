import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full' | 'horizontal' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
  provinceName?: string;
}

export const HumanMapLogo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = false,
  provinceName,
}) => {
  // Size metrics
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  // Logo Image with SVG fallback
  const LogoIcon = ({ iconClass = '' }: { iconClass?: string }) => {
    const [imgError, setImgError] = React.useState(false);

    if (!imgError) {
      return (
        <img
          src="/logo.png"
          alt="Human Map Logo"
          onError={() => setImgError(true)}
          className={`object-contain shrink-0 transition-transform duration-200 ${iconClass}`}
        />
      );
    }

    return (
      <svg
        viewBox="0 0 260 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-transform duration-200 ${iconClass}`}
      >
        <defs>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
        </defs>

        {/* BLUE FIGURE */}
        <g transform="translate(142, 18)">
          <path
            d="M 0,-18 C -11,-18 -19,-10 -19,0 C -19,12 -6,22 0,31 C 6,22 19,12 19,0 C 19,-10 11,-18 0,-18 Z"
            fill="none"
            stroke="#2563EB"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-1" r="4" fill="#2563EB" />
        </g>
        <path
          d="M 122, 54 C 98, 76 96, 118 124, 148 C 152, 178 172, 204 138, 248 C 126, 262 112, 272 92, 272 C 92, 272 120, 280 142, 252 C 170, 212 172, 180 138, 140 C 112, 110 115, 78 138, 54 Z"
          fill="url(#blueGrad)"
        />

        {/* GREEN FIGURE */}
        <g transform="translate(38, 88)">
          <path
            d="M 0,-16 C -10,-16 -17,-9 -17,0 C -17,11 -5,20 0,28 C 5,20 17,11 17,0 C 17,-9 10,-16 0,-16 Z"
            fill="none"
            stroke="#16A34A"
            strokeWidth="6.5"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-1" r="3.5" fill="#16A34A" />
        </g>
        <path
          d="M 56, 116 C 80, 126 102, 115 134, 142 C 165, 168 170, 212 148, 255 C 134, 282 115, 275 115, 275 C 130, 282 152, 278 164, 256 C 184, 220 180, 175 145, 145 C 108, 115 82, 118 56, 116 Z"
          fill="url(#greenGrad)"
        />
      </svg>
    );
  };

  if (variant === 'icon') {
    return <LogoIcon iconClass={`${iconSizes[size]} ${className}`} />;
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <LogoIcon iconClass={iconSizes[size]} />
        <div className="mt-2 font-black tracking-tight leading-none flex items-center gap-1.5">
          <span className="text-[#1E3A8A] drop-shadow-2xs">Human</span>
          <span className="text-[#16A34A] drop-shadow-2xs">Map</span>
        </div>
        {showTagline && (
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Tìm con người, Giúp một chút, Gần nhau hơn
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon iconClass={iconSizes[size]} />
      <div className="flex flex-col justify-center leading-none">
        <div className={`font-black tracking-tight ${textSizes[size]} flex items-center gap-1`}>
          <span className="text-[#1E3A8A] drop-shadow-2xs">Human</span>
          <span className="text-[#16A34A] drop-shadow-2xs">Map</span>
        </div>
        {showTagline && (
          <span className="text-[10px] text-[#6B7280] font-medium mt-0.5">
            Mạng lưới hỗ trợ vi mô {provinceName || 'Việt Nam'}
          </span>
        )}
      </div>
    </div>
  );
};
