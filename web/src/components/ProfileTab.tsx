import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, SimulationResult } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

export default function ProfileTab() {
  const { data: users, loading, refetch: refetchUsers } = useApi(() => api.getUsers());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // sim state
  const [seeding, setSeeding] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simResults, setSimResults] = useState<SimulationResult[] | null>(null);
  const [rounds, setRounds] = useState(5);

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.seedSimulation();
      setSelectedUser(null);
      setSimResults(null);
      await refetchUsers();
    } catch (e: any) {
      alert('Seed failed: ' + e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleRunSim() {
    setSimRunning(true);
    try {
      const res = await api.runSimulation({ rounds, pairingsPerRound: 8, useSmartPairing: true });
      setSimResults(res.results);
      await refetchUsers();
    } catch (e: any) {
      alert('Simulation failed: ' + e.message);
    } finally {
      setSimRunning(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  const user = selectedUser ? users?.find(u => u.id === selectedUser) : null;

  return (
    <div>
      <h1 className="page-header">Profile & Simulation</h1>

      {/* simulation controls - always visible */}
      <div className="card">
        <div className="card-title">Simulation Engine</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Generate synthetic users and run date simulations to see the preference learning system in action.
        </p>

        <div className="sim-controls">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Users'}
          </button>

          <select value={rounds} onChange={(e) => setRounds(parseInt(e.target.value))}>
            <option value={3}>3 rounds</option>
            <option value={5}>5 rounds</option>
            <option value={10}>10 rounds</option>
            <option value={20}>20 rounds</option>
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunSim}
            disabled={simRunning || !users || users.length === 0}
          >
            {simRunning ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        {simRunning && (
          <div className="loading">
            <div className="spinner" />
            Running simulation... this can take a minute
          </div>
        )}

        {simResults && (
          <div className="sim-results">
            <div className="card-title" style={{ marginTop: 8 }}>Results</div>
            <div className="bar-chart" style={{ height: 120 }}>
              {simResults.map((r) => {
                const height = Math.max(r.avgCompatibility * 100, 4);
                return (
                  <div key={r.round} className="bar-col">
                    <div className="bar-value">{(r.avgCompatibility * 100).toFixed(0)}%</div>
                    <div className="bar-fill" style={{ height, background: 'var(--primary)' }} />
                    <div className="bar-label">R{r.round}</div>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <div className="legend-item" style={{ fontSize: 12 }}>
                Avg compatibility per round — should trend up with smart pairing
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {simResults.map((r) => (
                <div key={r.round} className="sim-round">
                  <span>Round {r.round}</span>
                  <span>{r.pairings} dates</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {(r.avgCompatibility * 100).toFixed(1)}% compat
                  </span>
                  <span style={{ color: 'var(--warning)' }}>
                    {(r.avgDivergence * 100).toFixed(1)}% div
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* user profiles */}
      {users && users.length > 0 && (
        <>
          <div className="section-gap" />
          <div className="card-title">Users ({users.length})</div>
          <div className="user-chips" style={{ marginBottom: 12 }}>
            {users.map((u) => (
              <button
                key={u.id}
                className={`user-chip ${selectedUser === u.id ? 'active' : ''}`}
                onClick={() => setSelectedUser(u.id === selectedUser ? null : u.id)}
              >
                {u.name}
              </button>
            ))}
          </div>
        </>
      )}

      {user && <UserProfile user={user} onUpdate={refetchUsers} />}
    </div>
  );
}

function UserProfile({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [prefs, setPrefs] = useState(user.statedPreferences);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updatePreferences(user.id, prefs);
      onUpdate();
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">{user.name}, {user.age}</div>
      {user.bio && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{user.bio}</p>
      )}

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{user.feedbackCount}</div>
          <div className="stat-label">Feedback</div>
        </div>
      </div>

      <div className="card-title">Stated Preferences</div>
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
              const next = [...prefs] as typeof prefs;
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

      {/* show revealed vs stated comparison if they have feedback */}
      {user.feedbackCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="card-title">Revealed Preferences</div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Learned from actual feedback behavior
          </p>
          {DIMENSIONS.map((dim, i) => (
            <div key={dim} className="dim-row">
              <div className="dim-name">{DIMENSION_LABELS[dim]}</div>
              <div className="dim-track">
                <div className="dim-fill-a" style={{ width: `${user.statedPreferences[i] * 100}%` }} />
              </div>
              <div className="dim-track">
                <div className="dim-fill-b" style={{ width: `${user.revealedPreferences[i] * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--primary)' }} />
              Stated
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--secondary)' }} />
              Revealed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
