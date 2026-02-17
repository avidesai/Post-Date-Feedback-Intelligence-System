import { useEffect, useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { PreferenceVector, Feedback } from '../types';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_TIPS } from '../types';

interface Props {
  userId: string;
  statedPreferences: PreferenceVector;
  onContinue: () => void;
}

export default function RevealScreen({ userId, statedPreferences, onContinue }: Props) {
  const { data: user, loading } = useApi(() => api.getUser(userId), [userId]);
  const { data: myFeedback } = useApi(() => api.getFeedbackByUser(userId), [userId]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger bar animation after mount
    const t = setTimeout(() => setAnimate(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (loading || !user) {
    return <div className="loading"><div className="spinner" /> Analyzing your preferences...</div>;
  }

  const revealed = user.revealedPreferences;

  // Find the biggest gap for the insight
  let maxGapDim = 0;
  let maxGap = 0;
  DIMENSIONS.forEach((_, i) => {
    const gap = Math.abs(statedPreferences[i] - revealed[i]);
    if (gap > maxGap) {
      maxGap = gap;
      maxGapDim = i;
    }
  });

  const biggestLabel = DIMENSION_LABELS[DIMENSIONS[maxGapDim]].toLowerCase();
  const statedMore = statedPreferences[maxGapDim] > revealed[maxGapDim];

  // Collect snippets from feedback that have LLM-extracted dimension snippets
  const snippetsForDims: Record<string, string[]> = {};
  (myFeedback || []).forEach((fb: Feedback) => {
    if (fb.dimensionSnippets) {
      DIMENSIONS.forEach(dim => {
        const s = fb.dimensionSnippets?.[dim];
        if (s) {
          if (!snippetsForDims[dim]) snippetsForDims[dim] = [];
          snippetsForDims[dim].push(s);
        }
      });
    }
  });

  return (
    <div className="reveal-screen fade-in">
      <h1 className="reveal-heading">
        Here's what you <em>actually</em> want
      </h1>
      <p className="reveal-sub">
        We compared what you said matters to what your ratings actually show
      </p>

      <div className="reveal-card">
        <div className="legend" style={{ marginBottom: 20 }}>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--accent)', opacity: 0.6 }} />
            What you said
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--warning)', opacity: 0.7 }} />
            What your dates show
          </div>
        </div>

        {DIMENSIONS.map((dim, i) => {
          const stated = statedPreferences[i];
          const rev = revealed[i];
          const gap = Math.abs(stated - rev);

          const dimSnippets = snippetsForDims[dim];

          return (
            <div key={dim} className="reveal-dim">
              <div className="reveal-dim-label">
                <span className="tooltip-wrap">
                  {DIMENSION_LABELS[dim]}
                  <span className="tooltip-icon" tabIndex={0}>?</span>
                  <span className="tooltip-text">{DIMENSION_TIPS[dim]}</span>
                </span>
                {gap > 0.12 && (
                  <span className="gap-indicator">
                    {(gap * 10).toFixed(1)} gap
                  </span>
                )}
              </div>
              <div className="reveal-bar-pair">
                <div className="reveal-bar-track">
                  <div
                    className="reveal-bar-stated"
                    style={{ width: animate ? `${stated * 100}%` : '0%' }}
                  />
                </div>
                <div className="reveal-bar-track">
                  <div
                    className="reveal-bar-revealed"
                    style={{ width: animate ? `${rev * 100}%` : '0%' }}
                  />
                </div>
              </div>
              {animate && dimSnippets && dimSnippets.length > 0 && (
                <div className="reveal-snippets">
                  {dimSnippets.map((s, si) => (
                    <div key={si} className="dim-snippet">"{s}"</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {maxGap > 0.1 && (
        <div className="insight-card insight-warning" style={{ maxWidth: 440, width: '100%', marginBottom: 24 }}>
          {statedMore
            ? `You said ${biggestLabel} matters a lot, but your ratings tell a different story.`
            : `Your dates reveal ${biggestLabel} matters more to you than you think.`
          }
        </div>
      )}

      <button className="btn btn-primary" onClick={onContinue}>
        Explore your results
      </button>
    </div>
  );
}
