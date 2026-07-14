import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiSave, FiLock, FiEdit2, FiX } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from '../../../shared/utils/toast';

const B2BPersonalProfile = () => {
    const { user, updateProfile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'name') {
            const alphaValue = value.replace(/[^a-zA-Z\s]/g, '');
            setFormData(prev => ({ ...prev, [name]: alphaValue }));
            return;
        }

        if (name === 'phone') {
            const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCancel = () => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || ''
        });
        setIsEditing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (!formData.phone.trim()) {
            toast.error('Phone number is required');
            return;
        }

        if (formData.phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits');
            return;
        }

        setLoading(true);
        try {
            const result = await updateProfile({
                name: formData.name,
                phone: formData.phone
            });

            if (result.success) {
                toast.success('Profile updated successfully');
                setIsEditing(false);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Personal Profile" showBack={false} />

            <main className="max-w-2xl mx-auto px-4 py-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

                    {/* Edit Profile Button (only in read-only mode) */}
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="absolute top-6 right-6 p-2.5 px-4 bg-primary-50 text-primary-600 rounded-xl font-bold hover:bg-primary-100 transition-all flex items-center gap-2 text-xs shadow-sm z-20"
                        >
                            <FiEdit2 /> Edit Profile
                        </button>
                    )}

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                        <div className="flex justify-center mb-8">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary-100 relative">
                                <span className="text-4xl font-extrabold text-white">
                                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiUser className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none text-sm font-semibold"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl font-semibold text-sm text-gray-700 flex items-center gap-3">
                                        <FiUser className="text-gray-400" />
                                        <span>{formData.name}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                <div className="p-3.5 bg-gray-100 border border-gray-200 rounded-xl font-semibold text-sm text-gray-500 flex items-center justify-between opacity-80">
                                    <div className="flex items-center gap-3">
                                        <FiMail className="text-gray-400" />
                                        <span>{formData.email}</span>
                                    </div>
                                    <FiLock className="text-gray-400" size={14} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 ml-1 italic font-medium">Email cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiPhone className="text-gray-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none text-sm font-semibold"
                                            placeholder="Enter phone number"
                                            maxLength={10}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl font-semibold text-sm text-gray-700 flex items-center gap-3">
                                        <FiPhone className="text-gray-400" />
                                        <span>{formData.phone || 'Not provided'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Edit Mode Actions */}
                        {isEditing && (
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="flex-1 border-2 border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                >
                                    <FiX /> Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-primary-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                                >
                                    <FiSave />
                                    {loading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        )}
                    </form>
                </motion.div>
            </main>
        </div>
    );
};

export default B2BPersonalProfile;
