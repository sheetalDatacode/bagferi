import React from 'react';
import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';

const SuggestedProductCard = ({ product }) => {
    // Safely extract properties with fallbacks
    const name = product?.name || 'Product';
    const storeName = product?.vendorId?.storeName || product?.name || 'Vendor';
    const price = product?.price || 0;
    const mrp = product?.mrp || (price * 1.2); // Fake MRP if none exists
    const rating = product?.rating || '4.2';
    
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
    const imageUrl = productImages.length > 0 ? productImages[0] : 'https://via.placeholder.com/300?text=No+Image';

    // Calculate a dummy UPI offer based on the price (e.g. 5% extra discount, min Rs.35)
    const discountAmount = Math.max(Math.floor(price * 0.05), 35);
    const upiPrice = Math.max(price - discountAmount, 0);

    return (
        <Link to={`/b2b/product/${product?._id}`} className="block group w-full text-left bg-white transition-transform hover:-translate-y-1">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 mb-3 border border-gray-100">
                <img 
                    src={imageUrl} 
                    alt={name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Rating Badge Overlay */}
                <div className="absolute bottom-2 left-2 bg-white px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-800">{rating}</span>
                    <FiStar className="text-green-600 fill-green-600 text-[10px]" />
                </div>
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
