import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiCheckCircle, FiXCircle, FiBriefcase, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

const AdminJobListings = () => {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, inactiveJobs: 0, thisMonthJobs: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ search: '', status: '', category: '', subCategory: '' });
    const [categories, setCategories] = useState([]);
    
    const [toggleModalOpen, setToggleModalOpen] = useState(false);
    const [jobToToggle, setJobToToggle] = useState(null);

    useEffect(() => {
        fetchStats();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [page, filters.status, filters.category, filters.subCategory]);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchJobs();
            else setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.search]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/jobs/stats');
            if (res.success) setStats(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/admin/job-categories');
            if (res.success) setCategories(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                page,
                limit: 10,
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.category && { category: filters.category }),
                ...(filters.subCategory && { subCategory: filters.subCategory })
            });

            const res = await api.get(`/admin/jobs?${query.toString()}`);
            if (res.success) {
                setJobs(res.data);
                setTotalPages(res.pagination.pages);
            }
        } catch (error) {
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async () => {
        if (!jobToToggle) return;
        try {
            const res = await api.patch(`/admin/jobs/${jobToToggle._id}/toggle`);
            if (res.success) {
                toast.success('Job visibility updated');
                fetchJobs();
                fetchStats();
            }
        } catch (error) {
            toast.error('Failed to update job');
        } finally {
            setToggleModalOpen(false);
            setJobToToggle(null);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Job Listings</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage vendor job postings</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Jobs', value: stats.totalJobs, color: 'blue' },
                    { label: 'Active', value: stats.activeJobs, color: 'green' },
                    { label: 'Hidden', value: stats.inactiveJobs, color: 'red' },
                    { label: 'New This Month', value: stats.thisMonthJobs, color: 'purple' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-2xl font-black mt-1 text-${stat.color}-600`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                </div>
                <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value, subCategory: '' })}
                    className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 outline-none uppercase tracking-wider"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                
                {filters.category && (
                    <select
                        value={filters.subCategory}
                        onChange={(e) => setFilters({ ...filters, subCategory: e.target.value })}
                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 outline-none uppercase tracking-wider"
                    >
                        <option value="">All Roles</option>
                        {categories.find(c => c.name === filters.category)?.subcategories.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                )}
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 outline-none uppercase tracking-wider"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Hidden</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-100">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Job Role</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Vendor</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Details</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No jobs found</td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job._id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800 text-sm">{job.jobTitle}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md uppercase">{job.category}</span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{job.subCategory}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {job.vendorId ? (
                                                <>
                                                    <p className="font-bold text-slate-800 text-xs">{job.vendorId.storeName || job.vendorId.businessName || job.vendorId.name}</p>
                                                    <p className="text-[10px] text-slate-500">{job.vendorId.phone}</p>
                                                </>
                                            ) : (
                                                <span className="text-xs text-red-500 font-bold italic">Vendor Deleted</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1"><FiMapPin size={10} className="text-slate-400" /> {job.city}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">₹{job.salaryMin} - ₹{job.salaryMax} / mo • Vacancy: {job.vacancyCount}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${job.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {job.isActive ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                                                {job.isActive ? 'Active' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => { setJobToToggle(job); setToggleModalOpen(true); }}
                                                className={`p-2 rounded-lg transition-colors ${job.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={job.isActive ? 'Hide Job' : 'Show Job'}
                                            >
                                                {job.isActive ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex justify-center">
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={toggleModalOpen}
                onClose={() => setToggleModalOpen(false)}
                onConfirm={handleToggleVisibility}
                title={jobToToggle?.isActive ? "Hide Job Listing" : "Activate Job Listing"}
                message={`Are you sure you want to ${jobToToggle?.isActive ? 'hide' : 'activate'} "${jobToToggle?.jobTitle}"? ${jobToToggle?.isActive ? 'It will no longer appear on the user app.' : 'It will become visible to users again.'}`}
                confirmText={jobToToggle?.isActive ? "Yes, Hide" : "Yes, Activate"}
                type={jobToToggle?.isActive ? "danger" : "primary"}
            />
        </div>
    );
};

export default AdminJobListings;
