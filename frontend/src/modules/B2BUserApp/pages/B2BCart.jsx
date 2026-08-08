import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight, FiShoppingBag, FiShield, FiTruck } from 'react-icons/fi';
import { useCartStore } from '../../../shared/store/cartStore';
import { useAuthStore } from '../../../shared/store/authStore';
import B2BHeader from '../components/Layout/B2BHeader';
import toast from 'react-hot-toast';

const B2BCart = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { cart, loading, fetchCart, updateQuantity, removeFromCart, toggleSelection, toggleBulkSelection } = useCartStore();
    const [updatingItemId, setUpdatingItemId] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/cart' } } });
        } else {
            fetchCart();
        }
    }, [isAuthenticated, fetchCart, navigate]);

    const handleQuantityChange = async (productId, currentQty, change, size = null, color = null, selectedVariants = {}) => {
        const newQty = currentQty + change;
        if (newQty < 1) return;
        setUpdatingItemId(`${productId}_${size || ''}_${color || ''}_${JSON.stringify(selectedVariants)}`);
        await updateQuantity(productId, newQty, size, color, selectedVariants);
        setUpdatingItemId(null);
    };

    const handleRemoveItem = async (productId, size = null, color = null, selectedVariants = {}) => {
        setUpdatingItemId(`${productId}_${size || ''}_${color || ''}_${JSON.stringify(selectedVariants)}`);
        await removeFromCart(productId, size, color, selectedVariants);
        setUpdatingItemId(null);
    };

    const cartItems = cart?.items || [];
    const hasItems = cartItems.length > 0;

    // Calculations based on selected items only
    const selectedCartItems = cartItems.filter(item => item.selected !== false);
    const subtotal = selectedCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = 0; 
    const deliveryFee = 0; 
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
                             {Object.entries(groupedItems).map(([vendorId, group]) => {
                                const isGroupSelected = group.items.every(item => item.selected !== false);
                                const groupVendor = group.items[0]?.vendor || {};
                                const gMin = groupVendor.groceryMinOrderAmount || 0;
                                const fMin = groupVendor.fashionMinOrderAmount || 0;
                                const minOrderTexts = [];
                                if (gMin > 0) minOrderTexts.push(`Min Grocery: ₹${gMin}`);
                                if (fMin > 0) minOrderTexts.push(`Min Fashion: ₹${fMin}`);
                                const minOrderLabel = minOrderTexts.length > 0 ? `(${minOrderTexts.join(', ')})` : '';

                                return (
                                    <div key={vendorId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                                        {updatingItemId === `group_${vendorId}` && (
                                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600"></div>
                                            </div>
                                        )}
                                        <div className="bg-gray-50/80 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupSelected}
                                                    onChange={async (e) => {
                                                        const targetChecked = e.target.checked;
                                                        setUpdatingItemId(`group_${vendorId}`);
                                                        const updates = group.items.map(item => ({
                                                            productId: item.product._id || item.product,
                                                            size: item.size,
                                                            color: item.color,
                                                            selectedVariants: item.selectedVariants,
                                                            selected: targetChecked
                                                        }));
                                                        await toggleBulkSelection(updates);
                                                        setUpdatingItemId(null);
                                                    }}
                                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <FiShield className="text-primary-600" />
                                                <span 
                                                    onClick={() => navigate(`/b2b/vendor/${vendorId}`)}
                                                    className="text-[11px] md:text-xs font-black text-gray-700 uppercase tracking-[0.15em] cursor-pointer hover:underline"
                                                >
                                                    Sold by: {group.name}
                                                </span>
                                                {minOrderLabel && (
                                                    <span className="text-[10px] md:text-xs font-bold text-rose-600 uppercase tracking-wider ml-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                                                        {minOrderLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="divide-y divide-gray-100">
                                        {group.items.map((item) => {
                                            const productId = item.product?._id || item.product;
                                            const isGrocery = item.module === 'grocery' || item.productModel === 'GroceryProduct';
                                            const productName = item.product?.name || item.product?.title || 'Product';
                                            const productImages = item.product?.images || [];
                                            const productImage = productImages.length > 0 ? productImages[0] : (item.product?.image || null);
                                            const productMoq = item.product?.moq || item.product?.minOrderQuantity || 1;
                                            const productDetailPath = isGrocery
                                                ? `/b2b/grocery/product/${productId}`
                                                : `/b2b/product/${productId}`;
                                            const itemKey = `${productId}_${item.size || ''}_${item.color || ''}_${JSON.stringify(item.selectedVariants || {})}`;

                                            return (
                                                <div key={itemKey} className="p-4 md:p-6 flex flex-row items-center gap-4 md:gap-6 group/item relative">
                                                    {updatingItemId === itemKey && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10" />}

                                                    {/* Selection Checkbox */}
                                                    <div className="flex-shrink-0 flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.selected !== false}
                                                            onChange={async (e) => {
                                                                setUpdatingItemId(itemKey);
                                                                await toggleSelection(productId, item.size, item.color, item.selectedVariants, e.target.checked);
                                                                setUpdatingItemId(null);
                                                            }}
                                                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </div>

                                                    {/* Product Image */}
                                                    <div
                                                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50 cursor-pointer"
                                                        onClick={() => navigate(productDetailPath)}
                                                    >
                                                        {productImage ? (
                                                            <img src={productImage} alt={productName} className="w-full h-full object-cover mix-blend-multiply" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <FiShoppingBag size={24} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Product Details */}
                                                    <div className="flex-1 flex flex-col min-w-0">
                                                        {/* Name row + Delete button always visible */}
                                                        <div className="flex justify-between items-start gap-2 mb-2">
                                                            <h3
                                                                className="text-sm md:text-base font-bold text-gray-900 leading-tight hover:text-primary-600 cursor-pointer line-clamp-2 flex-1 min-w-0"
                                                                onClick={() => navigate(productDetailPath)}
                                                            >
                                                                {productName}
                                                            </h3>
                                                            {/* Delete button — always visible for ALL items */}
                                                            <button
                                                                onClick={async () => {
                                                                    setUpdatingItemId(itemKey);
                                                                    await handleRemoveItem(productId, item.size, item.color, item.selectedVariants);
                                                                    setUpdatingItemId(null);
                                                                }}
                                                                className="flex-shrink-0 text-gray-400 hover:text-red-500 p-1.5 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200"
                                                                title="Remove from cart"
                                                            >
                                                                <FiTrash2 size={15} />
                                                            </button>
                                                        </div>

                                                        {/* Tags: Module badge + size + color + variants */}
                                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                            {isGrocery && (
                                                                <span className="text-[9px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded uppercase tracking-widest border border-green-100">
                                                                    Grocery
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded uppercase tracking-widest">
                                                                Min Qty: {productMoq}
                                                            </span>
                                                            {item.size && (
                                                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">
                                                                    Size: {item.size}
                                                                </span>
                                                            )}
                                                            {item.color && (
                                                                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded uppercase tracking-widest">
                                                                    Color: {item.color}
                                                                </span>
                                                            )}
                                                            {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, val]) => (
                                                                <span key={key} className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded uppercase tracking-widest">
                                                                    {key}: {val}
                                                                </span>
                                                            ))}
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
                                                                    onClick={() => handleQuantityChange(productId, item.quantity, -1, item.size, item.color, item.selectedVariants)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                                                    disabled={item.quantity <= productMoq || loading}
                                                                >
                                                                    <FiMinus size={14} />
                                                                </button>
                                                                <span className="w-8 text-center text-sm font-black text-gray-900">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        const stockLimit = item.product?.stockQuantity ?? 999;
                                                                        if (item.quantity >= stockLimit) {
                                                                            toast.error(`Only ${stockLimit} units available in stock`);
                                                                            return;
                                                                        }
                                                                        handleQuantityChange(productId, item.quantity, 1, item.size, item.color, item.selectedVariants);
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                                                    disabled={loading || item.quantity >= (item.product?.stockQuantity ?? 999)}
                                                                >
                                                                    <FiPlus size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )})}
                        </div>

                        {/* Right Column: Order Summary (Sticky Bottom on Mobile) */}
                        <div className="w-full lg:w-[380px] flex-shrink-0">
                            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-gray-100 p-4 lg:sticky lg:top-[100px] lg:shadow-sm lg:border lg:rounded-2xl lg:p-6 transition-all" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
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
                                    onClick={() => {
                                        if (selectedCartItems.length === 0) {
                                            toast.error('Please select at least one item to purchase.');
                                            return;
                                        }
                                        navigate('/b2b/checkout');
                                    }}
                                    disabled={selectedCartItems.length === 0}
                                    className="w-full bg-[#ff6b00] disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#e66000] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
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
