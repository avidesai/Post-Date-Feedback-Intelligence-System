import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

export default function InsightsTab() {
  const { data: users, loading: usersLoading } = useApi(() => api.getUsers());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (usersLoading) return <div className="loading"><div className="spinner" /> Loading...</div>;
  if (!users || users.length === 0) {
    return (
      <div>
        <h1 className="page-header">Insights</h1>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>No users yet. Run a simulation from the Profile tab first.</p>
        </div>
      </div>
    );
  }

  const userId = selectedUser || users[0]?.id;

  return (
    <div>
      <h1 className="page-header">Insights</h1>

      <div className="user-chips">
        {users.map((u) => (
          <button
            key={u.id}
            className={`user-chip ${userId === u.id ? 'active' : ''}`}
            onClick={() => setSelectedUser(u.id)}
          >
            {u.name}
          </button>
        ))}
      </div>

      {userId && <UserInsights userId={userId} users={users} />}
    </div>
  );
}

function UserInsights({ userId, users }: { userId: string; users: User[] }) {
  const { data: drift, loading: driftLoading } = useApi(
    () => api.getPreferenceDrift(userId), [userId]
  );
  const { data: summary, loading: summaryLoading } = useApi(
    () => api.getUserSummary(userId), [userId]
  );

  const user = users.find(u => u.id === userId);
  if (driftLoading || summaryLoading) return <div className="loading"><div className="spinner" /> Loading insights...</div>;

  return (
    <div>
      {/* stats */}
      {user && (
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{user.feedbackCount}</div>
            <div className="stat-label">Feedback Given</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {drift?.divergence ? (drift.divergence.overall * 100).toFixed(0) + '%' : '--'}
            </div>
            <div className="stat-label">Divergence</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">
              {summary?.recentFeedback?.length || 0}
            </div>
            <div className="stat-label">Reviews</div>
          </div>
        </div>
      )}

      {/* stated vs revealed */}
      {drift?.divergence && (
        <div className="card">
          <div className="card-title">Stated vs Revealed Preferences</div>
          <div className="legend" style={{ marginBottom: 12 }}>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--primary)' }} />
              What you say
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--secondary)' }} />
              What feedback shows
            </div>
          </div>
          {DIMENSIONS.map((dim, i) => {
            const stated = drift.divergence.stated[i];
            const revealed = drift.divergence.revealed[i];
            const diff = Math.abs(stated - revealed);
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{DIMENSION_LABELS[dim]}</span>
                  {diff > 0.15 && (
                    <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 11 }}>
                      {revealed > stated ? '+' : '-'}{(diff * 10).toFixed(1)}
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

      {/* divergence timeline */}
      {drift?.history && drift.history.length > 0 && (
        <div className="card">
          <div className="card-title">Divergence Over Time</div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            How different your stated vs revealed preferences are
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
                      background: isHigh ? 'var(--warning)' : 'var(--primary)',
                    }}
                  />
                  <div className="bar-label">#{h.feedbackCount}</div>
                </div>
              );
            })}
          </div>
          {drift.history.length > 2 && (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: 8 }}>
              {drift.history[drift.history.length - 1].divergenceScore < drift.history[Math.floor(drift.history.length / 2)].divergenceScore
                ? 'Your self-awareness is improving'
                : 'Still discovering what you actually want'}
            </p>
          )}
        </div>
      )}

      {/* insights */}
      {drift?.divergence?.insights && drift.divergence.insights.length > 0 && (
        <div className="card">
          <div className="card-title">Key Insights</div>
          {drift.divergence.insights.map((insight, i) => (
            <div key={i} className={`insight-card ${i === 0 ? 'insight-warning' : 'insight-info'}`}>
              {insight}
            </div>
          ))}
        </div>
      )}

      {summary?.topInsights && summary.topInsights.length > 0 && (
        <div className="card">
          <div className="card-title">Summary</div>
          {summary.topInsights.map((insight, i) => (
            <div key={i} className="insight-card insight-success">
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
