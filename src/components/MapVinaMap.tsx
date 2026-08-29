import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { NeedRequest, Story, UserProfile, MapMarkerType, RouteResult, MeetingPoint } from '../types';
import { HANOI_CENTER } from '../data/mockData';
import { LocateFixed, Loader2, Navigation, MapPin } from 'lucide-react';

interface MapVinaMapProps {
  needs: NeedRequest[];
  stories: Story[];
  users: UserProfile[];
  currentUser?: UserProfile | null;
  activeRoute?: RouteResult | null;
  meetingPoint?: MeetingPoint | null;
  onUserLocationChange?: (coords: { lat: number; lng: number }) => void;
  onGoHome: () => void;
  onSelectMarker: (item: { type: MapMarkerType; item: NeedRequest | Story | UserProfile }) => void;
}

export const MapVinaMap: React.FC<MapVinaMapProps> = ({
  needs,
  stories,
  users,
  currentUser,
  activeRoute,
  meetingPoint,
  onUserLocationChange,
  onGoHome,
  onSelectMarker,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);


  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: currentUser?.lat || HANOI_CENTER.lat,
    lng: currentUser?.lng || HANOI_CENTER.lng,
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'checking' | 'prompt' | 'granted' | 'denied'>('checking');

  // Sync user location update
  const handleLocationUpdate = (latitude: number, longitude: number, isInitial: boolean = false) => {
    const newPos = { lat: latitude, lng: longitude };
    setUserCoords(newPos);
    setPermissionState('granted');
    try {
      localStorage.setItem('humanmap_location_banner_dismissed', 'true');
    } catch {
      // ignore storage errors
    }
    if (onUserLocationChange) {
      onUserLocationChange(newPos);
    }
    if (isInitial && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], 16, {
        duration: 1.5,
      });
    }
  };

  // Function to request user real location & start continuous watch
  const locateUserPosition = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      if (!silent) setLocationStatus('Trình duyệt không hỗ trợ Geolocation.');
      setPermissionState('denied');
      return;
    }

    setIsLocating(true);
    if (!silent) setLocationStatus('Đang lấy vị trí thực tế từ GPS...');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        setPermissionState('granted');
        if (!silent) {
          setLocationStatus(`Đã cập nhật vị trí thực tế: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        handleLocationUpdate(latitude, longitude, true);

        // Start continuous watchPosition to track movement dynamically
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const { latitude: wLat, longitude: wLng } = watchPos.coords;
            handleLocationUpdate(wLat, wLng, false);
          },
          (err) => console.warn('WatchPosition error:', err),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );

        if (!silent) {
          setTimeout(() => setLocationStatus(null), 4000);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
        }
        if (!silent) {
          setLocationStatus(
            error.code === error.PERMISSION_DENIED
              ? 'Bạn chưa cấp quyền vị trí. Hãy bật quyền trong trình duyệt rồi thử lại.'
              : 'Chưa thể lấy GPS. Vui lòng thử lại.'
          );
          setTimeout(() => setLocationStatus(null), 4000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Check existing geolocation permissions on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setPermissionState('granted');
            try {
              localStorage.setItem('humanmap_location_banner_dismissed', 'true');
            } catch {
              // ignore
            }
            // Auto acquire position silently since permission is already granted
            locateUserPosition(true);
          } else if (permissionStatus.state === 'denied') {
            setPermissionState('denied');
          } else {
            setPermissionState('prompt');
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setPermissionState('granted');
              locateUserPosition(true);
            } else if (permissionStatus.state === 'denied') {
              setPermissionState('denied');
            } else {
              setPermissionState('prompt');
            }
          };
        })
        .catch(() => {
          // Geolocation query permission not supported in some browsers
          setPermissionState('prompt');
        });
        } else {
          setPermissionState('prompt');
    }
  }, []);

  const handleRequestLocationFromBanner = () => {
    locateUserPosition(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (permissionState !== 'granted') return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userCoords.lat, userCoords.lng],
        zoom: 15,
        zoomControl: false,
      });

      // Primary MapVina Tile Layer
      const mapvinaTileUrl = '/api/mapvina/tile/{z}/{x}/{y}.png';
      const mapvinaLayer = L.tileLayer(mapvinaTileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://mapvina.com" target="_blank" rel="noopener">MapVina</a>',
      });

      // Fallback OpenStreetMap Layer if MapVina tile fails
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      });

      mapvinaLayer.on('tileerror', () => {
        if (map.hasLayer(mapvinaLayer)) {
          map.removeLayer(mapvinaLayer);
          osmLayer.addTo(map);
        }
      });

      mapvinaLayer.addTo(map);

      // Layer group for markers
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [permissionState]);

  // Sync coords and pan map when currentUser location changes (e.g. province switched)
  useEffect(() => {
    if (currentUser?.lat && currentUser?.lng) {
      setUserCoords({ lat: currentUser.lat, lng: currentUser.lng });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([currentUser.lat, currentUser.lng], 14, { duration: 1.2 });
      }
    }
  }, [currentUser?.lat, currentUser?.lng]);

  // Update Markers when needs, stories, users or userCoords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Current User Position Marker
    const userHtml = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-blue-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-lg"></span>
      </div>
    `;
    const userIcon = L.divIcon({
      html: userHtml,
      className: 'user-pos-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(markersGroup)
      .bindTooltip('Vị trí thực tế của bạn', { direction: 'top', offset: [0, -10] });

    // 2. Need Requests
    needs.forEach((need) => {
      const html = `
        <div class="cursor-pointer group transform hover:scale-110 transition-transform">
          <div class="bg-[#2563EB] text-white p-2 rounded-2xl shadow-lg border-2 border-white flex items-center gap-1.5 min-w-[120px]">
            <span class="text-sm">🆘</span>
            <div class="truncate text-left">
              <p class="font-bold text-[10px] leading-tight truncate text-white">${need.requesterName}</p>
              <p class="text-[9px] text-blue-100 truncate">${need.title}</p>
            </div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        html,
        className: 'need-marker-icon',
        iconSize: [120, 36],
        iconAnchor: [60, 18],
      });
      const marker = L.marker([need.lat, need.lng], { icon });
      marker.on('click', () => onSelectMarker({ type: 'need', item: need }));
      marker.addTo(markersGroup);
    });

    // 3. Helpers (Including current user if available)
    const displayHelpers = [...users];
    if (currentUser?.isHelperAvailable) {
      const isAlreadyInList = displayHelpers.some(
        (u) => u.id === currentUser.id || (currentUser.uid && u.uid === currentUser.uid)
      );
      if (!isAlreadyInList) {
        displayHelpers.push({
          ...currentUser,
          lat: userCoords.lat,
          lng: userCoords.lng,
        });
      }
    }

    displayHelpers.forEach((helper) => {
      const isCurrentUser =
        helper.id === currentUser?.id || (currentUser?.uid && helper.uid === currentUser.uid);
      const lat = isCurrentUser
        ? userCoords.lat
        : helper.lat || HANOI_CENTER.lat + Math.sin(helper.id.charCodeAt(5) || 0) * 0.006;
      const lng = isCurrentUser
        ? userCoords.lng
        : helper.lng || HANOI_CENTER.lng + Math.cos(helper.id.charCodeAt(5) || 0) * 0.006;

      const html = `
        <div class="cursor-pointer group transform hover:scale-110 transition-transform">
          <div class="bg-[#F59E0B] text-white p-1.5 rounded-2xl shadow-lg border-2 ${
            isCurrentUser ? 'border-blue-400 ring-2 ring-blue-500' : 'border-white'
          } flex items-center gap-1.5">
            <img src="${helper.avatar}" class="w-6 h-6 rounded-full object-cover border border-white" />
            <div class="truncate text-left max-w-[95px]">
              <p class="font-bold text-[10px] leading-tight truncate text-white">${helper.name} ${
        isCurrentUser ? '(Bạn)' : ''
      }</p>
              <p class="text-[8px] text-amber-100 truncate">🤝 Sẵn sàng giúp</p>
            </div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        html,
        className: 'helper-marker-icon',
        iconSize: [110, 32],
        iconAnchor: [55, 16],
      });
      const marker = L.marker([lat, lng], { icon });
      marker.on('click', () => onSelectMarker({ type: 'help', item: helper }));
      marker.addTo(markersGroup);
    });

    // 4. Stories
    stories.forEach((story) => {
      const html = `
        <div class="cursor-pointer group transform hover:scale-110 transition-transform">
          <div class="bg-[#3498DB] text-white p-2 rounded-2xl shadow-lg border-2 border-white flex items-center gap-1.5 min-w-[110px]">
            <span class="text-sm">📖</span>
            <div class="truncate text-left">
              <p class="font-bold text-[10px] leading-tight truncate text-white">${story.title}</p>
              <p class="text-[8px] text-blue-100 truncate">${story.authorName}</p>
            </div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        html,
        className: 'story-marker-icon',
        iconSize: [110, 36],
        iconAnchor: [55, 18],
      });
      const marker = L.marker([story.lat, story.lng], { icon });
      marker.on('click', () => onSelectMarker({ type: 'story', item: story }));
      marker.addTo(markersGroup);
    });

    // 5. Confirmed Safe Public Meeting Point
    if (meetingPoint && typeof meetingPoint.lat === 'number' && typeof meetingPoint.lng === 'number') {
      const html = `
        <div class="cursor-pointer group transform hover:scale-110 transition-transform z-30">
          <div class="bg-[#2D5A27] text-white p-2.5 rounded-2xl shadow-2xl border-2 border-[#F1C40F] flex items-center gap-2 min-w-[140px] ring-2 ring-[#2D5A27]/40">
            <span class="text-base animate-bounce">📍</span>
            <div class="truncate text-left">
              <p class="font-bold text-[10px] leading-tight text-[#F1C40F] uppercase tracking-wider">Điểm gặp an toàn</p>
              <p class="font-bold text-[11px] leading-tight truncate text-white">${meetingPoint.name}</p>
            </div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        html,
        className: 'meeting-point-marker-icon',
        iconSize: [150, 42],
        iconAnchor: [75, 21],
      });
      L.marker([meetingPoint.lat, meetingPoint.lng], { icon })
        .addTo(markersGroup)
        .bindTooltip(`📍 ${meetingPoint.name} (${meetingPoint.address})`, { direction: 'top', offset: [0, -12] });
    }
  }, [needs, stories, users, userCoords, meetingPoint, onSelectMarker]);

  // Render Real Road Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (activeRoute && activeRoute.polyline && activeRoute.polyline.length > 0) {
      const polylineLayer = L.polyline(activeRoute.polyline, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routeLayerRef.current = polylineLayer;

      const bounds = polylineLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      }
    }
  }, [activeRoute]);


  return (
    <div className="relative w-full h-full">
      {permissionState === 'granted' && <div ref={mapContainerRef} className="w-full h-full z-10" />}

      {/* Location Access Indicator Banner */}
      {permissionState !== 'granted' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/35 p-4 animate-fade-in">
          <div className="clay-card shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-5 max-w-md w-full text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 clay-pill-pink text-[#2563EB] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 animate-bounce text-[#2563EB]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span>{permissionState === 'denied' ? 'Không thể hiển thị bản đồ' : 'Cấp quyền để xem bản đồ MapVina'}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
                {permissionState === 'denied'
                  ? 'Bạn đã từ chối quyền vị trí. Hãy bật lại quyền vị trí cho trang web trong cài đặt trình duyệt, sau đó thử cấp quyền lại.'
                  : 'Ứng dụng cần quyền định vị GPS để hiển thị bản đồ và các ca cần hỗ trợ gần bạn nhất.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 mt-3">
            <button
              onClick={handleRequestLocationFromBanner}
              disabled={isLocating}
              className="clay-btn-primary py-1.5 px-3.5 text-white font-bold flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang định vị...</span>
                </>
              ) : (
                <>
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Cấp quyền vị trí</span>
                </>
              )}
            </button>
            <button
              onClick={onGoHome}
              className="clay-btn-white py-1.5 px-3.5 text-slate-700 font-bold cursor-pointer text-xs"
            >
              Về trang chủ
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Geolocation Status Toast Banner */}
      {locationStatus && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 clay-btn-dark text-white text-xs px-4 py-2 flex items-center gap-2 animate-fade-in pointer-events-none">
          <Navigation className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>{locationStatus}</span>
        </div>
      )}

      {/* Floating Controls for Zoom & Locate Me */}
      <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
        <button
          onClick={() => locateUserPosition()}
          disabled={isLocating}
          className="w-10 h-10 clay-btn-dark text-amber-200 flex items-center justify-center cursor-pointer font-bold disabled:opacity-50"
          title="Định vị vị trí thực tế của tôi"
          aria-label="Lấy vị trí GPS của tôi"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-200" />
          ) : (
            <LocateFixed className="w-5 h-5 text-amber-200" />
          )}
        </button>

        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-10 h-10 clay-btn-white text-slate-800 flex items-center justify-center cursor-pointer font-bold text-lg"
          title="Phóng to"
        >
          +
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-10 h-10 clay-btn-white text-slate-800 flex items-center justify-center cursor-pointer font-bold text-lg"
          title="Thu nhỏ"
        >
          -
        </button>
        <button
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([HANOI_CENTER.lat, HANOI_CENTER.lng], 15);
            }
          }}
          className="w-10 h-10 clay-btn-primary text-white flex items-center justify-center cursor-pointer font-bold text-xs"
          title="Về Hồ Gươm"
        >
          🎯
        </button>
      </div>
    </div>
  );
};

