import { useEffect, useState, useRef } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "../../../shared/utils/toast";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from "../../../shared/utils/flutterBridge";
import { useFormPersist } from "../../../shared/hooks/useFormPersist";

const FlatForm = ({ initialData, isEdit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);
    const cameraInputRef = useRef(null);
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const DRAFT_KEY = `b2b_flat_add_draft_${vendorId}`;

    const [media, setMedia] = useState([]);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    const baseFlat = {
        flatType: '',
        builtUpArea: '',
        commonArea: '',
        possessionType: 'Ready to Move',
        carpetAreaUnit: 'Sq. Ft.',
        floorNumber: '',
        totalFloors: '',
        furnishing: 'Unfurnished',
        ageOfProperty: '',
        amenities: {
            lift: 'No',
            parking: ['Ground Parking'],
            security: 'No',
            cctv: 'No',
            powerBackup: 'No',
            waterSupply: ['Municipal'],
            gasPipeline: 'No',
            swimmingPool: 'No',
            gym: 'No',
            garden: 'No',
            childrenPlayArea: 'No',
            clubHouse: 'No',
            temple: 'No',
            societyOffice: 'No',
            gameZone: 'No'
        },
        legal: {
            loanAvailable: 'No',
            reraApproved: 'No',
            reraNumber: ''
        }
    };

    const [flatVariants, setFlatVariants] = useState([{ ...baseFlat }]);

    const [formData, setFormData] = useState({
        title: '', listingType: 'Rent', description: '', propertyType: 'Flat',
        saleDetails: { priceMin: '', priceMax: '', priceUnit: 'Lakh' },
        rentDetails: { monthlyRent: '', rentUnit: 'Thousand', depositAmount: '', depositUnit: 'Thousand', maintenance: 'Excluded', veraBill: 'Excluded' },
        leaseDetails: { monthlyLeaseRate: '', leaseUnit: 'Lakh', depositAmount: '', depositUnit: 'Lakh', leaseDurationYears: '' },
        flatDetails: { ...baseFlat },
        location: { address: '', area: '', state: '', city: '', mapUrl: '' }
    });

    // Use persistence hook
    useFormPersist(DRAFT_KEY, { formData, flatVariants, media }, (data) => {
        if (data.formData) setFormData(data.formData);
        if (data.flatVariants) setFlatVariants(data.flatVariants);
        if (data.media) setMedia(data.media);
    }, !isEdit);

    useEffect(() => {
        // keep primary flatDetails in sync with first variant
        setFormData(prev => ({ ...prev, flatDetails: { ...flatVariants[0] } }));
    }, [flatVariants]);

    useEffect(() => {
        if (initialData && isEdit) {
            const variants = initialData.flatVariants?.length
                ? initialData.flatVariants.map((f) => ({ ...baseFlat, ...f }))
                : initialData.flatDetails
                    ? [{ ...baseFlat, ...initialData.flatDetails }]
                    : [baseFlat];
            setFlatVariants(variants);
            setFormData((prev) => ({
                ...prev,
                ...initialData,
                location: { ...prev.location, ...(initialData.location || {}), state: initialData.location?.state ?? initialData.location?.market ?? '' },
                saleDetails: { ...prev.saleDetails, ...(initialData.saleDetails || {}) },
                rentDetails: { ...prev.rentDetails, ...(initialData.rentDetails || {}) },
                leaseDetails: { ...prev.leaseDetails, ...(initialData.leaseDetails || {}) },
                flatDetails: { ...baseFlat, ...(initialData.flatDetails || {}) },
            }));
            if (initialData.media?.length) {
                setMedia(initialData.media.map((m) => ({ data: m.url || m.data, name: "Existing" })));
            }
        }
    }, [initialData, isEdit]);

    const addVariant = () => {
        if (flatVariants.length >= 6) return;
        setFlatVariants(prev => [...prev, { ...baseFlat }]);
    };

    const removeVariant = (idx) => {
        if (flatVariants.length === 1) return;
        const next = flatVariants.filter((_, i) => i !== idx);
        setFlatVariants(next);
    };

    const updateVariant = (idx, updater) => {
        setFlatVariants(prev => {
            const next = [...prev];
            next[idx] = typeof updater === 'function' ? updater(next[idx] || {}) : updater;
            return next;
        });
    };

    const handleChange = (e, variantIndex = 0) => {
        const { name, value } = e.target;
        // Clear error on change
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        if (name.startsWith('flatDetails.')) {
            const field = name.split('.').pop();
            setErrors(prev => ({ ...prev, [`flatDetails.${variantIndex}.${field}`]: null }));
        }

        if (name.includes('.')) {
            const parts = name.split('.');
            if (parts.length === 2) {
                const [parent, child] = parts;
                if (parent === 'flatDetails') {
                    if (variantIndex === 0) {
                        setFormData(prev => ({
                            ...prev,
                            [parent]: { ...prev[parent], [child]: value }
                        }));
                        updateVariant(0, v => ({ ...v, [child]: value }));
                    } else {
                        updateVariant(variantIndex, v => ({ ...v, [child]: value }));
                    }
                } else {
                    setFormData(prev => ({
                        ...prev,
                        [parent]: { ...prev[parent], [child]: value }
                    }));
                }
            } else if (parts.length === 3) {
                const [grandparent, parent, child] = parts;
                if (grandparent === 'flatDetails') {
                    if (variantIndex === 0) {
                        setFormData(prev => ({
                            ...prev,
                            [grandparent]: {
                                ...prev[grandparent],
                                [parent]: { ...prev[grandparent][parent], [child]: value }
                            }
                        }));
                    }
                    updateVariant(variantIndex, v => ({
                        ...v,
                        [parent]: { ...(v[parent] || {}), [child]: value }
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        [grandparent]: {
                            ...prev[grandparent],
                            [parent]: { ...prev[grandparent][parent], [child]: value }
                        }
                    }));
                }
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNumberKeyPress = (e, allowDot = false) => {
        const charCode = e.which ? e.which : e.keyCode;
        if (allowDot && charCode === 46) {
            if (e.target.value.includes('.')) e.preventDefault();
            return;
        }
        if (charCode < 48 || charCode > 57) e.preventDefault();
    };

    const handleAlphabetKeyPress = (e) => {
        const charCode = e.which ? e.which : e.keyCode;
        if ((charCode < 65 || charCode > 90) && (charCode < 97 || charCode > 122) && charCode !== 32) {
            e.preventDefault();
        }
    };

    const handleFocus = (e, variantIndex = 0) => {
        if (e.target.value === '0') {
            const { name } = e.target;
            if (name.includes('.')) {
                const parts = name.split('.');
                if (parts.length === 2) {
                    const [parent, child] = parts;
                    if (parent === 'flatDetails') {
                        if (variantIndex === 0) {
                            setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: '' } }));
                            updateVariant(0, v => ({ ...v, [child]: '' }));
                        } else {
                            updateVariant(variantIndex, v => ({ ...v, [child]: '' }));
                        }
                    } else {
                        setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: '' } }));
                    }
                }
            } else {
                setFormData(prev => ({ ...prev, [name]: '' }));
            }
        }
    };

    const handleToggle = (name, value, variantIndex = 0) => {
        const parts = name.split('.');
        if (parts.length === 3) {
            const [grandparent, parent, child] = parts;
            if (grandparent === 'flatDetails') {
                if (variantIndex === 0) {
                    setFormData(prev => ({
                        ...prev,
                        [grandparent]: {
                            ...prev[grandparent],
                            [parent]: { ...prev[grandparent][parent], [child]: value }
                        }
                    }));
                }
                updateVariant(variantIndex, v => ({
                    ...v,
                    [parent]: { ...(v[parent] || {}), [child]: value }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [grandparent]: {
                        ...prev[grandparent],
                        [parent]: { ...prev[grandparent][parent], [child]: value }
                    }
                }));
            }
        } else if (parts.length === 2) {
            const [parent, child] = parts;
            if (parent === 'flatDetails') {
                if (variantIndex === 0) {
                    setFormData(prev => ({
                        ...prev,
                        [parent]: { ...prev[parent], [child]: value }
                    }));
                }
                updateVariant(variantIndex, v => ({ ...v, [child]: value }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            }
        }
    };

    const handleImageUpload = async (e, isCamera = false) => {
        const files = Array.from(e.target.files);
        console.log(`[FlatImage] ${isCamera ? 'Camera' : 'File'} upload started:`, {
            count: files.length,
            types: files.map(f => f.type),
            sizes: files.map(f => (f.size / 1024).toFixed(2) + 'KB')
        });

        if (media.length + files.length > 50) {
            toast.error('Maximum 50 images allowed');
            return;
        }

        const toastId = toast.loading(isCamera ? 'Processing photo...' : 'Processing images...');
        try {
            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
            const results = await Promise.all(
                files.map(async (file) => {
                    try {
                        const compressed = await imageCompression(file, options);
                        console.log(`[FlatImage] Compression success: ${file.name}`, {
                            original: (file.size / 1024).toFixed(2) + 'KB',
                            compressed: (compressed.size / 1024).toFixed(2) + 'KB'
                        });
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.readAsDataURL(compressed);
                        });
                    } catch (compressionError) {
                        console.warn(`[FlatImage] Compression failed for ${file.name}, using original:`, compressionError);
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.readAsDataURL(file);
                        });
                    }
                })
            );
            setMedia(prev => [...prev, ...results]);
            toast.success(`${files.length} images added`, { id: toastId });
        } catch (error) {
            console.error('[FlatImage] Upload failed:', error);
            toast.error('Failed to process images', { id: toastId });
        } finally {
            // CRITICAL: Clear the input value so the same file name (like camera's image.jpg) triggers onChange next time
            if (e.target) e.target.value = '';
        }
    };

    const handleCameraClick = async () => {
        if (isFlutterApp()) {
            const result = await openFlutterCamera();
            if (result) {
                setMedia(prev => [...prev, result]);
                toast.success('Photo captured');
                return;
            }
        }
        
        // Fallback to hidden file input for browser/non-flutter environment (Synchronous)
        cameraInputRef.current?.click();
    };

    const handleGalleryClick = () => {
        if (isFlutterApp()) {
            (async () => {
                const result = await openFlutterGallery();
                if (result) {
                    setMedia(prev => [...prev, result]);
                    toast.success('Image added');
                }
            })();
            return;
        }
        
        // Synchronous fallback
        document.getElementById('gallery-upload')?.click();
    };

    const removeImage = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
        if (media.length <= 1) setErrors(p => ({ ...p, media: null }));
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.title?.trim()) newErrors.title = "Listing title is required";
            if (!formData.description?.trim()) newErrors.description = "Description is required";
        }
        if (currentStep === 2) {
            flatVariants.forEach((v, idx) => {
                if (!v.flatType) newErrors[`flatDetails.${idx}.flatType`] = "Flat type is required";
                if (!v.builtUpArea) newErrors[`flatDetails.${idx}.builtUpArea`] = "Area is required";
                if (!v.floorNumber && v.floorNumber !== 0) newErrors[`flatDetails.${idx}.floorNumber`] = "Floor number is required";
                if (!v.totalFloors) newErrors[`flatDetails.${idx}.totalFloors`] = "Total floors required";
            });
        }
        if (currentStep === 3) {
            if (formData.listingType === 'Sale' && !formData.saleDetails.priceMin) newErrors['saleDetails.priceMin'] = "Price is required";
            if (formData.listingType === 'Rent' && !formData.rentDetails.monthlyRent) newErrors['rentDetails.monthlyRent'] = "Rent is required";
        }
        if (currentStep === 5) {
            if (formData.flatDetails.legal.reraApproved === 'Yes' && !formData.flatDetails.legal.reraNumber) {
                newErrors['flatDetails.legal.reraNumber'] = "RERA number is required";
            }
            if (!formData.location.address?.trim()) newErrors['location.address'] = "Address is required";
            if (!formData.location.city?.trim()) newErrors['location.city'] = "City is required";
            if (!formData.location.state?.trim()) newErrors['location.state'] = "State is required";
            if (media.length === 0) newErrors.media = "At least one photo is required";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstError = Object.keys(newErrors)[0];
            const el = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep(5)) return;

        const parseNumber = (val) => {
            if (!val) return null;
            const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? null : parsed;
        };

        try {
            setLoading(true);

            // Deep copy and format numerical fields
        const normalizedVariants = flatVariants
            .map(v => ({
                ...v,
                builtUpArea: parseNumber(v.builtUpArea),
                carpetArea: parseNumber(v.builtUpArea),
                commonArea: parseNumber(v.commonArea),
                floorNumber: parseNumber(v.floorNumber),
                totalFloors: parseNumber(v.totalFloors),
            }))
            .filter(v => String(v.flatType || '').trim() !== '');

        const payload = {
            ...formData,
            propertyType: "Flat",
            flatDetails: {
                ...(normalizedVariants[0] || flatVariants[0]),
            },
            flatVariants: normalizedVariants,
            media: media.map(m => ({ url: m.data }))
        };

            const response = isEdit
                ? await api.put(`/property/update/${initialData._id}`, payload)
                : await api.post('/property/add', payload);
            if (response.success) {
                localStorage.removeItem(DRAFT_KEY);
                toast.success(isEdit ? 'Flat updated successfully!' : 'Flat listed successfully!');
                // Refresh subscription status to update counts
                try {
                    await useSubscriptionStore.getState().refreshStatus();
                } catch (e) {
                    console.error("Refresh status failed", e);
                }
                navigate('/b2b-vendor/properties/manage-properties');
            }
        } catch (error) {
            toast.error(error.message || (isEdit ? 'Failed to update flat' : 'Failed to list flat'));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: "Basic Info", sub: "Step 1" },
        { id: 2, title: "Flat Details", sub: "Step 2" },
        { id: 3, title: "Pricing", sub: "Step 3" },
        { id: 4, title: "Facilities", sub: "Step 4" },
        { id: 5, title: "Legal & Media", sub: "Step 5" },
    ];

    const renderToggle = (name, currentValue, index = 0) => (
        <div className="flex gap-2">
            {['Yes', 'No'].map(val => (
                <button
                    key={val}
                    type="button"
                    onClick={() => handleToggle(name, val, index)}
                    className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold border-2 transition-all ${currentValue === val
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                        }`}
                >
                    {val}
                </button>
            ))}
        </div>
    );

    return (
        <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{isEdit ? 'Edit' : 'Add'} Flat</h1>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Growth your business with Dealing India</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center bg-white p-3 md:p-6 rounded-3xl shadow-sm border border-gray-50 overflow-x-auto gap-1 md:gap-4">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 flex-1">
                            <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all ${step >= s.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {step > s.id ? <FiCheck /> : s.id}
                            </div>
                            <div className="hidden md:block text-center text-[10px] font-black uppercase whitespace-nowrap">{s.title}</div>
                        </div>
                        {idx < steps.length - 1 && <div className={`h-[1px] md:h-[2px] flex-1 mx-0.5 md:mx-2 transition-all min-w-[8px] ${step > s.id ? 'bg-primary-600' : 'bg-slate-100'}`} />}
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-50 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Title <span className="text-red-500">*</span></label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.title ? 'border-red-500 bg-red-50' : 'border-transparent'} focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700`} placeholder="E.g. Luxury 3BHK Flat in City Center" />
                                {errors.title && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.title}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Type <span className="text-red-500">*</span></label>
                                    <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        {['Sale', 'Rent', 'Lease'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Description <span className="text-red-500">*</span></label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.description ? 'border-red-500 bg-red-50' : 'border-transparent'} focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[100px]`} placeholder="Brief description..." />
                                    {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.description}</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-xl font-black text-slate-900 uppercase">Flat Details</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={addVariant}
                                        disabled={flatVariants.length >= 6}
                                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                    >
                                        + Add BHK (Max 6)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {flatVariants.map((flat, idx) => (
                                    <div key={idx} className="border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm space-y-4 bg-white">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-gray-700 uppercase tracking-widest">BHK Option {idx + 1}</span>
                                            {flatVariants.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariant(idx)}
                                                    className="text-red-500 text-xs font-black uppercase tracking-widest hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Flat Type <span className="text-red-500">*</span></label>
                                                <select name="flatDetails.flatType" value={flat.flatType} onChange={(e) => handleChange(e, idx)} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors[`flatDetails.${idx}.flatType`] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold`}>
                                                    {['', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', '6BHK'].map(t => <option key={t || 'none'} value={t}>{t || 'Select'}</option>)}
                                                </select>
                                                {errors[`flatDetails.${idx}.flatType`] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors[`flatDetails.${idx}.flatType`]}</p>}
                                            </div>
                                             <div>
                                                <label className="text-[10px] font-black uppercase">Built-up Area <span className="text-red-500">*</span></label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" name="flatDetails.builtUpArea" value={flat.builtUpArea} onFocus={(e) => handleFocus(e, idx)} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={(e) => handleChange(e, idx)} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors[`flatDetails.${idx}.builtUpArea`] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold`} placeholder="E.g. 1200" />
                                                    <select name="flatDetails.carpetAreaUnit" value={flat.carpetAreaUnit} onChange={(e) => handleChange(e, idx)} className="w-full px-4 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                                        {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                                {errors[`flatDetails.${idx}.builtUpArea`] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors[`flatDetails.${idx}.builtUpArea`]}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Common Area (CAP %)</label>
                                                <input type="text" name="flatDetails.commonArea" value={flat.commonArea} onFocus={(e) => handleFocus(e, idx)} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={(e) => handleChange(e, idx)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" placeholder="E.g. 15" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Possession Type</label>
                                                <select name="flatDetails.possessionType" value={flat.possessionType} onChange={(e) => handleChange(e, idx)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold">
                                                    {['Ready to Move', 'Under Construction'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                             <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase">Floor Number <span className="text-red-500">*</span></label>
                                                    <input type="text" name="flatDetails.floorNumber" value={flat.floorNumber} onFocus={(e) => handleFocus(e, idx)} onKeyPress={(e) => handleNumberKeyPress(e)} onChange={(e) => handleChange(e, idx)} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors[`flatDetails.${idx}.floorNumber`] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold`} placeholder="E.g. 5" />
                                                    {errors[`flatDetails.${idx}.floorNumber`] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors[`flatDetails.${idx}.floorNumber`]}</p>}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase">Total Floors <span className="text-red-500">*</span></label>
                                                    <input type="text" name="flatDetails.totalFloors" value={flat.totalFloors} onFocus={(e) => handleFocus(e, idx)} onKeyPress={(e) => handleNumberKeyPress(e)} onChange={(e) => handleChange(e, idx)} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors[`flatDetails.${idx}.totalFloors`] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold`} placeholder="E.g. 15" />
                                                    {errors[`flatDetails.${idx}.totalFloors`] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors[`flatDetails.${idx}.totalFloors`]}</p>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Furnishing</label>
                                                <select name="flatDetails.furnishing" value={flat.furnishing} onChange={(e) => handleChange(e, idx)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold">
                                                    {['Unfurnished', 'Semi Furnished', 'Fully Furnished'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase">Age of Property</label>
                                                <select name="flatDetails.ageOfProperty" value={flat.ageOfProperty} onChange={(e) => handleChange(e, idx)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                                    <option value="">Select</option>
                                                    <option value="New">New</option>
                                                    <option value="0-5 years">0-5 years</option>
                                                    <option value="5-10 years">5-10 years</option>
                                                    <option value="10+ years">10+ years</option>
                                                    <option value="Under Construction">Under Construction</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            {formData.listingType === 'Sale' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Sale Details</div>
                                    <div className="space-y-1">
                                        <input type="number" name="saleDetails.priceMin" placeholder="Min Price *" value={formData.saleDetails.priceMin} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['saleDetails.priceMin'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold`} />
                                        {errors['saleDetails.priceMin'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['saleDetails.priceMin']}</p>}
                                    </div>
                                    <input type="number" name="saleDetails.priceMax" placeholder="Max Price" value={formData.saleDetails.priceMax} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" />
                                    <select name="saleDetails.priceUnit" value={formData.saleDetails.priceUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            )}

                            {formData.listingType === 'Rent' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Rent Details</div>
                                    <div className="space-y-1">
                                        <input type="number" name="rentDetails.monthlyRent" placeholder="Monthly Rent *" value={formData.rentDetails.monthlyRent} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['rentDetails.monthlyRent'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold`} />
                                        {errors['rentDetails.monthlyRent'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['rentDetails.monthlyRent']}</p>}
                                    </div>
                                    <select name="rentDetails.rentUnit" value={formData.rentDetails.rentUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="rentDetails.depositAmount" placeholder="Deposit Amount" value={formData.rentDetails.depositAmount} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" />
                                    <select name="rentDetails.depositUnit" value={formData.rentDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase">Maintenance</label>
                                        <select name="rentDetails.maintenance" value={formData.rentDetails.maintenance} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase">Vera Bill</label>
                                        <select name="rentDetails.veraBill" value={formData.rentDetails.veraBill} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {formData.listingType === 'Lease' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Lease Details</div>
                                    <input type="number" name="leaseDetails.monthlyLeaseRate" placeholder="Monthly Lease Rate" value={formData.leaseDetails.monthlyLeaseRate} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" />
                                    <select name="leaseDetails.leaseUnit" value={formData.leaseDetails.leaseUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="leaseDetails.depositAmount" placeholder="Deposit Amount" value={formData.leaseDetails.depositAmount} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" />
                                    <select name="leaseDetails.depositUnit" value={formData.leaseDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 border-2 border-slate-200 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="leaseDetails.leaseDurationYears" placeholder="Duration (Years)" value={formData.leaseDetails.leaseDurationYears} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold" />
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="text-xl font-black text-slate-900 uppercase">Facilities & Amenities</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary-600">Common Facilities</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase">Lift</span>
                                            <div className="w-32">{renderToggle('flatDetails.amenities.lift', formData.flatDetails.amenities.lift)}</div>
                                        </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Parking</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {['Car', 'Two-Wheeler', 'No'].map(type => (
                                                <label
                                                    key={type}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 cursor-pointer transition-all ${(Array.isArray(formData.flatDetails.amenities.parking) ? formData.flatDetails.amenities.parking : [formData.flatDetails.amenities.parking]).includes(type)
                                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100'
                                                        : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={(Array.isArray(formData.flatDetails.amenities.parking) ? formData.flatDetails.amenities.parking : [formData.flatDetails.amenities.parking]).includes(type)}
                                                        onChange={() => {
                                                            const current = Array.isArray(formData.flatDetails.amenities.parking) ? formData.flatDetails.amenities.parking : (formData.flatDetails.amenities.parking ? [formData.flatDetails.amenities.parking] : []);
                                                            let next;
                                                            if (type === 'No') {
                                                                next = ['No'];
                                                            } else {
                                                                const withoutNo = current.filter(t => t !== 'No');
                                                                next = withoutNo.includes(type) ? withoutNo.filter(t => t !== type) : [...withoutNo, type];
                                                                if (next.length === 0) next = ['No'];
                                                            }
                                                            handleToggle('flatDetails.amenities.parking', next, 0);
                                                        }}
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                        {['security', 'cctv', 'powerBackup', 'gasPipeline'].map(field => (
                                            <div key={field} className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                <div className="w-32">{renderToggle(`flatDetails.amenities.${field}`, formData.flatDetails.amenities[field])}</div>
                                            </div>
                                        ))}
                                         <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Water Supply</span>
                                            <div className="flex gap-2 flex-wrap">
                                                {['24hr', 'Borewell', 'Municipal', 'No'].map(type => (
                                                    <label
                                                        key={type}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 cursor-pointer transition-all ${(Array.isArray(formData.flatDetails.amenities.waterSupply) ? formData.flatDetails.amenities.waterSupply : [formData.flatDetails.amenities.waterSupply]).includes(type)
                                                            ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100'
                                                            : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                                                            }`}
                                                    >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={(Array.isArray(formData.flatDetails.amenities.waterSupply) ? formData.flatDetails.amenities.waterSupply : [formData.flatDetails.amenities.waterSupply]).includes(type)}
                                                        onChange={() => {
                                                            const current = Array.isArray(formData.flatDetails.amenities.waterSupply) ? formData.flatDetails.amenities.waterSupply : [formData.flatDetails.amenities.waterSupply];
                                                            let updated;
                                                            if (type === 'No') {
                                                                updated = ['No'];
                                                            } else {
                                                                const withoutNo = current.filter(t => t !== 'No');
                                                                if (withoutNo.includes(type)) {
                                                                    updated = withoutNo.filter(t => t !== type);
                                                                } else {
                                                                    updated = [...withoutNo, type];
                                                                }
                                                                if (updated.length === 0) updated = ['No'];
                                                            }
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                flatDetails: {
                                                                    ...prev.flatDetails,
                                                                    amenities: {
                                                                        ...prev.flatDetails.amenities,
                                                                        waterSupply: updated
                                                                    }
                                                                }
                                                            }));
                                                            updateVariant(0, v => ({
                                                                ...v,
                                                                amenities: {
                                                                    ...(v.amenities || {}),
                                                                    waterSupply: updated
                                                                }
                                                            }));
                                                        }}
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary-600">Premium Amenities</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {['swimmingPool', 'gym', 'garden', 'childrenPlayArea', 'clubHouse', 'temple', 'societyOffice', 'gameZone'].map(field => (
                                            <div key={field} className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                <div className="w-32">{renderToggle(`flatDetails.amenities.${field}`, formData.flatDetails.amenities[field])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="text-xl font-black text-slate-900 uppercase">Legal & Financial</div>
                                    <div className="space-y-4">
                                        {formData.listingType === 'Sale' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">Loan Available</span>
                                                <div className="w-32">{renderToggle('flatDetails.legal.loanAvailable', formData.flatDetails.legal.loanAvailable)}</div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase">RERA Approved</span>
                                            <div className="w-32">{renderToggle('flatDetails.legal.reraApproved', formData.flatDetails.legal.reraApproved)}</div>
                                        </div>
                                        {formData.flatDetails.legal.reraApproved === 'Yes' && (
                                            <div className="space-y-2 pt-2">
                                                <label className="text-[10px] font-black uppercase">RERA Number <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    name="flatDetails.legal.reraNumber"
                                                    value={formData.flatDetails.legal.reraNumber || ''}
                                                    onFocus={handleFocus}
                                                    onKeyPress={handleNumberKeyPress}
                                                    onChange={handleChange}
                                                    className={`w-full px-6 py-3 bg-slate-50 border-2 ${errors['flatDetails.legal.reraNumber'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} focus:border-slate-300 rounded-2xl outline-none font-bold text-slate-700 text-xs`}
                                                    placeholder="Enter RERA Number"
                                                />
                                                {errors['flatDetails.legal.reraNumber'] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors['flatDetails.legal.reraNumber']}</p>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-xl font-black text-slate-900 uppercase pt-4">Location</div>
                                    <div className="space-y-4">
                                    <div className="space-y-1">
                                        <textarea name="location.address" placeholder="Full Address *" value={formData.location.address} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['location.address'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl font-bold min-h-[80px]`} />
                                        {errors['location.address'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['location.address']}</p>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-black uppercase">City <span className="text-red-500">*</span></label>
                                                <input name="location.city" placeholder="City" value={formData.location.city} onKeyPress={handleAlphabetKeyPress} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.city'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                {errors['location.city'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.city']}</p>}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-black uppercase">Area <span className="text-red-500">*</span></label>
                                                <input name="location.area" placeholder="Area" value={formData.location.area} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.area'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                {errors['location.area'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.area']}</p>}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] font-black uppercase">State <span className="text-red-500">*</span></label>
                                                <input name="location.state" placeholder="State" value={formData.location.state} onKeyPress={handleAlphabetKeyPress} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.state'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                {errors['location.state'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.state']}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                                <input
                                                    name="location.mapUrl"
                                                    placeholder="Google Map URL"
                                                    value={formData.location.mapUrl}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs flex-1"
                                                />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="text-xl font-black text-slate-900 uppercase">Media</div>
                                    <p className="text-[10px] text-primary-600 font-black uppercase tracking-widest mb-2">Note: Please upload square images (1:1 ratio) for better display.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {media.map((img, idx) => (
                                            <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100">
                                                <img src={img.data} alt="preview" className="w-full h-full object-cover" />
                                                <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"><FiTrash2 size={12} /></button>
                                            </div>
                                        ))}
                                        {media.length < 50 && (
                                            <>
                                            <input
                                                type="file"
                                                ref={cameraInputRef}
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, true)}
                                                className="hidden"
                                            />
                                            <div className="contents">
                                                <button
                                                    type="button"
                                                    onClick={handleCameraClick}
                                                    className={`aspect-square rounded-2xl border-2 border-dashed ${errors.media ? 'border-red-500 bg-red-50' : 'border-slate-200'} flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all text-primary-600`}
                                                >
                                                    <FiCamera size={24} />
                                                    <span className="text-[10px] font-black uppercase">Camera</span>
                                                </button>

                                                <div className="flex-1 relative">
                                                    <input
                                                        id="gallery-upload"
                                                        type="file"
                                                        multiple
                                                        accept="image/png, image/jpeg, image/webp"
                                                        onChange={(e) => handleImageUpload(e, false)}
                                                        className="hidden"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleGalleryClick}
                                                        className={`w-full aspect-square rounded-2xl border-2 border-dashed ${errors.media ? 'border-red-500 bg-red-50' : 'border-slate-200'} flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-400 transition-all`}
                                                    >
                                                        <FiPlus size={24} />
                                                        <span className="text-[10px] font-bold uppercase">Gallery</span>
                                                    </button>
                                                </div>
                                            </div>
                                            </>
                                        )}
                                    </div>
                                    {errors.media && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.media}</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="mt-12 flex flex-row items-center justify-between pt-8 border-t border-slate-100 gap-3 md:gap-4">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all md:flex-none md:px-8 md:text-xs md:min-w-[120px]">Back</button>
                    ) : <div />}

                    {step < 5 ? (
                        <button onClick={() => { if (validateStep(step)) setStep(s => s + 1); }} className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all md:flex-none md:px-10 md:text-xs">Next Step</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} className="flex-[2] md:flex-none px-6 md:px-12 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50 md:min-w-[200px] flex items-center justify-center">
                            {loading ? 'Processing...' : 'Complete Listing'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
        </>
    );
};

export default FlatForm;
