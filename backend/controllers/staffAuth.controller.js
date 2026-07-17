import ShopUnit from '../models/ShopUnit.model.js';
import { generateToken } from '../utils/jwt.util.js';
import { generateOTP, verifyOTP } from '../services/otp.service.js';

export const sendStaffOTP = async (req, res, next) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        // Find if this mobile number belongs to any staff in any shop
        const shop = await ShopUnit.findOne({ 'details.mobile': mobile });
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Staff not found with this mobile number' });
        }

        const staffDetail = shop.details.find(d => d.mobile === mobile);
        if (!staffDetail) {
            return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        // Generate OTP
        const otpData = await generateOTP(mobile);

        // In production, send SMS here. For now, we simulate it.
        console.log(`[Staff Login OTP] To: ${mobile}, OTP: ${otpData.otp}`);

        res.status(200).json({ 
            success: true, 
            message: 'OTP sent successfully to your mobile number' 
        });
    } catch (error) {
        next(error);
    }
};

export const verifyStaffOTP = async (req, res, next) => {
    try {
        const { mobile, otp } = req.body;
        if (!mobile || !otp) {
            return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });
        }

        // Find the staff
        const shop = await ShopUnit.findOne({ 'details.mobile': mobile });
        if (!shop) {
            return res.status(404).json({ success: false, message: 'Staff not found' });
        }

        const staffDetail = shop.details.find(d => d.mobile === mobile);

        // Verify OTP
        const isValidOTP = await verifyOTP(mobile, otp);
        if (!isValidOTP) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Generate JWT Token
        // Role is set to staff. 
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
