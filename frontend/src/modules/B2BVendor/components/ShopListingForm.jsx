import { useState, useEffect, useMemo, useRef } from "react";
import { FiUpload, FiX, FiTag, FiHome, FiLock, FiUnlock, FiEdit3, FiSave, FiPlus, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from "../../../shared/utils/flutterBridge";


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
                    companyName: parsed.companyName || "",
                    accountDetails: parsed.accountDetails || { accountNumber: "", ifscCode: "", bankName: "", accountHolderName: "" },
                    deliveryZones: parsed.deliveryZones || [],
                    mapUrl: parsed.mapUrl || "",
                    minPrice: parsed.minPrice || "0",
                    maxPrice: parsed.maxPrice || "0",
                    zoneId: parsed.zoneId || "",
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
            companyName: "",
            accountDetails: { accountNumber: "", ifscCode: "", bankName: "", accountHolderName: "" },
            deliveryZones: [],
            mapUrl: "",
            minPrice: "0",
            maxPrice: "0",
            zoneId: "",
            images: [],
            details: [{ name: "", post: "", mobile: "" }],
            shopUnitId: null,
        };
    });


    const [hasExistingUnit, setHasExistingUnit] = useState(false);
    const [isShopLocked, setIsShopLocked] = useState(false);
    const [isShopModified, setIsShopModified] = useState(false);
    const [originalShopData, setOriginalShopData] = useState(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [zones, setZones] = useState([]);
    const [selectedDeliveryZoneFilter, setSelectedDeliveryZoneFilter] = useState("");

    useEffect(() => {
        if (zones.length > 0 && !selectedDeliveryZoneFilter) {
            const defaultZone = typeof formData.zoneId === 'object' ? (formData.zoneId?._id || zones[0]._id) : (formData.zoneId || zones[0]._id);
            setSelectedDeliveryZoneFilter(defaultZone);
        }
    }, [zones, formData.zoneId, selectedDeliveryZoneFilter]);

    useEffect(() => {
        const fetchZones = async () => {
            try {
                const response = await api.get('/zones/public/active');
                if (response.success && response.data) {
                    setZones(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch zones:", err);
            }
        };
        fetchZones();
    }, []);

    useEffect(() => {
        if (zones.length > 0 && !formData.zoneId) {
            setFormData(prev => ({ ...prev, zoneId: zones[0]._id }));
        }
    }, [zones, formData.zoneId]);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get('/b2b-vendor/shop-units');
                if (response.success && response.data) {
                    const unit = response.data;
                    const shopData = {
                        shopName: unit.name || "",
                        description: unit.description || "",
                        companyName: unit.companyName || "",
                        accountDetails: unit.accountDetails || { accountNumber: "", ifscCode: "", bankName: "", accountHolderName: "" },
                        deliveryZones: unit.deliveryZones || [],
                        mapUrl: unit.mapUrl || "",
                        images: unit.images || [],
                        minPrice: unit.minPrice || "",
                        maxPrice: unit.maxPrice || "",
                        zoneId: unit.zoneId || "",
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

    const groupedSelectedAreas = useMemo(() => {
        if (!formData.deliveryZones || formData.deliveryZones.length === 0 || zones.length === 0) {
            return [];
        }
        const groups = [];
        zones.forEach(z => {
            const selectedAreasInZone = [];
            z.pincodes?.forEach(p => {
                p.areas?.forEach(a => {
                    const areaKey = `${p.code}|${a.name}`;
                    if (formData.deliveryZones.includes(areaKey)) {
                        selectedAreasInZone.push({ pin: p.code, name: a.name });
                    }
                });
            });
            if (selectedAreasInZone.length > 0) {
                groups.push({
                    zoneName: z.name,
                    areas: selectedAreasInZone
                });
            }
        });
        return groups;
    }, [formData.deliveryZones, zones]);

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

    const handleStaffDocUpload = async (e, idx) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Reading document...');
        setIsShopModified(true);

        try {
            let blobToRead = file;
            try {
                const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
                blobToRead = await imageCompression(file, options);
            } catch (compErr) {
                console.warn('[StaffDocUpload] Compression error, using original:', compErr);
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const newDetails = [...formData.details];
                newDetails[idx].identityDocumentUrl = reader.result;
                setFormData(prev => ({ ...prev, details: newDetails }));
                toast.success('Document attached', { id: toastId });
            };
            reader.onerror = () => {
                toast.error('Failed to read document', { id: toastId });
            };
            reader.readAsDataURL(blobToRead);
        } catch (error) {
            console.error('[StaffDocUpload] failed:', error);
            toast.error('Failed to process document', { id: toastId });
        } finally {
            if (e.target) e.target.value = '';
        }
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


        if (!formData.zoneId) {
            return toast.error("Please select a Zone");
        }

        // Prices removed from form, defaulted to '0'

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
            zoneId: formData.zoneId,
            mapUrl: formData.mapUrl?.trim() || undefined,
            minPrice: String(formData.minPrice),
            maxPrice: String(formData.maxPrice),
            images: formData.images,
            details: validDetails,
            companyName: formData.companyName,
            accountDetails: formData.accountDetails,
            deliveryZones: formData.deliveryZones,
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
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone</h4>
                                <p className="text-base font-semibold text-slate-700 mt-1">{zones.find(z => z._id === formData.zoneId)?.name || "Not Selected"}</p>
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

                        {/* Delivery Areas */}
                        {groupedSelectedAreas.length > 0 && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Areas</h4>
                                <div className="space-y-4">
                                    {groupedSelectedAreas.map((group, idx) => (
                                        <div key={idx} className="border-b border-slate-200/60 pb-3 last:border-0 last:pb-0">
                                            <div className="text-[10px] font-black text-primary-600 uppercase tracking-wider mb-2">{group.zoneName}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {group.areas.map((area, aIdx) => (
                                                    <span key={aIdx} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
                                                        {area.name} ({area.pin})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                <label className={labelStyle}>Owner Name</label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => {
                                        setFormData({ ...formData, companyName: e.target.value });
                                        setIsShopModified(true);
                                    }}
                                    placeholder="Enter Owner Name"
                                    className={inputStyle}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={labelStyle}>Shop Zone <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={typeof formData.zoneId === 'object' ? (formData.zoneId?._id || "") : (formData.zoneId || "")}
                                    onChange={(e) => {
                                        setFormData({ ...formData, zoneId: e.target.value });
                                        setSelectedDeliveryZoneFilter(e.target.value);
                                        setIsShopModified(true);
                                    }}
                                    className={inputStyle}
                                >
                                    <option value="" disabled>Select Shop Zone (City: Surat)</option>
                                    {zones.map((z) => (
                                        <option key={z._id} value={z._id}>
                                            {z.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                             <div className="space-y-2">
                                <label className={labelStyle}>Delivery Areas (Select Specific Areas) <span className="text-red-500">*</span></label>
                                
                                <div className="mb-3">
                                    <select
                                        value={selectedDeliveryZoneFilter}
                                        onChange={(e) => setSelectedDeliveryZoneFilter(e.target.value)}
                                        className={inputStyle}
                                    >
                                        <option value="" disabled>Select Zone to show delivery areas</option>
                                        {zones.map((z) => (
                                            <option key={`filter-${z._id}`} value={z._id}>
                                                {z.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={`${inputStyle} h-64 overflow-y-auto p-3 space-y-4 bg-gray-50/50`}>
                                    {zones.filter((z) => String(z._id) === String(selectedDeliveryZoneFilter)).length > 0 ? (
                                        zones
                                            .filter((z) => String(z._id) === String(selectedDeliveryZoneFilter))
                                            .map((z) => {
                                                if (!z.pincodes || z.pincodes.length === 0) return null;
                                                return (
                                                    <div key={`zone-group-${z._id}`} className="mb-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                        <div className="text-[11px] font-black text-primary-600 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">{z.name}</div>
                                                        <div className="space-y-3">
                                                            {z.pincodes.map(p => {
                                                                const isAllSelected = p.areas?.length > 0 && p.areas.every(a => formData.deliveryZones.includes(`${p.code}|${a.name}`));
                                                                const isPartiallySelected = p.areas?.length > 0 && p.areas.some(a => formData.deliveryZones.includes(`${p.code}|${a.name}`)) && !isAllSelected;

                                                                return (
                                                                    <div key={`delivery-pin-${p.code}`} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/30">
                                                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100/60">
                                                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isAllSelected}
                                                                                    ref={input => {
                                                                                        if (input) input.indeterminate = isPartiallySelected;
                                                                                    }}
                                                                                    onChange={(e) => {
                                                                                        const checked = e.target.checked;
                                                                                        setFormData(prev => {
                                                                                            let newZones = [...prev.deliveryZones];
                                                                                            p.areas?.forEach(a => {
                                                                                                const areaKey = `${p.code}|${a.name}`;
                                                                                                if (checked && !newZones.includes(areaKey)) newZones.push(areaKey);
                                                                                                if (!checked) newZones = newZones.filter(k => k !== areaKey);
                                                                                            });
                                                                                            return { ...prev, deliveryZones: newZones };
                                                                                        });
                                                                                        setIsShopModified(true);
                                                                                    }}
                                                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                                                />
                                                                                <span className="text-sm font-black text-gray-800 tracking-tight group-hover:text-primary-600 transition-colors">Pincode: {p.code}</span>
                                                                            </label>
                                                                        </div>
                                                                        
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                                                                            {p.areas?.map(a => {
                                                                                const areaKey = `${p.code}|${a.name}`;
                                                                                return (
                                                                                    <label key={areaKey} className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-white rounded-md transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={formData.deliveryZones.includes(areaKey)}
                                                                                            onChange={(e) => {
                                                                                                const checked = e.target.checked;
                                                                                                setFormData(prev => ({
                                                                                                    ...prev,
                                                                                                    deliveryZones: checked 
                                                                                                        ? [...prev.deliveryZones, areaKey]
                                                                                                        : prev.deliveryZones.filter(k => k !== areaKey)
                                                                                                }));
                                                                                                setIsShopModified(true);
                                                                                            }}
                                                                                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 mt-0.5"
                                                                                        />
                                                                                        <span className="text-xs font-bold text-gray-600 leading-tight">{a.name}</span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="text-center text-gray-500 py-8 text-sm font-medium">
                                            Please select a Zone to show delivery areas.
                                        </div>
                                    )}
                                </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                                <div className="space-y-2">
                                    <label className={labelStyle}>Bank Name</label>
                                    <input
                                        type="text"
                                        value={formData.accountDetails.bankName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, accountDetails: { ...formData.accountDetails, bankName: e.target.value } });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Enter Bank Name"
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelStyle}>Account Holder Name</label>
                                    <input
                                        type="text"
                                        value={formData.accountDetails.accountHolderName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, accountDetails: { ...formData.accountDetails, accountHolderName: e.target.value } });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Enter Account Holder Name"
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelStyle}>Account Number</label>
                                    <input
                                        type="text"
                                        value={formData.accountDetails.accountNumber}
                                        onChange={(e) => {
                                            setFormData({ ...formData, accountDetails: { ...formData.accountDetails, accountNumber: e.target.value } });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Enter Account Number"
                                        className={inputStyle}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelStyle}>IFSC Code</label>
                                    <input
                                        type="text"
                                        value={formData.accountDetails.ifscCode}
                                        onChange={(e) => {
                                            setFormData({ ...formData, accountDetails: { ...formData.accountDetails, ifscCode: e.target.value } });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Enter IFSC Code"
                                        className={inputStyle}
                                    />
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
                                        <div className="sm:col-span-3 space-y-1.5">
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
                                        <div className="sm:col-span-2 space-y-1.5">
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
                                        <div className="sm:col-span-3 space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ID Document</label>
                                            <div className="flex gap-2 items-center">
                                                {detail.identityDocumentUrl ? (
                                                    <div className="relative w-10 h-10 border rounded overflow-hidden group">
                                                        <img src={detail.identityDocumentUrl} alt="ID" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"
                                                            onClick={() => {
                                                                const newDetails = [...formData.details];
                                                                newDetails[idx].identityDocumentUrl = "";
                                                                setFormData({ ...formData, details: newDetails });
                                                                setIsShopModified(true);
                                                            }}
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                ) : null}
                                                <div className="relative flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleStaffDocUpload(e, idx)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className={`h-10 flex items-center justify-center text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg whitespace-nowrap px-2 ${detail.identityDocumentUrl ? 'opacity-0 absolute -z-10' : ''}`}>
                                                        <FiUpload className="mr-1" /> Upload ID
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-1 pb-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (formData.details.length === 1) {
                                                        setFormData({ ...formData, details: [{ name: "", post: "", mobile: "", identityDocumentUrl: "" }] });
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
                    className={`w-full md:w-auto px-16 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 ${(isLoading || (hasExistingUnit && isShopLocked && !isShopModified))
                        ? "opacity-30 cursor-not-allowed pointer-events-none grayscale"
                        : "hover:bg-blue-700 hover:shadow-blue-500/40"
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
