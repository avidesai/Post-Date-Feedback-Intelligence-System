import { useState } from 'react';
import * as api from '../api';
import type { SimulationResult } from '../types';

interface Props {
  onDataReady: () => void;
  hasData: boolean;
}

type DemoPhase = 'intro' | 'seeding' | 'simulating' | 'done';

export default function HomeTab({ onDataReady, hasData }: Props) {
  const [phase, setPhase] = useState<DemoPhase>(hasData ? 'done' : 'intro');
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDemo() {
    setError(null);

    // step 1: seed users
    setPhase('seeding');
    setStatusText('Creating 24 synthetic user profiles with varied preference patterns...');
    try {
      await api.seedSimulation();
    } catch (e: any) {
      setError('Failed to seed: ' + e.message);
      setPhase('intro');
      return;
    }

    // step 2: run simulation
    setPhase('simulating');
    setStatusText('Running 5 rounds of simulated dates with preference learning...');
    try {
      const res = await api.runSimulation({ rounds: 5 });
      setResults(res.results);
      setPhase('done');
    } catch (e: any) {
      setError('Simulation failed: ' + e.message);
      setPhase('intro');
    }
  }

  if (phase === 'intro') {
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

        <div className="card" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
          <div className="card-title" style={{ color: 'var(--primary)' }}>Try the demo</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            This creates 24 synthetic users with designed preference patterns
            (some self-aware, some contradictory, some evolving) and runs 5 rounds of simulated dates
            with feedback and preference learning.
          </p>
          <button className="btn btn-primary btn-full" onClick={runDemo}>
            Run Demo Simulation
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'seeding' || phase === 'simulating') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 20px', width: 40, height: 40, borderWidth: 4 }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {phase === 'seeding' ? 'Setting up...' : 'Running simulation...'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {statusText}
        </p>
        {phase === 'simulating' && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>
            This takes 30-60 seconds. Each round generates feedback, extracts signals,
            and updates preference vectors.
          </p>
        )}
      </div>
    );
  }

  // done
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Simulation Complete</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          24 users, 5 rounds, {results ? results.reduce((s, r) => s + r.pairings.length, 0) : '~50'} simulated dates
        </p>
      </div>

      {results && results.length > 0 && (
        <div className="card">
          <div className="card-title">Match Quality Per Round</div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Average compatibility score - should trend up as the system learns
          </p>
          <div className="bar-chart" style={{ height: 140, alignItems: 'flex-end' }}>
            {results.map((r) => {
              const pct = r.averageCompatibility * 100;
              const height = Math.max(pct * 1.2, 8);
              return (
                <div key={r.round} className="bar-col">
                  <div className="bar-value" style={{ fontSize: 12, fontWeight: 600 }}>{pct.toFixed(0)}%</div>
                  <div
                    className="bar-fill"
                    style={{ height, background: 'var(--primary)', width: 28, borderRadius: 4 }}
                  />
                  <div className="bar-label" style={{ fontSize: 11 }}>R{r.round + 1}</div>
                </div>
              );
            })}
          </div>
          {results.length >= 2 && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
              {results[results.length - 1].averageCompatibility > results[0].averageCompatibility
                ? `Compatibility improved ${((results[results.length - 1].averageCompatibility - results[0].averageCompatibility) * 100).toFixed(1)} percentage points`
                : 'Learning in progress'}
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
        <div className="card-title" style={{ color: 'var(--primary)' }}>Next: See the insights</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
          The Insights tab shows how stated vs revealed preferences diverged for each user.
          Look for users who say they care about one thing but whose feedback tells a different story.
        </p>
        <button className="btn btn-primary btn-full" onClick={onDataReady}>
          View Insights →
        </button>
      </div>

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 4 }}
        onClick={() => { setPhase('intro'); setResults(null); }}
      >
        Run Again
      </button>
    </div>
  );
}
