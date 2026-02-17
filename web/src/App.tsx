import { useState, useCallback } from 'react';
import type { PreferenceVector, User, DateRecord } from './types';
import * as api from './api';
import PreferencesScreen from './components/PreferencesScreen';
import DateRatingFlow from './components/DateRatingFlow';
import RevealScreen from './components/RevealScreen';
import Dashboard from './components/Dashboard';

type Step = 'preferences' | 'rating' | 'reveal' | 'dashboard';

interface DemoSession {
  userId: string;
  statedPreferences: PreferenceVector;
  dates: {
    dateId: string;
    otherUserId: string;
    otherName: string;
    otherAge: number;
    otherBio: string;
    venue: string;
    dateAt: string;
  }[];
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

      // Pick a user with dates — prefer one with female dates
      let pickedUser: User | null = null;
      let pickedDates: {
        dateId: string;
        otherUserId: string;
        otherName: string;
        otherAge: number;
        otherBio: string;
        venue: string;
        dateAt: string;
      }[] = [];

      // Build user map
      const userMap = new Map(users.map(u => [u.id, u]));

      // Try each user to find one with 3+ dates with women
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
        const withWomen: typeof pickedDates = [];

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
          pickedUser = candidate;
          pickedDates = withWomen.slice(0, 3);
          break;
        }
      }

      // Fallback: if no user has 3 dates with women, just use first user with 3+ dates
      if (!pickedUser) {
        for (const candidate of shuffled) {
          const dates: DateRecord[] = await api.getDatesForUser(candidate.id);
          if (dates.length >= 3) {
            pickedUser = candidate;
            pickedDates = dates.slice(0, 3).map(d => {
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
            break;
          }
        }
      }

      if (!pickedUser) {
        setError('Could not find a user with enough dates. Try reseeding.');
        return;
      }

      // Update stated preferences to what the user selected
      await api.updatePreferences(pickedUser.id, prefs);

      const newSession: DemoSession = {
        userId: pickedUser.id,
        statedPreferences: prefs,
        dates: pickedDates,
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
