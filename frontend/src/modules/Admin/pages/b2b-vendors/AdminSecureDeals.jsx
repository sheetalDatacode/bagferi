import { useState, useEffect } from "react";
import { FiSearch, FiShield, FiPackage, FiDownload, FiFileText, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import useDebounce from "../../../../shared/hooks/useDebounce";

const AdminSecureDeals = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const fetchAllDeals = async () => {
        try {
            setLoading(true);
            const res = await api.get('/order-deals/admin/all');
            if (res.success) {
                setDeals(res.data);
            }
        } catch (error) {
            console.error('Error fetching admin secure deals:', error);
            toast.error('Failed to load secure deals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllDeals();
    }, []);

    const filteredDeals = deals.filter(deal => {
        const query = debouncedSearchQuery.toLowerCase();
        return (
            deal.productName?.toLowerCase().includes(query) ||
            deal.buyerId?.name?.toLowerCase().includes(query) ||
            deal.sellerId?.storeName?.toLowerCase().includes(query) ||
            deal.sellerId?.name?.toLowerCase().includes(query) ||
            deal._id.toLowerCase().includes(query)
        );
    });

    const columns = [
        {
            key: "createdAt",
            label: "Date",
            render: (val) => (
                <div className="flex flex-col">
                    <span className="text-gray-800 font-bold">{new Date(val).toLocaleDateString('en-GB')}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            key: "productName",
            label: "Product",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                        <FiPackage size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{val}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: #{row._id.slice(-8)}</span>
                    </div>
                </div>
            )
        },
        {
            key: "buyerId",
            label: "Buyer",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val?.name || val?.storeName || 'N/A'}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded w-fit mt-0.5 ${row.buyerModel === 'Vendor' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {row.buyerModel}
                    </span>
                </div>
            )
        },
        {
            key: "sellerId",
            label: "Seller",
            render: (val) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{val?.storeName || val?.name || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{val?.address?.city || 'City N/A'}</span>
                </div>
            )
        },
        {
            key: "totalAmount",
            label: "Amount",
            render: (val) => (
                <div className="flex flex-col items-end">
                    <span className="font-black text-primary-600">₹{val.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">Incl. Escrow</span>
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (val) => {
                let style = "";
                let Icon = FiClock;
                switch (val) {
                    case 'pending':
                        style = "bg-amber-50 text-amber-600 border-amber-100";
                        Icon = FiClock;
                        break;
                    case 'accepted':
                        style = "bg-emerald-50 text-emerald-600 border-emerald-100";
                        Icon = FiCheckCircle;
                        break;
                    case 'rejected':
                        style = "bg-red-50 text-red-600 border-red-100";
                        Icon = FiXCircle;
                        break;
                    default:
                        style = "bg-gray-50 text-gray-600 border-gray-100";
                }
                return (
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${style}`}>
                        <Icon size={12} />
                        {val}
                    </span>
                );
            }
        },
        {
            key: "actions",
            label: "Document",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    {row.document ? (
                        <a
                            href={row.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-all flex items-center justify-center group relative"
                            title="View/Download Document"
                        >
                            <FiDownload />
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                VIEW PDF
                            </span>
                        </a>
                    ) : (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">No File</span>
                    )}
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h1 className="lg:hidden text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <FiCheckCircle className="text-blue-600" />
                        Secure Deals
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Verify and manage B2B transaction settlements</p>
                </div>

                <div className="relative w-80">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search deals, buyers, sellers..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-primary-500 outline-none transition-all shadow-sm focus:shadow-md font-medium text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Deals', val: deals.length, icon: FiShield, color: 'primary' },
                    { label: 'Pending', val: deals.filter(d => d.status === 'pending').length, icon: FiClock, color: 'amber' },
                    { label: 'Accepted', val: deals.filter(d => d.status === 'accepted').length, icon: FiCheckCircle, color: 'emerald' },
                    { label: 'Total Volume', val: `₹${deals.reduce((acc, d) => acc + (d.totalAmount || 0), 0).toLocaleString()}`, icon: FiFileText, color: 'indigo' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
                        <div className={`w-12 h-12 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-lg font-black text-gray-800">{stat.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600"></div>
                    </div>
                ) : (
                    <DataTable
                        data={filteredDeals}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default AdminSecureDeals;
