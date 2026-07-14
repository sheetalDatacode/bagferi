import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FiSave, FiX, FiUpload } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

import { useCategoryStore } from "../../../shared/store/categoryStore";
import { useBrandStore } from "../../../shared/store/brandStore";
import CategorySelector from "./CategorySelector";
import AnimatedSelect from "./AnimatedSelect";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';
import Button from "./Button";
import api from "../../../shared/utils/api.js";

const ProductFormModal = ({ isOpen, onClose, productId, onSuccess }) => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  const isEdit = productId && productId !== "new";

  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands } = useBrandStore();

  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    price: "",
    originalPrice: "",
    image: "",
    images: [],
    categoryId: null,
    subcategoryId: null,
    subSubCategoryId: null,
    brandId: null,
    stock: "in_stock",
    stockQuantity: "",
    totalAllowedQuantity: "",
    minimumOrderQuantity: "",
    warrantyPeriod: "",
    guaranteePeriod: "",
    hsnCode: "",
    flashSale: false,
    isNew: false,
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    description: "",
    tags: [],
    variants: {
      sizes: [],
      colors: [],
      materials: [],
      prices: {},
      defaultVariant: {},
    },
    seoTitle: "",
    seoDescription: "",
    relatedProducts: [],
  });

  useEffect(() => {
    initCategories();
    initBrands();
  }, [initCategories, initBrands]);

  useEffect(() => {
    const loadProduct = async () => {
      if (isOpen && isEdit && productId && categories.length > 0) {
        try {
          const response = await api.get(`/admin/products/${productId}`);
          const product = response.data.product;

          if (product) {
            // Determine if categoryId is a subcategory
            const categoryId = product.categoryId?._id || product.categoryId?.id || product.categoryId || null;
            const subcategoryId = product.subcategoryId?._id || product.subcategoryId?.id || product.subcategoryId || null;
            const subSubCategoryId = product.subSubCategoryId?._id || product.subSubCategoryId?.id || product.subSubCategoryId || null;

            setFormData({
              name: product.name || "",
              unit: product.unit || "",
              price: product.price || "",
              originalPrice: product.originalPrice || product.price || "",
              image: product.image || "",
              images: product.images || [],
              categoryId: categoryId,
              subcategoryId: subcategoryId,
              subSubCategoryId: subSubCategoryId,
              brandId: product.brandId?._id || product.brandId?.id || product.brandId || null,
              stock: product.stock || "in_stock",
              stockQuantity: product.stockQuantity || "",
              totalAllowedQuantity: product.totalAllowedQuantity || "",
              minimumOrderQuantity: product.minimumOrderQuantity || "",
              warrantyPeriod: product.warrantyPeriod || "",
              guaranteePeriod: product.guaranteePeriod || "",
              hsnCode: product.hsnCode || "",
              flashSale: product.flashSale || false,
              isNew: product.isNew || false,
              isVisible: product.isVisible !== undefined ? product.isVisible : true,
              codAllowed:
                product.codAllowed !== undefined ? product.codAllowed : true,
              returnable:
                product.returnable !== undefined ? product.returnable : true,
              cancelable:
                product.cancelable !== undefined ? product.cancelable : true,
              taxIncluded:
                product.taxIncluded !== undefined ? product.taxIncluded : false,
              description: product.description || "",
              tags: product.tags || [],
              variants: {
                sizes: product.variants?.sizes || [],
                colors: product.variants?.colors || [],
                materials: product.variants?.materials || [],
                prices: product.variants?.prices || {},
                defaultVariant: product.variants?.defaultVariant || {},
              },
              seoTitle: product.seoTitle || "",
              seoDescription: product.seoDescription || "",
              relatedProducts: product.relatedProducts || [],
            });
          } else {
            toast.error("Product not found");
            onClose();
          }
        } catch (error) {
          console.error("Failed to load product:", error);
          toast.error("Failed to load product");
          onClose();
        }
      } else if (isOpen && !isEdit) {
        // Reset form for new product
        setFormData({
          name: "",
          unit: "",
          price: "",
          originalPrice: "",
          image: "",
          images: [],
          categoryId: null,
          subcategoryId: null,
          brandId: null,
          stock: "in_stock",
          stockQuantity: "",
          totalAllowedQuantity: "",
          minimumOrderQuantity: "",
          warrantyPeriod: "",
          guaranteePeriod: "",
          hsnCode: "",
          flashSale: false,
          isNew: false,
          isVisible: true,
          codAllowed: true,
          returnable: true,
          cancelable: true,
          taxIncluded: false,
          description: "",
          tags: [],
          variants: {
            sizes: [],
            colors: [],
            materials: [],
            prices: {},
            defaultVariant: {},
          },
          seoTitle: "",
          seoDescription: "",
          relatedProducts: [],
        });
      }
    };
    loadProduct();
  }, [isOpen, isEdit, productId, onClose, categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const toastId = toast.loading('Processing image...');
      try {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressed = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({
            ...formData,
            image: reader.result,
          });
          toast.success('Image processed', { id: toastId });
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error('Compression error:', err);
        toast.error('Failed to process image', { id: toastId });
      }
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const toastId = toast.loading('Processing gallery images...');
    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith("image/")) return null;
          try {
            return await imageCompression(file, options);
          } catch (err) {
            return file; // Fallback
          }
        })
      );

      const validCompressed = compressedFiles.filter(Boolean);
      const readers = validCompressed.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(readers);
      setFormData({
        ...formData,
        images: [...formData.images, ...results],
      });
      toast.success(`${results.length} image(s) added to gallery`, { id: toastId });
    } catch (error) {
      console.error('Gallery processing error:', error);
      toast.error('Error processing gallery images', { id: toastId });
    }
  };

  const removeGalleryImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasSizeVariants = formData.variants?.sizes && formData.variants.sizes.length > 0;
    const hasPriceVariants = formData.variants?.prices && Object.keys(formData.variants.prices).length > 0;
    const isPriceRequired = !hasSizeVariants && !hasPriceVariants;

    if (!formData.name || (isPriceRequired && !formData.price) || (isPriceRequired && !formData.stockQuantity)) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const hasSizeVariants = formData.variants?.sizes && formData.variants.sizes.length > 0;
      const hasPriceVariants = formData.variants?.prices && Object.keys(formData.variants.prices).length > 0;

      let parsedPrice = formData.price ? parseFloat(formData.price) : 0;
      let parsedStockQuantity = formData.stockQuantity ? parseInt(formData.stockQuantity) : 0;

      // Deriving price from variations if they exist
      if (hasPriceVariants) {
        const prices = Object.values(formData.variants.prices).map(p => parseFloat(p)).filter(p => !isNaN(p));
        if (prices.length > 0) {
          parsedPrice = Math.min(...prices);
        }
      }

      // Prepare payload
      const payload = {
        name: formData.name,
        unit: formData.unit || "",
        price: parsedPrice,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        image: formData.image || null,
        images: formData.images || [],
        description: formData.description || "",
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null,
        brandId: formData.brandId || null,
        stock: formData.stock || "in_stock",
        stockQuantity: parsedStockQuantity,
        totalAllowedQuantity: formData.totalAllowedQuantity ? parseInt(formData.totalAllowedQuantity) : null,
        minimumOrderQuantity: formData.minimumOrderQuantity ? parseInt(formData.minimumOrderQuantity) : null,
        warrantyPeriod: formData.warrantyPeriod || null,
        guaranteePeriod: formData.guaranteePeriod || null,
        hsnCode: formData.hsnCode || null,
        flashSale: formData.flashSale || false,
        isNew: formData.isNew || false,
        isVisible: formData.isVisible !== undefined ? formData.isVisible : true,
        codAllowed: formData.codAllowed !== undefined ? formData.codAllowed : true,
        returnable: formData.returnable !== undefined ? formData.returnable : true,
        cancelable: formData.cancelable !== undefined ? formData.cancelable : true,
        taxIncluded: formData.taxIncluded || false,
        tags: formData.tags || [],
        variants: formData.variants || {
          sizes: [],
          colors: [],
          materials: [],
          prices: {},
          defaultVariant: {},
        },
        seoTitle: formData.seoTitle || "",
        seoDescription: formData.seoDescription || "",
        relatedProducts: formData.relatedProducts || [],
      };

      if (isEdit) {
        await api.put(`/admin/products/${productId}`, payload);
        toast.success("Product updated successfully");
      } else {
        await api.post("/admin/products", payload);
        toast.success("Product created successfully");
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[10000]"
          />

          {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[10000] flex ${isAppRoute ? "items-start pt-[10px]" : "items-end"
              } sm:items-center justify-center p-4 pointer-events-none`}>
            <motion.div
              variants={{
                hidden: {
                  y: isAppRoute ? "-100%" : "100%",
                  scale: 0.95,
                  opacity: 0,
                },
                visible: {
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: "spring",
                    damping: 22,
                    stiffness: 350,
                    mass: 0.7,
                  },
                },
                exit: {
                  y: isAppRoute ? "-100%" : "100%",
                  scale: 0.95,
                  opacity: 0,
                  transition: {
                    type: "spring",
                    damping: 30,
                    stiffness: 400,
                  },
                },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`bg-white ${isAppRoute ? "rounded-b-3xl" : "rounded-t-3xl"
                } sm:rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col pointer-events-auto`}
              style={{ willChange: "transform" }}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEdit ? "Edit Product" : "Create Product"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEdit
                      ? "Update product information"
                      : "Add a new product to your catalog"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Form Content - Scrollable */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <input
                          type="text"
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          placeholder="e.g., Piece, Kilogram, Gram"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <CategorySelector
                          value={formData.categoryId}
                          subcategoryId={formData.subcategoryId}
                          subSubCategoryId={formData.subSubCategoryId}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Brand
                        </label>
                        <AnimatedSelect
                          name="brandId"
                          value={formData.brandId || ""}
                          onChange={handleChange}
                          placeholder="Select Brand"
                          options={[
                            { value: "", label: "Select Brand" },
                            ...brands
                              .filter((brand) => brand.isActive !== false)
                              .map((brand) => ({
                                value: String(brand.id),
                                label: brand.name,
                              })),
                          ]}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Product description..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing removed as per user request - prices now managed via sizes/variations */}

                  {/* Product Media */}
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 sm:p-6 border-2 border-primary-200 shadow-lg">
                    <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
                      <FiUpload className="text-2xl" />
                      Product Media
                    </h3>

                    <div className="space-y-6">
                      {/* Main Image */}
                      <div className="bg-white rounded-lg p-4 border border-primary-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          Main Image
                        </h4>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Main Image
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="main-image-upload-modal"
                            />
                            <label
                              htmlFor="main-image-upload-modal"
                              className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-white">
                              <FiUpload className="text-lg text-primary-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {formData.image
                                  ? "Change Main Image"
                                  : "Choose Main Image"}
                              </span>
                            </label>
                          </div>
                          {formData.image && (
                            <div className="mt-4 flex items-start gap-4">
                              <img
                                src={formData.image}
                                alt="Main Preview"
                                className="w-24 h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, image: "" })
                                }
                                className="mt-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium">
                                Remove Image
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Gallery */}
                      <div className="bg-white rounded-lg p-4 border border-primary-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          Product Gallery
                        </h4>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Gallery Images (Multiple)
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              multiple
                              onChange={handleGalleryUpload}
                              className="hidden"
                              id="gallery-upload-modal"
                            />
                            <label
                              htmlFor="gallery-upload-modal"
                              className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-white">
                              <FiUpload className="text-lg text-primary-600" />
                              <span className="text-sm font-medium text-gray-700">
                                Choose Gallery Images
                              </span>
                            </label>
                          </div>
                          {formData.images && formData.images.length > 0 && (
                            <div className="mt-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {formData.images.map((img, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Gallery ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeGalleryImage(index)}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      title="Remove image">
                                      <FiX className="text-xs" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                {formData.images.length} image(s) in gallery
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Inventory
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stock Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="stockQuantity"
                          value={formData.stockQuantity}
                          onChange={handleChange}
                          required
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stock Status
                        </label>
                        <AnimatedSelect
                          name="stock"
                          value={formData.stock}
                          onChange={handleChange}
                          options={[
                            { value: "in_stock", label: "In Stock" },
                            { value: "low_stock", label: "Low Stock" },
                            { value: "out_of_stock", label: "Out of Stock" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Product Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Additional Product Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Allowed Quantity
                        </label>
                        <input
                          type="number"
                          name="totalAllowedQuantity"
                          value={formData.totalAllowedQuantity}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter total allowed quantity"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Minimum Order Quantity
                        </label>
                        <input
                          type="number"
                          name="minimumOrderQuantity"
                          value={formData.minimumOrderQuantity}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter minimum order quantity"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Warranty Period
                        </label>
                        <input
                          type="text"
                          name="warrantyPeriod"
                          value={formData.warrantyPeriod}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., 1 Year, 6 Months"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Guarantee Period
                        </label>
                        <input
                          type="text"
                          name="guaranteePeriod"
                          value={formData.guaranteePeriod}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., 1 Year, 6 Months"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          HSN Code
                        </label>
                        <input
                          type="text"
                          name="hsnCode"
                          value={formData.hsnCode}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter HSN Code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Variants */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Product Variants
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sizes (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(formData.variants?.sizes || []).join(", ")}
                          onChange={(e) => {
                            const sizes = e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s);
                            setFormData({
                              ...formData,
                              variants: { ...formData.variants, sizes },
                            });
                          }}
                          placeholder="S, M, L, XL"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Colors (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(formData.variants?.colors || []).join(", ")}
                          onChange={(e) => {
                            const colors = e.target.value
                              .split(",")
                              .map((c) => c.trim())
                              .filter((c) => c);
                            setFormData({
                              ...formData,
                              variants: { ...formData.variants, colors },
                            });
                          }}
                          placeholder="Red, Blue, Green"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Tags
                    </h3>
                    <div>
                      <input
                        type="text"
                        value={(formData.tags || []).join(", ")}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t);
                          setFormData({ ...formData, tags });
                        }}
                        placeholder="tag1, tag2, tag3"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* SEO */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      SEO Settings
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          SEO Title
                        </label>
                        <input
                          type="text"
                          name="seoTitle"
                          value={formData.seoTitle}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="SEO optimized title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          SEO Description
                        </label>
                        <textarea
                          name="seoDescription"
                          value={formData.seoDescription}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="SEO meta description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Options
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="flashSale"
                          checked={formData.flashSale}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Flash Sale
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isNew"
                          checked={formData.isNew}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          New Arrival
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isVisible"
                          checked={formData.isVisible}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Visible to Customers
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Product Settings */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Product Settings
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="codAllowed"
                          checked={formData.codAllowed}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          COD Allowed
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="returnable"
                          checked={formData.returnable}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Returnable
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="cancelable"
                          checked={formData.cancelable}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Cancelable
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="taxIncluded"
                          checked={formData.taxIncluded}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Tax Included in Prices
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="secondary"
                      size="sm">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={FiSave}
                      size="sm">
                      {isEdit ? "Update Product" : "Create Product"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductFormModal;
