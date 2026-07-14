import mongoose from 'mongoose';

const vendorPropertySubscriptionSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
            unique: true,
        },
        businessTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BusinessType',
            required: true,
        },
        maxProperties: {
            type: Number,
            default: 10,
        },
        maxImagesPerProperty: {
            type: Number,
            default: 5,
        },
        expiryDate: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

const VendorPropertySubscription = mongoose.model('VendorPropertySubscription', vendorPropertySubscriptionSchema);

export default VendorPropertySubscription;
