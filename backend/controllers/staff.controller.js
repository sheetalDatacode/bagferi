import Order from '../models/Order.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * @desc    Get orders assigned to the logged-in staff member
 * @route   GET /api/staff/orders
 * @access  Private (Staff)
 */
export const getAssignedOrders = asyncHandler(async (req, res) => {
    // The staff's mobile number is in the token
    const staffMobile = req.user.mobile;
    const vendorId = req.user.vendorId; // The vendor this staff works for

    if (!staffMobile) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Staff mobile not found in token.' });
    }

    // Find orders where vendor matches, and assignedStaff.mobile matches
    // Only return Dispatched orders for delivery
    const orders = await Order.find({ 
        vendor: vendorId, 
        'assignedStaff.mobile': staffMobile,
        status: { $in: ['Dispatched', 'Completed'] } // Include completed so they can see history if needed
    })
    .populate('items.product', 'name images image')
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: orders
    });
});

/**
 * @desc    Verify Delivery OTP and complete the order
 * @route   POST /api/staff/orders/:orderId/verify-delivery
 * @access  Private (Staff)
 */
export const verifyDeliveryOtp = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { otp } = req.body;
    const staffMobile = req.user.mobile;

    if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const order = await Order.findOne({ 
        _id: orderId,
        'assignedStaff.mobile': staffMobile
    });

    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    if (order.status === 'Completed') {
        return res.status(400).json({ success: false, message: 'Order is already completed' });
    }

    if (order.status !== 'Dispatched') {
        return res.status(400).json({ success: false, message: 'Order is not dispatched yet' });
    }

    if (!order.deliveryOtp || order.deliveryOtp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP matches, mark order as Completed
    order.status = 'Completed';
    // Remove the OTP after successful delivery to prevent reuse or confusion
    order.deliveryOtp = null;
    await order.save();

    res.status(200).json({
        success: true,
        message: 'Order delivered successfully',
        data: order
    });
});

/**
 * @desc    Verify Exchange OTP and complete the exchange
 * @route   POST /api/staff/orders/:orderId/verify-exchange
 * @access  Private (Staff)
 */
export const verifyExchangeOtpByStaff = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { otp } = req.body;
    const staffMobile = req.user.mobile;

    if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const order = await Order.findOne({ 
        _id: orderId,
        'assignedStaff.mobile': staffMobile
    });

    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    if (!order.exchangeRequest || order.exchangeRequest.status !== 'Accepted') {
        return res.status(400).json({ success: false, message: 'Exchange request is not accepted or already verified' });
    }

    if (order.exchangeRequest.otp !== otp.toString()) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    order.exchangeRequest.status = 'Completed';
    order.exchangeRequest.otp = null; // Clear OTP
    order.exchangeRequest.completedAt = new Date();
    await order.save();

    res.status(200).json({
        success: true,
        message: 'Exchange completed successfully',
        data: order
    });
});
