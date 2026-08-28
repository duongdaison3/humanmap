import {
  initializeHelpSession,
  proposeMeetingPoint,
  applyParticipantConsent,
  transitionHelpSession,
  derivePrivacyState,
  isValidTransition,
  getSessionStatusLabel,
  SessionStateMachineError
} from '../services/sessionStateMachine';
import { MeetingPoint, HelpSession } from '../types';

function runTests() {
  console.log('=== RUNNING P18 SECURITY & STATE MACHINE TESTS ===\n');

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

  // Test 1: MATCHED -> MEETING_PROPOSED
  const session1 = initializeHelpSession({
    requestId: 'req_123',
    requesterId: 'user_requester',
    helperId: 'user_helper',
    needTitle: 'Cần tìm đường phố Cổ',
  });
  assert(session1.status === 'MATCHED', 'Initial session status is MATCHED');
  assert(session1.privacyState === 'APPROXIMATE_ONLY', 'Initial privacy state is APPROXIMATE_ONLY');

  const mpData: MeetingPoint = {
    id: 'mp_1',
    lat: 21.0285,
    lng: 105.8542,
    name: 'Bờ Hồ Hoàn Kiếm',
    address: 'Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội',
    type: 'public_place',
    requesterTravelMinutes: 3,
    helperTravelMinutes: 4,
    requesterDistanceMeters: 200,
    helperDistanceMeters: 300,
    score: 95,
    reason: 'Safe public space in center',
    createdAt: new Date().toISOString(),
  };

  const session2 = proposeMeetingPoint(session1, mpData);
  assert(session2.status === 'MEETING_PROPOSED', '1. MATCHED -> MEETING_PROPOSED');
  assert(session2.privacyState === 'APPROXIMATE_ONLY', 'MEETING_PROPOSED privacy is APPROXIMATE_ONLY');

  // Test 2: MEETING_PROPOSED -> AWAITING_CONSENT (requester accepts, helper remains pending -> NOT CONFIRMED)
  const session3 = applyParticipantConsent(session2, 'requester', 'ACCEPTED');
  assert(session3.status === 'AWAITING_CONSENT', '2 & 3. Requester accepts, helper pending -> AWAITING_CONSENT (NOT CONFIRMED)');
  assert(session3.consent.requesterConsent === 'ACCEPTED', 'Requester consent recorded ACCEPTED');
  assert(session3.consent.helperConsent === 'PENDING', 'Helper consent remains PENDING');
  assert(session3.privacyState === 'APPROXIMATE_ONLY', 'Privacy remains APPROXIMATE_ONLY while awaiting helper consent');

  // Test 4: Helper accepts when requester already accepted -> CONFIRMED
  const session4 = applyParticipantConsent(session3, 'helper', 'ACCEPTED');
  assert(session4.status === 'CONFIRMED', '4. Helper accepts -> CONFIRMED');
  assert(session4.privacyState === 'MEETING_POINT_SHARED', 'Confirmed session updates privacyState to MEETING_POINT_SHARED');

  // Test 5: One party declines -> CANCELLED
  const sessionDeclined = applyParticipantConsent(session2, 'helper', 'DECLINED');
  assert(sessionDeclined.status === 'CANCELLED', '5. Helper declines -> CANCELLED');
  assert(sessionDeclined.privacyState === 'APPROXIMATE_ONLY', 'Declined session privacy remains APPROXIMATE_ONLY');

  // Test 6: Invalid transition (COMPLETED -> IN_PROGRESS or CANCELLED -> CONFIRMED) -> thrown error
  const completedSession = transitionHelpSession(
    transitionHelpSession(
      transitionHelpSession(
        transitionHelpSession(session4, 'EN_ROUTE'),
        'ARRIVED'
      ),
      'IN_PROGRESS'
    ),
    'COMPLETED'
  );
  let caughtInvalid = false;
  try {
    transitionHelpSession(completedSession, 'IN_PROGRESS');
  } catch (e: any) {
    if (e.code === 'INVALID_TRANSITION') caughtInvalid = true;
  }
  assert(caughtInvalid, '6. Invalid transition from COMPLETED to IN_PROGRESS rejected');

  // Test 7 & 8: Privacy & exact location protection check
  assert(session2.meetingPoint?.lat === 21.0285, 'MeetingPoint is explicit meeting location, not private user GPS');
  assert(session1.privacyState === 'APPROXIMATE_ONLY', 'Match state privacy is strictly APPROXIMATE_ONLY');

  // Test 9: Localized Vietnamese Labels
  assert(getSessionStatusLabel('MATCHED') === 'Đã tìm thấy người có thể giúp bạn', 'MATCHED label matches');
  assert(getSessionStatusLabel('AWAITING_CONSENT') === 'Bạn có muốn gặp người này để nhận hỗ trợ?', 'AWAITING_CONSENT label matches');
  assert(getSessionStatusLabel('MEETING_PROPOSED') === 'Đã đề xuất điểm gặp', 'MEETING_PROPOSED label matches');
  assert(getSessionStatusLabel('CONFIRMED') === 'Điểm gặp đã được hai bên thống nhất', 'CONFIRMED label matches');
  assert(getSessionStatusLabel('EN_ROUTE') === 'Đang trên đường gặp nhau', 'EN_ROUTE label matches');
  assert(getSessionStatusLabel('ARRIVED') === 'Bạn đã đến điểm gặp', 'ARRIVED label matches');
  assert(getSessionStatusLabel('IN_PROGRESS') === 'Đang hỗ trợ', 'IN_PROGRESS label matches');
  assert(getSessionStatusLabel('COMPLETED') === 'Đã hoàn thành', 'COMPLETED label matches');

  console.log(`\n=== TEST SUMMARY: ${passedCount}/${totalCount} PASSED ===`);
}

runTests();
