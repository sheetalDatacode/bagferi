import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getActiveBanners } from "../services/bannerService";

const B2BBanner = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [banners, setBanners] = useState([]);
    const [displayTime, setDisplayTime] = useState(3000);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        // Load real banners from API
        const loadBanners = async () => {
            try {
                setLoading(true);
                console.log('🖼️ Loading B2B banners...');
                const response = await getActiveBanners('b2b');

                if (response.success && response.data) {
                    const bannerData = response.data.banners || [];

                    // Transform API data to component format

                    const transformedBanners = bannerData.map(banner => {
                        const rawImage = banner.bannerImage || banner.image;
                        // Handle local paths by ensuring they point to the backend 
                        // In dev, the vite proxy handles /upload, but as a fallback/safety:
                        const image = rawImage?.startsWith('/upload')
                            ? (import.meta.env.MODE === 'development' ? `http://localhost:5000${rawImage}` : rawImage)
                            : rawImage;

                        return {
                            id: banner._id || banner.id,
                            image: image,
                            title: banner.title || banner.vendorId?.storeName || banner.vendorId?.name || 'B2B Featured Banner',
                            vendorId: banner.vendorId?._id || banner.vendorId,
                            link: banner.link || banner.redirectUrl || (banner.vendorId?._id ? `/b2b/vendor/${banner.vendorId._id}` : ''),
                        };
                    });

                    setBanners(transformedBanners);


                    // Get display time from settings if available
                    if (response.data.settings?.displayTime) {
                        setDisplayTime(response.data.settings.displayTime * 1000); // Convert seconds to milliseconds
                    } else if (response.data.settings?.universalDisplayTime) {
                        setDisplayTime(response.data.settings.universalDisplayTime * 1000);
                    }
                } else {
                    console.warn('⚠️ No banners data in response:', response);
                    setBanners([]);
                }
            } catch (error) {
                console.error("❌ Failed to load B2B banners:", error);
                setBanners([]);
            } finally {
                setLoading(false);
            }
        };
        loadBanners();
    }, []);

    // Auto-slide functionality
    useEffect(() => {
        if (banners.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % banners.length);
        }, displayTime);

        return () => clearInterval(interval);
    }, [banners.length, displayTime, isPaused]);

    const handleNext = () => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
    };

    const handlePrev = () => {
        setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    };

    const handleBannerClick = (banner) => {
        // Priority 1: Redirect to Vendor Shop URL if vendorId is present
        if (banner.vendorId) {
            navigate(`/b2b/vendor/${banner.vendorId}`);
            return;
        }

        // Priority 2: Use specific link if provided
        if (banner.link && banner.link !== '#' && banner.link !== '' && banner.link !== '/') {
            if (banner.link.startsWith('http')) {
                window.location.href = banner.link;
            } else {
                navigate(banner.link);
            }
        }
    };

    if (loading) {
        return (
            <div className="w-full px-4 mb-6">
                <div className="w-full bg-gray-100 animate-pulse rounded-2xl" style={{ aspectRatio: "3/1" }}></div>
            </div>
        );
    }

    if (banners.length === 0) {
        return null;
    }


    return (
        <div
            className="w-full overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div
                    ref={containerRef}
                    className="group relative w-full overflow-hidden rounded-xl"
                    style={{ aspectRatio: "16/6" }}
                >
                    <motion.div
                        className="flex h-full"
                        style={{
                            width: `${banners.length * 100}%`,
                            height: "100%",
                        }}
                        animate={{
                            x: `-${currentSlide * (100 / banners.length)}%`,
                        }}
                        transition={{
                            duration: 0.8,
                            ease: [0.25, 0.46, 0.45, 0.94],
                            type: "tween",
                        }}>
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id || banner._id || `banner-${index}`}
                                className={`flex-shrink-0 relative ${banner.vendorId || (banner.link && banner.link !== '#') ? 'cursor-pointer' : ''}`}
                                onClick={() => handleBannerClick(banner)}
                                style={{
                                    width: `${100 / banners.length}%`,
                                    height: "100%",
                                }}>
                                <img
                                    src={banner.image || banner.bannerImage}
                                    alt={banner.title || `B2B Banner ${index + 1}`}
                                    className="w-full h-full object-contain bg-black/5"
                                    loading={index === 0 ? "eager" : "lazy"}
                                    onError={(e) => {
                                        console.error(`❌ Failed to load banner image:`, banner.image || banner.bannerImage);
                                        e.target.style.display = 'none';
                                    }}
                                />
                                {/* Overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                                    <div className="p-6">
                                        <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold uppercase rounded-full mb-2 inline-block">
                                            B2B Featured
                                        </span>
                                        <h3 className="text-white text-xl font-bold">{banner.title}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Navigation Arrows */}
                    {banners.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}

                    {/* Indicators */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {banners.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
                                    aria-label={`Go to slide ${index + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white w-6 shadow-md" : "bg-white/40 w-1.5 hover:bg-white/60"
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
                <div
                    className="relative w-full overflow-hidden rounded-xl"
                    style={{ aspectRatio: "16/6" }}
                >
                    <motion.div
                        className="flex h-full cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = offset.x;
                            if (swipe < -50) handleNext();
                            else if (swipe > 50) handlePrev();
                        }}
                        style={{
                            width: `${banners.length * 100}%`,
                            height: "100%",
                        }}
                        animate={{
                            x: `-${currentSlide * (100 / banners.length)}%`,
                        }}
                        transition={{
                            duration: 0.6,
                            ease: "easeInOut",
                        }}>
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id || banner._id || `banner-${index}`}
                                className={`flex-shrink-0 relative ${banner.vendorId || (banner.link && banner.link !== '#') ? 'cursor-pointer' : ''}`}
                                onClick={() => handleBannerClick(banner)}
                                style={{
                                    width: `${100 / banners.length}%`,
                                    height: "100%",
                                }}>
                                <img
                                    src={banner.image || banner.bannerImage}
                                    alt={banner.title || `B2B Banner ${index + 1}`}
                                    className="w-full h-full object-contain bg-black/5 select-none"
                                    draggable="false"
                                    onError={(e) => {
                                        console.error(`❌ Failed to load banner image:`, banner.image || banner.bannerImage);
                                        e.target.style.display = 'none';
                                    }}
                                />
                                {/* Overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                                    <div className="p-4">
                                        <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold uppercase rounded-full mb-1 inline-block">
                                            B2B Featured
                                        </span>
                                        <h3 className="text-white text-sm font-bold">{banner.title}</h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Mobile Dots */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {banners.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white w-4" : "bg-white/50 w-1"
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BBanner;
