import VendorAddon from '../models/VendorAddon.model.js';
import B2BAddonPlan from '../models/B2BAddonPlan.model.js';
import Vendor from '../models/Vendor.model.js';
import razorpayService from './razorpay.service.js';
import mongoose from 'mongoose';


class VendorAddonService {
  /**
   * Get all active add-ons for a vendor by feature type
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type (reels, products, lot_slot)
   * @returns {Promise<Array>} List of active add-on records
   */
  async getActiveAddons(vendorId, featureType) {
    try {
      const addons = await VendorAddon.find({
        vendorId,
        featureType,
        status: 'active',
        $expr: { $lt: ['$usedCount', '$totalQuantity'] }
      })
        .sort({ createdAt: 1 }) // First bought, first used
        .lean();
      return addons;
    } catch (error) {
      console.error('Error fetching active vendor addons:', error);
      throw error;
    }
  }

  /**
   * Get total available units for a feature type from all active add-ons
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type
   * @returns {Promise<number>} Total units remaining
   */
  async getTotalAvailableAddonUnits(vendorId, featureType) {
    try {
      const addons = await VendorAddon.aggregate([
        {
          $match: {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            featureType,
            status: 'active',
          }
        },
        {
          $project: {
            remaining: { $subtract: ['$totalQuantity', '$usedCount'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRemaining: { $sum: '$remaining' }
          }
        }
      ]);

      return addons.length > 0 ? Math.max(0, addons[0].totalRemaining) : 0;
    } catch (error) {
      console.error('Error in getTotalAvailableAddonUnits:', error);
      return 0;
    }
  }
 
  /**
   * Get recent addon purchases for a vendor
   * @param {string} vendorId 
   * @param {number} limit 
   */
  async getRecentAddons(vendorId, limit = 5) {
    return await VendorAddon.find({ vendorId })
      .populate('addonPlanId', 'name price featureType quantity')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Purchase addon unit using wallet balance (no Zoho invoice as requested)
   * @param {string} vendorId 
   * @param {string} addonPlanId 
   * @param {number} quantity - Number of packs to purchase
   * @returns {Promise<Object>} Created vendor addon record
   */
  async purchaseAddonViaWallet(vendorId, addonPlanId, quantity = 1) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const addonPlan = await B2BAddonPlan.findById(addonPlanId).session(session);
      if (!addonPlan || !addonPlan.isActive) {
        throw new Error('Invalid or inactive add-on plan');
      }

      const multiplier = Math.max(1, parseInt(quantity) || 1);
      const price = (addonPlan.price || 0) * multiplier;
      const discountAmount = (addonPlan.discount || 0) * multiplier;
      const gstPercentage = addonPlan.gst || 18;

      const priceAfterDiscount = Math.max(0, price - discountAmount);
      // For wallet purchases, we do NOT add GST because it was already collected during recharge top-up
      const gstAmount = 0;
      const totalAmount = priceAfterDiscount;

      // Pay via wallet - this will check balance and debit
      const { default: vendorWalletService } = await import('./vendorWallet.service.js');
      await vendorWalletService.payViaWallet(
        vendorId,
        totalAmount,
        `Purchase Add-on Plan: ${addonPlan.name} (x${multiplier})`,
        addonPlanId.toString(),
        'addon_plan'
      );

      // Create VendorAddon Record
      const [vendorAddon] = await VendorAddon.create([{
        vendorId,
        addonPlanId,
        featureType: addonPlan.featureType,
        totalQuantity: addonPlan.quantity * multiplier,
        purchasedPacks: multiplier,
        usedCount: 0,
        purchaseDate: new Date(),
        status: 'active',
        paymentMethod: 'wallet',
        paymentId: `WALLET-${Date.now()}`,
        basePrice: price,
        discount: discountAmount,
        gstAmount,
        totalAmount
      }], { session });

      await session.commitTransaction();

      // Notify via email (without Zoho invoice as requested)
      this.sendWalletPaymentNotification(vendorAddon._id).catch(err => {
        console.error('[AddonWallet][Email] Background email failed:', err);
      });

      return vendorAddon;
    } catch (error) {
      await session.abortTransaction();
      console.error('Purchase Addon Via Wallet Error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Send email notification for wallet-based purchase (No Zoho as requested)
   */
  async sendWalletPaymentNotification(addonId) {
    try {
      const { sendPaymentSuccessEmail } = await import('./email.service.js');
      const addonDoc = await VendorAddon.findById(addonId).populate('addonPlanId').populate('vendorId');
      if (!addonDoc) return;

      const v = addonDoc.vendorId;
      const planDoc = addonDoc.addonPlanId;
      const amount = Number(addonDoc.totalAmount || 0);
      const planName = planDoc?.name || `Add-on: ${addonDoc.featureType}`;

      const emailData = {
        amount,
        planName,
        title: planName,
        paymentFor: 'addon_purchase',
        paymentDate: new Date(),
        transactionId: addonDoc.paymentId,
        referenceId: `ADDON-${addonId}`,
        paymentMethod: 'wallet',
        vendor: {
          name: v.businessName || v.storeName || v.name || 'Vendor',
          email: v.email,
          phone: v.phone
        }
      };

      if (v.email) {
        await sendPaymentSuccessEmail({ ...emailData, to: v.email });
      }
    } catch (e) {
      console.error('[AddonWallet][Email] error:', e.message);
    }
  }

  /**
   * Initialize addon purchase (Create Razorpay Order)
   * @param {string} vendorId - Vendor ID
   * @param {string} addonPlanId - ID of the addon package
   * @param {number} quantity - Number of packs to purchase
   * @returns {Promise<Object>} Razorpay order data
   */
  async initializeAddonPurchase(vendorId, addonPlanId, quantity = 1) {
    try {
      const addonPlan = await B2BAddonPlan.findById(addonPlanId);
      if (!addonPlan || !addonPlan.isActive) {
        throw new Error('Invalid or inactive add-on plan');
      }

      const multiplier = Math.max(1, parseInt(quantity) || 1);
      const price = (addonPlan.price || 0) * multiplier;
      const discountAmount = (addonPlan.discount || 0) * multiplier;
      const gstPercentage = addonPlan.gst || 18;

      const priceAfterDiscount = Math.max(0, price - discountAmount);
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const receiptId = `addon_${Date.now()}_${vendorId.toString().slice(-4)}`;

      const razorpayOrder = await razorpayService.createOrder(
        totalAmount,
        'INR',
        receiptId,
        {
          vendorId: vendorId.toString(),
          addonPlanId: addonPlanId.toString(),
          featureType: addonPlan.featureType,
          quantity: (addonPlan.quantity * multiplier).toString(),
          purchasedPacks: multiplier.toString(),
          basePrice: price.toString(),
          gstAmount: gstAmount.toString(),
          totalAmount: totalAmount.toString(),
          type: 'b2b_addon',
          planName: addonPlan.name
        }
      );

      return {
        ...razorpayOrder,
        addonPlanId: addonPlan._id,
        purchasedPacks: multiplier,
        price: addonPlan.price,
        basePrice: price,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        quantity: addonPlan.quantity * multiplier,
        featureType: addonPlan.featureType,
        name: addonPlan.name,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Initialize Addon Purchase Error:', error);
      throw error;
    }
  }

  /**
   * Verify addon payment and credit units
   * @param {string} vendorId - Vendor ID
   * @param {Object} paymentData - Razorpay payment response
   * @returns {Promise<Object>} Created addon record
   */
  async verifyAddonPayment(vendorId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
      const addonPlanId = paymentData.addonPlanId || paymentData.planId;

      // 1. Verify Signature
      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Add-on payment verification failed');

      // 2. Prevent Duplicate Credit
      const existing = await VendorAddon.findOne({ paymentId: razorpayPaymentId }).session(session);
      if (existing) {
        await session.commitTransaction();
        return existing;
      }

      // 3. Get Plan Details
      const addonPlan = await B2BAddonPlan.findById(addonPlanId).session(session);
      if (!addonPlan) throw new Error('Add-on plan not found');

      // 4. Create VendorAddon Record
      const multiplier = Math.max(1, parseInt(paymentData.purchasedPacks || 1));
      const price = (addonPlan.price || 0) * multiplier;
      const discountAmount = (addonPlan.discount || 0) * multiplier;
      const gstPercentage = addonPlan.gst || 18;

      const priceAfterDiscount = Math.max(0, price - discountAmount);
      const gstAmount = Math.round(priceAfterDiscount * (gstPercentage / 100));
      const totalAmount = priceAfterDiscount + gstAmount;

      const [vendorAddon] = await VendorAddon.create([{
        vendorId,
        addonPlanId,
        featureType: addonPlan.featureType,
        totalQuantity: addonPlan.quantity * multiplier,
        purchasedPacks: multiplier,
        usedCount: 0,
        purchaseDate: new Date(),
        status: 'active',
        paymentMethod: 'razorpay',
        paymentId: razorpayPaymentId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        basePrice: price,
        discount: discountAmount,
        gstAmount,
        totalAmount
      }], { session });

      await session.commitTransaction();
      
      // Trigger integration helper asynchronously
      this.processZohoAndEmailForAddon(vendorAddon._id).catch(err => {
        console.error('[AddonPay][Critical] Failed to process Zoho/Email:', err.message);
      });

      return vendorAddon;
    } catch (error) {
      await session.abortTransaction();
      console.error('Verify Addon Payment Error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Consume one unit of a specific feature
   * Checks for active addons and decrements quantity
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type to consume
   * @returns {Promise<boolean>} True if successful
   */
  async consumeAddonUnit(vendorId, featureType) {
    try {
      // Find the oldest active addon that has capacity
      const addon = await VendorAddon.findOne({
        vendorId,
        featureType,
        status: 'active',
        $expr: { $lt: ['$usedCount', '$totalQuantity'] }
      }).sort({ createdAt: 1 });

      if (!addon) return false;

      addon.usedCount += 1;
      if (addon.usedCount >= addon.totalQuantity) {
        addon.status = 'consumed';
      }

      await addon.save();
      return true;
    } catch (error) {
      console.error(`Error consuming ${featureType} addon unit for vendor ${vendorId}:`, error);
      return false;
    }
  }

  /**
   * Helper to handle Zoho integration and Emails for Addon purchases
   * @param {string} addonId 
   */
  async processZohoAndEmailForAddon(addonId) {
    try {
      console.log(`[AddonPay][Zoho] Starting integration helper for addon: ${addonId.toString()}`);
      const { default: zohoBooksService } = await import('./zohoBooks.service.js');
      const { sendPaymentSuccessEmail } = await import('./email.service.js');
      const { default: Vendor } = await import('../models/Vendor.model.js');

      const addonDoc = await VendorAddon.findById(addonId).populate('addonPlanId').populate('vendorId');
      if (!addonDoc) return;

      // Avoid duplicate processing if email already sent
      if (addonDoc.emailNotification?.successSent) {
        console.log('[AddonPay][Zoho] Success notification already sent for addon', addonId.toString());
        return;
      }

      const planDoc = addonDoc.addonPlanId;
      const amount = Number(addonDoc.totalAmount || planDoc?.price || 0);
      const planName = planDoc?.name || `Add-on: ${addonDoc.featureType}`;
      const razorpayPaymentId = addonDoc.paymentId;
      const basePrice = Number(addonDoc.basePrice || 0);
      const gstAmount = Number(addonDoc.gstAmount || 0);
      const discount = Number(addonDoc.discount || 0);

      const v = addonDoc.vendorId;
      if (!v || !v.email) {
        console.warn('[AddonPay][Zoho] No vendor email found for addon', addonId);
        return;
      }

      const vendorInfo = {
        _id: v._id,
        name: v.businessName || v.storeName || v.name || 'Vendor',
        storeName: v.storeName || v.businessName,
        email: v.email,
        phone: v.phone,
        gstNumber: v.gstNumber,
        zohoContactId: v.zohoContactId || addonDoc.zohoContactId
      };

      // 1. Zoho Contact (Ensure ID exists)
      let contactId = vendorInfo.zohoContactId;
      console.log(`[AddonPay][Zoho] Syncing contact for vendor: ${vendorInfo.email}, Existing ID: ${contactId || 'None'}`);
      
      if (!contactId) {
        try {
          contactId = await zohoBooksService.ensureZohoContactForVendor({
            email: vendorInfo.email,
            phone: vendorInfo.phone,
            name: vendorInfo.name,
            storeName: vendorInfo.storeName || vendorInfo.name,
            gstNumber: vendorInfo.gstNumber || null,
            zohoContactId: null
          });
          
          if (vendorInfo._id && contactId) {
            await Vendor.findByIdAndUpdate(vendorInfo._id, { zohoContactId: contactId });
          }
        } catch (e) { 
          console.error('[AddonPay][Zoho] Contact Sync failed:', e.message); 
          await VendorAddon.findByIdAndUpdate(addonId, {
            $push: { accountingErrors: { at: 'zoho_contact_sync', message: e.message } }
          });
        }
      }

      // 2. Zoho Invoice & Payment (Ensure invoice exists or create it)
      let invoice = null;
      let invoicePdfBuffer = null;
      let existingInvoiceId = addonDoc.zohoInvoiceId;

      if (contactId) {
        try {
          if (!existingInvoiceId) {
            const invoiceRef = `ADDON-${addonId.toString()}`;
            invoice = await zohoBooksService.createSubscriptionInvoice({
              contactId,
              planName,
              amount,
              currency: 'INR',
              referenceNumber: invoiceRef,
              vendorGstNumber: vendorInfo.gstNumber,
              baseAmount: basePrice,
              gstAmount: gstAmount,
              discount: discount
            });
            
              if (invoice?.id) {
                existingInvoiceId = invoice.id;
                // PROACTIVELY SAVE ID IMMEDIATELY - Prevents duplicates and ensures visibility if next steps fail
                await VendorAddon.findByIdAndUpdate(addonId, { 
                  zohoInvoiceId: invoice.id
                });

                // PROBABLY THE MOST CRITICAL STEP: Move out of Draft
                const markSentResult = await zohoBooksService.markInvoiceAsSent(invoice.id, true);
                if (markSentResult) {
                    await VendorAddon.findByIdAndUpdate(addonId, { 
                      zohoInvoiceStatus: 'sent'
                    });
                }
              
              // Record payment immediately 
              await zohoBooksService.recordInvoicePayment({
                contactId, 
                invoiceId: invoice.id, 
                amount, 
                paymentDate: new Date(), 
                razorpayPaymentId,
                invoiceTotal: invoice.total // Use Zoho's official total
              });

              await VendorAddon.findByIdAndUpdate(addonId, { 
                zohoInvoiceStatus: 'paid'
              });
            }
          }

          // If we have an ID (either just created or from a prior run), finish syncing
          if (existingInvoiceId) {
            invoicePdfBuffer = await zohoBooksService.downloadInvoicePdf(existingInvoiceId);
            
            const updateObj = {
              zohoContactId: contactId,
              zohoInvoiceId: existingInvoiceId,
              zohoInvoiceStatus: 'paid', // Logicially known to be paid if we reached here or finished payment
              zohoInvoicePdfUrl: invoice?.pdfUrl || addonDoc.zohoInvoicePdfUrl
            };
            
            await VendorAddon.findByIdAndUpdate(addonId, updateObj);
          }
        } catch (e) { 
          console.error('[AddonPay][Zoho] Invoice/Payment phase failed:', e.message); 
          await VendorAddon.findByIdAndUpdate(addonId, {
            $push: { accountingErrors: { at: 'zoho_invoice_payment', message: e.message } }
          });
        }
      }

      // 3. Emails
      const vendorEmail = vendorInfo.email;
      const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const commonEmailData = {
        amount, 
        planName, 
        title: planName, 
        paymentFor: 'addon_purchase',
        paymentDate: new Date(), 
        transactionId: razorpayPaymentId,
        referenceId: `ADDON-${addonId}`, 
        paymentMethod: 'razorpay',
        vendor: vendorInfo, 
        invoicePdfBuffer,
        invoiceFileName: `addon-invoice-${existingInvoiceId || addonId}.pdf`
      };

      if (vendorEmail) {
        await sendPaymentSuccessEmail({ ...commonEmailData, to: vendorEmail }).catch(async e => {
          console.error('Vendor addon email failed:', e.message);
          await VendorAddon.findByIdAndUpdate(addonId, {
            $push: { accountingErrors: { at: 'vendor_email', message: e.message } }
          });
        });
      }
      
      if (adminEmail) {
        await sendPaymentSuccessEmail({ ...commonEmailData, to: adminEmail }).catch(async e => {
          console.error('Admin addon email failed:', e.message);
          await VendorAddon.findByIdAndUpdate(addonId, {
            $push: { accountingErrors: { at: 'admin_email', message: e.message } }
          });
        });
      }

      // Finalize notification status
      await VendorAddon.findByIdAndUpdate(addonId, {
        emailNotification: { successSent: true, lastSentAt: new Date() }
      });

    } catch (err) {
      console.error('[AddonPay][Critical] Integration helper failed:', err);
    }
  }
}

export default new VendorAddonService();
