import type { User, DateRecord, Feedback, CompatibilityScore, DivergenceResult, PreferenceSnapshot, SimulationResult } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// users
export const getUsers = () => request<User[]>('/api/users');
export const getUser = (id: string) => request<User>(`/api/users/${id}`);
export const createUser = (data: { name: string; age: number; bio?: string; statedPreferences: number[] }) =>
  request<User>('/api/users', { method: 'POST', body: JSON.stringify(data) });
export const updatePreferences = (id: string, statedPreferences: number[]) =>
  request<User>(`/api/users/${id}/preferences`, { method: 'PUT', body: JSON.stringify({ statedPreferences }) });

// dates
export const getDates = () => request<DateRecord[]>('/api/dates');
export const getDatesForUser = (userId: string) => request<DateRecord[]>(`/api/dates/user/${userId}`);
export const createDate = (data: { userAId: string; userBId: string; venue: string; notes?: string }) =>
  request<DateRecord>('/api/dates', { method: 'POST', body: JSON.stringify(data) });

// feedback
export const submitFeedback = (data: {
  dateId: string;
  reviewerId: string;
  reviewedId: string;
  overallRating: number;
  dimensionScores: Record<string, number>;
  textFeedback: string;
}) => request<Feedback>('/api/feedback', { method: 'POST', body: JSON.stringify(data) });
export const getFeedbackForUser = (userId: string) => request<Feedback[]>(`/api/feedback/user/${userId}`);

// compatibility
export const getCompatibility = (userAId: string, userBId: string) =>
  request<CompatibilityScore>(`/api/compatibility/${userAId}/${userBId}`);
export const getCompatibilityHistory = (userAId: string, userBId: string) =>
  request<CompatibilityScore[]>(`/api/compatibility/${userAId}/${userBId}/history`);

// insights
export const getPreferenceDrift = (userId: string) =>
  request<{ divergence: DivergenceResult; history: PreferenceSnapshot[] }>(`/api/insights/${userId}/preference-drift`);
export const getUserSummary = (userId: string) =>
  request<{ user: User; divergence: DivergenceResult; recentFeedback: Feedback[]; topInsights: string[] }>(`/api/insights/${userId}/summary`);

// simulation
export const seedSimulation = () => request<{ message: string }>('/api/simulation/seed', { method: 'POST' });
export const runSimulation = (config?: { rounds?: number; pairingsPerRound?: number; useSmartPairing?: boolean }) =>
  request<{ results: SimulationResult[] }>('/api/simulation/run', { method: 'POST', body: JSON.stringify(config || {}) });
export const runSimulationRound = (config?: { pairingsPerRound?: number; useSmartPairing?: boolean }) =>
  request<SimulationResult>('/api/simulation/round', { method: 'POST', body: JSON.stringify(config || {}) });
