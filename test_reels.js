const mongoose = require('mongoose');
const Reel = require('./backend/models/Reel.model.js').default;

mongoose.connect('mongodb://localhost:27017/bagferi').then(async () => {
  const reels = await Reel.find({});
  console.log('Total reels:', reels.length);
  
  const vendorIds = [...new Set(reels.map(r => r.uploaderId))];
  console.log('Vendor IDs:', vendorIds);
  
  const Vendor = require('./backend/models/Vendor.model.js').default;
  const vendors = await Vendor.find({ _id: { $in: vendorIds } });
  console.log('Found vendors:', vendors.map(v => v.status));
  
  mongoose.disconnect();
}).catch(console.error);
