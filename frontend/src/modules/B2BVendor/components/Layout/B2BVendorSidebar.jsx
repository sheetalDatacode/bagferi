import { useState, useEffect } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiHome,
    FiPackage,
    FiSettings,
    FiUser,
    FiChevronDown,
    FiX,
    FiMessageCircle,
    FiBriefcase,
    FiImage,
    FiCreditCard,
    FiLogOut,
    FiPlus,
    FiBell,
    FiVideo,
    FiUsers,
    FiGift,
    FiAward,
    FiInstagram,
    FiFacebook,
    FiYoutube,
    FiPlayCircle,
    FiLock
} from "react-icons/fi";
import b2bVendorMenu from "../../config/b2bVendorMenu.json";
import { useB2BVendorAuthStore } from "../../store/b2bVendorAuthStore";
import { useVendorSettings } from "../../hooks/useVendorSettings";
import { getSupportConfig } from "../../../../shared/services/supportService";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import ConfirmModal from "../../../Admin/components/ConfirmModal";

const iconMap = {
    Dashboard: FiHome,
    "Product Listings": FiPackage,
    "Manage Products": FiPackage,
    "Add Product": FiPackage,
    "Shop Listing": FiPackage,
    "Property Management": FiHome,
    "Manage Properties": FiHome,
    "Add Commercial": FiPlus,
    "Add Flat": FiPlus,
    "Add Villa / Row House": FiPlus,
    "Add Plot": FiPlus,
    "Lot/Slot Listings": FiPlus,
    Subscription: FiCreditCard,
    "Banner Booking": FiImage,
    "Notifications": FiBell,
    "Account Settings": FiSettings,
    Profile: FiUser,
    Security: FiLock,
    Reels: FiVideo,
    Jobs: FiBriefcase,
    Followers: FiUsers,
    Referral: FiGift,
    "Billing & Invoices": FiCreditCard,
    "My Wallet": FiBriefcase,
    "How to Use": FiPlayCircle,
    "Support & Feedback": FiMessageCircle,
};

const getChildRoute = (parentRoute, childName) => {
    const routeMap = {
        "/b2b-vendor/products": {
            "Manage Products": "/b2b-vendor/products/manage-products",
            "Add Product": "/b2b-vendor/products/add-product"
        },
        "/b2b-vendor/properties": {
            "Manage Properties": "/b2b-vendor/properties/manage-properties",
            "Add Commercial": "/b2b-vendor/properties/add-commercial",
            "Add Flat": "/b2b-vendor/properties/add-flat",
            "Add Villa / Row House": "/b2b-vendor/properties/add-villa",
            "Add Plot": "/b2b-vendor/properties/add-plot"
        },
        "/b2b-vendor/lotslot": {
            "Manage Lots": "/b2b-vendor/lotslot/manage-lots",
            "Add Lot/Slot": "/b2b-vendor/lotslot/add-lotslot",
        },
        "/b2b-vendor/settings": {
            "Profile": "/b2b-vendor/settings/profile",
        },
    };
    return routeMap[parentRoute]?.[childName] || parentRoute;
};

import { useNotificationStore } from "../../../../shared/store/notificationStore";
import { useScrollLock } from "../../../../shared/hooks/useScrollLock";

const B2BVendorSidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const { settings } = useVendorSettings();
    const [expandedItems, setExpandedItems] = useState({});
    const [supportConfig, setSupportConfig] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    
    // Use global notification store
    // Use selectors for better reactivity and performance
    const unreadNotificationCount = useNotificationStore(state => state.unreadCount);
    const fetchUnreadCount = useNotificationStore(state => state.fetchUnreadCount);

    const displayVendorName = vendor?.name || "B2B Vendor";
    const vendorInitial = displayVendorName.charAt(0).toUpperCase();

    // Lock scroll when sidebar is open on mobile
    useScrollLock(isOpen && window.innerWidth < 1024);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);

        // Fetch support config for social links
        const fetchSupport = async () => {
            try {
                const res = await getSupportConfig();
                if (res.success) setSupportConfig(res.data);
            } catch (err) { }
        };
        fetchSupport();

        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const filteredMenu = b2bVendorMenu.filter(item => {
        if (item.title === "Dashboard") return true;

        const alwaysVisible = ["Subscription", "Billing & Invoices", "My Wallet", "Banner Booking", "Notifications", "Account Settings"];
        if (alwaysVisible.includes(item.title)) return true;

        if (!settings || !settings.enabledModules) return false;

        const moduleMap = {
            "Product Listings": "product",
            "Property Management": "property",
            "Lot/Slot Listings": "lotslot",
            "Shop Listing": "shop-listing",
            "Jobs": "jobs",
        };
        const moduleKey = moduleMap[item.title];
        if (!moduleKey) return true;
        return settings.enabledModules.includes(moduleKey);
    });

    const getFilteredChildren = (item) => {
        if (!item.children || item.children.length === 0) return [];
        if (item.title !== 'Property Management') return item.children;

        const allowedForms = Array.isArray(settings?.propertyForms)
            ? settings.propertyForms.map((f) => String(f).toLowerCase().trim())
            : [];

        const childFormMap = {
            'Add Commercial': 'property',
            'Add Flat': 'flat',
            'Add Villa / Row House': 'villa',
            'Add Plot': 'plot'
        };

        return item.children.filter((child) => {
            const formKey = childFormMap[child];
            if (!formKey) return true;
            return allowedForms.includes(formKey);
        });
    };

    useEffect(() => {
        const activeItem = b2bVendorMenu.find((item) => {
            if (item.route === "/b2b-vendor/dashboard") {
                return location.pathname === "/b2b-vendor/dashboard";
            }
            return location.pathname.startsWith(item.route) && location.pathname !== item.route;
        });
        if (activeItem && activeItem.children && activeItem.children.length > 0) {
            setExpandedItems({ [activeItem.title]: true });
        }
    }, [location.pathname]);

    const isActive = (route) => {
        if (route === "/b2b-vendor/dashboard") return location.pathname === "/b2b-vendor/dashboard";
        return location.pathname.startsWith(route);
    };

    const toggleExpand = (title) => {
        setExpandedItems(prev => ({ [title]: !prev[title] }));
    };

    const handleMenuItemClick = (route, parentTitle = null) => {
        if (parentTitle) setExpandedItems({ [parentTitle]: true });
        navigate(route);
        if (window.innerWidth < 1024) onClose();
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        useB2BVendorAuthStore.getState().logout();
        toast.success("Logged out successfully");
        navigate("/b2b-vendor/login");
        if (window.innerWidth < 1024) onClose();
    };

    const renderMenuItem = (item) => {
        const Icon = iconMap[item.title] || FiPackage;
        const filteredChildren = getFilteredChildren(item);
        const hasChildren = filteredChildren.length > 0;
        const isExpanded = expandedItems[item.title];
        const active = isActive(item.route);
        const showNotificationBadge = item.title === "Notifications" && unreadNotificationCount > 0;

        return (
            <div key={item.route} className="mb-1">
                <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${active ? "bg-primary-600 text-white shadow-sm" : "text-gray-300 hover:bg-slate-700"
                        }`}
                    onClick={() => {
                        if (hasChildren) {
                            toggleExpand(item.title);
                        } else {
                            handleMenuItemClick(item.route);
                        }
                    }}
                >
                    <Icon className={`text-xl flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                    <span className="font-medium flex-1 text-sm">{item.title}</span>
                    {showNotificationBadge && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                    )}
                    {hasChildren && (
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                            <FiChevronDown className="text-gray-400 text-sm" />
                        </motion.div>
                    )}
                </div>

                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-600 space-y-1">
                                {filteredChildren.map((child, index) => {
                                    const childRoute = getChildRoute(item.route, child);
                                    return (
                                        <NavLink
                                            key={index}
                                            to={childRoute}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) onClose();
                                            }}
                                            className={({ isActive }) => `block px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${isActive ? "bg-primary-500/20 text-white font-medium" : "text-gray-400 hover:bg-slate-700"
                                                 }`}
                                         >
                                            {child}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const sidebarContent = (
        <div className="h-full flex flex-col bg-slate-800 shadow-xl overflow-hidden text-left"
             style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="p-4 border-b border-slate-700 bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden text-left">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 text-white font-black text-xl border-2 border-primary-500">
                            {vendorInitial}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <h2 className="font-bold text-white text-xs sm:text-sm truncate mb-0.5">
                                {displayVendorName}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-gray-400 truncate block opacity-70">
                                {vendor?.email || 'Vendor Account'}
                            </p>
                        </div>
                    </div>
                    {/* Add Close Button for Mobile Accessibility */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <FiX className="text-xl" />
                    </button>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 pb-32 scrollbar-admin">
                {filteredMenu.map(renderMenuItem)}
                
                {/* External Poster Studio Link */}
                <div className="mt-1 border-t border-slate-700/50 pt-2">
                    <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-purple-300 hover:bg-slate-700 hover:text-white group"
                        onClick={() => {
                            const returnUrl = window.location.origin + '/b2b-vendor/dashboard';
                            window.location.href = `https://poster.dealingindia.com/?return_url=${encodeURIComponent(returnUrl)}`;
                        }}
                    >
                        <span className="font-medium flex-1 text-sm">poster studio</span>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 cursor-pointer text-left"
                    >
                        <FiLogOut className="text-xl flex-shrink-0" />
                        <span className="font-medium text-sm">Logout Account</span>
                    </button>
                </div>
                {supportConfig && (
                    <div className="mt-auto pt-6 px-4 pb-8 flex items-center justify-center gap-6 border-t border-slate-700/50">
                        {supportConfig.instagram && (
                            <a href={supportConfig.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                                <FiInstagram className="text-xl" />
                            </a>
                        )}
                        {supportConfig.facebook && (
                            <a href={supportConfig.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                <FiFacebook className="text-xl" />
                            </a>
                        )}
                        {supportConfig.youtube && (
                            <a href={supportConfig.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors">
                                <FiYoutube className="text-xl" />
                            </a>
                        )}
                    </div>
                )}
            </nav>
        </div>
    );

    return (
        <div className="text-left">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="fixed left-0 top-0 bottom-0 w-64 z-[10000] lg:hidden overflow-hidden"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-30 overflow-hidden">
                {sidebarContent}
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Logout Confirmation"
                message="Are you sure you want to logout? You will need to login again to access your dashboard."
                confirmText="Logout"
                cancelText="Stay Logged In"
                type="danger"
            />
        </div>
    );
};

export default B2BVendorSidebar;
