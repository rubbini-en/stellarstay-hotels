import axios from 'axios';
import { externalApiBreaker } from '../../../infrastructure/circuitBreaker.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

/**
 * Parse natural language query to extract booking intent
 */
export async function parseRoomQuery(query) {
  const prompt = `Return ONLY valid JSON. Extract from "${query}": {"roomType": "junior|king|presidential|null", "maxPriceDollars": number|null, "numGuests": number|null, "checkIn": "YYYY-MM-DD"|null, "checkOut": "YYYY-MM-DD"|null}`;

  try {
    const response = await externalApiBreaker.execute(async () => {
      return await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { 
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 200
        }
      }, { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    // Extract JSON from response (handle markdown code blocks)
    const responseText = response.data.response;
    let jsonMatch = responseText.match(/```[\s\S]*?(\{[\s\S]*?\})[\s\S]*?```/);
    
    if (!jsonMatch) {
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Validate and sanitize the response
    return {
      roomType: ['junior', 'king', 'presidential'].includes(parsed.roomType) ? parsed.roomType : null,
      maxPriceDollars: typeof parsed.maxPriceDollars === 'number' ? parsed.maxPriceDollars : null,
      numGuests: typeof parsed.numGuests === 'number' && parsed.numGuests > 0 ? parsed.numGuests : null,
      checkIn: parsed.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(parsed.checkIn) ? parsed.checkIn : null,
      checkOut: parsed.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(parsed.checkOut) ? parsed.checkOut : null,
    };
  } catch (error) {
    if (error.code === 'CIRCUIT_BREAKER_OPEN') {
      throw new Error('AI service temporarily unavailable');
    }
    throw new Error(`Failed to parse query: ${error.message}`);
  }
}

/**
 * Generate room recommendations based on parsed intent
 */
export function generateRoomRecommendations(intent) {
  const ROOM_BASE_RATES = {
    junior: 150,
    king: 250,
    presidential: 500
  };

  const recommendations = Object.entries(ROOM_BASE_RATES)
    .filter(([type, price]) => {
      // Filter by room type if specified
      if (intent.roomType && type !== intent.roomType) return false;
      
      // Filter by max price if specified
      if (intent.maxPriceDollars && price > intent.maxPriceDollars) return false;
      
      return true;
    })
    .map(([type, basePrice]) => ({
      type,
      basePriceDollars: basePrice,
      description: getRoomDescription(type),
      available: true, // In a real system, this would check actual availability
      features: getRoomFeatures(type)
    }))
    .sort((a, b) => a.basePriceDollars - b.basePriceDollars);

  return recommendations;
}

function getRoomDescription(type) {
  const descriptions = {
    junior: 'Comfortable suite with city view, perfect for business travelers',
    king: 'Spacious suite with king bed and premium amenities',
    presidential: 'Luxury suite with panoramic views and exclusive services'
  };
  return descriptions[type] || 'Premium accommodation';
}

function getRoomFeatures(type) {
  const features = {
    junior: ['City view', 'Work desk', 'Mini bar', 'WiFi'],
    king: ['King bed', 'Living area', 'Premium amenities', 'Room service'],
    presidential: ['Panoramic views', 'Butler service', 'Private dining', 'Spa access']
  };
  return features[type] || [];
}
