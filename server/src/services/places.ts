import { config } from '../config';
import type { VenueContext } from '../types';

// google places api (new) integration
// we use text search to find the venue, then extract useful context

interface PlacesTextSearchResult {
  places: Array<{
    id: string;
    displayName: { text: string };
    rating?: number;
    priceLevel?: string;
    types?: string[];
    primaryType?: string;
    editorialSummary?: { text: string };
    currentOpeningHours?: any;
    regularOpeningHours?: any;
  }>;
}

// map google's price levels to numbers
function parsePriceLevel(level?: string): number {
  const map: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return map[level || ''] ?? 2;
}

// guess noise level from place types
function inferNoiseLevel(types: string[]): string {
  const loud = ['night_club', 'bar', 'concert_hall', 'bowling_alley', 'amusement_park'];
  const quiet = ['library', 'museum', 'art_gallery', 'park', 'spa', 'book_store'];
  const moderate = ['restaurant', 'cafe', 'coffee_shop', 'bakery'];

  for (const t of types) {
    if (loud.includes(t)) return 'loud';
    if (quiet.includes(t)) return 'quiet';
  }
  for (const t of types) {
    if (moderate.includes(t)) return 'moderate';
  }
  return 'moderate';
}

// guess ambiance from types and editorial summary
function inferAmbiance(types: string[], summary?: string): string {
  if (summary) {
    const lower = summary.toLowerCase();
    if (lower.includes('romantic') || lower.includes('intimate') || lower.includes('cozy')) return 'romantic';
    if (lower.includes('lively') || lower.includes('energetic') || lower.includes('vibrant')) return 'lively';
    if (lower.includes('casual') || lower.includes('laid-back') || lower.includes('relaxed')) return 'casual';
    if (lower.includes('upscale') || lower.includes('elegant') || lower.includes('fine dining')) return 'upscale';
  }

  if (types.includes('night_club') || types.includes('bar')) return 'lively';
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'casual';
  if (types.includes('fine_dining_restaurant')) return 'upscale';
  if (types.includes('park') || types.includes('garden')) return 'relaxed';

  return 'casual';
}

export async function lookupVenue(venueName: string): Promise<VenueContext | null> {
  if (!config.googlePlacesApiKey) {
    console.log('No Google Places API key, skipping venue lookup');
    return null;
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.priceLevel,places.types,places.primaryType,places.editorialSummary',
      },
      body: JSON.stringify({
        textQuery: venueName,
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      console.error('Places API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as PlacesTextSearchResult;
    const place = data.places?.[0];
    if (!place) return null;

    const types = place.types || [];
    const summary = place.editorialSummary?.text;

    return {
      name: place.displayName.text,
      placeId: place.id,
      noiseLevel: inferNoiseLevel(types),
      priceLevel: parsePriceLevel(place.priceLevel),
      ambiance: inferAmbiance(types, summary),
      rating: place.rating || 0,
      types,
    };
  } catch (err) {
    console.error('Places lookup failed:', err);
    return null;
  }
}
