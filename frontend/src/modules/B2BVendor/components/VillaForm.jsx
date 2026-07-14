import { useState, useEffect, useRef } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "../../../shared/utils/toast";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { openFlutterCamera, openFlutterGallery } from "../../../shared/utils/flutterBridge";

const VillaForm = ({ initialData, isEdit, formType = "Villa" }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);
    const cameraInputRef = useRef(null);
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const DRAFT_KEY = `b2b_plot_add_draft_${vendorId}`;

    const [media, setMedia] = useState(() => {
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).media || []; } catch (e) { }
            }
        }
        return [];
    });

    // Logic to determine initial property type
    const initialPropertyType = initialData?.propertyType || (formType === "Row house / Villa" ? "Villa" : formType);

    const [formData, setFormData] = useState(() => {
        const defaultData = {
            title: '', listingType: 'Sale', description: '', propertyType: initialPropertyType,
            saleDetails: { priceMin: '', priceMax: '', priceUnit: 'Lakh' },
            rentDetails: { monthlyRent: '', rentUnit: 'Thousand', depositAmount: '', depositUnit: 'Thousand', maintenance: 'Excluded', veraBill: 'Excluded' },
            leaseDetails: { monthlyLeaseRate: '', leaseUnit: 'Lakh', depositAmount: '', depositUnit: 'Thousand', leaseDurationYears: '' },
            plotDetails: {
                plotArea: '', plotAreaUnit: 'Sq. Ft.', builtUpArea: '', commonArea: '', possessionType: 'Ready to Move', builtUpAreaUnit: 'Sq. Ft.', floors: 'G+1', masterRoom: 'No', bedrooms: '', bathrooms: '', balcony: '', furnishing: 'Unfurnished', ageOfProperty: '',
                privateFacilities: { privateParking: 'No', gardenArea: 'No', personalBorewell: 'No', solarSystem: 'No', storeRoom: 'No', servantRoom: 'No' },
                amenities: { parking: ['Ground Parking'], security: 'No', cctv: 'No', powerBackup: 'No', waterSupply: ['Municipal'], gasPipeline: 'No', swimmingPool: 'No', gym: 'No', garden: 'No', childrenPlayArea: 'No', clubHouse: 'No', temple: 'No', societyOffice: 'No', gameZone: 'No' },
                legal: { loanAvailable: 'No', reraApproved: 'No', reraNumber: '' }
            },
            location: { address: '', area: '', state: '', city: '', mapUrl: '' }
        };

        if (initialData) return defaultData;
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).formData || defaultData; } catch (e) { }
            }
        }
        return defaultData;
    });

    // Auto-save draft
    useEffect(() => {
        if (!isEdit && vendorId !== "anonymous") {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, media }));
        } else if (isEdit) {
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [formData, media, isEdit, DRAFT_KEY, vendorId]);

    // Sync with initialData if editing
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                location: {
                    ...prev.location,
                    ...(initialData.location || {}),
                    state: initialData.location?.state ?? initialData.location?.market ?? ''
                },
                plotDetails: {
                    ...prev.plotDetails,
                    ...(initialData.plotDetails || {})
                }
            }));
            if (initialData.media) {
                setMedia(initialData.media.map(m => ({ url: m.url, name: 'Existing Image' })));
            }
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

        if (name.includes('.')) {
            const parts = name.split('.');
            if (parts.length === 2) {
                const [parent, child] = parts;
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            } else if (parts.length === 3) {
                const [p1, p2, p3] = parts;
                setFormData(prev => ({
                    ...prev,
                    [p1]: { ...prev[p1], [p2]: { ...prev[p1][p2], [p3]: value } }
                }));
            } else if (parts.length === 4) {
                const [gp, p, c, gc] = parts;
                setFormData(prev => ({
                    ...prev,
                    [gp]: {
                        ...prev[gp],
                        [p]: {
                            ...prev[gp][p],
                            [c]: { ...prev[gp][p][c], [gc]: value }
                        }
                    }
                }));
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

    const handleFocus = (e) => {
        if (e.target.value === '0') {
            const { name } = e.target;
            if (name.includes('.')) {
                const [parent, child] = name.split('.');
                setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: '' } }));
            } else {
                setFormData(prev => ({ ...prev, [name]: '' }));
            }
        }
    };

    const handleToggle = (name, value) => {
        const parts = name.split('.');
        if (parts.length === 4) {
            const [gp, p, c, gc] = parts;
            setFormData(prev => ({
                ...prev,
                [gp]: {
                    ...prev[gp],
                    [p]: {
                        ...prev[gp][p],
                        [c]: { ...prev[gp][p][c], [gc]: value }
                    }
                }
            }));
        } else if (parts.length === 3) {
            const [grandparent, parent, child] = parts;
            setFormData(prev => ({
                ...prev,
                [grandparent]: {
                    ...prev[grandparent],
                    [parent]: { ...prev[grandparent][parent], [child]: value }
                }
            }));
        } else if (parts.length === 2) {
            const [parent, child] = parts;
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        }
    };

    const handleImageUpload = async (e, isCamera = false) => {
        const files = Array.from(e.target.files);
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
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.readAsDataURL(compressed);
                        });
                    } catch (compressionError) {
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
            toast.error('Failed to process images', { id: toastId });
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const isFlutterApp = () => typeof window !== 'undefined' && window.flutter_inappwebview != null;

    const handleCameraClick = async () => {
        if (isFlutterApp()) {
            const result = await openFlutterCamera();
            if (result) {
                setMedia(prev => [...prev, result]);
                toast.success('Photo captured');
            } else {
                cameraInputRef.current?.click();
            }
        } else {
            cameraInputRef.current?.click();
        }
    };

    const handleGalleryClick = async () => {
        if (isFlutterApp()) {
            const result = await openFlutterGallery();
            if (result) {
                setMedia(prev => [...prev, result]);
                toast.success('Image added');
            } else {
                document.getElementById('gallery-upload')?.click();
            }
        } else {
            document.getElementById('gallery-upload')?.click();
        }
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
                        if (!formData.plotDetails.plotArea) newErrors['plotDetails.plotArea'] = "Area is required";
                        if (formData.propertyType === 'Villa') {
                            if (!formData.plotDetails.bedrooms) newErrors['plotDetails.bedrooms'] = "Bedrooms are required";
                            if (!formData.plotDetails.bathrooms) newErrors['plotDetails.bathrooms'] = "Bathrooms are required";
                            if (!formData.plotDetails.balcony) newErrors['plotDetails.balcony'] = "Balcony is required";
                        }
                    }
                    if (currentStep === 3) {
                        if (formData.listingType === 'Sale' && !formData.saleDetails.priceMin) newErrors['saleDetails.priceMin'] = "Price is required";
                        if (formData.listingType === 'Rent' && !formData.rentDetails.monthlyRent) newErrors['rentDetails.monthlyRent'] = "Rent is required";
                    }
                    if (currentStep === 5) {
                        if (formData.plotDetails.legal.reraApproved === 'Yes' && !formData.plotDetails.legal.reraNumber) {
                            newErrors['plotDetails.legal.reraNumber'] = "RERA number is required";
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
                        const payload = {
                            ...formData,
                            plotDetails: {
                                ...formData.plotDetails,
                                plotArea: parseNumber(formData.plotDetails.plotArea),
                                builtUpArea: parseNumber(formData.plotDetails.builtUpArea),
                                commonArea: parseNumber(formData.plotDetails.commonArea),
                                bedrooms: parseNumber(formData.plotDetails.bedrooms),
                                bathrooms: parseNumber(formData.plotDetails.bathrooms),
                                balcony: parseNumber(formData.plotDetails.balcony),
                            },
                            media: media.map(m => ({ url: m.data }))
                        };
                        const response = isEdit
                            ? await api.put(`/property/update/${initialData._id}`, payload)
                            : await api.post('/property/add', payload);
                        if (response.success) {
                            localStorage.removeItem(DRAFT_KEY);
                            toast.success(`${formType} listed successfully!`);
                            try { await useSubscriptionStore.getState().refreshStatus(); } catch (e) { }
                            navigate('/b2b-vendor/properties/manage-properties');
                        }
                    } catch (error) {
                        toast.error(error.message || 'Failed to list villa');
                    } finally {
                        setLoading(false);
                    }
                };

                const steps = [
                    { id: 1, title: "Basic Info", sub: "Step 1" },
                    { id: 2, title: `${formType} Details`, sub: "Step 2" },
                    { id: 3, title: "Pricing", sub: "Step 3" },
                    { id: 4, title: "Facilities", sub: "Step 4" },
                    { id: 5, title: "Legal & Media", sub: "Step 5" },
                ];

                const renderToggle = (name, currentValue) => (
                    <div className="flex gap-2">
                        {['Yes', 'No'].map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => handleToggle(name, val)}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-20">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                                <FiArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{isEdit ? 'Edit' : 'Add'} {formType}</h1>
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Growth your business with Dealing India</p>
                            </div>
                        </div>

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

                        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-50 min-h-[500px]">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Title <span className="text-red-500">*</span></label>
                                            <input type="text" name="title" value={formData.title} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.title ? 'border-red-500 bg-red-50' : 'border-transparent'} focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700`} placeholder={`E.g. Residential ${formType} in Prime Location`} />
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
                                    <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                        <div className="text-xl font-black text-slate-900 uppercase">{formType} Details</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Plot Area <span className="text-red-500">*</span></label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" name="plotDetails.plotArea" value={formData.plotDetails.plotArea} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['plotDetails.plotArea'] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold`} placeholder="E.g. 2000" />
                                                    <select name="plotDetails.plotAreaUnit" value={formData.plotDetails.plotAreaUnit} onChange={handleChange} className="w-full px-4 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                        {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                                {errors['plotDetails.plotArea'] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors['plotDetails.plotArea']}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Built-up Area</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" name="plotDetails.builtUpArea" value={formData.plotDetails.builtUpArea} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 1500" />
                                                    <select name="plotDetails.builtUpAreaUnit" value={formData.plotDetails.builtUpAreaUnit} onChange={handleChange} className="w-full px-4 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                        {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Common Area (CAP %)</label>
                                                <input type="text" name="plotDetails.commonArea" value={formData.plotDetails.commonArea} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 15" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Possession Type</label>
                                                <select name="plotDetails.possessionType" value={formData.plotDetails.possessionType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                                    {['Ready to Move', 'Under Construction'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">Master Room</span>
                                                <div className="w-32">{renderToggle('plotDetails.masterRoom', formData.plotDetails.masterRoom)}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Bedrooms <span className="text-red-500">*</span></label>
                                                <input type="text" name="plotDetails.bedrooms" value={formData.plotDetails.bedrooms} onFocus={handleFocus} onKeyPress={handleNumberKeyPress} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 3" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Bathrooms <span className="text-red-500">*</span></label>
                                                <input type="text" name="plotDetails.bathrooms" value={formData.plotDetails.bathrooms} onFocus={handleFocus} onKeyPress={handleNumberKeyPress} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 2" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Balcony <span className="text-red-500">*</span></label>
                                                <input type="text" name="plotDetails.balcony" value={formData.plotDetails.balcony} onFocus={handleFocus} onKeyPress={handleNumberKeyPress} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 1" />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase">Furnishing</label>
                                                <select name="plotDetails.furnishing" value={formData.plotDetails.furnishing} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                                    {['Unfurnished', 'Semi Furnished', 'Fully Furnished'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Age of Property</label>
                                                <select name="plotDetails.ageOfProperty" value={formData.plotDetails.ageOfProperty} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                                    <option value="New">New</option>
                                                    <option value="0-5 years">0-5 years</option>
                                                    <option value="5-10 years">5-10 years</option>
                                                    <option value="10+ years">10+ years</option>
                                                    <option value="Under Construction">Under Construction</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase">Floors</label>
                                                <select name="plotDetails.floors" value={formData.plotDetails.floors} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                                    <option value="Ground">Ground</option>
                                                    <option value="G+1">G+1</option>
                                                    <option value="G+2">G+2</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                        {formData.listingType === 'Sale' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Sale Details</div>
                                                <div className="space-y-1">
                                                    <input type="text" name="saleDetails.priceMin" placeholder="Min Price *" value={formData.saleDetails.priceMin} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['saleDetails.priceMin'] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold`} />
                                                    {errors['saleDetails.priceMin'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['saleDetails.priceMin']}</p>}
                                                </div>
                                                <input type="text" name="saleDetails.priceMax" placeholder="Max Price" value={formData.saleDetails.priceMax} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                                <select name="saleDetails.priceUnit" value={formData.saleDetails.priceUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                    {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {formData.listingType === 'Rent' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Rent Details</div>
                                                <div className="space-y-1">
                                                    <input type="text" name="rentDetails.monthlyRent" placeholder="Monthly Rent *" value={formData.rentDetails.monthlyRent} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['rentDetails.monthlyRent'] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold`} />
                                                    {errors['rentDetails.monthlyRent'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['rentDetails.monthlyRent']}</p>}
                                                </div>
                                                <select name="rentDetails.rentUnit" value={formData.rentDetails.rentUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                    {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <input type="text" name="rentDetails.depositAmount" placeholder="Deposit Amount" value={formData.rentDetails.depositAmount} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                                <select name="rentDetails.depositUnit" value={formData.rentDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                    {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase">Maintenance</label>
                                                    <select name="rentDetails.maintenance" value={formData.rentDetails.maintenance} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                                        <option value="Included">Included</option>
                                                        <option value="Excluded">Excluded</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase">Vera Bill</label>
                                                    <select name="rentDetails.veraBill" value={formData.rentDetails.veraBill} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                                        <option value="Included">Included</option>
                                                        <option value="Excluded">Excluded</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {formData.listingType === 'Lease' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Lease Details</div>
                                                <input type="text" name="leaseDetails.monthlyLeaseRate" placeholder="Monthly Lease Rate" value={formData.leaseDetails.monthlyLeaseRate} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                                <select name="leaseDetails.leaseUnit" value={formData.leaseDetails.leaseUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                    {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <input type="text" name="leaseDetails.depositAmount" placeholder="Deposit Amount" value={formData.leaseDetails.depositAmount} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                                <select name="leaseDetails.depositUnit" value={formData.leaseDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                                    {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <input type="text" name="leaseDetails.leaseDurationYears" placeholder="Duration (Years)" value={formData.leaseDetails.leaseDurationYears} onFocus={handleFocus} onKeyPress={handleNumberKeyPress} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-primary-600">Private Facilities</h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {['privateParking', 'gardenArea', 'personalBorewell', 'solarSystem', 'storeRoom', 'servantRoom'].map(field => (
                                                        <div key={field} className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                            <div className="w-32">{renderToggle(`plotDetails.privateFacilities.${field}`, formData.plotDetails.privateFacilities[field])}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-primary-600">Common & Premium</h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Parking</span>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['Car', 'Two-Wheeler', 'No'].map(type => (
                                                                <label key={type} className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 cursor-pointer transition-all ${(Array.isArray(formData.plotDetails.amenities.parking) ? formData.plotDetails.amenities.parking : [formData.plotDetails.amenities.parking]).includes(type) ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>
                                                                    <input type="checkbox" className="hidden" checked={(Array.isArray(formData.plotDetails.amenities.parking) ? formData.plotDetails.amenities.parking : [formData.plotDetails.amenities.parking]).includes(type)} onChange={() => {
                                                                        const current = Array.isArray(formData.plotDetails.amenities.parking) ? formData.plotDetails.amenities.parking : (formData.plotDetails.amenities.parking ? [formData.plotDetails.amenities.parking] : []);
                                                                        let next;
                                                                        if (type === 'No') {
                                                                            next = ['No'];
                                                                        } else {
                                                                            const withoutNo = current.filter(t => t !== 'No');
                                                                            next = withoutNo.includes(type) ? withoutNo.filter(t => t !== type) : [...withoutNo, type];
                                                                            if (next.length === 0) next = ['No'];
                                                                        }
                                                                        handleToggle('plotDetails.amenities.parking', next);
                                                                    }} />
                                                                    {type}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {['security', 'cctv', 'powerBackup', 'swimmingPool', 'gym', 'clubHouse', 'gameZone'].map(field => (
                                                        <div key={field} className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                            <div className="w-32">{renderToggle(`plotDetails.amenities.${field}`, formData.plotDetails.amenities[field])}</div>
                                                        </div>
                                                    ))}
                                                    <div className="flex flex-col gap-2 pt-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Water Supply</span>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['24hr', 'Borewell', 'Municipal', 'No'].map(type => (
                                                                <label key={type} className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 cursor-pointer transition-all ${(Array.isArray(formData.plotDetails.amenities.waterSupply) ? formData.plotDetails.amenities.waterSupply : [formData.plotDetails.amenities.waterSupply]).includes(type) ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>
                                                                    <input type="checkbox" className="hidden" checked={(Array.isArray(formData.plotDetails.amenities.waterSupply) ? formData.plotDetails.amenities.waterSupply : [formData.plotDetails.amenities.waterSupply]).includes(type)} onChange={() => {
                                                                        const current = Array.isArray(formData.plotDetails.amenities.waterSupply) ? formData.plotDetails.amenities.waterSupply : [formData.plotDetails.amenities.waterSupply];
                                                                        let updated;
                                                                        if (type === 'No') { updated = ['No']; } else {
                                                                            const withoutNo = current.filter(t => t !== 'No');
                                                                            if (withoutNo.includes(type)) { updated = withoutNo.filter(t => t !== type); } else { updated = [...withoutNo, type]; }
                                                                            if (updated.length === 0) updated = ['No'];
                                                                        }
                                                                        setFormData(prev => ({ ...prev, plotDetails: { ...prev.plotDetails, amenities: { ...prev.plotDetails.amenities, waterSupply: updated } } }));
                                                                    }} />
                                                                    {type}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
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
                                                            <div className="w-32">{renderToggle('plotDetails.legal.loanAvailable', formData.plotDetails.legal.loanAvailable)}</div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase">RERA Approved</span>
                                                        <div className="w-32">{renderToggle('plotDetails.legal.reraApproved', formData.plotDetails.legal.reraApproved)}</div>
                                                    </div>
                                                    {formData.plotDetails.legal.reraApproved === 'Yes' && (
                                                        <div className="space-y-2 pt-2">
                                                            <label className="text-[10px] font-black uppercase">RERA Number <span className="text-red-500">*</span></label>
                                                            <input type="text" name="plotDetails.legal.reraNumber" value={formData.plotDetails.legal.reraNumber || ''} onFocus={handleFocus} onKeyPress={handleNumberKeyPress} onChange={handleChange} className={`w-full px-6 py-3 bg-slate-50 border-2 ${errors['plotDetails.legal.reraNumber'] ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-slate-300'} rounded-2xl outline-none font-bold text-slate-700 text-xs`} placeholder="Enter RERA Number" />
                                                            {errors['plotDetails.legal.reraNumber'] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors['plotDetails.legal.reraNumber']}</p>}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-xl font-black text-slate-900 uppercase pt-4">Location</div>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <textarea name="location.address" placeholder="Full Address *" value={formData.location.address} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['location.address'] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold min-h-[80px]`} />
                                                        {errors['location.address'] && <p className="text-[10px] text-red-500 font-bold ml-1">{errors['location.address']}</p>}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[8px] font-black uppercase">City <span className="text-red-500">*</span></label>
                                                            <input name="location.city" value={formData.location.city} onKeyPress={handleAlphabetKeyPress} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.city'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                            {errors['location.city'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.city']}</p>}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[8px] font-black uppercase">Area <span className="text-red-500">*</span></label>
                                                            <input name="location.area" value={formData.location.area} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.area'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                            {errors['location.area'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.area']}</p>}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[8px] font-black uppercase">State <span className="text-red-500">*</span></label>
                                                            <input name="location.state" value={formData.location.state} onKeyPress={handleAlphabetKeyPress} onChange={handleChange} className={`px-4 py-3 bg-slate-50 border-2 ${errors['location.state'] ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-xl font-bold text-xs`} />
                                                            {errors['location.state'] && <p className="text-[8px] text-red-500 font-bold ml-1">{errors['location.state']}</p>}
                                                        </div>
                                                    </div>
                                                    <input name="location.mapUrl" placeholder="Google Map URL" value={formData.location.mapUrl} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-xs" />
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
                                                        <div className="contents">
                                                            <input type="file" ref={cameraInputRef} accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
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
                                                    )}
                                                </div>
                                                {errors.media && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.media}</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer Controls */}
                            <div className="mt-12 flex flex-row items-center justify-between pt-8 border-t border-slate-50 gap-3 md:gap-4">
                                {step > 1 ? (
                                    <button onClick={() => setStep(s => s - 1)} className="flex-1 md:flex-none px-4 md:px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-200 transition-all md:min-w-[120px]">Back</button>
                                ) : <div />}

                                {step < 5 ? (
                                    <button onClick={() => { if (validateStep(step)) setStep(s => s + 1); }} className="flex-1 md:flex-none px-6 md:px-10 py-4 bg-primary-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all">Next Step</button>
                                ) : (
                                    <button onClick={handleSubmit} disabled={loading} className="flex-[2] md:flex-none px-6 md:px-12 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50 md:min-w-[200px] flex items-center justify-center">
                                        {loading ? 'Processing...' : 'Complete Listing'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            };

            export default VillaForm;
