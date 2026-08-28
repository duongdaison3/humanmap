import React, { useState, useEffect } from 'react';
import { MeetingPoint, UserProfile } from '../types';
import { meetingPointService } from '../services/meetingPointService';
import { MapPin, ShieldCheck, Check, Clock, Navigation, AlertCircle, Compass } from 'lucide-react';

interface MeetingPointSelectorProps {
  currentUser: UserProfile | null;
  partnerLocation?: { lat: number; lng: number };
  onSelectMeetingPoint: (point: MeetingPoint) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const MeetingPointSelector: React.FC<MeetingPointSelectorProps> = ({
  currentUser,
  partnerLocation,
  onSelectMeetingPoint,
  onCancel,
  isSubmitting = false,
}) => {
  const [candidates, setCandidates] = useState<MeetingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  useEffect(() => {
    const userLoc = {
      lat: currentUser?.lat || 21.0285,
      lng: currentUser?.lng || 105.8542,
    };
    const partLoc = partnerLocation || {
      lat: userLoc.lat + 0.003,
      lng: userLoc.lng + 0.003,
    };

    const generated = meetingPointService.generateCandidateMeetingPoints(userLoc, partLoc, 4);
    setCandidates(generated);
    if (generated.length > 0) {
      setSelectedPointId(generated[0].id);
    }
  }, [currentUser, partnerLocation]);

  const getCategoryBadgeLabel = (type: string) => {
    switch (type) {
      case 'pharmacy':
        return '💊 Nhà thuốc công cộng';
      case 'hospital':
        return '🏥 Bệnh viện / Y tế';
      case 'community_center':
        return '🏛️ Trung tâm cộng đồng';
      case 'convenience_store':
        return '🏪 Cửa hàng tiện lợi 24/7';
      case 'transit_point':
        return '🚌 Trạm giao thông công cộng';
      case 'cafe':
        return '☕ Quán cà phê mở';
      default:
        return '📍 Địa điểm công cộng';
    }
  };

  const handleConfirmChoice = (point: MeetingPoint) => {
    const val = meetingPointService.validateMeetingPoint(point);
    if (val.valid) {
      onSelectMeetingPoint(point);
    }
  };

  return (
    <div className="clay-card p-5 space-y-4 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="clay-pill-emerald p-2 text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800">Chọn điểm gặp an toàn</h4>
            <p className="text-[10px] text-slate-500 font-medium">Địa điểm công cộng trung gian bảo vệ quyền riêng tư</p>
          </div>
        </div>
      </div>

      {/* Concise Safety Banner */}
      <div className="clay-card-amber p-3.5 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-700" />
          <span>Gợi ý an toàn Human Map</span>
        </p>
        <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
          Hãy ưu tiên gặp nhau ở nơi công cộng, có người qua lại. Không cần chia sẻ địa chỉ nhà hoặc thông tin cá nhân không cần thiết.
        </p>
      </div>

      {/* Candidate Cards List */}
      <div className="space-y-3">
        {candidates.map((cand) => {
          const isSelected = selectedPointId === cand.id;
          return (
            <div
              key={cand.id}
              onClick={() => setSelectedPointId(cand.id)}
              className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2.5 ${
                isSelected
                  ? 'clay-card-emerald ring-2 ring-emerald-500/40 shadow-md'
                  : 'clay-card hover:translate-y-[-2px]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="clay-pill-emerald text-[10px] font-extrabold px-2.5 py-0.5">
                    {getCategoryBadgeLabel(cand.type)}
                  </span>
                  <h5 className="font-bold text-xs text-slate-800 leading-snug">{cand.name}</h5>
                  <p className="text-[11px] text-slate-500 leading-tight font-medium">{cand.address}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="clay-pill-emerald text-xs font-bold px-2.5 py-1 text-emerald-800">
                    {cand.score}/100 điểm an toàn
                  </span>
                </div>
              </div>

              {/* Distance and Travel Breakdown */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100/60 font-medium">
                <div className="flex items-center gap-2">
                  <span>Khoảng cách bạn: <strong>~{cand.requesterDistanceMeters}m</strong></span>
                  <span>•</span>
                  <span>Đối tác: <strong>~{cand.helperDistanceMeters}m</strong></span>
                </div>
                <div className="flex items-center gap-1 text-[#F59E0B] font-bold">
                  <Clock className="w-3 h-3" />
                  <span>~{cand.requesterTravelMinutes} phút đi bộ</span>
                </div>
              </div>

              {/* Action Buttons inside selected card */}
              {isSelected && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmChoice(cand);
                    }}
                    className="clay-btn-emerald flex-1 py-2 px-3 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Đề xuất điểm này</span>
                  </button>
                  {onCancel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                      }}
                      className="clay-btn-white py-2 px-3 text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
