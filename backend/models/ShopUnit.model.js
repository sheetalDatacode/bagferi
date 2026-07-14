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
        businessCategory: {
            type: String,
            trim: true,
            enum: ['Manufacturing', 'Exporter', 'Wholesaler', 'Semi wholesaler', 'Retailers', 'Trading', 'Traders', 'Agency', 'Supplier', 'Developer', 'Property'],
            default: null,
        },
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
