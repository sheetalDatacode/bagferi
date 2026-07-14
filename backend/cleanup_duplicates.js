const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dealing-india')
  .then(async () => {
    console.log('Connected to MongoDB');
    const User = mongoose.connection.collection('users');
    
    // Find users with the test phone number variations
    const targetNumbers = ['1234567890', '+911234567890'];
    
    const users = await User.find({ phone: { $in: targetNumbers } }).toArray();
    console.log(`Found ${users.length} users with test phone numbers:`);
    
    for (const u of users) {
        console.log(`- ${u.name} (Email: ${u.email}, Phone: ${u.phone}, Role: ${u.role}, ID: ${u._id})`);
    }

    console.log('\nStarting cleanup...');
    let deletedCount = 0;
    
    // Delete legacy duplicate test accounts based on the prompt ("Ram krishna", "Manju Patel")
    for (const u of users) {
        if (u.name === 'Ram krishna' || u.name === 'Manju Patel' || u.email.includes('sheetal.datacode@gmail.com') || u.email.includes('vishalpatel')) {
            await User.deleteOne({ _id: u._id });
            console.log(`Deleted test account: ${u.name} (${u.email})`);
            deletedCount++;
        }
    }
    
    console.log(`\nCleanup complete. Deleted ${deletedCount} test accounts.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
