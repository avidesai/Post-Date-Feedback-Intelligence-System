import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User } from '../types';

interface Props {
  onSelect: (userId: string) => void;
}

const FEATURED_NAMES: Record<string, string> = {
  'Alex Rivera': 'Claims conversation is everything',
  'Chris Taylor': 'Says he has no strong preferences',
  'Maya Patel': 'Actually pretty self-aware',
  'Jordan Lee': 'All about emotional connection',
  'Avery Kim': 'Genuinely kind, secretly picky',
  'Jake Mitchell': 'Very sure of what he wants',
};

const FEATURED_ORDER = Object.keys(FEATURED_NAMES);

export default function PersonaPicker({ onSelect }: Props) {
  const { data: users, loading } = useApi(() => api.getUsers());
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="persona-picker">
        <div className="loading"><div className="spinner" /> Loading profiles...</div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="persona-picker">
        <h1 className="persona-picker-heading">
          Be <em>known.</em>
        </h1>
        <p className="persona-picker-sub">
          No profiles found. Run the simulation seed first to create users.
        </p>
      </div>
    );
  }

  // Separate featured vs rest
  const featured: User[] = [];
  const rest: User[] = [];

  for (const name of FEATURED_ORDER) {
    const match = users.find(u => u.name === name);
    if (match) featured.push(match);
  }

  for (const u of users) {
    if (!FEATURED_NAMES[u.name]) rest.push(u);
  }

  const displayUsers = showAll ? [...featured, ...rest] : featured;

  return (
    <div className="persona-picker">
      <h1 className="persona-picker-heading">
        Be <em>known.</em>
      </h1>
      <p className="persona-picker-sub">
        Pick a profile to experience how Known learns what you actually want
      </p>

      <div className="persona-grid">
        {displayUsers.map((user) => (
          <button
            key={user.id}
            className="persona-card"
            onClick={() => onSelect(user.id)}
          >
            <div className="persona-card-name">{user.name}</div>
            <div className="persona-card-age">{user.age} years old</div>
            <div className="persona-card-hint">
              {FEATURED_NAMES[user.name] || user.bio || 'Explore their dating patterns'}
            </div>
          </button>
        ))}
      </div>

      {!showAll && rest.length > 0 && (
        <button className="persona-show-all" onClick={() => setShowAll(true)}>
          Show all {users.length} profiles
        </button>
      )}
    </div>
  );
}
