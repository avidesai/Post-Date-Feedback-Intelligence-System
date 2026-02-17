import { useState } from 'react';
import DatesTab from './components/DatesTab';
import FeedbackTab from './components/FeedbackTab';
import InsightsTab from './components/InsightsTab';
import ProfileTab from './components/ProfileTab';

type Tab = 'dates' | 'feedback' | 'insights' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dates', label: 'Dates', icon: '💜' },
  { id: 'feedback', label: 'Feedback', icon: '💬' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dates');

  return (
    <div className="app-container">
      <div className="tab-content">
        {tab === 'dates' && <DatesTab />}
        {tab === 'feedback' && <FeedbackTab />}
        {tab === 'insights' && <InsightsTab />}
        {tab === 'profile' && <ProfileTab />}
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
