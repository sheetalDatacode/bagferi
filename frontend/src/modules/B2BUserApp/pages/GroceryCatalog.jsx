import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiPackage, FiArrowLeft, FiFilter, FiChevronDown, FiCheck } from "react-icons/fi";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";

import CompactProductCard from "../components/CompactProductCard";

const GroceryCatalog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedWeights, setSelectedWeights] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({ brands: [], weights: [] });
  const [maxMoq, setMaxMoq] = useState(null);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isQtyOpen, setIsQtyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
    }, 600);
    return () => clearTimeout(handler);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grocery/categories');
      if (res.success) {
        setCategories(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedRootId(res.data[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching categories", error);
      toast.error('Failed to load grocery categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedRootId) return;
      try {
        setLoadingProducts(true);
        let url = `/grocery/products?category=${selectedRootId}&limit=20&sort=${sortBy}&_t=${Date.now()}`;
        if (debouncedMinPrice) url += `&minPrice=${debouncedMinPrice}`;
        if (debouncedMaxPrice) url += `&maxPrice=${debouncedMaxPrice}`;
        if (maxMoq) url += `&maxMoq=${maxMoq}`;
        if (selectedBrands.length > 0) url += `&brands=${encodeURIComponent(selectedBrands.join(','))}`;
        if (selectedWeights.length > 0) url += `&weights=${encodeURIComponent(selectedWeights.join(','))}`;
        
        if (selectedAddress) {
          if (selectedAddress.pincode) {
            const delArea = selectedAddress.areaName
              ? `${selectedAddress.pincode}|${selectedAddress.areaName}`
              : selectedAddress.pincode;
            url += `&deliveryArea=${encodeURIComponent(delArea)}`;
          }
          url += `&city=${encodeURIComponent(selectedAddress.city)}`;
        }

        const res = await api.get(url);
        if (res.success) {
          setProducts(res.data.products || res.data || []);
        }
      } catch (error) {
        console.error("Error fetching products", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    const fetchFilters = async () => {
      if (!selectedRootId) return;
      try {
        const res = await api.get(`/grocery/products/filters?category=${selectedRootId}&_t=${Date.now()}`);
        if (res.success) {
          setAvailableFilters(res.data || { brands: [], weights: [] });
        }
      } catch (error) {
        console.error("Error fetching filters", error);
      }
    };

    fetchProducts();
    fetchFilters();
  }, [selectedRootId, sortBy, debouncedMinPrice, debouncedMaxPrice, selectedBrands, selectedWeights, maxMoq, selectedAddress?._id]);

  const selectedRoot = categories.find(c => c._id === selectedRootId) || null;

  return (
    <div className="bg-[#f4f6f9] min-h-screen flex flex-col font-sans h-screen overflow-hidden">
      <B2BHeader 
        title="Grocery" 
        searchQuery={searchQuery}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search 'Atta', 'Milk', 'Dal'..."
        suggestionEndpoint="/grocery/products/suggestions"
      />
      
      <div className="flex flex-1 overflow-hidden pb-16 lg:pb-0">
        {/* Left Sidebar - Root Categories */}
        <div className="w-[85px] md:w-32 bg-white flex flex-col overflow-y-auto no-scrollbar shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-0 border-r border-gray-100 shrink-0">
            {loading && categories.length === 0 ? (
                <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                categories?.map((cat) => {
                    const isSelected = selectedRootId === cat._id;
                    return (
                        <button
                            key={cat._id}
                            onClick={() => setSelectedRootId(cat._id)}
                            className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 transition-all relative
                                ${isSelected ? 'bg-green-50/50 border-l-4 border-green-600' : 'border-l-4 border-transparent hover:bg-gray-50'}`}
                        >
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center
                                ${isSelected ? 'ring-2 ring-green-100 shadow-sm' : 'bg-gray-100'}`}>
                                {cat.image ? (
                                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FiPackage className="text-gray-400 text-xl" />
                                )}
                            </div>
                            <span className={`text-[10px] md:text-[11px] font-bold text-center leading-tight
                                ${isSelected ? 'text-green-700' : 'text-gray-600'}`}>
                                {cat.name}
                            </span>
                        </button>
                    );
                })
            )}
        </div>

        {/* Right Content - Subcategories */}
        <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-4 md:p-6">
            {selectedRoot ? (
                <div>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <h3 className="text-sm md:text-base font-extrabold text-gray-800 capitalize m-0">
                            {selectedRoot.name}
                        </h3>
                        
                        {/* Filter Bar */}
                        <div className="flex items-center gap-2">
                           {/* Filters Dropdown */}
                           <div className="relative">
                              <button 
                                onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); setIsQtyOpen(false); }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all uppercase tracking-wider shadow-sm"
                              >
                                 <FiFilter size={12} /> Filters <FiChevronDown size={12} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {isFilterOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 max-h-[70vh] overflow-y-auto custom-scrollbar"
                                  >
                                    {/* Price Range */}
                                    <div className="mb-4">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Price Range (₹)</h4>
                                      <div className="grid grid-cols-2 gap-2 items-center">
                                        <input 
                                          type="number" 
                                          placeholder="Min" 
                                          value={minPrice}
                                          onChange={(e) => setMinPrice(e.target.value)}
                                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary-300"
                                        />
                                        <input 
                                          type="number" 
                                          placeholder="Max" 
                                          value={maxPrice}
                                          onChange={(e) => setMaxPrice(e.target.value)}
                                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary-300"
                                        />
                                      </div>
                                    </div>

                                    {/* Brands Filter */}
                                    {availableFilters.brands && availableFilters.brands.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Brand</h4>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                          {availableFilters.brands.map(brand => (
                                            <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                                              <div className="relative flex items-center justify-center">
                                                <input 
                                                  type="checkbox"
                                                  checked={selectedBrands.includes(brand)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) setSelectedBrands([...selectedBrands, brand]);
                                                    else setSelectedBrands(selectedBrands.filter(b => b !== brand));
                                                  }}
                                                  className="appearance-none w-4 h-4 rounded border border-gray-300 checked:bg-primary-600 checked:border-primary-600 transition-colors cursor-pointer"
                                                />
                                                {selectedBrands.includes(brand) && <FiCheck size={10} className="absolute text-white pointer-events-none" />}
                                              </div>
                                              <span className="text-xs font-semibold text-gray-600 group-hover:text-primary-600 truncate">{brand}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Weight/Size Filter */}
                                    {availableFilters.weights && availableFilters.weights.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Weight / Size</h4>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                          {availableFilters.weights.map(weight => (
                                            <label key={weight} className="flex items-center gap-2 cursor-pointer group">
                                              <div className="relative flex items-center justify-center">
                                                <input 
                                                  type="checkbox"
                                                  checked={selectedWeights.includes(weight)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) setSelectedWeights([...selectedWeights, weight]);
                                                    else setSelectedWeights(selectedWeights.filter(w => w !== weight));
                                                  }}
                                                  className="appearance-none w-4 h-4 rounded border border-gray-300 checked:bg-primary-600 checked:border-primary-600 transition-colors cursor-pointer"
                                                />
                                                {selectedWeights.includes(weight) && <FiCheck size={10} className="absolute text-white pointer-events-none" />}
                                              </div>
                                              <span className="text-xs font-semibold text-gray-600 group-hover:text-primary-600 truncate">{weight}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-gray-100">
                                       <button onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedBrands([]); setSelectedWeights([]); setIsFilterOpen(false); }} className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-200">Clear</button>
                                       <button onClick={() => setIsFilterOpen(false)} className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/20">Apply</button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>

                           {/* Sort Dropdown */}
                           <div className="relative">
                              <button 
                                onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); setIsQtyOpen(false); }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all uppercase tracking-wider shadow-sm"
                              >
                                 Sort <FiChevronDown size={12} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {isSortOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                                  >
                                    <div className="p-1.5 space-y-0.5">
                                      {[
                                        { id: 'newest', label: 'Newest First' },
                                        { id: 'price_asc', label: 'Price (low to high)' },
                                        { id: 'price_desc', label: 'Price (high to low)' },
                                        { id: 'rating_desc', label: 'Rating (high to low)' },
                                        { id: 'discount_desc', label: 'Discount (high to low)' }
                                      ].map(opt => (
                                        <button
                                          key={opt.id}
                                          onClick={() => { setSortBy(opt.id); setIsSortOpen(false); }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${sortBy === opt.id ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                          {opt.label}
                                          {sortBy === opt.id && <FiCheck size={12} className="text-primary-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>

                           {/* Quantity Dropdown */}
                           <div className="relative hidden md:block">
                              <button 
                                onClick={() => { setIsQtyOpen(!isQtyOpen); setIsFilterOpen(false); setIsSortOpen(false); }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all uppercase tracking-wider shadow-sm"
                              >
                                 Quantity <FiChevronDown size={12} className={`transition-transform ${isQtyOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {isQtyOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                                  >
                                    <div className="p-1.5 space-y-0.5">
                                      {[
                                        { id: null, label: 'Any Quantity' },
                                        { id: 10, label: 'MOQ ≤ 10' },
                                        { id: 50, label: 'MOQ ≤ 50' },
                                        { id: 100, label: 'MOQ ≤ 100' }
                                      ].map(opt => (
                                        <button
                                          key={opt.id || 'any'}
                                          onClick={() => { setMaxMoq(opt.id); setIsQtyOpen(false); }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${maxMoq === opt.id ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                          {opt.label}
                                          {maxMoq === opt.id && <FiCheck size={12} className="text-primary-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 md:gap-x-10 gap-y-4">
                        {/* "All" button for the Root Category itself */}
                        <button
                            onClick={() => navigate(`/b2b/grocery/category/${selectedRoot._id}`)}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-md border border-gray-100">
                                {selectedRoot.image ? (
                                    <img src={selectedRoot.image} alt={selectedRoot.name} className="w-full h-full object-cover opacity-50 grayscale" />
                                ) : (
                                    <FiPackage className="text-gray-300 text-2xl" />
                                )}
                            </div>
                            <span className="text-[10px] md:text-xs font-semibold text-gray-700 text-center leading-tight">
                                Shop All {selectedRoot.name}
                            </span>
                        </button>

                        {/* Subcategories */}
                        {selectedRoot.subcategories && selectedRoot.subcategories.map((subCat, index) => (
                            <button
                                key={subCat._id || index}
                                onClick={() => navigate(`/b2b/grocery/category/${selectedRoot._id}?sub=${subCat._id}`)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-md border border-gray-100">
                                    {subCat.image ? (
                                        <img src={subCat.image} alt={subCat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FiPackage className="text-gray-300 text-2xl" />
                                    )}
                                </div>
                                <span className="text-[10px] md:text-xs font-semibold text-gray-700 text-center leading-tight">
                                    {subCat.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                            <h3 className="text-sm md:text-base font-extrabold text-gray-800 capitalize">
                                Recommended in {selectedRoot.name}
                            </h3>
                        </div>
                        {loadingProducts ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="animate-pulse bg-gray-50 rounded-xl aspect-[3/4]"></div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                                {products.map(product => (
                                    <CompactProductCard key={product._id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">No products found</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    {loading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    ) : (
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Select a category</p>
                    )}
                </div>
            )}
        </div>
      </div>

      <div className="lg:hidden">
        <B2BBottomNav />
      </div>

      <style>{`
          .no-scrollbar::-webkit-scrollbar {
              display: none;
          }
          .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
          .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #e5e7eb;
              border-radius: 4px;
          }
      `}</style>
    </div>
  );
};

export default GroceryCatalog;
