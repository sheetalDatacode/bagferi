import { useState, useEffect } from "react";
import { FiSearch, FiEye, FiCheckCircle, FiXCircle, FiMapPin, FiFilter } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable"; // Assuming this path exists relative to this file
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const B2BVendorProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [listingType, setListingType] = useState("all");
    const [propertyType, setPropertyType] = useState("all");
    const [businessType, setBusinessType] = useState("all");
    const [businessTypes, setBusinessTypes] = useState([]);

    // Optimize: Initial data load in single useEffect
    useEffect(() => {
        fetchBusinessTypes();
        fetchProperties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Separate effect for filter changes only
    useEffect(() => {
        fetchProperties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listingType, businessType, propertyType]); // Only refetch when filters change

    const fetchBusinessTypes = async () => {
        try {
            const response = await api.get('/business-types');
            if (response.success) {
                const filtered = (response.data || []).filter(type =>
                    type.name === "Developer / Builder" || type.name === "Property Broker"
                );
                setBusinessTypes(filtered);
            }
        } catch (error) {
            console.error('Error fetching Business Types:', error);
        }
    };

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const params = {
                page: 1,
                limit: 100,
                loading: false
            };
            if (listingType !== 'all') {
                params.listingType = listingType;
            }
            if (businessType !== 'all') {
                params.businessType = businessType;
            }
            if (propertyType !== 'all' && propertyType !== 'Property') {
                // Compatibility: some environments still store Villa entries as Plot.
                params.propertyType = propertyType === 'Row house / Villa' ? 'Plot' : propertyType;
            }

            const response = await api.get('/admin/properties', { params });

            if (response.success && response.data) {
                setProperties(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching Properties:', error);
            toast.error('Failed to load Properties');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: "title",
            label: "Title",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    {row.media && row.media[0] && <img src={row.media[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                        <p className="font-bold text-gray-800">{val}</p>
                        <p className="text-xs text-gray-500">{row.type} • {row.listingType}</p>
                    </div>
                </div>
            )
        },
        {
            key: "vendor",
            label: "Vendor",
            render: (val) => val ? (
                <div>
                    <p className="font-medium text-gray-800">{val.name}</p>
                    <p className="text-xs text-gray-500">{val.email}</p>
                </div>
            ) : 'N/A'
        },
        {
            key: "location",
            label: "Location",
            render: (val) => val ? (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                    <FiMapPin className="text-gray-400" />
                    <span>{val.city}, {val.area}</span>
                </div>
            ) : 'N/A'
        },
        {
            key: "isActive",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {val ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.location.href = `/admin/b2b-vendors/properties/${row._id}`}
                        className="p-2 rounded-lg transition-colors text-blue-600 hover:bg-blue-50"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                </div>
            )
        }
    ];

    const getPropertyBucket = (item) => {
        const type = String(item.type || item.propertyType || '').toLowerCase();
        const hasFlatDetails = !!item.flatDetails;
        const hasVillaDetails = !!item.plotDetails;
        if (type === 'flat' || hasFlatDetails) return 'flat';
        if (type === 'villa' || type === 'plot' || hasVillaDetails) return 'villa';
        return 'property';
    };

    const filteredProperties = properties.filter(item => {
        const searchMatch =
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.location?.city?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!searchMatch) return false;
        if (propertyType === 'all') return true;

        const type = String(item.type || item.propertyType || '').toLowerCase();
        if (propertyType === 'Row house / Villa') {
            return type === 'villa' || type === 'plot';
        }
        if (propertyType === 'Property') {
            return getPropertyBucket(item) === 'property';
        }
        return type === propertyType.toLowerCase();
    });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div></div>

                <div className="flex gap-4">
                    {/* Business Type Filter */}
                    <div className="relative">
                        <select
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 appearance-none cursor-pointer outline-none text-gray-700 font-medium"
                        >
                            <option value="all">All Business Types</option>
                            {businessTypes.map(type => (
                                <option key={type._id} value={type.name}>{type.name}</option>
                            ))}
                        </select>
                        <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Listing Type Filter */}
                    <div className="relative">
                        <select
                            value={listingType}
                            onChange={(e) => setListingType(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 appearance-none cursor-pointer outline-none text-gray-700 font-medium"
                        >
                            <option value="all">All Types</option>
                            <option value="Sale">Sale</option>
                            <option value="Rent">Rent</option>
                            <option value="Lease">Lease</option>
                        </select>
                        <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Property Type Filter */}
                    <div className="relative">
                        <select
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 appearance-none cursor-pointer outline-none text-gray-700 font-medium"
                        >
                            <option value="all">All Property Types</option>
                            <option value="Flat">Flat</option>
                            <option value="Villa">Row house / Villa</option>
                            <option value="Property">Property</option>
                        </select>
                        <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="relative w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <DataTable
                        data={filteredProperties}
                        columns={columns}
                        pagination={filteredProperties.length > 10}
                        itemsPerPage={10}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default B2BVendorProperties;
