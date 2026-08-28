import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, LayoutDashboard, Menu, RefreshCw, Search, Settings,
  ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminIdentity, AdminSummary, NeedRequest, RequestStatus, Story, UserProfile } from '../../types';
import { AdminAuthGuard } from './AdminAuthGuard';

const navItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'requests', label: 'Yêu cầu trợ giúp', icon: ClipboardList },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'sessions', label: 'Phiên hỗ trợ', icon: Activity },
  { id: 'stories', label: 'Duyệt câu chuyện', icon: BookOpen },
  { id: 'safety', label: 'Trung tâm an toàn', icon: ShieldCheck },
  { id: 'trust', label: 'Trust & Impact', icon: BarChart3 },
  { id: 'audit', label: 'Nhật ký hệ thống', icon: Clock3 },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
] as const;

type ModuleId = typeof navItems[number]['id'];

const statusLabels: Record<RequestStatus, string> = {
  open: 'Đang mở', matched: 'Đã ghép', accepted: 'Đã nhận', in_progress: 'Đang xử lý', completed: 'Hoàn thành', cancelled: 'Đã hủy',
};

const statusColor: Record<RequestStatus, string> = {
  open: 'admin-badge admin-badge-blue', matched: 'admin-badge admin-badge-purple', accepted: 'admin-badge admin-badge-amber', in_progress: 'admin-badge admin-badge-amber', completed: 'admin-badge admin-badge-green', cancelled: 'admin-badge admin-badge-red',
};

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: React.ElementType; tone: string }) {
  return <div className="admin-panel admin-metric"><div className={`admin-metric-icon ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="admin-eyebrow">{label}</p><p className="admin-metric-value">{value.toLocaleString('vi-VN')}</p><p className="admin-muted">{detail}</p></div></div>;
}

function Overview({ summary, onSelect }: { summary: AdminSummary; onSelect: (id: ModuleId) => void }) {
  const totalRequests = Object.values(summary.requests).reduce((total, value) => total + value, 0);
  return <div className="space-y-5">
    <div className="admin-page-heading"><div><p className="admin-kicker">OPERATIONS CENTER</p><h1 className="admin-title">Tổng quan hệ thống</h1><p className="admin-muted mt-1">Theo dõi sức khỏe cộng đồng và các điểm cần xử lý.</p></div><div className="admin-status"><span className="admin-status-dot" /> Read-only preview</div></div>
    <div className="admin-grid-metrics">
      <Metric label="Yêu cầu đang mở" value={summary.requests.open} detail={`${totalRequests} yêu cầu tổng`} icon={ClipboardList} tone="admin-icon-blue" />
      <Metric label="Đang hỗ trợ" value={summary.requests.in_progress + summary.requests.accepted} detail="Phiên cần theo dõi" icon={Activity} tone="admin-icon-amber" />
      <Metric label="Hoàn thành" value={summary.requests.completed} detail="Ca hỗ trợ thành công" icon={CheckCircle2} tone="admin-icon-green" />
      <Metric label="Cảnh báo an toàn" value={summary.safety.unresolved} detail="Cần kiểm tra thủ công" icon={AlertTriangle} tone="admin-icon-red" />
    </div>
    <div className="admin-grid-main">
      <section className="admin-panel p-5 sm:p-6"><div className="admin-section-heading"><div><h2 className="admin-section-title">Hoạt động gần đây</h2><p className="admin-muted">Dữ liệu vận hành mới nhất</p></div><button className="admin-link" onClick={() => onSelect('requests')}>Xem tất cả <ChevronRight className="h-4 w-4" /></button></div>{summary.recentActivity.length ? <div className="mt-5 divide-y divide-slate-200/60">{summary.recentActivity.map((item) => <div className="admin-activity" key={item.id}><span className={`admin-activity-dot admin-dot-${item.tone}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{item.label}</p><p className="truncate text-xs text-slate-500">{item.detail}</p></div><span className="shrink-0 text-xs text-slate-400">{item.timestamp}</span></div>)}</div> : <Empty text="Chưa có hoạt động để hiển thị" />}</section>
      <section className="admin-panel p-5 sm:p-6"><div className="admin-section-heading"><div><h2 className="admin-section-title">Phân bổ yêu cầu</h2><p className="admin-muted">Theo trạng thái hiện tại</p></div><SlidersHorizontal className="h-5 w-5 text-slate-400" /></div><div className="mt-5 space-y-3">{(Object.keys(statusLabels) as RequestStatus[]).map((status) => <button className="admin-progress-row" key={status} onClick={() => onSelect('requests')}><span className={statusColor[status]}>{statusLabels[status]}</span><span className="admin-progress-track"><span className="admin-progress-fill" style={{ width: `${totalRequests ? Math.max(4, summary.requests[status] / totalRequests * 100) : 4}%` }} /></span><strong>{summary.requests[status]}</strong></button>)}</div></section>
    </div>
    <div className="admin-grid-secondary"><button className="admin-panel admin-quick" onClick={() => onSelect('stories')}><BookOpen className="h-5 w-5 text-[#2563EB]" /><span><strong>{summary.stories.pending}</strong><small>Câu chuyện chờ duyệt</small></span><ChevronRight className="ml-auto h-4 w-4" /></button><button className="admin-panel admin-quick" onClick={() => onSelect('users')}><Users className="h-5 w-5 text-[#149f8c]" /><span><strong>{summary.users.activeHelpers}</strong><small>Người đang sẵn sàng giúp</small></span><ChevronRight className="ml-auto h-4 w-4" /></button><button className="admin-panel admin-quick" onClick={() => onSelect('safety')}><AlertTriangle className="h-5 w-5 text-[#D97706]" /><span><strong>{summary.safety.unresolved}</strong><small>Vấn đề an toàn cần xem</small></span><ChevronRight className="ml-auto h-4 w-4" /></button></div>
  </div>;
}

function PlaceholderModuleView({ module, summary }: { module: ModuleId; summary: AdminSummary }) {
  const titles: Record<ModuleId, [string, string]> = { overview: ['Tổng quan hệ thống', 'Bảng điều khiển vận hành'], requests: ['Yêu cầu trợ giúp', 'Theo dõi trạng thái và mức độ rủi ro'], users: ['Người dùng', 'Quản lý thành viên và độ tin cậy'], sessions: ['Phiên hỗ trợ', 'Theo dõi match, interaction và lifecycle'], stories: ['Duyệt câu chuyện', 'Kiểm tra consent và nội dung công khai'], safety: ['Trung tâm an toàn', 'Xử lý các cảnh báo cần can thiệp'], trust: ['Trust & Impact', 'Đo lường tác động cộng đồng'], audit: ['Nhật ký hệ thống', 'Lịch sử hoạt động quản trị'], settings: ['Cài đặt', 'Quyền hạn và cấu hình hệ thống'] };
  const [title, subtitle] = titles[module];
  if (module === 'overview') return <Overview summary={summary} onSelect={() => {}} />;
  const counts: Record<ModuleId, number> = { overview: 0, requests: Object.values(summary.requests).reduce((a, b) => a + b, 0), users: summary.users.total, sessions: summary.sessions.active, stories: summary.stories.total, safety: summary.safety.unresolved, trust: summary.impact.peopleHelped, audit: 0, settings: 0 };
  return <div className="space-y-5"><div className="admin-page-heading"><div><p className="admin-kicker">SYSTEM MODULE</p><h1 className="admin-title">{title}</h1><p className="admin-muted mt-1">{subtitle}</p></div><button className="admin-button admin-button-disabled" disabled><ShieldCheck className="h-4 w-4" /> Read-only</button></div><div className="admin-panel p-5 sm:p-6"><div className="admin-toolbar"><div className="admin-search"><Search className="h-4 w-4" /><input placeholder={`Tìm trong ${title.toLowerCase()}...`} /></div><button className="admin-button admin-button-secondary"><SlidersHorizontal className="h-4 w-4" /> Bộ lọc</button></div><div className="admin-module-empty"><div className="admin-empty-icon"><Sparkles className="h-6 w-6" /></div><h2>{counts[module].toLocaleString('vi-VN')} bản ghi khả dụng</h2><p>Module đã được chuẩn bị cho API quản trị server-side. Thao tác chỉnh sửa sẽ mở sau khi Firebase Admin và Custom Claims được cấu hình.</p><button className="admin-button admin-button-disabled" disabled>Chờ cấu hình backend</button></div></div></div>;
}

function LegacyModuleView({ module, summary }: { module: ModuleId; summary: AdminSummary }) {
  return <AdminDataModule module={module} summary={summary} />;
}

function AdminDataModule({ module, summary }: { module: ModuleId; summary: AdminSummary }) {
  const [requests, setRequests] = useState<NeedRequest[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      if (module === 'requests') setRequests(await adminService.getRequests());
      if (module === 'stories') setStories(await adminService.getStories());
      if (module === 'users') setUsers(await adminService.getUsers());
    } catch (loadError: any) { setError(loadError?.message || 'Không thể tải dữ liệu quản trị.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [module]);
  const titles: Record<'requests' | 'users' | 'stories', [string, string]> = { requests: ['Yêu cầu trợ giúp', 'Theo dõi trạng thái và mức độ rủi ro'], users: ['Người dùng', 'Quản lý thành viên và độ tin cậy'], stories: ['Duyệt câu chuyện', 'Kiểm tra consent và nội dung công khai'] };
  if (module !== 'requests' && module !== 'users' && module !== 'stories') return <PlaceholderModuleView module={module} summary={summary} />;
  const [title, subtitle] = titles[module];
  const filteredRequests = requests.filter((item) => `${item.title} ${item.requesterName} ${item.locationName}`.toLowerCase().includes(query.toLowerCase()));
  const filteredStories = stories.filter((item) => `${item.title} ${item.authorName} ${item.theme}`.toLowerCase().includes(query.toLowerCase()));
  const filteredUsers = users.filter((item) => `${item.name} ${item.email || ''} ${item.role}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><div className="admin-page-heading"><div><p className="admin-kicker">SYSTEM MODULE</p><h1 className="admin-title">{title}</h1><p className="admin-muted mt-1">{subtitle}</p></div><button className="admin-button admin-button-secondary" onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới</button></div><section className="admin-panel p-5 sm:p-6"><div className="admin-toolbar"><div className="admin-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm trong ${title.toLowerCase()}...`} /></div><span className="admin-muted">{module === 'requests' ? filteredRequests.length : module === 'stories' ? filteredStories.length : filteredUsers.length} bản ghi</span></div>{error ? <div className="admin-error">{error}<button className="admin-link" onClick={load}>Thử lại</button></div> : loading ? <div className="admin-loading"><RefreshCw className="h-6 w-6 animate-spin" /><span>Đang tải dữ liệu...</span></div> : module === 'requests' ? <div className="admin-record-list">{filteredRequests.map((item) => <div className="admin-record" key={item.id}><div className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.requesterName} · {item.locationName}</small></div><select className="admin-select" value={item.status} onChange={async (event) => { const status = event.target.value as RequestStatus; await adminService.updateRequestStatus(item.id, status); setRequests((current) => current.map((request) => request.id === item.id ? { ...request, status } : request)); }}><option value="open">Đang mở</option><option value="matched">Đã ghép</option><option value="accepted">Đã nhận</option><option value="in_progress">Đang xử lý</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select><span className={statusColor[item.status]}>{statusLabels[item.status]}</span></div>)}</div> : module === 'stories' ? <div className="admin-record-list">{filteredStories.map((item) => <div className="admin-record" key={item.id}><div className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.authorName} · {item.theme}</small></div><button className={`admin-button ${item.isPublicConsent ? 'admin-button-secondary' : 'admin-button-primary'}`} onClick={async () => { const nextValue = !item.isPublicConsent; await adminService.moderateStory(item.id, nextValue); setStories((current) => current.map((story) => story.id === item.id ? { ...story, isPublicConsent: nextValue } : story)); }}>{item.isPublicConsent ? 'Đang công khai' : 'Duyệt công khai'}</button></div>)}</div> : <div className="admin-record-list">{filteredUsers.map((item) => <div className="admin-record" key={item.id}><div className="admin-user-row"><img src={item.avatar} alt="" /><div><strong>{item.name}</strong><small>{item.email || 'Không có email'} · {item.role}</small></div></div><span className={item.isHelperAvailable ? 'admin-badge admin-badge-green' : 'admin-badge'}>{item.isHelperAvailable ? 'Sẵn sàng' : 'Đang bận'}</span></div>)}</div>}{!loading && !error && (module === 'requests' ? filteredRequests.length : module === 'stories' ? filteredStories.length : filteredUsers.length) === 0 && <Empty text="Không có dữ liệu phù hợp." />}</section></div>;
}

function Empty({ text }: { text: string }) { return <div className="admin-empty"><p>{text}</p></div>; }

export const AdminDashboard: React.FC = () => <AdminAuthGuard>{(identity) => <AdminWorkspace identity={identity} />}</AdminAuthGuard>;

const AdminWorkspace: React.FC<{ identity: AdminIdentity }> = ({ identity }) => {
  const [module, setModule] = useState<ModuleId>('overview');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const loadSummary = () => { setIsLoading(true); adminService.getSummary().then(setSummary).finally(() => setIsLoading(false)); };
  useEffect(loadSummary, []);
  const activeNav = navItems.find((item) => item.id === module) || navItems[0];
  const Icon = activeNav.icon;
  return <div className="admin-app"><aside className={`admin-sidebar ${isMobileNavOpen ? 'is-open' : ''}`}><div className="admin-brand"><div className="admin-brand-mark"><Sparkles className="h-5 w-5" /></div><div><strong>HUMAN MAP</strong><span>OPERATIONS</span></div><button className="admin-close-mobile" onClick={() => setIsMobileNavOpen(false)}><X className="h-5 w-5" /></button></div><nav className="admin-nav">{navItems.map((item) => { const ItemIcon = item.icon; return <button key={item.id} className={`admin-nav-item ${module === item.id ? 'is-active' : ''}`} onClick={() => { setModule(item.id); setIsMobileNavOpen(false); }}><ItemIcon className="h-[18px] w-[18px]" /><span>{item.label}</span>{item.id === 'safety' && summary?.safety.unresolved ? <b>{summary.safety.unresolved}</b> : null}</button>; })}</nav><div className="admin-sidebar-foot"><div className="admin-user-avatar">{(identity.email || 'A').slice(0, 1).toUpperCase()}</div><div className="min-w-0"><strong className="block truncate">{identity.email || 'Admin'}</strong><span>{identity.role}</span></div></div></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu-mobile" onClick={() => setIsMobileNavOpen(true)}><Menu className="h-5 w-5" /></button><div className="admin-breadcrumb"><Icon className="h-4 w-4" /><span>{activeNav.label}</span></div><div className="admin-top-actions"><button className="admin-icon-button" onClick={loadSummary} title="Làm mới dữ liệu"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button><a className="admin-button admin-button-secondary hidden sm:inline-flex" href="/">Mở ứng dụng</a></div></header><main className="admin-content">{isLoading && !summary ? <div className="admin-loading"><RefreshCw className="h-6 w-6 animate-spin" /><span>Đang tải dữ liệu tổng quan...</span></div> : summary ? <PlaceholderModuleView module={module} summary={summary} /> : <div className="admin-panel p-8">Không thể tải dữ liệu dashboard.</div>}</main></div></div>;
};
