import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FiSearch, FiMessageSquare, FiUser, FiArrowLeft, FiGrid, FiLayout, FiHome, FiVideo, FiImage, FiBriefcase, FiShoppingCart, FiHeart } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { appLogo } from '../../../../data/logos';
import lotSlotIcon from '../../../../assets/icon/WhatsApp Image 2026-02-28 at 2.14.53 PM.jpeg';
import realEstateIcon from '../../../../assets/icon/WhatsApp Image 2026-02-28 at 2.19.13 PM.jpeg';
import { debounce } from '../../../../shared/utils/helpers';
import api from '../../../../shared/utils/api';
import { useAuthStore } from '../../../../shared/store/authStore';
import { useB2BVendorAuthStore } from '../../../B2BVendor/store/b2bVendorAuthStore';
import { useCartStore } from '../../../../shared/store/cartStore';
import { useWishlistStore } from '../../../../shared/store/wishlistStore';

const B2BHeader = ({ showBack = false, title = "Bulk Marketplace", sticky = true, searchQuery: propSearchQuery, onSearchChange, onSearchSubmit, hideSearch = false, customNav, searchPlaceholder = "SEARCH PRODUCTS AND SHOPS", suggestionEndpoint = "/products/b2b-suggestions", transparent = false, minimal = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentSearchParams] = useSearchParams();
    const currentItemType = currentSearchParams.get('itemType') || null;
    const { isAuthenticated, user } = useAuthStore();
    const { isAuthenticated: isVendorAuthenticated } = useB2BVendorAuthStore();
    const [localSearchQuery, setLocalSearchQuery] = useState(propSearchQuery || '');

    const { cart, fetchCart } = useCartStore();
    const { wishlistItems, fetchWishlist } = useWishlistStore();
    
    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
            fetchWishlist();
        }
    }, [isAuthenticated, fetchCart, fetchWishlist]);
    const cartCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
    const wishlistCount = wishlistItems?.length || 0;

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
                className={`${sticky !== false ? 'fixed top-0 left-0 right-0' : 'relative'} z-[1000] ${transparent ? 'bg-transparent border-none shadow-none' : 'bg-white border-b border-gray-100 shadow-sm'} flex-shrink-0`}
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
                                    alt="Bagferi"
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
                        
                        {/* Desktop Navigation Links */}
                        <div className="hidden lg:flex items-center gap-4 xl:gap-6 ml-4 mt-1">
                            <Link to="/b2b/catalog" className="flex flex-col items-center justify-center gap-1 hover:opacity-80 transition-opacity group">
                                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden group-hover:bg-primary-50 transition-colors">
                                    <img src="https://cdn-icons-png.flaticon.com/512/3159/3159614.png" alt="Fashion" className="w-6 h-6 object-contain" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-700 tracking-wider group-hover:text-primary-600 transition-colors">Fashion</span>
                            </Link>
                            <Link to="/b2b/grocery" className="flex flex-col items-center justify-center gap-1 hover:opacity-80 transition-opacity group">
                                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden group-hover:bg-primary-50 transition-colors">
                                    <img src="https://cdn-icons-png.flaticon.com/512/1261/1261126.png" alt="Grocery" className="w-6 h-6 object-contain" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-700 tracking-wider group-hover:text-primary-600 transition-colors">Grocery</span>
                            </Link>
                            <Link to="/b2b/reels" className="flex flex-col items-center justify-center gap-1 hover:opacity-80 transition-opacity group">
                                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden group-hover:bg-primary-50 transition-colors text-gray-700 group-hover:text-primary-600">
                                    <FiVideo size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-700 tracking-wider group-hover:text-primary-600 transition-colors">Reels</span>
                            </Link>
                        </div>
                    </div>

                    {/* Search - Growing to fill middle space */}
                    {!hideSearch && (
                        <div className="hidden lg:flex flex-1 min-w-[200px] max-w-3xl mx-2 xl:mx-8 items-center gap-3">
                            <form
                                onSubmit={handleSearchSubmit}
                                className="relative flex-1 group"
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
                            {customNav && <div className="shrink-0">{customNav}</div>}
                        </div>
                    )}

                    {/* Right Side Actions: Profile, Seller, Mobile Burger */}
                    <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                        {/* Mobile view quick links (condensed) */}
                        <div className="flex lg:hidden items-center gap-2">
                            {/* Mobile Cart and Heart */}
                            <button 
                                onClick={() => {
                                    if (!isAuthenticated) return navigate('/b2b/login');
                                    navigate('/b2b/cart');
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors relative"
                            >
                                <FiShoppingCart className="text-xl" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => {
                                    if (!isAuthenticated) return navigate('/b2b/login');
                                    navigate('/b2b/wishlist');
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors relative"
                            >
                                <FiHeart className="text-xl" />
                                {wishlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                        {wishlistCount}
                                    </span>
                                )}
                            </button>
                            
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

                            <div className="flex items-center gap-2 mr-2">
                                <button 
                                    onClick={() => {
                                        if (!isAuthenticated) return navigate('/b2b/login');
                                        navigate('/b2b/wishlist');
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors relative"
                                    title="Favorites"
                                >
                                    <FiHeart size={22} />
                                    {wishlistCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {wishlistCount}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!isAuthenticated) return navigate('/b2b/login');
                                        navigate('/b2b/cart');
                                    }}
                                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors relative"
                                >
                                    <FiShoppingCart size={22} />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                            </div>

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
