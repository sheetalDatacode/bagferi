import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import B2BVendorProductForm from "../../components/ProductForm";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/b2b-vendor/products/${id}`);

                if (response.success && response.data?.product) {
                    const productData = response.data.product;
                    {
                        // Standard Product Data transformation (existing logic)
                        const categoryAttr = productData.attributes?.find(attr => attr.name === 'category');
                        const subcategoryAttr = productData.attributes?.find(attr => attr.name === 'subcategory');
                        const bulkPricingAttr = productData.attributes?.find(attr => attr.name === 'bulkPricing');

                        const specifications = productData.attributes?.filter(attr =>
                            !['category', 'subcategory', 'bulkPricing', 'Color', 'color'].includes(attr.name)
                        ) || [];

                        let bulkPricing = [{ minQty: "", price: "" }];
                        // Check productData.bulkPricing first, then attribute
                        if (productData.bulkPricing && Array.isArray(productData.bulkPricing) && productData.bulkPricing.length > 0) {
                            bulkPricing = productData.bulkPricing;
                        } else if (bulkPricingAttr?.value) {
                            try {
                                bulkPricing = typeof bulkPricingAttr.value === 'string' ? JSON.parse(bulkPricingAttr.value) : bulkPricingAttr.value;
                            } catch (e) { console.error('Failed to parse bulk pricing:', e); }
                        }

                        let availability = "In Stock";
                        if (productData.stock === 'out_of_stock') availability = "Out of Stock";
                        else if (productData.stock === 'pre_order') availability = "Available on Order";

                        const images = [];
                        if (productData.image) images.push(productData.image);
                        if (productData.images && productData.images.length > 0) images.push(...productData.images);

                        setProduct({
                            ...productData,
                            name: productData.name || "",
                            category: productData.category || categoryAttr?.value || "",
                            subcategory: productData.subcategory || subcategoryAttr?.value || "",
                            price: productData.price || "",
                            moq: productData.minimumOrderQuantity || 1,
                            brand: productData.brandName || "",
                            availability: availability,
                            description: productData.description || "",
                            images: images,
                            // Pass all specifications; ProductForm will split them into dynamic vs generic
                            specifications: specifications.length > 0
                                ? specifications.map(spec => ({ name: spec.name, value: spec.value }))
                                : [{ name: "", value: "" }],
                            bulkPricing: bulkPricing.length > 0 ? bulkPricing : [{ minQty: "", price: "" }],
                            unit: productData.unit || "Pcs",
                        });
                    }
                } else {
                    toast.error("Product not found");
                    navigate("/b2b-vendor/products/manage-products");
                }
            } catch (error) {
                console.error('Error loading product:', error);
                toast.error("Failed to load product");
                navigate("/b2b-vendor/products/manage-products");
            } finally {
                setLoading(false);
            }
        };

        if (id) loadProduct();
    }, [id, navigate]);

    useEffect(() => {
        if (product?.name) {
            window.dispatchEvent(new CustomEvent('vendor-page-title', { detail: `Edit ${product.name}` }));
        }
    }, [product]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >

            {product && (
                <B2BVendorProductForm isEdit={true} initialData={product} productId={id} />
            )}
        </motion.div>
    );
};

export default EditProduct;

