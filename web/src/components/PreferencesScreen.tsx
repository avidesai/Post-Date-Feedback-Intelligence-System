import { useState } from 'react';
import type { PreferenceVector } from '../types';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_PREF_TIPS } from '../types';

interface Props {
  onSubmit: (prefs: PreferenceVector) => void;
  loading: boolean;
  error: string | null;
}

export default function PreferencesScreen({ onSubmit, loading, error }: Props) {
  const [prefs, setPrefs] = useState<PreferenceVector>([0.5, 0.5, 0.5, 0.5, 0.5]);

  const handleChange = (index: number, value: number) => {
    const next = [...prefs] as PreferenceVector;
    next[index] = value;
    setPrefs(next);
  };

  return (
    <div className="prefs-screen">
      <h1 className="prefs-heading">
        What do you <em>look for?</em>
      </h1>
      <p className="prefs-sub">
        Rate how much each quality matters to you in a date
      </p>

      <div className="prefs-card">
        {DIMENSIONS.map((dim, i) => (
          <div key={dim} className="pref-row">
            <div className="pref-header">
              <span className="pref-label">
                <span className="tooltip-wrap">
                  {DIMENSION_LABELS[dim]}
                  <span className="tooltip-icon" tabIndex={0}>?</span>
                  <span className="tooltip-text">{DIMENSION_PREF_TIPS[dim]}</span>
                </span>
              </span>
              <span className="pref-value">{(prefs[i] * 10).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs[i]}
              onChange={(e) => handleChange(i, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button
        className="btn btn-primary"
        onClick={() => onSubmit(prefs)}
        disabled={loading}
      >
        {loading ? 'Setting up your dates...' : 'See your dates'}
      </button>
    </div>
  );
}
