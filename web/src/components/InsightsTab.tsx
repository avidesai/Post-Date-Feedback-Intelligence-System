import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

interface Props {
  userId: string;
  onRefresh: () => void;
}

export default function InsightsTab({ userId, onRefresh }: Props) {
  const { data: drift, loading: driftLoading, refetch: refetchDrift } = useApi(
    () => api.getPreferenceDrift(userId), [userId]
  );
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useApi(
    () => api.getUserSummary(userId), [userId]
  );

  const [simulating, setSimulating] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  if (driftLoading || summaryLoading) {
    return <div className="loading"><div className="spinner" /> Loading insights...</div>;
  }

  const user = summary?.user;
  const stats = summary?.stats;
  const hasFeedback = (user?.feedbackCount || 0) > 0;

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await api.runSimulationRound({ rounds: 1 });
      refetchDrift();
      refetchSummary();
      onRefresh();
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div>
      <h1 className="heading-serif" style={{ fontSize: 26, marginBottom: 16 }}>
        Your <em>insights</em>
      </h1>

      {/* Stats Row */}
      {stats && (
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{stats.totalDates}</div>
            <div className="stat-label">Dates</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.feedbackGiven}</div>
            <div className="stat-label">Given</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {drift?.currentDivergence ? `${(drift.currentDivergence.overall * 100).toFixed(0)}%` : '--'}
            </div>
            <div className="stat-label">Divergence</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {stats.avgSatisfaction != null
                ? `${(stats.avgSatisfaction * 10).toFixed(1)}`
                : '--'}
            </div>
            <div className="stat-label">Avg Rating</div>
          </div>
        </div>
      )}

      {/* Stated vs Revealed */}
      {hasFeedback && drift?.currentDivergence && user && (
        <div className="card">
          <div className="card-title">Stated vs <em>revealed</em></div>
          <div className="legend" style={{ marginBottom: 16, marginTop: -8 }}>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--accent)', opacity: 0.7 }} />
              What you said
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--warning)', opacity: 0.7 }} />
              What dates reveal
            </div>
          </div>
          {DIMENSIONS.map((dim, i) => {
            const stated = user.statedPreferences[i];
            const revealed = user.revealedPreferences[i];
            const diff = Math.abs(stated - revealed);
            const hasDivergence = diff > 0.15;
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name">
                  <span>{DIMENSION_LABELS[dim]}</span>
                  {hasDivergence && (
                    <span className="gap-indicator">
                      {revealed > stated ? '↑' : '↓'} {(diff * 10).toFixed(1)} gap
                    </span>
                  )}
                </div>
                <div className="dim-track">
                  <div className="dim-fill-a" style={{ width: `${stated * 100}%` }} />
                </div>
                <div className="dim-track">
                  <div className="dim-fill-b" style={{ width: `${revealed * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Divergence Over Time */}
      {drift?.history && drift.history.length > 0 && (
        <div className="card">
          <div className="card-title">Your preference <em>drift</em></div>
          <p className="card-subtitle">
            How much your stated vs revealed preferences differ after each feedback
          </p>
          <div className="bar-chart" style={{ height: 100 }}>
            {drift.history.slice(-15).map((h, i) => {
              const maxDiv = Math.max(...drift.history.map(x => x.divergenceScore), 0.5);
              const height = Math.max((h.divergenceScore / maxDiv) * 80, 4);
              const isHigh = h.divergenceScore > 0.2;
              return (
                <div key={i} className="bar-col">
                  <div
                    className="bar-fill"
                    style={{
                      height,
                      background: isHigh ? 'var(--warning)' : 'var(--accent)',
                    }}
                  />
                  <div className="bar-label">#{h.feedbackCount}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {drift?.currentDivergence?.insights && drift.currentDivergence.insights.length > 0 && (
        <div className="card">
          <div className="card-title">Key <em>insights</em></div>
          {drift.currentDivergence.insights.map((insight, i) => (
            <div
              key={i}
              className={`insight-card ${i === 0 ? 'insight-warning' : 'insight-info'}`}
            >
              {insight}
            </div>
          ))}
        </div>
      )}

      {/* Summary Insights */}
      {summary?.insights && summary.insights.length > 0 && (
        <div className="card">
          <div className="card-title">Summary</div>
          {summary.insights.map((insight, i) => (
            <div key={i} className="insight-card insight-success">{insight}</div>
          ))}
        </div>
      )}

      {/* How Known Learns */}
      <div className="card">
        <button
          className="collapsible-trigger"
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
        >
          <span className="card-title" style={{ marginBottom: 0 }}>
            How <em>Known</em> learns
          </span>
          <span className={`arrow ${howItWorksOpen ? 'open' : ''}`}>&#9660;</span>
        </button>
        {howItWorksOpen && (
          <div style={{ marginTop: 16 }}>
            <p className="card-subtitle" style={{ marginBottom: 12 }}>
              Known tracks what you <em>say</em> you want (stated preferences) and compares it to
              what you <em>actually</em> respond to in dates (revealed preferences). Over time,
              the gap between these two vectors tells us how self-aware you are about your own
              dating patterns.
            </p>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              The divergence score measures this gap. A high divergence means
              your actions don&apos;t match your words - and that&apos;s where the most interesting
              insights come from.
            </p>
          </div>
        )}
      </div>

      {/* Simulate More Dates */}
      <div className="sim-btn-wrapper">
        <button
          className="btn btn-outline btn-full"
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating ? 'Simulating...' : 'Simulate more dates'}
        </button>
      </div>
    </div>
  );
}
