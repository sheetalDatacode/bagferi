import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiStar, FiHeart, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';
import { getRatingSummary } from '../../../shared/services/ratingService';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useCartStore } from '../../../shared/store/cartStore';
import { useAuthStore } from '../../../shared/store/authStore';

const SuggestedProductCard = ({ product, linkPrefix = '/b2b/product/' }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { wishlistItems, toggleWishlist } = useWishlistStore();
    const { addToCart } = useCartStore();

    const isWishlisted = product ? wishlistItems.includes(product._id) : false;

    // Safely extract properties with fallbacks
    const name = product?.name || 'Product';
    const storeName = product?.vendorId?.storeName || product?.name || 'Vendor';
    const price = product?.price || 0;
    const mrp = product?.mrp || (price * 1.2); // Fake MRP if none exists
    const [ratingSummary, setRatingSummary] = React.useState({ averageRating: 0, ratingCount: 0 });

    React.useEffect(() => {
        const fetchRating = async () => {
            if (product?._id) {
                const type = product.itemType === 'lotslot' ? 'lotslot' : 'product';
                const pSummary = await getRatingSummary(type, product._id);
                if (pSummary && pSummary.ratingCount > 0) {
                    setRatingSummary(pSummary);
                } else {
                    const vid = product.vendorId?._id || product.vendorId?.id || product.vendorIdRef || product.vendorId;
                    if (vid) {
                        const sSummary = await getRatingSummary('shop', vid);
                        if (sSummary && sSummary.ratingCount > 0) {
                            setRatingSummary(sSummary);
                        } else {
                            setRatingSummary({ averageRating: 0, ratingCount: 0 });
                        }
                    }
                }
            }
        };
        fetchRating();
    }, [product?._id, product?.itemType, product?.formType, product?.vendorId]);
    
    // Extract first image
    let productImages = [];
    if (product?.coverImage) productImages.push(product.coverImage);
    if (product?.image) productImages.push(product.image);
    if (Array.isArray(product?.images)) {
        product.images.forEach(img => {
            if (img && typeof img === 'string') productImages.push(img);
            else if (img?.url) productImages.push(img.url);
        });
    }
    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoLink = product?.videoLink || (product?.formType === 'shop-listing' ? product?.items?.[0]?.videoLink : null);
    const ytId = getYouTubeId(videoLink);

    const getVideoPoster = (url) => {
        if (!url) return '';
        if (url.includes('cloudinary.com') && url.match(/\.(mp4|webm|mov)$/i)) {
            return url.replace(/\.(mp4|webm|mov)$/i, '.jpg');
        }
        return '';
    };

    const imageUrl = productImages.length > 0 
        ? productImages[0] 
        : ytId 
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
            : 'https://placehold.co/300x400/f8fafc/94a3b8?text=No+Image';
    // Calculate a dummy UPI offer based on the price (e.g. 5% extra discount, min Rs.35)
    const discountAmount = Math.max(Math.floor(price * 0.05), 35);
    const upiPrice = Math.max(price - discountAmount, 0);

    const handleWishlist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error('Please login to use wishlist');
            return navigate('/b2b/login');
        }
        toggleWishlist(product._id);
    };

    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error('Please login first');
            return navigate('/b2b/login');
        }
        await addToCart(product._id, 1);
        toast.success('Added to cart');
    };

    const handleBuyNow = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error('Please login first');
            return navigate('/b2b/login');
        }
        await addToCart(product._id, 1);
        navigate('/b2b/checkout');
    };

    return (
        <div className="block group w-full text-left bg-white transition-transform hover:-translate-y-1 relative h-full flex flex-col">
            <Link to={`${linkPrefix}${product?._id}`} className="block relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 mb-3 border border-gray-100 shrink-0">
                {productImages.length === 0 && ytId ? (
                    <>
                        <img 
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                            alt={name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center pl-1 shadow-[0_0_15px_rgba(220,38,38,0.5)] text-white">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                    </>
                ) : productImages.length === 0 && videoLink ? (
                    <video 
                        src={videoLink} 
                        poster={getVideoPoster(videoLink)}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        muted 
                        playsInline 
                        autoPlay 
                        loop
                    />
                ) : (
                    <img 
                        src={productImages.length > 0 ? productImages[0] : 'https://placehold.co/300x400/f8fafc/94a3b8?text=No+Image'} 
                        alt={name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                )}
                
                {/* Dynamic Discount Badge - Top Left */}
                {mrp && mrp > price && (
                    <div className="absolute top-0 left-0 bg-[#e67e22] text-white text-[11px] font-black px-2.5 py-1 rounded-br-lg shadow-sm tracking-wide z-10">
                        ₹{mrp - price} OFF
                    </div>
                )}
                
                {/* Rating Badge Overlay */}
                {ratingSummary.averageRating > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <span className="text-[11px] font-bold text-gray-800">{ratingSummary.averageRating.toFixed(1)}</span>
                        <FiStar className="text-green-600 fill-green-600 text-[10px]" />
                    </div>
                )}
            </Link>
            
            {/* Wishlist Button (Absolute positioned on top of image) */}
            <button
                onClick={handleWishlist}
                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all z-10"
            >
                <FiHeart className={`text-sm ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>

            <Link to={`${linkPrefix}${product?._id}`} className="px-1 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 text-sm line-clamp-2 min-h-[40px]">{name}</h3>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                    <p className="text-[10px] text-gray-500 truncate flex-1">{storeName}</p>
                    {(product?.vendorId?._id || product?.vendorId) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const vid = product.vendorId?._id || product.vendorId;
                                navigate(`/b2b/vendor/${vid}`);
                            }}
                            className="text-[9px] font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded transition-colors whitespace-nowrap"
                        >
                            Visit Store
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 line-through">{formatPrice(mrp)}</span>
                    <span className="text-sm font-black text-slate-900">{formatPrice(price)}</span>
                </div>

                {/* Delivery Time */}
                {(() => {
                    const groceryDT = product?.shopUnit?.groceryDeliveryTime;
                    const fashionDT = product?.shopUnit?.fashionDeliveryTime || product?.vendorId?.fashionDeliveryTime || product?.vendorId?.shopUnit?.fashionDeliveryTime;

                    if (groceryDT?.minTime && groceryDT?.maxTime) {
                        return (
                            <div className="flex items-center gap-1 mb-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                                <span className="text-[10px] font-bold text-green-700">
                                    Delivery in {groceryDT.minTime}–{groceryDT.maxTime} mins
                                </span>
                            </div>
                        );
                    }
                    if (fashionDT?.minDays && fashionDT?.maxDays) {
                        return (
                            <div className="flex items-center gap-1 mb-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0"></span>
                                <span className="text-[10px] font-bold text-blue-700">
                                    Delivery in {fashionDT.minDays}–{fashionDT.maxDays} days
                                </span>
                            </div>
                        );
                    }
                    return null;
                })()}
            </Link>

            <div className="px-1 mt-auto pb-2 flex gap-2">
                <button 
                    onClick={handleAddToCart}
                    className="flex-1 py-1.5 border border-primary-600 text-primary-600 rounded-lg text-xs font-bold transition-colors hover:bg-primary-50 flex items-center justify-center gap-1"
                >
                    ADD
                </button>
                <button 
                    onClick={handleBuyNow}
                    className="flex-1 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold transition-colors hover:bg-primary-700"
                >
                    BUY NOW
                </button>
            </div>
        </div>
    );
};

export default SuggestedProductCard;
