import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';

export const getAllOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim();
        const module = req.query.module?.trim();

        const query = {};
        const status = req.query.status?.trim();

        if (module && module !== 'all') {
            query.module = module;
        }

        if (status && status !== 'all') {
            if (status === 'Exchange') {
                query['exchangeRequest.status'] = { $exists: true, $ne: 'None' };
            } else {
                query.status = status;
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');

            // Find matching users
            const users = await User.find({
                $or: [{ name: searchRegex }, { phone: searchRegex }]
            }).select('_id');
            const userIds = users.map(u => u._id);

            // Find matching vendors
            const vendors = await Vendor.find({
                $or: [{ storeName: searchRegex }, { name: searchRegex }, { phone: searchRegex }]
            }).select('_id');
            const vendorIds = vendors.map(v => v._id);

            query.$or = [
                { orderNumber: searchRegex },
                { user: { $in: userIds } },
                { vendor: { $in: vendorIds } },
                { "assignedStaff.name": searchRegex },
                { "assignedStaff.mobile": searchRegex },
                { "exchangeRequest.assignedStaff.name": searchRegex },
                { "exchangeRequest.assignedStaff.mobile": searchRegex },
                { "shippingAddress.fullName": searchRegex },
                { "shippingAddress.phone": searchRegex }
            ];
        }

        const total = await Order.countDocuments(query);
        
        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .populate('vendor', 'storeName email phone')
            .populate({
                path: 'items.product',
                select: 'name title price image images' // name or title depending on model
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: {
                orders,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
