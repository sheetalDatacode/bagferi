import VendorSubscription from '../models/VendorSubscription.model.js';

export const logSubscriptionChange = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
      if (data.success && data.data?._id) {
        const subscriptionId = data.data._id;
        const performedBy = req.user?._id || req.admin?._id;
        
        VendorSubscription.findByIdAndUpdate(subscriptionId, {
          $push: {
            auditLogs: {
              action,
              performedBy,
              details: req.body,
              timestamp: new Date()
            }
          }
        }).catch(err => console.error('Audit log failed:', err));
      }
      return originalJson.call(this, data);
    };
    next();
  };
};
