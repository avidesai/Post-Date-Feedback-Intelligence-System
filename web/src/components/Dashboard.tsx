import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { Feedback } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

interface DateInfo {
  dateId: string;
  otherUserId: string;
  otherName: string;
  otherAge: number;
  otherBio: string;
  venue: string;
  dateAt: string;
}

interface Props {
  userId: string;
  dates: DateInfo[];
  onStartOver: () => void;
}

export default function Dashboard({ userId, dates, onStartOver }: Props) {
  const { data: user, refetch: refetchUser } = useApi(() => api.getUser(userId), [userId]);
  const { data: drift, refetch: refetchDrift } = useApi(
    () => api.getPreferenceDrift(userId), [userId]
  );
  const { data: summary, refetch: refetchSummary } = useApi(
    () => api.getUserSummary(userId), [userId]
  );
  const { data: myFeedback } = useApi(
    () => api.getFeedbackByUser(userId), [userId]
  );
  const { data: feedbackAboutMe } = useApi(
    () => api.getFeedbackAboutUser(userId), [userId]
  );

  const [simulating, setSimulating] = useState(false);
  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await api.runSimulationRound({ rounds: 1 });
      refetchUser();
      refetchDrift();
      refetchSummary();
    } finally {
      setSimulating(false);
    }
  };

  const stats = summary?.stats;
  const stated = user?.statedPreferences;
  const revealed = user?.revealedPreferences;

  const myFbMap = new Map((myFeedback || []).map(f => [f.dateId, f]));
  const aboutMeMap = new Map((feedbackAboutMe || []).map(f => [f.dateId, f]));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-heading">Your <em>results</em></h1>
        <p className="dashboard-sub">
          How your preferences compare to your actual behavior
        </p>
      </div>

      <div className="dashboard-content">
        {/* Stats */}
        {stats && (
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-value">{stats.totalDates}</div>
              <div className="stat-label">Dates</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{stats.feedbackGiven}</div>
              <div className="stat-label">Rated</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {drift?.currentDivergence
                  ? `${(drift.currentDivergence.overall * 100).toFixed(0)}%`
                  : '--'}
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
        {stated && revealed && (
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
              const s = stated[i];
              const r = revealed[i];
              const diff = Math.abs(s - r);
              return (
                <div key={dim} className="dim-row">
                  <div className="dim-name">
                    <span>{DIMENSION_LABELS[dim]}</span>
                    {diff > 0.12 && (
                      <span className="gap-indicator">
                        {r > s ? '↑' : '↓'} {(diff * 10).toFixed(1)} gap
                      </span>
                    )}
                  </div>
                  <div className="dim-track">
                    <div className="dim-fill-a" style={{ width: `${s * 100}%` }} />
                  </div>
                  <div className="dim-track">
                    <div className="dim-fill-b" style={{ width: `${r * 100}%` }} />
                  </div>
                </div>
              );
            })}
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

        {/* Your Dates */}
        <div className="section-label">Your dates</div>
        {dates.map((date) => {
          const myFb = myFbMap.get(date.dateId);
          const theirFb = aboutMeMap.get(date.dateId);
          const isExpanded = expandedDateId === date.dateId;

          return (
            <div
              key={date.dateId}
              className={`date-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => setExpandedDateId(isExpanded ? null : date.dateId)}
            >
              <div className="date-card-header">
                <div className="date-avatar">{date.otherName[0]}</div>
                <div className="date-info">
                  <div className="date-name">{date.otherName}</div>
                  <div className="date-venue">{date.venue}</div>
                </div>
                {myFb && (
                  <div className={ratingBadgeClass(myFb.overallRating)}>
                    {(myFb.overallRating * 10).toFixed(1)}
                  </div>
                )}
              </div>

              {isExpanded && (
                <>
                  {myFb && (
                    <div className="feedback-section">
                      <div className="feedback-section-label">Your rating</div>
                      <FeedbackBars feedback={myFb} />
                    </div>
                  )}
                  {theirFb && (
                    <div className="feedback-section">
                      <div className="feedback-section-label">{date.otherName}'s rating of you</div>
                      <FeedbackBars feedback={theirFb} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Preference Drift */}
        {drift?.history && drift.history.length > 0 && (
          <div className="card">
            <div className="card-title">Preference <em>drift</em></div>
            <p className="card-subtitle">
              How your stated vs revealed gap changes over time
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

        {/* How it works */}
        <div className="card">
          <button
            className="collapsible-trigger"
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          >
            <span className="card-title" style={{ marginBottom: 0 }}>
              How this <em>works</em>
            </span>
            <span className={`arrow ${howItWorksOpen ? 'open' : ''}`}>&#9660;</span>
          </button>
          {howItWorksOpen && (
            <div style={{ marginTop: 16 }}>
              <p className="card-subtitle" style={{ marginBottom: 12 }}>
                This system tracks what you <em>say</em> you want (stated preferences) and compares
                it to what you <em>actually</em> respond to in dates (revealed preferences).
                The gap between these two vectors reveals how self-aware you are about your own
                dating patterns.
              </p>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                The divergence score measures this gap. A high divergence means your actions
                don&apos;t match your words — and that&apos;s where the most interesting
                insights live.
              </p>
            </div>
          )}
        </div>

        {/* Simulate more */}
        <div style={{ paddingTop: 8 }}>
          <button
            className="btn btn-outline btn-full"
            onClick={handleSimulate}
            disabled={simulating}
          >
            {simulating ? 'Simulating...' : 'Simulate more dates'}
          </button>
        </div>

        {/* Start over */}
        <div className="start-over">
          <button onClick={onStartOver}>Start over</button>
        </div>
      </div>
    </div>
  );
}

function ratingBadgeClass(rating: number): string {
  if (rating >= 0.7) return 'date-badge date-badge-good';
  if (rating >= 0.4) return 'date-badge date-badge-ok';
  return 'date-badge date-badge-low';
}

function FeedbackBars({ feedback }: { feedback: Feedback }) {
  const scores: [string, number][] = DIMENSIONS.map((dim) => {
    const key = `${dim}Score` as keyof Feedback;
    return [DIMENSION_LABELS[dim], feedback[key] as number];
  });

  return (
    <div>
      {scores.map(([label, score]) => (
        <div key={label} className="dim-row" style={{ marginBottom: 8 }}>
          <div className="dim-name">
            <span>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {(score * 10).toFixed(1)}
            </span>
          </div>
          <div className="dim-track">
            <div className="dim-fill-a" style={{ width: `${score * 100}%`, opacity: 1 }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
        Overall: <strong>{(feedback.overallRating * 10).toFixed(1)}</strong>
      </div>
    </div>
  );
}
