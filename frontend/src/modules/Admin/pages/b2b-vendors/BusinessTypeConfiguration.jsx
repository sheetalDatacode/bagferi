import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiEdit2, FiSave, FiCheckCircle, FiXCircle, FiSettings, FiActivity, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getAddonPlans } from "../../../../shared/utils/b2bAddonManager";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const BusinessTypeConfiguration = () => {
    const [businessSettings, setBusinessSettings] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [allAddons, setAllAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSettings, setEditingSettings] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newType, setNewType] = useState({ name: '', description: '' });
    const [newSubType, setNewSubType] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [referralSettings, setReferralSettings] = useState({
        vendorReferrerRewardPoints: 50,
        userReferrerRewardPoints: 50,
        newUserRewardPoints: 25,
        referralMilestoneMin: 10,
    });
    const [savingReferralSettings, setSavingReferralSettings] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!fetchedRef.current) {
            fetchSettings();
            fetchPlans();
            fetchAddons();
            fetchReferralSettings();
            fetchedRef.current = true;
        }
    }, []);

    useEffect(() => {
        if (editingSettings || isAddingNew) {
            document.documentElement.classList.add('no-scroll');
            document.body.classList.add('no-scroll');
        } else {
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');
        };
    }, [editingSettings, isAddingNew]);

    const fetchPlans = async () => {
        try {
            const response = await api.get('/admin/b2b-subscription-plans');
            if (response.success) {
                setAllPlans(response.data);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    };

    const fetchAddons = async () => {
        try {
            const data = await getAddonPlans();
            setAllAddons(data || []);
        } catch (error) {
            console.error('Error fetching addons:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/business-settings');
            if (response.success) {
                setBusinessSettings(response.data);
            }
        } catch (error) {
            console.error('Error fetching business settings:', error);
            toast.error('Failed to load business settings');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        const nameStr = newType.name.trim();
        const descStr = newType.description.trim();

        if (!nameStr) return toast.error('Name is required and cannot be only spaces');
        
        if (/^\d+$/.test(nameStr)) return toast.error('Name cannot be only numbers');
        if (!/[a-zA-Z]/.test(nameStr)) return toast.error('Name must contain letters');
        
        const hasHTML = /<[^>]*>?/gm;
        if (hasHTML.test(nameStr) || hasHTML.test(descStr)) {
            return toast.error('HTML tags are not allowed');
        }

        if (nameStr.length > 50) return toast.error('Name must be 50 characters or less');
        if (descStr.length > 200) return toast.error('Description must be 200 characters or less');

        try {
            const payload = {
                ...newType,
                name: nameStr,
                description: descStr
            };
            const response = await api.post('/business-types/admin', payload);
            if (response.success) {
                toast.success('Business category created');
                setIsAddingNew(false);
                setNewType({ name: '', description: '' });
                fetchSettings();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to create');
        }
    };

    const handleEdit = (settings) => {
        setEditingSettings({
            ...settings,
            dashboardWidgets: Array.isArray(settings.dashboardWidgets) ? settings.dashboardWidgets : [],
            allowedPlans: Array.isArray(settings.allowedPlans) ? settings.allowedPlans : [],
            allowedAddonPlans: Array.isArray(settings.allowedAddonPlans) ? settings.allowedAddonPlans.map(a => String(a._id || a)) : [],
            propertyForms: Array.isArray(settings.propertyForms) ? settings.propertyForms : []
        });
    };

    const fetchReferralSettings = async () => {
        try {
            const response = await api.get('/admin/referral-settings');
            if (response.success && response.data) {
                setReferralSettings({
                    vendorReferrerRewardPoints: Number(response.data.vendorReferrerRewardPoints || 0),
                    userReferrerRewardPoints: Number(response.data.userReferrerRewardPoints || 0),
                    newUserRewardPoints: Number(response.data.newUserRewardPoints || 0),
                    referralMilestoneMin: Number(response.data.referralMilestoneMin || 0),
                });
            }
        } catch (error) {
            console.error('Error fetching referral settings:', error);
            toast.error('Failed to load referral settings');
        }
    };

    const handleSaveReferralSettings = async () => {
        try {
            setSavingReferralSettings(true);
            const payload = {
                vendorReferrerRewardPoints: Number(referralSettings.vendorReferrerRewardPoints || 0),
                userReferrerRewardPoints: Number(referralSettings.userReferrerRewardPoints || 0),
                newUserRewardPoints: Number(referralSettings.newUserRewardPoints || 0),
                referralMilestoneMin: Number(referralSettings.referralMilestoneMin || 0),
            };
            const response = await api.put('/admin/referral-settings', payload);
            if (response.success) {
                toast.success('Referral reward settings updated');
                await fetchReferralSettings();
            }
        } catch (error) {
            console.error('Error updating referral settings:', error);
            toast.error('Failed to update referral settings');
        } finally {
            setSavingReferralSettings(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                enabledModules: Array.isArray(editingSettings.enabledModules) ? editingSettings.enabledModules : [],
                features: editingSettings.features || {},
                isActive: editingSettings.isActive,
                dashboardWidgets: Array.isArray(editingSettings.dashboardWidgets) ? editingSettings.dashboardWidgets : [],
                allowedPlans: Array.isArray(editingSettings.allowedPlans) ? editingSettings.allowedPlans : [],
                allowedAddonPlans: Array.isArray(editingSettings.allowedAddonPlans) ? editingSettings.allowedAddonPlans : [],
                productFormType: editingSettings.productFormType,
                enableShopListing: editingSettings.enableShopListing,
                propertyForms: Array.isArray(editingSettings.propertyForms) ? editingSettings.propertyForms : [],
                businessTypeId: editingSettings.businessTypeId
            };

            const response = await api.put(`/admin/business-settings/update/${editingSettings._id}`, payload);
            if (response.success) {
                toast.success('Settings updated successfully');
                setEditingSettings(null);
                await fetchSettings();
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        }
    };

    const toggleModule = (module) => {
        const currentModules = editingSettings.enabledModules || [];
        const newModules = currentModules.includes(module)
            ? currentModules.filter(m => m !== module)
            : [...currentModules, module];

        setEditingSettings({ ...editingSettings, enabledModules: newModules });
    };

    const toggleWidget = (widget) => {
        const currentWidgets = editingSettings.dashboardWidgets || [];
        const newWidgets = currentWidgets.includes(widget)
            ? currentWidgets.filter(w => w !== widget)
            : [...currentWidgets, widget];

        setEditingSettings({ ...editingSettings, dashboardWidgets: newWidgets });
    };

    const togglePlan = (planId) => {
        const currentPlans = editingSettings.allowedPlans || [];
        const newPlans = currentPlans.includes(planId)
            ? currentPlans.filter(p => p !== planId)
            : [...currentPlans, planId];

        setEditingSettings({ ...editingSettings, allowedPlans: newPlans });
    };

    const toggleAddonStep = (addonId) => {
        const currentAddons = editingSettings.allowedAddonPlans || [];
        const nextAddons = currentAddons.includes(addonId)
            ? currentAddons.filter(a => a !== addonId)
            : [...currentAddons, addonId];
        setEditingSettings({ ...editingSettings, allowedAddonPlans: nextAddons });
    };

    const togglePropertyForm = (formType) => {
        const currentForms = editingSettings.propertyForms || [];
        const nextForms = currentForms.includes(formType)
            ? currentForms.filter(f => f !== formType)
            : [...currentForms, formType];

        setEditingSettings({ ...editingSettings, propertyForms: nextForms });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div></div>

                <button
                    onClick={() => {
                        setNewType({ name: '', description: '' });
                        setIsAddingNew(true);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-black uppercase tracking-widest shadow-sm hover:bg-primary-700 transition-colors"
                >
                    <FiPlus className="mr-2" /> Add Business Type
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Referral Reward Settings</h3>
                        <p className="text-xs text-slate-500">Dynamic points for vendor/user referrals (applies globally).</p>
                    </div>
                    <button
                        onClick={handleSaveReferralSettings}
                        disabled={savingReferralSettings}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-60"
                    >
                        {savingReferralSettings ? 'Saving...' : 'Save Rewards'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Vendor Referrer Points</label>
                        <input
                            type="number"
                            min="0"
                            value={referralSettings.vendorReferrerRewardPoints}
                            onChange={(e) => setReferralSettings((prev) => ({ ...prev, vendorReferrerRewardPoints: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">User Referrer Points</label>
                        <input
                            type="number"
                            min="0"
                            value={referralSettings.userReferrerRewardPoints}
                            onChange={(e) => setReferralSettings((prev) => ({ ...prev, userReferrerRewardPoints: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">New User Points</label>
                        <input
                            type="number"
                            min="0"
                            value={referralSettings.newUserRewardPoints}
                            onChange={(e) => setReferralSettings((prev) => ({ ...prev, newUserRewardPoints: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Milestone Minimum</label>
                        <input
                            type="number"
                            min="0"
                            value={referralSettings.referralMilestoneMin}
                            onChange={(e) => setReferralSettings((prev) => ({ ...prev, referralMilestoneMin: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessSettings.map((settings) => (
                    <motion.div
                        key={settings._id}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 overflow-hidden relative"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center text-xl">
                                <FiSettings />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(settings)}
                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Edit configuration"
                                >
                                    <FiEdit2 />
                                </button>
                                <button
                                    onClick={() => {
                                        setDeleteConfirmId(prev => prev === settings._id ? null : settings._id);
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${deleteConfirmId === settings._id
                                        ? 'text-white bg-red-500 hover:bg-red-600'
                                        : 'text-red-500 hover:bg-red-50'
                                        }`}
                                    title="Delete business type"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1 break-all line-clamp-2" title={settings.businessTypeId?.name}>
                            {settings.businessTypeId?.name?.toUpperCase() === 'TAXTILE' ? 'TEXTILE' : settings.businessTypeId?.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 break-all line-clamp-3" title={settings.businessTypeId?.description}>{settings.businessTypeId?.description}</p>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enabled Modules</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {settings.enabledModules?.map(module => (
                                        <span key={module} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase">
                                            {module === 'lotslot'
                                                ? 'Lot/Slot'
                                                : module === 'shop-listing'
                                                    ? 'Shop'
                                                    : module}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {deleteConfirmId === settings._id && (
                                <div className="mt-2 p-3 rounded-xl border border-red-200 bg-red-50 flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                                        Delete this business type? This cannot be undone.
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const id = settings.businessTypeId?._id;
                                                    if (!id) {
                                                        return toast.error('Business type id not found');
                                                    }
                                                    const response = await api.delete(`/business-types/admin/${id}`);
                                                    if (response.success) {
                                                        toast.success('Business type deleted');
                                                        setBusinessSettings(prev => prev.filter(s => s._id !== settings._id));
                                                        setDeleteConfirmId(null);
                                                    } else {
                                                        toast.error(response.message || 'Failed to delete business type');
                                                    }
                                                } catch (error) {
                                                    toast.error(error.message || 'Failed to delete business type');
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(null)}
                                            className="px-3 py-1.5 rounded-lg bg-white text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Widgets</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {(settings.dashboardWidgets?.length || 0) > 0 ? (
                                        settings.dashboardWidgets.map(widget => (
                                            <span key={widget} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md uppercase border border-blue-100">
                                                {widget.replace('_', ' ')}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic font-medium">No widgets selected</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Property Forms</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {(settings.propertyForms && settings.propertyForms.length > 0) ? (
                                        settings.propertyForms.map((form) => (
                                            <span key={form} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md uppercase border border-emerald-100">
                                                {form}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic font-medium">No forms selected</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <span className="text-xs font-semibold text-gray-600">Status</span>
                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${settings.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                    {settings.isActive ? <FiCheckCircle /> : <FiXCircle />}
                                    {settings.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add New Business Type Modal */}
            {createPortal(
                <AnimatePresence>
                    {isAddingNew && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between bg-white">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                            Add New Business Type
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Create a new business category
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsAddingNew(false);
                                            setNewType({ name: '', description: '' });
                                        }}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                                    >
                                        <FiXCircle size={24} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 custom-scrollbar">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                                Business Type Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newType.name}
                                                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                                placeholder="e.g. Textile Manufacturer"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                                Description (optional)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={newType.description}
                                                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                                                placeholder="Short description to help admins understand this category."
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/50">
                                    <button
                                        onClick={handleCreate}
                                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                                    >
                                        <FiSave /> Save Business Type
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Edit Modal */}
            {createPortal(
                <AnimatePresence>
                    {editingSettings && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                            >
                                {/* Header - Fixed */}
                                <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between bg-white z-10">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                            Configure {editingSettings.businessTypeId?.name?.toUpperCase() === 'TAXTILE' ? 'TEXTILE' : editingSettings.businessTypeId?.name}
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vendor Panel Settings</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingSettings(null)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                                    >
                                        <FiXCircle size={24} />
                                    </button>
                                </div>

                                {/* Body - Scrollable */}
                                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 custom-scrollbar">
                                    {/* Business Type Info (Name & Description) */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                            Business Type Details
                                        </label>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingSettings.businessTypeId?.name || ''}
                                                    onChange={(e) => {
                                                        const current = editingSettings.businessTypeId || {};
                                                        setEditingSettings({
                                                            ...editingSettings,
                                                            businessTypeId: { ...current, name: e.target.value }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                    Description
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={editingSettings.businessTypeId?.description || ''}
                                                    onChange={(e) => {
                                                        const current = editingSettings.businessTypeId || {};
                                                        setEditingSettings({
                                                            ...editingSettings,
                                                            businessTypeId: { ...current, description: e.target.value }
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modules Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Enabled Modules</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {['product', 'property', 'shop-listing', 'lotslot', 'jobs', 'subscription', 'banner', 'notifications', 'profile', 'settings'].map(module => (
                                                <button
                                                    key={module}
                                                    onClick={() => toggleModule(module)}
                                                    className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.enabledModules?.includes(module)
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-primary-300'
                                                }`}
                                        >
                                            {module === 'lotslot'
                                                ? 'Lot/Slot'
                                                : module === 'shop-listing'
                                                    ? 'Shop'
                                                    : module}
                                            {editingSettings.enabledModules?.includes(module) && <FiCheckCircle />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {editingSettings.enabledModules?.includes('property') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Property Form Visibility</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'property', label: 'Property Form' },
                                            { id: 'flat', label: 'Flat Form' },
                                            { id: 'villa', label: 'Villa Form' },
                                            { id: 'plot', label: 'Plot Form' }
                                        ].map((form) => (
                                            <button
                                                key={form.id}
                                                onClick={() => togglePropertyForm(form.id)}
                                                className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.propertyForms?.includes(form.id)
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                    : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-emerald-300'
                                                    }`}
                                            >
                                                {form.label}
                                                {editingSettings.propertyForms?.includes(form.id) && <FiCheckCircle />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dashboard Widgets */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Dashboard Widgets</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {[
                                        { id: 'stats', label: 'Core Stats' },
                                        { id: 'listings_overview', label: 'Inventory' },
                                        { id: 'subscription_status', label: 'Subscriptions' },
                                        { id: 'banner_promo', label: 'Promotion' },
                                        { id: 'alerts', label: 'Action Center' },
                                        { id: 'quick_actions', label: 'Quick Links' },
                                    ].map(widget => (
                                        <button
                                            key={widget.id}
                                            onClick={() => toggleWidget(widget.id)}
                                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-between ${editingSettings.dashboardWidgets?.includes(widget.id)
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-blue-300'
                                                }`}
                                        >
                                            {widget.label}
                                            {editingSettings.dashboardWidgets?.includes(widget.id) && <FiCheckCircle />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Allowed Subscriptions */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Allowed Subscription Plans</label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const allIds = allPlans.map(p => p._id);
                                            const current = editingSettings.allowedPlans || [];
                                            const next = current.length === allIds.length ? [] : allIds;
                                            setEditingSettings({ ...editingSettings, allowedPlans: next });
                                        }}
                                        className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline"
                                    >
                                        {(editingSettings.allowedPlans?.length === allPlans.length && allPlans.length > 0) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {allPlans.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {allPlans.map(plan => (
                                                <button
                                                    key={plan._id}
                                                    onClick={() => togglePlan(plan._id)}
                                                    className={`px-5 py-4 rounded-2xl text-left transition-all border-2 ${editingSettings.allowedPlans?.includes(plan._id)
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                                        : 'bg-slate-50 border-slate-100 text-slate-500 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-black text-sm uppercase tracking-tight">{plan.name}</p>
                                                            <p className="text-[10px] font-bold opacity-70">₹{plan.price} • {plan.duration} Mos</p>
                                                        </div>
                                                        {editingSettings.allowedPlans?.includes(plan._id) && <FiCheckCircle className="text-emerald-600" size={20} />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">No active plans found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Allowed Add-on Packs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Allowed Add-on Power-Ups</label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const allIds = allAddons.map(p => p._id);
                                            const current = editingSettings.allowedAddonPlans || [];
                                            const next = current.length === allIds.length ? [] : allIds;
                                            setEditingSettings({ ...editingSettings, allowedAddonPlans: next });
                                        }}
                                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                    >
                                        {(editingSettings.allowedAddonPlans?.length === allAddons.length && allAddons.length > 0) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {allAddons.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {allAddons.map(addon => (
                                                <button
                                                    key={addon._id}
                                                    onClick={() => toggleAddonStep(addon._id)}
                                                    className={`px-5 py-4 rounded-2xl text-left transition-all border-2 ${editingSettings.allowedAddonPlans?.includes(addon._id)
                                                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                                                        : 'bg-slate-50 border-slate-100 text-slate-500 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-black text-xs uppercase tracking-tight">{addon.name}</p>
                                                            <p className="text-[9px] font-bold opacity-70">
                                                                {addon.quantity} {addon.featureType.toUpperCase()} • ₹{addon.price}
                                                            </p>
                                                        </div>
                                                        {editingSettings.allowedAddonPlans?.includes(addon._id) && <FiCheckCircle className="text-blue-600" size={18} />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">No active addon packs found</p>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Enable extra unit packs (Reels, Product Slots) that vendors in this category can purchase one-time.</p>
                            </div>

                            {/* Features Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Advanced Features</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'canReceiveLeads', label: 'Receive Leads', desc: 'Allow user inquiries as direct leads' },
                                        { id: 'hasPremiumBadge', label: 'Premium Badge', desc: 'Display "Verified Premium" on profile' },
                                        { id: 'canAccessAnalytics', label: 'Access Analytics', desc: 'Show performance metrics in dashboard' },
                                    ].map((feature) => (
                                        <div key={feature.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{feature.label}</p>
                                                <p className="text-[10px] text-slate-500">{feature.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newFeatures = { ...(editingSettings.features || {}) };
                                                    newFeatures[feature.id] = !newFeatures[feature.id];
                                                    setEditingSettings({ ...editingSettings, features: newFeatures });
                                                }}
                                                className={`w-12 h-6 rounded-full p-1 transition-all ${editingSettings.features?.[feature.id] ? 'bg-primary-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${editingSettings.features?.[feature.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Operational Status</p>
                                    <p className="text-xs text-slate-500">Enable or disable this business category site-wide</p>
                                </div>
                                <button
                                    onClick={() => setEditingSettings({ ...editingSettings, isActive: !editingSettings.isActive })}
                                    className={`w-14 h-8 rounded-full p-1 transition-all ${editingSettings.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all transform ${editingSettings.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Product Form Type Selection - Only show if product module is enabled */}
                            {editingSettings.enabledModules?.includes('product') && (
                                <div className="pt-6 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Product Form Layout</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'standard', label: 'Product', desc: 'Single product entry' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setEditingSettings({ ...editingSettings, productFormType: type.id })}
                                                className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${editingSettings.productFormType === type.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-wider mb-1">{type.label}</span>
                                                <span className={`text-[10px] ${editingSettings.productFormType === type.id ? 'text-slate-300' : 'text-slate-400'}`}>{type.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer - Fixed */}
                        <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/50">
                            <button
                                onClick={handleSave}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                <FiSave /> Save Configuration
                            </button>
                        </div>
                    </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default BusinessTypeConfiguration;
