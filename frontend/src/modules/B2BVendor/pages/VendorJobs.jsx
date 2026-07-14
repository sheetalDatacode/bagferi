import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMapPin, FiBriefcase, FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import ConfirmModal from '../../Admin/components/ConfirmModal';
import { useSubscriptionStore } from '../store/subscriptionStore';
import SubscriptionGate from '../components/SubscriptionGate';
import QuotaBanner from '../components/QuotaBanner';

const VendorJobs = () => {
    const { fetchStatus, canCreateJob, refreshStatus } = useSubscriptionStore();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [search, setSearch] = useState('');

    const initialFormState = {
        jobTitle: '',
        category: '',
        subCategory: '',
        experienceType: 'fresher',
        experienceValue: '',
        salaryMin: '',
        salaryMax: '',
        city: '',
        vacancyCount: 1
    };

    const [formData, setFormData] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchStatus();
        fetchJobs();
        fetchCategories();
    }, []);

    useEffect(() => {
        let touchStart = 0;
        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                touchStart = e.touches[0].clientY;
            } else {
                touchStart = 0;
            }
        };
        const handleTouchMove = async (e) => {
            if (touchStart === 0) return;
            const touchMove = e.touches[0].clientY;
            const distance = touchMove - touchStart;
            if (distance > 150) {
                touchStart = 0; // Reset
                toast.loading('Refreshing jobs list...', { id: 'pull-refresh' });
                try {
                    await Promise.all([fetchJobs(), refreshStatus()]);
                    toast.success('Refreshed successfully', { id: 'pull-refresh' });
                } catch (err) {
                    toast.error('Failed to refresh', { id: 'pull-refresh' });
                }
            }
        };
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendor/jobs');
            if (res.success) {
                setJobs(res.data);
            }
        } catch (error) {
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/jobs/categories');
            if (res.success) {
                setCategories(res.data);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.jobTitle.trim() || !/^[a-zA-Z\s]{3,50}$/.test(formData.jobTitle.trim())) {
            newErrors.jobTitle = 'Job title must contain only letters/spaces and be 3 to 50 characters';
        }
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.subCategory) newErrors.subCategory = 'Sub category is required';
        
        if (formData.experienceType !== 'fresher') {
            if (!formData.experienceValue || parseInt(formData.experienceValue) <= 0) {
                newErrors.experienceValue = 'Experience is required and must be > 0';
            }
        }

        const sMin = parseInt(formData.salaryMin);
        const sMax = parseInt(formData.salaryMax);
        if (isNaN(sMin) || sMin < 0) newErrors.salaryMin = 'Valid minimum salary is required';
        if (isNaN(sMax) || sMax <= sMin) newErrors.salaryMax = 'Maximum salary must be greater than minimum';
        
        if (!formData.city.trim() || !/^[a-zA-Z\s]{1,50}$/.test(formData.city.trim())) {
            newErrors.city = 'City must contain only letters/spaces and be up to 50 characters';
        }
        
        const vCount = parseInt(formData.vacancyCount);
        if (isNaN(vCount) || vCount < 1) newErrors.vacancyCount = 'Vacancy count must be at least 1';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!validateForm()) return;

        const payload = {
            jobTitle: formData.jobTitle.trim(),
            category: formData.category,
            subCategory: formData.subCategory,
            experience: {
                type: formData.experienceType,
                value: formData.experienceType === 'fresher' ? 0 : parseInt(formData.experienceValue)
            },
            salaryMin: parseInt(formData.salaryMin),
            salaryMax: parseInt(formData.salaryMax),
            city: formData.city.trim(),
            vacancyCount: parseInt(formData.vacancyCount)
        };

        try {
            setSubmitting(true);
            if (editingId) {
                const res = await api.put(`/vendor/jobs/${editingId}`, payload);
                if (res.success) toast.success('Job updated successfully');
            } else {
                const res = await api.post('/vendor/jobs', payload);
                if (res.success) {
                    toast.success('Job created successfully');
                    refreshStatus(); // Refresh subscription limits
                }
            }
            closeModal();
            fetchJobs();
        } catch (error) {
            toast.error(error.message || 'Failed to save job');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!jobToDelete) return;
        try {
            const res = await api.delete(`/vendor/jobs/${jobToDelete}`);
            if (res.success) {
                toast.success('Job deleted successfully');
                fetchJobs();
            }
        } catch (error) {
            toast.error('Failed to delete job');
        } finally {
            setDeleteModalOpen(false);
            setJobToDelete(null);
        }
    };

    const openModal = (job = null) => {
        if (job) {
            setEditingId(job._id);
            setFormData({
                jobTitle: job.jobTitle,
                category: job.category,
                subCategory: job.subCategory,
                experienceType: job.experience.type,
                experienceValue: job.experience.value || '',
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                city: job.city,
                vacancyCount: job.vacancyCount
            });
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(initialFormState);
        setErrors({});
    };

    const activeCategory = categories.find(c => c.name === formData.category);
    const filteredJobs = jobs.filter(job => 
        job.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
        job.category.toLowerCase().includes(search.toLowerCase()) ||
        job.subCategory.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Job Listings</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your job vacancies</p>
                </div>
                <SubscriptionGate action="jobs">
                    <button
                        onClick={() => openModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 w-full md:w-auto"
                    >
                        <FiPlus /> Post a Job
                    </button>
                </SubscriptionGate>
            </div>

            <QuotaBanner action="jobs" />

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 md:p-6 space-y-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <FiBriefcase className="mx-auto text-4xl text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No jobs found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredJobs.map(job => (
                            <motion.div key={job._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-md transition-shadow relative group">
                                {!job.isActive && (
                                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-10">
                                        Hidden by Admin
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div className={`min-w-0 flex-1 ${!job.isActive ? 'opacity-60' : ''}`}>
                                        <h3 className="font-bold text-slate-800 break-words line-clamp-2">{job.jobTitle}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">{job.category}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{job.subCategory}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => openModal(job)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><FiEdit2 size={14}/></button>
                                        <button onClick={() => { setJobToDelete(job._id); setDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><FiTrash2 size={14}/></button>
                                    </div>
                                </div>
                                
                                <div className={`grid grid-cols-2 gap-y-2 gap-x-4 mt-4 pt-4 border-t border-slate-50 ${!job.isActive ? 'opacity-60' : ''}`}>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Salary</p>
                                        <p className="text-xs font-semibold text-slate-700">₹{job.salaryMin} - ₹{job.salaryMax}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                        <p className="text-xs font-semibold text-slate-700 capitalize">
                                            {job.experience.type === 'fresher' ? 'Fresher' : `${job.experience.value} ${job.experience.type}`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">City</p>
                                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><FiMapPin size={10}/> {job.city}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vacancies</p>
                                        <p className="text-xs font-semibold text-slate-700">{job.vacancyCount}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-6 pt-7 sm:pt-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Edit Job' : 'Post New Job'}</h2>
                                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><FiX size={20}/></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Job Title *</label>
                                    <input 
                                        type="text" 
                                        value={formData.jobTitle} 
                                        maxLength={50} 
                                        onChange={e => setFormData({...formData, jobTitle: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} 
                                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${errors.jobTitle ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-primary-500'}`} 
                                        placeholder="e.g. Sales Executive" 
                                    />
                                    {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Category *</label>
                                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subCategory: ''})} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${errors.category ? 'border-red-300' : 'border-slate-200'}`}>
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sub Category *</label>
                                        <select value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} disabled={!formData.category} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors ${errors.subCategory ? 'border-red-300' : 'border-slate-200'}`}>
                                            <option value="">Select Role</option>
                                            {activeCategory?.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        {errors.subCategory && <p className="text-red-500 text-xs mt-1">{errors.subCategory}</p>}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Experience *</label>
                                    <div className="flex gap-4">
                                        {['fresher', 'months', 'years'].map(type => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="expType" checked={formData.experienceType === type} onChange={() => setFormData({...formData, experienceType: type, experienceValue: type === 'fresher' ? '' : formData.experienceValue})} className="text-primary-600 focus:ring-primary-500" />
                                                <span className="text-sm font-semibold text-slate-700 capitalize">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.experienceType !== 'fresher' && (
                                        <div>
                                            <input type="number" min="1" value={formData.experienceValue} onChange={e => setFormData({...formData, experienceValue: e.target.value})} placeholder={`Number of ${formData.experienceType}`} className={`w-full md:w-1/2 px-4 py-3 rounded-xl border text-sm font-medium outline-none ${errors.experienceValue ? 'border-red-300' : 'border-slate-200'}`} />
                                            {errors.experienceValue && <p className="text-red-500 text-xs mt-1">{errors.experienceValue}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Min Salary (₹/mo) *</label>
                                        <input type="number" min="0" value={formData.salaryMin} onChange={e => setFormData({...formData, salaryMin: e.target.value})} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none ${errors.salaryMin ? 'border-red-300' : 'border-slate-200'}`} />
                                        {errors.salaryMin && <p className="text-red-500 text-xs mt-1">{errors.salaryMin}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max Salary (₹/mo) *</label>
                                        <input type="number" min="0" value={formData.salaryMax} onChange={e => setFormData({...formData, salaryMax: e.target.value})} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none ${errors.salaryMax ? 'border-red-300' : 'border-slate-200'}`} />
                                        {errors.salaryMax && <p className="text-red-500 text-xs mt-1">{errors.salaryMax}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">City *</label>
                                        <input 
                                            type="text" 
                                            value={formData.city} 
                                            maxLength={50} 
                                            onChange={e => setFormData({...formData, city: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} 
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none ${errors.city ? 'border-red-300' : 'border-slate-200'}`} 
                                            placeholder="e.g. Mumbai" 
                                        />
                                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Vacancies *</label>
                                        <input type="number" min="1" value={formData.vacancyCount} onChange={e => setFormData({...formData, vacancyCount: e.target.value})} className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none ${errors.vacancyCount ? 'border-red-300' : 'border-slate-200'}`} />
                                        {errors.vacancyCount && <p className="text-red-500 text-xs mt-1">{errors.vacancyCount}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancel</button>
                                <button 
                                    type="button" 
                                    onClick={handleSubmit} 
                                    disabled={submitting} 
                                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <FiRefreshCw className="animate-spin" />
                                            {editingId ? 'Updating...' : 'Posting...'}
                                        </>
                                    ) : (
                                        editingId ? 'Update Job' : 'Post Job'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Job"
                message="Are you sure you want to delete this job posting? This cannot be undone."
                confirmText="Yes, Delete"
                type="danger"
            />
        </div>
    );
};

export default VendorJobs;
