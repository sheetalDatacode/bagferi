const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/dealing_india')
  .then(async () => {
    const User = mongoose.connection.collection('users');
    const users = await User.find({ phone: { $regex: '1234567890' } }).toArray();
    console.log(JSON.stringify(users.map(u => ({id: u._id, name: u.name, phone: u.phone, email: u.email})), null, 2));
    process.exit(0);
  });
