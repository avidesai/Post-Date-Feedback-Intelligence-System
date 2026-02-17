import { createUser, deleteAllUsers } from './models';
import type { CreateUserInput, PreferenceVector } from '../types';

const SEED_USERS: CreateUserInput[] = [
  {
    name: 'Alex Rivera',
    age: 28,
    gender: 'male',
    bio: 'Software engineer who loves hiking and philosophy',
    statedPreferences: [0.9, 0.8, 0.7, 0.3, 0.8],
  },
  {
    name: 'Jordan Lee',
    age: 26,
    gender: 'female',
    bio: 'Freelance designer, yoga enthusiast',
    statedPreferences: [0.7, 0.9, 0.6, 0.5, 0.8],
  },
  {
    name: 'Sam Chen',
    age: 31,
    gender: 'male',
    bio: 'Chef and foodie, knows what he wants',
    statedPreferences: [0.6, 0.5, 0.8, 0.7, 0.6],
  },
  {
    name: 'Maya Patel',
    age: 29,
    gender: 'female',
    bio: 'Grad student in psych, actually pretty self-aware',
    statedPreferences: [0.7, 0.7, 0.5, 0.6, 0.8],
  },
  {
    name: 'Chris Taylor',
    age: 33,
    gender: 'male',
    bio: 'Marketing manager, says hes easy going',
    statedPreferences: [0.5, 0.5, 0.5, 0.5, 0.5],
  },
  {
    name: 'Avery Kim',
    age: 27,
    gender: 'female',
    bio: 'Nurse, genuinely kind, secretly picky',
    statedPreferences: [0.5, 0.6, 0.5, 0.5, 0.5],
  },
  {
    name: 'Riley Morgan',
    age: 25,
    gender: 'non-binary',
    bio: 'Artist, still figuring things out',
    statedPreferences: [0.8, 0.4, 0.9, 0.3, 0.4],
  },
  {
    name: 'Casey Brooks',
    age: 30,
    gender: 'female',
    bio: 'Lawyer going through a growth phase',
    statedPreferences: [0.6, 0.3, 0.4, 0.8, 0.7],
  },
  {
    name: 'Kai Nakamura',
    age: 27,
    gender: 'male',
    bio: 'Personal trainer, physical touch is my love language',
    statedPreferences: [0.4, 0.5, 0.4, 0.9, 0.3],
  },
  {
    name: 'Zoe Williams',
    age: 24,
    gender: 'female',
    bio: 'Dance instructor, vibes are everything',
    statedPreferences: [0.5, 0.6, 0.3, 0.9, 0.4],
  },
  {
    name: 'Ethan Park',
    age: 35,
    gender: 'male',
    bio: 'Nonprofit director, looking for alignment',
    statedPreferences: [0.6, 0.7, 0.5, 0.4, 0.95],
  },
  {
    name: 'Priya Sharma',
    age: 32,
    gender: 'female',
    bio: 'Doctor, family oriented, traditional-ish',
    statedPreferences: [0.5, 0.6, 0.4, 0.5, 0.9],
  },
  {
    name: 'Marcus Johnson',
    age: 29,
    gender: 'male',
    bio: 'Musician who wants someone at his shows',
    statedPreferences: [0.5, 0.4, 0.9, 0.6, 0.5],
  },
  {
    name: 'Luna Garcia',
    age: 26,
    gender: 'female',
    bio: 'Travel blogger, need someone who can keep up',
    statedPreferences: [0.6, 0.5, 0.9, 0.5, 0.4],
  },
  {
    name: 'Noah White',
    age: 28,
    gender: 'male',
    bio: 'Accountant by day, rock climber by weekend',
    statedPreferences: [0.7, 0.6, 0.7, 0.5, 0.6],
  },
  {
    name: 'Isla Thompson',
    age: 30,
    gender: 'female',
    bio: 'Teacher who reads too many romance novels',
    statedPreferences: [0.6, 0.8, 0.5, 0.4, 0.7],
  },
  {
    name: 'Jake Mitchell',
    age: 32,
    gender: 'male',
    bio: 'Startup founder, very sure of himself',
    statedPreferences: [0.3, 0.3, 0.8, 0.9, 0.3],
  },
  {
    name: 'Sophia Davis',
    age: 27,
    gender: 'female',
    bio: 'Influencer, curated life, messier than she seems',
    statedPreferences: [0.4, 0.3, 0.7, 0.9, 0.4],
  },
  {
    name: 'Liam O\'Connor',
    age: 34,
    gender: 'male',
    bio: 'Architect, high standards across the board',
    statedPreferences: [0.85, 0.85, 0.85, 0.85, 0.85],
  },
  {
    name: 'Emma Rodriguez',
    age: 29,
    gender: 'female',
    bio: 'Veterinarian, big heart, bigger expectations',
    statedPreferences: [0.8, 0.9, 0.8, 0.7, 0.8],
  },
  {
    name: 'Dev Agarwal',
    age: 26,
    gender: 'male',
    bio: 'Standup comedian, not looking for anything serious (or is he)',
    statedPreferences: [0.8, 0.2, 0.7, 0.7, 0.2],
  },
  {
    name: 'Mia Zhang',
    age: 31,
    gender: 'female',
    bio: 'Data scientist who overanalyzes her own dating life',
    statedPreferences: [0.7, 0.6, 0.6, 0.5, 0.7],
  },
  {
    name: 'Tyler Green',
    age: 23,
    gender: 'male',
    bio: 'Fresh out of college, figuring it out',
    statedPreferences: [0.5, 0.4, 0.6, 0.8, 0.3],
  },
  {
    name: 'Nadia Hassan',
    age: 28,
    gender: 'female',
    bio: 'Journalist, asks too many questions on dates (occupational hazard)',
    statedPreferences: [0.9, 0.7, 0.6, 0.4, 0.7],
  },
];

export function seedDatabase(): { usersCreated: number } {
  deleteAllUsers();

  let count = 0;
  for (const userData of SEED_USERS) {
    createUser(userData);
    count++;
  }

  console.log(`Seeded ${count} users`);
  return { usersCreated: count };
}

export { SEED_USERS };
