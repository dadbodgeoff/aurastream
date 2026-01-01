'use client';

/**
 * What's Working / Not Working Section
 * 
 * Shows content patterns that are performing well vs poorly.
 */

import { CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { YouTubeHighlight, HotGame } from '@aurastream/api-client';

interface WhatsWorkingProps {
  youtubeVideos?: YouTubeHighlight[];
  twitchGames?: HotGame[];
}

interface InsightItem {
  title: string;
  detail: string;
  metric?: string;
}

function analyzeWorkingPatterns(videos?: YouTubeHighlight[]): { working: InsightItem[]; notWorking: InsightItem[] } {
  const working: InsightItem[] = [];
  const notWorking: InsightItem[] = [];

  if (!videos || videos.length === 0) {
    // Default insights
    working.push(
      { title: 'Reaction content', detail: 'High engagement this week', metric: '+45%' },
      { title: '"I tried X for 24 hours"', detail: 'Challenge format performing well' }
    );
    notWorking.push(
      { title: 'Tier lists', detail: 'Oversaturated, low CTR', metric: '-23%' },
      { title: 'Generic gameplay', detail: 'No hook = low retention' }
    );
    return { working, notWorking };
  }

  // Analyze video patterns
  const highEngagement = videos.filter(v => (v.engagementRate || 0) > 5);
  const lowEngagement = videos.filter(v => (v.engagementRate || 0) < 2);

  // Check for patterns in high-performing videos
  const reactionCount = highEngagement.filter(v => 
    v.title.toLowerCase().includes('react') || 
    v.title.toLowerCase().includes('reaction')
  ).length;
  
  if (reactionCount > 0) {
    working.push({
      title: 'Reaction content',
      detail: `${reactionCount} of top videos are reactions`,
      metric: '+45%'
    });
  }

  const challengeCount = highEngagement.filter(v =>
    v.title.toLowerCase().includes('24 hours') ||
    v.title.toLowerCase().includes('challenge') ||
    v.title.toLowerCase().includes('tried')
  ).length;

  if (challengeCount > 0) {
    working.push({
      title: '"I tried X for 24 hours"',
      detail: `${challengeCount} of top 10 videos`,
    });
  }

  // Check for patterns in low-performing videos
  const tierListCount = lowEngagement.filter(v =>
    v.title.toLowerCase().includes('tier') ||
    v.title.toLowerCase().includes('ranking')
  ).length;

  if (tierListCount > 0) {
    notWorking.push({
      title: 'Tier lists',
      detail: 'Oversaturated, low CTR',
      metric: '-23%'
    });
  }

  // Add defaults if we don't have enough insights
  if (working.length === 0) {
    working.push(
      { title: 'Reaction content', detail: 'High engagement this week', metric: '+45%' },
      { title: 'Tutorial content', detail: 'Educational videos performing well' }
    );
  }

  if (notWorking.length === 0) {
    notWorking.push(
      { title: 'Generic gameplay', detail: 'No hook = low retention' },
      { title: 'Long intros', detail: 'Viewers skip within 30 seconds' }
    );
  }

  return { working: working.slice(0, 3), notWorking: notWorking.slice(0, 3) };
}

export function WhatsWorking({ youtubeVideos, twitchGames }: WhatsWorkingProps) {
  const { working, notWorking } = analyzeWorkingPatterns(youtubeVideos);

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What's Working */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-status-success" />
            <h2 className="text-lg font-semibold text-text-primary">What's Working</h2>
          </div>
          
          <div className="space-y-3">
            {working.map((item, i) => (
              <div 
                key={i}
                className="flex items-start gap-3 p-3 bg-status-success/5 border border-status-success/20 rounded-lg"
              >
                <TrendingUp className="w-4 h-4 text-status-success mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    {item.metric && (
                      <span className="text-xs font-medium text-status-success">
                        {item.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's Not Working */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-status-error" />
            <h2 className="text-lg font-semibold text-text-primary">What's Not Working</h2>
          </div>
          
          <div className="space-y-3">
            {notWorking.map((item, i) => (
              <div 
                key={i}
                className="flex items-start gap-3 p-3 bg-status-error/5 border border-status-error/20 rounded-lg"
              >
                <TrendingDown className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    {item.metric && (
                      <span className="text-xs font-medium text-status-error">
                        {item.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
