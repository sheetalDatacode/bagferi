import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiPackage, FiType, FiLayers, FiDollarSign } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getAddonPlans, createAddonPlan, updateAddonPlan, deleteAddonPlan } from "../../../../shared/utils/b2bAddonManager";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const AddonPlans = () => {
    const [plans, setPlans] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        featureType: 'products',
        quantity: 1,
        price: 0,
        isActive: true
    });

    const [globalSettings, setGlobalSettings] = useState(null);
    const [updatingSettings, setUpdatingSettings] = useState(false);

    useEffect(() => {
        loadPlans();
        loadGlobalSettings();
    }, []);

    const loadGlobalSettings = async () => {
        try {
            const response = await api.get('/admin/b2b-settings?forceRefresh=true');
            if (response.success && response.data) {
                console.log('[AddonPlans] Loaded settings:', response.data);
                setGlobalSettings(response.data);
            } else {
                // Fallback to default if record missing or unsuccessful
                setGlobalSettings({ defaultEnquiryPrice: 1 });
            }
        } catch (error) {
            console.error('Failed to load B2B global settings');
            setGlobalSettings({ defaultEnquiryPrice: 1 });
        }
    };

    const handleUpdateGlobalSettings = async () => {
        try {
            setUpdatingSettings(true);
            const response = await api.post('/admin/b2b-settings', globalSettings);
            if (response.success) {
                toast.success('Global B2B settings updated');
                // Refresh to ensure we have the latest version from server
                loadGlobalSettings();
            }
        } catch (error) {
            toast.error('Failed to update global settings');
        } finally {
            setUpdatingSettings(false);
        }
    };


    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await getAddonPlans(true);
            setPlans(data);
        } catch (error) {
            toast.error('Failed to load addon plans');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            featureType: plan.featureType,
            quantity: plan.quantity,
            price: plan.price,
            isActive: plan.isActive
        });
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        

        try {
            const submitData = {
                ...formData,
                quantity: parseInt(formData.quantity) || 0,
                price: parseFloat(formData.price) || 0
            };

            if (editingPlan) {
                await updateAddonPlan(editingPlan._id, submitData);
                toast.success('Addon plan updated');
            } else {
                await createAddonPlan(submitData);
                toast.success('Addon plan created');
            }
            loadPlans();
            setShowForm(false);
            setEditingPlan(null);
            setFormData({
                name: '',
                featureType: 'products',
                quantity: 1,
                price: 0,
                isActive: true
            });
        } catch (error) {
            toast.error(error.message || 'Failed to save plan');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            await deleteAddonPlan(id);
            toast.success('Plan deleted');
            loadPlans();
        } catch (error) {
            toast.error('Failed to delete plan');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="lg:hidden text-2xl font-black text-gray-800 uppercase tracking-tight">Add-on Plans</h1>
                    <p className="text-gray-500 text-sm">Manage extra feature unit packs for vendors.</p>
                </div>

                <button
                    onClick={() => { setEditingPlan(null); setShowForm(true); }}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
                >
                    <FiPlus /> New Add-on
                </button>
            </div>

            {/* Global Settings Section */}
            <div className="bg-white rounded-[2rem] p-6 border-2 border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                            <FiDollarSign />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Global Enquiry Settings</h2>
                            <p className="text-xs text-gray-500 font-medium">Set the fallback price per enquiry unlock when quota is exceeded.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-700">Video Upload</label>
                            <button
                                onClick={() => setGlobalSettings({ ...globalSettings, enableVideoFileUpload: !globalSettings?.enableVideoFileUpload })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    globalSettings?.enableVideoFileUpload !== false ? 'bg-primary-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        globalSettings?.enableVideoFileUpload !== false ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="any"
                                    value={globalSettings ? globalSettings.defaultEnquiryPrice : ''}
                                    placeholder="Loading..."
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setGlobalSettings({ ...globalSettings, defaultEnquiryPrice: val });
                                    }}
                                    className="pl-8 pr-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-primary-500 focus:bg-white outline-none font-bold text-sm w-32"
                                />
                            </div>
                            <button
                                onClick={handleUpdateGlobalSettings}
                                disabled={updatingSettings}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                                    updatingSettings ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200'
                                }`}
                            >
                                {updatingSettings ? <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" /> : <FiSave />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div key={plan._id} className="bg-white rounded-[2rem] p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                                    plan.featureType === 'reels' ? 'bg-rose-50 text-rose-600' :
                                    plan.featureType === 'products' ? 'bg-blue-50 text-blue-600' :
                                    plan.featureType === 'property' ? 'bg-indigo-50 text-indigo-600' :
                                    plan.featureType === 'enquiry' ? 'bg-purple-50 text-purple-600' :
                                    plan.featureType === 'jobs' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-amber-50 text-amber-600'
                                } group-hover:scale-110 transition-transform`}>
                                    <FiPackage />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(plan)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <FiEdit2 />
                                    </button>
                                    <button onClick={() => handleDelete(plan._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-4 tracking-widest">{plan.featureType.replace('_', '/')}</p>
                            
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-black text-gray-900">₹{plan.price}</p>
                                    <p className="text-sm text-gray-500 font-medium">{plan.quantity} Units</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {plan.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400">
                            <FiPackage className="text-5xl mb-4" />
                            <p className="font-bold">No Add-on Plans yet</p>
                            <p className="text-sm">Click the button above to create one.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <FiX />
                            </button>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingPlan ? 'Edit Add-on' : 'New Add-on Plan'}</h2>

                            <form onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2"><FiType /> Plan Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all"
                                        placeholder="e.g. 5 Reels Pack"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2"><FiLayers /> Feature</label>
                                        <select
                                            value={formData.featureType}
                                            onChange={e => setFormData({ ...formData, featureType: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all font-bold text-sm"
                                        >
                                            <option value="products">Products</option>
                                            <option value="reels">Reels</option>
                                            <option value="lot_slot">Lot/Slot</option>
                                            <option value="property">Property</option>
                                            <option value="enquiry">Enquiry</option>
                                            <option value="jobs">Jobs</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">Quantity</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2"><FiDollarSign /> Price (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="any"
                                        value={formData.price}
                                        onWheel={(e) => e.target.blur()}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                                    />
                                </div>

                                {/* Removed Applicable Roles section */}

                                <div className="flex items-center gap-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="addon-active"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-2 border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <label htmlFor="addon-active" className="text-sm font-bold text-gray-700">Display this plan to users</label>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 mt-2"
                                >
                                    <FiSave /> {editingPlan ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AddonPlans;
