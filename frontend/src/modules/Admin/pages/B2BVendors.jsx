import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUsers, FiClock, FiPackage, FiTrendingUp, FiTag } from "react-icons/fi";

const B2BVendors = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            path: "/admin/b2b-vendors/manage",
            label: "Manage B2B Vendors",
            icon: FiUsers,
            description: "View and manage all registered B2B vendors",
            color: "blue",
        },
        {
            path: "/admin/b2b-vendors/pending",
            label: "Pending Approvals",
            icon: FiClock,
            description: "Review and approve new B2B vendor applications",
            color: "orange",
            count: 5,
        },
        {
            path: "/admin/b2b-vendors/products",
            label: "Product Listings",
            icon: FiPackage,
            description: "Oversee all products listed by B2B vendors",
            color: "green",
        },
        {
            path: "/admin/b2b-vendors/analytics",
            label: "B2B Analytics",
            icon: FiTrendingUp,
            description: "B2B market performance and trends",
            color: "indigo",
        },
        {
            path: "/admin/b2b-vendors/categories",
            label: "Categories",
            icon: FiTag,
            description: "Manage B2B product categories and subcategories",
            color: "purple",
        },
        {
            path: "/admin/b2b-vendors/addon-plans",
            label: "Add-on Plans",
            icon: FiPackage,
            description: "Create and manage extra feature unit packs",
            color: "rose",
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div></div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ y: -5 }}
                        onClick={() => navigate(item.path)}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-4 rounded-2xl bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-600 group-hover:text-white transition-colors`}>
                                <item.icon className="text-2xl" />
                            </div>
                            {item.count && (
                                <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">
                                    {item.count}+
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default B2BVendors;
