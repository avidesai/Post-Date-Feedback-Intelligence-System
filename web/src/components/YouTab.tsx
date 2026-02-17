import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { PreferenceVector } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

interface Props {
  userId: string;
}

export default function YouTab({ userId }: Props) {
  const { data: user, loading: userLoading, refetch: refetchUser } = useApi(
    () => api.getUser(userId), [userId]
  );
  const { data: summary, loading: summaryLoading } = useApi(
    () => api.getUserSummary(userId), [userId]
  );

  const [editPrefs, setEditPrefs] = useState<PreferenceVector | null>(null);
  const [saving, setSaving] = useState(false);

  if (userLoading || summaryLoading) {
    return <div className="loading"><div className="spinner" /> Loading your profile...</div>;
  }

  if (!user) {
    return <div className="empty-state"><p>Profile not found.</p></div>;
  }

  const stated = editPrefs || user.statedPreferences;
  const revealed = user.revealedPreferences;
  const quality = user.qualityProfile;
  const hasFeedback = user.feedbackCount > 0;

  const handleSave = async () => {
    if (!editPrefs) return;
    setSaving(true);
    try {
      await api.updatePreferences(userId, editPrefs);
      setEditPrefs(null);
      refetchUser();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Profile Card */}
      <div className="card">
        <div className="profile-header">
          <div className="profile-avatar">{user.name[0]}</div>
          <div>
            <div className="profile-name">{user.name}</div>
            <div className="profile-meta">{user.age} · {user.gender}</div>
          </div>
        </div>
        {user.bio && <div className="profile-bio">{user.bio}</div>}
      </div>

      {/* Stated Preferences (editable) */}
      <div className="card">
        <div className="card-title">What you <em>said</em> you want</div>
        {DIMENSIONS.map((dim, i) => (
          <div key={dim} className="pref-row">
            <span className="pref-label">{DIMENSION_LABELS[dim]}</span>
            <input
              type="range"
              className="pref-slider"
              min={0}
              max={1}
              step={0.05}
              value={stated[i]}
              onChange={(e) => {
                const next = [...(editPrefs || user.statedPreferences)] as PreferenceVector;
                next[i] = parseFloat(e.target.value);
                setEditPrefs(next);
              }}
            />
            <span className="pref-value">{(stated[i] * 10).toFixed(1)}</span>
          </div>
        ))}
        {editPrefs && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setEditPrefs(null)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Update'}
            </button>
          </div>
        )}
      </div>

      {/* Revealed Preferences */}
      {hasFeedback && (
        <div className="card">
          <div className="card-title">What your dates <em>actually</em> show</div>
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
            const s = user.statedPreferences[i];
            const r = revealed[i];
            const diff = Math.abs(s - r);
            const hasDivergence = diff > 0.15;
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name">
                  <span>{DIMENSION_LABELS[dim]}</span>
                  {hasDivergence && (
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

      {/* Quality Profile */}
      {hasFeedback && (
        <div className="card">
          <div className="card-title">How others <em>experience</em> you</div>
          <p className="card-subtitle">
            Based on {user.feedbackCount} date{user.feedbackCount !== 1 ? 's' : ''} worth of feedback from your dates
          </p>
          {DIMENSIONS.map((dim, i) => (
            <div key={dim} className="dim-row">
              <div className="dim-name">
                <span>{DIMENSION_LABELS[dim]}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {(quality[i] * 10).toFixed(1)}
                </span>
              </div>
              <div className="dim-track">
                <div className="dim-fill-a" style={{ width: `${quality[i] * 100}%`, opacity: 1 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Vectors Table */}
      {hasFeedback && (
        <div className="card">
          <div className="card-title">All <em>vectors</em></div>
          <table className="vectors-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Stated</th>
                <th>Revealed</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dim, i) => {
                const s = user.statedPreferences[i];
                const r = revealed[i];
                const q = quality[i];
                const gap = Math.abs(s - r);
                return (
                  <tr key={dim}>
                    <td className="dim-label">{DIMENSION_LABELS[dim]}</td>
                    <td>{(s * 10).toFixed(1)}</td>
                    <td className={gap > 0.15 ? 'gap-cell' : ''}>{(r * 10).toFixed(1)}</td>
                    <td>{(q * 10).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
