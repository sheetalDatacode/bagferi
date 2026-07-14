import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiXCircle, FiTrendingUp, FiSettings, FiActivity, FiPlus, FiSave, FiX, FiShoppingBag, FiDownload, FiHome, FiMail, FiBriefcase } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import { getB2BPlans, updateB2BPlan, createB2BPlan, initializeDefaultPlans } from "../../../../shared/utils/b2bPlanManager";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const Subscriptions = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("subscriptions");
    const [subscriptionFilter, setSubscriptionFilter] = useState("all");
    const [plans, setPlans] = useState([]);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [businessSettings, setBusinessSettings] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState("All Business Types");
    const [selectedCity, setSelectedCity] = useState("All Cities");
    const [citySearchQuery, setCitySearchQuery] = useState("");
    const [stats, setStats] = useState({
        active: 0,
        monthlyRevenue: 0,
        expiringSoon: 0,
        totalCollectedRevenue: 0
    });
    const initializedRef = useRef(false);

    // Optimize: Combined initial load into single useEffect with parallel execution
    useEffect(() => {
        const init = async () => {
            try {
                await Promise.all([
                    loadPlans(),
                    loadSubscriptions(),
                    loadBusinessTypes()
                ]);
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };

        if (!initializedRef.current) {
            init();
            initializedRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount



    // Separate effect for subscription filter changes (only when filter changes, not tab)
    useEffect(() => {
        // Only reload subscriptions when filter changes AND we're on subscriptions tab
        if (activeTab === 'subscriptions') {
            loadSubscriptions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscriptionFilter, selectedBusinessType]); // Only depends on filter, not activeTab

    const loadPlans = async () => {
        try {
            setLoading(true);
            // Fetch as admin to see ALL plans and bypass public cache
            const allPlans = await getB2BPlans(true, { isAdmin: true });

            // Sort plans: duration first (ASC), then price (ASC)
            const sortedPlans = [...allPlans].sort((a, b) => {
                if (a.duration !== b.duration) return a.duration - b.duration;
                return a.price - b.price;
            });

            setPlans(sortedPlans);

            // If we don't have any plans, try to initialize defaults
            if (sortedPlans.length === 0) {
                try {
                    await initializeDefaultPlans();
                    const updatedPlans = await getB2BPlans(true, { isAdmin: true });
                    setPlans(updatedPlans.sort((a, b) => {
                        if (a.duration !== b.duration) return a.duration - b.duration;
                        return a.price - b.price;
                    }));
                } catch (error) {
                    console.error('Error initializing default plans:', error);
                }
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPlan = (plan) => {
        setEditingPlan({ 
            ...plan, 
            discount: plan.discount || 0,
            gst: plan.gst || 18
        });
        setShowPlanForm(true);
    };

    const handleSavePlan = async () => {
        if (!editingPlan.name || !editingPlan.price || editingPlan.price <= 0) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const planId = editingPlan._id || editingPlan.id;

            if (planId) {
                // Update existing plan
                await updateB2BPlan(planId, {
                    name: editingPlan.name,
                    price: editingPlan.price,
                    features: editingPlan.features,
                    isActive: editingPlan.isActive,
                    description: editingPlan.description,
                    discount: editingPlan.discount,
                    gst: editingPlan.gst,
                    productLimit: editingPlan.productLimit,
                    reelsLimit: editingPlan.reelsLimit,
                    lotSlotLimit: editingPlan.lotSlotLimit,
                    imagesPerListing: editingPlan.imagesPerListing,
                    propertyLimit: editingPlan.propertyLimit,
                    enquiryLimit: editingPlan.enquiryLimit,
                    jobLimit: editingPlan.jobLimit,
                    shopSlideshow: editingPlan.shopSlideshow,
                });
                toast.success('Plan updated successfully');
            } else {
                // Create new plan
                await createB2BPlan({
                    name: editingPlan.name,
                    duration: editingPlan.duration,
                    price: editingPlan.price,
                    features: editingPlan.features,
                    description: editingPlan.description,
                    discount: editingPlan.discount,
                    gst: editingPlan.gst,
                    productLimit: editingPlan.productLimit,
                    reelsLimit: editingPlan.reelsLimit,
                    lotSlotLimit: editingPlan.lotSlotLimit,
                    imagesPerListing: editingPlan.imagesPerListing,
                    propertyLimit: editingPlan.propertyLimit,
                    enquiryLimit: editingPlan.enquiryLimit,
                    jobLimit: editingPlan.jobLimit,
                    shopSlideshow: editingPlan.shopSlideshow,
                });
                toast.success('Plan created successfully');
            }


            // Reload plans after save
            await loadPlans();
            setShowPlanForm(false);
            setEditingPlan(null);
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error(error.message || 'Failed to save plan');
        }
    };

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...editingPlan.features];
        newFeatures[index] = value;
        setEditingPlan({ ...editingPlan, features: newFeatures });
    };

    const loadBusinessTypes = async () => {
        try {
            const [typesRes, settingsRes] = await Promise.all([
                api.get('/business-types'),
                api.get('/admin/business-settings')
            ]);
            
            if (typesRes.success) {
                setBusinessTypes(typesRes.data || []);
            }
            if (settingsRes.success) {
                setBusinessSettings(settingsRes.data || []);
            }
        } catch (error) {
            console.error('Error loading business data:', error);
        }
    };

    const handleAddFeature = () => {
        setEditingPlan({
            ...editingPlan,
            features: [...editingPlan.features, '']
        });
    };

    const handleRemoveFeature = (index) => {
        const newFeatures = editingPlan.features.filter((_, i) => i !== index);
        setEditingPlan({ ...editingPlan, features: newFeatures });
    };

    const loadSubscriptions = async () => {
        try {
            setSubscriptionsLoading(true);
            const params = new URLSearchParams();
            if (subscriptionFilter !== 'all') params.append('status', subscriptionFilter);
            if (selectedBusinessType !== 'All Business Types') params.append('businessType', selectedBusinessType);

            // Fetch analytics and subscriptions in parallel
            const [analyticsRes, subsRes] = await Promise.all([
                api.get('/subscriptions/analytics'),
                api.get(`/subscriptions/getAllB2BSubscriptions?${params.toString()}`)
            ]);

            if (analyticsRes.success) {
                setStats({
                    active: analyticsRes.activeSubscriptions || 0,
                    monthlyRevenue: parseFloat(analyticsRes.monthlyGrowth.replace('+', '').replace('%', '')) || 0, // Placeholder for actual growth if needed separately
                    expiringSoon: 0, // Need to implement in service if critical
                    totalCollectedRevenue: analyticsRes.totalRevenue || 0,
                    actualMonthlyRevenue: analyticsRes.revenue || 0
                });
            }

            if (subsRes.success) {
                setSubscriptions(subsRes.data || []);
            }
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            toast.error('Failed to load subscriptions');
            setSubscriptions([]);
        } finally {
            setSubscriptionsLoading(false);
        }
    };

    const handleDownloadInvoice = async (invoiceId) => {
        if (!invoiceId) {
            toast.error("Invoice ID not found. The invoice might not have been generated yet.");
            return;
        }

        const toastId = toast.loading("Preparing invoice...");
        try {
            const response = await api.get(`/admin/b2b-vendors/subscriptions/invoice/${invoiceId}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded successfully", { id: toastId });
        } catch (error) {
            console.error('Invoice Download Failed:', error);
            toast.error("Failed to download invoice. Please try again later.", { id: toastId });
        }
    };

    const statsCards = [
        { label: "Active Subscriptions", value: stats.active.toString(), icon: FiCheckCircle, color: "text-green-600", bg: "bg-green-100" },
        { label: "Monthly Revenue", value: `₹${(stats.actualMonthlyRevenue || 0).toLocaleString('en-IN')}`, icon: FiTrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Expiring Soon", value: stats.expiringSoon.toString(), icon: FiActivity, color: "text-orange-600", bg: "bg-orange-100" },
        {
            label: "Total Collection",
            value: `₹${stats.totalCollectedRevenue.toLocaleString('en-IN')}`,
            icon: FiShoppingBag,
            color: "text-purple-600",
            bg: "bg-purple-100",
            clickable: true,
            onClick: () => navigate('/admin/b2b-vendors/subscription-wallet')
        },
    ];

    const columns = [
        {
            key: "vendorName",
            label: "Vendor",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val}</span>
                    <span className="text-[10px] text-gray-400 font-medium uppercase">{row.businessType || 'B2B Vendor'}</span>
                </div>
            )
        },
        {
            key: "plan",
            label: "Plan",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${val.toLowerCase().includes('premium') ? 'bg-purple-100 text-purple-700' :
                    val.toLowerCase().includes('diamond') ? 'bg-blue-100 text-blue-700' :
                        val.toLowerCase().includes('silver') ? 'bg-gray-100 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                    }`}>
                    {val}
                </span>
            )
        },
        {
            key: "billingCycle",
            label: "Cycle"
        },
        {
            key: "amount",
            label: "Amount",
            render: (val) => <span className="font-bold text-gray-700">₹{typeof val === 'number' ? val.toLocaleString('en-IN') : val}</span>
        },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${val === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {val === 'Active' ? <FiCheckCircle /> : <FiXCircle />}
                    {val}
                </span>
            )
        },
        { key: "expiryDate", label: "Expiry" },
        {
            key: "actions",
            label: "Actions",
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (row.vendorId) {
                                navigate(`/admin/b2b-vendors/manage/${row.vendorId}/dashboard`);
                            } else {
                                toast.error("Vendor associated with this subscription not found");
                            }
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Vendor Dashboard"
                    >
                        <FiEye />
                    </button>
                    {row.zohoInvoiceId && (
                        <button
                            onClick={() => handleDownloadInvoice(row.zohoInvoiceId)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Download Current Invoice"
                        >
                            <FiDownload />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // City dropdown options derived from subscriptions
    const cityOptions = useMemo(() => {
        const citySet = new Set();
        subscriptions.forEach(sub => {
            const city = (sub.vendorCity || '').trim();
            if (city) citySet.add(city);
        });
        const cities = Array.from(citySet).sort();
        return ['All Cities', ...cities];
    }, [subscriptions]);

    const filteredCityOptions = useMemo(() => {
        if (!citySearchQuery.trim()) return cityOptions;
        const q = citySearchQuery.toLowerCase();
        return cityOptions.filter(city => city.toLowerCase().includes(q));
    }, [cityOptions, citySearchQuery]);

    // Apply city + search filtering on subscriptions list
    const filteredSubscriptions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (subscriptions || []).filter(sub => {
            const city = (sub.vendorCity || '').trim();
            const cityMatch = selectedCity === 'All Cities' || city === selectedCity;
            const typeMatch = selectedBusinessType === 'All Business Types' || sub.businessType === selectedBusinessType;

            if (!q) return cityMatch && typeMatch;

            const vendorName = (sub.vendorName || sub.vendor || '').toLowerCase();
            const email = (sub.vendorEmail || '').toLowerCase();
            const plan = (sub.plan || '').toLowerCase();

            const searchMatch =
                vendorName.includes(q) ||
                email.includes(q) ||
                plan.includes(q);

            return cityMatch && typeMatch && searchMatch;
        });
    }, [subscriptions, selectedCity, searchQuery, selectedBusinessType]);


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div></div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <select
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm font-bold text-gray-700 outline-none"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                        >
                            {filteredCityOptions.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Search city..."
                            className="px-3 py-2 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-xs text-gray-700"
                            value={citySearchQuery}
                            onChange={(e) => setCitySearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm font-bold text-gray-700 outline-none"
                        value={selectedBusinessType}
                        onChange={(e) => setSelectedBusinessType(e.target.value)}
                    >
                        <option value="All Business Types">All Business Types</option>
                        {businessTypes.map(type => (
                            <option key={type._id} value={type.name}>{type.name}</option>
                        ))}
                    </select>
                    <div className="relative w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-sm text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        onClick={stat.onClick}
                        className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 ${stat.clickable ? 'cursor-pointer hover:border-purple-200 transition-all' : ''}`}
                    >
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                            <stat.icon />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-6 mb-8 border-b border-gray-50">
                    {[
                        { id: "subscriptions", label: "Subscriptions" },
                        { id: "plans", label: "Plan Management" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === "subscriptions" ? (
                    <>
                        <div className="flex items-center gap-6 mb-8 border-b border-gray-50">
                            {["all", "active", "expired", "pending"].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setSubscriptionFilter(filter)}
                                    className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${subscriptionFilter === filter ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {filter}
                                    {subscriptionFilter === filter && (
                                        <motion.div layoutId="activeFilter" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {subscriptionsLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500">Loading subscriptions...</p>
                            </div>
                        ) : filteredSubscriptions.length === 0 ? (
                            <div className="text-center py-12">
                                <FiCheckCircle className="text-gray-300 text-5xl mx-auto mb-4" />
                                <p className="text-gray-500">No subscriptions found</p>
                            </div>
                        ) : (
                            <DataTable
                                data={filteredSubscriptions}
                                columns={columns}
                                pagination={true}
                                itemsPerPage={10}
                            />
                        )}
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Manage Subscription Plans</h2>
                                <p className="text-sm text-gray-500 mt-1">Configure 3, 6, and 12 months subscription plans for B2B vendors</p>
                            </div>
                        </div>

                        {/* Plans Grid */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500">Loading plans...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {plans.map((plan) => (
                                    <motion.div
                                        key={plan._id || plan.id}
                                        whileHover={{ y: -5 }}
                                        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                                                <p className="text-2xl font-extrabold text-slate-800 mt-2">
                                                    ₹{plan.price.toLocaleString('en-IN')}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                        ₹{Math.round((Math.max(0, (plan.price || 0) - (plan.discount || 0))) * (1 + (plan.gst || 18) / 100)).toLocaleString('en-IN')} Total (Inc. GST)
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEditPlan(plan)}
                                                disabled={loading}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <FiEdit2 />
                                            </button>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {plan.features && plan.features.slice(0, 3).map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                            {plan.features && plan.features.length > 3 && (
                                                <p className="text-xs text-gray-400">+{plan.features.length - 3} more features</p>
                                            )}
                                        </div>

                                        <div className={`px-3 py-1 rounded-full text-xs font-bold text-center ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {plan.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Plan Edit Modal */}
            {showPlanForm && editingPlan && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Edit {editingPlan.name}</h2>
                            <button
                                onClick={() => {
                                    setShowPlanForm(false);
                                    setEditingPlan(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500"
                                    placeholder="e.g., 3 Months Plan"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Months)</label>
                                <input
                                    type="number"
                                    value={editingPlan.duration}
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Duration cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                                <input
                                    type="number"
                                    value={editingPlan.price}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 font-bold"
                                    placeholder="9999"
                                    min="0"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-tighter">Discount (₹)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.discount}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, discount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 font-bold"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-tighter">GST (%)</label>
                                    <input
                                        type="number"
                                        value={editingPlan.gst}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, gst: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-500 font-bold"
                                        placeholder="18"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="bg-primary-50 p-6 rounded-[2rem] border-2 border-primary-100 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                                <div className="text-center md:text-left">
                                    <p className="text-xs font-black text-primary-600 uppercase tracking-widest leading-none">Net Subscription Value</p>
                                    <p className="text-[10px] text-primary-400 font-bold mt-1">(Base Price - Discount) + GST</p>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-3xl font-black text-primary-700 leading-none">
                                        ₹{Math.round((Math.max(0, (editingPlan.price || 0) - (editingPlan.discount || 0))) * (1 + (editingPlan.gst || 0) / 100)).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mt-2 bg-white/50 px-2 py-1 rounded-full inline-block">Will create/update Razorpay Plan</p>
                                </div>
                            </div>

                            {/* Structured Feature Configuration */}
                            <div className="bg-slate-50 rounded-3xl p-6 space-y-6 border border-slate-100">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <FiSettings className="text-primary-600" /> Feature Power Configuration
                                </h3>
                                
                                <div className="space-y-4">
                                    {[
                                        { id: 'productLimit', label: 'Product Listings', icon: FiShoppingBag },
                                        { id: 'propertyLimit', label: 'Property Listings', icon: FiHome },
                                        { id: 'reelsLimit', label: 'Video Reels', icon: FiActivity },
                                        { id: 'lotSlotLimit', label: 'Lot/Slot Pack', icon: FiPlus },
                                        { id: 'imagesPerListing', label: 'Images per Listing', icon: FiSettings },
                                        { id: 'enquiryLimit', label: 'Enquiries per Cycle', icon: FiMail },
                                        { id: 'jobLimit', label: 'Job Listings', icon: FiBriefcase },
                                    ].map(feat => {
                                        const val = editingPlan[feat.id];
                                        const isEnabled = val !== 0 && val !== false;
                                        const isUnlimited = val === 'unlimited';
                                        
                                        return (
                                            <div key={feat.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-[180px]">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isEnabled}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setEditingPlan({ ...editingPlan, [feat.id]: checked ? (feat.id === 'imagesPerListing' ? 5 : 10) : 0 });
                                                        }}
                                                        className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-slate-300"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <feat.icon className={`text-lg ${isEnabled ? 'text-primary-600' : 'text-slate-400'}`} />
                                                        <span className={`font-bold text-sm ${isEnabled ? 'text-slate-800' : 'text-slate-400'}`}>{feat.label}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 flex-1 justify-end">
                                                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase px-2">Unlimited</label>
                                                        <button
                                                            onClick={() => {
                                                                if (!isEnabled) return;
                                                                setEditingPlan({ ...editingPlan, [feat.id]: isUnlimited ? 10 : 'unlimited' });
                                                            }}
                                                            disabled={!isEnabled}
                                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${!isEnabled ? 'bg-slate-200 cursor-not-allowed' : isUnlimited ? 'bg-primary-600' : 'bg-slate-300'}`}
                                                        >
                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isUnlimited ? 'left-7' : 'left-1'}`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            value={isUnlimited ? "Unlimited" : (val === 0 ? "" : val)}
                                                            disabled={!isEnabled || isUnlimited}
                                                            onChange={(e) => {
                                                                const text = e.target.value;
                                                                if (text === "") {
                                                                    setEditingPlan({ ...editingPlan, [feat.id]: 0 });
                                                                    return;
                                                                }
                                                                const n = parseInt(text);
                                                                if (!isNaN(n)) {
                                                                    setEditingPlan({ ...editingPlan, [feat.id]: Math.max(0, n) });
                                                                }
                                                            }}
                                                            placeholder={isUnlimited ? "∞" : "Enter count..."}
                                                            className="w-32 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-left focus:border-primary-500 disabled:opacity-50 disabled:bg-slate-100 text-slate-800"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Per Cycle</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Additional Feature Settings: Enquiry Price */}
                                    {editingPlan.enquiryLimit !== 0 && editingPlan.enquiryLimit !== 'unlimited' && (
                                        <div className="bg-primary-50 p-4 rounded-2xl border border-primary-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <FiTrendingUp className="text-primary-600 text-lg" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800">Price per Enquiry (Wallet)</span>
                                                    <p className="text-[10px] text-primary-600 font-medium uppercase tracking-tight">Applied after plan limit is reached</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-400">₹</span>
                                                <input 
                                                    type="number"
                                                    value={editingPlan.enquiryPrice || 0}
                                                    onChange={(e) => setEditingPlan({ ...editingPlan, enquiryPrice: parseFloat(e.target.value) || 0 })}
                                                    className="w-32 px-4 py-3 bg-white border-2 border-primary-100 rounded-xl font-black text-left focus:border-primary-500 text-slate-800"
                                                    placeholder="e.g. 5"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Boolean Feature: Shop Slideshow */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox"
                                                checked={!!editingPlan.shopSlideshow}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, shopSlideshow: e.target.checked })}
                                                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-slate-300"
                                            />
                                            <div className="flex items-center gap-2">
                                                <FiEye className={`text-lg ${editingPlan.shopSlideshow ? 'text-primary-600' : 'text-slate-400'}`} />
                                                <span className={`font-bold text-sm ${editingPlan.shopSlideshow ? 'text-slate-800' : 'text-slate-400'}`}>Shop Slideshow / Header Video</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${editingPlan.shopSlideshow ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {editingPlan.shopSlideshow ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">Public Feature Badge List (Display Only)</label>
                                    <button
                                        onClick={handleAddFeature}
                                        className="text-primary-600 hover:text-primary-700 text-xs font-bold flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-full"
                                    >
                                        <FiPlus /> Add Display Perk
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {editingPlan.features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                className="flex-1 px-3 py-1.5 bg-white border-2 border-gray-100 rounded-lg focus:border-primary-500 text-sm"
                                                placeholder="e.g., 24/7 Support"
                                            />
                                            <button
                                                onClick={() => handleRemoveFeature(index)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={editingPlan.isActive}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                                    Plan is Active
                                </label>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    onClick={handleSavePlan}
                                    className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FiSave /> Save Plan
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPlanForm(false);
                                        setEditingPlan(null);
                                    }}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default Subscriptions;
