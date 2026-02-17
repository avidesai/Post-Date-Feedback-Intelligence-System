import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, Feedback } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

export default function FeedbackTab() {
  const { data: users, loading: usersLoading } = useApi(() => api.getUsers());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (usersLoading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  if (!users || users.length === 0) {
    return (
      <div>
        <h1 className="page-header">Feedback Log</h1>
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p>No data yet. Run the simulation from Home first.</p>
        </div>
      </div>
    );
  }

  const sorted = [...users].sort((a, b) => b.feedbackCount - a.feedbackCount);
  const userId = selectedUser || sorted[0]?.id;

  return (
    <div>
      <h1 className="page-header">Feedback Log</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Raw feedback data the system is learning from
      </p>

      <div className="user-chips">
        {sorted.map((u) => (
          <button
            key={u.id}
            className={`user-chip ${userId === u.id ? 'active' : ''}`}
            onClick={() => setSelectedUser(u.id)}
          >
            {u.name} ({u.feedbackCount})
          </button>
        ))}
      </div>

      {userId && <UserFeedback userId={userId} users={users} />}
    </div>
  );
}

function UserFeedback({ userId, users }: { userId: string; users: User[] }) {
  const { data: feedback, loading } = useApi(
    () => api.getFeedbackByUser(userId), [userId]
  );

  const user = users.find(u => u.id === userId);

  if (loading) return <div className="loading"><div className="spinner" /> Loading feedback...</div>;

  if (!feedback || feedback.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <p>No feedback from this user yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        {feedback.length} feedback entries from {user?.name}
      </p>

      {feedback.map((fb) => {
        const aboutUser = users.find(u => u.id === fb.aboutUserId);
        const scores = [fb.conversationScore, fb.emotionalScore, fb.interestsScore, fb.chemistryScore, fb.valuesScore];
        const maxDim = scores.indexOf(Math.max(...scores));
        const minDim = scores.indexOf(Math.min(...scores));

        return (
          <div key={fb.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  About {aboutUser?.name || 'Unknown'}
                </span>
              </div>
              <div style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                background: fb.overallRating > 0.7 ? 'var(--success-bg)' : fb.overallRating > 0.4 ? 'var(--warning-bg)' : '#fef2f2',
                color: fb.overallRating > 0.7 ? 'var(--success)' : fb.overallRating > 0.4 ? 'var(--warning)' : '#dc2626',
              }}>
                {(fb.overallRating * 100).toFixed(0)}%
              </div>
            </div>

            {/* dimension bars */}
            {DIMENSIONS.map((dim, i) => (
              <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 80, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {DIMENSION_LABELS[dim]}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${scores[i] * 100}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: i === maxDim ? 'var(--success)' : i === minDim ? 'var(--warning)' : 'var(--primary)',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ width: 32, textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {(scores[i] * 10).toFixed(1)}
                </span>
              </div>
            ))}

            {/* highlight strongest and weakest */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11 }}>
              <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 10 }}>
                Best: {DIMENSION_LABELS[DIMENSIONS[maxDim]]}
              </span>
              <span style={{ background: 'var(--warning-bg)', color: '#92400e', padding: '2px 8px', borderRadius: 10 }}>
                Weakest: {DIMENSION_LABELS[DIMENSIONS[minDim]]}
              </span>
            </div>

            {fb.rawText && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                "{fb.rawText}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
