import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const B2BSubscriptionPlanSchema = new mongoose.Schema({
    name: String,
    duration: Number,
    price: Number,
    features: [String],
    isActive: Boolean
});

const B2BSubscriptionPlan = mongoose.model('B2BSubscriptionPlan', B2BSubscriptionPlanSchema);

async function checkPlans() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const plans = await B2BSubscriptionPlan.find({});
        console.log('Existing Plans:', JSON.stringify(plans, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPlans();
