import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMessageSquare, FiTruck, FiShield,
    FiCheckCircle, FiShare2, FiInfo, FiSend, FiX,
    FiPlus, FiMinus, FiShoppingBag, FiStar, FiPaperclip, FiFile, FiPhone, FiMapPin
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/store/authStore';
import toast from 'react-hot-toast';
import { formatPrice, getGoogleMapsUrl, getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import { handleShare } from '../../../shared/utils/share';
import { getRatingSummary, getUserRating, submitRating } from '../../../shared/services/ratingService';
import StarRating from '../../../shared/components/StarRating';

const B2BProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [inquiryAttachment, setInquiryAttachment] = useState(null);
    const [hasInquiry, setHasInquiry] = useState(false);
    const [enquiryStatus, setEnquiryStatus] = useState({ canAcceptEnquiries: true });
    const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'product' });
    const [shopRatingSummary, setShopRatingSummary] = useState({ averageRating: 0, ratingCount: 0, type: 'shop' });
    const [userRating, setUserRating] = useState(null);
    const [draftRating, setDraftRating] = useState(0);
    const [draftComment, setDraftComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    useEffect(() => {
        const fetchRatings = async () => {
            if (id) {
                const summary = await getRatingSummary('product', id);
                if (summary) {
                    setRatingSummary({ ...summary, type: 'product' });
                }

                if (product?.vendorId) {
                    const vid = product.vendorId._id || product.vendorId.id || product.vendorId;
                    const sSummary = await getRatingSummary('shop', vid);
                    if (sSummary) {
                        setShopRatingSummary({ ...sSummary, type: 'shop' });
                    }
                }

                if (isAuthenticated) {
                    const userR = await getUserRating('product', id);
                    if (userR) {
                        setUserRating(userR);
                        setDraftRating(userR.rating || 0);
                        setDraftComment(userR.comment || '');
                    }
                }
            }
        };
        // wait for product to be fetched so we have vendorId
        if (product) {
            fetchRatings();
        }
    }, [id, isAuthenticated, product]);

    const handleRatingSubmit = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to submit a rating');
            navigate('/b2b/login');
            return;
        }
        if (!draftRating) {
            toast.error('Please select a rating before submitting');
            return;
        }
        setIsSubmittingRating(true);
        try {
            const result = await submitRating('product', id, draftRating, draftComment);
            if (result) {
                setUserRating(result);
                const summary = await getRatingSummary('product', id);
                if (summary) setRatingSummary({ ...summary, type: 'product' });
            }
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const fetchProductDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/products/${id}`);
            if (response.success && response.data) {
                const productData = response.data.product || response.data;
                if (productData.minimumOrderQuantity && !productData.moq) {
                    productData.moq = productData.minimumOrderQuantity;
                }

                // Use populated shopUnitId for unit details
                if (productData.shopUnitId && typeof productData.shopUnitId === 'object') {
                    productData.unitDetails = productData.shopUnitId;
                }

                setProduct(productData);
                const status = response.data.enquiryStatus || productData.vendorId?.enquiryStatus;
                if (status) {
                    setEnquiryStatus(status);
                }
                if (productData.moq) {
                    setQuantity(Number(productData.moq));
                }
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            toast.error('Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    // Track vendor contact clicks (call or whatsapp)


 
     const handleWhatsAppClick = () => {
        if (!enquiryStatus.canAcceptEnquiries) return;
        trackContactClick('whatsapp');
        const cleanedPhone = (product.vendorId?.phone || '').replace(/\D/g, '');
        const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : '91' + cleanedPhone;

        const baseMsg = `🛒 *I'm interested in this product!*\n\n` +
            `📦 *Product:* ${product.name}\n` +
            `💰 *Price:* ${product.price ? `₹${product.price}/${product.unit || 'pcs'}` : 'Price on Request'}\n` +
            `📦 *Min Order:* ${product.moq || product.minimumOrderQuantity || '1'} ${product.unit || 'pcs'}\n` +
            `🏢 *Shop:* ${product.vendorId?.storeName || 'Verified Vendor'}\n` +
            `📍 *City:* ${product.vendorId?.address?.city || 'N/A'}\n\n` +
            `🔗 *View Item:* ${window.location.href}` +
            getWhatsAppUserDetailsSuffix(user);
        const message = encodeURIComponent(baseMsg);
        window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${message}`, '_blank');
    };

    const handleCallClick = () => {
        trackContactClick('call');
        window.open(`tel:+91${product.vendorId.phone}`, '_self');
    };

    const handleShareClick = async () => {
        await handleShare({
            title: product.name || 'Product Detail',
            text: `Check out this product on Dealing India: ${product.name || ''}`,
            url: window.location.href,
        });
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        toast.error('Direct Inquiry system is under maintenance. Please use WhatsApp or Call.');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <B2BHeader />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Fetching details...</p>
                </div>
            </div>
        );
    }

    if (!product) return null;

    let productImages = [];
    if (product.formType === 'shop-listing') {
        // For shop-listing detail page, show item images (Section B) since user clicked on the item
        const itemImages = product.items?.[0]?.images || [];
        if (Array.isArray(itemImages) && itemImages.length > 0) {
            productImages = itemImages;
        } else {
            // Fallback to shop images if item has no images
            productImages = Array.isArray(product.images) && product.images.length > 0
                ? product.images
                : product.unitDetails?.images || [];
        }
    } else {
        // Standard product logic
        if (product.coverImage) productImages.push(product.coverImage);
        if (product.image) productImages.push(product.image);
        if (Array.isArray(product.images) && product.images.length > 0) {
            product.images.forEach(img => {
                if (img && !productImages.includes(img)) productImages.push(img);
            });
        }
    }
    if (productImages.length === 0) productImages = ['https://via.placeholder.com/800x600?text=No+Image'];

    const safeSelectedImage = Math.min(selectedImage, productImages.length - 1);

    const getCategoryName = () => {
        if (product.formType === 'shop-listing') return 'Shop Listing';
        if (product.category) return product.category; // LotSlot string field
        if (product.categoryId?.name) return product.categoryId.name;
        const categoryAttr = product.attributes?.find(attr =>
            attr.name === 'category' || attr.attributeName === 'category'
        );
        return categoryAttr?.value || 'Product';
    };

    // Track vendor contact clicks (call or whatsapp)
    const trackContactClick = async (clickType) => {
        try {
            const vendorId = product?.vendorId?._id || product?.vendorId;
            if (!vendorId) return;

            // Get category name
            const categoryName = getCategoryName();

            await api.post('/vendor/analytics/track-click', {
                vendorId,
                clickType,
                itemType: product?.itemType === 'lotslot' ? 'lotslot' : 'product',
                itemId: product?._id,
                category: categoryName
            });
        } catch (error) {
            // Silently fail - tracking shouldn't block user action
            console.error('Error tracking click:', error);
        }
    };

    const getSpecifications = () => {
        if (product.formType === 'shop-listing' && product.items && product.items.length > 0) {
            // Combine all items into specifications or just show the first one if that's the new standard
            // Given the user removed "Add More", we'll show all existing items but focused on the new fields
            const allSpecs = [];
            product.items.forEach((item, index) => {
                const prefix = product.items.length > 1 ? `Item ${index + 1}: ` : '';
                if (item.itemName) allSpecs.push({ name: `${prefix}Item Name`, value: item.itemName });
                if (item.category) allSpecs.push({ name: `${prefix}Category`, value: item.category });
                if (item.price) allSpecs.push({ name: `${prefix}Price`, value: `₹${item.price}` });
                if (item.unit) allSpecs.push({ name: `${prefix}Unit`, value: item.unit });
                if (item.reed) allSpecs.push({ name: `${prefix}Reed`, value: item.reed });
                if (item.pick) allSpecs.push({ name: `${prefix}Pick`, value: item.pick });
                if (item.panna) allSpecs.push({ name: `${prefix}Panna / Width`, value: item.panna });
                if (item.gsm) allSpecs.push({ name: `${prefix}GSM`, value: item.gsm });
                if (item.description) allSpecs.push({ name: `${prefix}Description`, value: item.description });
            });
            return allSpecs;
        }
        if (product.specifications && Array.isArray(product.specifications)) return product.specifications;
        if (product.attributes && Array.isArray(product.attributes)) {
            return product.attributes
                .filter(attr => !['category', 'subcategory', 'bulkPricing', 'Color', 'color'].includes(attr.name || attr.attributeName || ''))
                .map(attr => ({ name: attr.name || attr.attributeName || 'Spec', value: attr.value || '' }))
                .filter(spec => spec.name && spec.value);
        }
        return [];
    };

    const getBulkPricing = () => {
        if (product.bulkPricing && Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0) return product.bulkPricing;
        const attr = product.attributes?.find(a => a.name === 'bulkPricing' || a.attributeName === 'bulkPricing');
        if (attr && attr.value) {
            try {
                return typeof attr.value === 'string' ? JSON.parse(attr.value) : attr.value;
            } catch (e) { return []; }
        }
        return [];
    };

    const specifications = getSpecifications();
    const bulkPricing = getBulkPricing();
    const currentPrice = (() => {
        if (!bulkPricing || bulkPricing.length === 0) return product.price || 0;
        const tier = [...bulkPricing].sort((a, b) => (b.minQty || 0) - (a.minQty || 0)).find(t => quantity >= (t.minQty || 0));
        return tier ? (tier.price || product.price || 0) : (product.price || 0);
    })();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <B2BHeader />
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12">
                <div className="flex items-center justify-between mb-8 md:mb-12">
                    <button onClick={() => navigate(-1)} className="p-2.5 md:p-3 bg-white shadow-sm border border-gray-100 rounded-full transition-all text-gray-700 hover:text-primary-600 flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95">
                        <FiArrowLeft className="text-sm md:text-lg" /> Back to Catalog
                    </button>
                    <button 
                        onClick={handleShareClick}
                        className="p-2.5 md:p-3 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-primary-600 transition-all active:scale-90"
                    >
                        <FiShare2 className="text-sm md:text-lg" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
                    {/* Media Section */}
                    <div className="lg:col-span-7 space-y-4 md:space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative aspect-square md:aspect-[1.1/1] rounded-3xl md:rounded-[3rem] overflow-hidden bg-white shadow-2xl border border-gray-100 group flex items-center justify-center p-4"
                        >
                            {/* Blurred background for a premium look that fills gaps */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110 pointer-events-none"
                                style={{ backgroundImage: `url(${productImages[safeSelectedImage]})` }}
                            />
                            
                            <img 
                                src={productImages[safeSelectedImage]} 
                                alt={product.name} 
                                className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover:scale-105 drop-shadow-2xl" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none z-20" />
                        </motion.div>

                        {productImages.length > 1 && (
                            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                {productImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`relative flex-shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-[1.5rem] overflow-hidden border-2 md:border-4 transition-all duration-300 bg-white flex items-center justify-center p-1.5 ${safeSelectedImage === idx ? 'border-primary-500 shadow-xl scale-105' : 'border-white hover:border-primary-100 shadow-sm'}`}
                                    >
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                                            style={{ backgroundImage: `url(${img})` }}
                                        />
                                        <img src={img} alt="" className="relative z-10 w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Basic Info Section */}
                    <div className="lg:col-span-5 space-y-6 md:space-y-10">
                        <div className="space-y-4">
                            <span className="text-[10px] md:text-xs font-black text-primary-600 uppercase tracking-[0.2em] px-4 py-2 bg-primary-50 rounded-xl inline-block shadow-sm">
                                {getCategoryName()}
                            </span>
                            <h1 className="text-2xl md:text-5xl font-black text-gray-900 leading-[1.1] uppercase tracking-tighter">
                                {product.formType === 'shop-listing' && product.items?.[0]
                                    ? (product.items[0].itemName || product.name)
                                    : product.name}
                            </h1>
                            {product.formType === 'shop-listing' && (product.unitDetails?.name || product.name) && (
                                <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
                                    Shop: {product.unitDetails?.name || product.name}
                                </p>
                            )}

                            {ratingSummary.ratingCount > 0 ? (
                                <div className="flex items-center gap-2 mt-3">
                                    <StarRating rating={ratingSummary.averageRating} size={16} />
                                    <span className="text-sm font-black text-gray-700">{ratingSummary.averageRating.toFixed(1)}</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">({ratingSummary.ratingCount} Reviews)</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">0 Reviews</span>
                                </div>
                            )}

                            <div className="h-1 w-20 bg-primary-600 rounded-full mt-4"></div>
                        </div>

                        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-xl border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                            <div className="flex items-start justify-between gap-6 mb-8 md:mb-10 relative z-10">
                                <div>
                                    <span className="text-[10px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 block">
                                        {product.formType === 'shop-listing' ? 'Item Rate' : 'Market Value'}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-5xl font-black text-primary-600 tracking-tighter">
                                            ₹{product.formType === 'shop-listing' && product.items?.length > 0
                                                ? product.items[0].price
                                                : product.price}
                                        </span>
                                        <span className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-widest">
                                            / {product.formType === 'shop-listing' && product.items?.[0]
                                                ? product.items[0].unit
                                                : (product.unit || 'pc')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 block">Minimum Order</span>
                                    <span className="text-lg md:text-2xl font-black text-gray-900 tracking-tight">
                                        {product.formType === 'shop-listing' && product.items?.[0]
                                            ? (product.items[0].minOrder ?? product.moq ?? 1)
                                            : (product.moq || 1)}
                                        <span className="text-[10px] md:text-xs text-gray-400 uppercase ml-1">
                                            {product.formType === 'shop-listing' && product.items?.[0]?.unit
                                                ? product.items[0].unit
                                                : (product.unit || 'Units')}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-6 relative z-10">
                                {bulkPricing && bulkPricing.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Tiered Pricing Model</h4>
                                        <div className="space-y-2">
                                            {bulkPricing.map((tier, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-primary-100 transition-all group/tier">
                                                    <span className="text-[11px] md:text-xs font-black text-gray-600 uppercase tracking-wider">{tier.minQty}+ {product.unit || 'units'}</span>
                                                    <span className="text-[11px] md:text-xs font-black text-primary-600 group-hover/tier:scale-110 transition-transform">₹{tier.price} <span className="text-[9px] text-gray-400">/ UNIT</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 md:pt-8 border-t border-gray-50">
                                    {/* Quota warning - Only show for the vendor themselves */}
                                    {!enquiryStatus.canAcceptEnquiries && user?.id === (product.vendorId?._id || product.vendorId) && (
                                        <div className="col-span-full mb-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                                            <p className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-wide">
                                                Enquiry Gated: Recharge wallet or purchase plan to enable contact icons
                                            </p>
                                        </div>
                                    )}
                                    {product.vendorId?.phone && (
                                        <>
                                            <button
                                                onClick={handleWhatsAppClick}
                                                disabled={!enquiryStatus.canAcceptEnquiries}
                                                className={`py-3 md:py-4 px-3 md:px-4 rounded-xl md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 ${
                                                    !enquiryStatus.canAcceptEnquiries 
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale shadow-none' 
                                                        : 'bg-[#25D366] text-white shadow-green-100/50 hover:bg-[#128C7E]'
                                                }`}
                                            >
                                                <FaWhatsapp className="text-base md:text-lg shrink-0" /> WhatsApp
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!enquiryStatus.canAcceptEnquiries) {
                                                        toast.error("Contact Disabled (Insufficient Quota)");
                                                        return;
                                                    }
                                                    handleCallClick();
                                                }}
                                                disabled={!enquiryStatus.canAcceptEnquiries}
                                                className={`py-3 md:py-4 px-3 md:px-4 rounded-xl md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 ${
                                                    !enquiryStatus.canAcceptEnquiries 
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale shadow-none' 
                                                        : 'bg-gray-900 text-white shadow-gray-200/50 hover:bg-black'
                                                }`}
                                            >
                                                <FiPhone className="text-base md:text-lg shrink-0" /> Call
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!enquiryStatus.canAcceptEnquiries) {
                                                        toast.error("Contact Disabled (Insufficient Quota)");
                                                        return;
                                                    }
                                                    const mapsUrl = getGoogleMapsUrl(product.vendorId);
                                                    if (mapsUrl) {
                                                        trackContactClick('map');
                                                        window.open(mapsUrl, '_blank');
                                                    } else {
                                                        toast.error('Location details not provided');
                                                    }
                                                }}
                                                className={`py-3 md:py-4 px-3 md:px-4 rounded-xl md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 ${
                                                    !enquiryStatus.canAcceptEnquiries
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale shadow-none'
                                                        : 'bg-orange-600 text-white shadow-orange-100/50 hover:bg-orange-700'
                                                }`}
                                                title={!enquiryStatus.canAcceptEnquiries ? "Contact Disabled (Insufficient Quota)" : "Map"}
                                            >
                                                <FiMapPin className="text-base md:text-lg shrink-0" /> Map
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Vendor Card */}
                        <div
                            onClick={() => product.vendorId?._id && navigate(`/b2b/vendor/${product.vendorId._id}?itemType=${product.itemType}`)}
                            className="bg-primary-600 p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] text-white shadow-2xl relative group cursor-pointer overflow-hidden border-2 md:border-4 border-primary-500/50"
                        >
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                            <div className="relative z-10">
                                <span className="text-[9px] md:text-[10px] font-black text-primary-200 uppercase tracking-[0.3em] mb-4 md:mb-6 block">Authorised Vendor</span>
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-2xl font-black border border-white/30 shadow-2xl uppercase">
                                        {(product.shopName || product.shopUnitId?.name || product.vendorId?.storeName)?.charAt(0) || 'V'}
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-2xl font-black tracking-tight uppercase leading-none">{product.shopName || product.shopUnitId?.name || product.vendorId?.storeName || 'Verified Store'}</h3>
                                        <div className="flex items-center gap-2 text-primary-100 text-[9px] md:text-[11px] font-black uppercase tracking-widest mt-2 md:mt-3">
                                            <FiCheckCircle className="text-white" /> Platinum Verified
                                        </div>
                                        {shopRatingSummary.ratingCount > 0 && (
                                            <div className="flex items-center gap-1.5 mt-2 text-white">
                                                <StarRating rating={shopRatingSummary.averageRating} size={14} />
                                                <span className="text-xs font-bold ml-1">{shopRatingSummary.averageRating.toFixed(1)}</span>
                                                <span className="text-[10px] opacity-75 ml-1">({shopRatingSummary.ratingCount} Ratings)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rating Submission Card */}
                        <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
                            <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-widest mb-4">
                                {userRating ? 'Your Rating' : 'Rate this Product'}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <StarRating 
                                        rating={draftRating} 
                                        interactive={true} 
                                        onRate={setDraftRating}
                                        size={24}
                                    />
                                    {isSubmittingRating && <span className="text-[10px] md:text-xs text-primary-600 font-black uppercase animate-pulse">Saving...</span>}
                                </div>
                                
                                {draftRating > 0 && (
                                    <div className="space-y-3 mt-4">
                                        <button
                                            onClick={handleRatingSubmit}
                                            disabled={isSubmittingRating || !isAuthenticated}
                                            className={`w-full py-3 px-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                                isSubmittingRating || !isAuthenticated
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200/50'
                                            }`}
                                        >
                                            <FiSend className="text-sm" /> 
                                            {isSubmittingRating ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {!isAuthenticated && (
                                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">
                                    Please login to rate this product
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description & Specifications Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 mt-12 md:mt-24 border-t border-gray-100 pt-12 md:pt-20">
                    <div className="space-y-6 md:space-y-10">
                        <div className="flex items-center gap-4">
                            <span className="h-[2px] w-8 md:w-12 bg-primary-600" />
                            <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Strategic Overview</h2>
                        </div>
                        <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3rem] border border-gray-50 shadow-sm">
                            <p className="text-gray-500 text-base md:text-xl font-medium leading-[1.8] whitespace-pre-line">
                                {product.unitDetails?.description || product.description || (product.formType === 'shop-listing' && product.items?.[0]?.description) || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6 md:space-y-10">
                        <div className="flex items-center gap-4">
                            <span className="h-[2px] w-8 md:w-12 bg-primary-600" />
                            <h2 className="text-xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Specifications</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {specifications.map((s, i) => (
                                <div key={i} className="flex flex-col justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-primary-600 transition-colors">{s.name}</span>
                                    <span className="text-sm font-black text-gray-800 uppercase tracking-tight">
                                        {Array.isArray(s.value) ? s.value.join(', ') : s.value}
                                    </span>
                                </div>
                            ))}
                            {specifications.length === 0 && (
                                <div className="col-span-full p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                    No Technical Specs Provided
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <B2BBottomNav />

        </div>
    );
};

export default B2BProductDetail;
