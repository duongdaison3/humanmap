import React, { useState, useEffect } from 'react';
import { HelpSession, UserProfile, RouteResult, MeetingPoint, SessionStatus, SafetyCheck } from '../types';
import { dataService } from '../services/dataService';
import { mapsService } from '../services/mapsService';
import { safetyCheckService } from '../services/safetyCheckService';
import { trustService } from '../services/trustService';
import { getSessionStatusLabel } from '../services/sessionStateMachine';
import { SafetyBadge } from './SafetyBadge';
import { MeetingPointSelector } from './MeetingPointSelector';
import { TrustProfileModal } from './TrustProfileModal';
import { ViralShareCard } from './ViralShareCard';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  AlertCircle,
  Loader2,
  HeartHandshake,
  UserCheck,
  X,
  Compass,
  ArrowRight,
  ShieldAlert,
  Shield,
  ThumbsUp,
  Share2,
  Award
} from 'lucide-react';

interface SessionStatusCardProps {
  session: HelpSession;
  currentUser: UserProfile | null;
  onUpdateSession: (session: HelpSession) => void;
  onCompleteSession?: (session: HelpSession) => void;
  onCloseSession?: () => void;
}

export const SessionStatusCard: React.FC<SessionStatusCardProps> = ({
  session,
  currentUser,
  onUpdateSession,
  onCompleteSession,
  onCloseSession,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number }>({
    lat: currentUser?.lat || 21.0285,
    lng: currentUser?.lng || 105.8542,
  });
  const [distanceToMeetingPoint, setDistanceToMeetingPoint] = useState<number | null>(null);
  const [routingErrCode, setRoutingErrCode] = useState<string | null>(null);
  const [currentSafetyCheck, setCurrentSafetyCheck] = useState<SafetyCheck | null>(null);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState<boolean>(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState<boolean>(false);

  const currentUid = currentUser?.id || '';
  const isRequester = currentUid === session.requesterId;
  const isHelper = currentUid === session.helperId;
  const participantRole: 'requester' | 'helper' = isRequester ? 'requester' : 'helper';

  // Timer for IN_PROGRESS
  useEffect(() => {
    let interval: any = null;
    if (session.status === 'IN_PROGRESS') {
      const startTime = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [session.status, session.startedAt]);

  // Geolocation watcher when session is EN_ROUTE
  useEffect(() => {
    let watchId: number | null = null;
    if (session.status === 'EN_ROUTE' && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentGps({ lat: latitude, lng: longitude });
        },
        (err) => console.warn('Geolocation watch error in SessionStatusCard:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }
    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [session.status]);

  // Safety Check initialize & timer effect during EN_ROUTE
  useEffect(() => {
    let timer: any = null;
    if (session.status === 'EN_ROUTE' && currentUid) {
      safetyCheckService.getSafetyCheckForSession(session.id, currentUid).then((existing) => {
        if (!existing) {
          safetyCheckService.createSafetyCheck(session.id, currentUid, 'EN_ROUTE_CHECK').then((sc) => {
            setCurrentSafetyCheck(sc);
          });
        } else {
          setCurrentSafetyCheck(existing);
        }
      });

      // 30 second timer check for no-response
      timer = setTimeout(() => {
        if (currentSafetyCheck && currentSafetyCheck.status === 'PENDING') {
          safetyCheckService.markNoResponse(currentSafetyCheck.id).then(setCurrentSafetyCheck);
        }
      }, 30000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [session.status, session.id, currentUid]);

  // Route calculation for EN_ROUTE & CONFIRMED states
  const fetchRoute = React.useCallback(() => {
    if (
      (session.status === 'EN_ROUTE' || session.status === 'CONFIRMED' || session.status === 'MEETING_CONFIRMED') &&
      session.meetingPoint
    ) {
      setIsCalculatingRoute(true);
      setRoutingErrCode(null);
      const originLat = currentGps.lat;
      const originLng = currentGps.lng;

      const dist = mapsService.calculateDistanceMeters(
        originLat,
        originLng,
        session.meetingPoint.lat,
        session.meetingPoint.lng
      );
      setDistanceToMeetingPoint(dist);

      mapsService
        .getRealRoute(
          { lat: originLat, lng: originLng },
          { lat: session.meetingPoint.lat, lng: session.meetingPoint.lng },
          'walk'
        )
        .then((route) => {
          setActiveRoute(route);
          setIsCalculatingRoute(false);
        })
        .catch((err) => {
          console.warn('Routing fetch failed:', err);
          setActiveRoute(null);
          setRoutingErrCode(err.code || 'ROUTING_UNAVAILABLE');
          setIsCalculatingRoute(false);
        });
    } else {
      setActiveRoute(null);
      setDistanceToMeetingPoint(null);
    }
  }, [session.status, session.meetingPoint, currentGps.lat, currentGps.lng]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Action Handlers
  const handleConsent = async (consentValue: 'ACCEPTED' | 'DECLINED') => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await dataService.updateSessionConsent(session.id, participantRole, consentValue);
      onUpdateSession(updated);
    } catch (err: any) {
      console.error('Error updating consent:', err);
      setErrorMessage(err.message || 'Không thể cập nhật trạng thái xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  const handleProposeMeetingPoint = async (selectedPoint: MeetingPoint) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await dataService.proposeMeetingPointForSession(session.id, selectedPoint);
      onUpdateSession(updated);
      setIsSelectorOpen(false);
    } catch (err: any) {
      console.error('Error proposing meeting point:', err);
      setErrorMessage(err.message || 'Không thể đề xuất điểm gặp.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionState = async (targetStatus: SessionStatus, reason?: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await dataService.transitionSessionState(session.id, targetStatus, reason);
      onUpdateSession(updated);
      if (targetStatus === 'COMPLETED' && onCompleteSession) {
        onCompleteSession(updated);
      }
    } catch (err: any) {
      console.error('Error transitioning state:', err);
      setErrorMessage(err.message || 'Chuyển trạng thái không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusLabel = getSessionStatusLabel(session.status);

  return (
    <div className="clay-card p-5 space-y-4 text-slate-800 relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-2xl flex items-center justify-center z-20">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs clay-pill-emerald px-4 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Đang cập nhật trạng thái...</span>
          </div>
        </div>
      )}

      {/* Header Badge & Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="clay-pill-emerald text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider">
              {session.status}
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              {session.privacyState === 'APPROXIMATE_ONLY' && '🔒 Vị trí xấp xỉ (~300m)'}
              {session.privacyState === 'MEETING_POINT_SHARED' && '📍 Vị trí điểm gặp an toàn'}
              {session.privacyState === 'EXACT_LOCATION_SHARED' && '🗺️ Vị trí trực tiếp'}
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-slate-900">{statusLabel}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {currentUser && (
            <button
              onClick={() => setIsTrustModalOpen(true)}
              className="clay-pill-emerald px-2.5 py-1 text-emerald-800 font-bold text-[11px] cursor-pointer flex items-center gap-1"
              title="Xem Hồ sơ tin cậy"
            >
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>Hồ sơ tin cậy</span>
            </button>
          )}
          {onCloseSession && (
            <button
              onClick={onCloseSession}
              className="clay-btn-white text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="clay-card-blue p-3 text-xs text-blue-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Meeting Point Selector Modal / Subview */}
      {isSelectorOpen ? (
        <MeetingPointSelector
          currentUser={currentUser}
          onSelectMeetingPoint={handleProposeMeetingPoint}
          onCancel={() => setIsSelectorOpen(false)}
          isSubmitting={loading}
        />
      ) : (
        <>
          {/* MATCHED State */}
          {(session.status === 'MATCHED' || session.status === 'confirming') && (
            <div className="space-y-3">
              <div className="clay-card-warm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="clay-pill-emerald w-8 h-8 flex items-center justify-center font-bold text-xs">
                      {session.helperName?.[0] || 'H'}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">
                        {session.needTitle || 'Yêu cầu hỗ trợ'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Đối tác: {isRequester ? session.helperName || 'Người giúp đỡ' : session.requesterName || 'Người cần giúp'}
                      </p>
                    </div>
                  </div>
                  <SafetyBadge text="Xác minh Human Map" size="small" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Hai bên đã được ghép nối. Vị trí chính xác hiện chưa được chia sẻ để bảo vệ quyền riêng tư. Hãy xác nhận đồng ý hoặc chọn điểm gặp an toàn.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => handleConsent('ACCEPTED')}
                  className="clay-btn-emerald flex-1 py-2.5 px-3 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đồng ý kết nối</span>
                </button>
                <button
                  onClick={() => setIsSelectorOpen(true)}
                  className="clay-btn-primary flex-1 py-2.5 px-3 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Đề xuất điểm gặp</span>
                </button>
              </div>
            </div>
          )}

          {/* AWAITING_CONSENT State */}
          {session.status === 'AWAITING_CONSENT' && (
            <div className="space-y-3">
              <div className="clay-card-amber p-4 space-y-2">
                <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Đang chờ hai bên đồng ý kết nối</span>
                </h4>
                <div className="text-xs space-y-1 text-slate-700 font-medium">
                  <div className="flex items-center justify-between">
                    <span>Người cần giúp ({session.requesterName || 'Người dùng'}):</span>
                    <span className="font-bold">
                      {session.consent.requesterConsent === 'ACCEPTED' ? '✅ Đã đồng ý' : '⏳ Đang chờ'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Người giúp ({session.helperName || 'Helper'}):</span>
                    <span className="font-bold">
                      {session.consent.helperConsent === 'ACCEPTED' ? '✅ Đã đồng ý' : '⏳ Đang chờ'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {((participantRole === 'requester' && session.consent.requesterConsent === 'PENDING') ||
                  (participantRole === 'helper' && session.consent.helperConsent === 'PENDING')) && (
                  <>
                    <button
                      onClick={() => handleConsent('DECLINED')}
                      className="clay-btn-white py-2.5 px-3 text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleConsent('ACCEPTED')}
                      className="clay-btn-emerald flex-1 py-2.5 px-3 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Tôi đồng ý gặp mặt</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsSelectorOpen(true)}
                  className="clay-btn-primary py-2.5 px-3 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Chọn điểm gặp khác</span>
                </button>
              </div>
            </div>
          )}

          {/* MEETING_PROPOSED State */}
          {session.status === 'MEETING_PROPOSED' && (
            <div className="space-y-3">
              {session.meetingPoint ? (
                <div className="clay-card-emerald p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-emerald-700" /> Điểm gặp đề xuất
                    </span>
                    <span className="clay-pill-emerald text-[10px] font-extrabold px-2.5 py-0.5">
                      An toàn công cộng
                    </span>
                  </div>
                  <p className="font-bold text-sm text-slate-800">{session.meetingPoint.name}</p>
                  <p className="text-slate-600 font-medium">{session.meetingPoint.address}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-700 pt-1 font-medium">
                    <span>Bạn: ~{session.meetingPoint.requesterDistanceMeters || 250}m</span>
                    <span>Đối tác: ~{session.meetingPoint.helperDistanceMeters || 250}m</span>
                    <span>🚶 ~{session.meetingPoint.requesterTravelMinutes || 3} phút</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 italic font-medium">"{session.meetingPoint.reason}"</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">Chưa chọn điểm gặp cụ thể.</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConsent('DECLINED')}
                  className="clay-btn-white py-2.5 px-3 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Từ chối / Chọn lại
                </button>
                <button
                  onClick={() => handleConsent('ACCEPTED')}
                  className="clay-btn-emerald flex-1 py-2.5 px-3 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Thống nhất điểm gặp</span>
                </button>
                <button
                  onClick={() => setIsSelectorOpen(true)}
                  className="clay-btn-white p-2.5 text-slate-600 font-bold text-xs cursor-pointer"
                  title="Đổi điểm gặp"
                >
                  <Compass className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}


      {/* CONFIRMED / MEETING_CONFIRMED State */}
      {(session.status === 'CONFIRMED' || session.status === 'MEETING_CONFIRMED') && (
        <div className="space-y-3">
          <div className="clay-card-emerald p-4 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Điểm gặp đã được hai bên thống nhất!</span>
            </div>
            {session.meetingPoint && (
              <div>
                <p className="font-bold text-slate-800">{session.meetingPoint.name}</p>
                <p className="text-slate-600 font-medium">{session.meetingPoint.address}</p>
              </div>
            )}
            <p className="text-slate-500 font-medium">Tuyến đường thực tế OSRM đã sẵn sàng.</p>
          </div>

          <button
            onClick={() => handleTransitionState('EN_ROUTE')}
            className="clay-btn-primary w-full py-3 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Bắt đầu di chuyển tới điểm gặp (En Route)</span>
          </button>
        </div>
      )}

      {/* EN_ROUTE State */}
      {session.status === 'EN_ROUTE' && (
        <div className="space-y-3">
          <div className="clay-card-emerald p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1">
                <Navigation className="w-4 h-4 animate-pulse text-[#2563EB]" /> Đang theo dõi hành trình thực tế
              </span>
              {isCalculatingRoute ? (
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang cập nhật tuyến...
                </span>
              ) : activeRoute ? (
                <span className="clay-pill-blue text-[11px] font-bold text-[#2563EB] px-2.5 py-0.5">
                  ~{activeRoute.estMinutes || Math.round((activeRoute.durationSeconds || 0) / 60)} phút • {activeRoute.distanceMeters}m
                </span>
              ) : distanceToMeetingPoint !== null ? (
                <span className="clay-pill text-[11px] font-bold text-slate-800 px-2.5 py-0.5">
                  ~{distanceToMeetingPoint}m
                </span>
              ) : null}
            </div>

            {session.meetingPoint && (
              <div>
                <p className="font-bold text-slate-800">📍 Điểm hẹn: {session.meetingPoint.name}</p>
                <p className="text-[11px] text-slate-600 font-medium">{session.meetingPoint.address}</p>
              </div>
            )}

            {/* Proximity badge if within 50m */}
            {distanceToMeetingPoint !== null && distanceToMeetingPoint <= 50 && (
              <div className="clay-card-amber p-2.5 text-[11px] font-bold text-amber-900 flex items-center gap-1.5 animate-bounce">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>Bạn đã ở rất gần điểm gặp an toàn (~{distanceToMeetingPoint}m)!</span>
              </div>
            )}

            {/* Routing error alert with retry button */}
            {routingErrCode && (
              <div className="clay-card-amber p-2.5 text-[11px] text-amber-900 flex items-center justify-between">
                <span>Không thể tải lộ trình OSRM ({routingErrCode}). Bấm để thử lại.</span>
                <button
                  onClick={fetchRoute}
                  className="clay-btn-white px-2 py-0.5 text-amber-900 font-bold cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            )}

            <p className="text-slate-600 leading-relaxed font-medium">
              Hãy di chuyển theo tuyến đường công cộng. Vị trí chính xác riêng tư của bạn không bị chia sẻ với bất kỳ ai.
            </p>
          </div>

          {/* Safety Check Layer UI */}
          {currentSafetyCheck && (
            <div className="clay-card-emerald p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Mọi thứ vẫn ổn chứ?
                </span>
                <span className="clay-pill-emerald text-[10px] text-emerald-800 font-extrabold px-2 py-0.5">Safety Check</span>
              </div>

              {currentSafetyCheck.status === 'PENDING' && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      safetyCheckService.respondSafetyCheck(currentSafetyCheck.id, currentUid, 'OK').then(setCurrentSafetyCheck);
                    }}
                    className="clay-btn-emerald flex-1 py-2 px-3 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Tôi ổn
                  </button>
                  <button
                    onClick={() => {
                      safetyCheckService.respondSafetyCheck(currentSafetyCheck.id, currentUid, 'NEED_HELP').then(setCurrentSafetyCheck);
                    }}
                    className="clay-btn-white py-2 px-3 text-amber-900 font-bold cursor-pointer"
                  >
                    Cần hỗ trợ
                  </button>
                </div>
              )}

              {currentSafetyCheck.status === 'OK' && (
                <p className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Bạn đã xác nhận an toàn.
                </p>
              )}

              {currentSafetyCheck.status === 'NO_RESPONSE' && (
                <div className="clay-card-amber p-2.5 space-y-2">
                  <p className="text-amber-950 font-medium">Chưa nhận được phản hồi. Hãy xác nhận nếu bạn an toàn.</p>
                  <button
                    onClick={() => {
                      safetyCheckService.respondSafetyCheck(currentSafetyCheck.id, currentUid, 'OK').then(setCurrentSafetyCheck);
                    }}
                    className="clay-btn-primary w-full py-1.5 text-white font-bold cursor-pointer"
                  >
                    Xác nhận tôi ổn
                  </button>
                </div>
              )}

              {currentSafetyCheck.status === 'NEED_HELP' && (
                <div className="clay-card-blue p-3 space-y-1.5 text-blue-950">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    Hướng dẫn an toàn
                  </p>
                  <p className="text-[11px] leading-relaxed font-medium">
                    Hãy di chuyển tới vị trí công cộng đông người. Bạn có thể tạm dừng di chuyển hoặc yêu cầu hỗ trợ khẩn cấp nếu gặp bất kỳ mối nguy hiểm nào.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => handleTransitionState('ARRIVED')}
            className={`clay-btn-emerald w-full py-3 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 ${
              distanceToMeetingPoint !== null && distanceToMeetingPoint <= 50
                ? 'ring-2 ring-emerald-400 animate-pulse'
                : ''
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Tôi đã đến điểm gặp (ARRIVED)</span>
          </button>
        </div>
      )}

      {/* ARRIVED State */}
      {session.status === 'ARRIVED' && (
        <div className="space-y-3">
          <div className="clay-card-emerald p-4 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Đã đến điểm gặp an toàn</span>
            </h4>
            <p className="text-slate-600 font-medium">
              Bạn đã mặt tại điểm hẹn. Hãy tìm đối tác và bắt đầu hoạt động trợ giúp.
            </p>
          </div>

          <button
            onClick={() => handleTransitionState('IN_PROGRESS')}
            className="clay-btn-primary w-full py-3 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Xác nhận bắt đầu hỗ trợ (IN_PROGRESS)</span>
          </button>
        </div>
      )}

      {/* IN_PROGRESS / active State */}
      {(session.status === 'IN_PROGRESS' || session.status === 'active') && (
        <div className="space-y-3">
          <div className="clay-card-emerald p-4 flex items-center justify-between text-xs">
            <div>
              <span className="clay-pill-emerald font-extrabold uppercase tracking-wider text-[10px] px-2.5 py-0.5">
                🟢 ĐANG HỖ TRỢ
              </span>
              <p className="font-bold text-slate-900 mt-1">{session.needTitle || 'Hỗ trợ nhỏ'}</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold text-emerald-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">Thời gian</span>
            </div>
          </div>

          <button
            onClick={() => handleTransitionState('COMPLETED')}
            className="clay-btn-emerald w-full py-3 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã hoàn thành hỗ trợ (COMPLETED)</span>
          </button>
        </div>
      )}

      {/* COMPLETED State */}
      {session.status === 'COMPLETED' && (
        <div className="space-y-3 text-center">
          <div className="clay-card-emerald p-5 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
            <h4 className="font-bold text-sm text-slate-900">Hỗ trợ hoàn thành xuất sắc!</h4>
            <p className="text-xs text-slate-600 font-medium">
              Cảm ơn bạn đã đóng góp tạo nên một Hà Nội tử tế và ấm áp hơn.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsShareCardOpen(true)}
              className="clay-btn-primary flex-1 py-3 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ câu chuyện & Tác động</span>
            </button>
            {onCloseSession && (
              <button
                onClick={onCloseSession}
                className="clay-btn-dark py-3 px-4 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}

      {/* CANCELLED State */}
      {session.status === 'CANCELLED' && (
        <div className="space-y-3 text-center">
          <div className="clay-card p-4 space-y-1">
            <ShieldAlert className="w-6 h-6 text-slate-400 mx-auto" />
            <h4 className="font-bold text-xs text-slate-700">Tiến trình đã hủy</h4>
            <p className="text-[11px] text-slate-500 font-medium">
              {session.cancellationReason || 'Tiến trình hỗ trợ đã được dừng.'}
            </p>
          </div>
          {onCloseSession && (
            <button
              onClick={onCloseSession}
              className="clay-btn-white py-2 px-4 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Đóng
            </button>
          )}
        </div>
      )}

      {/* Trust Profile Modal */}
      {currentUser && (
        <TrustProfileModal
          user={currentUser}
          isOpen={isTrustModalOpen}
          onClose={() => setIsTrustModalOpen(false)}
        />
      )}

      {/* Viral Share Card Modal */}
      <ViralShareCard
        session={session}
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
      />
    </div>
  );
};
