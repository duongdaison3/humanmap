import React from 'react';
import { NeedRequest } from '../types';
import { SafetyBadge } from './SafetyBadge';
import { MapPin, Clock, Shield, ArrowRight, X, AlertTriangle, UserCheck } from 'lucide-react';

interface NeedDetailProps {
  need: NeedRequest;
  onClose: () => void;
  onStartHelp: (need: NeedRequest) => void;
  onOpenMatching?: (need: NeedRequest) => void;
}

export const NeedDetail: React.FC<NeedDetailProps> = ({
  need,
  onClose,
  onStartHelp,
  onOpenMatching,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg clay-card shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-linear-to-r from-[#2563EB] via-[#16A34A] to-[#F59E0B] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold text-xs bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
              🆘 Yêu cầu micro-help
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Requester Header */}
          <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
            <div className="clay-pill p-1 shrink-0">
              <img
                src={need.requesterAvatar}
                alt={need.requesterName}
                className="w-13 h-13 rounded-full object-cover shadow-inner"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-slate-900 text-base">{need.requesterName}</h3>
                <SafetyBadge />
              </div>
              <p className="text-xs text-slate-500 font-medium">{need.requesterRole}</p>
              <div className="flex items-center gap-1 text-xs text-[#2563EB] font-bold mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{need.locationName}</span>
              </div>
            </div>
          </div>

          {/* Title & Detailed Description */}
          <div>
            <h2 className="font-serif font-bold text-slate-900 text-lg sm:text-xl leading-snug mb-2">
              {need.title}
            </h2>
            <div className="clay-card-warm p-4.5 text-slate-700 text-sm leading-relaxed font-medium">
              {need.description}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="clay-card-blue p-3 text-center">
              <span className="block text-[10px] text-[#2563EB] uppercase font-bold">Khoảng cách</span>
              <span className="font-extrabold text-[#2563EB] text-sm sm:text-base">~{need.distanceMeters}m</span>
              <span className="block text-[10px] text-[#2563EB]/80 font-medium">~2 phút đi bộ</span>
            </div>

            <div className="clay-card-warm p-3 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Thời gian</span>
              <span className="font-bold text-slate-800 text-sm sm:text-base">~{need.estMinutes} phút</span>
              <span className="block text-[10px] text-slate-400 font-medium">Giúp đỡ nhỏ</span>
            </div>

            <div className="clay-card-emerald p-3 text-center">
              <span className="block text-[10px] text-emerald-800 uppercase font-bold">An toàn</span>
              <span className="font-bold text-emerald-800 text-xs sm:text-sm block mt-1">
                {need.categoryLabel}
              </span>
            </div>
          </div>

          {/* Safety Reminder Checklist */}
          <div className="clay-card-blue p-4.5 text-xs text-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
              <Shield className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Quy tắc Safe Micro-Help của Human Map</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 pl-5 list-disc font-medium leading-relaxed">
              <li>Gặp gỡ tại khu vực công cộng đông đúc (Phố Cổ, trạm xe buýt, quán cà phê).</li>
              <li>Tuyệt đối không trao đổi tiền mặt, chuyển khoản hay vay mượn.</li>
              <li>Không yêu cầu/cung cấp dịch vụ vận chuyển hay vào nhà riêng.</li>
            </ul>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {onOpenMatching && (
            <button
              onClick={() => onOpenMatching(need)}
              className="clay-btn-dark py-3 px-4 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Gợi ý người phù hợp</span>
            </button>
          )}
          <button
            onClick={() => onStartHelp(need)}
            className="clay-btn-primary flex-1 py-3 px-4 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Tôi có thể giúp ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
