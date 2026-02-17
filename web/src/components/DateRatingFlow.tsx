import { useState, useEffect, useRef } from 'react';
import * as api from '../api';
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_TIPS } from '../types';
import { getRecapQuestions } from '../data/questions';
import ChatConversation from './ChatConversation';

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

type Mode = 'chat' | 'sliders';

function loadRatingIndex(userId: string): number {
  try {
    const raw = localStorage.getItem(`rating_progress_${userId}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function saveRatingIndex(userId: string, index: number) {
  localStorage.setItem(`rating_progress_${userId}`, String(index));
}

export default function DateRatingFlow({ userId, dates, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = loadRatingIndex(userId);
    // Clamp to valid range
    return Math.min(saved, dates.length - 1);
  });
  const [mode, setMode] = useState<Mode>('chat');
  const [overall, setOverall] = useState(0.5);
  const [scores, setScores] = useState<[number, number, number, number, number]>([0.5, 0.5, 0.5, 0.5, 0.5]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedRef = useRef(false);

  // On mount, check which dates already have feedback and skip them
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    api.getFeedbackByUser(userId).then(feedback => {
      const ratedDateIds = new Set(feedback.map(f => f.dateId));
      const firstUnrated = dates.findIndex(d => !ratedDateIds.has(d.dateId));

      if (firstUnrated === -1) {
        // All dates already rated — skip to results
        onComplete();
      } else {
        setCurrentIndex(firstUnrated);
        saveRatingIndex(userId, firstUnrated);
      }
      setCheckingProgress(false);
    }).catch(() => {
      setCheckingProgress(false);
    });
  }, [userId, dates, onComplete]);

  // Warn before refresh/close during active rating
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const date = dates[currentIndex];
  const isLast = currentIndex === dates.length - 1;

  const resetForm = () => {
    setOverall(0.5);
    setScores([0.5, 0.5, 0.5, 0.5, 0.5]);
    setText('');
    setError(null);
  };

  const advance = () => {
    if (isLast) {
      // Clear saved progress on completion
      localStorage.removeItem(`rating_progress_${userId}`);
      onComplete();
    } else {
      // Brief transition to cleanly unmount old ChatConversation before mounting new one
      setTransitioning(true);
      setSubmitting(false);
      resetForm();
      setTimeout(() => {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        saveRatingIndex(userId, nextIdx);
        setTransitioning(false);
      }, 100);
    }
  };

  const handleSliderSubmit = async () => {
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
      advance();
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChatComplete = async (transcript: { question: string; answer: string }[]) => {
    setSubmitting(true);
    setError(null);
    try {
      // Format transcript as natural text for the existing LLM extraction pipeline
      const rawText = transcript
        .map(t => `Q: ${t.question}\nA: ${t.answer}`)
        .join('\n\n');

      await api.submitFeedback({
        dateId: date.dateId,
        fromUserId: userId,
        aboutUserId: date.otherUserId,
        rawText,
      });
      advance();
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
      setSubmitting(false);
    }
  };

  if (checkingProgress) {
    return (
      <div className="loading"><div className="spinner" /> Resuming...</div>
    );
  }

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

      {/* Mode toggle */}
      <div className="mode-toggle" style={{ marginBottom: 16 }}>
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

      {transitioning ? (
        <div style={{ minHeight: 200 }} />
      ) : mode === 'chat' ? (
        <>
          <ChatConversation
            key={date.dateId}
            questions={getRecapQuestions(date.otherName)}
            onComplete={handleChatComplete}
            processing={submitting}
            processingText="Processing your feedback..."
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              {error}
            </p>
          )}
        </>
      ) : (
        <>
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
            onClick={handleSliderSubmit}
            disabled={submitting}
          >
            {submitting
              ? 'Submitting...'
              : isLast
                ? 'See your results'
                : 'Next date'
            }
          </button>
        </>
      )}
    </div>
  );
}
