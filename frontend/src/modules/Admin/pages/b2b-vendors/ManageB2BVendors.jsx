import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiTrash2, FiEye, FiUser, FiToggleLeft, FiToggleRight, FiArrowUpRight, FiChevronDown, FiMapPin, FiX, FiUsers } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../components/DataTable";
import B2BVendorDetailModal from "./components/B2BVendorDetailModal";
import B2BVendorFollowersModal from "./components/B2BVendorFollowersModal";
import { useB2BVendorManagementStore } from "../../store/b2bVendorManagementStore";
import toast from "react-hot-toast";
import useDebounce from "../../../../shared/hooks/useDebounce";
import api from "../../../../shared/utils/api";

const ManageB2BVendors = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [selectedBusinessType, setSelectedBusinessType] = useState('All Types');
    const { b2bVendors, isLoading, fetchB2BVendors, deleteB2BVendor, toggleB2BVendorActive } = useB2BVendorManagementStore();
    const fetchedRef = useRef(false);

    // City Search Dropdown State
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState("");
    const cityDropdownRef = useRef(null);

    // Click outside to close city dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
                setIsCityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleApprove = async (id) => {
        if (!id) return;
        const toastId = toast.loading("Approving vendor...");
        try {
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
                status: 'approved'
            });

            if (response.success) {
                toast.success("B2B Vendor approved successfully!", { id: toastId });
                // Refresh list
                fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 1000,
                });
            } else {
                throw new Error(response.message || 'Failed to approve vendor');
            }
        } catch (error) {
            console.error('Error approving vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to approve vendor', { id: toastId });
        }
    };

    const handleReject = async (id) => {
        if (!id) return;
        const toastId = toast.loading("Rejecting vendor...");
        try {
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
                status: 'rejected'
            });

            if (response.success) {
                toast.success("B2B Vendor rejected successfully!", { id: toastId });
                // Refresh list
                fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 1000,
                });
            } else {
                throw new Error(response.message || 'Failed to reject vendor');
            }
        } catch (error) {
            console.error('Error rejecting vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to reject vendor', { id: toastId });
        }
    };

    useEffect(() => {
        const loadVendors = async () => {
            try {
                await fetchB2BVendors({
                    status: 'all',
                    search: debouncedSearchQuery,
                    page: 1,
                    limit: 1000,
                });
            } catch (error) {
                // Error toast is shown by API interceptor
            }
        };

        if (!fetchedRef.current || debouncedSearchQuery) {
            loadVendors();
            fetchedRef.current = true;
        }
    }, [debouncedSearchQuery, fetchB2BVendors]);

    const handleViewDetails = (vendor) => {
        setSelectedVendor(vendor);
        setIsModalOpen(true);
    };

    const handleViewFollowers = (vendor) => {
        setSelectedVendor(vendor);
        setIsFollowersModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this B2B vendor? This action cannot be undone.")) {
            return;
        }

        const toastId = toast.loading("Deleting vendor...");
        try {
            await deleteB2BVendor(id);
            toast.success("B2B Vendor deleted successfully", { id: toastId });
        } catch (error) {
            console.error('Error deleting vendor:', error);
            toast.error(error.message || "Failed to delete vendor", { id: toastId });
        }
    };

    const handleToggleActive = async (id) => {
        const toastId = toast.loading("Updating status...");
        try {
            const updated = await toggleB2BVendorActive(id);
            toast.success(`Vendor is now ${updated.isActive ? 'Active' : 'Inactive'}`, { id: toastId });
        } catch (error) {
            console.error('Error toggling active status:', error);
            toast.error(error.message || "Failed to update status", { id: toastId });
        }
    };

    const columns = [
        {
            key: "companyName",
            label: "Company",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">{val || row.storeName || row.name || 'N/A'}</p>
                        <Link
                            to={(row._id || row.id) ? `/admin/b2b-vendors/manage/${row._id || row.id}/dashboard` : '#'}
                            onClick={(e) => { e.stopPropagation(); if (!(row._id || row.id)) { e.preventDefault(); toast.error("Vendor ID missing"); } }}
                            className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1 group/link"
                        >
                            {row.name}
                            <FiArrowUpRight className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                    </div>
                </div>
            )
        },
        { key: "businessType", label: "Business Type" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", render: (val) => val || 'N/A' },
        {
            key: "status",
            label: "Status",
            render: (val, row) => (
                <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit border ${val === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        val === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>
                        {val || 'pending'}
                    </span>
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            )
        },
        {
            key: "followerCount",
            label: "Followers",
            render: (val, row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleViewFollowers(row); }}
                    className="flex items-center gap-1.5 font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg w-fit hover:bg-primary-100 transition-all border border-transparent hover:border-primary-200"
                    title="Click to view followers"
                >
                    <FiUsers className="text-xs" />
                    {val || 0}
                </button>
            )
        },
        { key: "products", label: "Products", render: (val) => val || 0 },
        {
            key: "joinDate",
            label: "Joined On",
            render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Full Details"
                    >
                        <FiEye />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(row._id || row.id); }}
                        className={`p-2 rounded-lg transition-colors ${row.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={row.isActive ? 'Mark Inactive' : 'Mark Active'}
                    >
                        {row.isActive ? <FiToggleRight className="text-xl" /> : <FiToggleLeft className="text-xl" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Vendor"
                    >
                        <FiTrash2 />
                    </button>
                </div>
            )
        }
    ];

    // Derive unique city and business type options from loaded vendors
    const cityOptions = useMemo(() => {
        const cityMap = new Map();
        b2bVendors.forEach((v) => {
            const city = (v.address?.city || '').trim();
            if (!city) return;

            const lower = city.toLowerCase();
            const normalized = (lower === 'aagra') ? 'agra' : lower;

            if (!cityMap.has(normalized)) {
                cityMap.set(normalized, normalized === 'agra' ? 'Agra' : city);
            }
        });
        return ['All Cities', ...Array.from(cityMap.values()).sort()];
    }, [b2bVendors]);

    const filteredCitiesList = useMemo(() => {
        return citySearchQuery
            ? cityOptions.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
            : cityOptions;
    }, [cityOptions, citySearchQuery]);

    const businessTypeOptions = useMemo(() => {
        const typeSet = new Set();
        b2bVendors.forEach((v) => {
            const bt = (v.businessType || v.businessTypeRef?.name || '').trim();
            if (bt && bt !== 'N/A') typeSet.add(bt);
        });
        return ['All Types', ...Array.from(typeSet).sort()];
    }, [b2bVendors]);

    // Filtered vendors based on city and business type
    const filteredVendors = useMemo(() => {
        return b2bVendors.filter((v) => {
            const city = (v.address?.city || '').trim();
            const bt = (v.businessType || v.businessTypeRef?.name || '').trim();

            const cityLower = city.toLowerCase();
            const selectedCityLower = selectedCity.toLowerCase();

            let cityMatch = selectedCity === 'All Cities';
            if (!cityMatch) {
                if (selectedCityLower === 'agra') {
                    cityMatch = (cityLower === 'agra' || cityLower === 'aagra');
                } else {
                    cityMatch = cityLower === selectedCityLower;
                }
            }

            const typeMatch = selectedBusinessType === 'All Types' || bt === selectedBusinessType;
            return cityMatch && typeMatch;
        });
    }, [b2bVendors, selectedCity, selectedBusinessType]);

    // Counts per business type within the currently selected city
    const businessTypeCounts = useMemo(() => {
        const counts = {};
        const cityScoped = b2bVendors.filter((v) => {
            const city = (v.address?.city || '').trim();
            const cityLower = city.toLowerCase();
            const selectedCityLower = selectedCity.toLowerCase();

            if (selectedCity === 'All Cities') return true;
            if (selectedCityLower === 'agra') return (cityLower === 'agra' || cityLower === 'aagra');
            return cityLower === selectedCityLower;
        });
        cityScoped.forEach((v) => {
            const bt = (v.businessType || v.businessTypeRef?.name || 'Unknown').trim() || 'Unknown';
            counts[bt] = (counts[bt] || 0) + 1;
        });
        return counts;
    }, [b2bVendors, selectedCity]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Search & Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
                <div className="relative w-full sm:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search B2B vendors..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-primary-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">

                    {/* Searchable City Dropdown */}
                    <div className="relative" ref={cityDropdownRef}>
                        <button
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-primary-500 transition-all min-w-[160px]"
                        >
                            <div className="flex items-center gap-2">
                                <FiMapPin className="text-primary-500" />
                                <span>{selectedCity}</span>
                            </div>
                            <FiChevronDown className={`transition-transform duration-200 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isCityDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search city..."
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                                                value={citySearchQuery}
                                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {filteredCitiesList.length > 0 ? (
                                            filteredCitiesList.map((city) => (
                                                <button
                                                    key={city}
                                                    onClick={() => {
                                                        setSelectedCity(city);
                                                        setIsCityDropdownOpen(false);
                                                        setCitySearchQuery('');
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-gray-50 ${selectedCity === city ? 'text-primary-600 bg-primary-50/30' : 'text-gray-600'}`}
                                                >
                                                    {city}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center text-xs text-gray-400">No cities found</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <select
                        value={selectedBusinessType}
                        onChange={(e) => setSelectedBusinessType(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {businessTypeOptions.map((bt) => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-gray-400 font-semibold uppercase tracking-widest">
                        {selectedCity === 'All Cities' ? 'All Cities' : selectedCity} – Summary
                    </span>
                    {Object.keys(businessTypeCounts).length > 0 ? (
                        Object.entries(businessTypeCounts).map(([type, count]) => (
                            <span
                                key={type}
                                className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-700 font-semibold"
                            >
                                {type}: {count}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400">No vendors for current filters.</span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading B2B vendors...</p>
                    </div>
                ) : filteredVendors.length > 0 ? (
                    <DataTable
                        data={filteredVendors}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                        onRowClick={(row) => {
                            const id = row._id || row.id;
                            if (id) {
                                navigate(`/admin/b2b-vendors/manage/${id}/dashboard`);
                            } else {
                                toast.error("Vendor ID missing");
                            }
                        }}
                    />
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No B2B vendors found</p>
                    </div>
                )}
            </div>

            <B2BVendorDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vendor={selectedVendor}
                onApprove={() => {
                    handleApprove(selectedVendor?._id || selectedVendor?.id);
                    setIsModalOpen(false);
                }}
                onReject={() => {
                    handleReject(selectedVendor?._id || selectedVendor?.id);
                    setIsModalOpen(false);
                }}
            />

            <B2BVendorFollowersModal
                isOpen={isFollowersModalOpen}
                onClose={() => setIsFollowersModalOpen(false)}
                vendor={selectedVendor}
            />
        </motion.div>
    );
};

export default ManageB2BVendors;
