import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogIn, Loader2 } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { dataService } from '../../services/dataService';
import { AdminIdentity } from '../../types';

interface AdminAuthGuardProps {
  children: (identity: AdminIdentity) => React.ReactNode;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isActive = true;
    const unsubscribe = dataService.subscribeToAuth(async (user) => {
      if (!isActive) return;
      if (!user) {
        setIdentity(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const nextIdentity = await adminService.getIdentity();
        if (isActive) setIdentity(nextIdentity);
      } catch (error) {
        console.warn('Không thể kiểm tra quyền admin:', error);
        if (isActive) setIdentity(null);
      } finally {
        if (isActive) setIsChecking(false);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  if (isChecking) {
    return <div className="admin-gate"><Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" /><span>Đang kiểm tra quyền truy cập...</span></div>;
  }

  if (!identity) {
    return (
      <main className="admin-gate px-5">
        <div className="admin-panel max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-[#D97706]" />
          <h1 className="admin-title text-2xl">Khu vực quản trị</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Bạn cần đăng nhập bằng tài khoản có quyền admin hoặc moderator. Quyền này được cấp bằng Firebase Custom Claims.</p>
          <a href="/" className="admin-button admin-button-primary mt-6 inline-flex"><LogIn className="h-4 w-4" /> Về trang đăng nhập</a>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">Admin backend chưa được cấu hình sẽ không được phép truy cập dữ liệu quản trị.</p>
        </div>
      </main>
    );
  }

  return <>{children(identity)}</>;
};
