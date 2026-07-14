import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiGrid, FiLayout, FiHome, FiVideo, FiImage, FiBriefcase } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { appLogo } from '../../../../data/logos';
import lotSlotIcon from '../../../../assets/icon/WhatsApp Image 2026-02-28 at 2.14.53 PM.jpeg';
import realEstateIcon from '../../../../assets/icon/WhatsApp Image 2026-02-28 at 2.19.13 PM.jpeg';
import { debounce } from '../../../../shared/utils/helpers';
import api from '../../../../shared/utils/api';
import { useAuthStore } from '../../../../shared/store/authStore';
import { useB2BVendorAuthStore } from '../../../B2BVendor/store/b2bVendorAuthStore';

const B2BHeader = ({ showBack = false, title = "Bulk Marketplace", sticky = true, searchQuery: propSearchQuery, onSearchChange, onSearchSubmit, hideSearch = false, customNav, searchPlaceholder = "SEARCH PRODUCTS AND SHOPS", suggestionEndpoint = "/products/b2b-suggestions", transparent = false, minimal = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentSearchParams] = useSearchParams();
    const currentItemType = currentSearchParams.get('itemType') || null;
    const { isAuthenticated, user } = useAuthStore();
    const { isAuthenticated: isVendorAuthenticated } = useB2BVendorAuthStore();
    const [localSearchQuery, setLocalSearchQuery] = useState(propSearchQuery || '');

    const handlePosterRedirect = () => {
        const returnUrl = window.location.origin + '/b2b/catalog';
        window.location.href = `https://poster.dealingindia.com/?return_url=${encodeURIComponent(returnUrl)}`;
    };
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const headerRef = React.useRef(null);

    // Sync local state when prop changes
    useEffect(() => {
        if (propSearchQuery !== undefined) {
            setLocalSearchQuery(propSearchQuery);
        }
    }, [propSearchQuery]);

    // Calculate header height
    useEffect(() => {
        const updateHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        if (headerRef.current) resizeObserver.observe(headerRef.current);
        window.addEventListener('resize', updateHeight);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    // Create debounced search function
    const debouncedFetchSuggestions = React.useMemo(
        () => debounce(async (query) => {
            if (query.trim().length < 1) {
                setSuggestions([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            try {
                const response = await api.get(`${suggestionEndpoint}?q=${encodeURIComponent(query)}`);
                if (response.success) {
                    const data = response.data || [];
                    if (!Array.isArray(data) && typeof data === 'object') {
                        // Flatten object of categories (like {stores: [], properties: []})
                        const flattened = Object.values(data).flat();
                        setSuggestions(flattened);
                    } else {
                        setSuggestions(data);
                    }
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
        setLocalSearchQuery(value);
        if (onSearchChange) {
            onSearchChange(value);
        }

        if (value.trim().length > 0) {
            setShowSuggestions(true);
            debouncedFetchSuggestions(value);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setLocalSearchQuery(suggestion.text);
        setShowSuggestions(false);

        // Property suggestions: navigate to property details
        if (suggestion.type === 'property' && suggestion.id) {
            navigate(`/b2b/real-estate/property/${suggestion.id}`);
            return;
        }

        // Store suggestions
        if (suggestion.type === 'store' && suggestion.vendorId) {
            // If it's a real estate office, go to real estate page
            if (suggestion.isRealEstate) {
                navigate(`/b2b/real-estate?vendorId=${suggestion.vendorId}`);
                return;
            }

            const vendorUrl = currentItemType
                ? `/b2b/vendor/${suggestion.vendorId}?itemType=${currentItemType}`
                : `/b2b/vendor/${suggestion.vendorId}`;
            navigate(vendorUrl);
            return;
        }

        const query = suggestion.text;
        if (onSearchSubmit) {
            onSearchSubmit(query);
        } else {
            navigate(`/b2b/catalog?search=${encodeURIComponent(query)}`);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const query = localSearchQuery.trim();

        if (onSearchSubmit) {
            // If parent component provides submit handler, use it
            onSearchSubmit(query);
        } else {
            // Otherwise, navigate to product catalog with search query
            if (query) {
                navigate(`/b2b/catalog?search=${encodeURIComponent(query)}`);
            } else {
                navigate('/b2b/catalog');
            }
        }
    };

    const handleNavClick = (e, path) => {
        const protectedPaths = [
            '/b2b/profile',
            '/b2b/cart',
            '/b2b/real-estate/property/'
        ];

        const isProtected = protectedPaths.some(p => path.startsWith(p));

        if (isProtected && !isAuthenticated) {
            e.preventDefault();
            navigate('/b2b/login', { state: { from: { pathname: path } } });
        }
    };

    return (
        <div className="flex-shrink-0">
            <header 
                ref={headerRef}
                className={`${sticky !== false ? 'fixed top-0 left-0 right-0' : 'relative'} z-[1000] ${transparent ? 'bg-transparent border-none shadow-none' : 'bg-white border-b border-gray-100 shadow-sm'} flex-shrink-0 pt-safe`}
            >
                <div className="max-w-[1920px] mx-auto px-4 lg:px-6 xl:px-8 h-[4.5rem] lg:h-24 flex items-center justify-between gap-2 lg:gap-4 xl:gap-8">
                    <div className="flex items-center gap-3 lg:gap-6 min-w-0">
                        <div className="flex items-center gap-2 lg:gap-5">
                            {showBack && (
                                <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                                    <FiArrowLeft className="text-xl md:text-2xl text-gray-700" />
                                </button>
                            )}
                            
                            {/* Unified Logo link */}
                            <Link 
                                to={!isAuthenticated ? "/b2b/login" : (location.pathname.includes('/b2b/catalog') ? "/b2b/landing" : "/b2b/catalog")} 
                                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                    if (!isAuthenticated) {
                                        // Extra safety redirect
                                        navigate('/b2b/login');
                                    }
                                }}
                            >
                                <img
                                    src={appLogo.src}
                                    alt="Dealing India"
                                    className="h-10 lg:h-16 w-auto object-contain"
                                />
                            </Link>

                            {/* Mobile Title (only if logo is small/missing or explicitly requested) */}
                            {title !== "Bulk Marketplace" && !location.pathname.includes('/b2b/catalog') && (
                                <h1 className="hidden sm:block lg:hidden text-lg font-black text-gray-900 truncate uppercase tracking-tighter leading-none ml-2">
                                    {title}
                                </h1>
                            )}
                        </div>
                        
                        {/* Desktop (lg+) Navigation links next to logo - more prominent */}
                        <div className="hidden lg:flex items-center gap-1 xl:gap-2 ml-2">
                            {customNav}
                                <Link
                                    to="/b2b/reels"
                                    onClick={(e) => handleNavClick(e, '/b2b/reels')}
                                    className={`px-3 xl:px-4 py-2 rounded-xl flex items-center gap-2 xl:gap-3 transition-all group border shrink-0 whitespace-nowrap ${location.pathname.includes('/reels') ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'}`}
                                >
                                    <div className="flex items-center justify-center text-primary-600">
                                        <FiVideo size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ${location.pathname.includes('/reels') ? 'text-primary-700' : 'text-gray-800'}`}>All Reels</span>
                                        <span className="text-[7px] xl:text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-primary-500 hidden xl:block">Short Videos</span>
                                    </div>
                                </Link>
                                <Link
                                    to="/b2b/jobs"
                                    onClick={(e) => handleNavClick(e, '/b2b/jobs')}
                                    className={`px-3 xl:px-4 py-2 rounded-xl flex items-center gap-2 xl:gap-3 transition-all group border shrink-0 whitespace-nowrap ${location.pathname.includes('/jobs') ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'}`}
                                >
                                    <div className="flex items-center justify-center text-primary-600">
                                        <FiBriefcase size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ${location.pathname.includes('/jobs') ? 'text-primary-700' : 'text-gray-800'}`}>Jobs</span>
                                        <span className="text-[7px] xl:text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-primary-500 hidden xl:block">Find Work</span>
                                    </div>
                                </Link>
                                <div className="w-px h-8 bg-gray-100 mx-1 hidden lg:block"></div>
                                <Link
                                    to="/b2b/real-estate"
                                    onClick={(e) => handleNavClick(e, '/b2b/real-estate')}
                                    className={`px-3 xl:px-4 py-2 rounded-xl flex items-center gap-2 xl:gap-3 transition-all group border shrink-0 whitespace-nowrap ${location.pathname.includes('/real-estate') ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'}`}
                                >
                                    <img src={realEstateIcon} alt="Rent" className="h-6 xl:h-8 w-auto object-contain" />
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ${location.pathname.includes('/real-estate') ? 'text-primary-700' : 'text-gray-800'}`}>Real Estate</span>
                                        <span className="text-[7px] xl:text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-primary-500 hidden xl:block">Rent / Sell / Buy</span>
                                    </div>
                                </Link>
                                <Link
                                    to="/b2b/catalog?itemType=lotslot"
                                    onClick={(e) => handleNavClick(e, '/b2b/catalog?itemType=lotslot')}
                                    className={`px-3 xl:px-4 py-2 rounded-xl flex items-center gap-2 xl:gap-3 transition-all group border shrink-0 whitespace-nowrap ${currentItemType === 'lotslot' ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'}`}
                                >
                                    <img src={lotSlotIcon} alt="Lot" className="h-6 xl:h-8 w-auto object-contain" />
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ${currentItemType === 'lotslot' ? 'text-primary-700' : 'text-gray-800'}`}>Lot / Slot</span>
                                        <span className="text-[7px] xl:text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-primary-500 hidden xl:block">Bulk Clearance</span>
                                    </div>
                                </Link>
                        </div>
                    </div>

                    {/* Search - Growing to fill middle space */}
                    {!hideSearch && (
                        <div className="hidden lg:flex flex-1 min-w-[200px] max-w-2xl mx-2 xl:mx-8">
                            <form
                                onSubmit={handleSearchSubmit}
                                className="relative w-full group"
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            >
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FiSearch className="text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder}
                                    value={localSearchQuery}
                                    onChange={handleSearchChange}
                                    onFocus={() => localSearchQuery.trim() && setShowSuggestions(true)}
                                    className="w-full pl-14 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-[1.2rem] focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-bold text-sm tracking-tight shadow-sm uppercase placeholder:text-gray-400"
                                />

                                <AnimatePresence>
                                    {showSuggestions && (suggestions.length > 0 || isSearching) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
                                            className="absolute top-[calc(100%+0.5rem)] left-0 right-0 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50 py-3"
                                        >
                                            {isSearching && suggestions.length === 0 ? (
                                                <div className="px-6 py-4 text-xs font-black text-gray-500 flex items-center gap-3 uppercase tracking-widest">
                                                    <div className="w-4 h-4 border-2 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                                                    Discovering Results...
                                                </div>
                                            ) : (
                                                <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                                    {suggestions.map((suggestion, index) => {
                                                        const isStore = suggestion.type === 'store' && suggestion.vendorId;
                                                        const vendorLinkUrl = suggestion.isRealEstate
                                                            ? `/b2b/real-estate?vendorId=${suggestion.vendorId}`
                                                            : (currentItemType
                                                                ? `/b2b/vendor/${suggestion.vendorId}?itemType=${currentItemType}`
                                                                : `/b2b/vendor/${suggestion.vendorId}`);
                                                        const Wrapper = isStore ? Link : 'button';
                                                        const wrapperProps = isStore
                                                            ? { to: vendorLinkUrl, onClick: (e) => e.stopPropagation() }
                                                            : { type: 'button', onMouseDown: (e) => { e.preventDefault(); handleSuggestionClick(suggestion); } };
                                                        return (
                                                            <Wrapper
                                                                key={index}
                                                                {...wrapperProps}
                                                                className="w-full px-6 py-3.5 hover:bg-primary-50 flex items-center gap-4 text-left transition-all group no-underline border-b border-gray-50 last:border-0"
                                                            >
                                                                {(suggestion.type === 'product' || suggestion.type === 'store') && suggestion.image ? (
                                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm">
                                                                        <img src={suggestion.image} alt={suggestion.text} className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 flex-shrink-0 border border-gray-100 group-hover:bg-white group-hover:text-primary-600">
                                                                        {suggestion.type === 'property' || suggestion.isRealEstate ? <FiHome size={16} /> : <FiSearch size={16} />}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight group-hover:text-primary-600">{suggestion.text}</p>
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
                            </form>
                        </div>
                    )}

                    {/* Right Side Actions: Profile, Seller, Mobile Burger */}
                    <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                        {/* Mobile view quick links (condensed) */}
                        <div className="flex lg:hidden items-center gap-1 sm:gap-2">
                            {!minimal && (
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                    <Link
                                        to="/b2b/catalog?itemType=lotslot"
                                        onClick={(e) => handleNavClick(e, '/b2b/catalog?itemType=lotslot')}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all text-center leading-tight ${currentItemType === 'lotslot' ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-100'}`}
                                    >
                                        <img src={lotSlotIcon} alt="Lot" className="h-4 sm:h-5 w-auto object-contain" />
                                        <span>Lot / Slot</span>
                                    </Link>
                                    <Link
                                        to="/b2b/real-estate"
                                        onClick={(e) => handleNavClick(e, '/b2b/real-estate')}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all text-center leading-tight ${location.pathname.includes('/real-estate') ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-100'}`}
                                    >
                                        <img src={realEstateIcon} alt="Real Estate" className="h-4 sm:h-5 w-auto object-contain" />
                                        <span>Real Estate</span>
                                    </Link>

                                </div>
                            )}
                            
                            {/* Become Seller (Prominent on small screens too) */}
                            <Link
                                to={isVendorAuthenticated ? "/b2b-vendor/dashboard" : "/b2b-vendor/register"}
                                state={!isVendorAuthenticated ? { userData: user, isUpgrade: true } : undefined}
                                className="px-3 py-1.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-gray-800 transition-colors whitespace-nowrap"
                            >
                                Seller
                            </Link>
                            
                            
                            
                            
                            
                            
                            
                            
                            
                            
                            
                            
                            










                        </div>

                        {/* Desktop (lg+) Profile & Extended Actions */}
                        <div className="hidden lg:flex items-center gap-2 xl:gap-5">
                            <Link
                                to={isVendorAuthenticated ? "/b2b-vendor/dashboard" : "/b2b-vendor/register"}
                                state={!isVendorAuthenticated ? { userData: user, isUpgrade: true } : undefined}
                                className="hidden lg:flex bg-gray-900 text-white px-4 xl:px-7 py-3 xl:py-3.5 rounded-xl xl:rounded-[1.2rem] font-black text-[10px] uppercase tracking-wider xl:tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 whitespace-nowrap"
                            >
                                <span>{isVendorAuthenticated ? "Seller" : "Become a Seller"}</span>
                            </Link>



                            <div className="h-8 xl:h-10 w-px bg-gray-100 hidden lg:block"></div>

                            {isAuthenticated ? (
                                <Link to="/b2b/profile" className="flex items-center gap-3 pr-2 pl-1.5 py-1.5 hover:bg-primary-50 rounded-2xl transition-all group border border-transparent hover:border-primary-100">
                                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-primary-600 border-2 border-primary-50 shadow-md group-hover:bg-primary-600 group-hover:text-white transition-all">
                                        <FiUser size={22} />
                                    </div>
                                    <div className="hidden xl:flex flex-col">
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Account</span>
                                        <span className="text-[8px] font-bold text-primary-500 uppercase tracking-tight">View Profile</span>
                                    </div>
                                </Link>
                            ) : (
                                <Link
                                    to="/b2b/login"
                                    className="flex items-center gap-3 px-6 py-3 bg-primary-600 text-white rounded-[1.1rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Login / Join
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            {sticky !== false && !transparent && (
                <div style={{ height: headerHeight }} className="flex-none" />
            )}
        </div>
    );
};

export default B2BHeader;
