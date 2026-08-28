import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, HeartHandshake, BookOpen, ArrowRight, ShieldCheck, Sparkles, X } from 'lucide-react';

interface WelcomeOnboardingProps {
  onGetStarted: () => void;
}

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ onGetStarted }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('humanmap_has_seen_welcome');
    if (!hasSeenWelcome) {
      setIsVisible(true);
    }
  }, []);

  const handleStart = () => {
    localStorage.setItem('humanmap_has_seen_welcome', 'true');
    setIsVisible(false);
    onGetStarted();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/50"
          >
            {/* Header Art / Gradient */}
            <div className="relative h-40 bg-gradient-to-br from-[#2563EB] via-[#1E3A8A] to-[#16A34A] flex items-center justify-center p-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 blur-2xl rounded-full"></div>
              
              <div className="relative z-10 space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-2">
                  <HeartHandshake className="w-8 h-8 text-[#2563EB]" />
                </div>
                <h2 className="font-serif italic text-2xl sm:text-3xl text-white font-bold drop-shadow-md">
                  Chào mừng đến với Human Map
                </h2>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed text-center">
                Mạng lưới kết nối lòng tốt, nơi bạn có thể tìm thấy cơ hội giúp đỡ những người xung quanh ngay trong khu vực của mình.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 clay-pill-blue flex items-center justify-center text-[#2563EB]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Khám phá quanh bạn</h4>
                    <p className="text-xs text-slate-500 mt-1">Hệ thống GPS sẽ hiển thị những yêu cầu giúp đỡ thực tế gần vị trí của bạn nhất.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 clay-pill-blue flex items-center justify-center text-[#16A34A]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">An toàn & Xác thực</h4>
                    <p className="text-xs text-slate-500 mt-1">Yêu cầu đăng nhập để đảm bảo tính xác thực và an toàn cho tất cả người dùng.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 clay-pill-amber flex items-center justify-center text-amber-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Lưu giữ câu chuyện</h4>
                    <p className="text-xs text-slate-500 mt-1">Mỗi sự giúp đỡ đều trở thành một câu chuyện truyền cảm hứng trên Bản đồ tình người.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleStart}
                  className="clay-btn-primary w-full py-3.5 px-6 flex items-center justify-center gap-2 text-white font-bold rounded-xl text-sm sm:text-base group"
                >
                  Bắt đầu khám phá
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                  Người dùng khách (Guest) có thể xem bản đồ và câu chuyện, nhưng cần đăng nhập để tương tác.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
