import { MeetingPoint, MeetingPointType } from '../types';
import { mapsService } from './mapsService';

export interface PublicSafetyHub {
  id: string;
  name: string;
  address: string;
  type: MeetingPointType;
  lat: number;
  lng: number;
  safetyScore: number;
  description: string;
}

/**
 * Verified Real Public Places & Safety Hubs in Hanoi.
 * Includes Pharmacies, Hospitals, Community Centers, Convenience Stores & Transit Hubs.
 */
export const VERIFIED_PUBLIC_SAFETY_HUBS: PublicSafetyHub[] = [
  {
    id: 'hub_pharmacy_hangbac',
    name: 'Nhà thuốc Pharmacity Phố Cổ',
    address: '42 Hàng Bạc, Q. Hoàn Kiếm, Hà Nội',
    type: 'pharmacy',
    lat: 21.0335,
    lng: 105.8528,
    safetyScore: 98,
    description: 'Nhà thuốc mở cửa sáng, có đèn đường sáng và bảo vệ.',
  },
  {
    id: 'hub_hospital_vd',
    name: 'Cổng Bệnh viện Việt Đức (Tràng Thi)',
    address: '40 Tràng Thi, Q. Hoàn Kiếm, Hà Nội',
    type: 'hospital',
    lat: 21.0282,
    lng: 105.8488,
    safetyScore: 99,
    description: 'Khu vực y tế trung tâm, an ninh 24/7, luôn có lực lượng bảo vệ.',
  },
  {
    id: 'hub_community_hoankiem',
    name: 'Trung tâm Thông tin Văn hóa Hoàn Kiếm',
    address: '28 Hàng Dầu, Q. Hoàn Kiếm, Hà Nội',
    type: 'community_center',
    lat: 21.0321,
    lng: 105.8540,
    safetyScore: 96,
    description: 'Địa điểm văn hóa công cộng đông đúc, không gian mở an toàn.',
  },
  {
    id: 'hub_transit_hoangdiem',
    name: 'Điểm trung chuyển Xe bus Bờ Hồ',
    address: 'Đinh Tiên Hoàng, Q. Hoàn Kiếm, Hà Nội',
    type: 'transit_point',
    lat: 21.0305,
    lng: 105.8530,
    safetyScore: 95,
    description: 'Trạm giao thông công cộng tập trung đông người và hệ thống camera giám sát.',
  },
  {
    id: 'hub_store_circle_k_hangthan',
    name: 'Cửa hàng tiện lợi Circle K Hàng Than',
    address: '18 Hàng Than, Q. Ba Đình, Hà Nội',
    type: 'convenience_store',
    lat: 21.0402,
    lng: 105.8475,
    safetyScore: 92,
    description: 'Cửa hàng tiện lợi 24/7, sáng đèn liên tục, có camera an ninh.',
  },
  {
    id: 'hub_pharmacy_longchau_trangthi',
    name: 'Nhà thuốc FPT Long Châu Tràng Thi',
    address: '58 Tràng Thi, Q. Hoàn Kiếm, Hà Nội',
    type: 'pharmacy',
    lat: 21.0278,
    lng: 105.8465,
    safetyScore: 97,
    description: 'Cửa hàng dược phẩm công cộng, phục vụ chu đáo, điểm gặp thân thiện.',
  },
  {
    id: 'hub_cafe_highlands_dongkinh',
    name: 'Highlands Coffee Quảng trường Đông Kinh Nghĩa Thục',
    address: '1 Đinh Tiên Hoàng, Q. Hoàn Kiếm, Hà Nội',
    type: 'cafe',
    lat: 21.0318,
    lng: 105.8522,
    safetyScore: 90,
    description: 'Quán cà phê trung tâm hướng ra quảng trường, an toàn và dễ nhận diện.',
  },
  {
    id: 'hub_community_dongda',
    name: 'Nhà Văn hóa Quận Đống Đa',
    address: '22 Đặng Tiến Đông, Q. Đống Đa, Hà Nội',
    type: 'community_center',
    lat: 21.0125,
    lng: 105.8234,
    safetyScore: 94,
    description: 'Trung tâm sinh hoạt cộng đồng rộng rãi, chiếu sáng công cộng tốt.',
  },
  {
    id: 'hub_pharmacy_phapchi',
    name: 'Cửa hàng Tiện lợi WinMart+ Hai Bà Trưng',
    address: '88 Hai Bà Trưng, Q. Hoàn Kiếm, Hà Nội',
    type: 'convenience_store',
    lat: 21.0255,
    lng: 105.8490,
    safetyScore: 91,
    description: 'Siêu thị tiện ích trên tuyến phố chính, an toàn giao dịch.',
  },
];

export const meetingPointService = {
  /**
   * Generates candidate safe public meeting points between requester and helper.
   * NEVER returns or embeds exact private coordinates of either user.
   */
  generateCandidateMeetingPoints(
    requesterLoc: { lat: number; lng: number },
    helperLoc: { lat: number; lng: number },
    limit = 4
  ): MeetingPoint[] {
    const candidates = VERIFIED_PUBLIC_SAFETY_HUBS.map((hub) => {
      const dReq = mapsService.calculateDistanceMeters(requesterLoc.lat, requesterLoc.lng, hub.lat, hub.lng);
      const dHelp = mapsService.calculateDistanceMeters(helperLoc.lat, helperLoc.lng, hub.lat, hub.lng);

      const reqMins = Math.max(1, Math.round(dReq / 75)); // ~75m/min walking speed
      const helpMins = Math.max(1, Math.round(dHelp / 75));

      // Distance balance score (closer & more equal travel distance is better)
      const avgDist = (dReq + dHelp) / 2;
      const diffDist = Math.abs(dReq - dHelp);

      // Distance penalty: penalize average distance over 1000m and imbalance
      const distPenalty = Math.min(50, Math.round(avgDist / 40));
      const balancePenalty = Math.min(30, Math.round(diffDist / 50));

      const finalScore = Math.max(10, Math.min(99, hub.safetyScore - distPenalty - balancePenalty));

      const meetingPoint: MeetingPoint = {
        id: `mp_${hub.id}_${Date.now()}`,
        name: hub.name,
        address: hub.address,
        type: hub.type,
        lat: hub.lat,
        lng: hub.lng,
        requesterTravelMinutes: reqMins,
        helperTravelMinutes: helpMins,
        requesterDistanceMeters: dReq,
        helperDistanceMeters: dHelp,
        score: finalScore,
        reason: `${hub.description} (Khoảng cách người cần giúp: ~${dReq}m, người giúp: ~${dHelp}m).`,
        createdAt: new Date().toISOString(),
        isPublicPlace: true,
        source: 'curated_safety_hub',
      };

      return meetingPoint;
    });

    // Sort by final score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, Math.max(1, limit));
  },

  /**
   * Validates if a given MeetingPoint is a valid public meeting location
   * and does NOT expose private personal locations.
   */
  validateMeetingPoint(mp: Partial<MeetingPoint>): { valid: boolean; reason?: string } {
    if (!mp) return { valid: false, reason: 'MeetingPoint object is missing' };
    if (!mp.name || mp.name.trim().length === 0) return { valid: false, reason: 'Name is required' };
    if (!mp.address || mp.address.trim().length === 0) return { valid: false, reason: 'Address is required' };
    if (typeof mp.lat !== 'number' || typeof mp.lng !== 'number' || isNaN(mp.lat) || isNaN(mp.lng)) {
      return { valid: false, reason: 'Invalid latitude or longitude coordinates' };
    }
    if (mp.isPublicPlace === false) {
      return { valid: false, reason: 'Meeting point must be a public place' };
    }
    return { valid: true };
  },
};
