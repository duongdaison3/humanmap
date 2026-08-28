import React, { useState } from 'react';
import { SafetyBanner } from './SafetyBadge';
import { HelpSession } from '../types';
import { HeartHandshake, PlusCircle, MapPin, ChevronDown, Compass } from 'lucide-react';
import { HumanMapLogo } from './Logo';
import { VietnamProvince } from '../services/locationService';
import { ProvinceSelectorModal } from './ProvinceSelectorModal';

interface AppShellProps {
  children: React.ReactNode;
  activeSession: HelpSession | null;
  notificationBanner?: React.ReactNode;
  onOpenActiveSession: () => void;
  onRequestHelpClick: () => void;
  isFirebaseActive?: boolean;
  currentProvince?: VietnamProvince;
  isGPSActive?: boolean;
  onSelectProvince?: (province: VietnamProvince, coords?: { lat: number; lng: number }) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeSession,
  notificationBanner,
  onOpenActiveSession,
  onRequestHelpClick,
  currentProvince = {
    id: 'hanoi',
    name: 'Hà Nội',
    fullName: 'Thành phố Hà Nội',
    shortName: 'Hà Nội',
    region: 'Bắc Bộ',
    lat: 21.028511,
    lng: 105.854167,
  },
  isGPSActive = false,
  onSelectProvince,
}) => {
  const [showBanner, setShowBanner] = useState(true);
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState(false);

  const handleSelectProvince = (province: VietnamProvince, coords?: { lat: number; lng: number }) => {
    if (onSelectProvince) {
      onSelectProvince(province, coords);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1E293B] flex flex-col font-sans">
      {/* Top Brand Header */}
      <header className="sticky top-0 z-30 bg-white/45 backdrop-blur-xl border-b border-white/70 shadow-[0_8px_28px_rgba(30,64,78,0.08)]">
        {showBanner && <SafetyBanner onClose={() => setShowBanner(false)} />}
        {notificationBanner}

        <div className="max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-h-16">
          {/* Logo & Dynamic Province Switcher Badge */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <HumanMapLogo variant="horizontal" size="md" provinceName={currentProvince.name} />
            
            {/* Interactive Province Badge Button */}
            <button
              onClick={() => setIsProvinceModalOpen(true)}
              className="clay-pill-blue flex items-center gap-1 text-[11px] font-black text-[#2563EB] px-2.5 py-1 uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer group shadow-xs shrink-0"
              title="Nhấn để đổi Tỉnh/Thành phố hoặc định vị lại GPS"
            >
              <div className="relative flex items-center justify-center">
                <MapPin className="w-3 h-3 text-[#2563EB]" />
                {isGPSActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="truncate max-w-[90px] sm:max-w-[120px] font-extrabold">{currentProvince.shortName || currentProvince.name}</span>
              <ChevronDown className="w-3 h-3 text-[#2563EB] group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRequestHelpClick}
              className="clay-btn-primary flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-white text-xs font-bold cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Cần hỗ trợ nhỏ</span>
              <span className="sm:hidden">Cần giúp</span>
            </button>
          </div>
        </div>

        {/* Tagline Sub-bar */}
        <div className="bg-white/30 border-t border-white/50 py-1.5 px-4 text-center backdrop-blur-md">
          <p className="text-[11px] text-stone-600 font-serif italic hidden sm:block">
            "Google Maps giúp bạn tìm địa điểm. Human Map giúp bạn tìm thấy con người khắp 63 tỉnh thành."
          </p>
          <p className="text-[10px] text-stone-600 font-medium sm:hidden">
            Tìm con người • Giúp một chút • Gần nhau hơn
          </p>
        </div>

        {/* Active Help Session Banner if running */}
        {activeSession && (
          <div
            onClick={onOpenActiveSession}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity animate-pulse shadow-md"
          >
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4" />
              <span>Đang hỗ trợ {activeSession.requesterName} ({activeSession.locationName})</span>
            </div>
            <span className="underline font-bold text-[11px]">Mở tiến trình →</span>
          </div>
        )}
      </header>

      {/* Province Selector Modal */}
      <ProvinceSelectorModal
        isOpen={isProvinceModalOpen}
        onClose={() => setIsProvinceModalOpen(false)}
        currentProvince={currentProvince}
        onSelectProvince={handleSelectProvince}
        isGPSActive={isGPSActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-md sm:max-w-2xl lg:max-w-5xl w-full mx-auto p-3 sm:p-4 pb-28 sm:pb-24">
        {children}
      </main>
    </div>
  );
};


