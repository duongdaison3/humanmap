import React from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet panel */}
      <div className="relative w-full max-w-lg clay-card shadow-[0_25px_60px_rgba(0,0,0,0.3)] rounded-t-3xl sm:rounded-3xl p-6 z-10 max-h-[85vh] overflow-y-auto transform transition-transform animate-slide-up">
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 clay-pill mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100">
          <h3 className="text-base font-serif font-bold text-slate-900">{title || 'Chi tiết'}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
