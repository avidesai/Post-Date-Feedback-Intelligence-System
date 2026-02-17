import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDb } from './db';
import userRoutes from './routes/users';
import dateRoutes from './routes/dates';
import feedbackRoutes from './routes/feedback';
import compatibilityRoutes from './routes/compatibility';
import insightsRoutes from './routes/insights';
import simulationRoutes from './routes/simulation';
import placesRoutes from './routes/places';

const app = express();

app.use(cors());
app.use(express.json());

// init database on startup
initDb();

// health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// routes
app.use('/api/users', userRoutes);
app.use('/api/dates', dateRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/dates', placesRoutes); // enrich endpoint lives under /api/dates/:id/enrich

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
