#!/usr/bin/env node

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables before importing services
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error('Error: GOOGLE_PLACES_API_KEY environment variable is required');
  console.error('Please ensure your .env file contains: GOOGLE_PLACES_API_KEY=your_api_key_here');
  process.exit(1);
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { placesService, SearchParams } from './services/placesService.js';

// MCP Server Implementation for TalkForce.ai Location Services
class TalkForceMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'talkforce-places',
        version: '1.0.0',
        description: 'AI-powered location services providing place search, nearby discovery, and detailed place information',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_places',
            description: 'Search for places using natural language queries with optional location bias and filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query (e.g., "best pizza near me", "coffee shops in downtown")',
                },
                location: {
                  type: 'object',
                  description: 'Optional location to bias search results',
                  properties: {
                    lat: {
                      type: 'number',
                      description: 'Latitude coordinate',
                      minimum: -90,
                      maximum: 90,
                    },
                    lng: {
                      type: 'number',
                      description: 'Longitude coordinate',
                      minimum: -180,
                      maximum: 180,
                    },
                  },
                  required: ['lat', 'lng'],
                },
                radius: {
                  type: 'number',
                  description: 'Search radius in meters (default: 5000, max: 50000)',
                  minimum: 1,
                  maximum: 50000,
                },
                type: {
                  type: 'string',
                  description: 'Optional place type filter (e.g., "restaurant", "gas_station", "hospital")',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'find_nearby_places',
            description: 'Find places of a specific type within a radius of a given location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'object',
                  description: 'Center location for the search',
                  properties: {
                    lat: {
                      type: 'number',
                      description: 'Latitude coordinate',
                      minimum: -90,
                      maximum: 90,
                    },
                    lng: {
                      type: 'number',
                      description: 'Longitude coordinate',
                      minimum: -180,
                      maximum: 180,
                    },
                  },
                  required: ['lat', 'lng'],
                },
                type: {
                  type: 'string',
                  description: 'Type of place to search for (e.g., "restaurant", "gas_station", "hospital", "pharmacy")',
                },
                radius: {
                  type: 'number',
                  description: 'Search radius in meters (default: 5000, max: 50000)',
                  minimum: 1,
                  maximum: 50000,
                },
              },
              required: ['location', 'type'],
            },
          },
          {
            name: 'get_place_details',
            description: 'Get comprehensive details about a specific place including contact info, reviews, photos, and hours',
            inputSchema: {
              type: 'object',
              properties: {
                placeId: {
                  type: 'string',
                  description: 'Unique identifier for the place (obtained from search results)',
                },
              },
              required: ['placeId'],
            },
          },
          {
            name: 'get_place_types',
            description: 'Get a list of all supported place types for searching',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_places':
            return await this.handleSearchPlaces(args as any);

          case 'find_nearby_places':
            return await this.handleFindNearbyPlaces(args as any);

          case 'get_place_details':
            return await this.handleGetPlaceDetails(args as any);

          case 'get_place_types':
            return await this.handleGetPlaceTypes();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleSearchPlaces(args: {
    query: string;
    location?: { lat: number; lng: number };
    radius?: number;
    type?: string;
  }) {
    const searchParams: SearchParams = {
      query: args.query,
      ...(args.location && { location: args.location }),
      ...(args.radius && { radius: args.radius }),
      ...(args.type && { type: args.type }),
    };

    const results = await placesService.searchPlaces(searchParams);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Found ${results.length} places for "${args.query}"`,
              count: results.length,
              results: results.map(place => ({
                id: place.id,
                name: place.name,
                address: place.address,
                location: place.location,
                rating: place.rating,
                priceLevel: place.priceLevel,
                types: place.types,
                isOpen: place.isOpen,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleFindNearbyPlaces(args: {
    location: { lat: number; lng: number };
    type: string;
    radius?: number;
  }) {
    const radius = args.radius || 5000;
    const results = await placesService.findNearbyPlaces(args.location, args.type, radius);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Found ${results.length} ${args.type} places nearby`,
              count: results.length,
              searchParams: {
                location: args.location,
                type: args.type,
                radius,
              },
              results: results.map(place => ({
                id: place.id,
                name: place.name,
                address: place.address,
                location: place.location,
                rating: place.rating,
                priceLevel: place.priceLevel,
                types: place.types,
                isOpen: place.isOpen,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetPlaceDetails(args: { placeId: string }) {
    const placeDetails = await placesService.getPlaceDetails(args.placeId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Details for ${placeDetails.name}`,
              placeDetails: {
                id: placeDetails.id,
                name: placeDetails.name,
                address: placeDetails.address,
                location: placeDetails.location,
                rating: placeDetails.rating,
                priceLevel: placeDetails.priceLevel,
                types: placeDetails.types,
                isOpen: placeDetails.isOpen,
                phoneNumber: placeDetails.phoneNumber,
                website: placeDetails.website,
                openingHours: placeDetails.openingHours,
                reviews: placeDetails.reviews?.slice(0, 5), // Limit reviews for readability
                photos: placeDetails.photos?.slice(0, 3), // Limit photos for performance
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetPlaceTypes() {
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
      'veterinary_care',
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Available place types for AI agent searches',
              count: commonTypes.length,
              placeTypes: commonTypes,
              usage: 'Use these types with find_nearby_places or as type filter in search_places',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('TalkForce.ai MCP Server running on stdio');
  }
}

// Start the MCP server
async function main() {
  try {
    // Double-check environment variable is still available
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }
    
    console.error('Starting TalkForce.ai MCP Server...');
    console.error('Google Places API Key loaded:', process.env.GOOGLE_PLACES_API_KEY ? '✅ Yes' : '❌ No');
    
    const server = new TalkForceMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main(); 