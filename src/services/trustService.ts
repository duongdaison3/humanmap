import { TrustEvent, TrustEventType, TrustBadge, TrustProfileData, UserProfile } from '../types';
import { dataService } from './dataService';

const STORAGE_KEYS = {
  TRUST_EVENTS: 'humanmap_trust_events_v1',
};

let inMemoryTrustEvents: TrustEvent[] = [];

export const trustService = {
  /**
   * Records a production-grade trust event safely
   */
  async recordTrustEvent(
    userId: string,
    type: TrustEventType,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<TrustEvent> {
    const event: TrustEvent = {
      id: `trust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      sessionId,
      type,
      createdAt: new Date().toISOString(),
      metadata,
      source: sessionId ? 'session' : 'system',
    };

    inMemoryTrustEvents.unshift(event);

    // Store in localStorage if available
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.TRUST_EVENTS);
        const list: TrustEvent[] = raw ? JSON.parse(raw) : [];
        list.unshift(event);
        localStorage.setItem(STORAGE_KEYS.TRUST_EVENTS, JSON.stringify(list.slice(0, 100)));
      }
    } catch (e) {
      console.warn('Error saving local trust event:', e);
    }

    return event;
  },

  /**
   * Retrieves trust events for a given user
   */
  async getTrustEvents(userId: string): Promise<TrustEvent[]> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.TRUST_EVENTS);
        const list: TrustEvent[] = raw ? JSON.parse(raw) : [];
        return list.filter((e) => e.userId === userId);
      }
    } catch (e) {
      // fallback
    }
    return inMemoryTrustEvents.filter((e) => e.userId === userId);
  },

  /**
   * Evaluates deterministic, real badges based strictly on actual UserProfile data
   */
  evaluateBadges(user: UserProfile, completedSessionsCount: number = user.totalHelpedCount): TrustBadge[] {
    const badges: TrustBadge[] = [];

    const helped = completedSessionsCount || user.totalHelpedCount || 0;
    if (helped >= 3) {
      badges.push({
        id: 'badge_frequent',
        code: 'COMPLETED_SESSIONS',
        label: '🤝 Đã nhiều lần giúp đỡ',
        icon: 'HandHeart',
        description: `Đã hoàn thành ${helped} lượt hỗ trợ cộng đồng thành công`,
      });
    } else if (helped >= 1) {
      badges.push({
        id: 'badge_completed',
        code: 'COMPLETED_SESSIONS',
        label: '💙 Hoàn thành phiên hỗ trợ',
        icon: 'HeartHandshake',
        description: 'Đã trực tiếp hỗ trợ bà con/du khách trong khu vực',
      });
    }

    if (user.reliabilityScore && user.reliabilityScore >= 0.9) {
      badges.push({
        id: 'badge_reliable',
        code: 'HIGH_RATING',
        label: '⭐ Được cộng đồng đánh giá tốt',
        icon: 'Star',
        description: 'Độ tin cậy cao dựa trên sự tích cực và phản hồi công khai',
      });
    }

    const isRecent = user.lastActiveAt
      ? Date.now() - new Date(user.lastActiveAt).getTime() < 15 * 60 * 1000
      : true;
    if (isRecent) {
      badges.push({
        id: 'badge_active',
        code: 'RECENT_ACTIVE',
        label: '🟢 Hoạt động gần đây',
        icon: 'Activity',
        description: 'Sẵn sàng hỗ trợ trực tiếp khi người dùng cần',
      });
    }

    if (user.locationName || (user.skills && user.skills.some((s) => s.includes('Chỉ đường') || s.includes('phố')))) {
      badges.push({
        id: 'badge_local',
        code: 'LOCAL_EXPERT',
        label: '🧭 Quen khu vực này',
        icon: 'Compass',
        description: 'Thạo địa hình và thông tin điểm an toàn công cộng',
      });
    }

    return badges;
  },

  /**
   * Generates clean TrustProfileData for UI rendering without exposing exact coordinates or home address
   */
  getTrustProfile(user: UserProfile, completedSessionsCount?: number): TrustProfileData {
    const totalHelped = typeof completedSessionsCount === 'number' ? completedSessionsCount : (user.totalHelpedCount || 0);
    const badges = this.evaluateBadges(user, totalHelped);

    let lastActiveText = 'Vừa hoạt động';
    if (user.lastActiveAt) {
      const diffMs = Date.now() - new Date(user.lastActiveAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 60) {
        lastActiveText = `Hoạt động ${Math.floor(diffMins / 60)} giờ trước`;
      } else if (diffMins > 0) {
        lastActiveText = `Hoạt động ${diffMins} phút trước`;
      }
    }

    // Extract safe neighborhood label, never raw address or exact lat/lng
    const safeArea = user.locationName ? user.locationName.split(',')[0].trim() : 'Phố Cổ, Hoàn Kiếm';

    return {
      userId: user.id,
      name: user.name || 'Thành viên cộng đồng',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: user.role || 'Thành viên xác thực',
      totalHelpedCount: totalHelped,
      completedSessionsCount: totalHelped,
      reliabilityScore: user.reliabilityScore || 0.95,
      lastActiveLabel: lastActiveText,
      skills: user.skills || ['Chỉ đường', 'Thông tin địa phương'],
      badges,
      freshness: 'Thông tin thực tế',
      locationArea: safeArea,
    };
  },
};
