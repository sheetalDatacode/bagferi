import CancellationRequest from '../models/CancellationRequest.model.js';
import Order from '../models/Order.model.js';

/**
 * GET /api/admin/cancellations
 * List all cancellation requests for the admin panel
 */
export const getCancellationRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const requests = await CancellationRequest.find(query)
      .populate('orderId')
      .populate({
        path: 'userId',
        select: 'name email phone',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/cancellations/:id/process
 * Admin processes the refund request (marks manual transfer as completed)
 */
export const processCancellationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['processing', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Choose processing or completed' });
    }

    const request = await CancellationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cancellation request not found' });
    }

    request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    request.processedBy = req.user._id || req.user.id;
    request.processedAt = new Date();
    await request.save();

    // Also update the main Order's refundStatus
    if (status === 'completed') {
      const order = await Order.findById(request.orderId);
      if (order) {
        order.refundStatus = 'completed';
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Cancellation refund request marked as ${status}.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};
