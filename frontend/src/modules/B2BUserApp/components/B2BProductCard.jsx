import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiShield, FiPhone, FiMapPin, FiChevronDown, FiCheck, FiMail, FiShoppingCart, FiHeart, FiShoppingBag } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { getGoogleMapsUrl, getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import toast from '../../../shared/utils/toast';
import { useAuthStore } from '../../../shared/store/authStore';
import StarRating from '../../../shared/components/StarRating';
import { getRatingSummary } from '../../../shared/services/ratingService';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useCartStore } from '../../../shared/store/cartStore';

const B2BProductCard = ({ product, viewMode = 'grid', trackContactClick, itemType, requireAuthForActions = false, showSecureDeal = false }) => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'product' });
    const { wishlistItems, toggleWishlist } = useWishlistStore();
    const { addToCart } = useCartStore();
    const isWishlisted = wishlistItems.includes(product._id);

    React.useEffect(() => {
        const fetchRating = async () => {
            if (product._id) {
                const type = product.itemType === 'lotslot' ? 'lotslot' : 'product';
                const pSummary = await getRatingSummary(type, product._id);
                if (pSummary && pSummary.ratingCount > 0) {
                    setRatingSummary({ ...pSummary, type: 'product' });
                } else {
                    const vid = product.vendorId?._id || product.vendorId?.id || product.vendorIdRef || product.vendorId;
                    if (vid) {
                        const sSummary = await getRatingSummary('shop', vid);
                        if (sSummary && sSummary.ratingCount > 0) {
                            setRatingSummary({ ...sSummary, type: 'shop' });
                        } else {
                            setRatingSummary({ averageRating: 0, ratingCount: 0, type: 'product' });
                        }
                    }
                }
            }
        };
        fetchRating();
    }, [product._id, product.itemType, product.formType, product.vendorId]);

    let allImages = [];
    if (product.formType === 'shop-listing' && product.items?.length > 0) {
        allImages = [
            ...(Array.isArray(product.items[0].images) ? product.items[0].images : [])
        ].filter(Boolean);
        // Fallback to shop image if no item images
        if (allImages.length === 0) {
            allImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
        }
    } else {
        // Standard product or Lot/Slot
        allImages = [
            product.coverImage || product.image,
            ...(Array.isArray(product.images) ? product.images : [])
        ].filter(Boolean);
    }

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoLink = product.videoLink || (product.formType === 'shop-listing' ? product.items?.[0]?.videoLink : null);
    const ytId = getYouTubeId(videoLink);

    const getVideoPoster = (url) => {
        if (!url) return '';
        if (url.includes('cloudinary.com') && url.match(/\.(mp4|webm|mov)$/i)) {
            return url.replace(/\.(mp4|webm|mov)$/i, '.jpg');
        }
        return '';
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const vid = product.vendorId?._id ?? product.vendorId?.id ?? product.vendorIdRef ?? product.vendorId;
    const vendorIdStr = vid ? String(vid) : null;
    const vendor = product.vendorId;

    // Prefer specific shopName from backend, fallback to shopUnit.name, then storeName
    const shopDisplayName = product.shopName || product.shopUnit?.name || vendor?.storeName || 'Vendor';

    const moqValue = product.formType === 'shop-listing'
        ? (product.items?.[0]?.moq ?? product.moq ?? product.minimumOrderQuantity)
        : (product.moq ?? product.minimumOrderQuantity);
    const unitDisplay = product.formType === 'shop-listing' && product.items?.length > 0
        ? (product.items[0].unit || product.unit || 'pcs')
        : (product.unit || 'pcs');

    const hasGst = Boolean(vendor?.gstNumber);
    const hasEmail = Boolean(vendor?.email);
    const hasMobile = Boolean(vendor?.phone);

    const enquiryStatus = product.enquiryStatus || product.vendorId?.enquiryStatus || { canAcceptEnquiries: false };
    const canAcceptEnquiries = enquiryStatus.canAcceptEnquiries;
    const isOwner = user?.id === vendorIdStr || user?.vendorId === vendorIdStr;

    const redirectToLoginIfRequired = (event) => {
        if (requireAuthForActions && !isAuthenticated) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
            return true;
        }
        return false;
    };

    const getCategoryName = () => {
        if (product.formType === 'shop-listing') return 'Shop Listing';
        if (product.category) return product.category; // LotSlot string field
        if (product.categoryId?.name) return product.categoryId.name;
        const categoryAttr = product.attributes?.find(attr =>
            attr.name === 'category' || attr.attributeName === 'category'
        );
        return categoryAttr?.value || 'Product';
    };

    const getTrackingContext = () => ({
        itemType: product.itemType === 'lotslot' ? 'lotslot' : 'product',
        itemId: product._id,
        category: getCategoryName()
    });

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
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            onClick={() => {
                if (redirectToLoginIfRequired()) return;
                navigate(`/b2b/product/${product._id}`);
            }}
            className={`group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col h-auto md:h-[400px]' : 'flex-row items-center gap-6 p-4 h-fit'}`}
        >
            {/* Image Container - Interactive Gallery */}
            <div
                className={`relative ${viewMode === 'grid' ? 'aspect-square w-full' : 'w-48 h-48 flex-shrink-0 rounded-xl'} overflow-hidden bg-gray-50 border-b border-gray-50 group/image`}
            >
                {/* Images */}
                {allImages.length > 0 ? (
                    allImages.map((img, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 w-full h-full bg-white flex items-center justify-center p-2 transition-opacity duration-300 ${activeImageIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                        >
                            {/* Blurred background for premium fill */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                                style={{ backgroundImage: `url(${img})` }}
                            />
                            
                            <img
                                src={img}
                                alt={`${product.name} - ${idx + 1}`}
                                className="relative z-10 w-full h-full object-contain transition-transform duration-700 hover:scale-105"
                            />
                        </div>
                    ))
                ) : ytId ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                        <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt={product.name}
                            className="w-full h-full object-cover opacity-80 transition-transform duration-700 hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center pl-1 shadow-[0_0_15px_rgba(220,38,38,0.5)] text-white">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                    </div>
                ) : videoLink ? (
                    <video 
                        src={videoLink}
                        poster={getVideoPoster(videoLink)}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        muted
                        playsInline
                        autoPlay
                        loop
                    />
                ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center p-4">
                        <img
                            src="https://placehold.co/400x300/f8fafc/94a3b8?text=No+Image"
                            alt={product.name}
                            className="w-full h-full object-contain opacity-50"
                        />
                    </div>
                )}

                {/* Navigation Buttons (Only if multiple images) */}
                {allImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="rotate-90 text-sm" />
                        </button>
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="-rotate-90 text-sm" />
                        </button>
                    </>
                )}

                {/* Image Indicators (Dots/Lines) */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity px-2">
                        {allImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-300 shadow-sm ${activeImageIndex === idx
                                    ? 'w-4 bg-white'
                                    : 'w-1 bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>
                )}


                {/* Wishlist Button */}
                <button
                    onClick={handleWishlist}
                    className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all z-20"
                >
                    <FiHeart className={`text-sm ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
            </div>

            {/* Content Body - Ultra Compact */}
            <div className={`p-3 flex flex-col gap-1.5 ${viewMode === 'list' ? 'flex-1 justify-center' : 'flex-1'}`}>
                <h3 className="text-[13px] text-gray-900 font-bold line-clamp-1 group-hover:text-primary-600 transition-colors leading-tight">
                    {product.formType === 'shop-listing' && product.items?.length > 0
                        ? (product.items[0].itemName || product.items[0].name || 'Item')
                        : product.name}
                </h3>
                <p className="text-[10px] text-gray-500 lowercase truncate">
                    {shopDisplayName}
                </p>
                
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-gray-900">
                        ₹{product.formType === 'shop-listing' && product.items?.length > 0
                            ? product.items[0].price
                            : product.price}
                    </span>
                    <span className="text-[10px] text-gray-500 line-through">
                        ₹{product.price * 1.5}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    {ratingSummary.ratingCount > 0 ? (
                        <div className="flex items-center gap-1 bg-green-600 px-1.5 py-0.5 rounded text-white font-bold text-[10px]">
                            <span>{ratingSummary.averageRating.toFixed(1)}</span>
                            <StarRating rating={1} size={8} color="#fff" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold text-[10px]">
                            <span>New</span>
                            <StarRating rating={1} size={8} color="#4b5563" />
                        </div>
                    )}
                    <span className="text-[10px] text-gray-500">
                        {ratingSummary.ratingCount > 0 ? `${ratingSummary.ratingCount} Reviews` : 'No Reviews'}
                    </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 w-fit mb-2">
                    <span className="text-[9px] font-medium text-gray-600">Free Delivery</span>
                </div>

                {/* Add to Cart / Buy Now Buttons */}
                <div className="mt-auto flex gap-2 w-full pb-1">
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
        </motion.div>
    );
};

export default B2BProductCard;
