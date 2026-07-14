import BannerSlot from '../models/BannerSlot.model.js';
import BannerBooking from '../models/BannerBooking.model.js';
import Vendor from '../models/Vendor.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import notificationService from '../services/notification.service.js';
import vendorWalletService from '../services/vendorWallet.service.js';
import platformLedgerService from '../services/platformLedger.service.js';
import zohoBooksService from '../services/zohoBooks.service.js';
import { sendPaymentSuccessEmail, sendPaymentCancelledEmail } from '../services/email.service.js';
import { calculateGstAmount, getTotalWithGst } from '../utils/tax.util.js';


// ==========================================
// VENDOR CONTROLLERS
// ==========================================

export const getAvailableSlots = asyncHandler(async (req, res) => {
    const { bannerType = 'hero' } = req.query;
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    // Get vendor wallet balance if authenticated
    let walletBalance = 0;
    if (vendorId && req.user?.role === 'vendor') {
        const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
        walletBalance = wallet.balance;
    }

    // Auto-create B2B slots if they don't exist
    if (bannerType === 'b2b') {
        const count = await BannerSlot.countDocuments({ bannerType: 'b2b' });
        if (count === 0) {
            const defaultSlots = Array.from({ length: 5 }, (_, i) => ({
                slotNumber: i + 1,
                bannerType: 'b2b',
                price: 2999 - (i * 200),
                isActive: true
            }));
            await BannerSlot.insertMany(defaultSlots);
        }
    }

    const slots = await BannerSlot.find({ bannerType, isActive: true }).lean().sort({ slotNumber: 1 });
    const now = new Date();

    // Dynamically find relevant bookings for each slot
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Add 5.5 hours buffer for IST
        const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

        // Find all bookings that are not cancelled or completed
        const allBookings = await BannerBooking.find({
            slotId: slot._id,
            status: { $in: ['active', 'approved', 'pending'] },
            endDate: { $gte: now }
        }).sort({ startDate: 1 });

        // Identify current booking (if any)
        const currentBooking = allBookings.find(b =>
            b.startDate <= nowWithISTBuffer && b.endDate >= now
        );

        return {
            ...slot,
            currentBooking: currentBooking || null,
            upcomingBookings: allBookings.filter(b => b._id !== currentBooking?._id)
        };
    }));

    // Return with settings structure
    const settings = {
        universalDisplayTime: 3000,
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999,
        pricingStructure: {}
    };

    res.status(200).json({
        success: true,
        data: {
            slots: slotsWithBookings,
            settings,
            walletBalance
        }
    });
});

export const createBannerBooking = asyncHandler(async (req, res) => {
    const { slotId, startDate, durationDays, bannerType = 'b2b', title, link, paymentMethod = 'razorpay' } = req.body;

    // Log authentication info
    console.log('🔐 [createBannerBooking] User object:', JSON.stringify(req.user, null, 2));
    console.log('🔐 [createBannerBooking] User role:', req.user?.role);

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    if (!vendorId) {
        console.error('❌ [createBannerBooking] No vendorId found in req.user');
        return res.status(401).json({ success: false, message: 'Vendor authentication failed. Please login again.' });
    }

    console.log('✅ [createBannerBooking] VendorId:', vendorId);

    console.log('📝 [createBannerBooking] Request body:', req.body);
    console.log('📁 [createBannerBooking] File:', req.file ? { fieldname: req.file.fieldname, mimetype: req.file.mimetype, size: req.file.size } : 'No file');

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    if (!slotId || !startDate || !durationDays) {
        return res.status(400).json({ success: false, message: 'Missing required fields: slotId, startDate, durationDays' });
    }

    // Calculate end date from start date + duration days
    // For 1 day: Start Feb 8 00:00 -> End Feb 8 23:59:59 (same day)
    // For 2 days: Start Feb 8 00:00 -> End Feb 9 23:59:59
    // Normalize start date to 00:00 IST (India Standard Time)
    // MongoDB stores in UTC. 00:00 IST = 18:30 UTC (previous day)
    // If startDate is "2026-02-08", new Date(startDate) is 2026-02-08T00:00:00.000Z
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);


    const durationInDays = parseInt(durationDays);
    const end = new Date(start);
    // Add duration in days (e.g., 1 day = ends 24 hours later)
    end.setUTCHours(end.getUTCHours() + (durationInDays * 24));
    // Set to 23:59:59.999 IST (which is 1ms before next IST day starts)
    end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);

    // Get slot to calculate amount
    const slot = await BannerSlot.findById(slotId);
    if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    // Check for overlapping bookings
    // A booking overlaps if (newStart <= existingEnd) AND (newEnd >= existingStart)
    const overlappingBooking = await BannerBooking.findOne({
        slotId,
        status: { $in: ['active', 'approved', 'pending'] },
        $or: [
            {
                startDate: { $lte: end },
                endDate: { $gte: start }
            }
        ]
    });

    if (overlappingBooking) {
        return res.status(400).json({
            success: false,
            message: `This slot is already booked from ${new Date(overlappingBooking.startDate).toLocaleDateString()} to ${new Date(overlappingBooking.endDate).toLocaleDateString()}`
        });
    }

    const baseAmount = slot.price * durationInDays;
    const gstAmount = paymentMethod === 'wallet' ? 0 : calculateGstAmount(baseAmount);
    const amount = baseAmount + gstAmount;
    const durationHours = durationInDays * 24;

    // Handle Wallet Payment
    let walletDebitRef = null;
    if (paymentMethod === 'wallet') {
        const wallet = await vendorWalletService.getOrCreateWallet(vendorId);
        if (wallet.balance < amount) {
            return res.status(400).json({ success: false, message: `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${wallet.balance}` });
        }

        // Debit the wallet
        walletDebitRef = `BB-${Date.now().toString(36).toUpperCase()}`;
        await vendorWalletService.debitWallet(
            vendorId,
            amount,
            `B2B Banner Booking - Slot ${slot.slotNumber}`,
            walletDebitRef,
            'banner_booking'
        );
    }

    // Upload image using buffer
    console.log('☁️ [createBannerBooking] Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'banners');
    console.log('✅ [createBannerBooking] Upload successful:', uploadResult.secure_url);

    const booking = await BannerBooking.create({
        vendorId,
        slotId,
        bannerType,
        bannerImage: uploadResult.secure_url,
        title: title || '',
        link: link || '/',

        startDate: start,
        endDate: end,
        baseAmount,
        gstAmount,
        amount,
        durationHours,
        durationDays: durationInDays,
        referenceId: `B2B-${Date.now().toString(36).toUpperCase()}`,
        status: 'pending',
        paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'unpaid',
        paymentMethod: paymentMethod,
        adminApprovalStatus: 'pending'
    });

    console.log('✅ [createBannerBooking] Booking created:', booking._id);

    // Record platform ledger entry for wallet payment
    if (paymentMethod === 'wallet') {
        try {
            await platformLedgerService.recordPaymentReceived({
                bookingId: booking._id,
                vendorId,
                amount,
                paymentMethod: 'wallet',
                referenceId: walletDebitRef,
                description: `Wallet payment for B2B Banner Booking - Slot ${slot.slotNumber} - ${booking.referenceId}`,
            });
            console.log('✅ [createBannerBooking] Platform ledger entry created for wallet payment');
        } catch (ledgerError) {
            console.error('⚠️ [createBannerBooking] Platform ledger entry failed (non-blocking):', ledgerError.message);
        }

        // Zoho Books + email integration (best-effort, non-blocking)
        try {
            console.log('[BannerPay][Zoho] Starting Zoho + email flow for wallet booking', booking._id.toString());
            const vendorDoc = await Vendor.findById(vendorId);
            const amount = booking.amount;
            const vendorInfo = {
                name: vendorDoc.businessName || vendorDoc.storeName || vendorDoc.name || 'Vendor',
                email: vendorDoc.email,
                phone: vendorDoc.phone,
            };

            // 1. Send payment success emails immediately (No Zoho invoice for wallet payments as requested)
            const paymentDate = new Date();
            const vendorEmail = vendorDoc.email;
            const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

            const emailData = {
                amount,
                planName: booking.title || 'Banner Booking',
                title: booking.title || 'Banner Booking',
                paymentFor: 'banner_booking',
                paymentDate,
                transactionId: walletDebitRef,
                referenceId: booking.referenceId || booking._id.toString(),
                paymentMethod: 'wallet',
                vendor: vendorInfo,
            };

            if (vendorEmail) {
                await sendPaymentSuccessEmail({ ...emailData, to: vendorEmail });
            }
            if (adminEmail) {
                await sendPaymentSuccessEmail({ ...emailData, to: adminEmail });
            }

            booking.emailNotification = {
                ...(booking.emailNotification || {}),
                successSent: true,
                lastSentAt: new Date(),
            };
            await booking.save();
            
        } catch (accountingErr) {
            console.error('Email notification failed for wallet banner booking:', accountingErr);
            await BannerBooking.findByIdAndUpdate(booking._id, {
                $push: {
                    accountingErrors: {
                        at: 'banner_email_wallet',
                        message: accountingErr.message,
                    },
                },
            });
        }
    }

    // Create Razorpay order only if not paid by wallet
    let razorpayOrder = null;
    if (paymentMethod !== 'wallet') {
        try {
            const razorpayService = (await import('../services/razorpay.service.js')).default;
            razorpayOrder = await razorpayService.createOrder(
                amount,
                'INR',
                booking.referenceId,
                {
                    bookingId: booking._id.toString(),
                    vendorId: vendorId.toString(),
                    bannerType: 'b2b',
                    type: 'banner_booking',
                    baseAmount: booking.baseAmount,
                    gstAmount: booking.gstAmount,
                    amount: booking.amount
                }
            );

            // Save Razorpay order ID to booking
            booking.razorpayOrderId = razorpayOrder.id;
            await booking.save();

            console.log('✅ [createBannerBooking] Razorpay order created:', razorpayOrder.id);
        } catch (razorpayError) {
            console.error('❌ [createBannerBooking] Razorpay order creation failed:', razorpayError.message);
            // Continue without Razorpay order - booking is still created (will be unpaid)
        }
    } else {
        // If wallet paid, notify admins immediately as payment is confirmed
        try {
            const vendor = await Vendor.findById(vendorId).select('businessName storeName');
            await notificationService.sendBulkNotification({
                type: 'banner_booking',
                amount: booking.amount,
                baseAmount: booking.baseAmount,
                gstAmount: booking.gstAmount,
                title: 'Vendor Banner Booking (Wallet Paid)',
                message: `Vendor has booked a banner using wallet funds.`,
                actionUrl: `/admin/b2b-vendors/banner-bookings`,
                metadata: {
                    bookingId: booking._id.toString(),
                    vendorId: vendorId.toString(),
                    vendorName: vendor?.businessName || vendor?.storeName || 'A vendor',
                    bannerType: booking.bannerType,
                    amount: booking.amount,
                    paymentMethod: 'wallet'
                }
            }, 'admins');
        } catch (notifError) {
            console.error('Failed to notify admins about wallet banner booking:', notifError);
        }
    }

    res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
            ...booking.toObject(),
            razorpayOrder: razorpayOrder,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        }
    });
});

export const getMyBookings = asyncHandler(async (req, res) => {
    const { bannerType } = req.query;

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;
    const query = { vendorId };
    if (bannerType) query.bannerType = bannerType;

    console.log('🔍 [getMyBookings] User:', vendorId, 'Role:', req.user.role);
    console.log('🔍 [getMyBookings] Query:', JSON.stringify(query));

    const bookings = await BannerBooking.find(query)
        .populate('slotId')
        .sort({ createdAt: -1 });

    console.log('🔍 [getMyBookings] Found:', bookings.length);

    res.status(200).json({
        success: true,
        data: bookings
    });
});

export const getBookingDetails = asyncHandler(async (req, res) => {
    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    const booking = await BannerBooking.findOne({
        _id: req.params.id,
        vendorId
    }).populate('slotId');

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
        success: true,
        data: booking
    });
});

export const confirmPayment = asyncHandler(async (req, res) => {
    const { bookingId, razorpayPaymentId, razorpayOrderId, paymentMethod, razorpaySignature } = req.body;

    console.log('💳 [confirmPayment] Request:', { bookingId, razorpayPaymentId, razorpayOrderId, paymentMethod });

    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    if (!vendorId) {
        console.error('❌ [confirmPayment] No vendorId found in req.user');
        return res.status(401).json({ success: false, message: 'Vendor authentication failed' });
    }

    const booking = await BannerBooking.findOne({ _id: bookingId, vendorId }).populate('vendorId', 'storeName businessName email phone zohoContactId');
    if (!booking) {
        console.error('❌ [confirmPayment] Booking not found:', { bookingId, vendorId });
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify Razorpay signature if provided
    if (razorpaySignature && razorpayOrderId && razorpayPaymentId) {
        try {
            const razorpayService = (await import('../services/razorpay.service.js')).default;
            const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

            if (!isValid) {
                console.error('❌ [confirmPayment] Invalid payment signature');
                return res.status(400).json({ success: false, message: 'Invalid payment signature' });
            }
            console.log('✅ [confirmPayment] Payment signature verified');
        } catch (error) {
            console.error('❌ [confirmPayment] Signature verification error:', error);
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    }

    booking.paymentStatus = 'paid';
    booking.status = 'pending'; // Keep as pending until admin approves
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpayOrderId = razorpayOrderId;
    booking.paymentMethod = paymentMethod || 'razorpay';

    await booking.save();

    // Record platform ledger entry for Razorpay payment
    try {
        await platformLedgerService.recordPaymentReceived({
            bookingId: booking._id,
            vendorId,
            amount: booking.amount,
            paymentMethod: paymentMethod || 'razorpay',
            referenceId: razorpayPaymentId,
            description: `Razorpay payment for B2B Banner Booking - ${booking.referenceId}`,
        });
        console.log('✅ [confirmPayment] Platform ledger entry created');
    } catch (ledgerError) {
        console.error('⚠️ [confirmPayment] Platform ledger entry failed (non-blocking):', ledgerError.message);
    }

    // Zoho Books + email integration (best-effort, non-blocking)
    try {
        console.log('[BannerPay][Zoho] Starting Zoho + email flow for booking', booking._id.toString());
        const vendorDoc = booking.vendorId; // populated above
        const amount = booking.amount;

        // 1. Ensure Zoho contact
        const contactId = await zohoBooksService.ensureZohoContactForVendor(vendorDoc);
        console.log('[BannerPay][Zoho] Contact OK', { contactId });

        // Persist contact on Vendor and Booking
        await Vendor.findByIdAndUpdate(vendorDoc._id, { zohoContactId: contactId });
        booking.zohoContactId = contactId;

        // 2. Create invoice (check if already exists)
        let invoice = null;
        let invoicePdfBuffer = null;
        let existingInvoiceId = booking.zohoInvoiceId;

        if (contactId) {
            try {
                if (!existingInvoiceId) {
                    const invoiceRef = booking.referenceId || `BANNER-${booking._id.toString()}`;
                    const vendorInfo = {
                        name: vendorDoc.businessName || vendorDoc.storeName || vendorDoc.name || 'Vendor',
                        email: vendorDoc.email,
                        phone: vendorDoc.phone,
                    };
                    const invoiceNotes = [
                        'Payment For: Banner Booking',
                        `Title/Plan: ${booking.title || 'Banner Booking'}`,
                        `Amount: ${amount} INR`,
                        `Transaction ID: ${razorpayPaymentId || 'N/A'}`,
                        `Reference ID: ${booking.referenceId || booking._id.toString()}`,
                        `Vendor: ${vendorInfo.name}`,
                        `Email: ${vendorInfo.email || 'N/A'}`,
                        `Phone: ${vendorInfo.phone || 'N/A'}`,
                    ].join('\n');

                    invoice = await zohoBooksService.createSubscriptionInvoice({
                        contactId,
                        planName: booking.title || 'Banner Booking',
                        amount,
                        currency: 'INR',
                        referenceNumber: invoiceRef,
                        notes: invoiceNotes,
                        vendorGstNumber: vendorDoc.gstNumber,
                        baseAmount: booking.baseAmount,
                        gstAmount: booking.gstAmount
                    });

                    if (invoice?.id) {
                        existingInvoiceId = invoice.id;
                        await zohoBooksService.markInvoiceAsSent(invoice.id, true);

                        // 3. Record payment
                        await zohoBooksService.recordInvoicePayment({
                            contactId,
                            invoiceId: invoice.id,
                            amount,
                            paymentDate: new Date(),
                            razorpayPaymentId,
                            paymentMode: booking.paymentMethod || 'razorpay',
                            invoiceTotal: invoice.total // Use Zoho's official total to avoid rounding mismatches
                        });
                    }
                }

                // Download PDF if we have an ID
                if (existingInvoiceId) {
                    invoicePdfBuffer = await zohoBooksService.downloadInvoicePdf(existingInvoiceId);
                }

                // 5. Send payment success emails (vendor + admin)
                const paymentDate = new Date();
                const vendorEmail = vendorDoc.email;
                const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
                const vendorInfo = {
                    name: vendorDoc.businessName || vendorDoc.storeName || vendorDoc.name || 'Vendor',
                    email: vendorDoc.email,
                    phone: vendorDoc.phone,
                };

                if (vendorEmail && !booking.emailNotification?.successSent) {
                    console.log('[BannerPay][Email] Sending success email to vendor', vendorEmail);
                    await sendPaymentSuccessEmail({
                        to: vendorEmail,
                        amount,
                        planName: booking.title || 'Banner Booking',
                        title: booking.title || 'Banner Booking',
                        paymentFor: 'banner_booking',
                        paymentDate,
                        transactionId: razorpayPaymentId,
                        referenceId: booking.referenceId || booking._id.toString(),
                        paymentMethod: booking.paymentMethod || 'razorpay',
                        vendor: vendorInfo,
                        invoicePdfBuffer,
                        invoiceFileName: `banner-${existingInvoiceId || booking.referenceId}.pdf`,
                    });
                }
                if (adminEmail && !booking.emailNotification?.successSent) {
                    console.log('[BannerPay][Email] Sending success email to admin', adminEmail);
                    await sendPaymentSuccessEmail({
                        to: adminEmail,
                        amount,
                        planName: booking.title || 'Banner Booking',
                        title: booking.title || 'Banner Booking',
                        paymentFor: 'banner_booking',
                        paymentDate,
                        transactionId: razorpayPaymentId,
                        referenceId: booking.referenceId || booking._id.toString(),
                        paymentMethod: booking.paymentMethod || 'razorpay',
                        vendor: vendorInfo,
                        invoicePdfBuffer,
                        invoiceFileName: `banner-${existingInvoiceId || booking.referenceId}.pdf`,
                    });
                }

                booking.zohoContactId = contactId;
                if (invoice) {
                    booking.zohoInvoiceId = invoice.id;
                    booking.zohoInvoiceStatus = invoice.status;
                    booking.zohoInvoicePdfUrl = invoice.pdfUrl;
                }

                booking.emailNotification = {
                    ...(booking.emailNotification || {}),
                    successSent: true,
                    lastSentAt: new Date(),
                };
                await booking.save();
            } catch (accountingErr) {
                console.error('Zoho/email integration failed for banner booking:', accountingErr);
                await BannerBooking.findByIdAndUpdate(booking._id, {
                    $push: {
                        accountingErrors: {
                            at: 'banner_zoho_or_email',
                            message: accountingErr.message,
                        },
                    },
                });
            }
        }
        // Notify admins about banner booking
        try {
            const vendor = await Vendor.findById(vendorId).select('businessName storeName');
            await notificationService.sendBulkNotification({
                type: 'banner_booking',
                baseAmount: booking.baseAmount,
                gstAmount: booking.gstAmount,
                amount: booking.amount,
                title: 'Vendor Banner Booking',
                message: 'Vendor has booked a banner.',
                actionUrl: `/admin/b2b-vendors/banner-bookings`,
                metadata: {
                    bookingId: booking._id.toString(),
                    vendorId: vendorId.toString(),
                    vendorName: vendor?.businessName || vendor?.storeName || 'A vendor',
                    bannerType: booking.bannerType,
                    amount: booking.amount
                }
            }, 'admins');
        } catch (notifError) {
            console.error('Failed to notify admins about banner booking:', notifError);
        }

        console.log('✅ [confirmPayment] Payment confirmed for booking:', booking._id);

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully. Awaiting admin approval.',
            data: booking
        });
    } catch (integrationErr) {
        console.error('[BannerPay][Critical] Zoho/Email integration helper failed:', integrationErr.message);
    }
});

export const cancelBooking = asyncHandler(async (req, res) => {
    // Handle different vendorId structures - JWT token has vendorId property
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.id;

    const booking = await BannerBooking.findOne({
        _id: req.params.bookingId,
        vendorId
    });

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only allow cancellation of pending bookings (not yet approved/active)
    if (booking.status === 'active' || booking.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot cancel an active or completed booking' });
    }

    booking.status = 'cancelled';

    // Handle refund for paid bookings (pending approval stage)
    if (booking.paymentStatus === 'paid' && booking.adminApprovalStatus === 'pending') {
        try {
            // Refund based on payment method
            if (booking.paymentMethod === 'wallet') {
                // 1. Credit vendor wallet
                await vendorWalletService.creditWallet(
                    vendorId,
                    booking.amount,
                    `Refund for Cancelled Banner Booking: ${booking.referenceId}`,
                    booking._id.toString(),
                    'refund'
                );

                // 2. Record platform DEBIT (double-entry)
                await platformLedgerService.recordRefund({
                    bookingId: booking._id,
                    vendorId,
                    amount: booking.amount,
                    referenceId: booking.referenceId,
                    description: `Refund for vendor-cancelled B2B Banner Booking: ${booking.referenceId}`,
                });

                booking.paymentStatus = 'refunded';
                console.log('✅ [cancelBooking] Wallet refund processed with double-entry ledger');
            } else {
                // Razorpay payments - credit to wallet as store credit
                await vendorWalletService.creditWallet(
                    vendorId,
                    booking.amount,
                    `Refund (to wallet) for Cancelled Banner Booking: ${booking.referenceId}`,
                    booking._id.toString(),
                    'refund'
                );

                await platformLedgerService.recordRefund({
                    bookingId: booking._id,
                    vendorId,
                    amount: booking.amount,
                    referenceId: booking.referenceId,
                    description: `Refund (to wallet) for vendor-cancelled B2B Banner Booking: ${booking.referenceId}`,
                });

                booking.paymentStatus = 'refunded';
                console.log('✅ [cancelBooking] Razorpay payment refunded to wallet with double-entry ledger');
            }
        } catch (refundError) {
            console.error('❌ [cancelBooking] Refund failed:', refundError);
            // Booking is still cancelled, but mark refund issue
        }
    }

    await booking.save();

    // Send payment cancelled email (if there was a Razorpay payment)
    if (booking.razorpayPaymentId && booking.amount > 0) {
        try {
            const vendor = await Vendor.findById(vendorId).select('email storeName businessName phone name');
            const vendorEmail = vendor?.email;
            const vendorInfo = vendor
                ? {
                    name: vendor.businessName || vendor.storeName || vendor.name || 'Vendor',
                    email: vendor.email,
                    phone: vendor.phone,
                }
                : null;
            const adminEmail = process.env.EMAIL_FROM;
            const paymentDate = new Date();

            if (vendorEmail) {
                await sendPaymentCancelledEmail({
                    to: vendorEmail,
                    amount: booking.amount,
                    planName: booking.title || 'Banner Booking',
                    title: booking.title || 'Banner Booking',
                    paymentFor: 'banner_booking',
                    paymentDate,
                    transactionId: booking.razorpayPaymentId,
                    referenceId: booking.referenceId || booking._id.toString(),
                    paymentMethod: booking.paymentMethod || 'razorpay',
                    vendor: vendorInfo,
                });
            }
            if (adminEmail) {
                await sendPaymentCancelledEmail({
                    to: adminEmail,
                    amount: booking.amount,
                    planName: booking.title || 'Banner Booking',
                    title: booking.title || 'Banner Booking',
                    paymentFor: 'banner_booking',
                    paymentDate,
                    transactionId: booking.razorpayPaymentId,
                    referenceId: booking.referenceId || booking._id.toString(),
                    paymentMethod: booking.paymentMethod || 'razorpay',
                    vendor: vendorInfo,
                });
            }

            booking.emailNotification = {
                ...(booking.emailNotification || {}),
                cancelSent: true,
                lastSentAt: new Date(),
            };
            await booking.save();
        } catch (emailErr) {
            console.error('Failed to send banner booking cancellation email:', emailErr.message);
            await BannerBooking.findByIdAndUpdate(booking._id, {
                $push: {
                    accountingErrors: {
                        at: 'banner_cancel_email',
                        message: emailErr.message,
                    },
                },
            });
        }
    }

    res.status(200).json({
        success: true,
        message: `Booking cancelled${booking.paymentStatus === 'refunded' ? '. Payment has been refunded to your wallet.' : ''}`
    });
});



// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

export const getActiveBanners = asyncHandler(async (req, res) => {
    const { bannerType } = req.query;
    const now = new Date();

    // Add 5.5 hours buffer for IST synchronization
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    const query = {
        status: { $in: ['active', 'approved'] },
        paymentStatus: 'paid',
        startDate: { $lte: nowWithISTBuffer },
        endDate: { $gte: nowWithISTBuffer }
    };
    if (bannerType) query.bannerType = bannerType;

    const banners = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName businessInfo')
        .populate('slotId', 'slotNumber')
        .lean();

    // Sort by slot number (Slot 1, then Slot 2, etc.)
    banners.sort((a, b) => {
        const slotA = a.slotId?.slotNumber || 999;
        const slotB = b.slotId?.slotNumber || 999;
        return slotA - slotB;
    });

    const settings = {
        universalDisplayTime: 3
    };

    res.status(200).json({
        success: true,
        data: {
            banners,
            settings
        }
    });
});


// ============================================
// ADMIN BANNER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all banner slots (Admin)
 */
export const getAdminBannerSlots = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b' } = req.query;

    // Auto-create B2B slots if they don't exist
    if (bannerType === 'b2b') {
        const count = await BannerSlot.countDocuments({ bannerType: 'b2b' });
        if (count === 0) {
            const defaultSlots = Array.from({ length: 5 }, (_, i) => ({
                slotNumber: i + 1,
                bannerType: 'b2b',
                price: 2999 - (i * 200),
                isActive: true
            }));
            await BannerSlot.insertMany(defaultSlots);
        }
    }

    const slots = await BannerSlot.find({ bannerType }).lean().sort({ slotNumber: 1 });
    const now = new Date();

    // Dynamically find relevant bookings for each slot
    const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        // Add 5.5 hours buffer for IST
        const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

        // Find all bookings that are not cancelled or completed
        const allBookings = await BannerBooking.find({
            slotId: slot._id,
            status: { $in: ['active', 'approved', 'pending'] },
            endDate: { $gte: now }
        })
            .populate('vendorId', 'name storeName email')
            .sort({ startDate: 1 });

        // Identify current booking (if any)
        const currentBooking = allBookings.find(b =>
            b.startDate <= nowWithISTBuffer && b.endDate >= now
        );

        return {
            ...slot,
            currentBooking: currentBooking || null,
            upcomingBookings: allBookings.filter(b => b._id !== currentBooking?._id)
        };
    }));

    const settings = {
        bookingWindowDays: 30,
        minDurationHours: 24,
        maxDurationHours: 720,
        defaultPricePerDay: 2999
    };

    res.status(200).json({
        success: true,
        data: {
            slots: slotsWithBookings,
            settings
        }
    });
});

/**
 * Get all banner bookings (Admin)
 */
export const getAdminBannerBookings = asyncHandler(async (req, res) => {
    const { status, bannerType = 'b2b' } = req.query;

    const query = { bannerType };
    if (status) query.status = status;

    const bookings = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: bookings
    });
});

/**
 * Get banner booking details (Admin)
 */
export const getAdminBannerBookingDetails = asyncHandler(async (req, res) => {
    const booking = await BannerBooking.findById(req.params.id)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId');

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
        success: true,
        data: booking
    });
});

/**
 * Update banner slot (Admin)
 */
export const updateBannerSlot = asyncHandler(async (req, res) => {
    const { price, displayTime } = req.body;

    const slot = await BannerSlot.findById(req.params.id);
    if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (price !== undefined) slot.price = price;
    if (displayTime !== undefined) slot.displayTime = displayTime;

    await slot.save();

    res.status(200).json({
        success: true,
        message: 'Slot updated successfully',
        data: slot
    });
});

/**
 * Update banner settings (Admin)
 */
export const updateBannerSettings = asyncHandler(async (req, res) => {
    // This would update global settings in a Settings model
    // For now, just return success
    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: req.body
    });
});

/**
 * Approve banner booking (Admin)
 */
export const approveBannerBooking = asyncHandler(async (req, res) => {
    const booking = await BannerBooking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus !== 'paid') {
        return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    booking.adminApprovalStatus = 'approved';

    const now = new Date();
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    // Set status based on activation timing
    if (booking.startDate <= nowWithISTBuffer) {
        booking.status = 'active';
    } else {
        booking.status = 'approved';
    }
    await booking.save();

    // Update slot's currentBooking reference IF it's now active
    if (booking.status === 'active') {
        await BannerSlot.findByIdAndUpdate(booking.slotId, {
            currentBooking: booking._id
        });
    }

    // Record revenue realization when booking goes active
    // Revenue is only recognized when banner is actually displayed
    if (booking.status === 'active') {
        try {
            await platformLedgerService.recordRevenueRealized({
                bookingId: booking._id,
                vendorId: booking.vendorId,
                amount: booking.amount,
                referenceId: booking.referenceId,
            });
            console.log('✅ [approveBannerBooking] Revenue realized for booking:', booking._id);
        } catch (revenueError) {
            console.error('⚠️ [approveBannerBooking] Revenue realization failed (non-blocking):', revenueError.message);
        }
    }

    // Notify vendor about banner approval
    try {
        await notificationService.createNotification({
            recipientId: booking.vendorId,
            recipientType: 'vendor',
            type: 'banner_booking',
            baseAmount: booking.baseAmount,
            gstAmount: booking.gstAmount,
            amount: booking.amount,
            title: 'Banner Booking Approved!',
            message: 'Your banner booking has been approved and is now active.',
            actionUrl: '/vendor/banners',
            metadata: {
                bookingId: booking._id,
                bannerType: booking.bannerType
            }
        }, req.app.get('io'));
    } catch (notifError) {
        console.error('Failed to notify vendor about banner approval:', notifError);
    }

    res.status(200).json({
        success: true,
        message: 'Booking approved successfully',
        data: booking
    });
});

/**
 * Reject banner booking (Admin)
 */
export const rejectBannerBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await BannerBooking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.adminApprovalStatus = 'rejected';
    booking.status = 'cancelled';
    booking.rejectionReason = reason || 'No reason provided';

    // REFUND LOGIC: If payment was made, refund to wallet + create platform debit
    if (booking.paymentStatus === 'paid') {
        try {
            console.log('💰 [rejectBannerBooking] Initiating refund to wallet for booking:', booking._id);

            // 1. Credit vendor wallet (refund)
            await vendorWalletService.creditWallet(
                booking.vendorId,
                booking.amount,
                `Refund for Rejected Banner Booking: ${booking.referenceId}`,
                booking._id.toString(),
                'refund'
            );

            // 2. Record platform DEBIT (money going out - double-entry)
            await platformLedgerService.recordRefund({
                bookingId: booking._id,
                vendorId: booking.vendorId,
                amount: booking.amount,
                referenceId: booking.referenceId,
                description: `Refund for rejected B2B Banner Booking: ${booking.referenceId}`,
            });

            // 3. Mark payment as refunded
            booking.paymentStatus = 'refunded';

            console.log('✅ [rejectBannerBooking] Refund successful with double-entry ledger');
        } catch (refundError) {
            console.error('❌ [rejectBannerBooking] Refund failed:', refundError);
            // Booking is still rejected, but flag refund failure for admin attention
        }
    }

    await booking.save();

    // Notify vendor about banner rejection
    try {
        await notificationService.createNotification({
            recipientId: booking.vendorId,
            recipientType: 'vendor',
            type: 'banner_booking',
            baseAmount: booking.baseAmount,
            gstAmount: booking.gstAmount,
            amount: booking.amount,
            title: 'Banner Booking Rejected',
            message: `Your banner booking was rejected. ${reason ? `Reason: ${reason}` : ''} ${booking.paymentStatus === 'refunded' ? 'Your payment has been refunded to your wallet.' : ''}`,
            actionUrl: '/vendor/banners',
            metadata: {
                bookingId: booking._id,
                bannerType: booking.bannerType,
                reason: reason,
                refunded: booking.paymentStatus === 'refunded'
            }
        }, req.app.get('io'));
    } catch (notifError) {
        console.error('Failed to notify vendor about banner rejection:', notifError);
    }

    res.status(200).json({
        success: true,
        message: `Booking rejected successfully${booking.paymentStatus === 'refunded' ? '. Payment refunded to vendor wallet.' : ''}`,
        data: booking
    });
});

/**
 * Get banner revenue stats (Admin)
 */
export const getBannerRevenueStats = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b' } = req.query;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
        totalBookings,
        activeBookingsCount,
        pendingBookings,
        currentMonthRevenue,
        lastMonthRevenue,
        activeBookingsLast30Days,
        uniqueVendors
    ] = await Promise.all([
        BannerBooking.countDocuments({ bannerType }),
        BannerBooking.countDocuments({ bannerType, status: 'active' }),
        BannerBooking.countDocuments({ bannerType, status: 'pending', paymentStatus: 'paid' }),

        // Current month revenue - only count ACTIVE/COMPLETED bookings (realized revenue)
        BannerBooking.aggregate([
            { $match: { bannerType, paymentStatus: 'paid', status: { $in: ['active', 'completed'] }, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),

        // Last month revenue (for percentage change) - only realized
        BannerBooking.aggregate([
            { $match: { bannerType, paymentStatus: 'paid', status: { $in: ['active', 'completed'] }, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),

        // Active bookings created in last 30 days
        BannerBooking.countDocuments({
            bannerType,
            status: 'active',
            createdAt: { $gte: thirtyDaysAgo }
        }),

        // Unique vendors
        BannerBooking.distinct('vendorId', { bannerType, paymentStatus: 'paid' }),

        // Subscription Revenue (Total from B2B plans)
        VendorSubscription.aggregate([
            { $match: { planId: { $exists: true, $ne: null }, status: { $in: ['active', 'expired'] } } },
            {
                $lookup: {
                    from: 'b2bsubscriptionplans',
                    localField: 'planId',
                    foreignField: '_id',
                    as: 'plan'
                }
            },
            { $unwind: '$plan' },
            { $group: { _id: null, total: { $sum: '$plan.price' } } }
        ])
    ]);

    // Revenue = only active/completed bookings (realized revenue, excluding refunded)
    const bannerRevenueResult = await BannerBooking.aggregate([
        { $match: { bannerType, paymentStatus: 'paid', status: { $in: ['active', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total collections (all paid, including pending approval)
    const totalCollections = await BannerBooking.aggregate([
        { $match: { bannerType, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total refunds issued
    const totalRefunds = await BannerBooking.aggregate([
        { $match: { bannerType, paymentStatus: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const subscriptionRevenue = uniqueVendors[1]?.[0]?.total || 0;
    const bannerRevenue = bannerRevenueResult[0]?.total || 0;
    const totalRevenue = bannerRevenue + subscriptionRevenue;
    const currentRev = currentMonthRevenue[0]?.total || 0;
    const lastRev = lastMonthRevenue[0]?.total || 0;

    let percentageChange = 0;
    if (lastRev > 0) {
        percentageChange = ((currentRev - lastRev) / lastRev) * 100;
    } else if (currentRev > 0) {
        percentageChange = 100;
    }

    res.status(200).json({
        success: true,
        data: {
            totalBookings,
            activeBookingsCount,
            pendingBookings,
            totalRevenue,
            bannerRevenue,
            subscriptionRevenue,
            currentMonthRevenue: currentRev,
            percentageChange,
            activeBookingsLast30Days,
            uniqueVendorsCount: uniqueVendors.length,
            totalPaidBookings: await BannerBooking.countDocuments({ bannerType, paymentStatus: 'paid' }),
            totalCollections: totalCollections[0]?.total || 0,
            totalRefunds: totalRefunds[0]?.total || 0,
            netCollections: (totalCollections[0]?.total || 0) - (totalRefunds[0]?.total || 0),
        }
    });
});

/**
 * Get banner transactions (Admin)
 */
export const getBannerTransactions = asyncHandler(async (req, res) => {
    const { bannerType = 'b2b', limit = 50, search = '' } = req.query;

    const query = { bannerType, paymentStatus: 'paid' };

    const transactions = await BannerBooking.find(query)
        .populate('vendorId', 'name storeName email')
        .populate('slotId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    // Map to a more friendly format for the frontend wallet
    const formattedTransactions = transactions.map(txn => {
        const vendorName = txn.vendorId?.storeName || txn.vendorId?.name || 'Unknown B2B Vendor';
        return {
            id: txn.referenceId || txn._id,
            transactionId: txn.razorpayPaymentId || `TXN-${txn._id}`,
            bookingId: txn._id,
            vendor: vendorName,
            amount: txn.amount,
            date: txn.createdAt,
            status: txn.paymentStatus === 'paid' ? 'success' : 'pending',
            method: txn.paymentMethod || 'Razorpay',
            bannerType: txn.bannerType
        };
    });

    res.status(200).json({
        success: true,
        data: formattedTransactions
    });
});

/**
 * Get banner transaction details (Admin)
 */
export const getBannerTransactionDetails = asyncHandler(async (req, res) => {
    const transaction = await BannerBooking.findById(req.params.id)
        .populate('vendorId', 'name storeName email phone businessInfo')
        .populate('slotId');

    if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
        success: true,
        data: transaction
    });
});
