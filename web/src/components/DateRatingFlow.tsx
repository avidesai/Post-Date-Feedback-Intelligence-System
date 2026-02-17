import { useState } from 'react';
import * as api from '../api';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_TIPS } from '../types';

interface DateInfo {
  dateId: string;
  otherUserId: string;
  otherName: string;
  otherAge: number;
  otherBio: string;
  venue: string;
  dateAt: string;
}

interface Props {
  userId: string;
  dates: DateInfo[];
  onComplete: () => void;
}

export default function DateRatingFlow({ userId, dates, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overall, setOverall] = useState(0.5);
  const [scores, setScores] = useState<[number, number, number, number, number]>([0.5, 0.5, 0.5, 0.5, 0.5]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = dates[currentIndex];
  const isLast = currentIndex === dates.length - 1;

  const resetForm = () => {
    setOverall(0.5);
    setScores([0.5, 0.5, 0.5, 0.5, 0.5]);
    setText('');
    setError(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.submitFeedback({
        dateId: date.dateId,
        fromUserId: userId,
        aboutUserId: date.otherUserId,
        overallRating: overall,
        conversationScore: scores[0],
        emotionalScore: scores[1],
        interestsScore: scores[2],
        chemistryScore: scores[3],
        valuesScore: scores[4],
        rawText: text || undefined,
      });

      if (isLast) {
        onComplete();
      } else {
        resetForm();
        setCurrentIndex(i => i + 1);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rating-screen fade-up">
      {/* Progress */}
      <div className="rating-progress-label">
        Date {currentIndex + 1} of {dates.length}
      </div>
      <div className="progress-bar">
        {dates.map((_, i) => (
          <div
            key={i}
            className={`progress-segment ${i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}`}
          />
        ))}
      </div>

      {/* Person Card */}
      <div className="rating-person-card">
        <div className="rating-avatar">{date.otherName[0]}</div>
        <div className="rating-name">{date.otherName}</div>
        <div className="rating-meta">{date.otherAge} years old</div>
        {date.otherBio && <div className="rating-meta" style={{ marginTop: 4 }}>{date.otherBio}</div>}
        <div className="rating-venue">{date.venue}</div>
      </div>

      {/* Rating Form */}
      <div className="rating-form">
        <div className="rating-form-title">How was this date?</div>

        {/* Overall */}
        <div className="rating-overall">
          <div className="pref-row">
            <div className="pref-header">
              <span className="pref-label">Overall</span>
              <span className="pref-value">{(overall * 10).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overall}
              onChange={(e) => setOverall(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Per-dimension scores */}
        {DIMENSIONS.map((dim, i) => (
          <div key={dim} className="pref-row">
            <div className="pref-header">
              <span className="pref-label">
                <span className="tooltip-wrap">
                  {DIMENSION_LABELS[dim]}
                  <span className="tooltip-icon" tabIndex={0}>?</span>
                  <span className="tooltip-text">{DIMENSION_TIPS[dim]}</span>
                </span>
              </span>
              <span className="pref-value">{(scores[i] * 10).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={scores[i]}
              onChange={(e) => {
                const next = [...scores] as [number, number, number, number, number];
                next[i] = parseFloat(e.target.value);
                setScores(next);
              }}
            />
          </div>
        ))}

        {/* Optional text */}
        <div className="rating-text-section">
          <div className="rating-text-label">Anything else? (optional)</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What stood out about this date..."
          />
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? 'Submitting...'
          : isLast
            ? 'See your results'
            : 'Next date'
        }
      </button>
    </div>
  );
}
