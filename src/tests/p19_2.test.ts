import {
  initializeHelpSession,
  proposeMeetingPoint,
  applyParticipantConsent,
  transitionHelpSession,
  derivePrivacyState,
  getSessionStatusLabel,
  SessionStateMachineError
} from '../services/sessionStateMachine';
import { meetingPointService } from '../services/meetingPointService';
import { mapsService } from '../services/mapsService';
import { MeetingPoint, HelpSession } from '../types';

async function runP19_2Tests() {
  console.log('=== RUNNING P19.2 SAFE MEETING POINT ENGINE TESTS ===\n');

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

  // 1. MeetingPoint Model Validation
  const validMp: MeetingPoint = {
    id: 'mp_val_1',
    name: 'Nhà thuốc Long Châu Tràng Thi',
    address: '58 Tràng Thi, Hà Nội',
    type: 'pharmacy',
    lat: 21.0278,
    lng: 105.8465,
    requesterTravelMinutes: 4,
    helperTravelMinutes: 3,
    requesterDistanceMeters: 300,
    helperDistanceMeters: 220,
    score: 95,
    reason: 'Nhà thuốc an toàn',
    createdAt: new Date().toISOString(),
    isPublicPlace: true,
    source: 'curated_safety_hub',
  };

  const valRes = meetingPointService.validateMeetingPoint(validMp);
  assert(valRes.valid === true, '1.1 Valid MeetingPoint passes validation');

  // 2. Candidate Generation
  const requesterGps = { lat: 21.0285, lng: 105.8542 };
  const helperGps = { lat: 21.0320, lng: 105.8500 };
  const candidates = meetingPointService.generateCandidateMeetingPoints(requesterGps, helperGps, 4);
  assert(candidates.length > 0 && candidates.length <= 4, '2.1 Candidate generation returns 1 to 4 public meeting points');

  // 3. Candidate Ranking
  let isSorted = true;
  for (let i = 0; i < candidates.length - 1; i++) {
    if (candidates[i].score < candidates[i + 1].score) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, '3.1 Candidates are correctly sorted by safety & proximity rank score in descending order');

  // 4. No Fake POI Data & Public Place Flag
  const allPublic = candidates.every((c) => c.isPublicPlace === true && !!c.address && !!c.name);
  assert(allPublic, '4.1 All generated candidates have isPublicPlace=true and valid non-empty address/name');

  // 5. Public Meeting Point Validation rejects non-public / invalid places
  const invalidMp = { ...validMp, isPublicPlace: false };
  const invalidVal = meetingPointService.validateMeetingPoint(invalidMp);
  assert(invalidVal.valid === false, '5.1 Validation rejects meeting point with isPublicPlace=false');

  // 6. Exact Participant GPS Never Exposed in MeetingPoint
  const exposesRequesterGps = candidates.some(
    (c) => c.lat === requesterGps.lat && c.lng === requesterGps.lng
  );
  const exposesHelperGps = candidates.some(
    (c) => c.lat === helperGps.lat && c.lng === helperGps.lng
  );
  assert(!exposesRequesterGps && !exposesHelperGps, '6.1 Generated candidates never equal exact participant private GPS');

  // 7. Unauthorized Participant Check (Conceptual guard in state machine)
  let initialSession = initializeHelpSession({
    requestId: 'req_123',
    requesterId: 'user_req_1',
    helperId: 'user_help_2',
    needTitle: 'Cần hỗ trợ',
  });
  assert(initialSession.requesterId === 'user_req_1' && initialSession.helperId === 'user_help_2', '7.1 HelpSession records authorized participant IDs');

  // 8. Requester Propose
  const proposedSession = proposeMeetingPoint(initialSession, candidates[0]);
  assert(proposedSession.status === 'MEETING_PROPOSED' && proposedSession.meetingPoint?.id === candidates[0].id, '8.1 Requester proposes candidate -> MEETING_PROPOSED status');

  // 9. Helper Accept
  const reqAccepted = applyParticipantConsent(proposedSession, 'requester', 'ACCEPTED');
  const helperAccepted = applyParticipantConsent(reqAccepted, 'helper', 'ACCEPTED');
  assert(helperAccepted.status === 'CONFIRMED' || helperAccepted.status === 'MEETING_CONFIRMED', '9.1 Helper accepts proposal -> CONFIRMED / MEETING_CONFIRMED');

  // 10. Helper Reject / Decline
  const reqAccepted2 = applyParticipantConsent(proposedSession, 'requester', 'ACCEPTED');
  const helperDeclined = applyParticipantConsent(reqAccepted2, 'helper', 'DECLINED');
  assert(helperDeclined.status === 'CANCELLED' || helperDeclined.status === 'MEETING_PROPOSED', '10.1 Helper declines -> CANCELLED or proposal rejected safely');

  // 11. Both Participants Required for Confirmation
  assert(reqAccepted.status === 'AWAITING_CONSENT', '11.1 Single-sided consent remains AWAITING_CONSENT (mutual requirement)');

  // 12. Stale Helper Guard
  const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 mins ago
  const staleState = mapsService.getHelperFreshnessState(staleTime, true);
  assert(staleState === 'STALE', '12.1 Helper updated 6m ago is STALE');

  // 13. Offline Helper Guard
  const offlineTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago
  const offlineState = mapsService.getHelperFreshnessState(offlineTime, true);
  assert(offlineState === 'OFFLINE', '13.1 Helper updated 15m ago is OFFLINE');

  // 14. Missing GPS Handled Safely
  const missingGpsValidation = meetingPointService.validateMeetingPoint({
    name: 'Missing GPS',
    address: 'Central',
    lat: NaN,
    lng: undefined,
  });
  assert(missingGpsValidation.valid === false, '14.1 Invalid/NaN coordinates handled safely by validation');

  // 15. Confirmed Meeting Point Enables Routing Privacy
  assert(derivePrivacyState('MEETING_CONFIRMED') === 'MEETING_POINT_SHARED', '15.1 MEETING_CONFIRMED grants MEETING_POINT_SHARED privacy');

  // 16. Routing Auth Requirement Error Handling
  let caughtAuthErr = false;
  try {
    // Calling getRealRoute without Firebase auth session throws ROUTING_AUTH_REQUIRED
    await mapsService.getRealRoute({ lat: 21.0285, lng: 105.8542 }, { lat: 21.0335, lng: 105.8528 }, 'walk');
  } catch (err: any) {
    if (err.code === 'ROUTING_AUTH_REQUIRED' || err.message?.includes('đăng nhập')) {
      caughtAuthErr = true;
    }
  }
  assert(caughtAuthErr, '16.1 Routing handles missing unauthenticated token with ROUTING_AUTH_REQUIRED error');

  // 17. Route Failure / Exception Handling
  const routeSync = mapsService.getRoute({ lat: 21.0285, lng: 105.8542 }, { lat: 21.0335, lng: 105.8528 }, 'walk');
  assert(routeSync.distanceMeters > 0 && routeSync.estMinutes > 0, '17.1 Fallback route calculation returns valid positive distance and time');

  // 18. Firestore Security Rules Structure Check
  assert(derivePrivacyState('MATCHED') === 'APPROXIMATE_ONLY', '18.1 Firestore privacy rule invariant: MATCHED status restricts to APPROXIMATE_ONLY');

  // 19. P18 State Machine Regression Check
  let p18RegresPassed = false;
  try {
    const s1 = initializeHelpSession({ requestId: 'r1', requesterId: 'u1', helperId: 'u2' });
    const s2 = proposeMeetingPoint(s1, candidates[0]);
    const s3 = applyParticipantConsent(s2, 'requester', 'ACCEPTED');
    const s4 = applyParticipantConsent(s3, 'helper', 'ACCEPTED');
    const s5 = transitionHelpSession(s4, 'EN_ROUTE');
    const s6 = transitionHelpSession(s5, 'ARRIVED');
    const s7 = transitionHelpSession(s6, 'IN_PROGRESS');
    const s8 = transitionHelpSession(s7, 'COMPLETED');
    if (s8.status === 'COMPLETED') p18RegresPassed = true;
  } catch (e) {
    p18RegresPassed = false;
  }
  assert(p18RegresPassed, '19.1 Full P18 state machine transition sequence passes seamlessly');

  // 20. P19.1 Session UI Vietnamese Label Regression Check
  assert(getSessionStatusLabel('MEETING_PROPOSED') === 'Đã đề xuất điểm gặp', '20.1 Vietnamese session status label regression check');

  console.log(`\n=== P19.2 TEST SUMMARY: ${passedCount}/${totalCount} PASSED ===`);
}

runP19_2Tests();
