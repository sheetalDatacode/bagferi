import mongoose from 'mongoose';

const b2bSettingsSchema = new mongoose.Schema(
    {
        defaultEnquiryPrice: {
            type: Number,
            default: 1,
            min: 0
        },
        enableVideoFileUpload: {
            type: Boolean,
            default: true
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    },
    {
        timestamps: true
    }
);

const B2BSettings = mongoose.model('B2BSettings', b2bSettingsSchema);

export default B2BSettings;
