import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiArrowLeft, FiShoppingCart, FiMinus, FiPlus, 
    FiHeart, FiShare2, FiStar, FiPackage, FiTruck, FiShield,
    FiCheckCircle, FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/store/authStore';
import { useCartStore } from '../../../shared/store/cartStore';

const GroceryProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { addToCart } = useCartStore();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const fetchProductDetails = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/grocery/products/${id}`);
                if (res.success) {
                    setProduct(res.data);
                    if (res.data.stock > 0) {
                        setQuantity(1);
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load product details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProductDetails();
        }
    }, [id]);

    const handleQuantityChange = (type) => {
        if (type === 'inc' && quantity < product?.stock) {
            setQuantity(prev => prev + 1);
        } else if (type === 'dec' && quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: `/b2b/grocery/product/${id}` } } });
            return;
        }

        try {
            setAddingToCart(true);
            const res = await api.post('/cart/add', {
                productId: id,
                quantity: quantity,
                module: 'grocery'
            });
            if (res.success) {
                toast.success('Added to cart successfully');
                useCartStore.getState().fetchCart();
            } else {
                toast.error(res.message || 'Failed to add to cart');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error(error.response?.data?.message || 'Failed to add to cart');
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-50 min-h-screen">
                <B2BHeader />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="bg-gray-50 min-h-screen">
                <B2BHeader />
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <FiPackage className="text-6xl text-gray-300 mb-4" />
                    <h2 className="text-2xl font-black text-gray-900">Product Not Found</h2>
                    <button onClick={() => navigate('/b2b/grocery')} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg font-bold">
                        Back to Catalog
                    </button>
                </div>
            </div>
        );
    }

    const images = product.media && product.media.length > 0 ? product.media.map(m => m.url) : (product.image ? [product.image] : []);

    return (
        <div className="bg-gray-50 min-h-screen pb-24 lg:pb-0 font-sans">
            <B2BHeader hideSearch />
            
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
                        <FiArrowLeft className="text-gray-700" />
                    </button>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Back</span>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                        {/* Image Gallery */}
                        <div className="w-full lg:w-1/2 p-6 lg:p-8 lg:border-r border-gray-100">
                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-4">
                                {images.length > 0 ? (
                                    <img src={images[activeImageIndex]} alt={product.title} className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <FiPackage size={80} />
                                    </div>
                                )}
                            </div>
                            
                            {images.length > 1 && (
                                <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                                    {images.map((img, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveImageIndex(idx)}
                                            className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${activeImageIndex === idx ? 'border-primary-600' : 'border-transparent'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col">
                            <div className="mb-2">
                                <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                    {product.category?.name} {product.subcategory?.name && `> ${product.subcategory.name}`}
                                </span>
                            </div>
                            
                            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                                {product.title}
                            </h1>
                            
                            {product.brand && (
                                <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-4">Brand: <span className="text-gray-800">{product.brand}</span></p>
                            )}
                            
                            <div className="flex items-end gap-3 mb-6">
                                <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{product.price}</span>
                                <span className="text-lg text-gray-500 font-bold mb-1">/ {product.unit || 'kg'}</span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-gray-600 leading-relaxed text-sm">
                                    {product.description}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-8 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-700">Availability</span>
                                    {product.stock > 0 ? (
                                        <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full"><FiCheckCircle /> In Stock ({product.stock})</span>
                                    ) : (
                                        <span className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1 rounded-full">Out of Stock</span>
                                    )}
                                </div>
                                {product.weight && (
                                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                                        <span className="text-sm font-bold text-gray-700">Weight/Size per Unit</span>
                                        <span className="font-black text-gray-900">{product.weight} {product.unit}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-auto space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                                        <button 
                                            onClick={() => handleQuantityChange('dec')}
                                            disabled={quantity <= 1}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 font-bold shadow-sm disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-95"
                                        >
                                            <FiMinus />
                                        </button>
                                        <input 
                                            type="number" 
                                            value={quantity}
                                            readOnly
                                            className="w-12 h-10 bg-transparent text-center font-black text-gray-900 outline-none"
                                        />
                                        <button 
                                            onClick={() => handleQuantityChange('inc')}
                                            disabled={quantity >= product.stock}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 font-bold shadow-sm disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-95"
                                        >
                                            <FiPlus />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleAddToCart}
                                        disabled={addingToCart || product.stock === 0}
                                        className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white h-12 rounded-xl font-black uppercase tracking-wider hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                                    >
                                        {addingToCart ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <><FiShoppingCart size={18} /> Add to Cart</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:hidden">
                <B2BBottomNav />
            </div>
        </div>
    );
};

export default GroceryProductDetail;
