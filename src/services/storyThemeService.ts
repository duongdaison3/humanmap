import { Story } from '../types';

export interface DynamicStoryTheme {
  id: string;
  name: string;
  count: number;
  icon?: string;
  description?: string;
  isTrending?: boolean;
}

export interface AIThemeAnalysisResult {
  themes: DynamicStoryTheme[];
  topInsight: string;
  lastAnalyzedAt: string;
}

class StoryThemeService {
  /**
   * Dynamically extracts and aggregates popular themes from the actual user stories in real-time.
   * Ranks them by popularity (highest story count first).
   */
  public extractDynamicThemes(stories: Story[]): DynamicStoryTheme[] {
    if (!stories || stories.length === 0) {
      return [
        { id: 'all', name: 'Tất cả câu chuyện', count: 0 }
      ];
    }

    const themeCountMap: Record<string, { count: number; sampleStories: Story[] }> = {};

    stories.forEach((story) => {
      // Normalize theme name
      const rawTheme = story.theme?.trim() || 'Lòng tốt quanh ta';
      // Clean up common variations
      const normalizedTheme = rawTheme.charAt(0).toUpperCase() + rawTheme.slice(1);

      if (!themeCountMap[normalizedTheme]) {
        themeCountMap[normalizedTheme] = { count: 0, sampleStories: [] };
      }
      themeCountMap[normalizedTheme].count += 1;
      themeCountMap[normalizedTheme].sampleStories.push(story);
    });

    // Also look for prominent content keywords across stories to uncover emerging micro-topics
    // if stories have fewer than 2 distinct themes
    const existingThemeKeys = Object.keys(themeCountMap);

    // Convert map to sorted array (most stories first)
    const sortedThemes: DynamicStoryTheme[] = Object.entries(themeCountMap)
      .map(([name, data]) => {
        let icon = '📖';
        const lower = name.toLowerCase();
        if (lower.includes('kỷ niệm') || lower.includes('lịch sử') || lower.includes('phố')) {
          icon = '🏛️';
        } else if (lower.includes('lòng tốt') || lower.includes('ấm áp') || lower.includes('tình người')) {
          icon = '❤️';
        } else if (lower.includes('đường') || lower.includes('chỉ') || lower.includes('giao thông')) {
          icon = '🧭';
        } else if (lower.includes('du khách') || lower.includes('tiếng anh') || lower.includes('dịch')) {
          icon = '🌏';
        } else if (lower.includes('bí quyết') || lower.includes('ẩm thực') || lower.includes('mẹo')) {
          icon = '🍜';
        } else if (lower.includes('công nghệ') || lower.includes('điện thoại') || lower.includes('app')) {
          icon = '📱';
        }

        return {
          id: name,
          name,
          count: data.count,
          icon,
          isTrending: data.count >= 2,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Include the "All" tab at the beginning
    const allTab: DynamicStoryTheme = {
      id: 'all',
      name: 'Tất cả câu chuyện',
      count: stories.length,
      icon: '✨',
    };

    return [allTab, ...sortedThemes];
  }

  /**
   * Filter stories by selected dynamic theme
   */
  public filterStoriesByTheme(stories: Story[], selectedThemeId: string): Story[] {
    if (!selectedThemeId || selectedThemeId === 'all') {
      return stories;
    }

    const targetLower = selectedThemeId.toLowerCase().trim();

    return stories.filter((story) => {
      const storyTheme = (story.theme || '').toLowerCase().trim();
      if (storyTheme === targetLower) return true;

      // Soft match if title or body prominently features topic keywords
      const titleLower = (story.title || '').toLowerCase();
      const bodyLower = (story.body || '').toLowerCase();
      const quoteLower = (story.quote || '').toLowerCase();

      return (
        storyTheme.includes(targetLower) ||
        titleLower.includes(targetLower) ||
        bodyLower.includes(targetLower) ||
        quoteLower.includes(targetLower)
      );
    });
  }

  /**
   * Request Gemini AI to analyze all user stories and extract emerging semantic topics and insights.
   */
  public async analyzeThemesWithAI(stories: Story[]): Promise<AIThemeAnalysisResult | null> {
    if (!stories || stories.length === 0) return null;

    try {
      const response = await fetch('/api/gemini/extract-story-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: stories.map((s) => ({
            id: s.id,
            title: s.title,
            quote: s.quote,
            body: s.body.slice(0, 300),
            theme: s.theme,
            locationName: s.locationName,
          })),
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          const aiThemes: DynamicStoryTheme[] = resData.data.themes.map((t: any) => ({
            id: t.name,
            name: t.name,
            count: t.count || 1,
            icon: t.icon || '✨',
            description: t.description,
            isTrending: true,
          }));

          // Add All tab
          const allTab: DynamicStoryTheme = {
            id: 'all',
            name: 'Tất cả câu chuyện',
            count: stories.length,
            icon: '✨',
          };

          return {
            themes: [allTab, ...aiThemes],
            topInsight: resData.data.insight || 'Các câu chuyện gắn kết sâu sắc quanh lòng tốt và ký ức Phố Cổ.',
            lastAnalyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
      }
    } catch (err) {
      console.warn('AI Theme extraction error, using local aggregator:', err);
    }

    return null;
  }
}

export const storyThemeService = new StoryThemeService();
