import React from 'react';
import { Story } from '../types';
import { Heart, MapPin, BookOpen, ArrowRight } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  onSelect: (story: Story) => void;
  onLike?: (storyId: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onLike,
}) => {
  return (
    <article className="clay-card overflow-hidden flex flex-col justify-between group hover:translate-y-[-3px] transition-all duration-300">
      <div>
        {/* Story Image Header if present */}
        {story.imageUrl && (
          <div className="relative h-44 overflow-hidden rounded-t-[1.5rem] bg-stone-100">
            <img
              src={story.imageUrl}
              alt={story.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-3 left-3 clay-pill-blue text-[#2563EB] text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">
              {story.theme}
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {!story.imageUrl && (
            <span className="clay-pill-amber inline-block text-[10px] font-extrabold tracking-wider uppercase text-[#D97706] px-3 py-1 mb-2.5">
              {story.theme}
            </span>
          )}

          <h3 className="font-bold text-slate-800 text-base sm:text-lg leading-snug mb-2 group-hover:text-[#2563EB] transition-colors">
            {story.title}
          </h3>

          {story.quote && story.quote.trim().length > 0 && (
            <blockquote className="font-serif italic text-sm text-slate-800 border-l-4 border-[#f97316] pl-3 mb-3 leading-relaxed">
              "{story.quote}"
            </blockquote>
          )}

          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-2 font-medium">
            {story.body}
          </p>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 flex items-center justify-between border-t border-slate-100 text-sm text-slate-600 gap-2">
        <div className="clay-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{story.locationName.split(',')[0]}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onLike) onLike(story.id);
            }}
            className="clay-btn-white flex items-center gap-1.5 px-3 py-2 text-[#2563EB] font-bold text-sm cursor-pointer min-h-11"
          >
            <Heart className="w-3.5 h-3.5 fill-[#2563EB]" />
            <span>{story.likesCount}</span>
          </button>

          <button
            onClick={() => onSelect(story)}
            className="clay-btn-white flex items-center gap-1.5 px-3.5 py-2 font-bold text-slate-800 group-hover:text-[#2563EB] cursor-pointer min-h-11"
          >
            <span>Đọc tiếp</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </article>
  );
};
