import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';

interface Props {
  activeUserId: string;
  onSelectUser: (userId: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SettingsOverlay({ activeUserId, onSelectUser, onClose, onRefresh }: Props) {
  const { data: users, loading } = useApi(() => api.getUsers());
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.runSimulation({ rounds: 5 });
      onRefresh();
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2 className="overlay-title">Settings</h2>
          <button className="overlay-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Switch Profile */}
        <div className="overlay-section">
          <div className="overlay-section-title">Switch profile</div>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <div>
              {(users || [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((user) => (
                  <button
                    key={user.id}
                    className={`settings-user-item ${user.id === activeUserId ? 'active' : ''}`}
                    onClick={() => onSelectUser(user.id)}
                  >
                    <div className="settings-user-avatar">{user.name[0]}</div>
                    <div>
                      <div className="settings-user-name">{user.name}</div>
                      <div className="settings-user-meta">
                        {user.age} · {user.feedbackCount} feedback
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Reset Simulation */}
        <div className="overlay-section">
          <div className="overlay-section-title">Simulation</div>
          <button
            className="btn btn-danger btn-full"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? 'Re-simulating...' : 'Reset & re-simulate'}
          </button>
        </div>

        {/* About */}
        <div className="overlay-section">
          <div className="overlay-section-title">About this demo</div>
          <p className="about-text">
            This is a simulation of Known&apos;s preference intelligence system. It tracks
            stated vs revealed dating preferences to show how people&apos;s actions differ
            from what they say they want. All profiles and dates are simulated.
          </p>
        </div>
      </div>
    </>
  );
}
