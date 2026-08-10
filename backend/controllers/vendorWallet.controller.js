import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { sendPaymentSuccessEmail } from '../services/email.service.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import razorpayService from '../services/razorpay.service.js';
import zohoBooksService from '../services/zohoBooks.service.js';
import Vendor from '../models/Vendor.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';

import Order from '../models/Order.model.js';
import VendorPayoutRequest from '../models/VendorPayoutRequest.model.js';

/**
 * @desc    Get vendor wallet balance and transaction history
 * @route   GET /api/vendor/wallet
 * @access  Private (Vendor)
 */
export const getMyWallet = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId || req.user.id;
    const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
    const transactions = await vendorWalletService.getVendorTransactions(vendorId);

    // Fetch order history for revenue tracking
    const orders = await Order.find({ vendor: vendorId }).sort({ createdAt: -1 });
    
    let codRevenue = 0;
    let onlineRevenue = 0;
    let pendingRevenue = 0;

    orders.forEach(order => {
        // We consider the 'remainingBalance' as the vendor's actual revenue portion 
        // since the 200 advance goes to the Admin.
        const vendorShare = order.remainingBalance || 0;

        if (order.status === 'Completed') {
            if (order.paymentStatus === 'Advance Paid' || order.paymentMethod === 'COD') {
                codRevenue += vendorShare;
            } else if (order.paymentStatus === 'Paid' || order.paymentMethod === 'Online') {
                onlineRevenue += vendorShare;
            }
        } else if (order.status !== 'Cancelled') {
            // Pending, Accepted, Dispatched
            pendingRevenue += vendorShare;
        }
    });

    res.status(200).json({
        success: true,
        data: {
            balance: wallet.balance,
            pendingBalance: wallet.pendingBalance,
            transactions,
            revenue: {
                codRevenue,
                onlineRevenue,
                pendingRevenue
            },
            orderHistory: orders
        }
    });
});

/**
 * @desc    Initiate wallet recharge (Create Razorpay Order)
 * @route   POST /api/vendor/wallet/recharge/initiate
 * @access  Private (Vendor)
 */
export const initiateRecharge = asyncHandler(async (req, res) => {
    const { amount } = req.body; // Amount inclusive of GST
    const vendorId = req.user.vendorId || req.user.id;

    if (!amount || amount < 100) {
        return res.status(400).json({
            success: false,
            message: 'Minimum recharge amount is ₹100'
        });
    }

    const receipt = `recharge_${Date.now()}`;
    const order = await razorpayService.createOrder(amount, 'INR', receipt, {
        vendorId: vendorId.toString(),
        type: 'wallet_recharge'
    });

    res.status(200).json({
        success: true,
        data: {
            ...order,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        }
    });
});

/**
 * @desc    Verify wallet recharge and credit balance
 * @route   POST /api/vendor/wallet/recharge/verify
 * @access  Private (Vendor)
 */
export const verifyRecharge = asyncHandler(async (req, res) => {
    const { 
        razorpay_order_id, razorpayOrderId, 
        razorpay_payment_id, razorpayPaymentId, 
        razorpay_signature, razorpaySignature, 
        amount 
    } = req.body;

    const orderId = razorpay_order_id || razorpayOrderId;
    const paymentId = razorpay_payment_id || razorpayPaymentId;
    const signature = razorpay_signature || razorpaySignature;

    const vendorId = req.user.vendorId || req.user.id;

    // 1. Verify Signature
    const isValid = razorpayService.verifyPayment(orderId, paymentId, signature);
    if (!isValid) {
        return res.status(400).json({
            success: false,
            message: 'Payment verification failed'
        });
    }

    // 2. Calculate Base and GST
    // Total = Base * 1.18 => Base = Total / 1.18
    const totalAmount = Number(amount);
    const baseAmount = Math.round((totalAmount / 1.18) * 100) / 100;
    const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;

    // 3. Credit Wallet
    const wallet = await vendorWalletService.creditWallet(
        vendorId,
        baseAmount,
        `Wallet Recharge (Incl. GST: ₹${gstAmount})`,
        paymentId,
        'recharge'
    );

    // 4. Zoho Books Integration (Invoicing)
    try {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
            const zohoContactId = await zohoBooksService.ensureZohoContactForVendor(vendor);
            if (zohoContactId) {
                const invoice = await zohoBooksService.createSubscriptionInvoice({
                    contactId: zohoContactId,
                    planName: 'Wallet Recharge',
                    amount: totalAmount,
                    baseAmount: baseAmount,
                    gstAmount: gstAmount,
                    referenceNumber: paymentId,
                    vendorGstNumber: vendor.gstNumber,
                    notes: `Wallet recharge via Razorpay. Order ID: ${orderId}`
                });

                if (invoice?.id) {
                    await zohoBooksService.recordInvoicePayment({
                        contactId: zohoContactId,
                        invoiceId: invoice.id,
                        amount: totalAmount,
                        razorpayPaymentId: paymentId,
                        invoiceTotal: invoice.total
                    });
                    
                    // Mark as sent to trigger email
                    await zohoBooksService.markInvoiceAsSent(invoice.id, true);

                    // 5. Send Email via our system with PDF attachment
                    try {
                        const pdfBuffer = await zohoBooksService.downloadInvoicePdf(invoice.id);
                        const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
                        
                        const emailPayload = {
                            to: vendor.email,
                            amount: totalAmount,
                            planName: 'Wallet Recharge',
                            paymentFor: 'wallet_recharge',
                            paymentDate: new Date(),
                            transactionId: paymentId,
                            referenceId: invoice.number,
                            paymentMethod: 'razorpay',
                            vendor: {
                                name: vendor.businessName || vendor.storeName || vendor.name,
                                email: vendor.email,
                                phone: vendor.phone
                            },
                            invoicePdfBuffer: pdfBuffer,
                            invoiceFileName: `invoice-${invoice.number}.pdf`
                        };

                        // Send to Vendor
                        await sendPaymentSuccessEmail(emailPayload);
                        
                        // Send to Admin
                        if (adminEmail) {
                            await sendPaymentSuccessEmail({ ...emailPayload, to: adminEmail });
                        }
                        
                        console.log('[WalletRecharge] Success emails sent to vendor and admin');
                    } catch (emailError) {
                        console.error('[WalletRecharge] Failed to send success emails:', emailError.message);
                    }

                    // Update transaction with invoice info
                    await VendorWalletTransaction.findOneAndUpdate(
                        { referenceId: paymentId, referenceType: 'recharge' },
                        { 
                            zohoInvoiceId: invoice.id,
                            zohoInvoicePdfUrl: invoice.pdfUrl,
                            metadata: { totalAmount: totalAmount }
                        }
                    );
                }
            }
        }
    } catch (zohoError) {
        console.error('[WalletRecharge] Zoho integration failed:', zohoError.message);
        // We don't fail the request since the wallet is already credited
    }

    res.status(200).json({
        success: true,
        message: 'Wallet recharged successfully',
        data: {
            balance: wallet.balance
        }
    });
});

/**
 * @desc    Get vendor payout periods and request history
 * @route   GET /api/vendor/wallet/payout-summary
 * @access  Private (Vendor)
 */
export const getPayoutSummary = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId || req.user.id;
    
    // 1. Fetch all completed orders for this vendor
    const orders = await Order.find({ vendor: vendorId, status: 'Completed' }).sort({ updatedAt: -1 });

    // 2. Fetch all payout requests for this vendor
    const requests = await VendorPayoutRequest.find({ vendorId }).lean();

    // Create a lookup for payout requests
    const requestLookup = {};
    requests.forEach(r => {
        const key = `${r.month}_${r.period}`;
        requestLookup[key] = r;
    });

    // 3. Group orders by month and period
    const grouped = {};

    orders.forEach(order => {
        const date = new Date(order.updatedAt || order.createdAt);
        const month = date.toLocaleString('en-US', { month: 'long', year: 'numeric' }); // e.g. "August 2026"
        const day = date.getDate();
        let period = "";

        if (day >= 1 && day <= 7) period = "1-7";
        else if (day >= 8 && day <= 15) period = "8-15";
        else if (day >= 16 && day <= 23) period = "16-23";
        else period = "24-31";

        const key = `${month}_${period}`;

        if (!grouped[key]) {
            grouped[key] = {
                month,
                period,
                totalOrders: 0,
                codCollected: 0,
                advanceHeld: 0,
                platformFee: 0,
                pendingAmount: 0,
                clearedAmount: 0,
                claimableAmount: 0,
                lockedAmount: 0,
                payoutStatus: 'Not Requested',
                requestId: null,
                referenceNumber: ''
            };
        }

        const stats = grouped[key];
        stats.totalOrders += 1;

        // Cash/COD collected is remaining balance
        const codAmount = order.remainingBalance !== undefined ? order.remainingBalance : (order.totalAmount - (order.advancePayment || 0));
        stats.codCollected += codAmount;

        // Advance is flat 99 paid to admin
        const advance = order.advancePayment || 99;
        stats.advanceHeld += advance;

        // Fee: grocery 10, baki 20
        const fee = order.module === 'grocery' ? 10 : 20;
        stats.platformFee += fee;

        // 3-day completion rule: order must be completed at least 3 days ago to be claimable
        const netOrderOwed = advance - fee;
        const daysSinceCompletion = (Date.now() - new Date(order.updatedAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCompletion >= 3) {
            stats.claimableAmount += netOrderOwed;
        } else {
            stats.lockedAmount += netOrderOwed;
        }
    });

    // 4. Map request lookup to compute cleared vs pending amounts
    Object.keys(grouped).forEach(key => {
        const stats = grouped[key];
        const netOwed = stats.advanceHeld - stats.platformFee;
        
        const reqRecord = requestLookup[key];
        if (reqRecord) {
            stats.payoutStatus = reqRecord.status;
            stats.requestId = reqRecord._id;
            stats.referenceNumber = reqRecord.referenceNumber || '';
            
            if (reqRecord.status === 'Approved') {
                stats.clearedAmount = reqRecord.amount || netOwed;
                stats.pendingAmount = 0;
                stats.claimableAmount = 0;
            } else if (reqRecord.status === 'Pending') {
                stats.clearedAmount = 0;
                stats.pendingAmount = reqRecord.amount || netOwed;
                stats.claimableAmount = 0;
            } else {
                // Rejected
                stats.clearedAmount = 0;
                stats.pendingAmount = 0;
            }
        } else {
            stats.clearedAmount = 0;
            stats.pendingAmount = 0;
        }
    });

    // Format grouped into an array sorted by date descending
    const data = Object.values(grouped).sort((a, b) => {
        const dateA = new Date(`${a.month} 1`);
        const dateB = new Date(`${b.month} 1`);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateB - dateA;
        }
        // Period order
        const periods = { "1-7": 4, "8-15": 3, "16-23": 2, "24-31": 1 };
        return periods[a.period] - periods[b.period];
    });

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * @desc    Submit a payout request
 * @route   POST /api/vendor/wallet/payout-request
 * @access  Private (Vendor)
 */
export const requestPayout = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId || req.user.id;
    const { month, period, amount } = req.body;

    if (!month || !period || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Month, period, and amount are required'
        });
    }

    // Check if a request already exists for this period
    const existing = await VendorPayoutRequest.findOne({ vendorId, month, period });
    if (existing) {
        return res.status(400).json({
            success: false,
            message: `A payout request for ${month} (${period}) already exists with status ${existing.status}`
        });
    }

    const newRequest = await VendorPayoutRequest.create({
        vendorId,
        month,
        period,
        amount
    });

    res.status(201).json({
        success: true,
        message: 'Payout request submitted successfully',
        data: newRequest
    });
});
