import { useState, useEffect, useMemo, useRef } from "react";
import { FiUpload, FiX, FiTag, FiHome, FiLock, FiUnlock, FiEdit3, FiSave, FiPlus, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from "../../../shared/utils/flutterBridge";

const ALL_BUSINESS_CATEGORIES = ['Manufacturing', 'Exporter', 'Wholesaler', 'Semi wholesaler', 'Retailers', 'Trading', 'Traders', 'Agency', 'Supplier', 'Developer', 'Property'];
const DEVELOPER_BUSINESS_CATEGORIES = ['Developer', 'Property'];

const ShopListingForm = ({ onSubmit, isLoading = false }) => {
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const DRAFT_KEY = "shop_listing_draft";
    const USER_DRAFT_KEY = `${DRAFT_KEY}_${vendorId}`;

    const [formData, setFormData] = useState(() => {
        // Try to load draft from localStorage on initial load
        const savedDraft = localStorage.getItem(USER_DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                // Ensure default structure
                return {
                    shopName: parsed.shopName || "",
                    description: parsed.description || "",
                    businessCategory: parsed.businessCategory || "",
                    mapUrl: parsed.mapUrl || "",
                    minPrice: parsed.minPrice || "",
                    maxPrice: parsed.maxPrice || "",
                    images: parsed.images || [],
                    details: parsed.details?.length > 0 ? parsed.details : [{ name: "", post: "", mobile: "" }],
                    shopUnitId: null,
                };
            } catch (e) {
                console.error("Failed to parse draft:", e);
            }
        }
        return {
            shopName: "",
            description: "",
            businessCategory: "",
            mapUrl: "",
            minPrice: "",
            maxPrice: "",
            images: [],
            details: [{ name: "", post: "", mobile: "" }],
            shopUnitId: null,
        };
    });

    const businessCategories = useMemo(() => {
        const vendorType = (vendor?.businessType || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
        const restrictedTypes = ["developer", "property broker"];
        if (restrictedTypes.includes(vendorType)) {
            return DEVELOPER_BUSINESS_CATEGORIES;
        }
        return ALL_BUSINESS_CATEGORIES;
    }, [vendor?.businessType]);
    const [hasExistingUnit, setHasExistingUnit] = useState(false);
    const [isShopLocked, setIsShopLocked] = useState(false);
    const [isShopModified, setIsShopModified] = useState(false);
    const [originalShopData, setOriginalShopData] = useState(null);
    const [loadingInitial, setLoadingInitial] = useState(true);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get('/b2b-vendor/shop-units');
                if (response.success && response.data) {
                    const unit = response.data;
                    const shopData = {
                        shopName: unit.name || "",
                        description: unit.description || "",
                        businessCategory: unit.businessCategory || "",
                        mapUrl: unit.mapUrl || "",
                        images: unit.images || [],
                        minPrice: unit.minPrice || "",
                        maxPrice: unit.maxPrice || "",
                        details: unit.details?.length > 0 ? unit.details : [{ name: "", post: "", mobile: "" }],
                        shopUnitId: unit._id
                    };
                    setFormData(prev => ({ ...prev, ...shopData }));
                    setOriginalShopData(shopData);
                    setHasExistingUnit(true);
                    setIsShopLocked(true);
                    setIsShopModified(false);
                }
            } catch (err) {
                console.error("Failed to fetch unit:", err);
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchUnit();
    }, []);

    // Save to localStorage whenever formData changes (Draft Persistence)
    useEffect(() => {
        if (vendorId === "anonymous") return;
        const { shopUnitId, ...draftData } = formData;
        // Don't save large base64 strings to localStorage to avoid quota exceeded error
        const cleanDraft = {
            ...draftData,
            images: draftData.images.filter(img => img.startsWith('http'))
        };
        localStorage.setItem(USER_DRAFT_KEY, JSON.stringify(cleanDraft));
    }, [formData, USER_DRAFT_KEY, vendorId]);

    // When vendor is Developer, ensure selected businessCategory is in allowed list
    // When vendor is Developer, ensure selected businessCategory is in allowed list
    useEffect(() => {
        if (vendor && formData.businessCategory && !businessCategories.includes(formData.businessCategory)) {
            setFormData(prev => ({ ...prev, businessCategory: "" }));
        }
    }, [businessCategories, vendor]);

    const { status } = useSubscriptionStore();
    const canUseSlideshow = status?.limits?.shopSlideshow !== false;
    const MAX_PHOTOS = canUseSlideshow ? 5 : 1;

    const cameraInputRef = useRef(null);

    const handleImageUpload = async (e, isCamera = false) => {
        const files = Array.from(e.target.files || []);
        console.log(`[ImageUpload] Triggered: ${isCamera ? 'Camera' : 'File'} input. Found ${files.length} files.`);

        if (files.length === 0) {
            console.warn('[ImageUpload] No files found in event');
            return;
        }

        if (formData.images.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }

        const toastId = toast.loading(isCamera ? 'Reading photo...' : 'Reading images...');
        setIsShopModified(true);

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
            } else {
                toast.error("Failed to process the selected images", { id: toastId });
            }
        } catch (error) {
            console.error('[ImageUpload] Critical failure:', error);
            toast.error('Failed to process images', { id: toastId });
        } finally {
            // CRITICAL for mobile: reset input value so re-taking photo works
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
                setIsShopModified(true);
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
                    setIsShopModified(true);
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
        setIsShopModified(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // 1. Basic Validations
        const trimmedShopName = formData.shopName.trim();
        if (!trimmedShopName) {
            return toast.error("Shop Name is required and cannot be empty spaces");
        }
        if (trimmedShopName.length > 100) {
            return toast.error("Shop Name must be 100 characters or less");
        }
        if (/^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(trimmedShopName) || !/[a-zA-Z]/.test(trimmedShopName)) {
            return toast.error("Shop Name must contain letters and cannot be only special characters/numbers");
        }

        const trimmedDescription = formData.description.trim();
        if (!trimmedDescription) {
            return toast.error("Description is required and cannot be empty spaces");
        }
        if (trimmedDescription.length > 1000) {
            return toast.error("Description must be 1000 characters or less");
        }

        if (!formData.businessCategory) {
            return toast.error("Please select a Business Category");
        }

        if (formData.minPrice === "" || formData.maxPrice === "") {
            return toast.error("Prices are required");
        }

        const minVal = Number(formData.minPrice);
        const maxVal = Number(formData.maxPrice);

        if (minVal < 0 || maxVal < 0) {
            return toast.error("Prices cannot be negative numbers");
        }

        if (maxVal < minVal) {
            return toast.error("Max Price cannot be less than Min Price");
        }

        if (formData.mapUrl && formData.mapUrl.trim()) {
            const mapRegex = /^(https?:\/\/)?(www\.)?(google\.[a-z]+(\.[a-z]+)?\/maps|maps\.app\.goo\.gl|maps\.google\.[a-z]+)\/.*$/i;
            if (!mapRegex.test(formData.mapUrl.trim())) {
                return toast.error("Please enter a valid Google Maps Location URL");
            }
        }

        // 2. Image Validation
        if (formData.images.length === 0 && (!hasExistingUnit || isShopModified)) {
            return toast.error("Please upload at least one photo");
        }

        // 3. Validate Staff Details & Duplicate Checks
        const validDetails = formData.details.filter(d => d.name.trim() || d.post.trim() || d.mobile.trim());

        const seenMobile = new Set();
        const seenName = new Set();
        for (const detail of validDetails) {
            if (!detail.name.trim()) {
                return toast.error("Staff name is required for all added contact rows");
            }
            if (!/^[a-zA-Z\s]+$/.test(detail.name)) {
                return toast.error(`Staff name "${detail.name}" should only contain alphabets`);
            }
            if (detail.post.trim() && !/^[a-zA-Z\s]+$/.test(detail.post)) {
                return toast.error(`Staff post/role "${detail.post}" should only contain alphabets`);
            }
            if (!detail.mobile.trim()) {
                return toast.error(`Mobile number is required for "${detail.name}"`);
            }
            if (!/^\d{10}$/.test(detail.mobile)) {
                return toast.error(`Mobile number for "${detail.name}" must be exactly 10 digits`);
            }

            const nameKey = detail.name.toLowerCase().trim();
            const mobileKey = detail.mobile.trim();
            if (seenMobile.has(mobileKey)) {
                return toast.error(`Duplicate mobile number "${detail.mobile}" is not allowed for staff`);
            }
            if (seenName.has(nameKey)) {
                return toast.error(`Duplicate staff name "${detail.name}" is not allowed`);
            }
            seenMobile.add(mobileKey);
            seenName.add(nameKey);
        }

        const payload = {
            name: trimmedShopName,
            description: trimmedDescription,
            businessCategory: formData.businessCategory,
            mapUrl: formData.mapUrl?.trim() || undefined,
            minPrice: String(formData.minPrice),
            maxPrice: String(formData.maxPrice),
            images: formData.images,
            details: validDetails,
        };

        // Clear draft on successful submit
        localStorage.removeItem(USER_DRAFT_KEY);
        onSubmit(payload);
    };


    // Styling constants matching ProductForm.jsx
    const inputStyle = "w-full px-4 py-3 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-medium text-gray-700 placeholder:text-gray-400 shadow-sm";
    const selectStyle = "w-full px-4 py-3 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-medium text-gray-700 placeholder:text-gray-400 shadow-sm appearance-none pr-10 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat";
    const labelStyle = "block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 ml-1";
    const sectionStyle = "bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6";

    if (loadingInitial) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-100 shadow-sm max-w-4xl mx-auto">
                <div className="w-12 h-12 border-4 border-primary-50 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold mt-4 text-[10px] uppercase tracking-widest">Verifying shop profile...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-24 px-4 text-left">
            {hasExistingUnit && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                        <FiHome size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Active Shop Profile Found</h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">
                            You can update your shop details below.
                        </p>
                    </div>
                </div>
            )}

            {/* SHOP LISTING FORM */}
            <div className={sectionStyle}>
                <div className="flex items-center justify-between gap-2 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                            <FiTag />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Shop Details</h3>
                    </div>
                    {hasExistingUnit && (
                        <button
                            type="button"
                            onClick={() => setIsShopLocked(!isShopLocked)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isShopLocked
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                } shadow-sm border border-transparent`}
                        >
                            {isShopLocked ? (
                                <>
                                    <FiLock size={14} />
                                    <span>Edit Shop Details</span>
                                </>
                            ) : (
                                <>
                                    <FiUnlock size={14} />
                                    <span>Lock Details</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {isShopLocked ? (
                    /* Beautiful Premium Preview Card when locked - prevents cuts-off and displays everything cleanly */
                    <div className="space-y-6">
                        {/* Images Grid */}
                        {formData.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                        <img src={img} alt="Shop Preview" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shop Name</h4>
                                <p className="text-lg font-bold text-slate-800 mt-1 break-words">{formData.shopName}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Category</h4>
                                <p className="text-base font-semibold text-slate-700 mt-1">{formData.businessCategory || "Not Selected"}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Range</h4>
                                <p className="text-base font-extrabold text-indigo-600 mt-1">₹{formData.minPrice} - ₹{formData.maxPrice}</p>
                            </div>
                            {formData.mapUrl && (
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location URL</h4>
                                    <a href={formData.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:underline mt-2">
                                        View on Google Maps
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</h4>
                            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed break-words">{formData.description}</p>
                        </div>

                        {/* Staff Contacts */}
                        {formData.details.filter(d => d.name.trim() || d.mobile.trim()).length > 0 && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Staff / Contacts</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {formData.details.filter(d => d.name.trim() || d.mobile.trim()).map((staff, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 break-words">{staff.name}</p>
                                                {staff.post && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 break-words">{staff.post}</p>}
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600 mt-2">{staff.mobile}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* The editable form when unlocked */
                    <div className="space-y-8">
                        {/* 1. Photo Upload Field */}
                        <div className="space-y-4">
                            <label className={labelStyle}>
                                Photo Upload (Max {MAX_PHOTOS}) <span className="text-red-500">*</span>
                            </label>
                            <p className="text-[10px] text-primary-600 font-black uppercase tracking-widest -mt-3 mb-2 ml-1">Note: Please upload square images (1:1 ratio) for better display.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                <AnimatePresence>
                                    {formData.images.map((img, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={idx}
                                            className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group shadow-sm"
                                        >
                                            <img src={img} alt="Shop" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <FiX size={12} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {formData.images.length < MAX_PHOTOS && (
                                    <>
                                        <div className="relative">
                                            <input
                                                id="gallery-upload"
                                                type="file"
                                                multiple
                                                accept="image/png, image/jpeg, image/webp"
                                                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                                                onChange={(e) => handleImageUpload(e, false)}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGalleryClick}
                                                className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2 sm:p-4 gap-1 sm:gap-2 cursor-pointer hover:bg-slate-50 transition-all text-gray-400 group"
                                            >
                                                <FiPlus size={20} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Gallery</span>
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                ref={cameraInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                                                onChange={(e) => handleImageUpload(e, true)}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCameraClick}
                                                className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2 sm:p-4 gap-1 sm:gap-2 cursor-pointer hover:bg-slate-50 transition-all text-gray-400 group"
                                            >
                                                <FiCamera size={20} className="group-hover:scale-110 transition-transform text-primary-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Camera</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2. Shop Name & Price Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className={labelStyle}>Shop Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={formData.shopName}
                                    onChange={(e) => {
                                        setFormData({ ...formData, shopName: e.target.value });
                                        setIsShopModified(true);
                                    }}
                                    placeholder="Enter Shop Name"
                                    className={inputStyle}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelStyle}>Business Category <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.businessCategory}
                                    onChange={(e) => {
                                        setFormData({ ...formData, businessCategory: e.target.value });
                                        setIsShopModified(true);
                                    }}
                                    className={selectStyle}
                                >
                                    <option value="" disabled>Select Business Category</option>
                                    {businessCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className={labelStyle}>Location URL (Google Maps)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formData.mapUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, mapUrl: e.target.value });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="https://maps.google.com/..."
                                        className={inputStyle}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelStyle}>Manual Price Range <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                        <input
                                            required
                                            type="number"
                                            value={formData.minPrice}
                                            onChange={(e) => {
                                                setFormData({ ...formData, minPrice: e.target.value });
                                                setIsShopModified(true);
                                            }}
                                            placeholder="Min"
                                            className={inputStyle.replace("px-4", "pl-8 pr-4")}
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                        <input
                                            required
                                            type="number"
                                            value={formData.maxPrice}
                                            onChange={(e) => {
                                                setFormData({ ...formData, maxPrice: e.target.value });
                                                setIsShopModified(true);
                                            }}
                                            placeholder="Max"
                                            className={inputStyle.replace("px-4", "pl-8 pr-4")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Description Field */}
                        <div className="space-y-2">
                            <label className={labelStyle}>Description <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                rows={4}
                                value={formData.description}
                                onChange={(e) => {
                                    setFormData({ ...formData, description: e.target.value });
                                    setIsShopModified(true);
                                }}
                                placeholder="Enter Description"
                                className={inputStyle + " resize-none min-h-[120px]"}
                            />
                        </div>

                        {/* 4. Details Section (Name, Post, Mobile) */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <label className={labelStyle}>Staff / Contact Details</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, details: [...formData.details, { name: "", post: "", mobile: "" }] });
                                        setIsShopModified(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-all border border-primary-100 shadow-sm"
                                >
                                    <FiPlus size={12} />
                                    Add Row
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.details.map((detail, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={idx}
                                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end group/row bg-slate-50/50 p-4 rounded-xl border border-transparent hover:border-slate-200 transition-all"
                                    >
                                        <div className="sm:col-span-4 space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Name</label>
                                            <input
                                                type="text"
                                                value={detail.name}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    const newDetails = [...formData.details];
                                                    newDetails[idx].name = val;
                                                    setFormData({ ...formData, details: newDetails });
                                                    setIsShopModified(true);
                                                }}
                                                placeholder="Enter Name"
                                                className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                            />
                                        </div>
                                        <div className="sm:col-span-4 space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Post / Role</label>
                                            <input
                                                type="text"
                                                value={detail.post}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    const newDetails = [...formData.details];
                                                    newDetails[idx].post = val;
                                                    setFormData({ ...formData, details: newDetails });
                                                    setIsShopModified(true);
                                                }}
                                                placeholder="Enter Post"
                                                className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                            />
                                        </div>
                                        <div className="sm:col-span-3 space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile</label>
                                            <input
                                                type="tel"
                                                maxLength={10}
                                                value={detail.mobile}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                                    const newDetails = [...formData.details];
                                                    newDetails[idx].mobile = val;
                                                    setFormData({ ...formData, details: newDetails });
                                                    setIsShopModified(true);
                                                }}
                                                placeholder="Mobile No."
                                                className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                            />
                                        </div>
                                        <div className="sm:col-span-1 pb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (formData.details.length === 1) {
                                                        setFormData({ ...formData, details: [{ name: "", post: "", mobile: "" }] });
                                                    } else {
                                                        setFormData({ ...formData, details: formData.details.filter((_, i) => i !== idx) });
                                                    }
                                                    setIsShopModified(true);
                                                }}
                                                className="w-full h-10 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all shadow-sm"
                                                title="Remove Row"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ACTION BUTTON AT BOTTOM */}
            <div className="flex justify-end pt-8">
                <button
                    disabled={isLoading || (hasExistingUnit && isShopLocked && !isShopModified)}
                    type="submit"
                    className={`w-full md:w-auto px-16 py-4 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95 ${(isLoading || (hasExistingUnit && isShopLocked && !isShopModified))
                        ? "opacity-30 cursor-not-allowed pointer-events-none grayscale"
                        : "hover:bg-primary-700 hover:shadow-primary-500/40"
                        }`}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{hasExistingUnit ? "Update Shop" : "Create Shop"}</span>
                            <FiSave size={16} />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default ShopListingForm;
