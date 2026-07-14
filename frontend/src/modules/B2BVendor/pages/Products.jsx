import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    FiPackage,
    FiPlus,
    FiList,
} from "react-icons/fi";
import { useVendorSettings } from "../hooks/useVendorSettings";

const Products = () => {
    const navigate = useNavigate();

    const { settings } = useVendorSettings();

    const menuItems = [
        {
            path: "/b2b-vendor/products/manage-products",
            label: "Manage Products",
            icon: FiPackage,
            gradient: "from-blue-500 via-blue-600 to-blue-700",
            lightGradient: "from-blue-50 via-blue-100/80 to-blue-50",
            shadowColor: "shadow-blue-500/20",
            hoverShadow: "hover:shadow-blue-500/30",
            description: "View and manage your B2B product listings",
        },
        {
            path: "/b2b-vendor/products/add-product",
            label: "Add Product",
            icon: FiPlus,
            gradient: "from-green-500 via-green-600 to-green-700",
            lightGradient: "from-green-50 via-green-100/80 to-green-50",
            shadowColor: "shadow-green-500/20",
            hoverShadow: "hover:shadow-green-500/30",
            description: "List a new B2B product for retailers",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">Products</h1>
                <p className="text-gray-500">Manage your B2B product catalog for vendors.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.path}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(item.path)}
                            className="group relative h-48 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.lightGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                            <div className={`relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="text-white text-2xl" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-lg font-bold text-gray-800 mb-1">{item.label}</h3>
                                <p className="text-sm text-gray-500">{item.description}</p>
                            </div>

                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default Products;
