import React, { useState, useEffect } from 'react';
import { FiPackage, FiMapPin, FiPhoneCall, FiBox, FiClock, FiCheckCircle } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [moduleFilter, setModuleFilter] = useState('All');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/order/my-orders');
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Dispatched': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredOrders = moduleFilter === 'All' ? orders : orders.filter(o => (o.module || 'fashion') === moduleFilter.toLowerCase());

    return (
        <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 font-sans">
            <B2BHeader />
            
            <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <FiPackage className="text-primary-600" /> My Order History
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Track your bulk orders and contact vendors</p>
                </div>

                <div className="flex bg-white rounded-xl p-1 border border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar max-w-fit shadow-sm">
                    {['All', 'Fashion', 'Grocery'].map(m => (
                        <button
                            key={m}
                            onClick={() => setModuleFilter(m)}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${moduleFilter === m ? 'bg-primary-50 shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            {m} Orders
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FiPackage className="text-3xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Orders Found</h3>
                        <p className="text-gray-500 mt-2">You haven't placed any orders yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map(order => {
                            const showVendorDetails = (order.status !== 'Pending' && order.status !== 'Cancelled') || (order.advancePayment > 0);
                            
                            return (
                                <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID: {order.orderNumber}</p>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                            <div className="text-left md:text-right">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase">Total Amount</p>
                                                <p className="text-sm font-black text-primary-600">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                                            </div>
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <FiBox /> Items
                                            </h4>
                                            <div className="space-y-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                                            {item.product?.image ? (
                                                                <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <FiPackage className="w-full h-full p-3 text-gray-400" />
                                                            )}
                                                        </div>
                                                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.product?.name || 'Product'}</p>
                                                            <p className="text-xs text-gray-500 font-medium">
                                                                ₹{item.price} × {item.quantity} = <span className="font-bold text-gray-800">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:border-l md:border-gray-100 md:pl-6">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <FiMapPin /> Vendor Details
                                            </h4>
                                            
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                                <p className="font-bold text-gray-900">{order.vendor?.storeName || 'Vendor'}</p>
                                                
                                                {!showVendorDetails ? (
                                                    <div className="mt-3 flex items-start gap-2 text-yellow-700 bg-yellow-50 p-2.5 rounded-lg text-xs font-medium border border-yellow-100">
                                                        <FiClock className="flex-shrink-0 mt-0.5" />
                                                        <p>Vendor contact details will be revealed once you pay the advance or the vendor accepts the order.</p>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                                                        {(order.vendor?.phone || order.vendor?.mobile) && (
                                                            <div className="flex items-center gap-2">
                                                                 <FiPhoneCall className="text-gray-400" /> 
                                                                 <a href={`tel:${order.vendor.phone || order.vendor.mobile}`} className="font-bold text-blue-600 hover:underline">{order.vendor.phone || order.vendor.mobile}</a>
                                                            </div>
                                                        )}
                                                        {order.vendor?.email && (
                                                            <div className="flex items-center gap-2">
                                                                <FiBox className="text-gray-400" /> 
                                                                <a href={`mailto:${order.vendor.email}`} className="font-medium text-gray-600 hover:underline">{order.vendor.email}</a>
                                                            </div>
                                                        )}
                                                        <div className="flex items-start gap-2">
                                                            <FiMapPin className="text-gray-400 mt-1 flex-shrink-0" /> 
                                                            <p className="leading-snug text-gray-500">
                                                                {order.vendor?.address ? (
                                                                    <>
                                                                        {order.vendor.address.street && `${order.vendor.address.street}, `}
                                                                        {order.vendor.address.area && `${order.vendor.address.area}, `}
                                                                        {order.vendor.address.city && `${order.vendor.address.city}, `}
                                                                        {order.vendor.address.state} {order.vendor.address.pincode ? `- ${order.vendor.address.pincode}` : ''}
                                                                        {!order.vendor.address.city && !order.vendor.address.state && 'Address not provided by vendor'}
                                                                    </>
                                                                ) : 'Address not provided by vendor'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
                                                <div className="flex justify-between items-center text-gray-500 font-semibold">
                                                    <span>Subtotal</span>
                                                    <span className="font-bold text-gray-800">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-gray-500 font-semibold">
                                                    <span>Advance Paid</span>
                                                    <span className="font-black text-green-600">₹{order.advancePayment?.toLocaleString('en-IN') || 0}</span>
                                                </div>
                                                <div className="border-t border-gray-200/60 pt-2 flex justify-between items-center font-bold text-gray-900">
                                                    <span>Remaining COD</span>
                                                    <span className="font-black text-primary-600">₹{(order.totalAmount - (order.advancePayment || 0)).toLocaleString('en-IN')}</span>
                                                </div>
                                                
                                                {order.status === 'Dispatched' && order.deliveryOtp && (
                                                    <div className="mt-4 pt-3 border-t border-dashed border-gray-300">
                                                        <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between border border-blue-100">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-0.5">Delivery OTP</p>
                                                                <p className="text-xs text-blue-600 font-medium">Share this with the delivery partner</p>
                                                            </div>
                                                            <div className="bg-white px-3 py-1.5 rounded shadow-sm border border-blue-200">
                                                                <span className="text-lg font-black text-blue-700 tracking-[0.2em]">{order.deliveryOtp}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="md:hidden">
                <B2BBottomNav />
            </div>
        </div>
    );
};

export default Orders;
