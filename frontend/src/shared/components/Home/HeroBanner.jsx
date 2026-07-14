import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { getActiveBanners } from "../../../modules/Vendor/services/heroBannerService";

const HeroBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);
  const [displayTime, setDisplayTime] = useState(2000);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await getActiveBanners();
        if (response.success && response.data) {
          const bannerData = response.data.banners || [];
          const transformedBanners = bannerData.map(banner => ({
            ...banner,
            id: banner._id || banner.id,
            image: (banner.bannerImage || banner.image)?.startsWith('/upload')
              ? (import.meta.env.MODE === 'development' ? `http://localhost:5000${banner.bannerImage || banner.image}` : (banner.bannerImage || banner.image))
              : (banner.bannerImage || banner.image)
          }));
          setBanners(transformedBanners);
          setDisplayTime(response.data.settings?.universalDisplayTime || 2000);
        }
      } catch (error) {
        console.error("Failed to load hero banners:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, []);

  const [isPaused, setIsPaused] = useState(false);

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
    if (banner.vendorId) {
      const isMobileApp = location.pathname.startsWith('/app');
      const basePath = isMobileApp ? '/app' : '';

      // Check if it's a B2B vendor or banner
      const isB2B = banner.bannerType === 'b2b' || (banner.vendorId && banner.vendorId.vendorType === 'b2b');
      const vendorIdStr = banner.vendorId?._id || banner.vendorId?.id || banner.vendorId;

      navigate(`${basePath}${isB2B ? '/b2b' : ''}/vendor/${vendorIdStr}`);
    } else if (banner.link) {
      if (banner.link.startsWith('http')) {
        window.location.href = banner.link;
      } else {
        navigate(banner.link);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="w-full bg-gray-100 animate-pulse rounded-2xl" style={{ aspectRatio: "211/35" }}></div>
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div
      className="w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Desktop Layout */}
      <div className="hidden md:block bg-white rounded-lg mb-4 p-4">
        <div
          ref={containerRef}
          className="group relative w-full overflow-hidden rounded-lg shadow-sm"
          style={{
            aspectRatio: "211/35",
          }}>
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
                key={banner.id}
                className={`flex-shrink-0 ${banner.vendorId || banner.link ? 'cursor-pointer' : ''}`}
                onClick={() => handleBannerClick(banner)}
                style={{
                  width: `${100 / banners.length}%`,
                  height: "100%",
                }}>
                <img
                  src={banner.image}
                  alt={banner.title || `Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
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
      <div className="md:hidden px-2 py-3">
        <div
          className="relative w-full overflow-hidden rounded-xl shadow-md"
          style={{
            aspectRatio: "16/9",
          }}>
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
                key={banner.id}
                className={`flex-shrink-0 ${banner.vendorId || banner.link ? 'cursor-pointer' : ''}`}
                onClick={() => handleBannerClick(banner)}
                style={{
                  width: `${100 / banners.length}%`,
                  height: "100%",
                }}>
                <img
                  src={banner.image}
                  alt={banner.title || `Slide ${index + 1}`}
                  className="w-full h-full object-cover select-none"
                  draggable="false"
                />
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

export default HeroBanner;
