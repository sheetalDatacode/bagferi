import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { sendPaymentSuccessEmail } from '../services/email.service.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import razorpayService from '../services/razorpay.service.js';
import zohoBooksService from '../services/zohoBooks.service.js';
import Vendor from '../models/Vendor.model.js';
import VendorWalletTransaction from '../models/VendorWalletTransaction.model.js';

/**
 * @desc    Get vendor wallet balance and transaction history
 * @route   GET /api/vendor/wallet
 * @access  Private (Vendor)
 */
export const getMyWallet = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId || req.user.id;
    const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
    const transactions = await vendorWalletService.getVendorTransactions(vendorId);

    res.status(200).json({
        success: true,
        data: {
            balance: wallet.balance,
            pendingBalance: wallet.pendingBalance,
            transactions
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
