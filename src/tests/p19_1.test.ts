import {
  initializeHelpSession,
  proposeMeetingPoint,
  applyParticipantConsent,
  transitionHelpSession,
  derivePrivacyState,
  getSessionStatusLabel,
  SessionStateMachineError
} from '../services/sessionStateMachine';
import { mapsService } from '../services/mapsService';
import { MeetingPoint, HelpSession } from '../types';

function runP19_1Tests() {
  console.log('=== RUNNING P19.1 PRODUCTION SESSION EXPERIENCE & SECURITY TESTS ===\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Valid full lifecycle state transitions
  const session1 = initializeHelpSession({
    requestId: 'req_p19',
    requesterId: 'user_req_101',
    helperId: 'user_help_202',
    needTitle: 'Cần hướng dẫn đường đi',
  });
  assert(session1.status === 'MATCHED', '1.1 Initial status is MATCHED');

  const mp: MeetingPoint = {
    id: 'mp_p19',
    lat: 21.0285,
    lng: 105.8542,
    name: 'Nhà thuốc Phố Cổ',
    address: 'Hàng Bạc, Hoàn Kiếm, Hà Nội',
    type: 'pharmacy',
    requesterTravelMinutes: 2,
    helperTravelMinutes: 3,
    requesterDistanceMeters: 150,
    helperDistanceMeters: 200,
    score: 98,
    reason: 'Địa điểm công cộng an toàn',
    createdAt: new Date().toISOString(),
  };

  const session2 = proposeMeetingPoint(session1, mp);
  assert(session2.status === 'MEETING_PROPOSED', '1.2 Proposed meeting point -> MEETING_PROPOSED');

  const session3 = applyParticipantConsent(session2, 'requester', 'ACCEPTED');
  assert(session3.status === 'AWAITING_CONSENT', '1.3 Requester accepts -> AWAITING_CONSENT');

  const session4 = applyParticipantConsent(session3, 'helper', 'ACCEPTED');
  assert(session4.status === 'CONFIRMED', '1.4 Helper accepts -> CONFIRMED');
  assert(session4.privacyState === 'MEETING_POINT_SHARED', '1.5 Confirmed status grants MEETING_POINT_SHARED privacy');

  const sessionEnRoute = transitionHelpSession(session4, 'EN_ROUTE');
  assert(sessionEnRoute.status === 'EN_ROUTE', '1.6 Transition CONFIRMED -> EN_ROUTE');

  const sessionArrived = transitionHelpSession(sessionEnRoute, 'ARRIVED');
  assert(sessionArrived.status === 'ARRIVED', '1.7 Transition EN_ROUTE -> ARRIVED');

  const sessionInProgress = transitionHelpSession(sessionArrived, 'IN_PROGRESS');
  assert(sessionInProgress.status === 'IN_PROGRESS', '1.8 Transition ARRIVED -> IN_PROGRESS');
  assert(!!sessionInProgress.startedAt, '1.9 StartedAt timestamp populated upon IN_PROGRESS');

  const sessionCompleted = transitionHelpSession(sessionInProgress, 'COMPLETED');
  assert(sessionCompleted.status === 'COMPLETED', '1.10 Transition IN_PROGRESS -> COMPLETED');
  assert(!!sessionCompleted.completedAt, '1.11 CompletedAt timestamp populated upon COMPLETED');

  // 2. Invalid state transitions
  let caughtCompleted = false;
  try {
    transitionHelpSession(sessionCompleted, 'IN_PROGRESS');
  } catch (e: any) {
    if (e.code === 'INVALID_TRANSITION') caughtCompleted = true;
  }
  assert(caughtCompleted, '2.1 Transition COMPLETED -> IN_PROGRESS rejected');

  let caughtCancelled = false;
  const cancelledSession = transitionHelpSession(session2, 'CANCELLED');
  try {
    transitionHelpSession(cancelledSession, 'EN_ROUTE');
  } catch (e: any) {
    if (e.code === 'INVALID_TRANSITION') caughtCancelled = true;
  }
  assert(caughtCancelled, '2.2 Transition CANCELLED -> EN_ROUTE rejected');

  // 3. Helper Freshness Checks
  const now = Date.now();
  const liveTimestamp = new Date(now - 30 * 1000).toISOString(); // 30s ago
  const staleTimestamp = new Date(now - 5 * 60 * 1000).toISOString(); // 5m ago
  const offlineTimestamp = new Date(now - 15 * 60 * 1000).toISOString(); // 15m ago

  assert(
    mapsService.getHelperFreshnessState(liveTimestamp, true) === 'LIVE',
    '3.1 Helper updated < 2 min ago is LIVE'
  );
  assert(
    mapsService.getHelperFreshnessState(staleTimestamp, true) === 'STALE',
    '3.2 Helper updated 5 min ago is STALE'
  );
  assert(
    mapsService.getHelperFreshnessState(offlineTimestamp, true) === 'OFFLINE',
    '3.3 Helper updated 15 min ago is OFFLINE'
  );
  assert(
    mapsService.getHelperFreshnessState(liveTimestamp, false) === 'OFFLINE',
    '3.4 Unavailable helper is OFFLINE regardless of timestamp'
  );

  // 4. Privacy Boundary
  assert(
    derivePrivacyState('MATCHED') === 'APPROXIMATE_ONLY',
    '4.1 MATCHED state enforces APPROXIMATE_ONLY'
  );
  assert(
    derivePrivacyState('AWAITING_CONSENT') === 'APPROXIMATE_ONLY',
    '4.2 AWAITING_CONSENT state enforces APPROXIMATE_ONLY'
  );
  assert(
    derivePrivacyState('MEETING_PROPOSED') === 'APPROXIMATE_ONLY',
    '4.3 MEETING_PROPOSED state enforces APPROXIMATE_ONLY'
  );
  assert(
    derivePrivacyState('COMPLETED') === 'APPROXIMATE_ONLY',
    '4.4 COMPLETED state resets privacy to APPROXIMATE_ONLY'
  );

  // 5. Vietnamese UI Labels mapping
  assert(
    getSessionStatusLabel('MATCHED') === 'Đã tìm thấy người có thể giúp bạn',
    '5.1 MATCHED status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('AWAITING_CONSENT') === 'Bạn có muốn gặp người này để nhận hỗ trợ?',
    '5.2 AWAITING_CONSENT status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('MEETING_PROPOSED') === 'Đã đề xuất điểm gặp',
    '5.3 MEETING_PROPOSED status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('CONFIRMED') === 'Điểm gặp đã được hai bên thống nhất',
    '5.4 CONFIRMED status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('EN_ROUTE') === 'Đang trên đường gặp nhau',
    '5.5 EN_ROUTE status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('ARRIVED') === 'Bạn đã đến điểm gặp',
    '5.6 ARRIVED status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('IN_PROGRESS') === 'Đang hỗ trợ',
    '5.7 IN_PROGRESS status Vietnamese label'
  );
  assert(
    getSessionStatusLabel('COMPLETED') === 'Đã hoàn thành',
    '5.8 COMPLETED status Vietnamese label'
  );

  console.log(`\n=== P19.1 TEST SUMMARY: ${passedCount}/${totalCount} PASSED ===`);
}

runP19_1Tests();
