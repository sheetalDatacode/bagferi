import * as vendorAnalyticsService from '../services/vendorRegistrationAnalytics.service.js';

/**
 * Get vendor registration analytics for admin charts
 */
export const getVendorRegistrationAnalytics = async (req, res) => {
    try {
        const { type, date, startDate, endDate } = req.query;
        let data;

        // Base metrics always returned in primary request if no type specified
        const summary = await vendorAnalyticsService.getVendorSummaryStats();

        if (type === 'today') {
            const targetDate = date ? new Date(date) : new Date();
            data = await vendorAnalyticsService.getTodayRegistrations(targetDate);
        } else if (type === 'weekly') {
            data = await vendorAnalyticsService.getWeeklyRegistrations();
        } else if (type === 'monthly') {
            data = await vendorAnalyticsService.getMonthlyRegistrations();
        } else if (type === 'yearly') {
            data = await vendorAnalyticsService.getYearlyRegistrations();
        } else if (type === 'custom' && startDate && endDate) {
            data = await vendorAnalyticsService.getCustomRangeRegistrations(startDate, endDate);
        } else if (type === 'details' && date) {
            data = await vendorAnalyticsService.getVendorsRegisteredOnDate(date);
        } else {
            // Default: Fetch all for dashboard initialization
            const [today, weekly, monthly, yearly] = await Promise.all([
                vendorAnalyticsService.getTodayRegistrations(new Date()),
                vendorAnalyticsService.getWeeklyRegistrations(),
                vendorAnalyticsService.getMonthlyRegistrations(),
                vendorAnalyticsService.getYearlyRegistrations()
            ]);
            data = { today, weekly, monthly, yearly };
        }

        res.status(200).json({
            success: true,
            summary,
            data
        });
    } catch (error) {
        console.error('Error fetching vendor registration analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor registration analytics'
        });
    }
};
