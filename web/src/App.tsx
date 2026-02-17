import { useState, useCallback } from 'react';
import type { PreferenceVector, User, DateRecord } from './types';
import * as api from './api';
import PreferencesScreen from './components/PreferencesScreen';
import DateRatingFlow from './components/DateRatingFlow';
import RevealScreen from './components/RevealScreen';
import Dashboard from './components/Dashboard';

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

/** Try to find a user with at least 3 dates with women (or 3 dates as fallback). */
async function findUserWithDates(users: User[]): Promise<{ user: User; dates: DateInfo[] } | null> {
  const userMap = new Map(users.map(u => [u.id, u]));
  const shuffled = [...users].sort(() => Math.random() - 0.5);

  // First pass: prefer users with 3+ dates with women
  for (const candidate of shuffled) {
    const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
    const withWomen: DateInfo[] = [];

    for (const d of dates) {
      const otherId = d.userAId === candidate.id ? d.userBId : d.userAId;
      const other = userMap.get(otherId);
      if (other && other.gender?.toLowerCase() === 'female') {
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
      if (withWomen.length >= 3) break;
    }

    if (withWomen.length >= 3) {
      return { user: candidate, dates: withWomen.slice(0, 3) };
    }
  }

  // Fallback: any user with 3+ dates
  for (const candidate of shuffled) {
    const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
    if (dates.length >= 3) {
      const picked = dates.slice(0, 3).map(d => {
        const otherId = d.userAId === candidate.id ? d.userBId : d.userAId;
        const other = userMap.get(otherId);
        return {
          dateId: d.id,
          otherUserId: otherId,
          otherName: other?.name || 'Someone',
          otherAge: other?.age || 0,
          otherBio: other?.bio || '',
          venue: d.venueName || 'Coffee date',
          dateAt: d.dateAt,
        };
      });
      return { user: candidate, dates: picked };
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

  const goTo = useCallback((newStep: Step, newSession?: DemoSession) => {
    const s = newSession ?? session;
    setStep(newStep);
    if (newSession) setSession(newSession);
    saveSession(newStep, s);
  }, [session]);

  const handlePreferencesSubmit = async (prefs: PreferenceVector) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all users
      let users: User[] = await api.getUsers();

      // If no users exist, seed the simulation
      if (users.length === 0) {
        await api.seedSimulation();
        await api.runSimulation({ rounds: 3 });
        users = await api.getUsers();
      }

      // Try to find a suitable user
      let result = await findUserWithDates(users);

      // If no suitable user found, reseed and retry
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

      // Update stated preferences to what the user selected
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
    localStorage.removeItem('demo_session');
    setSession(null);
    setStep('preferences');
  };

  if (step === 'preferences') {
    return (
      <PreferencesScreen
        onSubmit={handlePreferencesSubmit}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'rating' && session) {
    return (
      <DateRatingFlow
        userId={session.userId}
        dates={session.dates}
        onComplete={handleRatingComplete}
      />
    );
  }

  if (step === 'reveal' && session) {
    return (
      <RevealScreen
        userId={session.userId}
        statedPreferences={session.statedPreferences}
        onContinue={handleRevealContinue}
      />
    );
  }

  if (step === 'dashboard' && session) {
    return (
      <Dashboard
        userId={session.userId}
        dates={session.dates}
        onStartOver={handleStartOver}
      />
    );
  }

  // Fallback
  return (
    <div className="loading"><div className="spinner" /> Loading...</div>
  );
}
