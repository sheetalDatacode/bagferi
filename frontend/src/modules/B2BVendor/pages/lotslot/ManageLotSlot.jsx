import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiBox, FiLayers, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "../../../../shared/utils/toast";
import api from "../../../../shared/utils/api";
import SubscriptionGate from "../../components/SubscriptionGate";
import QuotaBanner from "../../components/QuotaBanner";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const ManageLotSlot = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [lotSlots, setLotSlots] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchLotSlots();
    }, []);

    const fetchLotSlots = async () => {
        setLoading(true);
        try {
            const response = await api.get('/b2b-vendor/lot-slots', {
                params: { page: 1, limit: 100 },
                silent: true
            });

            if (response.success && response.data) {
                setLotSlots(response.data.lotSlots);
            }
        } catch (error) {
            console.error('Error fetching lot slots:', error);
            toast.error('Failed to load listings');
        } finally {
            setLoading(false);
        }
    };

    const LotSlotImageCell = ({ row, name }) => {
        const images = [
            row.image,
            ...(Array.isArray(row.images) ? row.images : [])
        ].filter(Boolean);

        const [activeIndex, setActiveIndex] = useState(0);

        if (images.length === 0) {
            return (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                    <FiBox className="text-gray-400 text-xl" />
                </div>
            );
        }

        const handlePrev = (e) => {
            e.stopPropagation();
            setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
        };

        const handleNext = (e) => {
            e.stopPropagation();
            setActiveIndex((prev) => (prev + 1) % images.length);
        };

        return (
            <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                <img
                    src={images[activeIndex]}
                    alt={name}
                    className="w-full h-full object-cover"
                />

                {images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm text-[10px]"
                        >
                            <FiChevronLeft size={10} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white hover:text-primary-600 shadow-sm text-[10px]"
                        >
                            <FiChevronRight size={10} />
                        </button>
                        <div className="absolute top-0.5 right-0.5 px-1 py-[1px] bg-black/60 rounded text-[7px] font-black text-white leading-none">
                            {activeIndex + 1}/{images.length}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const columns = [
        {
            key: "name",
            label: "Lot/Slot Name",
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <LotSlotImageCell row={row} name={value} />
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">{value}</span>
                        <span className="text-[10px] text-gray-400 font-medium">SKU: {row.sku || 'N/A'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: "category",
            label: "Category",
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <FiLayers className="text-primary-400" size={12} />
                    <span className="text-xs font-bold">{value || 'Uncategorized'}</span>
                </div>
            )
        },
        {
            key: "price",
            label: "Lot Price",
            sortable: true,
            render: (value) => <span className="font-black text-gray-900">₹{parseFloat(value).toLocaleString()}</span>,
        },
        {
            key: "moq",
            label: "Min. Order",
            sortable: true,
            render: (value, row) => <span className="text-xs font-bold text-gray-600">{value} {row.unit}</span>,
        },
        {
            key: "availability",
            label: "Status",
            render: (value) => {
                const variant = value === "In Stock" ? "success" : value === "Out of Stock" ? "danger" : "warning";
                return (
                    <Badge variant={variant}>
                        {value?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                );
            },
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/b2b-vendor/lotslot/edit/${row._id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <FiEdit size={18} />
                    </button>
                    <button onClick={() => setDeleteModal({ isOpen: true, id: row._id })} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <FiTrash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    const confirmDelete = async () => {
        try {
            await api.delete(`/b2b-vendor/lot-slots/${deleteModal.id}`);
            toast.success("Listing removed from catalog");
            setDeleteModal({ isOpen: false, id: null });
            fetchLotSlots();
        } catch (error) {
            toast.error('Failed to delete listing');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-end">
                {/* Wrapped with SubscriptionGate to enforce Diamond plan requirement */}
                <SubscriptionGate action="lotslot" showLimitInfo={false}>
                    <button
                        onClick={() => navigate("/b2b-vendor/lotslot/add-lotslot")}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl whitespace-nowrap"
                    >
                        <FiPlus size={20} /> Publish New Lot
                    </button>
                </SubscriptionGate>
            </div>

            <div className="max-w-2xl">
                <QuotaBanner action="lotslot" className="mb-0" />
            </div>

            <div className="relative">
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-gray-700 text-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-72 bg-gray-50 animate-pulse rounded-[2.5rem]" />)}
                    </div>
                ) : (
                    <>
                        {(() => {
                            const filtered = lotSlots.filter(l =>
                                (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (l.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            return (
                                <div className="space-y-8">
                                    {filtered.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {filtered.map((lot) => (
                                                <motion.div
                                                    key={lot._id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
                                                >
                                                    <div className="relative h-48 overflow-hidden bg-slate-50">
                                                        <img 
                                                            src={lot.image || (Array.isArray(lot.images) && lot.images[0]) || 'https://via.placeholder.com/400x300'} 
                                                            alt={lot.name} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                        />
                                                        <div className="absolute top-4 left-4">
                                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black uppercase rounded-lg shadow-sm border border-gray-100">
                                                                {lot.category || 'Bulk Lot'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <h3 className="text-lg font-black text-slate-800 mb-2 truncate leading-tight">{lot.name}</h3>
                                                        <div className="mb-4">
                                                            <RatingSummaryBadge targetType="lotslot" targetId={lot._id} />
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl mb-6">
                                                            <div className="text-center">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Lot Price</p>
                                                                <p className="text-xs font-black text-slate-700">₹{parseFloat(lot.price || 0).toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-center border-l border-slate-200">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Min. Order</p>
                                                                <p className="text-xs font-black text-slate-700">{lot.moq} {lot.unit}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${lot.availability === 'In Stock' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {lot.availability}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => navigate(`/b2b-vendor/lotslot/edit/${lot._id}`)} 
                                                                    className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                                >
                                                                    <FiEdit size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setDeleteModal({ isOpen: true, id: lot._id })} 
                                                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                                >
                                                                    <FiTrash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                                            <FiBox size={48} className="mx-auto text-gray-200 mb-4" />
                                            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">No lots found</h3>
                                            <p className="text-sm text-gray-400">Try adjusting your search or publish a new lot.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Permanently Remove?"
                message="This listing will be deleted from your catalog. This action cannot be undone."
                type="danger"
            />
        </motion.div>
    );
};

export default ManageLotSlot;
