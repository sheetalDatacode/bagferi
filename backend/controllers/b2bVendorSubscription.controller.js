import b2bVendorSubscriptionService from '../services/b2bVendorSubscription.service.js';
import SubscriptionService from '../services/subscription.service.js';
import zohoBooksService from '../services/zohoBooks.service.js';

class AdminB2BVendorSubscriptionController {
  /**
   * Get all B2B vendor subscriptions
   * GET /admin/b2b-vendors/subscriptions
   */
  async getSubscriptions(req, res) {
    try {
      const { status, planId, expiringSoon, businessType } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (planId) filters.planId = planId;
      if (expiringSoon === 'true') filters.expiringSoon = true;
      if (businessType) filters.businessType = businessType;

      const result = await b2bVendorSubscriptionService.getAllB2BSubscriptions(filters);

      res.status(200).json({
        success: true,
        data: result.subscriptions,
        stats: result.stats,
        message: 'B2B vendor subscriptions fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch B2B vendor subscriptions',
      });
    }
  }

  /**
   * Get billing history for a specific vendor (Admin version)
   * GET /admin/b2b-vendors/subscriptions/vendor/:vendorId/billing
   */
  async getVendorBillingHistory(req, res) {
    try {
      const { vendorId } = req.params;
      const history = await SubscriptionService.getVendorBillingHistory(vendorId);

      res.status(200).json({
        success: true,
        data: history,
        message: 'Vendor billing history fetched successfully'
      });
    } catch (error) {
      console.error('Admin Get Vendor Billing History Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch vendor billing history'
      });
    }
  }

  /**
   * Download any vendor's invoice (Admin version)
   * GET /admin/b2b-vendors/subscriptions/invoice/:invoiceId
   */
  async downloadVendorInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const pdfBuffer = await zohoBooksService.downloadInvoicePdf(invoiceId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoiceId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Admin Download Vendor Invoice Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download invoice'
      });
    }
  }
}

export default new AdminB2BVendorSubscriptionController();
