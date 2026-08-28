import { HelpSession, SessionStatus, ConsentState, PrivacyState, MeetingPoint } from '../types';

export class SessionStateMachineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SessionStateMachineError';
  }
}

/**
 * Normalizes legacy or alias status codes for state machine comparison.
 */
function normalizeStatus(status: SessionStatus): SessionStatus {
  if (status === 'confirming') return 'MATCHED';
  if (status === 'active') return 'IN_PROGRESS';
  if (status === 'MEETING_CONFIRMED') return 'CONFIRMED';
  return status;
}

/**
 * Vietnamese UI labels for session statuses.
 */
export const SESSION_STATUS_LABELS: Record<string, string> = {
  MATCHED: 'Đã tìm thấy người có thể giúp bạn',
  AWAITING_CONSENT: 'Bạn có muốn gặp người này để nhận hỗ trợ?',
  MEETING_PROPOSED: 'Đã đề xuất điểm gặp',
  CONFIRMED: 'Điểm gặp đã được hai bên thống nhất',
  MEETING_CONFIRMED: 'Điểm gặp đã được hai bên thống nhất',
  EN_ROUTE: 'Đang trên đường gặp nhau',
  ARRIVED: 'Bạn đã đến điểm gặp',
  IN_PROGRESS: 'Đang hỗ trợ',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
  confirming: 'Đã tìm thấy người có thể giúp bạn',
  active: 'Đang hỗ trợ',
};

/**
 * Returns localized label for session status.
 */
export function getSessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_LABELS[status] || SESSION_STATUS_LABELS[normalizeStatus(status)] || 'Đang xử lý';
}

/**
 * Validates whether a state transition from currentStatus to targetStatus is valid.
 */
export function isValidTransition(currentStatus: SessionStatus, targetStatus: SessionStatus): boolean {
  const current = normalizeStatus(currentStatus);
  const target = normalizeStatus(targetStatus);

  if (target === 'CANCELLED') {
    return ['MATCHED', 'MEETING_PROPOSED', 'AWAITING_CONSENT', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(current);
  }

  switch (current) {
    case 'MATCHED':
      return target === 'MEETING_PROPOSED' || target === 'AWAITING_CONSENT';
    case 'MEETING_PROPOSED':
      return target === 'AWAITING_CONSENT' || target === 'CONFIRMED' || target === 'MEETING_CONFIRMED';
    case 'AWAITING_CONSENT':
      return target === 'CONFIRMED' || target === 'MEETING_CONFIRMED';
    case 'CONFIRMED':
    case 'MEETING_CONFIRMED':
      return target === 'EN_ROUTE' || target === 'ARRIVED' || target === 'IN_PROGRESS';
    case 'EN_ROUTE':
      return target === 'ARRIVED' || target === 'IN_PROGRESS';
    case 'ARRIVED':
      return target === 'IN_PROGRESS';
    case 'IN_PROGRESS':
      return target === 'COMPLETED';
    case 'COMPLETED':
    case 'CANCELLED':
      return false; // Terminal states cannot transition further
    default:
      return false;
  }
}

/**
 * Derives PrivacyState based on session status and explicit sharing triggers.
 */
export function derivePrivacyState(status: SessionStatus, explicitExactShare = false): PrivacyState {
  const normalized = normalizeStatus(status);
  if (normalized === 'COMPLETED' || normalized === 'CANCELLED') {
    return 'APPROXIMATE_ONLY';
  }
  if (explicitExactShare && ['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(normalized)) {
    return 'EXACT_LOCATION_SHARED';
  }
  if (['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(normalized)) {
    return 'MEETING_POINT_SHARED';
  }
  return 'APPROXIMATE_ONLY';
}

/**
 * Initializes a new HelpSession in the MATCHED state.
 */
export function initializeHelpSession(params: {
  id?: string;
  requestId: string;
  requesterId: string;
  helperId: string;
  needTitle?: string;
  requesterName?: string;
  helperName?: string;
  locationName?: string;
}): HelpSession {
  const now = new Date().toISOString();
  return {
    id: params.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    requestId: params.requestId,
    needId: params.requestId,
    requesterId: params.requesterId,
    helperId: params.helperId,
    status: 'MATCHED',
    consent: {
      requesterConsent: 'PENDING',
      helperConsent: 'PENDING',
    },
    privacyState: 'APPROXIMATE_ONLY',
    createdAt: now,
    updatedAt: now,
    needTitle: params.needTitle,
    requesterName: params.requesterName,
    helperName: params.helperName,
    locationName: params.locationName,
  };
}

/**
 * Proposes a MeetingPoint for an active HelpSession.
 */
export function proposeMeetingPoint(session: HelpSession, meetingPoint: MeetingPoint): HelpSession {
  if (!isValidTransition(session.status, 'MEETING_PROPOSED')) {
    throw new SessionStateMachineError(
      `Cannot propose meeting point for session in status ${session.status}`,
      'INVALID_TRANSITION'
    );
  }

  const now = new Date().toISOString();
  return {
    ...session,
    meetingPointId: meetingPoint.id,
    meetingPoint,
    status: 'MEETING_PROPOSED',
    privacyState: 'APPROXIMATE_ONLY',
    updatedAt: now,
  };
}

/**
 * Applies a participant's consent decision (ACCEPTED or DECLINED).
 */
export function applyParticipantConsent(
  session: HelpSession,
  participantRole: 'requester' | 'helper',
  consentValue: 'ACCEPTED' | 'DECLINED'
): HelpSession {
  const now = new Date().toISOString();
  const currentConsent = session.consent || { requesterConsent: 'PENDING', helperConsent: 'PENDING' };
  
  const updatedConsent: ConsentState = {
    ...currentConsent,
    [participantRole === 'requester' ? 'requesterConsent' : 'helperConsent']: consentValue,
  };

  if (consentValue === 'DECLINED') {
    return {
      ...session,
      consent: updatedConsent,
      status: 'CANCELLED',
      cancelledAt: now,
      cancellationReason: `Consent declined by ${participantRole}`,
      privacyState: 'APPROXIMATE_ONLY',
      updatedAt: now,
    };
  }

  const bothAccepted = updatedConsent.requesterConsent === 'ACCEPTED' && updatedConsent.helperConsent === 'ACCEPTED';
  const targetStatus: SessionStatus = bothAccepted ? 'CONFIRMED' : 'AWAITING_CONSENT';

  if (!isValidTransition(session.status, targetStatus) && session.status !== targetStatus) {
    throw new SessionStateMachineError(
      `Invalid transition from ${session.status} to ${targetStatus}`,
      'INVALID_TRANSITION'
    );
  }

  return {
    ...session,
    consent: updatedConsent,
    status: targetStatus,
    privacyState: derivePrivacyState(targetStatus),
    updatedAt: now,
  };
}

/**
 * Explicitly transitions a HelpSession to a target state.
 */
export function transitionHelpSession(
  session: HelpSession,
  targetStatus: SessionStatus,
  reason?: string
): HelpSession {
  if (!isValidTransition(session.status, targetStatus)) {
    throw new SessionStateMachineError(
      `Cannot transition session from ${session.status} to ${targetStatus}`,
      'INVALID_TRANSITION'
    );
  }

  const now = new Date().toISOString();
  const updated: HelpSession = {
    ...session,
    status: targetStatus,
    privacyState: derivePrivacyState(targetStatus),
    updatedAt: now,
  };

  if (targetStatus === 'IN_PROGRESS' && !updated.startedAt) {
    updated.startedAt = now;
  } else if (targetStatus === 'COMPLETED') {
    updated.completedAt = now;
  } else if (targetStatus === 'CANCELLED') {
    updated.cancelledAt = now;
    if (reason) updated.cancellationReason = reason;
  }

  return updated;
}
