import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEye, FiPackage, FiFilter, FiChevronDown, FiX, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import { useB2BCategoryStore } from "../../../../shared/store/b2bCategoryStore";

const B2BVendorProductListings = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Category & Subcategory Filter State
    const { categories, initialize: fetchB2BCategories } = useB2BCategoryStore();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState("");
    
    // Dropdown UI State
    const [isCatOpen, setIsCatOpen] = useState(false);
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [catSearch, setCatSearch] = useState("");
    const [subSearch, setSubSearch] = useState("");
    
    const catRef = useRef(null);
    const subRef = useRef(null);

    useEffect(() => {
        fetchB2BCategories();
        fetchProducts();
    }, []);

    // Re-fetch when category or subcategory changes
    useEffect(() => {
        fetchProducts();
    }, [selectedCategory, selectedSubcategory]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {
                page: 1,
                limit: 100,
            };
            if (selectedCategory) params.category = selectedCategory.name;
            if (selectedSubcategory) params.subcategory = selectedSubcategory;

            const response = await api.get('/admin/b2b-products', { params });

            if (response.success && response.data) {
                setProducts(response.data.products || []);
            }
        } catch (error) {
            console.error('Error fetching B2B products:', error);
            toast.error('Failed to load B2B products');
        } finally {
            setLoading(false);
        }
    };

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (catRef.current && !catRef.current.contains(event.target)) setIsCatOpen(false);
            if (subRef.current && !subRef.current.contains(event.target)) setIsSubOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCategories = useMemo(() => {
        if (!catSearch.trim()) return categories;
        return categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
    }, [categories, catSearch]);

    const filteredSubcategories = useMemo(() => {
        if (!selectedCategory) return [];
        const subs = selectedCategory.subcategories || [];
        if (!subSearch.trim()) return subs;
        return subs.filter(s => {
            const name = typeof s === 'string' ? s : s.name;
            return name.toLowerCase().includes(subSearch.toLowerCase());
        });
    }, [selectedCategory, subSearch]);

    const filterBySearch = (list) => list.filter(p => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchVendor = p.b2bVendor?.toLowerCase().includes(q);
        return matchTitle || matchVendor;
    });

    const statusCell = (val) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{val}</span>
    );

    const actionsCell = (_, row) => (
        <button onClick={() => navigate(`/admin/b2b-vendors/products/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Details">
            <FiEye />
        </button>
    );

    const productColumns = [
        {
            key: "title",
            label: "Product Name",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-sm">
                        <img src={row.image || "/placeholder-product.png"} alt={val} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder-product.png"; }} />
                    </div>
                    <span className="font-bold text-gray-800">{val}</span>
                </div>
            )
        },
        { key: "b2bVendor", label: "B2B Vendor" },
        { key: "category", label: "Category" },
        { key: "price", label: "Price/Base" },
        { key: "moq", label: "MOQ" },
        { key: "status", label: "Status", render: (v) => statusCell(v) },
        { key: "actions", label: "Actions", render: actionsCell }
    ];

    const productListings = filterBySearch(products);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div></div>

                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Category Filter */}
                    <div className="relative" ref={catRef}>
                        <button
                            onClick={() => setIsCatOpen(!isCatOpen)}
                            className={`flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-medium transition-all w-48 ${isCatOpen ? 'border-primary-500 ring-2 ring-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <span className="truncate">{selectedCategory ? selectedCategory.name : "All Categories"}</span>
                            <FiChevronDown className={`transition-transform ${isCatOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                            {isCatOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute z-50 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search categories..."
                                                value={catSearch}
                                                onChange={(e) => setCatSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-primary-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                                        <button
                                            onClick={() => { setSelectedCategory(null); setSelectedSubcategory(""); setIsCatOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            All Categories
                                        </button>
                                        {filteredCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => { setSelectedCategory(cat); setSelectedSubcategory(""); setIsCatOpen(false); setCatSearch(""); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedCategory?.id === cat.id ? 'bg-primary-50 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <span className="truncate">{cat.name}</span>
                                                {selectedCategory?.id === cat.id && <FiCheck className="text-primary-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Subcategory Filter */}
                    <div className="relative" ref={subRef}>
                        <button
                            disabled={!selectedCategory}
                            onClick={() => setIsSubOpen(!isSubOpen)}
                            className={`flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-medium transition-all w-48 disabled:opacity-50 disabled:bg-gray-50 ${isSubOpen ? 'border-primary-500 ring-2 ring-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <span className="truncate">{selectedSubcategory || "All Subcategories"}</span>
                            <FiChevronDown className={`transition-transform ${isSubOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                            {isSubOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute z-50 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search subcategories..."
                                                value={subSearch}
                                                onChange={(e) => setSubSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-primary-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                                        <button
                                            onClick={() => { setSelectedSubcategory(""); setIsSubOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${!selectedSubcategory ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            All Subcategories
                                        </button>
                                        {filteredSubcategories.map((sub, idx) => {
                                            const subName = typeof sub === 'string' ? sub : sub.name;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => { setSelectedSubcategory(subName); setIsSubOpen(false); setSubSearch(""); }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${selectedSubcategory === subName ? 'bg-primary-50 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <span className="truncate">{subName}</span>
                                                    {selectedSubcategory === subName && <FiCheck className="text-primary-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative w-64 lg:w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or vendor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-50"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {productListings.length > 0 && (
                            <div className="mb-0">
                                <DataTable data={productListings} columns={productColumns} pagination={productListings.length > 10} itemsPerPage={10} />
                            </div>
                        )}
                        {productListings.length === 0 && (
                            <div className="text-center py-20 text-gray-400">
                                <FiPackage className="mx-auto text-6xl mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm">No products found</p>
                                <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                                {(selectedCategory || searchQuery) && (
                                    <button 
                                        onClick={() => { setSelectedCategory(null); setSelectedSubcategory(""); setSearchQuery(""); }}
                                        className="mt-4 text-primary-600 font-bold text-xs uppercase tracking-wider hover:underline"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default B2BVendorProductListings;
