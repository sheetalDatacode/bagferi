import Job from '../models/Job.model.js';
import Vendor from '../models/Vendor.model.js';

export const getAllJobs = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, subCategory, status, city } = req.query;
        
        const query = { isDeleted: false };
        
        if (search) {
            query.jobTitle = { $regex: search, $options: 'i' };
        }
        
        if (category) {
            query.category = category;
        }
        
        if (subCategory) {
            query.subCategory = subCategory;
        }
        
        if (city) {
            query.city = { $regex: new RegExp(`^${city}$`, 'i') };
        }
        
        if (status !== undefined && status !== '') {
            query.isActive = status === 'active' ? true : false;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const jobs = await Job.find(query)
            .populate('vendorId', 'name storeName businessName phone email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Job.countDocuments(query);

        res.status(200).json({
            success: true,
            data: jobs,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching admin jobs:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const toggleJobVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findById(id);
        
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        
        job.isActive = !job.isActive;
        await job.save();
        
        res.status(200).json({ success: true, message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`, data: job });
    } catch (error) {
        console.error('Error toggling job visibility:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getJobStats = async (req, res) => {
    try {
        const totalJobs = await Job.countDocuments({ isDeleted: false });
        const activeJobs = await Job.countDocuments({ isDeleted: false, isActive: true });
        const inactiveJobs = await Job.countDocuments({ isDeleted: false, isActive: false });
        
        // Jobs this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const thisMonthJobs = await Job.countDocuments({ isDeleted: false, createdAt: { $gte: startOfMonth } });

        res.status(200).json({
            success: true,
            data: {
                totalJobs,
                activeJobs,
                inactiveJobs,
                thisMonthJobs
            }
        });
    } catch (error) {
        console.error('Error fetching job stats:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
