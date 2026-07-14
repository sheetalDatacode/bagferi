import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiTruck, FiMapPin, FiPackage, FiInfo } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from '../../../shared/utils/toast';

const SecureDealModal = ({ isOpen, onClose, product, buyer, products = [], onProductSelect, sellerId }) => {
    const [step, setStep] = useState(1); // 1: Options, 2: Form
    const [selectedOption, setSelectedOption] = useState(null);
    const [quantity, setQuantity] = useState(product?.moq || 1);
    const [transport, setTransport] = useState('');
    const [station, setStation] = useState('');
    const [loading, setLoading] = useState(false);
    const [pricePerUnit, setPricePerUnit] = useState(product?.price || 0);

    const totalAmount = quantity * pricePerUnit;

    useEffect(() => {
        if (product) {
            if (product.price) setPricePerUnit(product.price);
            if (product.moq) setQuantity(product.moq);
        } else if (products && products.length > 0) {
            // If no product selected but list exists, pick first
            onProductSelect(products[0]);
        }
    }, [product, products]);

    const handleContinue = () => {
        if (!selectedOption) {
            toast.error('Please select an option to continue');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!quantity || quantity < 1) {
            toast.error('Please enter a valid quantity');
            return;
        }
        if (!transport.trim()) {
            toast.error('Please enter transport details');
            return;
        }
        if (!station.trim()) {
            toast.error('Please enter station details');
            return;
        }

        setLoading(true);
        try {
            const vid = sellerId || product?.vendorId?._id || product?.vendorId?.id || product?.vendorIdRef || product?.vendorId;

            if (!vid) {
                toast.error('Seller identification missing');
                setLoading(false);
                return;
            }

            if (!product?._id) {
                toast.error('Please select a product to proceed');
                setLoading(false);
                return;
            }

            const payload = {
                sellerId: vid,
                productId: product._id,
                productName: product.name,
                quantity: Number(quantity),
                pricePerUnit: Number(pricePerUnit),
                totalAmount: Number(totalAmount),
                transport,
                station, // This is still 'station' in DB but labeled 'Delivery Address' in UI
                selectionOption: selectedOption
            };

            console.log('[SecureDeal] Sending request to /order-deals:', payload);

            const res = await api.post('/order-deals', payload);

            if (res.success) {
                toast.success('Secure Deal request sent to seller!');
                onClose();
            }
        } catch (error) {
            console.error('Error sending secure deal request:', error);
            toast.error(error.response?.data?.message || 'Failed to send request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
            >
                {/* Header */}
                <div className="bg-primary-600 px-8 py-6 flex items-center justify-between text-white">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Secure Deal</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Safe & Trusted B2B Transaction</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Choose Security Option</h3>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => setSelectedOption('min_order')}
                                    className={`relative p-5 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${selectedOption === 'min_order'
                                        ? 'border-primary-600 bg-primary-50/30'
                                        : 'border-gray-100 hover:border-primary-100 hover:bg-gray-50/50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedOption === 'min_order' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                                        }`}>
                                        {selectedOption === 'min_order' && <FiCheck className="text-white text-xs" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm uppercase">Minimum Order ₹25,000 Required</p>
                                        <p className="text-[10px] font-bold text-gray-500 mt-1 leading-relaxed">Secure your deal with a minimum commitment. Direct settlement with seller.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('full_payment')}
                                    className={`relative p-5 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${selectedOption === 'full_payment'
                                        ? 'border-primary-600 bg-primary-50/30'
                                        : 'border-gray-100 hover:border-primary-100 hover:bg-gray-50/50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedOption === 'full_payment' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                                        }`}>
                                        {selectedOption === 'full_payment' && <FiCheck className="text-white text-xs" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm uppercase">Full Payment (Escrow Service)</p>
                                        <p className="text-[10px] font-bold text-gray-500 mt-1 leading-relaxed">Payment will be held in platform escrow and released after goods are received successfully.</p>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={handleContinue}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 mt-4"
                            >
                                Continue to Details
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Order Details</h3>
                                <button onClick={() => setStep(1)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">Change Option</button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Buyer Name</label>
                                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                        <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-black text-gray-500">
                                            {buyer?.name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-xs font-bold text-gray-600">{buyer?.name || 'Authorized Buyer'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Selected Product</label>
                                    {products && products.length > 0 ? (
                                        <div className="relative">
                                            <FiPackage className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600 z-10" />
                                            <select
                                                value={product?._id || ''}
                                                onChange={(e) => {
                                                    const selected = products.find(p => p._id === e.target.value);
                                                    if (onProductSelect) onProductSelect(selected);
                                                    if (selected?.moq) setQuantity(selected.moq);
                                                }}
                                                className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-primary-200 transition-all appearance-none"
                                            >
                                                {products.map((p) => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name} (₹{p.price})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                                            <FiPackage className="text-amber-400" />
                                            <span className="text-xs font-bold text-amber-700">No products available for this vendor</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quantity</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') setQuantity('');
                                                    else setQuantity(Math.max(1, parseInt(val) || 1));
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full p-3.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-primary-200 transition-all"
                                                placeholder="Enter quantity"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Price Per Unit</label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary-600">₹</span>
                                            <input
                                                type="number"
                                                value={pricePerUnit}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') setPricePerUnit('');
                                                    else setPricePerUnit(Math.max(0, parseFloat(val) || 0));
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full pl-8 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-primary-200 transition-all font-sans"
                                                placeholder="Enter unit price"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Total Amount</label>
                                    <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Calculated Total</span>
                                        <span className="text-lg font-black text-primary-600">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Transport</label>
                                    <div className="relative">
                                        <FiTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={transport}
                                            onChange={(e) => setTransport(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-primary-200 transition-all"
                                            placeholder="e.g. Truck, Rail, Private"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Delivery Address (Station)</label>
                                    <div className="relative">
                                        <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={station}
                                            onChange={(e) => setStation(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-primary-200 transition-all"
                                            placeholder="Full Delivery Address"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Send to Seller'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    <FiInfo className="text-primary-500" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Dealing India Escrow ensures 100% payment safety.</p>
                </div>
            </motion.div >
        </div >
    );
};

export default SecureDealModal;
