import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiMapPin, FiAward, FiEdit2, FiCheck, FiX, FiLoader, FiPlus, FiTrash2, FiUser } from 'react-icons/fi';
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

    // Address list states (same as landing page)
    const [showAddAddressForm, setShowAddAddressForm] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({
        streetAddress: '', areaName: '', city: 'Surat', state: 'Gujarat', pincode: '', zoneId: '', addressType: 'Home', isDefault: false
    });
    const [zones, setZones] = useState([]);

    const handleAddNewAddressClick = () => {
        setIsEditingAddress(false);
        setNewAddress({
            streetAddress: '', areaName: '', city: 'Surat', state: 'Gujarat', pincode: '', zoneId: '', addressType: 'Home', isDefault: false
        });
        setShowAddAddressForm(true);
    };

    const handleEditAddressClick = (addr, e) => {
        e.stopPropagation();
        setNewAddress({ ...addr });
        setIsEditingAddress(true);
        setShowAddAddressForm(true);
    };

    const handleDeleteAddress = async (addrId, e) => {
        e.stopPropagation();
        try {
            const updatedAddresses = addresses.filter(addr => addr._id !== addrId);
            const res = await updateProfile({ addresses: updatedAddresses });
            if (res.success) {
                setAddresses(res.user?.addresses || updatedAddresses);
                toast.success('Address deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            toast.error('Failed to delete address');
        }
    };

    const handleAddAddressSubmit = async (e) => {
        e.preventDefault();
        if (!newAddress.streetAddress || !newAddress.pincode || !newAddress.zoneId || !newAddress.areaName) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            if (isEditingAddress) {
                const updatedAddresses = addresses.map(addr => 
                    addr._id === newAddress._id ? { ...newAddress } : addr
                );
                const res = await updateProfile({ addresses: updatedAddresses });
                if (res.success) {
                    toast.success('Address updated successfully');
                    setAddresses(res.user?.addresses || updatedAddresses);
                    setShowAddAddressForm(false);
                    setIsEditingAddress(false);
                    setNewAddress({
                        streetAddress: '', areaName: '', city: 'Surat', state: 'Gujarat', pincode: '', zoneId: '', addressType: 'Home', isDefault: false
                    });
                }
            } else {
                const payload = {
                    ...newAddress,
                    isDefault: addresses.length === 0
                };
                const res = await api.post('/user/addresses', payload);
                if (res.success) {
                    toast.success('Address added successfully');
                    setAddresses(res.data || []);
                    setShowAddAddressForm(false);
                    setNewAddress({
                        streetAddress: '', areaName: '', city: 'Surat', state: 'Gujarat', pincode: '', zoneId: '', addressType: 'Home', isDefault: false
                    });
                }
            }
        } catch (error) {
            console.error('Error adding/updating address:', error);
            toast.error('Failed to save address');
        }
    };

    // Fetch zones when address form is opened
    useEffect(() => {
        if (showAddAddressForm && zones.length === 0) {
            api.get('/zones/public/active')
                .then(res => {
                    if (res.success && res.data) setZones(res.data);
                })
                .catch(err => console.error("Failed to fetch zones:", err));
        }
    }, [showAddAddressForm, zones.length]);

    // Form state - user profile details
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) return;
            try {
                const response = await api.get('/user/addresses');
                if (response.success && response.data) {
                    setAddresses(response.data);
                }
            } catch (error) {
                console.error('Error fetching addresses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAddresses();
    }, [user]);

    const handleUpdate = async () => {
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setUpdating(true);
        try {
            const result = await updateProfile({
                name: formData.name,
                email: formData.email,
                phone: formData.phone
            });
            if (result.success) {
                toast.success('Profile updated successfully');
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
            <B2BHeader title="My Profile" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Personal Profile Details Card */}
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
                                <FiUser size={32} />
                            </div>
                            <div className="space-y-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="text-xl font-extrabold text-gray-800 bg-gray-50 border-b-2 border-primary-500 focus:outline-none px-2 py-1 rounded-t-lg"
                                        placeholder="Enter Full Name"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                                        {formData.name || 'Add Name'}
                                    </h2>
                                )}
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Buyer • ID #{user?.id?.slice(-6).toUpperCase() || 'N/A'}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">Registered Email</p>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-transparent font-bold text-gray-800 focus:outline-none"
                                />
                            ) : (
                                <p className="font-bold text-gray-800">{formData.email || 'N/A'}</p>
                            )}
                        </div>
                        <div className="p-5 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-2">Contact Number</p>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-transparent font-bold text-gray-800 focus:outline-none"
                                />
                            ) : (
                                <p className="font-bold text-gray-800">{formData.phone || 'N/A'}</p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Contact & Address Manager */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FiMapPin size={20} />
                            </div>
                            Saved Addresses
                        </h3>
                        {!showAddAddressForm && (
                            <button
                                onClick={handleAddNewAddressClick}
                                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/25 flex items-center gap-1.5 transition-all"
                            >
                                <FiPlus size={14} /> Add New
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <FiLoader className="animate-spin text-primary-600" size={24} />
                            </div>
                        ) : showAddAddressForm ? (
                            /* Add / Edit Address Form */
                            <form onSubmit={handleAddAddressSubmit} className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                                    <span className="text-xs font-black uppercase text-gray-800 tracking-wider">
                                        {isEditingAddress ? 'Edit Address' : 'Add Delivery Address'}
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setShowAddAddressForm(false);
                                            setIsEditingAddress(false);
                                        }} 
                                        className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Street Address *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newAddress.streetAddress}
                                        onChange={e => setNewAddress({...newAddress, streetAddress: e.target.value})}
                                        placeholder="Shop No, Building, Street" 
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">City *</label>
                                        <input 
                                            type="text" 
                                            readOnly
                                            value={newAddress.city}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-medium outline-none cursor-not-allowed text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">Pincode *</label>
                                        <input 
                                            type="text" 
                                            required
                                            maxLength="6"
                                            value={newAddress.pincode}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setNewAddress({...newAddress, pincode: val, zoneId: '', areaName: ''});
                                            }}
                                            placeholder="e.g. 395006" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-bold text-xs"
                                        />
                                    </div>
                                </div>

                                {newAddress.pincode.length === 6 && (
                                    <div className="space-y-3.5 pt-2 border-t border-gray-100">
                                        {(() => {
                                            const availableZones = zones.filter(z => z.pincodes?.some(p => p.code === newAddress.pincode));
                                            return availableZones.length > 0 ? (
                                                <>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">Select Zone *</label>
                                                        <select 
                                                            required
                                                            value={newAddress.zoneId}
                                                            onChange={e => setNewAddress({...newAddress, zoneId: e.target.value, areaName: ''})}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-medium text-xs"
                                                        >
                                                            <option value="" disabled>Select your zone</option>
                                                            {availableZones.map(z => (
                                                                <option key={z._id} value={z._id}>{z.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {newAddress.zoneId && (
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">Select Area *</label>
                                                            <select 
                                                                required
                                                                value={newAddress.areaName}
                                                                onChange={e => setNewAddress({...newAddress, areaName: e.target.value})}
                                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-medium text-xs"
                                                            >
                                                                <option value="" disabled>Select your area</option>
                                                                {(() => {
                                                                    const zone = zones.find(z => z._id === newAddress.zoneId);
                                                                    if (!zone) return [];
                                                                    const pinData = zone.pincodes?.find(p => p.code === newAddress.pincode);
                                                                    return (pinData?.areas || []).map(a => (
                                                                        <option key={a.name} value={a.name}>{a.name}</option>
                                                                    ));
                                                                })()}
                                                            </select>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="bg-orange-50 text-orange-700 p-3 rounded-xl border border-orange-100 text-xs font-medium">
                                                    No zones available for this pincode.
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">Address Type</label>
                                        <select 
                                            value={newAddress.addressType}
                                            onChange={e => setNewAddress({...newAddress, addressType: e.target.value})}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 font-medium text-xs"
                                        >
                                            <option value="Home">Home</option>
                                            <option value="Work">Work</option>
                                            <option value="Shop">Shop</option>
                                            <option value="Warehouse">Warehouse</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pl-1">Contact Number (Optional)</label>
                                        <input 
                                            type="text" 
                                            maxLength="10"
                                            value={newAddress.phone || ''}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setNewAddress({...newAddress, phone: val});
                                            }}
                                            placeholder="10-digit number" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white transition-all outline-none text-gray-700 text-xs"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full mt-4 py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all"
                                >
                                    {isEditingAddress ? 'Update Address' : 'Save Address'}
                                </button>
                            </form>
                        ) : addresses.length > 0 ? (
                            <div className="space-y-4">
                                {addresses.map(addr => (
                                    <div key={addr._id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 relative group overflow-hidden transition-all hover:bg-white hover:shadow-md">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <span className="text-xs font-black uppercase tracking-wide text-gray-800">{addr.addressType || 'Work'}</span>
                                                {addr.isDefault && <span className="bg-primary-100 text-primary-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Default</span>}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                                <button onClick={(e) => handleEditAddressClick(addr, e)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors bg-white border border-gray-100">
                                                    <FiEdit2 size={12} />
                                                </button>
                                                <button onClick={(e) => handleDeleteAddress(addr._id, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-white border border-gray-100">
                                                    <FiTrash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-800 font-bold leading-relaxed text-sm">
                                            {addr.streetAddress || addr.line1 || user?.businessInfo?.address?.fullAddress}
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 mt-3">
                                            <div>
                                                <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Area / City</span>
                                                <p className="text-gray-800 font-bold text-xs">{addr.areaName || addr.city || '—'}, {addr.city}</p>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">State</span>
                                                <p className="text-gray-800 font-bold text-xs">{addr.state || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Pincode</span>
                                                <p className="text-gray-800 font-bold text-xs">{addr.pincode || addr.zipCode || '—'}</p>
                                            </div>
                                        </div>
                                        {addr.phone && (
                                            <div className="mt-2 text-[10px] text-gray-500 font-medium">
                                                Mobile: {maskPhone(addr.phone)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4 shadow-sm">
                                    <FiMapPin size={28} />
                                </div>
                                <h4 className="font-bold text-gray-700 mb-1">No addresses found</h4>
                                <p className="text-xs text-gray-400 font-medium mb-6">Add a registered address to proceed.</p>
                                <button 
                                    onClick={handleAddNewAddressClick}
                                    className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-extrabold text-sm hover:bg-primary-700 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-primary-200"
                                >
                                    <FiPlus /> Add Address
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default CompanyProfile;
