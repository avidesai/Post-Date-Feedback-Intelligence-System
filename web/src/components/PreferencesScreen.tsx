import { useState } from 'react';
import type { PreferenceVector } from '../types';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_PREF_TIPS } from '../types';
import { PREFERENCE_QUESTIONS } from '../data/questions';
import ChatConversation from './ChatConversation';
import * as api from '../api';

interface Props {
  onSubmit: (prefs: PreferenceVector) => void;
  loading: boolean;
  error: string | null;
}

type Mode = 'chat' | 'sliders';

export default function PreferencesScreen({ onSubmit, loading, error }: Props) {
  const [mode, setMode] = useState<Mode>('chat');
  const [prefs, setPrefs] = useState<PreferenceVector>([0.5, 0.5, 0.5, 0.5, 0.5]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleChange = (index: number, value: number) => {
    const next = [...prefs] as PreferenceVector;
    next[index] = value;
    setPrefs(next);
  };

  const handleChatComplete = async (transcript: { question: string; answer: string }[]) => {
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await api.extractPreferences(transcript);
      onSubmit(result.preferences);
    } catch (e: any) {
      setExtractError(e.message || 'Failed to analyze your responses. Try sliders instead.');
      setExtracting(false);
    }
  };

  return (
    <div className="prefs-screen">
      <h1 className="prefs-heading">
        What do you <em>look for?</em>
      </h1>
      <p className="prefs-sub">
        {mode === 'chat'
          ? 'Tell us what matters to you in a date'
          : 'Rate how much each quality matters to you in a date'
        }
      </p>

      {/* Mode toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
          onClick={() => setMode('chat')}
        >
          Conversation
        </button>
        <button
          className={`mode-btn ${mode === 'sliders' ? 'active' : ''}`}
          onClick={() => setMode('sliders')}
        >
          Sliders
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          <ChatConversation
            questions={PREFERENCE_QUESTIONS}
            onComplete={handleChatComplete}
            processing={extracting}
            processingText="Analyzing your preferences..."
          />
          {extractError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              {extractError}
            </p>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
