import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiSearch, FiPackage, FiArrowLeft, FiFilter } from "react-icons/fi";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";

import CompactProductCard from "../components/CompactProductCard";

const GroceryCatalog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
        let url = `/grocery/products?category=${selectedRootId}&limit=20&sort=${sortBy}`;
        if (debouncedMinPrice) url += `&minPrice=${debouncedMinPrice}`;
        if (debouncedMaxPrice) url += `&maxPrice=${debouncedMaxPrice}`;
        
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
    fetchProducts();
  }, [selectedRootId, sortBy, debouncedMinPrice, debouncedMaxPrice]);

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
                    <h3 className="text-sm md:text-base font-extrabold text-gray-800 mb-4 capitalize">
                        {selectedRoot.name}
                    </h3>
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
                            
                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                                    <FiFilter className="text-gray-400 text-sm" />
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="price_asc">Price: Low to High</option>
                                        <option value="price_desc">Price: High to Low</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                                    <span className="text-xs font-bold text-gray-400">₹</span>
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="w-12 text-xs font-semibold text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
                                    />
                                    <span className="text-xs text-gray-300 font-bold">-</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="w-12 text-xs font-semibold text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
                                    />
                                </div>
                            </div>
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
