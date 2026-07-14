import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMapPin, FiMaximize, FiCheckCircle,
    FiShield, FiPhone, FiInfo, FiShare2, FiHome, FiCheck, FiFileText,
    FiLayers, FiBriefcase, FiGrid, FiActivity, FiTag, FiClock, FiBox,
    FiTrendingUp, FiSettings, FiHardDrive, FiUnlock, FiAward
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import RateThisBlock from '../components/RateThisBlock';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { getGoogleMapsUrl, getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import { useAuthStore } from '../../../shared/store/authStore';
import { handleShare } from '../../../shared/utils/share';

const PropertyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [enquiryStatus, setEnquiryStatus] = useState({ canAcceptEnquiries: true });

    useEffect(() => {
        const fetchPropertyDetails = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/property/public/details/${id}`);
                if (response?.success) {
                    const data = response.data;
                    if (data.property) {
                        setProperty(data.property);
                        if (data.enquiryStatus) setEnquiryStatus(data.enquiryStatus);
                    } else {
                        setProperty(data);
                    }
                } else {
                    toast.error('Property not found');
                }
            } catch (error) {
                console.error('[Fetch Property Detail Error]:', error);
                toast.error('Failed to load property details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPropertyDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <B2BHeader title="Loading Asset..." />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-6"></div>
                    <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Syncing Database Records...</p>
                </div>
            </div>
        );
    }

    if (!property) return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-20 items-center">
            <h1 className="text-2xl font-black uppercase tracking-tight">Property not found</h1>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-black uppercase text-xs tracking-widest border-b-2 border-primary-600">Go Back</button>
        </div>
    );

    const propertyImages = [
        ...(property.media?.map(m => m.url) || []),
        ...(property.images || [])
    ];
    
    const isPlot = property.propertyType === 'Plot';

    if (propertyImages.length === 0 && !isPlot) {
        propertyImages.push('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200');
    }

    const formatPrice = (p) => {
        if (!p) return 'Request Price';

        if (p.listingType === 'Sale') {
            if (p.saleDetails?.priceMin && Number(p.saleDetails.priceMin) > 0) {
                const min = p.saleDetails.priceMin;
                const max = p.saleDetails.priceMax;
                const unit = p.saleDetails.priceUnit || '';
                
                if (max && max !== min && Number(max) > 0) {
                    return `₹${Number(min).toLocaleString('en-IN')} - ${Number(max).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                }
                return `₹${Number(min).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
            }
        } else if (p.listingType === 'Rent' && p.rentDetails?.monthlyRent && Number(p.rentDetails.monthlyRent) > 0) {
            const unit = p.rentDetails.rentUnit || 'Thousand';
            return `₹${Number(p.rentDetails.monthlyRent).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
        } else if (p.listingType === 'Lease' && p.leaseDetails?.monthlyLeaseRate && Number(p.leaseDetails.monthlyLeaseRate) > 0) {
            const unit = p.leaseDetails.leaseUnit || 'Lakh';
            return `₹${Number(p.leaseDetails.monthlyLeaseRate).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
        }
        
        if (p.price?.amount && Number(p.price.amount) > 0) {
            const unit = p.price.unit || p.price.priceUnit || 'Rs';
            return `₹${Number(p.price.amount).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
        }
        return 'Request Price';
    };

    const sellerName = property.vendorId?.storeName || 'Verified Developer';
    const sellerPhone = property.vendorId?.phone || '9876543210';
    const facilities = {
        parking: property.facilities?.parking || ['No'],
        lift: property.facilities?.lift || 'No',
        powerBackup: property.facilities?.powerBackup || 'No',
        waterSupply: property.facilities?.waterSupply || 'No',
        washroom: property.facilities?.washroom || ['Common'],
        fireSafety: property.facilities?.fireSafety || 'No'
    };

    // Track vendor contact clicks (call or whatsapp)
    const trackContactClick = async (clickType) => {
        try {
            const vendorId = property?.vendorId?._id || property?.vendorId;
            if (!vendorId) return;

            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType,
                itemType: 'property',
                itemId: property?._id,
                category: property?.propertyType || property?.categoryName || 'Property'
            });
        } catch (error) {
            // Silently fail - tracking shouldn't block user action
            console.error('Error tracking click:', error);
        }
    };

 
     const handleWhatsAppClick = () => {
        if (!enquiryStatus.canAcceptEnquiries) return;
         trackContactClick('whatsapp');
         const cleanedPhone = (sellerPhone || '').replace(/\D/g, '');
        const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;

        const baseMsg = `🏠 *I'm interested in this property!*\n\n` +
            `🏢 *Property:* ${property.title || 'Property'}\n` +
            `💰 *Price:* ${formatPrice(property)}\n` +
            `👤 *Seller:* ${sellerName}\n` +
            `📍 *Location:* ${[property.location?.city, property.location?.area].filter(Boolean).join(', ') || 'N/A'}\n\n` +
            `🔗 *View Item:* ${window.location.href}` +
            getWhatsAppUserDetailsSuffix(user);
        const message = encodeURIComponent(baseMsg);
        window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`, '_blank');
    };

 
     const handleCallClick = () => {
        if (!enquiryStatus.canAcceptEnquiries) return;
         trackContactClick('call');
         window.open(`tel:+91${sellerPhone}`, '_self');
    };

    const handleShareClick = async () => {
        await handleShare({
            title: property.title || 'Property Detail',
            text: `Check out this property: ${property.title || ''}\nPrice: ${formatPrice(property)}\n`,
            url: window.location.href,
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFDFF] pb-24">
            <B2BHeader title={property.title} />

            <main className="max-w-[1440px] mx-auto px-6 py-8">
                {/* Navigation & Actions */}
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => navigate(-1)} className="group flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-900 hover:text-white rounded-2xl shadow-sm transition-all duration-300 border border-gray-100 font-black uppercase text-[10px] tracking-widest">
                        <FiArrowLeft className="text-base group-hover:-translate-x-1 transition-transform" /> Back To Listings
                    </button>
                    <div className="flex gap-3">
                        <button 
                            className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all text-gray-400 border border-gray-100 hover:text-primary-600" 
                            onClick={handleShareClick}
                            title="Share Property"
                        >
                            <FiShare2 />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    {/* Left Side: Media & Core Description */}
                    <div className="lg:col-span-8 space-y-8 md:space-y-12">
                        {/* Hero Image Container */}
                        <div className="relative group">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="aspect-[16/9] rounded-3xl md:rounded-[3.5rem] overflow-hidden bg-gray-50 shadow-xl border border-gray-100"
                            >
                                {propertyImages.length > 0 ? (
                                    <img
                                        src={propertyImages[selectedImage]}
                                        alt={property.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                        <FiMapPin size={64} className="mb-4 opacity-50" />
                                        <span className="text-sm font-black uppercase tracking-widest opacity-50">Image Not Provided</span>
                                    </div>
                                )}

                                {/* Status Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute top-4 left-4 md:top-10 md:left-10 flex gap-2 md:gap-4 flex-wrap">
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-primary-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md">
                                        {property.listingType}
                                    </div>
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-white/90 text-gray-900 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl border border-gray-100">
                                        {property.status?.propertyStatus}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Image Selection Toolbar */}
                            {propertyImages.length > 1 && (
                                <div className="flex gap-3 mt-4 md:mt-8 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                                    {propertyImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-24 h-16 md:w-36 md:h-24 rounded-2xl md:rounded-[2rem] overflow-hidden border-2 md:border-4 transition-all duration-300 ${selectedImage === idx ? 'border-primary-500 shadow-xl scale-105' : 'border-white hover:border-primary-100'}`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description & Overview */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Property Details</h2>
                            </div>
                            <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm">
                                <p className="text-gray-500 text-base md:text-xl font-medium leading-[1.8] italic mb-8 md:mb-10">
                                    "{property.description}"
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 pt-8 md:pt-10 border-t border-gray-50">
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Asset ID</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">#PRO-{property._id.slice(-6)}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Property Type</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{property.propertyType === 'Villa' ? 'Row house / Villa' : property.propertyType}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Listing Type</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{property.listingType}</p>
                                    </div>
                                    <div>
                                        <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Reg. Date</span>
                                        <p className="text-[10px] md:text-sm font-black text-gray-900 uppercase">{new Date(property.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Technical Specifications */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Specifications</h2>
                            </div>
                            {Array.isArray(property.flatVariants) && property.flatVariants.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-[10px] md:text-xs font-black text-primary-600 uppercase tracking-widest mb-3">Flat Variants</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {property.flatVariants.map((fv, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                                <div className="text-xs font-black text-gray-900 uppercase">{fv.flatType || `Variant ${idx + 1}`}</div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {fv.builtUpArea ? `Built-up: ${fv.builtUpArea} ${fv.carpetAreaUnit || ''}` : 'Built-up N/A'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {fv.commonArea ? `Common: ${fv.commonArea} ${fv.carpetAreaUnit || ''}` : 'Common N/A'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {fv.floorNumber ? `Floor ${fv.floorNumber}/${fv.totalFloors || 'NA'}` : 'Floor N/A'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {fv.possessionType || 'Possession N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {[
                                    {
                                        label: 'Built up Area',
                                        val: property.propertyType === 'Plot' ? null : ((property.specifications?.builtUpArea || property.flatDetails?.builtUpArea || property.plotDetails?.builtUpArea)
                                            ? `${property.specifications?.builtUpArea || property.flatDetails?.builtUpArea || property.plotDetails?.builtUpArea} ${property.specifications?.builtUpAreaUnit || property.flatDetails?.carpetAreaUnit || property.plotDetails?.builtUpAreaUnit || ''}`
                                            : null),
                                        icon: <FiMaximize />
                                    },
                                    {
                                        label: 'Common Area',
                                        val: property.propertyType === 'Plot' ? null : ((property.flatDetails?.commonArea || property.plotDetails?.commonArea)
                                            ? `${property.flatDetails?.commonArea || property.plotDetails?.commonArea} ${property.flatDetails?.carpetAreaUnit || property.plotDetails?.builtUpAreaUnit || ''}`
                                            : null),
                                        icon: <FiMaximize />
                                    },
                                    {
                                        label: 'Total Area',
                                        val: property.totalArea || (property.plotDetails?.plotArea ? `${property.plotDetails.plotArea} ${property.plotDetails?.plotAreaUnit || ''}` : null),
                                        icon: <FiMaximize />
                                    },
                                    { label: 'Floor Level', val: property.propertyType === 'Plot' ? null : (property.specifications?.floorNumber || property.flatDetails?.floorNumber), icon: <FiLayers /> },
                                    { label: 'Total Floors', val: property.propertyType === 'Plot' ? null : (property.specifications?.totalFloors || property.flatDetails?.totalFloors || property.plotDetails?.floors), icon: <FiGrid /> },
                                    { label: 'Flat Type', val: property.propertyType === 'Plot' ? null : property.flatDetails?.flatType, icon: <FiHome /> },
                                    { label: 'Bedrooms', val: property.propertyType === 'Plot' ? null : property.plotDetails?.bedrooms, icon: <FiBox /> },
                                    { label: 'Bathrooms', val: property.propertyType === 'Plot' ? null : property.plotDetails?.bathrooms, icon: <FiUnlock /> },
                                    { label: 'Balcony', val: property.propertyType === 'Plot' ? null : property.plotDetails?.balcony, icon: <FiLayers /> },

                                    { label: 'Possession', val: property.propertyType === 'Plot' ? null : (property.flatDetails?.possessionType || property.plotDetails?.possessionType), icon: <FiHome /> },
                                    { label: 'Age of Prop.', val: property.propertyType === 'Plot' ? null : (property.status?.propertyCondition || property.flatDetails?.ageOfProperty || property.plotDetails?.ageOfProperty), icon: <FiClock /> },
                                    { label: 'Furnishing', val: property.propertyType === 'Plot' ? null : (property.status?.furnishing || property.flatDetails?.furnishing || property.plotDetails?.furnishing), icon: <FiBox /> },
                                ].map((spec, i) => (spec.val || spec.val === '0') && (
                                    <div key={i} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex items-start gap-4 md:gap-5">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-50 text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                            {spec.icon}
                                        </div>
                                        <div>
                                            <span className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">{spec.label}</span>
                                            <p className="text-xs md:text-[15px] font-black text-gray-900 uppercase">
                                                {Array.isArray(spec.val) ? spec.val.join(', ') : spec.val}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Infrastructure & Facilities */}
                        <section>
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <span className="h-[2px] w-8 md:w-12 bg-primary-600"></span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Site Infrastructure</h2>
                            </div>
                            <div className="bg-white rounded-3xl md:rounded-[3rem] border border-gray-100 shadow-sm p-6 md:p-10">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    {(() => {
                                        const rawFacs = [];
                                        rawFacs.push(
                                            { label: 'Parking Space', val: facilities.parking?.join(', ') || facilities.parking, icon: <FiBox /> },
                                            { label: 'Power Backup', val: facilities.powerBackup, icon: <FiActivity /> },
                                            { label: 'Water Supply', val: facilities.waterSupply, icon: <FiActivity /> },
                                            { label: 'Lift Access', val: facilities.lift, icon: <FiLayers /> },
                                            { label: 'Washroom', val: facilities.washroom?.join(', ') || facilities.washroom, icon: <FiBriefcase /> },
                                            { label: 'Fire Safety', val: facilities.fireSafety, icon: <FiShield /> }
                                        );
                                        if (property.flatDetails?.amenities) {
                                            const fa = property.flatDetails.amenities;
                                            rawFacs.push(
                                                { label: 'Security', val: fa.security, icon: <FiShield /> },
                                                { label: 'CCTV', val: fa.cctv, icon: <FiActivity /> },
                                                { label: 'Swimming Pool', val: fa.swimmingPool, icon: <FiActivity /> },
                                                { label: 'Gym', val: fa.gym, icon: <FiActivity /> },
                                                { label: 'Garden', val: fa.garden, icon: <FiActivity /> },
                                                { label: 'Game Zone', val: fa.gameZone, icon: <FiActivity /> }
                                            );
                                        }
                                        if (property.plotDetails?.privateFacilities) {
                                            const pf = property.plotDetails.privateFacilities;
                                            rawFacs.push(
                                                { label: 'Private Parking', val: pf.privateParking, icon: <FiBox /> },
                                                { label: 'Solar System', val: pf.solarSystem, icon: <FiActivity /> }
                                            );
                                        }
                                        return rawFacs
                                            .filter((fac) => fac.val)
                                            .map((fac, i) => (
                                                <div
                                                    key={i}
                                                    className="flex flex-col gap-3 p-4 md:p-5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-xl flex items-center justify-center text-gray-500 shadow-sm">
                                                                {fac.icon}
                                                            </div>
                                                            <span className="text-[9px] md:text-[10px] font-black text-gray-600 uppercase tracking-[0.18em]">
                                                                {fac.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`inline-flex px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] ${
                                                            fac.val === 'Yes' || fac.val === 'Covered'
                                                                ? 'bg-primary-600 text-white'
                                                                : 'bg-white text-gray-600 border border-gray-200'
                                                        }`}
                                                    >
                                                        {Array.isArray(fac.val) ? fac.val.join(', ') : fac.val}
                                                    </div>
                                                </div>
                                            ));
                                    })()}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Side: Sticky Pricing & Vendor Info */}
                    <div className="lg:col-span-4 space-y-8 md:space-y-10">
                        {/* Transaction Box */}
                        <div className="sticky top-20 lg:top-10 space-y-8 md:space-y-10">
                            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                                <span className="text-[9px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4 block">Official Listing Price</span>
                                <div className="text-primary-600 font-black text-3xl md:text-5xl leading-tight mb-6 md:mb-8 tracking-tighter">
                                    {formatPrice(property)}
                                </div>

                                {/* Rate this property - visible in sidebar */}
                                <div className="py-6 border-t border-gray-100">
                                    <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Rate this property</h3>
                                    <RateThisBlock
                                        targetType="property"
                                        targetId={property._id}
                                        averageRating={property.averageRating}
                                        ratingCount={property.ratingCount}
                                        onRated={async () => {
                                            try {
                                                const res = await api.get(`/property/public/details/${id}`);
                                                if (res?.data) setProperty(res.data?.data ?? res.data);
                                            } catch (e) { }
                                        }}
                                    />
                                </div>

                                <div className="space-y-4 md:space-y-6 pt-6 border-t border-gray-50">
                                    {/* Financial Breakdown */}
                                    {/* Financial Breakdown removed for Sale as per user request */}

                                    {property.listingType === 'Rent' && property.rentDetails && (
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Security Deposit</span>
                                                <span className="text-gray-900">₹{property.rentDetails.depositAmount} {property.rentDetails.depositUnit}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Maintenance</span>
                                                <span className={`${property.rentDetails.maintenance === 'Included' ? 'text-green-600' : 'text-primary-600'}`}>{property.rentDetails.maintenance}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Utility / Vera</span>
                                                <span className="text-gray-900">{property.rentDetails.veraBill}</span>
                                            </div>
                                        </div>
                                    )}

                                    {property.listingType === 'Lease' && property.leaseDetails && (
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Security Deposit</span>
                                                <span className="text-gray-900">₹{property.leaseDetails.depositAmount} {property.leaseDetails.depositUnit}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Lease Duration</span>
                                                <span className="text-gray-900">{property.leaseDetails.leaseDurationYears} Years</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                 <div className="mt-8 md:mt-10 space-y-3 md:space-y-4">
                                    {/* Quota warning - Only show for the vendor themselves */}
                                    {!enquiryStatus.canAcceptEnquiries && user?.id === (property.vendorId?._id || property.vendorId) && (
                                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                                            <p className="text-[10px] md:text-sm font-black text-red-600 uppercase tracking-wide">
                                                Enquiry Gated: Recharge wallet or purchase plan to enable contact icons
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleWhatsAppClick}
                                        disabled={!enquiryStatus.canAcceptEnquiries}
                                        className={`w-full py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
                                            !enquiryStatus.canAcceptEnquiries
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale shadow-none'
                                                : 'bg-[#25D366] text-white hover:bg-[#128C7E]'
                                        }`}
                                    >
                                        <FaWhatsapp size={20} /> Negotiate Offer
                                    </button>
                                    <button
                                        onClick={handleCallClick}
                                        disabled={!enquiryStatus.canAcceptEnquiries}
                                        className={`w-full py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
                                            !enquiryStatus.canAcceptEnquiries
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale shadow-none'
                                                : 'bg-gray-900 text-white hover:bg-black'
                                        }`}
                                    >
                                        <FiPhone size={20} /> Connect Instant
                                    </button>
                                </div>
                            </div>

                            {/* Geographical Context */}
                            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-gray-100 shadow-sm">
                                <h3 className="text-[11px] md:text-sm font-black uppercase tracking-widest text-gray-900 mb-6 md:mb-8 flex items-center gap-3">
                                    <FiMapPin className="text-primary-600" /> Geographical Context
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-5 md:space-y-6">
                                        <div className="flex items-start gap-4">
                                            <FiMapPin className="text-primary-600 mt-1" size={18} />
                                            <div>
                                                <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">Primary Zone</span>
                                                <p className="text-xs md:text-sm font-black text-gray-900 uppercase">
                                                    {property.location?.city || property.vendorId?.address?.city || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <FiMapPin className="text-primary-600 mt-1" size={18} />
                                            <div>
                                                <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">Market / Hub</span>
                                                <p className="text-xs md:text-sm font-black text-gray-900 uppercase">
                                                    {property.location?.market || property.location?.area || property.vendorId?.address?.area || property.vendorId?.address?.market || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <FiMapPin className="text-primary-600 mt-1" size={18} />
                                            <div>
                                                <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase block tracking-widest">Registered Address</span>
                                                <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase leading-relaxed">
                                                    {[
                                                        property.location?.address,
                                                        property.location?.landmark,
                                                        property.location?.market,
                                                        property.location?.area,
                                                        property.location?.city,
                                                        property.location?.state,
                                                        property.location?.country,
                                                        property.location?.pincode
                                                    ].filter(Boolean).join(', ') ||
                                                        [
                                                            property.vendorId?.address?.street,
                                                            property.vendorId?.address?.landmark,
                                                            property.vendorId?.address?.market,
                                                            property.vendorId?.address?.area,
                                                            property.vendorId?.address?.city,
                                                            property.vendorId?.address?.state,
                                                            property.vendorId?.address?.country,
                                                            property.vendorId?.address?.pincode
                                                        ].filter(Boolean).join(', ') ||
                                                        'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!enquiryStatus.canAcceptEnquiries) {
                                                toast.error("Contact Disabled (Insufficient Quota)");
                                                return;
                                            }
                                            const mapsUrl = getGoogleMapsUrl(property);
                                            if (mapsUrl) {
                                                trackContactClick('map');
                                                window.open(mapsUrl, '_blank');
                                            }
                                        }}
                                        className={`w-full mt-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                                            !enquiryStatus.canAcceptEnquiries
                                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed grayscale'
                                                : 'bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-600 hover:text-white'
                                        }`}
                                        title={!enquiryStatus.canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "View Shop Location"}
                                    >
                                        <FiMapPin /> View Shop Location
                                    </button>
                                </div>
                            </div>

                            {/* Vendor Information */}
                            <div
                                onClick={() => property.vendorId?._id && navigate(`/b2b/vendor/${property.vendorId._id}`)}
                                className="bg-primary-600 p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] text-white shadow-2xl relative group cursor-pointer overflow-hidden border-2 md:border-4 border-primary-500/50"
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
                                        <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl font-black border border-white/30 shadow-2xl overflow-hidden">
                                            {property.vendorId?.storeLogo ? (
                                                <img src={property.vendorId.storeLogo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                sellerName?.[0]
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-xl font-black text-white leading-tight uppercase tracking-tight">{sellerName}</h3>
                                            <div className="flex items-center gap-2 text-primary-100 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] mt-2">
                                                <FiAward size={12} className="text-white" /> Platinum Store
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] md:text-[11px] font-bold text-primary-50 line-clamp-2 uppercase leading-relaxed opacity-90 mb-6 md:mb-8">
                                        {property.vendorId?.storeDescription || 'A trusted strategic partner providing premium real estate assets across India.'}
                                    </p>
                                    <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl">
                                        <span>View Portfolio</span>
                                        <FiArrowLeft className="rotate-180" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />

        </div>
    );
};

export default PropertyDetail;
