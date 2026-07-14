import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const B2BSubscriptionPlanSchema = new mongoose.Schema({
    name: String,
    features: [String]
}, { timestamps: true });

const B2BSubscriptionPlan = mongoose.model('B2BSubscriptionPlan', B2BSubscriptionPlanSchema);

async function updatePlans() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update Normal Plan
        const normalPlan = await B2BSubscriptionPlan.findOneAndUpdate(
            { name: "Normal Plan" },
            {
                features: [
                    "Product Listing",
                    "Lot Slot Listing",
                    "Gray broker",
                    "Other broker",
                    "Jobwork",
                    "Stitching unit",
                    "Support service"
                ]
            },
            { new: true }
        );
        console.log('Updated Normal Plan:', normalPlan ? 'Success' : 'Not Found');

        // Update Gold Plan
        const goldPlan = await B2BSubscriptionPlan.findOneAndUpdate(
            { name: "Gold Plan" },
            {
                features: [
                    "Product Listing",
                    "Lot Slot Listing",
                    "Mill",
                    "Yarn",
                    "Weaver"
                ]
            },
            { new: true }
        );
        console.log('Updated Gold Plan:', goldPlan ? 'Success' : 'Not Found');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

updatePlans();
