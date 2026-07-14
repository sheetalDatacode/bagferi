
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiClock, FiTrendingUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts } from '../services/productService';
import useDebounce from '../hooks/useDebounce';

const RECENT_SEARCHES_KEY = 'recent-searches';
const MAX_RECENT_SEARCHES = 5;
const MAX_SUGGESTIONS = 5;

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're in the mobile app section
  const isMobileApp = location.pathname.startsWith('/app');
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  // Popular searches (dynamic from backend)
  const [popularSearches, setPopularSearches] = useState([]);

  // Fetch popular searches (trending products) on mount
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        // Fetch trending products, fallback to top rated if no trending
        const response = await getProducts({
          isTrending: true,
          limit: 6,
          sortOrder: 'desc',
          sortBy: 'rating'
        });

        if (response.products && response.products.length > 0) {
          // Extract unique short names or categories to function as search terms
          const terms = response.products
            .map(p => p.name)
            .slice(0, 6); // Limit to 6 chips

          setPopularSearches(terms);
        } else {
          // Fallback if no products found (optional, to avoid empty section)
          setPopularSearches([]);
        }
      } catch (error) {
        console.error('Error fetching popular searches:', error);
        // Fallback to empty or keep empty
        setPopularSearches([]);
      }
    };

    fetchPopularSearches();
  }, []);

  // Animated placeholder texts
  const placeholderTexts = [
    'Search for groceries...',
    'Find fresh vegetables...',
    'Looking for fruits?',
    'Browse baby products...',
    'Search daily deals...'
  ];

  // Get recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (recent) {
      try {
        setRecentSearches(JSON.parse(recent));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const updated = [query.trim(), ...recentSearches.filter((s) => s !== query.trim())].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  // Update suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await getProducts({
          search: debouncedSearchQuery,
          limit: MAX_SUGGESTIONS
        });

        // Filter out products without names just in case
        const validProducts = (response.products || [])
          .filter(p => p.name)
          .map(product => ({
            type: 'product',
            id: product._id || product.id,
            name: product.name,
            image: product.images?.[0]?.url || product.image || 'https://via.placeholder.com/150',
            price: product.price || product.salePrice,
          }));

        setSuggestions(validProducts);
      } catch (error) {
        console.error('Error fetching search suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
    setSelectedIndex(-1);
  }, [debouncedSearchQuery]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions && (suggestions.length > 0 || getRecentSearches().length > 0)) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setShowSuggestions(true);
      }
      return;
    }

    const totalItems = suggestions.length + (searchQuery.trim() ? 0 : recentSearches.length) + (searchQuery.trim() ? 0 : popularSearches.length);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSuggestionSelect(selectedIndex);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      const searchRoute = isMobileApp
        ? `/app/search?q=${encodeURIComponent(searchQuery.trim())}`
        : `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      navigate(searchRoute);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (index) => {
    let selectedItem;

    if (searchQuery.trim()) {
      // Product suggestions
      if (index < suggestions.length) {
        selectedItem = suggestions[index];
        const productRoute = isMobileApp
          ? `/app/product/${selectedItem.id}`
          : `/product/${selectedItem.id}`;
        navigate(productRoute);
      }
    } else {
      // Recent searches or popular searches
      if (index < recentSearches.length) {
        const query = recentSearches[index];
        setSearchQuery(query);
        saveRecentSearch(query);
        const searchRoute = isMobileApp
          ? `/app/search?q=${encodeURIComponent(query)}`
          : `/search?q=${encodeURIComponent(query)}`;
        navigate(searchRoute);
      } else if (index < recentSearches.length + popularSearches.length) {
        const query = popularSearches[index - recentSearches.length];
        setSearchQuery(query);
        saveRecentSearch(query);
        const searchRoute = isMobileApp
          ? `/app/search?q=${encodeURIComponent(query)}`
          : `/search?q=${encodeURIComponent(query)}`;
        navigate(searchRoute);
      }
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleInputBlur = (e) => {
    // Delay blur to allow clicking on suggestions
    setTimeout(() => {
      if (!searchRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 200);
  };

  // Rotate placeholders when not focused and input is empty
  useEffect(() => {
    if (!isFocused && !searchQuery.trim()) {
      const interval = setInterval(() => {
        setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
      }, 3000); // Change placeholder every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isFocused, searchQuery, placeholderTexts.length]);

  const hasSuggestions = suggestions.length > 0 || recentSearches.length > 0 || popularSearches.length > 0;

  return (
    <div className="w-full relative" ref={searchRef}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative group">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder=""
            className="w-full pl-12 pr-4 py-3 glass-card rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:shadow-glow transition-all duration-300 text-gray-700 placeholder:text-transparent"
          />
          {!searchQuery.trim() && (
            <div className="absolute left-12 top-1/2 transform -translate-y-1/2 pointer-events-none overflow-hidden z-[1] h-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={currentPlaceholderIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-gray-400 text-sm block whitespace-nowrap"
                >
                  {placeholderTexts[currentPlaceholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {showSuggestions && hasSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[80vh] overflow-y-auto scrollbar-hide"
          >
            {/* Recent Searches */}
            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div className="p-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                    <FiClock className="text-sm" />
                    RECENT SEARCHES
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentSearches();
                    }}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    CLEAR ALL
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${selectedIndex === index ? "bg-primary-50 translate-x-1" : "hover:bg-gray-50 hover:translate-x-1"
                        }`}
                    >
                      <FiClock className="text-gray-300 group-hover:text-primary-400 transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {search}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches - Modern Chips Layout */}
            {!searchQuery.trim() && popularSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 px-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  <FiTrendingUp className="text-sm" />
                  POPULAR SEARCHES
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(recentSearches.length + index)}
                      className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ${selectedIndex === recentSearches.length + index
                        ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200"
                        : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-white hover:border-primary-500 hover:text-primary-600 hover:shadow-sm"
                        }`}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Suggestions */}
            {searchQuery.trim() && suggestions.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">
                  PRODUCT RESULTS
                </div>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionSelect(index)}
                      className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${selectedIndex === index ? "bg-primary-50 translate-x-1" : "hover:bg-gray-50 hover:translate-x-1"
                        }`}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <img
                          src={suggestion.image}
                          alt={suggestion.name}
                          className="w-full h-full rounded-lg object-cover shadow-sm group-hover:shadow-md transition-shadow"
                        />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-lg" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary-700 transition-colors">
                          {suggestion.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-black text-primary-600">
                            ₹{suggestion.price}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                            FAST DELIVERY
                          </span>
                        </div>
                      </div>
                      <div className="p-2 rounded-full bg-gray-100 text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all opacity-0 group-hover:opacity-100">
                        <FiSearch className="text-sm" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery.trim() && suggestions.length === 0 && (
              <div className="p-8 text-center bg-gray-50/50">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch className="text-2xl text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">No results found</p>
                <p className="text-xs text-gray-500">
                  We couldn't find any products matching "{searchQuery}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;

