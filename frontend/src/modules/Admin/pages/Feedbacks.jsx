import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiMessageSquare, 
    FiUser, 
    FiBriefcase, 
    FiCheckCircle, 
    FiClock, 
    FiFilter, 
    FiSearch, 
    FiChevronRight, 
    FiTrash2,
    FiMail,
    FiPhone,
    FiCalendar
} from 'react-icons/fi';
import { getAdminFeedbacks, updateFeedbackStatus } from '../../../shared/services/feedbackService';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

const Feedbacks = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

    const fetchFeedbacks = async (page = 1) => {
        setLoading(true);
        try {
            const res = await getAdminFeedbacks({
                status: statusFilter,
                role: roleFilter,
                page,
                limit: 10
            });
            if (res.success) {
                setFeedbacks(res.data);
                setPagination(res.pagination);
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            toast.error('Failed to load feedbacks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [statusFilter, roleFilter]);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const res = await updateFeedbackStatus(id, newStatus);
            if (res.success) {
                toast.success(`Feedback marked as ${newStatus}`);
                fetchFeedbacks(pagination.page);
                if (selectedFeedback && selectedFeedback._id === id) {
                    setSelectedFeedback({ ...selectedFeedback, status: newStatus });
                }
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const columns = [
        {
            header: 'Sender',
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.role === 'vendor' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {row.role === 'vendor' ? <FiBriefcase size={20} /> : <FiUser size={20} />}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-sm">
                            {row.role === 'vendor' ? row.vendorId?.storeName || row.vendorId?.name : row.userId?.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{row.role}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Subject',
            render: (value, row) => (
                <div className="max-w-xs">
                    <p className="font-semibold text-gray-800 text-sm truncate">{row.subject}</p>
                    <p className="text-xs text-gray-500 truncate">{row.message}</p>
                </div>
            )
        },
        {
            header: 'Date',
            accessor: 'createdAt',
            render: (value) => (
                <p className="text-sm text-gray-600">
                    {new Date(value).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })}
                </p>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (value) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    value === 'pending' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                    {value}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setSelectedFeedback(row)}
                        className="!p-2"
                    >
                        <FiChevronRight size={18} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <FiMessageSquare className="text-primary-600" />
                        Platform Feedbacks
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and respond to user/vendor feedback</p>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    >
                        <option value="">All Roles</option>
                        <option value="user">Users Only</option>
                        <option value="vendor">Vendors Only</option>
                    </select>

                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <DataTable 
                    columns={columns}
                    data={feedbacks}
                    loading={loading}
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    onPageChange={(p) => fetchFeedbacks(p)}
                />
            </div>

            {/* Feedback Detail Modal */}
            <AnimatePresence>
                {selectedFeedback && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedFeedback(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 space-y-8">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl ${selectedFeedback.role === 'vendor' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {selectedFeedback.role === 'vendor' ? <FiBriefcase /> : <FiUser />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                                {selectedFeedback.role === 'vendor' ? selectedFeedback.vendorId?.storeName : selectedFeedback.userId?.name}
                                            </h2>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{selectedFeedback.role}</p>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        selectedFeedback.status === 'pending' 
                                        ? 'bg-orange-100 text-orange-600' 
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                        {selectedFeedback.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                                        <FiMail className="text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedFeedback.role === 'vendor' ? selectedFeedback.vendorId?.email : selectedFeedback.userId?.email}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                                        <FiPhone className="text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                                            <p className="text-sm font-bold text-gray-800">{selectedFeedback.role === 'vendor' ? selectedFeedback.vendorId?.phone : selectedFeedback.userId?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                                        <FiCalendar className="text-gray-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted On</p>
                                            <p className="text-sm font-bold text-gray-800">
                                                {new Date(selectedFeedback.createdAt).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Subject</p>
                                        <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
                                            <p className="font-bold text-primary-900">{selectedFeedback.subject}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Message Detail</p>
                                        <div className="bg-gray-50 rounded-2xl p-6 min-h-[150px]">
                                            <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedFeedback.message}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {selectedFeedback.status === 'pending' ? (
                                        <Button 
                                            onClick={() => handleStatusUpdate(selectedFeedback._id, 'reviewed')}
                                            className="flex-1 !py-4"
                                            leftIcon={<FiCheckCircle />}
                                        >
                                            Mark as Reviewed
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="secondary"
                                            onClick={() => handleStatusUpdate(selectedFeedback._id, 'pending')}
                                            className="flex-1 !py-4"
                                            leftIcon={<FiClock />}
                                        >
                                            Revert to Pending
                                        </Button>
                                    )}
                                    <Button 
                                        variant="outline"
                                        onClick={() => setSelectedFeedback(null)}
                                        className="!py-4 px-8"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Feedbacks;
