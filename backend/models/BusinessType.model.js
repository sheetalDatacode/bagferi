import mongoose from 'mongoose';

const businessTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Business type name is required'],
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const BusinessType = mongoose.model('BusinessType', businessTypeSchema);

export default BusinessType;
