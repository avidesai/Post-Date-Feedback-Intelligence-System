import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDb } from './db';
import * as models from './db/models';
import { runFullSimulation } from './services/simulation';
import userRoutes from './routes/users';
import dateRoutes from './routes/dates';
import feedbackRoutes from './routes/feedback';
import compatibilityRoutes from './routes/compatibility';
import insightsRoutes from './routes/insights';
import simulationRoutes from './routes/simulation';
import placesRoutes from './routes/places';
import extractRoutes from './routes/extract';
import ttsRoutes from './routes/tts';

const app = express();

app.use(cors());
app.use(express.json());

initDb();

const users = models.getAllUsers();
if (users.length === 0) {
  console.log('Empty database detected, running initial simulation...');
  const results = runFullSimulation({ userCount: 24, iterationsPerRound: 1, rounds: 5 });
  console.log(`Simulation complete: ${results.length} rounds, ${results.reduce((s, r) => s + r.pairings.length, 0)} dates`);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/dates', dateRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/dates', placesRoutes); // enrich endpoint lives under /api/dates/:id/enrich
app.use('/api/extract', extractRoutes);
app.use('/api/tts', ttsRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
