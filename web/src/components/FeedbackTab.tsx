import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, DateRecord, Feedback } from '../types';
import { DIMENSIONS, DIMENSION_LABELS } from '../types';

type FeedbackState = 'select-user' | 'select-date' | 'flow' | 'result';

export default function FeedbackTab() {
  const { data: users } = useApi(() => api.getUsers());
  const [state, setState] = useState<FeedbackState>('select-user');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateRecord | null>(null);
  const [result, setResult] = useState<Feedback | null>(null);

  // once user is selected, load their dates
  const { data: dates } = useApi(
    () => selectedUser ? api.getDatesForUser(selectedUser) : Promise.resolve([]),
    [selectedUser]
  );

  if (!users || users.length === 0) {
    return (
      <div>
        <h1 className="page-header">Give Feedback</h1>
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <p>No users yet. Run the simulation from Home first.</p>
        </div>
      </div>
    );
  }

  if (state === 'flow' && selectedDate && selectedUser) {
    // figure out who is the "other" person on this date
    const reviewedId = selectedDate.userAId === selectedUser ? selectedDate.userBId : selectedDate.userAId;
    return (
      <FeedbackFlow
        dateId={selectedDate.id}
        reviewerId={selectedUser}
        reviewedId={reviewedId}
        onComplete={(fb) => { setResult(fb); setState('result'); }}
        onCancel={() => setState('select-date')}
      />
    );
  }

  if (state === 'result' && result) {
    return (
      <div>
        <h1 className="page-header">Feedback Submitted</h1>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary)' }}>
            {(result.overallRating * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Overall Satisfaction</div>
        </div>

        <div className="card">
          <div className="card-title">Dimension Scores</div>
          {DIMENSIONS.map((dim, i) => {
            const score = [result.conversationScore, result.emotionalScore, result.interestsScore, result.chemistryScore, result.valuesScore][i];
            return (
              <div key={dim} className="dim-row">
                <div className="dim-name" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{DIMENSION_LABELS[dim]}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{(score * 100).toFixed(0)}%</span>
                </div>
                <div className="dim-track">
                  <div className="dim-fill-a" style={{ width: `${score * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary btn-full" onClick={() => { setState('select-user'); setResult(null); }}>
          Submit Another
        </button>
      </div>
    );
  }

  // user selection
  if (state === 'select-user' || !selectedUser) {
    return (
      <div>
        <h1 className="page-header">Give Feedback</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Pick who you are
        </p>
        <div className="user-chips">
          {users.map((u) => (
            <button
              key={u.id}
              className={`user-chip ${selectedUser === u.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedUser(u.id);
                setState('select-date');
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // date selection
  return (
    <div>
      <h1 className="page-header">Give Feedback</h1>
      <button className="btn btn-secondary btn-sm" onClick={() => setState('select-user')} style={{ marginBottom: 12 }}>
        ← Change user
      </button>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Pick a date to review
      </p>

      {(!dates || dates.length === 0) && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>This user has no dates yet.</p>
        </div>
      )}

      {dates && dates.map((d) => {
        const otherName = d.userAId === selectedUser
          ? (d.userBName || 'Partner')
          : (d.userAName || 'Partner');
        return (
          <div
            key={d.id}
            className="date-card"
            onClick={() => { setSelectedDate(d); setState('flow'); }}
          >
            <div className="date-avatar">{otherName[0]}</div>
            <div className="date-info">
              <div className="date-name">Date with {otherName}</div>
              <div className="date-venue">{d.venueName || 'Unknown venue'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// multi step feedback form - scores are 0 to 1
const STEPS = [
  { type: 'slider' as const, key: 'overall', question: 'How was the date overall?', min: 0, max: 1, step: 0.05 },
  { type: 'slider' as const, key: 'conversation', question: 'How was the conversation quality?', min: 0, max: 1, step: 0.05 },
  { type: 'slider' as const, key: 'emotional', question: 'How strong was the emotional connection?', min: 0, max: 1, step: 0.05 },
  { type: 'slider' as const, key: 'interests', question: 'How much did your interests align?', min: 0, max: 1, step: 0.05 },
  { type: 'slider' as const, key: 'chemistry', question: 'How was the physical chemistry?', min: 0, max: 1, step: 0.05 },
  { type: 'slider' as const, key: 'values', question: 'How well did your values align?', min: 0, max: 1, step: 0.05 },
  { type: 'text' as const, key: 'rawText', question: 'Any thoughts about the date? (optional)' },
];

function FeedbackFlow({
  dateId, reviewerId, reviewedId, onComplete, onCancel,
}: {
  dateId: string;
  reviewerId: string;
  reviewedId: string;
  onComplete: (fb: Feedback) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, number | string>>({
    overall: 0.7, conversation: 0.7, emotional: 0.7, interests: 0.7, chemistry: 0.7, values: 0.7,
    rawText: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        dateId,
        fromUserId: reviewerId,
        aboutUserId: reviewedId,
        overallRating: values.overall as number,
        conversationScore: values.conversation as number,
        emotionalScore: values.emotional as number,
        interestsScore: values.interests as number,
        chemistryScore: values.chemistry as number,
        valuesScore: values.values as number,
        rawText: (values.rawText as string) || undefined,
      });
      onComplete(res.feedback);
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
          <div key={i} className={`progress-dot ${i < step ? 'done' : i === step ? 'current' : ''}`} />
        ))}
      </div>

      <div className="feedback-step" key={step}>
        <div className="feedback-question">{current.question}</div>

        {current.type === 'slider' && (
          <div className="slider-group">
            <div className="slider-label">
              <span>Low</span>
              <span>{((values[current.key] as number) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={values[current.key] as number}
              onChange={(e) => setValues({ ...values, [current.key]: parseFloat(e.target.value) })}
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
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>
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
