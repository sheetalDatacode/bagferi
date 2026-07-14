import mongoose from 'mongoose';

const jobCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        subcategories: [
            {
                type: String,
                trim: true,
            }
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

const JobCategory = mongoose.model('JobCategory', jobCategorySchema);

export default JobCategory;
