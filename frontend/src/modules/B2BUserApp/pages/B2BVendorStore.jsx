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
    
    // Tabs: "fashion", "grocery", "reels", "properties"
    const [activeTab, setActiveTab] = useState("fashion");
    const [reelCategoryFilter, setReelCategoryFilter] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
    const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
    const [isReelCategoryDropdownOpen, setIsReelCategoryDropdownOpen] = useState(false);
    const reelCategoryDropdownRef = useRef(null);

    // Grocery specific states
    const [groceryCategories, setGroceryCategories] = useState([]);
    const [groceryProducts, setGroceryProducts] = useState([]);
    const [selectedGroceryCategory, setSelectedGroceryCategory] = useState(null);
    const [selectedGrocerySubcategory, setSelectedGrocerySubcategory] = useState(null);

    // Fashion specific states
    const [selectedFashionCategory, setSelectedFashionCategory] = useState(null);
    const [selectedFashionSubcategory, setSelectedFashionSubcategory] = useState(null);

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

    // Setup category selections
    useEffect(() => {
        if (allCategories.length > 0 && !selectedFashionCategory) {
            setSelectedFashionCategory(allCategories[0]._id || allCategories[0].id);
        }
    }, [allCategories, selectedFashionCategory]);

    useEffect(() => {
        if (groceryCategories.length > 0 && !selectedGroceryCategory) {
            setSelectedGroceryCategory(groceryCategories[0]._id || groceryCategories[0].id);
        }
    }, [groceryCategories, selectedGroceryCategory]);

    const handleFashionCategoryChange = (catId) => {
        setSelectedFashionCategory(catId);
        setSelectedFashionSubcategory(null);
    };

    const handleGroceryCategoryChange = (catId) => {
        setSelectedGroceryCategory(catId);
        setSelectedGrocerySubcategory(null);
    };

    // Fetch vendor details and products
    useEffect(() => {
        const fetchVendorData = async () => {
            setLoading(true);
            try {
                const [vendorRes, productsRes, propertiesRes, reelsRes, ratingSummaryRes, groceryCatsRes, groceryProductsRes] = await Promise.all([
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
                    }).catch(err => {
                        console.warn("Failed to fetch properties:", err);
                        return { success: true, data: [] };
                    }),
                    api.get(`/reels/feed`, {
                        params: { vendorId: id, limit: 50 },
                        silent: true
                    }).catch(err => {
                        console.warn("Failed to fetch reels:", err);
                        return { success: true, data: [] };
                    }),
                    getRatingSummary('shop', id).catch(err => {
                        console.warn("Failed to fetch rating summary:", err);
                        return { averageRating: 0, ratingCount: 0 };
                    }),
                    api.get('/grocery/categories', { silent: true }).catch(err => {
                        console.warn("Failed to fetch grocery categories:", err);
                        return { success: true, data: [] };
                    }),
                    api.get(`/grocery/products`, {
                        params: { vendorId: id, limit: 100 },
                        silent: true
                    }).catch(err => {
                        console.warn("Failed to fetch grocery products:", err);
                        return { success: true, data: [] };
                    })
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

                // Process grocery categories
                if (groceryCatsRes?.success) {
                    setGroceryCategories(groceryCatsRes.data || []);
                }

                // Process grocery products
                if (groceryProductsRes?.success) {
                    const gList = Array.isArray(groceryProductsRes.data)
                        ? groceryProductsRes.data
                        : (groceryProductsRes.data.products || []);
                    setGroceryProducts(gList);
                }

                // Set default active tab
                const hasFashion = productsRes?.success && (Array.isArray(productsRes.data) ? productsRes.data.length > 0 : (productsRes.data.products?.length > 0));
                const hasGrocery = groceryProductsRes?.success && (Array.isArray(groceryProductsRes.data) ? groceryProductsRes.data.length > 0 : (groceryProductsRes.data.products?.length > 0));
                
                if (hasGrocery && !hasFashion) {
                    setActiveTab("grocery");
                } else if (propertiesRes?.success && propertiesRes.data.length > 0 && !hasFashion && !hasGrocery) {
                    setActiveTab("properties");
                } else {
                    setActiveTab("fashion");
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

    // Filter and sort products (Fashion)
    const displayedFashionProducts = useMemo(() => {
        let filtered = [...products];

        if (selectedFashionCategory) {
            filtered = filtered.filter(p => String(p.category?._id || p.category) === String(selectedFashionCategory));
        }
        if (selectedFashionSubcategory) {
            filtered = filtered.filter(p => String(p.subcategory?._id || p.subcategory) === String(selectedFashionSubcategory));
        }

        if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const nameMatches = (p.name || '').toLowerCase().includes(q);
                const itemMatches = Array.isArray(p.items)
                    ? p.items.some(it => (it.itemName || '').toLowerCase().includes(q))
                    : false;
                return nameMatches || itemMatches;
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
    }, [products, selectedFashionCategory, selectedFashionSubcategory, searchQuery, sortBy]);

    // Filter and sort products (Grocery)
    const displayedGroceryProducts = useMemo(() => {
        let filtered = [...groceryProducts];

        if (selectedGroceryCategory) {
            filtered = filtered.filter(p => String(p.category?._id || p.category) === String(selectedGroceryCategory));
        }
        if (selectedGrocerySubcategory) {
            filtered = filtered.filter(p => String(p.subcategory?._id || p.subcategory) === String(selectedGrocerySubcategory));
        }

        if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q));
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
    }, [groceryProducts, selectedGroceryCategory, selectedGrocerySubcategory, searchQuery, sortBy]);

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

    const hasProducts = products.length > 0 || groceryProducts.length > 0;
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
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                                            <StarRating rating={ratingSummary.averageRating} size={14} />
                                            <span className="text-[11px] font-black text-gray-900">{ratingSummary.averageRating.toFixed(1)}</span>
                                            <span className="text-[9px] font-bold text-gray-400">({ratingSummary.ratingCount})</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleFollow}
                                            disabled={followingLoading}
                                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                                isFollowing
                                                    ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                            }`}
                                        >
                                            {followingLoading ? (
                                                <FiLoader className="animate-spin text-sm" />
                                            ) : isFollowing ? (
                                                <FiUserCheck className="text-sm" />
                                            ) : (
                                                <FiUserPlus className="text-sm" />
                                            )}
                                            <span>{isFollowing ? 'Following' : 'Follow'}</span>
                                        </button>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm text-[10px] font-bold text-gray-500">
                                            <FiUsers size={14} className="text-gray-400" />
                                            <span>{followerCount} Followers</span>
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




                        </div>
                    </div>
                </div>



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
                        <button
                            type="button"
                            onClick={() => setActiveTab("fashion")}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] border transition-all ${activeTab === "fashion"
                                    ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100"
                                    : "bg-white text-gray-600 border-gray-200"
                                }`}
                        >
                            Fashion
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("grocery")}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] border transition-all ${activeTab === "grocery"
                                    ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-100"
                                    : "bg-white text-gray-600 border-gray-200"
                                }`}
                        >
                            Grocery
                        </button>
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
                        {hasProperties && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("properties")}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] border transition-all ${activeTab === "properties"
                                        ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100"
                                        : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                Properties
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

                    {/* Main Tab Controls for Fashion, Grocery, Properties */}
                    {(activeTab === "fashion" || activeTab === "grocery" || activeTab === "properties") && (
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search inventory..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-xs text-gray-700 outline-none focus:border-primary-200 transition-all shadow-sm"
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

                {/* Fashion Tab Content */}
                {activeTab === "fashion" && (
                    <div className="mt-8 flex gap-2 md:gap-4 min-h-[500px]">
                        {/* Left Categories Sidebar */}
                        <div className="w-[90px] md:w-36 bg-white flex flex-col overflow-y-auto no-scrollbar border border-gray-100 rounded-3xl p-2 shrink-0 sticky top-[240px] max-h-[calc(100vh-280px)]">
                            {allCategories?.map((cat) => {
                                const catId = cat._id || cat.id;
                                const isSelected = String(selectedFashionCategory) === String(catId);
                                return (
                                    <button
                                        key={catId}
                                        onClick={() => handleFashionCategoryChange(catId)}
                                        className={`flex flex-col items-center justify-center p-3 gap-1.5 transition-all rounded-2xl mb-2 relative
                                            ${isSelected ? 'bg-purple-50/50 border-l-4 border-purple-600' : 'border-l-4 border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center
                                            ${isSelected ? 'ring-2 ring-purple-100 shadow-sm' : 'bg-gray-100'}`}>
                                            {cat.image ? (
                                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FiShoppingBag className="text-gray-400 text-xl" />
                                            )}
                                        </div>
                                        <span className={`text-[10px] md:text-[11px] font-bold text-center leading-tight
                                            ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Content panel */}
                        <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 overflow-y-auto">
                            {selectedFashionCategory ? (
                                <div className="mb-6">
                                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-4">
                                        {allCategories.find(c => String(c._id || c.id) === String(selectedFashionCategory))?.name}
                                    </h3>
                                    
                                    {/* Subcategories horizontal list with images */}
                                    {allCategories.find(c => String(c._id || c.id) === String(selectedFashionCategory))?.subcategories?.length > 0 && (
                                        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 mb-6 border-b border-gray-100">
                                            {/* Shop All Button */}
                                            <button
                                                onClick={() => setSelectedFashionSubcategory(null)}
                                                className="flex flex-col items-center gap-2 group flex-shrink-0"
                                            >
                                                <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border transition-all ${
                                                    !selectedFashionSubcategory
                                                        ? 'ring-2 ring-purple-500 shadow-md border-purple-500 bg-purple-50'
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                }`}>
                                                    <span className={`text-[10px] font-black uppercase ${!selectedFashionSubcategory ? 'text-purple-600' : 'text-gray-500'}`}>ALL</span>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider text-center ${!selectedFashionSubcategory ? 'text-purple-700' : 'text-gray-500'}`}>
                                                    Shop All
                                                </span>
                                            </button>

                                            {/* Subcategory items */}
                                            {allCategories.find(c => String(c._id || c.id) === String(selectedFashionCategory))?.subcategories.map((sub, idx) => {
                                                const subId = sub._id || sub.id || sub;
                                                const subName = sub.name || sub;
                                                const isSelected = String(selectedFashionSubcategory) === String(subId);
                                                return (
                                                    <button
                                                        key={subId || idx}
                                                        onClick={() => setSelectedFashionSubcategory(subId)}
                                                        className="flex flex-col items-center gap-2 group flex-shrink-0"
                                                    >
                                                        <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border transition-all ${
                                                            isSelected
                                                                ? 'ring-2 ring-purple-500 shadow-md border-purple-500 bg-purple-50'
                                                                : 'bg-gray-50 border-gray-100 hover:bg-gray-200'
                                                        }`}>
                                                            {sub.image ? (
                                                                <img src={sub.image} alt={subName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-400 font-bold text-[10px]">
                                                                    {subName.slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider text-center ${isSelected ? 'text-purple-700' : 'text-gray-500'}`}>
                                                            {subName}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Products Grid */}
                                    {displayedFashionProducts.length === 0 ? (
                                        <div className="text-center py-20">
                                            <FiShoppingBag className="text-5xl text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold text-sm uppercase">No fashion products listed in this category</p>
                                        </div>
                                    ) : (
                                        <div className={viewMode === "grid"
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                            : "space-y-4"
                                        }>
                                            {displayedFashionProducts.map((product) => (
                                                <B2BProductCard
                                                    key={product._id}
                                                    product={product}
                                                    viewMode={viewMode}
                                                    trackContactClick={trackContactClick}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <FiShoppingBag className="text-5xl text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold text-sm uppercase">Select a category to view products</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Grocery Tab Content */}
                {activeTab === "grocery" && (
                    <div className="mt-8 flex gap-2 md:gap-4 min-h-[500px]">
                        {/* Left Categories Sidebar */}
                        <div className="w-[90px] md:w-36 bg-white flex flex-col overflow-y-auto no-scrollbar border border-gray-100 rounded-3xl p-2 shrink-0 sticky top-[240px] max-h-[calc(100vh-280px)]">
                            {groceryCategories?.map((cat) => {
                                const catId = cat._id || cat.id;
                                const isSelected = String(selectedGroceryCategory) === String(catId);
                                return (
                                    <button
                                        key={catId}
                                        onClick={() => handleGroceryCategoryChange(catId)}
                                        className={`flex flex-col items-center justify-center p-3 gap-1.5 transition-all rounded-2xl mb-2 relative
                                            ${isSelected ? 'bg-green-50/50 border-l-4 border-green-600' : 'border-l-4 border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center
                                            ${isSelected ? 'ring-2 ring-green-100 shadow-sm' : 'bg-gray-100'}`}>
                                            {cat.image ? (
                                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FiShoppingBag className="text-gray-400 text-xl" />
                                            )}
                                        </div>
                                        <span className={`text-[10px] md:text-[11px] font-bold text-center leading-tight
                                            ${isSelected ? 'text-green-700' : 'text-gray-600'}`}>
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                            {groceryCategories.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">No Grocery Categories</p>
                                </div>
                            )}
                        </div>

                        {/* Right Content panel */}
                        <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 overflow-y-auto">
                            {selectedGroceryCategory ? (
                                <div className="mb-6">
                                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-4">
                                        {groceryCategories.find(c => String(c._id || c.id) === String(selectedGroceryCategory))?.name}
                                    </h3>
                                    
                                    {/* Subcategories horizontal list with images */}
                                    {groceryCategories.find(c => String(c._id || c.id) === String(selectedGroceryCategory))?.subcategories?.length > 0 && (
                                        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 mb-6 border-b border-gray-100">
                                            {/* Shop All Button */}
                                            <button
                                                onClick={() => setSelectedGrocerySubcategory(null)}
                                                className="flex flex-col items-center gap-2 group flex-shrink-0"
                                            >
                                                <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border transition-all ${
                                                    !selectedGrocerySubcategory
                                                        ? 'ring-2 ring-green-500 shadow-md border-green-500 bg-green-50'
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                }`}>
                                                    <span className={`text-[10px] font-black uppercase ${!selectedGrocerySubcategory ? 'text-green-600' : 'text-gray-500'}`}>ALL</span>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider text-center ${!selectedGrocerySubcategory ? 'text-green-700' : 'text-gray-500'}`}>
                                                    Shop All
                                                </span>
                                            </button>

                                            {/* Subcategory items */}
                                            {groceryCategories.find(c => String(c._id || c.id) === String(selectedGroceryCategory))?.subcategories.map((sub, idx) => {
                                                const subId = sub._id || sub.id || sub;
                                                const subName = sub.name || sub;
                                                const isSelected = String(selectedGrocerySubcategory) === String(subId);
                                                return (
                                                    <button
                                                        key={subId || idx}
                                                        onClick={() => setSelectedGrocerySubcategory(subId)}
                                                        className="flex flex-col items-center gap-2 group flex-shrink-0"
                                                    >
                                                        <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border transition-all ${
                                                            isSelected
                                                                ? 'ring-2 ring-green-500 shadow-md border-green-500 bg-green-50'
                                                                : 'bg-gray-50 border-gray-100 hover:bg-gray-200'
                                                        }`}>
                                                            {sub.image ? (
                                                                <img src={sub.image} alt={subName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-green-50 flex items-center justify-center text-green-400 font-bold text-[10px]">
                                                                    {subName.slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider text-center ${isSelected ? 'text-green-700' : 'text-gray-500'}`}>
                                                            {subName}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Products Grid */}
                                    {displayedGroceryProducts.length === 0 ? (
                                        <div className="text-center py-20">
                                            <FiShoppingBag className="text-5xl text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold text-sm uppercase">No grocery products listed in this category</p>
                                        </div>
                                    ) : (
                                        <div className={viewMode === "grid"
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                            : "space-y-4"
                                        }>
                                            {displayedGroceryProducts.map((product) => (
                                                <B2BProductCard
                                                    key={product._id}
                                                    product={product}
                                                    viewMode={viewMode}
                                                    trackContactClick={trackContactClick}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <FiShoppingBag className="text-5xl text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold text-sm uppercase">Select a category to view products</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Properties Tab Content */}
                {activeTab === "properties" && (
                    <div className="mt-8">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-10 h-[2px] bg-primary-600 rounded-full"></span>
                            <h2 className="text-lg md:text-xl font-black text-gray-800 tracking-tight uppercase">
                                Listed <span className="text-primary-600">Properties</span>
                            </h2>
                        </div>

                        {filteredProperties.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                                <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-gray-800">No properties listed yet</h3>
                            </div>
                        ) : (
                            <div className={viewMode === "grid"
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                                : "space-y-6"
                            }>
                                {filteredProperties.map((property) => (
                                    <RealEstateCard key={property._id} property={property} />
                                ))}
                            </div>
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
