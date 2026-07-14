import axios from 'axios';
import logger from './logger.js';

/**
 * Geocode an address using OpenStreetMap Nominatim or Google Geocoding API
 * @param {Object} addressObj - { street, area, market, landmark, city, state, pincode, country }
 * @returns {Promise<Object>} { lat, lng } or null
 */
export const geocodeAddress = async (addressObj) => {
    try {
        const { street, area, market, landmark, city, state, pincode, country = 'India' } = addressObj;

        // Strategy 1: Full Address
        const strategy1 = [street, landmark, area, market, city, state, pincode, country].filter(Boolean).join(', ');
        // Strategy 2: Without Street/Landmark
        const strategy2 = [area, market, city, state, pincode, country].filter(Boolean).join(', ');
        // Strategy 3: Just Market, City, State
        const strategy3 = [market, city, state, pincode, country].filter(Boolean).join(', ');
        // Strategy 4: Just City, State, Pincode
        const strategy4 = [city, state, pincode, country].filter(Boolean).join(', ');
        // Strategy 5: Just Pincode, Country (Last resort but very reliable)
        const strategy5 = [pincode, country].filter(Boolean).join(', ');

        const strategies = [strategy1, strategy2, strategy3, strategy4, strategy5];

        // Remove duplicates and too short addresses
        const uniqueStrategies = [...new Set(strategies)].filter(s => s && s.trim().length > 5);

        logger.info(`Geocoding attempt started. Trying ${uniqueStrategies.length} strategies.`);

        for (const fullAddress of uniqueStrategies) {
            let coords = null;
            if (process.env.GOOGLE_GEOCODING_API_KEY) {
                coords = await geocodeWithGoogle(fullAddress);
            } else {
                coords = await geocodeWithNominatim(fullAddress);
            }

            if (coords) {
                logger.info(`Geocoding successful with strategy: "${fullAddress}"`);
                return coords;
            }
            // If it failed, try next strategy
            logger.info(`Geocoding failed for strategy: "${fullAddress}", trying next...`);
        }

        logger.warn('All geocoding strategies failed for:', addressObj);
        return null;
    } catch (error) {
        logger.error('Geocoding error:', error.message);
        return null;
    }
};

/**
 * Geocode using Google Geocoding API
 * @param {string} address 
 */
const geocodeWithGoogle = async (address) => {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: address,
                key: process.env.GOOGLE_GEOCODING_API_KEY,
            },
            timeout: 5000,
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;
    } catch (error) {
        logger.error('Google Geocoding API error:', error.message);
        return null;
    }
};

/**
 * Geocode using Nominatim (OpenStreetMap)
 * @param {string} address 
 */
const geocodeWithNominatim = async (address) => {
    try {
        // Nominatim requires a User-Agent header
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: address,
                format: 'json',
                limit: 1,
            },
            headers: {
                'User-Agent': 'DealingIndia/1.0',
            },
            timeout: 5000,
        });

        if (response.data && response.data.length > 0) {
            const { lat, lon } = response.data[0];
            return {
                lat: parseFloat(lat),
                lng: parseFloat(lon),
            };
        }
        return null;
    } catch (error) {
        // Log error but don't throw (will try next strategy)
        logger.error(`Nominatim error for "${address}":`, error.message);
        return null;
    }
};
