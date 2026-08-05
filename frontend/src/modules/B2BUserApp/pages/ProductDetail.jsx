import React, { useState, useEffect, useRef } from 'react';
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
import { useCartStore } from '../../../shared/store/cartStore';
import { handleShare } from '../../../shared/utils/share';
import { getRatingSummary, getUserRating, submitRating } from '../../../shared/services/ratingService';
import StarRating from '../../../shared/components/StarRating';
import { useWishlistStore } from '../../../shared/store/wishlistStore';

const B2BProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState('image'); // 'image' | 'video'
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedVariants, setSelectedVariants] = useState({});
    const videoRef = useRef(null);

    useEffect(() => {
        if (selectedMedia === 'video' && videoRef.current) {
            videoRef.current.play().catch(err => {
                console.log("Autoplay was prevented or video load failed:", err);
            });
        }
    }, [selectedMedia]);
    const [quantity, setQuantity] = useState(1);

    const handleQuantityChange = (type) => {
        const moq = Number(product?.moq || product?.minimumOrderQuantity || 1);
        const hasVariants = product?.variants && product.variants.length > 0;
        const firstSelectedSize = selectedSizes[0] || null;
        const availableColors = hasVariants
            ? Array.from(new Set(product.variants.filter(v => v.size === firstSelectedSize).map(v => v.color).filter(Boolean)))
            : (product?.colors || []);
        const activeVariant = hasVariants
            ? product.variants.find(v => 
                v.size === firstSelectedSize && 
                (availableColors.length === 0 || v.color === selectedColor)
              )
            : null;
        const currentStockQty = activeVariant ? activeVariant.stockQuantity : (product?.stockQuantity || 999);

        if (type === 'inc' && quantity < currentStockQty) {
            setQuantity(prev => prev + 1);
        } else if (type === 'dec' && quantity > moq) {
            setQuantity(prev => prev - 1);
        }
    };

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
    const [productReviews, setProductReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    const { addToCart } = useCartStore();
    const { wishlistItems, toggleWishlist } = useWishlistStore();
    const isWishlisted = product ? wishlistItems.includes(product._id) : false;

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

                // Fetch full reviews list
                setLoadingReviews(true);
                try {
                    const revRes = await api.get('/rating/list', { params: { targetType: 'product', targetId: id } });
                    if (revRes.success && revRes.data) {
                        setProductReviews(revRes.data);
                    }
                } catch (e) {
                    console.error('Failed to fetch reviews', e);
                } finally {
                    setLoadingReviews(false);
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
                
                // Refresh reviews list
                const revRes = await api.get('/rating/list', { params: { targetType: 'product', targetId: id } });
                if (revRes.success && revRes.data) {
                    setProductReviews(revRes.data);
                }
                
                toast.success('Review submitted successfully!');
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
                  if (productData.variants && productData.variants.length > 0) {
                      const uniqueSizes = Array.from(new Set(productData.variants.map(v => v.size).filter(Boolean)));
                      if (uniqueSizes.length > 0) {
                          setSelectedSizes([uniqueSizes[0]]);
                          const uniqueColorsForSize = Array.from(new Set(productData.variants.filter(v => v.size === uniqueSizes[0]).map(v => v.color).filter(Boolean)));
                          if (uniqueColorsForSize.length > 0) {
                              setSelectedColor(uniqueColorsForSize[0]);
                          }
                      }
                  } else {
                      if (productData.sizes && productData.sizes.length > 0) {
                         setSelectedSizes([productData.sizes[0]]);
                      }
                      if (productData.colors && productData.colors.length > 0) {
                         setSelectedColor(productData.colors[0]);
                      }
                  }
                
                // Initialize selected variants for dynamic category multi-select fields
                const initialVariants = {};
                const dynamicMultiFields = [];
                const addFields = (cat) => {
                    if (cat && Array.isArray(cat.fields)) {
                        cat.fields.forEach(f => {
                            if (f.type === 'multi-select' && f.isVariant && f.label && !['color', 'colors', 'size', 'sizes'].includes(f.label.toLowerCase())) {
                                dynamicMultiFields.push(f);
                            }
                        });
                    }
                };
                addFields(productData.category);
                addFields(productData.subcategory);
                addFields(productData.subSubcategory);

                dynamicMultiFields.forEach(f => {
                    const spec = (productData.specifications || []).find(s => s.name?.toLowerCase() === f.label?.toLowerCase());
                    if (spec && spec.value) {
                        const opts = String(spec.value).split(',').map(v => v.trim()).filter(Boolean);
                        if (opts.length > 0) {
                            initialVariants[f.label] = opts[0];
                        }
                    }
                });
                setSelectedVariants(initialVariants);

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
    if (productImages.length === 0 && !product.videoLink) {
        productImages = ['https://via.placeholder.com/800x600?text=No+Image'];
    }

    const safeSelectedImage = Math.min(selectedImage, Math.max(0, productImages.length - 1));

    const fixLegacyDynamicUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        if (!url.includes('/e_mute/') && !url.includes('/ac_none/') && !url.includes('l_video:') && !url.includes('l_audio:')) {
            return url;
        }
        return url
            .replace(/\/e_mute\//g, '/ac_none/')
            .replace(/l_audio:/g, 'l_video:')
            .replace(/:upload:video:/g, ':')
            .replace(/:upload:/g, ':');
    };

    const getYouTubeId = (url) => {
        if (!url) return null;
        // Handle all YouTube URL formats including youtu.be, watch?v=, embed/, shorts/, live/
        const regExp = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regExp);
        return match ? match[1] : null;
    };
    let videoLink = fixLegacyDynamicUrl(product.videoLink);
    if (videoLink && videoLink.includes('cloudinary.com') && !getYouTubeId(videoLink)) {
        videoLink = videoLink.replace(/\/image\/upload\//, '/video/upload/');
        videoLink = videoLink.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '.mp4');
        if (videoLink.startsWith('http://')) videoLink = videoLink.replace('http://', 'https://');
    }
    const ytId = getYouTubeId(videoLink);

    const getCategoryName = () => {
        if (product.formType === 'shop-listing') return 'Shop Listing';
        if (product.category && typeof product.category === 'object') return product.category.name || 'Product';
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

    const specifications = getSpecifications();

    const hasVariants = product.variants && product.variants.length > 0;
    const availableSizes = hasVariants 
        ? Array.from(new Set(product.variants.map(v => v.size).filter(Boolean)))
        : (product.sizes || []);
        
    const availableColors = hasVariants
        ? Array.from(new Set(product.variants.filter(v => selectedSizes.includes(v.size)).map(v => v.color).filter(Boolean)))
        : (product.colors || []);

    const activeVariant = hasVariants
        ? product.variants.find(v => 
            selectedSizes.includes(v.size) && 
            (availableColors.length === 0 || v.color === selectedColor)
          )
        : null;

    const currentPrice = activeVariant ? activeVariant.price : (product.price || 0);
    const currentMrp = activeVariant ? activeVariant.mrp : product.mrp;
    const currentStockQty = activeVariant ? activeVariant.stockQuantity : product.stockQuantity;

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
                        <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center">
                            {selectedMedia === 'video' && videoLink ? (
                                ytId ? (
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        ></iframe>
                                ) : (
                                    <video 
                                        key={videoLink}
                                        ref={videoRef}
                                        src={videoLink}
                                        className="w-full h-full object-contain rounded-xl bg-black"
                                        muted={true}
                                        loop
                                        playsInline
                                        controls
                                        preload="auto"
                                    />
                                )
                            ) : productImages.length === 0 && videoLink ? (
                                // No images at all, auto-show video
                                ytId ? (
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src={`https://www.youtube.com/embed/${ytId}`} 
                                        title="YouTube video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <video 
                                        key={videoLink}
                                        ref={videoRef}
                                        src={videoLink}
                                        className="w-full h-full object-contain rounded-xl bg-black"
                                        muted={true}
                                        loop
                                        playsInline
                                        controls
                                        preload="auto"
                                    />
                                )
                            ) : (
                                <img
                                    src={productImages[safeSelectedImage]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {/* Overlay Icons */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => {
                                        if (!isAuthenticated) {
                                            toast.error('Please login first');
                                            return navigate('/b2b/login');
                                        }
                                        toggleWishlist(product._id);
                                    }}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border shadow-sm ${
                                        isWishlisted 
                                            ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:text-red-500 hover:border-red-500 hover:bg-red-50'
                                    }`}
                                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                                >
                                    <FiHeart className={`text-xl ${isWishlisted ? 'fill-current' : ''}`} />
                                </button>
                                <button 
                                    onClick={handleShareClick}
                                    className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-teal-600 hover:border-teal-600 shadow-sm transition-colors"
                                >
                                    <FiShare2 className="text-xl" />
                                </button>
                            </div>
                        </div>

                        {/* Thumbnail Strip: images + video */}
                        {(productImages.length > 1 || (productImages.length >= 1 && videoLink)) && (
                            <div>
                                {productImages.length > 1 && (
                                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                        <FiCheckCircle className="text-xs" />
                                        <span>Tap an image to select it — your choice will be shown to the vendor with your order</span>
                                    </div>
                                )}
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {productImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setSelectedImage(idx); setSelectedMedia('image'); }}
                                            className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all bg-white ${
                                                selectedMedia === 'image' && safeSelectedImage === idx 
                                                    ? 'border-teal-500 ring-2 ring-teal-300 ring-offset-1' 
                                                    : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            {selectedMedia === 'image' && safeSelectedImage === idx && (
                                                <div className="absolute inset-0 bg-teal-500/10 flex items-end justify-end p-1">
                                                    <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                                                        <FiCheckCircle className="text-white text-[10px]" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}

                                    {/* Video Thumbnail */}
                                    {videoLink && (
                                        <button
                                            onClick={() => setSelectedMedia('video')}
                                            className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all bg-black relative flex items-center justify-center ${
                                                selectedMedia === 'video' 
                                                    ? 'border-teal-500' 
                                                    : 'border-gray-100 hover:border-gray-300'
                                            }`}
                                        >
                                            {ytId ? (
                                                <img 
                                                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                                    alt="video" 
                                                    className="w-full h-full object-cover opacity-70"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </div>
                                            )}
                                            {/* Play icon overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow">
                                                    <svg className="w-3 h-3 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </div>
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

                        <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-gray-500">
                            <span>Sold by:</span>
                            <span className="text-gray-900 font-bold">{product.shopName || product.shopUnitId?.name || product.vendorId?.storeName || 'Verified Store'}</span>
                            {(product.vendorId?._id || product.vendorId) && (
                                <button
                                    onClick={() => navigate(`/b2b/vendor/${product.vendorId?._id || product.vendorId}`)}
                                    className="ml-2 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors font-bold text-[10px] uppercase tracking-wider"
                                >
                                    Visit Store
                                </button>
                            )}
                        </div>

                        <div className="mt-6 flex items-baseline gap-2">
                            <span className="text-3xl md:text-4xl font-black text-slate-900">
                                ₹{currentPrice}
                            </span>
                            {currentMrp && currentMrp > currentPrice && (
                                <>
                                    <span className="text-xl font-medium text-slate-400 line-through ml-2">
                                        ₹{currentMrp}
                                    </span>
                                    <span className="text-[11px] font-black text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-lg ml-2">
                                        ₹{currentMrp - currentPrice} OFF
                                    </span>
                                </>
                            )}
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

                         {availableSizes && availableSizes.length > 0 && (
                             <div className="mt-4">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sizes</span>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                     {availableSizes.map((s, idx) => (
                                         <button
                                             key={idx}
                                             onClick={() => {
                                                 setSelectedSizes(prev => {
                                                     if (prev.includes(s)) {
                                                         if (prev.length === 1) return prev; // Keep at least one selected
                                                         return prev.filter(item => item !== s);
                                                     } else {
                                                         return [...prev, s];
                                                     }
                                                 });
                                                 if (hasVariants) {
                                                     // Auto select first color for the newly selected size
                                                     const colorsForSize = Array.from(new Set(product.variants.filter(v => v.size === s).map(v => v.color).filter(Boolean)));
                                                     if (colorsForSize.length > 0) {
                                                         setSelectedColor(colorsForSize[0]);
                                                     }
                                                 }
                                             }}
                                             className={`px-3 py-1.5 border text-xs font-bold rounded-lg transition-all ${
                                                 selectedSizes.includes(s)
                                                     ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                     : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                             }`}
                                         >
                                             {s}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}

                         {availableColors && availableColors.length > 0 && (
                             <div className="mt-4">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colors</span>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                     {availableColors.map((c, idx) => (
                                         <button
                                             key={idx}
                                             onClick={() => setSelectedColor(c)}
                                             className={`px-3 py-1.5 border text-xs font-bold rounded-lg transition-all ${
                                                 selectedColor === c
                                                     ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                     : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                             }`}
                                         >
                                             {c}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}

                        {/* Dynamic Multi-Select Variant Selectors */}
                        {(() => {
                            const fields = [];
                            const addFields = (cat) => {
                                if (cat && Array.isArray(cat.fields)) {
                                    cat.fields.forEach(f => {
                                        if (f.type === 'multi-select' && f.isVariant && f.label && !['color', 'colors', 'size', 'sizes'].includes(f.label.toLowerCase())) {
                                            fields.push(f);
                                        }
                                    });
                                }
                            };
                            addFields(product.category);
                            addFields(product.subcategory);
                            addFields(product.subSubcategory);

                            return fields.map((field) => {
                                const spec = specifications.find(s => s.name?.toLowerCase() === field.label?.toLowerCase());
                                if (!spec || !spec.value) return null;
                                const opts = String(spec.value).split(',').map(v => v.trim()).filter(Boolean);
                                if (opts.length === 0) return null;

                                return (
                                    <div key={field.label} className="mt-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{field.label}</span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {opts.map((opt, idx) => {
                                                const isSelected = selectedVariants[field.label] === opt;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSelectedVariants(p => ({ ...p, [field.label]: opt }))}
                                                        className={`px-3 py-1.5 border text-xs font-bold rounded-lg transition-all ${
                                                            isSelected
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}

                        {/* Summary Grid / Specifications */}
                        <div className="mt-8 border-t border-b border-gray-100 py-4 grid grid-cols-[1fr_2fr] gap-y-3 text-sm">
                            <span className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Brand</span>
                            <span className="text-slate-800 font-bold">{product.brandName || product.brand || 'Local'}</span>

                            <span className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Category</span>
                            <span className="text-slate-800 font-bold">{getCategoryName()}</span>

                            {specifications.map((s, idx) => (
                                <React.Fragment key={idx}>
                                    <span className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">{s.name}</span>
                                    <span className="text-slate-800 font-bold">{Array.isArray(s.value) ? s.value.join(', ') : s.value}</span>
                                </React.Fragment>
                            ))}

                            <span className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Stock</span>
                            <div>
                                {product.stock === 'out_of_stock' || currentStockQty === 0 ? (
                                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">Out of Stock</span>
                                ) : product.stock === 'pre_order' ? (
                                    <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold">Pre-Order</span>
                                ) : (
                                    <span className="text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded text-xs font-bold">
                                        In Stock {currentStockQty ? `(${currentStockQty})` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {(() => {
                            const fd = product.shopUnit?.fashionDeliveryTime || product.vendorId?.fashionDeliveryTime || product.vendorId?.shopUnit?.fashionDeliveryTime;
                            if (fd?.minDays && fd?.maxDays) {
                                return (
                                    <div className="flex items-center gap-2 mt-6 text-sm">
                                        <FiTruck className="text-teal-600 text-lg" />
                                        <span className="text-slate-500">Deliver within</span>
                                        <span className="text-teal-600 font-bold">{fd.minDays}-{fd.maxDays} days</span>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex items-center gap-2 mt-6 text-sm">
                                    <FiTruck className="text-teal-600 text-lg" />
                                    <span className="text-slate-500">Deliver in</span>
                                    <span className="text-teal-600 font-bold">4 hours</span>
                                    <span className="text-slate-400">to default</span>
                                </div>
                            );
                        })()}

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-4 mt-6">
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Quantity:</span>
                            <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                                <button 
                                    onClick={() => handleQuantityChange('dec')}
                                    disabled={quantity <= (product.moq || product.minimumOrderQuantity || 1)}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 font-bold shadow-sm disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-95"
                                >
                                    <FiMinus />
                                </button>
                                <input 
                                    type="number" 
                                    value={quantity}
                                    readOnly
                                    className="w-12 h-10 bg-transparent text-center font-black text-gray-900 outline-none"
                                />
                                <button 
                                    onClick={() => handleQuantityChange('inc')}
                                    disabled={quantity >= (currentStockQty || 999)}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-gray-700 font-bold shadow-sm disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-95"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                        </div>

                        {/* Sticky Action Buttons */}
                        <div className="fixed bottom-[64px] left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-none md:p-0 md:bg-transparent z-40 mt-8 grid grid-cols-2 gap-4">
                            <button
                                onClick={async () => {
                                    if (!isAuthenticated) {
                                        toast.error('Please login first');
                                        return navigate('/b2b/login');
                                    }
                                    if (selectedSizes.length === 0) {
                                        return toast.error('Please select at least one size');
                                    }
                                    const selectedImgUrl = selectedMedia === 'image' ? (productImages[safeSelectedImage] || null) : null;
                                    const promises = selectedSizes.map(size => 
                                        addToCart(product._id, quantity, size, selectedColor, selectedVariants, selectedImgUrl)
                                    );
                                    await Promise.all(promises);
                                }}
                                className="bg-[#ff6b00] hover:bg-[#e66000] text-white py-3.5 px-4 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <FiShoppingCart className="text-lg" /> Add to Cart
                            </button>
                            <button
                                onClick={async () => {
                                    if (!isAuthenticated) {
                                        toast.error('Please login first');
                                        return navigate('/b2b/login');
                                    }
                                    if (selectedSizes.length === 0) {
                                        return toast.error('Please select at least one size');
                                    }
                                    const selectedImgUrl = selectedMedia === 'image' ? (productImages[safeSelectedImage] || null) : null;
                                    for (const size of selectedSizes) {
                                        await addToCart(product._id, quantity, size, selectedColor, selectedVariants, selectedImgUrl, true);
                                    }
                                    navigate('/b2b/checkout');
                                }}
                                className="bg-[#04439c] hover:bg-[#03367c] text-white py-3.5 px-4 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-colors"
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
                                
                                <div className="mb-8 max-w-md bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4">{userRating ? 'Update Your Review' : 'Write a Review'}</h4>
                                    <div className="flex items-center gap-4 mb-4">
                                        <StarRating
                                            rating={draftRating}
                                            interactive={true}
                                            onRate={setDraftRating}
                                            size={24}
                                        />
                                    </div>
                                    <textarea
                                        value={draftComment}
                                        onChange={(e) => setDraftComment(e.target.value)}
                                        placeholder="Share your experience with this product..."
                                        className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 mb-3"
                                        maxLength={500}
                                    />
                                    <button
                                        onClick={handleRatingSubmit}
                                        disabled={isSubmittingRating || !isAuthenticated || draftRating === 0}
                                        className="w-full py-2.5 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-wide hover:bg-black transition-colors disabled:opacity-50"
                                    >
                                        {isSubmittingRating ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </div>

                                <div className="mt-8">
                                    <h4 className="text-md font-black text-slate-900 mb-4">Customer Reviews</h4>
                                    {loadingReviews ? (
                                        <div className="text-sm text-gray-500">Loading reviews...</div>
                                    ) : productReviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {productReviews.map((rev) => (
                                                <div key={rev._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {rev.userId?.name || 'Anonymous User'}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {new Date(rev.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <StarRating rating={rev.rating} size={14} />
                                                    </div>
                                                    {rev.comment && (
                                                        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
                                                            {rev.comment}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 bg-white p-4 rounded-xl border border-gray-100">
                                            No reviews yet. Be the first to review this product!
                                        </div>
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
                                const getYouTubeId = (url) => {
                                    if (!url) return null;
                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                    const match = url.match(regExp);
                                    return (match && match[2].length === 11) ? match[2] : null;
                                };
                                const videoLink = rp.videoLink || (rp.formType === 'shop-listing' ? rp.items?.[0]?.videoLink : null);
                                const ytId = getYouTubeId(videoLink);

                                let rawImages = [];
                                if (rp.media && rp.media.length > 0) rawImages = rp.media.map(m => m.url);
                                else rawImages = [rp.image, ...(rp.images || [])];

                                if (rp.formType === 'shop-listing' && rp.items?.[0]?.images?.length > 0) {
                                    rawImages = rp.items[0].images;
                                } else if (rp.formType === 'shop-listing' && rp.items?.[0]?.image) {
                                    rawImages = [rp.items[0].image];
                                }
                                
                                const validImages = Array.isArray(rawImages) ? rawImages.filter(Boolean) : [];
                                const hasImage = validImages.length > 0;
                                const pImg = hasImage 
                                    ? validImages[0] 
                                    : ytId 
                                        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                                        : 'https://placehold.co/300x300/f8fafc/94a3b8?text=No+Image';
                                
                                const pPrice = rp.pricing?.b2b?.price || rp.price || 0;
                                
                                let pCat = 'Product';
                                if (rp.formType === 'shop-listing' && rp.items?.[0]?.category) {
                                    pCat = typeof rp.items[0].category === 'object' ? rp.items[0].category?.name : rp.items[0].category;
                                } else if (rp.category) {
                                    if (typeof rp.category === 'object' && rp.category.name) {
                                        pCat = rp.category.name;
                                    } else if (typeof rp.category === 'string' && rp.category.length !== 24) {
                                        pCat = rp.category;
                                    } else {
                                        const catAttr = rp.attributes?.find(a => a.name === 'category' || a.attributeName === 'category');
                                        if (catAttr) pCat = catAttr.value;
                                    }
                                }
                                const pName = rp.formType === 'shop-listing' && rp.items?.[0] ? (rp.items[0].itemName || rp.name) : rp.name;
                                const isRpWishlisted = wishlistItems.includes(rp._id);

                                return (
                                    <Link to={`/b2b/product/${rp._id}`} key={idx} onClick={() => window.scrollTo(0, 0)} className="border border-gray-100 rounded-xl p-3 flex flex-col relative group hover:shadow-lg transition-shadow bg-white text-left">
                                        {idx === 0 && <span className="absolute top-3 left-3 bg-teal-50 text-teal-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider z-10 border border-teal-100">Top Choice</span>}
                                        <button 
                                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-10 transition-colors ${
                                                isRpWishlisted 
                                                    ? 'bg-red-50 text-red-500 border border-red-100' 
                                                    : 'bg-white text-gray-400 hover:text-red-500 border border-gray-100'
                                            }`}
                                            onClick={(e) => { 
                                                e.preventDefault();
                                                if (!isAuthenticated) {
                                                    toast.error('Please login first');
                                                    return navigate('/b2b/login');
                                                }
                                                toggleWishlist(rp._id);
                                            }}
                                        >
                                            <FiHeart className={`text-sm ${isRpWishlisted ? 'fill-current' : ''}`} />
                                        </button>
                                        <div className="bg-gray-50 h-32 md:h-48 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-xs overflow-hidden relative">
                                            <img src={pImg} className={`w-full h-full object-cover rounded-lg ${ytId && !hasImage ? 'opacity-80' : ''}`} alt={pName} />
                                            {ytId && !hasImage && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center pl-1 shadow-lg text-white">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm truncate">{pName}</h3>
                                        <span className="text-xs text-gray-400 mb-2 truncate">{pCat || 'Product'}</span>
                                        <div className="flex items-end justify-between mt-auto">
                                            <div>
                                                <div className="font-black text-slate-900 text-lg">{formatPrice(pPrice)}</div>
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
