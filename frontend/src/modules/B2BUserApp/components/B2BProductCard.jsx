import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiShield, FiPhone, FiMapPin, FiChevronDown, FiCheck, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { getGoogleMapsUrl, getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import toast from '../../../shared/utils/toast';
import { useAuthStore } from '../../../shared/store/authStore';
import StarRating from '../../../shared/components/StarRating';
import { getRatingSummary } from '../../../shared/services/ratingService';

const B2BProductCard = ({ product, viewMode = 'grid', trackContactClick, itemType, requireAuthForActions = false, showSecureDeal = false }) => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'product' });

    React.useEffect(() => {
        const fetchRating = async () => {
            if (product._id) {
                const type = product.itemType === 'lotslot' ? 'lotslot' : 'product';
                const pSummary = await getRatingSummary(type, product._id);
                if (pSummary && pSummary.ratingCount > 0) {
                    setRatingSummary({ ...pSummary, type: 'product' });
                } else {
                    const vid = product.vendorId?._id || product.vendorId?.id || product.vendorIdRef || product.vendorId;
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
    }, [product._id, product.itemType, product.formType, product.vendorId]);

    let allImages = [];
    if (product.formType === 'shop-listing' && product.items?.length > 0) {
        allImages = [
            ...(Array.isArray(product.items[0].images) ? product.items[0].images : [])
        ].filter(Boolean);
        // Fallback to shop image if no item images
        if (allImages.length === 0) {
            allImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
        }
    } else {
        // Standard product or Lot/Slot
        allImages = [
            product.coverImage || product.image,
            ...(Array.isArray(product.images) ? product.images : [])
        ].filter(Boolean);
    }

    const handleNextImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const vid = product.vendorId?._id ?? product.vendorId?.id ?? product.vendorIdRef ?? product.vendorId;
    const vendorIdStr = vid ? String(vid) : null;
    const vendor = product.vendorId;

    // Prefer specific shopName from backend, fallback to shopUnit.name, then storeName
    const shopDisplayName = product.shopName || product.shopUnit?.name || vendor?.storeName || 'Vendor';

    const moqValue = product.formType === 'shop-listing'
        ? (product.items?.[0]?.moq ?? product.moq ?? product.minimumOrderQuantity)
        : (product.moq ?? product.minimumOrderQuantity);
    const unitDisplay = product.formType === 'shop-listing' && product.items?.length > 0
        ? (product.items[0].unit || product.unit || 'pcs')
        : (product.unit || 'pcs');

    const hasGst = Boolean(vendor?.gstNumber);
    const hasEmail = Boolean(vendor?.email);
    const hasMobile = Boolean(vendor?.phone);

    const enquiryStatus = product.enquiryStatus || product.vendorId?.enquiryStatus || { canAcceptEnquiries: false };
    const canAcceptEnquiries = enquiryStatus.canAcceptEnquiries;
    const isOwner = user?.id === vendorIdStr || user?.vendorId === vendorIdStr;

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

    const getCategoryName = () => {
        if (product.formType === 'shop-listing') return 'Shop Listing';
        if (product.category) return product.category; // LotSlot string field
        if (product.categoryId?.name) return product.categoryId.name;
        const categoryAttr = product.attributes?.find(attr =>
            attr.name === 'category' || attr.attributeName === 'category'
        );
        return categoryAttr?.value || 'Product';
    };

    const getTrackingContext = () => ({
        itemType: product.itemType === 'lotslot' ? 'lotslot' : 'product',
        itemId: product._id,
        category: getCategoryName()
    });

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            onClick={() => {
                if (redirectToLoginIfRequired()) return;
                navigate(`/b2b/product/${product._id}`);
            }}
            className={`group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col h-auto md:h-[400px]' : 'flex-row items-center gap-6 p-4 h-fit'}`}
        >
            {/* Image Container - Interactive Gallery */}
            <div
                className={`relative ${viewMode === 'grid' ? 'aspect-square w-full' : 'w-48 h-48 flex-shrink-0 rounded-xl'} overflow-hidden bg-gray-50 border-b border-gray-50 group/image`}
            >
                {/* Images */}
                {allImages.length > 0 ? (
                    allImages.map((img, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 w-full h-full bg-white flex items-center justify-center p-2 transition-opacity duration-300 ${activeImageIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                        >
                            {/* Blurred background for premium fill */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                                style={{ backgroundImage: `url(${img})` }}
                            />
                            
                            <img
                                src={img}
                                alt={`${product.name} - ${idx + 1}`}
                                className="relative z-10 w-full h-full object-contain transition-transform duration-700 hover:scale-105"
                            />
                        </div>
                    ))
                ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center p-4">
                        <img
                            src="https://via.placeholder.com/400x300?text=No+Image"
                            alt={product.name}
                            className="w-full h-full object-contain opacity-50"
                        />
                    </div>
                )}

                {/* Navigation Buttons (Only if multiple images) */}
                {allImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="rotate-90 text-sm" />
                        </button>
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm opacity-0 group-hover/image:opacity-100 transition-all z-30"
                        >
                            <FiChevronDown className="-rotate-90 text-sm" />
                        </button>
                    </>
                )}

                {/* Image Indicators (Dots/Lines) */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity px-2">
                        {allImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-300 shadow-sm ${activeImageIndex === idx
                                    ? 'w-4 bg-white'
                                    : 'w-1 bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600/90 backdrop-blur-sm rounded-md text-[7px] font-black text-white uppercase tracking-wider shadow-sm z-20 pointer-events-none">
                    {product.itemType === 'lotslot' ? 'Bulk Lot' : (product.formType === 'shop-listing' ? 'Shop Listing' : 'Bulk')}
                </div>
                <div className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 z-20 pointer-events-none">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[8px] font-black text-primary-600">₹</span>
                        <span className="text-sm font-black text-gray-800">
                            {product.formType === 'shop-listing' && product.items?.length > 0
                                ? product.items[0].price
                                : product.price}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Body - Ultra Compact */}
            <div className={`p-2.5 flex flex-col gap-2 ${viewMode === 'list' ? 'flex-1 justify-center' : 'flex-1'}`}>
                <div className="h-[55px] md:h-[65px] flex flex-col justify-center gap-0.5">
                    <h3 className="text-[12px] font-black text-gray-800 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase leading-tight">
                        {product.formType === 'shop-listing' && product.items?.length > 0
                            ? (product.items[0].itemName || product.items[0].name || 'Item')
                            : product.name}
                    </h3>
                    
                    {vendor?.address?.city && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-primary-600 uppercase tracking-tight truncate">
                             <FiMapPin className="text-primary-500" size={10} />
                             <span>{vendor.address.city}</span>
                        </div>
                    )}

                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate mt-0.5">
                        <span className="text-gray-500">Mfg:</span>{' '}
                        {vendor?.mfgOfWork ? vendor.mfgOfWork : (product.category || '—')}
                    </p>

                    {ratingSummary.ratingCount > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <StarRating rating={ratingSummary.averageRating} size={10} />
                            <span className="text-[9px] font-black text-gray-700">{ratingSummary.averageRating.toFixed(1)}</span>
                            <span className="text-[8px] font-bold text-gray-400">({ratingSummary.ratingCount})</span>
                            {ratingSummary.type === 'shop' && <span className="text-[7px] font-black text-primary-500 bg-primary-50 px-1 rounded">SHOP</span>}
                        </div>
                    )}
                </div>

                {/* Info Row: Unit and Vendor (no min order on catalog cards) */}
                <div className="flex items-center justify-between gap-1 bg-gray-50/50 p-1.5 rounded-lg border border-gray-50 min-h-[42px]">
                    <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase whitespace-nowrap">
                        <FiTruck className="text-primary-500" size={10} />
                        <span>{moqValue ? `MOQ ${moqValue} ${unitDisplay}` : unitDisplay}</span>
                    </div>
                    {vendorIdStr ? (
                        <div
                            onClick={(e) => {
                                if (redirectToLoginIfRequired(e)) return;
                                e.stopPropagation();
                                const vendorUrl = itemType ? `/b2b/vendor/${vendorIdStr}?itemType=${itemType}` : `/b2b/vendor/${vendorIdStr}`;
                                navigate(vendorUrl);
                            }}
                            className="flex flex-col items-end gap-0.5 min-w-0 cursor-pointer group/vendor"
                        >
                            <div className="text-[9px] font-black text-primary-600 group-hover/vendor:text-primary-700 uppercase transition-colors select-none text-right leading-[1.1]">
                                {shopDisplayName}
                            </div>
                            <span className="px-1 py-0.5 bg-primary-600 text-white rounded text-[6px] font-black uppercase tracking-tighter shadow-sm">
                                Visit Store
                            </span>
                        </div>
                    ) : (
                        <span className="text-[8px] font-black text-gray-400 text-right uppercase leading-tight">
                            {shopDisplayName}
                        </span>
                    )}
                </div>

                {/* Vendor Status Badges - Matching New Image Style */}
                {/* <div className="flex flex-wrap items-center gap-2 mt-0.5 px-0.5 min-h-[30px]">
                    {vendor?.gstNumber && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50/80 border border-green-100/50 rounded-full">
                            <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">GST</span>
                            <div className="w-3.5 h-3.5 bg-green-500/10 flex items-center justify-center rounded-full">
                                <FiCheck className="text-green-600" size={10} />
                            </div>
                        </div>
                    )}
                    {vendor?.phone && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50/80 border border-green-100/50 rounded-full">
                            <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">MOBILE</span>
                            <div className="w-3.5 h-3.5 bg-green-500/10 flex items-center justify-center rounded-full">
                                <FiCheck className="text-green-600" size={10} />
                            </div>
                        </div>
                    )}
                    {vendor?.email && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50/80 border border-green-100/50 rounded-full">
                            <span className="text-[8px] font-black text-gray-700 uppercase tracking-tighter">EMAIL</span>
                            <div className="w-3.5 h-3.5 bg-green-500/10 flex items-center justify-center rounded-full">
                                <FiCheck className="text-green-600" size={10} />
                            </div>
                        </div>
                    )}

                </div> */}
                <div className="mt-1 px-1">
                    {/* Mobile: text + right check, like desktop but compact */}
                    <div className="md:hidden flex flex-wrap items-center gap-2">
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">GST</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">Email</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full whitespace-nowrap shrink-0">
                            <span className="text-[8px] font-black text-gray-600 uppercase">Mobile</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={8} />
                            </span>
                        </div>
                    </div>
                    {/* Desktop: text + check badges */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">GST</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">Email</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-gray-500 uppercase">Mobile</span>
                            <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-green-200 text-green-700">
                                <FiCheck size={10} />
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Quota warning - Only show for the vendor themselves */}
                {!canAcceptEnquiries && isOwner && (
                    <div className="mx-1 mt-1 p-2 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-[8px] font-black text-red-600 uppercase tracking-tight">
                            Enquiry Gated: Recharge wallet or purchase plan to enable contact icons
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {vendor?.phone ? (
                        <>
                            <a
                                href={!canAcceptEnquiries ? "#" : (() => {
                                    const cleanedPhone = (vendor?.phone || '').replace(/\D/g, '');
                                    const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;
                                    const baseMsg = `🛒 *I'm interested in this product!*\n\n` +
                                        `📦 *Product:* ${product.name || 'Product'}\n` +
                                        `💰 *Price:* ${product.price ? `₹${product.price}/${unitDisplay}` : 'Price on Request'}\n` +
                                        `📦 *Min Order:* ${moqValue || '1'} ${unitDisplay}\n` +
                                        `🏢 *Shop:* ${shopDisplayName}\n` +
                                        `📍 *City:* ${vendor?.address?.city || 'N/A'}\n\n` +
                                        `🔗 *View Item:* ${window.location.origin}/b2b/product/${product._id}` +
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
                                    if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'whatsapp', getTrackingContext());
                                }}
                                className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                                    !canAcceptEnquiries 
                                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed grayscale' 
                                        : 'bg-green-50 text-[#25D366] hover:bg-[#25D366] hover:text-white border-green-100'
                                }`}
                                title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "WhatsApp"}
                            >
                                <FaWhatsapp size={16} />
                            </a>
                            <a
                                href={!canAcceptEnquiries ? "#" : `tel:${vendor.phone}`}
                                onClick={(e) => {
                                    if (!canAcceptEnquiries) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    if (redirectToLoginIfRequired(e)) return;
                                    e.stopPropagation();
                                    if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'call', getTrackingContext());
                                }}
                                className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                                    !canAcceptEnquiries 
                                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed grayscale' 
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100'
                                }`}
                                title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "Call Vendor"}
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
                                    const mapTarget = product.shopUnit?.mapUrl
                                        ? { mapUrl: product.shopUnit.mapUrl }
                                        : (product.shopUnit || vendor);
                                    const mapsUrl = getGoogleMapsUrl(mapTarget);
                                    if (mapsUrl) {
                                        if (trackContactClick && vendorIdStr) trackContactClick(vendorIdStr, 'map', getTrackingContext());
                                        window.open(mapsUrl, '_blank');
                                    } else {
                                        toast.error('Location details not provided');
                                    }
                                }}
                                className={`flex-1 h-10 md:h-11 rounded-xl transition-all border flex items-center justify-center shadow-sm ${
                                    !canAcceptEnquiries 
                                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed grayscale' 
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-100'
                                }`}
                                title={!canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "Shop Location"}
                            >
                                <FiMapPin size={16} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={(e) => {
                                if (redirectToLoginIfRequired(e)) return;
                                e.stopPropagation();
                                navigate(`/b2b/product/${product._id}`);
                            }}
                            className="w-full py-1.5 bg-primary-50 text-primary-600 rounded-lg font-black text-[9px] uppercase tracking-wider border border-primary-100"
                        >
                            View Details
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BProductCard;
