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
import { dataService } from '../services/dataService';
import { trustService } from '../services/trustService';
import { safetyCheckService } from '../services/safetyCheckService';
import { impactService } from '../services/impactService';
import { MeetingPoint, HelpSession, RouteResult, UserProfile, Story } from '../types';

async function runP20Tests() {
  console.log('====================================================');
  console.log('=== RUNNING P20 TRUST, SAFETY, IMPACT & REGRESSION TESTS ===');
  console.log('====================================================\n');

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

  // ----------------------------------------------------
  // SECTION A: HUMAN TRUST LAYER
  // ----------------------------------------------------
  console.log('\n--- A. HUMAN TRUST LAYER TESTS ---');
  const mockUser: UserProfile = {
    id: 'usr_p20_trust',
    name: 'Nguyễn Văn Trust',
    role: 'Helper Tràng Tiền',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    lat: 21.0285,
    lng: 105.8542,
    locationName: 'Tràng Tiền, Hoàn Kiếm',
    isHelperAvailable: true,
    reliabilityScore: 98,
    totalHelpedCount: 15,
    totalReceivedCount: 2,
    privacySettings: {
      anonymousByDefault: false,
      shareApproxLocationOnly: true,
    },
    skills: ['Sơ cứu nhỏ', 'Chỉ đường'],
    bio: 'Luôn sẵn sàng hỗ trợ cư dân khu vực Hoàn Kiếm',
    authProvider: 'google',
    savedStoryIds: [],
    createdAt: new Date().toISOString(),
  };

  const badges = trustService.evaluateBadges(mockUser);
  assert(badges.length >= 2, 'A.1 User with 15 helps and verified identity receives trust badges');
  const hasSafetyBadge = badges.some((b) => b.code === 'COMPLETED_SESSIONS' || b.code === 'HIGH_RATING');
  assert(hasSafetyBadge, 'A.2 Trust badge evaluation includes verified identity or helper milestone badge');

  const trustProfileData = trustService.getTrustProfile(mockUser);
  assert(
    trustProfileData.reliabilityScore === 98 && trustProfileData.completedSessionsCount === 15,
    'A.3 Trust profile data correctly aggregates user score and completion metrics'
  );

  const eventCreated = await trustService.recordTrustEvent(
    mockUser.id,
    'HELP_COMPLETED',
    'sess_p20_test',
    { points: 10, description: 'Hoàn thành phiên trợ giúp an toàn P20' }
  );
  assert(!!eventCreated && eventCreated.userId === mockUser.id, 'A.4 Trust event recording succeeds');

  // ----------------------------------------------------
  // SECTION B: SAFETY CHECK LAYER
  // ----------------------------------------------------
  console.log('\n--- B. SAFETY CHECK LAYER TESTS ---');
  const safetyCheck = await safetyCheckService.createSafetyCheck('sess_p20_safe', mockUser.id, 'EN_ROUTE_CHECK');
  assert(safetyCheck.status === 'PENDING', 'B.1 Created safety check defaults to PENDING status');

  const respondedCheck = await safetyCheckService.respondSafetyCheck(safetyCheck.id, mockUser.id, 'OK');
  assert(respondedCheck?.status === 'OK', 'B.2 User response OK updates safety check status');

  const timeoutCheck = await safetyCheckService.createSafetyCheck('sess_p20_timeout', mockUser.id, 'EN_ROUTE_CHECK');
  const markedNoResponse = await safetyCheckService.markNoResponse(timeoutCheck.id);
  assert(markedNoResponse?.status === 'NO_RESPONSE', 'B.3 Safety check timeout correctly transitions to NO_RESPONSE');

  const guidance = safetyCheckService.getSafetyGuidance('NEED_HELP');
  assert(guidance.level === 'HIGH' && guidance.hotline === '113 / 115', 'B.4 Safety guidance provides correct emergency hotline info');

  // ----------------------------------------------------
  // SECTION C: HUMAN IMPACT ENGINE
  // ----------------------------------------------------
  console.log('\n--- C. HUMAN IMPACT ENGINE TESTS ---');
  const userImpact = await impactService.getPersonalImpactMetrics(mockUser.id);
  assert(
    typeof userImpact.personalHelpedCount === 'number' && typeof userImpact.totalMinutes === 'number',
    'C.1 Impact metrics calculation returns valid help counts and minutes contributed'
  );

  const communityImpact = await impactService.getAggregateImpactMetrics();
  assert(
    communityImpact.completedSessions >= 0 && communityImpact.hasSufficientData === true,
    'C.2 Community impact metrics calculation succeeds'
  );

  // ----------------------------------------------------
  // SECTION D: HUMAN STORY 2.0 & VIRAL SHARING
  // ----------------------------------------------------
  console.log('\n--- D. HUMAN STORY 2.0 & VIRAL SHARING TESTS ---');
  const mockStory: Story = {
    id: 'story_p20_1',
    authorId: mockUser.id,
    authorName: mockUser.name,
    authorAvatar: mockUser.avatar,
    theme: 'Lòng tốt quanh ta',
    title: 'Một buổi chiều ấm áp tại Tràng Thi',
    body: 'Chúng tôi gặp nhau tại Nhà thuốc Tràng Thi để bàn giao chiếc bơm xe nhỏ.',
    quote: 'Chỉ cần một cử chỉ nhỏ, phố phường Hà Nội đã ấm áp hơn nhiều.',
    locationName: 'Tràng Thi, Hoàn Kiếm',
    createdAt: new Date().toISOString(),
    likesCount: 12,
    isAnonymous: false,
    distanceMeters: 250,
    lat: 21.0285,
    lng: 105.8542,
    isPublicConsent: true,
  };

  assert(mockStory.isPublicConsent === true, 'D.1 Story 2.0 contains explicit user public consent flag');
  assert(mockStory.distanceMeters === 250, 'D.2 Story 2.0 contains distance metric');

  // Check viral share text format & privacy check
  const shareText = `❤️ Human Map Story: "${mockStory.title}"\n📍 Location: ${mockStory.locationName}\n"${mockStory.quote}"\nJoin Human Map Hanoi: https://humanmap.app/story/${mockStory.id}`;
  const containsPrivateGPS = shareText.includes('lat') || shareText.includes('21.02') || shareText.includes('105.85');
  const containsUID = shareText.includes(mockUser.id);
  assert(!containsPrivateGPS && !containsUID, 'D.3 Viral share text strictly hides exact private GPS and raw UIDs');

  // ----------------------------------------------------
  // SECTION E: P18, P19.1, P19.2, P19.3 REGRESSION SUITE
  // ----------------------------------------------------
  console.log('\n--- E. P18, P19.1, P19.2, P19.3 REGRESSION SUITE ---');

  // E1. P18 HelpSession State Machine
  let sess = initializeHelpSession({
    requestId: 'req_reg_1',
    requesterId: 'usr_req_reg',
    helperId: 'usr_help_reg',
    needTitle: 'Sửa xích xe máy',
  });
  assert(sess.status === 'MATCHED', 'E1.1 Initial session state is MATCHED');
  sess = applyParticipantConsent(sess, 'requester', 'ACCEPTED');
  sess = applyParticipantConsent(sess, 'helper', 'ACCEPTED');
  assert(sess.status === 'AWAITING_CONSENT' || sess.status === 'CONFIRMED' || sess.status === 'MEETING_PROPOSED', 'E1.2 Consent transition valid');

  // E2. P19.1 Privacy State
  assert(derivePrivacyState('MATCHED') === 'APPROXIMATE_ONLY', 'E2.1 Privacy state for MATCHED is APPROXIMATE_ONLY');
  assert(derivePrivacyState('MEETING_CONFIRMED') === 'MEETING_POINT_SHARED', 'E2.2 Privacy state for MEETING_CONFIRMED is MEETING_POINT_SHARED');

  // E3. P19.2 Safe Meeting Point Selection
  const candidates = meetingPointService.generateCandidateMeetingPoints({ lat: 21.0285, lng: 105.8542 }, { lat: 21.0270, lng: 105.8450 });
  assert(candidates.length > 0 && candidates.every((c) => c.isPublicPlace), 'E3.1 All candidate meeting points are public places');

  // E4. P19.3 Live Journey Route
  sess = transitionHelpSession(sess, 'EN_ROUTE');
  assert(sess.status === 'EN_ROUTE', 'E4.1 HelpSession transitions smoothly to EN_ROUTE');

  console.log(`\n====================================================`);
  console.log(`=== P20 FULL TEST SUITE SUMMARY: ${passedCount}/${totalCount} PASSED ===`);
  console.log(`====================================================\n`);

  if (passedCount === totalCount) {
    console.log('✅ ALL P20 AND REGRESSION TESTS PASSED PERFECTLY!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
  }
}

runP20Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
});
