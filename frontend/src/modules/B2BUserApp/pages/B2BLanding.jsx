/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiX, FiChevronDown, FiGrid, FiShoppingBag,
    FiUser, FiArrowRight, FiArrowLeft, FiBriefcase, FiTrendingUp, FiHome, FiMapPin, FiFilter,
    FiTruck, FiPhone, FiShoppingCart, FiVideo, FiImage, FiHeart
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { appLogo } from '../../../data/logos';
import lotSlotIcon from '../../../assets/icon/WhatsApp Image 2026-02-28 at 2.14.53 PM.jpeg';
import realEstateIcon from '../../../assets/icon/WhatsApp Image 2026-02-28 at 2.19.13 PM.jpeg';
import B2BBanner from '../components/B2BBanner';
import B2BProductCard from '../components/B2BProductCard';
import B2BVendorCard from '../components/B2BVendorCard';
import SupportCards from '../components/SupportCards';
import RealEstateCard from '../components/RealEstateCard';
import SuggestedProductCard from '../components/SuggestedProductCard';
import LiveReelCard from '../components/LiveReelCard';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import { debounce, getGoogleMapsUrl } from '../../../shared/utils/helpers';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';


const B2BLanding = () => {
    const navigate = useNavigate();
    const { categories, initialize: fetchCategories } = useB2BCategoryStore();
    const { isAuthenticated } = useAuthStore();
    const { isAuthenticated: isVendorAuthenticated } = useB2BVendorAuthStore();

    // Navigation helper: requires login for any navigation from landing page (except login/register)
    const navigateWithAuth = (path) => {
        const protectedPaths = [
            '/b2b/profile',
            '/b2b/cart',
            '/b2b/real-estate/property/'
        ];

        const isProtected = protectedPaths.some(p => path.startsWith(p));

        if (isProtected && !isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: path } } });
            return;
        }

        navigate(path);
    };

    // State
    const [suggestedProducts, setSuggestedProducts] = useState([]);
    const [liveReels, setLiveReels] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Popup States
    const [activePopup, setActivePopup] = useState(null); // 'subcategories' | 'products' | 'lots' | 'realEstate' | 'stores'
    const [selectedRootCategory, setSelectedRootCategory] = useState(null);
    const [popupProducts, setPopupProducts] = useState([]);
    const [popupVendors, setPopupVendors] = useState([]);
    const [popupProperties, setPopupProperties] = useState([]);

    // Dropdown States
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [isBusinessTypeDropdownOpen, setIsBusinessTypeDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Filter Data
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [businessTypes, setBusinessTypes] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState(null);
    const [allVendors, setAllVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [isMobileBusinessTypeOpen, setIsMobileBusinessTypeOpen] = useState(false);

    // Refs
    const searchRef = useRef(null);
    const categoryRef = useRef(null);
    const cityDropdownDesktopRef = useRef(null);
    const cityDropdownMobileRef = useRef(null);
    const priceDesktopRef = useRef(null);
    const priceMobileRef = useRef(null);
    const businessTypeRef = useRef(null);
    const headerRef = useRef(null);
    const toolbarRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(72); // Default fallback: 4.5rem = 72px
    const premiumSuppliersScrollRef = useRef(null);
    const isAutoScrollPaused = useRef(false);
    const resumeTimeoutRef = useRef(null);
    const lastAutoScrollTime = useRef(0);

    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [categorySearchQuery, setCategorySearchQuery] = useState('');

    // Store hooks
    const { states: availableStates, initialize: fetchLocations, isLoading: locationsLoading } = useB2BLocationStore();

    // Fetch initial data on mount
    useEffect(() => {
        fetchCategories();
        // Force refresh once to migrate location data format from strings to objects
        fetchLocations(true);

        const fetchBusinessTypes = async () => {
            try {
                const response = await api.get('/business-types');
                if (response.success) {
                    setBusinessTypes(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching business types:', error);
            }
        };

        const fetchAllVendors = async () => {
            try {
                setVendorsLoading(true);
                const params = { limit: 50, vendorType: 'b2b', nocache: 1 };
                if (selectedCity && selectedCity !== 'All Cities') {
                    params.city = selectedCity;
                }
                const response = await api.get('/vendors', { params });
                if (response.success && response.data) {
                    const vendorData = Array.isArray(response.data) ? response.data : (response.data.vendors || []);
                    setAllVendors(vendorData);
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
            } finally {
                setVendorsLoading(false);
            }
        };

        const fetchSuggestedProducts = async () => {
            try {
                const params = { limit: 10, vendorType: 'b2b' };
                if (selectedCity && selectedCity !== 'All Cities') {
                    params.city = selectedCity;
                }
                const response = await api.get('/products', { params });
                if (response.success && response.data) {
                    const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
                    setSuggestedProducts(products);
                }
            } catch (error) {
                console.error('Error fetching suggested products:', error);
            }
        };

        const fetchLiveReels = async () => {
            try {
                const response = await api.get('/reels/feed', { params: { limit: 10 } });
                if (response.success && response.data) {
                    const reels = Array.isArray(response.data) ? response.data : (response.data.reels || []);
                    setLiveReels(reels);
                }
            } catch (error) {
                console.error('Error fetching reels:', error);
            }
        };

        fetchBusinessTypes();
        fetchAllVendors();
        fetchSuggestedProducts();
        fetchLiveReels();
    }, [fetchCategories, fetchLocations, selectedCity]);

    // Effect to calculate header height dynamically
    useEffect(() => {
        const updateHeight = () => {
            const header = headerRef.current;
            const toolbar = toolbarRef.current;

            if (header) {
                setHeaderHeight(header.offsetHeight);
            }
        };

        // Initial update with small delay for layout stabilization
        const timer = setTimeout(updateHeight, 150);

        window.addEventListener('resize', updateHeight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    // Only show vendors that have a shop (shopUnit) in the strip; dedupe by id so same card never appears twice
    const vendorsWithShop = useMemo(() => {
        const withShop = (allVendors || []).filter((v) => v && v.shopUnit != null && (typeof v.shopUnit === 'object' ? Object.keys(v.shopUnit).length > 0 : true));
        const seen = new Set();
        return withShop.filter((v) => {
            const id = (v._id || v.id || '').toString();
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [allVendors]);

    // Auto-scroll logic for Premium Suppliers that allows manual scrolling
    useEffect(() => {
        const container = premiumSuppliersScrollRef.current;
        if (!container || vendorsWithShop.length === 0) return;

        let animationFrameId;
        let lastTimestamp = 0;
        const speed = 150; // Balanced fast speed

        let currentScroll = container.scrollLeft;
        const step = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            // Cap delta to 0.1s (100ms) to prevent massive jumps after browser lag/tab switching
            const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
            lastTimestamp = timestamp;

            if (!isAutoScrollPaused.current && container) {
                currentScroll += speed * delta;

                // Seamless loop logic (Bi-directional)
                const numCopies = Math.max(2, Math.ceil(24 / (vendorsWithShop.length || 1)));
                const oneSetWidth = container.scrollWidth / numCopies;
                
                if (oneSetWidth > 0) {
                    if (currentScroll >= oneSetWidth) {
                        currentScroll -= oneSetWidth;
                    } else if (currentScroll < 0) {
                        currentScroll += oneSetWidth;
                    }
                }
                
                lastAutoScrollTime.current = Date.now();
                container.scrollLeft = currentScroll;
            } else {
                // Keep sync if manually scrolled
                currentScroll = container.scrollLeft;
            }
            animationFrameId = requestAnimationFrame(step);
        };


        animationFrameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrameId);
    }, [vendorsWithShop]);

    // Helpers for controlling the auto-scroll without triggering re-renders
    const pauseAutoScroll = () => {
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        isAutoScrollPaused.current = true;
    };

    const resumeAutoScroll = (delay = 2000) => {
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
            isAutoScrollPaused.current = false;
        }, delay);
    };

    // Robust manual scroll detection
    useEffect(() => {
        const container = premiumSuppliersScrollRef.current;
        if (!container) return;

        const handleNativeScroll = () => {
            // If a scroll occurs that wasn't triggered by our auto-scroll logic (within a threshold)
            // we treat it as a manual user scroll and pause the auto-scroller.
            if (Date.now() - lastAutoScrollTime.current > 100) {
                pauseAutoScroll();
                resumeAutoScroll(2000);
            }
        };

        container.addEventListener('scroll', handleNativeScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleNativeScroll);
    }, []);





    const uniqueCities = useMemo(() => {
        const citiesList = (availableStates || []).flatMap(state => state.cities || []);
        const cityMap = new Map();
        citiesList.forEach(city => {
            const cityName = typeof city === 'string' ? city : (city && typeof city === 'object' && typeof city.name === 'string' ? city.name : null);
            if (!cityName) return;
            const clean = cityName.trim();
            const lower = clean.toLowerCase();
            const normalized = (lower === 'aagra') ? 'agra' : lower;
            if (!cityMap.has(normalized)) {
                cityMap.set(normalized, normalized === 'agra' ? 'Agra' : clean);
            }
        });
        return Array.from(cityMap.values()).filter(c => c.length > 0 && !/^\d+$/.test(c)).sort();
    }, [availableStates]);

    const filteredCitiesList = useMemo(() => {
        return citySearchQuery
            ? uniqueCities.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
            : uniqueCities;
    }, [citySearchQuery, uniqueCities]);

    // Derived State: Root Categories
    const rootCategories = useMemo(() => {
        // B2B categories from the new store don't have parentId, they are all roots
        return categories;
    }, [categories]);

    // Derived State: Filtered Categories for dropdown search
    const filteredCategories = useMemo(() => {
        if (!categorySearchQuery.trim()) return rootCategories;
        const q = categorySearchQuery.toLowerCase().trim();
        return rootCategories.filter(cat =>
            (cat.name || '').toLowerCase().includes(q)
        );
    }, [rootCategories, categorySearchQuery]);

    // Derived State: Subcategories of selected root
    const activeSubcategories = useMemo(() => {
        if (!selectedRootCategory) return [];
        // In B2B, subcategories are objects with {name, fields} structure
        // Transform them into objects with id and name for the UI to handle
        return (selectedRootCategory.subcategories || []).map((sub, index) => {
            const subName = typeof sub === 'string' ? sub : (sub?.name || '');
            return {
                id: `${selectedRootCategory.id}-sub-${index}`,
                name: subName,
                originalName: subName // Store original name for filtering
            };
        });
    }, [selectedRootCategory]);

    // --- Search Logic ---
    const debouncedFetchSuggestions = useMemo(
        () => debounce(async (query) => {
            if (query.trim().length < 1) {
                setSuggestions([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const response = await api.get(`/products/b2b-suggestions?q=${encodeURIComponent(query)}`);
                if (response.success) {
                    setSuggestions(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (value.trim().length > 0) {
            setShowSuggestions(true);
            debouncedFetchSuggestions(value);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSearchProductPopup = async (queryOrProduct) => {
        const searchTerm = typeof queryOrProduct === 'string' ? queryOrProduct : queryOrProduct.text;
        const isStoreSuggestion = typeof queryOrProduct !== 'string' && queryOrProduct.type === 'store';
        const isPropertySuggestion = typeof queryOrProduct !== 'string' && queryOrProduct.type === 'property';
        const isRealEstateSuggestion = typeof queryOrProduct !== 'string' && (
            queryOrProduct.isRealEstate ||
            (queryOrProduct.businessType && /developer|broker/i.test(queryOrProduct.businessType))
        );

        setIsSearching(true);
        setSearchQuery(searchTerm);

        const isStrict = typeof queryOrProduct !== 'string';

        try {
            if (isPropertySuggestion && queryOrProduct.id) {
                // Show specific property in the PropertiesPopup box
                setActivePopup('properties');
                setPopupProperties([]);
                const response = await api.get('/property/all', { params: { search: searchTerm, strict: isStrict } });
                if (response.success && response.data) {
                    setPopupProperties(response.data);
                }
            } else if ((isRealEstateSuggestion && queryOrProduct.vendorId) || isStoreSuggestion) {
                // User wants to see ALL matching stores when a suggestion is clicked
                setActivePopup('stores');
                setPopupVendors([]);
                const response = await api.get('/vendors', {
                    params: {
                        search: searchTerm,
                        strict: isStrict,
                        limit: 10
                    }
                });
                if (response.success && response.data) {
                    const vendorData = Array.isArray(response.data) ? response.data : (response.data.vendors || []);
                    setPopupVendors(vendorData.map(v => ({
                        ...v,
                        isRealEstate: v.isRealEstate || (v.businessType && /developer|broker/i.test(v.businessType))
                    })));
                }
            } else {
                // Determine if we should search for vendors too
                // Preserving product search as priority
                const baseParams = { search: searchTerm, limit: 10, strict: isStrict };
                if (selectedCity && selectedCity !== 'All Cities') {
                    baseParams.city = selectedCity;
                }

                const [productRes, vendorRes, propertyRes] = await Promise.all([
                    api.get('/products', { params: { ...baseParams, vendorType: 'b2b' } }),
                    api.get('/vendors', { params: baseParams }),
                    api.get('/property/all', { params: baseParams })
                ]);

                const products = productRes.success && productRes.data ? (Array.isArray(productRes.data) ? productRes.data : (productRes.data.products || [])) : [];
                const vendors = vendorRes.success && vendorRes.data ? (Array.isArray(vendorRes.data) ? vendorRes.data : (vendorRes.data.vendors || [])) : [];
                const properties = propertyRes.success && propertyRes.data ? propertyRes.data : [];

                setPopupProducts(products.map(p => ({ ...p, moq: p.moq || p.minimumOrderQuantity || 1 })));
                setPopupVendors(vendors);
                setPopupProperties(properties);

                // Correctly prioritize results
                // If we found a real estate vendor (Developer/Broker), show the Office box
                const hasOfficeMatch = vendors.some(v =>
                    v.isRealEstate ||
                    (v.businessType || '').toLowerCase().includes('developer') ||
                    (v.businessType || '').toLowerCase().includes('broker') ||
                    (v.businessType || '').toLowerCase().includes('office') ||
                    (v.businessType || '').toLowerCase().includes('property')
                );

                if (hasOfficeMatch) {
                    setActivePopup('stores');
                } else if (properties.length > 0) {
                    setActivePopup('properties');
                } else if (vendors.length > 0) {
                    setActivePopup('stores');
                } else {
                    setActivePopup('products'); // Default to products if no specific results
                }
            }
        } catch (e) {
            console.error("Error fetching popup data", e);
            setPopupProducts([]);
            setPopupVendors([]);
            setPopupProperties([]);
            setActivePopup('products');
        } finally {
            setIsSearching(false);
            setShowSuggestions(false);
        }
    };

    const handleCategoryClick = (category) => {
        // Check if this category has subcategories
        const hasSubcategories = category.subcategories && category.subcategories.length > 0;

        if (hasSubcategories) {
            setSelectedRootCategory(category);
            setIsCategoryDropdownOpen(false);
            setActivePopup('subcategories');
        } else {
            // No subcategories, navigate directly
            setIsCategoryDropdownOpen(false);
            const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
            navigateWithAuth(`/b2b/catalog?category=${encodeURIComponent(category.name)}${cityParam}`);
        }
    };

    const handleSubCategoryClick = (subCat) => {
        setActivePopup(null);
        const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
        // Pass subcategory name as well
        navigateWithAuth(`/b2b/catalog?category=${encodeURIComponent(selectedRootCategory.name)}&subcategory=${encodeURIComponent(subCat.originalName)}${cityParam}`);
    };

    const handleProductClick = (product) => {
        setActivePopup(null);
        navigateWithAuth(`/b2b/catalog`);
    };

    const handleHeaderPopupItemClick = (item) => {
        setActivePopup(null);
        navigateWithAuth(`/b2b/catalog?type=${item.type}&filter=${item.id}`);
    };

    const handleBusinessTypeClick = (type) => {
        // Check if it's a real estate type - navigate to real estate page (case-insensitive)
        const typeName = (type.name || '').toUpperCase().trim();
        if (typeName === 'DEVELOPER' || typeName === 'PROPERTY BROKER') {
            setIsBusinessTypeDropdownOpen(false);
            const t = typeName === 'DEVELOPER' ? 'developer' : 'broker';
            navigateWithAuth(`/b2b/real-estate?type=${encodeURIComponent(t)}`);
            return;
        }

        setIsBusinessTypeDropdownOpen(false);
        const cityParam = selectedCity !== 'All Cities' ? `&city=${encodeURIComponent(selectedCity)}` : '';
        navigateWithAuth(`/b2b/catalog?businessType=${encodeURIComponent(type.name)}${cityParam}`);
    };

    // Sub-business type click removed

    const closePopup = () => setActivePopup(null);

    // Track vendor contact clicks (call or whatsapp)
    const trackContactClick = async (vendorId, clickType) => {
        try {
            if (!vendorId) return;
            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType
            });
        } catch (error) {
            // Silently fail - tracking shouldn't block user action
            console.error('Error tracking click:', error);
        }
    };

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
            const isInsideCityDropdown =
                (cityDropdownDesktopRef.current && cityDropdownDesktopRef.current.contains(event.target)) ||
                (cityDropdownMobileRef.current && cityDropdownMobileRef.current.contains(event.target));
            if (!isInsideCityDropdown) {
                setIsCityDropdownOpen(false);
            }
            const isInsidePriceDropdown =
                (priceDesktopRef.current && priceDesktopRef.current.contains(event.target)) ||
                (priceMobileRef.current && priceMobileRef.current.contains(event.target));
            if (!isInsidePriceDropdown) {
                setIsPriceFilterOpen(false);
            }
            if (businessTypeRef.current && !businessTypeRef.current.contains(event.target)) {
                setIsBusinessTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // --- Render Components ---

    const SubCategoryPopup = () => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Explore Categories</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedRootCategory?.name}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {activeSubcategories.length > 0 ? (
                        activeSubcategories.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubCategoryClick(sub)}
                                className="p-5 md:p-6 rounded-[1.5rem] border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left transition-all group flex items-center justify-between"
                            >
                                <span className="font-black text-[11px] md:text-sm text-gray-700 group-hover:text-primary-600 uppercase tracking-wider">{sub.name}</span>
                                <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600 -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <FiGrid className="mx-auto text-4xl text-gray-200 mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No segments mapped</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    const GenericHeaderPopup = ({ title, data }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Marketplace Hub</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-white shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {data && data.length > 0 ? (
                        data.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleHeaderPopupItemClick(item)}
                                className="p-5 md:p-6 rounded-[1.5rem] border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left transition-all group flex items-center justify-between"
                            >
                                <span className="font-black text-[11px] md:text-sm text-gray-700 group-hover:text-primary-600 uppercase tracking-wider">{item.name}</span>
                                <FiArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-primary-600" />
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiTrendingUp className="text-primary-600 text-3xl" />
                            </div>
                            <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-2">Expansion in Progress</h4>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Connecting elite suppliers across India</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    const fetchLotProducts = async () => {
        try {
            const params = {
                itemType: 'lotslot',
                limit: 10,
                vendorType: 'b2b',
                excludeBusinessTypes: 'Developer,Property Broker'
            };

            if (selectedCity && selectedCity !== 'All Cities') {
                params.city = selectedCity;
            }

            const response = await api.get('/products', { params });

            if (response.success && response.data) {
                const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
                const normalizedProducts = products.map(p => ({
                    ...p,
                    moq: p.moq || p.minimumOrderQuantity || 1
                }));
                setPopupProducts(normalizedProducts);
            } else {
                setPopupProducts([]);
            }
        } catch (e) {
            console.error("Error fetching lot products", e);
            setPopupProducts([]);
        }
    };

    const PropertiesPopup = ({ title, onViewAll }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Verified Properties</p>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {popupProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popupProperties.slice(0, 10).map((property) => (
                                <RealEstateCard
                                    key={property._id}
                                    property={property}
                                    requireAuthForActions={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <FiHome size={28} className="opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-[9px]">No matching properties found</p>
                        </div>
                    )}
                </div>
                <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => {
                            closePopup();
                            if (onViewAll) onViewAll();
                            else navigateWithAuth('/b2b/real-estate');
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                        Explore Real Estate Hub <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const ProductPopup = ({ title, onViewAll, itemType }) => (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
            onClick={closePopup}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                            {popupProducts.some(p => p.itemType === 'lotslot') ? 'Verified Lots' : 'Verified Listings'}
                        </p>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
                    </div>
                    <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {popupProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {popupProducts.slice(0, 10).map((product) => (
                                <B2BProductCard
                                    key={product._id}
                                    product={product}
                                    viewMode="grid"
                                    trackContactClick={trackContactClick}
                                    itemType={itemType}
                                    requireAuthForActions={true}
                                    onCardClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/product/${product._id}`);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <FiShoppingBag size={28} className="opacity-20" />
                            </div>
                            <p className="font-black uppercase tracking-widest text-[9px]">No matches found in inventory</p>
                        </div>
                    )}
                </div>
                <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={() => {
                            closePopup();
                            if (onViewAll) onViewAll();
                            else navigateWithAuth('/b2b/catalog');
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                        View Full Marketplace <FiArrowRight />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const StorePopup = ({ title, onViewAll }) => {
        const hasRealEstate = popupVendors.some(v =>
            v.isRealEstate ||
            (v.businessType || '').toLowerCase().includes('developer') ||
            (v.businessType || '').toLowerCase().includes('broker') ||
            (v.businessType || '').toLowerCase().includes('office') ||
            (v.businessType || '').toLowerCase().includes('property')
        );
        return (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 md:p-4"
                onClick={closePopup}
            >
                <motion.div
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                                {hasRealEstate ? 'Verified Offices' : 'Verified Stores'}
                            </p>
                            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">
                                {hasRealEstate ? title.replace(/Stores/i, 'Offices') : title}
                            </h3>
                        </div>
                        <button onClick={closePopup} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                            <FiX size={20} />
                        </button>
                    </div>
                    <div className="p-4 md:p-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                        {popupVendors.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {popupVendors.slice(0, 10).map((vendor) => (
                                    <B2BVendorCard
                                        key={vendor._id}
                                        vendor={vendor}
                                        viewMode="grid"
                                        trackContactClick={trackContactClick}
                                        itemType={hasRealEstate ? 'realestate' : ''}
                                        requireAuthForActions={true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                    <FiBriefcase size={28} className="opacity-20" />
                                </div>
                                <p className="font-black uppercase tracking-widest text-[9px]">No matching {hasRealEstate ? 'offices' : 'stores'} found</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                        {hasRealEstate ? (
                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}`);
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                                >
                                    Explore Real Estate Hub <FiArrowRight />
                                </button>
                                <button
                                    onClick={() => {
                                        closePopup();
                                        navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}&strict=true&shopOnly=true`);
                                    }}
                                    className="flex-1 px-6 py-3 bg-primary-50 text-primary-700 rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-primary-600 hover:text-white transition-all border border-primary-200 shadow-xl shadow-primary-100 flex items-center justify-center gap-3"
                                >
                                    View Marketplace <FiArrowRight />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    closePopup();
                                    if (onViewAll) {
                                        onViewAll();
                                    } else {
                                        navigateWithAuth('/b2b/catalog');
                                    }
                                }}
                                className="w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl md:rounded-full font-black text-[9px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                            >
                                View Full Marketplace <FiArrowRight />
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        );
    };



    const handleGlobalClickCapture = (e) => {
        if (!isAuthenticated) {
            e.stopPropagation();
            e.preventDefault();
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
        }
    };

    
    const allSubcategories = useMemo(() => {
        let subs = [];
        (rootCategories || []).forEach(cat => {
            if (cat.subcategories && cat.subcategories.length > 0) {
                const mappedSubs = cat.subcategories.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : (sub?.name || '');
                    return {
                        id: `${cat.id}-sub-${idx}`,
                        name: subName,
                        originalName: subName,
                        image: sub?.image || cat.image || null,
                        parentCatName: cat.name
                    };
                });
                subs = [...subs, ...mappedSubs];
            }
        });
        return subs;
    }, [rootCategories]);

    return (
        <div 
            className="min-h-screen bg-white font-sans text-gray-900 flex flex-col scrollbar-hide"
            onClickCapture={handleGlobalClickCapture}
        >
            
            {/* --- E-COMMERCE HEADER (Web & Mobile) --- */}
            <div ref={headerRef} className="bg-white border-b border-gray-100 shadow-sm pt-safe pb-2 sticky top-0 z-[1000]">
                <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                    {/* Top Row: Logo & Quick Actions */}
                    <div className="flex items-center justify-between py-2">
                        <Link to={!isAuthenticated ? "/b2b/login" : (window.location.pathname.includes('/b2b/catalog') ? "/b2b/landing" : "/b2b/catalog")} className="hover:opacity-80 transition-opacity flex-shrink-0">
                            <img src={appLogo.src} alt="Bagferi" className="h-10 md:h-12 w-auto object-contain" />
                        </Link>
                        
                        <div className="flex items-center gap-2 lg:gap-4">


                            <Link to="/b2b/wishlist" onClick={(e) => { e.preventDefault(); navigateWithAuth('/b2b/wishlist'); }} className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all">
                                <FiHeart className="text-lg md:text-xl" />
                            </Link>
                            <Link to="/b2b/cart" onClick={(e) => { e.preventDefault(); navigateWithAuth('/b2b/cart'); }} className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all">
                                <FiShoppingCart className="text-lg md:text-xl" />
                            </Link>

                            {/* User Actions */}
                            {!isAuthenticated ? (
                                <Link to="/b2b/login" className="px-3 py-1.5 md:px-5 md:py-2 bg-primary-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-200">
                                    Login
                                </Link>
                            ) : (
                                <Link to="/b2b/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all">
                                    <FiUser className="text-lg md:text-xl" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Search Bar */}
                    <div className="py-2">
                        <div className="relative" ref={searchRef}>
                            <div className="relative group">
                                <FiSearch className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg md:text-xl group-focus-within:text-primary-600 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onFocus={() => {
                                        if (searchQuery.trim().length > 0) setShowSuggestions(true);
                                    }}
                                    placeholder="Search products, stores, real estate..."
                                    className="w-full bg-gray-50/80 border border-gray-200 text-gray-900 text-sm md:text-base rounded-2xl md:rounded-[1.2rem] pl-12 pr-12 md:pl-14 md:pr-14 py-3.5 md:py-4 focus:ring-4 focus:ring-primary-50 focus:border-primary-300 focus:bg-white transition-all outline-none font-medium placeholder-gray-400 shadow-inner"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim()) {
                                            handleSearchProductPopup(searchQuery.trim());
                                        }
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSuggestions([]);
                                            setShowSuggestions(false);
                                        }}
                                        className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <FiX size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Search Suggestions */}
                            <AnimatePresence>
                                {showSuggestions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100]"
                                    >
                                        {isSearching ? (
                                            <div className="p-8 text-center text-gray-400">
                                                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Searching...</p>
                                            </div>
                                        ) : suggestions.length > 0 ? (
                                            <ul className="max-h-[300px] overflow-y-auto py-2 custom-scrollbar">
                                                {suggestions.map((suggestion, index) => (
                                                    <li key={index}>
                                                        <button
                                                            onClick={() => handleSearchProductPopup(suggestion)}
                                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-700 group-hover:text-primary-600 truncate">{suggestion.text}</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                                                                    {suggestion.type === 'product' ? 'Product' : suggestion.type === 'store' ? 'Store' : 'Real Estate'}
                                                                </span>
                                                            </div>
                                                            <FiArrowRight className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-primary-500 transition-all -translate-x-2 group-hover:translate-x-0" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-8 text-center text-gray-400">
                                                <FiSearch className="mx-auto text-2xl mb-3 opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No results found</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT START --- */}
            <div className="flex-1 overflow-y-auto pb-20">

                {/* --- HORIZONTAL CATEGORY SLIDER --- */}
                <section className="w-full bg-white pt-4 pb-2 border-b border-gray-50">
                    <div className="max-w-[1920px] mx-auto px-2">
                        <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-6 px-2 snap-x">
                            {rootCategories.map((cat, idx) => (
                                <button
                                    key={cat.id || idx}
                                    onClick={() => handleCategoryClick(cat)}
                                    className="flex flex-col items-center gap-2 min-w-[70px] md:min-w-[90px] snap-start group"
                                >
                                    <div className="w-[60px] h-[60px] md:w-[75px] md:h-[75px] rounded-full overflow-hidden bg-orange-50 border-2 border-transparent group-hover:border-primary-500 transition-all flex items-center justify-center p-1">
                                        {cat.image ? (
                                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-primary-100 flex items-center justify-center text-primary-500">
                                                <FiGrid size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] md:text-[11px] font-black text-gray-700 text-center uppercase tracking-tight leading-tight line-clamp-2 max-w-[70px] md:max-w-[90px]">
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- BANNER SECTION --- */}
                <section className="w-full bg-white pt-3 pb-3">
                    <div className="max-w-[1920px] mx-auto px-3 md:px-4">
                        <div className="rounded-[1rem] md:rounded-[1.4rem] overflow-hidden shadow-sm">
                            <B2BBanner />
                        </div>
                    </div>
                </section>


                {/* --- LOWEST PRICES: ONLY ON LIVE --- */}
                {liveReels.length > 0 && (
                    <section className="w-full bg-[#f3f0ff] pt-6 pb-6 mt-4">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-gray-900">Featured Product Videos</h2>
                                    <p className="text-sm text-gray-600 font-medium">Discover products in action</p>
                                </div>
                                <button className="w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                                    <FiArrowRight size={16} />
                                </button>
                            </div>
                            <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-4 pb-4 snap-x">
                                {liveReels.map(reel => (
                                    <div key={reel._id} className="snap-start">
                                        <LiveReelCard reel={reel} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* --- EXPLORE MORE (Subcategories Grid) --- */}
                {allSubcategories.length > 0 && (
                    <section className="w-full bg-white pt-4 pb-4">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <h2 className="text-[14px] md:text-lg font-black text-gray-900 mb-4 capitalize">Explore More</h2>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-6">
                                {allSubcategories.slice(0, 16).map((sub, idx) => (
                                    <button
                                        key={sub.id || idx}
                                        onClick={() => {
                                            const rootCat = rootCategories.find(c => c.name === sub.parentCatName);
                                            if (rootCat) {
                                                setSelectedRootCategory(rootCat);
                                                handleSubCategoryClick(sub);
                                            }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-[50px] h-[50px] md:w-[65px] md:h-[65px] rounded-[1rem] bg-gray-50 overflow-hidden shadow-sm border border-gray-100 group-hover:border-primary-300 group-hover:shadow-md transition-all">
                                            {sub.image ? (
                                                <img src={sub.image} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:text-primary-400 group-hover:bg-primary-50 transition-colors">
                                                    <FiGrid size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] md:text-[11px] font-bold text-gray-600 text-center uppercase tracking-tight leading-tight line-clamp-2">
                                            {sub.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                )}



                {/* --- SUGGESTED FOR YOU --- */}
                {suggestedProducts.length > 0 && (
                    <section className="w-full bg-white pt-6 pb-2">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl md:text-2xl font-black text-gray-900 capitalize">Suggested For You</h2>
                                <button className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors">
                                    <FiArrowRight size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                                {suggestedProducts.map(prod => (
                                    <SuggestedProductCard key={prod._id} product={prod} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* --- SUPPORT SECTION --- */}
                <SupportCards />


            </div>
            {/* --- POPUPS --- */}

            <AnimatePresence>
                {activePopup === 'subcategories' && <SubCategoryPopup />}

                {activePopup === 'products' && (
                    <ProductPopup
                        title={`Related Products for "${searchQuery}"`}
                        onViewAll={() => navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}`)}
                    />
                )}
                {activePopup === 'properties' && (
                    <PropertiesPopup
                        title={`Matching Properties for "${searchQuery}"`}
                        onViewAll={() => navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}&strict=true`)}
                    />
                )}
                {activePopup === 'stores' && (
                    <StorePopup
                        title={`Matching Stores for "${searchQuery}"`}
                        onViewAll={() => {
                            const hasRealEstateMatch = popupVendors.some(v =>
                                v.isRealEstate ||
                                (v.businessType || '').toLowerCase().includes('developer') ||
                                (v.businessType || '').toLowerCase().includes('broker') ||
                                (v.businessType || '').toLowerCase().includes('office') ||
                                (v.businessType || '').toLowerCase().includes('property')
                            );
                            if (hasRealEstateMatch) {
                                navigateWithAuth(`/b2b/real-estate?search=${encodeURIComponent(searchQuery)}&strict=true`);
                            } else {
                                navigateWithAuth(`/b2b/catalog?search=${encodeURIComponent(searchQuery)}&strict=true`);
                            }
                        }}
                    />
                )}
                {activePopup === 'lots' && (
                    <ProductPopup
                        title="Explore Lot / Slot"
                        itemType="lotslot"
                        onViewAll={() => navigateWithAuth('/b2b/catalog?itemType=lotslot')}
                    />
                )}
            </AnimatePresence>

            {/* Fixed Bottom Navigation for Mobile */}
            <div className="md:hidden">
                <B2BBottomNav />
            </div>
        </div>
    );
};

export default B2BLanding;
