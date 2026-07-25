import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight, FiShoppingBag, FiShield, FiTruck } from 'react-icons/fi';
import { useCartStore } from '../../../shared/store/cartStore';
import { useAuthStore } from '../../../shared/store/authStore';
import B2BHeader from '../components/Layout/B2BHeader';

const B2BCart = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { cart, loading, fetchCart, updateQuantity, removeFromCart } = useCartStore();
    const [updatingItemId, setUpdatingItemId] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/cart' } } });
        } else {
            fetchCart();
        }
    }, [isAuthenticated, fetchCart, navigate]);

    const handleQuantityChange = async (productId, currentQty, change) => {
        const newQty = currentQty + change;
        if (newQty < 1) return;
        setUpdatingItemId(productId);
        await updateQuantity(productId, newQty);
        setUpdatingItemId(null);
    };

    const handleRemoveItem = async (productId) => {
        setUpdatingItemId(productId);
        await removeFromCart(productId);
        setUpdatingItemId(null);
    };

    const cartItems = cart?.items || [];
    const hasItems = cartItems.length > 0;

    // Calculations
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = 0; // Temporarily disabled dummy tax to avoid confusion
    const deliveryFee = 0; // Temporarily disabled delivery fee to avoid confusion
    const total = subtotal + tax + (subtotal > 0 ? deliveryFee : 0);

    // Group items by vendor
    const groupedItems = cartItems.reduce((acc, item) => {
        const vendorId = item.vendor?._id || item.vendor || 'unknown';
        const vendorName = item.vendor?.storeName || item.vendor?.name || 'Verified Vendor';
        if (!acc[vendorId]) {
            acc[vendorId] = { name: vendorName, items: [] };
        }
        acc[vendorId].items.push(item);
        return acc;
    }, {});

    if (loading && !cart) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <B2BHeader title="Shopping Cart" showBack={true} hideSearch={true} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-32 lg:pb-0 relative">
            <B2BHeader title="Shopping Cart" showBack={true} hideSearch={true} />

            <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 md:px-6 py-6">
                {!hasItems ? (
                    // Empty Cart State
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
                        <div className="w-40 h-40 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-6">
                            <FiShoppingBag className="text-6xl text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2 uppercase">Your cart is empty</h2>
                        <p className="text-gray-500 mb-8 font-medium">Looks like you haven't added anything to your cart yet. Discover wholesale deals now!</p>
                        <button
                            onClick={() => navigate('/b2b/catalog')}
                            className="bg-primary-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 w-full"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    // Cart Content
                    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 relative">
                        
                        {/* Left Column: Cart Items */}
                        <div className="flex-1 flex flex-col gap-6">
                            {Object.entries(groupedItems).map(([vendorId, group]) => (
                                <div key={vendorId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gray-50/80 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center gap-2">
                                        <FiShield className="text-primary-600" />
                                        <span className="text-[11px] md:text-xs font-black text-gray-700 uppercase tracking-[0.15em]">Sold by: {group.name}</span>
                                    </div>
                                    
                                    <div className="divide-y divide-gray-100">
                                        {group.items.map((item) => (
                                            <div key={item.product._id || item.product} className="p-4 md:p-6 flex flex-row gap-4 md:gap-6 group/item relative">
                                                {updatingItemId === (item.product._id || item.product) && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10" />}
                                                
                                                {/* Product Image */}
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50 cursor-pointer" onClick={() => navigate(item.module === 'grocery' ? `/b2b/grocery/product/${item.product._id || item.product}` : `/b2b/product/${item.product._id || item.product}`)}>
                                                    {(item.product.images && item.product.images.length > 0) || item.product.image || item.product.media ? (
                                                        <img src={item.product.images?.length > 0 ? item.product.images[0] : (item.product.image || item.product.media?.[0]?.url)} alt={item.product.name || item.product.title} className="w-full h-full object-cover mix-blend-multiply" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <FiShoppingBag size={24} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Product Details */}
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start gap-4 mb-2">
                                                        <h3 
                                                            className="text-sm md:text-base font-bold text-gray-900 leading-tight hover:text-primary-600 cursor-pointer line-clamp-2"
                                                            onClick={() => navigate(item.module === 'grocery' ? `/b2b/grocery/product/${item.product._id || item.product}` : `/b2b/product/${item.product._id || item.product}`)}
                                                        >
                                                            {item.product.name || item.product.title}
                                                        </h3>
                                                        <button 
                                                            onClick={() => handleRemoveItem(item.product._id || item.product)}
                                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors bg-gray-50 rounded-lg"
                                                            title="Remove Item"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded uppercase tracking-widest">
                                                            Min Qty: {item.product.moq || 1}
                                                        </span>
                                                    </div>

                                                    <div className="mt-auto flex items-center justify-between">
                                                        {/* Price */}
                                                        <div>
                                                            <span className="text-lg md:text-xl font-black text-gray-900 tracking-tight">₹{item.price?.toLocaleString('en-IN') || 0}</span>
                                                            <span className="text-[10px] md:text-xs text-gray-500 font-bold ml-1 uppercase">/ unit</span>
                                                        </div>

                                                        {/* Quantity Controls */}
                                                        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                                                            <button 
                                                                onClick={() => handleQuantityChange(item.product._id || item.product, item.quantity, -1)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                                                disabled={item.quantity <= (item.product.moq || 1) || loading}
                                                            >
                                                                <FiMinus size={14} />
                                                            </button>
                                                            <span className="w-8 text-center text-sm font-black text-gray-900">
                                                                {item.quantity}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleQuantityChange(item.product._id || item.product, item.quantity, 1)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                                                disabled={loading}
                                                            >
                                                                <FiPlus size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Order Summary (Sticky Bottom on Mobile) */}
                        <div className="w-full lg:w-[380px] flex-shrink-0">
                            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-gray-100 p-4 lg:sticky lg:top-[100px] lg:shadow-sm lg:border lg:rounded-2xl lg:p-6 transition-all">
                                <h3 className="hidden lg:block text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
                                    Order Summary
                                </h3>
                                
                                <div className="hidden lg:flex flex-col gap-4 mb-6">
                                    <div className="flex justify-between items-center text-sm text-gray-600 font-semibold">
                                        <span>Subtotal ({cartItems.length} items)</span>
                                        <span className="text-gray-900 font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-600 font-semibold">
                                        <span>Estimated Tax (5%)</span>
                                        <span className="text-gray-900 font-bold">₹{tax.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-600 font-semibold">
                                        <span className="flex items-center gap-1"><FiTruck /> Delivery</span>
                                        <span className={deliveryFee === 0 ? "text-green-600 font-bold" : "text-gray-900 font-bold"}>
                                            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}
                                        </span>
                                    </div>
                                    
                                    <div className="border-t border-gray-100 pt-4 mt-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Total Amount</span>
                                            <span className="text-2xl font-black text-primary-600 tracking-tight">₹{total.toLocaleString('en-IN')}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold text-right mt-1">Inclusive of all taxes</p>
                                    </div>
                                </div>

                                {/* Mobile Compact Summary View */}
                                <div className="lg:hidden flex justify-between items-center mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Pay</span>
                                        <span className="text-xl font-black text-primary-600 tracking-tight">₹{total.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Incl. Tax</span>
                                        <button className="text-[10px] text-primary-600 font-bold underline decoration-primary-300 underline-offset-2">View Breakdown</button>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate('/b2b/checkout')}
                                    className="w-full bg-[#ff6b00] text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#e66000] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                                >
                                    Proceed to Checkout
                                    <FiArrowRight size={18} />
                                </button>
                                
                                <div className="hidden lg:flex items-center justify-center gap-2 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <FiShield size={14} /> Safe and Secure Payments
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
};

export default B2BCart;
