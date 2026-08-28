import { AdminIdentity, AdminSummary, NeedRequest, Story, RequestStatus } from '../types';
import { dataService } from './dataService';

const emptyRequests = (): Record<RequestStatus, number> => ({
  open: 0,
  matched: 0,
  accepted: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
});

const toneForStatus = (status: RequestStatus): 'blue' | 'green' | 'amber' | 'red' => {
  if (status === 'completed') return 'green';
  if (status === 'cancelled') return 'red';
  if (status === 'in_progress' || status === 'accepted') return 'amber';
  return 'blue';
};

export const adminService = {
  async getIdentity(): Promise<AdminIdentity | null> {
    const user = dataService.getCurrentFirebaseUser();
    if (!user) return null;

    const token = await user.getIdTokenResult();
    const claims = token.claims as { admin?: boolean; role?: string; permissions?: string[] };
    const role = claims.role === 'moderator' || claims.role === 'support' ? claims.role : claims.admin ? 'admin' : null;
    if (!role) return null;

    return {
      uid: user.uid,
      email: user.email || undefined,
      role,
      permissions: (claims.permissions || []) as AdminIdentity['permissions'],
    };
  },

  async getSummary(): Promise<AdminSummary> {
    const [needs, stories, user] = await Promise.all([
      dataService.getNeedRequests(),
      dataService.getStories(),
      dataService.getCurrentUser(),
    ]);
    const requests = emptyRequests();
    needs.forEach((need: NeedRequest) => { requests[need.status] += 1; });
    const publicStories = stories.filter((story: Story) => story.isPublicConsent === true);
    const activeHelpers = user.isHelperAvailable ? 1 : 0;

    return {
      requests,
      stories: { total: stories.length, pending: 0, public: publicStories.length },
      users: { total: user.uid ? 1 : 0, activeHelpers },
      sessions: { active: 0, completed: requests.completed },
      safety: { unresolved: needs.filter((need) => need.riskLevel === 'HIGH' || need.riskLevel === 'RESTRICTED').length },
      impact: {
        peopleHelped: requests.completed,
        completedSessions: requests.completed,
        totalHelpMinutes: 0,
        activeHelpers,
        neighborhoodsActivated: new Set(needs.map((need) => need.locationName)).size,
        successfulMatches: requests.completed,
        hasSufficientData: false,
      },
      recentActivity: needs.slice(0, 6).map((need) => ({
        id: need.id,
        label: need.title,
        detail: `${need.requesterName} · ${need.locationName}`,
        timestamp: need.createdAt,
        tone: toneForStatus(need.status),
      })),
    };
  },
};
