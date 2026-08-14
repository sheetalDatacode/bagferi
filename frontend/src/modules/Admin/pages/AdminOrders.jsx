import React, { useState, useEffect } from 'react';
import { FiShoppingBag, FiSearch, FiChevronDown, FiMapPin, FiTruck, FiBox, FiClock, FiCheckCircle, FiFileText, FiEye, FiX, FiUser } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import OrderBillModal from '../components/OrderBillModal';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('all');

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    // Debounce effect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to page 1 on search
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const fetchOrders = async (pageNum, search = '', module = 'all', status = 'all') => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders?page=${pageNum}&limit=10&search=${encodeURIComponent(search)}&module=${module}&status=${status}`);
            if (res.success) {
                setOrders(res.data.orders);
                setTotalPages(res.data.totalPages);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(page, debouncedSearchTerm, moduleFilter, statusFilter);
    }, [page, debouncedSearchTerm, moduleFilter, statusFilter]);

    const handleFilterChange = (e) => {
        setModuleFilter(e.target.value);
        setPage(1);
    };

    const handleViewBill = (order) => {
        setSelectedOrder(order);
        setIsBillModalOpen(true);
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Accepted': 'bg-blue-100 text-blue-800',
            'Dispatched': 'bg-purple-100 text-purple-800',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <FiShoppingBag className="text-primary-600" />
                        Platform Orders
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage all user orders across the marketplace</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, User, Vendor..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-40">
                        <select
                            value={moduleFilter}
                            onChange={handleFilterChange}
                            className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Modules</option>
                            <option value="grocery">Grocery</option>
                            <option value="fashion">Fashion</option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-150 whitespace-nowrap overflow-x-auto max-w-full hide-scrollbar">
                {['all', 'Pending', 'Accepted', 'Dispatched', 'Completed', 'Cancelled', 'Exchange'].map(status => (
                    <button
                        key={status}
                        onClick={() => {
                            setStatusFilter(status);
                            setPage(1);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 ${
                            statusFilter === status
                                ? 'bg-white shadow-sm text-primary-600 border border-gray-200/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                        }`}
                    >
                        {status === 'all' ? 'All Status' : status}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <FiShoppingBag className="text-6xl text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900">No Orders Found</h3>
                    <p className="text-gray-500">There are no orders placed on the platform yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Order ID & Date</th>
                                    <th className="px-6 py-4">Customer & Vendor</th>
                                    <th className="px-6 py-4">Items</th>
                                    <th className="px-6 py-4">Payment Info</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map(order => (
                                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-gray-900 mb-1">{order.orderNumber}</div>
                                            <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-full tracking-wider">
                                                {order.module}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <button 
                                                onClick={() => setSelectedOrderInfo(order)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95"
                                            >
                                                <FiEye size={12} className="text-slate-500" /> View Info
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                            {item.product?.image || item.product?.images?.[0] ? (
                                                                <img src={item.product?.image || item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <FiBox className="w-full h-full p-2 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-xs line-clamp-1">{item.product?.name || item.product?.title || 'Product Unavailable'}</div>
                                                            <div className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity} × ₹{item.price}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-500 font-bold">Subtotal</span>
                                                    <span className="font-black text-gray-900">₹{order.totalAmount}</span>
                                                </div>
                                                {order.paymentMethod === 'COD' && order.convenienceFee > 0 && (
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs text-gray-500 font-bold">COD Charge</span>
                                                        <span className="font-black text-gray-900">₹{order.convenienceFee}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-500 font-bold">Advance Paid</span>
                                                    <span className="font-black text-green-600">₹{order.advancePayment || 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                    <span className="text-xs text-gray-500 font-bold">Balance</span>
                                                    <span className="font-black text-red-600">₹{order.remainingBalance !== undefined ? order.remainingBalance : (order.totalAmount - (order.advancePayment || 0))}</span>
                                                </div>
                                                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-center bg-gray-200 text-gray-700 py-1 rounded">
                                                    Method: {order.paymentMethod}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                 <span className={`px-2 py-1 rounded text-xs font-bold w-fit ${getStatusColor(order.status)}`}>
                                                     {order.status}
                                                 </span>
                                                 {order.status === 'Cancelled' && order.cancelledBy && (
                                                     <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded capitalize w-fit font-bold">
                                                         By {order.cancelledBy}
                                                     </span>
                                                 )}
                                                 <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                     Payment: {order.paymentStatus}
                                                 </span>
                                                <button
                                                    onClick={() => handleViewBill(order)}
                                                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-xs font-bold transition-colors w-fit"
                                                >
                                                    <FiFileText /> View Bill
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex justify-center gap-2 bg-gray-50">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg font-bold text-sm transition-colors ${page === i + 1 ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <OrderBillModal 
                isOpen={isBillModalOpen} 
                onClose={() => setIsBillModalOpen(false)} 
                order={selectedOrder} 
            />

            {/* View Info Modal */}
            {selectedOrderInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100 transform scale-100 transition-transform">
                        <button
                            onClick={() => setSelectedOrderInfo(null)}
                            className="absolute top-5 right-5 p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                        >
                            <FiX size={18} />
                        </button>
                        
                        <h3 className="text-base font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                            <FiUser className="text-primary-600" /> Order Entity Details
                        </h3>

                        <div className="space-y-4">
                            {/* Customer Section */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Customer Details</h4>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-950">{selectedOrderInfo.user?.name || 'Unknown User'}</p>
                                    <p className="text-xs text-slate-500 font-mono">Mobile: {selectedOrderInfo.user?.phone || 'N/A'}</p>
                                    <p className="text-xs text-slate-650 mt-2 bg-white p-2 rounded-lg border border-slate-100 leading-relaxed">
                                        <span className="font-bold text-[10px] text-slate-400 uppercase block mb-0.5">Shipping Address</span>
                                        {selectedOrderInfo.shippingAddress?.addressLine1 || selectedOrderInfo.shippingAddress?.streetAddress || ''}, {selectedOrderInfo.shippingAddress?.city || ''} {selectedOrderInfo.shippingAddress?.state || ''} {selectedOrderInfo.shippingAddress?.pincode ? `(${selectedOrderInfo.shippingAddress.pincode})` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Vendor Section */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendor Details</h4>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-primary-600">{selectedOrderInfo.vendor?.storeName || 'Unknown Vendor'}</p>
                                    <p className="text-xs text-slate-500">Contact: {selectedOrderInfo.vendor?.name || '--'}</p>
                                    {selectedOrderInfo.vendor?.phone && (
                                        <p className="text-xs text-slate-500 font-mono">Mobile: {selectedOrderInfo.vendor.phone}</p>
                                    )}
                                </div>
                            </div>

                            {/* Delivery Section */}
                            <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 text-left">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-2">Delivery Staff Details</h4>
                                {selectedOrderInfo.assignedStaff?.name ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-indigo-950">{selectedOrderInfo.assignedStaff.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">Mobile: {selectedOrderInfo.assignedStaff.mobile}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No delivery staff assigned yet.</p>
                                )}

                                {selectedOrderInfo.exchangeRequest && selectedOrderInfo.exchangeRequest.status !== 'None' && selectedOrderInfo.exchangeRequest.assignedStaff?.name && (
                                    <div className="pt-3 mt-3 border-t border-indigo-100/50 space-y-1">
                                        <h5 className="text-[9px] font-black uppercase tracking-wider text-purple-650">Exchange Delivery Staff</h5>
                                        <p className="text-sm font-bold text-purple-950">{selectedOrderInfo.exchangeRequest.assignedStaff.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">Mobile: {selectedOrderInfo.exchangeRequest.assignedStaff.mobile}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedOrderInfo(null)}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
