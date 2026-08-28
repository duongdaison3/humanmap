import React from 'react';
import { MapMarkerType } from '../types';
import { HeartHandshake, BookOpen, AlertCircle } from 'lucide-react';

interface MapMarkerProps {
  type: MapMarkerType;
  title: string;
  subtitle: string;
  isSelected?: boolean;
  onClick: () => void;
  xPercent: number;
  yPercent: number;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  type,
  title,
  subtitle,
  isSelected = false,
  onClick,
  xPercent,
  yPercent,
}) => {
  const getStyles = () => {
    switch (type) {
      case 'need':
        return {
          bg: 'bg-[#2563EB] text-white border-white shadow-[#2563EB]/40',
          ring: 'ring-4 ring-[#2563EB]/30 animate-map-pulse',
          icon: AlertCircle,
          badge: '🆘 CẦN GIÚP',
        };
      case 'help':
        return {
          bg: 'bg-[#F59E0B] text-white border-white shadow-[#F59E0B]/40',
          ring: 'ring-4 ring-[#F59E0B]/30',
          icon: HeartHandshake,
          badge: '🤝 CƠ HỘI GIÚP',
        };
      case 'story':
        return {
          bg: 'bg-[#3498DB] text-white border-white shadow-[#3498DB]/30',
          ring: 'ring-4 ring-[#3498DB]/30',
          icon: BookOpen,
          badge: '📖 CÂU CHUYỆN',
        };
    }
  };

  const style = getStyles();
  const Icon = style.icon;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-300 hover:scale-110 active:scale-95 group"
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Pulse ring for needs */}
      <div className={`relative flex items-center justify-center`}>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform ${
            style.bg
          } ${isSelected ? 'scale-125 ring-4 ring-amber-400 font-bold z-20' : style.ring}`}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* Pin tail */}
        <div className="absolute -bottom-1 w-2 h-2 bg-stone-800 rotate-45 rounded-xs" />
      </div>

      {/* Hover tooltip label */}
      <div
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-stone-900/90 text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none transition-all duration-200 ${
          isSelected ? 'opacity-100 scale-100 -translate-y-1' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
        }`}
      >
        <span className="text-[10px] opacity-80 block text-amber-300 font-semibold">{style.badge}</span>
        {title}
      </div>
    </div>
  );
};
