import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiShoppingBag,
  FiRotateCcw,
  FiPackage,
  FiLayers,
  FiGrid,
  FiTag,
  FiUsers,
  FiImage,
  FiPercent,
  FiBell,
  FiMessageCircle,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiTruck,
  FiGlobe,
  FiDatabase,
  FiChevronDown,
  FiX,
  FiUser,
  FiGift,
  FiVideo,
  FiMusic,
  FiAlertTriangle,
  FiDollarSign,
  FiMessageSquare,
  FiBriefcase
} from "react-icons/fi";
import { useAdminAuthStore } from "../../store/adminStore";
import adminMenu from "../../config/adminMenu.json";
import api from "../../../../shared/utils/api";

// Icon mapping for menu items
const iconMap = {
  Dashboard: FiHome,
  Transactions: FiDollarSign,
  Customers: FiUsers,
  Vendors: FiUsers,
  Manage: FiGrid,
  Pending: FiRotateCcw,
  Products: FiPackage,
  Wallet: FiShoppingBag,
  Analytics: FiBarChart2,
  Subscriptions: FiTag,
  "Add-on Plans": FiPackage,
  Categories: FiLayers,
  "Job Categories": FiBriefcase,
  "Job Listings": FiBriefcase,
  "Banner Bookings": FiImage,
  "Business Config": FiSettings,
  Notifications: FiBell,
  "Analytics & Finance": FiBarChart2,
  "Lot Slots": FiGrid,
  "Properties": FiHome,
  "Support Settings": FiMessageCircle,
  Settings: FiSettings,
  "Reel Moderation": FiVideo,
  "Reel Reports": FiAlertTriangle,
  "Music Library": FiMusic,
  Firebase: FiDatabase,
  Feedbacks: FiMessageSquare,
};

// Helper function to convert child name to route path
const getChildRoute = (parentRoute, childName) => {
  const routeMap = {
    "/admin/notifications": {
      "Push Notifications": "/admin/notifications/push-notifications",
      "Custom Messages": "/admin/notifications/custom-messages",
    },
    "/admin/settings": {},


    "/admin/firebase": {
      "Push Config": "/admin/firebase/push-config",
      Authentication: "/admin/firebase/authentication",
    },
  };

  return routeMap[parentRoute]?.[childName] || parentRoute;
};

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin } = useAdminAuthStore();
  const [expandedItems, setExpandedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCounts, setSidebarCounts] = useState({
    pendingVendors: 0,
    pendingBanners: 0,
    pendingReels: 0,
    pendingReports: 0,
    pendingFeedbacks: 0
  });

  // Fetch all sidebar notification counts
  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const res = await api.get("/admin/reports/sidebar-counts");
        if (!cancelled && res?.success && res.data) {
          setSidebarCounts(res.data);
        }
      } catch (err) {
        console.error("Error fetching sidebar counts:", err);
      }
    };

    fetchCounts();

    const interval = setInterval(() => {
      fetchCounts();
    }, 60000); // Refresh every minute

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    // Only close when route actually changes, not when sidebar opens
    if (window.innerWidth < 1024) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only trigger on route changes

  // Auto-expand menu items when their route is active (only if viewing a child route)
  useEffect(() => {
    const activeItem = adminMenu.find((item) => {
      if (item.route === "/admin/dashboard") {
        return location.pathname === "/admin/dashboard";
      }
      // Check if current path is a child of this item (not just the parent route itself)
      const isChildRoute =
        location.pathname.startsWith(item.route) &&
        location.pathname !== item.route;
      return isChildRoute;
    });
    if (activeItem && activeItem.children && activeItem.children.length > 0) {
      // Only expand if we're actually on a child route, keep the parent open
      setExpandedItems((prev) => {
        // If the parent is already expanded, keep it expanded (don't close others)
        // This allows navigation between child items without closing the dropdown
        if (prev[activeItem.title]) {
          return prev;
        }
        // Otherwise, close all others and expand this one
        return {
          [activeItem.title]: true,
        };
      });
    } else {
      // If not on a child route, check if we should close expanded items
      // Only close if we're navigating to a completely different parent route
      const currentParent = adminMenu.find((item) => {
        if (item.route === "/admin/dashboard") {
          return location.pathname === "/admin/dashboard";
        }
        return location.pathname.startsWith(item.route);
      });
      // If we're on a parent route without children, close all expanded items
      if (
        currentParent &&
        (!currentParent.children || currentParent.children.length === 0)
      ) {
        setExpandedItems({});
      }
      // If we're on a parent route with children, keep it expanded if it was already expanded
    }
  }, [location.pathname]);

  // Check if a menu item is active
  const isActive = (route) => {
    if (route === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard";
    }
    return location.pathname.startsWith(route);
  };

  // Toggle expanded state for menu items with children
  const toggleExpand = (title, closeOthers = true) => {
    setExpandedItems((prev) => {
      if (closeOthers) {
        // Close all other expanded items and toggle the clicked one
        return {
          [title]: !prev[title],
        };
      } else {
        // Just toggle the clicked item
        return {
          ...prev,
          [title]: !prev[title],
        };
      }
    });
  };

  // Close all expanded items
  const closeAllExpanded = () => {
    setExpandedItems({});
  };

  // Handle menu item click
  const handleMenuItemClick = (route, parentTitle = null) => {
    // If navigating to a child route, keep the parent expanded
    if (parentTitle) {
      setExpandedItems((prev) => {
        // Close all other expanded items, but keep the current parent open
        return {
          [parentTitle]: true,
        };
      });
    } else {
      // If navigating to a parent route without children, close all expanded items
      closeAllExpanded();
    }
    navigate(route);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Render menu item
  const renderMenuItem = (item) => {
    const Icon = iconMap[item.title] || FiPackage;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];
    const active = isActive(item.route);

    return (
      <div key={item.route} className="mb-1">
        {/* Main Menu Item */}
        <div
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
            ${active
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-slate-700"
            }
          `}
          onClick={() => {
            if (hasChildren) {
              // Close all other expanded items when clicking on a parent with children
              toggleExpand(item.title, true);
            } else {
              // Close all expanded items when clicking on a parent without children
              handleMenuItemClick(item.route);
            }
          }}
        >
          <Icon
            className={`text-xl flex-shrink-0 ${active ? "text-white" : "text-gray-400"
              }`}
          />
          <span className="font-medium flex-1 text-sm flex items-center gap-2">
            {item.title}
            {/* Notification Badges */}
            {item.title === "Pending" && sidebarCounts.pendingVendors > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm">
                {sidebarCounts.pendingVendors > 99 ? "99+" : sidebarCounts.pendingVendors}
              </span>
            )}
            {item.title === "Banner Bookings" && sidebarCounts.pendingBanners > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm">
                {sidebarCounts.pendingBanners > 99 ? "99+" : sidebarCounts.pendingBanners}
              </span>
            )}
            {item.title === "Reel Moderation" && sidebarCounts.pendingReels > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                {sidebarCounts.pendingReels > 99 ? "99+" : sidebarCounts.pendingReels}
              </span>
            )}
            {item.title === "Reel Reports" && sidebarCounts.pendingReports > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm">
                {sidebarCounts.pendingReports > 99 ? "99+" : sidebarCounts.pendingReports}
              </span>
            )}
            {item.title === "Feedbacks" && sidebarCounts.pendingFeedbacks > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-sm">
                {sidebarCounts.pendingFeedbacks > 99 ? "99+" : sidebarCounts.pendingFeedbacks}
              </span>
            )}
          </span>
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <FiChevronDown className="text-gray-400 text-sm" />
            </motion.div>
          )}
        </div>

        {/* Children Items */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-600 space-y-1">
                {item.children.map((child, index) => {
                  const childRoute = getChildRoute(item.route, child);
                  const isChildActive =
                    location.pathname === childRoute ||
                    (childRoute !== item.route &&
                      location.pathname.startsWith(childRoute));

                  return (
                    <div
                      key={index}
                      onClick={() =>
                        handleMenuItemClick(childRoute, item.title)
                      }
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer
                        ${isChildActive
                          ? "bg-primary-500/20 text-white font-medium"
                          : "text-gray-400 hover:bg-slate-700"
                        }
                      `}>
                      {child}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sidebar content
  const sidebarContent = (
    <div className="h-full flex flex-col bg-slate-800 shadow-xl">
      {/* Header Section */}
      <div className="p-4 border-b border-slate-700 bg-slate-900">
        {/* Header with Close Button and Admin Info */}
        <div className="flex items-center justify-between gap-3">
          {/* Admin User Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <FiUser className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-sm truncate">
                {admin?.name || "Admin User"}
              </h2>
              <p className="text-xs text-gray-400 truncate">
                {admin?.email || "admin@admin.com"}
              </p>
            </div>
          </div>

          {/* Close Button - Mobile Only */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 lg:hidden"
            aria-label="Close sidebar">
            <FiX className="text-xl text-gray-300" />
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-admin lg:pb-3">
        {adminMenu.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile: Overlay Backdrop */}
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

      {/* Sidebar - Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-64 z-[10000] lg:hidden">
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Fixed */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 z-30">
        {sidebarContent}
      </div>
    </>
  );
};

export default AdminSidebar;
