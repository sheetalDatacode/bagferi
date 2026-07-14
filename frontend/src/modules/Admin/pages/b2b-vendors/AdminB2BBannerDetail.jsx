import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiCheckCircle,
    FiXCircle,
    FiCalendar,
    FiClock,
    FiUser,
    FiMail,
    FiPhone
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { formatPrice } from "../../../../shared/utils/helpers";
import Badge from "../../../../shared/components/Badge";
import { useScrollLock } from "../../../../shared/hooks/useScrollLock";
import {
    getAdminBannerBookingDetails,
    approveBannerBooking,
    rejectBannerBooking
} from "../../services/heroBannerService";

const AdminB2BBannerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approveModal, setApproveModal] = useState(false);
    const [rejectModal, setRejectModal] = useState({ show: false, reason: '' });
    const hasLoaded = useRef(false);

    // Lock scroll when confirmation modals are open
    useScrollLock(approveModal || rejectModal.show);

    useEffect(() => {
        if (!hasLoaded.current) {
            hasLoaded.current = true;
            loadBooking();
        }
    }, [id]);

    const loadBooking = async () => {
        setLoading(true);
        try {
            const response = await getAdminBannerBookingDetails(id);
            setBooking(response.data);
        } catch (error) {
            console.error("Error loading B2B booking details:", error);
            toast.error("Failed to load booking details");
            navigate("/admin/b2b-vendors/banner-bookings");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setApproveModal(false);
        setActionLoading(true);
        try {
            await approveBannerBooking(id);
            toast.success("B2B Banner approved successfully");
            loadBooking();
        } catch (error) {
            console.error("Error approving B2B banner:", error);
            toast.error(error.response?.data?.message || "Failed to approve banner");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (reason = '') => {
        setRejectModal({ show: false, reason: '' });
        setActionLoading(true);
        try {
            await rejectBannerBooking(id, reason);
            toast.success("B2B Banner rejected successfully");
            loadBooking();
        } catch (error) {
            console.error("Error rejecting B2B banner:", error);
            toast.error(error.response?.data?.message || "Failed to reject banner");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!booking) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button
                onClick={() => navigate("/admin/b2b-vendors/banner-bookings")}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <FiArrowLeft /> Back to B2B Banner Bookings
            </button>

            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant={booking.status === "active" ? "success" : booking.status === "pending" ? "warning" : "error"}>
                            {booking.status.toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-gray-500">Reference: {booking.referenceId}</p>
                </div>


                {booking.status === "pending" && booking.paymentStatus === "paid" && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setRejectModal({ show: true, reason: '' })}
                            disabled={actionLoading}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FiXCircle /> Reject
                        </button>
                        <button
                            onClick={() => setApproveModal(true)}
                            disabled={actionLoading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FiCheckCircle /> Approve
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Banner Preview */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Banner Preview</h3>
                        <div className="aspect-[4/1] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 mb-4 relative group">
                            <img
                                src={booking.bannerImage}
                                alt={booking.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <a
                                    href={booking.bannerImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                >
                                    View Full Size
                                </a>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Title</p>
                                <p className="font-medium text-gray-900">{booking.title || "No Title"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Booking Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <FiCalendar /> <span className="text-sm">Start Date</span>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {new Date(booking.startDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <FiClock /> <span className="text-sm">Duration</span>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {booking.durationHours} hours
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <IndianRupee size={14} /> <span className="text-sm">Amount Paid</span>
                                </div>
                                <p className="font-medium text-gray-900 text-lg">
                                    {formatPrice(booking.amount)}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm font-bold">Slot</span>
                                </div>
                                <Badge variant="info">Slot {booking.slotId?.slotNumber || "N/A"}</Badge>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm">Payment Status</span>
                                </div>
                                <Badge variant={booking.paymentStatus === "paid" ? "success" : "error"}>
                                    {booking.paymentStatus.toUpperCase()}
                                </Badge>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm">Created At</span>
                                </div>
                                <p className="text-sm text-gray-900">
                                    {new Date(booking.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Vendor Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Vendor Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiUser className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Business Name</p>
                                    <p className="font-medium text-gray-900">{booking.vendorId?.storeName || booking.vendorId?.name || "N/A"}</p>
                                    <p className="text-xs text-gray-500">{booking.vendorId?.storeName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiMail className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900 break-all">{booking.vendorId?.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiPhone className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium text-gray-900">{booking.vendorId?.phone || "N/A"}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/admin/b2b-vendors/manage/${booking.vendorId?._id || booking.vendorId}/dashboard`)}
                                className="w-full mt-2 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-600 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <FiUser /> View Vendor Information
                            </button>
                        </div>
                    </div>

                    {/* Transaction Info */}
                    {booking.paymentStatus === 'paid' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Payment Method</span>
                                    <span className="font-medium uppercase">{booking.paymentMethod || "Razorpay"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Payment ID</span>
                                    <span className="font-medium font-mono text-xs">{booking.razorpayPaymentId || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Order ID</span>
                                    <span className="font-medium font-mono text-xs">{booking.razorpayOrderId || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rejection Info */}
                    {booking.adminApprovalStatus === 'rejected' && (
                        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
                            <h3 className="text-lg font-bold text-red-900 mb-2">Rejection Reason</h3>
                            <p className="text-red-700">{booking.rejectionReason || "No reason provided"}</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Approve Confirmation Modal */}
            <AnimatePresence>
                {approveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-5 bg-green-50 border-b border-green-100 flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <FiCheckCircle className="text-green-600 text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Approve Banner Booking</h3>
                                    <p className="text-sm text-green-600">This banner will go live on the marketplace</p>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-gray-600 text-sm mb-5">
                                    Are you sure you want to approve this B2B banner? Once approved, the banner will be displayed on the marketplace during the booked time slot.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setApproveModal(false)}
                                        className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        disabled={actionLoading}
                                        className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                                    >
                                        <FiCheckCircle />
                                        Yes, Approve
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                        onClick={() => setRejectModal({ show: false, reason: '' })}
                                        className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleReject(rejectModal.reason)}
                                        disabled={actionLoading}
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

export default AdminB2BBannerDetail;
