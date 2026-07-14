import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin, FiBriefcase, FiUpload, FiFile, FiX, FiCheck, FiPlus, FiArrowLeft, FiCamera, FiTag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import api from '../../../shared/utils/api';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { openFlutterCamera, openFlutterGallery, isFlutterApp } from '../../../shared/utils/flutterBridge';

/**
 * B2B Vendor Registration Page
 * 
 * STRICT ARCHITECTURE RULE:
 * This page must ONLY contain registration fields.
 * DO NOT fetch or render subscription plans here.
 * Subscription selection happens strictly AFTER login in the dashboard.
 * 
 * For Property broker, Other broker, Gray broker: GST and document upload are optional.
 * For all other business types: GST and document upload are compulsory.
 */

const BROKER_BUSINESS_TYPES = [
    'property broker',
    'gray market / gray broker',
    'agency/ agent( broker)',
    'support & services'
];

const B2BVendorRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);
    const [errors, setErrors] = useState({});

    // Get pre-filled data from navigation state (e.g. from "Become a Seller" button)
    const preFilledData = location.state?.userData || location.state?.preFilledData || {};
    const isUpgrade = location.state?.isUpgrade || false;

    const [businessTypes, setBusinessTypes] = useState([]);
    const [selectedBusinessType, setSelectedBusinessType] = useState(null);

    const [businessLicense, setBusinessLicense] = useState(() => {
        const saved = sessionStorage.getItem('b2b_registration_license');
        return saved ? JSON.parse(saved) : null;
    });
    const [panCard, setPanCard] = useState(() => {
        const saved = sessionStorage.getItem('b2b_registration_pan');
        return saved ? JSON.parse(saved) : null;
    });

    const [formData, setFormData] = useState(() => {
        const savedData = sessionStorage.getItem('b2b_registration_data');
        const defaultData = {
            name: preFilledData.name || '',
            email: preFilledData.email || '',
            phone: location.state?.phone?.replace('+91', '') || preFilledData.phone || '',
            password: '',
            confirmPassword: '',
            companyName: preFilledData.businessInfo?.companyName || '',
            gstNumber: preFilledData.businessInfo?.gstNumber || '',
            mfgOfWork: '',
            businessType: 'Textile',
            businessTypeRef: '',
            address: {
                street: preFilledData.businessInfo?.address?.fullAddress || '',
                area: '',
                market: '',
                landmark: '',
                city: preFilledData.businessInfo?.address?.city || '',
                state: preFilledData.businessInfo?.address?.state || '',
                pincode: preFilledData.businessInfo?.address?.pincode || '',
                country: 'India',
                mapUrl: '',
            },
            referralCode: new URLSearchParams(location.search).get('ref') || '',
            agreedToTerms: false,
        };

        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                return { ...defaultData, ...parsed };
            } catch (e) {
                return defaultData;
            }
        }
        return defaultData;
    });

    const businessTypeName = (formData.businessType || '').toString().trim().toLowerCase();
    const isDeveloperBuilder = businessTypeName === 'developer / builder' || businessTypeName === 'developer/builder';
    const docLabel = isDeveloperBuilder ? 'RERA' : 'PAN Card';

    // Persist form data and documents to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('b2b_registration_data', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        if (businessLicense) {
            sessionStorage.setItem('b2b_registration_license', JSON.stringify(businessLicense));
        } else {
            sessionStorage.removeItem('b2b_registration_license');
        }
    }, [businessLicense]);

    useEffect(() => {
        if (panCard) {
            sessionStorage.setItem('b2b_registration_pan', JSON.stringify(panCard));
        } else {
            sessionStorage.removeItem('b2b_registration_pan');
        }
    }, [panCard]);

    const { logout, isAuthenticated } = useB2BVendorAuthStore();
    useEffect(() => {
        // If user is already logged in, clear their session to prevent data leakage
        // when registering a new account.
        if (isAuthenticated) {
            console.log('[B2B Vendor Register] Existing session found. Clearing for new registration.');
            logout();
        }

        const fetchBusinessTypes = async () => {
            try {
                const response = await api.get('/business-types');
                if (response.success) {
                    setBusinessTypes(response.data);
                    // Set default if available AND no saved data exists
                    const hasSavedData = sessionStorage.getItem('b2b_registration_data');
                    if (!hasSavedData) {
                        const textile = response.data.find(t => t.name === 'Textile');
                        if (textile) {
                            setFormData(prev => ({
                                ...prev,
                                businessType: textile.name,
                                businessTypeRef: textile._id
                            }));
                            setSelectedBusinessType(textile);
                        }
                    } else {
                        // Restore selected business type ref for UI selection
                        const parsed = JSON.parse(hasSavedData);
                        const savedType = response.data.find(t => t._id === parsed.businessTypeRef);
                        if (savedType) setSelectedBusinessType(savedType);
                    }
                }
            } catch (error) {
                console.error('Error fetching business types:', error);
            }
        };

        fetchBusinessTypes();

        if (isUpgrade && preFilledData.name) {
            toast.success(`Welcome ${preFilledData.name.split(' ')[0]}! Complete these details to start your B2B business.`);
        } else if (!preFilledData.name) {
            // Check if user is logged in to User App (Buyer) and pre-fill from there
            const buyerToken = localStorage.getItem('token');
            if (buyerToken) {
                const fetchBuyerProfile = async () => {
                    try {
                        const response = await api.get('/auth/user/me', { silent: true });
                        if (response.success && response.data?.user) {
                            const buyer = response.data.user;
                            setFormData(prev => ({
                                ...prev,
                                name: buyer.name || prev.name,
                                email: buyer.email || prev.email,
                                phone: buyer.phone?.replace('+91', '') || prev.phone,
                                companyName: buyer.businessInfo?.companyName || prev.companyName,
                                gstNumber: buyer.businessInfo?.gstNumber || prev.gstNumber,
                                address: {
                                    ...prev.address,
                                    street: buyer.businessInfo?.address?.fullAddress || prev.address.street,
                                    city: buyer.businessInfo?.address?.city || prev.address.city,
                                    state: buyer.businessInfo?.address?.state || prev.address.state,
                                    pincode: buyer.businessInfo?.address?.pincode || prev.address.pincode,
                                }
                            }));
                            toast.success(`Welcome back ${buyer.name.split(' ')[0]}! We've pre-filled your business details.`);
                        }
                    } catch (error) {
                        console.log('[B2B Register] No buyer session found or error fetching.');
                    }
                };
                fetchBuyerProfile();
            }
        }
    }, [isUpgrade, preFilledData.name]);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const handleDocumentUpload = async (e, type, isCamera = false) => {
        const file = e.target.files[0];
        console.log(`[KYCUpload] ${isCamera ? 'Camera' : 'File'} input triggered for ${type}. File:`, file?.name);

        if (!file) {
            console.warn('[KYCUpload] No file picked');
            return;
        }

        setIsUploadingDocs(true);
        const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
        if (!isValid) {
            console.error('[KYCUpload] Invalid type:', file.type);
            toast.error('Invalid file type. Please upload PDF or Image.');
            setIsUploadingDocs(false);
            return;
        }

        const toastId = toast.loading(`Processing ${type === 'license' ? 'License' : docLabel}...`);

        try {
            let data = null;
            if (file.type.startsWith('image/')) {
                console.log(`[KYCUpload] Compressing image: ${file.name} (${Math.round(file.size / 1024)}KB)`);
                const options = {
                    maxSizeMB: 0.5, // 500KB is enough for documents
                    maxWidthOrHeight: 1600,
                    useWebWorker: true,
                };
                const compressed = await imageCompression(file, options);
                console.log(`[KYCUpload] Compressed: ${Math.round(compressed.size / 1024)}KB`);

                data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(compressed);
                });
            } else {
                // PDF or other files
                console.log(`[KYCUpload] Reading PDF: ${file.name}`);
                data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            if (type === 'license') {
                setBusinessLicense({ name: file.name, data, type: file.type });
            } else {
                setPanCard({ name: file.name, data, type: file.type });
            }

            // Clear input value
            e.target.value = '';
            toast.success(`${type === 'license' ? 'Business License' : docLabel} added`, { id: toastId });
        } catch (error) {
            console.error('[KYCUpload] Error:', error);
            e.target.value = '';
            toast.error('Failed to process file', { id: toastId });
        } finally {
            setIsUploadingDocs(false);
        }
    };

    const handleCameraClick = async (type) => {
        if (isFlutterApp()) {
            const result = await openFlutterCamera();
            if (result) {
                const docData = { name: result.fileName, data: result.data, type: result.mimeType };
                if (type === 'license') {
                    setBusinessLicense(docData);
                } else {
                    setPanCard(docData);
                }
                toast.success(`${type === 'license' ? 'Business License' : docLabel} captured`);
                return;
            }
        }
        
        // Synchronous fallback
        document.getElementById(type === 'license' ? 'license-camera' : 'pan-camera')?.click();
    };

    const handleGalleryClick = (type) => {
        if (isFlutterApp()) {
            // Async bridge call
            (async () => {
                const result = await openFlutterGallery();
                if (result) {
                    const docData = { name: result.fileName, data: result.data, type: result.mimeType };
                    if (type === 'license') {
                        setBusinessLicense(docData);
                    } else {
                        setPanCard(docData);
                    }
                    toast.success(`${type === 'license' ? 'Business License' : docLabel} added`);
                }
            })();
            return;
        }
        
        // Synchronous fallback (critical for mobile browsers)
        document.getElementById(type === 'license' ? 'license-upload' : 'pan-upload')?.click();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Clear error for the field being changed
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Validation: Full Name should only take alphabets and spaces
        if (name === 'name') {
            const alphabetsOnly = value.replace(/[^a-zA-Z\s]/g, '');
            setFormData(prev => ({ ...prev, [name]: alphabetsOnly }));
            return;
        }

        if (name === 'phone') {
            // Only allow numbers and limit to 10 digits
            const cleaned = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: cleaned }));
            return;
        }
        if (name === 'gstNumber') {
            // Uppercase and limit to 15 chars
            const cleaned = value.toUpperCase().trim().slice(0, 15);
            setFormData(prev => ({ ...prev, [name]: cleaned }));
            return;
        }
        if (name.startsWith('address.')) {
            const field = name.split('.')[1];

            // Clear address field error
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: '' }));
            }

            let cleanedValue = value;

            // Validation: City and State should take only alphabets and spaces
            if (field === 'city' || field === 'state') {
                cleanedValue = value.replace(/[^a-zA-Z\s]/g, '');
            }

            // Validation: Pin Code should take only numbers and limit to 6 digits
            if (field === 'pincode') {
                cleanedValue = value.replace(/\D/g, '').slice(0, 6);
            }

            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, [field]: cleanedValue }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: e.target.type === 'checkbox' ? e.target.checked : value }));
        }
    };

    // Handle Registration
    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        // Front-end Validations
        if (!formData.name.trim()) {
            newErrors.name = 'Full Name is required';
        } else {
            const nameRegex = /^[A-Za-z\s]+$/;
            if (!nameRegex.test(formData.name)) {
                newErrors.name = 'Full Name should only contain alphabets';
            }
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email Address is required';
        } else {
            // Email Validation: Strict TLD length check (preventing .comm, .commm)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/;
            if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Enter a valid email (e.g. .com, .in)';
            }
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone Number is required';
        } else if (formData.phone.length !== 10) {
            newErrors.phone = 'Enter valid 10-digit number';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Min 6 characters required';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirm Password is required';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.businessTypeRef) {
            newErrors.businessTypeRef = 'Business Type is required';
        }

        if (!formData.companyName.trim()) {
            newErrors.companyName = 'Company Name is required';
        }

        // Address Validations
        if (!formData.address.street.trim()) newErrors['address.street'] = 'Street Address is required';
        if (!formData.address.area.trim()) newErrors['address.area'] = 'Area/Locality is required';

        if (!formData.address.city.trim()) {
            newErrors['address.city'] = 'City is required';
        } else {
            const nameRegex = /^[A-Za-z\s]+$/;
            if (!nameRegex.test(formData.address.city)) {
                newErrors['address.city'] = 'City should only contain alphabets';
            }
        }

        if (!formData.address.state.trim()) {
            newErrors['address.state'] = 'State is required';
        } else {
            const nameRegex = /^[A-Za-z\s]+$/;
            if (!nameRegex.test(formData.address.state)) {
                newErrors['address.state'] = 'State should only contain alphabets';
            }
        }

        if (!formData.address.pincode.trim()) {
            newErrors['address.pincode'] = 'Pin Code is required';
        } else if (formData.address.pincode.length !== 6) {
            newErrors['address.pincode'] = 'Enter valid 6-digit number';
        }

        const isBrokerType = BROKER_BUSINESS_TYPES.includes(businessTypeName);

        if (!isBrokerType) {
            if (!businessLicense) newErrors.businessLicense = 'Business License is required';
            if (!panCard) newErrors.panCard = `${docLabel} is required`;

            if (!formData.gstNumber || !formData.gstNumber.trim()) {
                newErrors.gstNumber = 'GST Number is required';
            }
        }

        // GST Validation (when provided)
        if (formData.gstNumber && formData.gstNumber.trim()) {
            const cleanGst = formData.gstNumber.trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(cleanGst)) {
                newErrors.gstNumber = 'Invalid GST number format';
            }
        }

        if (!formData.agreedToTerms) {
            newErrors.agreedToTerms = 'You must agree to the Terms & Conditions';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Scroll to first error
            const firstError = Object.keys(newErrors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setErrors({});
        setLocalLoading(true);
        try {
            // Complete Registration
            const registrationData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                storeName: formData.companyName,
                storeDescription: `B2B Vendor`,
                address: formData.address,
                gstNumber: (formData.gstNumber && formData.gstNumber.trim()) ? formData.gstNumber.trim() : undefined,
                mfgOfWork: formData.mfgOfWork,
                businessType: formData.businessType,
                businessTypeRef: formData.businessTypeRef,
                vendorType: 'b2b',
                documents: {
                    panCard: panCard ? { data: panCard.data, name: panCard.name, type: panCard.type } : {},
                    businessLicense: businessLicense ? { data: businessLicense.data, name: businessLicense.name, type: businessLicense.type } : {}
                },
                agreedToTerms: formData.agreedToTerms,
                referralCode: formData.referralCode
            };

            const response = await api.post('/auth/vendor/register', registrationData);

            if (response.success) {
                // Show success toast with longer duration to ensure it's seen
                toast.success('Registration successful! Your account is now waiting for admin approval.', {
                    duration: 10000,
                    icon: '🚀',
                    id: 'registration-success-toast'
                });

                // Clear temporary storage and leftover payment data
                localStorage.removeItem('b2b_payment_data');
                sessionStorage.removeItem('b2b_registration_data'); // Added this line
                localStorage.removeItem('b2b_paid_plan_id');
                localStorage.removeItem('b2b_subscription_id');
                localStorage.removeItem('b2b_payment_email');
                localStorage.removeItem('b2b_payment_phone');

                // Small delay to let user see the success toast before navigation
                setTimeout(() => {
                    navigate('/b2b-vendor/verification', {
                        state: {
                            phone: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
                            email: formData.email,
                            message: 'Registration successful! Please verify your mobile number.'
                        }
                    });
                }, 1500);
            } else {
                toast.error(response.message || 'Registration failed', { id: 'registration-error-toast' });
            }
        } catch (error) {
            console.error('Registration error:', error);
            const message = error.response?.data?.message || error.message || 'Registration failed';

            // Check for specific duplicate field errors
            if (message.toLowerCase().includes('phone') || message.toLowerCase().includes('mobile')) {
                toast.error('Mobile number already registered. Please use a different number or login.', {
                    id: 'duplicate-phone-error',
                    duration: 6000
                });
            } else if (message.toLowerCase().includes('email')) {
                toast.error('Email already registered. Please use a different email or login.', {
                    id: 'duplicate-email-error',
                    duration: 6000
                });
            } else if (message.toLowerCase().includes('gst number')) {
                toast.error('This GST number is already registered or in a pending registration.', {
                    id: 'duplicate-gst-error',
                    duration: 6000
                });
            } else {
                toast.error(message, { id: 'registration-catch-error' });
            }
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-6 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-[2rem] p-8 sm:p-12 w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto relative"

            >
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <FiBriefcase className="text-white text-xl" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-1">B2B Vendor Registration</h1>
                    <p className="text-sm text-gray-600">Join our B2B network as a verified Partner</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* Section 1: Contact Person */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                                <FiUser className="text-primary-600 size-4" />
                            </div>
                            Contact Person
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 focus:bg-white transition-all outline-none text-sm`} placeholder="John Doe" />
                                {errors.name && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px) font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="john@example.com" />
                                {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!!location.state?.phone} className={`w-full px-3 py-2 bg-white border ${errors.phone ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500`} placeholder="9876543210" maxLength={10} />
                                {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Business Details */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FiBriefcase className="text-blue-600 size-4" />
                            </div>
                            Business Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Business Type <span className="text-red-500">*</span></label>
                                <select
                                    name="businessTypeRef"
                                    value={formData.businessTypeRef}
                                    onChange={(e) => {
                                        const typeId = e.target.value;
                                        const type = businessTypes.find(t => t._id === typeId);
                                        setFormData(prev => ({
                                            ...prev,
                                            businessTypeRef: typeId,
                                            businessType: type?.name || '',
                                        }));
                                        setSelectedBusinessType(type);
                                        if (errors.businessTypeRef) setErrors(prev => ({ ...prev, businessTypeRef: '' }));
                                    }}
                                    className={`w-full px-3 py-2 bg-white border ${errors.businessTypeRef ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none appearance-none text-sm`}
                                >
                                    <option value="">Select Business Type</option>
                                    {businessTypes.map(type => (
                                        <option key={type._id} value={type._id}>{type.name}</option>
                                    ))}
                                </select>
                                {errors.businessTypeRef && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.businessTypeRef}</p>}
                            </div>

                            {/* Sub-Types removed */}
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors.companyName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="Global Exports Pvt Ltd" />
                                {errors.companyName && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.companyName}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
                                    GST Number {BROKER_BUSINESS_TYPES.includes((formData.businessType || '').toString().trim().toLowerCase()) ? '(Optional)' : <span className="text-red-500">*</span>}
                                </label>
                                <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors.gstNumber ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder={BROKER_BUSINESS_TYPES.includes((formData.businessType || '').toString().trim().toLowerCase()) ? 'Enter GST Number (Optional)' : 'Enter GST Number'} />
                                {errors.gstNumber && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.gstNumber}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Mfg Of Work</label>
                                <input type="text" name="mfgOfWork" value={formData.mfgOfWork} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" placeholder="Enter Mfg Of Work" />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Document Upload */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                                <FiUpload className="text-green-600 size-4" />
                            </div>
                            KYC Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">Business License / GST {BROKER_BUSINESS_TYPES.includes((formData.businessType || '').toString().trim().toLowerCase()) ? '(Optional)' : <span className="text-red-500">*</span>}</label>
                                {!businessLicense ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <input type="file" accept="image/png, image/jpeg, image/webp, video/*, application/pdf" onChange={(e) => {
                                                    handleDocumentUpload(e, 'license', false);
                                                    if (errors.businessLicense) setErrors(prev => ({ ...prev, businessLicense: '' }));
                                                }} className="hidden" id="license-upload" disabled={isUploadingDocs} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleGalleryClick('license')}
                                                    className={`w-full flex flex-col items-center justify-center py-8 px-5 border-2 border-dashed ${errors.businessLicense ? 'border-red-500' : 'border-gray-200'} rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group`}
                                                >
                                                    <FiPlus className="text-xl text-gray-400 mb-3 group-hover:text-primary-600" />
                                                    <span className="text-xs font-black text-gray-500 group-hover:text-primary-600 uppercase tracking-widest">GALLERY</span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input type="file" capture="environment" accept="image/png, image/jpeg, image/webp, video/*, application/pdf" onChange={(e) => {
                                                    handleDocumentUpload(e, 'license', true);
                                                    if (errors.businessLicense) setErrors(prev => ({ ...prev, businessLicense: '' }));
                                                }} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} id="license-camera" disabled={isUploadingDocs} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleCameraClick('license')}
                                                    className={`w-full flex flex-col items-center justify-center py-8 px-5 border-2 border-dashed ${errors.businessLicense ? 'border-red-500' : 'border-gray-200'} rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group`}
                                                >
                                                    <FiCamera className="text-xl text-gray-400 mb-3 group-hover:text-primary-600" />
                                                    <span className="text-xs font-black text-gray-500 group-hover:text-primary-600 uppercase tracking-widest">CAMERA</span>
                                                </button>
                                            </div>
                                        </div>
                                        {errors.businessLicense && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.businessLicense}</p>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                                                <FiCheck className="text-white text-xs" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-green-700 uppercase">License</span>
                                                <span className="text-[9px] text-green-600 truncate max-w-[100px]">{businessLicense.name}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setBusinessLicense(null)} className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase">{docLabel} {BROKER_BUSINESS_TYPES.includes(businessTypeName) ? '(Optional)' : <span className="text-red-500">*</span>}</label>
                                {!panCard ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <input type="file" accept="image/png, image/jpeg, image/webp, video/*, application/pdf" onChange={(e) => {
                                                    handleDocumentUpload(e, 'pan', false);
                                                    if (errors.panCard) setErrors(prev => ({ ...prev, panCard: '' }));
                                                }} className="hidden" id="pan-upload" disabled={isUploadingDocs} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleGalleryClick('pan')}
                                                    className={`w-full flex flex-col items-center justify-center py-8 px-5 border-2 border-dashed ${errors.panCard ? 'border-red-500' : 'border-gray-200'} rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group`}
                                                >
                                                    <FiPlus className="text-xl text-gray-400 mb-3 group-hover:text-primary-600" />
                                                    <span className="text-xs font-black text-gray-500 group-hover:text-primary-600 uppercase tracking-widest">GALLERY</span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input type="file" capture="environment" accept="image/png, image/jpeg, image/webp, video/*, application/pdf" onChange={(e) => {
                                                    handleDocumentUpload(e, 'pan', true);
                                                    if (errors.panCard) setErrors(prev => ({ ...prev, panCard: '' }));
                                                }} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} id="pan-camera" disabled={isUploadingDocs} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleCameraClick('pan')}
                                                    className={`w-full flex flex-col items-center justify-center py-8 px-5 border-2 border-dashed ${errors.panCard ? 'border-red-500' : 'border-gray-200'} rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group`}
                                                >
                                                    <FiCamera className="text-xl text-gray-400 mb-3 group-hover:text-primary-600" />
                                                    <span className="text-xs font-black text-gray-500 group-hover:text-primary-600 uppercase tracking-widest">CAMERA</span>
                                                </button>
                                            </div>
                                        </div>
                                        {errors.panCard && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.panCard}</p>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                                                <FiCheck className="text-white text-xs" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-green-700 uppercase">{docLabel}</span>
                                                <span className="text-[9px] text-green-600 truncate max-w-[100px]">{panCard.name}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setPanCard(null)} className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-colors">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Address */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                                <FiMapPin className="text-orange-600 size-4" />
                            </div>
                            Business Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Street Address</label>
                                <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors['address.street'] ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="Shop No, Building Name" />
                                {errors['address.street'] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors['address.street']}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Market</label>
                                <input type="text" name="address.market" value={formData.address.market} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" placeholder="Enter Market Name" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Landmark</label>
                                <input type="text" name="address.landmark" value={formData.address.landmark} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm" placeholder="Near Railway Station" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Area / Locality</label>
                                <input type="text" name="address.area" value={formData.address.area} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors['address.area'] ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="Textile Market" />
                                {errors['address.area'] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors['address.area']}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">City</label>
                                <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors['address.city'] ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="Surat" />
                                {errors['address.city'] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors['address.city']}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">State</label>
                                <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors['address.state'] ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="Gujarat" />
                                {errors['address.state'] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors['address.state']}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Pin Code</label>
                                <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleChange} className={`w-full px-3 py-2 bg-white border ${errors['address.pincode'] ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`} placeholder="395003" maxLength={6} />
                                {errors['address.pincode'] && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors['address.pincode']}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Map URL (Google Maps)</label>
                                <input
                                    type="url"
                                    name="address.mapUrl"
                                    value={formData.address.mapUrl}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm"
                                    placeholder="https://maps.google.com/?q=..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Security */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FiLock className="text-purple-600 size-4" />
                            </div>
                            Security
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 bg-white border ${errors.password ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`}
                                        placeholder="Min 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 bg-white border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-primary-500 outline-none text-sm`}
                                        placeholder="Re-enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.confirmPassword}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Referral Code (Optional) */}
                    <div className="bg-white/50 p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                                <FiTag className="text-pink-600 size-4" />
                            </div>
                            Referral (Optional)
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Referral Code</label>
                            <input
                                type="text"
                                name="referralCode"
                                value={formData.referralCode}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm"
                                placeholder="Enter Referral Code"
                            />
                        </div>
                    </div>

                    {/* Terms and Conditions Checkbox */}
                    <div className="flex flex-col gap-1 px-1">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center mt-1">
                                <input
                                    type="checkbox"
                                    name="agreedToTerms"
                                    checked={formData.agreedToTerms}
                                    onChange={handleChange}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-primary-600 checked:bg-primary-600 focus:outline-none"
                                />
                                <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none text-xs" />
                            </div>
                            <span className="text-sm text-gray-600 leading-tight">
                                I agree to the <Link to="/terms?type=vendor" className="text-primary-600 font-bold hover:underline">Terms & Conditions</Link> and <Link to="/vendor-privacy-policy" className="text-primary-600 font-bold hover:underline">Privacy Policy</Link>
                            </span>
                        </label>
                        {errors.agreedToTerms && <p className="text-red-500 text-[10px] ml-8">{errors.agreedToTerms}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={localLoading || isUploadingDocs}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-bold text-base hover:from-primary-700 hover:to-primary-600 shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {localLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <FiCheck className="text-lg" />
                                Create Vendor Account
                            </>
                        )}
                    </button>

                    <div className="text-center pb-2">
                        <p className="text-xs text-gray-500">
                            Already have a vendor account?{" "}
                            <Link to="/b2b-vendor/login" className="text-primary-600 font-bold hover:underline">
                                Login Here
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default B2BVendorRegister;
