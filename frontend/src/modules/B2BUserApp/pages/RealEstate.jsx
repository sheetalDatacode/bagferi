import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import RealEstateCard from '../components/RealEstateCard';
import B2BVendorCard from '../components/B2BVendorCard';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';
import { FiFilter, FiSearch, FiVideo, FiGrid, FiX, FiCheck, FiMapPin, FiChevronDown, FiBriefcase, FiDollarSign, FiHome, FiTrendingUp } from 'react-icons/fi';

const RealEstate = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedPropertyType, setSelectedPropertyType] = useState(searchParams.get('propertyType') || 'All');
    const [properties, setProperties] = useState([]);
    const [matchingVendors, setMatchingVendors] = useState([]);
    const [reels, setReels] = useState([]);
    const [reelsLoading, setReelsLoading] = useState(false);
    const [catalogTab, setCatalogTab] = useState('properties');

    const getReelYoutubeId = (reel) => {
        if (!reel) return null;
        if (reel.youtubeVideoId) return reel.youtubeVideoId;
        const url = (reel.videoUrl || "").toString();
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^&]*&v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
        return match ? match[1] : null;
    };

    const fetchReels = async () => {
        setReelsLoading(true);
        try {
            const params = {
                limit: 20,
                propertyOnly: 'true'
            };
            
            // Map selectedPropertyType to category search for reels
            // Map selectedPropertyType to category search for reels to match UploadReel.jsx keys
            if (selectedPropertyType !== 'All') {
                if (selectedPropertyType.includes('Villa')) {
                    params.category = 'Villa / Row house Properties';
                } else if (selectedPropertyType.includes('Commercial')) {
                    params.category = 'Commercial Properties';
                } else if (selectedPropertyType.includes('Flat')) {
                    params.category = 'Flat Properties';
                } else if (selectedPropertyType.includes('Plot')) {
                    params.category = 'Plot Properties';
                } else {
                    params.category = selectedPropertyType;
                }
            } else if (searchQuery) {
                params.category = searchQuery;
            }

            const response = await api.get('/reels/feed', { params });
            if (response?.success) {
                // Filter to only property reels — exclude any reel that has a productId (product reel)
                const allReels = response.data.reels || [];
                const propertyReels = allReels.filter(r => r.propertyId || !r.productId);
                setReels(propertyReels);
            }
        } catch (error) {
            console.error('[Fetch Reels Error]:', error);
        } finally {
            setReelsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchReels();
        }, 600);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedPropertyType]);
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [selectedBusinessType, setSelectedBusinessType] = useState(() => {
        const t = (searchParams.get('type') || '').toLowerCase();
        if (t === 'developer') return 'Developer';
        if (t === 'broker') return 'Broker';
        return 'All';
    });
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [appliedPrice, setAppliedPrice] = useState({ min: '', max: '' });
    const [sizeRange, setSizeRange] = useState({ min: '', max: '' });
    const [appliedSize, setAppliedSize] = useState({ min: '', max: '' });
    const [selectedPriceUnit, setSelectedPriceUnit] = useState('All');
    const [selectedAreaUnit, setSelectedAreaUnit] = useState('All');
    const [selectedListingType, setSelectedListingType] = useState('All');
    const [selectedFlatType, setSelectedFlatType] = useState(searchParams.get('flatType') || 'All');
    const [selectedFloors, setSelectedFloors] = useState(searchParams.get('floors') || 'All');

    const [selectedArea, setSelectedArea] = useState('All Areas');
    const [selectedMarket, setSelectedMarket] = useState('All Markets');
    const [availableMarkets, setAvailableMarkets] = useState([]);
    const [propertyDerivedAreas, setPropertyDerivedAreas] = useState([]);
    const [propertyDerivedMarkets, setPropertyDerivedMarkets] = useState([]);
    const [propertyDerivedCities, setPropertyDerivedCities] = useState([]);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState(searchParams.get('vendorId') || '');
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
    const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

    const { states: availableStates, areas: availableAreas, markets: availableMarketsFromStore, initialize: fetchLocations } = useB2BLocationStore();
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [areaSearchQuery, setAreaSearchQuery] = useState('');
    const [marketSearchQuery, setMarketSearchQuery] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

    const [openSections, setOpenSections] = useState({
        listingType: false,
        propertyType: false,
        businessType: false,
        city: false,
        area: false,
        market: false,
        budget: false,
        size: false,
        flatType: true,
        floors: true
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        const t = (searchParams.get('type') || '').toLowerCase();
        if (t === 'developer') setSelectedBusinessType('Developer');
        else if (t === 'broker') setSelectedBusinessType('Broker');
        else setSelectedBusinessType(prev => prev); // keep current if no type provided
    }, [searchParams]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const hasPriceRange = Boolean(appliedPrice.min || appliedPrice.max);
            const params = {
                type: selectedBusinessType === 'All' ? '' : selectedBusinessType.toLowerCase(),
                search: searchQuery,
                city: selectedCity === 'All Cities' ? '' : selectedCity,
                area: selectedArea === 'All Areas' ? '' : selectedArea,
                market: selectedMarket === 'All Markets' ? '' : selectedMarket,
                propertyType: (selectedPropertyType.includes('Villa') ? 'Villa' : (selectedPropertyType.includes('Flat') ? 'Flat' : (selectedPropertyType.includes('Commercial') ? 'Commercial' : (selectedPropertyType.includes('Plot') ? 'Plot' : (selectedPropertyType === 'All' ? '' : selectedPropertyType))))),
                flatType: (selectedPropertyType.includes('Flat') && selectedFlatType !== 'All') ? selectedFlatType : '',
                floors: (selectedPropertyType.includes('Villa') && selectedFloors !== 'All') ? selectedFloors : '',
                minPrice: appliedPrice.min,
                maxPrice: appliedPrice.max,
                minSize: appliedSize.min,
                maxSize: appliedSize.max,
                areaUnit: selectedAreaUnit === 'All' ? '' : selectedAreaUnit,
                priceUnit: hasPriceRange && selectedPriceUnit !== 'All' ? selectedPriceUnit : '',
                listingType: selectedListingType,
                vendorId: selectedVendorId,
                sortBy,
                sortOrder
            };
            const response = await api.get('/property/all', { params });
            if (response?.success) {
                let nextProperties = Array.isArray(response.data) ? response.data : [];
                // Fallback client-side filter for mixed legacy data (Plot used for Villa).
                if (selectedPropertyType !== 'All') {
                    let selected = selectedPropertyType.toLowerCase();
                    if (selected.includes('villa')) selected = 'villa';
                    if (selected.includes('flat')) selected = 'flat';
                    if (selected.includes('commercial')) selected = 'commercial';
                    if (selected.includes('plot')) selected = 'plot';
                    const normalizedSelectedFlatType = String(selectedFlatType || 'All').replace(/\s+/g, '').toUpperCase();

                    nextProperties = nextProperties.filter((property) => {
                        const type = String(property?.propertyType || '').toLowerCase();
                        const propertyFlatType = String(property?.flatDetails?.flatType || '').replace(/\s+/g, '').toUpperCase();
                        const variantTypes = Array.isArray(property.flatVariants)
                            ? property.flatVariants.map(v => String(v.flatType || '').replace(/\s+/g, '').toUpperCase())
                            : [];

                        // Priority 1: Explicit Match
                        if (selected === 'villa' && (type === 'villa' || type === 'row house')) {
                            if (selectedFloors === 'All') return true;
                            return String(property?.plotDetails?.floors || '').toLowerCase() === selectedFloors.toLowerCase();
                        }
                        if (selected === 'flat') {
                            const isFlatProperty = type === 'flat';
                            if (!isFlatProperty) return false;
                            if (normalizedSelectedFlatType === 'ALL') return true;
                            return propertyFlatType === normalizedSelectedFlatType || variantTypes.includes(normalizedSelectedFlatType);
                        }

                        // Priority 2: Commercial Group
                        const commercialTypes = ['shop', 'office', 'showroom', 'godown', 'factory', 'commercial building', 'commercial'];
                        if (selected === 'commercial' && commercialTypes.includes(type)) return true;

                        // Priority 3: Structural Match (for legacy/missing types)
                        if (selected === 'villa' && type !== 'plot' && property?.plotDetails?.plotArea > 0) {
                            if (selectedFloors === 'All') return true;
                            return String(property?.plotDetails?.floors || '').toLowerCase() === selectedFloors.toLowerCase();
                        }

                        return type === selected;
                    });
                }
                setProperties(nextProperties);
                setMatchingVendors(response.matchingVendors || []);

                // Extract unique areas from properties (from property form)
                const areasSet = new Set();
                if (Array.isArray(nextProperties)) {
                    nextProperties.forEach(property => {
                        const area = property.location?.area;
                        if (area && String(area).trim()) {
                            areasSet.add(area.trim());
                        }
                    });
                }
                if (selectedArea === 'All Areas' && areasSet.size > 0) {
                    setPropertyDerivedAreas(Array.from(areasSet).sort());
                }

                // Extract cities from properties (from property form)
                const citiesSet = new Set();
                if (Array.isArray(nextProperties)) {
                    nextProperties.forEach(property => {
                        const city = property.location?.city;
                        if (city && String(city).trim()) {
                            citiesSet.add(city.trim());
                        }
                    });
                }
                // Keep city chips stable when a specific city is selected
                if (selectedCity === 'All Cities' && citiesSet.size > 0) {
                    setPropertyDerivedCities(Array.from(citiesSet).sort());
                }

                // Extract markets from properties (from property form)
                const marketsSet = new Set();
                if (Array.isArray(nextProperties)) {
                    nextProperties.forEach(property => {
                        const market = property.location?.market;
                        if (market && String(market).trim()) {
                            marketsSet.add(market.trim());
                        }
                    });
                }
                if (selectedMarket === 'All Markets' && marketsSet.size > 0) {
                    setPropertyDerivedMarkets(Array.from(marketsSet).sort());
                }
            }
        } catch (error) {
            console.error('[Fetch Properties Error]:', error);
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProperties();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCity, selectedArea, selectedMarket, selectedPropertyType, selectedFlatType, selectedFloors, appliedPrice, appliedSize, selectedAreaUnit, selectedPriceUnit, selectedListingType, selectedBusinessType, selectedVendorId, sortBy, sortOrder]);

    // Sync URL searchParams to local state for back/forward navigation and external links
    useEffect(() => {
        const urlSearch = searchParams.get('search') || '';
        const urlVendorId = searchParams.get('vendorId') || '';

        if (urlSearch !== searchQuery) {
            setSearchQuery(urlSearch);
        }
        if (urlVendorId !== selectedVendorId) {
            setSelectedVendorId(urlVendorId);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchLocations(false, {
            businessTypeFilter: 'include',
            businessTypes: ['Developer', 'Property Broker']
        });
    }, [fetchLocations]);

    // Update availableMarkets from store when it changes
    useEffect(() => {
        if (availableMarketsFromStore && availableMarketsFromStore.length > 0) {
            setAvailableMarkets(availableMarketsFromStore);
        }
    }, [availableMarketsFromStore]);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            const cityDropdown = document.querySelector('[data-city-dropdown]');
            const areaDropdown = document.querySelector('[data-area-dropdown]');
            const marketDropdown = document.querySelector('[data-market-dropdown]');

            if (cityDropdown && !cityDropdown.contains(target)) {
                setIsCityDropdownOpen(false);
            }
            if (areaDropdown && !areaDropdown.contains(target)) {
                setIsAreaDropdownOpen(false);
            }
            if (marketDropdown && !marketDropdown.contains(target)) {
                setIsMarketDropdownOpen(false);
            }

            // Also search suggestions
            const searchContainer = document.querySelector('[data-search-container]');
            if (searchContainer && !searchContainer.contains(target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const uniqueCitiesFromStore = useMemo(() => {
        return (availableStates || [])
            .flatMap(state => state.cities || [])
            .filter((city, index, self) => {
                if (!city || typeof city !== 'string') return false;
                const cleanCity = city.trim();
                if (cleanCity.length === 0 || /^\d+$/.test(cleanCity)) return false;
                return self.findIndex(c => c.trim() === cleanCity) === index;
            })
            .sort();
    }, [availableStates]);

    // City options: ONLY property-derived (from property form)
    const cities = useMemo(() => {
        const unique = Array.from(new Set((propertyDerivedCities || []).map(c => (c || '').trim())))
            .filter(Boolean)
            .sort();
        return ['All Cities', ...unique];
    }, [propertyDerivedCities]);

    const filteredCities = useMemo(() => {
        if (!citySearchQuery) return cities;
        return cities.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()));
    }, [cities, citySearchQuery]);

    // Area options: prefer property-derived (matches backend filter location.area), fallback to store
    const areaOptions = useMemo(() => {
        const areas = propertyDerivedAreas?.length > 0 ? propertyDerivedAreas : (availableAreas || []);
        return Array.isArray(areas) ? areas : [];
    }, [propertyDerivedAreas, availableAreas]);

    const filteredAreas = useMemo(() => {
        if (!areaSearchQuery) return areaOptions;
        return areaOptions.filter(area => area && area.toLowerCase().includes(areaSearchQuery.toLowerCase()));
    }, [areaOptions, areaSearchQuery]);

    // Market options: property.location.market (data from when property was added)
    const filteredMarkets = useMemo(() => {
        const markets = propertyDerivedMarkets?.length > 0 ? propertyDerivedMarkets : [];
        if (!marketSearchQuery) return markets;
        return markets.filter(m => m && m.toLowerCase().includes(marketSearchQuery.toLowerCase()));
    }, [propertyDerivedMarkets, marketSearchQuery]);

    // Handle Search Suggestions
    const fetchSuggestions = async (query) => {
        if (!query || query.trim().length < 1) {
            setSuggestions({ stores: [], properties: [] });
            return;
        }
        setIsSearching(true);
        try {
            const response = await api.get(`/property/suggestions?q=${encodeURIComponent(query)}`);
            if (response?.success) {
                setSuggestions(response.data);
            }
        } catch (error) {
            console.error('[Suggestions Error]:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce suggestions
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && showSuggestions) {
                fetchSuggestions(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, showSuggestions]);

    const handleSuggestionClick = (suggestion) => {
        setShowSuggestions(false);
        if (suggestion.type === 'property') {
            navigate(`/b2b/real-estate/property/${suggestion.id}`);
        } else if (suggestion.type === 'store') {
            setSelectedVendorId(suggestion.vendorId);
            setSearchQuery(suggestion.text);
        }
    };

    const trackContactClick = async (vendorId, clickType, context = {}) => {
        try {
            if (!vendorId) return;
            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType,
                ...context
            });
        } catch (error) {
            console.error('Error tracking click:', error);
        }
    };

    const handleApplyPrice = () => {
        setAppliedPrice(priceRange);
        setIsPriceFilterOpen(false);
        setIsMobileFilterOpen(false);
    };

    const handleApplySize = () => {
        setAppliedSize(sizeRange);
        setIsMobileFilterOpen(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedCity('All Cities');
        setSelectedArea('All Areas');
        setSelectedMarket('All Markets');
        setSelectedListingType('All');
        setSelectedPropertyType('All');
        setSelectedFlatType('All');
        setSelectedFloors('All');
        setSelectedBusinessType('All');
        setSelectedPriceUnit('All');
        setSelectedAreaUnit('All');
        setPriceRange({ min: '', max: '' });
        setAppliedPrice({ min: '', max: '' });
        setSizeRange({ min: '', max: '' });
        setAppliedSize({ min: '', max: '' });
        setSelectedVendorId('');
        setSortBy('createdAt');
        setSortOrder('desc');
    };

    const handleSortChange = (newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setIsSortDropdownOpen(false);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('sortBy', newSortBy);
        newParams.set('sortOrder', newSortOrder);
        setSearchParams(newParams, { replace: true });
    };

    const renderFilters = (showCity = true) => (
        <div className="space-y-6">
            {/* Listing Type Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('listingType')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Listing Type</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.listingType ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.listingType && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                {['All', 'Sale', 'Rent', 'Lease'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedListingType(type)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedListingType === type
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Property Type Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('propertyType')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Property Type</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.propertyType ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.propertyType && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                {['All', 'Flat Properties', 'Villa / Row house Properties', 'Commercial Properties', 'Plot Properties'].map((type) => (

                                    <button
                                        key={type}
                                        onClick={() => setSelectedPropertyType(type)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedPropertyType === type
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Business Type Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('businessType')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Business Category</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.businessType ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.businessType && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 space-y-2">
                                {['All', 'Developer', 'Broker'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedBusinessType(type)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedBusinessType === type
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type === 'All' ? 'All Providers' : type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BHK Filter - Only for Flats */}
            {selectedPropertyType.includes('Flat') && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => toggleSection('flatType')}
                        className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">BHK Type</h3>
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.flatType ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {openSections.flatType && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 space-y-2">
                                    {['All', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', '6BHK'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedFlatType(type)}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedFlatType === type
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                                : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {selectedPropertyType.includes('Villa') && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => toggleSection('floors')}
                        className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Floors</h3>
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.floors ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {openSections.floors && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 space-y-2">
                                    {['All', 'Ground', 'G+1', 'G+2'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedFloors(type)}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedFloors === type
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                                : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* City Filter */}
            {showCity && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => toggleSection('city')}
                        className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">City</h3>
                        <div className="flex items-center gap-2">
                            {selectedCity !== 'All Cities' && (
                                <span className="text-[10px] font-bold text-primary-600">{selectedCity}</span>
                            )}
                            <FiChevronDown className={`text-gray-400 transition-transform ${openSections.city ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    <AnimatePresence>
                        {openSections.city && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 border-b border-gray-50">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search city..."
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                            value={citySearchQuery}
                                            onChange={(e) => setCitySearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    <button
                                        onClick={() => {
                                            setSelectedCity('All Cities');
                                            setCitySearchQuery('');
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                    >
                                        All Cities
                                    </button>
                                    {filteredCities.map(city => (
                                        <button
                                            key={city}
                                            onClick={() => {
                                                setSelectedCity(city);
                                                setCitySearchQuery('');
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Area Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('area')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Area</h3>
                    <div className="flex items-center gap-2">
                        {selectedArea !== 'All Areas' && (
                            <span className="text-[10px] font-bold text-primary-600">{selectedArea}</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.area ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openSections.area && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 border-b border-gray-50">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                    <input
                                        type="text"
                                        placeholder="Search area..."
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                        value={areaSearchQuery}
                                        onChange={(e) => setAreaSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => {
                                        setSelectedArea('All Areas');
                                        setAreaSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedArea === 'All Areas' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                >
                                    All Areas
                                </button>
                                {filteredAreas.map(area => (
                                    <button
                                        key={area}
                                        onClick={() => {
                                            setSelectedArea(area);
                                            setAreaSearchQuery('');
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedArea === area ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                    >
                                        {area}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Market Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('market')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Market</h3>
                    <div className="flex items-center gap-2">
                        {selectedMarket !== 'All Markets' && (
                            <span className="text-[10px] font-bold text-primary-600">{selectedMarket}</span>
                        )}
                        <FiChevronDown className={`text-gray-400 transition-transform ${openSections.market ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <AnimatePresence>
                    {openSections.market && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 border-b border-gray-50">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                    <input
                                        type="text"
                                        placeholder="Search market..."
                                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                        value={marketSearchQuery}
                                        onChange={(e) => setMarketSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => {
                                        setSelectedMarket('All Markets');
                                        setMarketSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedMarket === 'All Markets' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                >
                                    All Markets
                                </button>
                                {filteredMarkets.length > 0 ? (
                                    filteredMarkets.map(market => (
                                        <button
                                            key={market}
                                            onClick={() => {
                                                setSelectedMarket(market);
                                                setMarketSearchQuery('');
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[10px] font-black transition-colors hover:bg-primary-50 ${selectedMarket === market ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            {market}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold">
                                        {marketSearchQuery ? 'No markets found' : 'No markets available'}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Budget Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('budget')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Budget Range</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.budget ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.budget && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-tighter">Denomination</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['All', 'Rs', 'Thousand', 'Lakh', 'Crore'].map(unit => (
                                            <button
                                                key={unit}
                                                onClick={() => setSelectedPriceUnit(unit)}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedPriceUnit === unit
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                                    : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-100'}`}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Value {selectedPriceUnit !== 'All' ? `(${selectedPriceUnit}${selectedPriceUnit === 'Rs' ? '' : 's'})` : '(Lakhs)'}</p>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={priceRange.min}
                                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <button
                                        onClick={handleApplyPrice}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all mt-2"
                                    >
                                        Apply Budget
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Size Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection('size')}
                    className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Area {selectedAreaUnit !== 'All' ? `(${selectedAreaUnit})` : ''}</h3>
                    <FiChevronDown className={`text-gray-400 transition-transform ${openSections.size ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {openSections.size && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-tighter">Unit</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['All', 'Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(unit => (
                                            <button
                                                key={unit}
                                                onClick={() => setSelectedAreaUnit(unit)}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedAreaUnit === unit
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                                    : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-100'}`}
                                            >
                                                {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Value {selectedAreaUnit !== 'All' ? `(${selectedAreaUnit})` : '(Sq. Ft. for range)'}</p>
                                    <input
                                        type="number"
                                        placeholder={selectedAreaUnit !== 'All' ? `Min ${selectedAreaUnit}` : 'Min (Sq. Ft.)'}
                                        value={sizeRange.min}
                                        onChange={(e) => setSizeRange({ ...sizeRange, min: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder={selectedAreaUnit !== 'All' ? `Max ${selectedAreaUnit}` : 'Max (Sq. Ft.)'}
                                        value={sizeRange.max}
                                        onChange={(e) => setSizeRange({ ...sizeRange, max: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                                    />
                                    <button
                                        onClick={handleApplySize}
                                        className="w-full py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all"
                                    >
                                        Apply Size
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader
                title="Real Estate Hub"
                searchPlaceholder="SEARCH PROPERTY, AGENTS OR LOCATIONS"
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                    setSearchQuery(val);
                    setSelectedVendorId('');
                    if (!val.trim()) {
                        const newParams = new URLSearchParams(searchParams);
                        let changed = false;
                        if (newParams.has('search')) {
                            newParams.delete('search');
                            changed = true;
                        }
                        if (newParams.has('vendorId')) {
                            newParams.delete('vendorId');
                            changed = true;
                        }
                        if (changed) setSearchParams(newParams, { replace: true });
                    }
                }}
                onSearchSubmit={(val) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (val) {
                        newParams.set('search', val);
                        newParams.delete('vendorId'); // New search overrides specific vendor
                    } else {
                        newParams.delete('search');
                        newParams.delete('vendorId');
                    }
                    setSearchParams(newParams, { replace: true });
                }}
                suggestionEndpoint="/property/suggestions"
            />

            {/* Mobile-only Search Bar */}
            <div className="lg:hidden px-4 py-3 bg-white border-b border-gray-100 sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-40">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600" />
                    <input
                        type="text"
                        placeholder="SEARCH PROPERTY AND OFFICE"
                        value={searchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            setSelectedVendorId('');
                            if (!val.trim()) {
                                const newParams = new URLSearchParams(searchParams);
                                let changed = false;
                                if (newParams.has('search')) {
                                    newParams.delete('search');
                                    changed = true;
                                }
                                if (newParams.has('vendorId')) {
                                    newParams.delete('vendorId');
                                    changed = true;
                                }
                                if (changed) setSearchParams(newParams, { replace: true });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const newParams = new URLSearchParams(searchParams);
                                if (searchQuery) {
                                    newParams.set('search', searchQuery);
                                    newParams.delete('vendorId');
                                } else {
                                    newParams.delete('search');
                                    newParams.delete('vendorId');
                                }
                                setSearchParams(newParams, { replace: true });
                            }
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                </div>
            </div>

            {/* Mobile Filter Toggle - Sticky on mobile only */}
            <div className="lg:hidden sticky top-[calc(8.5rem+env(safe-area-inset-top))] z-30 pointer-events-none mb-6">
                <div className="max-w-7xl mx-auto px-4 flex justify-end">
                    <button
                        onClick={() => setIsMobileFilterOpen(true)}
                        className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-primary-600 shadow-xl relative pointer-events-auto"
                    >
                        <FiFilter size={20} />
                        {(selectedListingType !== 'All' || selectedPropertyType !== 'All' || selectedCity !== 'All Cities' || selectedArea !== 'All Areas' || selectedMarket !== 'All Markets' || selectedBusinessType !== 'All' || appliedPrice.min || appliedPrice.max || appliedSize.min || appliedSize.max || selectedPriceUnit !== 'All' || selectedAreaUnit !== 'All') && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileFilterOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-[101] lg:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <FiFilter size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-900 leading-none mb-1">Filter Properties</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Refine Hub Results</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <FiX size={20} className="text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                {renderFilters()}
                            </div>
                            <div className="p-6 border-t border-gray-100">
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary-700 shadow-xl shadow-primary-100"
                                >
                                    Show Results
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main className=" mx-auto px-4 py-8">
                {/* Location Filters - Replaces Sidebar City Filter max-w-7xl*/}
                <div className="hidden lg:flex flex-col md:flex-row gap-4 items-stretch md:items-center mb-6">
                    {/* City Searchable Dropdown */}
                    <div className="relative w-full md:w-64" data-city-dropdown>
                        <button
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            className="w-full px-4 py-3 md:py-3.5 bg-white border border-gray-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-primary-500 font-bold text-xs md:text-sm shadow-sm transition-all outline-none flex items-center justify-between gap-2"
                        >
                            <span className="truncate">{selectedCity}</span>
                            <FiChevronDown className={`transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isCityDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-xl z-[100] overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search city..."
                                                className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                                value={citySearchQuery}
                                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                        <button
                                            onClick={() => {
                                                setSelectedCity('All Cities');
                                                setIsCityDropdownOpen(false);
                                                setCitySearchQuery('');
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-[10px] md:text-xs font-black transition-colors hover:bg-primary-50 ${selectedCity === 'All Cities' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                        >
                                            ALL CITIES
                                        </button>

                                        {filteredCities.filter(c => c !== 'All Cities').length > 0 ? (
                                            filteredCities.filter(c => c !== 'All Cities').map((city, index) => (
                                                <button
                                                    key={`${city}-${index}`}
                                                    onClick={() => {
                                                        setSelectedCity(city);
                                                        setIsCityDropdownOpen(false);
                                                        setCitySearchQuery('');
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-[10px] md:text-xs font-bold transition-colors hover:bg-primary-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/50' : 'text-gray-600'}`}
                                                >
                                                    {city.toUpperCase()}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center text-[10px] text-gray-400 font-bold">NO CITIES FOUND</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Horizontal Scrollable Cities List */}
                    <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                        <button
                            onClick={() => setSelectedCity('All Cities')}
                            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${selectedCity === 'All Cities'
                                ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                }`}
                        >
                            All Cities
                        </button>
                        {cities.filter(c => c !== 'All Cities').slice(0, 15).map((city, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedCity(city)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${selectedCity === city
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                    }`}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>

                {/* layout container */}
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                    {/* Filter Sidebar */}
                    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pr-1">
                        {renderFilters(false)}
                    </aside>

                    {/* Listing Area */}
                    <div className="flex-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
                        {/* Active Filter Tags */}
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-12 h-[2px] bg-primary-600 rounded-full"></span>
                                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em]">Integrated Marketplace</span>
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
                                    Indian <span className="text-primary-600">Real Estate</span> Hub
                                </h2>
                                <div className="flex items-center gap-4 text-gray-400 text-[11px] font-black uppercase tracking-widest">
                                    <span>{properties.length} Verified Records Found</span>
                                    {selectedCity !== 'All Cities' && <span className="flex items-center gap-2 text-primary-600"><FiMapPin /> {selectedCity}</span>}
                                    {selectedArea !== 'All Areas' && <span className="flex items-center gap-2 text-primary-600"><FiHome /> {selectedArea}</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="px-5 py-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 hover:border-primary-200 transition-all shadow-sm"
                                    >
                                        <FiTrendingUp className="text-primary-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                                            {sortBy === 'price' ? (sortOrder === 'asc' ? 'Price: Low to High' : 'Price: High to Low') : 'Newest First'}
                                        </span>
                                        <FiChevronDown className={`text-gray-400 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isSortDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsSortDropdownOpen(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-50 z-50 overflow-hidden"
                                                >
                                                    <div className="p-2 space-y-1">
                                                        <button
                                                            onClick={() => handleSortChange('createdAt', 'desc')}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'createdAt' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                                        >
                                                            Newest First
                                                        </button>
                                                        <button
                                                            onClick={() => handleSortChange('price', 'asc')}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'price' && sortOrder === 'asc' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                                        >
                                                            Price: Low to High
                                                        </button>
                                                        <button
                                                            onClick={() => handleSortChange('price', 'desc')}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'price' && sortOrder === 'desc' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                                        >
                                                            Price: High to Low
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => setCatalogTab('properties')}
                                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${catalogTab === 'properties'
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <FiGrid size={14} />
                                        Properties
                                        {properties.length > 0 && <span className="ml-1 opacity-60">({properties.length})</span>}
                                    </button>
                                    <button
                                        onClick={() => setCatalogTab('reels')}
                                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${catalogTab === 'reels'
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                                            : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <FiVideo size={14} />
                                        Reels
                                        {reels.length > 0 && <span className="ml-1 opacity-60">({reels.length})</span>}
                                    </button>
                                    <AnimatePresence>
                                        {selectedBusinessType !== 'All' && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {selectedBusinessType}
                                                <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedBusinessType('All')} />
                                            </motion.span>
                                        )}
                                        {selectedListingType !== 'All' && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {selectedListingType}
                                                <FiX className="cursor-pointer hover:text-primary-400 transition-colors" onClick={() => setSelectedListingType('All')} />
                                            </motion.span>
                                        )}
                                        {selectedPropertyType !== 'All' && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {selectedPropertyType}
                                                <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedPropertyType('All')} />
                                            </motion.span>
                                        )}
                                        {selectedArea !== 'All Areas' && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {selectedArea}
                                                <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedArea('All Areas')} />
                                            </motion.span>
                                        )}
                                        {(appliedPrice.min || appliedPrice.max) && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg shadow-primary-100"
                                            >
                                                ₹ {appliedPrice.min || '0'}L - {appliedPrice.max || '∞'}L
                                                <FiX className="cursor-pointer" onClick={() => { setPriceRange({ min: '', max: '' }); setAppliedPrice({ min: '', max: '' }); }} />
                                            </motion.span>
                                        )}
                                        {selectedPriceUnit !== 'All' && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {selectedPriceUnit}s
                                                <FiX className="cursor-pointer hover:text-white/80 transition-colors" onClick={() => setSelectedPriceUnit('All')} />
                                            </motion.span>
                                        )}
                                        {(appliedSize.min || appliedSize.max) && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 shadow-lg"
                                            >
                                                {appliedSize.min || '0'} - {appliedSize.max || '∞'} {selectedAreaUnit}
                                                <FiX className="cursor-pointer" onClick={() => { setSizeRange({ min: '', max: '' }); setAppliedSize({ min: '', max: '' }); }} />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {(selectedListingType !== 'All' || selectedPropertyType !== 'All' || selectedCity !== 'All Cities' || selectedArea !== 'All Areas' || selectedBusinessType !== 'All' || appliedPrice.min || appliedPrice.max || appliedSize.min || appliedSize.max || selectedPriceUnit !== 'All' || selectedAreaUnit !== 'All') && (
                                        <button
                                            onClick={handleClearFilters}
                                            className="text-[10px] font-black text-gray-400 hover:text-primary-600 uppercase tracking-widest border-b-2 border-transparent hover:border-primary-600 pb-1 transition-all"
                                        >
                                            Reset All
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Integrated Hub Display: Select between Properties and Reels */}
                        {catalogTab === 'reels' ? (
                            reelsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                                    <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black mt-6 uppercase tracking-[0.2em] text-gray-500">Retrieving Video Library...</p>
                                </div>
                            ) : reels.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                                    {reels.map((reel) => {
                                        const ytId = getReelYoutubeId(reel);
                                        return (
                                            <motion.button
                                                key={reel._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                onClick={() => navigate(`/b2b/reels/${reel._id}`)}
                                                className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col text-left transition-all hover:scale-[1.02] hover:shadow-xl group"
                                            >
                                                <div className="relative aspect-[9/16] bg-gray-900">
                                                    {reel.thumbnailUrl || ytId ? (
                                                        <img
                                                            src={reel.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                                                            alt={reel.title}
                                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                                                            <FiVideo size={32} className="mb-2 opacity-20" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Real Estate Reel</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                        <p className="text-[10px] font-black text-white uppercase truncate tracking-wider">{reel.title}</p>
                                                        <p className="text-[8px] font-bold text-white/60 uppercase tracking-tighter mt-1">Click to Watch</p>
                                                    </div>
                                                </div>
                                                <div className="p-4 flex items-center justify-between gap-2 overflow-hidden bg-white">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{reel.title}</p>
                                                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase truncate">{reel.uploaderName}</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors flex-shrink-0">
                                                        <FiVideo size={14} />
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 grayscale border-2 border-dashed border-gray-100 rounded-[3rem] bg-white mx-4">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                        <FiVideo size={32} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">No Visual Tours Yet</h3>
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-center px-8">Currently mapping reels for this property segment.</p>
                                </div>
                            )
                        ) : (
                            loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-[2rem] h-[480px] shadow-sm animate-pulse flex flex-col overflow-hidden border border-gray-100">
                                        <div className="aspect-square bg-gray-50"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-4 bg-gray-50 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-50 rounded w-1/2"></div>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <div className="h-8 bg-gray-50 rounded-xl"></div>
                                                <div className="h-8 bg-gray-50 rounded-xl"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (properties.length > 0 || matchingVendors.length > 0) ? (
                            <div className="space-y-12">
                                {/* Matching Agencies Section — shown when searching for a shop name */}
                                {searchQuery && matchingVendors.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <span className="h-[2px] w-12 bg-primary-600"></span>
                                            <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase">Matching Agencies</h3>
                                            <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase">{matchingVendors.length} FIRM{matchingVendors.length > 1 ? 'S' : ''}</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {matchingVendors.map((vendor) => (
                                                <B2BVendorCard
                                                    key={vendor._id}
                                                    vendor={vendor}
                                                    trackContactClick={trackContactClick}
                                                    itemType="realestate"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Properties Grid — only show when NOT searching for an agency */}
                                {properties.length > 0 && !(searchQuery && matchingVendors.length > 0) && (
                                    <motion.div
                                        layout
                                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                                    >
                                        {properties.map(property => (
                                            <RealEstateCard
                                                key={property._id}
                                                property={property}
                                                selectedPriceUnit={selectedPriceUnit}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiSearch className="text-3xl text-gray-300" />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">No Matching Properties</h3>
                                <p className="text-gray-400 font-medium max-w-xs mx-auto mt-2 uppercase text-[10px] tracking-widest">No properties match your current filters in {selectedCity}</p>
                                <button onClick={handleClearFilters} className="mt-6 px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Reset All Filters</button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstate;
