import { useState, useEffect } from 'react';
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

interface EditorialInsight {
  dimension: Dimension;
  heading: string;
  quote: string;
  imageUrl: string;
  stated: number;
  revealed: number;
  gap: number;
}

const DIMENSION_IMAGES: Record<Dimension, string> = {
  conversation: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=260&fit=crop&auto=format',
  emotional: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=260&fit=crop&auto=format',
  interests: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=400&h=260&fit=crop&auto=format',
  chemistry: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&h=260&fit=crop&auto=format',
  values: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=260&fit=crop&auto=format',
};

const FALLBACK_INSIGHTS: Record<Dimension, {
  heading: string;
  overvalued: string;
  undervalued: string;
}> = {
  conversation: {
    heading: 'The conversation',
    overvalued: 'You think you need someone you can talk to for hours, but your happiest dates weren\'t always the chattiest ones. Sometimes the best connections happen in comfortable silence, not constant conversation.',
    undervalued: 'You didn\'t think conversation mattered that much, but it keeps showing up in what makes your dates work. When the words flow easily, everything else seems to fall into place.',
  },
  emotional: {
    heading: 'Emotional depth',
    overvalued: 'You want deep emotional connection right away, but your best dates didn\'t always start there. Real intimacy might build more slowly than you expect, and that\'s OK.',
    undervalued: 'You didn\'t rank emotional depth very high, but it\'s quietly shaping your experience. The dates where you felt genuinely seen and understood left a bigger impression than you\'d think.',
  },
  interests: {
    heading: 'Shared interests',
    overvalued: 'Having things in common sounds perfect on paper, but your dates tell a different story. You connect with people over who they are, not just what they do on weekends.',
    undervalued: 'You said shared interests don\'t matter much, but they keep showing up in your best dates. Having something in common gives you more to build on than you realized.',
  },
  chemistry: {
    heading: 'The spark',
    overvalued: 'You say the spark is everything, but your actual satisfaction doesn\'t hinge on it as much. Chemistry catches your attention, but it\'s not what keeps it.',
    undervalued: 'You downplay physical attraction, but it\'s shaping your experience more than you\'d admit. When the chemistry is there, it colors everything else.',
  },
  values: {
    heading: 'Core values',
    overvalued: 'You want someone perfectly aligned on the big life questions, but when the connection is strong, you\'re more flexible than you think. Alignment matters, but it\'s not the only thing.',
    undervalued: 'Values didn\'t top your list, but they\'re quietly driving which dates feel right and which feel off. You care about the big picture more than you let on.',
  },
};

function buildEditorialInsights(
  stated: PreferenceVector,
  revealed: PreferenceVector,
  aiInsights: { dimension: string; heading: string; quote: string }[] | null
): EditorialInsight[] {
  const gapDims = DIMENSIONS
    .map((dim, i) => ({ dim, i, gap: stated[i] - revealed[i], absGap: Math.abs(stated[i] - revealed[i]) }))
    .filter(d => d.absGap > 0.12)
    .sort((a, b) => b.absGap - a.absGap);

  const aiMap = new Map(
    (aiInsights || []).map(ai => [ai.dimension, ai])
  );

  return gapDims.map(({ dim, i, gap, absGap }) => {
    const ai = aiMap.get(dim);
    const fallback = FALLBACK_INSIGHTS[dim];
    return {
      dimension: dim,
      heading: ai?.heading || fallback.heading,
      quote: ai?.quote || (gap > 0 ? fallback.overvalued : fallback.undervalued),
      imageUrl: DIMENSION_IMAGES[dim],
      stated: stated[i],
      revealed: revealed[i],
      gap: absGap,
    };
  });
}

export default function Dashboard({ userId, dates, onStartOver }: Props) {
  const { data: user } = useApi(() => api.getUser(userId), [userId]);
  const { data: myFeedback } = useApi(
    () => api.getFeedbackByUser(userId), [userId]
  );
  const { data: feedbackAboutMe } = useApi(
    () => api.getFeedbackAboutUser(userId), [userId]
  );

  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{ dimension: string; heading: string; quote: string }[] | null>(null);

  // Fetch AI editorial insights once user data is available
  useEffect(() => {
    if (!userId) return;
    api.getEditorialInsights(userId)
      .then(res => setAiInsights(res.insights))
      .catch(() => setAiInsights(null));
  }, [userId]);

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

  let sayDoGap: number | null = null;
  if (stated && revealed) {
    let totalGap = 0;
    DIMENSIONS.forEach((_, i) => {
      totalGap += Math.abs(stated[i] - revealed[i]);
    });
    sayDoGap = (totalGap / DIMENSIONS.length) * 10;
  }

  const editorialInsights = stated && revealed
    ? buildEditorialInsights(stated, revealed, aiInsights)
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

        {editorialInsights.length > 0 && (
          <>
            <div className="section-label">What we found</div>
            {editorialInsights.map((insight) => {
              const isExpanded = expandedInsight === insight.dimension;
              // Split heading: italicize the last word
              const words = insight.heading.split(' ');
              const lastWord = words.pop() || '';
              const beforeWords = words.join(' ');

              return (
                <div key={insight.dimension} className="editorial-card">
                  <h3 className="editorial-heading">
                    {beforeWords}{beforeWords ? ' ' : ''}<em>{lastWord}</em>
                  </h3>
                  <p className="editorial-quote">
                    &ldquo;{insight.quote}&rdquo;
                  </p>
                  <div className="editorial-image">
                    <img
                      src={insight.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <button
                    className="editorial-detail-toggle"
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.dimension)}
                  >
                    {isExpanded ? 'Hide details' : 'See the numbers'}
                    <span className={`toggle-arrow ${isExpanded ? 'open' : ''}`}>&#9662;</span>
                  </button>
                  {isExpanded && (
                    <div className="editorial-detail">
                      <div className="editorial-detail-row">
                        <span className="editorial-detail-label">What you said</span>
                        <div className="editorial-detail-bar-track">
                          <div
                            className="editorial-detail-bar stated"
                            style={{ width: `${insight.stated * 100}%` }}
                          />
                        </div>
                        <span className="editorial-detail-value">{(insight.stated * 10).toFixed(1)}</span>
                      </div>
                      <div className="editorial-detail-row">
                        <span className="editorial-detail-label">What dates show</span>
                        <div className="editorial-detail-bar-track">
                          <div
                            className="editorial-detail-bar revealed"
                            style={{ width: `${insight.revealed * 100}%` }}
                          />
                        </div>
                        <span className="editorial-detail-value">{(insight.revealed * 10).toFixed(1)}</span>
                      </div>
                      <div className="editorial-detail-gap">
                        {insight.stated > insight.revealed ? '↓' : '↑'} {(insight.gap * 10).toFixed(1)} point gap
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
