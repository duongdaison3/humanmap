import React from 'react';
import { Home, MapPin, BookOpen, User, PlusCircle } from 'lucide-react';

export type TabType = 'home' | 'map' | 'stories' | 'profile';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRequestHelpClick: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onRequestHelpClick,
}) => {
  const navItems = [
    { id: 'home' as TabType, label: 'Trang chủ', icon: Home },
    { id: 'map' as TabType, label: 'Bản đồ', icon: MapPin },
    { id: 'stories' as TabType, label: 'Câu chuyện', icon: BookOpen },
    { id: 'profile' as TabType, label: 'Hồ sơ', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-3 sm:px-4 pb-3 pointer-events-auto">
        <div className="clay-navbar rounded-2xl px-2 sm:px-3 h-[4.25rem] flex items-center justify-between relative">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Insert the quick "Need Help" CTA in center
            if (idx === 2) {
              return (
                <React.Fragment key="quick_need">
                  <button
                    onClick={onRequestHelpClick}
                    className="clay-btn-primary flex flex-col items-center justify-center -mt-6 p-3.5 shadow-[0_12px_24px_rgba(37,99,235,0.45)] transition-transform active:scale-90 cursor-pointer group"
                    title="Cần hỗ trợ nhỏ"
                    aria-label="Cần hỗ trợ nhỏ"
                  >
                    <PlusCircle className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300 drop-shadow-sm" />
                    <span className="sr-only">Cần giúp</span>
                  </button>

                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer ${
                      isActive ? 'text-[#2563EB] font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <div className={`p-1 rounded-xl transition-all ${isActive ? 'clay-pill-blue scale-105' : ''}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : ''}`} />
                    </div>
                    <span className="text-[11px] mt-0.5 font-semibold">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer ${
                  isActive ? 'text-[#2563EB] font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'clay-pill-blue scale-105' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : ''}`} />
                </div>
                <span className="text-[11px] mt-0.5 font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
