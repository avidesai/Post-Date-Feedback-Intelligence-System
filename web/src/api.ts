import type {
  User,
  DateRecord,
  Feedback,
  CompatibilityScore,
  PreferenceDriftData,
  UserSummary,
  SimulationResult,
  PreferenceVector,
} from './types';

// in dev, vite proxies /api to localhost:3000 (see vite.config.ts)
// in prod, VITE_API_URL points to the render backend
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// users
export const getUsers = () => request<User[]>('/api/users');
export const getUser = (id: string) => request<User>(`/api/users/${id}`);
export const updatePreferences = (id: string, statedPreferences: PreferenceVector) =>
  request<User>(`/api/users/${id}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({ statedPreferences }),
  });

// dates
export const getDates = () => request<DateRecord[]>('/api/dates');
export const getDatesForUser = (userId: string) => request<DateRecord[]>(`/api/dates/user/${userId}`);

// feedback
export const getFeedbackByUser = (userId: string) => request<Feedback[]>(`/api/feedback/user/${userId}`);
export const submitFeedback = (data: {
  dateId: string;
  fromUserId: string;
  aboutUserId: string;
  overallRating: number;
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  rawText?: string;
}) => request<{ feedback: Feedback; llmExtracted: boolean }>('/api/feedback', {
  method: 'POST',
  body: JSON.stringify(data),
});

// compatibility
export const getCompatibility = (userAId: string, userBId: string) =>
  request<CompatibilityScore>(`/api/compatibility/${userAId}/${userBId}`);
export const getCompatibilityHistory = (userAId: string, userBId: string) =>
  request<CompatibilityScore[]>(`/api/compatibility/${userAId}/${userBId}/history`);

// insights
export const getPreferenceDrift = (userId: string) =>
  request<PreferenceDriftData>(`/api/insights/${userId}/preference-drift`);
export const getUserSummary = (userId: string) =>
  request<UserSummary>(`/api/insights/${userId}/summary`);

// simulation
export const seedSimulation = () =>
  request<{ message: string; usersCreated: number }>('/api/simulation/seed', { method: 'POST' });
export const runSimulation = (config: { rounds: number }) =>
  request<{ message: string; config: any; results: SimulationResult[] }>('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify(config),
  });

// feedback about a user (what others said about them)
export const getFeedbackAboutUser = (userId: string) =>
  request<Feedback[]>(`/api/feedback/about/${userId}`);

// run a single simulation round
export const runSimulationRound = (config: { rounds: number }) =>
  request<{ message: string; config: any; results: SimulationResult[] }>('/api/simulation/run', {
    method: 'POST',
    body: JSON.stringify(config),
  });
