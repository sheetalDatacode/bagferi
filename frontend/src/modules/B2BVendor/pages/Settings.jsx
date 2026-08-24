import { useState, useEffect } from "react";
import { FiUser, FiBell, FiLock, FiShield, FiSave } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "../../../shared/utils/toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import api from "../../../shared/utils/api";

const B2BVendorSettings = () => {
    const { vendor, updateProfile } = useB2BVendorAuthStore();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        storeName: "",
        gstNumber: "",
        mfgOfWork: "",
        businessType: "",
        address: {
            street: "",
            area: "",
            market: "",
            landmark: "",
            city: "",
            state: "",
            pincode: "",
            country: "India"
        },
        bankDetails: {
            bankName: "",
            accountHolderName: "",
            accountNumber: "",
            ifscCode: ""
        }
    });

    // Initialize form data from vendor
    useEffect(() => {
        if (vendor) {
            const address = vendor.address || {};
            setFormData({
                name: vendor.name || "",
                email: vendor.email || "",
                phone: vendor.phone || "",
                storeName: vendor.storeName || "",
                gstNumber: vendor.gstNumber || "",
                mfgOfWork: vendor.mfgOfWork || "",
                businessType: vendor.businessType || "",
                address: {
                    street: address.street || "",
                    area: address.area || "",
                    market: address.market || "",
                    landmark: address.landmark || "",
                    city: address.city || "",
                    state: address.state || "",
                    pincode: address.pincode || address.zipCode || "",
                    country: address.country || "India"
                },
                bankDetails: {
                    bankName: vendor.bankDetails?.bankName || "",
                    accountHolderName: vendor.bankDetails?.accountHolderName || "",
                    accountNumber: vendor.bankDetails?.accountNumber || "",
                    ifscCode: vendor.bankDetails?.ifscCode || ""
                }
            });
        }
    }, [vendor]);

    const tabs = [
        { id: "profile", label: "Business Profile", icon: FiUser },
        { id: "platformCharges", label: "Platform Rates & Payments", icon: FiShield }
    ];

    const [b2bSettings, setB2bSettings] = useState(null);

    useEffect(() => {
        const fetchB2bSettings = async () => {
            try {
                const res = await api.get('/public/b2b-settings');
                if (res.success) {
                    setB2bSettings(res.data);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchB2bSettings();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Handle nested address fields
        if (name.startsWith('address.')) {
            const addressField = name.split('.')[1];
            let finalValue = value;

            // Fix state field spaces and invalid characters (allow only letters and spaces)
            if (addressField === 'state') {
                finalValue = value.replace(/[^a-zA-Z\s]/g, '');
            }

            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressField]: finalValue
                }
            }));
        } else if (name.startsWith('bankDetails.')) {
            const bankField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                bankDetails: {
                    ...prev.bankDetails,
                    [bankField]: value
                }
            }));
        } else if (name === 'gstNumber') {
            const cleaned = value.toUpperCase().trim().slice(0, 15);
            setFormData(prev => ({
                ...prev,
                [name]: cleaned
            }));
        } else if (name === 'name') {
            // Only allow alphabets and spaces
            const cleaned = value.replace(/[^a-zA-Z\s]/g, '');
            setFormData(prev => ({
                ...prev,
                [name]: cleaned
            }));
        } else if (name === 'phone') {
            // Only allow 10 digits
            const cleaned = value.replace(/[^0-9]/g, '').slice(0, 10);
            setFormData(prev => ({
                ...prev,
                [name]: cleaned
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };


    const handleSave = async () => {
        if (!vendor) {
            toast.error("Vendor information not available");
            return;
        }

        const isSpecialCharOnly = (str) => {
            if (!str) return false;
            return !/[a-zA-Z0-9]/.test(str);
        };

        if (!formData.name.trim()) {
            toast.error("Contact Person Name is required");
            return;
        }

        if (isSpecialCharOnly(formData.name)) {
            toast.error("Contact Person Name cannot contain only special characters");
            return;
        }

        if (!formData.storeName.trim()) {
            toast.error("Company Name is required");
            return;
        }

        if (isSpecialCharOnly(formData.storeName)) {
            toast.error("Company Name cannot contain only special characters");
            return;
        }

        if (formData.mfgOfWork && isSpecialCharOnly(formData.mfgOfWork)) {
            toast.error("Mfg Of Work cannot contain only special characters");
            return;
        }

        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.error("Phone number must be exactly 10 digits");
            return;
        }


        // GST Validation
        if (formData.gstNumber) {
            const cleanGst = formData.gstNumber.trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(cleanGst)) {
                toast.error('Please enter a valid GST number format');
                return;
            }
        }

        setLoading(true);
        try {
            // Validate required address fields
            if (!formData.address.city?.trim() || !formData.address.state?.trim()) {
                toast.error("City and State are required");
                setLoading(false);
                return;
            }

            // Validate address fields for special characters
            const addressFieldsToCheck = [
                { key: 'street', label: 'Street Address' },
                { key: 'area', label: 'Area / Locality' },
                { key: 'market', label: 'Market' },
                { key: 'landmark', label: 'Landmark' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'country', label: 'Country' }
            ];

            for (const field of addressFieldsToCheck) {
                if (formData.address[field.key] && isSpecialCharOnly(formData.address[field.key])) {
                    toast.error(`${field.label} cannot contain only special characters`);
                    setLoading(false);
                    return;
                }
            }

            // Clean and prepare address object
            const address = {
                street: (formData.address.street || "").trim(),
                area: (formData.address.area || "").trim(),
                market: (formData.address.market || "").trim(),
                landmark: (formData.address.landmark || "").trim(),
                city: (formData.address.city || "").trim(),
                state: (formData.address.state || "").trim(),
                pincode: (formData.address.pincode || "").trim(),
                country: (formData.address.country || "India").trim()
            };

            const updateData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                storeName: formData.storeName.trim(),
                gstNumber: formData.gstNumber.trim(),
                mfgOfWork: formData.mfgOfWork.trim(),
                address: address,
                bankDetails: {
                    bankName: formData.bankDetails.bankName.trim(),
                    accountHolderName: formData.bankDetails.accountHolderName.trim(),
                    accountNumber: formData.bankDetails.accountNumber.trim(),
                    ifscCode: formData.bankDetails.ifscCode.trim()
                }
            };

            await updateProfile(updateData);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
                <p className="text-gray-500">Manage your business account and preferences.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Tabs */}
                <div className="lg:w-64 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? "bg-primary-600 text-white shadow-md shadow-primary-200"
                                : "text-gray-500 hover:bg-slate-50 hover:text-gray-700"
                                }`}
                        >
                            <tab.icon className="text-xl" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                    {activeTab === "profile" && (
                        <div className="space-y-8">
                            {/* Contact Information */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-primary-600 rounded-full"></div>
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name (Contact Person)</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed contact support.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Business Information */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    Business Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                                        <input
                                            type="text"
                                            name="storeName"
                                            value={formData.storeName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Number</label>
                                        <input
                                            type="text"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter GST number (optional)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mfg Of Work</label>
                                        <input
                                            type="text"
                                            name="mfgOfWork"
                                            value={formData.mfgOfWork}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter Mfg Of Work"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Type</label>
                                        <input
                                            type="text"
                                            value={formData.businessType}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div>
                                    Business Address
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Street Address</label>
                                        <input
                                            type="text"
                                            name="address.street"
                                            value={formData.address.street}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Street Address"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Market</label>
                                        <input
                                            type="text"
                                            name="address.market"
                                            value={formData.address.market}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Market Name (Optional)"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Landmark</label>
                                        <input
                                            type="text"
                                            name="address.landmark"
                                            value={formData.address.landmark}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Landmark (Optional)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Area / Locality</label>
                                        <input
                                            type="text"
                                            name="address.area"
                                            value={formData.address.area}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Area / Locality"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">City</label>
                                        <input
                                            type="text"
                                            name="address.city"
                                            value={formData.address.city}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">State</label>
                                        <input
                                            type="text"
                                            name="address.state"
                                            value={formData.address.state}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="State"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Pincode</label>
                                        <input
                                            type="text"
                                            name="address.pincode"
                                            value={formData.address.pincode}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Pincode"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase">Country</label>
                                        <input
                                            type="text"
                                            name="address.country"
                                            value={formData.address.country}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Country"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Bank Details */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-green-600 rounded-full"></div>
                                    Bank Details (For Payments & Settlements)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bank Name</label>
                                        <input
                                            type="text"
                                            name="bankDetails.bankName"
                                            value={formData.bankDetails?.bankName || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors font-semibold"
                                            placeholder="Enter Bank Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Holder Name</label>
                                        <input
                                            type="text"
                                            name="bankDetails.accountHolderName"
                                            value={formData.bankDetails?.accountHolderName || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors font-semibold"
                                            placeholder="Enter Account Holder Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Number</label>
                                        <input
                                            type="text"
                                            name="bankDetails.accountNumber"
                                            value={formData.bankDetails?.accountNumber || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors font-mono font-semibold"
                                            placeholder="Enter Account Number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">IFSC Code</label>
                                        <input
                                            type="text"
                                            name="bankDetails.ifscCode"
                                            value={formData.bankDetails?.ifscCode || ""}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors font-mono font-semibold"
                                            placeholder="Enter IFSC Code"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === "platformCharges" && (
                        <div className="space-y-8 text-left">
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                    B2B Platform Rates & Payment Policies
                                </h3>
                                <p className="text-xs text-gray-500 mb-6">
                                    These are the current platform charges and advance payment settings configured by the administration.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Fashion Card */}
                                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">👔</span>
                                            <div>
                                                <h4 className="font-black text-gray-950 uppercase tracking-tight text-sm">Fashion Category</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Apparel, Footwear, etc.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Advance Payment Required:</span>
                                                <span className="font-bold text-gray-900">₹{b2bSettings?.fashionAdvancePaymentAmount ?? 200}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Platform Charge (Flat Fee):</span>
                                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs">
                                                    ₹{b2bSettings?.fashionPlatformCharge ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grocery Card */}
                                    <div className="bg-green-50/40 border border-green-100 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl">🍎</span>
                                            <div>
                                                <h4 className="font-black text-gray-950 uppercase tracking-tight text-sm">Grocery Category</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fresh produce, Packaged Goods, etc.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Advance Payment Required:</span>
                                                <span className="font-bold text-gray-900">₹{b2bSettings?.groceryAdvancePaymentAmount ?? 20}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Platform Charge (Flat Fee):</span>
                                                <span className="font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100 text-xs">
                                                    ₹{b2bSettings?.groceryPlatformCharge ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Full COD Policy Info */}
                                <div className="mt-6 bg-orange-50/40 border border-orange-100 rounded-2xl p-6 space-y-2">
                                    <h4 className="font-black text-gray-950 uppercase tracking-tight text-sm mb-1">Cash on Delivery (Full COD) Policies</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
                                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <span className="text-gray-500 font-medium">Full COD Mode:</span>
                                            <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${b2bSettings?.allowFullCod ? 'text-green-600 bg-green-50 border border-green-100' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                                                {b2bSettings?.allowFullCod ? 'ENABLED' : 'DISABLED'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <span className="text-gray-500 font-medium">COD Convenience Fee (Paid by Buyer):</span>
                                            <span className="font-bold text-gray-900">₹{b2bSettings?.codConvenienceFee ?? 20}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-wide">
                                        💡 Note: For Full COD orders, the flat platform charge is debited directly from your vendor wallet balance at checkout.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === "profile" && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={loading || !vendor}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
                            >
                                <FiSave /> {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorSettings;
