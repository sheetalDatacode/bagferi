import React, { useState, useEffect } from 'react';
import { FiPackage, FiSearch, FiFilter, FiCheckCircle, FiTruck, FiClock, FiUserCheck, FiX, FiPlus, FiUser } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const VendorOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [shopDetails, setShopDetails] = useState(null);
    
    // Modal states
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [orderToDispatch, setOrderToDispatch] = useState(null);
    const [selectedStaffIndex, setSelectedStaffIndex] = useState('');
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', mobile: '', post: 'Delivery Staff' });

    useEffect(() => {
        fetchOrders();
        fetchShopDetails();
    }, []);

    const fetchShopDetails = async () => {
        try {
            const res = await api.get('/b2b-vendor/shop-units');
            if (res.success && res.data) {
                setShopDetails(res.data);
            }
        } catch (error) {
            console.error('Failed to load shop details', error);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/order/vendor/orders');
            if (res.success) {
                setOrders(res.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status, additionalData = {}) => {
        try {
            const payload = { status, ...additionalData };
            const res = await api.put(`/order/vendor/orders/${orderId}/status`, payload);
            if (res.success) {
                toast.success(`Order marked as ${status}`);
                fetchOrders();
                if (status === 'Dispatched') setIsDispatchModalOpen(false);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleQuickAddStaff = async () => {
        if (!newStaff.name.trim() || !newStaff.mobile.trim()) {
            return toast.error("Name and mobile are required");
        }
        
        try {
            // Re-submit the shop update with new staff
            const updatedDetails = [...(shopDetails?.details || []), newStaff];
            const payload = {
                ...shopDetails,
                zoneId: shopDetails?.zoneId?._id || shopDetails?.zoneId,
                details: updatedDetails
            };
            
            const res = await api.post('/b2b-vendor/shop-units', payload);
            if (res.success) {
                toast.success("Staff added successfully");
                setShopDetails(res.data);
                setIsAddingStaff(false);
                setNewStaff({ name: '', mobile: '', post: 'Delivery Staff' });
                // auto-select the newly added staff
                setSelectedStaffIndex(String(updatedDetails.length - 1));
            } else {
                toast.error(res.message || "Failed to add staff");
            }
        } catch (error) {
            toast.error("An error occurred while adding staff");
        }
    };

    const confirmDispatch = () => {
        if (selectedStaffIndex === '') {
            return toast.error("Please assign a staff member to dispatch");
        }
        const staff = shopDetails.details[parseInt(selectedStaffIndex)];
        updateOrderStatus(orderToDispatch._id, 'Dispatched', { assignedStaff: { name: staff.name, mobile: staff.mobile } });
    };

    const filteredOrders = filter === 'All' ? orders : orders.filter(o => o.status === filter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Accepted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Dispatched': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <FiPackage className="text-primary-600" /> My Orders
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and track your customer orders</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search Order ID..." 
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary-500 w-full md:w-64 text-sm"
                        />
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
                        {['All', 'Pending', 'Accepted', 'Dispatched', 'Completed', 'Cancelled'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filter === f ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FiPackage className="text-3xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Orders Found</h3>
                    <p className="text-gray-500 mt-2">You don't have any orders matching the current filter.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Order ID & Date</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Customer</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[200px]">Items</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap text-right">Amount</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map(order => (
                                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-gray-900">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-gray-900">{order.shippingAddress?.fullName || 'Customer'}</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                                            {item.product?.images?.length > 0 ? (
                                                                <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <FiPackage className="w-full h-full p-2 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.product?.name || 'Product'}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Qty: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="text-sm font-black text-primary-600">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 border border-gray-200 inline-block px-1.5 py-0.5 rounded bg-gray-50">
                                                Advance Paid: ₹{order.advancePayment}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {order.status === 'Pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => updateOrderStatus(order._id, 'Accepted')}
                                                            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 flex items-center gap-1"
                                                        >
                                                            <FiCheckCircle /> Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if(window.confirm('Are you sure you want to cancel this order?')) {
                                                                    updateOrderStatus(order._id, 'Cancelled');
                                                                }
                                                            }}
                                                            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-200 flex items-center gap-1"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === 'Accepted' && (
                                                    <button 
                                                        onClick={() => {
                                                            setOrderToDispatch(order);
                                                            setIsDispatchModalOpen(true);
                                                        }}
                                                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 flex items-center gap-1"
                                                    >
                                                        <FiTruck /> Dispatch
                                                    </button>
                                                )}
                                                {order.status === 'Dispatched' && (
                                                    <button 
                                                        onClick={() => updateOrderStatus(order._id, 'Completed')}
                                                        className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-200 flex items-center gap-1"
                                                    >
                                                        <FiCheckCircle /> Complete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Dispatch & Assign Modal */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <FiTruck className="text-primary-600" /> Dispatch Order
                            </h3>
                            <button onClick={() => setIsDispatchModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Please assign a staff member to handle the dispatch for Order <span className="font-bold text-gray-900">{orderToDispatch?.orderNumber}</span>.</p>
                            
                            {!isAddingStaff ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Staff Member</label>
                                        <select 
                                            value={selectedStaffIndex}
                                            onChange={(e) => setSelectedStaffIndex(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-primary-500 outline-none"
                                        >
                                            <option value="">-- Choose a staff --</option>
                                            {shopDetails?.details?.map((staff, idx) => (
                                                <option key={idx} value={idx}>{staff.name} ({staff.mobile})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={() => setIsAddingStaff(true)}
                                            className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:underline"
                                        >
                                            <FiPlus /> Add New Staff
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <FiUser /> Quick Add Staff
                                        </h4>
                                        <button onClick={() => setIsAddingStaff(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Staff Name" 
                                        value={newStaff.name}
                                        onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Mobile Number (10 digits)" 
                                        value={newStaff.mobile}
                                        onChange={(e) => setNewStaff({...newStaff, mobile: e.target.value})}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                                    />
                                    <button 
                                        onClick={handleQuickAddStaff}
                                        className="w-full bg-gray-900 text-white font-bold text-xs py-2 rounded-lg uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                    >
                                        Save Staff
                                    </button>
                                </div>
                            )}

                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsDispatchModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Cancel</button>
                            <button 
                                onClick={confirmDispatch}
                                disabled={isAddingStaff}
                                className="px-5 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                <FiTruck /> Assign & Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorOrders;
