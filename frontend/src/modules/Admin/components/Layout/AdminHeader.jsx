import { useState, useRef, useEffect } from 'react';
import { FiMenu, FiBell, FiLogOut, FiUser, FiSettings, FiChevronDown } from 'react-icons/fi';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Button from '../Button';
import NotificationWindow from './NotificationWindow';

const AdminHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get page name from pathname
  const getPageName = (pathname) => {
    // Handle B2B sub-routes specifically
    if (pathname.includes('/admin/b2b-vendors')) {
      if (pathname.includes('/banner-bookings/details')) return 'Banner Booking Details';
      if (pathname.includes('/banner-bookings')) return 'Banner Bookings';
      if (pathname.includes('/manage')) return 'Manage B2B Vendors';
      if (pathname.includes('/analytics')) return 'B2B Analytics';
      if (pathname.includes('/wallet')) return 'B2B Wallet';
      if (pathname.includes('/subscriptions')) return 'B2B Subscriptions';
      if (pathname.includes('/categories')) return 'B2B Categories';
      if (pathname.includes('/product-listings') || pathname.includes('/products')) return 'B2B Products';
      if (pathname.includes('/properties')) return 'B2B Properties';
      if (pathname.includes('/business-types') || pathname.includes('/business-type-config')) return 'Business Types';
      if (pathname.includes('/pending-approvals') || pathname.includes('/pending')) return 'Pending Approvals';
      if (pathname.includes('/secure-deals')) return 'Secure Deals';
      if (pathname.includes('/addon-plans')) return 'Add-on Plans';
      if (pathname.includes('/lot-slots')) return 'Lot/Slot Management';
      if (pathname.includes('/subscription-wallet')) return 'Subscription Wallet';
      if (pathname.includes('/default-banners')) return 'Default Banners';
      
      return 'B2B Vendor Management';
    }



    const path = pathname.split('/').pop() || 'dashboard';
    
    // If path looks like an ID (long hex string), don't use it
    if (/^[0-9a-fA-F]{24}$/.test(path)) {
      // Try to get the second to last part
      const parts = pathname.split('/');
      const parentPath = parts[parts.length - 2];
      if (parentPath === 'details') {
        const grandParentPath = parts[parts.length - 3];
        return grandParentPath.charAt(0).toUpperCase() + grandParentPath.slice(1) + ' Details';
      }
      return 'Details';
    }

    const pageNames = {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      brands: 'Brands',
      orders: "Orders",
      customers: "Customers",
      'return-requests': 'Returns',
      inventory: 'Inventory',
      campaigns: 'Campaigns',
      banners: 'Banners',
      reviews: 'Reviews',
      analytics: 'Analytics',
      content: 'Content',
      settings: 'Settings',
      more: 'More',
    };
    return pageNames[path] || path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
  };


  const pageName = getPageName(location.pathname);

  return (
    <header
      className="bg-white border-b border-gray-200 fixed top-0 left-0 lg:left-64 right-0 z-30"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Left: Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onMenuClick}
            variant="icon"
            className="lg:hidden text-gray-700"
            icon={FiMenu}
          />

          {/* Page Heading - Desktop Only */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{pageName}</h1>
            <p className="text-sm text-gray-600">Welcome back! Here's your business overview.</p>
          </div>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              data-notification-button
              onClick={toggleNotifications}
              variant="icon"
              className="text-gray-700 hover:bg-gray-100"
              icon={FiBell}
            />
            <NotificationWindow
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              position="right"
            />
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 sm:p-1.5 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-sm sm:text-base">
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="hidden sm:block text-left mr-1">
                <p className="text-sm font-bold text-gray-800 leading-none mb-0.5">
                  {admin?.name || "Admin"}
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-none">
                  Administrator
                </p>
              </div>
              <FiChevronDown className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-50 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {admin?.name || "Admin User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {admin?.email || "admin@admin.com"}
                    </p>
                  </div>

                  {/* Settings and other links removed as per user request */}
                  <div className="h-px bg-gray-50 my-1"></div>

                  <div className="h-px bg-gray-50 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <FiLogOut className="text-lg" />
                    <span className="font-medium">Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

