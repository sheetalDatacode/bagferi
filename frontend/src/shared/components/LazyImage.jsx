import { useState, useRef, useEffect, useMemo } from "react";
import { getPlaceholderImage } from "../utils/helpers";
import {
  getOptimizedImagePath,
  getImagePriority,
  getImageLoadingStrategy
} from "../utils/imageOptimization";

// Global cache to track loaded images prevents flickering on scroll
const loadedImages = new Set();

const LazyImage = ({
  src,
  alt,
  className,
  onError,
  placeholderWidth = 200,
  placeholderHeight = 200,
  placeholderText,
  context = 'listing', // 'hero', 'product-detail', 'product-listing', 'thumbnail'
  ...props
}) => {
  // Get placeholder as local SVG data URI
  const getLocalPlaceholder = () => getPlaceholderImage(
    placeholderWidth,
    placeholderHeight,
    placeholderText || alt || "Image"
  );

  // Get initial optimized source
  const optimizedSrc = useMemo(() => {
    if (!src) return null;
    return getOptimizedImagePath(src, context);
  }, [src, context]);

  const loadingStrategy = getImageLoadingStrategy(context);
  const isPriority = loadingStrategy.fetchpriority === 'high';
  const isCached = optimizedSrc ? loadedImages.has(optimizedSrc) : false;

  const [imageSrc, setImageSrc] = useState(() => {
    if (!optimizedSrc) return getLocalPlaceholder();
    // If priority or cached, load immediately
    return (isPriority || isCached) ? optimizedSrc : null;
  });

  const [isLoaded, setIsLoaded] = useState(isCached || !optimizedSrc);
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Re-sync state if src/context changes
  useEffect(() => {
    if (!optimizedSrc) {
      setImageSrc(getLocalPlaceholder());
      setIsLoaded(true);
      return;
    }

    if (isCached || isPriority) {
      setImageSrc(optimizedSrc);
      setIsLoaded(true);
      setHasError(false);
    } else {
      // Reset for lazy loading if it's a new un-cached image
      setImageSrc(null);
      setIsLoaded(false);
      setHasError(false);
    }
  }, [optimizedSrc, isPriority]);
  const imgRef = useRef(null);

  useEffect(() => {
    // If no optimizedSrc or already loaded/errored, skip
    if (!optimizedSrc || imageSrc === optimizedSrc || hasError) return;

    // For low-priority images that aren't cached, use lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(optimizedSrc);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [optimizedSrc, imageSrc, hasError]);

  const handleLoad = () => {
    if (optimizedSrc && imageSrc === optimizedSrc) {
      loadedImages.add(optimizedSrc);
    }
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = (e) => {
    // Increment error count to prevent infinite loops
    const nextErrorCount = errorCount + 1;
    setErrorCount(nextErrorCount);

    // If first error, try the local SVG placeholder
    if (nextErrorCount === 1) {
      const fallback = getLocalPlaceholder();
      setImageSrc(fallback);
      // Don't set hasError yet, as the placeholder might load fine
      return;
    }

    // If even the local placeholder failed (rare) or we already tried it
    setHasError(true);
    setIsLoaded(false);

    if (onError) {
      // Pass the event but prevent default to stop further DOM error noise
      try {
        onError(e);
      } catch (err) {
        console.error("Error in LazyImage custom onError:", err);
      }
    }
  };

  return (
    <div className={`relative overflow-hidden ${className || ""}`} ref={imgRef}>
      {/* Loading Shimmer - Only show if trying to load a remote image */}
      {!isLoaded && !hasError && imageSrc !== null && !imageSrc.startsWith('data:') && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}

      {/* Actual Image */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"} ${className || ""}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={isPriority ? "eager" : "lazy"}
          {...props}
        />
      )}

      {/* Final Error Fallback UI */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center p-2">
          <div className="text-center">
            <span className="text-gray-400 text-[10px] md:text-xs block">Image Unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
