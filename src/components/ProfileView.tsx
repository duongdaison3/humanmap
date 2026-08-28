import React, { useState, useEffect } from 'react';
import { UserProfile, Story } from '../types';
import { dataService } from '../services/dataService';
import { AuthModal } from './AuthModal';
import { HumanImpactCard } from './HumanImpactCard';
import { 
  Shield, 
  HeartHandshake, 
  BookOpen, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Mail, 
  Edit2, 
  AlertTriangle, 
  UserPlus,
  Camera,
  Sparkles,
  RefreshCw,
  Check,
  Bot,
  Zap,
  Award,
  X,
  MapPin,
  Sliders,
  TrendingUp,
  UserCheck
} from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  savedStories: Story[];
  onUserUpdate: (updatedUser: UserProfile) => void;
  onResetDemoData?: () => void;
  onSelectStory: (story: Story) => void;
}

const AVATAR_PRESETS = Array.from({ length: 9 }, (_, index) => ({
  label: `Avatar mẫu ${index + 1}`,
  url: `/avatar/${index + 1}.png`,
}));

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  savedStories,
  onUserUpdate,
  onSelectStory,
}) => {
  const [activeTab, setActiveTab] = useState<'impact' | 'stories' | 'settings'>('impact');
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editBio, setEditBio] = useState(user.bio);
  const [editLocation, setEditLocation] = useState(user.locationName);
  const [editSkills, setEditSkills] = useState((user.skills || []).join(', '));
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  // Avatar Picker Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Gemini AI Profile Optimization State
  const [isAIOptimizing, setIsAIOptimizing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    optimizedBio: string;
    suggestedSkills: string[];
    communityTagline: string;
    aiImpactTip: string;
  } | null>(null);

  // Gemini AI Profile Advice State
  const [isAILoadingAdvice, setIsAILoadingAdvice] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<{
    impactTitle: string;
    insightSummary: string;
    topStrengths: string[];
    recommendedAction: string;
    safetyAdvice: string;
  } | null>(null);

  const fbUser = dataService.getCurrentFirebaseUser();
  const isAuthenticated = !!user.uid || !!fbUser;

  // Sync state if user prop changes
  useEffect(() => {
    setEditName(user.name);
    setEditBio(user.bio);
    setEditLocation(user.locationName);
    setEditSkills((user.skills || []).join(', '));
  }, [user]);

  // Load Gemini AI Advice on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setAiAdvice(null);
      return;
    }
    fetchAIAdvice();
  }, [isAuthenticated, user.id, user.totalHelpedCount]);

  const fetchAIAdvice = async () => {
    setIsAILoadingAdvice(true);
    try {
      const res = await fetch('/api/gemini/profile-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          locationName: user.locationName,
          totalHelpedCount: user.totalHelpedCount,
          skills: user.skills,
          role: user.role,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiAdvice(data.data);
      }
    } catch (e) {
      console.warn('Failed to load AI profile advice:', e);
    } finally {
      setIsAILoadingAdvice(false);
    }
  };

  const handleOpenSignIn = () => {
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  };

  const handleOpenSignUp = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await dataService.signOut();
    const guestUser = await dataService.getCurrentUser();
    onUserUpdate(guestUser);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = editSkills.split(',').map((s) => s.trim()).filter(Boolean);
    const updated: UserProfile = {
      ...user,
      name: editName.trim() || user.name,
      bio: editBio.trim() || user.bio,
      locationName: editLocation.trim() || user.locationName,
      skills: parsedSkills.length > 0 ? parsedSkills : user.skills,
    };

    await dataService.updateUserProfile(updated);
    onUserUpdate(updated);
    setIsEditingProfile(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Avatar Select Handlers
  const handleSelectAvatarPreset = async (url: string) => {
    const updated = { ...user, avatar: url };
    await dataService.updateUserProfile(updated);
    onUserUpdate(updated);
    setIsAvatarModalOpen(false);
  };

  // Gemini AI Optimization Trigger
  const handleAIOptimizeProfile = async () => {
    setIsAIOptimizing(true);
    try {
      const res = await fetch('/api/gemini/optimize-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName || user.name,
          role: user.role,
          currentBio: editBio || user.bio,
          locationName: editLocation || user.locationName,
          skills: editSkills ? editSkills.split(',') : user.skills,
          totalHelpedCount: user.totalHelpedCount,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiResult(data.data);
        if (data.data.optimizedBio) {
          setEditBio(data.data.optimizedBio);
        }
        if (data.data.suggestedSkills && data.data.suggestedSkills.length > 0) {
          setEditSkills(data.data.suggestedSkills.join(', '));
        }
      }
    } catch (err) {
      console.error('Error optimizing profile with Gemini:', err);
    } finally {
      setIsAIOptimizing(false);
    }
  };

  const handleResendEmailVerification = async () => {
    try {
      await dataService.sendVerificationEmail();
      setVerifySent(true);
      setTimeout(() => setVerifySent(false), 4000);
    } catch (e) {
      console.warn('Resend verification failed:', e);
    }
  };

  const handleToggleAvailable = async () => {
    const updated = { ...user, isHelperAvailable: !user.isHelperAvailable };
    await dataService.updateUserProfile(updated);
    onUserUpdate(updated);
  };

  const handleToggleAnonymous = async () => {
    const updated = {
      ...user,
      privacySettings: {
        ...user.privacySettings,
        anonymousByDefault: !user.privacySettings.anonymousByDefault,
      },
    };
    await dataService.updateUserProfile(updated);
    onUserUpdate(updated);
  };

  const handleToggleApproxLoc = async () => {
    const updated = {
      ...user,
      privacySettings: {
        ...user.privacySettings,
        shareApproxLocationOnly: !user.privacySettings.shareApproxLocationOnly,
      },
    };
    await dataService.updateUserProfile(updated);
    onUserUpdate(updated);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto min-h-[55vh] flex items-center justify-center pb-24 animate-fade-in">
        <div className="clay-card w-full max-w-md p-7 sm:p-9 text-center space-y-5">
          <div className="clay-pill-blue w-16 h-16 mx-auto flex items-center justify-center text-[#2563EB]">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-black text-xl text-slate-900">Đăng nhập để mở hồ sơ</h2>
            <p className="text-xs leading-relaxed text-slate-500 font-medium">
              Đăng nhập hoặc đăng ký để quản lý thông tin cá nhân, cài đặt riêng tư và lưu lại những câu chuyện của bạn.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
            <button
              type="button"
              onClick={handleOpenSignIn}
              className="clay-btn-primary px-5 py-3 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={handleOpenSignUp}
              className="clay-btn-white px-5 py-3 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký tài khoản</span>
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(updatedUser) => {
            onUserUpdate(updatedUser);
            setActiveTab('impact');
          }}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 animate-fade-in">
      {/* Email Verification Alert Banner */}
      {fbUser && !fbUser.emailVerified && user.authProvider === 'password' && (
        <div className="clay-card-amber p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Tài khoản chưa xác thực email</span>
              <span className="text-[11px] text-amber-800">
                Kiểm tra hộp thư ({fbUser.email}) để kích hoạt tính năng tài khoản đầy đủ.
              </span>
            </div>
          </div>
          <button
            onClick={handleResendEmailVerification}
            disabled={verifySent}
            className="clay-btn-white py-1.5 px-3 text-amber-900 font-extrabold text-[11px] cursor-pointer shrink-0"
          >
            {verifySent ? 'Đã gửi email!' : 'Gửi lại email'}
          </button>
        </div>
      )}

      {/* Hero Profile Card (Clean, Balanced & Minimalist) */}
      <div className="clay-card p-5 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Container */}
          <div 
            className="relative group shrink-0 cursor-pointer" 
            onClick={() => setIsAvatarModalOpen(true)}
          >
            <div className="p-1 rounded-full bg-gradient-to-tr from-[#2563EB] to-amber-400 shadow-md">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover group-hover:opacity-90 transition-all border-2 border-white"
              />
            </div>
            <div className="absolute inset-1 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
              <Camera className="w-4 h-4 text-amber-200" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarModalOpen(true);
              }}
              className="clay-btn-primary absolute bottom-0 right-0 p-1.5 text-white rounded-full cursor-pointer shadow-md"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>

          {/* User Essential Info */}
          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
                {user.name}
              </h2>
              <span className="clay-pill-blue text-[#2563EB] text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {isAuthenticated ? 'Đã xác thực' : 'Khách vãng lai'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <strong className="text-slate-700">{user.locationName}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-600">{user.role}</span>
              {user.email && (
                <>
                  <span>•</span>
                  <span className="text-slate-500 truncate max-w-[200px]">{user.email}</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-xl font-medium pt-1">
              {user.bio || 'Chưa có lời giới thiệu. Hãy bấm sửa hồ sơ để thêm lời chào ấm áp đến cộng đồng!'}
            </p>

            {/* Skills Pills */}
            {user.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                {user.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="clay-pill text-slate-700 text-[10px] font-bold px-2.5 py-0.5"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Header */}
          <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <button
              onClick={handleToggleAvailable}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                user.isHelperAvailable
                  ? 'clay-btn-emerald text-white'
                  : 'clay-btn-white text-slate-500'
              }`}
              title="Chuyển trạng thái sẵn sàng trợ giúp trên bản đồ"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>{user.isHelperAvailable ? 'Sẵn sàng giúp' : 'Đang bận'}</span>
            </button>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="clay-btn-white px-3.5 py-2 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{isEditingProfile ? 'Đóng sửa' : 'Sửa hồ sơ'}</span>
            </button>
          </div>
        </div>

        {/* Save feedback banner */}
        {saveSuccessMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Hồ sơ đã được lưu thành công!</span>
          </div>
        )}
      </div>

      {/* Edit Profile Form (Sleek Collapsible Panel with Gemini AI) */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="clay-card p-5 sm:p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#2563EB]" />
              <span>Chỉnh sửa thông tin</span>
            </h3>

            {/* AI Assistant Generator */}
            <button
              type="button"
              onClick={handleAIOptimizeProfile}
              disabled={isAIOptimizing}
              className="clay-btn-amber py-1.5 px-3 text-amber-900 font-bold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isAIOptimizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>✨ AI Tối ưu Bio & Kỹ năng</span>
                </>
              )}
            </button>
          </div>

          {aiResult && (
            <div className="clay-card-warm p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Bot className="w-4 h-4 text-amber-700" />
                <span>Gợi ý từ Gemini AI: "{aiResult.communityTagline}"</span>
              </div>
              <p className="text-slate-600 text-[11px] font-medium">{aiResult.aiImpactTip}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="clay-input w-full px-3.5 py-2 text-xs font-medium text-slate-800 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa bàn / Phố sinh sống
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="clay-input w-full px-3.5 py-2 text-xs font-medium text-slate-800 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Giới thiệu ngắn (Bio)
            </label>
            <textarea
              rows={2}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="clay-input w-full px-3.5 py-2 text-xs font-medium text-slate-800 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kỹ năng & Sở trường (phân cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={editSkills}
              onChange={(e) => setEditSkills(e.target.value)}
              placeholder="Chỉ đường Phố Cổ, Tiếng Anh, Sửa chữa nhỏ, Ẩm thực..."
              className="clay-input w-full px-3.5 py-2 text-xs font-medium text-slate-800 outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="clay-btn-white py-2 px-4 text-slate-600 font-bold text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="clay-btn-primary py-2 px-5 text-white font-bold text-xs cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      )}

      {/* 3 Summary Metric Cards (Clean, Compact High-Impact Row) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="clay-card-blue p-3.5 text-center">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] mb-0.5">
            Đã trợ giúp
          </span>
          <span className="text-xl sm:text-2xl font-serif font-black text-[#2563EB]">
            {user.totalHelpedCount}
          </span>
          <span className="block text-[10px] text-slate-500 font-medium mt-0.5">lần tương trợ</span>
        </div>

        <div className="clay-card-warm p-3.5 text-center">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-0.5">
            Câu chuyện
          </span>
          <span className="text-xl sm:text-2xl font-serif font-black text-slate-800">
            {savedStories.length}
          </span>
          <span className="block text-[10px] text-slate-500 font-medium mt-0.5">kỷ niệm lưu lại</span>
        </div>

        <div className="clay-card-amber p-3.5 text-center">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-800 mb-0.5">
            Độ tin cậy
          </span>
          <span className="text-sm sm:text-base font-bold text-amber-900 block mt-1">
            Cộng Đồng
          </span>
          <span className="block text-[10px] text-amber-700/80 font-medium mt-0.5">Verified</span>
        </div>
      </div>

      {/* Clean Segmented Tab Navigation */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('impact')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'impact'
              ? 'clay-btn-white text-[#2563EB] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Tác động & AI</span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'stories'
              ? 'clay-btn-white text-[#2563EB] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Câu chuyện lưu ({savedStories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'clay-btn-white text-[#2563EB] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Cài đặt & Tài khoản</span>
        </button>
      </div>

      {/* TAB 1: IMPACT & GEMINI AI INSIGHT */}
      {activeTab === 'impact' && (
        <div className="space-y-4 animate-fade-in">
          {/* Gemini AI Advice Card (Warm, Soft Aesthetic) */}
          <div className="clay-card-warm p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="clay-pill-blue p-2 text-[#2563EB]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">
                    Phân tích Tác động từ Gemini AI
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Gợi ý tối ưu hóa hoạt động kết nối theo dữ liệu của bạn
                  </p>
                </div>
              </div>

              <button
                onClick={fetchAIAdvice}
                disabled={isAILoadingAdvice}
                className="clay-btn-white p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                title="Cập nhật phân tích AI"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAILoadingAdvice ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {aiAdvice ? (
              <div className="space-y-3 text-xs pt-1">
                <div className="bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-amber-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Danh hiệu cộng đồng
                    </span>
                    <span className="font-serif font-bold text-slate-900 text-sm">
                      {aiAdvice.impactTitle}
                    </span>
                  </div>
                  <Award className="w-5 h-5 text-amber-600" />
                </div>

                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  "{aiAdvice.insightSummary}"
                </p>

                {aiAdvice.topStrengths && aiAdvice.topStrengths.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Điểm mạnh của bạn:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAdvice.topStrengths.map((str, idx) => (
                        <span
                          key={idx}
                          className="clay-pill text-slate-700 text-[10px] font-semibold px-2.5 py-0.5 flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-[#2563EB]" />
                          <span>{str}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                  <span className="font-bold text-amber-800 block">💡 Gợi ý hành động tuần này:</span>
                  <p className="text-slate-600 font-medium">{aiAdvice.recommendedAction}</p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500 font-medium">
                {isAILoadingAdvice ? 'Gemini đang phân tích hồ sơ...' : 'Nhấn nút làm mới để xem phân tích AI.'}
              </div>
            )}
          </div>

          {/* Aggregate Community Impact Card */}
          <HumanImpactCard userId={user.id} />
        </div>
      )}

      {/* TAB 2: SAVED STORIES */}
      {activeTab === 'stories' && (
        <div className="space-y-3 animate-fade-in">
          {savedStories.length === 0 ? (
            <div className="p-8 text-center clay-card text-slate-500 text-xs font-medium space-y-2">
              <BookOpen className="w-8 h-8 text-[#2563EB] mx-auto opacity-70" />
              <p className="font-bold text-slate-700">Chưa có câu chuyện nào được lưu</p>
              <p className="text-[11px] text-slate-500">
                Hãy khám phá mục Bản đồ hoặc Câu chuyện và nhấn lưu những kỷ niệm đáng nhớ!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedStories.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStory(s)}
                  className="clay-card p-4 hover:translate-y-[-2px] transition-all cursor-pointer flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="clay-pill-blue text-[9px] font-extrabold text-[#2563EB] px-2 py-0.5">
                      {s.theme}
                    </span>
                    <h4 className="font-serif font-bold text-slate-800 text-xs sm:text-sm group-hover:text-[#2563EB] transition-colors truncate">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#2563EB] shrink-0" />
                      <span>{s.locationName}</span>
                    </p>
                  </div>
                  <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & ACCOUNT MANAGEMENT */}
      {activeTab === 'settings' && (
        <div className="space-y-4 animate-fade-in">
          {/* Privacy & Safety Controls */}
          <div className="clay-card p-5 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              <span>Quyền riêng tư & Bảo mật vị trí</span>
            </h3>

            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              <div className="pt-2 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">Ẩn danh khi chia sẻ câu chuyện</span>
                  <span className="text-slate-500 text-[11px] font-medium">Không hiển thị tên thật công khai trên bản đồ</span>
                </div>
                <input
                  type="checkbox"
                  checked={user.privacySettings.anonymousByDefault}
                  onChange={handleToggleAnonymous}
                  className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB] cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">Chỉ chia sẻ vị trí xấp xỉ (~200m)</span>
                  <span className="text-slate-500 text-[11px] font-medium">Bảo vệ địa chỉ chính xác của bạn</span>
                </div>
                <input
                  type="checkbox"
                  checked={user.privacySettings.shareApproxLocationOnly}
                  onChange={handleToggleApproxLoc}
                  className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Account Authentication & Session Card */}
          <div className="clay-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Tài khoản & Phiên đăng nhập
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {isAuthenticated ? `Đang đăng nhập: ${user.email || user.name}` : 'Bạn đang sử dụng phiên bản Khách'}
                </span>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  className="clay-btn-white py-2 px-4 text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenSignIn}
                    className="clay-btn-primary flex-1 sm:flex-none py-2 px-4 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                  <button
                    onClick={handleOpenSignUp}
                    className="clay-btn-white flex-1 sm:flex-none py-2 px-3.5 text-slate-700 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AVATAR PICKER MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="clay-card max-w-md w-full p-5 sm:p-6 space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="clay-pill-blue p-1.5 text-[#2563EB]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Thay đổi ảnh đại diện</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Chọn một trong 9 ảnh mẫu của hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="clay-btn-white p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PRESET AVATAR GRID */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Bộ avatar cộng đồng:</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAvatarPreset(preset.url)}
                    className={`relative rounded-xl overflow-hidden transition-all cursor-pointer group hover:scale-105 ${
                      user.avatar === preset.url ? 'ring-3 ring-[#2563EB]' : 'border border-slate-200'
                    }`}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-14 object-cover" />
                    {user.avatar === preset.url && (
                      <div className="absolute top-1 right-1 clay-btn-primary p-0.5 text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Auth Modal Render */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(updatedUser) => {
          onUserUpdate(updatedUser);
        }}
        initialMode={authModalMode}
      />
    </div>
  );
};
