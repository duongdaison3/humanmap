import React, { useState } from 'react';
import { Story, HelpSession } from '../types';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  HeartHandshake, 
  MapPin, 
  Sparkles,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface ViralShareCardProps {
  story?: Story;
  session?: HelpSession;
  isOpen: boolean;
  onClose: () => void;
}

export const ViralShareCard: React.FC<ViralShareCardProps> = ({
  story,
  session,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Derive safe public details without private GPS coordinates or private phone numbers
  const title = story?.title || session?.needTitle || 'Một hành động nhỏ giữa Phố Cổ';
  const quote = story?.quote || story?.body || 'Mỗi sự giúp đỡ nhỏ đều mang lại sự ấm áp cho cộng đồng.';
  const safeLocation = story?.locationName || session?.locationName || 'Phố Cổ, Hoàn Kiếm, Hà Nội';
  const authorDisplay = story?.isAnonymous
    ? 'Thành viên ẩn danh'
    : story?.authorName || 'Tình nguyện viên Human Map';

  const shareId = story?.id || session?.id || `share_${Date.now()}`;
  const shareUrl = `${window.location.origin}?storyId=${shareId}`;

  const shareText = `🤝 [HUMAN MAP] ${title}\n📍 ${safeLocation}\n💬 "${quote}"\n\nCùng lan tỏa lòng tốt quanh ta! #HUMANMAP #AIRiserVietnam #BuildwithGoogleAI\n👉 ${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy share text:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Human Map - ${title}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Native share cancelled or failed:', err);
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="clay-card max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 clay-btn-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="clay-pill-blue text-[#2563EB] text-xs font-bold px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            Lan tỏa giá trị Nhân ái
          </span>
          <h3 className="text-xl font-serif font-bold text-slate-900 mt-2">Chia sẻ Khoảnh khắc</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Nội dung đã được kiểm duyệt bảo vệ quyền riêng tư công cộng</p>
        </div>

        {/* Visual Share Card Box */}
        <div className="clay-btn-primary p-5.5 text-white shadow-xl mb-5 relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                <HeartHandshake className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-extrabold tracking-wider uppercase text-amber-200">HUMAN MAP</span>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" /> An toàn
            </span>
          </div>

          {/* Card Title & Content */}
          <h4 className="text-base font-bold leading-snug mb-2 line-clamp-2">{title}</h4>
          
          <p className="text-xs text-blue-50 italic mb-4 line-clamp-3 bg-black/15 p-3 rounded-xl border border-white/10 font-medium">
            "{quote}"
          </p>

          {/* Card Footer */}
          <div className="flex items-center justify-between text-[11px] text-amber-100 pt-1 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-200" />
              {safeLocation.split(',')[0]}
            </span>
            <span className="font-bold">{authorDisplay}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="clay-btn-primary w-full py-3 px-4 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ ứng dụng / Mạng xã hội
            </button>
          )}

          <button
            onClick={handleCopy}
            className="clay-btn-white w-full py-3 px-4 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Đã sao chép liên kết & văn bản!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                Sao chép liên kết chia sẻ
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-4 font-semibold">
          #HUMANMAP #AIRiserVietnam #BuildwithGoogleAI
        </p>
      </div>
    </div>
  );
};
