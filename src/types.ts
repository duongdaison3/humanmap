export type NeedCategory = 
  | 'directions'      // Tìm đường / Chỉ hướng
  | 'translation'     // Dịch thuật đơn giản
  | 'phone_help'      // Hướng dẫn dùng điện thoại / QR
  | 'pharmacy_find'   // Tìm nhà thuốc / địa điểm công cộng
  | 'public_place'    // Tìm điểm công cộng (bến xe, WC)
  | 'other_safe';     // Giúp đỡ nhỏ an toàn khác

export type SafetyLevel = 'verified_safe' | 'low_risk';

export type RequestStatus = 'open' | 'matched' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface NeedRequest {
  id: string;
  requesterId?: string;
  requesterName: string;
  requesterAvatar: string;
  requesterRole: string; // e.g. "Người dân Phố Cổ", "Du khách", "Sinh viên"
  title: string;
  description: string;
  category: NeedCategory;
  categoryLabel: string;
  distanceMeters: number;
  estMinutes: number;
  locationName: string;
  lat: number;
  lng: number;
  createdAt: string;
  status: RequestStatus;
  safetyNote: string;
  safetyLevel: SafetyLevel;
  urgentLevel: 'low' | 'normal';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'RESTRICTED';
}

export interface MatchRecord {
  id: string;
  helpRequestId: string;
  helperId: string;
  helperName: string;
  score: number;
  status: 'suggested' | 'accepted' | 'declined';
  createdAt: string;
}

export interface InteractionRecord {
  id: string;
  helpRequestId: string;
  requesterId?: string;
  requesterName: string;
  helperId?: string;
  helperName: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface Story {
  id: string;
  authorId?: string;
  interactionId?: string;
  title: string;
  quote: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  authorVisibility?: 'anonymous' | 'public' | 'first_name';
  isPublicConsent?: boolean;
  locationName: string;
  distanceMeters: number;
  lat: number;
  lng: number;
  theme: 'Bí quyết phố cổ' | 'Lòng tốt quanh ta' | 'Ngày đầu Hà Nội' | 'Kỷ niệm đẹp' | 'Ấm áp tình người' | 'Kỷ niệm phố cổ' | string;
  createdAt: string;
  likesCount: number;
  relatedNeedId?: string;
  imageUrl?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  avatar: string;
  bio: string;
  role: string;
  locationName: string;
  lat?: number;
  lng?: number;
  totalHelpedCount: number;
  totalReceivedCount: number;
  savedStoryIds: string[];
  isHelperAvailable: boolean;
  reliabilityScore?: number;
  skills?: string[];
  preferredCategories?: NeedCategory[];
  authProvider?: 'google' | 'password' | 'demo';
  createdAt?: string;
  lastActiveAt?: string;
  locationUpdatedAt?: string;
  locationAccuracy?: number;
  onboardingCompleted?: boolean;
  privacySettings: {
    anonymousByDefault: boolean;
    shareApproxLocationOnly: boolean;
  };
}

export interface HelperCandidate {
  id: string;
  name: string;
  avatar: string;
  role: string;
  locationName: string;
  distanceMeters: number;
  isAvailable: boolean;
  skills: string[];
  primarySkillLabel: string;
  completedHelps: number;
  reliabilityScore: number;
  preferredCategories: NeedCategory[];
  matchScore: number;
  aiExplanation?: string;
  rawUser: UserProfile;
}

export type SessionStatus =
  | 'MATCHED'
  | 'MEETING_PROPOSED'
  | 'AWAITING_CONSENT'
  | 'CONFIRMED'
  | 'MEETING_CONFIRMED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'confirming'
  | 'active';

export type MeetingPointType =
  | 'public_place'
  | 'pharmacy'
  | 'hospital'
  | 'community_center'
  | 'cafe'
  | 'convenience_store'
  | 'transit_point'
  | 'other';

export interface MeetingPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  type: MeetingPointType;
  requesterTravelMinutes: number;
  helperTravelMinutes: number;
  requesterDistanceMeters: number;
  helperDistanceMeters: number;
  score: number;
  reason: string;
  createdAt: string;
  isPublicPlace?: boolean;
  source?: string;
}

export type ConsentValue = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface ConsentState {
  requesterConsent: ConsentValue;
  helperConsent: ConsentValue;
}

export type PrivacyState =
  | 'APPROXIMATE_ONLY'
  | 'MEETING_POINT_SHARED'
  | 'EXACT_LOCATION_SHARED';

export interface HelpSession {
  id: string;
  requestId: string;
  needId?: string; // legacy alias for requestId
  requesterId: string;
  helperId: string;
  status: SessionStatus;
  meetingPointId?: string;
  meetingPoint?: MeetingPoint;
  consent: ConsentState;
  privacyState: PrivacyState;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  // legacy compatibility fields
  needTitle?: string;
  requesterName?: string;
  helperName?: string;
  locationName?: string;
  storyDraft?: {
    title: string;
    quote: string;
    body: string;
  };
}

export interface SafetyCheckResult {
  isSafeMicroHelp: boolean;
  reason: string;
  rejectionWarning?: string;
}

export type MapMarkerType = 'need' | 'help' | 'story';

export interface MapMarkerItem {
  id: string;
  type: MapMarkerType;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  distanceMeters: number;
  category?: NeedCategory;
  rawObject: NeedRequest | Story | UserProfile;
}

export type RoutingErrorCode =
  | 'ROUTING_UNAVAILABLE'
  | 'ROUTING_MODE_UNSUPPORTED'
  | 'ROUTING_INVALID_REQUEST';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  estMinutes: number;
  polyline: [number, number][]; // Array of [lat, lng] waypoints
  mode: 'walk' | 'bike' | 'drive';
  provider: string; // e.g., 'osrm-foot', 'osrm-bike', 'osrm-driving'
  isRealRoadRoute: true;
  fetchedAt: number;
}

// ==========================================
// P20 ARCHITECTURE TYPES
// ==========================================

export type TrustEventType =
  | 'MATCH_CREATED'
  | 'CONSENT_GIVEN'
  | 'MEETING_CONFIRMED'
  | 'ARRIVED'
  | 'HELP_STARTED'
  | 'HELP_COMPLETED'
  | 'FEEDBACK_SUBMITTED';

export interface TrustEvent {
  id: string;
  userId: string;
  sessionId?: string;
  type: TrustEventType;
  createdAt: string;
  metadata?: Record<string, any>;
  source: 'system' | 'session' | 'user';
}

export interface TrustBadge {
  id: string;
  code: 'HELPER_LEVEL' | 'RECENT_ACTIVE' | 'HIGH_RATING' | 'LOCAL_EXPERT' | 'COMPLETED_SESSIONS';
  label: string;
  icon: string;
  description: string;
}

export interface TrustProfileData {
  userId: string;
  name: string;
  avatar: string;
  role: string;
  totalHelpedCount: number;
  completedSessionsCount: number;
  reliabilityScore: number;
  lastActiveLabel: string;
  skills: string[];
  badges: TrustBadge[];
  freshness: string;
  locationArea: string;
}

export type SafetyCheckStatus = 'PENDING' | 'OK' | 'NO_RESPONSE' | 'NEED_HELP' | 'RESOLVED';

export interface SafetyCheck {
  id: string;
  sessionId: string;
  userId: string;
  status: SafetyCheckStatus;
  createdAt: string;
  respondedAt?: string;
  triggerType: 'EN_ROUTE_CHECK' | 'JOURNEY_CHECKPOINT' | 'MANUAL';
  expiresAt?: string;
}

export interface ImpactMetrics {
  peopleHelped: number;
  completedSessions: number;
  totalHelpMinutes: number;
  activeHelpers: number;
  neighborhoodsActivated: number;
  successfulMatches: number;
  averageResponseTimeMinutes?: number;
  hasSufficientData: boolean;
}


