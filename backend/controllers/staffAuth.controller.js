import ShopUnit from '../models/ShopUnit.model.js';
import { generateToken } from '../utils/jwt.util.js';

export const staffLogin = async (req, res, next) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        // Find the staff in any shop
        const shop = await ShopUnit.findOne({ 'details.mobile': mobile });
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Staff not found with this mobile number' });
        }

        const staffDetail = shop.details.find(d => d.mobile === mobile);
        if (!staffDetail) {
            return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        // Generate JWT Token directly without OTP verification (as requested by user)
        const payload = {
            id: staffDetail._id,
            staffId: staffDetail._id,
            mobile: staffDetail.mobile,
            name: staffDetail.name,
            shopId: shop._id,
            vendorId: shop.vendorId,
            role: 'staff'
        };

        const token = generateToken(payload);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: payload
        });
    } catch (error) {
        next(error);
    }
};
