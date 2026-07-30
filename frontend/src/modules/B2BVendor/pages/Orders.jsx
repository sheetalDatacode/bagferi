import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiSearch, FiFilter, FiCheckCircle, FiTruck, FiClock, FiUserCheck, FiX, FiPlus, FiUser, FiFileText, FiPrinter } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { appLogo } from '../../../data/logos';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const VendorOrders = () => {
    const navigate = useNavigate();
    const { vendor } = useB2BVendorAuthStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [shopDetails, setShopDetails] = useState(null);
    
    // Modal states
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [orderToDispatch, setOrderToDispatch] = useState(null);
    const [selectedStaffIndex, setSelectedStaffIndex] = useState('');
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', mobile: '', post: 'Delivery Staff', identityDocumentUrl: '' });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);

    // Invoice Modal state
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

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
                if (status === 'Accepted') {
                    const currentOrder = orders.find(o => o._id === orderId) || res.data;
                    if (currentOrder) {
                        setSelectedOrderForInvoice({ ...currentOrder, status: 'Accepted' });
                        setIsInvoiceModalOpen(true);
                    }
                }
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleStaffDocChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewStaff(prev => ({ ...prev, identityDocumentUrl: reader.result }));
            toast.success("Document attached");
        };
        reader.onerror = () => {
            toast.error("Failed to read document file");
        };
        reader.readAsDataURL(file);
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
                setNewStaff({ name: '', mobile: '', post: 'Delivery Staff', identityDocumentUrl: '' });
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

    const filteredOrders = orders.filter(o => {
        const matchesStatus = filter === 'All' || o.status === filter;
        const matchesModule = moduleFilter === 'All' || (o.module || 'fashion') === moduleFilter.toLowerCase();
        return matchesStatus && matchesModule;
    });

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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                {/* Search Box */}
                <div className="relative w-full lg:max-w-xs shrink-0">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search Order ID..." 
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary-500 w-full text-sm font-medium transition-colors"
                    />
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 whitespace-nowrap w-full sm:w-auto overflow-x-auto hide-scrollbar">
                        {['All', 'Fashion', 'Grocery'].map(m => (
                            <button
                                key={m}
                                onClick={() => setModuleFilter(m)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all shrink-0 ${moduleFilter === m ? 'bg-white shadow-sm text-primary-600 border border-gray-100/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 whitespace-nowrap w-full sm:w-auto overflow-x-auto hide-scrollbar">
                        {['All', 'Pending', 'Accepted', 'Dispatched', 'Completed', 'Cancelled'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all shrink-0 ${filter === f ? 'bg-white shadow-sm text-primary-600 border border-gray-100/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
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
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest whitespace-nowrap text-center">Delivery By</th>
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
                                            <div 
                                                onClick={() => {
                                                    setSelectedOrderForDetail(order);
                                                    setIsDetailModalOpen(true);
                                                }}
                                                className="cursor-pointer group text-left"
                                            >
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600 group-hover:underline">
                                                    {order.shippingAddress?.fullName || 'Customer'}
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium mt-1">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                                                <span className="text-[10px] text-primary-600 font-bold block mt-1 hover:underline">View Details →</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="relative w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                                            {(item.selectedImageUrl || item.product?.images?.length > 0) ? (
                                                                <img src={item.selectedImageUrl || item.product.images[0]} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <FiPackage className="w-full h-full p-2 text-gray-400" />
                                                            )}
                                                            {item.selectedImageUrl && (
                                                                <div className="absolute bottom-0 left-0 right-0 bg-teal-500 text-white text-[6px] font-black text-center py-0.5 uppercase tracking-wide">
                                                                    Chosen
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.product?.name || 'Product'}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Qty: {item.quantity}</p>
                                                            {item.selectedImageUrl && (
                                                                <p className="text-[9px] text-teal-600 font-bold mt-0.5">&#10003; Customer selected image</p>
                                                            )}
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
                                        <td className="p-4 text-center text-xs font-medium text-gray-700">
                                            {order.assignedStaff?.name ? (
                                                <div>
                                                    <p className="font-bold text-gray-950">{order.assignedStaff.name}</p>
                                                    <p className="text-gray-500 mt-0.5">{order.assignedStaff.mobile}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Not Assigned</span>
                                            )}
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
                                                <button 
                                                    onClick={() => {
                                                        setSelectedOrderForInvoice(order);
                                                        setIsInvoiceModalOpen(true);
                                                    }}
                                                    className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors border border-gray-300 flex items-center gap-1"
                                                    title="View & Print Order Invoice / Bill"
                                                >
                                                    <FiFileText /> Invoice
                                                </button>
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
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Identity Document (Optional)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleStaffDocChange}
                                                className="hidden" 
                                                id="quick-staff-doc"
                                            />
                                            <label 
                                                htmlFor="quick-staff-doc"
                                                className="cursor-pointer bg-white border border-gray-300 hover:border-primary-500 hover:text-primary-600 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all w-full justify-center"
                                            >
                                                {newStaff.identityDocumentUrl ? '✓ Document Selected' : 'Upload Document'}
                                            </label>
                                            {newStaff.identityDocumentUrl && (
                                                <button 
                                                    onClick={() => setNewStaff(prev => ({ ...prev, identityDocumentUrl: '' }))}
                                                    className="px-2 py-2 bg-red-50 text-red-500 rounded-lg border border-red-100 hover:bg-red-100 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
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

            {/* Customer Detail Modal */}
            {isDetailModalOpen && selectedOrderForDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <FiUser className="text-primary-600" /> Customer & Delivery Details
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedOrderForDetail(null);
                                }} 
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Customer Profile info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-left">Customer Information</h4>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-left">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">Full Name</span>
                                        <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.fullName || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">Phone Number</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {selectedOrderForDetail.shippingAddress?.phone || selectedOrderForDetail.user?.phone || selectedOrderForDetail.userId?.phone ? (
                                                <a href={`tel:${selectedOrderForDetail.shippingAddress?.phone || selectedOrderForDetail.user?.phone || selectedOrderForDetail.userId?.phone}`} className="text-primary-600 hover:underline font-bold">
                                                    {selectedOrderForDetail.shippingAddress?.phone || selectedOrderForDetail.user?.phone || selectedOrderForDetail.userId?.phone}
                                                </a>
                                            ) : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">User Account (Email)</span>
                                        <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.user?.email || selectedOrderForDetail.userId?.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Address info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-left">Delivery Address</h4>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-left">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">Street Address</span>
                                        <span className="text-sm font-medium text-gray-800">{selectedOrderForDetail.shippingAddress?.addressLine1 || selectedOrderForDetail.shippingAddress?.streetAddress || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Area</span>
                                            <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.areaName || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">City</span>
                                            <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.city || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">State</span>
                                            <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.state || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Pincode</span>
                                            <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.pincode || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Country</span>
                                            <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.shippingAddress?.country || 'India'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Staff info */}
                            {selectedOrderForDetail.assignedStaff?.name && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-left">Delivery By (Staff)</h4>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-left">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">Staff Name</span>
                                                <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.assignedStaff.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">Phone / Mobile</span>
                                                <span className="text-sm font-bold text-gray-900">{selectedOrderForDetail.assignedStaff.mobile}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Customer selected images */}
                            {selectedOrderForDetail.items?.some(i => i.selectedImageUrl) && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-teal-600 uppercase tracking-widest text-left flex items-center gap-1.5">
                                        <FiCheckCircle /> Customer's Selected Images
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedOrderForDetail.items.filter(i => i.selectedImageUrl).map((item, idx) => (
                                            <div key={idx} className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex gap-3 items-center">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-teal-300 flex-shrink-0">
                                                    <img src={item.selectedImageUrl} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 line-clamp-2">{item.product?.name || 'Product'}</p>
                                                    <p className="text-[9px] text-teal-700 font-bold mt-1 uppercase tracking-wide">✓ Chosen by customer</p>
                                                    <p className="text-[9px] text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                                                    <div className="flex gap-1.5 mt-1 flex-wrap">
                                                        {item.size && <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-bold uppercase">Size: {item.size}</span>}
                                                        {item.color && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 py-0.2 rounded font-bold uppercase">Color: {item.color}</span>}
                                                        {item.selectedVariants && Object.entries(item.selectedVariants).map(([key, val]) => (
                                                            <span key={key} className="text-[9px] text-teal-600 bg-teal-50 px-1 py-0.2 rounded font-bold uppercase">{key}: {val}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button 
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedOrderForDetail(null);
                                }} 
                                className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Invoice Modal */}
            {isInvoiceModalOpen && selectedOrderForInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 border border-gray-100">
                        {/* Header bar */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                            <div className="flex items-center gap-2">
                                <FiFileText className="text-primary-400" size={20} />
                                <h3 className="font-black uppercase tracking-wider text-sm">Order Bill & Invoice</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.print()} 
                                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                    <FiPrinter size={14} /> Print Bill
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsInvoiceModalOpen(false);
                                        setSelectedOrderForInvoice(null);
                                    }} 
                                    className="text-gray-400 hover:text-white"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Bill Container */}
                        <div id="printable-bill" className="p-8 space-y-6 text-left bg-white text-gray-900">
                            {/* Top Brand Header */}
                            <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                                <div className="flex items-center gap-3">
                                    {appLogo.src ? (
                                        <img src={appLogo.src} alt="Bagferi" className="h-12 object-contain" />
                                    ) : (
                                        <span className="text-2xl font-black tracking-tight text-primary-600">BAGFERI</span>
                                    )}
                                    <div>
                                        <span className="text-xs font-black uppercase text-primary-600 block tracking-widest">B2B Marketplace</span>
                                        <span className="text-[10px] text-gray-400 font-bold block">Tax Invoice / Order Receipt</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">TAX INVOICE</h2>
                                    <p className="text-xs font-bold text-gray-500 mt-1">Invoice #: <span className="text-gray-900">INV-{selectedOrderForInvoice.orderNumber}</span></p>
                                    <p className="text-xs font-medium text-gray-500">Date: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('en-IN')}</p>
                                    <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Status: {selectedOrderForInvoice.status}
                                    </span>
                                </div>
                            </div>

                            {/* Bill From & Bill To */}
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                {/* Bill From */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill From (Merchant / Shop)</p>
                                    <p className="text-sm font-black text-gray-900">{vendor?.storeName || shopDetails?.name || 'Bagferi Authorized Vendor'}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-1">{vendor?.businessType || 'B2B Merchant'}</p>
                                    <p className="text-xs text-gray-600 font-medium">{vendor?.phone || vendor?.mobile || shopDetails?.mobile || 'Mobile: N/A'}</p>
                                    <p className="text-xs text-gray-600 font-medium">{vendor?.email || 'N/A'}</p>
                                </div>

                                {/* Bill To */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill To (Customer)</p>
                                    <p className="text-sm font-black text-gray-900">{selectedOrderForInvoice.shippingAddress?.fullName || 'Valued Customer'}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                        {selectedOrderForInvoice.shippingAddress?.addressLine1 || selectedOrderForInvoice.shippingAddress?.streetAddress || ''}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {selectedOrderForInvoice.shippingAddress?.city || ''}, {selectedOrderForInvoice.shippingAddress?.state || ''} - {selectedOrderForInvoice.shippingAddress?.pincode || ''}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">Area: {
                                        selectedOrderForInvoice.shippingAddress?.areaName || 
                                        (selectedOrderForInvoice.user || selectedOrderForInvoice.userId)?.addresses?.find(addr => 
                                            addr.pincode === selectedOrderForInvoice.shippingAddress?.pincode && 
                                            (addr.streetAddress === selectedOrderForInvoice.shippingAddress?.addressLine1 || addr.streetAddress === selectedOrderForInvoice.shippingAddress?.streetAddress)
                                        )?.areaName || 'N/A'
                                    }</p>
                                    <p className="text-xs text-gray-600 font-medium">Phone: {selectedOrderForInvoice.shippingAddress?.phone || selectedOrderForInvoice.user?.phone || selectedOrderForInvoice.userId?.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Item Table */}
                            <div>
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Order Items Summary</h4>
                                <table className="w-full text-left border-collapse border border-gray-200 rounded-xl overflow-hidden text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-black uppercase">
                                            <th className="p-3">#</th>
                                            <th className="p-3">Item Description</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-right">Price</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {selectedOrderForInvoice.items?.map((item, idx) => {
                                            const qty = item.quantity || 1;
                                            const price = item.price || (selectedOrderForInvoice.totalAmount / (selectedOrderForInvoice.items.length || 1));
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-gray-900">{item.product?.name || item.name || 'B2B Product'}</td>
                                                    <td className="p-3 text-center font-bold">{qty}</td>
                                                    <td className="p-3 text-right font-medium">₹{price.toLocaleString('en-IN')}</td>
                                                    <td className="p-3 text-right font-bold text-gray-900">₹{(price * qty).toLocaleString('en-IN')}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment Breakdown Box */}
                            <div className="flex justify-end">
                                <div className="w-full sm:w-80 bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
                                    <div className="flex justify-between items-center text-xs text-slate-300 font-medium">
                                        <span>Total Order Amount</span>
                                        <span className="font-bold text-white">₹{selectedOrderForInvoice.totalAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-emerald-400 font-bold border-t border-slate-800 pt-2">
                                        <span>Paid Amount (Advance)</span>
                                        <span>₹{(selectedOrderForInvoice.advancePayment || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black text-amber-400 border-t border-slate-700 pt-2">
                                        <span>Remaining Amount</span>
                                        <span>₹{((selectedOrderForInvoice.totalAmount || 0) - (selectedOrderForInvoice.advancePayment || 0)).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Footer */}
                            <div className="border-t border-gray-100 pt-4 text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Thank you for doing business with Bagferi B2B Marketplace!</p>
                            </div>
                        </div>

                        {/* Footer bar */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setIsInvoiceModalOpen(false);
                                    setSelectedOrderForInvoice(null);
                                }} 
                                className="px-5 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => window.print()} 
                                className="px-5 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                            >
                                <FiPrinter size={14} /> Print Bill / Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorOrders;
