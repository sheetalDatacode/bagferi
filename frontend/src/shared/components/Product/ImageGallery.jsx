import { useState, useEffect } from "react";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LazyImage from "../LazyImage";

const ImageGallery = ({ images, productName = "Product" }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reset selected image index when images change (e.g., variant change)
  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  // Ensure images is an array
  const imageArray =
    Array.isArray(images) && images.length > 0
      ? images
      : [images].filter(Boolean);

  if (imageArray.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
        <p className="text-gray-400">No image available</p>
      </div>
    );
  }

  const handleThumbnailClick = (index) => {
    setSelectedIndex(index);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % imageArray.length);
  };

  const handlePrevious = () => {
    setSelectedIndex(
      (prev) => (prev - 1 + imageArray.length) % imageArray.length
    );
  };

  const handleImageClick = () => {
    setIsLightboxOpen(true);
  };


  return (
    <>
      <div className="w-full">
        {/* Main Image */}
        <div
          className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden mb-4"
          data-gallery>
          <motion.div
            key={selectedIndex}
            className="w-full h-full"
            onClick={handleImageClick}>
            <LazyImage
              src={imageArray[selectedIndex]}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* Navigation Arrows (if multiple images) */}
          {imageArray.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-300">
                <FiChevronLeft className="text-gray-800 text-xl" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-300">
                <FiChevronRight className="text-gray-800 text-xl" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {imageArray.length > 1 && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {imageArray.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedIndex === index
                  ? "border-primary-600 scale-105"
                  : "border-gray-200"
                  }`}>
                <LazyImage
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white transition-colors z-10">
              <FiX className="text-2xl" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-7xl max-h-[90vh] w-full">
              <img
                src={imageArray[selectedIndex]}
                alt={`${productName} - Full view`}
                className="w-full h-full object-contain max-h-[90vh] rounded-lg"
              />

              {/* Navigation in Lightbox */}
              {imageArray.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white transition-colors">
                    <FiChevronLeft className="text-2xl" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white transition-colors">
                    <FiChevronRight className="text-2xl" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {imageArray.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
                  {selectedIndex + 1} / {imageArray.length}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;
