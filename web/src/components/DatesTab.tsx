import { useState } from 'react';
import { useApi } from '../hooks';
import * as api from '../api';
import type { User, DateRecord } from '../types';

export default function DatesTab() {
  const { data: users, loading: usersLoading } = useApi(() => api.getUsers());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { data: dates, loading: datesLoading, refetch } = useApi(
    () => selectedUser ? api.getDatesForUser(selectedUser) : api.getDates(),
    [selectedUser]
  );

  if (usersLoading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  return (
    <div>
      <h1 className="page-header">Dates</h1>

      {users && users.length > 0 && (
        <div className="user-chips">
          <button
            className={`user-chip ${!selectedUser ? 'active' : ''}`}
            onClick={() => setSelectedUser(null)}
          >
            All
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              className={`user-chip ${selectedUser === u.id ? 'active' : ''}`}
              onClick={() => setSelectedUser(u.id)}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      {datesLoading && <div className="loading"><div className="spinner" /> Loading dates...</div>}

      {!datesLoading && dates && dates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>No dates yet. Run a simulation from the Profile tab to generate some data.</p>
        </div>
      )}

      {dates && dates.map((d) => (
        <DateCard key={d.id} date={d} users={users || []} />
      ))}
    </div>
  );
}

function DateCard({ date, users }: { date: DateRecord; users: User[] }) {
  const partner = users.find(u => u.id === date.userBId) || users.find(u => u.id === date.userAId);
  const initial = (date.userBName || partner?.name || '?')[0].toUpperCase();

  return (
    <div className="date-card">
      <div className="date-avatar">{initial}</div>
      <div className="date-info">
        <div className="date-name">
          {date.userAName || 'User A'} & {date.userBName || 'User B'}
        </div>
        <div className="date-venue">{date.venue || 'Unknown venue'}</div>
      </div>
    </div>
  );
}
