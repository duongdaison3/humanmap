import { SafetyCheck, SafetyCheckStatus } from '../types';

const STORAGE_KEYS = {
  SAFETY_CHECKS: 'humanmap_safety_checks_v1',
};

let inMemorySafetyChecks: SafetyCheck[] = [];

export const safetyCheckService = {
  /**
   * Creates a safety check prompt for an active session participant
   */
  async createSafetyCheck(
    sessionId: string,
    userId: string,
    triggerType: 'EN_ROUTE_CHECK' | 'JOURNEY_CHECKPOINT' | 'MANUAL' = 'EN_ROUTE_CHECK'
  ): Promise<SafetyCheck> {
    const check: SafetyCheck = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      userId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      triggerType,
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(), // 30 second response window
    };

    inMemorySafetyChecks = [check, ...inMemorySafetyChecks.filter((c) => !(c.sessionId === sessionId && c.userId === userId && c.status === 'PENDING'))];

    try {
      if (typeof localStorage !== 'undefined') {
        const existing = await this.getSafetyChecks();
        const filtered = existing.filter((c) => !(c.sessionId === sessionId && c.userId === userId && c.status === 'PENDING'));
        localStorage.setItem(STORAGE_KEYS.SAFETY_CHECKS, JSON.stringify([check, ...filtered]));
      }
    } catch (e) {
      console.warn('Error creating local safety check:', e);
    }

    return check;
  },

  /**
   * Responds to a pending safety check
   */
  async respondSafetyCheck(
    checkId: string,
    userId: string,
    responseStatus: 'OK' | 'NEED_HELP'
  ): Promise<SafetyCheck> {
    const checks = await this.getSafetyChecks();
    const index = checks.findIndex((c) => c.id === checkId);

    if (index === -1) {
      throw new Error('SAFETY_CHECK_NOT_FOUND');
    }

    const updatedCheck: SafetyCheck = {
      ...checks[index],
      status: responseStatus === 'OK' ? 'OK' : 'NEED_HELP',
      respondedAt: new Date().toISOString(),
    };

    checks[index] = updatedCheck;

    const memIndex = inMemorySafetyChecks.findIndex((c) => c.id === checkId);
    if (memIndex !== -1) {
      inMemorySafetyChecks[memIndex] = updatedCheck;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SAFETY_CHECKS, JSON.stringify(checks));
      }
    } catch (e) {
      // ignore
    }

    return updatedCheck;
  },

  /**
   * Automatically marks a safety check as NO_RESPONSE if 30s elapsed
   */
  async markNoResponse(checkId: string): Promise<SafetyCheck> {
    const checks = await this.getSafetyChecks();
    const index = checks.findIndex((c) => c.id === checkId);

    if (index === -1) {
      throw new Error('SAFETY_CHECK_NOT_FOUND');
    }

    if (checks[index].status === 'PENDING') {
      const updatedCheck: SafetyCheck = {
        ...checks[index],
        status: 'NO_RESPONSE',
        respondedAt: new Date().toISOString(),
      };
      checks[index] = updatedCheck;

      const memIndex = inMemorySafetyChecks.findIndex((c) => c.id === checkId);
      if (memIndex !== -1) {
        inMemorySafetyChecks[memIndex] = updatedCheck;
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.SAFETY_CHECKS, JSON.stringify(checks));
        }
      } catch (e) {
        // ignore
      }
      return updatedCheck;
    }

    return checks[index];
  },

  /**
   * Retrieves the active or latest safety check for a session
   */
  async getSafetyCheckForSession(sessionId: string, userId: string): Promise<SafetyCheck | null> {
    const checks = await this.getSafetyChecks();
    const found = checks.find((c) => c.sessionId === sessionId && c.userId === userId);
    return found || null;
  },

  /**
   * Provides emergency guidance based on safety status
   */
  getSafetyGuidance(status: 'OK' | 'NO_RESPONSE' | 'NEED_HELP') {
    if (status === 'NEED_HELP') {
      return {
        level: 'HIGH',
        message: 'Hãy di chuyển ngay tới khu vực công cộng đông người. Bạn có thể gọi khẩn cấp nếu gặp nguy hiểm.',
        hotline: '113 / 115',
      };
    }
    if (status === 'NO_RESPONSE') {
      return {
        level: 'MEDIUM',
        message: 'Chúng tôi chưa nhận được phản hồi. Hãy bấm nút xác nhận nếu bạn an toàn.',
        hotline: '113 / 115',
      };
    }
    return {
      level: 'LOW',
      message: 'Hành trình diễn ra an toàn.',
      hotline: '113 / 115',
    };
  },

  /**
   * Private helper to load safety checks from local storage
   */
  async getSafetyChecks(): Promise<SafetyCheck[]> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.SAFETY_CHECKS);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      // fallback
    }
    return inMemorySafetyChecks;
  },
};
