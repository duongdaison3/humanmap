import React, { useEffect, useState } from 'react';
import { NeedRequest, HelperCandidate } from '../types';
import { matchingService, MatchingResult } from '../services/matchingService';
import {
  Users,
  Sparkles,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  X,
  ArrowRight,
  HeartHandshake,
  Loader2
} from 'lucide-react';

interface HumanMatchingModalProps {
  isOpen: boolean;
  need: NeedRequest | null;
  onClose: () => void;
  onSelectCandidate: (candidate: HelperCandidate, need: NeedRequest) => void;
}

export const HumanMatchingModal: React.FC<HumanMatchingModalProps> = ({
  isOpen,
  need,
  onClose,
  onSelectCandidate,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<MatchingResult | null>(null);

  useEffect(() => {
    if (isOpen && need) {
      setLoading(true);
      matchingService
        .findCandidates({
          title: need.title,
          category: need.category,
          lat: need.lat,
          lng: need.lng,
          requesterName: need.requesterName,
          riskLevel: need.safetyLevel === 'low_risk' ? 'LOW' : 'LOW',
        })
        .then((res) => {
          setResult(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Matching failed:', err);
          setLoading(false);
        });
    }
  }, [isOpen, need]);

  if (!isOpen || !need) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="clay-card relative w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col p-0 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="clay-btn-primary p-2 text-white">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide text-amber-200">Matching Engine</h3>
              <p className="text-[11px] text-slate-300">Human Proximity & Safety Algorithm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="clay-btn-dark p-1.5 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main UX Heading Callout */}
          <div className="clay-card-blue p-4 space-y-1">
            <h2 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
              <span>Someone nearby may be able to help.</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Yêu cầu: <span className="font-bold text-[#2563EB]">"{need.title}"</span>
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Finding suitable people nearby...</p>
            </div>
          )}

          {/* Safety Restriction Message */}
          {!loading && result && !result.isSafe && (
            <div className="clay-card-blue p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-blue-950">
                    Matching Restricted for Safety
                  </h4>
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    {result.safetyReasoning || 'Human Map only matches low-risk, safe public micro-help requests. High risk or restricted activities cannot be processed.'}
                  </p>
                  <p className="text-xs font-semibold text-blue-900 pt-2 border-t border-blue-200/50">
                    Nếu đây là tình huống khẩn cấp hoặc y tế, vui lòng gọi ngay hotline 115 hoặc cơ quan chức năng.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Safe Candidates List */}
          {!loading && result && result.isSafe && (
            <div className="space-y-5">
              {/* BEST MATCH SECTION */}
              {result.topCandidate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      Best match
                    </span>
                    <span className="clay-pill-blue text-[#2563EB] text-[11px] font-extrabold px-3 py-0.5">
                      {result.topCandidate.matchScore}% suggested match
                    </span>
                  </div>

                  {/* Top Candidate Card */}
                  <div className="clay-card p-4 space-y-3.5 ring-2 ring-[#2563EB]/40 shadow-md">
                    <div className="flex items-start gap-3.5">
                      <div className="clay-pill p-0.5 shrink-0">
                        <img
                          src={result.topCandidate.avatar}
                          alt={result.topCandidate.name}
                          className="w-14 h-14 rounded-full object-cover shadow-inner"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-base text-slate-800 truncate">
                            {result.topCandidate.name}
                          </h4>
                          <span className="clay-pill-emerald inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 px-2.5 py-0.5 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Available now
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">{result.topCandidate.role}</p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 font-semibold mt-1.5">
                          <span className="flex items-center gap-1 text-[#2563EB]">
                            <MapPin className="w-3.5 h-3.5" />
                            {result.topCandidate.distanceMeters}m away
                          </span>
                          <span>•</span>
                          <span className="clay-pill text-slate-800 px-2 py-0.5 text-[10px] font-bold">
                            {result.topCandidate.primarySkillLabel}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 font-medium">
                            {result.topCandidate.completedHelps} successful helps
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Match Explanation Box */}
                    {result.topCandidate.aiExplanation && (
                      <div className="clay-card-warm p-3 text-xs text-slate-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-700">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Explanation</span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium text-slate-700">
                          "{result.topCandidate.aiExplanation}"
                        </p>
                      </div>
                    )}

                    {/* Action button */}
                    <button
                      onClick={() => onSelectCandidate(result.topCandidate!, need)}
                      className="clay-btn-primary w-full py-3 px-4 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>I can help</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* OTHER NEARBY HELPERS SECTION */}
              {result.otherCandidates.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Other nearby helpers
                  </h4>

                  <div className="space-y-2.5">
                    {result.otherCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="clay-card p-3.5 transition-all hover:translate-y-[-2px] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={candidate.avatar}
                              alt={candidate.name}
                              className="w-10 h-10 rounded-full object-cover clay-pill shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-sm text-slate-800 truncate">
                                {candidate.name}
                              </h5>
                              <p className="text-[11px] text-slate-500 truncate font-medium">
                                {candidate.distanceMeters}m away • {candidate.primarySkillLabel} • {candidate.completedHelps} helps
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="clay-pill-blue text-[11px] font-extrabold text-[#2563EB] px-2.5 py-1">
                              {candidate.matchScore}% suggested match
                            </span>
                            <button
                              onClick={() => onSelectCandidate(candidate, need)}
                              className="clay-btn-dark py-1.5 px-3.5 text-white font-bold text-xs cursor-pointer"
                            >
                              I can help
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Human Map matching strictly respects safety & privacy.
          </span>
          <button
            onClick={onClose}
            className="clay-btn-white px-4 py-2 text-slate-700 font-bold text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
