import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Zone Name is required'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            default: 'Surat',
            trim: true,
        },
        pincodes: [
            {
                code: {
                    type: String,
                    required: [true, 'Pincode is required'],
                    trim: true,
                },
                areas: [
                    {
                        name: {
                            type: String,
                            required: [true, 'Area is required'],
                            trim: true,
                        }
                    }
                ]
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

// Index to ensure we can quickly query active zones by city/pincode
zoneSchema.index({ city: 1, 'pincodes.code': 1, isActive: 1 });
zoneSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Zone', zoneSchema);
