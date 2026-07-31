import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiHeart, FiTrash2, FiShoppingCart } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useCartStore } from '../../../shared/store/cartStore';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const Wishlist = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { fullWishlist, loading, toggleWishlist, fetchWishlist } = useWishlistStore();
    const { addToCart } = useCartStore();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/b2b/login');
        } else {
            fetchWishlist();
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
            <B2BHeader />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <FiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            My Wishlist
                            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
                                <FiHeart className="text-xl fill-current" />
                            </div>
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Save your favorite products for later</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600"></div>
                    </div>
                ) : fullWishlist.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <FiHeart className="text-4xl text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Your wishlist is empty</h2>
                        <p className="text-gray-500 mb-8 max-w-md">Browse our marketplace and tap the heart icon to save items you're interested in.</p>
                        <Link 
                            to="/b2b/catalog" 
                            className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
                        >
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {fullWishlist.map((item, idx) => {
                            const product = item.productId;
                            // Ensure product hasn't been deleted
                            if (!product) return null;

                            const getYouTubeId = (url) => {
                                if (!url) return null;
                                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                const match = url.match(regExp);
                                return (match && match[2].length === 11) ? match[2] : null;
                            };
                            const videoLink = product.videoLink || product.videoUrl;
                            const ytId = getYouTubeId(videoLink);
                            const isDirectVideo = videoLink && (videoLink.match(/\.(mp4|webm|mov|ogg)$/i) || videoLink.includes('cloudinary.com'));
                            
                            const pImages = product.media?.map(m => m.url) || product.images || [product.image];
                            const validImages = Array.isArray(pImages) ? pImages.filter(Boolean) : [];

                            const price = product.pricing?.b2b?.price || product.price || 0;
                            const mrp = product.pricing?.b2b?.mrp || product.mrp || 0;
                            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

                            return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={item._id} 
                                    className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-lg transition-all relative flex flex-col"
                                >
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleWishlist(product._id);
                                        }}
                                        className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm z-10 hover:bg-red-50 transition-colors"
                                    >
                                        <FiTrash2 className="text-sm" />
                                    </button>

                                    <Link to={`/b2b/product/${product._id}`} className="block relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                                        {validImages.length > 0 ? (
                                            <img src={validImages[0]} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                                        ) : isDirectVideo ? (
                                            <video src={videoLink} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                                        ) : ytId ? (
                                            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src='https://placehold.co/300x300/f8fafc/94a3b8?text=No+Image' alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                                        )}
                                        {discount > 0 && (
                                            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                                                {discount}% OFF
                                            </span>
                                        )}
                                    </Link>

                                    <Link to={`/b2b/product/${product._id}`} className="block flex-1">
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-500 mb-2 truncate">{product.vendorId?.storeName}</p>
                                    </Link>

                                    <div className="mt-auto">
                                        <div className="flex items-end gap-2 mb-3">
                                            <span className="text-lg font-black text-slate-900">{formatPrice(price)}</span>
                                            {mrp > price && (
                                                <span className="text-xs font-bold text-gray-400 line-through pb-0.5">{formatPrice(mrp)}</span>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => {
                                                addToCart(product._id, 1);
                                                toast.success('Added to Cart');
                                            }}
                                            className="w-full py-2 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FiShoppingCart /> Add to Cart
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <B2BBottomNav />
        </div>
    );
};

export default Wishlist;
