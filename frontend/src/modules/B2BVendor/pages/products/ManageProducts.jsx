import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "../../../../shared/utils/toast";
import api from "../../../../shared/utils/api";
import SubscriptionGate from "../../components/SubscriptionGate";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const ManageProducts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });

    // Fetch products from API
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/b2b-vendor/products', {
                params: {
                    page: 1,
                    limit: 100, // Get all products for now
                },
                silent: true
            });

            if (response.success && response.data) {
                // Transform API response to match table format
                const transformedProducts = response.data.products.map(product => {
                    // Extract category from root field or attributes
                    const categoryAttr = product.attributes?.find(attr => attr.name === 'category');
                    const category = product.category || categoryAttr?.value || 'N/A';

                    return {
                        _id: product._id,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        moq: product.minimumOrderQuantity || 1,
                        unit: product.unit || 'Pcs',
                        category: category,
                        visibility: product.isVisible ? 'Visible' : 'Hidden',
                        formType: 'standard',
                        storeName: product.vendorId?.storeName || product.vendorName || null,
                    };
                });
                setProducts(transformedProducts);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const cellImage = (row) => (
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                {row.image ? (
                    <img
                        src={row.image}
                        alt={row.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                    />
                ) : (
                    <FiPackage className="text-gray-400 text-xl" />
                )}
            </div>
            <div className="min-w-0">
                <span className="font-medium text-gray-800 block truncate">{row.name}</span>
            </div>
        </div>
    );

    const shopListingItemCell = (_, row) => {
        const firstItem = row.items?.[0];
        const itemImg = firstItem?.images?.[0];
        const itemName = firstItem?.itemName || firstItem?.name;
        return (
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                    {itemImg ? (
                        <img src={itemImg} alt={itemName} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                    ) : (
                        <FiPackage className="text-gray-400 text-xl" />
                    )}
                </div>
                <div className="min-w-0">
                    <span className="font-medium text-gray-800 block truncate">{itemName || 'Item'}</span>
                    {row.items?.length > 1 && (
                        <span className="text-xs text-gray-500 font-medium block truncate">+{row.items.length - 1} more</span>
                    )}
                </div>
            </div>
        );
    };

    const actionsCell = (_, row) => (
        <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/b2b-vendor/products/edit/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <FiEdit />
            </button>
            <button onClick={() => setDeleteModal({ isOpen: true, productId: row._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <FiTrash2 />
            </button>
        </div>
    );

    const statusCell = (value) => (
        <Badge variant={value === "Visible" ? "success" : "warning"}>
            {value.toUpperCase()}
        </Badge>
    );

    // Product Listing columns – product name, exp price, MOQ
    const productListingColumns = [
        { key: "name", label: "Product Name", sortable: true, render: (v, row) => cellImage(row) },
        { key: "category", label: "Category", sortable: true },
        { key: "price", label: "Exp. Price", sortable: true, render: (v) => `₹${v}` },
        { key: "moq", label: "Min. Order (MOQ)", sortable: true, render: (v, row) => `${v} ${row.unit}` },
        { key: "visibility", label: "Status", render: statusCell },
        { key: "actions", label: "Actions", render: actionsCell },
    ];

    const confirmDelete = async () => {
        try {
            await api.delete(`/b2b-vendor/products/${deleteModal.productId}`);
            toast.success("Product listing removed");
            setDeleteModal({ isOpen: false, productId: null });
            // Refresh products list
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-end gap-6">
                {/* Wrapped with SubscriptionGate to enforce product limits */}
                <SubscriptionGate action="product">
                    <button 
                        onClick={() => navigate("/b2b-vendor/products/add-product")} 
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl whitespace-nowrap"
                    >
                        <FiPlus className="text-lg" /> <span>Add New Listing</span>
                    </button>
                </SubscriptionGate>
            </div>

            <div className="relative">
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-sm text-gray-700"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[2.5rem]" />)}
                    </div>
                ) : (
                    <>
                        {(() => {
                            const filterProducts = (list) => list.filter(p => {
                                const q = searchQuery.toLowerCase().trim();
                                if (!q) return true;
                                const matchName = p.name?.toLowerCase().includes(q);
                                const matchCategory = p.category?.toLowerCase().includes(q);
                                const matchStore = p.storeName?.toLowerCase().includes(q);
                                return matchName || matchCategory || matchStore;
                            });
                            const productListings = filterProducts(products);

                            return (
                                <div className="space-y-8">
                                    {productListings.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {productListings.map((product) => (
                                                <motion.div
                                                    key={product._id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
                                                >
                                                    <div className="relative h-48 overflow-hidden bg-slate-50">
                                                        {product.image ? (
                                                            <img 
                                                                src={product.image} 
                                                                alt={product.name} 
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                <FiPackage size={48} />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-4 left-4">
                                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black uppercase rounded-lg shadow-sm border border-gray-100">
                                                                {product.category}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <h3 className="text-lg font-black text-slate-800 mb-2 truncate leading-tight">{product.name}</h3>
                                                        <div className="mb-4">
                                                            <RatingSummaryBadge targetType="product" targetId={product._id} />
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl mb-6">
                                                            <div className="text-center">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Price</p>
                                                                <p className="text-xs font-black text-slate-700">₹{product.price}</p>
                                                            </div>
                                                            <div className="text-center border-l border-slate-200">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">MOQ</p>
                                                                <p className="text-xs font-black text-slate-700">{product.moq} {product.unit}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${product.visibility === 'Visible' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {product.visibility}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => navigate(`/b2b-vendor/products/edit/${product._id}`)} 
                                                                    className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                                >
                                                                    <FiEdit size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setDeleteModal({ isOpen: true, productId: product._id })} 
                                                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                                >
                                                                    <FiTrash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                                            <FiPackage size={48} className="mx-auto text-gray-200 mb-4" />
                                            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">No listings found</h3>
                                            <p className="text-sm text-gray-400">Try adjusting your search or add a new listing.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </>
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

export default ManageProducts;
