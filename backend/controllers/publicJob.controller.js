import Job from '../models/Job.model.js';
import JobCategory from '../models/JobCategory.model.js';
import Vendor from '../models/Vendor.model.js';

export const getPublicJobs = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, subCategory, city } = req.query;
        
        const query = { isDeleted: false, isActive: true };
        
        if (search) {
            query.$or = [
                { jobTitle: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category) {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
        
        if (subCategory) {
            query.subCategory = { $regex: new RegExp(`^${subCategory}$`, 'i') };
        }
        
        if (city) {
            query.city = { $regex: new RegExp(`^${city}$`, 'i') };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const jobs = await Job.find(query)
            .populate('vendorId', 'name storeName businessName phone email profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Filter out jobs where the vendor is deleted or missing
        const validJobs = jobs.filter(job => job.vendorId);

        const total = await Job.countDocuments(query);

        res.status(200).json({
            success: true,
            data: validJobs,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching public jobs:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getJobCategories = async (req, res) => {
    try {
        const categories = await JobCategory.find({ isActive: true }).sort({ order: 1, name: 1 });
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching public job categories:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
