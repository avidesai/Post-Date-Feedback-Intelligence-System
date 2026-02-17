import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { DateRecord, Feedback, User } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

interface Props {
  userId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

function ratingBadgeClass(rating: number): string {
  if (rating >= 0.7) return 'date-badge date-badge-good';
  if (rating >= 0.4) return 'date-badge date-badge-ok';
  return 'date-badge date-badge-low';
}

export default function PeopleTab({ userId }: Props) {
  const { data: dates, loading: datesLoading } = useApi(
    () => api.getDatesForUser(userId), [userId]
  );
  const { data: users, loading: usersLoading } = useApi(() => api.getUsers());
  const { data: myFeedback, loading: fbLoading } = useApi(
    () => api.getFeedbackByUser(userId), [userId]
  );
  const { data: feedbackAboutMe } = useApi(
    () => api.getFeedbackAboutUser(userId), [userId]
  );

  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);

  if (datesLoading || usersLoading || fbLoading) {
    return <div className="loading"><div className="spinner" /> Loading your dates...</div>;
  }

  if (!dates || dates.length === 0) {
    return (
      <div>
        <h1 className="heading-serif" style={{ fontSize: 26, marginBottom: 16 }}>
          Your <em>people</em>
        </h1>
        <div className="empty-state">
          <div className="empty-state-icon">&#128100;</div>
          <p>No dates yet. Run a simulation round from Insights to generate some.</p>
        </div>
      </div>
    );
  }

  const userMap = new Map((users || []).map(u => [u.id, u]));
  const myFbMap = new Map((myFeedback || []).map(f => [f.dateId, f]));
  const aboutMeMap = new Map((feedbackAboutMe || []).map(f => [f.dateId, f]));

  // Sort by date descending
  const sorted = [...dates].sort(
    (a, b) => new Date(b.dateAt).getTime() - new Date(a.dateAt).getTime()
  );

  return (
    <div>
      <h1 className="heading-serif" style={{ fontSize: 26, marginBottom: 16 }}>
        Your <em>people</em>
      </h1>

      {sorted.map((date) => {
        const otherId = date.userAId === userId ? date.userBId : date.userAId;
        const other = userMap.get(otherId);
        const otherName = other?.name || (date.userAId === userId ? date.userBName : date.userAName) || 'Unknown';
        const myFb = myFbMap.get(date.id);
        const theirFb = aboutMeMap.get(date.id);
        const isExpanded = expandedDateId === date.id;

        return (
          <div
            key={date.id}
            className={`date-card ${isExpanded ? 'expanded' : ''}`}
            onClick={() => setExpandedDateId(isExpanded ? null : date.id)}
          >
            <div className="date-card-header">
              <div className="date-avatar">{otherName[0]}</div>
              <div className="date-info">
                <div className="date-name">{otherName}</div>
                <div className="date-venue">
                  {date.venueName || 'Date'} · {timeAgo(date.dateAt)}
                </div>
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
                    <div className="feedback-section-label">Your feedback about {otherName}</div>
                    <FeedbackBars feedback={myFb} />
                  </div>
                )}

                {theirFb && (
                  <div className="feedback-section">
                    <div className="feedback-section-label">{otherName}'s feedback about you</div>
                    <FeedbackBars feedback={theirFb} />
                  </div>
                )}

                {!myFb && !theirFb && (
                  <div className="feedback-section">
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                      No feedback exchanged for this date yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeedbackBars({ feedback }: { feedback: Feedback }) {
  const scores: [string, number][] = DIMENSIONS.map((dim, i) => {
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
            <div
              className="dim-fill-a"
              style={{ width: `${score * 100}%`, opacity: 1 }}
            />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
        Overall: <strong>{(feedback.overallRating * 10).toFixed(1)}</strong>
      </div>
    </div>
  );
}
