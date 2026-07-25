import React, { useState, useEffect } from 'react';
import { FiShoppingBag, FiSearch, FiChevronDown, FiMapPin, FiTruck, FiBox, FiClock, FiCheckCircle, FiFileText } from 'react-icons/fi';
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

    const fetchOrders = async (pageNum, search = '', module = 'all') => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders?page=${pageNum}&limit=10&search=${encodeURIComponent(search)}&module=${module}`);
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
        fetchOrders(page, debouncedSearchTerm, moduleFilter);
    }, [page, debouncedSearchTerm, moduleFilter]);

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
                                        <td className="px-6 py-4 align-top space-y-3">
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Customer</div>
                                                <div className="font-bold text-gray-900">{order.user?.name || 'Unknown User'}</div>
                                                <div className="text-xs text-gray-500">{order.user?.phone}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Vendor</div>
                                                <div className="font-bold text-primary-600">{order.vendor?.storeName || 'Unknown Vendor'}</div>
                                            </div>
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
                                                    <span className="text-xs text-gray-500 font-bold">Total Amount</span>
                                                    <span className="font-black text-gray-900">₹{order.totalAmount}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-500 font-bold">Advance Paid</span>
                                                    <span className="font-black text-green-600">₹{order.advancePayment || 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                    <span className="text-xs text-gray-500 font-bold">Balance</span>
                                                    <span className="font-black text-red-600">₹{order.remainingBalance || (order.totalAmount - (order.advancePayment || 0))}</span>
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
        </div>
    );
};

export default AdminOrders;
