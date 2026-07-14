import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import User from '../models/User.model.js';

/**
 * Get paginated list of registered users
 * @route GET /api/admin/users
 * @access Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search = '',
        city = '',
        isActive,
        isEmailVerified
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};

    if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { name: regex },
            { email: regex },
            { phone: regex },
            { 'businessInfo.companyName': regex }
        ];
    }

    if (city && city.trim()) {
        const cityRegex = new RegExp(city.trim(), 'i');
        filter.$or = filter.$or || [];
        const cityConditions = [
            { 'businessInfo.address.city': cityRegex },
            { 'addresses.city': cityRegex }
        ];
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: cityConditions });
    }

    if (typeof isActive !== 'undefined') {
        if (isActive === 'true' || isActive === 'false') {
            filter.isActive = isActive === 'true';
        }
    }

    if (typeof isEmailVerified !== 'undefined') {
        if (isEmailVerified === 'true' || isEmailVerified === 'false') {
            filter.isEmailVerified = isEmailVerified === 'true';
        }
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .select('-password')
            .lean(),
        User.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        data: users,
        meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1
        }
    });
});

/**
 * Get distinct cities from users (for filter dropdown)
 * @route GET /api/admin/users/cities
 * @access Private/Admin
 */
export const getDistinctCities = asyncHandler(async (req, res) => {
    const cities = await User.aggregate([
        {
            $project: {
                bizCity: '$businessInfo.address.city',
                addrCities: '$addresses.city'
            }
        },
        { $unwind: { path: '$addrCities', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                city: { $ifNull: ['$bizCity', '$addrCities'] }
            }
        },
        { $match: { city: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: { $toLower: '$city' }, city: { $first: '$city' } } },
        { $sort: { city: 1 } },
        { $project: { _id: 0, city: 1 } }
    ]);
    const cityList = cities.map((c) => c.city).filter(Boolean);
    res.status(200).json({ success: true, data: cityList });
});

/**
 * Delete a user
 * @route DELETE /api/admin/users/:id
 * @access Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Check if user is an admin - maybe prevent deleting other admins here if needed
    // if (user.role === 'admin') {
    //     return res.status(403).json({
    //         success: false,
    //         message: 'Admins cannot be deleted via this endpoint'
    //     });
    // }

    await User.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});
