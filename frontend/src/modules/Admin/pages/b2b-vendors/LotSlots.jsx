import { useState, useEffect } from "react";
import { FiSearch, FiEye, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable"; // Assuming this path exists relative to this file
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const B2BVendorLotSlots = () => {
    const [lotSlots, setLotSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchLotSlots();
    }, []);

    const fetchLotSlots = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/lot-slots', {
                params: {
                    page: 1,
                    limit: 100,
                    loading: false // Suppress global loading if needed
                }
            });

            if (response.success && response.data) {
                setLotSlots(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching Lot/Slots:', error);
            toast.error('Failed to load Lot/Slots');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const response = await api.patch(`/admin/lot-slots/${id}/status`, {
                isActive: !currentStatus
            });
            if (response.success) {
                toast.success(`Lot/Slot ${!currentStatus ? 'activated' : 'deactivated'}`);
                fetchLotSlots();
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const columns = [
        {
            key: "name",
            label: "Name",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    {row.image && <img src={row.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                        <p className="font-bold text-gray-800">{val}</p>
                        <p className="text-xs text-gray-500">{row.sku}</p>
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
            key: "price",
            label: "Price",
            render: (val) => `₹${val}`
        },
        { key: "moq", label: "MOQ" },
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
                        onClick={() => window.location.href = `/admin/b2b-vendors/lot-slots/${row._id}`}
                        className="p-2 rounded-lg transition-colors text-blue-600 hover:bg-blue-50"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h1 className="lg:hidden text-2xl font-bold text-gray-800">Lot/Slot Management</h1>
                    <p className="text-gray-500 text-sm">Manage advertising slots for B2B vendors</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search lot/slots..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <DataTable
                        data={lotSlots.filter(item =>
                            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        columns={columns}
                        pagination={lotSlots.filter(item =>
                            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length > 10}
                        itemsPerPage={10}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default B2BVendorLotSlots;
