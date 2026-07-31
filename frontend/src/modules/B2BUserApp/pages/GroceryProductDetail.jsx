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
import { getRatingSummary, getUserRating, submitRating } from '../../../shared/services/ratingService';
import StarRating from '../../../shared/components/StarRating';

const GroceryProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { addToCart } = useCartStore();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'product' });
    const [userRating, setUserRating] = useState(null);
    const [draftRating, setDraftRating] = useState(0);
    const [draftComment, setDraftComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [productReviews, setProductReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('details');

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
                    if (res.data.sizes && res.data.sizes.length > 0) setSelectedSize(res.data.sizes[0]);
                    if (res.data.colors && res.data.colors.length > 0) setSelectedColor(res.data.colors[0]);
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load product details');
            } finally {
                setLoading(false);
            }
        };

        const fetchRatings = async () => {
            if (id) {
                const summary = await getRatingSummary('product', id);
                if (summary) setRatingSummary({ ...summary, type: 'product' });
                
                if (isAuthenticated && user?._id) {
                    const userR = await getUserRating('product', id, user._id);
                    if (userR) {
                        setUserRating(userR);
                        setDraftRating(userR.rating || 0);
                        setDraftComment(userR.review || '');
                    }
                }
                
                const revRes = await api.get('/rating/list', { params: { targetType: 'product', targetId: id } });
                if (revRes.success && revRes.data) {
                    setProductReviews(revRes.data);
                }
            }
        };

        if (id) {
            fetchProductDetails();
            fetchRatings();
        }
    }, [id, isAuthenticated, user]);

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please login to submit a rating');
            return;
        }
        if (draftRating === 0) {
            toast.error('Please select a rating before submitting');
            return;
        }

        setIsSubmittingRating(true);
        try {
            const res = await submitRating({
                targetType: 'product',
                targetId: id,
                vendorId: product.vendorId?._id || product.vendorId,
                rating: draftRating,
                review: draftComment
            });

            if (res) {
                const summary = await getRatingSummary('product', id);
                if (summary) setRatingSummary({ ...summary, type: 'product' });
                const revRes = await api.get('/rating/list', { params: { targetType: 'product', targetId: id } });
                if (revRes.success && revRes.data) setProductReviews(revRes.data);
                toast.success('Review submitted successfully!');
            }
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const handleQuantityChange = (type) => {
        if (type === 'inc' && quantity < (product?.stockQuantity || 999)) {
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
                                {product.name}
                            </h1>

                            {/* Rating Summary */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center gap-1">
                                    <StarRating rating={ratingSummary.averageRating} size={14} />
                                    <span className="text-sm font-bold text-gray-900 ml-1">{ratingSummary.averageRating.toFixed(1)}</span>
                                </div>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-500 font-medium">({ratingSummary.ratingCount} reviews)</span>
                            </div>
                            
                            {(product.brandName || product.brand) && (
                                <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-4">Brand: <span className="text-gray-800">{product.brandName || product.brand}</span></p>
                            )}
                            
                            <div className="flex items-end gap-3 mb-6">
                                <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{product.price}</span>
                                {product.mrp && product.mrp > product.price && (
                                    <span className="text-2xl text-gray-400 font-medium line-through mb-1">₹{product.mrp}</span>
                                )}
                                <span className="text-lg text-gray-500 font-bold mb-1">/ {product.unit || 'kg'}</span>
                            </div>

                            {/* Sizes & Colors */}
                            {product.sizes && product.sizes.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Select Size / Weight</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.sizes.map((size, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setSelectedSize(size)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedSize === size ? 'bg-primary-600 border-primary-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.colors && product.colors.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Select Color</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.colors.map((color, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setSelectedColor(color)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedColor === color ? 'bg-primary-600 border-primary-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'}`}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 mb-8">
                                <p className="text-gray-600 leading-relaxed text-sm">
                                    {product.description}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-8 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-700">Availability</span>
                                    {product.stockQuantity > 0 ? (
                                        <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full"><FiCheckCircle /> In Stock ({product.stockQuantity})</span>
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

                            {/* Quantity Selector */}
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Quantity:</span>
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
                                        disabled={quantity >= (product.stockQuantity || 999)}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 font-bold shadow-sm disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-95"
                                    >
                                        <FiPlus />
                                    </button>
                                </div>
                            </div>

                            {/* Sticky Action Buttons */}
                            <div className="fixed bottom-[64px] left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-none md:p-0 md:bg-transparent z-40 mt-auto grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={addingToCart || product.stockQuantity === 0}
                                    className="bg-[#ff6b00] hover:bg-[#e66000] text-white py-3.5 px-4 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {addingToCart ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <><FiShoppingCart className="text-lg" /> Add to Cart</>
                                    )}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!isAuthenticated) {
                                            toast.error('Please login first');
                                            return navigate('/b2b/login');
                                        }
                                        if (product.stockQuantity === 0) {
                                            toast.error('Product is out of stock');
                                            return;
                                        }
                                        await addToCart(product._id, quantity);
                                        navigate('/b2b/checkout');
                                    }}
                                    disabled={addingToCart || product.stockQuantity === 0}
                                    className="bg-[#04439c] hover:bg-[#03367c] text-white py-3.5 px-4 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.9868 6.94103C13.2519 6.64332 13.0405 6.16669 12.6416 6.16669H7.66667V0.833354C7.66667 0.395167 7.15174 0.158102 6.8188 0.443903L0.342611 6.00223C0.0336631 6.26732 0.222378 6.77259 0.635852 6.77259H5.5303V12.1667C5.5303 12.6049 6.04523 12.8419 6.37817 12.5561L12.9868 6.94103Z" fill="currentColor" />
                                    </svg>
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>

                    {/* Tabs Section */}
                    <div className="border-t border-gray-100 mt-8">
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'details' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                            >
                                Details & Specs
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'reviews' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                            >
                                Reviews ({ratingSummary.ratingCount})
                            </button>
                        </div>
                        
                        <div className="p-6 lg:p-10">
                            {activeTab === 'details' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Basic Specs */}
                                        <div className="flex flex-col p-4 bg-gray-50 rounded-xl">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category</span>
                                            <span className="text-sm font-medium text-gray-900">{product.category?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col p-4 bg-gray-50 rounded-xl">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Brand</span>
                                            <span className="text-sm font-medium text-gray-900">{product.brandName || product.brand || 'Generic'}</span>
                                        </div>
                                        {product.expiryDate && (
                                            <div className="flex flex-col p-4 bg-gray-50 rounded-xl">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Expiry Date</span>
                                                <span className="text-sm font-medium text-gray-900">{new Date(product.expiryDate).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {/* Dynamic Attributes */}
                                        {product.attributes && product.attributes.length > 0 && product.attributes.map((attr, idx) => (
                                            <div key={`attr-${idx}`} className="flex flex-col p-4 bg-gray-50 rounded-xl">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{attr.attributeName || attr.name}</span>
                                                <span className="text-sm font-medium text-gray-900">{Array.isArray(attr.value) ? attr.value.join(', ') : attr.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Write Review */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-4">{userRating ? 'Your Review' : 'Write a Review'}</h3>
                                        <form onSubmit={handleRatingSubmit}>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
                                                <StarRating 
                                                    rating={draftRating} 
                                                    interactive={true} 
                                                    onRate={setDraftRating} 
                                                    size={24} 
                                                />
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Comment (Optional)</label>
                                                <textarea 
                                                    value={draftComment}
                                                    onChange={(e) => setDraftComment(e.target.value)}
                                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
                                                    rows="3"
                                                    placeholder="Share your experience with this product..."
                                                ></textarea>
                                            </div>
                                            <button 
                                                type="submit"
                                                disabled={isSubmittingRating || draftRating === 0}
                                                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold uppercase tracking-wider text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors"
                                            >
                                                {isSubmittingRating ? 'Submitting...' : 'Submit Review'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Existing Reviews */}
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 mb-4">Customer Reviews</h3>
                                        {productReviews.length === 0 ? (
                                            <p className="text-gray-500 text-sm italic">No reviews yet. Be the first to review!</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {productReviews.map((rev) => (
                                                    <div key={rev._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                                    {rev.userId?.name?.charAt(0) || 'U'}
                                                                </div>
                                                                <span className="font-bold text-gray-900 text-sm">{rev.userId?.name || 'User'}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <StarRating rating={rev.rating} size={14} className="mb-2" />
                                                        {rev.review && <p className="text-sm text-gray-600">{rev.review}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
