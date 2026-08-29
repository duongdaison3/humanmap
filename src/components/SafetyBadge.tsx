import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface SafetyBadgeProps {
  level?: 'verified_safe' | 'low_risk';
  showText?: boolean;
  className?: string;
  text?: string;
  size?: 'small' | 'default';
}

export const SafetyBadge: React.FC<SafetyBadgeProps> = ({
  level = 'verified_safe',
  showText = true,
  className = '',
  text,
  size = 'default',
}) => {
  const resolvedText = text || 'Micro-Help An Toàn';
  const sizeClass = size === 'small' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <div
      className={`clay-pill-emerald inline-flex items-center gap-1.5 ${sizeClass} font-bold text-emerald-800 ${className}`}
      title="Micro-Help An Toàn: Gặp gỡ nơi công cộng, không giao dịch tài chính, không can thiệp y tế."
    >
      <ShieldCheck className={`${size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600 shrink-0`} />
      {showText && <span>{resolvedText}</span>}
    </div>
  );
};

export const SafetyBanner: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  return (
    <div className="bg-[#FFFBEB]/90 border-b border-amber-200/50 px-4 py-2 text-xs text-slate-800 flex items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-snug font-medium">
          <strong className="font-bold text-amber-700">Lưu ý an toàn:</strong> Human Map phục vụ các trợ giúp nhỏ, an toàn tại nơi công cộng. Không sử dụng cho cấp cứu y tế hay giao dịch tài chính.
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="clay-pill-amber text-amber-800 font-extrabold text-[11px] px-2.5 py-0.5 shrink-0 cursor-pointer"
        >
          Đã hiểu
        </button>
      )}
    </div>
  );
};
