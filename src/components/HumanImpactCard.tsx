import React, { useState, useEffect } from 'react';
import { ImpactMetrics } from '../types';
import { impactService } from '../services/impactService';
import { 
  Heart, 
  Users, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp,
  Award
} from 'lucide-react';

interface HumanImpactCardProps {
  userId?: string;
  className?: string;
}

export const HumanImpactCard: React.FC<HumanImpactCardProps> = ({ userId, className = '' }) => {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [personal, setPersonal] = useState<{ personalHelpedCount: number; personalCompletedSessions: number; totalMinutes: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadImpact() {
      setLoading(true);
      const agg = await impactService.getAggregateImpactMetrics();
      setMetrics(agg);

      if (userId) {
        const pers = await impactService.getPersonalImpactMetrics(userId);
        setPersonal(pers);
      }
      setLoading(false);
    }
    loadImpact();
  }, [userId]);

  if (loading) {
    return (
      <div className={`p-5 clay-card animate-pulse ${className}`}>
        <div className="h-5 bg-stone-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
          <div className="h-16 bg-stone-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 clay-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="clay-pill-emerald p-2 text-emerald-600">
            <Heart className="w-5 h-5 fill-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Tác động Nhân ái</h3>
            <p className="text-xs text-slate-500 font-medium">Mỗi con số là một hành động hỗ trợ thực tế</p>
          </div>
        </div>

        <span className="clay-pill-emerald text-[11px] font-bold text-emerald-700 px-3 py-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Dữ liệu trực tiếp
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3.5 clay-card-emerald text-center">
          <div className="text-2xl font-black text-emerald-600">
            {metrics?.peopleHelped || 0}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1 mt-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" /> Người được giúp
          </div>
        </div>

        <div className="p-3.5 clay-card-warm text-center">
          <div className="text-2xl font-black text-teal-600">
            {metrics?.completedSessions || 0}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Phiên hoàn thành
          </div>
        </div>

        <div className="p-3.5 clay-card-blue text-center">
          <div className="text-2xl font-black text-[#2563EB]">
            {metrics?.neighborhoodsActivated || 1}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> Khu vực kết nối
          </div>
        </div>

        <div className="p-3.5 clay-card-amber text-center">
          <div className="text-2xl font-black text-amber-600">
            {metrics?.totalHelpMinutes || 0}m
          </div>
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Thời gian chia sẻ
          </div>
        </div>
      </div>

      {/* Personal Impact Section if user logged in */}
      {personal && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            Đóng góp cá nhân của bạn:
          </span>
          <span className="clay-pill-emerald font-extrabold text-emerald-700 px-3 py-1">
            {personal.personalHelpedCount} người đã được giúp
          </span>
        </div>
      )}
    </div>
  );
};
