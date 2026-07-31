import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiHeart, FiShoppingCart, FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import B2BProductCard from '../components/B2BProductCard';
import api from '../../../shared/utils/api';

const B2BCategories = () => {
    const navigate = useNavigate();
    const { categories: rootCategories, initialize, isLoading } = useB2BCategoryStore();
    const [searchParams] = useSearchParams();
    const [selectedRootId, setSelectedRootId] = useState(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!selectedRootId) return;
            setLoadingProducts(true);
            try {
                const params = {
                    categoryId: selectedRootId,
                    limit: 40,
                    vendorType: 'b2b',
                    itemType: 'product'
                };
                if (selectedSubcategory) {
                    params.subcategoryId = selectedSubcategory._id || selectedSubcategory.id;
                }
                const res = await api.get('/products', { params, silent: true });
                if (res.success) {
                    const list = Array.isArray(res.data) ? res.data : (res.data.products || []);
                    setProducts(list);
                }
            } catch (err) {
                console.error("Error fetching products in categories view:", err);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [selectedRootId, selectedSubcategory]);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        setSelectedSubcategory(null); // Reset subcategory when root changes
    }, [selectedRootId]);

    useEffect(() => {
        if (rootCategories && rootCategories.length > 0 && !selectedRootId) {
            const catQuery = searchParams.get('category');
            if (catQuery) {
                const found = rootCategories.find(c => c.id === catQuery || c._id === catQuery || c.name.toLowerCase() === catQuery.toLowerCase());
                if (found) {
                    setSelectedRootId(found.id || found._id);
                    return;
                }
            }
            setSelectedRootId(rootCategories[0].id || rootCategories[0]._id);
        }
    }, [rootCategories, selectedRootId, searchParams]);

    const selectedRoot = rootCategories?.find(cat => cat.id === selectedRootId) || null;

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-8 pb-3 md:py-4 bg-white border-b border-gray-100 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1">
                        <FiArrowLeft className="text-xl text-gray-700" />
                    </button>
                    <h1 className="text-sm font-bold text-gray-800 tracking-wide">CATEGORIES</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-gray-600 hover:text-primary-600 transition-colors">
                        <FiSearch className="text-xl" />
                    </button>
                    <button className="text-gray-600 hover:text-primary-600 transition-colors">
                        <FiHeart className="text-xl" />
                    </button>
                    <button className="text-gray-600 hover:text-primary-600 transition-colors relative">
                        <FiShoppingCart className="text-xl" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden pb-16 lg:pb-0">
                {/* Left Sidebar - Root Categories */}
                <div className="w-[85px] md:w-32 bg-white flex flex-col overflow-y-auto no-scrollbar shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-0 border-r border-gray-100">
                    {isLoading && rootCategories.length === 0 ? (
                        <div className="flex justify-center p-4">
                            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        rootCategories?.map((cat) => {
                            const isSelected = selectedRootId === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedRootId(cat.id)}
                                    className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 transition-all relative
                                        ${isSelected ? 'bg-purple-50/50 border-l-4 border-purple-600' : 'border-l-4 border-transparent hover:bg-gray-50'}`}
                                >
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center
                                        ${isSelected ? 'ring-2 ring-purple-100 shadow-sm' : 'bg-gray-100'}`}>
                                        {cat.image ? (
                                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] md:text-[11px] font-bold text-center leading-tight
                                        ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Right Content - Subcategories & Sub-subcategories */}
                <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-4 md:p-6">
                    {selectedRoot ? (
                        <div className="space-y-6">
                            {!selectedSubcategory ? (
                                // Render Level 2 (Subcategories) Grid
                                <div>
                                    <h3 className="text-sm md:text-base font-extrabold text-gray-800 mb-4 capitalize">
                                        All {selectedRoot.name} Categories
                                    </h3>
                                    {selectedRoot.subcategories && selectedRoot.subcategories.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-4">
                                            {selectedRoot.subcategories.map((subCat, index) => (
                                                <button
                                                    key={subCat._id || subCat.id || index}
                                                    onClick={() => {
                                                        if (subCat.subcategories && subCat.subcategories.length > 0) {
                                                            setSelectedSubcategory(subCat);
                                                        } else {
                                                            navigate('/b2b/catalog', { state: { category: selectedRoot.name, subcategory: subCat.name } });
                                                        }
                                                    }}
                                                    className="flex flex-col items-center gap-2 group"
                                                >
                                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-md border border-gray-100">
                                                        {subCat.image ? (
                                                            <img src={subCat.image} alt={subCat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-100" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] md:text-xs font-semibold text-gray-700 text-center leading-tight">
                                                        {subCat.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">No subcategories found</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Render Level 3 (Sub-subcategories) Grid
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <button 
                                            onClick={() => setSelectedSubcategory(null)}
                                            className="p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            <FiArrowLeft className="text-gray-600" size={16} />
                                        </button>
                                        <h3 className="text-sm md:text-base font-extrabold text-gray-800 capitalize">
                                            {selectedSubcategory.name}
                                        </h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-4">
                                        {/* "All" button for the Level 2 Category itself */}
                                        <button
                                            onClick={() => navigate('/b2b/catalog', { state: { category: selectedRoot.name, subcategory: selectedSubcategory.name } })}
                                            className="flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-md border border-gray-100">
                                                {selectedSubcategory.image ? (
                                                    <img src={selectedSubcategory.image} alt={selectedSubcategory.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100" />
                                                )}
                                            </div>
                                            <span className="text-[10px] md:text-xs font-semibold text-gray-700 text-center leading-tight">
                                                All {selectedSubcategory.name}
                                            </span>
                                        </button>

                                        {selectedSubcategory.subcategories.map((subSubCat, index) => (
                                            <button
                                                key={subSubCat._id || subSubCat.id || index}
                                                onClick={() => navigate('/b2b/catalog', { state: { category: selectedRoot.name, subcategory: selectedSubcategory.name, subsubcategory: subSubCat.name } })}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-md border border-gray-100">
                                                    {subSubCat.image ? (
                                                        <img src={subSubCat.image} alt={subSubCat.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-100" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] md:text-xs font-semibold text-gray-700 text-center leading-tight">
                                                    {subSubCat.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Products Section */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="text-sm md:text-base font-extrabold text-gray-800 mb-4 uppercase tracking-wider">
                                    Products in {selectedSubcategory ? selectedSubcategory.name : selectedRoot.name}
                                </h3>
                                {loadingProducts ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : products.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-wider text-xs">
                                        No products found in this category
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {products.map((product) => (
                                            <B2BProductCard
                                                key={product._id}
                                                product={product}
                                                viewMode="grid"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Select a category</p>
                        </div>
                    )}
                </div>
            </div>
            
            <B2BBottomNav />
            
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

export default B2BCategories;
