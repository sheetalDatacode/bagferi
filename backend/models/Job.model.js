import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        jobTitle: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        subCategory: {
            type: String,
            required: true,
            trim: true,
        },
        experience: {
            type: {
                type: String,
                enum: ['fresher', 'months', 'years'],
                required: true,
            },
            value: {
                type: Number,
                min: 0,
                default: 0,
            }
        },
        salaryMin: {
            type: Number,
            required: true,
            min: 0,
        },
        salaryMax: {
            type: Number,
            required: true,
            min: 0,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        vacancyCount: {
            type: Number,
            required: true,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

const Job = mongoose.model('Job', jobSchema);

export default Job;
