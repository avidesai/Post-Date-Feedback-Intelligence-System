import { useState, useEffect } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, PreferenceVector } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

export default function ProfileTab() {
  const { data: users, loading, refetch: refetchUsers } = useApi(() => api.getUsers());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  if (!users || users.length === 0) {
    return (
      <div>
        <h1 className="page-header">Explore Users</h1>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>No users yet. Go to Home and run the demo simulation first.</p>
        </div>
      </div>
    );
  }

  const sorted = [...users].sort((a, b) => b.feedbackCount - a.feedbackCount);
  const userId = selectedUser || sorted[0]?.id;
  const user = users.find(u => u.id === userId);

  return (
    <div>
      <h1 className="page-header">Explore Users</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        View and edit user profiles, see how their vectors compare
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

      {user && <UserProfile key={user.id} user={user} onUpdate={refetchUsers} />}
    </div>
  );
}

function UserProfile({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [prefs, setPrefs] = useState<PreferenceVector>([...user.statedPreferences] as PreferenceVector);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // reset prefs when user changes (key prop handles remount, but just in case)
  useEffect(() => {
    setPrefs([...user.statedPreferences] as PreferenceVector);
    setSaveMsg(null);
  }, [user.id]);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.updatePreferences(user.id, prefs);
      setSaveMsg('Saved!');
      onUpdate();
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e: any) {
      setSaveMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="date-avatar" style={{ width: 52, height: 52, fontSize: 22 }}>
            {user.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{user.name}, {user.age}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{user.gender}</div>
            {user.bio && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{user.bio}</div>
            )}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value">{user.feedbackCount}</div>
            <div className="stat-label">Feedback</div>
          </div>
        </div>
      </div>

      {/* stated preferences editor */}
      <div className="card">
        <div className="card-title">Stated Preferences</div>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          What this user said they care about during onboarding
        </p>
        {DIMENSIONS.map((dim, i) => (
          <div key={dim} className="pref-row">
            <div className="pref-label">{DIMENSION_LABELS[dim]}</div>
            <input
              className="pref-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs[i]}
              onChange={(e) => {
                const next = [...prefs] as PreferenceVector;
                next[i] = parseFloat(e.target.value);
                setPrefs(next);
              }}
            />
            <div className="pref-value">{(prefs[i] * 10).toFixed(1)}</div>
          </div>
        ))}
        <button
          className="btn btn-primary btn-full btn-sm"
          style={{ marginTop: 8 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Update Preferences'}
        </button>
        {saveMsg && (
          <div style={{
            textAlign: 'center',
            marginTop: 8,
            fontSize: 13,
            fontWeight: 500,
            color: saveMsg.startsWith('Error') ? '#dc2626' : 'var(--success)',
          }}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* all three vectors side by side */}
      {user.feedbackCount > 0 && (
        <div className="card">
          <div className="card-title">All Vectors</div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Stated = what they said, Revealed = what feedback shows, Quality = how others rate them
          </p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text-tertiary)', fontWeight: 500 }}>Dimension</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--primary)', fontWeight: 600 }}>Stated</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--secondary)', fontWeight: 600 }}>Revealed</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--success)', fontWeight: 600 }}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dim, i) => {
                const stated = user.statedPreferences[i];
                const revealed = user.revealedPreferences[i];
                const diff = Math.abs(stated - revealed);
                return (
                  <tr key={dim} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>{DIMENSION_LABELS[dim]}</td>
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>{(stated * 10).toFixed(1)}</td>
                    <td style={{
                      textAlign: 'center',
                      padding: '6px 4px',
                      fontWeight: diff > 0.15 ? 600 : 400,
                      color: diff > 0.15 ? 'var(--warning)' : 'inherit',
                    }}>
                      {(revealed * 10).toFixed(1)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>{(user.qualityProfile[i] * 10).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="legend" style={{ marginTop: 8 }}>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--warning)' }} />
              Significant gap (stated vs revealed)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
