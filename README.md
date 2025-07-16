
 **Model Context Protocol (MCP) server** that provides location services as tools for AI assistants. Built on Google Places API, it enables AI agents to search for places, find nearby locations, and get detailed place information.


## 🛠️ Available Tools

### 1. `search_places`
Search for places using natural language queries with optional location bias.

**Parameters:**
- `query` (required): Natural language search query
- `location` (optional): `{lat: number, lng: number}` - Location to bias results
- `radius` (optional): Search radius in meters (max: 50,000)
- `type` (optional): Place type filter (e.g., "restaurant", "hospital")

**Example:**
```json
{
  "query": "best pizza restaurants in New York",
  "location": {"lat": 40.7128, "lng": -73.0060},
  "radius": 5000,
  "type": "restaurant"
}
```

### 2. `find_nearby_places`
Find places of a specific type within a radius of a location.

**Parameters:**
- `location` (required): `{lat: number, lng: number}` - Center point
- `type` (required): Place type (e.g., "gas_station", "pharmacy")
- `radius` (optional): Search radius in meters (default: 5000)

**Example:**
```json
{
  "location": {"lat": 40.7128, "lng": -73.0060},
  "type": "hospital",
  "radius": 2000
}
```

### 3. `get_place_details`
Get comprehensive details about a specific place.

**Parameters:**
- `placeId` (required): Unique place identifier from search results

**Example:**
```json
{
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4"
}
```

### 4. `get_place_types`
Get a list of all supported place types.

**Parameters:** None

## Setup & Installation

### Prerequisites
- Node.js 18+ 
- Google Places API Key

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 3. Build the MCP Server
```bash
npm run build:mcp
```

### 4. Test the MCP Server
```bash
npm run mcp:dev
```

## 🔗 Connecting AI Assistants

### Claude Desktop (Anthropic)
Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "talkforce-places": {
      "command": "node",
      "args": ["path/to/talkforce.ai/dist/mcp-server.js"],
      "env": {
        "GOOGLE_PLACES_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Other MCP-Compatible Clients
Use the stdio transport with:
```bash
node dist/mcp-server.js
```

## 💡 Example AI Conversations

Once connected, AI assistants can use these tools naturally:

**User:** "Find Italian restaurants near Times Square"

**AI Assistant:** *Uses `search_places` with query "Italian restaurants" and location near Times Square*

**User:** "Get details about the first restaurant"

**AI Assistant:** *Uses `get_place_details` with the place ID from previous results*

**User:** "Find hospitals within 1km of Central Park"

**AI Assistant:** *Uses `find_nearby_places` with Central Park coordinates and type "hospital"*

## 🔧 Development

### Run in Development Mode
```bash
# MCP Server
npm run mcp:dev

# Web API (for testing)
npm run dev
```

### Project Structure
```
src/
├── mcp-server.ts        # MCP Server implementation
├── server.ts            # Express REST API (for demo)
├── services/
│   └── placesService.ts # Google Places API integration
└── routes/
    └── places.ts        # REST API routes
```

## 📊 Supported Place Types

The server supports 29+ place types including:
- `restaurant`, `gas_station`, `hospital`, `pharmacy`
- `bank`, `atm`, `shopping_mall`, `grocery_store`
- `hotel`, `tourist_attraction`, `park`, `school`
- `gym`, `movie_theater`, `library`, `church`
- `police`, `fire_station`, `post_office`
- And many more...

Use `get_place_types` tool to get the complete list.

## 🌟 Features

✅ **Real-time Data**: Live place information from Google Places API  
✅ **Natural Language**: AI can search using conversational queries  
✅ **Location Aware**: Precise coordinate-based searching  
✅ **Comprehensive Details**: Photos, reviews, hours, contact info  
✅ **Type Filtering**: Search by specific business categories  
✅ **Error Handling**: Robust error management and validation  
✅ **Production Ready**: Built for scale and reliability  

## 📝 Response Format

All tools return structured JSON responses:

```json
{
  "success": true,
  "message": "Found 5 places for 'pizza restaurants'",
  "count": 5,
  "results": [
    {
      "id": "place_id_here",
      "name": "Joe's Pizza",
      "address": "123 Main St, New York, NY",
      "location": {"lat": 40.7128, "lng": -73.0060},
      "rating": 4.5,
      "priceLevel": 2,
      "types": ["restaurant", "meal_takeaway"],
      "isOpen": true
    }
    // ... more results
  ]
}
```

## 🔐 Security

- API keys are handled securely through environment variables
- Input validation on all parameters
- Rate limiting compatible with Google Places API quotas
- Error messages don't expose sensitive information

## 📞 Support

For issues or questions about the MCP server:
1. Check the logs: `console.error` outputs to stderr
2. Verify your Google Places API key and quotas
3. Ensure Node.js 18+ is installed
4. Test with the web demo first: `npm run dev`

## 🎉 Try It Now!

1. **Get a Google Places API key**
2. **Clone and setup** this repository
3. **Build the MCP server**: `npm run build:mcp`
4. **Connect your AI assistant** using the config above
5. **Ask your AI** to find places for you!

---
