import { Router } from 'express';
import { lookupVenue } from '../services/places';
import * as models from '../db/models';

const router = Router();

// POST /api/dates/:id/enrich
// look up the venue on google places and enrich the date record
router.post('/:id/enrich', async (req, res) => {
  try {
    const dateRecord = models.getDate(req.params.id);
    if (!dateRecord) {
      res.status(404).json({ error: 'Date not found' });
      return;
    }

    if (!dateRecord.venueName) {
      res.status(400).json({ error: 'Date has no venue name to look up' });
      return;
    }

    const venue = await lookupVenue(dateRecord.venueName);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found on Google Places' });
      return;
    }

    // update the date record with venue context
    models.updateDateVenue(
      dateRecord.id,
      venue.placeId,
      venue.noiseLevel,
      venue.priceLevel,
      venue.ambiance
    );

    res.json({
      dateId: dateRecord.id,
      venue,
    });
  } catch (err) {
    console.error('Enrich error:', err);
    res.status(500).json({ error: 'Failed to enrich date' });
  }
});

export default router;
