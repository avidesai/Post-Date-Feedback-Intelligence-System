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
          <p>No users yet. Go to Home and run the demo simulation first.</p>
        </div>
      </div>
    );
  }

  // sort users by feedback count (most interesting ones first)
  const sorted = [...users].sort((a, b) => b.feedbackCount - a.feedbackCount);
  const userId = selectedUser || sorted[0]?.id;

  return (
    <div>
      <h1 className="page-header">Insights</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Pick a user to see their stated vs revealed preference gap
      </p>

      <div className="user-chips">
        {sorted.map((u) => (
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

  if (driftLoading || summaryLoading) {
    return <div className="loading"><div className="spinner" /> Loading insights...</div>;
  }

  return (
    <div>
      {/* user header */}
      {user && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="date-avatar">{user.name[0]}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{user.name}, {user.age}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{user.bio || 'No bio'}</div>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-value">{summary?.stats?.feedbackGiven || user.feedbackCount}</div>
              <div className="stat-label">Feedback Given</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{summary?.stats?.totalDates || 0}</div>
              <div className="stat-label">Dates</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {drift?.currentDivergence ? `${(drift.currentDivergence.overall * 100).toFixed(0)}%` : '--'}
              </div>
              <div className="stat-label">Divergence</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {summary?.stats?.avgSatisfaction != null
                  ? `${(summary.stats.avgSatisfaction * 100).toFixed(0)}%`
                  : '--'}
              </div>
              <div className="stat-label">Avg Rating</div>
            </div>
          </div>
        </div>
      )}

      {/* stated vs revealed */}
      {drift?.currentDivergence && (
        <div className="card">
          <div className="card-title">Stated vs Revealed Preferences</div>
          <div className="legend" style={{ marginBottom: 12, marginTop: -4 }}>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--primary)' }} />
              What they said
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--secondary)' }} />
              What feedback shows
            </div>
          </div>
          {DIMENSIONS.map((dim, i) => {
            const stated = user?.statedPreferences[i] ?? 0;
            const revealed = user?.revealedPreferences[i] ?? 0;
            const diff = Math.abs(stated - revealed);
            const hasDivergence = diff > 0.15;
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{DIMENSION_LABELS[dim]}</span>
                  {hasDivergence && (
                    <span style={{
                      color: 'var(--warning)',
                      fontWeight: 600,
                      fontSize: 11,
                    }}>
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

      {/* divergence timeline */}
      {drift?.history && drift.history.length > 0 && (
        <div className="card">
          <div className="card-title">Divergence Over Time</div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            How much stated vs revealed preferences differ after each feedback
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
        </div>
      )}

      {/* insights */}
      {drift?.currentDivergence?.insights && drift.currentDivergence.insights.length > 0 && (
        <div className="card">
          <div className="card-title">Key Insights</div>
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

      {/* summary insights from the server */}
      {summary?.insights && summary.insights.length > 0 && (
        <div className="card">
          <div className="card-title">Summary</div>
          {summary.insights.map((insight, i) => (
            <div key={i} className="insight-card insight-success">{insight}</div>
          ))}
        </div>
      )}
    </div>
  );
}
