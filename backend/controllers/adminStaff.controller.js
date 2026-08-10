import ShopUnit from '../models/ShopUnit.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

export const getAllStaff = asyncHandler(async (req, res, next) => {
    try {
        // Fetch all shop units and populate vendorId details
        const shops = await ShopUnit.find({})
            .populate('vendorId', 'storeName name email phone')
            .lean();

        const staffList = [];
        shops.forEach(shop => {
            const vendor = shop.vendorId || {};
            const staffDetails = shop.details || [];
            staffDetails.forEach(staff => {
                staffList.push({
                    _id: staff._id,
                    name: staff.name,
                    post: staff.post,
                    mobile: staff.mobile,
                    identityDocumentUrl: staff.identityDocumentUrl,
                    shopName: shop.name,
                    vendorName: vendor.storeName || vendor.name || 'Unknown Vendor',
                    vendorPhone: vendor.phone || '',
                    vendorEmail: vendor.email || '',
                });
            });
        });

        res.status(200).json({
            success: true,
            data: staffList
        });
    } catch (error) {
        next(error);
    }
});
