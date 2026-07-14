import { useState, useEffect, useRef, useMemo } from "react";
import { FiCheck, FiX, FiFileText, FiEye, FiSearch, FiChevronDown, FiMapPin } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import B2BVendorDetailModal from "./components/B2BVendorDetailModal";
import api from "../../../../shared/utils/api";

const B2BVendorPendingApprovals = () => {
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [approvals, setApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCity, setSelectedCity] = useState('All Cities');
    const [selectedBusinessType, setSelectedBusinessType] = useState('All Types');
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

    // Fetch pending B2B vendors from API
    useEffect(() => {
        const fetchPendingVendors = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    search: searchQuery,
                    page: '1',
                    limit: '1000',
                });

                const response = await api.get(`/admin/b2b-vendors/pending?${params.toString()}`);

                if (response.success && response.data) {
                    // Transform vendor data for display
                    // Backend returns formatted vendors with companyName, joinDate, etc.
                    const transformedVendors = (response.data.vendors || []).map((vendor) => {
                        // Backend service formats vendors, so we use the formatted data
                        const documents = vendor.documents || [];
                        const docNames = documents.map(doc => {
                            if (typeof doc === 'string') return doc;
                            // Documents have structure: { name: string, url: string, type: string }
                            if (doc.name) {
                                // Extract document type from name (e.g., "PAN Card" -> "PAN", "Business License" -> "Business License")
                                const name = doc.name.toLowerCase();
                                if (name.includes('pan')) return 'PAN';
                                if (name.includes('gst')) return 'GST';
                                if (name.includes('business') || name.includes('license')) return 'Business License';
                                if (name.includes('aadhar')) return 'Aadhar';
                                return doc.name;
                            }
                            if (doc.type) return doc.type;
                            return 'Document';
                        });

                        return {
                            _id: vendor._id || vendor.id,
                            name: vendor.name,
                            companyName: vendor.companyName || vendor.storeName || vendor.name,
                            email: vendor.email,
                            phone: vendor.phone,
                            status: vendor.status,
                            documents: docNames.length > 0 ? docNames : ['No Documents'],
                            date: vendor.joinDate || (vendor.createdAt ? new Date(vendor.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                            gstNumber: vendor.gstNumber || 'N/A',
                            businessType: vendor.businessType || 'N/A',
                            subscription: vendor.subscription || (vendor.currentSubscription ? {
                                name: vendor.currentSubscription?.planId?.name || 'N/A',
                                price: vendor.currentSubscription?.planId?.price || 0,
                                duration: vendor.currentSubscription?.planId?.duration || 0
                            } : null),
                            address: vendor.address || {},
                            vendor: vendor // Store full vendor object for modal
                        };
                    });
                    setApprovals(transformedVendors);
                } else {
                    throw new Error(response.message || 'Failed to fetch pending vendors');
                }
            } catch (error) {
                console.error('Error fetching pending B2B vendors:', error);
                toast.error(error.response?.data?.message || error.message || 'Failed to fetch pending vendors');
                setApprovals([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            if (!fetchedRef.current || searchQuery) {
                fetchPendingVendors();
                fetchedRef.current = true;
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleApprove = async (id) => {
        console.log("Handle Approve triggered for ID:", id);
        if (!id) {
            toast.error("Error: Vendor ID is missing");
            return;
        }

        const toastId = toast.loading("Approving vendor...");
        try {
            console.log(`Sending PUT request to /admin/b2b-vendors/${id}/status`);
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
                status: 'approved'
            });
            console.log("Approve response:", response);

            if (response.success) {
                toast.success("B2B Vendor approved successfully!", { id: toastId });
                // Remove approved vendor from list
                setApprovals(prev => prev.filter(v => v._id !== id));
            } else {
                throw new Error(response.message || 'Failed to approve vendor');
            }
        } catch (error) {
            console.error('Error approving vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to approve vendor', { id: toastId });
        }
    };

    const handleReject = async (id) => {
        try {
            const response = await api.put(`/admin/b2b-vendors/${id}/status`, {
                status: 'rejected'
            });

            if (response.success) {
                toast.success("Application rejected.");
                // Remove rejected vendor from list
                setApprovals(prev => prev.filter(v => v._id !== id));
            } else {
                throw new Error(response.message || 'Failed to reject vendor');
            }
        } catch (error) {
            console.error('Error rejecting vendor:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to reject vendor');
        }
    };

    const handleViewDetails = (vendor) => {
        // Use full vendor object if available, otherwise use row data
        // Ensure we pass the complete vendor object with all nested data
        const vendorToPass = vendor.vendor || vendor;
        console.log('Opening modal with vendor:', vendorToPass);
        console.log('Vendor documents:', vendorToPass?.documents);
        setSelectedVendor(vendorToPass);
        setIsModalOpen(true);
    };

    const columns = [
        { key: "name", label: "B2B Vendor Name", render: (val) => <span className="font-bold text-gray-800">{val}</span> },
        { key: "companyName", label: "Company Name", render: (val) => <span className="font-bold text-gray-500 text-sm">{val}</span> },
        { key: "businessType", label: "Business Type" },
        { key: "email", label: "Email Address" },
        {
            key: "documents",
            label: "Documents",
            render: (val) => (
                <div className="flex gap-2">
                    {val.map((doc, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {doc}
                        </span>
                    ))}
                </div>
            )
        },
        { key: "date", label: "Applied On" },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleViewDetails(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                    <button onClick={() => handleApprove(row._id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><FiCheck /></button>
                    <button onClick={() => handleReject(row._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><FiX /></button>
                </div>
            )
        }
    ];

    // City & Business Type options derived from pending approvals
    const cityOptions = useMemo(() => {
        const cityMap = new Map();
        approvals.forEach((v) => {
            const city = (v.address?.city || '').trim();
            if (!city) return;

            const lower = city.toLowerCase();
            const normalized = (lower === 'aagra') ? 'agra' : lower;

            if (!cityMap.has(normalized)) {
                cityMap.set(normalized, normalized === 'agra' ? 'Agra' : city);
            }
        });
        return ['All Cities', ...Array.from(cityMap.values()).sort()];
    }, [approvals]);

    const filteredCitiesList = useMemo(() => {
        return citySearchQuery
            ? cityOptions.filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
            : cityOptions;
    }, [cityOptions, citySearchQuery]);

    const businessTypeOptions = useMemo(() => {
        const set = new Set();
        approvals.forEach((v) => {
            const bt = (v.businessType || '').trim();
            if (bt && bt !== 'N/A') set.add(bt);
        });
        return ['All Types', ...Array.from(set).sort()];
    }, [approvals]);

    const filteredApprovals = useMemo(() => {
        return approvals.filter((v) => {
            const city = (v.address?.city || '').trim();
            const bt = (v.businessType || '').trim();

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
    }, [approvals, selectedCity, selectedBusinessType]);

    const businessTypeCounts = useMemo(() => {
        const counts = {};
        const cityScoped = approvals.filter((v) => {
            const city = (v.address?.city || '').trim();
            const cityLower = city.toLowerCase();
            const selectedCityLower = selectedCity.toLowerCase();

            if (selectedCity === 'All Cities') return true;
            if (selectedCityLower === 'agra') return (cityLower === 'agra' || cityLower === 'aagra');
            return cityLower === selectedCityLower;
        });
        cityScoped.forEach((v) => {
            const bt = (v.businessType || 'Unknown').trim() || 'Unknown';
            counts[bt] = (counts[bt] || 0) + 1;
        });
        return counts;
    }, [approvals, selectedCity]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Search Bar + Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                </div>


                <div className="flex flex-wrap items-center gap-4">
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
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredApprovals.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No pending B2B vendor applications found.</p>
                    </div>
                ) : (
                    <DataTable
                        data={filteredApprovals}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
                )}
            </div>

            <B2BVendorDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vendor={selectedVendor}
                onApprove={() => {
                    handleApprove(selectedVendor._id || selectedVendor.id);
                    setIsModalOpen(false);
                }}
                onReject={() => {
                    handleReject(selectedVendor._id || selectedVendor.id);
                    setIsModalOpen(false);
                }}
            />
        </motion.div>
    );
};

export default B2BVendorPendingApprovals;
