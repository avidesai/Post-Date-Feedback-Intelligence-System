interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="hiw-backdrop" onClick={onClose}>
      <div className="hiw-modal" onClick={e => e.stopPropagation()}>
        <div className="hiw-modal-header">
          <h2 className="hiw-modal-title">How this <em>works</em></h2>
          <button className="hiw-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="hiw-modal-body">
          <div className="hiw-section">
            <div className="hiw-label">Preference vectors</div>
            <p>
              Your preferences are represented as a 5-dimensional vector: conversation quality,
              emotional connection, shared interests, chemistry, and values alignment. Each
              dimension is scored from 0 to 1. When you set sliders or answer questions, that
              becomes your <strong>stated</strong> preference vector.
            </p>
          </div>

          <div className="hiw-section">
            <div className="hiw-label">Signal extraction</div>
            <p>
              Every time you rate a date, the system extracts a signal from your scores.
              Each dimension is weighted against your overall rating using the formula:
            </p>
            <div className="hiw-formula">
              importance = score × (1 - |score - overallRating|)
            </div>
            <p>
              If you gave someone a high overall score and also scored them high on chemistry,
              that tells the system chemistry genuinely matters to you. Dimensions that diverge
              from your overall rating are discounted.
            </p>
          </div>

          <div className="hiw-section">
            <div className="hiw-label">Adaptive learning (EMA)</div>
            <p>
              Extracted signals update your <strong>revealed</strong> preferences using an
              Exponential Moving Average:
            </p>
            <div className="hiw-formula">
              revealed = old × (1 - α) + signal × α
            </div>
            <p>
              The learning rate α adapts over time:
            </p>
            <div className="hiw-formula">
              α = 0.05 + 0.25 × e<sup>-0.15 × feedbackCount</sup>
            </div>
            <p>
              Your first few dates have outsized influence (α ≈ 0.30), while later dates
              fine-tune rather than overwrite your profile (α → 0.05).
            </p>
          </div>

          <div className="hiw-section">
            <div className="hiw-label">Say-Do Gap (divergence)</div>
            <p>
              The gap between stated and revealed vectors is measured using cosine distance:
              1 - cos(θ), where θ is the angle between the two vectors. A small gap means you
              know yourself well. A large gap means your dating behavior tells a different story
              than your words. Per-dimension gaps above 0.2 trigger specific insights about where
              your self-perception diverges from your actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
