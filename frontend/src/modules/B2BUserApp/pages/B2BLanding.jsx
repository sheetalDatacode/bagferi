/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiX, FiChevronDown, FiGrid, FiShoppingBag,
    FiUser, FiArrowRight, FiArrowLeft, FiBriefcase, FiTrendingUp, FiHome, FiMapPin, FiFilter,
    FiTruck, FiPhone, FiShoppingCart, FiVideo, FiImage, FiHeart,
    FiCheckCircle, FiXCircle, FiCreditCard, FiRefreshCw, FiPackage, FiShield, FiStar, FiAward
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
import B2BHeaderComponent from '../components/Layout/B2BHeader';
import api from '../../../shared/utils/api';
import { debounce, getGoogleMapsUrl } from '../../../shared/utils/helpers';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useB2BLocationStore } from '../../../shared/store/b2bLocationStore';
import { useB2BVendorAuthStore } from '../../B2BVendor/store/b2bVendorAuthStore';
const ICONS = {
    FiCheckCircle, FiXCircle, FiTruck, FiCreditCard, 
    FiRefreshCw, FiPackage, FiShield, FiTrendingUp, FiStar, FiAward
};

const B2BLanding = () => {
    const navigate = useNavigate();
    const { categories, initialize: fetchCategories } = useB2BCategoryStore();
    const { isAuthenticated, user } = useAuthStore();
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
    const [groceryCategories, setGroceryCategories] = useState([]);
    const [groceryProducts, setGroceryProducts] = useState([]);
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
    
    // Address & delivery zone filtering states
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddAddressForm, setShowAddAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        streetAddress: '',
        areaName: '',
        city: '',
        state: '',
        pincode: '',
        addressType: 'Home',
        isDefault: false
    });

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
    const [homeFeatures, setHomeFeatures] = useState([]);

    // Store hooks
    const { states: availableStates, initialize: fetchLocations, isLoading: locationsLoading } = useB2BLocationStore();

    // Fetch saved addresses if logged in
    useEffect(() => {
        const fetchSavedAddresses = async () => {
            if (!isAuthenticated) {
                setAddresses([]);
                setSelectedAddress(null);
                return;
            }
            try {
                const res = await api.get('/user/addresses');
                if (res.success && res.data) {
                    setAddresses(res.data);
                    const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
                    if (defaultAddr) {
                        setSelectedAddress(defaultAddr);
                    }
                }
            } catch (error) {
                console.error('Error fetching user addresses:', error);
            }
        };
        fetchSavedAddresses();
    }, [isAuthenticated]);

    // Handle adding a new address
    const handleAddAddressSubmit = async (e) => {
        e.preventDefault();
        if (!newAddress.streetAddress || !newAddress.city || !newAddress.state || !newAddress.pincode) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            const res = await api.post('/user/addresses', newAddress);
            if (res.success) {
                toast.success('Address added successfully');
                setAddresses(res.data || []);
                const added = res.data && res.data[res.data.length - 1];
                if (added) setSelectedAddress(added);
                setShowAddAddressForm(false);
                setNewAddress({
                    streetAddress: '',
                    areaName: '',
                    city: '',
                    state: '',
                    pincode: '',
                    addressType: 'Home',
                    isDefault: false
                });
            }
        } catch (error) {
            console.error('Error adding address:', error);
            toast.error('Failed to add address');
        }
    };

    // 1. Mount effect for static data / configurations
    useEffect(() => {
        fetchCategories();
        fetchLocations(true);

        const fetchHomeFeatures = async () => {
            try {
                const response = await api.get('/public/b2b-settings');
                if (response.success && response.data?.homeFeatures) {
                    setHomeFeatures(response.data.homeFeatures.filter(f => f.isActive));
                }
            } catch (error) {
                console.error('Error fetching home features:', error);
            }
        };
        fetchHomeFeatures();

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
        fetchBusinessTypes();

        const fetchLiveReels = async () => {
            try {
                const response = await api.get('/reels/feed', { params: { limit: 50 } });
                if (response.success && response.data) {
                    const reels = Array.isArray(response.data) ? response.data : (response.data.reels || []);
                    const productReels = reels.filter(r => r.productId != null && r.productId !== "");
                    setLiveReels(productReels);
                }
            } catch (error) {
                console.error('Error fetching reels:', error);
            }
        };
        fetchLiveReels();
    }, [fetchCategories, fetchLocations]);

    // 2. Filter-dependent effect: Refetches vendors and products when selectedCity or selectedAddress changes
    useEffect(() => {
        const fetchAllVendors = async () => {
            try {
                setVendorsLoading(true);
                const params = { limit: 50, vendorType: 'b2b', nocache: 1 };
                
                if (selectedAddress) {
                    params.city = selectedAddress.city;
                    params.area = selectedAddress.areaName;
                    if (selectedAddress.pincode) {
                        params.pincode = selectedAddress.pincode;
                    }
                } else if (selectedCity && selectedCity !== 'All Cities') {
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
                
                if (selectedAddress) {
                    params.city = selectedAddress.city;
                    params.area = selectedAddress.areaName;
                    if (selectedAddress.pincode && selectedAddress.areaName) {
                        params.deliveryArea = `${selectedAddress.pincode}|${selectedAddress.areaName}`;
                    }
                } else if (selectedCity && selectedCity !== 'All Cities') {
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

        const fetchGroceryData = async () => {
            try {
                const catRes = await api.get('/grocery/categories');
                if (catRes.success) {
                    setGroceryCategories(catRes.data || []);
                }
                
                // Filter grocery products by delivery location if address is set
                const params = { limit: 10 };
                if (selectedAddress) {
                    params.city = selectedAddress.city;
                    params.area = selectedAddress.areaName;
                } else if (selectedCity && selectedCity !== 'All Cities') {
                    params.city = selectedCity;
                }

                const prodRes = await api.get('/grocery/products', { params });
                if (prodRes.success) {
                    const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.products || []);
                    setGroceryProducts(prods);
                }
            } catch (error) {
                console.error('Error fetching grocery data:', error);
            }
        };

        fetchAllVendors();
        fetchSuggestedProducts();
        fetchGroceryData();
    }, [selectedCity, selectedAddress]);

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
        // If it's the Grocery category, navigate to the grocery specific catalog
        if (category.name.toLowerCase() === 'grocery & essentials' || category.name.toLowerCase() === 'grocery') {
            setIsCategoryDropdownOpen(false);
            navigateWithAuth('/b2b/grocery');
            return;
        }

        // Navigate to categories page with the selected category pre-selected
        setIsCategoryDropdownOpen(false);
        navigateWithAuth(`/b2b/categories?category=${encodeURIComponent(category.name)}`);
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
            <B2BHeaderComponent 
                sticky={true}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={(q) => handleSearchProductPopup(q)}
                searchPlaceholder="Search products, stores, real estate..."
            />

            {/* --- MAIN CONTENT START --- */}
            <div className="flex-1 overflow-y-auto pb-20">

                {/* --- MOBILE LOCATION & SEARCH (Blinkit style) --- */}
                <div className="lg:hidden w-full bg-gradient-to-b from-orange-50/80 to-white pt-2 pb-4 px-4 shadow-sm mb-1 relative">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-[22px] font-black text-gray-900 tracking-tighter leading-none">Deliver Now</h2>
                            </div>
                            <button onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)} className="flex items-center gap-1 text-[11px] font-bold text-gray-800 text-left w-full">
                                <span className="truncate max-w-[80vw]">
                                    {selectedAddress 
                                        ? `${selectedAddress.addressType || 'Work'}: ${selectedAddress.areaName || selectedAddress.city} (${selectedAddress.pincode})` 
                                        : (selectedCity !== 'All Cities' ? `HOME - ${selectedCity}` : 'HOME - Set your location')
                                    }
                                </span> 
                                <FiChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => navigateWithAuth('/b2b/profile')} className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 hover:text-primary-600 transition-colors">
                                <FiUser size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Location & Address Dropdown */}
                    <AnimatePresence>
                        {isCityDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                className="absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] p-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
                            >
                                {!showAddAddressForm ? (
                                    <div className="space-y-4">
                                        {/* Saved Addresses Section */}
                                        <div>
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-2">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Delivery Addresses</span>
                                                {isAuthenticated && (
                                                    <button 
                                                        onClick={() => setShowAddAddressForm(true)} 
                                                        className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 tracking-wider"
                                                    >
                                                        + Add New
                                                    </button>
                                                )}
                                            </div>

                                            {!isAuthenticated ? (
                                                <div className="py-4 text-center">
                                                    <p className="text-xs text-gray-400 font-bold mb-2">Login to see your saved addresses</p>
                                                    <button 
                                                        onClick={() => navigate('/b2b/login')} 
                                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/25"
                                                    >
                                                        Login
                                                    </button>
                                                </div>
                                            ) : addresses.length === 0 ? (
                                                <div className="py-4 text-center">
                                                    <p className="text-xs text-gray-400 font-bold mb-2">No saved addresses found</p>
                                                    <button 
                                                        onClick={() => setShowAddAddressForm(true)} 
                                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/25"
                                                    >
                                                        Add First Address
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {addresses.map(addr => (
                                                        <button
                                                            key={addr._id}
                                                            onClick={() => {
                                                                setSelectedAddress(addr);
                                                                setIsCityDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                                                                selectedAddress?._id === addr._id 
                                                                    ? 'border-primary-600 bg-primary-50/50 text-primary-900 shadow-sm' 
                                                                    : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${selectedAddress?._id === addr._id ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
                                                                {selectedAddress?._id === addr._id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-black uppercase tracking-wide">{addr.addressType || 'Work'}</span>
                                                                    {addr.isDefault && <span className="bg-primary-100 text-primary-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Default</span>}
                                                                </div>
                                                                <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5">{addr.streetAddress}</p>
                                                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight mt-0.5">{addr.areaName || addr.city}, {addr.city} ({addr.pincode})</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* City/Region Dropdown fallback */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Or Choose City</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['All Cities', 'Surat', 'Ahmedabad', 'Mumbai', 'Delhi', 'Bengaluru'].map(city => (
                                                    <button
                                                        key={city}
                                                        onClick={() => {
                                                            setSelectedAddress(null);
                                                            setSelectedCity(city);
                                                            setIsCityDropdownOpen(false);
                                                        }}
                                                        className={`text-center py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${selectedCity === city && !selectedAddress ? 'border-primary-600 text-primary-600 bg-primary-50' : 'border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        {city}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Add New Address Form */
                                    <form onSubmit={handleAddAddressSubmit} className="space-y-3.5">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                                            <span className="text-xs font-black uppercase text-gray-800 tracking-wider">Add Delivery Address</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowAddAddressForm(false)} 
                                                className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 tracking-wider"
                                            >
                                                Back
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Address Type</label>
                                                <select 
                                                    value={newAddress.addressType}
                                                    onChange={(e) => setNewAddress({ ...newAddress, addressType: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none"
                                                >
                                                    <option value="Home">Home</option>
                                                    <option value="Work">Work</option>
                                                    <option value="Warehouse">Warehouse</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Pincode *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    placeholder="395003"
                                                    value={newAddress.pincode}
                                                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary-300 focus:bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Street Address *</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="Shop No, Building Name, Street Address"
                                                value={newAddress.streetAddress}
                                                onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary-300 focus:bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Area Name *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    placeholder="Ring Road"
                                                    value={newAddress.areaName}
                                                    onChange={(e) => setNewAddress({ ...newAddress, areaName: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary-300 focus:bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">City *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    placeholder="Surat"
                                                    value={newAddress.city}
                                                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary-300 focus:bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">State *</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="Gujarat"
                                                value={newAddress.state}
                                                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-800 outline-none focus:border-primary-300 focus:bg-white"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setShowAddAddressForm(false)} 
                                                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/20"
                                            >
                                                Save & Select
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mobile Search Bar */}
                    <div className="relative group mt-2">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <FiSearch className="text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search products, stores, real estate..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                            className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-bold text-sm tracking-tight placeholder:text-gray-400 placeholder:font-medium shadow-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-600 border-l border-gray-200 pl-3 py-1 cursor-pointer hover:opacity-80 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                        </div>
                        
                        {/* Render Mobile Search Suggestions */}
                        <AnimatePresence>
                            {showSuggestions && (suggestions.length > 0 || isSearching) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
                                    className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-2"
                                >
                                    {isSearching && suggestions.length === 0 ? (
                                        <div className="px-6 py-4 text-xs font-black text-gray-500 flex items-center gap-3 uppercase tracking-widest">
                                            <div className="w-4 h-4 border-2 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                            Loading...
                                        </div>
                                    ) : (
                                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                                            {suggestions.map((suggestion, index) => {
                                                const isStore = suggestion.type === 'store' && suggestion.vendorId;
                                                const vendorLinkUrl = suggestion.isRealEstate
                                                    ? `/b2b/real-estate?vendorId=${suggestion.vendorId}`
                                                    : `/b2b/vendor/${suggestion.vendorId}`;
                                                const Wrapper = isStore ? Link : 'button';
                                                const wrapperProps = isStore
                                                    ? { to: vendorLinkUrl, onClick: (e) => { e.stopPropagation(); setShowSuggestions(false); } }
                                                    : { type: 'button', onMouseDown: (e) => { e.preventDefault(); handleSearchProductPopup(suggestion); setShowSuggestions(false); } };
                                                return (
                                                    <Wrapper
                                                        key={index}
                                                        {...wrapperProps}
                                                        className="w-full px-4 py-3 hover:bg-primary-50 flex items-center gap-3 text-left transition-all group no-underline border-b border-gray-50 last:border-0"
                                                    >
                                                        {(suggestion.type === 'product' || suggestion.type === 'store') && suggestion.image ? (
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm">
                                                                <img src={suggestion.image} alt={suggestion.text} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 flex-shrink-0 border border-gray-100">
                                                                {suggestion.type === 'property' || suggestion.isRealEstate ? <FiHome size={14} /> : <FiSearch size={14} />}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">{suggestion.text}</p>
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">{suggestion.context}</p>
                                                        </div>
                                                    </Wrapper>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

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

                {/* --- FEATURE CARDS SECTION --- */}
                {homeFeatures && homeFeatures.length > 0 && (
                    <section className="w-full bg-white pb-6 pt-6">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <div className="mb-4">
                                <h2 className="text-[14px] md:text-lg font-black text-gray-900 capitalize">Platform Benefits</h2>
                                <p className="text-[11px] md:text-sm text-gray-500 mt-1">Enjoy these exclusive benefits designed to make your wholesale shopping seamless and secure.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                {homeFeatures.map((feature, idx) => {
                                    const Icon = ICONS[feature.iconName] || FiCheckCircle;
                                    return (
                                        <div key={idx} className="bg-gray-50 border border-gray-100 rounded-[1rem] p-4 flex items-start gap-3 hover:shadow-md hover:border-primary-100 transition-all duration-300 group">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm shrink-0 group-hover:scale-110 group-hover:bg-primary-50 transition-transform">
                                                <Icon className="text-xl md:text-2xl" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <h3 className="text-[13px] md:text-sm font-bold text-gray-900 leading-tight">
                                                    {feature.title}
                                                </h3>
                                                {feature.subtitle && (
                                                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 line-clamp-2">
                                                        {feature.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}


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

                {/* --- GROCERY & ESSENTIALS --- */}
                {groceryCategories.length > 0 && (
                    <section className="w-full bg-white pt-6 pb-4">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-[14px] md:text-lg font-black text-gray-900 capitalize">Grocery & Essentials</h2>
                                </div>
                                <button 
                                    onClick={() => navigateWithAuth('/b2b/grocery')}
                                    className="text-xs font-bold text-primary-600 hover:text-primary-700"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-6 pb-4 px-2 snap-x">
                                {groceryCategories.map((cat, idx) => (
                                    <button
                                        key={cat._id || idx}
                                        onClick={() => navigateWithAuth(`/b2b/grocery/category/${cat._id}`)}
                                        className="flex flex-col items-center gap-2 group min-w-[70px] md:min-w-[90px] snap-start"
                                    >
                                        <div className="w-[50px] h-[50px] md:w-[65px] md:h-[65px] rounded-[1rem] bg-gray-50 overflow-hidden shadow-sm border border-gray-100 group-hover:border-primary-300 group-hover:shadow-md transition-all">
                                            {cat.image ? (
                                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:text-primary-400 group-hover:bg-primary-50 transition-colors">
                                                    <FiGrid size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] md:text-[11px] font-bold text-gray-600 text-center uppercase tracking-tight leading-tight line-clamp-2">
                                            {cat.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* --- TRENDING GROCERY --- */}
                {groceryProducts.length > 0 && (
                    <section className="w-full bg-white pt-2 pb-6">
                        <div className="max-w-[1920px] mx-auto px-4 md:px-6">
                            <h2 className="text-[14px] md:text-lg font-black text-gray-900 mb-4 capitalize">Trending Grocery</h2>
                            <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-4 pb-4 px-2 snap-x">
                                {groceryProducts.map(prod => (
                                    <div key={prod._id} className="w-[150px] min-w-[150px] md:w-[200px] md:min-w-[200px] shrink-0 snap-start">
                                        <SuggestedProductCard product={prod} linkPrefix="/b2b/grocery/product/" />
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
                            <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-6 pb-4 px-2 snap-x">
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
                                        className="flex flex-col items-center gap-2 group min-w-[70px] md:min-w-[90px] snap-start"
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
