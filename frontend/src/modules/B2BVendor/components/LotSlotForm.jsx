import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiImage, FiInfo, FiTag, FiDollarSign, FiList, FiSearch, FiChevronDown, FiCamera, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from "../../../shared/utils/flutterBridge";

const LotSlotForm = ({ initialData, isEdit, id }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const DRAFT_KEY = `b2b_lotslot_add_draft_${vendorId}`;

    const [formData, setFormData] = useState(() => {
        const defaultData = {
            name: "", category: "", subcategory: "", moq: 1, price: "",
            description: "", images: [], specifications: [{ name: "", value: "" }],
            bulkPricing: [{ minQty: "", price: "" }], brand: "", availability: "In Stock", unit: "Lot",
        };
        if (initialData) return initialData;
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return parsed.formData || defaultData;
                } catch (e) { }
            }
        }
        return defaultData;
    });

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [subcategorySearchQuery, setSubcategorySearchQuery] = useState("");
    const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const subcategoryDropdownRef = useRef(null);
    const unitDropdownRef = useRef(null);
    const cameraInputRef = useRef(null);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [dynamicValues, setDynamicValues] = useState(() => {
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).dynamicValues || {}; } catch (e) { }
            }
        }
        return {};
    });

    const [customMultiInputs, setCustomMultiInputs] = useState(() => {
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).customMultiInputs || {}; } catch (e) { }
            }
        }
        return {};
    });

    // Auto-save draft
    useEffect(() => {
        if (!isEdit && vendorId !== "anonymous") {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                formData,
                dynamicValues,
                customMultiInputs
            }));
        } else if (isEdit) {
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [formData, dynamicValues, customMultiInputs, isEdit, DRAFT_KEY, vendorId]);

    const filteredSubcategories = useMemo(() => {
        return (subcategories || []).filter(sub => {
            const name = typeof sub === 'string' ? sub : sub.name;
            return name?.toLowerCase().includes(subcategorySearchQuery.toLowerCase());
        });
    }, [subcategories, subcategorySearchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (subcategoryDropdownRef.current && !subcategoryDropdownRef.current.contains(event.target)) {
                setIsSubcategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleFocus = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };
        const formEl = document.querySelector('form');
        if (formEl) {
            formEl.addEventListener('focus', handleFocus, true);
        }
        return () => {
            if (formEl) {
                formEl.removeEventListener('focus', handleFocus, true);
            }
        };
    }, []);

    useEffect(() => {
        fetchCategories();
        if (isEdit && id) {
            fetchLotSlotDetails();
        }
    }, [isEdit, id]);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await api.get('/public/b2b-categories');
            if (response.success && response.data) {
                const transformedCategories = response.data.map((cat, index) => ({
                    id: cat._id || cat.id || index.toString(),
                    name: cat.name,
                    subcategories: cat.subcategories || [],
                }));
                setCategories(transformedCategories);
            }
        } catch (error) {
            console.error('Error fetching B2B categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setCategoriesLoading(false);
        }
    };

    const fetchLotSlotDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/b2b-vendor/lot-slots/${id}`);
            if (response.success && response.data) {
                const data = response.data;
                setFormData({
                    name: data.name || "",
                    category: data.category || "",
                    subcategory: data.subcategory || "",
                    moq: data.moq || 1,
                    price: data.price || "",
                    description: data.description || "",
                    images: data.image ? [data.image, ...(data.images || [])] : (data.images || []),
                    specifications: data.specifications?.length > 0 ? data.specifications : [{ name: "", value: "" }],
                    bulkPricing: data.bulkPricing?.length > 0 ? data.bulkPricing : [{ minQty: "", price: "" }],
                    brand: data.brand || "",
                    availability: data.availability || "In Stock",
                    unit: data.unit || "Lot",
                });
            }
        } catch (error) {
            console.error('Error fetching lot/slot details:', error);
            toast.error('Failed to load listing details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formData.category) {
            const selectedCategory = categories.find(cat => cat.name === formData.category);
            if (selectedCategory) {
                setSubcategories(selectedCategory.subcategories || []);
            } else {
                setSubcategories([]);
            }
        } else {
            setSubcategories([]);
        }
    }, [formData.category, categories]);

    useEffect(() => {
        if (categories.length > 0 && formData.category && formData.subcategory) {
            const cat = categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
            const sub = cat?.subcategories.find(s => {
                const subName = typeof s === 'string' ? s : s.name;
                return subName.toLowerCase() === formData.subcategory.toLowerCase();
            });

            if (sub && typeof sub === 'object') {
                const fields = sub.fields || [];
                setDynamicFields(fields);

                setDynamicValues(prev => {
                    const newVals = { ...prev };
                    const opts = (o) => (Array.isArray(o) ? o : (o ? [o] : [])).map(String);
                    fields.forEach(f => {
                        const existing = formData.specifications.find(s => s.name?.toLowerCase() === f.label?.toLowerCase());
                        if (!existing || (existing.value !== 0 && !existing.value)) return;
                        const fieldOpts = opts(f.options);
                        const val = existing.value;
                        if (f.type === 'select') {
                            const strVal = typeof val === 'string' ? val : (Array.isArray(val) ? val[0] : String(val));
                            const isInOptions = fieldOpts.some(opt => String(opt).toLowerCase() === String(strVal).toLowerCase());
                            if (isInOptions) {
                                if (!newVals[f.label]) newVals[f.label] = strVal;
                            } else {
                                newVals[f.label] = '__OTHER__';
                                newVals[`${f.label}_custom`] = strVal || '';
                            }
                        } else if (f.type === 'multi-select') {
                            const arrVal = Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(v => v.trim()) : [val]);
                            if (!newVals[f.label]) newVals[f.label] = arrVal.map(v => (v != null ? String(v) : '')).filter(Boolean);
                        } else if (!newVals[f.label]) {
                            newVals[f.label] = val;
                        }
                    });
                    return newVals;
                });
            } else {
                setDynamicFields([]);
                setDynamicValues({});
                setCustomMultiInputs({});
            }
        } else {
            setDynamicFields([]);
            setDynamicValues({});
        }
    }, [formData.category, formData.subcategory, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addSpec = () => {
        setFormData(prev => ({
            ...prev,
            specifications: [...prev.specifications, { name: "", value: "" }]
        }));
    };

    const removeSpec = (index) => {
        setFormData(prev => ({
            ...prev,
            specifications: prev.specifications.filter((_, i) => i !== index)
        }));
    };

    const updateSpec = (index, field, value) => {
        const updated = [...formData.specifications];
        if (field === 'value') {
            updated[index][field] = value.replace(/[^0-9.]/g, '');
        } else {
            updated[index][field] = value;
        }
        setFormData(prev => ({ ...prev, specifications: updated }));
    };

    const addBulkTier = () => {
        setFormData(prev => ({
            ...prev,
            bulkPricing: [...prev.bulkPricing, { minQty: "", price: "" }]
        }));
    };

    const removeBulkTier = (index) => {
        setFormData(prev => ({
            ...prev,
            bulkPricing: prev.bulkPricing.filter((_, i) => i !== index)
        }));
    };

    const updateBulkTier = (index, field, value) => {
        const updated = [...formData.bulkPricing];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, bulkPricing: updated }));
    };

    const handleMultipleImageUpload = async (e, isCamera = false) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsUploading(true);
        const toastId = toast.loading(isCamera ? 'Processing photo...' : 'Processing images...');
        try {
            const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true };
            const newImages = await Promise.all(
                files.map(async (file) => {
                    try {
                        const compressed = await imageCompression(file, options);
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(compressed);
                        });
                    } catch (err) {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                        });
                    }
                })
            );

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }));
            toast.success(`${files.length} images added`, { id: toastId });
        } catch (error) {
            toast.error("Failed to upload some images", { id: toastId });
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleCameraClick = async () => {
        if (isFlutterApp()) {
            const result = await openFlutterCamera();
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, result.data]
                }));
                toast.success('Photo captured');
                return;
            }
        }
        
        // Synchronous fallback
        cameraInputRef.current?.click();
    };

    const handleGalleryClick = () => {
        if (isFlutterApp()) {
            (async () => {
                const result = await openFlutterGallery();
                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        images: [...prev.images, result.data]
                    }));
                    toast.success('Image added');
                }
            })();
            return;
        }
        
        // Synchronous fallback
        document.getElementById('gallery-upload')?.click();
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
        if (formData.images.length <= 1) setErrors(prev => ({ ...prev, images: null }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const newErrors = {};

        if (formData.images.length === 0) newErrors.images = "Please upload at least one image";
        if (!formData.name?.trim()) {
            newErrors.name = "Title is required";
        } else if (!/[a-zA-Z0-9]/.test(formData.name)) {
            newErrors.name = "Title cannot consist only of special characters";
        }

        if (formData.brand?.trim() && !/[a-zA-Z0-9]/.test(formData.brand)) {
            newErrors.brand = "Brand name cannot consist only of special characters";
        }

        formData.specifications.forEach((spec, idx) => {
            const isDynamic = dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase());
            if (!isDynamic && spec.name?.trim()) {
                if (!/[a-zA-Z0-9]/.test(spec.name)) {
                    newErrors[`spec_name_${idx}`] = "Attribute cannot consist only of special characters";
                }
            }
        });

        if (!formData.price) newErrors.price = "Price is required";
        if (!formData.category) newErrors.category = "Category is required";
        if (!formData.description?.trim()) newErrors.description = "Description is required";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstError = Object.keys(newErrors)[0];
            const el = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setLoading(true);
        try {
            const dynamicSpecs = dynamicFields.map(f => {
                const key = f.label;
                let value = dynamicValues[key];
                if (f.type === 'select') {
                    if (value === '__OTHER__') value = dynamicValues[`${key}_custom`] || '';
                }

                if (Array.isArray(value)) {
                    value = value.join(', ');
                }

                if (key.endsWith('_custom') || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
                return { name: key, value: String(value) };
            }).filter(Boolean);

            const genericSpecs = formData.specifications.filter(spec =>
                spec.name && spec.value &&
                !dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase())
            );

            const payload = {
                ...formData,
                moq: parseInt(formData.moq) || 1,
                price: parseFloat(formData.price),
                specifications: [
                    ...genericSpecs,
                    ...dynamicSpecs
                ].map(spec => ({
                    ...spec,
                    value: Array.isArray(spec.value) ? spec.value.join(', ') : String(spec.value || '')
                })),
                bulkPricing: formData.bulkPricing.filter(tier => tier.minQty && tier.price),
            };

            if (isEdit && id) {
                await api.put(`/b2b-vendor/lot-slots/${id}`, payload);
                toast.success("Listing updated successfully");
            } else {
                await api.post('/b2b-vendor/lot-slots', payload);
                toast.success("Lot/Slot listed successfully");
            }

            localStorage.removeItem(DRAFT_KEY);

            try {
                await useSubscriptionStore.getState().refreshStatus();
            } catch (e) {
                console.error("Refresh status failed", e);
            }

            navigate("/b2b-vendor/lotslot/manage-lots");
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to save listing";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                                <FiTag />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Lot/Slot Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                    placeholder="e.g. Bulk Cotton Lot 500kg"
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Category <span className="text-red-500">*</span></label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    disabled={categoriesLoading}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.category ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none disabled:opacity-50`}
                                >
                                    <option value="">{categoriesLoading ? "Loading categories..." : "Select Category"}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category}</p>}
                            </div>

                            <div className="md:col-span-1" ref={subcategoryDropdownRef}>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Subcategory</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        disabled={!formData.category || subcategories.length === 0}
                                        onClick={() => setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none disabled:opacity-50 text-left flex items-center justify-between"
                                    >
                                        <span className={`text-sm ${formData.subcategory ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
                                            {formData.subcategory || "Select Subcategory"}
                                        </span>
                                        <FiChevronDown className={`transition-transform duration-300 ${isSubcategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isSubcategoryDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                                            >
                                                <div className="p-2 border-b border-gray-50">
                                                    <div className="relative">
                                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search subcategory..."
                                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary-500"
                                                            value={subcategorySearchQuery}
                                                            onChange={(e) => setSubcategorySearchQuery(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                    {filteredSubcategories.length > 0 ? (
                                                        filteredSubcategories.map((sub, index) => {
                                                            const subName = typeof sub === 'string' ? sub : sub.name;
                                                            return (
                                                                <button
                                                                    key={index}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, subcategory: subName }));
                                                                        setIsSubcategoryDropdownOpen(false);
                                                                        setSubcategorySearchQuery("");
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.subcategory === subName ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                                                >
                                                                    {subName}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="py-6 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">No results found</div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {dynamicFields.length > 0 && (
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-primary-50/30 rounded-2xl border border-primary-100/50">
                                    <div className="md:col-span-2 flex items-center gap-2 mb-1">
                                        <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                                        <h4 className="text-xs font-bold text-primary-700 uppercase tracking-wider">Category Specific Details</h4>
                                    </div>
                                    {dynamicFields.map((f, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">
                                                {f.label} {f.required && <span className="text-red-500">*</span>}
                                            </label>

                                            {f.type === "text" && (
                                                <input
                                                    type="text"
                                                    value={dynamicValues[f.label] || ""}
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-primary-500 rounded-xl transition-all outline-none"
                                                    placeholder={`Enter ${f.label}`}
                                                    onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                                />
                                            )}

                                            {f.type === "number" && (
                                                <input
                                                    type="number"
                                                    value={dynamicValues[f.label] || ""}
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-primary-500 rounded-xl transition-all outline-none"
                                                    placeholder="0"
                                                    onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                                />
                                            )}

                                            {f.type === "select" && (
                                                <div className="space-y-2">
                                                    <select
                                                        value={dynamicValues[f.label] || ""}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-primary-500 rounded-xl transition-all outline-none"
                                                        onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                                    >
                                                        <option value="">Select {f.label}</option>
                                                        {(f.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        <option value="__OTHER__">ADD</option>
                                                    </select>
                                                    {dynamicValues[f.label] === '__OTHER__' && (
                                                        <input
                                                            type="text"
                                                            value={dynamicValues[`${f.label}_custom`] || ""}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:border-primary-500 rounded-xl outline-none"
                                                            placeholder={`Enter ${f.label} manually`}
                                                            onChange={(e) => setDynamicValues(p => ({ ...p, [`${f.label}_custom`]: e.target.value }))}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {f.type === "multi-select" && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-inner max-h-72 overflow-y-auto custom-scrollbar">
                                                        {(f.options || []).map(opt => {
                                                            const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                            const isChecked = currentVals.includes(opt);
                                                            return (
                                                                <label key={opt} className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${isChecked ? 'bg-primary-50 border-primary-100' : 'hover:bg-gray-50 border-transparent'} border min-w-0`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setDynamicValues(p => ({ ...p, [f.label]: [...currentVals, opt] }));
                                                                            } else {
                                                                                setDynamicValues(p => ({ ...p, [f.label]: currentVals.filter(v => v !== opt) }));
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                                                                    />
                                                                    <span className="text-[11px] font-black text-gray-800 uppercase leading-tight whitespace-normal break-words">{opt}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Or add custom value</p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={customMultiInputs[f.label] ?? ''}
                                                                className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:border-primary-500 outline-none"
                                                                placeholder="Type and press Enter"
                                                                onChange={(e) => setCustomMultiInputs(p => ({ ...p, [f.label]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const v = (customMultiInputs[f.label] ?? '').trim();
                                                                        if (!v) return;
                                                                        const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                                        if (currentVals.some(c => String(c).toLowerCase() === v.toLowerCase())) return;
                                                                        setDynamicValues(p => ({ ...p, [f.label]: [...currentVals, v] }));
                                                                        setCustomMultiInputs(p => ({ ...p, [f.label]: '' }));
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const v = (customMultiInputs[f.label] ?? '').trim();
                                                                    if (!v) return;
                                                                    const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                                    if (currentVals.some(c => String(c).toLowerCase() === v.toLowerCase())) return;
                                                                    setDynamicValues(p => ({ ...p, [f.label]: [...currentVals, v] }));
                                                                    setCustomMultiInputs(p => ({ ...p, [f.label]: '' }));
                                                                }}
                                                                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-colors shadow-sm"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {Array.isArray(dynamicValues[f.label]) && dynamicValues[f.label].filter(v => !(f.options || []).includes(v)).length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Added Values</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {dynamicValues[f.label].filter(v => !(f.options || []).includes(v)).map((customVal, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold border border-gray-200">
                                                                        {customVal}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const currentVals = [...(dynamicValues[f.label] || [])];
                                                                                const filtered = currentVals.filter(c => c !== customVal);
                                                                                setDynamicValues(p => ({ ...p, [f.label]: filtered }));
                                                                            }}
                                                                            className="text-gray-400 hover:text-red-600 ml-1 leading-none"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Brand / Manufacturer</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.brand ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                    placeholder="e.g. Tata Steel"
                                />
                                {errors.brand && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.brand}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Availability Status</label>
                                <select
                                    name="availability"
                                    value={formData.availability}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                    <option value="Available on Order">Available on Order</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                                <FiList />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Description</h3>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all resize-none outline-none`}
                            placeholder="Provide a detailed description for bulk buyers..."
                        />
                        {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.description}</p>}
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm">
                                    <FiInfo />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Product Specifications</h3>
                            </div>
                            <button
                                type="button"
                                onClick={addSpec}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs hover:bg-orange-100 transition-all uppercase tracking-wide"
                            >
                                <FiPlus /> Add Field
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {formData.specifications.map((spec, index) => {
                                    if (dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase())) {
                                        return null;
                                    }

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            key={index}
                                            className="flex gap-3 group"
                                        >
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className={`bg-slate-50 px-4 py-2 rounded-xl border ${errors[`spec_name_${index}`] ? 'border-red-500 bg-red-50' : 'border-gray-100'} focus-within:border-orange-200 focus-within:bg-white transition-all`}>
                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Attribute</label>
                                                    <input
                                                        type="text"
                                                        value={spec.name}
                                                        onChange={(e) => {
                                                            updateSpec(index, 'name', e.target.value);
                                                            if (errors[`spec_name_${index}`]) setErrors(prev => ({ ...prev, [`spec_name_${index}`]: null }));
                                                        }}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 outline-none p-0"
                                                        placeholder="Material"
                                                    />
                                                </div>
                                                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 focus-within:border-orange-200 focus-within:bg-white transition-all">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Value (Numbers only)</label>
                                                    <input
                                                        type="text"
                                                        value={spec.value}
                                                        onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-600 outline-none p-0"
                                                        placeholder="100"
                                                    />
                                                </div>
                                            </div>
                                            {errors[`spec_name_${index}`] && (
                                                <div className="col-span-2 text-[10px] text-red-500 font-bold ml-1">
                                                    {errors[`spec_name_${index}`]}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeSpec(index)}
                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {formData.specifications.length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm">
                                    No specifications added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm">
                                    <FiImage />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Media Gallery</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            {formData.images.map((img, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600 text-[7px] text-white font-bold uppercase rounded">
                                            Cover
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div className="flex-1 relative">
                                    <input
                                        id="gallery-upload"
                                        type="file"
                                        multiple
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={(e) => handleMultipleImageUpload(e, false)}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGalleryClick}
                                        className={`w-full flex flex-col items-center justify-center aspect-square border-2 border-dashed ${errors.images ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-2xl hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-all group`}
                                        disabled={isUploading}
                                    >
                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-purple-600 transition-all shadow-sm mb-1">
                                            {isUploading ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> : <FiPlus size={20} />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-purple-600">Gallery</span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCameraClick}
                                    disabled={isUploading}
                                    className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-200 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-all group"
                                >
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 transition-all shadow-sm mb-1">
                                        <FiCamera size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-indigo-600">Camera</span>
                                    <input
                                        type="file"
                                        ref={cameraInputRef}
                                        capture="environment"
                                        accept="image/*"
                                        onChange={(e) => handleMultipleImageUpload(e, true)}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                </button>
                            </div>
                        </div>
                        {errors.images && <p className="text-[10px] text-red-500 font-bold mb-2 ml-1">{errors.images}</p>}
                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            First image is cover. Max 300KB each.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg text-sm">
                                <FiDollarSign />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">B2B Pricing</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Base Lot Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</div>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border ${errors.price ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                        placeholder="45000"
                                    />
                                </div>
                                {errors.price && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.price}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Min. Order (MOQ) <span className="text-red-500">*</span></label>
                                <div className="flex gap-2 min-w-0">
                                    <input
                                        type="number"
                                        name="moq"
                                        value={formData.moq}
                                        onChange={handleChange}
                                        required
                                        className="min-w-0 flex-1 px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                        placeholder="1"
                                    />
                                    <div className="relative w-24 xs:w-28 shrink-0" ref={unitDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsUnitDropdownOpen(true);
                                            }}
                                            className="w-full px-2 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-gray-700 text-xs text-left flex items-center justify-between"
                                        >
                                            <span className="truncate">{formData.unit || "Unit"}</span>
                                            <div className="text-gray-400">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {createPortal(
                                            <AnimatePresence>
                                                {isUnitDropdownOpen && (
                                                    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsUnitDropdownOpen(false);
                                                            }}
                                                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                                        />
                                                        <motion.div
                                                            initial={{ y: "100%" }}
                                                            animate={{ y: 0 }}
                                                            exit={{ y: "100%" }}
                                                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                                            className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                                                        >
                                                            <div className="w-full flex justify-center pt-4 pb-2">
                                                                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                                                            </div>
                                                            <div className="px-8 py-4 border-b border-gray-50 flex items-center justify-between">
                                                                <div>
                                                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Select Unit</h3>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Choose the measurement unit</p>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsUnitDropdownOpen(false);
                                                                    }}
                                                                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
                                                                >
                                                                    <FiX size={20} className="text-gray-400" />
                                                                </button>
                                                            </div>
                                                            <div className="overflow-y-auto px-4 py-6 custom-scrollbar grid grid-cols-2 gap-3">
                                                                {[
                                                                    "Lot", "Slot", "pieces", "pcs", "nos", "kg", "gram", "ton", "meter", "cm", "feet", "yard", "litre", "ml", "gallon", "box", "pack", "set", "pair", "dozen", "carton", "bundle", "roll", "sheet", "sqft", "sqm", "Night"
                                                                ].map((u) => (
                                                                    <button
                                                                        key={u}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFormData(prev => ({ ...prev, unit: u }));
                                                                            setIsUnitDropdownOpen(false);
                                                                        }}
                                                                        className={`group relative overflow-hidden px-5 py-4 rounded-2xl text-left transition-all border-2 ${formData.unit === u
                                                                            ? 'bg-primary-600 border-primary-600 shadow-lg shadow-primary-100'
                                                                            : 'bg-slate-50 border-transparent hover:bg-white hover:border-primary-100'
                                                                            }`}
                                                                    >
                                                                        <div className={`text-xs font-black uppercase tracking-wider ${formData.unit === u ? 'text-white' : 'text-gray-600'}`}>
                                                                            {u}
                                                                        </div>
                                                                        {formData.unit === u && (
                                                                            <motion.div
                                                                                layoutId="activeUnit"
                                                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"
                                                                            >
                                                                                <FiCheck className="text-white" size={14} />
                                                                            </motion.div>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="p-6 bg-gray-50/50 border-t border-gray-50">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsUnitDropdownOpen(false);
                                                                    }}
                                                                    className="w-full py-4 bg-white border-2 border-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    </div>
                                                )}
                                            </AnimatePresence>,
                                            document.body
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Volume Discounts</label>
                                    <button
                                        type="button"
                                        onClick={addBulkTier}
                                        className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <FiPlus /> Add Tier
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.bulkPricing.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-2 group">
                                            <div className="flex-1 grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-lg border border-gray-100 group-hover:bg-green-50/50 transition-all">
                                                <div className="flex items-center gap-1 px-1">
                                                    <span className="text-[8px] text-gray-400 font-bold">MIN</span>
                                                    <input
                                                        type="number"
                                                        value={tier.minQty}
                                                        onChange={(e) => updateBulkTier(index, 'minQty', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="10"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 px-1 border-l border-gray-200">
                                                    <span className="text-[8px] text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={tier.price}
                                                        onChange={(e) => updateBulkTier(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="42000"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeBulkTier(index)}
                                                className="p-1.5 text-red-400 hover:text-red-500"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 z-40 flex justify-end gap-3 shadow-lg">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                >
                    Discard
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 bg-primary-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-200 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <FiSave size={16} />
                            {isEdit ? 'Update listing' : 'Publish Lot/Slot'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default LotSlotForm;
