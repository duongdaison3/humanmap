import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  HeartHandshake, 
  KeyRound,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  promptMessage,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'verify'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleModeChange = (newMode: 'signin' | 'signup' | 'forgot') => {
    resetForm();
    setMode(newMode);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await dataService.signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(dataService.formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await dataService.signInWithEmail(email, password);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(dataService.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ tên của bạn.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await dataService.signUpWithEmail(email, password, displayName);
      setSuccessMsg('Đăng ký thành công! Chúng tôi đã gửi email xác thực đến địa chỉ của bạn.');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(dataService.formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email để đặt lại mật khẩu.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await dataService.sendPasswordReset(email);
      setSuccessMsg('Nếu tài khoản tồn tại cho email này, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err: any) {
      // Per instructions: "Do not reveal whether an email exists" or show general confirmation
      setSuccessMsg('Nếu tài khoản tồn tại cho email này, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md clay-card shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden"
      >
        {/* Header Header Pattern */}
        <div className="bg-linear-to-r from-[#2563EB] via-[#16A34A] to-[#F59E0B] text-white p-6 pt-7 relative overflow-hidden text-center shadow-md">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-xs text-white mb-3 shadow-inner">
            <HeartHandshake className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-serif font-extrabold text-white tracking-tight">
            Chào mừng đến với Human Map
          </h2>
          <p className="text-xs text-white/90 mt-1 max-w-xs mx-auto leading-relaxed font-medium">
            Nơi những hành động giúp đỡ nhỏ làm cho cuộc sống thêm gần gũi.
          </p>

          {promptMessage && (
            <div className="mt-3 py-1.5 px-3 bg-white/20 rounded-full text-[11px] text-white font-bold inline-flex items-center gap-1.5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{promptMessage}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="clay-card-blue p-3 text-blue-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="clay-btn-white w-full py-1.5 px-3 text-blue-800 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer block"
              >
                Chuyển sang Chế độ Demo / Khách
              </button>
            </div>
          )}

          {successMsg && (
            <div className="clay-card-emerald p-3 text-emerald-950 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Social Google Login Button */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="clay-btn-white w-full py-3 px-4 text-slate-800 font-bold text-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-100 w-full" />
                <span className="bg-[#FAF8F5] px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Hoặc bằng Email
                </span>
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="clay-btn-dark w-full py-3 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Đăng nhập</span>
              </button>

              <p className="text-center text-xs text-slate-500 pt-2 font-medium">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên hiển thị
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu (Tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="clay-btn-primary w-full py-3 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Tạo tài khoản Human Map</span>
              </button>

              <p className="text-center text-xs text-slate-500 pt-2 font-medium">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="font-bold text-slate-800 hover:underline cursor-pointer"
                >
                  Đăng nhập
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="clay-card-warm p-3.5 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5 font-medium">
                <KeyRound className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <span>
                  Nhập email đăng ký của bạn. Chúng tôi sẽ gửi đường dẫn hướng dẫn đặt lại mật khẩu an toàn.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="clay-input w-full pl-10 pr-3 py-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="clay-btn-dark w-full py-3 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Gửi hướng dẫn đặt lại mật khẩu</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  ← Quay lại Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* DEMO MODE OPTION */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Tiếp tục trải nghiệm ở Chế độ Khách / Demo</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
