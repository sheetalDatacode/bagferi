import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import VendorPayoutRequest from '../models/VendorPayoutRequest.model.js';
import Vendor from '../models/Vendor.model.js';
import Order from '../models/Order.model.js';

/**
 * @desc    Get all vendor payout requests
 * @route   GET /api/admin/wallet/payout-requests
 * @access  Private (Admin)
 */
export const getAdminPayoutRequests = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status) {
        filter.status = status;
    }

    const requests = await VendorPayoutRequest.find(filter)
        .populate('vendorId', 'name storeName email phone gstNumber')
        .sort({ createdAt: -1 });

    // Calculate aggregated stats for admin wallet view
    // 1. Total Online Advances Received (We can sum all completed orders * 99)
    // Wait, let's sum remaining balances or total advances
    const completedOrders = await Order.find({ status: 'Completed' }).select('advancePayment totalAmount').lean();
    
    // Each completed order has a 99 advance payment held in admin's account
    const totalAdvancesReceived = completedOrders.reduce((sum, order) => sum + (order.advancePayment || 99), 0);

    // 2. Pending Payouts (sum of all Pending payout requests)
    const pendingRequests = await VendorPayoutRequest.find({ status: 'Pending' }).select('amount').lean();
    const totalPendingPayouts = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

    // 3. Cleared Payouts (sum of all Approved payout requests)
    const clearedRequests = await VendorPayoutRequest.find({ status: 'Approved' }).select('amount').lean();
    const totalClearedPayouts = clearedRequests.reduce((sum, r) => sum + r.amount, 0);

    res.status(200).json({
        success: true,
        data: {
            requests,
            stats: {
                totalAdvancesReceived,
                totalPendingPayouts,
                totalClearedPayouts
            }
        }
    });
});

/**
 * @desc    Approve/Reject vendor payout request
 * @route   PUT /api/admin/wallet/payout-requests/:id
 * @access  Private (Admin)
 */
export const updatePayoutRequestStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, referenceNumber } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be Approved or Rejected'
        });
    }

    const request = await VendorPayoutRequest.findById(id);
    if (!request) {
        return res.status(404).json({
            success: false,
            message: 'Payout request not found'
        });
    }

    if (request.status !== 'Pending') {
        return res.status(400).json({
            success: false,
            message: 'Payout request has already been processed'
        });
    }

    request.status = status;
    if (status === 'Approved') {
        request.referenceNumber = referenceNumber || '';
        request.processedAt = new Date();
    }
    
    await request.save();

    res.status(200).json({
        success: true,
        message: `Payout request successfully ${status.toLowerCase()}`,
        data: request
    });
});
