import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiArrowLeft, FiPackage, FiFilter, FiChevronDown, FiCheck } from "react-icons/fi";
import B2BHeader from "../components/Layout/B2BHeader";
import B2BBottomNav from "../components/Layout/B2BBottomNav";
import api from "../../../shared/utils/api";
import { useCartStore } from "../../../shared/store/cartStore";
import toast from "react-hot-toast";
import CompactProductCard from "../components/CompactProductCard";

const B2BGroceryCategoryView = () => {

  const { id } = useParams(); // root category ID
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rootCategory, setRootCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [sortOption, setSortOption] = useState('newest');
  const [maxMoq, setMaxMoq] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedWeights, setSelectedWeights] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({ brands: [], weights: [] });

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isQtyOpen, setIsQtyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const observer = useRef();
  
  const lastProductElementRef = useCallback(node => {
    if (loadingProducts || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingProducts, loadingMore, hasMore]);

  // Fetch category tree and find the current root category
  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const res = await api.get('/grocery/categories');
        if (res.success && res.data) {
          const tree = res.data;
          const currentRoot = tree.find(c => c._id === id);
          if (currentRoot) {
            setRootCategory(currentRoot);
            
            // Add a "Shop All" item to subcategories
            const allSubcats = [{ _id: currentRoot._id, name: 'Shop All', image: currentRoot.image, isRoot: true }, ...(currentRoot.subcategories || [])];
            setSubcategories(allSubcats);
            
            const subParam = searchParams.get('sub');
            if (subParam) {
              const matchedSub = allSubcats.find(s => s._id === subParam);
              setSelectedSub(matchedSub || allSubcats[0]);
            } else {
              setSelectedSub(allSubcats[0]);
            }
          } else {
            toast.error("Category not found");
            navigate('/b2b/grocery');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, [id, navigate]);

  // Fetch products when selected subcategory changes or page changes
  const fetchProducts = async (pageNum, isNew = false) => {
    if (!selectedSub) return;
    try {
      if (isNew) setLoadingProducts(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('limit', 12);
      
      if (selectedSub.isRoot || selectedSub._id === rootCategory._id) {
        params.append('category', selectedSub._id);
      } else {
        params.append('subcategory', selectedSub._id);
      }

      if (sortOption) params.append('sort', sortOption);
      if (maxMoq) params.append('maxMoq', maxMoq);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);
      if (selectedBrands.length > 0) params.append('brands', selectedBrands.join(','));
      if (selectedWeights.length > 0) params.append('weights', selectedWeights.join(','));

      const res = await api.get(`/grocery/products?${params.toString()}`);
      if (res.success) {
        const newProducts = res.data.products || res.data || [];
        if (isNew) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }
        setHasMore(newProducts.length === 12);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProducts(false);
      setLoadingMore(false);
    }
  };

  const fetchFilters = async () => {
    if (!selectedSub) return;
    try {
      const params = new URLSearchParams();
      if (selectedSub.isRoot || selectedSub._id === rootCategory._id) {
        params.append('category', selectedSub._id);
      } else {
        params.append('subcategory', selectedSub._id);
      }
      const res = await api.get(`/grocery/products/filters?${params.toString()}`);
      if (res.success) {
        setAvailableFilters(res.data || { brands: [], weights: [] });
      }
    } catch (error) {
      console.error("Error fetching filters", error);
    }
  };

  useEffect(() => {
    if (selectedSub) {
      setPage(1);
      fetchProducts(1, true);
      fetchFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSub, sortOption, maxMoq, priceRange, selectedBrands, selectedWeights]);

  useEffect(() => {
    if (page > 1 && selectedSub) {
      fetchProducts(page, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (loading) {
    return (
      <div className="bg-[#f4f6f9] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans overflow-hidden h-screen">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/b2b/grocery')} className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-700">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="font-black text-gray-900 text-lg flex-1 truncate">{rootCategory?.name}</h1>
        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 flex-1 max-w-[200px]">
          <FiSearch className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search..."
            className="bg-transparent border-none outline-none w-full text-sm font-medium" 
            onClick={() => navigate('/b2b/grocery')}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Subcategories) */}
        <div className="w-[85px] md:w-32 bg-[#f4f6f9] overflow-y-auto no-scrollbar border-r border-gray-100 flex flex-col shrink-0">
          {subcategories.map((sub) => {
            const isSelected = selectedSub?._id === sub._id;
            return (
              <button
                key={sub._id}
                onClick={() => setSelectedSub(sub)}
                className={`flex flex-col items-center justify-center p-3 md:p-4 border-l-4 transition-all ${
                  isSelected 
                    ? 'border-primary-600 bg-white shadow-sm z-10' 
                    : 'border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gray-50 flex items-center justify-center mb-1 overflow-hidden">
                   {sub.image ? (
                     <img src={sub.image} alt={sub.name} className={`w-full h-full object-cover mix-blend-multiply ${sub.isRoot ? 'opacity-50 grayscale' : ''}`} />
                   ) : (
                     <FiPackage className="text-gray-400" />
                   )}
                </div>
                <span className={`text-[10px] md:text-xs text-center leading-tight ${isSelected ? 'font-black text-gray-900' : 'font-medium text-gray-500'}`}>
                  {sub.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Content Pane (Products) */}
        <div className="flex-1 bg-white overflow-y-auto p-3 lg:p-6 no-scrollbar relative">
           <div className="flex justify-between items-center mb-4 sticky top-0 bg-white/90 backdrop-blur z-20 pb-2 border-b border-gray-50">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate mr-2">{selectedSub?.name}</h2>
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
                          className="absolute top-full left-0 md:right-0 md:left-auto mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 max-h-[70vh] overflow-y-auto custom-scrollbar"
                        >
                          {/* Price Range */}
                          <div className="mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Price Range (₹)</h4>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <input 
                                type="number" 
                                placeholder="Min" 
                                value={priceRange.min}
                                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-primary-300"
                              />
                              <input 
                                type="number" 
                                placeholder="Max" 
                                value={priceRange.max}
                                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
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
                             <button onClick={() => { setPriceRange({ min: '', max: '' }); setSelectedBrands([]); setSelectedWeights([]); setIsFilterOpen(false); }} className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-200">Clear</button>
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
                              { id: 'price_asc', label: 'Price (low to high)' },
                              { id: 'price_desc', label: 'Price (high to low)' },
                              { id: 'rating_desc', label: 'Rating (high to low)' },
                              { id: 'discount_desc', label: 'Discount (high to low)' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => { setSortOption(opt.id); setIsSortOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${sortOption === opt.id ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
                              >
                                {opt.label}
                                {sortOption === opt.id && <FiCheck size={12} className="text-primary-600" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 {/* Quantity Dropdown */}
                 <div className="relative">
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
           
           {loadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                 {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-50 rounded-xl aspect-[3/4]"></div>
                 ))}
              </div>
           ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-24">
                 {products.map((product, index) => {
                    if (products.length === index + 1) {
                      return <div ref={lastProductElementRef} key={product._id}><CompactProductCard product={product} /></div>
                    } else {
                      return <CompactProductCard key={product._id} product={product} />
                    }
                 })}
                 {loadingMore && (
                    <div className="col-span-full flex justify-center py-4">
                       <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                 )}
              </div>
           ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                 <FiPackage size={48} className="text-gray-200 mb-4" />
                 <h3 className="text-lg font-black text-gray-900 mb-1">NO PRODUCTS FOUND</h3>
                 <p className="text-sm text-gray-500">We're stocking up soon!</p>
              </div>
           )}
        </div>
      </div>
      
      {/* Mobile Nav overlay if needed (optional) */}
      <div className="lg:hidden absolute bottom-0 w-full z-50">
        <B2BBottomNav />
      </div>
    </div>
  );
};

export default B2BGroceryCategoryView;
