import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
    FiArrowLeft,
    FiShoppingBag,
    FiCheckCircle,
    FiFilter,
    FiGrid,
    FiList,
    FiLoader,
    FiChevronDown,
    FiMapPin,
    FiShield,
    FiUsers,
    FiUserPlus,
    FiUserCheck,
    FiVideo,
    FiSearch,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import B2BProductCard from "../components/B2BProductCard";
import api from "../../../shared/utils/api";
import { getGoogleMapsUrl, maskPhone, getWhatsAppUserDetailsSuffix } from "../../../shared/utils/helpers";
import { useAuthStore } from "../../../shared/store/authStore";
import RealEstateCard from "../components/RealEstateCard";
import { useB2BCategoryStore } from "../../../shared/store/b2bCategoryStore";
import toast from "react-hot-toast";
import StarRating from "../../../shared/components/StarRating";
import { getRatingSummary, getUserRating, submitRating } from "../../../shared/services/ratingService";

const B2BVendorStore = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuthStore();
    const [searchParams] = useSearchParams();
    const fromReel = location.state?.fromReel;
    const itemType = searchParams.get('itemType') || 'product';
    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [reels, setReels] = useState([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingLoading, setFollowingLoading] = useState(false);
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0 });
    const [userStoreRating, setUserStoreRating] = useState(0);
    const [pendingRating, setPendingRating] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("grid");
    const [sortBy, setSortBy] = useState("popular");
    const [searchQuery, setSearchQuery] = useState("");
    // Tabs: "main" (products or properties) and "reels"
    const [activeTab, setActiveTab] = useState("main");
    const [reelCategoryFilter, setReelCategoryFilter] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
    const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
    const [isReelCategoryDropdownOpen, setIsReelCategoryDropdownOpen] = useState(false);
    const reelCategoryDropdownRef = useRef(null);

    // Click outside handler for category dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reelCategoryDropdownRef.current && !reelCategoryDropdownRef.current.contains(event.target)) {
                setIsReelCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce category search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCategorySearch(categorySearch);
        }, 400);
        return () => clearTimeout(timer);
    }, [categorySearch]);

    const getReelYoutubeId = (reel) => {
        if (!reel) return null;
        if (reel.youtubeVideoId) return reel.youtubeVideoId;
        const url = (reel.videoUrl || "").toString();
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^&]*&v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
        return match ? match[1] : null;
    };

    useEffect(() => {
        fetchB2BCategories();
    }, [fetchB2BCategories]);

    // Fetch vendor details and products
    useEffect(() => {
        const fetchVendorData = async () => {
            setLoading(true);
            try {

                // OPTIMIZED: Fetch vendor, products, and properties in parallel
                const [vendorRes, productsRes, propertiesRes, reelsRes, ratingSummaryRes] = await Promise.all([
                    api.get(`/vendors/${id}`, { silent: true }),
                    api.get(`/products`, {
                        params: {
                            vendorId: id,
                            vendorType: 'b2b',
                            itemType: itemType,
                            limit: 100,
                        },
                        silent: true
                    }),
                    api.get(`/property/all`, {
                        params: { vendorId: id },
                        silent: true
                    }),
                    api.get(`/reels/feed`, {
                        params: { vendorId: id, limit: 50 },
                        silent: true
                    }),
                    getRatingSummary('shop', id)
                ]);

                // Process vendor response
                if (vendorRes?.success) {
                    setVendor(vendorRes.data.vendor);
                }

                // Process products response
                if (productsRes?.success) {
                    const productsList = Array.isArray(productsRes.data)
                        ? productsRes.data
                        : (productsRes.data.products || []);
                    setProducts(productsList);
                }

                // Process properties response
                if (propertiesRes?.success) {
                    setProperties(propertiesRes.data);
                }

                // Process reels response
                if (reelsRes?.success) {
                    const list = reelsRes.data?.reels || [];
                    setReels(list);
                }

                if (ratingSummaryRes) {
                    setRatingSummary(ratingSummaryRes);
                }
            } catch (error) {
                console.error("Error fetching vendor store data:", error);
                toast.error("Failed to load store details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchVendorData();
        }
    }, [id, itemType]);

    // Fetch follow status and user rating
    useEffect(() => {
        const fetchUserData = async () => {
            if (!id) return;
            try {
                const res = await api.get(`/follow/vendor/${id}`);
                if (res.success) {
                    setFollowerCount(res.data.followerCount);
                    setIsFollowing(res.data.isFollowing);
                }
            } catch (error) {
                console.error("Error fetching follow status:", error);
            }
            if (isAuthenticated) {
                try {
                    const ratingRes = await getUserRating('shop', id);
                    if (ratingRes && ratingRes.rating) {
                        setUserStoreRating(ratingRes.rating);
                    }
                } catch (error) {
                    console.error("Error fetching user rating:", error);
                }
            }
        };
        fetchUserData();
    }, [id, isAuthenticated]);

    const handleToggleFollow = async () => {
        if (!isAuthenticated) {
            toast.error("Please login to follow this vendor");
            navigate("/login");
            return;
        }

        setFollowingLoading(true);
        try {
            const res = await api.post("/follow/toggle", { vendorId: id });
            if (res.success) {
                setIsFollowing(res.data.isFollowing);
                setFollowerCount(res.data.followerCount);
                toast.success(res.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Something went wrong");
        } finally {
            setFollowingLoading(false);
        }
    };

    const handleRateStore = async (ratingVal) => {
        if (!isAuthenticated) {
            toast.error('Please login to rate this store');
            navigate('/b2b/login', { state: { from: location } });
            return;
        }
        try {
            const res = await submitRating('shop', id, ratingVal);
            if (res) {
                setUserStoreRating(res.rating);
                const updatedSummary = await getRatingSummary('shop', id);
                setRatingSummary(updatedSummary);
            }
        } catch (error) {
            console.error('Rating failed', error);
            toast.error('Failed to submit rating');
        }
    };

    // Find shop listing for specific UI details - merged with vendor.shopUnit if available
    const shopListing = useMemo(() => {
        const productListing = products.find(p => p.formType === 'shop-listing');
        if (vendor?.shopUnit) {
            return {
                ...productListing,
                name: vendor.shopUnit.name || productListing?.name,
                description: vendor.shopUnit.description || productListing?.description,
                minPrice: vendor.shopUnit.minPrice ?? productListing?.minPrice,
                maxPrice: vendor.shopUnit.maxPrice ?? productListing?.maxPrice,
                details: vendor.shopUnit.details || [],
                images: (vendor.shopUnit.images && vendor.shopUnit.images.length > 0) ? vendor.shopUnit.images : productListing?.images,
                image: (vendor.shopUnit.images && vendor.shopUnit.images[0]) || productListing?.image
            };
        }
        return productListing;
    }, [products, vendor]);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const nameStarts = (p.name || '').toLowerCase().startsWith(q);
                const itemStarts = Array.isArray(p.items)
                    ? p.items.some(it => (it.itemName || '').toLowerCase().startsWith(q))
                    : false;
                return nameStarts || itemStarts;
            });
        }

        switch (sortBy) {
            case "price-low":
                filtered.sort((a, b) => a.price - b.price);
                break;
            case "price-high":
                filtered.sort((a, b) => b.price - a.price);
                break;
            case "newest":
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
            // popular/default
        }

        return filtered;
    }, [products, searchQuery, sortBy]);

    // Filter properties within this vendor store
    const filteredProperties = useMemo(() => {
        let filtered = [...properties];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.propertyType || '').toLowerCase().includes(q) ||
                (p.location?.city || '').toLowerCase().includes(q) ||
                (p.location?.market || '').toLowerCase().includes(q) ||
                (p.location?.area || '').toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [properties, searchQuery]);

    const playlistCategories = useMemo(() => {
        const subs = allCategories.flatMap((cat) => cat.subcategories || []);
        const names = subs
            .map((s) => (typeof s === 'string' ? s : s?.name))
            .filter(Boolean);

        const extra = ['Flat', 'Villa/Row House', 'Commercial Property'];
        const merged = [...names, ...extra];

        const unique = Array.from(
            new Map(
                merged
                    .map((name) => (name || '').trim())
                    .filter(Boolean)
                    .map((name) => [name.toLowerCase(), name])
            ).values()
        );

        const sorted = unique.sort((a, b) => a.localeCompare(b));
        if (!debouncedCategorySearch) return sorted;
        const q = debouncedCategorySearch.toLowerCase();
        return sorted.filter(name => name.toLowerCase().includes(q));
    }, [allCategories, debouncedCategorySearch]);

    const filteredReels = useMemo(() => {
        let list = [...reels];
        if (reelCategoryFilter) {
            list = list.filter(r => r.categoryName === reelCategoryFilter);
        }
        return list;
    }, [reels, reelCategoryFilter]);

    // Track vendor contact clicks
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

    const getTrackingContext = () => ({
        itemType: 'vendor',
        itemId: id,
        category: vendor?.businessType || 'Vendor'
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold mt-8 text-lg tracking-wide uppercase">Opening Store Gates...</p>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen bg-gray-50">
                <B2BHeader />
                <div className="max-w-7xl mx-auto px-4 py-32 text-center">
                    <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-gray-800 mb-4">Store Not Found</h2>
                    <button onClick={() => navigate("/b2b/catalog")} className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200">
                        Back to Catalog
                    </button>
                </div>
                <B2BBottomNav />
            </div>
        );
    }

    const hasProducts = filteredProducts.length > 0;
    const hasProperties = filteredProperties.length > 0;
    const hasReels = reels.length > 0;

    const isPropertyVendor = !hasProducts && hasProperties;
    const mainTabLabel = isPropertyVendor ? "Properties" : "Products";

    return (
        <div className="min-h-screen bg-gray-50 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <B2BHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={setSearchQuery}
                suggestionEndpoint={`/products/b2b-suggestions?vendorId=${id}`}
                hideSearch={true}
            />

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
                {/* Back Link */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors mb-6 md:mb-10 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em]"
                >
                    <FiArrowLeft className="text-sm md:text-base" />
                    {fromReel ? "Back to Reel" : "Back to Catalog"}
                </button>

                {/* Vendor Premium Profile Card */}
                <div className="relative mb-8 md:mb-16">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-primary-600/5 rounded-[2rem] md:rounded-[4rem] blur-3xl opacity-50"></div>
                    <div className="relative bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 border border-white/50 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
                        <div className="relative group">
                            {(vendor.gstNumber || vendor.gst) && (
                                <div className="mb-4 flex justify-center md:justify-start">
                                    <span className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        GSTIN: <span className="text-gray-900">{vendor.gstNumber || vendor.gst}</span>
                                    </span>
                                </div>
                            )}
                            <div className="relative">
                                <div className="relative w-28 h-28 md:w-44 md:h-44 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] p-4 border-2 md:border-4 border-white shadow-xl flex-shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                                    {vendor.storeLogo || shopListing?.image || shopListing?.images?.[0] ? (
                                        <img
                                            src={vendor.storeLogo || shopListing?.image || shopListing?.images?.[0]}
                                            alt={vendor.storeName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary-50">
                                            <FiShoppingBag className="text-3xl md:text-5xl text-primary-600" />
                                        </div>
                                    )}
                                </div>
                                {vendor.isVerified && (
                                    <div className="absolute -bottom-2 -right-2 md:bottom-2 md:right-2 bg-primary-600 text-white p-1.5 md:p-2.5 rounded-2xl shadow-xl border-2 md:border-4 border-white animate-bounce-subtle z-10">
                                        <FiCheckCircle className="text-sm md:text-xl" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Container */}
                        <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-primary-100/50">
                                        {vendor.businessType ? `Official ${vendor.businessType}` : 'Platinum Vendor'}
                                    </span>
                                </div>
                                <h1 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                                    {shopListing?.name || vendor.storeName}
                                </h1>

                                <div className="space-y-1.5 mt-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] md:text-sm font-black text-primary-600 uppercase tracking-[0.1em]">MFD: <span className="text-gray-900">{vendor.businessType || 'N/A'}</span></p>
                                        <p className="text-[10px] md:text-sm font-black text-primary-600 uppercase tracking-[0.1em]">MFG: <span className="text-gray-900">{vendor.mfgOfWork || vendor.mfg || 'N/A'}</span></p>
                                    </div>
                                    <div className="flex items-start gap-1.5 pt-1">
                                        <FiMapPin className="text-gray-400 mt-0.5 flex-shrink-0" size={14} />
                                        <p className="text-[10px] md:text-[13px] font-bold text-gray-500 uppercase tracking-tight leading-relaxed max-w-xl">
                                            {[
                                                vendor.address?.street,
                                                vendor.address?.market,
                                                vendor.address?.landmark,
                                                vendor.address?.area,
                                                vendor.address?.city,
                                                vendor.address?.state,
                                                vendor.address?.country,
                                                vendor.address?.pincode
                                            ].filter(part => part && String(part).trim()).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                                            <StarRating rating={ratingSummary.averageRating} size={14} />
                                            <span className="text-[11px] font-black text-gray-900">{ratingSummary.averageRating.toFixed(1)}</span>
                                            <span className="text-[9px] font-bold text-gray-400">({ratingSummary.ratingCount})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4 md:gap-6 pt-6 border-t border-gray-100/60 mt-6 w-full max-w-4xl">
                                {/* Active Catalog */}
                                <div className="flex flex-col p-3 md:p-4 bg-gray-50/40 rounded-3xl border border-gray-100/50 hover:bg-white hover:shadow-xl hover:border-primary-100/50 transition-all group">
                                    <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Active Catalog</span>
                                    <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden">
                                        <div className="min-w-[2rem] md:min-w-[2.75rem] h-8 md:h-11 px-2 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xs md:text-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                            {products.length + properties.length}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-tight leading-none truncate">Units</span>
                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">Listed</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Community */}
                                <div className="flex flex-col p-3 md:p-4 bg-gray-50/40 rounded-3xl border border-gray-100/50 hover:bg-white hover:shadow-xl hover:border-primary-100/50 transition-all group">
                                    <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Community</span>
                                    <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden">
                                        <div className="min-w-[2rem] md:min-w-[2.75rem] h-8 md:h-11 px-2 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xs md:text-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                            {followerCount}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-tight leading-none truncate">Followers</span>
                                            {isFollowing && <span className="text-[8px] md:text-[9px] font-black text-primary-600 uppercase tracking-widest mt-1 animate-pulse truncate">You follow</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Range */}
                                {shopListing?.minPrice && shopListing?.maxPrice && (
                                    <div className="flex flex-col p-3 md:p-4 bg-gray-50/40 rounded-3xl border border-gray-100/50 hover:bg-white hover:shadow-xl hover:border-primary-100/50 transition-all group">
                                        <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Price Range</span>
                                        <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden">
                                            <div className="min-w-[2rem] md:min-w-[2.75rem] h-8 md:h-11 px-2 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xs md:text-sm group-hover:scale-110 transition-transform flex-shrink-0">
                                                ₹
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-tight leading-none truncate">₹{shopListing.minPrice} - ₹{shopListing.maxPrice}</span>
                                                <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">Starting from</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Operating Zone */}
                                {vendor.address?.city && (
                                    <div className="flex flex-col p-3 md:p-4 bg-gray-50/40 rounded-3xl border border-gray-100/50 hover:bg-white hover:shadow-xl hover:border-primary-100/50 transition-all group">
                                        <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Operating Zone</span>
                                        <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden">
                                            <div className="w-8 h-8 md:w-11 md:h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform flex-shrink-0">
                                                <FiShield size={16} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-tight leading-none truncate">{vendor.address.city}</span>
                                                <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{vendor.address.state}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Rate Store Module */}
                                <div className="col-span-2 flex flex-col p-3 md:p-4 bg-gray-50/40 rounded-3xl border border-gray-100/50 transition-all">
                                    <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Your Rating</span>
                                    <div className="flex items-center gap-3">
                                        <StarRating 
                                            rating={pendingRating || userStoreRating} 
                                            interactive={true} 
                                            onRate={(val) => setPendingRating(val)} 
                                            size={20} 
                                            className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (pendingRating > 0) {
                                                    setIsSubmittingRating(true);
                                                    await handleRateStore(pendingRating);
                                                    setIsSubmittingRating(false);
                                                }
                                            }}
                                            disabled={isSubmittingRating || pendingRating === 0 || pendingRating === userStoreRating}
                                            className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-colors shadow-sm uppercase tracking-wider ${
                                                (pendingRating > 0 && pendingRating !== userStoreRating)
                                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                                        </button>
                                        {!isAuthenticated && <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">Login to rate</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[240px] pt-4 md:pt-0">
                            {/* Quota warning - Only show for the vendor themselves */}
                            {vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries && 
                                (user?.id === (vendor._id || vendor.id) || user?.vendorId === (vendor._id || vendor.id)) && (
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-2">
                                    <p className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-wide">
                                        Enquiry Gated: Recharge wallet or purchase plan to enable contact icons
                                    </p>
                                </div>
                            )}
                            {vendor.phone && (
                                <p className="text-[12px] md:text-sm font-black text-gray-900 uppercase tracking-widest text-center md:text-right px-4 mb-1">
                                    PH: +91 {maskPhone(vendor.phone, 2)}
                                </p>
                            )}
                            {vendor.phone && (
                                <a
                                    href={(() => {
                                        const cleanedPhone = (vendor.phone || '').replace(/\D/g, '');
                                        const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;
                                        const baseMsg = `👋 *I'm interested in your business services!*\n\n` +
                                            `🏢 *Business:* ${shopListing?.name || vendor.storeName || 'Verified Vendor'}\n` +
                                            `📍 *City:* ${vendor?.address?.city || 'N/A'}\n\n` +
                                            `🔗 *View Store:* ${window.location.href}` +
                                            getWhatsAppUserDetailsSuffix(user);
                                        const message = encodeURIComponent(baseMsg);
                                        return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`;
                                    })()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        if (vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries) {
                                            e.preventDefault();
                                            return;
                                        }
                                        trackContactClick(vendor._id || vendor.id, 'whatsapp', getTrackingContext());
                                    }}
                                    className={`w-full px-8 py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                                        vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed grayscale shadow-none'
                                            : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-green-100/50'
                                    }`}
                                >
                                    <FaWhatsapp size={20} />
                                    WhatsApp Inquiry
                                </a>
                            )}
                            {vendor.phone && (
                                <button
                                    onClick={() => {
                                        if (vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries) {
                                            toast.error("Contact Disabled (Insufficient Quota)");
                                            return;
                                        }
                                        const mapsUrl = getGoogleMapsUrl(shopListing?.mapUrl ? { mapUrl: shopListing.mapUrl } : (vendor.shopUnit || vendor));
                                        if (mapsUrl) {
                                            trackContactClick(vendor._id || vendor.id, 'map', getTrackingContext());
                                            window.open(mapsUrl, '_blank');
                                        }
                                        else toast.error('Location details not provided');
                                    }}
                                    className={`w-full px-8 py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                                        vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed grayscale shadow-none'
                                            : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100/50'
                                    }`}
                                    title={vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "View Shop Location"}
                                >
                                    <FiMapPin size={20} />
                                    View Shop Location
                                </button>
                            )}

                            <button
                                onClick={handleToggleFollow}
                                disabled={followingLoading}
                                className={`w-full px-8 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 border-2 ${
                                    isFollowing 
                                    ? "bg-primary-50/50 text-primary-600 border-primary-500/30 shadow-primary-50/50 hover:bg-primary-100/50" 
                                    : "bg-primary-600 text-white border-primary-600 shadow-primary-100/50 hover:bg-primary-700 hover:border-primary-700"
                                }`}
                            >
                                {followingLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : isFollowing ? (
                                    <>
                                        <FiUserCheck className="text-lg md:text-xl" />
                                        <span>Following</span>
                                    </>
                                ) : (
                                    <>
                                        <FiUserPlus className="text-lg md:text-xl" />
                                        <span>Follow Vendor</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            {/* Team / Contact Persons Section - Moved Above Presentation */}
            {shopListing?.details?.length > 0 && (
                <div className="mb-12 md:mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="h-[2px] w-12 bg-primary-600"></span>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Key Contacts / Staff</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {shopListing.details.map((contact, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:border-primary-100 transition-all font-sans"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                        {contact.name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{contact.name || 'N/A'}</h4>
                                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2 opacity-70">{contact.post || 'Staff'}</p>
                                        {contact.mobile && (
                                            <div className="flex items-center gap-3">
                                                <p className="text-[11px] font-bold text-gray-500">+91 {maskPhone(contact.mobile, 2)}</p>
                                                <a
                                                    href={vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries ? "#" : (() => {
                                                        const cleanedPhone = String(contact.mobile || '').replace(/\D/g, '');
                                                        const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`;
                                                        const baseMsg = `👋 *I'm interested in your business services!*\n\n` +
                                                            `🏢 *Business:* ${shopListing?.name || vendor?.storeName || 'Verified Vendor'}\n` +
                                                            `🙍 *Contact:* ${contact.name || contact.post || 'Staff'}\n` +
                                                            `📍 *City:* ${vendor?.address?.city || 'N/A'}\n\n` +
                                                            `🔗 *View Store:* ${window.location.href}` +
                                                            getWhatsAppUserDetailsSuffix(user);
                                                        const message = encodeURIComponent(baseMsg);
                                                        return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`;
                                                    })()}
                                                    target={vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries ? "_self" : "_blank"}
                                                    rel="noopener noreferrer"
                                                    className={`p-2 rounded-lg transition-all active:scale-90 ${
                                                        vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                                                            : 'bg-green-50 text-[#25D366] hover:bg-[#25D366] hover:text-white'
                                                    }`}
                                                    onClick={(e) => {
                                                        if (vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries) {
                                                            e.preventDefault();
                                                            return;
                                                        }
                                                        trackContactClick(vendor._id || vendor.id, 'whatsapp', {
                                                            ...getTrackingContext(),
                                                            category: `${vendor?.businessType || 'Vendor'} - ${contact.name || contact.post}`
                                                        });
                                                    }}
                                                    title={vendor.enquiryStatus && !vendor.enquiryStatus.canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "WhatsApp"}
                                                >
                                                    <FaWhatsapp size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shop Presentation Gallery - For Shop Listings - Moved Below Contacts */}
                {shopListing && ((shopListing.image && shopListing.images?.length > 0) || shopListing.images?.length > 0) && (
                    <div className="mb-12 md:mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <span className="h-[2px] w-12 bg-primary-600"></span>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Shop Presentation</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...new Set([shopListing.image, ...(shopListing.images || [])])].filter(Boolean).map((img, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
                                >
                                    <img src={img} alt={`Shop ${idx + 1}`} className="w-full h-full object-cover" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation and Filters sticky block */}
                <div className="sticky top-16 md:top-20 z-[100] bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-4 border-b border-gray-100 shadow-sm">
                    {/* Tabs Buttons */}
                    <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {(hasProducts || hasProperties) && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("main")}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] border transition-all ${activeTab === "main"
                                        ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100"
                                        : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                {mainTabLabel}
                            </button>
                        )}
                        {hasReels && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("reels")}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] border transition-all ${activeTab === "reels"
                                        ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100"
                                        : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                Reels
                            </button>
                        )}
                    </div>

                    {/* Reels Tab Category Filter */}
                    {activeTab === "reels" && hasReels && (
                        <div className="flex items-center gap-4">
                            <div className="relative w-full md:w-80" ref={reelCategoryDropdownRef}>
                                <button
                                    onClick={() => setIsReelCategoryDropdownOpen(!isReelCategoryDropdownOpen)}
                                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-800 outline-none focus:border-primary-200 transition-all shadow-sm flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <FiFilter className={reelCategoryFilter ? "text-primary-600" : "text-gray-400"} />
                                        <span className="truncate">{reelCategoryFilter || "SELECT CATEGORY"}</span>
                                    </div>
                                    <FiChevronDown className={`text-gray-400 transition-transform ${isReelCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isReelCategoryDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[150] overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <input
                                                        type="text"
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        placeholder="Search categories..."
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-800 outline-none focus:border-primary-200 transition-all"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                                                <button
                                                    onClick={() => {
                                                        setReelCategoryFilter("");
                                                        setIsReelCategoryDropdownOpen(false);
                                                        setCategorySearch("");
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!reelCategoryFilter ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    All Categories
                                                </button>
                                                {playlistCategories.map((name) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => {
                                                            setReelCategoryFilter(name);
                                                            setIsReelCategoryDropdownOpen(false);
                                                            setCategorySearch("");
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reelCategoryFilter === name ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        {name}
                                                    </button>
                                                ))}
                                                {playlistCategories.length === 0 && (
                                                    <div className="px-4 py-8 text-center">
                                                        <FiSearch className="mx-auto text-gray-200 mb-2" size={24} />
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No matching categories</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {reelCategoryFilter && (
                                <button
                                    onClick={() => setReelCategoryFilter("")}
                                    className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest px-4 py-2 bg-primary-50 rounded-lg border border-primary-100 transition-all hover:scale-105 active:scale-95"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Main Tab Controls */}
                    {activeTab === "main" && (
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search inventory..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 outline-none focus:border-primary-200 transition-all shadow-sm"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85Zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
                                </svg>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative group flex-1 md:flex-initial min-w-[150px]">
                                    <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-600 transition-colors" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full pl-10 pr-6 py-3 bg-white border border-gray-100 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest text-gray-500 outline-none focus:border-primary-200 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="popular">MOST RELEVANT</option>
                                        <option value="newest">NEWEST STOCK</option>
                                        <option value="price-low">PRICE: LOW-HIGH</option>
                                        <option value="price-high">PRICE: HIGH-LOW</option>
                                    </select>
                                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="flex items-center p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                        <FiGrid size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-primary-600 text-white shadow-lg shadow-primary-100" : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                        <FiList size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content only when main tab is active */}
                {activeTab === "main" && (
                    <div className="mt-8">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-10 h-[2px] bg-primary-600 rounded-full"></span>
                            <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight uppercase">
                                Current <span className="text-primary-600">Inventory</span>
                            </h2>
                        </div>

                        {/* Main tab: Products or Properties (depending on vendor) */}
                        {(!hasProducts && !hasProperties) ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                                <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-gray-800">No listings yet</h3>
                                <p className="text-gray-400 mt-2">This vendor has not added any items yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* If main tab is Products */}
                                {!isPropertyVendor && (
                                    products.length === 0 ? (
                                        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                                            <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                                            <h3 className="text-xl font-bold text-gray-800">No products match your criteria</h3>
                                            <p className="text-gray-400 mt-2">Try adjusting your filters or search terms.</p>
                                        </div>
                                    ) : (
                                        <div className={viewMode === "grid"
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12"
                                            : "space-y-6 mb-12"
                                        }>
                                            {filteredProducts.map((product) => (
                                                <B2BProductCard
                                                    key={product._id}
                                                    product={product}
                                                    viewMode={viewMode}
                                                    trackContactClick={trackContactClick}
                                                />
                                            ))}
                                        </div>
                                    )
                                )}

                                {/* If main tab is Properties */}
                                {isPropertyVendor && (
                                    properties.length === 0 ? (
                                        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                                            <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                                            <h3 className="text-xl font-bold text-gray-800">No properties listed yet</h3>
                                        </div>
                                    ) : (
                                        <div
                                            className={
                                                viewMode === "grid"
                                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                                                    : "space-y-6"
                                            }
                                        >
                                            {filteredProperties.map((property) => (
                                                <RealEstateCard key={property._id} property={property} />
                                            ))}
                                        </div>
                                    )
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === "reels" && (
                    hasReels ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredReels.map((reel) => (
                                <button
                                    key={reel._id}
                                    type="button"
                                    onClick={() => navigate(`/b2b/reels/${reel._id}`)}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col text-left transition-transform hover:scale-105"
                                >
                                    <div className="relative aspect-[9/16] bg-gray-900">
                                        {(
                                            reel.thumbnailUrl ||
                                            (getReelYoutubeId(reel) && `https://img.youtube.com/vi/${getReelYoutubeId(reel)}/hqdefault.jpg`)
                                        ) && (
                                                <img
                                                    src={reel.thumbnailUrl || `https://img.youtube.com/vi/${getReelYoutubeId(reel)}/hqdefault.jpg`}
                                                    alt={reel.title}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            )}
                                        {(!reel.thumbnailUrl && !getReelYoutubeId(reel)) && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs">
                                                <FiVideo size={24} className="mb-2 opacity-20" />
                                                <span className="font-black uppercase tracking-[0.2em]">Reel</span>
                                            </div>
                                        )}
                                        {getReelYoutubeId(reel) && (
                                            <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded shadow-lg z-10">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">
                                                {reel.title}
                                            </p>
                                            <div className="flex flex-col items-end">
                                                {reel.price > 0 && (
                                                    <span className="shrink-0 text-[10px] font-black text-primary-600">
                                                        ₹{reel.price}
                                                    </span>
                                                )}
                                                {reel.minimum && (
                                                    <span className="shrink-0 text-[8px] font-bold text-gray-400">
                                                        Min: {reel.minimum}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                            <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-gray-800">No reels from this vendor yet</h3>
                        </div>
                    )
                )}
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default B2BVendorStore;
