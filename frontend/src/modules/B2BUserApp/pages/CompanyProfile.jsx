import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiMapPin, FiAward, FiEdit2, FiCheck, FiX, FiLoader, FiPlus } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { useAuthStore } from '../../../shared/store/authStore';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { maskPhone } from '../../../shared/utils/helpers';

const CompanyProfile = () => {
    const { user, updateProfile } = useAuthStore();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Form state - mirrors registration fields stored in businessInfo
    const [formData, setFormData] = useState({
        companyName: user?.businessInfo?.companyName || '',
        industry: user?.businessInfo?.industry || 'General Trade',
        companyType: user?.businessInfo?.companyType || 'Retailer',
        gstNumber: user?.businessInfo?.gstNumber || '',
        address: {
            fullAddress: user?.businessInfo?.address?.fullAddress || '',
            city: user?.businessInfo?.address?.city || '',
            state: user?.businessInfo?.address?.state || '',
            pincode: user?.businessInfo?.address?.pincode || ''
        }
    });

    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) return;

            try {
                // Try to fetch addresses from API
                const response = await api.get('/user/addresses');
                if (response.success && response.data && response.data.length > 0) {
                    setAddresses(response.data);
                } else if (user?.businessInfo?.address?.city || user?.businessInfo?.address?.state || user?.businessInfo?.address?.fullAddress) {
                    // Fallback to business info address if availabe
                    const businessAddress = {
                        streetAddress: user.businessInfo.address?.fullAddress || user.businessInfo.address?.city || '',
                        city: user.businessInfo.address?.city || '',
                        state: user.businessInfo.address?.state || '',
                        pincode: user.businessInfo.address?.pincode || '',
                        isDefault: true,
                        addressType: 'Registered'
                    };
                    setAddresses([businessAddress]);
                }
            } catch (error) {
                console.error('Error fetching addresses:', error);

                // Fallback on error
                if (user?.businessInfo?.address?.city || user?.businessInfo?.address?.state || user?.businessInfo?.address?.fullAddress) {
                    const businessAddress = {
                        streetAddress: user.businessInfo.address?.fullAddress || user.businessInfo.address?.city || '',
                        city: user.businessInfo.address?.city || '',
                        state: user.businessInfo.address?.state || '',
                        pincode: user.businessInfo.address?.pincode || '',
                        isDefault: true,
                        addressType: 'Registered'
                    };
                    setAddresses([businessAddress]);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAddresses();
    }, [user]);

    const handleUpdate = async () => {
        if (!formData.companyName.trim()) {
            toast.error('Company name is required');
            return;
        }

        setUpdating(true);
        try {
            const result = await updateProfile({
                businessInfo: {
                    ...user?.businessInfo,
                    companyName: formData.companyName,
                    industry: formData.industry,
                    companyType: formData.companyType,
                    gstNumber: formData.gstNumber,
                    address: {
                        ...(user?.businessInfo?.address || {}),
                        fullAddress: formData.address.fullAddress,
                        city: formData.address.city,
                        state: formData.address.state,
                        pincode: formData.address.pincode
                    }
                }
            });
            if (result.success) {
                toast.success('Company info updated');
                // Update local fallback address if we don't have dedicated addresses
                setAddresses(prev => {
                    if (!prev || prev.length === 0) {
                        return [
                            {
                                streetAddress: formData.address.fullAddress,
                                city: formData.address.city,
                                state: formData.address.state,
                                pincode: formData.address.pincode,
                                isDefault: true,
                                addressType: 'Registered',
                                phone: user?.phone || ''
                            }
                        ];
                    }
                    return prev;
                });
                setIsEditing(false);
            }
        } catch (error) {
            toast.error(error.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Company Profile" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Company Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

                    <div className="relative z-10 flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                                <FiBriefcase size={32} />
                            </div>
                            <div className="space-y-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="text-xl font-extrabold text-gray-800 bg-gray-50 border-b-2 border-primary-500 focus:outline-none px-2 py-1 rounded-t-lg"
                                        placeholder="Enter Company Name"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                                        {user?.businessInfo?.companyName || 'Add Company Name'}
                                    </h2>
                                )}
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    {formData.companyType} • ID #{user?.id?.slice(-6).toUpperCase() || 'N/A'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                            disabled={updating}
                            className={`p-3 rounded-2xl transition-all ${isEditing ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-400 hover:text-primary-600'}`}
                        >
                            {updating ? <FiLoader className="animate-spin" size={20} /> : isEditing ? <FiCheck size={20} /> : <FiEdit2 size={20} />}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">Company Type</p>
                            {isEditing ? (
                                <select
                                    value={formData.companyType}
                                    onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                                    className="w-full bg-transparent font-bold text-gray-800 focus:outline-none"
                                >
                                    <option value="Retailer">Retailer</option>
                                    <option value="Wholesaler">Wholesaler</option>
                                    <option value="Manufacturer">Manufacturer</option>
                                    <option value="Distributor">Distributor</option>
                                </select>
                            ) : (
                                <p className="font-bold text-gray-800">{formData.companyType}</p>
                            )}
                        </div>
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">Industry</p>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="w-full bg-transparent font-bold text-gray-800 focus:outline-none"
                                />
                            ) : (
                                <p className="font-bold text-gray-800">{formData.industry}</p>
                            )}
                        </div>
                    </div>

                    {/* GST & Email (from registration) */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">GST Number</p>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.gstNumber}
                                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                                    className="w-full bg-transparent font-bold text-gray-800 focus:outline-none uppercase"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            ) : (
                                <p className="font-bold text-gray-800 uppercase">
                                    {formData.gstNumber || 'Not Provided'}
                                </p>
                            )}
                        </div>
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">Registered Email</p>
                            <p className="font-bold text-gray-800 break-all">
                                {user?.email || 'N/A'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Contact & Address */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FiMapPin size={20} />
                            </div>
                            Registered Address
                        </h3>
                        {addresses.length > 0 && (
                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full tracking-wider">
                                Primary Address
                            </span>
                        )}
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <FiLoader className="animate-spin text-primary-600" size={24} />
                            </div>
                        ) : defaultAddress ? (
                            <div className="space-y-5">
                                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 relative group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                    <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Full Address</label>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={formData.address.fullAddress}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    address: { ...formData.address, fullAddress: e.target.value }
                                                })}
                                                placeholder="Registered address"
                                                className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={formData.address.city}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        address: { ...formData.address, city: e.target.value }
                                                    })}
                                                    placeholder="City"
                                                    className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.address.state}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        address: { ...formData.address, state: e.target.value }
                                                    })}
                                                    placeholder="State"
                                                    className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.address.pincode}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        address: { ...formData.address, pincode: e.target.value }
                                                    })}
                                                    placeholder="Pincode"
                                                    maxLength={6}
                                                    className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-gray-800 font-bold leading-relaxed">
                                                {defaultAddress.streetAddress || defaultAddress.line1 || user?.businessInfo?.address?.fullAddress}
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                                                <div>
                                                    <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">City</span>
                                                    <p className="text-gray-800 font-bold text-sm">{defaultAddress.city || user?.businessInfo?.address?.city || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">State</span>
                                                    <p className="text-gray-800 font-bold text-sm">{defaultAddress.state || user?.businessInfo?.address?.state || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Pincode</span>
                                                    <p className="text-gray-800 font-bold text-sm">{defaultAddress.pincode || defaultAddress.zipCode || user?.businessInfo?.address?.pincode || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Mobile</label>
                                        <p className="text-gray-800 font-bold">
                                            {defaultAddress.phone || user?.phone
                                                ? maskPhone(defaultAddress.phone || user?.phone)
                                                : 'Not added'}
                                        </p>
                                    </div>
                                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                                        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Type</label>
                                        <p className="text-gray-800 font-bold capitalize">{defaultAddress.addressType || 'Work'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4 shadow-sm">
                                    <FiMapPin size={28} />
                                </div>
                                <h4 className="font-bold text-gray-700 mb-1">No addresses found</h4>
                                <p className="text-xs text-gray-400 font-medium mb-6">Add a registered address to proceed.</p>
                                <button className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-extrabold text-sm hover:bg-primary-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-primary-200">
                                    <FiPlus /> Add Address
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Verification Notice - Informational only */}
                <div className="p-6 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-[2rem] border border-teal-100 flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm flex-shrink-0">
                        <FiAward size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-teal-900 text-sm">Self-Verified Business</h3>
                        <p className="text-[11px] text-teal-700 font-medium leading-tight">Your business details are private and used only for bulk order compliance on Dealing India.</p>
                    </div>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default CompanyProfile;
