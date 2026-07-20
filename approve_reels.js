const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bagferi').then(async () => {
  const Reel = require('./backend/models/Reel.model.js').default;
  const result = await Reel.updateMany({ status: 'pending' }, { $set: { status: 'approved' } });
  console.log(`Approved ${result.modifiedCount} reels.`);
  mongoose.disconnect();
});
