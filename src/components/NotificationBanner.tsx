import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NeedRequest } from '../types';
import { soundService } from '../services/soundService';
import {
  Bell,
  MapPin,
  X,
  ArrowRight,
  Volume2,
  VolumeX,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';

interface NotificationBannerProps {
  need: NeedRequest;
  distanceMeters: number;
  onViewDetails: (need: NeedRequest) => void;
  onDismiss: () => void;
  onDirectHelp?: (need: NeedRequest) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  need,
  distanceMeters,
  onViewDetails,
  onDismiss,
  onDirectHelp,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getMuted());
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Play gentle chime sound when notification pops up
  useEffect(() => {
    soundService.playHelpOpportunityChime();
  }, [need.id]);

  // Auto-dismiss countdown timer (15 seconds)
  useEffect(() => {
    if (isPaused) return;

    const totalDuration = 15000;
    const interval = 100;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onDismiss, isPaused]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    soundService.setMuted(newMuteState);
    if (!newMuteState) {
      soundService.playHelpOpportunityChime();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="w-full relative z-40 my-2 px-3 sm:px-4"
      >
        <div className="clay-card border-2 border-[#2563EB]/40 bg-gradient-to-r from-[#EFF6FF] via-[#FAF8F5] to-[#FFF9F2] p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(37,99,235,0.16)] relative overflow-hidden">
          {/* Top Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#F59E0B] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            {/* Left Info: Icon & Requester details */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Glowing Bell / Requester Avatar */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-11 h-11 clay-pill-blue flex items-center justify-center relative">
                  <Bell className="w-5 h-5 text-[#2563EB] animate-bounce" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#2563EB] rounded-full border-2 border-white animate-ping" />
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="clay-pill-blue text-[10px] text-[#2563EB] font-extrabold px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2563EB]" />
                    Cơ hội trợ giúp mới gần bạn
                  </span>
                  <span className="clay-pill-amber text-[10px] text-amber-900 font-extrabold px-2 py-0.5">
                    ~{distanceMeters}m ({need.estMinutes} phút)
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-serif font-bold text-slate-900 truncate">
                  {need.title}
                </h4>

                <p className="text-[11px] text-slate-600 font-medium truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <span>{need.locationName} • bởi <strong className="text-slate-800 font-semibold">{need.requesterName}</strong></span>
                </p>
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
              {/* Sound toggle button */}
              <button
                type="button"
                onClick={toggleSound}
                className="clay-btn-white p-2 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                title={isMuted ? 'Bật âm thanh chuông' : 'Tắt âm thanh'}
                aria-label="Tùy chỉnh âm thanh thông báo"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#2563EB]" />
                )}
              </button>

              {/* View details CTA */}
              <button
                type="button"
                onClick={() => onViewDetails(need)}
                className="clay-btn-primary py-2 px-3.5 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-white" />
                <span>Xem & Giúp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Dismiss CTA */}
              <button
                type="button"
                onClick={onDismiss}
                className="clay-btn-white p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Đóng thông báo"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
