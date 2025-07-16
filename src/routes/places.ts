import express from 'express';
import { placesService, SearchParams } from '../services/placesService';
import { validateSearchParams, validateLocationParams } from '../middleware/validation';

const router = express.Router();

/**
 * POST /api/places/search
 * Search for places based on text query
 * Body: { query: string, location?: {lat: number, lng: number}, radius?: number, type?: string }
 */
router.post('/search', validateSearchParams, async (req, res, next) => {
  try {
    const searchParams: SearchParams = req.body;
    const results = await placesService.searchPlaces(searchParams);
    
    return res.json({
      success: true,
      data: results,
      count: results.length,
      message: `Found ${results.length} places for "${searchParams.query}"`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/places/:placeId
 * Get detailed information about a specific place
 */
router.get('/:placeId', async (req, res, next) => {
  try {
    const { placeId } = req.params;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Place ID is required'
      });
    }

    const placeDetails = await placesService.getPlaceDetails(placeId);
    
    return res.json({
      success: true,
      data: placeDetails,
      message: `Details for ${placeDetails.name}`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/places/nearby
 * Find nearby places of a specific type
 * Body: { location: {lat: number, lng: number}, type: string, radius?: number }
 */
router.post('/nearby', validateLocationParams, async (req, res, next) => {
  try {
    const { location, type, radius = 5000 } = req.body;
    
    const results = await placesService.findNearbyPlaces(location, type, radius);
    
    return res.json({
      success: true,
      data: results,
      count: results.length,
      message: `Found ${results.length} ${type} places nearby`
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/places/types
 * Get available place types for AI agents
 */
router.get('/types', (req, res) => {
  const commonTypes = [
    'restaurant',
    'gas_station',
    'hospital',
    'pharmacy',
    'bank',
    'atm',
    'shopping_mall',
    'grocery_store',
    'hotel',
    'tourist_attraction',
    'park',
    'school',
    'university',
    'gym',
    'movie_theater',
    'library',
    'church',
    'mosque',
    'synagogue',
    'police',
    'fire_station',
    'post_office',
    'car_rental',
    'car_repair',
    'beauty_salon',
    'hair_care',
    'dentist',
    'doctor',
    'veterinary_care'
  ];

  return res.json({
    success: true,
    data: commonTypes,
    message: 'Available place types for search'
  });
});

export { router as placesRouter }; 