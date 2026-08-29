/**
 * Vietnam Nationwide Location & Province Service
 * 
 * Manages dynamic geolocation detection, reverse geocoding, 
 * and support for all 63 provinces and centrally-governed cities across Vietnam.
 */

export interface VietnamProvince {
  id: string;
  name: string; // e.g. "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"
  fullName: string; // e.g. "Thành phố Hà Nội", "Tỉnh Quảng Ninh"
  shortName: string; // e.g. "Hà Nội", "Hồ Chí Minh", "Đà Nẵng"
  slogan: string; // e.g. "Thành phố nhân văn", "Thành phố xinh đẹp"
  region: 'Bắc Bộ' | 'Trung Bộ' | 'Nam Bộ';
  lat: number;
  lng: number;
  popular?: boolean;
}

export const VIETNAM_PROVINCES: VietnamProvince[] = [
  // Major Municipalities
  { id: 'hanoi', name: 'Hà Nội', fullName: 'Thành phố Hà Nội', shortName: 'Hà Nội', slogan: 'Thành phố nhân văn', region: 'Bắc Bộ', lat: 21.028511, lng: 105.854167, popular: true },
  { id: 'hcm', name: 'TP. Hồ Chí Minh', fullName: 'Thành phố Hồ Chí Minh', shortName: 'Hồ Chí Minh', slogan: 'Thành phố Hồ Chí Minh', region: 'Nam Bộ', lat: 10.776889, lng: 106.700806, popular: true },
  { id: 'danang', name: 'Đà Nẵng', fullName: 'Thành phố Đà Nẵng', shortName: 'Đà Nẵng', slogan: 'Thành phố xinh đẹp', region: 'Trung Bộ', lat: 16.047079, lng: 108.206230, popular: true },
  { id: 'haiphong', name: 'Hải Phòng', fullName: 'Thành phố Hải Phòng', shortName: 'Hải Phòng', slogan: 'Thành phố cảng', region: 'Bắc Bộ', lat: 20.844912, lng: 106.688084, popular: true },
  { id: 'cantho', name: 'Cần Thơ', fullName: 'Thành phố Cần Thơ', shortName: 'Cần Thơ', slogan: 'Thành phố sáng lạng', region: 'Nam Bộ', lat: 10.045162, lng: 105.746857, popular: true },

  // Miền Bắc
  { id: 'quangninh', name: 'Quảng Ninh', fullName: 'Tỉnh Quảng Ninh', shortName: 'Quảng Ninh', slogan: 'Vịnh Hạ Long thuyền nổi', region: 'Bắc Bộ', lat: 20.950454, lng: 107.073364, popular: true },
  { id: 'bacninh', name: 'Bắc Ninh', fullName: 'Tỉnh Bắc Ninh', shortName: 'Bắc Ninh', slogan: 'Dưới cờ Tổ quốc', region: 'Bắc Bộ', lat: 21.186096, lng: 106.076317, popular: true },
  { id: 'haiduong', name: 'Hải Dương', fullName: 'Tỉnh Hải Dương', shortName: 'Hải Dương', slogan: 'Quê lúa truyền thống', region: 'Bắc Bộ', lat: 20.937341, lng: 106.315582 },
  { id: 'hungyen', name: 'Hưng Yên', fullName: 'Tỉnh Hưng Yên', shortName: 'Hưng Yên', slogan: 'Nơi du khách yêu thích', region: 'Bắc Bộ', lat: 20.655886, lng: 106.051125 },
  { id: 'hanam', name: 'Hà Nam', fullName: 'Tỉnh Hà Nam', shortName: 'Hà Nam', slogan: 'Bốn vùng đất lạc', region: 'Bắc Bộ', lat: 20.545350, lng: 105.912384 },
  { id: 'namdinh', name: 'Nam Định', fullName: 'Tỉnh Nam Định', shortName: 'Nam Định', slogan: 'Quê hương Tây Hồ', region: 'Bắc Bộ', lat: 20.434570, lng: 106.177299 },
  { id: 'thaibinh', name: 'Thái Bình', fullName: 'Tỉnh Thái Bình', shortName: 'Thái Bình', slogan: 'Đất nước lúa mỳ', region: 'Bắc Bộ', lat: 20.446348, lng: 106.336594 },
  { id: 'ninhbinh', name: 'Ninh Bình', fullName: 'Tỉnh Ninh Bình', shortName: 'Ninh Bình', slogan: 'Vịnh Hạ Long giữa đất liền', region: 'Bắc Bộ', lat: 20.250614, lng: 105.974457, popular: true },
  { id: 'vinhphuc', name: 'Vĩnh Phúc', fullName: 'Tỉnh Vĩnh Phúc', shortName: 'Vĩnh Phúc', slogan: 'Đất tây vành đai', region: 'Bắc Bộ', lat: 21.360870, lng: 105.547432 },
  { id: 'phutho', name: 'Phú Thọ', fullName: 'Tỉnh Phú Thọ', shortName: 'Phú Thọ', slogan: 'Quê hương Hùng Vương', region: 'Bắc Bộ', lat: 21.322744, lng: 105.228020 },
  { id: 'thainguyen', name: 'Thái Nguyên', fullName: 'Tỉnh Thái Nguyên', shortName: 'Thái Nguyên', slogan: 'Núi đá quý hiếm', region: 'Bắc Bộ', lat: 21.594220, lng: 105.848206 },
  { id: 'bacgiang', name: 'Bắc Giang', fullName: 'Tỉnh Bắc Giang', shortName: 'Bắc Giang', slogan: 'Đất quý vải lái', region: 'Bắc Bộ', lat: 21.273069, lng: 106.194603 },
  { id: 'hoabinh', name: 'Hòa Bình', fullName: 'Tỉnh Hòa Bình', shortName: 'Hòa Bình', slogan: 'Thắng cảnh non nước', region: 'Bắc Bộ', lat: 20.817175, lng: 105.337593 },
  { id: 'laocai', name: 'Lào Cai (Sa Pa)', fullName: 'Tỉnh Lào Cai', shortName: 'Lào Cai', slogan: 'Sa Pa sương mù', region: 'Bắc Bộ', lat: 22.485573, lng: 103.970657, popular: true },
  { id: 'yenbai', name: 'Yên Bái', fullName: 'Tỉnh Yên Bái', shortName: 'Yên Bái', slogan: 'Vùng cao nơi thung lũng', region: 'Bắc Bộ', lat: 21.716766, lng: 104.897766 },
  { id: 'sonla', name: 'Sơn La', fullName: 'Tỉnh Sơn La', shortName: 'Sơn La', slogan: 'Xứ sở cà phê', region: 'Bắc Bộ', lat: 21.328325, lng: 103.914833 },
  { id: 'dienbien', name: 'Điện Biên', fullName: 'Tỉnh Điện Biên', shortName: 'Điện Biên', slogan: 'Điện Biên Phủ lịch sử', region: 'Bắc Bộ', lat: 21.386314, lng: 103.023254 },
  { id: 'laichau', name: 'Lai Châu', fullName: 'Tỉnh Lai Châu', shortName: 'Lai Châu', slogan: 'Người dân bình yên', region: 'Bắc Bộ', lat: 22.395729, lng: 103.468246 },
  { id: 'langson', name: 'Lạng Sơn', fullName: 'Tỉnh Lạng Sơn', shortName: 'Lạng Sơn', slogan: 'Cửa khẩu phía Bắc', region: 'Bắc Bộ', lat: 21.853706, lng: 106.761528 },
  { id: 'caobang', name: 'Cao Bằng', fullName: 'Tỉnh Cao Bằng', shortName: 'Cao Bằng', slogan: 'Hang Động Thiên Hà', region: 'Bắc Bộ', lat: 22.666479, lng: 106.257774 },
  { id: 'backan', name: 'Bắc Kạn', fullName: 'Tỉnh Bắc Kạn', shortName: 'Bắc Kạn', slogan: 'Đất đỏ mùng non', region: 'Bắc Bộ', lat: 22.147009, lng: 105.834816 },
  { id: 'tuyenquang', name: 'Tuyên Quang', fullName: 'Tỉnh Tuyên Quang', shortName: 'Tuyên Quang', slogan: 'Thác Thủy Diều kỳ vỹ', region: 'Bắc Bộ', lat: 21.823298, lng: 105.218048 },
  { id: 'hagiang', name: 'Hà Giang', fullName: 'Tỉnh Hà Giang', shortName: 'Hà Giang', slogan: 'Đất Tây Bắc hùng vĩ', region: 'Bắc Bộ', lat: 22.823330, lng: 104.983933, popular: true },

  // Miền Trung
  { id: 'thanhhoa', name: 'Thanh Hóa', fullName: 'Tỉnh Thanh Hóa', shortName: 'Thanh Hóa', slogan: 'Xứ sở Gò Cây Chuối', region: 'Trung Bộ', lat: 19.806692, lng: 105.785187 },
  { id: 'nghean', name: 'Nghệ An', fullName: 'Tỉnh Nghệ An', shortName: 'Nghệ An', slogan: 'Xứ Quỳnh Lưu lịch sử', region: 'Trung Bộ', lat: 18.673395, lng: 105.681328, popular: true },
  { id: 'hatinh', name: 'Hà Tĩnh', fullName: 'Tỉnh Hà Tĩnh', shortName: 'Hà Tĩnh', slogan: 'Nơi Hồ Chí Minh khởi phát', region: 'Trung Bộ', lat: 18.355953, lng: 105.905952 },
  { id: 'quangbinh', name: 'Quảng Bình', fullName: 'Tỉnh Quảng Bình', shortName: 'Quảng Bình', slogan: 'Phong Nha Kẻ Bàng du lịch', region: 'Trung Bộ', lat: 17.476043, lng: 106.599983 },
  { id: 'quangtri', name: 'Quảng Trị', fullName: 'Tỉnh Quảng Trị', shortName: 'Quảng Trị', slogan: 'Giao thừa lịch sử', region: 'Trung Bộ', lat: 16.816223, lng: 107.100418 },
  { id: 'hue', name: 'Thừa Thiên Huế', fullName: 'Tỉnh Thừa Thiên Huế', shortName: 'Huế', slogan: 'Huế xứ sở Tây Nguyên', region: 'Trung Bộ', lat: 16.463714, lng: 107.590866, popular: true },
  { id: 'quangnam', name: 'Quảng Nam (Hội An)', fullName: 'Tỉnh Quảng Nam', shortName: 'Quảng Nam', slogan: 'Hội An thành phố cổ', region: 'Trung Bộ', lat: 15.568478, lng: 108.384666, popular: true },
  { id: 'quangngai', name: 'Quảng Ngãi', fullName: 'Tỉnh Quảng Ngãi', shortName: 'Quảng Ngãi', slogan: 'Lý Sơn đảo ngọc', region: 'Trung Bộ', lat: 15.120471, lng: 108.792282 },
  { id: 'binhdinh', name: 'Bình Định (Quy Nhơn)', fullName: 'Tỉnh Bình Định', shortName: 'Bình Định', slogan: 'Quy Nhơn biển xanh', region: 'Trung Bộ', lat: 13.782967, lng: 109.219666, popular: true },
  { id: 'phuyen', name: 'Phú Yên', fullName: 'Tỉnh Phú Yên', shortName: 'Phú Yên', slogan: 'Vùng đất hiền hòa', region: 'Trung Bộ', lat: 13.088184, lng: 109.309082 },
  { id: 'khanhhoa', name: 'Khánh Hòa (Nha Trang)', fullName: 'Tỉnh Khánh Hòa', shortName: 'Khánh Hòa', slogan: 'Nha Trang - thành phố biển', region: 'Trung Bộ', lat: 12.238791, lng: 109.196747, popular: true },
  { id: 'ninhthuan', name: 'Ninh Thuận', fullName: 'Tỉnh Ninh Thuận', shortName: 'Ninh Thuận', slogan: 'Ninh Thuận gió nắng', region: 'Trung Bộ', lat: 11.565437, lng: 108.988091 },
  { id: 'binhthuan', name: 'Bình Thuận (Phan Thiết)', fullName: 'Tỉnh Bình Thuận', shortName: 'Bình Thuận', slogan: 'Phan Thiết cà chua', region: 'Trung Bộ', lat: 10.932204, lng: 108.102043, popular: true },
  { id: 'kontum', name: 'Kon Tum', fullName: 'Tỉnh Kon Tum', shortName: 'Kon Tum', slogan: 'Kon Tum núi rừng', region: 'Trung Bộ', lat: 14.349712, lng: 108.000458 },
  { id: 'gialai', name: 'Gia Lai', fullName: 'Tỉnh Gia Lai', shortName: 'Gia Lai', slogan: 'Gia Lai xứ cà phê', region: 'Trung Bộ', lat: 13.983344, lng: 108.000305 },
  { id: 'daklak', name: 'Đắk Lắk (Buôn Ma Thuột)', fullName: 'Tỉnh Đắk Lắk', shortName: 'Đắk Lắk', slogan: 'Buôn Ma Thuột cà phê ngon', region: 'Trung Bộ', lat: 12.666667, lng: 108.038254, popular: true },
  { id: 'daknong', name: 'Đắk Nông', fullName: 'Tỉnh Đắk Nông', shortName: 'Đắk Nông', slogan: 'Đắk Nông vùng mới', region: 'Trung Bộ', lat: 12.003975, lng: 107.690323 },
  { id: 'lamdong', name: 'Lâm Đồng (Đà Lạt)', fullName: 'Tỉnh Lâm Đồng', shortName: 'Lâm Đồng', slogan: 'Đà Lạt thành phố hoa', region: 'Trung Bộ', lat: 11.940419, lng: 108.458313, popular: true },

  // Miền Nam
  { id: 'vungtau', name: 'Bà Rịa - Vũng Tàu', fullName: 'Tỉnh Bà Rịa - Vũng Tàu', shortName: 'Vũng Tàu', slogan: 'Vũng Tàu du lịch biển', region: 'Nam Bộ', lat: 10.345991, lng: 107.084297, popular: true },
  { id: 'binhduong', name: 'Bình Dương', fullName: 'Tỉnh Bình Dương', shortName: 'Bình Dương', slogan: 'Bình Dương thị xã công nghiệp', region: 'Nam Bộ', lat: 11.173872, lng: 106.666992, popular: true },
  { id: 'dongnai', name: 'Đồng Nai', fullName: 'Tỉnh Đồng Nai', shortName: 'Đồng Nai', slogan: 'Đồng Nai phát triển nhanh', region: 'Nam Bộ', lat: 10.957444, lng: 106.842712, popular: true },
  { id: 'binhphuoc', name: 'Bình Phước', fullName: 'Tỉnh Bình Phước', shortName: 'Bình Phước', slogan: 'Bình Phước rừng gỗ', region: 'Nam Bộ', lat: 11.751241, lng: 106.904831 },
  { id: 'tayninh', name: 'Tây Ninh', fullName: 'Tỉnh Tây Ninh', shortName: 'Tây Ninh', slogan: 'Nước Tây Ninh quanh co', region: 'Nam Bộ', lat: 11.310156, lng: 106.098480 },
  { id: 'longan', name: 'Long An', fullName: 'Tỉnh Long An', shortName: 'Long An', slogan: 'Long An lúa mỳ', region: 'Nam Bộ', lat: 10.536746, lng: 106.410423 },
  { id: 'tiengiang', name: 'Tiền Giang', fullName: 'Tỉnh Tiền Giang', shortName: 'Tiền Giang', slogan: 'Tiền Giang dua hấu', region: 'Nam Bộ', lat: 10.360000, lng: 106.360000 },
  { id: 'bentre', name: 'Bến Tre', fullName: 'Tỉnh Bến Tre', shortName: 'Bến Tre', slogan: 'Bến Tre dừa nước', region: 'Nam Bộ', lat: 10.243356, lng: 106.375595 },
  { id: 'travinh', name: 'Trà Vinh', fullName: 'Tỉnh Trà Vinh', shortName: 'Trà Vinh', slogan: 'Trà Vinh Kiên Giang', region: 'Nam Bộ', lat: 9.934836, lng: 106.345474 },
  { id: 'vinhlong', name: 'Vĩnh Long', fullName: 'Tỉnh Vĩnh Long', shortName: 'Vĩnh Long', slogan: 'Vĩnh Long sông nước', region: 'Nam Bộ', lat: 10.253687, lng: 105.972206 },
  { id: 'dongthap', name: 'Đồng Tháp', fullName: 'Tỉnh Đồng Tháp', shortName: 'Đồng Tháp', slogan: 'Đồng Tháp Mười huyền thoại', region: 'Nam Bộ', lat: 10.457855, lng: 105.632362 },
  { id: 'angiang', name: 'An Giang', fullName: 'Tỉnh An Giang', shortName: 'An Giang', slogan: 'An Giang Tây Nam Bộ', region: 'Nam Bộ', lat: 10.388889, lng: 105.416667 },
  { id: 'kiengiang', name: 'Kiên Giang (Phú Quốc)', fullName: 'Tỉnh Kiên Giang', shortName: 'Kiên Giang', slogan: 'Phú Quốc đảo ngọc', region: 'Nam Bộ', lat: 10.012586, lng: 105.080917, popular: true },
  { id: 'haugiang', name: 'Hậu Giang', fullName: 'Tỉnh Hậu Giang', shortName: 'Hậu Giang', slogan: 'Hậu Giang đất mới', region: 'Nam Bộ', lat: 9.784489, lng: 105.470123 },
  { id: 'soctrang', name: 'Sóc Trăng', fullName: 'Tỉnh Sóc Trăng', shortName: 'Sóc Trăng', slogan: 'Sóc Trăng Khmer', region: 'Nam Bộ', lat: 9.603306, lng: 105.980003 },
  { id: 'baclieu', name: 'Bạc Liêu', fullName: 'Tỉnh Bạc Liêu', shortName: 'Bạc Liêu', slogan: 'Bạc Liêu gạo tớm', region: 'Nam Bộ', lat: 9.294142, lng: 105.727768 },
  { id: 'camau', name: 'Cà Mau', fullName: 'Tỉnh Cà Mau', shortName: 'Cà Mau', slogan: 'Cà Mau mũi đất', region: 'Nam Bộ', lat: 9.176867, lng: 105.152420, popular: true },
];

export interface DetectedLocationResult {
  province: VietnamProvince;
  latitude: number;
  longitude: number;
  source: 'gps' | 'saved' | 'default' | 'user_selected';
  detailedAddress?: string;
  accuracyMeters?: number;
}

const STORAGE_KEY_PROVINCE = 'humanmap_selected_province_id';
const STORAGE_KEY_COORDS = 'humanmap_user_coords';

class LocationService {
  private currentProvince: VietnamProvince = VIETNAM_PROVINCES[0]; // Default to Hanoi
  private userCoords: { lat: number; lng: number } = { lat: 21.028511, lng: 105.854167 };
  private isGPSActive: boolean = false;
  private listeners: Array<(loc: DetectedLocationResult) => void> = [];

  constructor() {
    this.loadSavedState();
  }

  private loadSavedState() {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_PROVINCE);
      if (savedId) {
        const found: VietnamProvince | undefined = VIETNAM_PROVINCES.find((p) => p.id === savedId);
        if (found) {
          this.currentProvince = found;
          this.userCoords = { lat: found.lat, lng: found.lng };
        }
      }

      const savedCoords = localStorage.getItem(STORAGE_KEY_COORDS);
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (parsed?.lat && parsed?.lng) {
          this.userCoords = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load saved location state:', e);
    }
  }

  /**
   * Subscribe to location/province updates across components
   */
  public subscribe(callback: (loc: DetectedLocationResult) => void): () => void {
    this.listeners.push(callback);
    // Send immediate current state
    callback({
      province: this.currentProvince,
      latitude: this.userCoords.lat,
      longitude: this.userCoords.lng,
      source: this.isGPSActive ? 'gps' : 'saved',
    });

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(result: DetectedLocationResult) {
    this.listeners.forEach((cb) => {
      try {
        cb(result);
      } catch (err) {
        console.error('Location listener callback error:', err);
      }
    });
  }

  /**
   * Calculate distance in meters using Haversine formula
   */
  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Finds the closest Vietnamese province based on GPS Coordinates
   */
  public findNearestProvince(lat: number, lng: number): VietnamProvince {
    let closest = VIETNAM_PROVINCES[0];
    let minDistance = Infinity;

    for (const p of VIETNAM_PROVINCES) {
      const dist = this.calculateDistance(lat, lng, p.lat, p.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = p;
      }
    }

    return closest;
  }

  /**
   * Reverse geocodes coordinates to administrative province name in Vietnam
   */
  public async reverseGeocode(lat: number, lng: number): Promise<{
    province: VietnamProvince;
    detailedAddress?: string;
  }> {
    // 1. First find geometric nearest as fallback guarantee
    const nearest = this.findNearestProvince(lat, lng);

    try {
      // 2. Try online reverse geocode API (OSM Nominatim or backend)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=vi`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const stateOrCity = (address.city || address.state || address.province || '').toLowerCase();

        if (stateOrCity) {
          const matched = VIETNAM_PROVINCES.find((p) => {
            const lowerName = p.name.toLowerCase();
            const lowerShort = p.shortName.toLowerCase();
            const lowerFull = p.fullName.toLowerCase();
            return (
              stateOrCity.includes(lowerName) ||
              stateOrCity.includes(lowerShort) ||
              stateOrCity.includes(lowerFull) ||
              lowerName.includes(stateOrCity)
            );
          });

          if (matched) {
            return {
              province: matched,
              detailedAddress: data.display_name,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Online reverse geocoding unavailable, using spatial proximity:', err);
    }

    return { province: nearest };
  }

  /**
   * Detect user's actual physical location via browser GPS / Geolocation API
   */
  public async detectRealLocation(): Promise<DetectedLocationResult> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const result: DetectedLocationResult = {
          province: this.currentProvince,
          latitude: this.userCoords.lat,
          longitude: this.userCoords.lng,
          source: 'default',
        };
        resolve(result);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          this.isGPSActive = true;
          this.userCoords = { lat, lng };

          // Reverse geocode to find exact province
          const { province, detailedAddress } = await this.reverseGeocode(lat, lng);
          this.currentProvince = province;

          try {
            localStorage.setItem(STORAGE_KEY_PROVINCE, province.id);
            localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ lat, lng }));
          } catch (e) {}

          const result: DetectedLocationResult = {
            province,
            latitude: lat,
            longitude: lng,
            source: 'gps',
            detailedAddress,
            accuracyMeters: accuracy,
          };

          this.notify(result);
          resolve(result);
        },
        (error) => {
          console.warn('Geolocation access error or denied:', error.message);
          const result: DetectedLocationResult = {
            province: this.currentProvince,
            latitude: this.userCoords.lat,
            longitude: this.userCoords.lng,
            source: 'saved',
          };
          resolve(result);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * Manually select/switch province
   */
  public selectProvince(province: VietnamProvince) {
    this.currentProvince = province;
    this.userCoords = { lat: province.lat, lng: province.lng };
    this.isGPSActive = false;

    try {
      localStorage.setItem(STORAGE_KEY_PROVINCE, province.id);
      localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ lat: province.lat, lng: province.lng }));
    } catch (e) {}

    const result: DetectedLocationResult = {
      province,
      latitude: province.lat,
      longitude: province.lng,
      source: 'user_selected',
    };

    this.notify(result);
    return result;
  }

  public getCurrentProvince(): VietnamProvince {
    return this.currentProvince;
  }

  public getUserCoords(): { lat: number; lng: number } {
    return this.userCoords;
  }

  public getIsGPSActive(): boolean {
    return this.isGPSActive;
  }
}

export const locationService = new LocationService();
