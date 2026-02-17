import { Router } from 'express';
import { simulationConfigSchema } from '../schemas';
import { seedSimulation, runFullSimulation, runSimulationRound } from '../services/simulation';
import * as models from '../db/models';

const router = Router();

// reset and seed the database with synthetic users
router.post('/seed', (_req, res) => {
  try {
    const result = seedSimulation();
    res.json({ message: 'Database seeded', ...result });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// run a full simulation (seed + multiple rounds)
router.post('/run', (req, res) => {
  try {
    const parsed = simulationConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid config', details: parsed.error.flatten() });
      return;
    }

    const results = runFullSimulation(parsed.data);
    res.json({
      message: 'Simulation complete',
      config: parsed.data,
      results,
    });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// run a single round (doesnt re-seed)
router.post('/round', (req, res) => {
  try {
    const round = req.body.round || 0;
    const useCompatibilityPairing = req.body.useCompatibilityPairing || false;
    const result = runSimulationRound(round, useCompatibilityPairing);
    res.json(result);
  } catch (err) {
    console.error('Round error:', err);
    res.status(500).json({ error: 'Round failed' });
  }
});

// get current state of simulated data
router.get('/status', (_req, res) => {
  const users = models.getAllUsers();
  const dates = models.getAllDates();

  res.json({
    totalUsers: users.length,
    totalDates: dates.length,
    usersWithFeedback: users.filter(u => u.feedbackCount > 0).length,
  });
});

export default router;
