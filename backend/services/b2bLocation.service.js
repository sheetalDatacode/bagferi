import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
import Property from '../models/Property.model.js';
import { toTitleCase, normalizeState, normalizeCity } from '../utils/addressNormalizer.util.js';

/**
 * Get available B2B vendor locations (states and cities)
 * Returns only locations where vendors have active products
 * @param {Object} options - Filter options
 * @param {string} options.businessTypeFilter - 'include' or 'exclude'
 * @param {string[]} options.businessTypes - Array of business type names to include/exclude
 * @returns {Promise<Object>} { states: [{ name: string, cities: string[] }], areas: string[], markets: string[] }
 */
export const getB2BAvailableLocations = async (options = {}) => {
  try {
    const { businessTypeFilter, businessTypes = [] } = options;

    // Build vendor query with businessType filter
    const vendorQuery = {
      vendorType: 'b2b',
      isActive: true,
      status: 'approved',
    };

    if (businessTypeFilter === 'include' && businessTypes.length > 0) {
      vendorQuery.$or = businessTypes.map(bt => ({
        businessType: { $regex: `^${bt}$`, $options: 'i' }
      }));
    } else if (businessTypeFilter === 'exclude' && businessTypes.length > 0) {
      vendorQuery.$and = businessTypes.map(bt => ({
        businessType: { $not: { $regex: `^${bt}$`, $options: 'i' } }
      }));
    }

    // Get all active and approved B2B vendors
    const b2bVendors = await Vendor.find(vendorQuery)
      .select('_id address businessType')
      .lean();

    if (b2bVendors.length === 0) {
      return { states: [], areas: [], markets: [] };
    }

    // Only include vendors who HAVE active products (excluding shop-listings) or active lot/slots.
    // This ensures that the filter only shows cities that will actually return search results.
    const [productVendorIds, lotSlotVendorIds] = await Promise.all([
      Product.distinct('vendorId', { isActive: true, isVisible: { $ne: false }, formType: { $ne: 'shop-listing' } }),
      LotSlot.distinct('vendorId', { isActive: true, isVisible: { $ne: false } }),
    ]);

    const activeVendorIds = new Set([
      ...productVendorIds.map(id => String(id)),
      ...lotSlotVendorIds.map(id => String(id))
    ]);

    const vendorsWithActiveProducts = b2bVendors.filter(v => activeVendorIds.has(String(v._id)));

    // Extract unique states and cities
    const locationMap = new Map(); // state -> Set of cities
    const areasSet = new Set(); // Set of unique areas
    const marketsSet = new Set(); // Set of unique markets

    vendorsWithActiveProducts.forEach(vendor => {
      const address = vendor.address;
      if (address && address.state && address.state.trim()) {
        // Clean state name - remove pincode if present (e.g., "Madhya Pradesh 450001" -> "Madhya Pradesh")
        // Also handle cases where only pincode is stored (e.g., "450001" -> skip)
        let state = address.state.trim();

        // Check if state is only a pincode (6 digits) - this means data is incorrectly stored
        if (/^\d{6}$/.test(state)) {
          // If state is only a pincode, try to extract full state name from city
          if (address.city && address.city.trim()) {
            const cityText = address.city.trim();
            // List of common Indian states to match against
            const commonStates = [
              'Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh',
              'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'West Bengal',
              'Tamil Nadu', 'Uttarakhand', 'Maharashtra', 'Gujarat', 'Rajasthan',
              'Karnataka', 'Kerala', 'Punjab', 'Haryana', 'Bihar', 'Odisha',
              'Assam', 'Telangana', 'Goa', 'Manipur', 'Meghalaya', 'Mizoram',
              'Nagaland', 'Sikkim', 'Tripura'
            ];

            // Try to find a full state name in the city text
            const foundState = commonStates.find(fullState =>
              cityText.toLowerCase() === fullState.toLowerCase() || cityText.toLowerCase().includes(fullState.toLowerCase())
            );

            if (foundState) {
              state = foundState;
            } else {
              // If no full state found, skip this vendor
              return;
            }
          } else {
            // Skip if no city and state is just pincode
            return;
          }
        } else {
          // Remove pincode pattern (6 digits at the end)
          state = state.replace(/\s+\d{6}$/, '');
          // Remove any trailing numbers (pincodes) - be more specific
          state = state.replace(/\s+\d{5,6}$/, '').trim();
        }

        if (!state || /^\d+$/.test(state)) {
          // Skip if state is empty or only numbers after cleaning
          return;
        }

        // Check if state is a partial name (common suffixes that shouldn't be states by themselves)
        const stateSuffixes = ['Pradesh', 'Bengal', 'Nadu', 'Desh', 'Khand'];
        const stateWords = state.split(' ');
        if (stateWords.length === 1 && stateSuffixes.some(suffix => state === suffix)) {
          // Try to reconstruct full state name from city if available
          if (address.city && address.city.trim()) {
            const cityText = address.city.trim();
            const commonStates = [
              'Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh',
              'Himachal Pradesh', 'West Bengal', 'Tamil Nadu', 'Uttarakhand'
            ];

            const foundState = commonStates.find(fullState => {
              const stateWords = fullState.split(' ');
              const lastWord = stateWords[stateWords.length - 1];
              return lastWord === state && cityText.toLowerCase().includes(fullState.toLowerCase());
            });

            if (foundState) {
              state = foundState;
            } else {
              // Skip if we can't reconstruct the full state name
              return;
            }
          } else {
            // Skip partial state names if no city to reconstruct from
            return;
          }
        }

        // Clean city name - remove state name if present (e.g., "Indore Madhya Pradesh" -> "Indore")
        // Also handle cases where state is stored in city field (incorrect data)
        let city = null;

        // Handle case where city field contains state name (incorrect data)
        // Try to get city from landmark or street if city is actually a state
        const commonStates = ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan',
          'Karnataka', 'Tamil Nadu', 'West Bengal', 'Bihar', 'Odisha', 'Andhra Pradesh',
          'Telangana', 'Kerala', 'Punjab', 'Haryana', 'Jharkhand', 'Assam', 'Himachal Pradesh'];

        if (address.city && address.city.trim()) {
          const originalCity = address.city.trim();
          city = originalCity;

          // Check if city is EXACTLY a state name (incorrect data storage)
          const isExactStateName = commonStates.some(s => city.toLowerCase() === s.toLowerCase());
          if (isExactStateName) {
            // Try to get city from landmark field
            if (address.landmark && address.landmark.trim() && !commonStates.some(s => address.landmark.trim().toLowerCase() === s.toLowerCase())) {
              city = address.landmark.trim();
            }
            // Try to get city from street field (sometimes city is in street)
            else if (address.street && address.street.trim()) {
              const streetParts = address.street.trim().split(',').map(p => p.trim());
              // Check if any part of street is a valid city (not a state, not a pincode)
              const potentialCity = streetParts.find(part => {
                return part.length > 0 &&
                  !/^\d+$/.test(part) &&
                  !commonStates.some(s => part.toLowerCase() === s.toLowerCase());
              });
              if (potentialCity) {
                city = potentialCity;
              } else {
                city = null;
              }
            } else {
              city = null;
            }
          } else {
            // Remove state name from city if it appears at the END of city name
            // Only remove if state name appears as the last part of city name
            const stateWords = state.split(' ').filter(w => w.length > 2); // Filter out short words
            if (stateWords.length > 0) {
              const cityWords = city.split(' ');
              // Check if city ends with state name (last word or last few words match state)
              if (cityWords.length > 1) {
                // Check if last word matches any state word
                const lastWord = cityWords[cityWords.length - 1];
                const secondLastWord = cityWords.length > 2 ? cityWords[cityWords.length - 2] : null;

                // If last word matches a state word, remove it
                if (stateWords.some(sw => sw.toLowerCase() === lastWord.toLowerCase())) {
                  city = cityWords.slice(0, -1).join(' ').trim();
                }
                // If last two words match state (e.g., "City Madhya Pradesh" -> "City")
                else if (secondLastWord && stateWords.length >= 2) {
                  const lastTwoWords = `${secondLastWord} ${lastWord}`.toLowerCase();
                  const stateLower = state.toLowerCase();
                  if (stateLower.includes(lastTwoWords) || lastTwoWords === stateLower) {
                    city = cityWords.slice(0, -2).join(' ').trim();
                  }
                }
              }
            }

            // Remove pincode from city if present
            city = city.replace(/\s+\d{6}$/, '').replace(/\s+\d{5,6}$/, '').trim();

            // Skip if city becomes empty or is only numbers
            if (!city || /^\d+$/.test(city)) {
              city = null;
            }
          }
        }

        if (address && address.area && address.area.trim()) {
          const cleanArea = toTitleCase(address.area.trim());
          const areaCity = city ? normalizeCity(city) : null;
          if (cleanArea.length > 0 && !/^\d+$/.test(cleanArea)) {
            areasSet.add(JSON.stringify({ name: cleanArea, city: areaCity }));
          }
        }

        if (address && address.market && address.market.trim()) {
          const cleanMarket = address.market.trim();
          const marketCity = city ? normalizeCity(city) : null;
          if (cleanMarket.length > 0) {
            marketsSet.add(JSON.stringify({ name: cleanMarket, city: marketCity }));
          }
        }

        // Normalize state name using alias map (handles misspellings, abbreviations)
        state = normalizeState(state);

        if (!locationMap.has(state)) {
          locationMap.set(state, new Set());
        }

        if (city && city.length > 0) {
          // Normalize city using alias map (handles misspellings + title case)
          const normalizedCity = normalizeCity(city);
          locationMap.get(state).add(normalizedCity);
        }
      }
    });

    // Convert to array format and sort
    const states = Array.from(locationMap.entries())
      .map(([stateName, citiesSet]) => ({
        name: stateName,
        cities: Array.from(citiesSet).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const areas = Array.from(areasSet).map(s => JSON.parse(s)).sort((a, b) => a.name.localeCompare(b.name));
    const markets = Array.from(marketsSet).map(s => JSON.parse(s)).sort((a, b) => a.name.localeCompare(b.name));

    return { states, areas, markets };
  } catch (error) {
    console.error('Error fetching B2B locations:', error);
    throw error;
  }
};

const normalizeText = (value) => (value ? String(value).trim() : '');
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const safeTitle = (value) => {
  const text = normalizeText(value);
  if (!text) return '';
  return toTitleCase(text);
};

const addCity = (cityMap, city) => {
  const cleanCity = safeTitle(city);
  if (!cleanCity) return;
  const key = normalizeKey(cleanCity);
  if (!key || /^\d+$/.test(key)) return;
  if (!cityMap.has(key)) cityMap.set(key, cleanCity);
};

const addArea = (areaMap, city, area) => {
  const cleanCity = safeTitle(city);
  const cleanArea = safeTitle(area);
  if (!cleanCity || !cleanArea) return;
  const cityKey = normalizeKey(cleanCity);
  const areaKey = normalizeKey(cleanArea);
  if (!cityKey || !areaKey) return;
  const key = `${cityKey}::${areaKey}`;
  if (!areaMap.has(key)) {
    areaMap.set(key, { city: cleanCity, name: cleanArea });
  }
};

const addMarket = (marketMap, city, area, market) => {
  const cleanCity = safeTitle(city);
  const cleanArea = safeTitle(area);
  const cleanMarket = safeTitle(market);
  if (!cleanCity || !cleanArea || !cleanMarket) return;
  const cityKey = normalizeKey(cleanCity);
  const areaKey = normalizeKey(cleanArea);
  const marketKey = normalizeKey(cleanMarket);
  if (!cityKey || !areaKey || !marketKey) return;
  const key = `${cityKey}::${areaKey}::${marketKey}`;
  if (!marketMap.has(key)) {
    marketMap.set(key, { city: cleanCity, area: cleanArea, name: cleanMarket });
  }
};

const matchesSelectedLocation = (entry, selectedCity, selectedArea, selectedMarket) => {
  const cityMatch = !selectedCity || normalizeKey(entry.city) === normalizeKey(selectedCity);
  const areaMatch = !selectedArea || normalizeKey(entry.area) === normalizeKey(selectedArea);
  const marketMatch = !selectedMarket || normalizeKey(entry.market) === normalizeKey(selectedMarket);
  return cityMatch && areaMatch && marketMatch;
};

/**
 * Dynamic location filters from active listings (products + properties).
 * Output is relational and only includes values that actually exist in listings.
 */
export const getB2BListingLocations = async (options = {}) => {
  const {
    city,
    area,
    market,
    businessTypeFilter,
    businessTypes = [],
    includeProducts = true,
    includeProperties = true,
  } = options;

  const selectedCity = normalizeText(city);
  const selectedArea = normalizeText(area);
  const selectedMarket = normalizeText(market);

  const vendorQuery = {
    vendorType: 'b2b',
    isActive: true,
    status: 'approved',
  };

  if (businessTypeFilter === 'include' && businessTypes.length > 0) {
    vendorQuery.$or = businessTypes.map((bt) => ({
      businessType: { $regex: `^${String(bt).trim()}$`, $options: 'i' }
    }));
  } else if (businessTypeFilter === 'exclude' && businessTypes.length > 0) {
    vendorQuery.$and = businessTypes.map((bt) => ({
      businessType: { $not: { $regex: `^${String(bt).trim()}$`, $options: 'i' } }
    }));
  }

  const vendors = await Vendor.find(vendorQuery)
    .select('_id address')
    .lean();

  const vendorById = new Map(vendors.map((v) => [String(v._id), v]));

  const cityMap = new Map();
  const areaMap = new Map();
  const marketMap = new Map();
  const propertyTypeMap = new Map();

  // Product locations come from vendor registered address.
  if (includeProducts) {
    const [productVendorIds, lotSlotVendorIds] = await Promise.all([
      Product.distinct('vendorId', { isActive: true, isVisible: { $ne: false }, formType: { $ne: 'shop-listing' } }),
      LotSlot.distinct('vendorId', { isActive: true, isVisible: { $ne: false } }),
    ]);

    const listingVendorIds = new Set([
      ...productVendorIds.map((id) => String(id)),
      ...lotSlotVendorIds.map((id) => String(id)),
    ]);

    listingVendorIds.forEach((vendorId) => {
      const vendor = vendorById.get(vendorId);
      if (!vendor) return;
      const cityVal = normalizeText(vendor.address?.city);
      const areaVal = normalizeText(vendor.address?.area);
      const marketVal = normalizeText(vendor.address?.market);
      if (!cityVal) return;

      const entry = { city: cityVal, area: areaVal, market: marketVal };
      if (!matchesSelectedLocation(entry, selectedCity, selectedArea, selectedMarket)) {
        return;
      }

      addCity(cityMap, cityVal);
      addArea(areaMap, cityVal, areaVal);
      addMarket(marketMap, cityVal, areaVal, marketVal);
    });
  }

  // Property locations prefer property.location, fallback vendor address.
  if (includeProperties) {
    const properties = await Property.find({ isActive: true })
      .select('location vendorId propertyType')
      .lean();

    properties.forEach((property) => {
      const vendor = vendorById.get(String(property.vendorId));
      if (!vendor) return;

      const cityVal = normalizeText(property.location?.city) || normalizeText(vendor.address?.city);
      const areaVal = normalizeText(property.location?.area) || normalizeText(vendor.address?.area);
      const marketVal = normalizeText(property.location?.market) || normalizeText(vendor.address?.market);

      if (!cityVal) return;

      const entry = { city: cityVal, area: areaVal, market: marketVal };
      if (!matchesSelectedLocation(entry, selectedCity, selectedArea, selectedMarket)) {
        return;
      }

      addCity(cityMap, cityVal);
      addArea(areaMap, cityVal, areaVal);
      addMarket(marketMap, cityVal, areaVal, marketVal);

      const propertyType = normalizeText(property.propertyType);
      if (propertyType) {
        const normalizedTypeLabel = normalizeKey(propertyType) === 'plot' ? 'Villa' : safeTitle(propertyType);
        const key = normalizeKey(normalizedTypeLabel);
        if (!propertyTypeMap.has(key)) {
          propertyTypeMap.set(key, normalizedTypeLabel);
        }
      }
    });
  }

  const cities = Array.from(cityMap.values()).sort((a, b) => a.localeCompare(b));
  const areas = Array.from(areaMap.values()).sort((a, b) => {
    const cityCmp = a.city.localeCompare(b.city);
    return cityCmp !== 0 ? cityCmp : a.name.localeCompare(b.name);
  });
  const markets = Array.from(marketMap.values()).sort((a, b) => {
    const cityCmp = a.city.localeCompare(b.city);
    if (cityCmp !== 0) return cityCmp;
    const areaCmp = a.area.localeCompare(b.area);
    return areaCmp !== 0 ? areaCmp : a.name.localeCompare(b.name);
  });
  const propertyTypes = Array.from(propertyTypeMap.values()).sort((a, b) => a.localeCompare(b));

  return { cities, areas, markets, propertyTypes };
};
