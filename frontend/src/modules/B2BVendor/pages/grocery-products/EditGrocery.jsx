import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import GroceryProductForm from "../../components/GroceryProductForm";

const EditGrocery = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            try {
                // Fetch the grocery product by ID
                const response = await api.get(`/grocery/products/${id}`);

                if (response.success && response.data) {
                    const productData = response.data;
                    
                    // Transform data if needed for the GroceryProductForm
                    setProduct({
                        ...productData,
                        title: productData.name || "",
                        category: productData.category?._id || productData.category || "",
                        subcategory: productData.subcategory?._id || productData.subcategory || "",
                        mrp: productData.mrp || "",
                        price: productData.price || "",
                        stock: productData.stockQuantity || productData.stock || "",
                        unit: productData.unit || "kg",
                        weight: productData.weight || "",
                        brand: productData.brandName || "",
                        description: productData.description || "",
                        image: productData.image || null,
                        isVisible: productData.isVisible !== false,
                    });
                } else {
                    toast.error("Grocery product not found");
                    navigate("/b2b-vendor/grocery-products/manage-grocery");
                }
            } catch (error) {
                console.error('Error loading grocery product:', error);
                toast.error("Failed to load grocery product");
                navigate("/b2b-vendor/grocery-products/manage-grocery");
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
                <GroceryProductForm isEdit={true} initialData={product} productId={id} />
            )}
        </motion.div>
    );
};

export default EditGrocery;
