import React, { useState, useEffect, useRef } from 'react';
import { NeedRequest, Story, UserProfile, HelpSession } from './types';
import { firebaseService } from './services/firebaseService';
import { dataService } from './services/dataService';
import { matchingService } from './services/matchingService';
import { geminiService } from './services/geminiService';
import { mapsService } from './services/mapsService';
import { soundService } from './services/soundService';
import { storyThemeService, DynamicStoryTheme } from './services/storyThemeService';
import { AppShell } from './components/AppShell';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { MapView } from './components/MapView';
import { NeedCard } from './components/NeedCard';
import { NeedDetail } from './components/NeedDetail';
import { HelpFlow } from './components/HelpFlow';
import { StoryCard } from './components/StoryCard';
import { StoryDetail } from './components/StoryDetail';
import { ProfileView } from './components/ProfileView';
import { CreateNeedModal } from './components/CreateNeedModal';
import { HumanMatchingModal } from './components/HumanMatchingModal';
import { SafetyBadge } from './components/SafetyBadge';
import { NotificationBanner } from './components/NotificationBanner';
import { HANOI_CENTER } from './data/mockData';
import { locationService, VietnamProvince, DetectedLocationResult } from './services/locationService';
import { AuthModal } from './components/AuthModal';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MapPin, HeartHandshake, BookOpen, Compass, ArrowRight, ShieldCheck, Sparkles, Filter, BellRing } from 'lucide-react';

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return <AdminDashboard />;
  }

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [needs, setNeeds] = useState<NeedRequest[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeHelpSession, setActiveHelpSession] = useState<HelpSession | null>(null);

  // Global Auth Modal State for Action Gating
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authModalPrompt, setAuthModalPrompt] = useState<string>('');

  // Unified Auth Check
  const checkAuthRequired = (actionDescription: string): boolean => {
    const isFirebase = dataService.getSystemMode().isRealFirebase;
    const isGuest = !userProfile?.uid;
    const noFbUser = !dataService.getCurrentFirebaseUser();
    
    if (isGuest || (isFirebase && noFbUser)) {
      setAuthModalPrompt(`Vui lòng đăng nhập để ${actionDescription}.`);
      setAuthModalMode('signin');
      setIsAuthModalOpen(true);
      return true;
    }
    return false;
  };

  // Dynamic Province & Real Location State (63 Provinces of Vietnam)
  const [currentProvince, setCurrentProvince] = useState<VietnamProvince>(locationService.getCurrentProvince());
  const [isGPSActive, setIsGPSActive] = useState<boolean>(locationService.getIsGPSActive());

  // Active Modals & Selected View Items
  const [selectedNeed, setSelectedNeed] = useState<NeedRequest | null>(null);
  const [matchingNeed, setMatchingNeed] = useState<NeedRequest | null>(null);
  const [activeHelpNeed, setActiveHelpNeed] = useState<NeedRequest | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isCreateNeedOpen, setIsCreateNeedOpen] = useState<boolean>(false);
  const [storyThemeFilter, setStoryThemeFilter] = useState<string>('all');
  const [storySortBy, setStorySortBy] = useState<'nearby' | 'recent' | 'recommended'>('nearby');
  const [isAnalyzingThemes, setIsAnalyzingThemes] = useState<boolean>(false);
  const [aiThemeInsight, setAiThemeInsight] = useState<string | null>(null);
  const [customAiThemes, setCustomAiThemes] = useState<DynamicStoryTheme[] | null>(null);

  // Nearby 500m Notification Banner State
  const [nearbyNotification, setNearbyNotification] = useState<{
    need: NeedRequest;
    distanceMeters: number;
  } | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set());
  const knownNeedIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Load initial state from local storage or mock data
  const loadData = async () => {
    await firebaseService.initializeData();
    const fetchedNeeds = await firebaseService.getNeedRequests();
    const fetchedStories = await firebaseService.getStories();
    const fetchedUser = await firebaseService.getCurrentUser();
    const fetchedSession = await firebaseService.getActiveSession();

    setNeeds(fetchedNeeds);
    setStories(fetchedStories);
    setUserProfile(fetchedUser);
    setActiveHelpSession(fetchedSession);

    // Populate known IDs
    fetchedNeeds.forEach((n) => knownNeedIdsRef.current.add(n.id));

    // Check if there is an urgent/open nearby need within 500m on load
    const userLat = fetchedUser?.lat || HANOI_CENTER.lat;
    const userLng = fetchedUser?.lng || HANOI_CENTER.lng;
    const closeNeed = fetchedNeeds.find((n) => {
      if (n.status !== 'open') return false;
      const d = mapsService.calculateDistanceMeters(userLat, userLng, n.lat, n.lng);
      return d <= 500 && n.requesterId !== fetchedUser?.id;
    });

    if (closeNeed) {
      const dist = mapsService.calculateDistanceMeters(userLat, userLng, closeNeed.lat, closeNeed.lng);
      setNearbyNotification({
        need: closeNeed,
        distanceMeters: dist,
      });
    }

    isInitialLoadRef.current = false;
  };

  useEffect(() => {
    loadData();

    // Subscribe to dynamic location / province changes
    const unsubscribeLocation = locationService.subscribe((loc: DetectedLocationResult) => {
      setCurrentProvince(loc.province);
      setIsGPSActive(loc.source === 'gps');
    });

    // Auto-detect real physical GPS location on app load
    locationService.detectRealLocation().then((loc) => {
      if (loc) {
        setCurrentProvince(loc.province);
        setIsGPSActive(loc.source === 'gps');
      }
    });

    // Attach realtime listener for help requests (Firebase or Local Sync)
    const unsubscribeNeeds = dataService.subscribeToHelpRequests((updatedNeeds) => {
      setNeeds(updatedNeeds);

      // Check for newly added needs within 500m
      const userLat = userProfile?.lat || currentProvince.lat;
      const userLng = userProfile?.lng || currentProvince.lng;

      const newNearby = updatedNeeds.find((n) => {
        if (n.status !== 'open') return false;
        if (knownNeedIdsRef.current.has(n.id)) return false;
        if (dismissedNotificationIds.has(n.id)) return false;
        if (n.requesterId === userProfile?.id) return false;

        const dist = mapsService.calculateDistanceMeters(userLat, userLng, n.lat, n.lng);
        return dist <= 500;
      });

      if (newNearby) {
        const dist = mapsService.calculateDistanceMeters(userLat, userLng, newNearby.lat, newNearby.lng);
        setNearbyNotification({
          need: newNearby,
          distanceMeters: dist,
        });
      }

      // Update known IDs
      updatedNeeds.forEach((n) => knownNeedIdsRef.current.add(n.id));
    });

    // Centralized Auth Listener
    const unsubscribeAuth = dataService.subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        const remoteProfile = await dataService.getUserProfileFromFirestore(fbUser.uid);
        if (remoteProfile) {
          setUserProfile(remoteProfile);
        } else {
          const current = await dataService.getCurrentUser();
          setUserProfile(current);
        }
      } else {
        const guestUser = await dataService.getCurrentUser();
        setUserProfile(guestUser);
      }
    });

    return () => {
      unsubscribeLocation();
      unsubscribeNeeds();
      unsubscribeAuth();
    };
  }, [userProfile?.lat, userProfile?.lng, currentProvince.lat, currentProvince.lng, dismissedNotificationIds]);

  // Handle Province / Location selection from Header Badge
  const handleSelectProvince = async (province: VietnamProvince, coords?: { lat: number; lng: number }) => {
    setCurrentProvince(province);
    const targetLat = coords?.lat || province.lat;
    const targetLng = coords?.lng || province.lng;
    setIsGPSActive(coords ? true : false);

    if (userProfile) {
      const updated: UserProfile = {
        ...userProfile,
        lat: targetLat,
        lng: targetLng,
        locationName: province.name,
      };
      setUserProfile(updated);
      try {
        await dataService.updateUserProfile(updated);
      } catch (e) {
        console.warn('Could not sync user profile province:', e);
      }
    }
  };

  // Handle Start Help
  const handleStartHelp = (need: NeedRequest) => {
    if (checkAuthRequired('bắt đầu hỗ trợ người khác')) return;
    setSelectedNeed(null);
    setNearbyNotification(null);
    setActiveHelpNeed(need);
  };

  const handleCreateNeedRequest = () => {
    if (checkAuthRequired('tạo mới yêu cầu hỗ trợ')) return;
    setIsCreateNeedOpen(true);
  };

  // Handle Complete Help & Save Story
  const handleCompleteAndSaveStory = async (newStory: Story) => {
    setActiveHelpNeed(null);
    await firebaseService.setActiveSession(null);
    setActiveHelpSession(null);

    // Refresh state
    const updatedNeeds = await firebaseService.getNeedRequests();
    const updatedStories = await firebaseService.getStories();
    const updatedUser = await firebaseService.getCurrentUser();

    setNeeds(updatedNeeds);
    setStories(updatedStories);
    setUserProfile(updatedUser);

    // Show story detail
    setSelectedStory(newStory);
    setActiveTab('stories');
  };

  // Handle Like Story
  const handleLikeStory = async (storyId: string) => {
    const newLikes = await firebaseService.likeStory(storyId);
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, likesCount: newLikes } : s))
    );
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory({ ...selectedStory, likesCount: newLikes });
    }
  };

  // Handle User Location Change from GPS
  const handleUserLocationChange = async (coords: { lat: number; lng: number }) => {
    if (userProfile) {
      if (userProfile.lat === coords.lat && userProfile.lng === coords.lng) return;
      const reverse = await locationService.reverseGeocode(coords.lat, coords.lng);
      setCurrentProvince(reverse.province);
      setIsGPSActive(true);

      const updated = {
        ...userProfile,
        lat: coords.lat,
        lng: coords.lng,
        locationName: reverse.province.name,
      };
      setUserProfile(updated);
      try {
        await dataService.updateUserProfile(updated);
      } catch (e) {
        console.warn('Location sync error:', e);
      }
    }
  };

  // Dismiss notification banner
  const handleDismissNotification = () => {
    if (nearbyNotification) {
      setDismissedNotificationIds((prev) => new Set(prev).add(nearbyNotification.need.id));
      setNearbyNotification(null);
    }
  };

  // Trigger demo/test notification within 500m
  const handleTriggerTestNearbyOpportunity = () => {
    const openNeed = needs.find((n) => n.status === 'open') || needs[0];
    if (openNeed) {
      const mockCloseNeed: NeedRequest = {
        ...openNeed,
        id: `test-need-${Date.now()}`,
        title: openNeed.title || 'Cần nhờ qua đường & hỏi thông tin',
        distanceMeters: Math.floor(Math.random() * 350) + 80, // 80m - 430m (< 500m)
        locationName: 'Gần Hồ Hoàn Kiếm, Hàng Trống',
        createdAt: new Date().toISOString(),
      };
      setNearbyNotification({
        need: mockCloseNeed,
        distanceMeters: mockCloseNeed.distanceMeters || 180,
      });
      soundService.playHelpOpportunityChime();
    }
  };

  // Dynamically compute popular themes directly based on existing user stories and content
  const dynamicThemes: DynamicStoryTheme[] = React.useMemo(() => {
    if (customAiThemes && customAiThemes.length > 0) {
      return customAiThemes;
    }
    return storyThemeService.extractDynamicThemes(stories);
  }, [stories, customAiThemes]);

  // Handle AI Theme Discovery Analysis
  const handleAnalyzeThemesWithAI = async () => {
    if (stories.length === 0 || isAnalyzingThemes) return;
    setIsAnalyzingThemes(true);
    try {
      const result = await storyThemeService.analyzeThemesWithAI(stories);
      if (result) {
        setCustomAiThemes(result.themes);
        setAiThemeInsight(result.topInsight);
      }
    } catch (e) {
      console.warn('AI Theme analysis failed:', e);
    } finally {
      setIsAnalyzingThemes(false);
    }
  };

  // Reset to auto-discovered themes
  const handleResetToAutoThemes = () => {
    setCustomAiThemes(null);
    setAiThemeInsight(null);
    setStoryThemeFilter('all');
  };

  // Calculate user current active coordinates
  const activeLat = userProfile?.lat || currentProvince.lat;
  const activeLng = userProfile?.lng || currentProvince.lng;

  // Filter open needs sorted by distance relative to active location
  const openNeeds = matchingService.filterNearbyNeeds(needs, activeLat, activeLng);

  // Dynamically filtered stories based on selected user theme / content
  const filteredStories = storyThemeService.filterStoriesByTheme(stories, storyThemeFilter);

  // Phase 5 Discovery Sorting: Nearby, Recent, Recommended
  const sortedStories = [...filteredStories].sort((a, b) => {
    if (storySortBy === 'nearby') {
      return (a.distanceMeters || 0) - (b.distanceMeters || 0);
    }
    if (storySortBy === 'recent') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (storySortBy === 'recommended') {
      const aScore = (a.theme.includes('Kỷ niệm') || a.theme.includes('Lòng tốt') ? 2 : 1) + (a.quote ? 1 : 0);
      const bScore = (b.theme.includes('Kỷ niệm') || b.theme.includes('Lòng tốt') ? 2 : 1) + (b.quote ? 1 : 0);
      return bScore - aScore;
    }
    return 0;
  });

  // Recommended story highlight: "One story you might connect with"
  const recommendedHighlight = stories.length > 0
    ? geminiService.findRecommendedStory(userProfile?.interests?.[0] || 'Lòng tốt', stories)
    : null;

  // Get saved stories for user
  const savedStories = stories.filter((s) => userProfile?.savedStoryIds.includes(s.id));

  return (
    <AppShell
      activeSession={activeHelpSession}
      currentProvince={currentProvince}
      isGPSActive={isGPSActive}
      onSelectProvince={handleSelectProvince}
      notificationBanner={
        nearbyNotification ? (
          <NotificationBanner
            need={nearbyNotification.need}
            distanceMeters={nearbyNotification.distanceMeters}
            onViewDetails={(need) => {
              setSelectedNeed(need);
            }}
            onDismiss={handleDismissNotification}
            onDirectHelp={(need) => {
              handleStartHelp(need);
            }}
          />
        ) : null
      }
      onOpenActiveSession={() => {
        if (activeHelpNeed) return; // already open
        const need = needs.find((n) => n.id === activeHelpSession?.needId) || needs[0];
        setActiveHelpNeed(need);
      }}
      onRequestHelpClick={handleCreateNeedRequest}
      isFirebaseActive={dataService.getSystemMode().isRealFirebase}
    >
      {/* SCREEN A: HOME / HUMAN MAP */}
      {activeTab === 'home' && (
        <div className="space-y-6 pb-10">
          {/* Hero Section */}
          <section className="bg-[#2C3E50] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-[#EEE7DE]/20">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-[#F59E0B]/20 text-[#FAD7A0] text-xs font-bold px-3 py-1 rounded-full border border-[#F59E0B]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Thành phố nhân văn • {currentProvince.name}</span>
              </div>

              <h2 className="font-serif italic text-2xl sm:text-3xl lg:text-4xl leading-tight">
                "Google Maps giúp bạn tìm địa điểm. <br className="hidden sm:inline" />
                <span className="text-[#F59E0B] not-italic font-sans font-extrabold">Human Map</span> giúp bạn tìm thấy con người."
              </h2>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-5 py-3 bg-[#F59E0B] hover:bg-[#D35400] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Khám phá Human Map</span>
                </button>

                <button
                  onClick={handleCreateNeedRequest}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/20 backdrop-blur-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Tôi cần trợ giúp nhỏ</span>
                </button>
              </div>
            </div>

            {/* Subtle background graphic */}
            <div className="absolute right-[-10%] bottom-[-20%] w-64 h-64 bg-[#F59E0B]/20 rounded-full blur-3xl pointer-events-none" />
          </section>

          {/* Featured Story Highlight (if available) */}
          {stories.length > 0 && stories[0].quote && (
            <section className="bg-[#F9F6F2] p-5 rounded-2xl border border-[#EEE7DE] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-widest text-[#F59E0B] font-bold">Câu chuyện nổi bật</span>
              </div>
              <p className="font-serif text-lg sm:text-xl italic text-[#1A1A1A] leading-snug">
                "{stories[0].quote}"
              </p>
              <p className="mt-2 text-xs text-[#5D6D7E] font-medium">— {stories[0].authorName}, {stories[0].locationName}</p>
            </section>
          )}

          {/* Quick Safe Micro-Help Opportunities Preview */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-[#2C3E50] text-lg sm:text-xl flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-[#2D5A27]" />
                  <span>Cơ hội trợ giúp gần bạn ({openNeeds.length})</span>
                </h3>
              </div>

              <button
                onClick={() => setActiveTab('map')}
                className="text-xs font-bold text-[#F59E0B] hover:text-[#D35400] flex items-center gap-1 cursor-pointer"
              >
                <span>Xem trên bản đồ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {openNeeds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {openNeeds.slice(0, 3).map((need) => (
                  <NeedCard key={need.id} need={need} onSelect={setSelectedNeed} />
                ))}
              </div>
            ) : (
              <div className="bg-[#FDFCFB] border border-[#EEE7DE] rounded-2xl p-6 text-center space-y-2">
                <HeartHandshake className="w-8 h-8 text-[#F59E0B] mx-auto opacity-80" />
                <h4 className="font-bold text-[#2C3E50] text-sm">Chưa có yêu cầu hỗ trợ nào gần bạn</h4>
                <p className="text-xs text-[#5D6D7E] max-w-sm mx-auto">
                  Hiện chưa có ai gửi yêu cầu hỗ trợ trong khu vực. Bạn có thể là người gửi yêu cầu đầu tiên hoặc sẵn sàng giúp đỡ khi có thông báo mới!
                </p>
                <button
                  onClick={handleCreateNeedRequest}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#F59E0B] hover:bg-[#D35400] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Tạo yêu cầu hỗ trợ nhỏ</span>
                </button>
              </div>
            )}
          </section>

          {/* Human Stories Preview */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-[#2C3E50] text-lg sm:text-xl flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#3498DB]" />
                  <span>Câu chuyện cộng đồng</span>
                </h3>
              </div>

              <button
                onClick={() => setActiveTab('stories')}
                className="text-xs font-bold text-[#F59E0B] hover:text-[#D35400] flex items-center gap-1 cursor-pointer"
              >
                <span>Tất cả câu chuyện</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stories.slice(0, 2).map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onSelect={setSelectedStory}
                    onLike={handleLikeStory}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[#FDFCFB] border border-[#EEE7DE] rounded-2xl p-6 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-[#3498DB] mx-auto opacity-80" />
                <h4 className="font-bold text-[#2C3E50] text-sm">Chưa có câu chuyện nào được sẻ chia</h4>
                <p className="text-xs text-[#5D6D7E] max-w-sm mx-auto">
                  Hãy trợ giúp một láng giềng và ghi lại kỷ niệm nhân văn đầu tiên trên Human Map!
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* SCREEN B: MAP */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <MapView
            needs={needs}
            stories={stories}
            users={userProfile ? [userProfile] : []}
            currentUser={userProfile}
            onUserLocationChange={handleUserLocationChange}
            onGoHome={() => setActiveTab('home')}
            onSelectNeed={setSelectedNeed}
            onSelectStory={setSelectedStory}
          />
        </div>
      )}

      {/* SCREEN E: STORIES DISCOVERY */}
      {activeTab === 'stories' && (
        <div className="space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-slate-900 text-xl sm:text-2xl">
                  Câu Chuyện Xung Quanh Bạn
                </h2>
                <span className="clay-pill-blue text-[11px] font-extrabold px-2.5 py-0.5 text-[#2563EB]">
                  {stories.length} mẩu chuyện
                </span>
              </div>
            </div>

            {/* Sort & AI Discovery Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAnalyzeThemesWithAI}
                disabled={isAnalyzingThemes || stories.length === 0}
                className="clay-btn-amber px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Sử dụng Gemini AI để phân tích sâu nội dung và khám phá các chủ đề cộng đồng thịnh hành"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingThemes ? 'animate-spin' : 'text-amber-700'}`} />
                <span>{isAnalyzingThemes ? 'Đang phân tích...' : '✨ Khám phá chủ đề AI'}</span>
              </button>

              <div className="clay-card p-1 flex items-center gap-1 text-xs font-bold">
                <button
                  onClick={() => setStorySortBy('nearby')}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    storySortBy === 'nearby'
                      ? 'clay-btn-dark text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📍 Gần bạn
                </button>
                <button
                  onClick={() => setStorySortBy('recent')}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    storySortBy === 'recent'
                      ? 'clay-btn-dark text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🕒 Mới nhất
                </button>
                <button
                  onClick={() => setStorySortBy('recommended')}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    storySortBy === 'recommended'
                      ? 'clay-btn-primary text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✨ Gợi ý
                </button>
              </div>
            </div>
          </div>

          {/* AI Insight Header if analyzed */}
          {aiThemeInsight && (
            <div className="clay-card-warm p-4 flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                  <h4 className="font-serif font-bold text-xs text-amber-900 uppercase tracking-wider mb-0.5">
                    Góc nhìn chủ đề từ Gemini AI
                  </h4>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    {aiThemeInsight}
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetToAutoThemes}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
              >
                Mặc định
              </button>
            </div>
          )}

          {/* Dynamic Theme Filter Chips (Directly derived from user story content) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Chủ đề thịnh hành từ câu chuyện thực tế:</span>
              </span>
              {storyThemeFilter !== 'all' && (
                <button
                  onClick={() => setStoryThemeFilter('all')}
                  className="text-[#2563EB] hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Xem tất cả ({stories.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
              {dynamicThemes.map((theme) => {
                const isSelected = storyThemeFilter === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setStoryThemeFilter(theme.id)}
                    className={`px-3.5 py-2 rounded-2xl font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'clay-btn-primary text-white shadow-md scale-105'
                        : 'clay-btn-white text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>{theme.icon || '🏷️'}</span>
                    <span>{theme.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {theme.count}
                    </span>
                    {theme.isTrending && !isSelected && (
                      <span className="text-[10px] text-amber-500" title="Chủ đề phổ biến">
                        🔥
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature: "One story you might connect with" (Phase 5 Recommendation Engine) */}
          {recommendedHighlight && storyThemeFilter === 'all' && (
            <div className="clay-card-warm p-5 border border-amber-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="clay-pill-amber inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Một câu chuyện phù hợp với bạn</span>
                </span>
                <span className="text-[11px] text-amber-800 italic font-medium">
                  "{recommendedHighlight.matchReason}"
                </span>
              </div>

              <div
                onClick={() => setSelectedStory(recommendedHighlight.story)}
                className="clay-card p-4 hover:border-[#2563EB] transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group"
              >
                <div className="space-y-1">
                  <span className="clay-pill-blue text-[10px] font-extrabold text-[#2563EB] uppercase tracking-wider px-2.5 py-0.5">
                    {recommendedHighlight.story.theme}
                  </span>
                  <h3 className="font-serif font-bold text-slate-900 text-base group-hover:text-[#2563EB] transition-colors">
                    {recommendedHighlight.story.title}
                  </h3>
                  {recommendedHighlight.story.quote && (
                    <p className="text-xs text-slate-800 italic font-serif">
                      "{recommendedHighlight.story.quote}"
                    </p>
                  )}
                  <p className="text-xs text-slate-600 line-clamp-1 font-medium">
                    {recommendedHighlight.story.body}
                  </p>
                </div>
                <button className="clay-btn-dark px-4 py-2 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer">
                  <span>Đọc ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Stories Grid */}
          {sortedStories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {sortedStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onSelect={setSelectedStory}
                  onLike={handleLikeStory}
                />
              ))}
            </div>
          ) : (
            <div className="clay-card p-8 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-[#2563EB] mx-auto opacity-80" />
              <h3 className="font-serif font-bold text-slate-900 text-base">
                {storyThemeFilter === 'all'
                  ? 'Chưa có câu chuyện cộng đồng'
                  : `Chưa có câu chuyện nào thuộc chủ đề "${storyThemeFilter}"`}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                {storyThemeFilter === 'all'
                  ? 'Các câu chuyện nhân văn sẽ tự động xuất hiện tại đây khi người dân trong cộng đồng hoàn thành hỗ trợ và chia sẻ kỷ niệm.'
                  : 'Hãy khám phá các chủ đề khác hoặc chọn xem toàn bộ câu chuyện.'}
              </p>
              {storyThemeFilter !== 'all' && (
                <button
                  onClick={() => setStoryThemeFilter('all')}
                  className="clay-btn-primary px-4 py-2 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Xem tất cả câu chuyện</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SCREEN G: PROFILE */}
      {activeTab === 'profile' && userProfile && (
        <ProfileView
          user={userProfile}
          savedStories={savedStories}
          onUserUpdate={setUserProfile}
          onSelectStory={setSelectedStory}
        />
      )}

      {/* SCREEN C: NEED DETAIL MODAL */}
      {selectedNeed && (
        <NeedDetail
          need={selectedNeed}
          onClose={() => setSelectedNeed(null)}
          onStartHelp={handleStartHelp}
          onOpenMatching={(need) => {
            setSelectedNeed(null);
            setMatchingNeed(need);
          }}
        />
      )}

      {/* HUMAN MATCHING MODAL */}
      <HumanMatchingModal
        isOpen={!!matchingNeed}
        need={matchingNeed}
        onClose={() => setMatchingNeed(null)}
        onSelectCandidate={(candidate, need) => {
          setMatchingNeed(null);
          handleStartHelp(need);
        }}
      />

      {/* SCREEN D: HELP FLOW INTERACTIVE MODAL */}
      {activeHelpNeed && (
        <HelpFlow
          need={activeHelpNeed}
          onClose={() => setActiveHelpNeed(null)}
          onCompleteAndSaveStory={handleCompleteAndSaveStory}
        />
      )}

      {/* SCREEN F: STORY DETAIL MODAL */}
      {selectedStory && (
        <StoryDetail
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onLike={handleLikeStory}
          onDiscoverAnother={() => {
            const currentIndex = stories.findIndex((s) => s.id === selectedStory.id);
            const nextIndex = (currentIndex + 1) % stories.length;
            setSelectedStory(stories[nextIndex]);
          }}
        />
      )}

      {/* AUTH MODAL FOR GATING ACTIONS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        promptMessage={authModalPrompt}
        onSuccess={(updatedUser) => {
          setUserProfile(updatedUser);
          setIsAuthModalOpen(false);
          // Allow them to continue organically, we don't store pending actions to avoid complexity
        }}
      />

      {/* WELCOME ONBOARDING FOR FIRST-TIME USERS */}
      <WelcomeOnboarding
        onGetStarted={() => {
          // You could automatically show AuthModal here if you want to force early login
          // setIsAuthModalOpen(true);
        }}
      />

      {/* CREATE NEED MODAL */}
      <CreateNeedModal
        isOpen={isCreateNeedOpen}
        onClose={() => setIsCreateNeedOpen(false)}
        onNeedCreated={(newNeed) => {
          setNeeds((prev) => [newNeed, ...prev]);
          setMatchingNeed(newNeed);
        }}
      />

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRequestHelpClick={handleCreateNeedRequest}
      />
    </AppShell>
  );
}
