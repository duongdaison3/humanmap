import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error in Human Map:', error, errorInfo);
  }

  private handleReload = () => {
    (this as any).setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if ((this as any).state?.hasError) {
      return (
        <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-amber-200/80 p-6 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Đã xảy ra sự cố không mong muốn</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Ứng dụng đã gặp lỗi tạm thời. Dữ liệu hỗ trợ của bạn vẫn an toàn. Vui lòng tải lại trang để tiếp tục trải nghiệm Human Map.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props?.children || null;
  }
}
