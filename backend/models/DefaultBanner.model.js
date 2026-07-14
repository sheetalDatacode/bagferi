import mongoose from 'mongoose';

const defaultBannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: '',
        },
        image: {
            type: String,
            required: [true, 'Banner image is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        bannerType: {
            type: String,
            enum: ['ADMIN_DEFAULT'],
            default: 'ADMIN_DEFAULT',
        },
    },
    {
        timestamps: true,
    }
);

// Index for performance
defaultBannerSchema.index({ isActive: 1 });

const DefaultBanner = mongoose.model('DefaultBanner', defaultBannerSchema);

export default DefaultBanner;
