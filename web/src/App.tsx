import { useState, useEffect } from 'react';
import { useApi } from './hooks';
import * as api from './api';
import PersonaPicker from './components/PersonaPicker';
import YouTab from './components/YouTab';
import PeopleTab from './components/PeopleTab';
import InsightsTab from './components/InsightsTab';
import SettingsOverlay from './components/SettingsOverlay';

type Tab = 'you' | 'people' | 'insights';

const TABS: { id: Tab; label: string }[] = [
  { id: 'you', label: 'You' },
  { id: 'people', label: 'People' },
  { id: 'insights', label: 'Insights' },
];

export default function App() {
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return localStorage.getItem('known_active_user');
  });
  const [tab, setTab] = useState<Tab>('you');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Validate the stored user still exists
  const { data: validatedUser, loading: validating } = useApi(
    () => activeUserId ? api.getUser(activeUserId) : Promise.resolve(null),
    [activeUserId]
  );

  useEffect(() => {
    if (!validating && activeUserId && validatedUser === null) {
      // User no longer exists, clear selection
      localStorage.removeItem('known_active_user');
      setActiveUserId(null);
    }
  }, [validating, activeUserId, validatedUser]);

  const handleSelectUser = (userId: string) => {
    localStorage.setItem('known_active_user', userId);
    setActiveUserId(userId);
    setTab('you');
    setShowSettings(false);
    setRefreshKey(k => k + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  // Loading state while validating stored user
  if (validating && activeUserId) {
    return (
      <div className="app-container">
        <div className="loading"><div className="spinner" /> Loading...</div>
      </div>
    );
  }

  // No user selected: show persona picker
  if (!activeUserId) {
    return <PersonaPicker onSelect={handleSelectUser} />;
  }

  return (
    <div className="app-container">
      <nav className="top-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`top-nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div className="top-nav-spacer" />
        <button
          className="top-nav-gear"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          &#9881;
        </button>
      </nav>

      <div className="tab-content" key={refreshKey}>
        {tab === 'you' && <YouTab userId={activeUserId} />}
        {tab === 'people' && <PeopleTab userId={activeUserId} />}
        {tab === 'insights' && <InsightsTab userId={activeUserId} onRefresh={handleRefresh} />}
      </div>

      {showSettings && (
        <SettingsOverlay
          activeUserId={activeUserId}
          onSelectUser={handleSelectUser}
          onClose={() => setShowSettings(false)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
