import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPackage, FiHeart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCartStore } from '../../../shared/store/cartStore';
import { useWishlistStore } from '../../../shared/store/wishlistStore';

const CompactProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { cart, addToCart } = useCartStore();
  const { items: wishlistItems, addToWishlist, removeFromWishlist } = useWishlistStore();
  const [isAdding, setIsAdding] = useState(false);
  
  // Basic check if item is in cart (B2B cart structure)
  const cartItem = cart?.items?.find(item => item.product?._id === product._id);
  
  // Basic check if item is in wishlist
  const isWishlisted = wishlistItems?.some(item => item.product?._id === product._id);
  
  const handleAdd = async (e) => {
    e.stopPropagation();
    try {
      setIsAdding(true);
      await addToCart(product._id, product.stock || 1, product.vendorId || product.vendor?._id);
      toast.success('Added to cart');
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    try {
      if (isWishlisted) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product._id);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  // Calculate discount percentage if MRP exists
  const discountPercent = product.mrp > product.price 
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
    : 0;

  return (
    <div 
      className="flex flex-col cursor-pointer group w-full"
      onClick={() => navigate(`/b2b/grocery/product/${product._id}`)}
    >
      {/* Image Section - Fixed max height to prevent huge sizes on desktop */}
      <div className="relative w-full h-[180px] sm:h-[200px] lg:h-[240px] bg-[#f4f4f4] rounded-xl overflow-hidden mb-3">
        {product.image || product.media?.[0]?.url ? (
          <img 
            src={product.image || product.media?.[0]?.url} 
            alt={product.title} 
            className="w-full h-full object-cover" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <FiPackage size={40} />
          </div>
        )}
        
        {/* Wishlist Icon - Top Right */}
        <button 
          onClick={handleWishlist} 
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition-colors z-10 ${isWishlisted ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
        >
          <FiHeart size={14} className={isWishlisted ? 'fill-current' : ''} />
        </button>

        {/* Rating Badge - Bottom Left (Mocking like in Image 2) */}
        <div className="absolute bottom-2 left-2 z-10 bg-white px-1.5 py-0.5 rounded flex items-center gap-1">
           <span className="text-[10px] font-bold text-gray-800">4.5</span>
           <span className="text-[9px] text-green-600">★</span>
        </div>

        {/* Veg/Non-Veg Icon - Bottom Right */}
        <div className="absolute bottom-2 right-2 z-10">
          {product.vegType === 'veg' && (
             <div className="w-4 h-4 border border-green-600 flex items-center justify-center bg-white/90 rounded-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
             </div>
          )}
          {product.vegType === 'non-veg' && (
             <div className="w-4 h-4 border border-red-600 flex items-center justify-center bg-white/90 rounded-sm">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
             </div>
          )}
        </div>
      </div>
      
      {/* Product Info Section */}
      <div className="flex flex-col px-1">
        
        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate mb-0.5">
          {product.name || product.title}
        </h3>
        
        {/* Vendor/Subtitle */}
        <p className="text-[10px] text-gray-500 mb-2 truncate">
          {product.vendor?.businessName || 'ram texttile'}
        </p>

        {/* Price & Add to Cart Row */}
        <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex flex-col">
              <div className="flex items-end gap-1.5">
                {product.mrp && product.mrp > product.price && (
                  <span className="text-xs text-gray-400 line-through font-medium">₹{product.mrp}</span>
                )}
                <span className="font-black text-gray-900 text-sm leading-none">₹{product.price}</span>
              </div>
              {/* Offer Text */}
              {discountPercent > 0 && (
                <span className="text-[9px] font-medium text-blue-500 mt-0.5 block">
                  ₹{Math.floor(product.price * 0.9)} with UPI offer
                </span>
              )}
            </div>

            {/* ADD Button */}
            {cartItem ? (
              <div className="bg-primary-600 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm self-end mb-1">
                {cartItem.quantity} In Cart
              </div>
            ) : (
              <button 
                onClick={handleAdd}
                disabled={isAdding}
                className="border border-green-600 text-green-700 bg-white hover:bg-green-50 px-3 py-1 rounded text-[10px] font-bold uppercase active:scale-95 transition-all shadow-sm self-end mb-1"
              >
                {isAdding ? '...' : 'ADD'}
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default CompactProductCard;
