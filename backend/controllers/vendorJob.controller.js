import Job from '../models/Job.model.js';
import Vendor from '../models/Vendor.model.js';

export const createJob = async (req, res) => {
    try {
        const vendorId = req.user.vendorId || req.user.id;
        const { jobTitle, category, subCategory, experience, salaryMin, salaryMax, city, vacancyCount } = req.body;

        if (!jobTitle || !category || !subCategory || !experience || !city) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (salaryMin === undefined || salaryMax === undefined || salaryMin < 0 || salaryMax <= salaryMin) {
            return res.status(400).json({ success: false, message: 'Invalid salary range' });
        }

        if (vacancyCount === undefined || vacancyCount < 1) {
            return res.status(400).json({ success: false, message: 'Invalid vacancy count' });
        }

        const { default: subscriptionRulesService } = await import('../services/subscriptionRules.service.js');
        const canCreate = await subscriptionRulesService.canCreateJob(vendorId);
        
        if (!canCreate.allowed) {
            return res.status(403).json({ success: false, message: canCreate.message });
        }

        const job = await Job.create({
            vendorId,
            jobTitle,
            category,
            subCategory,
            experience,
            salaryMin,
            salaryMax,
            city,
            vacancyCount,
            isActive: true, // Default to true, admin can hide it
            isDeleted: false
        });

        if (canCreate.useAddon) {
            const { default: vendorAddonService } = await import('../services/vendorAddon.service.js');
            await vendorAddonService.consumeAddonUnit(vendorId, 'jobs');
        }

        res.status(201).json({ success: true, message: 'Job created successfully', data: job });
    } catch (error) {
        console.error('Error creating vendor job:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getMyJobs = async (req, res) => {
    try {
        const vendorId = req.user.vendorId || req.user.id;
        const jobs = await Job.find({ vendorId, isDeleted: false }).sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        console.error('Error fetching vendor jobs:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const updateJob = async (req, res) => {
    try {
        const vendorId = req.user.vendorId || req.user.id;
        const { id } = req.params;
        const { jobTitle, category, subCategory, experience, salaryMin, salaryMax, city, vacancyCount } = req.body;

        const job = await Job.findOne({ _id: id, vendorId, isDeleted: false });
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (salaryMin !== undefined && salaryMax !== undefined && (salaryMin < 0 || salaryMax <= salaryMin)) {
            return res.status(400).json({ success: false, message: 'Invalid salary range' });
        }

        if (vacancyCount !== undefined && vacancyCount < 1) {
            return res.status(400).json({ success: false, message: 'Invalid vacancy count' });
        }

        if (jobTitle) job.jobTitle = jobTitle;
        if (category) job.category = category;
        if (subCategory) job.subCategory = subCategory;
        if (experience) job.experience = experience;
        if (salaryMin !== undefined) job.salaryMin = salaryMin;
        if (salaryMax !== undefined) job.salaryMax = salaryMax;
        if (city) job.city = city;
        if (vacancyCount !== undefined) job.vacancyCount = vacancyCount;

        await job.save();

        res.status(200).json({ success: true, message: 'Job updated successfully', data: job });
    } catch (error) {
        console.error('Error updating vendor job:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const vendorId = req.user.vendorId || req.user.id;
        const { id } = req.params;

        const job = await Job.findOne({ _id: id, vendorId });
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        job.isDeleted = true;
        await job.save();

        res.status(200).json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor job:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
