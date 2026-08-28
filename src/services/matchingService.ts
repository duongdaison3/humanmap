/**
 * Matching Service Engine (Phase 2: HUMAN MATCHING)
 * 
 * Need → Find Suitable People → Rank Them → Explain Recommendation
 * 
 * Recommends local helpers who can safely assist with low-risk micro-help needs.
 */

import { NeedRequest, NeedCategory, UserProfile, HelperCandidate } from '../types';
import { HANOI_CENTER } from '../data/mockData';
import { mapsService } from './mapsService';
import { geminiService, ParsedNeed } from './geminiService';

export interface MatchingResult {
  isSafe: boolean;
  riskLevel?: string;
  safetyReasoning?: string;
  candidates: HelperCandidate[];
  topCandidate?: HelperCandidate;
  otherCandidates: HelperCandidate[];
}

export const matchingService = {
  /**
   * Reusable distance utility (delegates to Haversine calculation)
   */
  calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return mapsService.calculateDistanceMeters(lat1, lng1, lat2, lng2);
  },

  /**
   * Calculates transparent match score (0 to 100)
   * Weighting:
   * - Distance: 35%
   * - Availability: 25%
   * - Skill match: 20%
   * - Reliability: 15%
   * - Task preference: 5%
   */
  calculateMatchScore(
    helper: UserProfile,
    targetLat: number,
    targetLng: number,
    category: NeedCategory,
    requiredSkills: string[] = []
  ): number {
    const helperLat = helper.lat || (HANOI_CENTER.lat + (Math.random() - 0.5) * 0.002);
    const helperLng = helper.lng || (HANOI_CENTER.lng + (Math.random() - 0.5) * 0.002);
    const distanceMeters = this.calculateDistanceMeters(targetLat, targetLng, helperLat, helperLng);

    // 1. Distance score (35%)
    let distanceScore = 100;
    if (distanceMeters <= 100) {
      distanceScore = 100;
    } else if (distanceMeters <= 1000) {
      distanceScore = Math.max(20, 100 - ((distanceMeters - 100) / 900) * 80);
    } else {
      distanceScore = Math.max(0, 20 - ((distanceMeters - 1000) / 100));
    }

    // 2. Availability score (25%)
    const availabilityScore = helper.isHelperAvailable ? 100 : 0;

    // 3. Skill match score (20%)
    let skillScore = 40;
    const helperSkillsLower = (helper.skills || []).map((s) => s.toLowerCase());
    const categoryLower = category.toLowerCase();

    if (
      helperSkillsLower.includes(categoryLower) ||
      (category === 'directions' && (helperSkillsLower.some(s => s.includes('chỉ đường') || s.includes('navigation') || s.includes('phố cổ')))) ||
      (category === 'translation' && (helperSkillsLower.some(s => s.includes('dịch') || s.includes('tiếng anh') || s.includes('ngôn ngữ')))) ||
      (category === 'phone_help' && (helperSkillsLower.some(s => s.includes('điện thoại') || s.includes('app') || s.includes('qr')))) ||
      (category === 'pharmacy_find' && (helperSkillsLower.some(s => s.includes('thuốc') || s.includes('địa điểm'))))
    ) {
      skillScore = 100;
    } else if (helperSkillsLower.length > 0) {
      skillScore = 70;
    }

    // Check if any required skills match
    if (requiredSkills && requiredSkills.length > 0) {
      for (const reqSkill of requiredSkills) {
        if (helperSkillsLower.some((hs) => hs.includes(reqSkill.toLowerCase()))) {
          skillScore = Math.min(100, skillScore + 20);
        }
      }
    }

    // 4. Reliability score (15%)
    const rel = helper.reliabilityScore !== undefined ? helper.reliabilityScore : Math.min(1.0, 0.85 + helper.totalHelpedCount * 0.01);
    const reliabilityScore = rel * 100;

    // 5. Task preference score (5%)
    const prefScore = helper.preferredCategories?.includes(category) ? 100 : 50;

    // Weighted sum
    const totalWeighted =
      distanceScore * 0.35 +
      availabilityScore * 0.25 +
      skillScore * 0.20 +
      reliabilityScore * 0.15 +
      prefScore * 0.05;

    return Math.min(99, Math.max(45, Math.round(totalWeighted)));
  },

  /**
   * Rank helper candidates based on match score
   */
  rankCandidates(
    helpers: UserProfile[],
    targetLat: number,
    targetLng: number,
    category: NeedCategory,
    requiredSkills: string[] = [],
    excludeName?: string
  ): HelperCandidate[] {
    // 1. Filter out candidates who are excluded by name, unavailable, or STALE/OFFLINE
    const eligibleHelpers = helpers.filter((h) => {
      if (excludeName && h.name.toLowerCase() === excludeName.toLowerCase()) return false;
      const freshnessState = mapsService.getHelperFreshnessState(h.locationUpdatedAt, h.isHelperAvailable);
      return freshnessState === 'LIVE';
    });

    const candidates: HelperCandidate[] = eligibleHelpers
      .map((helper) => {
        const helperLat = helper.lat || (HANOI_CENTER.lat + (Math.random() - 0.5) * 0.002);
        const helperLng = helper.lng || (HANOI_CENTER.lng + (Math.random() - 0.5) * 0.002);
        const distanceMeters = this.calculateDistanceMeters(targetLat, targetLng, helperLat, helperLng);
        const matchScore = this.calculateMatchScore(helper, targetLat, targetLng, category, requiredSkills);

        // Map primary skill label
        let primarySkillLabel = 'Navigation';
        if (helper.skills && helper.skills.length > 0) {
          const customLabel = helper.skills.find(s => !['directions', 'translation', 'phone_help', 'pharmacy_find', 'public_place', 'other_safe'].includes(s));
          if (customLabel) {
            primarySkillLabel = customLabel;
          } else {
            const first = helper.skills[0];
            if (first === 'directions') primarySkillLabel = 'Navigation';
            else if (first === 'translation') primarySkillLabel = 'Translation';
            else if (first === 'phone_help') primarySkillLabel = 'Digital Assistance';
            else if (first === 'pharmacy_find') primarySkillLabel = 'Local Knowledge';
            else primarySkillLabel = 'Community Help';
          }
        } else {
          if (category === 'directions') primarySkillLabel = 'Navigation';
          else if (category === 'translation') primarySkillLabel = 'Translation';
          else if (category === 'phone_help') primarySkillLabel = 'Digital Help';
          else primarySkillLabel = 'Local Guidance';
        }

        return {
          id: helper.id,
          name: helper.name,
          avatar: helper.avatar,
          role: helper.role,
          locationName: helper.locationName,
          distanceMeters,
          isAvailable: helper.isHelperAvailable,
          skills: helper.skills || ['Hỗ trợ nhiệt tình'],
          primarySkillLabel,
          completedHelps: helper.totalHelpedCount,
          reliabilityScore: helper.reliabilityScore || 0.92,
          preferredCategories: helper.preferredCategories || [category],
          matchScore,
          rawUser: helper,
        };
      });

    // Sort descending by match score
    return candidates.sort((a, b) => b.matchScore - a.matchScore);
  },

  /**
   * Main Pipeline Function: findCandidates()
   * Evaluates safety & finds top candidates for a need.
   */
  async findCandidates(
    need: {
      title: string;
      category: NeedCategory;
      lat: number;
      lng: number;
      requiredSkills?: string[];
      requesterName?: string;
      riskLevel?: string;
      safeForHumanMap?: boolean;
      safetyReasoning?: string;
    },
    customHelpers: UserProfile[] = []
  ): Promise<MatchingResult> {
    // 1. Safety Check Rule:
    // If riskLevel is MEDIUM, HIGH, RESTRICTED or safeForHumanMap is false, block matching!
    if (need.riskLevel && (need.riskLevel === 'RESTRICTED' || need.riskLevel === 'HIGH' || need.riskLevel === 'MEDIUM' || need.safeForHumanMap === false)) {
      return {
        isSafe: false,
        riskLevel: need.riskLevel || 'RESTRICTED',
        safetyReasoning: need.safetyReasoning || 'Human Map only matches low-risk, safe public micro-help requests.',
        candidates: [],
        otherCandidates: [],
      };
    }

    // 2. Rank candidates
    const ranked = this.rankCandidates(
      customHelpers,
      need.lat,
      need.lng,
      need.category,
      need.requiredSkills,
      need.requesterName
    );

    // Filter available candidates first, but keep top candidates
    const topCandidates = ranked.slice(0, 3);

    // 3. Generate AI explanation for the top candidate
    if (topCandidates.length > 0) {
      const top = topCandidates[0];
      try {
        const explanation = await geminiService.generateMatchExplanation(
          need.title,
          top.name,
          top.distanceMeters,
          top.skills,
          top.completedHelps
        );
        top.aiExplanation = explanation;
      } catch (err) {
        top.aiExplanation = `${top.name} is nearby (~${top.distanceMeters}m away), available now, and has completed ${top.completedHelps} successful helps.`;
      }
    }

    return {
      isSafe: true,
      riskLevel: 'LOW',
      candidates: topCandidates,
      topCandidate: topCandidates[0],
      otherCandidates: topCandidates.slice(1, 3),
    };
  },

  /**
   * Generate Gemini AI Match Explanation
   */
  async getMatchExplanation(topCandidate: HelperCandidate, needTitle: string): Promise<string> {
    return geminiService.generateMatchExplanation(
      needTitle,
      topCandidate.name,
      topCandidate.distanceMeters,
      topCandidate.skills,
      topCandidate.completedHelps
    );
  },

  /**
   * Legacy method for filtering nearby needs on map/feed
   */
  filterNearbyNeeds(
    needs: NeedRequest[],
    userLat: number,
    userLng: number,
    categoryFilter?: NeedCategory | 'all'
  ): NeedRequest[] {
    let result = needs.filter((n) => n.status === 'open');

    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((n) => n.category === categoryFilter);
    }

    return result
      .map((n) => ({
        ...n,
        distanceMeters: mapsService.calculateDistanceMeters(userLat, userLng, n.lat, n.lng),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  },
};
