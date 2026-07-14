import axios from 'axios';

/**
 * Service to handle SMS sending via SMS India Hub
 */
class SMSService {
    constructor() {
        this.apiKey = process.env.SMS_INDIA_HUB_API_KEY;
        this.senderId = process.env.SMS_INDIA_HUB_SENDER_ID;
        this.templateId = process.env.SMS_INDIA_HUB_TEMPLATE_ID;
        this.apiUrl = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
    }

    /**
     * Send OTP via SMS
     * @param {string} phoneNumber - Recipient phone number with country code
     * @param {string} otp - 6-digit OTP
     * @returns {Promise<boolean>}
     */
    async sendOTP(phoneNumber, otp) {
        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            console.log(`[SMS DEBUG] No API Key. OTP: ${otp} to ${phoneNumber}`);
            return true;
        }

            // console.log(`[SMS DEBUG v2] Attempting to send OTP ${otp} to ${phoneNumber} via ${this.apiUrl}`);

        try {
            // Clean phone number (remove + if present)
            const mobile = phoneNumber.replace('+', '');
            const message = `Welcome to MDB DealingIndia. Your secure login OTP is ${otp}. Valid for 10 minutes. Never share your OTP.`;

            const params = {
                APIKey: this.apiKey,
                msisdn: mobile,
                sid: this.senderId,
                msg: message,
                fl: '0',
                gwid: '2',
                type: 'json'
            };

            const response = await axios.get(this.apiUrl, { params });
            
            // console.log('[SMS Service] Response:', response.data);
            
            // Handle various response formats from SMS India Hub
            const success = response.data.status === 'success' || 
                           response.data.ErrorCode === '000' || 
                           (typeof response.data === 'string' && response.data.toLowerCase().includes('success'));
            
            return success;
        } catch (error) {
            console.error('[SMS Service] Error sending SMS:', error.message);
            return false;
        }
    }
}

export default new SMSService();
