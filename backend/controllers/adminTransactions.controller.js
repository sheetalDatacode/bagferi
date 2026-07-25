import { asyncHandler } from '../middleware/errorHandler.middleware.js';

import BannerBooking from '../models/BannerBooking.model.js';
import Vendor from '../models/Vendor.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';

/**
 * GET /api/admin/transactions
 * Full payment history with type filtering and revenue summary.
 * Query params:
 *   type = 'all' | 'subscription' | 'banner' | 'addon'
 *   page = 1 (default)
 *   limit = 20 (default)
 */
export const getAllTransactions = asyncHandler(async (req, res) => {
  const { type = 'all', page = 1, limit = 30, businessType } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // ── Build Filter based on businessType ─────────────────────
  let vendorMatch = {};
  let vendorIds = [];
  if (businessType && businessType !== 'All Business Types') {
    const matchingVendors = await Vendor.find({ businessType }).select('_id').lean();
    vendorIds = matchingVendors.map(v => v._id);
    vendorMatch = { vendorId: { $in: vendorIds } };
  }

  // ── Revenue Totals ─────────────────────────────────────────
  const [bannerRev, walletRev] = await Promise.all([
    BannerBooking.aggregate([
      { $match: { 
        paymentStatus: 'paid',
        ...(vendorIds.length > 0 || businessType && businessType !== 'All Business Types' ? vendorMatch : {})
      } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    VendorWalletTransaction.aggregate([
      { $match: { 
        referenceType: 'recharge',
        type: 'credit',
        ...(vendorIds.length > 0 || businessType && businessType !== 'All Business Types' ? vendorMatch : {})
      } },
      { $group: { 
        _id: null, 
        total: { $sum: { $ifNull: ["$metadata.totalAmount", { $multiply: ["$amount", 1.18] }] } }, 
        count: { $sum: 1 } 
      } }
    ])
  ]);

  const revenueSummary = {
    subscription: { total: 0, count: 0 },
    banner:       { total: bannerRev[0]?.total || 0, count: bannerRev[0]?.count || 0 },
    addon:        { total: 0, count: 0 },
    wallet:       { total: walletRev[0]?.total || 0, count: walletRev[0]?.count || 0 },
    grand:        (bannerRev[0]?.total || 0) + (walletRev[0]?.total || 0)
  };

  // ── Fetch records by type ──────────────────────────────────
  let transactions = [];

  const fetchSubs = async () => {
    return [];
  };

  const fetchBanners = async () => {
    const query = { paymentStatus: 'paid' };
    if (vendorIds.length > 0 || businessType && businessType !== 'All Business Types') {
      query.vendorId = { $in: vendorIds };
    }
    const docs = await BannerBooking.find(query)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'name storeName email phone gstNumber')
      .lean();

    return docs.map(b => ({
      _id: b._id,
      amount: b.amount,
      baseAmount: b.baseAmount || b.amount,
      gstAmount: b.gstAmount || 0,
      type: 'banner',
      label: b.title || `Banner (${b.bannerType?.toUpperCase()})`,
      bannerType: b.bannerType,
      method: b.paymentMethod || 'Razorpay',
      date: b.createdAt,
      status: 'completed',
      vendorName: b.vendorId?.storeName || b.vendorId?.name || 'Vendor',
      vendorEmail: b.vendorId?.email,
      vendorPhone: b.vendorId?.phone,
      vendorGst: b.vendorId?.gstNumber,
      razorpayOrderId: b.razorpayOrderId,
      razorpayPaymentId: b.razorpayPaymentId,
      zohoInvoiceId: b.zohoInvoiceId,
      slotStart: b.startDate,
      slotEnd: b.endDate
    }));
  };

  const fetchAddons = async () => {
    return [];
  };

  const fetchRecharges = async () => {
    const query = { referenceType: 'recharge', type: 'credit' };
    if (vendorIds.length > 0 || businessType && businessType !== 'All Business Types') {
      query.vendorId = { $in: vendorIds };
    }
    const docs = await VendorWalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'name storeName email phone gstNumber')
      .lean();

    return docs.map(r => ({
      _id: r._id,
      amount: r.metadata?.totalAmount || Math.round(r.amount * 1.18 * 100) / 100,
      baseAmount: r.amount,
      gstAmount: (r.metadata?.totalAmount || r.amount * 1.18) - r.amount,
      type: 'recharge',
      label: 'Wallet Recharge',
      method: 'Razorpay',
      date: r.createdAt,
      status: 'completed',
      vendorName: r.vendorId?.storeName || r.vendorId?.name || 'Vendor',
      vendorEmail: r.vendorId?.email,
      vendorPhone: r.vendorId?.phone,
      vendorGst: r.vendorId?.gstNumber,
      razorpayPaymentId: r.referenceId,
      zohoInvoiceId: r.zohoInvoiceId
    }));
  };

  if (type === 'subscription') {
    transactions = await fetchSubs();
  } else if (type === 'banner') {
    transactions = await fetchBanners();
  } else if (type === 'addon') {
    transactions = await fetchAddons();
  } else if (type === 'recharge') {
    transactions = await fetchRecharges();
  } else {
    const [subs, banners, addons, recharges] = await Promise.all([
      fetchSubs(), 
      fetchBanners(), 
      fetchAddons(),
      fetchRecharges()
    ]);
    transactions = [...subs, ...banners, ...addons, ...recharges].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const total = transactions.length;
  const paginated = transactions.slice(skip, skip + Number(limit));

  res.status(200).json({
    success: true,
    data: {
      transactions: paginated,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      revenueSummary
    }
  });
});
