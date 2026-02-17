import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, DateRecord, Feedback } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

type FeedbackState = 'select' | 'flow' | 'result';

export default function FeedbackTab() {
  const { data: users } = useApi(() => api.getUsers());
  const { data: dates } = useApi(() => api.getDates());
  const [state, setState] = useState<FeedbackState>('select');
  const [selectedDate, setSelectedDate] = useState<DateRecord | null>(null);
  const [result, setResult] = useState<Feedback | null>(null);

  if (state === 'flow' && selectedDate) {
    return (
      <FeedbackFlow
        date={selectedDate}
        users={users || []}
        onComplete={(fb) => { setResult(fb); setState('result'); }}
        onCancel={() => setState('select')}
      />
    );
  }

  if (state === 'result' && result) {
    return (
      <div>
        <h1 className="page-header">Feedback Submitted</h1>
        <div className="card">
          <div className="score-big">{result.overallRating}/10</div>
          <div className="score-label">Overall Rating</div>
        </div>

        <div className="card">
          <div className="card-title">Dimension Scores</div>
          {DIMENSIONS.map((dim, i) => {
            const score = [result.conversationScore, result.emotionalScore, result.interestsScore, result.chemistryScore, result.valuesScore][i];
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name">{DIMENSION_LABELS[dim]}</div>
                <div className="dim-track">
                  <div className="dim-fill-a" style={{ width: `${(score / 10) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {result.extractedInsights && (
          <div className="card">
            <div className="card-title">AI Extracted Insights</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {result.extractedInsights}
            </p>
          </div>
        )}

        <button className="btn btn-primary btn-full" onClick={() => { setState('select'); setResult(null); }}>
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-header">Give Feedback</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Pick a date to leave feedback on
      </p>

      {(!dates || dates.length === 0) && (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p>No dates to review yet. Run a simulation first.</p>
        </div>
      )}

      {dates && dates.map((d) => (
        <div
          key={d.id}
          className="date-card"
          onClick={() => { setSelectedDate(d); setState('flow'); }}
        >
          <div className="date-avatar">💬</div>
          <div className="date-info">
            <div className="date-name">{d.userAName || 'User A'} & {d.userBName || 'User B'}</div>
            <div className="date-venue">{d.venue || 'Unknown venue'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// multi step feedback form
const STEPS = [
  { type: 'slider' as const, key: 'overall', question: 'How was the date overall?', min: 1, max: 10 },
  { type: 'slider' as const, key: 'conversation', question: 'How was the conversation quality?', min: 1, max: 10 },
  { type: 'slider' as const, key: 'emotional', question: 'How strong was the emotional connection?', min: 1, max: 10 },
  { type: 'slider' as const, key: 'interests', question: 'How much did your interests align?', min: 1, max: 10 },
  { type: 'slider' as const, key: 'chemistry', question: 'How was the physical chemistry?', min: 1, max: 10 },
  { type: 'slider' as const, key: 'values', question: 'How well did your values align?', min: 1, max: 10 },
  { type: 'text' as const, key: 'bestPart', question: 'What was the best part of the date?' },
  { type: 'text' as const, key: 'didntClick', question: 'Anything that didn\'t click?' },
  { type: 'text' as const, key: 'other', question: 'Anything else you want to share?' },
];

function FeedbackFlow({
  date, users, onComplete, onCancel,
}: {
  date: DateRecord;
  users: User[];
  onComplete: (fb: Feedback) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, number | string>>({
    overall: 7, conversation: 7, emotional: 7, interests: 7, chemistry: 7, values: 7,
    bestPart: '', didntClick: '', other: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // pick a reviewer - just use userA for now
  const reviewerId = date.userAId;
  const reviewedId = date.userBId;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const textParts = [values.bestPart, values.didntClick, values.other].filter(Boolean);
      const fb = await api.submitFeedback({
        dateId: date.id,
        reviewerId,
        reviewedId,
        overallRating: values.overall as number,
        dimensionScores: {
          conversation: values.conversation as number,
          emotional: values.emotional as number,
          interests: values.interests as number,
          chemistry: values.chemistry as number,
          values: values.values as number,
        },
        textFeedback: textParts.join(' '),
      });
      onComplete(fb);
    } catch (e: any) {
      alert('Error submitting: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <div className="feedback-progress">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`progress-dot ${i < step ? 'done' : i === step ? 'current' : ''}`}
          />
        ))}
      </div>

      <div className="feedback-step" key={step}>
        <div className="feedback-question">{current.question}</div>

        {current.type === 'slider' && (
          <div className="slider-group">
            <div className="slider-label">
              <span>{current.min}</span>
              <span>{values[current.key] as number}</span>
            </div>
            <input
              type="range"
              min={current.min}
              max={current.max}
              step={1}
              value={values[current.key] as number}
              onChange={(e) => setValues({ ...values, [current.key]: parseInt(e.target.value) })}
            />
          </div>
        )}

        {current.type === 'text' && (
          <textarea
            value={values[current.key] as string}
            onChange={(e) => setValues({ ...values, [current.key]: e.target.value })}
            placeholder="Type your thoughts..."
          />
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {!isLast ? (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
