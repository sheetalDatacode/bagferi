import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiImage, FiInfo, FiTag, FiDollarSign, FiList, FiCamera, FiCheck, FiSearch, FiChevronDown } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useSubscriptionStore } from "../store/subscriptionStore";
import imageCompression from 'browser-image-compression';
import { useScrollLock } from "../../../shared/hooks/useScrollLock";
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from "../../../shared/utils/flutterBridge";

// Basic in-memory cache for B2B categories during the session
let categoriesCache = null;
let isFetchingCategories = false;
let categoriesPromise = null;

const DRAFT_KEY = "b2b_product_add_draft";

const B2BVendorProductForm = ({ initialData, isEdit, productId }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const USER_DRAFT_KEY = `${DRAFT_KEY}_${vendorId}`;
    const cameraInputRef = useRef(null);
    const [errors, setErrors] = useState({});
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isCategorySearchOpen, setIsCategorySearchOpen] = useState(false);
    const [isSubcategorySearchOpen, setIsSubcategorySearchOpen] = useState(false);
    const [categorySearchQuery, setCategorySearchQuery] = useState("");
    const [subcategorySearchQuery, setSubcategorySearchQuery] = useState("");
    const categoryDropdownRef = useRef(null);
    const subcategoryDropdownRef = useRef(null);

    // Lock scroll when unit selection modal is open
    useScrollLock(isUnitDropdownOpen);

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

    const [formData, setFormData] = useState(initialData || {
        name: "",
        category: "",
        subcategory: "",
        moq: 1,
        price: "", 
        description: "",
        images: [],
        specifications: [{ name: "", value: "" }],
        bulkPricing: [{ minQty: "", price: "" }],
        brand: "",
        availability: "In Stock",
        unit: "",
    });

    const [categories, setCategories] = useState(categoriesCache || []);
    const [subcategories, setSubcategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(!categoriesCache);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [dynamicValues, setDynamicValues] = useState({});
    const [customMultiInputs, setCustomMultiInputs] = useState({});
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // Initial draft loading with authentication awareness
    useEffect(() => {
        if (isEdit || isDraftLoaded || vendorId === "anonymous") return;

        const saved = localStorage.getItem(USER_DRAFT_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
                if (parsed.dynamicValues) setDynamicValues(parsed.dynamicValues);
                if (parsed.customMultiInputs) setCustomMultiInputs(parsed.customMultiInputs);
                console.log("[ProductForm] Draft hydrated for user:", vendorId);
            } catch (e) {
                console.error("[ProductForm] Draft load failed", e);
            }
        }
        setIsDraftLoaded(true);
    }, [vendorId, USER_DRAFT_KEY, isEdit, isDraftLoaded]);

    // Fallback: If user is anonymous but we have an anonymous draft, load it
    useEffect(() => {
        if (isEdit || isDraftLoaded || vendorId !== "anonymous") return;
        const saved = localStorage.getItem(`${DRAFT_KEY}_anonymous`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
                if (parsed.dynamicValues) setDynamicValues(parsed.dynamicValues);
                if (parsed.customMultiInputs) setCustomMultiInputs(parsed.customMultiInputs);
            } catch (e) {}
        }
        setIsDraftLoaded(true);
    }, [vendorId, isEdit, isDraftLoaded]);

    // Auto-save draft
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setIsCategorySearchOpen(false);
            }
            if (subcategoryDropdownRef.current && !subcategoryDropdownRef.current.contains(event.target)) {
                setIsSubcategorySearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isEdit && isDraftLoaded) {
            try {
                localStorage.setItem(USER_DRAFT_KEY, JSON.stringify({
                    formData,
                    dynamicValues,
                    customMultiInputs
                }));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn("[ProductForm] Storage quota exceeded, saving without images");
                    try {
                        localStorage.setItem(USER_DRAFT_KEY, JSON.stringify({
                            formData: { ...formData, images: [] },
                            dynamicValues,
                            customMultiInputs
                        }));
                    } catch (e2) {}
                }
            }
        } else if (isEdit) {
            localStorage.removeItem(USER_DRAFT_KEY);
        }
    }, [formData, dynamicValues, customMultiInputs, isEdit, USER_DRAFT_KEY, isDraftLoaded]);

    useEffect(() => {
        if (!categoriesCache) {
            fetchCategories();
        } else {
            setCategoriesLoading(false);
        }
    }, []);



    const fetchCategories = async () => {
        if (categoriesCache) {
            setCategories(categoriesCache);
            setCategoriesLoading(false);
            return;
        }

        if (isFetchingCategories && categoriesPromise) {
            try {
                const cached = await categoriesPromise;
                if (cached) {
                    setCategories(cached);
                }
            } catch (err) {
                // Ignore, handled by primary fetcher
            } finally {
                setCategoriesLoading(false);
            }
            return;
        }

        setCategoriesLoading(true);
        isFetchingCategories = true;

        categoriesPromise = (async () => {
            try {
                const response = await api.get('/public/b2b-categories');
                if (response.success && response.data) {
                    // Transform backend format to frontend format
                    const transformedCategories = response.data.map((cat, index) => ({
                        id: cat._id || cat.id || index.toString(),
                        name: cat.name,
                        subcategories: cat.subcategories || [], // [{ name, fields }]
                    }));
                    categoriesCache = transformedCategories;
                    return transformedCategories;
                }
                return [];
            } catch (error) {
                console.error('Error fetching B2B categories:', error);
                toast.error('Failed to load categories');
                return [];
            } finally {
                isFetchingCategories = false;
                categoriesPromise = null;
            }
        })();

        const result = await categoriesPromise;
        setCategories(result);
        setCategoriesLoading(false);
    };

    useEffect(() => {
        if (categories.length > 0 && formData.category) {
            // Case-insensitive match for category
            const selectedCategory = categories.find(cat =>
                cat.name.toLowerCase() === formData.category.toLowerCase()
            );

            if (selectedCategory) {
                // If casing is different, update formData to match the list's casing
                if (selectedCategory.name !== formData.category) {
                    setFormData(prev => ({ ...prev, category: selectedCategory.name }));
                }
                setSubcategories(selectedCategory.subcategories || []);
            } else {
                setSubcategories([]);
            }
        }
    }, [formData.category, categories]);

    useEffect(() => {
        if (categories.length > 0 && formData.category && formData.subcategory) {
            const cat = categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
            const sub = cat?.subcategories.find(s => s.name.toLowerCase() === formData.subcategory.toLowerCase());

            // If casing differs for subcategory, update it
            if (sub && sub.name !== formData.subcategory) {
                setFormData(prev => ({ ...prev, subcategory: sub.name }));
            }

            const fields = sub?.fields || [];
            setDynamicFields(fields);

            // Populate dynamicValues from formData.specifications (including custom values for select/multi-select)
            setDynamicValues(prev => {
                const newValues = { ...prev };
                const opts = (o) => (Array.isArray(o) ? o : (o ? [o] : [])).map(String);

                fields.forEach(field => {
                    const existingSpec = formData.specifications.find(
                        s => s.name?.toLowerCase() === field.label?.toLowerCase()
                    );
                    if (!existingSpec || (existingSpec.value !== 0 && !existingSpec.value)) return;

                    const fieldOpts = opts(field.options);
                    const val = existingSpec.value;

                    if (field.type === 'select') {
                        const strVal = typeof val === 'string' ? val : (Array.isArray(val) ? val[0] : String(val));
                        const matchedOpt = fieldOpts.find(opt => String(opt).toLowerCase() === String(strVal).toLowerCase());
                        if (matchedOpt) {
                            if (!newValues[field.label]) newValues[field.label] = matchedOpt;
                        } else {
                            newValues[field.label] = '__OTHER__';
                            newValues[`${field.label}_custom`] = strVal || '';
                        }
                    } else if (field.type === 'multi-select') {
                        let arrVal = [];
                        if (Array.isArray(val)) {
                            arrVal = val;
                        } else if (typeof val === 'string') {
                            arrVal = val.split(',').map(v => v.trim()).filter(Boolean);
                        } else {
                            arrVal = [val];
                        }
                        
                        if (!newValues[field.label]) {
                            newValues[field.label] = arrVal.map(v => {
                                const matchedOpt = fieldOpts.find(opt => String(opt).toLowerCase() === String(v).toLowerCase());
                                return matchedOpt ? matchedOpt : (v != null ? String(v) : '');
                            });
                        }
                    } else if (!newValues[field.label]) {
                        newValues[field.label] = val;
                    }
                });
                return newValues;
            });
        } else {
            setDynamicFields([]);
            setDynamicValues({});
            setCustomMultiInputs({});
        }
    }, [formData.category, formData.subcategory, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
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

    // Helper to update spec by name (for dynamic fields)
    const updateSpecByName = (name, value) => {
        setFormData(prev => {
            const specs = [...prev.specifications];
            const index = specs.findIndex(s => s.name === name);
            if (index > -1) {
                specs[index].value = value;
            } else {
                specs.push({ name, value });
            }
            return { ...prev, specifications: specs };
        });
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

    const { canCreateProduct, refreshStatus } = useSubscriptionStore();
    const productPermission = canCreateProduct();
    const MAX_PHOTOS = productPermission.maxImages !== undefined ? parseInt(productPermission.maxImages) : 5;

    const handleMultipleImageUpload = async (e, isCamera = false) => {
        const files = Array.from(e.target.files);
        console.log(`[ProductImage] ${isCamera ? 'Camera' : 'File'} input triggered. Files:`, files.length);

        if (!files.length) {
            console.warn('[ProductImage] No files in event');
            return;
        }

        // Handle case where limit is -1 (unlimited) or high
        if (MAX_PHOTOS !== -1 && formData.images.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading(isCamera ? 'Processing photo...' : 'Compressing images...');

        try {
            const processedImages = await Promise.all(
                files.map(async (file) => {
                    console.log(`[ImageUpload] Processing: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);

                    if (!file || file.size === 0) {
                        console.error('[ImageUpload] File is empty');
                        return null;
                    }

                    // Strictness relaxation: if it's from a CAMERA input, treat as image even if type is empty
                    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name) || isCamera;
                    if (!isImg) {
                        console.error('[ImageUpload] Invalid type:', file.type, file.name);
                        return null;
                    }

                    try {
                        let blobToRead = file;
                        try {
                            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
                            blobToRead = await imageCompression(file, options);
                        } catch (compErr) {
                            console.warn('[ImageUpload] Compression error, using original:', compErr);
                        }

                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.onerror = () => { console.error('[ImageUpload] Reader error'); resolve(null); };
                            reader.readAsDataURL(blobToRead);
                        });
                    } catch (err) {
                        console.error('[ImageUpload] Processing failed:', err);
                        return null;
                    }
                })
            );

            const newImagesList = processedImages.filter(Boolean);
            if (newImagesList.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...newImagesList.map(img => img.data)]
                }));
                toast.success(isCamera ? 'Photo added' : `${newImagesList.length} images added`, { id: toastId });
                if (errors.images) setErrors(prev => ({ ...prev, images: null }));
            } else {
                toast.error("Failed to process the selected images", { id: toastId });
            }
            // Clear input value to allow re-selection of same file
            if (e.target) e.target.value = '';
        } catch (error) {
            console.error('[ProductImage] Critical error:', error);
            if (e.target) e.target.value = '';
            toast.error("Failed to process images", { id: toastId });
        } finally {
            setIsUploading(false);
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
        // Auto-clear image error if at least one remains
        if (formData.images.length > 1) {
            setErrors(prev => ({ ...prev, images: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name?.trim()) {
            newErrors.name = "Product title is required";
        } else if (!/[a-zA-Z0-9]/.test(formData.name)) {
            newErrors.name = "Product title cannot consist only of special characters";
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

        if (!formData.category) newErrors.category = "Category is required";
        if (!formData.price) newErrors.price = "Base price is required";
        if (!formData.moq) newErrors.moq = "Minimum order quantity is required";
        if (!formData.unit) newErrors.unit = "Unit is required";

        if (formData.images.length === 0) {
            newErrors.images = "At least one product image is required";
        }

        // Validate dynamic required fields
        dynamicFields.forEach(f => {
            if (f.required) {
                const val = dynamicValues[f.label];
                if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                    newErrors[f.label] = `${f.label} is required`;
                } else if (val === '__OTHER__' && !dynamicValues[`${f.label}_custom`]?.trim()) {
                    newErrors[f.label] = `Please specify ${f.label}`;
                }
            }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Scroll to the first error
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.getElementsByName(firstErrorField)[0] || document.getElementById(firstErrorField);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            // Prepare specifications including dynamic fields (admin options + manual/custom values)
            const dynamicSpecs = dynamicFields.map(f => {
                const key = f.label;
                let value = dynamicValues[key];
                if (f.type === 'select') {
                    if (value === '__OTHER__') {
                        value = dynamicValues[`${key}_custom`] || '';
                    }
                }

                // 🔹 Fix: Handle multi-select arrays for string-type backend
                if (Array.isArray(value)) {
                    value = value.join(', ');
                }

                // Skip internal keys and empty values
                if (key.endsWith('_custom') || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
                return { name: key, value: String(value) };
            }).filter(Boolean);

            // Filter out any dynamic fields that might already exist in specifications to avoid duplicates
            const genericSpecs = formData.specifications.filter(spec =>
                spec.name && spec.value &&
                !dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase())
            );

            const finalSpecs = [
                ...genericSpecs,
                ...dynamicSpecs,
            ].map(spec => ({
                ...spec,
                value: Array.isArray(spec.value) ? spec.value.join(', ') : String(spec.value || '')
            }));

            // Prepare data for API
            const productPayload = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory || "",
                moq: parseInt(formData.moq) || 1,
                price: parseFloat(formData.price),
                description: formData.description || "",
                images: formData.images,
                specifications: finalSpecs,
                bulkPricing: formData.bulkPricing.filter(tier => tier.minQty && tier.price),
                brand: formData.brand || "",
                availability: formData.availability || "In Stock",
                unit: formData.unit || "Pcs",
            };

            if (isEdit && productId) {
                // Update existing product
                await api.put(`/b2b-vendor/products/${productId}`, productPayload);
                toast.success("Listing updated successfully");
            } else {
                // Create new product
                await api.post('/b2b-vendor/products', productPayload);
                toast.success("Product listed successfully");
            }

            // Clear draft on success
            localStorage.removeItem(USER_DRAFT_KEY);

            // Important: refresh subscription status so counts update immediately across the app
            try { await refreshStatus(); } catch (e) { console.error("Refresh status failed", e); }

            categoriesCache = null;
            navigate("/b2b-vendor/products/manage-products");
        } catch (error) {
            console.error('Error saving product:', error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save product";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Section: Details (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Basic Info */}
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
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Product Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                    placeholder="e.g. Industrial Grade Steel Pipes"
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
                            </div>

                            <div className="md:col-span-1 relative" ref={categoryDropdownRef}>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Category <span className="text-red-500">*</span></label>
                                
                                <div 
                                    onClick={() => !categoriesLoading && setIsCategorySearchOpen(!isCategorySearchOpen)}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.category ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus-within:border-primary-500 focus-within:bg-white rounded-xl transition-all cursor-pointer flex justify-between items-center ${categoriesLoading ? 'opacity-50' : ''}`}
                                >
                                    <span className={`truncate ${!formData.category ? 'text-gray-400' : 'text-gray-800'}`}>
                                        {categoriesLoading ? "Loading..." : (formData.category || "Select Category")}
                                    </span>
                                    <FiChevronDown className={`text-gray-400 transition-transform ${isCategorySearchOpen ? 'rotate-180' : ''}`} />
                                </div>

                                <AnimatePresence>
                                    {isCategorySearchOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-gray-50">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search category..."
                                                        value={categorySearchQuery}
                                                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                                                {categories
                                                    .filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                                    .map((cat) => (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    category: cat.name,
                                                                    subcategory: "" // Reset subcategory
                                                                }));
                                                                setIsCategorySearchOpen(false);
                                                                setCategorySearchQuery("");
                                                                if (errors.category) setErrors(prev => ({ ...prev, category: null }));
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                                                                formData.category === cat.name 
                                                                ? 'bg-primary-50 text-primary-700 font-bold' 
                                                                : 'text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                {categories.filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 && (
                                                    <div className="p-4 text-center text-gray-400 text-sm italic">
                                                        No categories found
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {errors.category && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category}</p>}
                            </div>

                            <div className="md:col-span-1 relative" ref={subcategoryDropdownRef}>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Subcategory</label>
                                
                                <div 
                                    onClick={() => formData.category && subcategories.length > 0 && setIsSubcategorySearchOpen(!isSubcategorySearchOpen)}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus-within:border-primary-500 focus-within:bg-white rounded-xl transition-all flex justify-between items-center ${(!formData.category || subcategories.length === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span className={`truncate ${!formData.subcategory ? 'text-gray-400' : 'text-gray-800'}`}>
                                        {formData.subcategory || "Select Subcategory"}
                                    </span>
                                    <FiChevronDown className={`text-gray-400 transition-transform ${isSubcategorySearchOpen ? 'rotate-180' : ''}`} />
                                </div>

                                <AnimatePresence>
                                    {isSubcategorySearchOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-gray-50">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search subcategory..."
                                                        value={subcategorySearchQuery}
                                                        onChange={(e) => setSubcategorySearchQuery(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                                                {subcategories
                                                    .filter(sub => sub.name.toLowerCase().includes(subcategorySearchQuery.toLowerCase()))
                                                    .map((sub, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, subcategory: sub.name }));
                                                                setIsSubcategorySearchOpen(false);
                                                                setSubcategorySearchQuery("");
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                                                                formData.subcategory === sub.name 
                                                                ? 'bg-primary-50 text-primary-700 font-bold' 
                                                                : 'text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {sub.name}
                                                        </button>
                                                    ))}
                                                {subcategories.filter(sub => sub.name.toLowerCase().includes(subcategorySearchQuery.toLowerCase())).length === 0 && (
                                                    <div className="p-4 text-center text-gray-400 text-sm italic">
                                                        No subcategories found
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Dynamic Fields Rendering Section */}
                            {dynamicFields.map((f, i) => (
                                <div key={i} className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">
                                        {f.label} {f.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {f.type === "text" && (
                                        <input
                                            type="text"
                                            value={dynamicValues[f.label] || ""}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                            placeholder={`Enter ${f.label}`}
                                            onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                        />
                                    )}

                                    {f.type === "number" && (
                                        <input
                                            type="number"
                                            value={dynamicValues[f.label] || ""}
                                            className={`w-full px-4 py-2.5 bg-slate-50 border ${errors[f.label] ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                            placeholder="0"
                                            onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                        />
                                    )}

                                    {f.type === "select" && (
                                        <div className="space-y-2">
                                            <select
                                                id={f.label}
                                                value={dynamicValues[f.label] || ""}
                                                className={`w-full px-4 py-2.5 bg-slate-50 border ${errors[f.label] ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                                onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                            >
                                                <option value="">Select {f.label}</option>
                                                {(f.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                <option value="__OTHER__">ADD</option>
                                            </select>
                                            {(dynamicValues[f.label] === '__OTHER__') && (
                                                <input
                                                    type="text"
                                                    value={dynamicValues[`${f.label}_custom`] || ""}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                                    placeholder={`Enter ${f.label} manually`}
                                                    onChange={(e) => setDynamicValues(p => ({ ...p, [`${f.label}_custom`]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {f.type === "multi-select" && (
                                        <div className="space-y-3" id={f.label}>
                                            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border ${errors[f.label] ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl max-h-60 overflow-y-auto`}>
                                                {(f.options || []).map(opt => {
                                                    const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                    const isSelected = currentVals.some(v => String(v).toLowerCase() === String(opt).toLowerCase());

                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${isSelected
                                                                ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                                                                : 'bg-white border-transparent hover:border-gray-300 text-gray-600'
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'
                                                                }`}>
                                                                {isSelected && <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 mb-0.5"></div>}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const newVals = e.target.checked
                                                                        ? [...currentVals, opt]
                                                                        : currentVals.filter(v => String(v).toLowerCase() !== String(opt).toLowerCase());
                                                                    setDynamicValues(p => ({ ...p, [f.label]: newVals }));
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold select-none whitespace-normal break-words">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                                {(f.options || []).length === 0 && (
                                                    <div className="col-span-full text-center py-4 text-gray-400 text-xs italic">
                                                        No options available
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={customMultiInputs[f.label] ?? ''}
                                                    className="flex-1 min-w-[120px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none"
                                                    placeholder="Add custom value (not in list)"
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
                                                    className="px-3 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {Array.isArray(dynamicValues[f.label]) && dynamicValues[f.label].filter(v => !(f.options || []).some(o => String(o).toLowerCase() === String(v).toLowerCase())).length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {dynamicValues[f.label].filter(v => !(f.options || []).some(o => String(o).toLowerCase() === String(v).toLowerCase())).map((customVal, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold">
                                                            {customVal}
                                                            <button type="button" onClick={() => {
                                                                const currentVals = [...(dynamicValues[f.label] || [])];
                                                                const next = currentVals.filter(c => c !== customVal);
                                                                setDynamicValues(p => ({ ...p, [f.label]: next }));
                                                            }} className="text-gray-400 hover:text-red-600 ml-0.5">&times;</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {errors[f.label] && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors[f.label]}</p>}
                                </div>
                            ))}

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

                    {/* Description */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                                <FiList />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Product Description</h3>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all resize-none outline-none"
                            placeholder="Provide a detailed description of the product, its usage, and benefits for B2B buyers..."
                        />
                    </div>

                    {/* Specifications */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm">
                                    <FiInfo />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Technical Specifications</h3>
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
                                    // Hide specs that are already shown as dynamic fields
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
                                            <div className="flex-1 grid grid-cols-2 gap-3">
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
                                                {errors[`spec_name_${index}`] && (
                                                    <div className="col-span-2 text-[10px] text-red-500 font-bold ml-1">
                                                        {errors[`spec_name_${index}`]}
                                                    </div>
                                                )}
                                            </div>
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

                {/* Right Section: Pricing & Images (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Media Gallery */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm">
                                    <FiImage />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Media Gallery</h3>
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4">
                            <div className="grid grid-cols-2 flex-1 gap-3">
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

                                {/* Action Buttons */}
                                <div className="col-span-2 flex gap-3">
                                     <div className="flex-1 relative">
                                         <input
                                             id="gallery-upload"
                                             type="file"
                                             onChange={(e) => handleMultipleImageUpload(e, false)}
                                             className="hidden"
                                             multiple
                                             accept="image/png, image/jpeg, image/webp"
                                             disabled={isUploading}
                                         />
                                         <button
                                             type="button"
                                             onClick={handleGalleryClick}
                                             disabled={isUploading}
                                             className="w-full flex flex-col items-center justify-center py-10 px-5 border-2 border-dashed border-gray-200 rounded-3xl hover:bg-primary-50 hover:border-primary-200 cursor-pointer transition-all group relative overflow-hidden"
                                         >
                                             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary-600 transition-all shadow-sm mb-1">
                                                 {isUploading ? <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div> : <FiPlus size={24} />}
                                             </div>
                                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary-600">Gallery</span>
                                         </button>
                                     </div>

                                    <button
                                        type="button"
                                        onClick={handleCameraClick}
                                        disabled={isUploading}
                                        className="flex-1 flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-3xl hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all group relative overflow-hidden"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-sm mb-1">
                                            <FiCamera size={22} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-blue-600">Camera</span>
                                        <input
                                            ref={cameraInputRef}
                                            type="file"
                                            capture="environment"
                                            accept="image/*"
                                            onChange={(e) => handleMultipleImageUpload(e, true)}
                                            className="hidden"
                                            disabled={isUploading}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {errors.images && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1">{errors.images}</p>}
                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium mt-2">
                            {MAX_PHOTOS === 0 ? "No photos allowed on this plan." : `First image is cover. Max ${MAX_PHOTOS < 0 ? 'unlimited' : MAX_PHOTOS} photos.`} Max 300KB each.
                        </p>
                        <p className="text-[10px] text-primary-600 font-black uppercase tracking-wider mt-1">
                            Note: Please upload square images (1:1 ratio) for better display.
                        </p>
                    </div>

                    {/* Pricing */}
                    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg text-sm">
                                <FiDollarSign />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">B2B Pricing</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Base Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</div>
                                    <input
                                        type="number"
                                        step="any"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border ${errors.price ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                        placeholder="4500.50"
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
                                        className={`min-w-0 flex-1 px-4 py-2.5 bg-slate-50 border ${errors.moq ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none`}
                                        placeholder="100"
                                    />
                                    <div className="relative w-24 xs:w-28 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsUnitDropdownOpen(true);
                                            }}
                                            className={`w-full px-2 py-2.5 bg-slate-50 border ${errors.unit ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-gray-700 text-xs text-left flex items-center justify-between`}
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
                                                                    "pieces", "pcs", "nos", "kg", "gram", "ton", "meter", "cm", "feet", "yard", "litre", "ml", "gallon", "box", "pack", "set", "pair", "dozen", "carton", "bundle", "roll", "sheet", "sqft", "sqm", "Night"
                                                                ].map((u) => (
                                                                    <button
                                                                        key={u}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFormData(prev => ({ ...prev, unit: u }));
                                                                            setIsUnitDropdownOpen(false);
                                                                            if (errors.unit) setErrors(prev => ({ ...prev, unit: null }));
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
                                <div className="flex gap-2">
                                    {errors.moq && <p className="flex-1 text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.moq}</p>}
                                    {errors.unit && <p className="w-28 text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.unit}</p>}
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
                                                        placeholder="1000"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 px-1 border-l border-gray-200">
                                                    <span className="text-[8px] text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={tier.price}
                                                        onChange={(e) => updateBulkTier(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="4200.00"
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
                            {isEdit ? 'Update listing' : 'Publish Product'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default B2BVendorProductForm;
