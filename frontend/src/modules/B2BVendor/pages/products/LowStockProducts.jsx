import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPackage, FiCheck } from "react-icons/fi";
import { motion } from "framer-motion";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "../../../../shared/utils/toast";
import api from "../../../../shared/utils/api";

const LowStockProducts = () => {
    const navigate = useNavigate();
    const [hasShop, setHasShop] = useState(true);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("fashion");
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    const [fashionProducts, setFashionProducts] = useState([]);
    const [groceryProducts, setGroceryProducts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
    const [editingStock, setEditingStock] = useState({});
    const [updatingStockId, setUpdatingStockId] = useState(null);

    const handleUpdateStock = async (productId, newQty) => {
        if (newQty === '') return;
        setUpdatingStockId(productId);
        try {
            if (activeTab === "grocery") {
                await api.put(`/grocery/vendor/products/${productId}`, {
                    stockQuantity: Number(newQty)
                });
            } else {
                await api.put(`/b2b-vendor/products/${productId}`, {
                    stockQuantity: Number(newQty),
                    availability: Number(newQty) > 0 ? "In Stock" : "Out of Stock"
                });
            }
            toast.success("Stock quantity updated");
            
            // Clear editing state for this product
            setEditingStock(prev => {
                const copy = { ...prev };
                delete copy[productId];
                return copy;
            });

            // Refresh product lists
            if (activeTab === "grocery") {
                fetchGroceryProducts();
            } else {
                fetchFashionProducts();
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            toast.error('Failed to update stock');
        } finally {
            setUpdatingStockId(null);
        }
    };

    // Fetch products from API after checking if a shop exists
    const checkShopAndFetch = async () => {
        try {
            setLoading(true);
            const shopRes = await api.get('/b2b-vendor/shop-units');
            if (!shopRes.success || !shopRes.data) {
                setHasShop(false);
                setLoading(false);
                return;
            }
            setHasShop(true);
            await Promise.all([fetchFashionProducts(), fetchGroceryProducts()]);
        } catch (error) {
            console.error(error);
            setHasShop(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkShopAndFetch();
    }, []);

    const fetchFashionProducts = async () => {
        try {
            const response = await api.get('/b2b-vendor/products', {
                params: {
                    page: 1,
                    limit: 100,
                },
                silent: true
            });

            if (response.success && response.data) {
                const transformed = response.data.products.map(product => {
                    const categoryAttr = product.attributes?.find(attr => attr.name === 'category');
                    const category = product.category || categoryAttr?.value || 'N/A';

                    let productImg = product.image;
                    if (!productImg && Array.isArray(product.images) && product.images.length > 0) {
                        productImg = product.images[0];
                    }
                    if (!productImg && Array.isArray(product.variants)) {
                        const firstVariantWithImg = product.variants.find(v => v.imageUrl || (Array.isArray(v.images) && v.images.length > 0));
                        if (firstVariantWithImg) {
                            productImg = firstVariantWithImg.imageUrl || firstVariantWithImg.images[0];
                        }
                    }

                    return {
                        _id: product._id,
                        name: product.name,
                        image: productImg,
                        price: product.price,
                        moq: product.minimumOrderQuantity || 1,
                        unit: product.unit || 'Pcs',
                        category: category,
                        visibility: product.isVisible ? 'Visible' : 'Hidden',
                        stockQuantity: product.stockQuantity,
                    };
                });
                setFashionProducts(transformed);
            }
        } catch (error) {
            console.error('Error fetching fashion products:', error);
        }
    };

    const fetchGroceryProducts = async () => {
        try {
            const response = await api.get('/grocery/vendor/products', {
                silent: true
            });

            if (response.success && response.data) {
                const transformed = response.data.map(product => {
                    return {
                        _id: product._id,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        moq: product.minimumOrderQuantity || 1,
                        unit: product.unit || 'Pcs',
                        category: product.category?.name || 'Grocery',
                        visibility: product.isVisible ? 'Visible' : 'Hidden',
                        stockQuantity: product.stockQuantity,
                    };
                });
                setGroceryProducts(transformed);
            }
        } catch (error) {
            console.error('Error fetching grocery products:', error);
        }
    };

    const confirmDelete = async () => {
        try {
            if (activeTab === "grocery") {
                await api.delete(`/grocery/vendor/products/${deleteModal.productId}`);
            } else {
                await api.delete(`/b2b-vendor/products/${deleteModal.productId}`);
            }
            toast.success("Product listing removed");
            setDeleteModal({ isOpen: false, productId: null });
            if (activeTab === "grocery") {
                fetchGroceryProducts();
            } else {
                fetchFashionProducts();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        }
    };

    if (!loading && !hasShop) {
        return (
            <div className="max-w-4xl mx-auto p-6 md:p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Shop Listing Required</h3>
                <p className="text-gray-500 mb-8 max-w-md font-medium text-sm leading-relaxed">
                    You haven't listed your shop yet. You must complete your shop profile and list your shop before managing or adding products to your catalog.
                </p>
                <button
                    onClick={() => navigate('/b2b-vendor/shop-listing')}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shadow-primary-200"
                >
                    Set Up Your Shop Now
                </button>
            </div>
        );
    }

    const currentProducts = activeTab === "grocery" ? groceryProducts : fashionProducts;

    const filteredProducts = currentProducts.filter(p => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
        const matchesLowStock = !onlyLowStock || (p.stockQuantity ?? 0) <= 10;
        return matchesSearch && matchesLowStock;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Stock Availability</h1>
                    <p className="text-gray-500">Monitor inventory counts and track items reaching critical stock levels.</p>
                </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-gray-155">
                <button
                    onClick={() => setActiveTab("fashion")}
                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
                        activeTab === "fashion"
                            ? "border-primary-600 text-primary-600 font-extrabold"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    Fashion ({fashionProducts.length})
                </button>
                <button
                    onClick={() => setActiveTab("grocery")}
                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
                        activeTab === "grocery"
                            ? "border-primary-600 text-primary-600 font-extrabold"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    Grocery ({groceryProducts.length})
                </button>
            </div>

            <div className="relative">
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by product name or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-all font-bold text-sm text-gray-700"
                        />
                    </div>
                    
                    {/* Low Stock Only Filter */}
                    <div className="flex items-center gap-2 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={onlyLowStock} 
                                onChange={(e) => setOnlyLowStock(e.target.checked)}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            <span className="ml-2 text-sm font-black uppercase text-gray-700 tracking-wider">Show Low Stock Only</span>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl" />)}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {filteredProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Product</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Category</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">MOQ</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Stock Qty</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) => (
                                            <tr key={product._id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center text-gray-400">
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FiPackage size={18} />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-800 truncate max-w-[200px]" title={product.name}>
                                                        {product.name}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-semibold text-slate-500">
                                                    {product.category}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-primary-600">
                                                    ₹{product.price}
                                                </td>
                                                <td className="p-4 text-sm font-semibold text-slate-600">
                                                    {product.moq} {product.unit}
                                                </td>
                                                 <td className="p-4">
                                                     <div className="flex items-center gap-1.5">
                                                         <input
                                                             type="number"
                                                             value={editingStock[product._id] !== undefined ? editingStock[product._id] : (product.stockQuantity ?? 0)}
                                                             onChange={(e) => {
                                                                 const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                                                 setEditingStock(prev => ({ ...prev, [product._id]: val }));
                                                             }}
                                                             onBlur={() => {
                                                                 const val = editingStock[product._id];
                                                                 if (val !== undefined && val !== '' && val !== product.stockQuantity) {
                                                                     handleUpdateStock(product._id, val);
                                                                 }
                                                             }}
                                                             onKeyDown={(e) => {
                                                                 const val = editingStock[product._id];
                                                                 if (e.key === 'Enter' && val !== undefined && val !== '' && val !== product.stockQuantity) {
                                                                     handleUpdateStock(product._id, val);
                                                                 }
                                                             }}
                                                             className="w-20 px-2 py-1 text-center font-extrabold text-slate-800 border border-gray-200 rounded-lg outline-none focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
                                                         />
                                                         {editingStock[product._id] !== undefined && editingStock[product._id] !== product.stockQuantity && (
                                                             <button
                                                                 onClick={() => handleUpdateStock(product._id, editingStock[product._id])}
                                                                 disabled={updatingStockId === product._id || editingStock[product._id] === ''}
                                                                 className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors shrink-0"
                                                                 title="Save Stock"
                                                             >
                                                                 {updatingStockId === product._id ? (
                                                                     <div className="w-3.5 h-3.5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                                                                 ) : (
                                                                     <FiCheck size={14} className="stroke-[3]" />
                                                                 )}
                                                             </button>
                                                         )}
                                                     </div>
                                                 </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                                                        (product.stockQuantity ?? 0) === 0 
                                                            ? 'bg-red-50 text-red-600 border-red-100' 
                                                            : (product.stockQuantity ?? 0) <= 10 
                                                                ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                                                : 'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                        {(product.stockQuantity ?? 0) === 0 
                                                            ? 'Out of Stock' 
                                                            : (product.stockQuantity ?? 0) <= 10 
                                                                ? 'Low Stock' 
                                                                : 'In Stock'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button 
                                                            onClick={() => {
                                                                const editRoute = activeTab === "grocery" 
                                                                    ? `/b2b-vendor/grocery-products/edit/${product._id}` 
                                                                    : `/b2b-vendor/products/edit/${product._id}`;
                                                                navigate(editRoute);
                                                            }} 
                                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                            title="Edit Product"
                                                        >
                                                            <FiEdit size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeleteModal({ isOpen: true, productId: product._id })} 
                                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                                            title="Delete Product"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-2xl m-4 bg-white">
                                <FiPackage size={48} className="mx-auto text-gray-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">No listings found</h3>
                                <p className="text-sm text-gray-400 font-semibold">You don't have any products matching the current filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, productId: null })}
                onConfirm={confirmDelete}
                title="Remove Listing?"
                message="Are you sure you want to remove this product from your B2B catalog?"
                type="danger"
            />
        </motion.div>
    );
};

export default LowStockProducts;
