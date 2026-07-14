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
    FiShield
} from "react-icons/fi";
import b2bVendorMenu from "../../config/b2bVendorMenu.json";
import { useB2BVendorAuthStore } from "../../store/b2bVendorAuthStore";
import { useVendorSettings } from "../../hooks/useVendorSettings";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const iconMap = {
    Dashboard: FiHome,
    "Product Listings": FiPackage,
    "Manage Products": FiPackage,
    "Add Product": FiPackage,

    "Secure Deals": FiShield,

    "Property Management": FiHome,
    "Manage Properties": FiHome,
    "Add Property": FiPlus,
    "Lot/Slot Listings": FiPlus,
    Subscription: FiCreditCard,
    "Banner Booking": FiImage,
    "Notifications": FiBell,
    "Account Settings": FiSettings,
    Profile: FiUser,
    Security: FiBriefcase,
};

const getChildRoute = (parentRoute, childName) => {
    const routeMap = {
        "/b2b-vendor/products": {
            "Manage Products": "/b2b-vendor/products/manage-products",
            "Add Product": "/b2b-vendor/products/add-product"
        },
        "/b2b-vendor/properties": {
            "Manage Properties": "/b2b-vendor/properties/manage-properties",
            "Add Property": "/b2b-vendor/properties/add-property",
            "Add Flat": "/b2b-vendor/properties/add-flat",
            "Add Villa": "/b2b-vendor/properties/add-villa"
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
