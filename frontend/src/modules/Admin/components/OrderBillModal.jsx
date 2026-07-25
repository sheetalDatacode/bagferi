import React from 'react';
import { FiX, FiPrinter } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import Badge from '../../../shared/components/Badge';

const OrderBillModal = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm print:bg-white print:p-0">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:max-w-none print:h-auto">
                {/* Header - Hidden in Print */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden">
                    <h2 className="text-lg font-black text-gray-900">Order Invoice / Bill</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrint}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
                        >
                            <FiPrinter /> Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="p-8 overflow-y-auto print:p-4" id="printable-bill">
                    {/* Header Info */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 mb-1">INVOICE</h1>
                            <p className="text-sm font-bold text-gray-500">#{order.orderNumber}</p>
                            <p className="text-xs text-gray-400 mt-1">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                            <div className="mt-2">
                                <Badge variant="primary" className="text-[10px] uppercase">{order.module}</Badge>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-lg font-black text-primary-600">Bagferi Marketplace</h3>
                            <p className="text-xs text-gray-500 font-medium">B2B Order Facilitation</p>
                        </div>
                    </div>

                    {/* Entities Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Billed To (Customer)</p>
                            <h4 className="font-bold text-gray-900">{order.user?.name || 'Unknown User'}</h4>
                            <p className="text-sm text-gray-600 font-medium">{order.user?.phone}</p>
                            {order.shippingAddress && (
                                <div className="mt-2 text-sm text-gray-600 font-medium">
                                    <p>{order.shippingAddress.addressLine1}</p>
                                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Supplied By (Vendor)</p>
                            <h4 className="font-bold text-gray-900">{order.vendor?.storeName || 'Unknown Vendor'}</h4>
                            <p className="text-sm text-gray-600 font-medium">{order.vendor?.email}</p>
                            <p className="text-sm text-gray-600 font-medium">{order.vendor?.phone}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-y border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <tr>
                                    <th className="py-3 px-4">Item Details</th>
                                    <th className="py-3 px-4 text-center">Qty</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 px-4 font-bold text-gray-900">
                                            {item.product?.name || item.product?.title || 'Unknown Product'}
                                        </td>
                                        <td className="py-4 px-4 text-center font-medium text-gray-600">{item.quantity}</td>
                                        <td className="py-4 px-4 text-right font-medium text-gray-600">₹{formatPrice(item.price)}</td>
                                        <td className="py-4 px-4 text-right font-black text-gray-900">₹{formatPrice(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{formatPrice(order.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                                <span>Advance Paid</span>
                                <span className="text-green-600">- ₹{formatPrice(order.advancePayment || 0)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-base font-black text-gray-900">Balance Due</span>
                                <span className="text-lg font-black text-red-600">
                                    ₹{formatPrice(order.remainingBalance || (order.totalAmount - (order.advancePayment || 0)))}
                                </span>
                            </div>
                            
                            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-center">
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Payment Method</p>
                                <p className="font-bold text-gray-900">{order.paymentMethod}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderBillModal;
