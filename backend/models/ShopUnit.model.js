import mongoose from 'mongoose';

const shopUnitSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Shop Name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },

        companyName: {
            type: String,
            trim: true,
        },
        accountDetails: {
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true },
            bankName: { type: String, trim: true },
            accountHolderName: { type: String, trim: true }
        },
        zoneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Zone',
            default: null
        },
        deliveryZones: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Zone'
        }],
        mapUrl: {
            type: String,
            trim: true,
            default: null,
        },
        images: [String],
        imagesPublicIds: [String],
        minPrice: {
            type: Number,
            min: 0,
        },
        maxPrice: {
            type: Number,
            min: 0,
        },
        details: [
            {
                name: String,
                post: String,
                mobile: String,
                identityDocumentUrl: String,
                identityDocumentPublicId: String,
            }
        ],
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

shopUnitSchema.index({ vendorId: 1 }, { unique: true });

export default mongoose.model('ShopUnit', shopUnitSchema);
