import { useState, useCallback } from 'react';
import type { PreferenceVector, User, DateRecord } from './types';
import * as api from './api';
import PreferencesScreen from './components/PreferencesScreen';
import DateRatingFlow from './components/DateRatingFlow';
import RevealScreen from './components/RevealScreen';
import Dashboard from './components/Dashboard';
import HowItWorksModal from './components/HowItWorksModal';

type Step = 'preferences' | 'rating' | 'reveal' | 'dashboard';

interface DateInfo {
  dateId: string;
  otherUserId: string;
  otherName: string;
  otherAge: number;
  otherBio: string;
  venue: string;
  dateAt: string;
}

interface DemoSession {
  userId: string;
  statedPreferences: PreferenceVector;
  dates: DateInfo[];
}

function loadSession(): { step: Step; session: DemoSession | null } {
  try {
    const raw = localStorage.getItem('demo_session');
    if (!raw) return { step: 'preferences', session: null };
    const parsed = JSON.parse(raw);
    return { step: parsed.step || 'preferences', session: parsed.session || null };
  } catch {
    return { step: 'preferences', session: null };
  }
}

function saveSession(step: Step, session: DemoSession | null) {
  localStorage.setItem('demo_session', JSON.stringify({ step, session }));
}

async function findUserWithDates(users: User[]): Promise<{ user: User; dates: DateInfo[] } | null> {
  const userMap = new Map(users.map(u => [u.id, u]));
  const shuffled = [...users].sort(() => Math.random() - 0.5);

  for (const candidate of shuffled) {
    const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
    const withWomen: DateInfo[] = [];

    const seenOtherIds = new Set<string>();
    for (const d of dates) {
      const otherId = d.userAId === candidate.id ? d.userBId : d.userAId;
      if (seenOtherIds.has(otherId)) continue;
      const other = userMap.get(otherId);
      if (other && other.gender?.toLowerCase() === 'female') {
        seenOtherIds.add(otherId);
        withWomen.push({
          dateId: d.id,
          otherUserId: otherId,
          otherName: other.name,
          otherAge: other.age,
          otherBio: other.bio || '',
          venue: d.venueName || 'Coffee date',
          dateAt: d.dateAt,
        });
      }
      if (withWomen.length >= 2) break;
    }

    if (withWomen.length >= 2) {
      return { user: candidate, dates: withWomen.slice(0, 2) };
    }
  }

  for (const candidate of shuffled) {
    const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
    if (dates.length >= 2) {
      const picked: DateInfo[] = [];
      const seenIds = new Set<string>();
      for (const d of dates) {
        const otherId = d.userAId === candidate.id ? d.userBId : d.userAId;
        if (seenIds.has(otherId)) continue;
        seenIds.add(otherId);
        const other = userMap.get(otherId);
        picked.push({
          dateId: d.id,
          otherUserId: otherId,
          otherName: other?.name || 'Someone',
          otherAge: other?.age || 0,
          otherBio: other?.bio || '',
          venue: d.venueName || 'Coffee date',
          dateAt: d.dateAt,
        });
        if (picked.length >= 2) break;
      }
      if (picked.length >= 2) {
        return { user: candidate, dates: picked };
      }
    }
  }

  return null;
}

export default function App() {
  const initial = loadSession();
  const [step, setStep] = useState<Step>(initial.step);
  const [session, setSession] = useState<DemoSession | null>(initial.session);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiwOpen, setHiwOpen] = useState(false);

  const goTo = useCallback((newStep: Step, newSession?: DemoSession) => {
    const s = newSession ?? session;
    setStep(newStep);
    if (newSession) setSession(newSession);
    saveSession(newStep, s);
    window.scrollTo(0, 0);
  }, [session]);

  const handlePreferencesSubmit = async (prefs: PreferenceVector) => {
    setLoading(true);
    setError(null);
    try {
      let users: User[] = await api.getUsers();

      if (users.length === 0) {
        await api.seedSimulation();
        await api.runSimulation({ rounds: 3 });
        users = await api.getUsers();
      }

      let result = await findUserWithDates(users);

      if (!result) {
        await api.seedSimulation();
        await api.runSimulation({ rounds: 3 });
        users = await api.getUsers();
        result = await findUserWithDates(users);
      }

      if (!result) {
        setError('Something went wrong setting up dates. Please try again.');
        return;
      }

      await api.updatePreferences(result.user.id, prefs);

      const newSession: DemoSession = {
        userId: result.user.id,
        statedPreferences: prefs,
        dates: result.dates,
      };

      goTo('rating', newSession);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingComplete = () => {
    goTo('reveal');
  };

  const handleRevealContinue = () => {
    goTo('dashboard');
  };

  const handleStartOver = () => {
    if (session?.userId) {
      localStorage.removeItem(`rating_progress_${session.userId}`);
    }
    localStorage.removeItem('demo_session');
    setSession(null);
    setStep('preferences');
  };

  let content;

  if (step === 'preferences') {
    content = (
      <PreferencesScreen
        onSubmit={handlePreferencesSubmit}
        loading={loading}
        error={error}
      />
    );
  } else if (step === 'rating' && session) {
    content = (
      <DateRatingFlow
        userId={session.userId}
        dates={session.dates}
        onComplete={handleRatingComplete}
      />
    );
  } else if (step === 'reveal' && session) {
    content = (
      <RevealScreen
        userId={session.userId}
        statedPreferences={session.statedPreferences}
        onContinue={handleRevealContinue}
      />
    );
  } else if (step === 'dashboard' && session) {
    content = (
      <Dashboard
        userId={session.userId}
        dates={session.dates}
        onStartOver={handleStartOver}
      />
    );
  } else {
    content = (
      <div className="loading"><div className="spinner" /> Loading...</div>
    );
  }

  return (
    <>
      <div className="top-actions">
        {step !== 'preferences' && (
          <button className="start-over-trigger" onClick={handleStartOver}>
            Start over
          </button>
        )}
        <button className="hiw-trigger" onClick={() => setHiwOpen(true)}>
          How it works
        </button>
      </div>
      <HowItWorksModal open={hiwOpen} onClose={() => setHiwOpen(false)} />
      {content}
    </>
  );
}
