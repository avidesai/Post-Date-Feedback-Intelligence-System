import Constants from 'expo-constants';
import type {
  User,
  DateRecord,
  Feedback,
  CompatibilityScore,
  PreferenceDriftData,
  UserInsightsSummary,
  SimulationResponse,
  PreferenceVector,
} from '@/types/api';

// EXPO_PUBLIC_ vars get inlined at build time
// set EXPO_PUBLIC_API_URL when building for production
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const DEV_API_URL = 'http://localhost:3000';

function getBaseUrl(): string {
  // production build has the URL baked in
  if (PROD_API_URL) {
    return PROD_API_URL;
  }
  // dev: try to use the expo debugger host (works for simulators + devices on same network)
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) {
    return `http://${debuggerHost}:3000`;
  }
  return DEV_API_URL;
}

const BASE_URL = getBaseUrl();

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}/api${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json();
}

// -- Users --

export function getUsers(): Promise<User[]> {
  return request('/users');
}

export function getUser(id: string): Promise<User> {
  return request(`/users/${id}`);
}

export function updatePreferences(userId: string, statedPreferences: PreferenceVector): Promise<User> {
  return request(`/users/${userId}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({ statedPreferences }),
  });
}

// -- Dates --

export function getDates(): Promise<DateRecord[]> {
  return request('/dates');
}

export function getUserDates(userId: string): Promise<DateRecord[]> {
  return request(`/dates/user/${userId}`);
}

// -- Feedback --

export function getUserFeedback(userId: string): Promise<Feedback[]> {
  return request(`/feedback/user/${userId}`);
}

export function submitFeedback(data: {
  dateId: string;
  fromUserId: string;
  aboutUserId: string;
  overallRating?: number;
  conversationScore?: number;
  emotionalScore?: number;
  interestsScore?: number;
  chemistryScore?: number;
  valuesScore?: number;
  bestPart?: string;
  worstPart?: string;
  chemistryText?: string;
  rawText?: string;
}): Promise<{ feedback: Feedback; llmExtracted: boolean }> {
  return request('/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// -- Compatibility --

export function getCompatibility(userAId: string, userBId: string): Promise<CompatibilityScore> {
  return request(`/compatibility/${userAId}/${userBId}`);
}

export function getCompatibilityHistory(userAId: string, userBId: string): Promise<CompatibilityScore[]> {
  return request(`/compatibility/${userAId}/${userBId}/history`);
}

// -- Insights --

export function getPreferenceDrift(userId: string): Promise<PreferenceDriftData> {
  return request(`/insights/${userId}/preference-drift`);
}

export function getUserInsights(userId: string): Promise<UserInsightsSummary> {
  return request(`/insights/${userId}/summary`);
}

// -- Simulation --

export function seedSimulation(): Promise<{ message: string; usersCreated: number }> {
  return request('/simulation/seed', { method: 'POST' });
}

export function runSimulation(config?: {
  userCount?: number;
  iterationsPerRound?: number;
  rounds?: number;
}): Promise<SimulationResponse> {
  return request('/simulation/run', {
    method: 'POST',
    body: JSON.stringify(config || {}),
  });
}

export function getSimulationStatus(): Promise<{
  totalUsers: number;
  totalDates: number;
  usersWithFeedback: number;
}> {
  return request('/simulation/status');
}
