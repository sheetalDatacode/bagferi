import mongoose from 'mongoose';

const secureDealSchema = new mongoose.Schema(
    {
        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'buyerModel',
        },
        buyerModel: {
            type: String,
            required: true,
            enum: ['User', 'Vendor'],
            default: 'User',
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        productName: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        pricePerUnit: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        transport: {
            type: String,
            required: true,
        },
        station: {
            type: String,
            required: true,
        },
        selectionOption: {
            type: String,
            enum: ['min_order', 'full_payment'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
        document: {
            type: String, // URL to the uploaded PDF/Invoice
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('SecureDeal', secureDealSchema);
