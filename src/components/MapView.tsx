import React, { useState, useEffect } from 'react';
import { NeedRequest, Story, UserProfile, MapMarkerType, RouteResult } from '../types';
import { mapsService } from '../services/mapsService';
import { MapVinaMap } from './MapVinaMap';
import { BottomSheet } from './BottomSheet';
import { SafetyBadge } from './SafetyBadge';
import { ArrowRight, BookOpen, HeartHandshake, Navigation, Loader2, AlertCircle } from 'lucide-react';

interface MapViewProps {
  needs: NeedRequest[];
  stories: Story[];
  users: UserProfile[];
  currentUser?: UserProfile | null;
  onUserLocationChange?: (coords: { lat: number; lng: number }) => void;
  onSelectNeed: (need: NeedRequest) => void;
  onSelectStory: (story: Story) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  needs,
  stories,
  users,
  currentUser,
  onUserLocationChange,
  onSelectNeed,
  onSelectStory,
}) => {
  const [filter, setFilter] = useState<'all' | 'need' | 'help' | 'story'>('all');
  const [selectedItem, setSelectedItem] = useState<{
    type: MapMarkerType;
    item: NeedRequest | Story | UserProfile;
  } | null>(null);

  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const mapvinaKey = mapsService.MAPVINA_KEY;

  // Filter markers based on selection
  const activeNeeds = filter === 'all' || filter === 'need' ? needs.filter((n) => n.status === 'open') : [];
  const activeStories = filter === 'all' || filter === 'story' ? stories : [];
  const activeHelpers = filter === 'all' || filter === 'help' ? users.filter((u) => u.isHelperAvailable && mapsService.getHelperFreshnessState(u.locationUpdatedAt, u.isHelperAvailable) === 'LIVE') : [];

  // Calculate Real Road Route when marker is selected
  useEffect(() => {
    if (!selectedItem || (selectedItem.type !== 'need' && selectedItem.type !== 'help')) {
      setActiveRoute(null);
      setRoutingError(null);
      return;
    }

    const itemObj = selectedItem.item;
    const targetLat = itemObj.lat;
    const targetLng = itemObj.lng;

    if (!targetLat || !targetLng) return;

    const originLat = currentUser?.lat || 21.0285;
    const originLng = currentUser?.lng || 105.8542;

    setIsCalculatingRoute(true);
    setRoutingError(null);

    mapsService
      .getRealRoute({ lat: originLat, lng: originLng }, { lat: targetLat, lng: targetLng }, 'walk')
      .then((route) => {
        setActiveRoute(route);
        setIsCalculatingRoute(false);
      })
      .catch((err) => {
        console.warn('Real road routing error:', err);
        setActiveRoute(null);
        setRoutingError('Không thể tính tuyến đường lúc này.');
        setIsCalculatingRoute(false);
      });
  }, [selectedItem, currentUser]);

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] min-h-[500px] bg-slate-100 rounded-3xl overflow-hidden shadow-inner flex flex-col">
      {/* Top Map Control & Filter Bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 clay-card p-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' ? 'clay-btn-dark text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('need')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'need' ? 'clay-btn-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🆘 Cần giúp</span>
            <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {needs.filter((n) => n.status === 'open').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('help')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'help' ? 'clay-btn-emerald text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🤝 Người sẵn sàng</span>
            <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {users.filter((u) => u.isHelperAvailable && mapsService.getHelperFreshnessState(u.locationUpdatedAt, u.isHelperAvailable) === 'LIVE').length}
            </span>
          </button>
          <button
            onClick={() => setFilter('story')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'story' ? 'clay-btn-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📖 Câu chuyện</span>
            <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {stories.length}
            </span>
          </button>
        </div>
      </div>

      {/* Production MapVina Leaflet Map */}
      <div className="relative w-full h-full overflow-hidden flex-1">
        <MapVinaMap
          needs={activeNeeds}
          stories={activeStories}
          users={activeHelpers}
          currentUser={currentUser}
          activeRoute={activeRoute}
          onUserLocationChange={onUserLocationChange}
          onSelectMarker={(selected) => setSelectedItem(selected)}
          mapvinaKey={mapvinaKey}
        />
      </div>

      {/* Selected Marker Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={
          selectedItem?.type === 'need'
            ? '🆘 Yêu cầu trợ giúp gần đây'
            : selectedItem?.type === 'story'
            ? '📖 Câu chuyện địa phương'
            : '🤝 Người hỗ trợ sẵn sàng'
        }
      >
        {selectedItem?.type === 'need' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="clay-pill p-0.5 shrink-0">
                <img
                  src={(selectedItem.item as NeedRequest).requesterAvatar}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover shadow-inner"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {(selectedItem.item as NeedRequest).requesterName}
                  </h4>
                  <SafetyBadge />
                </div>
                <p className="text-xs text-slate-500 font-medium">{(selectedItem.item as NeedRequest).requesterRole}</p>
                <p className="text-xs text-[#2563EB] font-bold mt-0.5">
                  {(selectedItem.item as NeedRequest).locationName}
                </p>
              </div>
            </div>

            <div className="clay-card-warm p-4 space-y-2">
              <h5 className="font-serif font-bold text-slate-900 text-sm mb-1">
                {(selectedItem.item as NeedRequest).title}
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {(selectedItem.item as NeedRequest).description}
              </p>

              {/* Real Road Route Metrics */}
              {isCalculatingRoute ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#2563EB] clay-card-blue p-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="font-medium">Đang tính tuyến đường thực tế qua OSRM...</span>
                </div>
              ) : activeRoute ? (
                <div className="mt-3 clay-card-emerald p-3 flex items-center justify-between text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Navigation className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Tuyến đường thực tế ({activeRoute.provider})</span>
                  </div>
                  <div className="font-medium text-right">
                    <span className="font-bold text-emerald-800">{mapsService.formatDistance(activeRoute.distanceMeters)}</span>
                    <span className="text-slate-400 mx-1">•</span>
                    <span>~{activeRoute.estMinutes} phút đi bộ</span>
                  </div>
                </div>
              ) : routingError ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 clay-card p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{routingError}</span>
                </div>
              ) : null}

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Ước tính thời gian: ~{(selectedItem.item as NeedRequest).estMinutes} phút</span>
                <span className="clay-pill-amber px-2.5 py-0.5 text-amber-900 font-bold">
                  {(selectedItem.item as NeedRequest).categoryLabel}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const item = selectedItem.item as NeedRequest;
                setSelectedItem(null);
                onSelectNeed(item);
              }}
              className="clay-btn-primary w-full py-3.5 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Xem chi tiết & Sẵn sàng giúp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}


        {selectedItem?.type === 'story' && (
          <div className="space-y-4">
            <div className="clay-card-warm p-4 space-y-2">
              <span className="clay-pill-amber text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 inline-block">
                {(selectedItem.item as Story).theme}
              </span>
              <h4 className="font-serif text-base font-bold text-slate-900">
                {(selectedItem.item as Story).title}
              </h4>
              <p className="font-serif italic text-xs text-[#2563EB] font-medium">
                "{(selectedItem.item as Story).quote}"
              </p>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">
                {(selectedItem.item as Story).body}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Bởi: {(selectedItem.item as Story).authorName}</span>
              <span>{(selectedItem.item as Story).locationName}</span>
            </div>

            <button
              onClick={() => {
                const item = selectedItem.item as Story;
                setSelectedItem(null);
                onSelectStory(item);
              }}
              className="clay-btn-dark w-full py-3 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Đọc toàn bộ câu chuyện</span>
            </button>
          </div>
        )}

        {selectedItem?.type === 'help' && (
          <div className="space-y-3 text-center p-2">
            <div className="clay-pill p-1 inline-block">
              <img
                src={(selectedItem.item as UserProfile).avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover shadow-inner"
              />
            </div>
            <h4 className="font-serif font-bold text-slate-900 text-base">
              {(selectedItem.item as UserProfile).name}
            </h4>
            <p className="clay-pill-emerald text-xs font-bold px-3 py-0.5 inline-block">{(selectedItem.item as UserProfile).role}</p>
            <p className="text-xs text-slate-600 italic font-medium">"{(selectedItem.item as UserProfile).bio}"</p>
            <div className="clay-card-emerald p-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-900 font-bold">
              <HeartHandshake className="w-4 h-4 text-emerald-700" />
              <span>Đã hỗ trợ {(selectedItem.item as UserProfile).totalHelpedCount} lần quanh Phố Cổ</span>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
