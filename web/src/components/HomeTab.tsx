import { useState, useEffect } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { SimulationResult } from '../types';

interface Props {
  onDataReady: () => void;
  hasData: boolean;
}

export default function HomeTab({ onDataReady, hasData }: Props) {
  const { data: users, loading: checkingData } = useApi(() => api.getUsers());
  const [simResults, setSimResults] = useState<SimulationResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataExists = (users && users.length > 0) || hasData;

  async function handleReseed() {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runSimulation({ rounds: 5 });
      setSimResults(res.results);
    } catch (e: any) {
      setError('Simulation failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  }

  if (checkingData) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🧠</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
          Feedback Intelligence
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
          A post-date feedback pipeline that learns what users actually want vs what they say they want
        </p>
      </div>

      <div className="card">
        <div className="card-title">How it works</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>
            <strong>1. Users state preferences</strong> during onboarding - "I care most about conversation quality"
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong>2. After each date</strong>, they give feedback with ratings and open-ended text
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong>3. The system learns</strong> their revealed preferences from patterns in their feedback,
            weighted by satisfaction
          </p>
          <p>
            <strong>4. Match quality improves</strong> as the system uses what users actually value
            (not just what they claim) to score compatibility
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">The key insight</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          People are bad at knowing what they want in a partner. Someone might say "intellectual connection
          is everything" but consistently rate dates highest when there's strong physical chemistry.
          This system detects that gap and uses it to make better matches.
        </p>
      </div>

      {dataExists ? (
        <>
          <div className="card" style={{ background: 'var(--success-bg)', borderColor: 'var(--success)' }}>
            <div className="card-title" style={{ color: '#065f46' }}>Demo data loaded</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {users?.length || 24} users with simulated dates and preference learning already applied.
              Check the Insights tab to see how stated vs revealed preferences diverged.
            </p>
            <button className="btn btn-primary btn-full" onClick={onDataReady}>
              View Insights →
            </button>
          </div>

          <button
            className="btn btn-secondary btn-full"
            style={{ marginTop: 4 }}
            onClick={handleReseed}
            disabled={running}
          >
            {running ? 'Re-running...' : 'Reset & Re-run Simulation'}
          </button>
        </>
      ) : (
        <div className="card" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
          <div className="card-title" style={{ color: 'var(--primary)' }}>Try the demo</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            This creates 24 synthetic users with designed preference patterns and runs 5 rounds
            of simulated dates with preference learning.
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={handleReseed}
            disabled={running}
          >
            {running ? 'Running...' : 'Run Demo Simulation'}
          </button>
        </div>
      )}

      {running && (
        <div className="loading" style={{ marginTop: 12 }}>
          <div className="spinner" /> Running simulation...
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: 16, color: '#dc2626', fontSize: 14, marginTop: 12 }}>
          {error}
        </div>
      )}

      {simResults && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">Simulation Results</div>
          <div className="bar-chart" style={{ height: 120, alignItems: 'flex-end' }}>
            {simResults.map((r) => {
              const pct = r.averageCompatibility * 100;
              const height = Math.max(pct * 1.1, 8);
              return (
                <div key={r.round} className="bar-col">
                  <div className="bar-value" style={{ fontSize: 11, fontWeight: 600 }}>{pct.toFixed(0)}%</div>
                  <div className="bar-fill" style={{ height, background: 'var(--primary)', width: 24, borderRadius: 4 }} />
                  <div className="bar-label" style={{ fontSize: 11 }}>R{r.round + 1}</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 8 }}>
            Avg compatibility per round
          </p>
        </div>
      )}
    </div>
  );
}
