import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import B2BVendorSidebar from './B2BVendorSidebar';
import B2BVendorHeader from './B2BVendorHeader';
import useAdminHeaderHeight from '../../../Admin/hooks/useAdminHeaderHeight';
import { useVendorSettings } from '../../hooks/useVendorSettings';
import { Navigate } from 'react-router-dom';

const B2BVendorLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const headerHeight = useAdminHeaderHeight();
    const location = useLocation();
    const { settings, loading } = useVendorSettings();

    const isChatPage = location.pathname.includes('/b2b-vendor/messages');

    // Add small buffer to prevent content overlap (8px)
    const topPadding = headerHeight + 8;

    // Check if current route is allowed based on enabled modules
    const isRouteAllowed = () => {
        // We defer to SubscriptionGate or specific page logic to handle unauthorized access
        // instead of abruptly redirecting to the dashboard here.
        return true;
    };

    if (!isRouteAllowed()) {
        return <Navigate to="/b2b-vendor/dashboard" replace />;
    }

    return (
        <div className={`${isChatPage ? 'h-screen' : 'min-h-screen'} bg-gray-50 flex overflow-hidden`}>
            {/* Sidebar */}
            <B2BVendorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-64 min-w-0 max-w-full overflow-x-hidden">
                {/* Header */}
                <B2BVendorHeader onMenuClick={() => setSidebarOpen(true)} />

                {/* Page Content */}
                <main
                    className={`flex-1 p-6 sm:p-10 lg:p-8 xl:p-16 ${isChatPage ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden lg:pb-12 lg:pt-24 scrollbar-admin w-full min-w-0`}

                    style={{
                        paddingTop: `${Math.max(topPadding, 80)}px`,
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    }}
                >
                    <div className={`w-full max-w-full overflow-x-hidden min-w-0 pb-20 lg:pb-0 ${isChatPage ? 'h-full' : ''}`}>

                        <Suspense fallback={
                            <div className="flex items-center justify-center h-full min-h-[400px]">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            </div>
                        }>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>

                {/* Mobile Bottom Nav - Removed as per request */}
            </div>
        </div>
    );
};

export default B2BVendorLayout;
