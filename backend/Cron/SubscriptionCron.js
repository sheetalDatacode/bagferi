import cron from "node-cron";
import B2BSubscription from "../models/B2BSubscriptionModel.js";
import razorpay from "../config/razorpay.js";
import dayjs from "dayjs";
import notificationService from "../services/notification.service.js";

// B2C Subscription Expiry Cron removed for B2B-only focus

export const B2BSubscriptionExpiryCron = cron.schedule("0 * * * *", async () => {
  try {
    console.log("🕒 Running subscription expiry cron...");

    const now = new Date();
    /* =====================================================
   CASE 1: Expire Cancelled Subscriptions (Razorpay End Date)
   - status = cancelled
   - Razorpay subscription end_at passed
===================================================== */

    const cancelledSubs = await B2BSubscription.find({
      status: "cancelled",
      isDeleted: false,
    });

    for (let sub of cancelledSubs) {
      if (!sub.subscriptionDetails?.end_at) continue;

      const razorpayEndDate = new Date(sub.subscriptionDetails.end_at * 1000);

      if (razorpayEndDate > now) continue; // abhi expire nahi hui

      sub.status = "expired";
      await sub.save();

      // Notify vendor about expired cancelled subscription
      try {
        await notificationService.createNotification({
          recipientId: sub.vendorId,
          recipientType: 'vendor',
          type: 'system',
          title: 'Subscription Expired',
          message: 'Your cancelled subscription has now reached its end date and is expired.',
          actionUrl: '/vendor/subscriptions',
        });
      } catch (notifError) {
        console.error('Failed to notify vendor about expired cancelled sub:', notifError);
      }

      console.log(`❌ Cancelled subscription expired: ${sub._id}`);
    }

    /* =====================================================
       CASE 2: Expire Free Subscriptions (1 week old)
       - finalPayableAmount = 0
       - createdAt >= 7 days
    ===================================================== */
    const freeSubsToExpire = await B2BSubscription.find({
      status: "active",
      isDeleted: false,
      finalPayableAmount: 0,
      createdAt: { $lte: dayjs(now).subtract(7, "day").toDate() },
    });

    for (let sub of freeSubsToExpire) {
      sub.status = "expired";
      await sub.save();

      // Notify vendor about free subscription expiry
      try {
        await notificationService.createNotification({
          recipientId: sub.vendorId,
          recipientType: 'vendor',
          type: 'system',
          title: 'Free Trial Expired',
          message: 'Your 7-day free subscription has expired. Please purchase a plan to continue using our services.',
          actionUrl: '/vendor/subscriptions',
        });
      } catch (notifError) {
        console.error('Failed to notify vendor about expired free sub:', notifError);
      }

      console.log(`❌ Free subscription expired: ${sub._id}`);
    }

    /* =====================================================
       CASE 3: Expire Paid Active Subscriptions & Create New Pending
       - Use Razorpay end date (subscriptionDetails.end_at)
    ===================================================== */
    const activePaidSubs = await B2BSubscription.find({
      status: "active",
      isDeleted: false,
      finalPayableAmount: { $gt: 0 },
    }).populate("planId");

    for (let sub of activePaidSubs) {
      if (!sub.subscriptionDetails?.end_at) continue;

      const razorpayEndDate = new Date(sub.subscriptionDetails.end_at * 1000);
      if (razorpayEndDate > now) continue; // not yet expired

      // Expire old subscription
      sub.status = "expired";
      await sub.save();
      console.log(`❌ Old active subscription expired: ${sub._id}`);

      const plan = sub.planId;

      if (plan && plan.razorpayPlanId) {
        // Create new Razorpay subscription
        if (razorpay) {
          const razorpaySubscription = await razorpay.subscriptions.create({
            plan_id: plan.razorpayPlanId,
            customer_notify: 1,
            total_count: 12,
          });

          // Create new subscription in DB
          const newSub = await B2BSubscription.create({
            vendorId: sub.vendorId, // Using vendorId as per model schema
            planId: plan._id,
            status: "pending",
            finalPayableAmount: plan.planPrice,
            razorpaySubscriptionId: razorpaySubscription.id,
            razorpaySubscriptionUrl: razorpaySubscription.short_url,
          });

          // Notify vendor about expiry and new pending subscription
          try {
            await notificationService.createNotification({
              recipientId: sub.vendorId,
              recipientType: 'vendor',
              type: 'system',
              title: 'Subscription Renewed (Pending Payment)',
              message: `Your subscription for ${plan.name} has expired and a new pending subscription has been created. Please complete the payment to keep your account active.`,
              actionUrl: '/vendor/subscriptions',
            });
          } catch (notifError) {
            console.error('Failed to notify vendor about new pending sub:', notifError);
          }

          console.log(`✅ New paid subscription created: ${newSub._id}`);
        } else {
          console.error('❌ Razorpay not configured. Cannot create new subscription for billing.');
        }
      }
    }

    console.log("✅ Subscription expiry cron finished.");
  } catch (err) {
    console.error("Cron Error:", err);
  }
});
