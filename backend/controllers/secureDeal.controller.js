import SecureDeal from '../models/SecureDeal.model.js';
import NotificationService from '../services/notification.service.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import Product from '../models/Product.model.js';

/**
 * Create a new Secure Deal request
 * POST /api/secure-deals
 */
export const createSecureDeal = async (req, res, next) => {
    console.log('📬 [Backend] Received Secure Deal request at /api/order-deals');
    try {
        const {
            sellerId,
            productId,
            productName,
            quantity,
            pricePerUnit,
            totalAmount,
            transport,
            station,
            selectionOption
        } = req.body;

        // Robust buyer identification
        const buyerId = req.user.vendorId || req.user.id || req.user._id || (req.userDoc ? req.userDoc._id : null);
        const buyerModel = req.user.role === 'vendor' ? 'Vendor' : 'User';


        if (!buyerId) {
            console.warn('🛑 [Backend] Unauthorized: No buyer ID found in req.user. Decoded token:', JSON.stringify(req.user));
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Buyer not logged in (ID missing)',
            });
        }

        const secureDeal = new SecureDeal({
            buyerId,
            buyerModel,
            sellerId,
            productId,
            productName,
            quantity,
            pricePerUnit,
            totalAmount,
            transport,
            station,
            selectionOption,
        });

        const savedDeal = await secureDeal.save();

        // Fetch buyer details for notification
        let buyer;
        if (buyerModel === 'User') {
            buyer = await User.findById(buyerId);
        } else {
            buyer = await Vendor.findById(buyerId);
        }

        if (!buyer) {
            console.error('🛑 [Backend] Buyer details not found for ID:', buyerId);
            return res.status(404).json({
                success: false,
                message: 'Buyer details not found',
            });
        }

        const buyerName = buyer.name || buyer.storeName || 'Someone';

        // Notify the seller - Wrapped in try/catch to ensure deal creation succeeds regardless
        try {
            console.log(`🔔 [Backend] Attempting to notify seller: ${sellerId}`);
            const io = req.app.get('io');
            await NotificationService.createNotification({
                recipientId: sellerId,
                recipientType: 'vendor',
                type: 'secure_deal_request',
                title: 'New Secure Deal Request',
                message: `You have received a new Secure Deal request from ${buyerName} for ${productName}.`,
                actionUrl: '/b2b/vendor/dashboard/secure-deals',
                metadata: {
                    dealId: savedDeal._id,
                    buyerName: buyerName,
                },
            }, io);
            console.log(`✅ [Backend] Notification sent successfully`);
        } catch (notifError) {
            console.error('⚠️ [Backend Warning] Failed to send notification, but deal was saved:', notifError.message);
            // We don't throw here - we want the buyer to see success
        }

        console.log('✅ [Backend] Secure Deal saved and responding with success');
        res.status(201).json({
            success: true,
            message: 'Secure Deal request sent successfully',
            data: savedDeal,
        });
    } catch (error) {
        console.error('❌ [Backend] Error in createSecureDeal:', error);
        next(error);
    }
};

/**
 * Get Secure Deal requests for a seller (vendor)
 * GET /api/secure-deals/seller
 */
export const getSellerSecureDeals = async (req, res, next) => {
    try {
        const sellerId = req.user.vendorId || req.user.id;

        if (!sellerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Vendor not logged in',
            });
        }

        const deals = await SecureDeal.find({ sellerId })
            .populate('buyerId', 'name email phone address storeName businessInfo avatar')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: deals,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Secure Deal requests for a buyer (user)
 * GET /api/secure-deals/buyer
 */
export const getBuyerSecureDeals = async (req, res, next) => {
    try {
        const buyerId = req.user.id || req.user.vendorId || req.user._id;

        if (!buyerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const deals = await SecureDeal.find({ buyerId })
            .populate('sellerId', 'storeName name email phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: deals,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Secure Deal status (Accept/Reject)
 * PATCH /api/secure-deals/:id/status
 */
export const updateSecureDealStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'
        const sellerId = req.user.vendorId || req.user.id;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "accepted" or "rejected"',
            });
        }

        const deal = await SecureDeal.findOne({ _id: id, sellerId });

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Secure Deal request not found or unauthorized',
            });
        }

        deal.status = status;
        await deal.save();

        // Notify the buyer
        const io = req.app.get('io');
        await NotificationService.createNotification({
            recipientId: deal.buyerId,
            recipientType: deal.buyerModel === 'Vendor' ? 'vendor' : 'user',
            type: 'secure_deal_status',
            title: `Secure Deal ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
            message: `Your Secure Deal request for ${deal.productName} has been ${status} by the seller.`,
            actionUrl: '/b2b/dashboard',
            metadata: {
                dealId: deal._id,
                status,
            },
        }, io);

        res.status(200).json({
            success: true,
            message: `Secure Deal request ${status} successfully`,
            data: deal,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload Secure Deal document (Invoice/PDF)
 * POST /api/order-deals/:id/upload
 */
export const uploadSecureDealDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.vendorId || req.user.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided',
            });
        }

        const deal = await SecureDeal.findOne({ _id: id, sellerId });
        if (!deal) {
            return res.status(404).json({
                success: false,
                message: 'Secure Deal not found or unauthorized',
            });
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'secure-deals', {
            resource_type: 'auto',
        });

        deal.document = result.secure_url;
        await deal.save();

        // Notify the buyer about the document
        const io = req.app.get('io');
        await NotificationService.createNotification({
            recipientId: deal.buyerId,
            recipientType: deal.buyerModel === 'Vendor' ? 'vendor' : 'user',
            type: 'secure_deal_status',
            title: 'Document Uploaded',
            message: `A document has been uploaded for your deal: ${deal.productName}`,
            actionUrl: '/b2b/secure-deals',
            metadata: {
                dealId: deal._id,
                documentUrl: deal.document,
            },
        }, io);

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: deal,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all Secure Deals (Admin)
 * GET /api/order-deals/admin/all
 */
export const getAllSecureDeals = async (req, res, next) => {
    try {
        const deals = await SecureDeal.find()
            .populate('sellerId', 'storeName name email phone')
            .populate('buyerId', 'name email phone address storeName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: deals,
        });
    } catch (error) {
        next(error);
    }
};
