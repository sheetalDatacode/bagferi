import React, { useState, useEffect } from 'react';
import { 
    FiSettings, FiPlus, FiTrash2, FiSave, FiCheckCircle, 
    FiXCircle, FiTruck, FiCreditCard, FiRefreshCw, FiPackage,
    FiShield, FiTrendingUp, FiStar, FiAward
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const ICONS = {
    FiCheckCircle: FiCheckCircle,
    FiXCircle: FiXCircle,
    FiTruck: FiTruck,
    FiCreditCard: FiCreditCard,
    FiRefreshCw: FiRefreshCw,
    FiPackage: FiPackage,
    FiShield: FiShield,
    FiTrendingUp: FiTrendingUp,
    FiStar: FiStar,
    FiAward: FiAward
};

const B2BHomeSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [homeFeatures, setHomeFeatures] = useState([]);
    const [advancePaymentAmount, setAdvancePaymentAmount] = useState(200);
    const [advancePaymentCommissionPercentage, setAdvancePaymentCommissionPercentage] = useState(0);
    const [fashionAdvancePaymentAmount, setFashionAdvancePaymentAmount] = useState(200);
    const [fashionPlatformCharge, setFashionPlatformCharge] = useState(0);
    const [groceryAdvancePaymentAmount, setGroceryAdvancePaymentAmount] = useState(20);
    const [groceryPlatformCharge, setGroceryPlatformCharge] = useState(0);
    const [allowFullCod, setAllowFullCod] = useState(true);
    const [codConvenienceFee, setCodConvenienceFee] = useState(20);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/b2b-settings');
            if (res.success && res.data) {
                setHomeFeatures(res.data.homeFeatures || []);
                setAdvancePaymentAmount(res.data.advancePaymentAmount ?? 200);
                setAdvancePaymentCommissionPercentage(res.data.advancePaymentCommissionPercentage ?? 0);
                setFashionAdvancePaymentAmount(res.data.fashionAdvancePaymentAmount ?? 200);
                setFashionPlatformCharge(res.data.fashionPlatformCharge ?? 0);
                setGroceryAdvancePaymentAmount(res.data.groceryAdvancePaymentAmount ?? 20);
                setGroceryPlatformCharge(res.data.groceryPlatformCharge ?? 0);
                setAllowFullCod(res.data.allowFullCod ?? true);
                setCodConvenienceFee(res.data.codConvenienceFee ?? 20);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (homeFeatures.length > 5) {
            toast.error("Maximum 5 features allowed on home page");
            return;
        }

        try {
            setSaving(true);
            const res = await api.post('/admin/b2b-settings', { 
                homeFeatures,
                advancePaymentAmount,
                advancePaymentCommissionPercentage,
                fashionAdvancePaymentAmount,
                fashionPlatformCharge,
                groceryAdvancePaymentAmount,
                groceryPlatformCharge,
                allowFullCod,
                codConvenienceFee
            });
            if (res.success) {
                toast.success('Settings updated successfully!');
                setHomeFeatures(res.data.homeFeatures || []);
                setAdvancePaymentAmount(res.data.advancePaymentAmount ?? 200);
                setAdvancePaymentCommissionPercentage(res.data.advancePaymentCommissionPercentage ?? 0);
                setFashionAdvancePaymentAmount(res.data.fashionAdvancePaymentAmount ?? 200);
                setFashionPlatformCharge(res.data.fashionPlatformCharge ?? 0);
                setGroceryAdvancePaymentAmount(res.data.groceryAdvancePaymentAmount ?? 20);
                setGroceryPlatformCharge(res.data.groceryPlatformCharge ?? 0);
                setAllowFullCod(res.data.allowFullCod ?? true);
                setCodConvenienceFee(res.data.codConvenienceFee ?? 20);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const updateFeature = (index, field, value) => {
        const newFeatures = [...homeFeatures];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setHomeFeatures(newFeatures);
    };

    const removeFeature = (index) => {
        const newFeatures = [...homeFeatures];
        newFeatures.splice(index, 1);
        setHomeFeatures(newFeatures);
    };

    const addFeature = () => {
        if (homeFeatures.length >= 5) {
            toast.error("Maximum 5 features allowed on home page");
            return;
        }
        setHomeFeatures([
            ...homeFeatures, 
            { title: 'New Feature', subtitle: '', iconName: 'FiCheckCircle', isActive: true }
        ]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FiSettings className="text-primary-600 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">B2B Settings</h1>
                        <p className="text-sm text-gray-500">Manage B2B global configurations and home page features</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <FiSave />}
                    Save Changes
                </button>
            </div>

            {/* Global Settings Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-950 uppercase tracking-tight text-sm">Advance Payment & Commission Settings</h2>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Fashion Section */}
                    <div>
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-4 pb-1.5 border-b border-gray-100">Fashion Module Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Fashion Advance Payment Amount (₹)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={fashionAdvancePaymentAmount}
                                    onChange={(e) => setFashionAdvancePaymentAmount(Number(e.target.value))}
                                    className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="e.g. 200"
                                />
                                <p className="text-[10px] text-gray-400 font-medium">Requested from the user before placing a B2B Fashion order.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Fashion Platform Charge / Admin Fee (₹ Flat Amount)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={fashionPlatformCharge}
                                    onChange={(e) => setFashionPlatformCharge(Number(e.target.value))}
                                    className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="e.g. 50"
                                />
                                <p className="text-[10px] text-gray-400 font-medium">Flat amount deducted from the vendor's wallet balance for each Fashion order.</p>
                            </div>
                        </div>
                    </div>

                    {/* Grocery Section */}
                    <div>
                        <h3 className="text-xs font-black text-green-600 uppercase tracking-wider mb-4 pb-1.5 border-b border-gray-100">Grocery Module Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Grocery Advance Payment Amount (₹)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={groceryAdvancePaymentAmount}
                                    onChange={(e) => setGroceryAdvancePaymentAmount(Number(e.target.value))}
                                    className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="e.g. 20"
                                />
                                <p className="text-[10px] text-gray-400 font-medium">Requested from the user before placing a B2B Grocery order.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Grocery Platform Charge / Admin Fee (₹ Flat Amount)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={groceryPlatformCharge}
                                    onChange={(e) => setGroceryPlatformCharge(Number(e.target.value))}
                                    className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    placeholder="e.g. 5"
                                />
                                <p className="text-[10px] text-gray-400 font-medium">Flat amount deducted from the vendor's wallet balance for each Grocery order.</p>
                            </div>
                        </div>
                    </div>

                    {/* Pure COD Configuration Section */}
                    <div>
                        <h3 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-4 pb-1.5 border-b border-gray-100">Cash on Delivery (Full COD) Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <input 
                                    type="checkbox"
                                    id="allowFullCod"
                                    checked={allowFullCod}
                                    onChange={(e) => setAllowFullCod(e.target.checked)}
                                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                                />
                                <label htmlFor="allowFullCod" className="cursor-pointer">
                                    <span className="text-xs font-black uppercase text-gray-700 tracking-wider block">Allow Full COD Option</span>
                                    <span className="text-[10px] text-gray-400 font-bold block">If checked, B2B buyers can choose Full Cash on Delivery at checkout.</span>
                                </label>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-500">COD Convenience Fee (₹)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={codConvenienceFee}
                                    disabled={!allowFullCod}
                                    onChange={(e) => setCodConvenienceFee(Number(e.target.value))}
                                    className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:opacity-50"
                                    placeholder="e.g. 20"
                                />
                                <p className="text-[10px] text-gray-400 font-medium">Convenience fee added to the order total when a user chooses Full COD payment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900">Feature Cards List ({homeFeatures.length})</h2>
                    <button 
                        onClick={addFeature}
                        className="flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <FiPlus /> Add Feature
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    {homeFeatures.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No features added yet.</p>
                    ) : (
                        homeFeatures.map((feature, idx) => (
                            <div key={idx} className={`p-4 border rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center transition-colors ${!feature.isActive ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'}`}>
                                <div className="flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${feature.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {ICONS[feature.iconName] ? React.createElement(ICONS[feature.iconName]) : <FiCheckCircle />}
                                    </div>
                                </div>
                                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-500">Title</label>
                                        <input 
                                            type="text" 
                                            value={feature.title}
                                            onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                                            className="w-full text-sm font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            placeholder="e.g. No return"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-500">Subtitle (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={feature.subtitle}
                                            onChange={(e) => updateFeature(idx, 'subtitle', e.target.value)}
                                            className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            placeholder="e.g. Exchange Shop pr hoga"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100 justify-between md:justify-end">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 block">Icon</label>
                                        <select 
                                            value={feature.iconName}
                                            onChange={(e) => updateFeature(idx, 'iconName', e.target.value)}
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            {Object.keys(ICONS).map(icon => (
                                                <option key={icon} value={icon}>{icon}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={feature.isActive}
                                                onChange={(e) => updateFeature(idx, 'isActive', e.target.checked)}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                            <span className="text-xs font-bold text-gray-600">Active</span>
                                        </label>
                                        
                                        <button 
                                            onClick={() => removeFeature(idx)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Feature"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BHomeSettings;
