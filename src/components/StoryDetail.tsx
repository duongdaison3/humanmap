import React from 'react';
import { Story } from '../types';
import { Heart, MapPin, X, ArrowRight, BookOpen } from 'lucide-react';

interface StoryDetailProps {
  story: Story;
  onClose: () => void;
  onDiscoverAnother: () => void;
  onLike: (storyId: string) => void;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({
  story,
  onClose,
  onDiscoverAnother,
  onLike,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="clay-card relative w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col p-0 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="clay-btn-primary p-1.5 text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold tracking-wider uppercase text-amber-200">
              Câu chuyện Human Map
            </span>
          </div>
          <button
            onClick={onClose}
            className="clay-btn-dark p-1.5 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Story Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Cover image if available */}
          {story.imageUrl && (
            <div className="h-56 -mx-6 -mt-6 mb-4 overflow-hidden relative shadow-inner">
              <img src={story.imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <span className="absolute bottom-4 left-6 clay-pill-blue text-[#2563EB] font-extrabold text-[11px] px-3.5 py-1 uppercase tracking-wider">
                {story.theme}
              </span>
            </div>
          )}

          {/* Theme badge if no image */}
          {!story.imageUrl && (
            <span className="clay-pill-blue inline-block text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] px-3.5 py-1">
              {story.theme}
            </span>
          )}

          {/* Title */}
          <h1 className="font-serif font-bold text-slate-900 text-xl sm:text-2xl leading-tight">
            {story.title}
          </h1>

          {/* Pull Quote */}
          <blockquote className="clay-card-warm font-serif italic text-sm sm:text-base text-amber-900 p-4 border-l-4 border-amber-500 leading-relaxed">
            "{story.quote}"
          </blockquote>

          {/* Body Text */}
          <div className="text-slate-700 text-sm leading-relaxed space-y-3 font-sans font-medium">
            {story.body.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Location & Author Meta */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full clay-btn-white flex items-center justify-center font-extrabold text-slate-800">
                {story.authorName[0]}
              </div>
              <div>
                <span className="font-bold text-slate-800 block">{story.authorName}</span>
                <span className="text-[11px] text-slate-400">{story.createdAt}</span>
              </div>
            </div>

            <div className="clay-pill flex items-center gap-1.5 px-3 py-1.5 text-slate-800 font-bold text-xs">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{story.locationName}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => onLike(story.id)}
            className="clay-pill-blue px-4 py-2.5 font-bold text-xs flex items-center gap-1.5 cursor-pointer text-[#2563EB]"
          >
            <Heart className="w-4 h-4 fill-[#2563EB] text-[#2563EB]" />
            <span>Yêu thích ({story.likesCount})</span>
          </button>

          <button
            onClick={onDiscoverAnother}
            className="clay-btn-dark flex-1 py-2.5 px-4 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Khám phá câu chuyện khác</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
