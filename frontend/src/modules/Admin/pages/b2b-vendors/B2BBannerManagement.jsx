import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiSettings,
    FiCalendar,
    FiEye,
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiInfo,
    FiEdit3,
    FiCreditCard,
    FiChevronDown,
    FiChevronUp,
    FiPlus,
    FiTrash2,
    FiImage,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "../../../../shared/utils/helpers";
import { IndianRupee } from "lucide-react";
import Badge from "../../../../shared/components/Badge";
import DataTable from "../../components/DataTable";
import { useScrollLock } from "../../../../shared/hooks/useScrollLock";
import {
    getAdminBannerSlots,
    getAdminBannerBookings,
    updateBannerSlot,
    updateBannerSettings,
    approveBannerBooking,
    rejectBannerBooking,
    getBannerRevenueStats
} from "../../services/heroBannerService";

const B2BBannerManagement = () => {
    const navigate = useNavigate();
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [settings, setSettings] = useState({
        universalDisplayTime: 3000,
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999
    });
    const [revenueStats, setRevenueStats] = useState({
        totalRevenue: 28995,
        percentageChange: 12.5
    });
    const [loading, setLoading] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [rejectModal, setRejectModal] = useState({ show: false, bookingId: null, reason: '' });
    const [editingSlotId, setEditingSlotId] = useState(null);

    // Lock scroll when rejection modal is open
    useScrollLock(rejectModal.show);

    // Settings form state
    const [settingsForm, setSettingsForm] = useState({
        universalDisplayTime: 3000,
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999
    });

    const [slotForm, setSlotForm] = useState({
        price: ""
    });


    // Prevent duplicate API calls in React StrictMode
    const hasLoadedData = useRef(false);

    useEffect(() => {
        if (!hasLoadedData.current) {
            hasLoadedData.current = true;
            loadData();
        }
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [slotsRes, bookingsRes] = await Promise.all([
                getAdminBannerSlots({ params: { bannerType: 'b2b' } }),
                getAdminBannerBookings({ params: { bannerType: 'b2b' } })
            ]);

            // Handle response structure (API interceptor returns response.data directly)
            // Backend returns: { success: true, data: { slots: [], settings: {} } }
            // Interceptor returns: { success: true, data: { slots: [], settings: {} } }
            let slotsData = null;
            if (slotsRes?.success && slotsRes?.data) {
                slotsData = slotsRes.data;
            } else if (slotsRes?.data?.success && slotsRes?.data?.data) {
                slotsData = slotsRes.data.data;
            } else if (slotsRes?.data) {
                slotsData = slotsRes.data;
            }

            if (slotsData) {
                const slotsList = slotsData.slots || [];
                console.log('B2B Banner Management - Slots loaded:', slotsList.length, slotsList);
                setSlots(slotsList);

                if (slotsData.settings) {
                    const newSettings = {
                        universalDisplayTime: slotsData.settings?.universalDisplayTime || 3000,
                        bookingWindowDays: slotsData.settings?.bookingWindowDays || 30,
                        minDurationHours: slotsData.settings?.minDurationHours || 24,
                        maxDurationHours: slotsData.settings?.maxDurationHours || 720,
                        defaultPricePerDay: slotsData.settings?.defaultPricePerDay || 2999
                    };
                    setSettings(newSettings);
                    setSettingsForm(newSettings);
                }
            }

            // Handle bookings response (API interceptor returns response.data directly)
            // Backend returns: { success: true, data: [...] }
            // Interceptor returns: { success: true, data: [...] }
            let bookingsData = [];
            if (bookingsRes?.success && bookingsRes?.data) {
                bookingsData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
            } else if (bookingsRes?.data?.success && bookingsRes?.data?.data) {
                bookingsData = Array.isArray(bookingsRes.data.data) ? bookingsRes.data.data : [];
            } else if (Array.isArray(bookingsRes?.data)) {
                bookingsData = bookingsRes.data;
            } else if (Array.isArray(bookingsRes)) {
                bookingsData = bookingsRes;
            }

            console.log('B2B Banner Management - Bookings loaded:', bookingsData.length, bookingsData);
            setBookings(bookingsData);

            // Load revenue stats for B2B banners - Calculate from paid bookings only
            try {
                const statsRes = await getBannerRevenueStats({ params: { bannerType: 'b2b' } });
                // Handle different response structures
                let revenueData = null;
                if (statsRes?.data?.success && statsRes?.data?.data) {
                    revenueData = statsRes.data.data;
                } else if (statsRes?.success && statsRes?.data) {
                    revenueData = statsRes.data;
                } else if (statsRes?.data) {
                    revenueData = statsRes.data;
                }

                if (revenueData) {
                    // Ensure we're showing total revenue from B2B banner bookings only
                    setRevenueStats({
                        totalRevenue: revenueData.totalRevenue || 0,
                        percentageChange: revenueData.percentageChange || 0
                    });
                } else {
                    // Fallback: Calculate from bookings if API doesn't return stats
                    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid' && b.bannerType === 'b2b');
                    const calculatedRevenue = paidBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
                    setRevenueStats({
                        totalRevenue: calculatedRevenue,
                        percentageChange: 0
                    });
                }
            } catch (error) {
                console.error('Error loading revenue stats:', error);
                // Fallback: Calculate from current bookings
                const paidBookings = bookings.filter(b => b.paymentStatus === 'paid' && b.bannerType === 'b2b');
                const calculatedRevenue = paidBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
                setRevenueStats({
                    totalRevenue: calculatedRevenue,
                    percentageChange: 0
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error(error?.response?.data?.message || 'Failed to load banner data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSlotFull = async (slotId) => {
        const basePrice = parseFloat(slotForm.price);
        if (isNaN(basePrice) || basePrice < 0) {
            toast.error("Invalid base daily price");
            return;
        }

        try {
            await updateBannerSlot(slotId, {
                price: basePrice
            });

            // Update local state
            setSlots(slots.map(s => s._id === slotId ? {
                ...s,
                price: basePrice
            } : s));

            setEditingSlotId(null);
            toast.success("Slot settings saved successfully");
        } catch (error) {
            console.error('Error updating slot:', error);
            toast.error(error?.response?.data?.message || 'Failed to update slot settings');
        }
    };

    const handleApproveBanner = async (bookingId) => {
        try {
            await approveBannerBooking(bookingId);

            // Update local state
            setBookings(bookings.map(b => b._id === bookingId ? {
                ...b,
                adminApprovalStatus: 'approved',
                status: 'active'
            } : b));

            // Reload slots to reflect current booking changes
            const slotsRes = await getAdminBannerSlots({ params: { bannerType: 'b2b' } });
            if (slotsRes?.data?.success) {
                const slotsData = slotsRes.data.data;
                setSlots(slotsData.slots || slotsData || []);
            }

            toast.success("Banner approved and is now live!");
        } catch (error) {
            console.error('Error approving banner:', error);
            toast.error(error?.response?.data?.message || 'Failed to approve banner');
        }
    };

    const handleRejectBanner = async (bookingId, reason = '') => {
        try {
            await rejectBannerBooking(bookingId, reason);

            // Update local state
            setBookings(bookings.map(b => b._id === bookingId ? {
                ...b,
                adminApprovalStatus: 'rejected',
                status: 'cancelled',
                rejectionReason: reason
            } : b));

            // Reload slots to reflect current booking changes
            const slotsRes = await getAdminBannerSlots({ params: { bannerType: 'b2b' } });
            if (slotsRes?.data?.success) {
                const slotsData = slotsRes.data.data;
                setSlots(slotsData.slots || slotsData || []);
            }

            toast.success("Banner rejected successfully");
        } catch (error) {
            console.error('Error rejecting banner:', error);
            toast.error(error?.response?.data?.message || 'Failed to reject banner');
        }
    };

    const handleUpdateSettings = async () => {
        const payload = {
            universalDisplayTime: parseInt(settingsForm.universalDisplayTime) || 3000,
            bookingWindowDays: parseInt(settingsForm.bookingWindowDays) || 30,
            minDurationHours: parseInt(settingsForm.minDurationHours) || 24,
            maxDurationHours: parseInt(settingsForm.maxDurationHours) || 720,
            defaultPricePerDay: parseFloat(settingsForm.defaultPricePerDay) || 2999
        };

        if (payload.universalDisplayTime < 500) {
            toast.error("Display time must be at least 500ms");
            return;
        }
        if (payload.bookingWindowDays < 1 || payload.bookingWindowDays > 365) {
            toast.error("Booking window must be between 1 and 365 days");
            return;
        }
        if (payload.minDurationHours < 1) {
            toast.error("Minimum duration must be at least 1 hour");
            return;
        }
        if (payload.maxDurationHours < payload.minDurationHours) {
            toast.error("Maximum duration must be greater than or equal to minimum duration");
            return;
        }
        if (payload.defaultPricePerDay < 0) {
            toast.error("Default price per day cannot be negative");
            return;
        }

        try {
            await updateBannerSettings(payload);
            setSettings(payload);
            setSettingsForm(payload);
            setShowSettingsPanel(false);
            toast.success("B2B Banner settings updated successfully");
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error(error?.response?.data?.message || 'Failed to update settings');
        }
    };


    const formatDuration = (hours) => {
        if (hours < 24) return `${hours}h`;
        if (hours < 168) return `${Math.round(hours / 24)}d`;
        if (hours < 720) return `${Math.round(hours / 168)}w`;
        return `${Math.round(hours / 720)}mo`;
    };

    const columns = [
        {
            header: "Reference ID",
            accessor: "referenceId",
            render: (val) => <span className="font-medium text-gray-900">{val}</span>,
        },
        {
            header: "B2B Vendor",
            accessor: "vendorId",
            render: (val) => (
                <div 
                    className="flex flex-col cursor-pointer group/vendor"
                    onClick={() => navigate(`/admin/b2b-vendors/manage/${val?._id || val}/dashboard`)}
                >
                    <span className="font-bold text-primary-600 group-hover/vendor:underline">{val?.storeName || val?.name || "N/A"}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{val?.email}</span>
                </div>
            ),
        },
        {
            header: "Banner",
            accessor: "bannerImage",
            render: (val) => (
                <div className="relative group/img">
                    <img src={val} alt="Banner" className="h-10 w-20 object-cover rounded border" />
                    <a
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded"
                    >
                        <FiEye className="text-white text-xs" />
                    </a>
                </div>
            ),
        },
        {
            header: "Slot",
            accessor: "slotId",
            render: (val) => `Slot ${val?.slotNumber || "N/A"}`,
        },
        {
            header: "Duration",
            accessor: "durationHours",
            render: (val) => <span className="text-sm text-gray-600">{formatDuration(val || 24)}</span>,
        },
        {
            header: "Amount",
            accessor: "amount",
            render: (val) => formatPrice(val),
        },
        {
            header: "Status",
            accessor: "status",
            render: (val) => (
                <Badge variant={val === "active" ? "success" : val === "pending" ? "warning" : "error"}>
                    {val.toUpperCase()}
                </Badge>
            ),
        },
        {
            header: "Payment",
            accessor: "paymentStatus",
            render: (val) => (
                <Badge variant={val === "paid" ? "success" : val === "refunded" ? "info" : "error"}>
                    {val.toUpperCase()}
                </Badge>
            ),
        },
        {
            header: "Approval",
            accessor: "adminApprovalStatus",
            render: (val) => (
                <Badge variant={val === "approved" ? "success" : val === "pending" ? "warning" : "error"}>
                    {val ? val.toUpperCase() : "PENDING"}
                </Badge>
            ),
        },
        {
            header: "Show Dates",
            accessor: "startDate",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        {new Date(val).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                        to {new Date(row.endDate).toLocaleDateString()}
                    </span>
                </div>
            ),
        },
        {
            header: "Booking Date",
            accessor: "createdAt",
            render: (val) => <span className="text-gray-500">{new Date(val).toLocaleDateString()}</span>,
        },
        {
            header: "Actions",
            accessor: "_id",
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/admin/b2b-vendors/manage/${row.vendorId?._id || row.vendorId}/dashboard`)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="View Vendor Information"
                    >
                        <FiEye className="text-lg" />
                    </button>
                    {row.paymentStatus === "paid" && row.adminApprovalStatus === "pending" && (
                        <>
                            <button
                                onClick={() => handleApproveBanner(row._id)}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                title="Approve Banner"
                                disabled={loading}
                            >
                                <FiCheckCircle className="text-lg" />
                            </button>
                            <button
                                onClick={() => setRejectModal({ show: true, bookingId: row._id, reason: '' })}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Reject Banner"
                                disabled={loading}
                            >
                                <FiXCircle className="text-lg" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="p-6" >
            <div className="flex justify-between items-start mb-8">
                <div></div>


                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FiClock className="text-xl" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Display Time</p>
                            <p className="text-lg font-bold text-gray-900">{settings.universalDisplayTime}ms</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/admin/b2b-vendors/wallet')}
                        className="flex items-center gap-4 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-all group border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md"
                    >
                        <div className="p-2.5 bg-gray-900 text-white rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <FiCreditCard className="text-xl" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">B2B Banner Revenue</p>
                            <p className="text-xl font-black text-gray-900 leading-none mt-1">
                                {loading ? (
                                    <span className="text-gray-400">Loading...</span>
                                ) : (
                                    formatPrice(revenueStats.totalRevenue || 0)
                                )}
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Banner Settings Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden" >
                <button
                    onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <FiSettings className="text-blue-600 text-xl" />
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">B2B Banner Settings & Pricing</h3>
                            <p className="text-sm text-gray-500">Configure booking window, duration limits, and pricing structure for B2B banners</p>
                        </div>
                    </div>
                    {showSettingsPanel ? (
                        <FiChevronUp className="text-gray-400" />
                    ) : (
                        <FiChevronDown className="text-gray-400" />
                    )}
                </button>

                <AnimatePresence>
                    {showSettingsPanel && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-6 border-t border-gray-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Universal Display Time */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Universal Display Time (ms)
                                        </label>
                                        <input
                                            type="number"
                                            min="500"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            value={settingsForm.universalDisplayTime}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, universalDisplayTime: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Minimum: 500ms</p>
                                    </div>

                                    {/* Booking Window */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Booking Window (days)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            value={settingsForm.bookingWindowDays}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, bookingWindowDays: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Range: 1-365 days</p>
                                    </div>

                                    {/* Min Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Minimum Duration (hours)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            value={settingsForm.minDurationHours}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, minDurationHours: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Minimum: 24 hours (1 day)</p>
                                    </div>

                                    {/* Max Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Maximum Duration (hours)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            value={settingsForm.maxDurationHours}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, maxDurationHours: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Maximum: 720 hours (30 days)</p>
                                    </div>

                                    {/* Default Price Per Day */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Price Per Day (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            value={settingsForm.defaultPricePerDay}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, defaultPricePerDay: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Used when no specific pricing entry exists for a duration</p>
                                    </div>
                                </div>
                                 {/* Pricing Structure section removed */}

                                {/* Save Button */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSettingsForm(settings);
                                            setShowSettingsPanel(false);
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUpdateSettings}
                                        disabled={loading}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <FiCheckCircle /> Save Settings
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                {slots.map((slot) => {
                    const booking = slot.currentBooking;
                    const isActive = booking && booking.status === 'active';
                    const isPending = booking && booking.status === 'pending';

                    return (
                        <div
                            key={slot._id}
                            className={`rounded-xl border-2 bg-white transition-all overflow-hidden ${editingSlotId === slot._id ? "border-blue-500 ring-2 ring-blue-100" :
                                isActive ? "border-green-200 shadow-md" :
                                    isPending ? "border-yellow-200 shadow-sm" : "border-gray-100"
                                }`}
                        >
                            {/* Banner Image Display */}
                            {booking?.bannerImage ? (
                                <div className="relative h-24 bg-gradient-to-br from-gray-100 to-gray-50 group">
                                    <img
                                        src={booking.bannerImage}
                                        alt={`Slot ${slot.slotNumber} Banner`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                        <FiEye className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg" />
                                    </div>
                                    {/* Vendor Name Overlay */}
                                    {(booking?.vendorId?.storeName || booking?.vendorId?.name) && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                            <p className="text-white text-[10px] font-medium truncate">
                                                {booking.vendorId.storeName || booking.vendorId.name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                    <div className="text-center">
                                        <FiImage className="text-gray-300 text-2xl mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-400">No Banner</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Slot {slot.slotNumber}</span>
                                    {isActive ? (
                                        <Badge variant="success">Active</Badge>
                                    ) : isPending ? (
                                        <Badge variant="warning">Pending</Badge>
                                    ) : (
                                        <Badge variant="default">Empty</Badge>
                                    )}
                                </div>

                                <div className="mb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-bold text-gray-900">{formatPrice(slot.price)} <span className="text-xs font-normal text-gray-400">/day</span></div>
                                        <button
                                            onClick={() => {
                                                if (editingSlotId === slot._id) {
                                                    setEditingSlotId(null);
                                                } else {
                                                    setEditingSlotId(slot._id);
                                                    setSlotForm({
                                                        price: slot.price
                                                    });
                                                }
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${editingSlotId === slot._id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title="Edit Slot Settings"
                                        >
                                            <FiSettings size={14} />
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {editingSlotId === slot._id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-dashed border-gray-200 pt-3"
                                        >
                                            <div className="space-y-3">
                                                {/* Base Price Input */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Daily Price (Base)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                                        placeholder="e.g 2999"
                                                        value={slotForm.price}
                                                        onChange={(e) => setSlotForm({ ...slotForm, price: e.target.value })}
                                                    />
                                                </div>


                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleUpdateSlotFull(slot._id)}
                                                    disabled={loading}
                                                    className="w-full py-1.5 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    <FiCheckCircle size={12} /> Save Slot
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">B2B Banner Bookings</h2>
                    <p className="text-sm text-gray-500">All banner booking requests from B2B vendors</p>
                </div>
                <DataTable
                    columns={columns}
                    data={bookings}
                    loading={loading}
                    pagination={true}
                />
            </div>
            {/* Rejection Reason Modal */}
            <AnimatePresence>
                {rejectModal.show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <FiXCircle className="text-red-600 text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Reject Banner Booking</h3>
                                    <p className="text-sm text-red-600">This action will reject and refund the booking</p>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter the reason for rejecting this banner booking..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none transition-all"
                                        value={rejectModal.reason}
                                        onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRejectModal({ show: false, bookingId: null, reason: '' })}
                                        className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleRejectBanner(rejectModal.bookingId, rejectModal.reason);
                                            setRejectModal({ show: false, bookingId: null, reason: '' });
                                        }}
                                        disabled={loading}
                                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                                    >
                                        <FiXCircle />
                                        Reject Booking
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default B2BBannerManagement;
