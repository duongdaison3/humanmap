import React from 'react';
import { UserProfile } from '../types';
import { trustService } from '../services/trustService';
import { 
  ShieldCheck, 
  X, 
  HandHeart, 
  HeartHandshake, 
  Star, 
  Activity, 
  Compass, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Award,
  Sparkles
} from 'lucide-react';

interface TrustProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  completedSessionsCount?: number;
}

export const TrustProfileModal: React.FC<TrustProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  completedSessionsCount,
}) => {
  if (!isOpen) return null;

  const trustProfile = trustService.getTrustProfile(user, completedSessionsCount);

  const renderBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'HandHeart':
        return <HandHeart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Star':
        return <Star className="w-4 h-4 text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />;
      case 'Activity':
        return <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="clay-card max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] relative overflow-hidden">
        {/* Header background glow */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-linear-to-r from-emerald-100/60 via-amber-100/40 to-blue-100/50 -z-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 clay-btn-white text-slate-600 hover:text-slate-900 transition-colors z-10 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Identity Header */}
        <div className="relative z-10 pt-2 pb-4 flex flex-col items-center text-center">
          <div className="relative">
            <div className="clay-pill p-1">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover shadow-inner"
              />
            </div>
            <div className="absolute bottom-0 right-0 clay-btn-emerald text-white p-1 rounded-full shadow-md" title="Tài khoản đã xác thực">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <h3 className="mt-3 text-xl font-serif font-bold text-slate-900 flex items-center gap-1.5">
            {trustProfile.name}
          </h3>

          <p className="clay-pill-emerald text-xs font-bold px-3 py-0.5 mt-1.5">
            {trustProfile.role}
          </p>

          <p className="text-xs text-slate-500 flex items-center gap-1 mt-2 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {trustProfile.locationArea} (An toàn công cộng)
          </p>
        </div>

        {/* Trust Stats Bar */}
        <div className="grid grid-cols-2 gap-3 py-3.5 px-4 clay-card-warm mb-4">
          <div className="text-center border-r border-amber-200/60 pr-2">
            <div className="text-2xl font-bold text-emerald-700">
              {trustProfile.totalHelpedCount}
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              Lượt giúp thành công
            </div>
          </div>

          <div className="text-center pl-2">
            <div className="text-2xl font-bold text-amber-700">
              {(trustProfile.reliabilityScore * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              Điểm tin cậy cộng đồng
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="mb-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-700" />
            Huy hiệu tin cậy & Năng lực
          </h4>

          {trustProfile.badges.length > 0 ? (
            <div className="space-y-2">
              {trustProfile.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-start gap-2.5 p-3 clay-card transition-all"
                >
                  <div className="p-2 clay-pill shrink-0 mt-0.5">
                    {renderBadgeIcon(badge.icon)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {badge.label}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {badge.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 p-3 clay-card text-center font-medium">
              Thành viên mới đang xây dựng hồ sơ tin cậy ban đầu.
            </div>
          )}
        </div>

        {/* Safety Note & Freshness Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="clay-pill-emerald px-2.5 py-0.5 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {trustProfile.freshness}
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5" />
            {trustProfile.lastActiveLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
