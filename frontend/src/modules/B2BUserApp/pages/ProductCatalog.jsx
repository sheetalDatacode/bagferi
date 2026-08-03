import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiFilter,
  FiSearch,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiTrendingUp,
  FiHome,
  FiBriefcase,
  FiCheck,
  FiMapPin,
  FiVideo,
  FiUser,
} from "react-icons/fi";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import B2BProductCard from "../components/B2BProductCard";
import B2BVendorCard from "../components/B2BVendorCard";
import CategoryPlaylistEmbed from "../components/CategoryPlaylistEmbed";
import api from "../../../shared/utils/api";
import { useAuthStore } from "../../../shared/store/authStore";
import { debounce, getGoogleMapsUrl } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";
import { useB2BCategoryStore } from "../../../shared/store/b2bCategoryStore";
import { useB2BLocationStore } from "../../../shared/store/b2bLocationStore";
import { useScrollLock } from "../../../shared/hooks/useScrollLock";

const ProductCatalog = () => {
  const navigate = useNavigate();

  const getReelYoutubeId = (reel) => {
    if (!reel) return null;
    if (reel.youtubeVideoId) return reel.youtubeVideoId;
    const url = (reel.videoUrl || "").toString();
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^&]*&v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : null;
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [reels, setReels] = useState([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [catalogTab, setCatalogTab] = useState("products");
  // categories come from store now

  // Initialize state from URL params to prevent double-mount effects
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All",
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    searchParams.get("subcategory") || null,
  );
  const [expandedCategory, setExpandedCategory] = useState(() => {
    // Only auto-expand category collections on desktop on initial load
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return searchParams.get("category") || null;
    }
    return null;
  });
  const [selectedCity, setSelectedCity] = useState(
    searchParams.get("city") || "All Cities",
  );
  const [selectedBusinessType, setSelectedBusinessType] = useState(
    searchParams.get("businessType") || null,
  );
  const [selectedBusinessSubType, setSelectedBusinessSubType] = useState(null);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState(
    searchParams.get("businessCategory") || null,
  );
  const [selectedGender, setSelectedGender] = useState(
    searchParams.get("gender") || "All"
  );

  const location = useLocation();
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const stored = localStorage.getItem('selected-b2b-address');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected-b2b-address');
      if (stored) {
        setSelectedAddress(JSON.parse(stored));
      } else {
        setSelectedAddress(null);
      }
    } catch (e) {}
  }, [location.key]);

  const BUSINESS_CATEGORIES = ['Manufacturing', 'Exporter', 'Wholesaler', 'Semi wholesaler', 'Retailers', 'Trading', 'Traders', 'Agency', 'Supplier'];

  // Derived states moved after selectedItemType declaration below
  const reelCategoryForFilter = useMemo(() => {
    if (selectedSubcategory) return selectedSubcategory;
    if (selectedCategory && selectedCategory !== "All") return selectedCategory;
    return null;
  }, [selectedCategory, selectedSubcategory]);

  const [loading, setLoading] = useState(true);
  const [b2bVendors, setB2bVendors] = useState([]);
  const [matchingVendors, setMatchingVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const categoryDropdownRefs = useRef({}); // Refs for each category dropdown
  const [selectedState, setSelectedState] = useState("All States");

  const { categories: allCategories, initialize: fetchB2BCategories } =
    useB2BCategoryStore();
  const {
    states: availableStates,
    areas: availableAreas,
    markets: availableMarketsFromStore,
    initialize: fetchAvailableLocations,
    isLoading: locationsLoading,
  } = useB2BLocationStore();

  const [availableCities, setAvailableCities] = useState([]);
  const [listingLocationFilters, setListingLocationFilters] = useState({
    cities: [],
    areas: [],
    markets: [],
  });
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [marketSearchQuery, setMarketSearchQuery] = useState("");
  const [businessTypeSearchQuery, setBusinessTypeSearchQuery] = useState("");
  const cityDropdownRef = useRef(null);
  const areaDropdownRef = useRef(null);
  const marketDropdownRef = useRef(null);
  const cityResetInitializedRef = useRef(false);
  const areaResetInitializedRef = useRef(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);

  const [customPriceRange, setCustomPriceRange] = useState({
    min: "",
    max: "",
  });
  const [priceInputs, setPriceInputs] = useState({ min: "", max: "" });
  const [businessCredentials, setBusinessCredentials] = useState({
    gst: false,
    turnover: false,
  });
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState("");
  const [isMainCategoryDropdownOpen, setIsMainCategoryDropdownOpen] =
    useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mainCategoryDropdownRef = useRef(null);

  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const genderDropdownRef = useRef(null);
  const [mobileExpandedBusinessType, setMobileExpandedBusinessType] =
    useState(null);
  const [showMobileSubcategoryCard, setShowMobileSubcategoryCard] = useState(false);

  // Lock scroll when any mobile overlay (downsheet) is open on mobile screens
  useScrollLock(
    (isCityDropdownOpen || isMainCategoryDropdownOpen || isMobileFilterOpen) && 
    window.innerWidth < 1024
  );

  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "createdAt",
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get("sortOrder") || "desc",
  );
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setIsSortDropdownOpen(false);

    const newParams = new URLSearchParams(searchParams);
    newParams.set("sortBy", newSortBy);
    newParams.set("sortOrder", newSortOrder);
    setSearchParams(newParams, { replace: true });
  };

  const getSortLabel = () => {
    if (sortBy === "price") {
      return sortOrder === "asc" ? "Price: Low to High" : "Price: High to Low";
    }
    return "Newest First";
  };



  // Handle "open" parameter from bottom-nav shortcuts (mobile only)
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;

    const openParam = searchParams.get("open");
    if (!openParam) return;

    // Immediately remove the param so this effect doesn't re-fire
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("open");
    setSearchParams(newParams, { replace: true });

    if (openParam === "categories") {
      setIsCityDropdownOpen(false);
      setIsMobileFilterOpen(false);
      setIsMainCategoryDropdownOpen(true);
    } else if (openParam === "business" && businessTypes?.length > 0) {
      setIsMainCategoryDropdownOpen(false);
      setIsCityDropdownOpen(false);
      setIsMobileFilterOpen(false);
      setShowMobileSubcategoryCard(false);
    }
  }, [searchParams, businessTypes?.length]);


  useEffect(() => {
    if (!reelCategoryForFilter) {
      setReels([]);
      setCatalogTab("products");
      return;
    }
    let isMounted = true;
    setReelsLoading(true);
    api
      .get(`/reels/feed?category=${encodeURIComponent(reelCategoryForFilter)}&limit=12`)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data?.reels) {
          const list = res.data.reels || [];
          setReels(list);

        } else {
          setReels([]);
        }
      })
      .catch(() => {
        if (isMounted) setReels([]);
      })
      .finally(() => {
        if (isMounted) setReelsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [reelCategoryForFilter]);
  const [openFilters, setOpenFilters] = useState({
    businessCategory: false,
    price: false,
    subcategory: false,
    businessType: false,
    city: false,
    area: false,
    market: false,
  });

  const allSubcategories = useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    // Handle both string and object subcategories {name, fields} from dynamic fields update
    const names = subs
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [allCategories]);

  // Subcategories shown in filter: only those belonging to the selected category
  const subcategoriesForFilter = useMemo(() => {
    if (!selectedCategory || selectedCategory === "All") return allSubcategories;
    const cat = allCategories.find(
      (c) => (c.name || "").trim().toLowerCase() === (selectedCategory || "").trim().toLowerCase(),
    );
    if (!cat || !cat.subcategories?.length) return [];
    const names = (cat.subcategories || [])
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [allCategories, selectedCategory, allSubcategories]);

  const [dynamicFilters, setDynamicFilters] = useState({});
  const [dynamicSearchQueries, setDynamicSearchQueries] = useState({});
  const lastParamsRef = useRef(''); // Cache for preventing infinite fetch loops
  const lastLocParamsRef = useRef(''); // Cache for location filter loops

  const selectedSubcategoryObj = useMemo(() => {
    if (!selectedSubcategory) return null;
    for (const cat of allCategories) {
      const sub = (cat.subcategories || []).find(
        (s) => (typeof s === "string" ? s : s?.name) === selectedSubcategory,
      );
      if (sub) {
        // Return a stable object or existing reference if possible
        const normalized = typeof sub === "string" ? { name: sub, fields: [] } : sub;
        return normalized;
      }
    }
    return null;
  }, [selectedSubcategory, allCategories]);

  // When category changes, clear subcategory if it doesn't belong to the selected category
  useEffect(() => {
    if (!selectedSubcategory || !selectedCategory || selectedCategory === "All") return;
    const allowed = subcategoriesForFilter.map((s) => (s || "").trim().toLowerCase());
    const current = (selectedSubcategory || "").trim().toLowerCase();
    if (allowed.length > 0 && !allowed.includes(current)) {
      setSelectedSubcategory(null);
    }
  }, [selectedCategory, subcategoriesForFilter]);

  // Reset dynamic filters when subcategory changes
  useEffect(() => {
    setDynamicFilters({});
    setDynamicSearchQueries({});
    if (selectedSubcategoryObj?.fields) {
      const newOpenFilters = { ...openFilters };
      selectedSubcategoryObj.fields.forEach((field) => {
        newOpenFilters[`dynamic_${field.label}`] = true;
      });
      setOpenFilters(newOpenFilters);
    }
  }, [selectedSubcategory, selectedSubcategoryObj]);

  const toggleFilter = (section) => {
    setOpenFilters((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleMainCategory = () => {
    setOpenFilters((prev) => ({ ...prev, mainCategory: !prev.mainCategory }));
  };

  const closeMobileOverlays = () => {
    setIsMainCategoryDropdownOpen(false);
    setIsCityDropdownOpen(false);
    setIsMobileFilterOpen(false);
    setShowMobileSubcategoryCard(false);
    setMobileExpandedBusinessType(null);

    const openParam = searchParams.get("open");
    if (openParam) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("open");
      setSearchParams(newParams, { replace: true });
    }
  };

  const openOverlay = (name) => {
    setIsMainCategoryDropdownOpen(name === 'categories');
    setIsCityDropdownOpen(name === 'city');
    setIsMobileFilterOpen(name === 'filters');
  };

  // Track vendor contact clicks (call or whatsapp)
  const trackContactClick = async (vendorId, clickType, context = {}) => {
    try {
      if (!vendorId) return;
      await api.post("/vendor/analytics/track-click", {
        vendorId,
        clickType,
        ...context
      });
    } catch (error) {
      // Silently fail - tracking shouldn't block user action
      console.error("Error tracking click:", error);
    }
  };

  // Click outside handler for Sort dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target)
      ) {
        setIsGenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderFilters = () => {
    return (
      <div className="space-y-6">
        {/* Gender Filter for Mobile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => toggleFilter("gender")}
            className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">Gender</h3>
            <div className="flex items-center gap-2">
              {selectedGender !== "All" && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGender("All");
                  }}
                  className="text-[10px] font-bold text-primary-600 hover:text-primary-700 mr-2"
                >
                  RESET
                </span>
              )}
              <FiChevronDown
                className={`text-gray-400 transition-transform ${openFilters["gender"] ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          <AnimatePresence>
            {openFilters["gender"] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-2">
                  {["All", "Men", "Women", "Kids", "Unisex"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGender(g)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between ${selectedGender === g ? "bg-primary-50 text-primary-600" : "bg-gray-50 text-gray-600"}`}
                    >
                      <span>{g === "All" ? "All Genders" : g}</span>
                      {selectedGender === g && <FiCheck className="text-primary-600" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Attributes Filters */}
        {selectedSubcategoryObj?.fields?.length > 0 &&
          selectedSubcategoryObj.fields
            .filter((field) => ["select", "multi-select"].includes(field.type))
            .map((field, fieldIdx) => (
              <div
                key={`${field.label}-${fieldIdx}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFilter(`dynamic_${field.label}`)}
                  className="w-full bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <h3 className="font-black text-xs uppercase tracking-wider text-gray-700">
                    {field.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    {dynamicFilters[field.label] && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFilters = { ...dynamicFilters };
                          delete newFilters[field.label];
                          setDynamicFilters(newFilters);
                        }}
                        className="text-[10px] font-bold text-primary-600 hover:text-primary-700 mr-2">
                        RESET
                      </span>
                    )}
                    <FiChevronDown
                      className={`text-gray-400 transition-transform ${openFilters[`dynamic_${field.label}`] ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {openFilters[`dynamic_${field.label}`] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="p-4 border-b border-gray-50">
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                          <input
                            type="text"
                            placeholder={`Search ${field.label}...`}
                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                            value={dynamicSearchQueries[field.label] || ""}
                            onChange={(e) =>
                              setDynamicSearchQueries((prev) => ({
                                ...prev,
                                [field.label]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="p-5 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {field.options
                          ?.filter((option) =>
                            (option || "")
                              .toLowerCase()
                              .includes(
                                (
                                  dynamicSearchQueries[field.label] || ""
                                ).toLowerCase(),
                              ),
                          )
                          .map((option) => (
                            <label
                              key={option}
                              data-prevent-category-collapse
                              className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type={
                                    field.type === "multi-select"
                                      ? "checkbox"
                                      : "radio"
                                  }
                                  name={`dynamic_${field.label}`}
                                  className="peer sr-only"
                                  checked={
                                    field.type === "multi-select"
                                      ? (
                                        dynamicFilters[field.label] || []
                                      ).includes(option)
                                      : dynamicFilters[field.label] === option
                                  }
                                  onChange={() => {
                                    if (field.type === "multi-select") {
                                      const current =
                                        dynamicFilters[field.label] || [];
                                      const next = current.includes(option)
                                        ? current.filter((o) => o !== option)
                                        : [...current, option];
                                      setDynamicFilters({
                                        ...dynamicFilters,
                                        [field.label]: next,
                                      });
                                    } else {
                                      setDynamicFilters({
                                        ...dynamicFilters,
                                        [field.label]: option,
                                      });
                                      if (isMobileFilterOpen)
                                        setIsMobileFilterOpen(false);
                                    }
                                  }}
                                />
                                <div
                                  className={`w-4 h-4 border-2 border-gray-300 ${field.type === "multi-select" ? "rounded-md" : "rounded-full"} peer-checked:border-primary-600 peer-checked:bg-primary-600 transition-all flex items-center justify-center`}>
                                  {field.type === "multi-select" &&
                                    (
                                      dynamicFilters[field.label] || []
                                    ).includes(option) && (
                                      <FiCheck className="text-white text-[10px]" />
                                    )}
                                </div>
                              </div>
                              <span
                                className={`text-xs font-bold transition-colors ${(
                                  field.type === "multi-select"
                                    ? (
                                      dynamicFilters[field.label] || []
                                    ).includes(option)
                                    : dynamicFilters[field.label] === option
                                )
                                  ? "text-primary-700"
                                  : "text-gray-500 group-hover:text-gray-700"
                                  }`}>
                                {option}
                              </span>
                            </label>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}


      </div>
    );
  };

  // Define functions before useEffect hooks that use them
  // fetchAvailableLocations replaced by store action

  const handleStateChange = (selectedValue) => {
    // Backend already returns clean state names, so use directly
    // console.log('🔄 handleStateChange called with:', selectedValue);

    setSelectedCity("All Cities");

    if (
      selectedValue === "All States" ||
      !selectedValue ||
      selectedValue.trim() === ""
    ) {
      setSelectedState("All States");
      setAvailableCities([]);
      return;
    }

    // Find state by exact match (trimmed) - backend already returns clean names
    const trimmedSelected = (selectedValue || "").trim();

    const stateData = availableStates.find((s) => {
      const stateName = (s.name || "").trim();
      const matches = stateName === trimmedSelected;
      return matches;
    });

    if (!stateData) {
      console.error("❌ State not found!");
      setSelectedState("All States");
      setAvailableCities([]);
      return;
    }

    // Set selected state - use the exact name from stateData to ensure matching
    const exactStateName = (stateData.name || "").trim();
    setSelectedState(exactStateName);

    if (
      stateData.cities &&
      Array.isArray(stateData.cities) &&
      stateData.cities.length > 0
    ) {
      const stateName = exactStateName;

      // Final cleanup of cities
      const cleanedCities = stateData.cities
        .map((city) => {
          if (!city || typeof city !== "string") return null;
          let cleanCity = city.trim();

          // Skip if empty
          if (!cleanCity || cleanCity.length === 0) return null;

          // Skip if only numbers (pincode)
          if (/^\d+$/.test(cleanCity)) return null;

          // Skip if it's exactly the state name
          if (cleanCity.toLowerCase() === stateName.toLowerCase()) return null;

          // Remove pincode if present at the end
          cleanCity = cleanCity
            .replace(/\s+\d{6}$/, "")
            .replace(/\s+\d{5,6}$/, "")
            .trim();

          // Only remove state name from end if city has multiple words
          const stateWords = stateName.split(" ").filter((w) => w.length > 2);
          if (stateWords.length > 0 && cleanCity.split(" ").length > 1) {
            const cityWords = cleanCity.split(" ");
            const lastWord = cityWords[cityWords.length - 1];
            // Only remove if last word matches a state word AND city has more than one word
            if (
              stateWords.some(
                (sw) => sw.toLowerCase() === lastWord.toLowerCase(),
              ) &&
              cityWords.length > 1
            ) {
              cleanCity = cityWords.slice(0, -1).join(" ").trim();
            }
          }

          // Return cleaned city if it's still valid
          return cleanCity && cleanCity.length > 0 ? cleanCity : null;
        })
        .filter((city) => city !== null && city.length > 0); // Remove nulls and empty strings

      if (cleanedCities.length > 0) {
        setAvailableCities(cleanedCities);
      } else {
        // If all cities were filtered, use original cities (less filtered)
        const fallbackCities = stateData.cities
          .filter(
            (city) =>
              city &&
              typeof city === "string" &&
              city.trim().length > 0 &&
              !/^\d+$/.test(city.trim()),
          )
          .map((city) => city.trim());
        setAvailableCities(fallbackCities);
      }
    } else {
      setAvailableCities([]);
    }
  };

  const fetchB2BVendors = async () => {
    try {
      const response = await api.get("/vendors", {
        params: {
          vendorType: "b2b",
          status: "approved",
          limit: 10,
        },
      });
      if (response.success) {
        setB2bVendors(response.data.vendors || []);
      }
    } catch (error) {
      console.error("Error fetching B2B vendors:", error);
    }
  };

  const [selectedItemType, setSelectedItemType] = useState(
    searchParams.get("itemType") || null,
  );

  const fetchListingLocationFilters = async () => {
    try {
      const params = {
        includeProducts: true,
        includeProperties: false,
      };

      // OPTIMIZED: We don't send selectedCity/Area here anymore because it causes 
      // the filter list to shrink to ONLY the selected item (circular dependency).
      // We want the user to always see all available cities/areas to switch between.

      // Filter cities (and areas/markets) by selected business type so only relevant locations show
      if (selectedBusinessType && selectedBusinessType.trim()) {
        params.businessTypeFilter = "include";
        params.businessTypes = selectedBusinessType.trim();
      }

      const response = await api.get("/public/b2b-listing-locations", { params });
      if (response.success && response.data) {
        const nextFilters = {
          cities: Array.isArray(response.data.cities) ? response.data.cities : [],
          areas: Array.isArray(response.data.areas) ? response.data.areas : [],
          markets: Array.isArray(response.data.markets) ? response.data.markets : [],
        };
        setListingLocationFilters(nextFilters);

        if (
          selectedArea &&
          !nextFilters.areas.some((a) => {
            const cityMatch =
              selectedCity === "All Cities" ||
              (a.city || "").toLowerCase().trim() ===
              (selectedCity || "").toLowerCase().trim();
            return cityMatch && (a.name || "").toLowerCase() === selectedArea.toLowerCase();
          })
        ) {
          setSelectedArea(null);
        }

        if (
          selectedMarket &&
          !nextFilters.markets.some((m) => {
            const cityMatch =
              selectedCity === "All Cities" ||
              (m.city || "").toLowerCase().trim() ===
              (selectedCity || "").toLowerCase().trim();
            const areaMatch = !selectedArea
              || (m.area || "").toLowerCase().trim() === selectedArea.toLowerCase().trim();
            return (
              cityMatch &&
              areaMatch &&
              (m.name || "").toLowerCase().trim() === selectedMarket.toLowerCase().trim()
            );
          })
        ) {
          setSelectedMarket(null);
        }
      }
    } catch (error) {
      console.error("Error fetching listing location filters:", error);
    }
  };

  // Derived states for conditional filtering
  const typeLower = selectedBusinessType?.toLowerCase()?.trim();
  const isPackingMaterial = typeLower === "packing material";
  const bigTextilePlayerTypes = [
    "yarn manufacturer",
    "mill / processing",
    "weavers",
    "gray broker",
    "other broker",
    "job work",
    "stitching unit",
    "support & services",
    "packing material",
  ];
  const isBigTextilePlayer = bigTextilePlayerTypes.includes(typeLower);

  const fetchB2BProducts = async () => {
    setLoading(true);
    try {
      const isStrict = searchParams.get("strict") === "true";
      // Build query parameters for products
      const params = {
        vendorType: "b2b",
        excludeBusinessTypes: "Developer,Property Broker",
        strict: isStrict,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Fetch matching vendors if searching
      if (searchQuery && searchQuery.trim().length > 1) {
        try {
          const shopParams = {
            vendorType: "b2b",
            status: "approved",
            search: searchQuery,
            isActive: true,
            excludeBusinessTypes: "Developer,Property Broker",
            strict: isStrict,
          };

          // Add current city/state context to vendor search if applicable
          if (selectedAddress) {
            if (selectedAddress.pincode) {
              shopParams.deliveryArea = selectedAddress.areaName
                ? `${selectedAddress.pincode}|${selectedAddress.areaName}`
                : selectedAddress.pincode;
            }
            shopParams.city = selectedAddress.city;
          } else {
            if (selectedCity && selectedCity !== "All Cities")
              shopParams.city = selectedCity;
            if (selectedState && selectedState !== "All States")
              shopParams.state = selectedState;
          }

          // Respect selected business type in vendor search
          if (selectedBusinessType)
            shopParams.businessType = selectedBusinessType;
          if (selectedBusinessCategory)
            shopParams.businessCategory = selectedBusinessCategory;


          const vResponse = await api.get("/vendors", { params: shopParams });
          if (vResponse.success && vResponse.data) {
            const vendorData = Array.isArray(vResponse.data)
              ? vResponse.data
              : vResponse.data.vendors || [];
            setMatchingVendors(vendorData);
          } else {
            setMatchingVendors([]);
          }
        } catch (vErr) {
          console.error("Error fetching matching vendors:", vErr);
          setMatchingVendors([]);
        }
      } else {
        setMatchingVendors([]);
      }

      // Add location filters if selected
      if (selectedAddress) {
        if (selectedAddress.pincode) {
          params.deliveryArea = selectedAddress.areaName
            ? `${selectedAddress.pincode}|${selectedAddress.areaName}`
            : selectedAddress.pincode;
        }
        params.city = selectedAddress.city;
      } else {
        if (selectedState !== "All States") {
          params.state = selectedState;
        }
        if (selectedCity !== "All Cities") {
          params.city = selectedCity;
        }
        if (selectedArea) {
          params.area = selectedArea;
        }
        if (selectedMarket) {
          params.market = selectedMarket.trim();
        }
      }

      // Category & Subcategory Filters (Backend)
      if (selectedCategory && selectedCategory !== "All") {
        const categoryObj = allCategories.find(
          (c) => c.name === selectedCategory,
        );
        if (categoryObj) {
          // Pass the ID to the backend
          params.categoryId = categoryObj.id || categoryObj._id;
        }
      }
      if (selectedSubcategory) {
        params.subcategoryId = selectedSubcategory;
      }

      if (selectedBusinessType) {
        params.businessType = selectedBusinessType;
      }

      if (selectedBusinessCategory) {
        params.businessCategory = selectedBusinessCategory;
      }

      if (selectedGender && selectedGender !== "All") {
        params.gender = selectedGender;
      }

      // Add Dynamic Filters
      if (Object.keys(dynamicFilters).length > 0) {
        params.dynamicFilters = JSON.stringify(dynamicFilters);
      }

      // Fetch products where vendorType is b2b
      let response = await api.get("/products", { params });
      let productsData = [];
      if (response.success && response.data) {
        productsData = Array.isArray(response.data)
          ? response.data
          : response.data.products || [];
      }
      if (searchQuery && isStrict && productsData.length === 0) {
        const relaxedParams = { ...params };
        delete relaxedParams.strict;
        response = await api.get("/products", { params: relaxedParams });
        if (response.success && response.data) {
          productsData = Array.isArray(response.data)
            ? response.data
            : response.data.products || [];
        }
      }
      // If still empty, relax business type exclusion to ensure results
      if (searchQuery && productsData.length === 0) {
        const relaxedBTParams = { ...params };
        delete relaxedBTParams.excludeBusinessTypes;
        response = await api.get("/products", { params: relaxedBTParams });
        if (response.success && response.data) {
          productsData = Array.isArray(response.data)
            ? response.data
            : response.data.products || [];
        }
      }
      const normalizedProducts = (productsData || []).map((p) => ({
        ...p,
        moq: p.moq || p.minimumOrderQuantity || 1,
      }));
      setProducts(normalizedProducts);

    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Debounced suggestion fetch
  const debouncedFetchSuggestions = useRef(
    debounce(async (query) => {
      if (query.trim().length < 1) {
        setSuggestions([]);
        setIsSearchingSuggestions(false);
        return;
      }
      setIsSearchingSuggestions(true);
      try {
        const response = await api.get(
          `/products/b2b-suggestions?q=${encodeURIComponent(query)}`,
        );
        if (response.success) {
          setSuggestions(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300),
  ).current;

  const handleSearchInputChange = (e) => {
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

  const handleSuggestionClick = (suggestion) => {
    const query = suggestion.text;
    setSearchQuery(query);
    setShowSuggestions(false);
    handleHeaderSearchSubmit(query, true);
  };

  // Read search query, city, category and subcategory from URL on mount
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    const urlCity = searchParams.get("city");
    const urlCategory = searchParams.get("category");
    const urlSubcategory = searchParams.get("subcategory");
    const urlMin = searchParams.get("min");
    const urlMax = searchParams.get("max");

    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch || "");
    }
    if (urlCity && urlCity !== selectedCity) {
      setSelectedCity(urlCity);
    }
    if (urlCategory && urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
      setExpandedCategory(urlCategory);
    }
    if (urlSubcategory && urlSubcategory !== selectedSubcategory) {
      setSelectedSubcategory(urlSubcategory);
    }

    const urlItemType = searchParams.get("itemType");
    if (urlItemType && urlItemType !== selectedItemType) {
      setSelectedItemType(urlItemType);
    } else if (!urlItemType && selectedItemType) {
      setSelectedItemType(null);
    }

    // Handle Price params
    if (urlMin || urlMax) {
      // Check if it matches a predefined range to highlight the button
      const minVal = urlMin ? Number(urlMin) : null;
      const maxVal = urlMax ? Number(urlMax) : null;

      // Try to match predefined ranges
      const predefined = [
        { label: "Below ₹100", min: 0, max: 100 },
        { label: "₹101 - ₹200", min: 101, max: 200 },
        { label: "₹201 - ₹500", min: 201, max: 500 },
        { label: "Above ₹501", min: 501, max: null },
      ].find((r) => r.min === minVal && r.max === maxVal);

      if (predefined) {
        setSelectedPriceRange(predefined);
        setCustomPriceRange({ min: "", max: "" });
        setPriceInputs({ min: "", max: "" });
      } else {
        const custom = { min: urlMin || "", max: urlMax || "" };
        setCustomPriceRange(custom);
        setPriceInputs(custom);
        setSelectedPriceRange(null);
      }
    }

    setSelectedBusinessType(searchParams.get("businessType") || null);
    setSelectedBusinessSubType(null);

    const urlBusinessCategory = searchParams.get("businessCategory") || null;
    if (urlBusinessCategory !== selectedBusinessCategory) {
      setSelectedBusinessCategory(urlBusinessCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    // For Big Players, only reset if we are NOT in Lot/Slot mode
    if (selectedItemType !== "lotslot" && isBigTextilePlayer) {
      setSelectedCategory("All");
      setSelectedSubcategory(null);
      setExpandedCategory(null);
    }
  }, [isPackingMaterial, isBigTextilePlayer, selectedItemType]);

  const fetchBusinessTypes = async () => {
    try {
      const response = await api.get("/business-types");
      if (response.success) {
        setBusinessTypes(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching business types:", error);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      // Parallel fetches
      await Promise.all([
        fetchAvailableLocations(true, {
          businessTypeFilter: "exclude",
          businessTypes: ["Developer", "Property Broker"],
        }),
        fetchListingLocationFilters(),
        fetchB2BVendors(),
        fetchB2BCategories(),
        fetchBusinessTypes(),
      ]);
    };
    init();
  }, []);

  useEffect(() => {
    const locKey = JSON.stringify({ selectedCity, selectedArea, selectedBusinessType });
    if (locKey !== lastLocParamsRef.current) {
      lastLocParamsRef.current = locKey;
      fetchListingLocationFilters();
    }
  }, [selectedCity, selectedArea, selectedBusinessType]);

  // Update markets from store when available
  // availableMarkets is intentionally left for potential local modifications 
  // but we prefer availableMarketsFromStore as the single source of truth for the list
  useEffect(() => {
    if (availableMarketsFromStore && availableMarketsFromStore.length > 0) {
      setAvailableMarkets(availableMarketsFromStore);
    }
  }, [availableMarketsFromStore]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      if (!isDesktop) return;

      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target)
      ) {
        setIsCityDropdownOpen(false);
      }
      if (
        areaDropdownRef.current &&
        !areaDropdownRef.current.contains(event.target)
      ) {
        setIsAreaDropdownOpen(false);
      }
      if (
        marketDropdownRef.current &&
        !marketDropdownRef.current.contains(event.target)
      ) {
        setIsMarketDropdownOpen(false);
      }
      if (
        mainCategoryDropdownRef.current &&
        !mainCategoryDropdownRef.current.contains(event.target)
      ) {
        setIsMainCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter categories locally when products change
  useEffect(() => {
    filterCategoriesLocally();
  }, [products, allCategories]);

  // Recheck inquiries when modal closes (in case inquiry was just sent)

  // Refetch products when filters change (Location, ItemType, Pattern, Fabric, Category, Subcategory)
  // OPTIMIZED: Debounce the API call to prevent multiple triggers
  useEffect(() => {
    // Skip fetch if a category is selected but categories haven't loaded yet
    if (
      selectedCategory &&
      selectedCategory !== "All" &&
      allCategories.length === 0
    ) {
      return; // Wait for categories to load before fetching by category
    }

    const timeoutId = setTimeout(() => {
      // Build a stable key that represents the current selection state
      const currentParamsKey = JSON.stringify({
        selectedState,
        selectedCity,
        selectedItemType,
        selectedArea,
        selectedMarket,
        selectedCategory,
        selectedSubcategory,
        selectedBusinessType,
        selectedBusinessSubType,
        selectedBusinessCategory,
        selectedGender,
        dynamicFilters,
        searchQuery,
        strict: searchParams.get("strict"),
        sortBy,
        sortOrder,
        categoryCount: allCategories.length,
        selectedAddressId: selectedAddress?._id
      });

      // ONLY fetch if the selection has actually changed.
      // This breaks reference-based loops (like {} !== {}) and state re-sync loops.
      if (currentParamsKey !== lastParamsRef.current) {
        lastParamsRef.current = currentParamsKey;
        fetchB2BProducts();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedState,
    selectedCity,
    selectedItemType,
    selectedArea,
    selectedMarket,
    selectedCategory,
    selectedSubcategory,
    selectedBusinessType,
    selectedBusinessSubType,
    selectedBusinessCategory,
    selectedGender,
    allCategories.length,
    JSON.stringify(dynamicFilters),
    searchQuery,
    searchParams.get("strict"),
    sortBy,
    sortOrder,
    selectedAddress
  ]);

  // Debug: Log state and cities changes
  useEffect(() => {
    // If state is selected but cities are empty, try to find cities again
    if (
      selectedState !== "All States" &&
      availableCities.length === 0 &&
      !locationsLoading &&
      availableStates.length > 0
    ) {
      const stateData = availableStates.find(
        (s) => (s.name || "").trim() === selectedState,
      );
      if (stateData && stateData.cities && stateData.cities.length > 0) {
        // Use cities directly without heavy filtering
        const directCities = stateData.cities
          .filter(
            (city) =>
              city && typeof city === "string" && city.trim().length > 0,
          )
          .map((city) => city.trim());
        if (directCities.length > 0) {
          setAvailableCities(directCities);
        }
      }
    }
  }, [selectedState, availableCities, locationsLoading, availableStates]);

  // fetchB2BCategories replaced by store action

  const filterCategoriesLocally = () => {
    // Function to filter categories - we now always show all categories from the store
    // to ensure that newly added categories by admin are always visible.

    if (allCategories.length === 0) {
      setCategories([{ id: "all", name: "All", subcategories: [] }]);
      return;
    }

    // Show all categories from the database regardless of current product list
    const categoriesToShow = allCategories;

    // Build subcategories list - show all subcategories from backend, don't filter by products
    const categoriesWithFilteredSubcategories = categoriesToShow.map((cat) => {
      return {
        ...cat,
        subcategories: (cat.subcategories || [])
          .map((s) => (typeof s === "string" ? s : s?.name))
          .filter(Boolean),
      };
    });

    // Always show 'All' option, then categories
    const finalCategories = [
      { id: "all", name: "All", subcategories: [] },
      ...categoriesWithFilteredSubcategories,
    ];

    setCategories(finalCategories);
  };

  const handleCategoryClick = (categoryName, event) => {
    if (event) {
      event.stopPropagation();
    }

    const category = categories.find((cat) => cat.name === categoryName);
    const hasSubcategories =
      category && category.subcategories && category.subcategories.length > 0;

    if (hasSubcategories) {
      if (expandedCategory === categoryName) {
        // If already expanded, just collapse and reset selection to All
        setExpandedCategory(null);
        setSelectedCategory("All");
        setSelectedSubcategory(null);
      } else {
        // Expand and SELECT this category
        setExpandedCategory(categoryName);
        setSelectedCategory(categoryName);
        setSelectedSubcategory(null); // Reset subcategory when switching main category
        
        // On mobile, we DO NOT close the category list, to allow the accordion to show.
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          setShowMobileSubcategoryCard(false);
        }
      }
    } else {
      // No subcategories, select category directly
      setSelectedCategory(categoryName);
      setSelectedSubcategory(null);
      setExpandedCategory(null);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        closeMobileOverlays();
      }
    }

    // Clear search query when changing category to avoid conflicts
    setSearchQuery("");
    setSubcategorySearchQuery("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    newParams.delete("open");
    setSearchParams(newParams, { replace: true });
  };

  const handleSubcategoryClick = (subcategoryName, categoryName) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory(subcategoryName);

    // On mobile, close the variety exploration card after selection to show results
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setShowMobileSubcategoryCard(false);
      closeMobileOverlays();
    }

    // Keep expandedCategory as categoryName so the card stays open for further filtering on desktop

    // Clear search query
    setSearchQuery("");
    setSubcategorySearchQuery("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    newParams.delete("open");
    setSearchParams(newParams, { replace: true });
  };

  // Re-evaluating expandedCategory persistence: The card will now stay open until explicitly closed by the user or when the category is reset, ensuring a stable exploring experience.

  const getCurrentSubcategories = () => {
    if (selectedCategory === "All" || !expandedCategory) return [];
    const category = categories.find((cat) => cat.name === selectedCategory);
    return category ? category.subcategories : [];
  };

  const productsList = Array.isArray(products) ? products : [];

  // Helper to get all attributes including specifications
  const getProductAttributes = (p) => [
    ...(p.attributes || []),
    ...(p.specifications || []),
  ];

  const shopOnly = searchParams.get("shopOnly") === "true";
  const vendorFilter = searchParams.get("vendor") || null;

  const filteredProducts = productsList
    .filter(() => !shopOnly)
    .filter((p) => {
      if (!vendorFilter) return true;
      const vid =
        p.vendorId?._id || p.vendorId?.id || p.vendorIdRef || p.vendorId;
      return (
        String(vid || "").toLowerCase() === String(vendorFilter).toLowerCase()
      );
    })
    .filter((product) => {
      const rawQuery = searchQuery || "";
      const query = rawQuery.toString().trim().toLowerCase();
      const isStrict = searchParams.get("strict") === "true";

      let matchesSearchFinal = true;

      if (!query) {
        matchesSearchFinal = true;
      } else if (isStrict) {
        const textName = (product.name || "").toLowerCase();
        const textDesc = (product.description || "").toLowerCase();
        const aggregate = `${textName} ${textDesc}`.trim();
        const isSingleWord = !/\s/.test(query);
        if (isSingleWord) {
          const excluded =
            aggregate.includes(`semi ${query}`) ||
            aggregate.includes(`semi-${query}`);
          if (excluded) {
            matchesSearchFinal = false;
          } else {
            const tokens = aggregate.split(/[^a-z0-9]+/i).filter(Boolean);
            matchesSearchFinal = tokens.includes(query);
          }
        } else {
          matchesSearchFinal = aggregate.includes(query);
        }
      } else {
        if (query === "micro") {
          const textName = (product.name || "").toLowerCase();
          const textDesc = (product.description || "").toLowerCase();
          const aggregate = `${textName} ${textDesc}`.trim();
          const excluded =
            aggregate.includes("semi micro") ||
            aggregate.includes("semi-micro");
          matchesSearchFinal = !excluded;
        } else {
          matchesSearchFinal = true;
        }
      }

      // Category filtering handled by backend
      let matchesCategory = true;

      // Price Filter Logic
      let matchesPrice = true;
      const price = Number(product.price);
      if (selectedPriceRange) {
        if (selectedPriceRange.min !== null && price < selectedPriceRange.min)
          matchesPrice = false;
        if (selectedPriceRange.max !== null && price > selectedPriceRange.max)
          matchesPrice = false;
      } else if (customPriceRange.min || customPriceRange.max) {
        if (customPriceRange.min && price < Number(customPriceRange.min))
          matchesPrice = false;
        if (customPriceRange.max && price > Number(customPriceRange.max))
          matchesPrice = false;
      }

      // Business Credential Filter Logic
      let matchesCredentials = true;
      if (businessCredentials.gst && !product.vendorId?.gstNumber) {
        matchesCredentials = false;
      }

      return (
        matchesSearchFinal &&
        matchesCategory &&
        matchesPrice &&
        matchesCredentials
      );
    });

  const openInquiry = (product) => {
    if (!isAuthenticated) {
      toast.error("Please login to send inquiries");
      navigate("/b2b/login");
      return;
    }
    setSelectedProduct(product);
    setShowInquiryModal(true);
  };

  const handleChatDirect = (product) => {
    if (!isAuthenticated) {
      toast.error("Please login to chat with vendors");
      navigate("/b2b/login");
      return;
    }

    const vId = product.vendorId?._id || product.vendorId;

    // Validate ID format (24 char hex string)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(vId);

    if (vId && isValidObjectId) {
      navigate(`/b2b/inquiries?vendorId=${vId}`);
    } else {
      console.error("Invalid vendor ID:", vId);
      toast.error("Cannot start chat: Invalid Vendor ID");
    }
  };

  const handleHeaderSearchChange = (value) => {
    setSearchQuery(value);
    // Automatically clear search & strict param from URL if input is cleared
    if (!value.trim()) {
      const newParams = new URLSearchParams(searchParams);
      let changed = false;
      if (newParams.has("search")) {
        newParams.delete("search");
        changed = true;
      }
      if (newParams.has("strict")) {
        newParams.delete("strict");
        changed = true;
      }
      if (newParams.has("shopOnly")) {
        newParams.delete("shopOnly");
        changed = true;
      }
      if (changed) {
        setSearchParams(newParams, { replace: true });
      }
    }
  };

  const handleHeaderSearchSubmit = (query, isStrict = false) => {
    setSearchQuery(query);

    // Reset Category and Subcategory when searching to ensure global search
    setSelectedCategory("All");
    setSelectedSubcategory(null);
    setExpandedCategory(null);
    setSubcategorySearchQuery("");

    // Auto-select city if search query matches a known city name
    // This is a convenience feature requested by user
    if (query && query.trim().length > 2) {
      const cleanQuery = query.toLowerCase().trim();
      const foundCity = availableStates
        .flatMap((s) => s.cities || [])
        .find(
          (c) =>
            c && typeof c === "string" && c.toLowerCase().trim() === cleanQuery,
        );

      if (foundCity) {
        console.log("🏙️ Auto-selecting city from search:", foundCity);
        setSelectedCity(foundCity.trim());
        // Optional: Clear search query if you only want to filter by city?
        // setSearchQuery('');
      }
    }

    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams);

    // Clear category params from URL
    newParams.delete("category");
    newParams.delete("subcategory");

    if (query) {
      newParams.set("search", query);
      if (isStrict) newParams.set("strict", "true");
      else newParams.delete("strict");
    } else {
      newParams.delete("search");
      newParams.delete("strict");
      newParams.delete("shopOnly");
    }
    setSearchParams(newParams, { replace: true });
  };

  const uniqueCities = (() => {
    const dynamicCities =
      listingLocationFilters.cities && listingLocationFilters.cities.length > 0
        ? listingLocationFilters.cities
        : (availableStates || []).flatMap((state) => state.cities || []);
    const citiesList = dynamicCities;
    const cityMap = new Map();
    citiesList.forEach(city => {
      if (!city || typeof city !== 'string') return;
      const clean = city.trim();
      const lower = clean.toLowerCase();
      const normalized = (lower === 'aagra') ? 'agra' : lower;
      if (!cityMap.has(normalized)) {
        cityMap.set(normalized, normalized === 'agra' ? 'Agra' : clean);
      }
    });
    return Array.from(cityMap.values()).filter(c => c.length > 0 && !/^\d+$/.test(c)).sort();
  })();

  const filteredCitiesList = citySearchQuery
    ? uniqueCities.filter((city) =>
      city.toLowerCase().includes(citySearchQuery.toLowerCase()),
    )
    : uniqueCities;

  // When a business type is selected and location API returns no cities, that business type has no products
  const noProductsInBusinessType = Boolean(
    selectedBusinessType &&
    listingLocationFilters.cities &&
    listingLocationFilters.cities.length === 0,
  );

  const filteredAreasList = useMemo(() => {
    const areas =
      Array.isArray(listingLocationFilters.areas) &&
        listingLocationFilters.areas.length > 0
        ? listingLocationFilters.areas
        : (Array.isArray(availableAreas) ? availableAreas : []);
    const cityFiltered = areas.filter((item) => {
      const city = (selectedCity || "All Cities").trim();
      if (city === "All Cities") return true;

      // STRICT: Only show matching objects
      if (typeof item !== "object" || !item?.city) return false;

      const itemCityLower = item.city.toLowerCase().trim();
      const cityLower = city.toLowerCase().trim();

      return itemCityLower === cityLower ||
        (cityLower === 'agra' && itemCityLower === 'aagra') ||
        (cityLower === 'aagra' && itemCityLower === 'agra');
    });

    const queryFiltered = areaSearchQuery
      ? cityFiltered.filter((item) => {
        const name = typeof item === "object" ? item.name : item;
        return name.toLowerCase().includes(areaSearchQuery.toLowerCase());
      })
      : cityFiltered;

    return [...new Set(queryFiltered.map((item) => (typeof item === "object" ? item.name : item)))].sort();
  }, [listingLocationFilters.areas, availableAreas, selectedCity, areaSearchQuery]);

  const filteredMarketsList = useMemo(() => {
    // Single source of truth: store data, with local fallback for safety
    const allMarkets =
      listingLocationFilters.markets && listingLocationFilters.markets.length > 0
        ? listingLocationFilters.markets
        : ((availableMarketsFromStore && availableMarketsFromStore.length > 0)
          ? availableMarketsFromStore
          : (availableMarkets || []));

    const markets = Array.isArray(allMarkets) ? allMarkets : [];
    const cityFiltered = markets.filter((item) => {
      const city = (selectedCity || "All Cities").trim();
      if (city === "All Cities") return true;

      // STRICT: Only show matching objects
      if (typeof item !== "object" || !item?.city) return false;

      const itemCityLower = item.city.toLowerCase().trim();
      const cityLower = city.toLowerCase().trim();

      return itemCityLower === cityLower ||
        (cityLower === 'agra' && itemCityLower === 'aagra') ||
        (cityLower === 'aagra' && itemCityLower === 'agra');
    });

    const areaFiltered = cityFiltered.filter((item) => {
      if (!selectedArea) return true;
      if (typeof item !== "object" || !item?.area) return false;
      return item.area.toLowerCase().trim() === selectedArea.toLowerCase().trim();
    });

    const queryFiltered = marketSearchQuery
      ? areaFiltered.filter((item) => {
        const name = typeof item === "object" ? item.name : item;
        return name.toLowerCase().includes(marketSearchQuery.toLowerCase());
      })
      : areaFiltered;

    return [...new Set(queryFiltered.map((item) => (typeof item === "object" ? item.name : item)))].sort();
  }, [listingLocationFilters.markets, availableMarketsFromStore, availableMarkets, selectedCity, selectedArea, marketSearchQuery]);

  useEffect(() => {
    if (!cityResetInitializedRef.current) {
      cityResetInitializedRef.current = true;
      return;
    }
    setSelectedArea(null);
    setSelectedMarket(null);
  }, [selectedCity]);

  useEffect(() => {
    if (!areaResetInitializedRef.current) {
      areaResetInitializedRef.current = true;
      return;
    }
    setSelectedMarket(null);
  }, [selectedArea]);

  // Sync businessType params to URL so they can be cleared correctly
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedBusinessType)
      newParams.set("businessType", selectedBusinessType);
    else newParams.delete("businessType");
    newParams.delete("businessSubType");
    setSearchParams(newParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessType, selectedBusinessSubType]);

  // Sync businessCategory params to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedBusinessCategory)
      newParams.set("businessCategory", selectedBusinessCategory);
    else newParams.delete("businessCategory");
    setSearchParams(newParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessCategory]);

  // Sync category/subcategory in URL and clear when reset/collapse
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedCategory && selectedCategory !== "All") {
      newParams.set("category", selectedCategory);
    } else {
      newParams.delete("category");
      newParams.delete("subcategory");
    }
    if (selectedSubcategory) {
      newParams.set("subcategory", selectedSubcategory);
    } else {
      newParams.delete("subcategory");
    }
    setSearchParams(newParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubcategory, expandedCategory]);

  const headerFilters = (
    <div className="flex items-center gap-3">
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <B2BHeader
        searchQuery={searchQuery}
        onSearchChange={handleHeaderSearchChange}
        onSearchSubmit={handleHeaderSearchSubmit}
        hideSearch={false}
        customNav={headerFilters}
      />

      {/* Mobile: Search bar sticks under white header */}
      <div className="lg:hidden sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-40 px-4 py-3 bg-white border-b border-gray-50">
        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 px-3 py-1 transition-all focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300 focus-within:bg-white">
          <FiSearch className="text-gray-400 mr-2" size={16} />
          <input
            type="text"
            placeholder="SEARCH PRODUCTS AND SHOPS"
            className="w-full bg-transparent py-1.5 text-[10px] font-bold text-gray-700 outline-none placeholder:text-gray-400 h-9 uppercase tracking-tight"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHeaderSearchSubmit(searchQuery)}
          />
        </div>

      </div>

      {isCityDropdownOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[70] bg-black/40"
          onClick={() => setIsCityDropdownOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[65vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Select City
              </span>
              <button
                onClick={() => setIsCityDropdownOpen(false)}
                className="text-xs font-bold text-gray-400">
                Close
              </button>
            </div>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
              <input
                autoFocus
                type="text"
                placeholder="Search city..."
                className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1 pb-28">
              <button
                onClick={() => {
                  setSelectedCity("All Cities");
                  setIsCityDropdownOpen(false);
                  setCitySearchQuery("");
                }}
                className={`w-full px-4 py-2 text-left text-[10px] font-black rounded-lg transition-colors ${selectedCity === "All Cities" ? "bg-primary-50 text-primary-600" : "bg-gray-50 text-gray-700"}`}>
                ALL CITIES
              </button>
              {filteredCitiesList.length > 0 ? (
                filteredCitiesList.map((city, index) => (
                  <button
                    key={`${city}-${index}`}
                    onClick={() => {
                      setSelectedCity(city);
                      setIsCityDropdownOpen(false);
                      setCitySearchQuery("");
                    }}
                    className={`w-full px-4 py-2 text-left text-[10px] font-bold rounded-lg transition-colors ${selectedCity === city ? "bg-primary-50 text-primary-600" : "bg-gray-50 text-gray-700"}`}>
                    {city.toUpperCase()}
                  </button>
                ))
              ) : (
                <div className="px-2 py-8 text-center text-[10px] text-gray-400 font-bold">
                  NO CITIES FOUND
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isMainCategoryDropdownOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[70] bg-black/40"
          onClick={closeMobileOverlays}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[70vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Browse Categories
              </span>
              <button
                onClick={closeMobileOverlays}
                className="text-xs font-bold text-gray-400">
                Close
              </button>
            </div>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
              <input
                type="text"
                placeholder="Search categories..."
                className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar pr-1 space-y-2 pb-28">
              <button
                className={`w-full px-4 py-2 text-left text-[10px] font-black rounded-lg transition-colors ${selectedCategory === "All" ? "bg-primary-50 text-primary-600" : "bg-gray-50 text-gray-700"}`}
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedSubcategory(null);
                  setExpandedCategory(null);
                  setIsMainCategoryDropdownOpen(false);
                }}>
                ALL
              </button>
              {categories
                .filter((cat) => {
                  if (cat.name === "All") return false;
                  const q = categorySearchQuery.toLowerCase();
                  if (!q) return true;
                  const matchCat = cat.name.toLowerCase().includes(q);
                  const matchSub = (cat.subcategories || []).some(sub => 
                    (typeof sub === "string" ? sub : sub?.name || "").toLowerCase().includes(q)
                  );
                  return matchCat || matchSub;
                })
                .map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-wider ${expandedCategory === cat.name ? "bg-primary-50 text-primary-600" : "text-gray-700"}`}
                      onClick={() => {
                        handleCategoryClick(cat.name);
                      }}>
                      <span>{cat.name}</span>
                      <FiChevronRight
                        className={`text-gray-400 transition-transform ${expandedCategory === cat.name ? "rotate-90" : ""}`}
                      />
                    </button>
                    {(expandedCategory === cat.name || (categorySearchQuery.trim() !== "" && (cat.subcategories || []).some(sub => (typeof sub === "string" ? sub : sub?.name || "").toLowerCase().includes(categorySearchQuery.toLowerCase())))) &&
                      cat.subcategories?.length > 0 && (
                        <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2">
                          {cat.subcategories
                            .filter(sub => {
                              const q = categorySearchQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (typeof sub === "string" ? sub : sub?.name || "").toLowerCase().includes(q);
                            })
                            .map((sub) => (
                              <button
                                key={typeof sub === "string" ? sub : sub?.name}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${selectedSubcategory === (typeof sub === "string" ? sub : sub?.name) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 border-gray-200"}`}
                                onClick={() => {
                                  handleSubcategoryClick(typeof sub === "string" ? sub : sub?.name, cat.name);
                                  closeMobileOverlays();
                                }}>
                                {typeof sub === "string" ? sub : sub?.name}
                              </button>
                            ))}
                        </div>
                      )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <main className=" mx-auto px-4 py-4 md:py-8">
        {/* Dynamic Category Strip */}
        <div className="mb-6 overflow-x-auto custom-scrollbar pb-2">
          <div className="flex gap-4 min-w-max px-2">
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedSubcategory(null);
                setExpandedCategory(null);
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-16 h-16 rounded-full border-2 p-1 transition-all ${selectedCategory === "All" ? "border-primary-500 shadow-md scale-105" : "border-transparent hover:border-gray-200"}`}>
                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                  <FiGrid className={`text-xl ${selectedCategory === "All" ? "text-primary-600" : "text-gray-500"}`} />
                </div>
              </div>
              <span className={`text-[10px] font-bold text-center w-16 truncate ${selectedCategory === "All" ? "text-primary-600" : "text-gray-600"}`}>All</span>
            </button>
            {allCategories.filter(c => c.name !== "All").map(cat => (
              <button
                key={cat._id || cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setExpandedCategory(cat.name);
                  setSelectedSubcategory(null);
                }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-16 h-16 rounded-full border-2 p-1 transition-all ${selectedCategory === cat.name ? "border-primary-500 shadow-md scale-105" : "border-transparent hover:border-gray-200"}`}>
                  <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-gray-300">{cat.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-bold text-center w-16 truncate ${selectedCategory === cat.name ? "text-primary-600" : "text-gray-600"}`}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>


        {/* Subcategory Filter Row */}
        {selectedCategory !== "All" && allCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedSubcategory(null)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${!selectedSubcategory ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary-200 hover:bg-gray-50"}`}
            >
              All
            </button>
            {(() => {
              const rootCat = allCategories.find((c) => c.name === selectedCategory);
              if (!rootCat || !rootCat.subcategories) return null;
              
              // We flatten both level 2 and level 3 subcategories so they are all clickable as pills
              const allSubNames = [];
              rootCat.subcategories.forEach(sub => {
                const subName = typeof sub === 'string' ? sub : sub.name;
                if (subName) allSubNames.push(subName);
                
                // If this subcategory has its own subcategories (level 3)
                if (typeof sub === 'object' && sub.subcategories) {
                   sub.subcategories.forEach(subSub => {
                     const subSubName = typeof subSub === 'string' ? subSub : subSub.name;
                     if (subSubName) allSubNames.push(subSubName);
                   });
                }
              });
              
              const uniqueSubNames = [...new Set(allSubNames)];
              
              return uniqueSubNames.map(subName => (
                <button
                  key={subName}
                  onClick={() => setSelectedSubcategory(subName)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${selectedSubcategory === subName ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-primary-200 hover:bg-gray-50"}`}
                >
                  {subName}
                </button>
              ));
            })()}
          </div>
        )}

        {/* Search & Filter Bar max-w-7xl */}
        <div className="space-y-4 md:space-y-6 mb-2">

          {/* Mobile search already rendered above */}



          {/* Category playlist removed: reels are shown as cards below */}

          {/* Full Width Subcategory Explorer Card */}

        </div>

        <div className="mt-2">
          {/* Product Listing Area - Full Width */}
          <div className="w-full">
            {/* Active Filters Pill Bar */}
            {selectedCategory !== "All" && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-100 shadow-sm">
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest">
                    ACTIVE CATEGORY:
                  </span>
                  <span className="text-[10px] font-bold text-gray-700 uppercase">
                    {selectedCategory}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedSubcategory(null);
                      setExpandedCategory(null);
                    }}
                    className="ml-1 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                </div>

                {selectedSubcategory && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 shadow-sm">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      VARIETY:
                    </span>
                    <span className="text-[10px] font-bold text-gray-700 uppercase">
                      {selectedSubcategory}
                    </span>
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className="ml-1 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}

                {Object.entries(dynamicFilters).map(([key, value]) => {
                  const displayValue = Array.isArray(value) ? value.join(", ") : value;
                  if (!displayValue) return null;
                  return (
                    <div key={key} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 shadow-sm">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {key}:
                      </span>
                      <span className="text-[10px] font-bold text-gray-700 uppercase">
                        {displayValue}
                      </span>
                      <button
                        onClick={() => {
                          const newFilters = { ...dynamicFilters };
                          delete newFilters[key];
                          setDynamicFilters(newFilters);
                        }}
                        className="ml-1 text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedSubcategory(null);
                    setExpandedCategory(null);
                    setDynamicFilters({});
                  }}
                  className="px-4 py-2 text-[9px] font-black text-primary-600 hover:bg-primary-50 rounded-full uppercase tracking-widest transition-all"
                >
                  Clear All
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-primary-50 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-gray-500 font-bold mt-8 text-lg tracking-wide uppercase">
                  Discovering Premium Goods...
                </p>
              </div>
            ) : matchingVendors.length === 0 &&
              filteredProducts.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
                <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-12">
                  <FiSearch className="text-4xl text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">
                  No matching gems found
                </h3>
                <p className="text-gray-400 font-medium max-w-sm mx-auto">
                  Try broadening your search or choosing a different category to
                  see more products.
                </p>
                {(selectedPriceRange ||
                  customPriceRange.min ||
                  customPriceRange.max ||
                  searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedPriceRange(null);
                        setCustomPriceRange({ min: "", max: "" });
                        setSearchQuery("");
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete("search");
                        newParams.delete("shopOnly");
                        setSearchParams(newParams);
                      }}
                      className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-primary-700 transition-all">
                      Clear Search & Filters
                    </button>
                  )}
              </div>
            ) : (
              <div className="space-y-12">
                {/* Matching Stores Section - Show if found during search */}
                {searchQuery &&
                  (matchingVendors.length > 0 || filteredProducts.length > 0) ? (
                  <div className="space-y-12">
                    {/* Matching Stores Section */}
                    {matchingVendors.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="h-[2px] w-12 bg-primary-600"></span>
                          <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase">
                            Matching Stores
                          </h3>
                          <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase">
                            {matchingVendors.length} SHOP
                            {matchingVendors.length > 1 ? "S" : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {matchingVendors.map((vendor) => (
                            <B2BVendorCard
                              key={vendor._id}
                              vendor={vendor}
                              trackContactClick={trackContactClick}
                              itemType={selectedItemType}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Products Section */}
                    {filteredProducts.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="h-[2px] w-12 bg-gray-600"></span>
                            <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase">
                              Matching Products
                            </h3>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase">
                              {filteredProducts.length} ITEM
                              {filteredProducts.length > 1 ? "S" : ""}
                            </span>
                                        {/* Filters side-by-side on same line */}
                          <div className="flex items-center gap-2 relative z-20">
                            {/* Gender Dropdown */}
                            <div className="relative" ref={genderDropdownRef}>
                              <button
                                onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                                className={`px-4 py-2 text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest border rounded-xl ${selectedGender !== "All" ? "bg-primary-50 text-primary-600 border-primary-200 shadow-sm" : "bg-white text-gray-700 hover:text-primary-600 hover:bg-gray-50 border-gray-200 shadow-sm"}`}>
                                <FiUser size={14} className="text-primary-600" />
                                <span>Gender: {selectedGender === "All" ? "All" : selectedGender}</span>
                                <FiChevronDown
                                  className={`transition-transform duration-200 ${isGenderDropdownOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              <AnimatePresence>
                                {isGenderDropdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-1.5 space-y-0.5">
                                      {["All", "Men", "Women", "Kids", "Unisex"].map((g) => (
                                        <button
                                          key={g}
                                          onClick={() => {
                                            setSelectedGender(g);
                                            setIsGenderDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between group ${selectedGender === g ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                          <span>{g === "All" ? "All Genders" : g}</span>
                                          {selectedGender === g && <FiCheck className="text-primary-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Price Sort Dropdown for search results */}
                            <div className="relative" ref={sortDropdownRef}>
                              <button
                                onClick={() =>
                                  setIsSortDropdownOpen(!isSortDropdownOpen)
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm hover:border-primary-200 transition-all whitespace-nowrap">
                                <FiTrendingUp className="text-primary-600" />
                                <span>Sort: {getSortLabel()}</span>
                                <FiChevronDown
                                  className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              <AnimatePresence>
                                {isSortDropdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-1">
                                      <button
                                        onClick={() =>
                                          handleSortChange("createdAt", "desc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "createdAt" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Newest First
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSortChange("price", "asc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "price" && sortOrder === "asc" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Price: Low to High
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSortChange("price", "desc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "price" && sortOrder === "desc" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Price: High to Low
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>                </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {filteredProducts.map((product) => (
                            <B2BProductCard
                              key={product._id}
                              product={product}
                              trackContactClick={trackContactClick}
                              itemType={selectedItemType}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Normal Display (No Search or Empty Search) */
                  <div className="space-y-6">
                    {(reelsLoading || reels.length > 0) && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          data-prevent-category-collapse
                          onClick={() => setCatalogTab("products")}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${catalogTab === "products"
                            ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200"
                            : "bg-white text-gray-600 border-gray-200 hover:border-primary-200"
                            }`}
                        >
                          <FiGrid className="inline-block mr-2 -mt-[2px]" />
                          Products
                        </button>
                        <button
                          type="button"
                          data-prevent-category-collapse
                          onClick={() => setCatalogTab("reels")}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${catalogTab === "reels"
                            ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200"
                            : "bg-white text-gray-600 border-gray-200 hover:border-primary-200"
                            }`}
                        >
                          <FiVideo className="inline-block mr-2 -mt-[2px]" />
                          Reels
                        </button>
                        {reels.length > 0 && (
                          <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase">
                            {reels.length} REEL{reels.length > 1 ? "S" : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {catalogTab === "reels" ? (
                      reelsLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                          <p className="text-gray-400 font-bold mt-4 text-xs uppercase tracking-widest">
                            Loading Reels...
                          </p>
                        </div>
                      ) : reels.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {reels.map((reel) => {
                            const ytId = getReelYoutubeId(reel);
                            return (
                              <button
                                key={reel._id}
                                type="button"
                                onClick={() => navigate(`/b2b/reels/${reel._id}`)}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col text-left transition-transform hover:scale-105"
                              >
                                <div className="relative aspect-[9/16] bg-gray-900 group/reel">
                                  {reel.thumbnailUrl || ytId ? (
                                    <img
                                      src={
                                        reel.thumbnailUrl ||
                                        `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                                      }
                                      alt={reel.title}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-800">
                                      <FiVideo size={32} className="mb-2 opacity-20" />
                                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Reel</span>
                                      {reel.videoUrl && (
                                        <video
                                          src={reel.videoUrl}
                                          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/reel:opacity-100 transition-opacity"
                                          muted
                                          playsInline
                                          onMouseOver={(e) => e.target.play()}
                                          onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                        />
                                      )}
                                    </div>
                                  )}
                                  {ytId && (
                                    <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg shadow-lg z-10 scale-90 group-hover/reel:scale-100 transition-transform">
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2.5">
                                  <div className="flex items-center justify-between gap-1.5 overflow-hidden">
                                    <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">
                                      {reel.title}
                                    </p>
                                    <div className="flex flex-col items-end shrink-0">
                                      {reel.price > 0 && (
                                        <span className="text-[10px] font-black text-primary-600 leading-none">
                                          ₹{reel.price}
                                        </span>
                                      )}
                                      {reel.minimum && (
                                        <span className="text-[8px] font-bold text-gray-400 mt-0.5 leading-none">
                                          Min: {reel.minimum}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-inner">
                          <FiVideo className="text-4xl text-gray-200 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-gray-800">No reels for this filter</h3>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase">
                              {filteredProducts.length} ITEM
                              {filteredProducts.length > 1 ? "S" : ""}
                            </span>
                                       {/* Filters side-by-side on same line */}
                          <div className="flex items-center gap-2 relative z-20">
                            {/* Gender Dropdown */}
                            <div className="relative" ref={genderDropdownRef}>
                              <button
                                onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                                className={`px-4 py-2 text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest border rounded-xl ${selectedGender !== "All" ? "bg-primary-50 text-primary-600 border-primary-200 shadow-sm" : "bg-white text-gray-700 hover:text-primary-600 hover:bg-gray-50 border-gray-200 shadow-sm"}`}>
                                <FiUser size={14} className="text-primary-600" />
                                <span>Gender: {selectedGender === "All" ? "All" : selectedGender}</span>
                                <FiChevronDown
                                  className={`transition-transform duration-200 ${isGenderDropdownOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              <AnimatePresence>
                                {isGenderDropdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-1.5 space-y-0.5">
                                      {["All", "Men", "Women", "Kids", "Unisex"].map((g) => (
                                        <button
                                          key={g}
                                          onClick={() => {
                                            setSelectedGender(g);
                                            setIsGenderDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between group ${selectedGender === g ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                          <span>{g === "All" ? "All Genders" : g}</span>
                                          {selectedGender === g && <FiCheck className="text-primary-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Price Sort Dropdown */}
                            <div className="relative" ref={sortDropdownRef}>
                              <button
                                onClick={() =>
                                  setIsSortDropdownOpen(!isSortDropdownOpen)
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm hover:border-primary-200 transition-all whitespace-nowrap">
                                <FiTrendingUp className="text-primary-600" />
                                <span>Sort: {getSortLabel()}</span>
                                <FiChevronDown
                                  className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              <AnimatePresence>
                                {isSortDropdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-1">
                                      <button
                                        onClick={() =>
                                          handleSortChange("createdAt", "desc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "createdAt" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Newest First
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSortChange("price", "asc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "price" && sortOrder === "asc" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Price: Low to High
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSortChange("price", "desc")
                                        }
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "price" && sortOrder === "desc" ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
                                        Price: High to Low
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>                  </div>
                        </div>
                        {filteredProducts.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-wider text-primary-700">
                              Products
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                              {filteredProducts.map((product) => (
                                <B2BProductCard
                                  key={product._id}
                                  product={product}
                                  trackContactClick={trackContactClick}
                                  itemType={selectedItemType}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-[101] lg:hidden shadow-2xl flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                    <FiFilter size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">
                      Filters
                    </h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                      Refine your search
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <FiX size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
                {renderFilters()}
              </div>
              <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95">
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <B2BBottomNav />
    </div>
  );
};

export default ProductCatalog;
