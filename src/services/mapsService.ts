/**
 * Maps Service Contract (Phase 0 Mock)
 * 
 * Prepares clean service boundaries for Google Maps API integration in Phase 1+.
 * Provides distance calculation, coordinate transformations, and location formatting.
 */

import { HANOI_CENTER } from '../data/mockData';
import { RouteResult } from '../types';
import { dataService } from './dataService';

export const mapsService = {
  getMapVinaTileUrl(): string {
    return '/api/mapvina/tile/{z}/{x}/{y}.png';
  },

  /**
   * Evaluates helper location freshness:
   * LIVE: updated < 2 mins ago AND isHelperAvailable === true
   * STALE: updated 2 - 10 mins ago
   * OFFLINE: updated > 10 mins ago OR isHelperAvailable === false OR missing/invalid/future timestamp
   */
  getHelperFreshnessState(locationUpdatedAt?: string, isHelperAvailable?: boolean): 'LIVE' | 'STALE' | 'OFFLINE' {
    if (!isHelperAvailable) return 'OFFLINE';
    if (!locationUpdatedAt) return 'OFFLINE';

    const updatedTime = new Date(locationUpdatedAt).getTime();
    if (isNaN(updatedTime)) return 'OFFLINE';

    const now = Date.now();
    // Defensive check against clock skew / future timestamp (> 1 min in future)
    if (updatedTime > now + 60 * 1000) return 'OFFLINE';

    const ageMs = now - updatedTime;
    if (ageMs < 2 * 60 * 1000) return 'LIVE';
    if (ageMs <= 10 * 60 * 1000) return 'STALE';
    return 'OFFLINE';
  },

  /**
   * Calculates Haversine distance in meters between two lat/lng points.
   * Used for fast spatial bounding box and candidate pre-filtering.
   */
  calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },

  /**
   * Formats distance in meters into human readable string.
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `~${meters}m`;
    }
    return `~${(meters / 1000).toFixed(1)} km`;
  },

  /**
   * Fetches real road-network route from backend routing proxy (/api/route).
   */
  async getRealRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'walk' | 'bike' | 'drive' = 'walk'
  ): Promise<RouteResult> {
    const token = await dataService.getIdToken();
    if (!token) {
      const authErr = new Error('Yêu cầu đăng nhập để truy cập dịch vụ chỉ đường.');
      (authErr as any).code = 'ROUTING_AUTH_REQUIRED';
      throw authErr;
    }

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ origin, destination, mode }),
      });

      const json = await response.json();
      if (response.ok && json.success && json.data) {
        return json.data as RouteResult;
      }

      const err = new Error(json.error || 'Không thể tính tuyến đường lúc này.');
      (err as any).code = json.errorCode || (response.status === 401 ? 'ROUTING_AUTH_INVALID' : response.status === 429 ? 'ROUTING_RATE_LIMITED' : 'ROUTING_UNAVAILABLE');
      throw err;
    } catch (err: any) {
      if (err.code) throw err;
      const networkErr = new Error(err.message || 'Lỗi kết nối khi chỉ đường.');
      (networkErr as any).code = 'NETWORK_ERROR';
      throw networkErr;
    }
  },

  /**
   * Fast synchronous Haversine estimate used for UI bounding box calculations.
   */
  getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'walk' | 'bike' | 'drive' = 'walk'
  ): {
    distanceMeters: number;
    estMinutes: number;
    polyline: [number, number][]; // [lat, lng] waypoints
    mode: 'walk' | 'bike' | 'drive';
  } {
    const distanceMeters = this.calculateDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
    const metersPerMin = mode === 'walk' ? 75 : mode === 'bike' ? 250 : 416;
    const estMinutes = Math.max(1, Math.round(distanceMeters / metersPerMin));

    const polyline: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];

    return {
      distanceMeters,
      estMinutes,
      polyline,
      mode,
    };
  },


  /**
   * Gets current user mock location (Hoan Kiem area).
   */
  getCurrentUserLocation() {
    return {
      lat: HANOI_CENTER.lat,
      lng: HANOI_CENTER.lng,
      locationName: 'Phố Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội'
    };
  },

  /**
   * Converts Lat/Lng coordinates into visual SVG canvas percentage (0-100)
   * relative to Hanoi Old Quarter bounding box for custom map rendering.
   */
  coordinatesToCanvasPercent(lat: number, lng: number): { x: number; y: number } {
    // Bounding box for Hanoi Old Quarter
    const minLat = 21.0200;
    const maxLat = 21.0410;
    const minLng = 105.8390;
    const maxLng = 105.8600;

    // Normalize (lng -> x, lat -> y inverted because SVG y goes top to bottom)
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;

    // Clamp between 5% and 95%
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  }
};
