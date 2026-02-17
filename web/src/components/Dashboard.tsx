import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { Feedback, Dimension, PreferenceVector } from '../types';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_TIPS } from '../types';

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
  const { data: user } = useApi(() => api.getUser(userId), [userId]);
  const { data: drift } = useApi(
    () => api.getPreferenceDrift(userId), [userId]
  );
  const { data: myFeedback } = useApi(
    () => api.getFeedbackByUser(userId), [userId]
  );
  const { data: feedbackAboutMe } = useApi(
    () => api.getFeedbackAboutUser(userId), [userId]
  );

  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);

  const stated = user?.statedPreferences;
  const revealed = user?.revealedPreferences;

  const myFbMap = new Map((myFeedback || []).map(f => [f.dateId, f]));
  const aboutMeMap = new Map((feedbackAboutMe || []).map(f => [f.dateId, f]));

  // Compute session-specific stats (only from the dates the user actually rated)
  const sessionDateIds = new Set(dates.map(d => d.dateId));
  const sessionFeedback = (myFeedback || []).filter(f => sessionDateIds.has(f.dateId));
  const avgRating = sessionFeedback.length > 0
    ? sessionFeedback.reduce((sum, f) => sum + f.overallRating, 0) / sessionFeedback.length
    : null;

  // Compute say-do gap: average absolute difference across dimensions, on 0-10 scale
  let sayDoGap: number | null = null;
  let biggestGapDim = '';
  let biggestGapValue = 0;
  if (stated && revealed) {
    let totalGap = 0;
    DIMENSIONS.forEach((dim, i) => {
      const gap = Math.abs(stated[i] - revealed[i]);
      totalGap += gap;
      if (gap > biggestGapValue) {
        biggestGapValue = gap;
        biggestGapDim = DIMENSION_LABELS[dim].toLowerCase();
      }
    });
    sayDoGap = (totalGap / DIMENSIONS.length) * 10;
  }

  const dimensionInsights = stated && revealed
    ? generateDimensionInsights(stated, revealed)
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-heading">Your <em>results</em></h1>
        <p className="dashboard-sub">
          How your preferences compare to your actual behavior
        </p>
      </div>

      <div className="dashboard-content">
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{dates.length}</div>
            <div className="stat-label">Dates Rated</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {avgRating != null ? (avgRating * 10).toFixed(1) : '--'}
            </div>
            <div className="stat-label">Avg Rating</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {sayDoGap != null ? sayDoGap.toFixed(1) : '--'}
            </div>
            <div className="stat-label">Say-Do Gap</div>
          </div>
        </div>

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
                    <span className="tooltip-wrap">
                      {DIMENSION_LABELS[dim]}
                      <span className="tooltip-icon" tabIndex={0}>?</span>
                      <span className="tooltip-text">{DIMENSION_TIPS[dim]}</span>
                    </span>
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

        {dimensionInsights.length > 0 && (
          <>
            <div className="section-label">What we found</div>
            {dimensionInsights.map((insight, i) => (
              <div key={i} className="insight-card">
                {insight}
              </div>
            ))}
          </>
        )}

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

        <div className="card">
          <div className="card-title">How this <em>works</em></div>
          <div className="hiw-section">
            <div className="hiw-label">Preference vectors</div>
            <p>
              Your preferences are represented as a 5-dimensional vector: conversation quality,
              emotional connection, shared interests, chemistry, and values alignment. Each
              dimension is scored from 0 to 1. When you describe what matters to you (via
              conversation or sliders), an LLM extracts your <strong>stated</strong> preference
              vector from your words.
            </p>
          </div>
          <div className="hiw-section">
            <div className="hiw-label">Natural language understanding</div>
            <p>
              When you talk about your dates conversationally, your words are analyzed by
              GPT-4o-mini to extract structured scores across all 5 dimensions. The model reads
              between the lines: "it was fine" registers as ~0.4, while "we talked for 4 hours
              and I didn't notice" signals high conversation quality. It also pulls direct
              quotes from your words as evidence for each dimension score.
            </p>
          </div>
          <div className="hiw-section">
            <div className="hiw-label">Signal extraction</div>
            <p>
              Once dimension scores are extracted, the system computes what actually drives
              your satisfaction. Each dimension is weighted against your overall rating:
            </p>
            <div className="hiw-formula">
              importance = score × (1 - |score - overallRating|)
            </div>
            <p>
              If you gave someone a high overall score and also scored them high on chemistry,
              that tells the system chemistry genuinely matters to you. Dimensions that diverge
              from your overall rating are discounted.
            </p>
          </div>
          <div className="hiw-section">
            <div className="hiw-label">Adaptive learning (EMA)</div>
            <p>
              Extracted signals update your <strong>revealed</strong> preferences using an
              Exponential Moving Average:
            </p>
            <div className="hiw-formula">
              revealed = old × (1 - α) + signal × α
            </div>
            <p>The learning rate α adapts over time:</p>
            <div className="hiw-formula">
              α = 0.05 + 0.25 × e<sup>-0.15 × feedbackCount</sup>
            </div>
            <p>
              Your first few dates have outsized influence (α ≈ 0.30), while later dates
              fine-tune rather than overwrite your profile (α → 0.05).
            </p>
          </div>
          <div className="hiw-section">
            <div className="hiw-label">Say-Do Gap (divergence)</div>
            <p>
              The gap between stated and revealed vectors is measured using cosine distance:
              1 - cos(θ), where θ is the angle between the two vectors. A small gap means you
              know yourself well. A large gap means your dating behavior tells a different story
              than your words. Per-dimension gaps above 0.2 trigger specific insights about where
              your self-perception diverges from your actions.
            </p>
          </div>
        </div>

        <div style={{ paddingTop: 16 }}>
          <button
            className="btn btn-outline btn-full"
            onClick={onStartOver}
          >
            Start over
          </button>
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
  const snippets = feedback.dimensionSnippets;

  return (
    <div>
      {DIMENSIONS.map((dim) => {
        const key = `${dim}Score` as keyof Feedback;
        const score = feedback[key] as number;
        const snippet = snippets?.[dim as Dimension];

        return (
          <div key={dim} className="dim-row" style={{ marginBottom: snippet ? 12 : 8 }}>
            <div className="dim-name">
              <span>{DIMENSION_LABELS[dim]}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {(score * 10).toFixed(1)}
              </span>
            </div>
            <div className="dim-track">
              <div className="dim-fill-a" style={{ width: `${score * 100}%`, opacity: 1 }} />
            </div>
            {snippet && (
              <div className="dim-snippet">"{snippet}"</div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
        Overall: <strong>{(feedback.overallRating * 10).toFixed(1)}</strong>
      </div>
      {feedback.bestPart && (
        <div className="feedback-highlight">
          <span className="feedback-highlight-label">Best part</span>
          {feedback.bestPart}
        </div>
      )}
      {feedback.worstPart && (
        <div className="feedback-highlight feedback-highlight-low">
          <span className="feedback-highlight-label">Weakest part</span>
          {feedback.worstPart}
        </div>
      )}
    </div>
  );
}
