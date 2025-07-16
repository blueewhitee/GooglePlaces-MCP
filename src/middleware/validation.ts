import { Request, Response, NextFunction } from 'express';

export const validateSearchParams = (req: Request, res: Response, next: NextFunction) => {
  const { query, location, radius, type } = req.body;

  // Query is required
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required and must be a non-empty string'
    });
  }

  // Validate location if provided
  if (location) {
    if (!isValidLocation(location)) {
      return res.status(400).json({
        success: false,
        error: 'Location must have valid lat and lng properties'
      });
    }
  }

  // Validate radius if provided
  if (radius !== undefined) {
    if (typeof radius !== 'number' || radius <= 0 || radius > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Radius must be a number between 1 and 50000 meters'
      });
    }
  }

  // Validate type if provided
  if (type !== undefined && (typeof type !== 'string' || type.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Type must be a non-empty string if provided'
    });
  }

  return next();
};

export const validateLocationParams = (req: Request, res: Response, next: NextFunction) => {
  const { location, type, radius } = req.body;

  // Location is required
  if (!location || !isValidLocation(location)) {
    return res.status(400).json({
      success: false,
      error: 'Valid location with lat and lng properties is required'
    });
  }

  // Type is required
  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Type parameter is required and must be a non-empty string'
    });
  }

  // Validate radius if provided
  if (radius !== undefined) {
    if (typeof radius !== 'number' || radius <= 0 || radius > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Radius must be a number between 1 and 50000 meters'
      });
    }
  }

  return next();
};

const isValidLocation = (location: any): boolean => {
  return (
    location &&
    typeof location === 'object' &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  );
}; 