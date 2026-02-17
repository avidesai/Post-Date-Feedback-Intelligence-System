import { useState } from 'react';
import HomeTab from './components/HomeTab';
import InsightsTab from './components/InsightsTab';
import FeedbackTab from './components/FeedbackTab';
import ProfileTab from './components/ProfileTab';

type Tab = 'home' | 'insights' | 'feedback' | 'explore';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'feedback', label: 'Feedback', icon: '💬' },
  { id: 'explore', label: 'Explore', icon: '🔍' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [hasData, setHasData] = useState(false);

  return (
    <div className="app-container">
      <div className="tab-content">
        {tab === 'home' && (
          <HomeTab
            onDataReady={() => { setHasData(true); setTab('insights'); }}
            hasData={hasData}
          />
        )}
        {tab === 'insights' && <InsightsTab />}
        {tab === 'feedback' && <FeedbackTab />}
        {tab === 'explore' && <ProfileTab />}
      </div>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
