import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiMapPin, FiBriefcase, FiPhone, FiInfo, FiChevronLeft, FiExternalLink } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';
import { getWhatsAppUserDetailsSuffix } from '../../../shared/utils/helpers';
import { useAuthStore } from '../../../shared/store/authStore';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const JobsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    const [filters, setFilters] = useState({
        search: '',
        category: '',
        subCategory: '',
        city: ''
    });

    const [jobDerivedCities, setJobDerivedCities] = useState([]);

    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState('');
    const cityDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounce search
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [debouncedFilters]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/jobs/categories');
            if (res.success) setCategories(res.data);
        } catch (error) {
            console.error('Failed to load job categories:', error);
        }
    };

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (debouncedFilters.search) query.append('search', debouncedFilters.search);
            if (debouncedFilters.category) query.append('category', debouncedFilters.category);
            if (debouncedFilters.subCategory) query.append('subCategory', debouncedFilters.subCategory);
            if (debouncedFilters.city) query.append('city', debouncedFilters.city);

            // Getting more per page for standard browsing
            query.append('limit', 20);

            const res = await api.get(`/jobs?${query.toString()}`);
            if (res.success) {
                setJobs(res.data);

                // Extract cities from jobs
                const citiesSet = new Set();
                if (Array.isArray(res.data)) {
                    res.data.forEach(job => {
                        if (job.city && String(job.city).trim()) {
                            citiesSet.add(job.city.trim());
                        }
                    });
                }

                // Only update available cities list when no city filter is active
                // so the list doesn't collapse to 1 city when clicked
                if (!debouncedFilters.city && citiesSet.size > 0) {
                    setJobDerivedCities(Array.from(citiesSet).sort());
                }
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const activeCategory = categories.find(c => c.name === filters.category);

    const handleWhatsApp = (job) => {
        const vendor = job.vendorId;
        if (!vendor || !vendor.phone) return;

        let phone = vendor.phone.replace(/\D/g, "");
        if (!phone.startsWith("91") && phone.length === 10) phone = `91${phone}`;

        const lines = [
            `Hi ${vendor.storeName || vendor.businessName || vendor.name},`,
            `I'm interested in the *${job.jobTitle}* position listed on Dealing India.`,
            `Location: ${job.city}`,
            `Please let me know how I can apply.`,
        ];

        const userSuffix = getWhatsAppUserDetailsSuffix(user);
        if (userSuffix) lines.push('', userSuffix);

        const text = encodeURIComponent(lines.join('\n'));
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
    };

    const handleCall = (job) => {
        const vendor = job.vendorId;
        if (!vendor || !vendor.phone) return;
        window.location.href = `tel:${vendor.phone}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <B2BHeader />

            <main className="pb-32">
                {/* Mobile Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3 lg:hidden sticky top-[60px] z-20 shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-50 text-slate-600">
                        <FiChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">Job Board</h1>
                </div>

                <div className="max-w-7xl mx-auto p-4 md:p-6 relative z-20">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-8">

                        {/* Left Sidebar */}
                        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pr-1">
                            {/* Filters Card */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Filter Jobs</h2>
                                    {(filters.search || filters.category || filters.city || filters.subCategory) && (
                                        <button
                                            onClick={() => setFilters({ search: '', category: '', subCategory: '', city: '' })}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="relative">
                                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search jobs..."
                                            value={filters.search}
                                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                    </div>

                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value, subCategory: '' })}
                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 uppercase tracking-widest outline-none"
                                    >
                                        <option value="">All Industries</option>
                                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                    </select>

                                    <select
                                        value={filters.subCategory}
                                        onChange={(e) => setFilters({ ...filters, subCategory: e.target.value })}
                                        disabled={!filters.category}
                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 uppercase tracking-widest outline-none disabled:opacity-50"
                                    >
                                        <option value="">All Roles</option>
                                        {activeCategory?.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>

                                    <div className="relative" ref={cityDropdownRef}>
                                        <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                        <input
                                            type="text"
                                            placeholder="Search or select city..."
                                            value={isCityDropdownOpen ? citySearchTerm : filters.city}
                                            onChange={(e) => {
                                                setCitySearchTerm(e.target.value);
                                                setIsCityDropdownOpen(true);
                                                setFilters({ ...filters, city: e.target.value });
                                            }}
                                            onFocus={() => {
                                                setIsCityDropdownOpen(true);
                                                setCitySearchTerm('');
                                            }}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                        
                                        {isCityDropdownOpen && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 shadow-xl rounded-xl max-h-60 overflow-y-auto z-50 py-2">
                                                {jobDerivedCities.length > 0 ? (
                                                    <>
                                                        <div
                                                            className={`px-4 py-2 cursor-pointer text-sm font-medium hover:bg-primary-50 hover:text-primary-600 transition-colors ${!filters.city ? 'bg-primary-50 text-primary-600' : 'text-slate-600'}`}
                                                            onClick={() => {
                                                                setFilters({ ...filters, city: '' });
                                                                setCitySearchTerm('');
                                                                setIsCityDropdownOpen(false);
                                                            }}
                                                        >
                                                            All Cities
                                                        </div>
                                                        {jobDerivedCities
                                                            .filter(city => city.toLowerCase().includes(citySearchTerm.toLowerCase()))
                                                            .map((city, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`px-4 py-2 cursor-pointer text-sm font-medium hover:bg-primary-50 hover:text-primary-600 transition-colors ${filters.city === city ? 'bg-primary-50 text-primary-600' : 'text-slate-600'}`}
                                                                    onClick={() => {
                                                                        setFilters({ ...filters, city: city });
                                                                        setCitySearchTerm(city);
                                                                        setIsCityDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    {city}
                                                                </div>
                                                            ))}
                                                    </>
                                                ) : null}
                                                {jobDerivedCities.filter(city => city.toLowerCase().includes(citySearchTerm.toLowerCase())).length === 0 && (
                                                    <div className="px-4 py-3 text-sm text-slate-400 text-center">
                                                        {citySearchTerm ? `Press enter to search "${citySearchTerm}"` : "No cities available"}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick City Filters */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 md:p-6">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Top Cities</h2>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilters({ ...filters, city: '' })}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${!filters.city
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                            }`}
                                    >
                                        All Cities
                                    </button>
                                    {jobDerivedCities.map((city, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setFilters({ ...filters, city: city })}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${filters.city === city
                                                ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100'
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-primary-300 hover:text-primary-600 shadow-sm'
                                                }`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Right Content - Jobs Grid */}
                        <div className="flex-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
                            {loading ? (
                                <div className="flex justify-center p-12">
                                    <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center p-16 bg-white rounded-[2rem] border border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiBriefcase className="text-3xl text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight mb-2">No Jobs Found</h3>
                                    <p className="text-sm text-slate-500 font-medium">Try adjusting your search filters to find more opportunities.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {jobs.map((job) => (
                                        <motion.div
                                            key={job._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors">{job.jobTitle}</h3>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                            Firm - {job.vendorId?.storeName || job.vendorId?.businessName || job.vendorId?.name}
                                                        </p>
                                                        {job.vendorId?._id && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/b2b/vendor/${job.vendorId._id}`);
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all"
                                                            >
                                                                <FiExternalLink size={9} />
                                                                Visit Store
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-6">
                                                <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {job.category}
                                                </span>
                                                <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {job.subCategory}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                                                <div className="bg-slate-50 p-3 rounded-xl">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FiInfo /> Salary (₹)</p>
                                                    <p className="text-xs font-bold text-slate-700">{job.salaryMin} - {job.salaryMax}</p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FiBriefcase /> Exp</p>
                                                    <p className="text-xs font-bold text-slate-700 capitalize">
                                                        {job.experience.type === 'fresher' ? 'Fresher' : `${job.experience.value} ${job.experience.type}`}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FiMapPin /> Location</p>
                                                    <p className="text-xs font-bold text-slate-700 line-clamp-1">{job.city}</p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Openings</p>
                                                    <p className="text-xs font-bold text-slate-700">{job.vacancyCount} positions</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-auto">
                                                <button
                                                    onClick={() => handleCall(job)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-colors"
                                                >
                                                    <FiPhone className="text-base" /> Call
                                                </button>
                                                <button
                                                    onClick={() => handleWhatsApp(job)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-[#128C7E] transition-colors shadow-lg shadow-[#25D366]/30"
                                                >
                                                    <FaWhatsapp className="text-base" /> Apply
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default JobsPage;
