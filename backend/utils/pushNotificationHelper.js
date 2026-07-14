import { sendPushNotification } from '../services/firebaseAdmin.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

export async function sendNotificationToUser(userId, payload, includeMobile = true) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  let tokens = [];
  if (Array.isArray(user.fcmTokens) && user.fcmTokens.length) tokens = tokens.concat(user.fcmTokens);
  if (includeMobile && Array.isArray(user.fcmTokenMobile) && user.fcmTokenMobile.length) tokens = tokens.concat(user.fcmTokenMobile);
  const uniqueTokens = [...new Set(tokens)];
  if (!uniqueTokens.length) return null;
  const res = await sendPushNotification(uniqueTokens, payload);
  return res;
}

export async function sendNotificationToVendor(vendorId, payload, includeMobile = true) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) return null;
  let tokens = [];
  if (Array.isArray(vendor.fcmTokens) && vendor.fcmTokens.length) tokens = tokens.concat(vendor.fcmTokens);
  if (includeMobile && Array.isArray(vendor.fcmTokenMobile) && vendor.fcmTokenMobile.length) tokens = tokens.concat(vendor.fcmTokenMobile);
  const uniqueTokens = [...new Set(tokens)];
  if (!uniqueTokens.length) return null;
  const res = await sendPushNotification(uniqueTokens, payload);
  return res;
}

export async function sendNotificationToAdmin(adminId, payload, includeMobile = true) {
  const adminDoc = await Admin.findById(adminId).lean();
  if (!adminDoc) return null;
  let tokens = [];
  if (Array.isArray(adminDoc.fcmTokens) && adminDoc.fcmTokens.length) tokens = tokens.concat(adminDoc.fcmTokens);
  if (includeMobile && Array.isArray(adminDoc.fcmTokenMobile) && adminDoc.fcmTokenMobile.length) tokens = tokens.concat(adminDoc.fcmTokenMobile);
  const uniqueTokens = [...new Set(tokens)];
  if (!uniqueTokens.length) return null;
  const res = await sendPushNotification(uniqueTokens, payload);
  return res;
}

