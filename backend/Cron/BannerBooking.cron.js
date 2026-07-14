import cron from 'node-cron';
import BannerBooking from '../models/BannerBooking.model.js';
import BannerSlot from '../models/BannerSlot.model.js';
import platformLedgerService from '../services/platformLedger.service.js';

/**
 * Banner Booking Cron Job
 * Runs every hour to update banner statuses:
 * 1. approved -> active (when startDate reached)
 * 2. active -> completed (when endDate passed)
 */
const bannerBookingCron = () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Running Banner Booking Status Update Cron...');
        const now = new Date();
        const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

        try {
            // 1. approved -> active
            const toActivate = await BannerBooking.find({
                status: 'approved',
                startDate: { $lte: nowWithISTBuffer },
                endDate: { $gte: nowWithISTBuffer }
            });

            if (toActivate.length > 0) {
                console.log(`🚀 Activating ${toActivate.length} banners...`);
                for (const booking of toActivate) {
                    booking.status = 'active';
                    await booking.save();

                    // Update slot reference
                    await BannerSlot.findByIdAndUpdate(booking.slotId, {
                        currentBooking: booking._id
                    });

                    // Record revenue realization (double-entry accounting)
                    try {
                        await platformLedgerService.recordRevenueRealized({
                            bookingId: booking._id,
                            vendorId: booking.vendorId,
                            amount: booking.amount,
                            referenceId: booking.referenceId,
                        });
                        console.log(`✅ [Cron] Revenue realized for banner: ${booking.referenceId}`);
                    } catch (revenueError) {
                        console.error(`⚠️ [Cron] Revenue realization failed for ${booking.referenceId}:`, revenueError.message);
                    }
                }
            }

            // 2. active -> completed
            const toComplete = await BannerBooking.find({
                status: 'active',
                endDate: { $lt: nowWithISTBuffer }
            });

            if (toComplete.length > 0) {
                console.log(`✅ Completing ${toComplete.length} banners...`);
                for (const booking of toComplete) {
                    booking.status = 'completed';
                    await booking.save();

                    // Clear slot reference if this was the current one
                    const slot = await BannerSlot.findById(booking.slotId);
                    if (slot && slot.currentBooking?.toString() === booking._id.toString()) {
                        slot.currentBooking = null;
                        await slot.save();
                    }
                }
            }

            console.log('✅ Banner Booking Status Update Cron Completed.');
        } catch (error) {
            console.error('❌ Banner Booking Cron Error:', error);
        }
    });

    // Run once on startup to sync state
    updateStatuses();
};

const updateStatuses = async () => {
    console.log('🔄 Syncing Banner Statuses on Startup...');
    const now = new Date();
    const nowWithISTBuffer = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    try {
        // Activate banners that should be active
        const activated = await BannerBooking.updateMany(
            {
                status: 'approved',
                startDate: { $lte: nowWithISTBuffer },
                endDate: { $gte: now }
            },
            { $set: { status: 'active' } }
        );

        // Complete banners that are past their end date
        const completed = await BannerBooking.updateMany(
            {
                status: 'active',
                endDate: { $lt: nowWithISTBuffer }
            },
            { $set: { status: 'completed' } }
        );

        console.log(`🔄 Startup Sync: ${activated.modifiedCount} activated, ${completed.modifiedCount} completed.`);
    } catch (error) {
        console.error('❌ Banner Startup Sync Error:', error);
    }
};

export default bannerBookingCron;
