import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bagferi';
    await mongoose.connect(uri);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collection = db.collection('brands');
    
    console.log('Listing indexes before drop:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    const indexName = 'type_1_categories_1_subcategories_1';
    const indexExists = indexes.some(idx => idx.name === indexName);
    if (indexExists) {
      console.log(`Dropping index ${indexName}...`);
      await collection.dropIndex(indexName);
      console.log('Index dropped successfully!');
    } else {
      console.log(`Index ${indexName} not found.`);
    }

    console.log('Listing indexes after drop:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
