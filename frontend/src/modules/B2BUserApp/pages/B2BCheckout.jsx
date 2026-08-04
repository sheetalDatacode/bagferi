import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiPlus, FiCheckCircle, FiShield, FiShoppingBag, FiMinus, FiTrash } from 'react-icons/fi';
import { useCartStore } from '../../../shared/store/cartStore';
import { useAuthStore } from '../../../shared/store/authStore';
import B2BHeader from '../components/Layout/B2BHeader';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const B2BCheckout = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { cart, loading, fetchCart, clearCart, updateQuantity, removeFromCart, toggleSelection, toggleBulkSelection } = useCartStore();

    const [addresses, setAddresses] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [advancePerOrder, setAdvancePerOrder] = useState(200);

    // Form State
    const [newAddress, setNewAddress] = useState({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: ''
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/checkout' } } });
        } else {
            fetchCart();
            fetchAddresses();
        }
    }, [isAuthenticated, fetchCart, navigate]);

    const fetchAddresses = async () => {
        try {
            const res = await api.get('/user/addresses');
            if (res.success) {
                const fetchedAddrs = Array.isArray(res.data) ? res.data : (res.data?.addresses || []);
                setAddresses(fetchedAddrs);
                if (fetchedAddrs.length > 0) {
                    setSelectedIndex(0);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/public/b2b-settings');
            if (res.success && res.data) {
                if (res.data.advancePaymentAmount !== undefined) {
                    setAdvancePerOrder(res.data.advancePaymentAmount);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleAddAddress = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                streetAddress: `${newAddress.addressLine1} ${newAddress.addressLine2}`,
                city: newAddress.city,
                state: newAddress.state,
                pincode: newAddress.pincode,
                phone: newAddress.phone,
                country: 'India',
                addressType: 'Home'
            };
            
            const res = await api.post('/user/addresses', payload);
            if (res.success) {
                toast.success('Address added successfully');
                setIsAddingAddress(false);
                fetchAddresses(); // Refresh list
            } else {
                toast.error(res.message || 'Failed to add address');
            }
        } catch (err) {
            toast.error('An error occurred');
        }
    };

    const allCartItems = cart?.items || [];
    const hasItems = allCartItems.length > 0;
    const cartItems = allCartItems.filter(item => item.selected !== false);

    // Group ALL cart items by vendor to calculate orders
    const groupedItems = allCartItems.reduce((acc, item) => {
        const vendorId = item.vendor?._id || item.vendor || 'unknown';
        const vendorName = item.vendor?.storeName || item.vendor?.name || 'Verified Vendor';
        if (!acc[vendorId]) {
            acc[vendorId] = {
                name: vendorName,
                items: []
            };
        }
        acc[vendorId].items.push(item);
        return acc;
    }, {});

    const vendorIds = Object.keys(groupedItems);
    
    // Active vendor is the first one that has selected items
    const activeVendorId = vendorIds.find(vId => groupedItems[vId].items.some(item => item.selected !== false)) || vendorIds[0] || null;
    const activeGroup = activeVendorId ? groupedItems[activeVendorId] : null;

    // Subtotal calculations for the active vendor group (only selected items)
    const selectedActiveItems = activeGroup ? activeGroup.items.filter(item => item.selected !== false) : [];
    const subtotal = selectedActiveItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Calculate total advance capped by the active vendor group subtotal
    const totalAdvance = activeGroup && selectedActiveItems.length > 0 ? Math.min(advancePerOrder, subtotal) : 0;

    const numberOfOrders = selectedActiveItems.length > 0 ? 1 : 0;
    const remainingBalance = subtotal - totalAdvance > 0 ? subtotal - totalAdvance : 0;

    const handleQuantityChange = async (productId, currentQty, change, size = null, color = null, selectedVariants = {}) => {
        const newQty = currentQty + change;
        if (newQty < 1) return;
        await updateQuantity(productId, newQty, size, color, selectedVariants);
    };

    const handleCheckout = async () => {
        if (selectedIndex === null || selectedIndex >= addresses.length) {
            toast.error('Please select a delivery address');
            return;
        }

        const selectedAddress = addresses[selectedIndex];
        const shippingAddress = {
            fullName: user?.name || 'User',
            phone: selectedAddress.phone || user?.phone,
            addressLine1: selectedAddress.streetAddress,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            areaName: selectedAddress.areaName
        };

        setIsPlacingOrder(true);
        const res = await loadRazorpay();
        if (!res) {
            toast.error('Razorpay SDK failed to load. Are you online?');
            setIsPlacingOrder(false);
            return;
        }

        try {
            // 1. Initiate Checkout
            const initRes = await api.post('/order/checkout', {
                shippingAddress,
                paymentMethod: 'Online',
                vendorId: activeVendorId
            });

            if (!initRes.success) {
                toast.error(initRes.message);
                setIsPlacingOrder(false);
                return;
            }

            const { razorpayOrderId, amount } = initRes.data;

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy',
                amount: amount,
                currency: 'INR',
                name: 'Bagferi B2B',
                description: `Advance Payment for ${numberOfOrders} Order(s)`,
                order_id: razorpayOrderId,
                handler: async function (response) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await api.post('/order/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            shippingAddress,
                            vendorId: activeVendorId
                        });

                        if (verifyRes.success) {
                            toast.success('Orders placed successfully!');
                            await fetchCart();
                            const updatedCart = useCartStore.getState().cart;
                            const remainingSelectedItems = updatedCart?.items?.filter(item => item.selected !== false) || [];
                            if (remainingSelectedItems.length > 0) {
                                setIsPlacingOrder(false);
                            } else {
                                navigate('/b2b/orders');
                            }
                        } else {
                            toast.error('Payment verification failed');
                        }
                    } catch (err) {
                        toast.error('Payment verification error');
                    }
                },
                prefill: {
                    name: 'User',
                    email: 'user@example.com',
                    contact: selectedAddress.phone
                },
                theme: {
                    color: '#ff6b00'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description);
                setIsPlacingOrder(false);
            });
            rzp.open();

        } catch (err) {
            toast.error('Checkout failed. Please try again.');
            setIsPlacingOrder(false);
        }
    };

    if (loading && !cart) return <div>Loading...</div>;

    if (!hasItems) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <B2BHeader title="Checkout" showBack={true} hideSearch={true} />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
                    <button onClick={() => navigate('/b2b/catalog')} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold">Start Shopping</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-32 lg:pb-0 relative">
            <B2BHeader title="Secure Checkout" showBack={true} hideSearch={true} />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6">
                
                {/* Left Column: Address Selection */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                        <h2 className="text-lg font-black uppercase text-gray-900 mb-4 flex items-center gap-2">
                            <FiMapPin className="text-primary-600" /> Delivery Address
                        </h2>

                        {addresses.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                {addresses.map((addr, idx) => (
                                    <div 
                                        key={addr._id || idx} 
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedIndex === idx ? 'border-primary-600 bg-orange-50/30' : 'border-gray-100 bg-gray-50 hover:border-primary-300'}`}
                                    >
                                        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${selectedIndex === idx ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
                                            {selectedIndex === idx && <FiCheckCircle size={14} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 mb-1">{addr.addressType || 'Home'} <span className="font-normal text-gray-500 text-sm ml-2">{addr.phone}</span></p>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {addr.streetAddress}, {addr.areaName ? `${addr.areaName}, ` : ''}{addr.city}, {addr.state} - {addr.pincode}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 mb-4 text-sm font-medium bg-gray-50 p-4 rounded-xl">No saved addresses found. Please add a delivery address to continue.</p>
                        )}

                        {!isAddingAddress ? (
                            <button 
                                onClick={() => setIsAddingAddress(true)}
                                className="text-primary-600 font-bold text-sm uppercase flex items-center gap-1 hover:text-primary-700"
                            >
                                <FiPlus /> Add New Address
                            </button>
                        ) : (
                            <form onSubmit={handleAddAddress} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4 space-y-4">
                                <h3 className="font-bold text-gray-900">Add New Address</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input required placeholder="Full Name (optional)" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm" />
                                    <input required type="tel" placeholder="Mobile Number" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm" />
                                    <input required placeholder="House No, Building, Company" value={newAddress.addressLine1} onChange={e => setNewAddress({...newAddress, addressLine1: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm sm:col-span-2" />
                                    <input placeholder="Area, Street, Sector, Village" value={newAddress.addressLine2} onChange={e => setNewAddress({...newAddress, addressLine2: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm sm:col-span-2" />
                                    <input required placeholder="City / Town" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm" />
                                    <input required placeholder="State" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm" />
                                    <input required placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 outline-none text-sm" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Save Address</button>
                                    <button type="button" onClick={() => setIsAddingAddress(false)} className="bg-white text-gray-700 border border-gray-300 px-6 py-2 rounded-lg font-bold text-sm">Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-6">
                        <h2 className="text-lg font-black uppercase text-gray-900 mb-4 flex items-center gap-2">
                            <FiShoppingBag className="text-primary-600" /> Order Items (Shop-Wise Checkout)
                        </h2>
                        
                        <div className="space-y-6">
                             {Object.entries(groupedItems).map(([vendorId, group], groupIdx) => {
                                const isGroupSelected = group.items.every(item => item.selected !== false);
                                const isActive = vendorId === activeVendorId;
                                return (
                                    <div key={vendorId} className={`rounded-xl border p-4 ${isActive ? 'border-primary-200 bg-white' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}>
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupSelected}
                                                    onChange={async (e) => {
                                                        const targetChecked = e.target.checked;
                                                        const updates = group.items.map(item => ({
                                                            productId: item.product._id || item.product,
                                                            size: item.size,
                                                            color: item.color,
                                                            selectedVariants: item.selectedVariants,
                                                            selected: targetChecked
                                                        }));
                                                        await toggleBulkSelection(updates);
                                                    }}
                                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer mr-1"
                                                />
                                                <FiShield className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                                                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                                    Sold by: {group.name}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isActive ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {isActive ? 'Processing Now' : `Next in Queue (${groupIdx + 1}/${vendorIds.length})`}
                                            </span>
                                        </div>
                                        
                                        <div className="divide-y divide-gray-100">
                                            {group.items.map((item) => {
                                                const prod = item.product || {};
                                                const images = prod.images || [];
                                                const hasImage = images.length > 0 || prod.image || prod.media?.length > 0;
                                                const imgUrl = images.length > 0 ? images[0] : (prod.image || prod.media?.[0]?.url);
                                                const itemKey = `${prod._id || item._id}_${item.size || ''}_${item.color || ''}_${JSON.stringify(item.selectedVariants || {})}`;
                                                
                                                return (
                                                    <div key={itemKey} className="py-4 flex flex-row gap-4 items-center first:pt-0 last:pb-0">
                                                        {/* Selection Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={item.selected !== false}
                                                            onChange={(e) => toggleSelection(prod._id || item._id, item.size, item.color, item.selectedVariants, e.target.checked)}
                                                            className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 mr-1 flex-shrink-0 cursor-pointer"
                                                        />

                                                        <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50">
                                                            {hasImage ? (
                                                                <img src={imgUrl} alt={prod.name || prod.title} className="w-full h-full object-cover mix-blend-multiply" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                    <FiShoppingBag size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0 flex flex-col">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{prod.name || prod.title}</h3>
                                                                <button
                                                                    onClick={() => removeFromCart(prod._id || item._id, item.size, item.color, item.selectedVariants)}
                                                                    className="text-gray-400 hover:text-red-500 p-1 transition-colors flex-shrink-0"
                                                                    title="Remove item"
                                                                >
                                                                    <FiTrash size={15} />
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                                {item.size && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Size: {item.size}</span>}
                                                                {item.color && <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Color: {item.color}</span>}
                                                                {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, val]) => (
                                                                    <span key={key} className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{key}: {val}</span>
                                                                ))}
                                                            </div>

                                                            <div className="mt-auto flex items-center justify-between">
                                                                {/* Quantity Selector */}
                                                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-0.5 scale-90 origin-left">
                                                                    <button 
                                                                        onClick={() => handleQuantityChange(prod._id || item._id, item.quantity, -1, item.size, item.color, item.selectedVariants)}
                                                                        className="w-6 h-6 rounded bg-white hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-100 shadow-sm transition-colors disabled:opacity-50"
                                                                        disabled={item.quantity <= 1}
                                                                    >
                                                                        <FiMinus size={12} />
                                                                    </button>
                                                                    <span className="w-6 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                                                                    <button 
                                                                        onClick={() => handleQuantityChange(prod._id || item._id, item.quantity, 1, item.size, item.color, item.selectedVariants)}
                                                                        className="w-6 h-6 rounded bg-white hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-100 shadow-sm transition-colors"
                                                                    >
                                                                        <FiPlus size={12} />
                                                                    </button>
                                                                </div>
                                                                <span className="font-slate-800 font-black text-sm">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="w-full lg:w-[380px] flex-shrink-0">
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-gray-100 p-4 lg:sticky lg:top-[100px] lg:shadow-sm lg:border lg:rounded-2xl lg:p-6 transition-all" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
                        <h3 className="hidden lg:block text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
                            Payment Summary
                        </h3>
                        
                        <div className="hidden lg:flex flex-col gap-4 mb-6">
                            <div className="flex justify-between items-center text-sm text-gray-600 font-semibold">
                                <span>Cart Subtotal</span>
                                <span className="text-gray-900 font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600 font-semibold text-green-600">
                                <span>Delivery</span>
                                <span>Free</span>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Total Amount</span>
                                    <span className="text-lg font-black text-gray-900 tracking-tight">₹{subtotal.toLocaleString('en-IN')}</span>
                                </div>
                                
                                <div className="flex justify-between items-end bg-orange-50 p-3 rounded-lg border border-orange-100">
                                    <div>
                                        <span className="text-[11px] font-black text-primary-600 uppercase tracking-widest block">Advance Payable Now</span>
                                        <span className="text-[10px] text-gray-500 font-bold">₹{advancePerOrder} × {numberOfOrders} Vendor(s)</span>
                                    </div>
                                    <span className="text-xl font-black text-primary-600 tracking-tight">₹{totalAdvance.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold text-right mt-2">Remaining COD: ₹{remainingBalance.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {/* Mobile Compact View */}
                        <div className="lg:hidden flex justify-between items-center mb-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pay Advance</span>
                                <span className="text-xl font-black text-primary-600 tracking-tight">₹{totalAdvance.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block">COD: ₹{remainingBalance.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleCheckout}
                            disabled={selectedIndex === null || selectedIndex >= addresses.length || isPlacingOrder || cartItems.length === 0}
                            className={`w-full text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2 shadow-lg ${selectedIndex === null || selectedIndex >= addresses.length || isPlacingOrder || cartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-[#ff6b00] hover:bg-[#e66000] shadow-orange-200'}`}
                        >
                            {isPlacingOrder ? 'Processing...' : `Pay ₹${totalAdvance.toLocaleString('en-IN')} & Place Order`}
                        </button>
                        
                        <div className="hidden lg:flex items-center justify-center gap-2 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <FiShield size={14} /> Safe and Secure Payments
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default B2BCheckout;
