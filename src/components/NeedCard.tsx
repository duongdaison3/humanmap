import React from 'react';
import { NeedRequest } from '../types';
import { SafetyBadge } from './SafetyBadge';
import { MapPin, Clock, ArrowRight } from 'lucide-react';

interface NeedCardProps {
  need: NeedRequest;
  onSelect: (need: NeedRequest) => void;
  compact?: boolean;
}

export const NeedCard: React.FC<NeedCardProps> = ({
  need,
  onSelect,
  compact = false,
}) => {
  return (
    <div className="clay-card p-5 flex flex-col justify-between group cursor-pointer hover:translate-y-[-2px] transition-all duration-300">
      <div>
        {/* Requester header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative p-0.5 rounded-full clay-pill">
              <img
                src={need.requesterAvatar}
                alt={need.requesterName}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight">
                {need.requesterName}
              </h4>
              <p className="text-xs text-slate-500 font-medium">{need.requesterRole}</p>
            </div>
          </div>
          <SafetyBadge showText={!compact} />
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug mb-1.5 group-hover:text-[#2563EB] transition-colors">
          {need.title}
        </h3>
        {!compact && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 font-medium">
            {need.description}
          </p>
        )}

        {/* Badges: Distance, Time, Category */}
        <div className="flex flex-wrap items-center gap-2 text-xs my-2.5">
          <span className="clay-pill inline-flex items-center gap-1 text-slate-700 px-3 py-1.5 font-semibold text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
            {need.locationName.split(',')[0]} (~{need.distanceMeters}m)
          </span>
          <span className="clay-pill-blue inline-flex items-center gap-1 text-[#2563EB] px-3 py-1.5 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            ~{need.estMinutes} phút
          </span>
          <span className="clay-pill text-slate-600 px-3 py-1.5 text-xs font-medium">
            {need.categoryLabel}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(need)}
        className="clay-btn-primary mt-3 w-full min-h-11 py-2.5 px-4 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Tôi có thể giúp</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
