import { Router } from 'express';
import { createDateSchema } from '../schemas';
import * as models from '../db/models';

const router = Router();

router.get('/', (_req, res) => {
  const dates = models.getAllDates();
  res.json(dates);
});

router.get('/:id', (req, res) => {
  const dateRecord = models.getDate(req.params.id);
  if (!dateRecord) {
    res.status(404).json({ error: 'Date not found' });
    return;
  }
  res.json(dateRecord);
});

router.get('/user/:userId', (req, res) => {
  const dates = models.getDatesForUser(req.params.userId);
  res.json(dates);
});

router.post('/', (req, res) => {
  const parsed = createDateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  // make sure both users exist
  const userA = models.getUser(parsed.data.userAId);
  const userB = models.getUser(parsed.data.userBId);
  if (!userA || !userB) {
    res.status(404).json({ error: 'One or both users not found' });
    return;
  }

  const dateRecord = models.createDate(parsed.data);
  res.status(201).json(dateRecord);
});

export default router;
