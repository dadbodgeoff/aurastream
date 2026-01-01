'use client';

/**
 * Brief Alerts Section
 * 
 * Time-sensitive alerts and opportunities.
 */

import { AlertTriangle, TrendingUp, Calendar, Bell } from 'lucide-react';
import type { HotGame } from '@aurastream/api-client';

interface BriefAlertsProps {
  twitchGames?: HotGame[];
  tier: string;
}

interface Alert {
  severity: 'high' | 'medium' | 'low';
  title: string;
  action: string;
  icon: React.ReactNode;
}

function generateAlerts(games?: HotGame[], tier?: string): Alert[] {
  const alerts: Alert[] = [];

  // Check for games with significant viewer changes
  if (games && games.length > 0) {
    // Find games with high viewer counts (potential opportunities)
    const topGame = games[0];
    if (topGame && topGame.twitchViewers && topGame.twitchViewers > 100000) {
      alerts.push({
        severity: 'medium',
        title: `${topGame.name} viewership at ${(topGame.twitchViewers / 1000).toFixed(0)}K`,
        action: 'Consider streaming this category today',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }

    // Check for rising games (games with high avg viewers per stream)
    const risingGame = games.find(g => 
      g.avgViewersPerStream && g.avgViewersPerStream > 1000 && g.twitchStreams && g.twitchStreams < 100
    );
    if (risingGame) {
      alerts.push({
        severity: 'high',
        title: `${risingGame.name} has low competition`,
        action: `Only ${risingGame.twitchStreams} streams with ${risingGame.avgViewersPerStream?.toLocaleString()} avg viewers`,
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }
  }

  // Add tier-specific alerts
  if (tier === 'free') {
    alerts.push({
      severity: 'low',
      title: 'Upgrade for velocity alerts',
      action: 'Get real-time notifications when games spike',
      icon: <Bell className="w-4 h-4" />
    });
  }

  // Default alert if none generated
  if (alerts.length === 0) {
    alerts.push({
      severity: 'low',
      title: 'No urgent alerts right now',
      action: 'Check back later for time-sensitive opportunities',
      icon: <Calendar className="w-4 h-4" />
    });
  }

  return alerts.slice(0, 3);
}

function AlertCard({ alert }: { alert: Alert }) {
  const severityStyles = {
    high: {
      bg: 'bg-status-error/10',
      border: 'border-status-error/30',
      icon: 'text-status-error',
      badge: 'bg-status-error/20 text-status-error',
    },
    medium: {
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/30',
      icon: 'text-status-warning',
      badge: 'bg-status-warning/20 text-status-warning',
    },
    low: {
      bg: 'bg-white/5',
      border: 'border-border-primary',
      icon: 'text-text-tertiary',
      badge: 'bg-white/10 text-text-tertiary',
    },
  };

  const styles = severityStyles[alert.severity];

  return (
    <div className={`flex items-start gap-3 p-4 ${styles.bg} border ${styles.border} rounded-xl`}>
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {alert.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles.badge}`}>
            {alert.severity.toUpperCase()}
          </span>
          <p className="text-sm font-medium text-text-primary truncate">
            {alert.title}
          </p>
        </div>
        <p className="text-xs text-text-secondary">
          Action: {alert.action}
        </p>
      </div>
    </div>
  );
}

export function BriefAlerts({ twitchGames, tier }: BriefAlertsProps) {
  const alerts = generateAlerts(twitchGames, tier);

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-interactive-500" />
        <h2 className="text-lg font-semibold text-text-primary">Alerts</h2>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <AlertCard key={i} alert={alert} />
        ))}
      </div>
    </section>
  );
}
