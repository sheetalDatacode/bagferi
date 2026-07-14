import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiPhone, FiHome, FiMaximize, FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';
import { getGoogleMapsUrl, getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import StarRating from '../../../shared/components/StarRating';
import { useAuthStore } from '../../../shared/store/authStore';
import { getRatingSummary } from '../../../shared/services/ratingService';

const RealEstateCard = ({ property, selectedPriceUnit = 'All', requireAuthForActions = false }) => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'product' });

    React.useEffect(() => {
        const fetchRating = async () => {
            if (property._id) {
                const pSummary = await getRatingSummary('property', property._id);
                if (pSummary && pSummary.ratingCount > 0) {
                    setRatingSummary({ ...pSummary, type: 'product' });
                } else {
                    const vid = property.vendorId?._id || property.vendorId?.id || property.vendorIdRef || property.vendorId;
                    if (vid) {
                        const sSummary = await getRatingSummary('shop', vid);
                        if (sSummary && sSummary.ratingCount > 0) {
                            setRatingSummary({ ...sSummary, type: 'shop' });
                        } else {
                            setRatingSummary({ averageRating: 0, ratingCount: 0, type: 'product' });
                        }
                    }
                }
            }
        };
        fetchRating();
    }, [property._id, property.vendorId]);

    const redirectToLoginIfRequired = (event) => {
        if (requireAuthForActions && !isAuthenticated) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            navigate('/b2b/login', { state: { from: { pathname: '/b2b/landing' } } });
            return true;
        }
        return false;
    };

    // Combine all available images
    const allImages = [
        ...(property.media?.map(m => m.url) || []),
        ...(property.images || [])
    ];

    const isPlot = property.propertyType === 'Plot';

    if (allImages.length === 0 && !isPlot) {
        allImages.push('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200');
    }

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    // Track vendor contact clicks (call or whatsapp)
    const trackContactClick = async (vendorId, clickType, context = {}) => {
        try {
            if (!vendorId) return;
            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType,
                ...context
            });
        } catch (error) {
            // Silently fail - tracking shouldn't block user action
            console.error('Error tracking click:', error);
        }
    };

    const getTrackingContext = () => ({
        itemType: 'property',
        itemId: property._id,
        category: property.propertyType || property.categoryName || 'Property'
    });

    const toRupees = (amount, unit = 'Lakh') => {
        const n = Number(amount || 0);
        if (!Number.isFinite(n)) return 0;
        const normalizedUnit = String(unit || 'Lakh')
            .trim()
            .toLowerCase()
            .replace(/\./g, '')
            .replace(/\s+/g, '')
            .replace('/month', '')
            .replace('/mo', '');

        if (normalizedUnit === 'rs' || normalizedUnit === 'rupees' || normalizedUnit === 'inr') return n;
        if (normalizedUnit === 'thousand' || normalizedUnit === 'thousands' || normalizedUnit === 'k') return n * 1000;
        if (normalizedUnit === 'crore' || normalizedUnit === 'crores' || normalizedUnit === 'cr') return n * 10000000;
        return n * 100000; // default lakh
    };

    const compact = (value) => {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return '0';
        return n.toFixed(1).replace(/\.0$/, '');
    };

    const formatBySelectedUnit = (rupees, preferredUnit = 'All') => {
        const cleanPreferred = String(preferredUnit || 'All').trim();
        const unit = cleanPreferred === 'All' ? 'Lakh' : cleanPreferred;
        if (unit === 'Rs') {
            return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
        }
        if (unit === 'Thousand') {
            return `₹${compact(rupees / 1000)} thousand`;
        }
        if (unit === 'Crore') {
            return `₹${compact(rupees / 10000000)} crore`;
        }
        return `₹${compact(rupees / 100000)} lakh`;
    };

    // Helper to format price from backend (compact for card view)
    const formatPrice = (p) => {
        if (!p) return 'Price on Request';

        if (p.listingType === 'Sale') {
            if (p.saleDetails?.priceMin && Number(p.saleDetails.priceMin) > 0) {
                if (selectedPriceUnit === 'All') {
                    const min = p.saleDetails.priceMin;
                    const max = p.saleDetails.priceMax;
                    const unit = p.saleDetails.priceUnit || '';
                    if (max && max !== min && Number(max) > 0) {
                        return `₹${Number(min).toLocaleString('en-IN')} - ${Number(max).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`;
                    }
                    return `₹${Number(min).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`;
                }
                const min = toRupees(p.saleDetails.priceMin, p.saleDetails.priceUnit || 'Lakh');
                const max = toRupees(p.saleDetails.priceMax, p.saleDetails.priceUnit || 'Lakh');
                if (max && max !== min) {
                    return `${formatBySelectedUnit(min, selectedPriceUnit)} - ${formatBySelectedUnit(max, selectedPriceUnit)}`;
                }
                return `${formatBySelectedUnit(min, selectedPriceUnit)} onwards`;
            }
        } else if (p.listingType === 'Rent' && p.rentDetails?.monthlyRent && Number(p.rentDetails.monthlyRent) > 0) {
            if (selectedPriceUnit === 'All') {
                const unit = p.rentDetails.rentUnit || 'Thousand';
                return `₹${Number(p.rentDetails.monthlyRent).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`;
            }
            const amount = toRupees(p.rentDetails.monthlyRent, p.rentDetails.rentUnit || 'Thousand');
            return `${formatBySelectedUnit(amount, selectedPriceUnit)}/mo`;
        } else if (p.listingType === 'Lease' && p.leaseDetails?.monthlyLeaseRate && Number(p.leaseDetails.monthlyLeaseRate) > 0) {
            if (selectedPriceUnit === 'All') {
                const unit = p.leaseDetails.leaseUnit || 'Lakh';
                return `₹${Number(p.leaseDetails.monthlyLeaseRate).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`;
            }
            const amount = toRupees(p.leaseDetails.monthlyLeaseRate, p.leaseDetails.leaseUnit || 'Lakh');
            return `${formatBySelectedUnit(amount, selectedPriceUnit)}/mo`;
        }

        if (p.price?.amount && Number(p.price.amount) > 0) {
            if (selectedPriceUnit === 'All') {
                const unit = p.price.unit || p.price.priceUnit || 'Rs';
                return `₹${Number(p.price.amount).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`;
            }
            const amountInRupees = toRupees(p.price.amount, p.price.unit || p.price.priceUnit || 'Rs');
            return formatBySelectedUnit(amountInRupees, selectedPriceUnit);
        }
        return 'Price on Request';
    };

    const displayPrice = formatPrice(property);

    // Prefer property's own location filled in form; fallback to vendor registration if missing
    const pLoc = property.location || {};
    const displayLocation = [
        pLoc.market || pLoc.area,
        pLoc.city
    ].filter(Boolean).join(', ') || `${property.vendorId?.address?.area || property.vendorId?.address?.market || ''}, ${property.vendorId?.address?.city || ''}`.trim().replace(/^,/, '').trim();

    // Prefer specific shopName or shopUnit.name over registration storeName
    const sellerName = property.shopName || property.shopUnit?.name || property.vendorId?.storeName || property.vendorId?.name || '';
    const sellerPhone = property.vendorId?.phone || '';
    const vendor = property.vendorId;

    const enquiryStatus = property.enquiryStatus || property.vendorId?.enquiryStatus || { canAcceptEnquiries: false };
    const canAcceptEnquiries = enquiryStatus.canAcceptEnquiries;

    // Quota warning - Only show for the vendor themselves
    const isVendorOwner = user?.id === (property.vendorId?._id || property.vendorId) || user?.vendorId === (property.vendorId?._id || property.vendorId);
    
    if (!canAcceptEnquiries && isVendorOwner) {
        return (
            <div className="group bg-white rounded-xl overflow-hidden border border-red-100 shadow-sm p-4 h-[480px] md:h-[450px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <FiPhone className="text-red-500 text-2xl" />
                </div>
                <h3 className="text-sm font-black text-gray-800 uppercase mb-2">Enquiry Gated</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed max-w-[200px]">
                    Recharge wallet or purchase plan to enable contact icons for this property.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full">
                    <button onClick={() => navigate('/b2b/real-estate/property/' + property._id)} className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">View Details</button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={() => {
                if (redirectToLoginIfRequired()) return;
                navigate(`/b2b/real-estate/property/${property._id}`);
            }}
            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-[480px] md:h-[450px]"
        >
            {/* Image Container with Slider */}
            <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-gray-50 group/image">
                <AnimatePresence mode="wait">
                    {allImages.length > 0 ? (
                        <motion.img
                            key={currentImageIndex}
                            src={allImages[currentImageIndex]}
                            alt={property.title}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <motion.div
                            key="no-image"
                            className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <FiMapPin size={48} className="mb-2 opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Image Not Provided</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Slider Controls - Only if multiple images */}
                {allImages.length > 1 && (
                    <>
                        {/* Navigation Arrows - always visible */}
                        <div className="absolute inset-0 flex items-center justify-between px-2 z-20">
                            <button
                                onClick={prevImage}
                                className="p-1 px-1.5 md:p-1.5 bg-white/80 backdrop-blur-md text-gray-800 rounded-full shadow-lg hover:bg-white transition-all transform hover:scale-110 active:scale-90"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            <button
                                onClick={nextImage}
                                className="p-1 px-1.5 md:p-1.5 bg-white/80 backdrop-blur-md text-gray-800 rounded-full shadow-lg hover:bg-white transition-all transform hover:scale-110 active:scale-90"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                            {allImages.slice(0, 5).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentImageIndex === idx ? 'bg-primary-600 w-4' : 'bg-white/60'}`}
                                />
                            ))}
                            {allImages.length > 5 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex items-center justify-center text-[6px] text-white">
                                    +
                                </div>
                            )}
                        </div>

                        {/* Image Counter Badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase tracking-wider z-20">
                            {currentImageIndex + 1} / {allImages.length}
                        </div>
                    </>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    <div className="flex gap-1">
                        <div className="px-2 py-1 bg-primary-600/90 backdrop-blur-sm rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-sm w-fit">
                            {property.listingType || 'Sale'}
                        </div>
                        {property.vendorId?.businessType && (
                            <div className={`px-2 py-1 ${property.vendorId.businessType.toLowerCase().includes('developer') ? 'bg-indigo-600/90' : 'bg-emerald-600/90'} backdrop-blur-sm rounded-md text-[8px] font-black text-white uppercase tracking-wider shadow-sm w-fit`}>
                                {property.vendorId.businessType.toLowerCase().includes('developer') ? 'Developer' : 'Broker'}
                            </div>
                        )}
                    </div>
                    {property.status?.propertyStatus && (
                        <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[8px] font-black text-gray-800 uppercase tracking-wider shadow-sm border border-gray-100 w-fit">
                            {property.status.propertyStatus}
                        </div>
                    )}
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-10">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-black text-gray-800">{displayPrice}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-3 flex flex-col gap-2.5 flex-1">
                <div className="min-w-0">
                    <h3 className="text-xs font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {property.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <FiMapPin className="text-primary-600 text-[10px]" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {displayLocation}
                        </p>
                    </div>
                    {ratingSummary.ratingCount > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                            <StarRating rating={ratingSummary.averageRating} size={10} />
                            <span className="text-[9px] font-black text-gray-700">{ratingSummary.averageRating.toFixed(1)}</span>
                            <span className="text-[8px] font-bold text-gray-400">({ratingSummary.ratingCount})</span>
                            {ratingSummary.type === 'shop' && <span className="text-[7px] font-black text-primary-500 bg-primary-50 px-1 rounded">SHOP</span>}
                        </div>
                    )}
                </div>

                {/* Info Row: Area and Seller */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase">
                        <FiMaximize className="text-primary-500" size={12} />
                        <span className="truncate">
                            {property.flatDetails?.carpetArea ? `${property.flatDetails.carpetArea} Sq. Ft.` :
                                property.plotDetails?.plotArea ? property.plotDetails.plotArea :
                                    property.specifications?.builtUpArea
                                        ? `${property.specifications.builtUpArea} ${property.specifications.builtUpAreaUnit === 'Sq. Ft.' ? 'Square Feet' :
                                            property.specifications.builtUpAreaUnit === 'Sq. Mt.' ? 'Square Meters' :
                                                property.specifications.builtUpAreaUnit === 'Sq. Yd.' ? 'Square Yards' :
                                                    property.specifications.builtUpAreaUnit || 'Square Feet'
                                        }`
                                        : property.totalArea || 'N/A'
                            }
                        </span>
                    </div>
                    <div
                        onClick={(e) => {
                            if (redirectToLoginIfRequired(e)) return;
                            e.stopPropagation();
                            if (property.vendorId?._id) navigate(`/b2b/vendor/${property.vendorId._id}`);
                        }}
                        className="flex flex-col items-end gap-0.5 min-w-0 cursor-pointer group/vendor"
                    >
                        <div className="flex items-center gap-1 text-[9px] font-black text-primary-600 group-hover/vendor:text-primary-700 uppercase transition-colors select-none text-right leading-[1.1]">
                            <FiHome className="text-primary-500 flex-shrink-0" size={10} />
                            {sellerName}
                        </div>
                        <span className="px-1 py-0.5 bg-primary-600 text-white rounded text-[6px] font-black uppercase tracking-tighter shadow-sm">
                            Visit
                        </span>
                    </div>
                </div>

                {/* Vendor Status Badges - Pill Style Matching Image 1 */}
                <div className="flex flex-wrap items-center gap-2 mt-2 px-0.5">

                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-100 rounded-full shadow-sm">
                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">GST</span>
                        <div className="w-3.5 h-3.5 bg-green-500 flex items-center justify-center rounded-full">
                            <FiCheck className="text-white" size={9} />
                        </div>
                    </div>


                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-100 rounded-full shadow-sm">
                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">EMAIL</span>
                        <div className="w-3.5 h-3.5 bg-green-500 flex items-center justify-center rounded-full">
                            <FiCheck className="text-white" size={9} />
                        </div>
                    </div>


                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-100 rounded-full shadow-sm">
                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">MOBILE</span>
                        <div className="w-3.5 h-3.5 bg-green-500 flex items-center justify-center rounded-full">
                            <FiCheck className="text-white" size={9} />
                        </div>
                    </div>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-auto">
                    <a
                        href={!canAcceptEnquiries ? "#" : (() => {
                            const cleanedPhone = (property.vendorId?.phone || '').replace(/\D/g, '');
                            const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;
                            const baseMsg = `🏠 *I'm interested in this property!*\n\n` +
                                `🏢 *Property:* ${property.title || 'Property'}\n` +
                                `💰 *Price:* ${displayPrice}\n` +
                                `🏢 *Seller:* ${sellerName}\n` +
                                `📍 *Location:* ${displayLocation}\n\n` +
                                `🔗 *View Property:* ${window.location.origin}/b2b/real-estate/property/${property._id}` +
                                getWhatsAppUserDetailsSuffix(user);
                            const message = encodeURIComponent(baseMsg);
                            return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`;
                        })()}
                        target={!canAcceptEnquiries ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            if (!canAcceptEnquiries) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            if (redirectToLoginIfRequired(e)) return;
                            e.stopPropagation();
                            trackContactClick(property.vendorId?._id, 'whatsapp', getTrackingContext());
                        }}
                        className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                            !canAcceptEnquiries
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed grayscale'
                                : 'bg-green-50 text-[#25D366] hover:bg-[#25D366] hover:text-white border-green-100'
                        }`}
                        title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "WhatsApp"}
                    >
                        <FaWhatsapp size={16} />
                    </a>
                    <a
                        href={!canAcceptEnquiries ? "#" : `tel:+91${sellerPhone}`}
                        onClick={(e) => {
                            if (!canAcceptEnquiries) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            if (redirectToLoginIfRequired(e)) return;
                            e.stopPropagation();
                            trackContactClick(property.vendorId?._id, 'call', getTrackingContext());
                        }}
                        className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                            !canAcceptEnquiries
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed grayscale'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100'
                        }`}
                        title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "Call"}
                    >
                        <FiPhone size={16} />
                    </a>
                    <button
                        onClick={(e) => {
                            if (!canAcceptEnquiries) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            if (redirectToLoginIfRequired(e)) return;
                            e.stopPropagation();
                            const mapsUrl = getGoogleMapsUrl(property);
                            if (mapsUrl) {
                                trackContactClick(property.vendorId?._id, 'map', getTrackingContext());
                                window.open(mapsUrl, '_blank');
                            }
                        }}
                        className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                            !canAcceptEnquiries
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed grayscale'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-100'
                        }`}
                        title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "Map"}
                    >
                        <FiMapPin size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default RealEstateCard;
