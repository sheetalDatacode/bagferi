import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiPackage, FiDollarSign, FiUser, FiCalendar, FiTag, FiShoppingBag } from "react-icons/fi";
import { motion } from "framer-motion";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const AdminB2BProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/b2b-products/${id}`);
            if (response.success) {
                setProduct(response.data.product);
            }
        } catch (error) {
            console.error('Error fetching Product:', error);
            toast.error('Failed to load details');
            navigate('/admin/b2b-vendors/products');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (approved) => {
        try {
            const response = await api.patch(`/admin/b2b-products/${id}/status`, {
                status: approved ? 'approved' : 'rejected'
            });
            if (response.success) {
                toast.success(`Product ${approved ? 'approved' : 'rejected'} successfully`);
                setProduct({ ...product, isVisible: approved });
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!product) return null;

    const displayImages = [product.image, ...(product.images || [])].filter(Boolean);
    const mainImage = displayImages[0];
    const galleryImages = displayImages.slice(1);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                    onClick={() => navigate('/admin/b2b-vendors/products')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                    <FiArrowLeft /> Back to Product Listings
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${product.isVisible ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                        {product.isVisible ? 'Approved' : 'Pending Approval'}
                    </span>
                    {!product.isVisible && (
                        <button
                            onClick={() => toggleStatus(true)}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-full text-xs font-black uppercase tracking-wider hover:bg-green-700 transition-all shadow-md active:scale-95"
                        >
                            Approve Now
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Images */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 overflow-hidden group">
                        {mainImage ? (
                            <img
                                src={mainImage}
                                alt={product.name}
                                className="w-full h-auto rounded-2xl object-cover aspect-square shadow-inner transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => { e.target.src = "/placeholder-product.png"; }}
                            />
                        ) : (
                            <div className="w-full h-64 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                                <FiShoppingBag size={64} />
                            </div>
                        )}
                    </div>
                    {galleryImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {galleryImages.map((img, idx) => (
                                <div key={idx} className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                    <img src={img} alt="" className="w-full h-20 object-cover rounded-lg" onError={(e) => { e.target.src = "/placeholder-product.png"; }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <FiPackage size={120} />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded">{product.brandName || 'Brand Not specified'}</span>
                                </div>
                                <h1 className="lg:hidden text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</h1>
                                <div className="mb-2">
                                    <RatingSummaryBadge targetType="product" targetId={product._id} />
                                </div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <FiTag /> SKU: {product.sku || 'N/A'}
                                </p>
                            </div>
                            <div className="text-left md:text-right bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-2xl">
                                <p className="text-3xl font-black text-primary-600">₹{product.price}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">per {product.unit || 'Unit'}</p>
                            </div>
                        </div>

                        {(
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${product.stock === 'in_stock' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                        <p className="font-bold text-gray-900 text-sm uppercase tracking-tighter">{product.stock?.replace('_', ' ') || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inventory Qty</p>
                                    <p className="font-bold text-gray-900 text-lg">{product.stockQuantity || 0} <span className="text-xs font-medium text-gray-400">{product.unit || 'Items'}</span></p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Min. Order Qty</p>
                                    <p className="font-bold text-gray-900 text-lg">{product.minimumOrderQuantity || 1} <span className="text-xs font-medium text-gray-400">{product.unit || 'Items'}</span></p>
                                </div>
                            </div>
                        )}

                        {/* Attributes (product) */}
                        {product.attributes && product.attributes.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">Technical Specifications</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    {product.attributes.map((attr, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-50/50">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{attr.name || attr.attributeName}</span>
                                            <span className="text-xs font-black text-gray-900 uppercase">
                                                {Array.isArray(attr.value) ? attr.value.join(', ') : (typeof attr.value === 'object' ? JSON.stringify(attr.value) : String(attr.value))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-10">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Product Description</h3>
                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-50">
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                    {product.description || 'No detailed description provided by the vendor.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest leading-none">
                            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                                <FiUser size={16} />
                            </div>
                            Vendor Information
                        </h3>
                        {product.vendorId ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Business Store</span>
                                        <span className="font-bold text-gray-900">{product.vendorId.storeName}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Contact</span>
                                        <span className="font-bold text-gray-900">{product.vendorId.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered Email</span>
                                        <span className="font-bold text-gray-900 text-sm truncate">{product.vendorId.email}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</span>
                                        <span className="inline-flex items-center w-fit px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded">
                                            {product.vendorId.vendorType} Vendor
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <FiShoppingBag className="text-gray-300 mb-2" size={32} />
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Vendor data unlinked or removed</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminB2BProductDetail;
