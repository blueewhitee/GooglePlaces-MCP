import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Google Places API errors
  if (error.message?.includes('quota') || error.code === 'OVER_QUERY_LIMIT') {
    return res.status(429).json({
      success: false,
      error: 'API quota exceeded. Please try again later.',
      code: 'QUOTA_EXCEEDED'
    });
  }

  if (error.message?.includes('API key') || error.code === 'REQUEST_DENIED') {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key configuration.',
      code: 'INVALID_API_KEY'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // Default server error
  return res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
}; 