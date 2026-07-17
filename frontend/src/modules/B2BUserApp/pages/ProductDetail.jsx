import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiMessageSquare, FiTruck, FiShield,
    FiCheckCircle, FiShare2, FiInfo, FiSend, FiX,
    FiPlus, FiMinus, FiShoppingBag, FiStar, FiPaperclip, FiFile, FiPhone, FiMapPin, FiShoppingCart, FiHeart
    , FiChevronUp, FiChevronDown, FiRefreshCw, FiClock, FiStar as FiStarIcon
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

    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    useEffect(() => {
        const fetchRelated = async () => {
            if (product) {
                setLoadingRelated(true);
                try {
                    const category = getCategoryName();
                    const response = await api.get('/products', { params: { category, limit: 5 } });
                    if (response.success && response.data) {
                        const items = response.data.products || response.data.data || response.data;
                        const filtered = (Array.isArray(items) ? items : []).filter(p => p._id !== product._id).slice(0, 4);
                        setRelatedProducts(filtered);
                    }
                } catch (e) {
                    console.error('Error fetching related products:', e);
                } finally {
                    setLoadingRelated(false);
                }
            }
        };
        fetchRelated();
    }, [product]);

    const [openSections, setOpenSections] = useState({
        specifications: true,
        material: false,
        vendor: false,
        reviews: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };


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
            text: `Check out this product on Bagferi: ${product.name || ''}`,
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
        <div className="min-h-screen bg-white pb-24 font-sans text-gray-800">
            <B2BHeader />

            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 text-[10px] md:text-xs text-gray-400 font-medium">
                Home <span className="mx-1"></span> Products <span className="mx-1"></span> <span className="text-gray-800">{product.name}</span>
            </div>

            <main className="max-w-7xl mx-auto px-4 md:px-8 pb-12">

                {/* Top Split Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 bg-white rounded-xl md:border border-gray-100 md:p-6 mb-8 shadow-sm">

                    {/* Media Section */}
                    <div className="space-y-4">
                        <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center p-4">
                            <img
                                src={productImages[safeSelectedImage]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay Icons */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={handleShareClick} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
                                    <FiShare2 className="text-gray-600 text-lg" />
                                </button>
                                <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
                                    <FiHeart className="text-gray-600 text-lg" />
                                </button>
                            </div>
                        </div>

                        {productImages.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {productImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all bg-white ${safeSelectedImage === idx ? 'border-teal-500' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info Section */}
                    <div className="flex flex-col pt-2 md:pt-4">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                            {product.formType === 'shop-listing' && product.items?.[0]
                                ? (product.items[0].itemName || product.name)
                                : product.name}
                        </h1>

                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center text-[#fbbf24]">
                                {[...Array(5)].map((_, i) => (
                                    <FiStarIcon key={i} className={`fill-current w-4 h-4 ${i < Math.round(ratingSummary.averageRating) ? 'text-[#fbbf24]' : 'text-gray-200'}`} />
                                ))}
                            </div>
                            <span className="text-sm font-medium text-slate-500">
                                ({ratingSummary.ratingCount} reviews)
                            </span>
                            <span className="bg-[#e11d48] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                                Bestseller
                            </span>
                        </div>

                        <div className="mt-6 flex items-baseline gap-2">
                            <span className="text-3xl md:text-4xl font-black text-slate-900">
                                ₹{currentPrice}
                            </span>
                            <span className="text-sm font-medium text-slate-400">
                                / {product.formType === 'shop-listing' && product.items?.[0] ? product.items[0].unit : (product.unit || 'piece')}
                            </span>
                        </div>

                        <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
                            SKU: {product.sku || 'N/A'}
                        </div>

                        <p className="text-sm text-slate-500 mt-6 leading-relaxed">
                            {product.unitDetails?.description || product.description || (product.formType === 'shop-listing' && product.items?.[0]?.description) || 'No description provided.'}
                        </p>

                        {/* Summary Grid */}
                        <div className="mt-8 border-t border-b border-gray-100 py-4 grid grid-cols-[1fr_2fr] gap-y-3 text-sm">
                            <span className="text-slate-400 font-medium">Material</span>
                            <span className="text-slate-700 font-bold">{specifications.find(s => s.name.toLowerCase().includes('material'))?.value || 'N/A'}</span>

                            <span className="text-slate-400 font-medium">Finish</span>
                            <span className="text-slate-700 font-bold">{specifications.find(s => s.name.toLowerCase().includes('finish'))?.value || 'Matte'}</span>

                            <span className="text-slate-400 font-medium">Thickness</span>
                            <span className="text-slate-700 font-bold">{specifications.find(s => s.name.toLowerCase().includes('thickness'))?.value || 'N/A'}</span>

                            <span className="text-slate-400 font-medium">SKU</span>
                            <span className="text-slate-700 font-bold">{product.sku || 'N/A'}</span>

                            <span className="text-slate-400 font-medium">Stock</span>
                            <div>
                                <span className="text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded text-xs font-bold">
                                    In Stock
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-6 text-sm">
                            <FiTruck className="text-teal-600 text-lg" />
                            <span className="text-slate-500">Deliver in</span>
                            <span className="text-teal-600 font-bold">4 hours</span>
                            <span className="text-slate-400">to default</span>
                        </div>

                        {/* Sticky Action Buttons */}
                        <div className="mt-8 grid grid-cols-2 gap-4 sticky bottom-0 bg-white py-4 border-t border-gray-100 md:border-none md:py-0 md:static z-40">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) return navigate('/login');
                                    toast.success('Added to Cart!');
                                }}
                                className="bg-[#14b8a6] hover:bg-[#0d9488] text-white py-3.5 px-4 rounded font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <FiShoppingCart className="text-lg" /> Add to Cart
                            </button>
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) return navigate('/login');
                                    toast.success('Proceed to Checkout');
                                }}
                                className="bg-[#0f172a] hover:bg-black text-white py-3.5 px-4 rounded font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.9868 6.94103C13.2519 6.64332 13.0405 6.16669 12.6416 6.16669H7.66667V0.833354C7.66667 0.395167 7.15174 0.158102 6.8188 0.443903L0.342611 6.00223C0.0336631 6.26732 0.222378 6.77259 0.635852 6.77259H5.5303V12.1667C5.5303 12.6049 6.04523 12.8419 6.37817 12.5561L12.9868 6.94103Z" fill="currentColor" />
                                </svg>
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <div className="flex items-center gap-4 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                        <FiShield className="text-teal-600 text-2xl shrink-0" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Secure Payment</div>
                            <div className="text-slate-400 text-xs mt-1">100% Protected</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                        <FiRefreshCw className="text-teal-600 text-2xl shrink-0" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Easy return on manufacturing defect</div>
                            <div className="text-slate-400 text-xs mt-1">7-Day Returns</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                        <FiStar className="text-teal-600 text-2xl shrink-0" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Expert Support</div>
                            <div className="text-slate-400 text-xs mt-1">24/7 Available</div>
                        </div>
                    </div>
                </div>

                {/* Accordion Sections */}
                <div className="border border-gray-100 rounded-lg overflow-hidden bg-white shadow-sm mb-16">
                    {/* Specifications Accordion */}
                    <div>
                        <button
                            onClick={() => toggleSection('specifications')}
                            className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-slate-900 tracking-wide">SPECIFICATIONS</span>
                            {openSections.specifications ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
                        </button>
                        {openSections.specifications && (
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/30">
                                <div className="space-y-4 text-sm mt-4">
                                    <div className="grid grid-cols-[1fr_2fr] pb-4 border-b border-gray-100">
                                        <span className="text-slate-400 font-medium uppercase text-xs tracking-wider">Brand</span>
                                        <span className="text-slate-800 font-bold">{product.brand || 'Local'}</span>
                                    </div>
                                    <div className="grid grid-cols-[1fr_2fr] pb-4 border-b border-gray-100">
                                        <span className="text-slate-400 font-medium uppercase text-xs tracking-wider">Category</span>
                                        <span className="text-slate-800 font-bold">{getCategoryName()}</span>
                                    </div>
                                    {specifications.map((s, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_2fr] pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                            <span className="text-slate-400 font-medium uppercase text-xs tracking-wider">{s.name}</span>
                                            <span className="text-slate-800 font-bold">{Array.isArray(s.value) ? s.value.join(', ') : s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Material & Build Accordion */}
                    <div className="border-t border-gray-100">
                        <button
                            onClick={() => toggleSection('material')}
                            className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-slate-900 tracking-wide">MATERIAL & BUILD</span>
                            {openSections.material ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
                        </button>
                        {openSections.material && (
                            <div className="px-6 py-4 border-t border-gray-100 text-sm text-slate-600 bg-gray-50/30">
                                Detailed material composition and build quality information would be displayed here.
                            </div>
                        )}
                    </div>

                    {/* Vendor Information Accordion */}
                    <div className="border-t border-gray-100">
                        <button
                            onClick={() => toggleSection('vendor')}
                            className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-slate-900 tracking-wide">VENDOR INFORMATION</span>
                            {openSections.vendor ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
                        </button>
                        {openSections.vendor && (
                            <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center text-2xl font-black uppercase">
                                        {(product.shopName || product.shopUnitId?.name || product.vendorId?.storeName)?.charAt(0) || 'V'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 uppercase">{product.shopName || product.shopUnitId?.name || product.vendorId?.storeName || 'Verified Store'}</h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-[#10b981] text-xs font-bold uppercase tracking-wider">
                                            <FiCheckCircle /> Platinum Verified
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => product.vendorId?._id && navigate(`/b2b/vendor/${product.vendorId._id}?itemType=${product.itemType}`)}
                                        className="ml-auto text-teal-600 font-bold text-sm hover:underline"
                                    >
                                        Visit Store
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reviews & Ratings Accordion */}
                    <div className="border-t border-gray-100">
                        <button
                            onClick={() => toggleSection('reviews')}
                            className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-slate-900 tracking-wide">REVIEWS & RATINGS</span>
                            {openSections.reviews ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
                        </button>
                        {openSections.reviews && (
                            <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/30">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4">{userRating ? 'Your Rating' : 'Rate this Product'}</h4>
                                    <div className="flex items-center gap-4">
                                        <StarRating
                                            rating={draftRating}
                                            interactive={true}
                                            onRate={setDraftRating}
                                            size={24}
                                        />
                                    </div>
                                    {draftRating > 0 && (
                                        <button
                                            onClick={handleRatingSubmit}
                                            disabled={isSubmittingRating || !isAuthenticated}
                                            className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-wide hover:bg-black transition-colors disabled:opacity-50"
                                        >
                                            {isSubmittingRating ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* You May Also Like Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-900">You May Also Like</h2>
                        <a href="#" className="text-teal-600 font-bold text-sm hover:underline">See All &rarr;</a>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {loadingRelated ? (
                            <div className="col-span-2 md:col-span-4 text-center py-8 text-gray-400 text-sm">Loading related products...</div>
                        ) : relatedProducts.length > 0 ? (
                            relatedProducts.map((rp, idx) => {
                                const pImages = rp.media?.map(m => m.url) || rp.images || [rp.image];
                                const pImg = pImages.find(i => i) || 'https://via.placeholder.com/300';
                                const pPrice = rp.pricing?.b2b?.price || rp.price || 0;
                                const formCat = rp.formType === 'shop-listing' ? rp.items?.[0]?.category : rp.category;
                                const pCat = typeof formCat === 'object' ? formCat?.name : formCat;
                                const pName = rp.formType === 'shop-listing' && rp.items?.[0] ? (rp.items[0].itemName || rp.name) : rp.name;

                                return (
                                    <Link to={`/b2b/product/${rp._id}`} key={idx} onClick={() => window.scrollTo(0, 0)} className="border border-gray-100 rounded-xl p-3 flex flex-col relative group hover:shadow-lg transition-shadow bg-white text-left">
                                        {idx === 0 && <span className="absolute top-3 left-3 bg-teal-50 text-teal-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider z-10 border border-teal-100">Top Choice</span>}
                                        <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500 z-10 transition-colors" onClick={(e) => { e.preventDefault(); /* handle wish */ }}>
                                            <FiHeart className="text-sm" />
                                        </button>
                                        <div className="bg-gray-50 h-32 md:h-48 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                                            <img src={pImg} className="w-full h-full object-cover rounded-lg" alt={pName} />
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm truncate">{pName}</h3>
                                        <span className="text-xs text-gray-400 mb-2 truncate">{pCat || 'Product'}</span>
                                        <div className="flex items-end justify-between mt-auto">
                                            <div>
                                                <div className="font-black text-slate-900 text-lg">₹{formatPrice(pPrice)}</div>
                                                <div className="text-[9px] text-gray-400">Incl. GST</div>
                                            </div>
                                            <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition-colors" onClick={(e) => { e.preventDefault(); toast.success('Added to Cart!'); }}>
                                                <FiShoppingCart /> Add
                                            </button>
                                        </div>
                                        <div className="mt-3 text-[10px] text-teal-600 font-bold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span> In Stock • Fast Delivery
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="col-span-2 md:col-span-4 text-center py-8 text-gray-400 text-sm">No related products found.</div>
                        )}
                    </div>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );

};

export default B2BProductDetail;
