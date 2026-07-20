import React from 'react';
import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import { getRatingSummary } from '../../../shared/services/ratingService';

const SuggestedProductCard = ({ product }) => {
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

    const imageUrl = productImages.length > 0 
        ? productImages[0] 
        : ytId 
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
            : 'https://placehold.co/300x400/f8fafc/94a3b8?text=No+Image';
    // Calculate a dummy UPI offer based on the price (e.g. 5% extra discount, min Rs.35)
    const discountAmount = Math.max(Math.floor(price * 0.05), 35);
    const upiPrice = Math.max(price - discountAmount, 0);

    return (
        <Link to={`/b2b/product/${product?._id}`} className="block group w-full text-left bg-white transition-transform hover:-translate-y-1">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 mb-3 border border-gray-100">
                <img 
                    src={imageUrl} 
                    alt={name} 
                    className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${ytId && productImages.length === 0 ? 'opacity-80' : ''}`}
                />
                
                {ytId && productImages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center pl-1 shadow-[0_0_15px_rgba(220,38,38,0.5)] text-white">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                )}
                
                {/* Rating Badge Overlay */}
                {ratingSummary.averageRating > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <span className="text-[11px] font-bold text-gray-800">{ratingSummary.averageRating.toFixed(1)}</span>
                        <FiStar className="text-green-600 fill-green-600 text-[10px]" />
                    </div>
                )}
            </div>

            <div className="px-1">
                <h3 className="font-bold text-slate-900 text-sm truncate mb-1">{storeName}</h3>
                
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 line-through">₹{formatPrice(mrp)}</span>
                    <span className="text-sm font-black text-slate-900">₹{formatPrice(price)}</span>
                </div>
                
                <div className="text-[11px] font-bold text-blue-600 truncate">
                    ₹{formatPrice(upiPrice)} <span className="font-medium text-blue-500">with UPI offer</span>
                </div>
            </div>
        </Link>
    );
};

export default SuggestedProductCard;
