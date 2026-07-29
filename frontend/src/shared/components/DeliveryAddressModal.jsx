import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin } from 'react-icons/fi';
import { useAuthStore } from '../../shared/store/authStore';
import toast from 'react-hot-toast';
import api from '../../shared/utils/api';
import { useLocation } from 'react-router-dom';

const DeliveryAddressModal = () => {
    const { user, isAuthenticated, initialize } = useAuthStore();
    const location = useLocation();
    
    // Only show for B2B user routes
    const isB2BRoute = location.pathname.startsWith('/b2b') && !location.pathname.startsWith('/b2b-vendor');
    
    const needsAddress = isAuthenticated && user?.role === 'user' && (!user.addresses || user.addresses.length === 0);
    
    const [isOpen, setIsOpen] = useState(false);
    const [zones, setZones] = useState([]);
    const [loadingZones, setLoadingZones] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        streetAddress: '',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '',
        zoneId: '',
        areaName: ''
    });

    useEffect(() => {
        if (isB2BRoute && needsAddress) {
            setIsOpen(true);
            fetchZones();
        } else {
            setIsOpen(false);
        }
    }, [isB2BRoute, needsAddress]);

    const fetchZones = async () => {
        setLoadingZones(true);
        try {
            const response = await api.get('/zones/public/active');
            if (response.success && response.data) {
                setZones(response.data);
            }
        } catch (err) {
            console.error("Failed to fetch zones:", err);
            toast.error("Failed to load delivery zones");
        } finally {
            setLoadingZones(false);
        }
    };

    // Get areas for the entered pincode from all matching zones
    const getAvailableAreas = () => {
        if (!formData.pincode || formData.pincode.length !== 6) return [];
        const matchingPins = zones.flatMap(z => z.pincodes || []).filter(p => p.code === formData.pincode);
        const allAreas = matchingPins.flatMap(p => p.areas || []);
        // Remove duplicate area names
        const uniqueAreas = Array.from(new Set(allAreas.map(a => a.name)))
            .map(name => allAreas.find(a => a.name === name));
        return uniqueAreas;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.streetAddress || !formData.pincode || !formData.areaName) {
            toast.error("Please fill all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post('/auth/user/addresses', {
                ...formData,
                isDefault: true,
                addressType: 'Work'
            });
            
            if (response.success) {
                toast.success("Delivery address saved successfully!");
                await initialize(); // Refresh user state
                setIsOpen(false);
            }
        } catch (err) {
            console.error("Address save error:", err);
            toast.error(err?.response?.data?.message || "Failed to save address");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
                >
                    <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <FiMapPin className="text-3xl" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Delivery Location</h2>
                        <p className="text-primary-100 text-sm mt-1">Please set your delivery address to see available products in your area.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Street Address <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                required
                                value={formData.streetAddress}
                                onChange={e => setFormData({...formData, streetAddress: e.target.value})}
                                placeholder="Shop No, Building, Street" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">City <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    readOnly
                                    value={formData.city}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-medium outline-none cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Pincode <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    required
                                    maxLength="6"
                                    value={formData.pincode}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({...formData, pincode: val, zoneId: '', areaName: ''});
                                    }}
                                    placeholder="e.g. 395006" 
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-bold"
                                />
                            </div>
                        </div>

                        {formData.pincode.length === 6 && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Select Area / Locality <span className="text-red-500">*</span></label>
                                {(() => {
                                    const availableAreas = getAvailableAreas();
                                    return availableAreas.length > 0 ? (
                                        <select 
                                            required
                                            value={formData.areaName}
                                            onChange={e => {
                                                const matchedZone = zones.find(z => 
                                                    z.pincodes?.some(p => 
                                                        p.code === formData.pincode && p.areas?.some(a => a.name === e.target.value)
                                                    )
                                                );
                                                setFormData({
                                                    ...formData, 
                                                    areaName: e.target.value,
                                                    zoneId: matchedZone ? matchedZone._id : ''
                                                });
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-medium appearance-none"
                                        >
                                            <option value="" disabled>Select your area</option>
                                            {availableAreas.map(a => (
                                                <option key={a.name} value={a.name}>{a.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-100 text-sm font-medium">
                                            Sorry, no areas available for this pincode.
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={submitting || !formData.areaName}
                                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Save & Continue'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DeliveryAddressModal;
