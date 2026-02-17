import { Router } from 'express';
import { createUserSchema } from '../schemas';
import * as models from '../db/models';

const router = Router();

// GET /api/users
router.get('/', (_req, res) => {
  const users = models.getAllUsers();
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = models.getUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const user = models.createUser(parsed.data);
  res.status(201).json(user);
});

// PUT /api/users/:id/preferences
router.put('/:id/preferences', (req, res) => {
  const user = models.getUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { statedPreferences } = req.body;
  if (!Array.isArray(statedPreferences) || statedPreferences.length !== 5) {
    res.status(400).json({ error: 'statedPreferences must be array of 5 numbers' });
    return;
  }

  models.updateUserStatedPreferences(req.params.id, statedPreferences as [number, number, number, number, number]);
  const updated = models.getUser(req.params.id);
  res.json(updated);
});

export default router;
