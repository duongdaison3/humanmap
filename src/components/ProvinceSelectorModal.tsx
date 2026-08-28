import React, { useState } from 'react';
import { 
  VIETNAM_PROVINCES, 
  VietnamProvince, 
  locationService, 
  DetectedLocationResult 
} from '../services/locationService';
import { 
  MapPin, 
  Search, 
  Navigation, 
  X, 
  Check, 
  Sparkles, 
  Globe2, 
  Loader2,
  Compass
} from 'lucide-react';

interface ProvinceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvince: VietnamProvince;
  onSelectProvince: (province: VietnamProvince, coords?: { lat: number; lng: number }) => void;
  isGPSActive?: boolean;
}

export const ProvinceSelectorModal: React.FC<ProvinceSelectorModalProps> = ({
  isOpen,
  onClose,
  currentProvince,
  onSelectProvince,
  isGPSActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'Bắc Bộ' | 'Trung Bộ' | 'Nam Bộ'>('all');
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [detectionFeedback, setDetectionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter provinces based on search and region
  const filteredProvinces = VIETNAM_PROVINCES.filter((p) => {
    const matchesRegion = selectedRegion === 'all' || p.region === selectedRegion;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesRegion;

    const matchesName =
      p.name.toLowerCase().includes(query) ||
      p.fullName.toLowerCase().includes(query) ||
      p.shortName.toLowerCase().includes(query) ||
      p.region.toLowerCase().includes(query);

    return matchesRegion && matchesName;
  });

  const popularProvinces = VIETNAM_PROVINCES.filter((p) => p.popular);

  const handleTriggerGPS = async () => {
    setIsDetectingGPS(true);
    setDetectionFeedback('Đang xác định tọa độ thực tế qua GPS...');

    try {
      const result: DetectedLocationResult = await locationService.detectRealLocation();
      setIsDetectingGPS(false);
      setDetectionFeedback(`Đã xác định: ${result.province.name}`);
      
      onSelectProvince(result.province, { lat: result.latitude, lng: result.longitude });
      setTimeout(() => {
        setDetectionFeedback(null);
        onClose();
      }, 1000);
    } catch (e) {
      setIsDetectingGPS(false);
      setDetectionFeedback('Không thể lấy GPS, vui lòng chọn thủ công.');
      setTimeout(() => setDetectionFeedback(null), 3000);
    }
  };

  const handleChoose = (p: VietnamProvince) => {
    locationService.selectProvince(p);
    onSelectProvince(p, { lat: p.lat, lng: p.lng });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div 
        className="clay-card w-full max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="clay-pill-blue p-2 text-[#2563EB]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-slate-900 text-base sm:text-lg">
                Chọn Tỉnh / Thành Phố
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Human Map kết nối mạng lưới tình người trên 63 tỉnh thành Việt Nam
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="clay-btn-white p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Live Detection Button */}
        <div className="mb-3 space-y-2">
          <button
            onClick={handleTriggerGPS}
            disabled={isDetectingGPS}
            className="w-full clay-btn-amber py-2.5 px-4 text-xs font-bold text-amber-950 flex items-center justify-between cursor-pointer group shadow-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {isDetectingGPS ? (
                <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
              ) : (
                <div className="relative">
                  <Navigation className="w-4 h-4 text-amber-800 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </div>
              )}
              <div className="text-left">
                <span className="block font-black text-xs">
                  {isDetectingGPS ? 'Đang định vị GPS...' : '📍 Tự động nhận diện Tỉnh/Thành theo GPS thực tế'}
                </span>
                <span className="text-[10px] text-amber-800 font-medium">
                  Đang đứng tại: <strong>{currentProvince.name}</strong> {isGPSActive ? '(Đã kích hoạt GPS)' : ''}
                </span>
              </div>
            </div>

            <span className="clay-pill-white text-[10px] font-extrabold px-2 py-0.5 text-amber-900">
              Định vị ngay
            </span>
          </button>

          {detectionFeedback && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{detectionFeedback}</span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh tỉnh thành (Hà Nội, Sài Gòn, Đà Nẵng, Nha Trang, Huế...)"
            className="clay-input w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-800 outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Popular Provinces */}
        {!searchQuery && (
          <div className="mb-3 space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Thành phố & Địa bàn trọng điểm:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {popularProvinces.slice(0, 8).map((p) => {
                const isSelected = currentProvince.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleChoose(p)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'clay-btn-primary text-white shadow-sm'
                        : 'clay-btn-white text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>{p.shortName}</span>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Region Filter Chips */}
        <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-2 text-xs font-bold overflow-x-auto no-scrollbar">
          {(['all', 'Bắc Bộ', 'Trung Bộ', 'Nam Bộ'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
                selectedRegion === r
                  ? 'clay-btn-dark text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r === 'all' ? 'Tất cả (63 tỉnh thành)' : `Miền ${r}`}
            </button>
          ))}
        </div>

        {/* 63 Provinces Grid List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[260px] no-scrollbar">
          {filteredProvinces.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-medium">
              Không tìm thấy tỉnh thành phù hợp với từ khóa "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {filteredProvinces.map((p) => {
                const isSelected = currentProvince.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleChoose(p)}
                    className={`p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-1.5 border ${
                      isSelected
                        ? 'bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB] font-black'
                        : 'bg-white/60 border-slate-200/60 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs truncate font-bold">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{p.region}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Globe2 className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Phủ sóng 63 Tỉnh Thành Việt Nam</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-900 font-bold underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
