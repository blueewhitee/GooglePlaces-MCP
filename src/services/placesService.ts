import { PlacesClient } from '@googlemaps/places';

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  priceLevel?: number;
  types: string[];
  isOpen?: boolean;
}

export interface PlaceDetails extends PlaceSearchResult {
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  reviews?: Array<{
    rating: number;
    text: string;
    author: string;
    time: string;
  }>;
  photos?: string[];
}

export interface SearchParams {
  query: string;
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number;
  type?: string;
}

class PlacesService {
  private placesClient: PlacesClient;

  constructor() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }

    this.placesClient = new PlacesClient({
      apiKey: apiKey,
    });
  }

  /**
   * Search for places based on text query
   */
  async searchPlaces(params: SearchParams): Promise<PlaceSearchResult[]> {
    try {
      const { query, location, radius = 5000, type } = params;

      const request: any = {
        textQuery: query,
        maxResultCount: 10,
      };

      // Add location bias if provided
      if (location) {
        request.locationBias = {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: radius,
          },
        };
      }

      // Add place type filter if provided
      if (type) {
        request.includedType = type;
      }

      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.priceLevel',
        'places.types',
        'places.currentOpeningHours.openNow'
      ].join(',');

      const response = await this.placesClient.searchText(request, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask,
          },
        },
      });
      
      return this.formatSearchResults(response[0].places || []);
    } catch (error) {
      console.error('Error searching places:', {
        query: params.query,
        location: params.location,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to search places');
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const request = {
        name: `places/${placeId}`,
      };

      const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'priceLevel',
        'types',
        'currentOpeningHours',
        'nationalPhoneNumber',
        'websiteUri',
        'reviews',
        'photos'
      ].join(',');

      const response = await this.placesClient.getPlace(request, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask,
          },
        },
      });
      const place = response[0];

      return this.formatPlaceDetails(place);
    } catch (error) {
      console.error('Error getting place details:', {
        placeId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to get place details');
    }
  }

  /**
   * Find nearby places of a specific type
   */
  async findNearbyPlaces(
    location: { lat: number; lng: number },
    type: string,
    radius: number = 5000
  ): Promise<PlaceSearchResult[]> {
    try {
      const request = {
        includedTypes: [type],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: radius,
          },
        },
      };

      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.priceLevel',
        'places.types',
        'places.currentOpeningHours.openNow'
      ].join(',');

      const response = await this.placesClient.searchNearby(request, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask,
          },
        },
      });
      
      return this.formatSearchResults(response[0].places || []);
    } catch (error) {
      console.error('Error finding nearby places:', {
        location,
        type,
        radius,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to find nearby places');
    }
  }

  private formatSearchResults(places: any[]): PlaceSearchResult[] {
    return places.map(place => ({
      id: place.id || place.name?.split('/').pop(),
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || 'Address not available',
      location: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
      },
      rating: place.rating,
      priceLevel: place.priceLevel,
      types: place.types || [],
      isOpen: place.currentOpeningHours?.openNow,
    }));
  }

  private formatPlaceDetails(place: any): PlaceDetails {
    const baseInfo = this.formatSearchResults([place])[0];
    
    return {
      ...baseInfo,
      phoneNumber: place.nationalPhoneNumber,
      website: place.websiteUri,
      openingHours: place.currentOpeningHours?.weekdayDescriptions || [],
      reviews: place.reviews?.slice(0, 5).map((review: any) => ({
        rating: review.rating,
        text: review.text?.text || '',
        author: review.authorAttribution?.displayName || 'Anonymous',
        time: review.publishTime,
      })) || [],
      photos: place.photos?.slice(0, 5).map((photo: any) => {
        // Use the photo reference properly according to Places API v1
        const photoName = photo.name || photo.photoReference;
        return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.GOOGLE_PLACES_API_KEY}`;
      }) || [],
    };
  }
}

// Lazy initialization - only create when first accessed
let _placesService: PlacesService | null = null;

export const placesService = {
  get instance(): PlacesService {
    if (!_placesService) {
      _placesService = new PlacesService();
    }
    return _placesService;
  },
  
  // Proxy all methods to the lazy instance
  async searchPlaces(params: SearchParams) {
    return this.instance.searchPlaces(params);
  },
  
  async getPlaceDetails(placeId: string) {
    return this.instance.getPlaceDetails(placeId);
  },
  
  async findNearbyPlaces(location: { lat: number; lng: number }, type: string, radius: number = 5000) {
    return this.instance.findNearbyPlaces(location, type, radius);
  }
}; 