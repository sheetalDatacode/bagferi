import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

const router = express.Router();

// Global toggle to enable/disable FCM routes without deleting any code
// Now enabled so web/mobile tokens are saved again
const ENABLE_FCM = true;

router.use(authenticate);

router.post('/save', async (req, res) => {
  try {
    if (!ENABLE_FCM) {
      return res.status(503).json({ success: false, message: 'FCM is currently disabled' });
    }
    const { token, platform = 'web' } = req.body || {};
    console.log('[FCM] Save request received', {
      role: req.user?.role,
      platform,
      tokenPreview: typeof token === 'string' ? token.slice(0, 12) : null
    });
    if (!token) return res.status(400).json({ success: false, message: 'token required' });
    const role = req.user?.role;
    let doc;
    if (role === 'user') {
      doc = await User.findById(req.user.id);
      if (!doc) return res.status(404).json({ success: false, message: 'User not found' });
      if (platform === 'web') {
        doc.fcmTokens = Array.isArray(doc.fcmTokens) ? doc.fcmTokens : [];
        if (!doc.fcmTokens.includes(token)) {
          doc.fcmTokens.push(token);
          if (doc.fcmTokens.length > 10) doc.fcmTokens = doc.fcmTokens.slice(-10);
        }
      } else {
        doc.fcmTokenMobile = Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile : [];
        if (!doc.fcmTokenMobile.includes(token)) {
          doc.fcmTokenMobile.push(token);
          if (doc.fcmTokenMobile.length > 10) doc.fcmTokenMobile = doc.fcmTokenMobile.slice(-10);
        }
      }
      await doc.save();
      console.log('[FCM] User tokens updated', {
        userId: req.user.id,
        webCount: Array.isArray(doc.fcmTokens) ? doc.fcmTokens.length : 0,
        mobileCount: Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile.length : 0
      });
    } else if (role === 'vendor') {
      const vendorId = req.user.vendorId;
      doc = await Vendor.findById(vendorId);
      if (!doc) return res.status(404).json({ success: false, message: 'Vendor not found' });
      if (platform === 'web') {
        doc.fcmTokens = Array.isArray(doc.fcmTokens) ? doc.fcmTokens : [];
        if (!doc.fcmTokens.includes(token)) {
          doc.fcmTokens.push(token);
          if (doc.fcmTokens.length > 10) doc.fcmTokens = doc.fcmTokens.slice(-10);
        }
      } else {
        doc.fcmTokenMobile = Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile : [];
        if (!doc.fcmTokenMobile.includes(token)) {
          doc.fcmTokenMobile.push(token);
          if (doc.fcmTokenMobile.length > 10) doc.fcmTokenMobile = doc.fcmTokenMobile.slice(-10);
        }
      }
      await doc.save();
      console.log('[FCM] Vendor tokens updated', {
        vendorId,
        webCount: Array.isArray(doc.fcmTokens) ? doc.fcmTokens.length : 0,
        mobileCount: Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile.length : 0
      });
    } else if (role === 'admin' || role === 'superadmin') {
      const adminId = req.user.adminId || req.user.id;
      doc = await Admin.findById(adminId);
      if (!doc) return res.status(404).json({ success: false, message: 'Admin not found' });
      if (platform === 'web') {
        doc.fcmTokens = Array.isArray(doc.fcmTokens) ? doc.fcmTokens : [];
        if (!doc.fcmTokens.includes(token)) {
          doc.fcmTokens.push(token);
          if (doc.fcmTokens.length > 10) doc.fcmTokens = doc.fcmTokens.slice(-10);
        }
      } else {
        doc.fcmTokenMobile = Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile : [];
        if (!doc.fcmTokenMobile.includes(token)) {
          doc.fcmTokenMobile.push(token);
          if (doc.fcmTokenMobile.length > 10) doc.fcmTokenMobile = doc.fcmTokenMobile.slice(-10);
        }
      }
      await doc.save();
      console.log('[FCM] Admin/Superadmin tokens updated', {
        adminId,
        webCount: Array.isArray(doc.fcmTokens) ? doc.fcmTokens.length : 0,
        mobileCount: Array.isArray(doc.fcmTokenMobile) ? doc.fcmTokenMobile.length : 0
      });
    } else {
      return res.status(403).json({ success: false, message: `Unsupported role: ${role}` });
    }
    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('[FCM] Save token error', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/remove', async (req, res) => {
  try {
    if (!ENABLE_FCM) {
      return res.status(503).json({ success: false, message: 'FCM is currently disabled' });
    }
    const { token, platform = 'web' } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'token required' });
    const role = req.user?.role;
    let doc;
    if (role === 'user') {
      doc = await User.findById(req.user.id);
      if (!doc) return res.status(404).json({ success: false, message: 'User not found' });
      if (platform === 'web') doc.fcmTokens = (doc.fcmTokens || []).filter(t => t !== token);
      else doc.fcmTokenMobile = (doc.fcmTokenMobile || []).filter(t => t !== token);
      await doc.save();
    } else if (role === 'vendor') {
      const vendorId = req.user.vendorId;
      doc = await Vendor.findById(vendorId);
      if (!doc) return res.status(404).json({ success: false, message: 'Vendor not found' });
      if (platform === 'web') doc.fcmTokens = (doc.fcmTokens || []).filter(t => t !== token);
      else doc.fcmTokenMobile = (doc.fcmTokenMobile || []).filter(t => t !== token);
      await doc.save();
    } else if (role === 'admin' || role === 'superadmin') {
      const adminId = req.user.adminId || req.user.id;
      doc = await Admin.findById(adminId);
      if (!doc) return res.status(404).json({ success: false, message: 'Admin not found' });
      if (platform === 'web') doc.fcmTokens = (doc.fcmTokens || []).filter(t => t !== token);
      else doc.fcmTokenMobile = (doc.fcmTokenMobile || []).filter(t => t !== token);
      await doc.save();
    } else {
      return res.status(403).json({ success: false, message: `Unsupported role: ${role}` });
    }
    res.json({ success: true, message: 'FCM token removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
