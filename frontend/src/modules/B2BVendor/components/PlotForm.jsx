import { useState, useEffect, useRef } from "react";
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

const PlotForm = ({ initialData, isEdit, formType = "Plot" }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);
    const cameraInputRef = useRef(null);
    const { vendor } = useB2BVendorAuthStore();
    const vendorId = vendor?._id || vendor?.id || "anonymous";
    const DRAFT_KEY = `b2b_plot_add_draft_${vendorId}`;

    const [media, setMedia] = useState([]);

    const initialPropertyType = "Plot";

    const [formData, setFormData] = useState({
        title: '', listingType: 'Sale', description: '', propertyType: initialPropertyType,
        saleDetails: { priceMin: '', priceMax: '', priceUnit: 'Lakh' },
        rentDetails: { monthlyRent: '', rentUnit: 'Thousand', depositAmount: '', depositUnit: 'Thousand', maintenance: 'Excluded', veraBill: 'Excluded' },
        leaseDetails: { monthlyLeaseRate: '', leaseUnit: 'Lakh', depositAmount: '', depositUnit: 'Thousand', leaseDurationYears: '' },
        plotDetails: {
            length: '', width: '', plotArea: '', plotAreaUnit: 'Sq. Ft.'
        },
        location: { address: '', area: '', state: '', city: '', mapUrl: '' }
    });

    useFormPersist(DRAFT_KEY, { formData, media }, (data) => {
        if (data.formData) setFormData(data.formData);
        if (data.media) setMedia(data.media);
    }, !isEdit);

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
        
        setFormData(prev => {
            const newState = { ...prev };
            if (name.includes('.')) {
                const parts = name.split('.');
                const [parent, child] = parts;
                newState[parent] = { ...newState[parent], [child]: value };
            } else {
                newState[name] = value;
            }

            // Automatic Plot Area Calculation
            if (name === 'plotDetails.length' || name === 'plotDetails.width') {
                const len = parseFloat(name === 'plotDetails.length' ? value : newState.plotDetails.length) || 0;
                const wid = parseFloat(name === 'plotDetails.width' ? value : newState.plotDetails.width) || 0;
                if (len > 0 && wid > 0) {
                    newState.plotDetails.plotArea = (len * wid).toString();
                } else {
                    newState.plotDetails.plotArea = '';
                }
            }
            
            // Unit conversion
            if (name === 'plotDetails.plotAreaUnit') {
                const oldUnit = prev.plotDetails.plotAreaUnit;
                const newUnit = value;
                const currentArea = parseFloat(newState.plotDetails.plotArea);
                if (!isNaN(currentArea) && currentArea > 0 && oldUnit !== newUnit) {
                    const toSqFt = {
                        'Sq. Ft.': 1,
                        'Sq. Mt.': 10.7639,
                        'Sq. Yd.': 9,
                        'Acre': 43560,
                        'Gaj': 9
                    };
                    const sqFt = currentArea * (toSqFt[oldUnit] || 1);
                    const newArea = sqFt / (toSqFt[newUnit] || 1);
                    // round to 2 decimal places to avoid long repeating decimals
                    newState.plotDetails.plotArea = parseFloat(newArea.toFixed(2)).toString();
                }
            }

            return newState;
        });
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

    const handleCameraClick = async () => {
        if (isFlutterApp()) {
            const result = await openFlutterCamera();
            if (result) {
                setMedia(prev => [...prev, result]);
                toast.success('Photo captured');
                return;
            }
        }
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
            if (!formData.plotDetails.plotArea) newErrors['plotDetails.plotArea'] = "Area is required";
        }
        if (currentStep === 2) {
            if (formData.listingType === 'Sale' && !formData.saleDetails.priceMin) newErrors['saleDetails.priceMin'] = "Price is required";
            if (formData.listingType === 'Rent' && !formData.rentDetails.monthlyRent) newErrors['rentDetails.monthlyRent'] = "Rent is required";
        }
        if (currentStep === 3) {
            if (!formData.location.address?.trim()) newErrors['location.address'] = "Address is required";
            if (!formData.location.city?.trim()) newErrors['location.city'] = "City is required";
            if (!formData.location.state?.trim()) newErrors['location.state'] = "State is required";
            if (!formData.location.area?.trim()) newErrors['location.area'] = "Area is required";
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
        if (!validateStep(3)) return;
        const parseNumber = (val) => {
            if (!val) return null;
            const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? null : parsed;
        };
        try {
            setLoading(true);
            const payload = {
                title: formData.title,
                description: formData.description,
                listingType: formData.listingType,
                propertyType: formData.propertyType,
                saleDetails: formData.saleDetails,
                rentDetails: formData.rentDetails,
                leaseDetails: formData.leaseDetails,
                plotDetails: {
                    length: parseNumber(formData.plotDetails.length),
                    width: parseNumber(formData.plotDetails.width),
                    plotArea: parseNumber(formData.plotDetails.plotArea),
                    plotAreaUnit: formData.plotDetails.plotAreaUnit
                },
                location: formData.location,
                media: media.map(m => ({ url: m.data || m.url }))
            };
            const response = isEdit
                ? await api.put(`/property/update/${initialData._id}`, payload)
                : await api.post('/property/add', payload);
            if (response.success) {
                localStorage.removeItem(DRAFT_KEY);
                toast.success(`${formType} listed successfully!`);
                try { await useSubscriptionStore.getState().refreshStatus(); } catch (e) {}
                navigate('/b2b-vendor/properties/manage-properties');
            }
        } catch (error) {
            toast.error(error.message || `Failed to list ${formType.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: "Basic Info & Size", sub: "Step 1" },
        { id: 2, title: "Pricing", sub: "Step 2" },
        { id: 3, title: "Legal & Media", sub: "Step 3" },
    ];

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
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.title ? 'border-red-500 bg-red-50' : 'border-transparent'} focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700`} placeholder={`E.g. Commercial Plot in Prime Location`} />
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
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Plot Dimensions</label>
                                    <div className="flex items-center gap-2">
                                        <input type="text" name="plotDetails.length" value={formData.plotDetails.length} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl font-bold`} placeholder="Length" />
                                        <span className="font-black text-slate-300">×</span>
                                        <input type="text" name="plotDetails.width" value={formData.plotDetails.width} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl font-bold`} placeholder="Width" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Calculated Plot Area <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" name="plotDetails.plotArea" value={formData.plotDetails.plotArea} onFocus={handleFocus} onKeyPress={(e) => handleNumberKeyPress(e, true)} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors['plotDetails.plotArea'] ? 'border-red-500 bg-red-50' : 'border-transparent'} rounded-2xl font-bold`} placeholder="E.g. 2000" />
                                        <select name="plotDetails.plotAreaUnit" value={formData.plotDetails.plotAreaUnit} onChange={handleChange} className="w-full px-4 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                            {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    {errors['plotDetails.plotArea'] && <p className="text-[8px] text-red-500 font-bold mt-1 ml-1">{errors['plotDetails.plotArea']}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Description <span className="text-red-500">*</span></label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.description ? 'border-red-500 bg-red-50' : 'border-transparent'} focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[100px]`} placeholder="Brief description..." />
                                    {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.description}</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
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

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
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
                                                <img src={img.data || img.url} alt="preview" className="w-full h-full object-cover" />
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

                    {step < 3 ? (
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

export default PlotForm;
